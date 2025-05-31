const slotesController = require('../controllers/slotes-controller');
const { verifyToken } = require('../middleware/userAuth');

module.exports = app => { 

    const router = require('express').Router();
    
    router.get('/slotes',slotesController.getAllslote);

    router.post('/slotes',verifyToken,slotesController.newSlote);

    // Temporarily remove verifyToken for debugging
    // router.post('/update-slote', verifyToken, slotesController.updateSlote);
    router.post('/update-slote', slotesController.updateSlote);

    app.use('/api', router);
}

