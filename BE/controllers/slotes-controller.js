const slotesService = require("../services/slotes-service");
const db  = require("../connection");

exports.newSlote = async(req,res,next)=>{ 
     try{ 
         
            const query = ` SELECT * from slotes where isfull =0 limit 1;`
            const [rows] = await db.promise().query(query);

            const query1 = `SELECT count(slotId) as totalPlayer from players where slotId = ${rows[0].id}`;
            const [rows1] = await db.promise().query(query1);
           
            console.log(rows);
            
            
          if(rows1[0].totalPlayer >= 10){
            const update = `UPDATE slotes SET isfull = 1 where id = ${rows[0].id}`;
            await db.promise().query(update);

            const query2 =` SELECT * from slotes where isfull =0 limit 1;`
            const [rows2] = await db.promise().query(query2);   

            const Playerquery = `INSERT INTO players (slotId, name, phone, ffId) VALUES (${rows2[0].id}, '${req.body.name}', '${req.body.phone}', '${req.body.ffId}')`;
            await db.promise().query(Playerquery);

          }   
          
          const Playerquery = `INSERT INTO players (slotId, name, phone, ffId) VALUES (${rows[0].id}, '${req.body.name}', '${req.body.phone}', '${req.body.ffId}')`;
          await db.promise().query(Playerquery);
          res.send({status:true});
            
    }catch(error){ 
          console.log(error);
          next(error);  
     } 
    }