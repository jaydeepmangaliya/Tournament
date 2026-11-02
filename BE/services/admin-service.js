const db = require("../connection");

const adminService = {};

// 1. Dashboard Financial & Operational Analytics
adminService.getAnalytics = async () => {
  try {
    // Total Tournaments breakdown
    const [tCounts] = await db.promise().query(`
      SELECT
        COUNT(*) as total_tournaments,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tournaments,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready_tournaments,
        SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) as ongoing_tournaments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tournaments
      FROM tournaments
    `);

    // Total entry fee collected from all bookings
    const [entryFeeRows] = await db.promise().query(`
      SELECT COALESCE(SUM(entry_fee_paid), 0) as total_entry_collected
      FROM tournament_teams
    `);

    // Total prize distributed to players
    const [prizeRows] = await db.promise().query(`
      SELECT COALESCE(SUM(amount), 0) as total_prizes_paid
      FROM wallet_transactions
      WHERE type = 'winning' AND status = 'completed'
    `);

    // Total affiliate commission credited
    const [affiliateRows] = await db.promise().query(`
      SELECT COALESCE(SUM(amount), 0) as total_affiliate_paid
      FROM wallet_transactions
      WHERE type = 'affiliate_commission' AND status = 'completed'
    `);

    // Pending Withdrawals
    const [pendingWithdrawals] = await db.promise().query(`
      SELECT
        COUNT(*) as pending_count,
        COALESCE(SUM(amount), 0) as pending_amount
      FROM withdrawals
      WHERE status = 'pending'
    `);

    // Users count
    const [userCounts] = await db.promise().query(`
      SELECT
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'player' THEN 1 ELSE 0 END) as total_players,
        SUM(CASE WHEN role = 'affiliate' THEN 1 ELSE 0 END) as total_affiliates
      FROM users
    `);

    const entryCollected = parseFloat(entryFeeRows[0].total_entry_collected || 0);
    const prizesPaid = parseFloat(prizeRows[0].total_prizes_paid || 0);
    const affPaid = parseFloat(affiliateRows[0].total_affiliate_paid || 0);
    const netHouseProfit = entryCollected - (prizesPaid + affPaid);

    return {
      status: true,
      data: {
        tournaments: tCounts[0],
        users: userCounts[0],
        finances: {
          entryCollected: parseFloat(entryCollected.toFixed(2)),
          prizesPaid: parseFloat(prizesPaid.toFixed(2)),
          affiliatePaid: parseFloat(affPaid.toFixed(2)),
          netProfit: parseFloat(netHouseProfit.toFixed(2)),
        },
        withdrawals: {
          pendingCount: parseInt(pendingWithdrawals[0].pending_count || 0),
          pendingAmount: parseFloat(pendingWithdrawals[0].pending_amount || 0),
        },
      },
    };
  } catch (error) {
    console.error("getAnalytics error:", error);
    throw error;
  }
};

// 2. Withdrawals Desk Management
adminService.getWithdrawals = async (filterStatus = 'all') => {
  try {
    let query = `
      SELECT
        w.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM withdrawals w
      JOIN users u ON u.id = w.user_id
    `;
    const params = [];

    if (filterStatus && filterStatus !== 'all') {
      query += ` WHERE w.status = ?`;
      params.push(filterStatus);
    }

    query += ` ORDER BY w.created_at DESC LIMIT 100`;

    const [rows] = await db.promise().query(query, params);
    return {
      status: true,
      data: rows.map(r => ({
        ...r,
        amount: parseFloat(r.amount),
      })),
    };
  } catch (error) {
    console.error("getWithdrawals error:", error);
    throw error;
  }
};

