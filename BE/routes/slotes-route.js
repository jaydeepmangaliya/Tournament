const { newSlote } = require('../controllers/slotes-controller');
const { verifyToken } = require('../middleware/userAuth');

module.exports = app => { 

    const router = require('express').Router();
    
    router.post('/slotes',verifyToken,newSlote);
    app.use('/api', router);

}

