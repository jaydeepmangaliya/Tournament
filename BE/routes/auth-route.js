const { login, register, me, verifyCode, submitKYC } = require('../controllers/auth-controller');
const { verifyToken } = require('../middleware/userAuth');

module.exports = app => { 
  const router = require('express').Router();
  
  router.post('/register', register);
  router.post('/login', login);
  router.get('/verify-code/:code', verifyCode);
  router.get('/me', verifyToken, me);
  router.post('/kyc', verifyToken, submitKYC);

  app.use('/auth', router);
  app.use('/api/auth', router);
};
