const paymentService = {};
const razorpay = require('razorpay');
const db = require('../connection');
const crypto = require('crypto');
const walletService = require('./wallet-service');

// Initialize Razorpay instance (fallback)
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_fallback',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_fallback'
});

// Cashfree Gateway Helper Functions
const isCashfreeConfigured = () => {
    return Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
};

const getCashfreeBaseUrl = () => {
    return (process.env.CASHFREE_ENV || 'TEST').toUpperCase() === 'PRODUCTION'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg';
};

const getCashfreeHeaders = () => {
    return {
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': process.env.CASHFREE_API_VERSION || '2023-08-01',
        'Content-Type': 'application/json'
    };
};

/**
 * Timing-safe HMAC SHA-256 signature verification for Razorpay
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

/**
 * Create Order: Primary Gateway = Cashfree (fallback to Razorpay if Cashfree unconfigured)
 */
paymentService.createOrder = async (req) => {
    try {
        const {
            amount,
            currency = 'INR',
            tournamentId = 0,
            tournamentName = 'Tournament / Wallet Top-up',
            customerPhone,
            customerName
        } = req.body;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 10 || numAmount > 50000) {
            return {
                status: false,
                error: "Invalid payment amount. Amount must be between ₹10 and ₹50,000."
            };
        }

        const userId = req.user?.id || 'guest';
        const userEmail = req.user?.email || 'player@localesport.in';
        let rawPhone = customerPhone || req.user?.phone || '9999999999';
        const cleanPhone = String(rawPhone).replace(/[^0-9]/g, '').slice(-10) || '9999999999';
        const effectiveName = customerName || req.user?.name || req.user?.username || 'Player';

        // 1. PRIMARY GATEWAY: CASHFREE PAYMENTS
        if (isCashfreeConfigured()) {
            const cfOrderId = `cf_${tournamentId ? 'tourn_' + tournamentId : 'wallet'}_${userId}_${Date.now()}`;
            const baseUrl = getCashfreeBaseUrl();
            let clientOrigin = (process.env.CLIENT_URL || '').trim();
            if (!clientOrigin || clientOrigin.includes('<') || clientOrigin.includes('YOUR') || clientOrigin.includes('localhost')) {
                const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
                if (reqHost && !reqHost.includes('localhost') && !reqHost.includes('<')) {
                    const proto = req.headers['x-forwarded-proto'] || 'https';
                    clientOrigin = `${proto}://${reqHost}`;
                } else {
                    clientOrigin = 'https://localesport.in';
                }
            }
            clientOrigin = clientOrigin.replace(/\/+$/, '');

            const cfPayload = {
                order_id: cfOrderId,
                order_amount: parseFloat(numAmount.toFixed(2)),
                order_currency: 'INR',
                customer_details: {
                    customer_id: String(`user_${userId}`),
                    customer_phone: cleanPhone,
                    customer_email: userEmail,
                    customer_name: effectiveName
                },
                order_meta: {
                    return_url: `${clientOrigin}/yourmatches?order_id={order_id}`
                },
                order_tags: {
                    tournamentId: String(tournamentId || 0),
                    userId: String(userId)
                }
            };

            const cfResponse = await fetch(`${baseUrl}/orders`, {
                method: 'POST',
                headers: getCashfreeHeaders(),
                body: JSON.stringify(cfPayload)
            });

            const cfData = await cfResponse.json();

            if (cfResponse.ok && cfData.payment_session_id) {
                console.log(`[Cashfree] Created order ${cfOrderId} for ₹${numAmount}`);
                return {
                    status: true,
                    data: {
                        gateway: 'cashfree',
                        orderId: cfData.order_id,
                        paymentSessionId: cfData.payment_session_id,
                        amount: cfData.order_amount,
                        currency: cfData.order_currency,
                        cfEnv: (process.env.CASHFREE_ENV || 'TEST').toUpperCase(),
                        receipt: cfData.order_id
                    }
                };
            } else {
                console.warn('[Cashfree] Order creation error:', cfData);
                // If Cashfree returns error, throw so it can be logged or fall back
                throw new Error(cfData.message || 'Cashfree order creation failed');
            }
        }

        // 2. FALLBACK GATEWAY: RAZORPAY
        const amountInPaise = Math.round(numAmount * 100);
        const options = {
            amount: amountInPaise,
            currency: currency,
            receipt: `rcpt_${tournamentId || 'wallet'}_${Date.now()}`,
            notes: {
                tournamentId: String(tournamentId || 0),
                tournamentName: String(tournamentName || 'Wallet Top-up').substring(0, 40),
                userId: String(userId),
                userEmail: userEmail
            }
        };

        const order = await razorpayInstance.orders.create(options);
        return {
            status: true,
            data: {
                gateway: 'razorpay',
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

/**
 * Verify Wallet Top-Up Payment (Cashfree & Razorpay)
 */
paymentService.verifyPayment = async (req) => {
    let connection = null;
    try {
        const {
            order_id,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            tournamentId
        } = req.body;

        const effectiveOrderId = order_id || razorpay_order_id;
        if (!effectiveOrderId && !razorpay_payment_id) {
            return { status: false, error: "Missing required order ID or payment parameters." };
        }

        let verifiedAmount = 0;
        let verifiedPaymentId = '';
        let paymentMethodName = 'online';

        // 1. CASHFREE VERIFICATION
        if (effectiveOrderId && (effectiveOrderId.startsWith('cf_') || isCashfreeConfigured())) {
            const baseUrl = getCashfreeBaseUrl();
            const cfRes = await fetch(`${baseUrl}/orders/${effectiveOrderId}`, {
                headers: getCashfreeHeaders()
            });
            const cfOrder = await cfRes.json();

            if (!cfRes.ok || !cfOrder) {
                return { status: false, error: "Order not found in Cashfree gateway." };
            }

            let isPaid = cfOrder.order_status === 'PAID';

            // Check payments list if order status hasn't updated yet
            if (!isPaid) {
                const payRes = await fetch(`${baseUrl}/orders/${effectiveOrderId}/payments`, {
                    headers: getCashfreeHeaders()
                });
                if (payRes.ok) {
                    const payments = await payRes.json();
                    if (Array.isArray(payments) && payments.some(p => p.payment_status === 'SUCCESS')) {
                        isPaid = true;
                        const successfulPay = payments.find(p => p.payment_status === 'SUCCESS');
                        verifiedPaymentId = String(successfulPay.cf_payment_id || successfulPay.payment_id || effectiveOrderId);
                        paymentMethodName = successfulPay.payment_group || 'upi';
                    }
                }
            }

            if (!isPaid) {
                return { status: false, error: `Payment not completed. Order status: ${cfOrder.order_status}` };
            }

            verifiedAmount = parseFloat(cfOrder.order_amount);
            if (!verifiedPaymentId) {
                verifiedPaymentId = `cf_pay_${effectiveOrderId}`;
            }

        } else {
            // 2. RAZORPAY VERIFICATION
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return { status: false, error: "Missing required Razorpay verification parameters." };
            }

            const isValidSignature = verifyRazorpaySignature(
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                process.env.RAZORPAY_KEY_SECRET
            );

            if (!isValidSignature) {
                return { status: false, error: "Payment verification failed: Invalid HMAC signature." };
            }

            const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
            if (!payment || payment.status !== 'captured') {
                return { status: false, error: `Payment not captured by gateway. Status: ${payment?.status || 'unknown'}` };
            }

            verifiedAmount = parseFloat((payment.amount / 100).toFixed(2));
            verifiedPaymentId = razorpay_payment_id;
            paymentMethodName = payment.method || 'online';
        }

        // 3. Anti-Replay Check: Ensure payment ID or order ID has not already been used or processed
        const [existingPayments] = await db.promise().query(
            "SELECT id FROM payments WHERE razorpay_payment_id = ? OR razorpay_order_id = ?",
            [verifiedPaymentId, effectiveOrderId]
        );
        if (existingPayments.length > 0) {
            return {
                status: true,
                data: {
                    success: true,
                    alreadyProcessed: true,
                    message: "Payment already verified and credited to your wallet.",
                    paymentId: verifiedPaymentId,
                    orderId: effectiveOrderId,
                    amount: verifiedAmount
                }
            };
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

        await connection.query(
            `INSERT INTO payments (
                user_id, user_email, tournament_id, razorpay_order_id,
                razorpay_payment_id, amount, currency, status,
                payment_method, created_at, razorpay_created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'INR', 'completed', ?, NOW(), NOW())`,
            [
                userId,
                userEmail || null,
                tournamentId || null,
                effectiveOrderId,
                verifiedPaymentId,
                verifiedAmount,
                paymentMethodName
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
            [verifiedAmount, userId]
        );

        // Record ledger transaction
        await connection.query(
            `INSERT INTO wallet_transactions (
                user_id, type, balance_type, amount, description, reference_id, status
            ) VALUES (?, 'deposit', 'deposit', ?, ?, ?, 'completed')`,
            [
                userId,
                verifiedAmount,
                `Wallet Top-up via Cashfree (${paymentMethodName.toUpperCase()})`,
                verifiedPaymentId
            ]
        );

        await connection.commit();

        return {
            status: true,
            data: {
                success: true,
                message: 'Payment verified and credited to wallet successfully.',
                paymentId: verifiedPaymentId,
                orderId: effectiveOrderId,
                amount: verifiedAmount
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

/**
 * DIRECT TOURNAMENT CHECKOUT: Verify Cashfree/Razorpay payment and immediately book slot in tournament
 */
paymentService.verifyAndJoinTournament = async (req) => {
    try {
        const {
            order_id,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            tournamentId,
            teamName,
            slotNumber,
            players = [],
            joinMode = 'squad'
        } = req.body;

        const effectiveOrderId = order_id || razorpay_order_id;

        if (!effectiveOrderId && !razorpay_payment_id) {
            return { status: false, message: "Missing order or payment verification parameters." };
        }

        if (!tournamentId) {
            return { status: false, message: "Tournament ID is required." };
        }

        // 1. Resolve authenticated user
        const userId = req.user?.id;
        if (!userId) {
            return { status: false, message: "Unauthorized user session. Please log in." };
        }

        // 2. Fetch tournament details and verify entry fee requirement
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

        let verifiedAmount = 0;
        let verifiedPaymentId = '';
        let paymentMethodName = 'upi';

        // 3. CASHFREE DIRECT CHECKOUT VERIFICATION
        if (effectiveOrderId && (effectiveOrderId.startsWith('cf_') || isCashfreeConfigured())) {
            const baseUrl = getCashfreeBaseUrl();
            const cfRes = await fetch(`${baseUrl}/orders/${effectiveOrderId}`, {
                headers: getCashfreeHeaders()
            });
            const cfOrder = await cfRes.json();

            if (!cfRes.ok || !cfOrder) {
                return { status: false, message: "Order not found in Cashfree gateway." };
            }

            let isPaid = cfOrder.order_status === 'PAID';

            // Check payments list if order status hasn't updated yet
            if (!isPaid) {
                const payRes = await fetch(`${baseUrl}/orders/${effectiveOrderId}/payments`, {
                    headers: getCashfreeHeaders()
                });
                if (payRes.ok) {
                    const payments = await payRes.json();
                    if (Array.isArray(payments) && payments.some(p => p.payment_status === 'SUCCESS')) {
                        isPaid = true;
                        const successfulPay = payments.find(p => p.payment_status === 'SUCCESS');
                        verifiedPaymentId = String(successfulPay.cf_payment_id || successfulPay.payment_id || effectiveOrderId);
                        paymentMethodName = successfulPay.payment_group || 'upi';
                    }
                }
            }

            if (!isPaid) {
                return { status: false, message: `Payment not completed. Status: ${cfOrder.order_status}` };
            }

            verifiedAmount = parseFloat(cfOrder.order_amount);
            if (!verifiedPaymentId) {
                verifiedPaymentId = `cf_pay_${effectiveOrderId}`;
            }

        } else {
            // 4. RAZORPAY DIRECT CHECKOUT VERIFICATION
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return { status: false, message: "Missing Razorpay payment verification parameters." };
            }

            const isValidSignature = verifyRazorpaySignature(
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                process.env.RAZORPAY_KEY_SECRET
            );

            if (!isValidSignature) {
                return { status: false, message: "Payment verification failed: Invalid HMAC signature." };
            }

            const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
            if (!payment || payment.status !== 'captured') {
                return { status: false, message: `Payment not captured. Status: ${payment?.status || 'unknown'}` };
            }

            verifiedAmount = parseFloat((payment.amount / 100).toFixed(2));
            verifiedPaymentId = razorpay_payment_id;
            paymentMethodName = payment.method || 'online';
        }

        // 5. Anti-Replay Check: Ensure this payment hasn't already been used to join
        const [existing] = await db.promise().query(
            "SELECT id FROM payments WHERE razorpay_payment_id = ? OR razorpay_order_id = ?",
            [verifiedPaymentId, effectiveOrderId]
        );
        if (existing.length > 0) {
            return { status: false, message: "This payment has already been claimed for another entry (duplicate transaction)." };
        }

        // 6. Strict Amount Verification
        if (verifiedAmount < requiredFee) {
            return {
                status: false,
                message: `Payment amount ₹${verifiedAmount.toFixed(2)} is less than required tournament entry fee ₹${requiredFee.toFixed(2)}.`
            };
        }

        // 7. Record payment in payments table
        await db.promise().query(
            `INSERT INTO payments (
                user_id, user_email, tournament_id, razorpay_order_id,
                razorpay_payment_id, amount, currency, status,
                payment_method, created_at, razorpay_created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'INR', 'completed', ?, NOW(), NOW())`,
            [
                userId,
                req.user.email || null,
                tournamentId,
                effectiveOrderId,
                verifiedPaymentId,
                verifiedAmount,
                paymentMethodName
            ]
        );

        // 8. Directly book the slot in the tournament
        const tournamentService = require('./tournament-service');
        const joinResult = await tournamentService.joinTournament(tournamentId, userId, {
            teamName,
            slotNumber,
            players,
            joinMode,
            paymentMethod: 'cashfree',
            razorpayPaymentId: verifiedPaymentId
        });

        // 9. Failsafe Refund: If slot booking failed (e.g. tournament filled up in between), credit money to wallet
        if (!joinResult.status) {
            console.warn(`[DIRECT CHECKOUT] Slot booking failed after payment ${verifiedPaymentId}. Refunding ₹${verifiedAmount} to wallet.`);
            await walletService.addFunds(userId, verifiedAmount);
            return {
                status: false,
                message: `${joinResult.message || 'Slot could not be booked.'} Your payment of ₹${verifiedAmount} has been safely credited to your wallet balance.`,
                refundedToWallet: true,
                walletBalanceCredited: verifiedAmount
            };
        }

        return joinResult;
    } catch (error) {
        console.error("Error in verifyAndJoinTournament:", error);
        return { status: false, message: error.message };
    }
};

paymentService.getPaymentStatus = async (req) => {
    try {
        const { paymentId } = req.params;

        if (paymentId.startsWith('cf_')) {
            const baseUrl = getCashfreeBaseUrl();
            const res = await fetch(`${baseUrl}/orders/${paymentId}`, {
                headers: getCashfreeHeaders()
            });
            const cfOrder = await res.json();
            return {
                status: true,
                data: {
                    id: cfOrder.order_id,
                    amount: cfOrder.order_amount,
                    currency: cfOrder.order_currency,
                    status: cfOrder.order_status,
                    method: 'cashfree',
                    createdAt: cfOrder.created_at
                }
            };
        }

        const payment = await razorpayInstance.payments.fetch(paymentId);
        return {
            status: true,
            data: {
                id: payment.id,
                amount: payment.amount / 100,
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

/**
 * GET UPI PAYMENT DETAILS (Configurable UPI ID, Payee Name, Dynamic NPCI URI)
 */
paymentService.getUpiInfo = async (req) => {
    try {
        const { tournamentId = 0, amount = 0, slotNumber = 1 } = req.query;
        const upiId = process.env.ADMIN_UPI_ID || 'localesport@upi';
        const payeeName = process.env.ADMIN_UPI_NAME || 'LocalEsport';
        const numAmount = parseFloat(amount || 0);

        const note = tournamentId && tournamentId != '0'
            ? `LE_Match_${tournamentId}_Slot_${slotNumber}`
            : `LE_Wallet_Topup`;

        // Standard NPCI UPI URI Scheme
        const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${numAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

        return {
            status: true,
            data: {
                upiId,
                payeeName,
                amount: numAmount,
                note,
                upiUri,
            }
        };
    } catch (error) {
        console.error("Error in getUpiInfo:", error);
        return { status: false, error: error.message };
    }
};

/**
 * DIRECT UPI JOIN: Player pays via GPay/PhonePe/Paytm and submits 12-digit UTR
 */
paymentService.directUpiJoin = async (req) => {
    try {
        const {
            tournamentId,
            slotNumber,
            teamName,
            players = [],
            joinMode = 'squad',
            utr,
            upiApp = 'upi'
        } = req.body;

        const userId = req.user?.id;
        if (!userId) {
            return { status: false, message: "Unauthorized. Please log in." };
        }

        if (!tournamentId) {
            return { status: false, message: "Tournament ID is required." };
        }

        if (!utr || String(utr).trim().length < 8) {
            return { status: false, message: "Please enter a valid 12-digit UPI Transaction ID (UTR)." };
        }

        const cleanUtr = String(utr).trim();

        // 1. Anti-Replay: Verify UTR has not already been used
        const [existing] = await db.promise().query(
            "SELECT id FROM payments WHERE razorpay_payment_id = ? OR razorpay_order_id = ?",
            [cleanUtr, `UPI_${cleanUtr}`]
        );
        if (existing.length > 0) {
            return {
                status: false,
                message: "This UPI Transaction ID (UTR) has already been submitted. Every payment can only be used once."
            };
        }

        // 2. Fetch tournament entry fee
        const [tRows] = await db.promise().query("SELECT * FROM tournaments WHERE id = ?", [tournamentId]);
        if (tRows.length === 0) {
            return { status: false, message: "Tournament not found." };
        }
        const tournament = tRows[0];
        const fullEntry = parseFloat(tournament.entry_fee || 0);
        const reqPlayers = tournament.players_per_team || 1;
        const requiredFee = joinMode === 'random' && reqPlayers > 1
            ? parseFloat((fullEntry / reqPlayers).toFixed(2))
            : fullEntry;

        // 3. Record in payments table
        await db.promise().query(
            `INSERT INTO payments (
                user_id, user_email, tournament_id, razorpay_order_id,
                razorpay_payment_id, amount, currency, status,
                payment_method, created_at, razorpay_created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'INR', 'completed', ?, NOW(), NOW())`,
            [
                userId,
                req.user.email || null,
                tournamentId,
                `UPI_DIRECT_T${tournamentId}`,
                cleanUtr,
                requiredFee,
                `upi_${upiApp}`
            ]
        );

        // 4. Book slot in tournament
        const tournamentService = require('./tournament-service');
        const joinResult = await tournamentService.joinTournament(tournamentId, userId, {
            teamName,
            slotNumber,
            players,
            joinMode,
            paymentMethod: 'direct',
            paymentId: cleanUtr
        });

        if (!joinResult.status) {
            // Rollback payment record if join failed
            await db.promise().query("DELETE FROM payments WHERE razorpay_payment_id = ?", [cleanUtr]);
            return joinResult;
        }

        return {
            status: true,
            message: `Registration confirmed! You are locked in Slot #${slotNumber}!`,
            data: {
                slot: slotNumber,
                teamName: teamName,
                utr: cleanUtr,
                feePaid: requiredFee
            }
        };

    } catch (error) {
        console.error("Error in directUpiJoin:", error);
        return { status: false, message: error.message };
    }
};

/**
 * DIRECT UPI WALLET TOP-UP: Player adds funds via Direct UPI
 */
paymentService.directUpiWalletTopup = async (req) => {
    let connection = null;
    try {
        const { amount, utr, upiApp = 'upi' } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return { status: false, message: "Unauthorized. Please log in." };
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 10) {
            return { status: false, message: "Minimum top-up amount is ₹10." };
        }

        if (!utr || String(utr).trim().length < 8) {
            return { status: false, message: "Please enter a valid 12-digit UPI Transaction ID (UTR)." };
        }

        const cleanUtr = String(utr).trim();

        // 1. Anti-Replay: Verify UTR has not already been used
        const [existing] = await db.promise().query(
            "SELECT id FROM payments WHERE razorpay_payment_id = ? OR razorpay_order_id = ?",
            [cleanUtr, `UPI_WALLET_${cleanUtr}`]
        );
        if (existing.length > 0) {
            return {
                status: false,
                message: "This UPI Transaction ID (UTR) has already been used for another transaction."
            };
        }

        // 2. Atomic credit
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        await connection.query(
            `INSERT INTO payments (
                user_id, user_email, tournament_id, razorpay_order_id,
                razorpay_payment_id, amount, currency, status,
                payment_method, created_at, razorpay_created_at
            ) VALUES (?, ?, NULL, ?, ?, ?, 'INR', 'completed', ?, NOW(), NOW())`,
            [
                userId,
                req.user.email || null,
                `UPI_WALLET_${cleanUtr}`,
                cleanUtr,
                numAmount,
                `upi_${upiApp}`
            ]
        );

        await connection.query(
            `INSERT IGNORE INTO wallets (user_id, deposit_balance, winning_balance, referral_balance) VALUES (?, 0, 0, 0)`,
            [userId]
        );

        await connection.query(
            `UPDATE wallets SET deposit_balance = deposit_balance + ? WHERE user_id = ?`,
            [numAmount, userId]
        );

        await connection.query(
            `INSERT INTO wallet_transactions (
                user_id, type, balance_type, amount, description, reference_id, status
            ) VALUES (?, 'deposit', 'deposit', ?, ?, ?, 'completed')`,
            [
                userId,
                numAmount,
                `Wallet Top-up via Direct UPI (${cleanUtr})`,
                cleanUtr
            ]
        );

        await connection.commit();

        return {
            status: true,
            message: `₹${numAmount} successfully added to your wallet!`,
            data: {
                amount: numAmount,
                utr: cleanUtr
            }
        };

    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (rb) {}
        }
        console.error("Error in directUpiWalletTopup:", error);
        return { status: false, message: error.message };
    } finally {
        if (connection) connection.release();
    }
};

module.exports = paymentService;
