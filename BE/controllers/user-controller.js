const userService = require("../services/user-service")


exports.user =async(req,res,next)=>{ 
  
    try{
    const result = await userService.user(req.user)
    }  
    catch(error){ 
        console.error(error)
        throw error
    }

} 