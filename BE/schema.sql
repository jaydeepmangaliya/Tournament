-- LocalEsport Tournament Platform MySQL Schema for AWS RDS
CREATE DATABASE IF NOT EXISTS `tournament`;
USE `tournament`;

SET FOREIGN_KEY_CHECKS = 0;

-- Table: affiliates
DROP TABLE IF EXISTS `affiliates`;
CREATE TABLE `affiliates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `affiliate_code` varchar(50) NOT NULL,
  `commission_type` enum('percentage','fixed') DEFAULT 'percentage',
  `commission_value` decimal(10,2) DEFAULT '10.00',
  `total_earned` decimal(12,2) DEFAULT '0.00',
  `total_withdrawn` decimal(12,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `affiliate_code` (`affiliate_code`),
  CONSTRAINT `affiliates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: games
DROP TABLE IF EXISTS `games`;
CREATE TABLE `games` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `icon_url` text,
  `banner_url` text,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: payments
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `user_email` varchar(150) DEFAULT NULL,
  `tournament_id` int DEFAULT NULL,
  `razorpay_order_id` varchar(100) NOT NULL,
  `razorpay_payment_id` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `status` varchar(50) DEFAULT 'completed',
  `payment_method` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `razorpay_created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_razorpay_payment_id` (`razorpay_payment_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: tournament_participants
DROP TABLE IF EXISTS `tournament_participants`;
CREATE TABLE `tournament_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `team_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `player_name` varchar(100) NOT NULL,
  `in_game_name` varchar(100) NOT NULL,
  `in_game_id` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `is_leader` tinyint(1) DEFAULT '0',
  `slot_position` int NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tournament_id` (`tournament_id`),
  KEY `team_id` (`team_id`),
  CONSTRAINT `tournament_participants_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tournament_participants_ibfk_2` FOREIGN KEY (`team_id`) REFERENCES `tournament_teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: tournament_teams
DROP TABLE IF EXISTS `tournament_teams`;
CREATE TABLE `tournament_teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `slot_number` int NOT NULL,
  `team_name` varchar(100) NOT NULL,
  `leader_user_id` int NOT NULL,
  `entry_fee_paid` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `rank_position` int DEFAULT NULL,
  `prize_won` decimal(10,2) DEFAULT '0.00',
  `kills` int DEFAULT '0',
  `is_random_squad` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tournament_slot` (`tournament_id`,`slot_number`),
  KEY `leader_user_id` (`leader_user_id`),
  CONSTRAINT `tournament_teams_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tournament_teams_ibfk_2` FOREIGN KEY (`leader_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: tournaments
DROP TABLE IF EXISTS `tournaments`;
CREATE TABLE `tournaments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `game_id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `match_type` enum('clash','battle_royale') NOT NULL,
  `format` enum('1v1','2v2','4v4','solo','duo','squad') NOT NULL,
  `map_name` varchar(100) DEFAULT 'Bermuda',
  `total_slots` int NOT NULL,
  `total_teams` int NOT NULL,
  `players_per_team` int NOT NULL DEFAULT '1',
  `entry_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `prize_pool` decimal(10,2) NOT NULL DEFAULT '0.00',
  `per_kill_prize` decimal(10,2) DEFAULT '0.00',
  `first_prize` decimal(10,2) DEFAULT '0.00',
  `second_prize` decimal(10,2) DEFAULT '0.00',
  `third_prize` decimal(10,2) DEFAULT '0.00',
  `room_id` varchar(100) DEFAULT NULL,
  `room_password` varchar(100) DEFAULT NULL,
  `room_shared_at` timestamp NULL DEFAULT NULL,
  `match_start_at` datetime NOT NULL,
  `status` enum('upcoming','open','ready','ongoing','completed','cancelled') DEFAULT 'open',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `winner_summary` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `game_id` (`game_id`),
  CONSTRAINT `tournaments_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('player','affiliate','admin') DEFAULT 'player',
  `referral_code` varchar(50) DEFAULT NULL,
  `referred_by_user_id` int DEFAULT NULL,
  `affiliate_id` int DEFAULT NULL,
  `status` enum('active','banned','pending') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `state` varchar(100) DEFAULT NULL,
  `is_18_plus` tinyint(1) DEFAULT '1',
  `kyc_status` enum('not_submitted','pending','verified','rejected') DEFAULT 'not_submitted',
  `pan_number` varchar(20) DEFAULT NULL,
  `pan_name` varchar(100) DEFAULT NULL,
  `aadhaar_last4` varchar(4) DEFAULT NULL,
  `kyc_rejection_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `referral_code` (`referral_code`),
  KEY `referral_code_2` (`referral_code`),
  KEY `referred_by_user_id` (`referred_by_user_id`),
  KEY `affiliate_id` (`affiliate_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: wallet_transactions
DROP TABLE IF EXISTS `wallet_transactions`;
CREATE TABLE `wallet_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` enum('deposit','entry_fee','winning','affiliate_commission','referral_bonus','withdrawal','refund') DEFAULT NULL,
  `balance_type` enum('deposit','winning','referral','mixed') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `reference_id` varchar(100) DEFAULT NULL,
  `status` enum('pending','completed','failed','refunded') DEFAULT 'completed',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `type` (`type`),
  CONSTRAINT `wallet_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: wallets
DROP TABLE IF EXISTS `wallets`;
CREATE TABLE `wallets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `deposit_balance` decimal(12,2) DEFAULT '0.00',
  `winning_balance` decimal(12,2) DEFAULT '0.00',
  `referral_balance` decimal(12,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `wallets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: withdrawals
DROP TABLE IF EXISTS `withdrawals`;
CREATE TABLE `withdrawals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `role` enum('player','affiliate') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payout_method` enum('upi','bank_transfer') DEFAULT 'upi',
  `upi_id` varchar(100) DEFAULT NULL,
  `bank_account_number` varchar(50) DEFAULT NULL,
  `bank_ifsc` varchar(30) DEFAULT NULL,
  `account_holder_name` varchar(100) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `admin_remark` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `gross_amount` decimal(12,2) DEFAULT NULL,
  `tds_rate` decimal(5,2) DEFAULT '30.00',
  `tds_amount` decimal(12,2) DEFAULT '0.00',
  `net_payout` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `withdrawals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: push_subscriptions
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` varchar(255) NOT NULL,
  `auth` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_endpoint` (`user_id`,`endpoint`(190)),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_push_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed: Default Games
INSERT INTO `games` (`id`, `name`, `slug`, `is_active`) VALUES
(1, 'Free Fire', 'free-fire', 1),
(2, 'PUBG Mobile', 'pubg-mobile', 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Seed: Admin User & Wallet (Password: 733N733N)
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `status`, `is_18_plus`) VALUES
(1, 'Admin JP', 'admin.jp@gmail.com', '9999999999', '$2b$10$IHckJZwc4gKeVEFOrE4g5OPvG3LzxEyAFI2xie1jQBjx9o0MS0Fwu', 'admin', 'active', 1)
ON DUPLICATE KEY UPDATE `role`='admin', `password`='$2b$10$IHckJZwc4gKeVEFOrE4g5OPvG3LzxEyAFI2xie1jQBjx9o0MS0Fwu';

INSERT INTO `wallets` (`id`, `user_id`, `deposit_balance`, `winning_balance`, `referral_balance`) VALUES
(1, 1, 0.00, 0.00, 0.00)
ON DUPLICATE KEY UPDATE `user_id`=1;

-- Seed: 7 Official Free Fire Tournaments (Open Lobbies)
INSERT INTO `tournaments` 
(`id`, `game_id`, `title`, `match_type`, `format`, `map_name`, `total_slots`, `total_teams`, `players_per_team`, `entry_fee`, `prize_pool`, `per_kill_prize`, `first_prize`, `second_prize`, `third_prize`, `match_start_at`, `status`) 
VALUES
(1, 1, 'Free Fire 1v1 Solo Duel', 'clash', '1v1', 'Bermuda', 2, 2, 1, 30.00, 45.00, 0.00, 45.00, 0.00, 0.00, DATE_ADD(NOW(), INTERVAL 1 HOUR), 'open'),
(2, 1, 'Free Fire 2v2 Duo Clash Showdown', 'clash', '2v2', 'Bermuda', 4, 2, 2, 50.00, 70.00, 0.00, 70.00, 0.00, 0.00, DATE_ADD(NOW(), INTERVAL 90 MINUTE), 'open'),
(3, 1, 'Free Fire 4v4 Clash Squad Championship', 'clash', '4v4', 'Kalahari', 8, 2, 4, 100.00, 140.00, 0.00, 140.00, 0.00, 0.00, DATE_ADD(NOW(), INTERVAL 2 HOUR), 'open'),
(4, 1, 'Free Fire 48-Player BR Squad Mega War', 'battle_royale', 'squad', 'Bermuda', 48, 12, 4, 120.00, 1000.00, 0.00, 600.00, 300.00, 100.00, DATE_ADD(NOW(), INTERVAL 3 HOUR), 'open'),
(5, 1, 'Free Fire 48-Player BR Solo Survival', 'battle_royale', 'solo', 'Purgatory', 48, 48, 1, 25.00, 840.00, 0.00, 500.00, 220.00, 120.00, DATE_ADD(NOW(), INTERVAL 2 HOUR), 'open'),
(6, 1, 'Free Fire 48-Player BR Squad High Roller', 'battle_royale', 'squad', 'Kalahari', 48, 12, 4, 200.00, 1680.00, 0.00, 1000.00, 480.00, 200.00, DATE_ADD(NOW(), INTERVAL 4 HOUR), 'open'),
(7, 1, 'Free Fire 48-Player BR Duo War', 'battle_royale', 'duo', 'Bermuda', 48, 24, 2, 50.00, 840.00, 0.00, 500.00, 220.00, 120.00, DATE_ADD(NOW(), INTERVAL 3 HOUR), 'open')
ON DUPLICATE KEY UPDATE 
  `game_id` = VALUES(`game_id`),
  `title` = VALUES(`title`),
  `map_name` = VALUES(`map_name`),
  `status` = 'open';

SET FOREIGN_KEY_CHECKS = 1;
