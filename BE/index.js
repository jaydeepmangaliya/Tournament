
const express = require('express')
const cors = require('cors')
const app = express()
require('./connection')
require('./cron-job/node-cron')
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


require('./routes/slotes-route')(app);
require('./routes/auth-route')(app);
require('./routes/user-route')(app)
require('./routes/games-route')(app)
require('./routes/payment-route')(app)

app.listen(2000,()=>{console.log("server is running on port 2000")});
