const paymentService = {};
const razorpay = require('razorpay');
const db = require('../connection');
const crypto = require('crypto');
const walletService = require('./wallet-service');

// Initialize Razorpay instance
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Timing-safe HMAC SHA-256 signature verification to prevent timing attack side-channel exploits.
 */
function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
    if (!orderId || !paymentId || !signature || !secret) {
        return false;
    }
    const expected = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== actualBuf.length) {
        return false;
    }
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

paymentService.createOrder = async (req) => {
    try {
        const { amount, currency = 'INR', tournamentId = 0, tournamentName = 'Tournament / Wallet Top-up' } = req.body;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 10 || numAmount > 50000) {
            return {
                status: false,
                error: "Invalid payment amount. Amount must be between ₹10 and ₹50,000."
            };
        }

        // Convert amount to paise (Razorpay expects amount in smallest currency unit)
        const amountInPaise = Math.round(numAmount * 100);

        const options = {
            amount: amountInPaise,
            currency: currency,
            receipt: `rcpt_${tournamentId || 'wallet'}_${Date.now()}`,
            notes: {
                tournamentId: String(tournamentId || 0),
                tournamentName: String(tournamentName || 'Wallet Top-up').substring(0, 40),
                userId: String(req.user?.id || 'guest'),
                userEmail: req.user?.email || 'guest@example.com'
            }
        };

        const order = await razorpayInstance.orders.create(options);

        if (!order || !order.id) {
            return { status: false, error: "Order creation failed from payment gateway." };
        }

        return {
            status: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt,
                key: process.env.RAZORPAY_KEY_ID
            }
        };

    } catch (error) {
        console.error("Error in createOrder service:", error);
        return { status: false, error: error.message };
    }
};

paymentService.verifyPayment = async (req) => {
    let connection = null;
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            tournamentId
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return { status: false, error: "Missing required payment verification parameters." };
        }

        // 1. Timing-Safe Cryptographic Signature Verification
        const isValidSignature = verifyRazorpaySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            process.env.RAZORPAY_KEY_SECRET
        );

        if (!isValidSignature) {
            return { status: false, error: "Payment verification failed: Invalid HMAC signature." };
        }

        // 2. Anti-Replay Check: Ensure payment ID has not already been used or processed
        const [existingPayments] = await db.promise().query(
            "SELECT id FROM payments WHERE razorpay_payment_id = ?",
            [razorpay_payment_id]
        );
        if (existingPayments.length > 0) {
            return { status: false, error: "This payment has already been verified and credited (duplicate transaction)." };
        }

        // 3. Server-to-Server Verification with Razorpay API (Tamper Proof)
        const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);

        if (!payment || payment.status !== 'captured') {
            return { status: false, error: `Payment not captured by gateway. Status: ${payment?.status || 'unknown'}` };
        }

        if (payment.order_id !== razorpay_order_id) {
            return { status: false, error: "Payment order mismatch: order ID does not match transaction." };
        }

        // Trusted amount directly from Razorpay (paise to rupees)
        const verifiedAmountInRupees = parseFloat((payment.amount / 100).toFixed(2));
        if (verifiedAmountInRupees <= 0) {
            return { status: false, error: "Invalid payment amount detected." };
        }

        // 4. Resolve authenticated user
        let userId = req.user?.id;
        let userEmail = req.user?.email;

        if (!userId && userEmail) {
            const [uRows] = await db.promise().query("SELECT id FROM users WHERE email = ?", [userEmail]);
            if (uRows.length > 0) userId = uRows[0].id;
        }

        if (!userId) {
            return { status: false, error: "Unable to identify user account to credit funds." };
        }

        // 5. Atomic Transaction: Record payment in payments table and credit wallet
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        // Insert into payments table (guaranteed unique by uq_razorpay_payment_id constraint)
        await connection.query(
            `INSERT INTO payments (
                user_id, user_email, tournament_id, razorpay_order_id,
                razorpay_payment_id, amount, currency, status,
                payment_method, created_at, razorpay_created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, NOW(), ?)`,
            [
                userId,
                userEmail || null,
                tournamentId || null,
                razorpay_order_id,
                razorpay_payment_id,
                verifiedAmountInRupees,
                payment.currency || 'INR',
                payment.method || 'unknown',
                new Date(payment.created_at * 1000)
            ]
        );

        // Ensure user wallet exists
        await connection.query(
            `INSERT IGNORE INTO wallets (user_id, deposit_balance, winning_balance, referral_balance) VALUES (?, 0, 0, 0)`,
            [userId]
        );

        // Credit deposit_balance
        await connection.query(
            `UPDATE wallets SET deposit_balance = deposit_balance + ? WHERE user_id = ?`,
            [verifiedAmountInRupees, userId]
        );

        // Record ledger transaction
        await connection.query(
            `INSERT INTO wallet_transactions (
                user_id, type, balance_type, amount, description, reference_id, status
            ) VALUES (?, 'deposit', 'deposit', ?, ?, ?, 'completed')`,
            [
                userId,
                verifiedAmountInRupees,
                `Wallet Top-up via Razorpay (${(payment.method || 'online').toUpperCase()})`,
                razorpay_payment_id
            ]
        );

        await connection.commit();

        return {
            status: true,
            data: {
                success: true,
                message: 'Payment verified and credited to wallet successfully.',
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                amount: verifiedAmountInRupees
            }
        };

    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (rbErr) {}
        }
        console.error("Error in verifyPayment service:", error);
        return { status: false, error: error.message };
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

