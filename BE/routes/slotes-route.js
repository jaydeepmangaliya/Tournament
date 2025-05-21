const { newSlote } = require('../controllers/slotes-controller');

module.exports = app => { 

    const router = require('express').Router();
    
    router.post('/slotes', newSlote);
    app.use('/api', router);

}

