const db = require('../connection')

exports.executeQuery = async (query, params = []) => {
  try {
    const [rows] = await db.promise().execute(query, params);
    return rows;
  } catch (error) {
    console.error('Query Error:', error);
    throw error;
  }
};