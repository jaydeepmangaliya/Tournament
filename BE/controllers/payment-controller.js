const paymentService = require("../services/payment-service");
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

exports.createOrder = async (req, res) => {
    try {
        console.log("Creating order with data:", req.body);

        const result = await paymentService.createOrder(req);
        const { status, data, error } = result;

        if (!status) {
            return res.status(400).json({
                status: false,
                message: error || "Failed to create order."
            });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error("Error in createOrder controller:", error);
        res.status(500).json({
            status: false,
            message: "Something went wrong while creating order."
        });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        console.log("Verifying payment with data:", req.body);

        const result = await paymentService.verifyPayment(req);
        const { status, data, error } = result;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: error || "Payment verification failed"
            });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error("Error in verifyPayment controller:", error);
        res.status(500).json({
            success: false,
            error: "Something went wrong while verifying payment."
        });
    }
};

exports.getPaymentStatus = async (req, res) => {
    try {
        const result = await paymentService.getPaymentStatus(req);
        const { status, data, error } = result;

        if (!status) {
            return res.status(400).json({
                error: error || "Failed to fetch payment status"
            });
        }

        res.status(200).json({ success: true, payment: data });
    } catch (error) {
        console.error("Error in getPaymentStatus controller:", error);
        res.status(500).json({
            error: "Something went wrong while fetching payment status."
        });
    }
};

// Export the middleware for use in routes
exports.authenticateToken = authenticateToken;