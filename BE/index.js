const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

require('./connection');
require('./cron-job/node-cron');

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:2000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, or same-origin build)
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'build')));

// API Routes
require('./routes/auth-route')(app);
require('./routes/tournament-route')(app);
require('./routes/wallet-route')(app);
require('./routes/affiliate-route')(app);
require('./routes/games-route')(app);
require('./routes/payment-route')(app);
require('./routes/slotes-route')(app);
require('./routes/user-route')(app);
require('./routes/admin-route')(app);
require('./routes/notification-route')(app);

// Public Lightweight Visitor Tracker API
app.post('/api/track-visit', async (req, res) => {
  try {
    const { visitorId, path: pagePath, deviceType, userId } = req.body || {};
    if (!visitorId) {
      return res.status(400).json({ status: false, message: 'visitorId is required' });
    }

    // Never track admin panel routes
    if (pagePath && (pagePath.startsWith('/admin') || pagePath.startsWith('/api/admin'))) {
      return res.json({ status: true, message: 'Admin visit ignored' });
    }

    const db = require('./connection');
    const cleanVisitorId = String(visitorId).substring(0, 64);
    const cleanPath = String(pagePath || '/').substring(0, 255);
    const cleanDevice = deviceType === 'mobile' ? 'mobile' : 'desktop';
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress;
    const cleanIp = rawIp ? String(rawIp).replace(/^::ffff:/, '').substring(0, 64) : null;
    const cleanUa = req.headers['user-agent'] ? String(req.headers['user-agent']).substring(0, 500) : null;
    const validUserId = userId ? parseInt(userId, 10) || null : null;

    // Debounce: ignore exact duplicate (same visitor + same path) within 20 seconds
    const [recent] = await db.promise().query(
      `SELECT id FROM site_visits 
       WHERE visitor_id = ? AND path = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 20 SECOND) 
       LIMIT 1`,
      [cleanVisitorId, cleanPath]
    );

    if (recent.length > 0) {
      return res.json({ status: true, message: 'Throttled duplicate' });
    }

    await db.promise().query(
      `INSERT INTO site_visits (visitor_id, path, device_type, ip_address, user_agent, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanVisitorId, cleanPath, cleanDevice, cleanIp, cleanUa, validUserId]
    );

    return res.json({ status: true, message: 'Visit recorded' });
  } catch (err) {
    console.warn('[VISIT TRACKER] Error:', err.message);
    return res.status(200).json({ status: false, message: err.message });
  }
});

// Frontend fallback for non-API routes
app.get(/^\/(?!api|auth).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 2000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Database initialization & sync on boot
  setTimeout(async () => {
    try {
      const db = require('./connection');

      // 1. Ensure site_visits table exists
      await db.promise().query(`
        CREATE TABLE IF NOT EXISTS site_visits (
          id INT AUTO_INCREMENT PRIMARY KEY,
          visitor_id VARCHAR(64) NOT NULL,
          path VARCHAR(255) DEFAULT '/',
          device_type VARCHAR(20) DEFAULT 'desktop',
          ip_address VARCHAR(64) DEFAULT NULL,
          user_agent TEXT DEFAULT NULL,
          user_id INT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_visitor_id (visitor_id),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('[VISIT TRACKER] Table site_visits verified');

      // 2. Auto-calibrate tournament prize pools (Ensure Free Entry & Cap legacy prizes > ₹70 without overwriting admin updates)
      await db.promise().query(`
        UPDATE tournaments 
        SET entry_fee = 0.00
        WHERE entry_fee > 0.00;
      `);
      await db.promise().query(`
        UPDATE tournaments 
        SET prize_pool = 70.00,
            first_prize = CASE WHEN first_prize > 70.00 THEN 70.00 ELSE first_prize END
        WHERE prize_pool > 70.00;
      `);
      console.log('[TOURNAMENT SYNC] All tournament prizes verified (Max ₹70 cap, Entry: FREE)');
    } catch (err) {
      console.warn('[STARTUP SYNC] Notice:', err.message);
    }
  }, 2000);
});
