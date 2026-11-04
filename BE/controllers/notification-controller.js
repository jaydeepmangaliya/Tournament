const notificationService = require('../services/notification-service');

exports.getVapidKey = (req, res) => {
  try {
    const key = notificationService.getPublicKey();
    res.status(200).json({ status: true, publicKey: key });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.subscribe = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ status: false, message: 'User not authenticated' });
    }

    const { subscription } = req.body;
    if (!subscription) {
      return res.status(400).json({ status: false, message: 'Push subscription required' });
    }

    const result = await notificationService.saveSubscription(userId, subscription);
    res.status(200).json(result);
  } catch (error) {
    console.error('Subscription controller error:', error);
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.sendTestNotification = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ status: false, message: 'User not authenticated' });
    }

    const payload = {
      title: '🔔 LocalEsport Test Notification',
      body: 'Push alerts are working perfectly on your device! You will receive instant Room ID & Password alerts.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'test-push-notification',
      url: '/yourmatches',
      data: { url: '/yourmatches' },
    };

    const result = await notificationService.sendToUser(userId, payload);
    res.status(200).json({
      status: true,
      message: `Test push sent! (${result.delivered} device(s) delivered)`,
      result,
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ status: false, message: error.message });
  }
};
