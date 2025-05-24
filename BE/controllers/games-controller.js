
const gameService  = require('../services/games-service')

exports.games =async(req,res,next)=>{ 

    try{ 
       
        const result = await gameService.games();
        if(!result.status){ 
            throw new Error('Games not found'); 
        }else{ 
            res.send(result.data); 
        }

      
    }catch(error){ 
        console.error(error);
        throw error
        
    }
}