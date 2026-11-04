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

// Frontend fallback for non-API routes
app.get(/^\/(?!api|auth).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 2000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Auto-calibrate tournament prize pools on boot (Ensure Max ₹70 prize pool & Free Entry)
  setTimeout(async () => {
    try {
      const db = require('./connection');
      await db.promise().query(`
        UPDATE tournaments 
        SET entry_fee = 0.00,
            prize_pool = CASE WHEN format = '1v1' THEN 50.00 ELSE 70.00 END,
            first_prize = CASE WHEN format IN ('1v1', '2v2', '4v4') THEN (CASE WHEN format = '1v1' THEN 50.00 ELSE 70.00 END) ELSE 50.00 END,
            second_prize = CASE WHEN format IN ('1v1', '2v2', '4v4') THEN 0.00 ELSE 20.00 END,
            third_prize = 0.00,
            per_kill_prize = 0.00
        WHERE prize_pool > 70.00 OR entry_fee > 0.00;
      `);
      console.log('[TOURNAMENT SYNC] All tournament prizes successfully calibrated (Max ₹70, Entry: FREE)');
    } catch (err) {
      console.warn('[TOURNAMENT SYNC] Notice:', err.message);
    }
  }, 2000);
});