// 3. Approve Withdrawal (Admin confirms manual UPI / Bank transfer completed)
adminService.approveWithdrawal = async (withdrawalId, { utrNumber, adminRemark }) => {
  try {
    const [rows] = await db.promise().query(`SELECT * FROM withdrawals WHERE id = ?`, [withdrawalId]);
    if (rows.length === 0) {
      return { status: false, message: "Withdrawal request not found." };
    }
    const withdrawal = rows[0];

    if (withdrawal.status !== 'pending') {
      return { status: false, message: `Withdrawal has already been ${withdrawal.status}.` };
    }

    const remark = utrNumber
      ? `Paid via UPI. UTR: ${utrNumber}. ${adminRemark || ''}`.trim()
      : (adminRemark || 'Approved and transferred.');

    await db.promise().query(
      `UPDATE withdrawals SET status = 'approved', admin_remark = ? WHERE id = ?`,
      [remark, withdrawalId]
    );

    // Update wallet ledger status to completed
    await db.promise().query(
      `UPDATE wallet_transactions
       SET status = 'completed', description = CONCAT(description, ' [Approved UTR: ', ?)
       WHERE user_id = ? AND type = 'withdrawal' AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [utrNumber || 'CONFIRMED]', withdrawal.user_id]
    );

    return {
      status: true,
      message: `Withdrawal #${withdrawalId} of ₹${withdrawal.amount} marked as APPROVED.`,
    };
  } catch (error) {
    console.error("approveWithdrawal error:", error);
    throw error;
  }
};

