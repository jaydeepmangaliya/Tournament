const db = require("../connection");

const MAX_PLAYERS_PER_SLOT = 48;

exports.newSlote = async (req, res, next) => {
  try {
    // Get the authenticated user from req.user
    console.log("ertyuiop",req.user);
    
    const userId = req.user?.email;
    
    if (!userId) {
      return res.status(401).json({ status: false, message: "Unauthorized: Please log in." });
    }

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
      const [newSlot] = await db.promise().query(
        `INSERT INTO slotes (slotId) VALUES (?)`,
        [Date.now()]
      );
      slotId = newSlot.insertId;
    }
     
    const getuser  =  await db.promise().query(
      `SELECT * FROM users WHERE email = ?`,[userId]) 

      // console.log("user",getuser[0][0].id)
      const id =getuser[0][0].id
      console.log("iddddd------------------->",id);
      
      
    // Register player with slot and userId
    await db.promise().query(
      `INSERT INTO players (slotId, userId, name, phone, ffId) VALUES (?, ?, ?, ?, ?)`,
      [slotId, getuser[0][0].id, req.body.name, req.body.phone, req.body.ffId]
    );

    // Check if slot is now full
    const [[{ totalPlayers }]] = await db.promise().query(
      `SELECT COUNT(*) as totalPlayers FROM players WHERE slotId = ?`,
      [slotId]
    );

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
