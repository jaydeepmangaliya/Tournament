const paymentService = require("../services/payment-service");

exports.createOrder = async (req, res) => { 
    try{  

        console.log("Creating order with data:")
        
        const result = await paymentService.createOrder(req)
        const { status, data } = result;
        if (!status) {
            return res.status(500).json({ status: false, message: "Failed to create order." });
        }
        res.status(200).json({ status: true, data: data });
    }catch(error){ 
        console.error("Error in createOrder controller:", error);
        res.status(500).json({ status: false, message: "Something went wrong while creating order." });
    }
}