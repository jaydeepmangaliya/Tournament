const userService = {};
const db = require('../connection');

userService.user = async (user) => {
  try {
    // 1. Get user by email
    const query = `SELECT * FROM users WHERE email = ?`;
    const [users] = await db.promise().execute(query, [user.email]);

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const userId = users[0].id;
    console.log(users[0].id);
    

    // 2. Get all slotes the user is registered in via players
  const slotQuery = `
      SELECT s.*
      FROM players p
      JOIN slotes s ON p.slotId = s.id
      WHERE p.userId = ?
    `;
  const [slots] = await db.promise().execute(slotQuery, [userId]);

    return {status :true , data:slots}
  

  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = userService;