paymentService.getPaymentStatus = async (req) => {
    try {
        const { paymentId } = req.params;

        const payment = await razorpayInstance.payments.fetch(paymentId);

        return {
            status: true,
            data: {
                id: payment.id,
                amount: payment.amount / 100, // Convert back to rupees
                currency: payment.currency,
                status: payment.status,
                method: payment.method,
                createdAt: new Date(payment.created_at * 1000)
            }
        };

    } catch (error) {
        console.error("Error in getPaymentStatus service:", error);
        return { status: false, error: error.message };
    }
};

// DIRECT TOURNAMENT CHECKOUT: Verify Razorpay payment and immediately book slot in tournament
paymentService.verifyAndJoinTournament = async (req) => {
    let connection = null;
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            tournamentId,
            teamName,
            slotNumber,
            players = [],
            joinMode = 'squad'
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return { status: false, message: "Missing Razorpay payment verification parameters." };
        }

        if (!tournamentId) {
            return { status: false, message: "Tournament ID is required." };
        }

        // 1. Timing-Safe Cryptographic Signature Verification
        const isValidSignature = verifyRazorpaySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            process.env.RAZORPAY_KEY_SECRET
        );

        if (!isValidSignature) {
            return { status: false, message: "Payment verification failed: Invalid HMAC signature." };
        }

        // 2. Anti-Replay Check: Ensure this payment hasn't already been used
        const [existing] = await db.promise().query(
            "SELECT id FROM payments WHERE razorpay_payment_id = ?",
            [razorpay_payment_id]
        );
        if (existing.length > 0) {
            return { status: false, message: "This payment has already been claimed for another entry (duplicate payment ID)." };
        }

        // 3. Fetch payment from Razorpay to verify capture and status
        const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
        if (!payment || payment.status !== 'captured') {
            return { status: false, message: `Payment not captured. Status: ${payment?.status || 'unknown'}` };
        }

        if (payment.order_id !== razorpay_order_id) {
            return { status: false, message: "Payment order mismatch: order ID does not match transaction." };
        }

        // 4. Resolve authenticated user
        const userId = req.user?.id;
        if (!userId) {
            return { status: false, message: "Unauthorized user session. Please log in." };
        }

        // 5. Strict Amount Verification against Tournament Entry Fee in DB
        const [tRows] = await db.promise().query("SELECT * FROM tournaments WHERE id = ?", [tournamentId]);
        if (tRows.length === 0) {
            return { status: false, message: "Tournament not found." };
        }
        const tournament = tRows[0];
        const fullEntry = parseFloat(tournament.entry_fee || 0);
        const reqPlayers = tournament.players_per_team || (tournament.format === '4v4' ? 4 : tournament.format === '2v2' ? 2 : 1);
        const requiredFee = joinMode === 'random' && reqPlayers > 1
            ? parseFloat((fullEntry / reqPlayers).toFixed(2))
            : fullEntry;
        const requiredPaise = Math.round(requiredFee * 100);

        if (payment.amount < requiredPaise) {
            return {
                status: false,
                message: `Payment amount ₹${(payment.amount / 100).toFixed(2)} is less than required tournament entry fee ₹${requiredFee.toFixed(2)}.`
            };
        }

        // 6. Record payment to payments table first
        const verifiedRupees = parseFloat((payment.amount / 100).toFixed(2));
        await db.promise().query(
            `INSERT INTO payments (
                user_id, user_email, tournament_id, razorpay_order_id,
                razorpay_payment_id, amount, currency, status,
                payment_method, created_at, razorpay_created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, NOW(), ?)`,
            [
                userId,
                req.user.email || null,
                tournamentId,
                razorpay_order_id,
                razorpay_payment_id,
                verifiedRupees,
                payment.currency || 'INR',
                payment.method || 'upi',
                new Date(payment.created_at * 1000)
            ]
        );

        // 7. Directly book the slot in the tournament
        const tournamentService = require('./tournament-service');
        const joinResult = await tournamentService.joinTournament(tournamentId, userId, {
            teamName,
            slotNumber,
            players,
            joinMode,
            paymentMethod: 'razorpay',
            razorpayPaymentId: razorpay_payment_id
        });

        // 8. Failsafe Refund: If slot booking failed (e.g. tournament filled up in between), credit paid money to wallet
        if (!joinResult.status) {
            console.warn(`[DIRECT CHECKOUT] Slot booking failed after payment ${razorpay_payment_id}. Refunding ₹${verifiedRupees} to wallet.`);
            await walletService.addFunds(userId, verifiedRupees);
            return {
                status: false,
                message: `${joinResult.message || 'Slot could not be booked.'} Your payment of ₹${verifiedRupees} has been safely credited to your wallet balance.`,
                refundedToWallet: true,
                walletBalanceCredited: verifiedRupees
            };
        }

        return joinResult;
    } catch (error) {
        console.error("Error in verifyAndJoinTournament:", error);
        return { status: false, message: error.message };
    }
};

module.exports = paymentService;
