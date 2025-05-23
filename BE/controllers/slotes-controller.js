const slotesService = require("../services/slotes-service");
const db = require("../connection");

const MAX_PLAYERS_PER_SLOT = 48;

exports.newSlote = async (req, res, next) => {
  try {
    const [openSlots] = await db.promise().query(`
      SELECT s.id FROM slotes s
      LEFT JOIN players p ON s.id = p.slotId
      WHERE s.isfull = 0
      GROUP BY s.id
      HAVING COUNT(p.id) < ?
      LIMIT 1;
    `, [MAX_PLAYERS_PER_SLOT]);

    let slotId;

    if (openSlots.length > 0) {
      
      slotId = openSlots[0].id;
    } else {
     
      const [newSlot] = await db.promise().query(
        `INSERT INTO slotes (slotId) VALUES (?)`,
        [Date.now()]
      );
      slotId = newSlot.insertId;
    }

    // ✅ Insert player safely using placeholders
    await db.promise().query(
      `INSERT INTO players (slotId, name, phone, ffId) VALUES (?, ?, ?, ?)`,
      [slotId, req.body.name, req.body.phone, req.body.ffId]
    );

    // ✅ Check player count and mark slot full if needed
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

    res.status(200).json({ status: true, message: "Player assigned to slot successfully", slotId });

  } catch (error) {
    console.error(error);
    next(error);
  }
};
