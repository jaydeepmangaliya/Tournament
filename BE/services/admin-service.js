const db = require("../connection");

const adminService = {};

// 1. Dashboard Financial & Operational Analytics (Deep Reporting & Trends)
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

    // Month-over-Month & Week-over-Week Revenue Comparison
    const [feeCompare] = await db.promise().query(`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= DATE_FORMAT(NOW(), '%Y-%m-01') THEN entry_fee_paid ELSE 0 END), 0) as this_month_fees,
        COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 1 MONTH) AND created_at < DATE_FORMAT(NOW(), '%Y-%m-01') THEN entry_fee_paid ELSE 0 END), 0) as last_month_fees,
        COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN entry_fee_paid ELSE 0 END), 0) as this_week_fees,
        COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN entry_fee_paid ELSE 0 END), 0) as last_week_fees
      FROM tournament_teams
    `);

    // Player growth comparison (This month vs Last month, This week vs Last week)
    const [playerCompare] = await db.promise().query(`
      SELECT
        COUNT(CASE WHEN created_at >= DATE_FORMAT(NOW(), '%Y-%m-01') THEN 1 END) as this_month_players,
        COUNT(CASE WHEN created_at >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 1 MONTH) AND created_at < DATE_FORMAT(NOW(), '%Y-%m-01') THEN 1 END) as last_month_players,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as this_week_players,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as last_week_players
      FROM users
      WHERE role = 'player'
    `);

    // Last 6 Months Monthly Trend for Revenue Chart
    const [monthlyTrend] = await db.promise().query(`
      SELECT
        DATE_FORMAT(t_date.d, '%Y-%m') as month_key,
        DATE_FORMAT(t_date.d, '%b') as month_label,
        COALESCE(SUM(tt.entry_fee_paid), 0) as fees_collected,
        COALESCE((
          SELECT SUM(amount) FROM wallet_transactions 
          WHERE type = 'winning' AND status = 'completed' AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(t_date.d, '%Y-%m')
        ), 0) as prizes_paid
      FROM (
        SELECT CURDATE() as d
        UNION SELECT DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        UNION SELECT DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
        UNION SELECT DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        UNION SELECT DATE_SUB(CURDATE(), INTERVAL 4 MONTH)
        UNION SELECT DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
      ) t_date
      LEFT JOIN tournament_teams tt ON DATE_FORMAT(tt.created_at, '%Y-%m') = DATE_FORMAT(t_date.d, '%Y-%m')
      GROUP BY month_key, month_label, t_date.d
      ORDER BY month_key ASC
    `);

    // Game & Platform breakdown (Free Fire vs BGMI)
    const [gameStats] = await db.promise().query(`
      SELECT 
        g.name as game_name,
        COUNT(DISTINCT t.id) as match_count,
        COALESCE(SUM(tt.entry_fee_paid), 0) as total_fees
      FROM games g
      LEFT JOIN tournaments t ON t.game_id = g.id
      LEFT JOIN tournament_teams tt ON tt.tournament_id = t.id
      GROUP BY g.id, g.name
    `);

    // Top Winning Players (Leaderboard Hall of Fame)
    const [topWinners] = await db.promise().query(`
      SELECT 
        u.id, u.name, u.email,
        COALESCE(SUM(wt.amount), 0) as total_won,
        COUNT(wt.id) as wins_count
      FROM wallet_transactions wt
      JOIN users u ON u.id = wt.user_id
      WHERE wt.type = 'winning' AND wt.status = 'completed'
      GROUP BY u.id, u.name, u.email
      ORDER BY total_won DESC
      LIMIT 5
    `);

    // Recent Financial Activity
    const [recentActivity] = await db.promise().query(`
      SELECT
        wt.id, wt.user_id, wt.amount, wt.type, wt.description, wt.created_at,
        u.name as user_name
      FROM wallet_transactions wt
      JOIN users u ON u.id = wt.user_id
      WHERE wt.type IN ('winning', 'affiliate_commission', 'deposit')
      ORDER BY wt.created_at DESC
      LIMIT 8
    `);

    const entryCollected = parseFloat(entryFeeRows[0].total_entry_collected || 0);
    const prizesPaid = parseFloat(prizeRows[0].total_prizes_paid || 0);
    const affPaid = parseFloat(affiliateRows[0].total_affiliate_paid || 0);
    const netHouseProfit = entryCollected - (prizesPaid + affPaid);

    // Compute percentage growth helper
    const calcGrowth = (curr, prev) => {
      const c = parseFloat(curr) || 0;
      const p = parseFloat(prev) || 0;
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 100);
    };

    const monthlyBreakdown = monthlyTrend.map((m) => {
      const fees = parseFloat(m.fees_collected || 0);
      const prizes = parseFloat(m.prizes_paid || 0);
      return {
        monthKey: m.month_key,
        monthLabel: m.month_label,
        fees,
        prizes,
        profit: Math.max(0, fees - prizes),
      };
    });

    const compareData = {
      thisMonthFees: parseFloat(feeCompare[0].this_month_fees || 0),
      lastMonthFees: parseFloat(feeCompare[0].last_month_fees || 0),
      monthFeesGrowth: calcGrowth(feeCompare[0].this_month_fees, feeCompare[0].last_month_fees),

      thisWeekFees: parseFloat(feeCompare[0].this_week_fees || 0),
      lastWeekFees: parseFloat(feeCompare[0].last_week_fees || 0),
      weekFeesGrowth: calcGrowth(feeCompare[0].this_week_fees, feeCompare[0].last_week_fees),

      thisMonthPlayers: parseInt(playerCompare[0].this_month_players || 0),
      lastMonthPlayers: parseInt(playerCompare[0].last_month_players || 0),
      monthPlayersGrowth: calcGrowth(playerCompare[0].this_month_players, playerCompare[0].last_month_players),

      thisWeekPlayers: parseInt(playerCompare[0].this_week_players || 0),
      lastWeekPlayers: parseInt(playerCompare[0].last_week_players || 0),
      weekPlayersGrowth: calcGrowth(playerCompare[0].this_week_players, playerCompare[0].last_week_players),
    };

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
          profitMarginPct: entryCollected > 0 ? Math.round((netHouseProfit / entryCollected) * 100) : 0,
        },
        withdrawals: {
          pendingCount: parseInt(pendingWithdrawals[0].pending_count || 0),
          pendingAmount: parseFloat(pendingWithdrawals[0].pending_amount || 0),
        },
        comparisons: compareData,
        monthlyTrend: monthlyBreakdown,
        gameStats: gameStats.map((g) => ({
          gameName: g.game_name,
          matches: parseInt(g.match_count || 0),
          fees: parseFloat(g.total_fees || 0),
        })),
        topWinners: topWinners.map((w) => ({
          id: w.id,
          name: w.name,
          email: w.email,
          totalWon: parseFloat(w.total_won || 0),
          winsCount: parseInt(w.wins_count || 0),
        })),
        recentActivity: recentActivity.map((a) => ({
          id: a.id,
          userName: a.user_name,
          amount: parseFloat(a.amount || 0),
          type: a.type,
          description: a.description,
          createdAt: a.created_at,
        })),
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
        u.phone as user_phone,
        u.state as user_state,
        u.kyc_status as user_kyc_status,
        u.pan_number as user_pan_number,
        u.pan_name as user_pan_name
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
      data: rows.map(r => {
        const rawAmt = parseFloat(r.amount);
        const gross = parseFloat(r.gross_amount || rawAmt);
        const tdsRate = parseFloat(r.tds_rate || 30.00);
        const tds = parseFloat(r.tds_amount !== null && r.tds_amount !== undefined ? r.tds_amount : (gross * (tdsRate / 100)).toFixed(2));
        const net = parseFloat(r.net_payout !== null && r.net_payout !== undefined ? r.net_payout : (gross - tds).toFixed(2));
        return {
          ...r,
          amount: rawAmt,
          gross_amount: gross,
          tds_rate: tdsRate,
          tds_amount: tds,
          net_payout: net,
        };
      }),
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
      `SELECT id, slot_number, team_name, leader_user_id, is_random_squad FROM tournament_teams WHERE tournament_id = ?`,
      [tournamentId]
    );
    const teamMap = new Map(teams.map(t => [t.id, t]));

    let totalPrizesDistributed = 0;
    const summaryWinners = [];
    const summaryKills = [];

    // A. Distribute Placement / Winner Rank Prizes
    for (const w of winners) {
      const team = teamMap.get(parseInt(w.teamId));
      const prizeAmount = parseFloat(w.prize || 0);

      if (team && prizeAmount > 0) {
        // Update tournament_teams rank and prize
        await connection.query(
          `UPDATE tournament_teams SET rank_position = ?, prize_won = prize_won + ? WHERE id = ?`,
          [w.rank, prizeAmount, team.id]
        );

        if (team.is_random_squad) {
          // Auto-Match Random Squad: Divide prize equally among all distinct registered players
          const [members] = await connection.query(
            `SELECT DISTINCT user_id FROM tournament_participants WHERE team_id = ? AND user_id IS NOT NULL`,
            [team.id]
          );
          const memberCount = Math.max(1, members.length);
          const splitPrize = parseFloat((prizeAmount / memberCount).toFixed(2));

          for (const m of members) {
            await connection.query(
              `UPDATE wallets SET winning_balance = winning_balance + ? WHERE user_id = ?`,
              [splitPrize, m.user_id]
            );
            await connection.query(
              `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, reference_id, status)
               VALUES (?, 'winning', 'winning', ?, ?, ?, 'completed')`,
              [
                m.user_id,
                splitPrize,
                `Match #${tournamentId} Rank #${w.rank} Prize (${tournament.title}) [Random Squad Share: 1/${memberCount}]`,
                tournamentId.toString(),
              ]
            );
          }
        } else {
          // Pre-made Full Squad: Credit 100% to team leader's winning balance
          await connection.query(
            `UPDATE wallets SET winning_balance = winning_balance + ? WHERE user_id = ?`,
            [prizeAmount, team.leader_user_id]
          );

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
        }

        totalPrizesDistributed += prizeAmount;
        summaryWinners.push({
          rank: w.rank,
          teamId: team.id,
          teamName: team.team_name,
          slotNumber: team.slot_number,
          prize: prizeAmount,
        });
      }
    }

    // B. Distribute Per-Kill Bounties
    for (const kb of killBounties) {
      const team = teamMap.get(parseInt(kb.teamId));
      const kills = parseInt(kb.kills || 0);
      const bounty = parseFloat(kb.bountyAmount || 0);

      if (team && bounty > 0 && kills > 0) {
        await connection.query(
          `UPDATE tournament_teams SET kills = ?, prize_won = prize_won + ? WHERE id = ?`,
          [kills, bounty, team.id]
        );

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
        summaryKills.push({
          teamId: team.id,
          teamName: team.team_name,
          slotNumber: team.slot_number,
          kills,
          bountyAmount: bounty,
        });
      }
    }

    const winnerSummary = {
      winners: summaryWinners,
      killBounties: summaryKills,
      totalPrizeDistributed: totalPrizesDistributed,
      completedAt: new Date(),
    };

    // Mark tournament as completed and save winner summary
    await connection.query(
      `UPDATE tournaments SET status = 'completed', winner_summary = ? WHERE id = ?`,
      [JSON.stringify(winnerSummary), tournamentId]
    );

    await connection.commit();

    // Auto-Lobby Rebirth: Ensure players can immediately jump into the next open lobby
    try {
      const tournamentService = require('./tournament-service');
      await tournamentService.ensureOpenLobbyExists(
        tournament.game_id,
        tournament.format,
        tournament.match_type,
        tournament
      );
    } catch (reErr) {
      console.error('[AUTO-LOBBY REBIRTH] Error on match complete:', reErr.message);
    }

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
        u.state, u.is_18_plus, u.kyc_status, u.pan_number, u.pan_name, u.aadhaar_last4, u.kyc_rejection_reason,
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

