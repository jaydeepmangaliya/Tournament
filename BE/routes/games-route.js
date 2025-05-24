
const gameController = require('../controllers/games-controller');


module.exports = app => { 

    const router = require('express').Router();
    
   router.get('/games',gameController.games);     

    app.use('/api', router);

}

