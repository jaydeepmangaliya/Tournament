const paymentService = {};
const razorpay = require('razorpay');
const db = require('../connection');
const crypto = require('crypto');
const { log } = require('console');

// Initialize Razorpay instance
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

paymentService.createOrder = async (req) => {
    try {
        const { amount, currency = 'INR', tournamentId, tournamentName } = req.body;

        if (!amount || !tournamentId) {
            throw new Error("Amount and tournament ID are required");
        }

        // Convert amount to paise (Razorpay expects amount in smallest currency unit)
        const amountInPaise = Math.round(amount * 100);

        const options = {
            amount: amountInPaise,
            currency: currency,
            receipt: `tournament_${tournamentId}_${Date.now()}`,
            notes: {
                tournamentId: tournamentId,
                tournamentName: tournamentName,
                userId: req.user?.id || 'guest',
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
                receipt: order.receipt
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

module.exports = paymentService;