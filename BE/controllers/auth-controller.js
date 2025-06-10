const authService = require("../services/auth-service")

exports.login=async(req,res,next)=>{ 
  
    try{  

    const result = await authService.login(req.body);
     
    const {status,token,message} = result;
    
    if(!status){ 
        throw new Error(message); 
    }
    else{ 
        res.send({status:true,token:token,message:message})
    }
    
    }catch(error){ 
        console.error(error)
        throw error
    }
   
    


}

