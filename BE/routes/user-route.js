const { newSlote } = require('../controllers/slotes-controller');
const userController = require('../controllers/user-controller');
const { verifyToken } = require('../middleware/userAuth');


module.exports = app => { 
    const router = require('express').Router();
    router.get('/user' ,verifyToken,userController.user);
    app.use('/api', router);

}

