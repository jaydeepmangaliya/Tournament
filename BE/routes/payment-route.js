const paymentController = require('../controllers/payment-controller');

module.exports = app => {
    const router = require('express').Router();

    // Create Razorpay Order (with authentication)
    router.post("/payment/create-order", paymentController.authenticateToken, paymentController.createOrder);

    // Verify Payment and credit wallet (with authentication)
    router.post("/payment/verify", paymentController.authenticateToken, paymentController.verifyPayment);

    // Direct Tournament Checkout: Verify Payment and Book Slot immediately (with authentication)
    router.post("/payment/verify-and-join", paymentController.authenticateToken, paymentController.verifyAndJoinTournament);

    // Get Payment Status (with authentication)
    router.get("/payment/status/:paymentId", paymentController.authenticateToken, paymentController.getPaymentStatus);

    app.use('/api', router);
};
