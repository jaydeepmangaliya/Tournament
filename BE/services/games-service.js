const gameService = {};
const db = require('../connection')

gameService.games =async()=>{  
    try{ 
        const query = `SELECT * FROM games`;
        const [rows] = await db.promise().query(query);
        return {status :true , data:rows}

    }catch(error){ 
        console.error(error);
        throw error
    }
}

module.exports = gameService