// 4. Reject Withdrawal & Refund back to player's wallet
adminService.rejectWithdrawal = async (withdrawalId, { reason }) => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(`SELECT * FROM withdrawals WHERE id = ? FOR UPDATE`, [withdrawalId]);
    if (rows.length === 0) {
      await connection.rollback();
      return { status: false, message: "Withdrawal not found." };
    }
    const withdrawal = rows[0];

    if (withdrawal.status !== 'pending') {
      await connection.rollback();
      return { status: false, message: `Withdrawal is already ${withdrawal.status}.` };
    }

    const refundAmount = parseFloat(withdrawal.amount);
    const rejectReason = reason || 'Payment details rejected or incorrect UPI ID.';

    // Refund to user's winning balance
    await connection.query(
      `UPDATE wallets SET winning_balance = winning_balance + ? WHERE user_id = ?`,
      [refundAmount, withdrawal.user_id]
    );

    // Update withdrawal record
    await connection.query(
      `UPDATE withdrawals SET status = 'rejected', admin_remark = ? WHERE id = ?`,
      [rejectReason, withdrawalId]
    );

    // Record refund transaction
    await connection.query(
      `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, status)
       VALUES (?, 'winning', 'winning', ?, ?, 'completed')`,
      [
        withdrawal.user_id,
        refundAmount,
        `Withdrawal #${withdrawalId} Rejected & Refunded: ${rejectReason}`,
      ]
    );

    await connection.commit();

    return {
      status: true,
      message: `Withdrawal #${withdrawalId} rejected. ₹${refundAmount} has been refunded to player's winning balance.`,
    };
  } catch (error) {
    await connection.rollback();
    console.error("rejectWithdrawal error:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// 5. Declare Match Results & Atomic Automated Prize Payout
adminService.declareMatchResults = async (tournamentId, body) => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const { winners = [], killBounties = [] } = body;

    const [tRows] = await connection.query(`SELECT * FROM tournaments WHERE id = ? FOR UPDATE`, [tournamentId]);
    if (tRows.length === 0) {
      await connection.rollback();
      return { status: false, message: "Tournament not found." };
    }
    const tournament = tRows[0];

    if (tournament.status === 'completed') {
      await connection.rollback();
      return { status: false, message: "This tournament has already been finalized and completed." };
    }

    const [teams] = await connection.query(
      `SELECT id, slot_number, team_name, leader_user_id FROM tournament_teams WHERE tournament_id = ?`,
      [tournamentId]
    );
    const teamMap = new Map(teams.map(t => [t.id, t]));

    let totalPrizesDistributed = 0;

    // A. Distribute Placement / Winner Rank Prizes
    for (const w of winners) {
      const team = teamMap.get(parseInt(w.teamId));
      const prizeAmount = parseFloat(w.prize || 0);

      if (team && prizeAmount > 0) {
        // Credit team leader's winning balance
        await connection.query(
          `UPDATE wallets SET winning_balance = winning_balance + ? WHERE user_id = ?`,
          [prizeAmount, team.leader_user_id]
        );

        // Record in ledger
        await connection.query(
          `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, reference_id, status)
           VALUES (?, 'winning', 'winning', ?, ?, ?, 'completed')`,
          [
            team.leader_user_id,
            prizeAmount,
            `Match #${tournamentId} Rank #${w.rank} Prize (${tournament.title})`,
            tournamentId.toString(),
          ]
        );

        totalPrizesDistributed += prizeAmount;
      }
    }

    // B. Distribute Per-Kill Bounties
    for (const kb of killBounties) {
      const team = teamMap.get(parseInt(kb.teamId));
      const kills = parseInt(kb.kills || 0);
      const bounty = parseFloat(kb.bountyAmount || 0);

      if (team && bounty > 0 && kills > 0) {
        await connection.query(
          `UPDATE wallets SET winning_balance = winning_balance + ? WHERE user_id = ?`,
          [bounty, team.leader_user_id]
        );

        await connection.query(
          `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, reference_id, status)
           VALUES (?, 'winning', 'winning', ?, ?, ?, 'completed')`,
          [
            team.leader_user_id,
            bounty,
            `Match #${tournamentId} Frag Bounty (${kills} Kills @ ₹${tournament.per_kill_prize}/kill)`,
            tournamentId.toString(),
          ]
        );

        totalPrizesDistributed += bounty;
      }
    }

    // Mark tournament as completed
    await connection.query(
      `UPDATE tournaments SET status = 'completed' WHERE id = ?`,
      [tournamentId]
    );

    await connection.commit();

    return {
      status: true,
      message: `Match #${tournamentId} finalized! Distributed ₹${totalPrizesDistributed.toFixed(2)} in prizes directly to winner wallets.`,
      data: {
        tournamentId,
        totalPrizesDistributed,
      },
    };
  } catch (error) {
    await connection.rollback();
    console.error("declareMatchResults error:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// 6. User and Anti-Cheat Management
adminService.getUsers = async (search = '', role = 'all') => {
  try {
    let query = `
      SELECT
        u.id, u.name, u.email, u.phone, u.role, u.status, u.referral_code, u.created_at,
        w.deposit_balance, w.winning_balance, w.referral_balance,
        COUNT(DISTINCT tt.id) as total_tournaments_played,
        COALESCE(SUM(tt.entry_fee_paid), 0) as total_entry_spent
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      LEFT JOIN tournament_teams tt ON tt.leader_user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim() !== '') {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.referral_code LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (role && role !== 'all') {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT 100`;

    const [rows] = await db.promise().query(query, params);

    return {
      status: true,
      data: rows.map(r => ({
        ...r,
        deposit_balance: parseFloat(r.deposit_balance || 0),
        winning_balance: parseFloat(r.winning_balance || 0),
        referral_balance: parseFloat(r.referral_balance || 0),
        total_balance: (
          parseFloat(r.deposit_balance || 0) +
          parseFloat(r.winning_balance || 0) +
          parseFloat(r.referral_balance || 0)
        ).toFixed(2),
        total_entry_spent: parseFloat(r.total_entry_spent || 0),
      })),
    };
  } catch (error) {
    console.error("getUsers error:", error);
    throw error;
  }
};

// 7. Toggle User Ban Status
adminService.toggleUserBan = async (userId, targetStatus) => {
  try {
    if (!['active', 'banned'].includes(targetStatus)) {
      return { status: false, message: "Status must be 'active' or 'banned'." };
    }

    await db.promise().query(
      `UPDATE users SET status = ? WHERE id = ?`,
      [targetStatus, userId]
    );

    return {
      status: true,
      message: `User #${userId} status changed to ${targetStatus.toUpperCase()}.`,
    };
  } catch (error) {
    console.error("toggleUserBan error:", error);
    throw error;
  }
};

module.exports = adminService;
