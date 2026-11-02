const db = require("../connection");

const referralService = {};

referralService.getDashboard = async (userId) => {
  try {
    const [users] = await db.promise().query(
      `SELECT id, name, email, referral_code, affiliate_id, referred_by_user_id FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return { status: false, message: "User not found." };
    }
    const user = users[0];

    // Referred players with individual bonus tracking
    const [referredFriends] = await db.promise().query(
      `SELECT
         u.id, u.name, u.email, u.referral_code as friend_code,
         u.created_at as joined_at,
         COUNT(DISTINCT tt.id) as tournaments_played,
         COALESCE(SUM(tt.entry_fee_paid), 0) as total_entry_spent,
         ROUND(COALESCE(SUM(tt.entry_fee_paid * 0.05), 0), 2) as bonus_earned_from_friend
       FROM users u
       LEFT JOIN tournament_teams tt ON tt.leader_user_id = u.id
       WHERE u.referred_by_user_id = ?
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [userId]
    );

    // Referral rewards earned
    const [rewardTransactions] = await db.promise().query(
      `SELECT * FROM wallet_transactions
       WHERE user_id = ? AND type = 'referral_bonus'
       ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );

    const totalReferralEarned = rewardTransactions.reduce(
      (acc, curr) => acc + parseFloat(curr.amount || 0),
      0
    );

    // Wallet
    const [wallets] = await db.promise().query(
      `SELECT referral_balance, winning_balance, deposit_balance FROM wallets WHERE user_id = ?`,
      [userId]
    );
    const wallet = wallets[0] || { referral_balance: 0 };

    return {
      status: true,
      data: {
        referralCode: user.referral_code,
        totalFriends: referredFriends.length,
        totalEarned: parseFloat(totalReferralEarned.toFixed(2)),
        currentReferralBalance: parseFloat(wallet.referral_balance || 0),
        referredFriends,
        rewardTransactions,
      },
    };
  } catch (error) {
    console.error("Referral dashboard error:", error);
    throw error;
  }
};

module.exports = referralService;
