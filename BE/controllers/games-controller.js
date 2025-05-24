
const gameService  = require('../services/games-service')

exports.games =async(req,res,next)=>{ 

    try{ 
       
        const result = await gameService.games()

      
    }catch(error){ 
        console.error(error);
        throw error
        
    }
}