// 8. Delete User / Affiliate Completely
adminService.deleteUser = async (userId, adminId) => {
  if (parseInt(userId) === parseInt(adminId)) {
    return { status: false, message: "You cannot delete your own admin account." };
  }
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [uRows] = await connection.query(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (uRows.length === 0) {
      await connection.rollback();
      return { status: false, message: "User not found." };
    }

    // Delete user participants
    await connection.query(`DELETE FROM tournament_participants WHERE user_id = ?`, [userId]);
    // Delete teams led by user and their participants
    const [teams] = await connection.query(`SELECT id FROM tournament_teams WHERE leader_user_id = ?`, [userId]);
    for (const t of teams) {
      await connection.query(`DELETE FROM tournament_participants WHERE team_id = ?`, [t.id]);
    }
    await connection.query(`DELETE FROM tournament_teams WHERE leader_user_id = ?`, [userId]);

    // Delete wallet transactions & withdrawals & wallet
    await connection.query(`DELETE FROM wallet_transactions WHERE user_id = ?`, [userId]);
    await connection.query(`DELETE FROM withdrawals WHERE user_id = ?`, [userId]);
    await connection.query(`DELETE FROM wallets WHERE user_id = ?`, [userId]);

    // Finally delete user
    await connection.query(`DELETE FROM users WHERE id = ?`, [userId]);

    await connection.commit();
    return { status: true, message: `User #${userId} and all related records have been deleted.` };
  } catch (error) {
    await connection.rollback();
    console.error("deleteUser error:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// 9. Update User / Affiliate Details & Balances
adminService.updateUser = async (userId, data) => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const {
      name,
      email,
      phone,
      role,
      status,
      referral_code,
      deposit_balance,
      winning_balance,
      referral_balance,
      kyc_status,
      kyc_rejection_reason,
      state,
    } = data;

    // Check user exists
    const [existing] = await connection.query(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (existing.length === 0) {
      await connection.rollback();
      return { status: false, message: "User not found." };
    }

    // Update user row
    await connection.query(
      `UPDATE users
       SET name = COALESCE(?, name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           role = COALESCE(?, role),
           status = COALESCE(?, status),
           referral_code = COALESCE(?, referral_code),
           kyc_status = COALESCE(?, kyc_status),
           kyc_rejection_reason = CASE WHEN ? IS NOT NULL THEN ? ELSE kyc_rejection_reason END,
           state = COALESCE(?, state)
       WHERE id = ?`,
      [
        name !== undefined ? name : null,
        email !== undefined ? email : null,
        phone !== undefined ? phone : null,
        role !== undefined ? role : null,
        status !== undefined ? status : null,
        referral_code !== undefined ? referral_code : null,
        kyc_status !== undefined ? kyc_status : null,
        kyc_rejection_reason !== undefined ? kyc_rejection_reason : null,
        kyc_rejection_reason !== undefined ? kyc_rejection_reason : null,
        state !== undefined ? state : null,
        userId,
      ]
    );

    // Update wallet row if balances provided
    if (deposit_balance !== undefined || winning_balance !== undefined || referral_balance !== undefined) {
      const [wRows] = await connection.query(`SELECT * FROM wallets WHERE user_id = ?`, [userId]);
      if (wRows.length > 0) {
        await connection.query(
          `UPDATE wallets
           SET deposit_balance = CASE WHEN ? IS NOT NULL THEN ? ELSE deposit_balance END,
               winning_balance = CASE WHEN ? IS NOT NULL THEN ? ELSE winning_balance END,
               referral_balance = CASE WHEN ? IS NOT NULL THEN ? ELSE referral_balance END
           WHERE user_id = ?`,
          [
            deposit_balance !== undefined ? deposit_balance : null,
            deposit_balance !== undefined ? deposit_balance : null,
            winning_balance !== undefined ? winning_balance : null,
            winning_balance !== undefined ? winning_balance : null,
            referral_balance !== undefined ? referral_balance : null,
            referral_balance !== undefined ? referral_balance : null,
            userId,
          ]
        );
      } else {
        await connection.query(
          `INSERT INTO wallets (user_id, deposit_balance, winning_balance, referral_balance)
           VALUES (?, ?, ?, ?)`,
          [
            userId,
            deposit_balance !== undefined ? deposit_balance : 0,
            winning_balance !== undefined ? winning_balance : 0,
            referral_balance !== undefined ? referral_balance : 0,
          ]
        );
      }
    }

    await connection.commit();
    return { status: true, message: `User #${userId} details updated successfully.` };
  } catch (error) {
    await connection.rollback();
    console.error("updateUser error:", error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = adminService;

