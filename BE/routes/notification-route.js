const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification-controller');
const { verifyToken } = require('../middleware/userAuth');

module.exports = (app) => {
  router.get('/notifications/vapid-key', notificationController.getVapidKey);
  router.post('/notifications/subscribe', verifyToken, notificationController.subscribe);
  router.post('/notifications/test', verifyToken, notificationController.sendTestNotification);

  app.use('/api', router);
};
