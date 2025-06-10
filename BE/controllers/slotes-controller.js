const db = require("../connection");

const MAX_PLAYERS_PER_SLOT = 4;

exports.newSlote = async (req, res, next) => {
  try {
    // Get the authenticated user from req.user
    const userId = req.user?.email;
    if (!userId) {
      return res.status(401).json({ status: false, message: "Unauthorized: Please log in." });
    }

    
    // Call your Razorpay verification function here (should return true/false)
    // const paymentVerified = await verifyRazorpayPayment(razorpay_payment_id);
    // if (!paymentVerified) {
    //   return res.status(402).json({ status: false, message: "Payment not verified." });
    // }

    // Find an open slot with less than MAX_PLAYERS_PER_SLOT players
    const [openSlots] = await db.promise().query(
      `SELECT s.id FROM slotes s
       LEFT JOIN players p ON s.id = p.slotId
       WHERE s.isfull = 0
       GROUP BY s.id
       HAVING COUNT(p.id) < ?
       LIMIT 1`,
      [MAX_PLAYERS_PER_SLOT]
    );

    let slotId;

    if (openSlots.length > 0) {
      // Reuse existing open slot
      slotId = openSlots[0].id;
    } else {
      // Create a new slot
      // const [newSlot] = await db.promise().query(
      //   `INSERT INTO slotes (slotId) VALUES (?)`,
      //   [Date.now()]
      // );
      // slotId = newSlot.insertId;
  

     
    console.log(req.body);
      const query = `INSERT INTO slotes(sloteId,gameId,entryFee,prizePool,customeId,customePassword,startAt) VALUES (?,?,?,?,?,?,?)`;
      const [newSlot] =await db.promise().execute(query, [
        Date.now(),
        req.body.tournamentId,
        req.body.entryFee,
        req.body.prizePool,
        null,
        null,
        null,
      ]);
      
      slotId = newSlot.insertId;
    }
     
    const getuser  =  await db.promise().query(
      `SELECT * FROM users WHERE email = ?`,[userId]) 

      // console.log("user",getuser[0][0].id)
      const id =getuser[0][0].id
      console.log("iddddd------------------->",id);
       
      console.log(req.body);
      
      
    // Register player with slot and userId
     await db.promise().query(
      `INSERT INTO players (slotId, userId, name, phone, ffId) VALUES (?, ?, ?, ?, ?)`,
      [slotId, getuser[0][0].id, req.body.userName, req.body.phoneNumber, req.body.ffId]
    );

    console.log(slotId);
    

    // Check if slot is now full
    const [[{ totalPlayers }]] = await db.promise().query(
      `SELECT COUNT(*) as totalPlayers FROM players WHERE slotId = ?`,
      [slotId]
    );
   
    console.log(totalPlayers);
    
    if (totalPlayers >= MAX_PLAYERS_PER_SLOT) {
      await db.promise().query(
        `UPDATE slotes SET isfull = 1 WHERE id = ?`,
        [slotId]
      );
    }

    res.status(200).json({
      status: true,
      message: "Player registered and assigned to slot successfully",
      slotId,
    });

  } catch (error) {
    console.error("Error in newSlote controller:", error);
    res.status(500).json({
      status: false,
      message: "Something went wrong while assigning slot.",
      error: error.message,
    });
  }
};



exports.getAllslote = async (req, res, next) => {
  try {
    const [total] = await db.promise().query(
      `SELECT COUNT(*) as total FROM slotes WHERE iscomplated = 'pending' AND isfull = 1`
    );
    const [rows] = await db.promise().query(
      `SELECT * FROM slotes WHERE iscomplated = 'pending' AND isfull = 1`
    );
  console.log("rows",rows);
  

    res.status(200).json({ status: true, data: { rows: rows, total: total[0] } });
  } catch (error) {
    console.error("Error in getAllslote controller:", error);
    res.status(500).json({ status: false, message: "Something went wrong." });
  }
};


exports.updateSlote = async (req, res, next) => { 
  try { 
    const { sloteId, customeId, customePassword, startAt } = req.body;
    console.log(sloteId);
    if (!sloteId) {
      return res.status(400).json({ status: false, message: "Missing sloteId." });
    }
  console.log("updateSlote request body:", req.body);
  
      await db.promise().query(
      `UPDATE slotes SET customeId = ?, customePassword = ?, startAt = ? WHERE sloteId = ?`,
      [customeId, customePassword, startAt, sloteId]
    );

    res.status(200).json({ status: true, message: "Slot updated successfully." });
  } catch(error) {
    console.error("Error in updateSlote controller:", error);
    res.status(500).json({ status: false, message: "Something went wrong while updating slot." });
  }
}

// Dummy Razorpay verification function (replace with your real implementation)
async function verifyRazorpayPayment(paymentId) {
  // TODO: Implement actual Razorpay payment verification here
  // For now, always return true for demo
  return true;
}