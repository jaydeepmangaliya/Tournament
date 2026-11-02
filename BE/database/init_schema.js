// BE/database/init_schema.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../connection');

const schemaQueries = [
  // 1. Users table
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) DEFAULT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) DEFAULT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('player', 'affiliate', 'admin') DEFAULT 'player',
    referral_code VARCHAR(50) UNIQUE,
    referred_by_user_id INT DEFAULT NULL,
    affiliate_id INT DEFAULT NULL,
    status ENUM('active', 'banned', 'pending') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (referral_code),
    INDEX (referred_by_user_id),
    INDEX (affiliate_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  // 2. Affiliates table
  `CREATE TABLE IF NOT EXISTS affiliates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    affiliate_code VARCHAR(50) NOT NULL UNIQUE,
    commission_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
    commission_value DECIMAL(10, 2) DEFAULT 10.00, -- e.g. 10% or ₹10 per match
    total_earned DECIMAL(12, 2) DEFAULT 0.00,
    total_withdrawn DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  // 3. Wallets table (Deposit, Winning, Referral Bonus)
  `CREATE TABLE IF NOT EXISTS wallets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    deposit_balance DECIMAL(12, 2) DEFAULT 0.00,
    winning_balance DECIMAL(12, 2) DEFAULT 0.00,
    referral_balance DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  // 4. Wallet Transactions (Ledger)
  `CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('deposit', 'entry_fee', 'winning', 'affiliate_commission', 'referral_bonus', 'withdrawal') NOT NULL,
    balance_type ENUM('deposit', 'winning', 'referral', 'mixed') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    reference_id VARCHAR(100) DEFAULT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX (user_id),
    INDEX (type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  // 5. Withdrawals
  `CREATE TABLE IF NOT EXISTS withdrawals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role ENUM('player', 'affiliate') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payout_method ENUM('upi', 'bank_transfer') DEFAULT 'upi',
    upi_id VARCHAR(100) DEFAULT NULL,
    bank_account_number VARCHAR(50) DEFAULT NULL,
    bank_ifsc VARCHAR(30) DEFAULT NULL,
    account_holder_name VARCHAR(100) DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    admin_remark VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  // 6. Games table
  `CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon_url TEXT,
    banner_url TEXT,
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  // 7. Tournaments table
  `CREATE TABLE IF NOT EXISTS tournaments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    match_type ENUM('clash', 'battle_royale') NOT NULL, -- clash (custom room) or battle_royale
    format ENUM('1v1', '2v2', '4v4', 'solo', 'duo', 'squad') NOT NULL,
    map_name VARCHAR(100) DEFAULT 'Bermuda',
    total_slots INT NOT NULL, -- e.g. 2 for 1v1, 4 for 2v2, 8 for 4v4, 48 for BR
    total_teams INT NOT NULL, -- e.g. 2 for clash, 12 for 4v4 BR squad, 24 for duo BR, 48 for solo
    players_per_team INT NOT NULL DEFAULT 1, -- 1 for solo/1v1, 2 for duo/2v2, 4 for squad/4v4
    entry_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    prize_pool DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    per_kill_prize DECIMAL(10, 2) DEFAULT 0.00,
    first_prize DECIMAL(10, 2) DEFAULT 0.00,
    second_prize DECIMAL(10, 2) DEFAULT 0.00,
    third_prize DECIMAL(10, 2) DEFAULT 0.00,
    room_id VARCHAR(100) DEFAULT NULL,
    room_password VARCHAR(100) DEFAULT NULL,
    room_shared_at TIMESTAMP NULL DEFAULT NULL,
    match_start_at DATETIME NOT NULL,
    status ENUM('upcoming', 'open', 'ready', 'ongoing', 'completed', 'cancelled') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  // 8. Tournament Teams / Booked Slots
  `CREATE TABLE IF NOT EXISTS tournament_teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    slot_number INT NOT NULL, -- Slot # in room (e.g. 1 to 12 in Squad BR)
    team_name VARCHAR(100) NOT NULL,
    leader_user_id INT NOT NULL,
    entry_fee_paid DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (leader_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tournament_slot (tournament_id, slot_number)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  // 9. Tournament Participants (Roster of players with game UID & in-game name)
  `CREATE TABLE IF NOT EXISTS tournament_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    team_id INT NOT NULL,
    user_id INT DEFAULT NULL, -- Can be null if squad leader registers teammates by UID
    player_name VARCHAR(100) NOT NULL,
    in_game_name VARCHAR(100) NOT NULL,
    in_game_id VARCHAR(100) NOT NULL, -- Free Fire UID / PUBG Character ID
    phone VARCHAR(20) DEFAULT NULL,
    is_leader TINYINT(1) DEFAULT 0,
    slot_position INT NOT NULL DEFAULT 1, -- 1 to 4 in a squad
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES tournament_teams(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  // 10. Payments table (Razorpay records)
  `CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    user_email VARCHAR(150) DEFAULT NULL,
    tournament_id INT DEFAULT NULL,
    razorpay_order_id VARCHAR(100) NOT NULL,
    razorpay_payment_id VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'completed',
    payment_method VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    razorpay_created_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
];

async function init() {
  console.log("Initializing local esports tournament schema...");
  for (const query of schemaQueries) {
    try {
      await db.promise().query(query);
    } catch (err) {
      console.error("Error executing query:", err.message);
      process.exit(1);
    }
  }
  console.log("All tables created successfully!");

  // Insert default games if not present
  const defaultGames = [
    [
      'Free Fire',
      'free-fire',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      'Free Fire Clash Squad 1v1, 2v2, 4v4 and 48-Player Battle Royale Tournaments'
    ],
    [
      'PUBG Mobile',
      'pubg-mobile',
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80',
      'PUBG Mobile Classic Battle Royale and TDM Tournaments'
    ]
  ];

  for (const g of defaultGames) {
    await db.promise().query(
      `INSERT IGNORE INTO games (name, slug, icon_url, banner_url, description) VALUES (?, ?, ?, ?, ?)`,
      g
    );
  }
  console.log("Default games seeded.");

  // Check and seed sample tournaments
  const [games] = await db.promise().query(`SELECT id, slug FROM games`);
  const ff = games.find(g => g.slug === 'free-fire');
  const pubg = games.find(g => g.slug === 'pubg-mobile');

  if (ff) {
    const [existing] = await db.promise().query(`SELECT COUNT(*) as count FROM tournaments WHERE game_id = ?`, [ff.id]);
    if (existing[0].count === 0) {
      const sampleTournaments = [
        // 1v1 Custom Clash
        [
          ff.id,
          'Free Fire 1v1 Solo Duel #1',
          'clash',
          '1v1',
          'Bermuda',
          2, // total slots
          2, // 2 teams (1 vs 1)
          1, // 1 player per team
          30.00, // entry fee
          50.00, // prize pool
          0.00,
          50.00,
          0.00,
          0.00,
          new Date(Date.now() + 3600000 * 2) // 2 hours later
        ],
        // 2v2 Duo Custom Clash
        [
          ff.id,
          'Free Fire 2v2 Duo Clash Showdown',
          'clash',
          '2v2',
          'Bermuda',
          4,
          2, // 2 teams of 2
          2,
          50.00,
          90.00,
          0.00,
          90.00,
          0.00,
          0.00,
          new Date(Date.now() + 3600000 * 4)
        ],
        // 4v4 Clash Squad
        [
          ff.id,
          'Free Fire 4v4 Clash Squad Championship',
          'clash',
          '4v4',
          'Kalahari',
          8,
          2, // 2 teams of 4
          4,
          100.00,
          180.00,
          0.00,
          180.00,
          0.00,
          0.00,
          new Date(Date.now() + 3600000 * 6)
        ],
        // 48-Player Battle Royale Squad (12 Squads x 4 players)
        [
          ff.id,
          'Free Fire 48-Player BR Squad Mega War',
          'battle_royale',
          'squad',
          'Bermuda',
          48,
          12, // 12 squads
          4,
          120.00, // team entry fee (or 30 per player)
          1000.00,
          10.00, // per kill prize
          600.00,
          300.00,
          100.00,
          new Date(Date.now() + 3600000 * 8)
        ],
        // 48-Player BR Solo (48 players)
        [
          ff.id,
          'Free Fire 48-Player BR Solo Survival',
          'battle_royale',
          'solo',
          'Purgatory',
          48,
          48,
          1,
          25.00,
          800.00,
          15.00,
          400.00,
          250.00,
          150.00,
          new Date(Date.now() + 3600000 * 12)
        ],
        // 48-Player BR Duo (24 duos x 2 players)
        [
          ff.id,
          'Free Fire 48-Player BR Duo War',
          'battle_royale',
          'duo',
          'Bermuda',
          48,
          24,
          2,
          60.00,
          900.00,
          15.00,
          500.00,
          250.00,
          150.00,
          new Date(Date.now() + 3600000 * 4)
        ]
      ];

      for (const t of sampleTournaments) {
        await db.promise().query(
          `INSERT INTO tournaments (
            game_id, title, match_type, format, map_name, total_slots,
            total_teams, players_per_team, entry_fee, prize_pool, per_kill_prize,
            first_prize, second_prize, third_prize, match_start_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          t
        );
      }
      console.log("Sample Free Fire tournaments created!");
    }
  }

  if (pubg) {
    const [existingPubg] = await db.promise().query(`SELECT COUNT(*) as count FROM tournaments WHERE game_id = ?`, [pubg.id]);
    if (existingPubg[0].count === 0) {
      await db.promise().query(
        `INSERT INTO tournaments (
          game_id, title, match_type, format, map_name, total_slots,
          total_teams, players_per_team, entry_fee, prize_pool, per_kill_prize,
          first_prize, second_prize, third_prize, match_start_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pubg.id,
          'PUBG Mobile 48-Player BR Squad Battle',
          'battle_royale',
          'squad',
          'Erangel',
          48,
          12,
          4,
          200.00,
          1800.00,
          25.00,
          1000.00,
          500.00,
          300.00,
          new Date(Date.now() + 3600000 * 10)
        ]
      );
      console.log("Sample PUBG Mobile tournaments created!");
    }
  }

  console.log("Database initialized successfully!");
  process.exit(0);
}

init().catch(err => {
  console.error("Initialization failed:", err);
  process.exit(1);
});

