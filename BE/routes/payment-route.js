const paymentController = require('../controllers/payment-controller');

module.exports = app => {
    const router = require('express').Router();

    // Create Razorpay Order (with authentication)
    router.post("/payment/create-order", paymentController.authenticateToken, paymentController.createOrder);

    // Verify Payment and credit wallet (with authentication)
    router.post("/payment/verify", paymentController.authenticateToken, paymentController.verifyPayment);

    // Direct Tournament Checkout: Verify Payment and Book Slot immediately (with authentication)
    router.post("/payment/verify-and-join", paymentController.authenticateToken, paymentController.verifyAndJoinTournament);

    // Direct UPI Payment Details (Dynamic NPCI URI + QR)
    router.get("/payment/upi-info", paymentController.authenticateToken, paymentController.getUpiInfo);

    // Direct UPI Tournament Join (UTR Verification + Slot Booking)
    router.post("/payment/direct-upi-join", paymentController.authenticateToken, paymentController.directUpiJoin);

    // Direct UPI Wallet Top-up (UTR Verification + Wallet Credit)
    router.post("/payment/direct-upi-wallet-topup", paymentController.authenticateToken, paymentController.directUpiWalletTopup);

    // Get Payment Status (with authentication)
    router.get("/payment/status/:paymentId", paymentController.authenticateToken, paymentController.getPaymentStatus);

    app.use('/api', router);
};
