const paymentService =  {};
const razorpay = require('razorpay');
const db = require('../connection');
const cypto = require('crypto');

paymentService.createOrder = async (req) => { 

    try{

        const razoepayInstance  = new razorpay({ 
            key_id:process.env.RAZORPAY_KEY_ID,
            key_secret:process.env.RAZORPAY_KEY_SECRET
        }) 

        const options = { 
            amount: 1 * 100, 
            currency: "INR", 
            receipt: "order_rcptid_11" 
        };
        const order = await razoepayInstance.orders.create(options);
        if (!order) {
            throw new Error("Order creation failed.");
        }
        return { status: true, data: order };

        
         
    }catch(error){ 
        console.error("Error in createOrder service:", error);
        throw new Error("Something went wrong while creating order.");
    }
}
module.exports = paymentService;