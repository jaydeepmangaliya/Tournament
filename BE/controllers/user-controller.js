const userService = require("../services/user-service")


exports.user =async(req,res,next)=>{ 
  
    try{
    const result = await userService.user(req.user)
    
    const {status , data} = result;
   
    res.status(200).json({
      status: true,
      data:data
    });

    }  
    catch(error){ 
        console.error(error)
        throw error
    }

} 