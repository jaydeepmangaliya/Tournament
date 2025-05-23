const { newSlote } = require('../controllers/slotes-controller');
const { verifyToken } = require('../middleware/userAuth');
const userController = require('../controllers/user-controller')

module.exports = app => { 
    const router = require('express').Router();
    router.get('/user',verifyToken ,userController.user);
    
    app.use('/api', router);

}

