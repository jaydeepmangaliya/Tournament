const cron = require('node-cron')
const db = require('../connection');
const { executeQuery } = require('../helpers/query-helper');

cron.schedule('*/1 * * * * *', async () => {

  const query = `SELECT slote_id FROM slotes WHERE status = ? `;
  //const [rows] = await db.promise().query(query);
  const rows = await executeQuery(query,["panding"]);
  
  console.log(rows);
  });