const paymentController = require('../controllers/payment-controller');
module.exports = app =>{ 

const router = require('express').Router();
 
router.post("/create-order",paymentController.createOrder);
app.use('/api', router);

}