const db = require("../connection");

const affiliateService = {};

affiliateService.getDashboard = async (userId) => {
  try {
    // 1. Get affiliate profile
    const [affiliates] = await db.promise().query(
      `SELECT a.*, u.name, u.email, u.phone, u.referral_code
       FROM affiliates a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = ?`,
      [userId]
    );

    if (affiliates.length === 0) {
      return { status: false, message: "User is not registered as an affiliate." };
    }

    const affiliate = affiliates[0];
    const commissionPercent = parseFloat(affiliate.commission_value || 10);

    // 2. Get list of players onboarded by this affiliate with per-player commission breakdown
    const [players] = await db.promise().query(
      `SELECT
         u.id, u.name, u.email, u.phone, u.referral_code as player_referral_code,
         u.created_at as joined_at,
         COUNT(DISTINCT tt.id) as total_tournaments_joined,
         COALESCE(SUM(tt.entry_fee_paid), 0) as total_entry_spent,
         ROUND(COALESCE(SUM(tt.entry_fee_paid * (? / 100)), 0), 2) as commission_earned_from_player
       FROM users u
       LEFT JOIN tournament_teams tt ON tt.leader_user_id = u.id
       WHERE u.affiliate_id = ?
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [commissionPercent, affiliate.id]
    );

    // 3. Get recent commission earnings ledger
    const [commissions] = await db.promise().query(
      `SELECT * FROM wallet_transactions
       WHERE user_id = ? AND type = 'affiliate_commission'
       ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );

    // 4. Get wallet info
    const [wallets] = await db.promise().query(
      `SELECT deposit_balance, winning_balance, referral_balance FROM wallets WHERE user_id = ?`,
      [userId]
    );
    const wallet = wallets[0] || { deposit_balance: 0, winning_balance: 0, referral_balance: 0 };

    return {
      status: true,
      data: {
        affiliate: {
          id: affiliate.id,
          affiliate_code: affiliate.affiliate_code,
          commission_type: affiliate.commission_type,
          commission_value: commissionPercent,
          total_earned: parseFloat(affiliate.total_earned || 0),
          total_withdrawn: parseFloat(affiliate.total_withdrawn || 0),
          withdrawable_balance: parseFloat(wallet.referral_balance || 0) + parseFloat(wallet.winning_balance || 0),
          total_players_count: players.length,
        },
        players,
        recentCommissions: commissions,
      },
    };
  } catch (error) {
    console.error("Affiliate dashboard error:", error);
    throw error;
  }
};

module.exports = affiliateService;
