const { login } = require('../controllers/auth-controller');


module.exports = app => { 

    const router = require('express').Router();
    
    router.post('/login',login)
    app.use('/auth', router);

}

