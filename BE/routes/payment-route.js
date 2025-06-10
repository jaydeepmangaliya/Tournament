const paymentController = require('../controllers/payment-controller');
module.exports = app =>{ 

const router = require('express').Router();
 
router.get("/start-payment",paymentController.createOrder);
app.use('/api', router);

}