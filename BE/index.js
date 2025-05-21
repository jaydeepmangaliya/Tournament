
const express = require('express')
const cors = require('cors')
const app = express()
require('./connection')
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


require('./routes/slotes-route')(app);

app.listen(2000,()=>{console.log("server is running on port 2000")});
