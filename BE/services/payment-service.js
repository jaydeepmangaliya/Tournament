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

paymentService.createOrder = async (req) => {
    try {
        const { amount, currency = 'INR', tournamentId = 0, tournamentName = 'Tournament / Wallet Top-up' } = req.body;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            throw new Error("Valid amount is required");
        }

        // Convert amount to paise (Razorpay expects amount in smallest currency unit)
        const amountInPaise = Math.round(numAmount * 100);

        const options = {
            amount: amountInPaise,
            currency: currency,
            receipt: `rcpt_${tournamentId || 'wallet'}_${Date.now()}`,
            notes: {
                tournamentId: String(tournamentId || 0),
                tournamentName: tournamentName || 'Wallet Top-up',
                userId: String(req.user?.id || 'guest'),
                userEmail: req.user?.email || 'guest@example.com'
            }
        };

        const order = await razorpayInstance.orders.create(options);

        if (!order) {
            throw new Error("Order creation failed.");
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
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            tournamentId,
            amount
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new Error("Missing payment verification parameters");
        }

        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            throw new Error("Payment verification failed - Invalid signature");
        }

        // Fetch payment details from Razorpay
        const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);

        if (payment.status !== 'captured') {
            throw new Error("Payment not captured");
        }

        // Verify amount matches
        const expectedAmount = Math.round(amount * 100); // Convert to paise
        if (payment.amount !== expectedAmount) {
            throw new Error("Payment amount mismatch");
        }

        
        const [user]  = await db.promise().execute("SELECT id FROM users WHERE email = ?", [req.user?.email || null]);
      
         
        const paymentRecord = {
            userId: user[0]?.id || null, 
            userEmail: req.user?.email || null,
            tournamentId: tournamentId,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            amount: amount,
            currency: payment.currency,
            status: 'completed',
            paymentMethod: payment.method,
            createdAt: new Date(),
            razorpayCreatedAt: new Date(payment.created_at * 1000)
        };
         
        // Save to database (you can customize the table structure)
        const insertQuery = `
            INSERT INTO payments (
                user_id, user_email, tournament_id, razorpay_order_id,
                razorpay_payment_id, amount, currency, status,
                payment_method, created_at, razorpay_created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        try {
            await db.promise().execute(insertQuery, [
               
                
                paymentRecord.userId,
                paymentRecord.userEmail,
                paymentRecord.tournamentId,
                paymentRecord.razorpayOrderId,
                paymentRecord.razorpayPaymentId,
                paymentRecord.amount,
                paymentRecord.currency,
                paymentRecord.status,
                paymentRecord.paymentMethod,
                paymentRecord.createdAt,
                paymentRecord.razorpayCreatedAt
            ]);
        } catch (dbError) {
            console.log('Database insert failed, but payment is verified:', dbError.message);
            // Payment is still valid even if DB insert fails
        }

        // ── CREDIT WALLET after verified payment ──────────────────────────
        // Add paid amount to deposit_balance so player can immediately use it for entry fees
        if (paymentRecord.userId && amount > 0) {
            try {
                await walletService.addFunds(paymentRecord.userId, amount);
                console.log(`[WALLET] Credited ₹${amount} to user ${paymentRecord.userId} after Razorpay payment ${razorpay_payment_id}`);
            } catch (walletErr) {
                // Log but don't fail the response — payment is verified, wallet can be reconciled manually
                console.error('[WALLET] Credit failed after payment verify:', walletErr.message);
            }
        }
        // ──────────────────────────────────────────────────────────────────

        return {
            status: true,
            data: {
                success: true,
                message: 'Payment verified successfully',
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                amount: amount
            }
        };

    } catch (error) {
        console.error("Error in verifyPayment service:", error);
        return { status: false, error: error.message };
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
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            tournamentId,
            amount,
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

        // 1. Verify HMAC SHA256 Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return { status: false, message: "Payment verification failed: Invalid signature." };
        }

        // 2. Fetch payment details from Razorpay to verify capture
        const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
        if (payment.status !== 'captured') {
            return { status: false, message: `Payment not captured. Status: ${payment.status}` };
        }

        // 3. Resolve user ID
        const userId = req.user?.id;
        if (!userId) {
            return { status: false, message: "Unauthorized user session. Please log in." };
        }

        // 4. Save record to payments table
        try {
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
                    amount || (payment.amount / 100),
                    payment.currency || 'INR',
                    payment.method || 'upi',
                    new Date(payment.created_at * 1000)
                ]
            );
        } catch (dbErr) {
            console.error("Payment insert log error:", dbErr.message);
        }

        // 5. Directly book the slot in the tournament via tournamentService!
        const tournamentService = require('./tournament-service');
        const joinResult = await tournamentService.joinTournament(tournamentId, userId, {
            teamName,
            slotNumber,
            players,
            joinMode,
            paymentMethod: 'razorpay',
            razorpayPaymentId: razorpay_payment_id
        });

        return joinResult;
    } catch (error) {
        console.error("Error in verifyAndJoinTournament:", error);
        return { status: false, message: error.message };
    }
};

module.exports = paymentService;