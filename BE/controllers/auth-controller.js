const authService = require("../services/auth-service")

exports.login=async(req,res,next)=>{ 
  
    try{  

    const result = await authService.login(req.body);
     
    const {status,token} = result;
    
    if(!status){ 
        throw new Error('Login failed. Try again.'); 
    }
    else{ 
        res.send({status:true,token:token})
    }
    
    }catch(error){ 
        console.error(error)
        throw error
    }
   
    


}

