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

// Frontend fallback for non-API routes
app.get(/^\/(?!api|auth).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 2000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
