const mysql = require('mysql2');
require('dotenv').config();



const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "JD@rootJD",
  database:"tournament",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err.stack);
    return;
  }
  console.log('Successfully connected to MySQL database');
  connection.release(); 
});

module.exports = pool;
