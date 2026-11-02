const db = require("../connection");

const tournamentService = {};

// Helper to look up user id from req.user
async function getUserIdFromReq(userPayload) {
  if (userPayload?.id) return userPayload.id;
  if (userPayload?.email) {
    const [rows] = await db.promise().query(`SELECT id FROM users WHERE email = ?`, [userPayload.email]);
    if (rows.length > 0) return rows[0].id;
  }
  return null;
}

// 1. Get all tournaments with filter options
tournamentService.getTournaments = async (filters = {}) => {
  try {
    const { gameSlug, matchType, format, status } = filters;
    let query = `
      SELECT
        t.*,
        g.name as game_name,
        g.slug as game_slug,
        COUNT(DISTINCT tt.id) as filled_teams,
        COUNT(DISTINCT tp.id) as filled_players,
        GROUP_CONCAT(DISTINCT tt.slot_number) as booked_slots_str
      FROM tournaments t
      JOIN games g ON g.id = t.game_id
      LEFT JOIN tournament_teams tt ON tt.tournament_id = t.id
      LEFT JOIN tournament_participants tp ON tp.tournament_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (gameSlug) {
      query += ` AND g.slug = ?`;
      params.push(gameSlug);
    }
    if (matchType) {
      query += ` AND t.match_type = ?`;
      params.push(matchType);
    }
    if (format) {
      query += ` AND t.format = ?`;
      params.push(format);
    }
    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    query += ` GROUP BY t.id ORDER BY t.match_start_at ASC`;

    const [tournaments] = await db.promise().query(query, params);

    return {
      status: true,
      data: tournaments.map(t => {
        const totalTeams = t.total_teams;
        const filledTeams = parseInt(t.filled_teams || 0);
        const remainingTeams = Math.max(0, totalTeams - filledTeams);
        const isFull = filledTeams >= totalTeams;
        const bookedSlots = t.booked_slots_str
          ? t.booked_slots_str.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
          : [];

        return {
          ...t,
          entry_fee: parseFloat(t.entry_fee),
          prize_pool: parseFloat(t.prize_pool),
          per_kill_prize: parseFloat(t.per_kill_prize || 0),
          first_prize: parseFloat(t.first_prize || 0),
          second_prize: parseFloat(t.second_prize || 0),
          third_prize: parseFloat(t.third_prize || 0),
          filled_teams: filledTeams,
          remaining_teams: remainingTeams,
          filled_players: parseInt(t.filled_players || 0),
          is_full: isFull,
          booked_slots: bookedSlots,
        };
      }),
    };
  } catch (error) {
    console.error("getTournaments error:", error);
    throw error;
  }
};

// 2. Get single tournament details
tournamentService.getTournamentById = async (tournamentId, userId = null) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT t.*, g.name as game_name, g.slug as game_slug
       FROM tournaments t
       JOIN games g ON g.id = t.game_id
       WHERE t.id = ?`,
      [tournamentId]
    );

    if (rows.length === 0) {
      return { status: false, message: "Tournament not found." };
    }

    const tournament = rows[0];

    // Get booked teams & slots
    const [teams] = await db.promise().query(
      `SELECT tt.*, u.name as leader_name, u.email as leader_email
       FROM tournament_teams tt
       JOIN users u ON u.id = tt.leader_user_id
       WHERE tt.tournament_id = ?
       ORDER BY tt.slot_number ASC`,
      [tournamentId]
    );

    // Get participants roster
    const [participants] = await db.promise().query(
      `SELECT * FROM tournament_participants WHERE tournament_id = ? ORDER BY team_id, slot_position`,
      [tournamentId]
    );

    // Group participants by team
    const teamsWithRoster = teams.map(team => ({
      ...team,
      players: participants.filter(p => p.team_id === team.id),
    }));

    const bookedSlots = teams.map(t => t.slot_number);

    // Check if current user is registered
    let userRegistration = null;
    if (userId) {
      userRegistration = teamsWithRoster.find(team => team.leader_user_id === userId) || null;
    }

    return {
      status: true,
      data: {
        ...tournament,
        entry_fee: parseFloat(tournament.entry_fee),
        prize_pool: parseFloat(tournament.prize_pool),
        per_kill_prize: parseFloat(tournament.per_kill_prize || 0),
        first_prize: parseFloat(tournament.first_prize || 0),
        second_prize: parseFloat(tournament.second_prize || 0),
        third_prize: parseFloat(tournament.third_prize || 0),
        total_teams: tournament.total_teams,
        filled_teams: teams.length,
        remaining_teams: Math.max(0, tournament.total_teams - teams.length),
        booked_slots: bookedSlots,
        teams: teamsWithRoster,
        is_registered: !!userRegistration,
        my_team: userRegistration,
      },
    };
  } catch (error) {
    console.error("getTournamentById error:", error);
    throw error;
  }
};

// 3. Register / Join Tournament
tournamentService.joinTournament = async (tournamentId, userId, body) => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const { teamName, slotNumber, players = [] } = body;

    // A. Fetch tournament
    const [tRows] = await connection.query(`SELECT * FROM tournaments WHERE id = ? FOR UPDATE`, [tournamentId]);
    if (tRows.length === 0) {
      await connection.rollback();
      return { status: false, message: "Tournament not found." };
    }
    const tournament = tRows[0];

    if (tournament.status !== 'open' && tournament.status !== 'upcoming') {
      await connection.rollback();
      return { status: false, message: "Tournament is no longer open for registration." };
    }

    // B. Check if already registered
    const [existingReg] = await connection.query(
      `SELECT id FROM tournament_teams WHERE tournament_id = ? AND leader_user_id = ?`,
      [tournamentId, userId]
    );
    if (existingReg.length > 0) {
      await connection.rollback();
      return { status: false, message: "You have already registered for this tournament." };
    }

    // C. Check capacity
    const [bookedSlots] = await connection.query(
      `SELECT slot_number FROM tournament_teams WHERE tournament_id = ?`,
      [tournamentId]
    );

    if (bookedSlots.length >= tournament.total_teams) {
      await connection.rollback();
      return { status: false, message: "Tournament is already completely full." };
    }

    // D. Validate slot number
    const takenSlots = new Set(bookedSlots.map(b => b.slot_number));
    let chosenSlot = slotNumber ? parseInt(slotNumber) : null;

    if (chosenSlot) {
      if (chosenSlot < 1 || chosenSlot > tournament.total_teams) {
        await connection.rollback();
        return { status: false, message: `Slot number must be between 1 and ${tournament.total_teams}.` };
      }
      if (takenSlots.has(chosenSlot)) {
        await connection.rollback();
        return { status: false, message: `Slot #${chosenSlot} is already taken. Please choose another slot.` };
      }
    } else {
      // Auto-assign first free slot
      for (let i = 1; i <= tournament.total_teams; i++) {
        if (!takenSlots.has(i)) {
          chosenSlot = i;
          break;
        }
      }
    }

    // E. Validate player count matching format
    const requiredPlayers = tournament.players_per_team; // 1 for 1v1/solo, 2 for 2v2/duo, 4 for 4v4/squad
    if (!players || players.length < requiredPlayers) {
      await connection.rollback();
      return {
        status: false,
        message: `This tournament requires ${requiredPlayers} player${requiredPlayers > 1 ? 's' : ''} details (${tournament.format}).`,
      };
    }

    for (let i = 0; i < requiredPlayers; i++) {
      if (!players[i].inGameName || !players[i].inGameId) {
        await connection.rollback();
        return {
          status: false,
          message: `Player #${i + 1} must have In-Game Name (IGN) and In-Game ID (UID).`,
        };
      }
    }

    // F. Validate & Deduct Wallet Balance
    const entryFee = parseFloat(tournament.entry_fee);
    const [userWallets] = await connection.query(
      `SELECT * FROM wallets WHERE user_id = ? FOR UPDATE`,
      [userId]
    );
    if (userWallets.length === 0) {
      await connection.rollback();
      return { status: false, message: "Wallet not found. Please re-login." };
    }

    const wallet = userWallets[0];
    let depBal = parseFloat(wallet.deposit_balance || 0);
    let refBal = parseFloat(wallet.referral_balance || 0);
    let winBal = parseFloat(wallet.winning_balance || 0);
    const totalAvail = depBal + refBal + winBal;

    if (totalAvail < entryFee) {
      await connection.rollback();
      return {
        status: false,
        message: `Insufficient wallet balance. Entry fee is ₹${entryFee}, but your balance is ₹${totalAvail.toFixed(2)}. Please add money to your wallet.`,
      };
    }

    // Deduction priority: 1. Referral/Bonus balance, 2. Deposit balance, 3. Winning balance
    let remainingToPay = entryFee;
    let deductRef = Math.min(refBal, remainingToPay);
    remainingToPay -= deductRef;

    let deductDep = Math.min(depBal, remainingToPay);
    remainingToPay -= deductDep;

    let deductWin = Math.min(winBal, remainingToPay);
    remainingToPay -= deductWin;

    await connection.query(
      `UPDATE wallets
       SET deposit_balance = deposit_balance - ?,
           referral_balance = referral_balance - ?,
           winning_balance = winning_balance - ?
       WHERE user_id = ?`,
      [deductDep, deductRef, deductWin, userId]
    );

    // Record wallet ledger transaction
    await connection.query(
      `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, reference_id, status)
       VALUES (?, 'entry_fee', 'mixed', ?, ?, ?, 'completed')`,
      [userId, entryFee, `Entry Fee for ${tournament.title} (Slot #${chosenSlot})`, tournamentId.toString()]
    );

    // G. Create Tournament Team (Slot booking)
    const effectiveTeamName = teamName && teamName.trim() !== ''
      ? teamName.trim()
      : `Team Slot #${chosenSlot} (${players[0].inGameName})`;

    const [teamResult] = await connection.query(
      `INSERT INTO tournament_teams (tournament_id, slot_number, team_name, leader_user_id, entry_fee_paid)
       VALUES (?, ?, ?, ?, ?)`,
      [tournamentId, chosenSlot, effectiveTeamName, userId, entryFee]
    );
    const teamId = teamResult.insertId;

    // H. Insert Participants Roster
    for (let i = 0; i < requiredPlayers; i++) {
      const p = players[i];
      await connection.query(
        `INSERT INTO tournament_participants (
          tournament_id, team_id, user_id, player_name, in_game_name, in_game_id, phone, is_leader, slot_position
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tournamentId,
          teamId,
          i === 0 ? userId : null,
          p.playerName || p.inGameName,
          p.inGameName,
          p.inGameId,
          p.phone || null,
          i === 0 ? 1 : 0,
          i + 1,
        ]
      );
    }

    // I. Check if tournament is now full
    if (bookedSlots.length + 1 >= tournament.total_teams) {
      // Mark filled match as 'ready' (Full - waiting for admin to host & enter room credentials)
      await connection.query(
        `UPDATE tournaments SET status = 'ready' WHERE id = ?`,
        [tournamentId]
      );

      // AUTOMATED TOURNAMENT SPAWN: Create fresh next match for this game & format
      try {
        let nextTitle = tournament.title;
        const matchHashMatch = nextTitle.match(/#(\d+)$/);
        if (matchHashMatch) {
          const nextNum = parseInt(matchHashMatch[1], 10) + 1;
          nextTitle = nextTitle.replace(/#\d+$/, `#${nextNum}`);
        } else {
          nextTitle = `${nextTitle} #2`;
        }

        const prevStartTime = new Date(tournament.match_start_at).getTime();
        const nextStartTime = new Date(Math.max(Date.now() + 3600000 * 2, prevStartTime + 3600000 * 2));

        const [newTourney] = await connection.query(
          `INSERT INTO tournaments (
            game_id, title, match_type, format, map_name, total_slots,
            total_teams, players_per_team, entry_fee, prize_pool, per_kill_prize,
            first_prize, second_prize, third_prize, match_start_at, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
          [
            tournament.game_id,
            nextTitle,
            tournament.match_type,
            tournament.format,
            tournament.map_name,
            tournament.total_slots,
            tournament.total_teams,
            tournament.players_per_team,
            tournament.entry_fee,
            tournament.prize_pool,
            tournament.per_kill_prize,
            tournament.first_prize,
            tournament.second_prize,
            tournament.third_prize,
            nextStartTime,
          ]
        );
        console.log(`[AUTO-MATCH] Tournament #${tournamentId} full! Auto-created next Match #${newTourney.insertId} (${nextTitle}) with all slots free.`);
      } catch (spawnErr) {
        console.error('[AUTO-MATCH] Error spawning next tournament:', spawnErr.message);
      }
    }

    // J. ONBOARDING & REFERRAL COMMISSION TRIGGER
    // Fetch registered user's affiliate_id and referred_by_user_id
    const [regUsers] = await connection.query(
      `SELECT affiliate_id, referred_by_user_id FROM users WHERE id = ?`,
      [userId]
    );
    const regUser = regUsers[0];

    // 1. Affiliate Commission
    if (regUser && regUser.affiliate_id && entryFee > 0) {
      const [affiliates] = await connection.query(
        `SELECT a.*, u.id as affiliate_user_id FROM affiliates a
         JOIN users u ON u.id = a.user_id
         WHERE a.id = ?`,
        [regUser.affiliate_id]
      );

      if (affiliates.length > 0) {
        const aff = affiliates[0];
        let affCommission = 0;
        if (aff.commission_type === 'percentage') {
          affCommission = parseFloat(((entryFee * aff.commission_value) / 100).toFixed(2));
        } else {
          affCommission = parseFloat(aff.commission_value);
        }

        if (affCommission > 0) {
          // Credit to affiliate wallet
          await connection.query(
            `UPDATE wallets SET referral_balance = referral_balance + ? WHERE user_id = ?`,
            [affCommission, aff.affiliate_user_id]
          );
          // Update affiliate total_earned
          await connection.query(
            `UPDATE affiliates SET total_earned = total_earned + ? WHERE id = ?`,
            [affCommission, aff.id]
          );
          // Ledger
          await connection.query(
            `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, reference_id, status)
             VALUES (?, 'affiliate_commission', 'referral', ?, ?, ?, 'completed')`,
            [
              aff.affiliate_user_id,
              affCommission,
              `Affiliate Commission for match #${tournamentId} entry by player #${userId}`,
              tournamentId.toString(),
            ]
          );
        }
      }
    }

    // 2. Player Referral Bonus
    if (regUser && regUser.referred_by_user_id && entryFee > 0) {
      // 5% referral bonus to referrer
      const referralBonus = parseFloat((entryFee * 0.05).toFixed(2));
      if (referralBonus > 0) {
        await connection.query(
          `UPDATE wallets SET referral_balance = referral_balance + ? WHERE user_id = ?`,
          [referralBonus, regUser.referred_by_user_id]
        );
        await connection.query(
          `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, reference_id, status)
           VALUES (?, 'referral_bonus', 'referral', ?, ?, ?, 'completed')`,
          [
            regUser.referred_by_user_id,
            referralBonus,
            `Referral Bonus: Friend joined tournament #${tournamentId}`,
            tournamentId.toString(),
          ]
        );
      }
    }

    await connection.commit();

    return {
      status: true,
      message: `Successfully registered for ${tournament.title}! Assigned Slot #${chosenSlot}.`,
      data: {
        tournamentId,
        teamId,
        slotNumber: chosenSlot,
        teamName: effectiveTeamName,
        entryFeePaid: entryFee,
      },
    };
  } catch (error) {
    await connection.rollback();
    console.error("joinTournament error:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// 4. Get Room Credentials (revealed 15 mins before start or if set by admin)
tournamentService.getRoomCredentials = async (tournamentId, userId) => {
  try {
    // Verify user is in this tournament
    const [team] = await db.promise().query(
      `SELECT tt.* FROM tournament_teams tt WHERE tt.tournament_id = ? AND tt.leader_user_id = ?`,
      [tournamentId, userId]
    );

    if (team.length === 0) {
      return { status: false, message: "You are not registered in this tournament." };
    }

    const [tRows] = await db.promise().query(
      `SELECT room_id, room_password, match_start_at, title FROM tournaments WHERE id = ?`,
      [tournamentId]
    );

    if (tRows.length === 0) return { status: false, message: "Tournament not found." };
    const tournament = tRows[0];

    return {
      status: true,
      data: {
        tournamentTitle: tournament.title,
        slotNumber: team[0].slot_number,
        teamName: team[0].team_name,
        roomId: tournament.room_id || "Will be shared 15 min before match",
        roomPassword: tournament.room_password || "Will be shared 15 min before match",
        isReady: Boolean(tournament.room_id && tournament.room_password),
        matchStartAt: tournament.match_start_at,
      },
    };
  } catch (error) {
    console.error("getRoomCredentials error:", error);
    throw error;
  }
};

// 5. Get My Matches
tournamentService.getMyMatches = async (userId) => {
  try {
    const query = `
      SELECT
        t.*,
        g.name as game_name,
        g.slug as game_slug,
        tt.slot_number as my_slot_number,
        tt.team_name as my_team_name,
        tt.entry_fee_paid,
        tt.created_at as registered_at
      FROM tournament_teams tt
      JOIN tournaments t ON t.id = tt.tournament_id
      JOIN games g ON g.id = t.game_id
      WHERE tt.leader_user_id = ?
      ORDER BY t.match_start_at DESC
    `;
    const [matches] = await db.promise().query(query, [userId]);

    return {
      status: true,
      data: matches.map(m => ({
        ...m,
        entry_fee: parseFloat(m.entry_fee),
        prize_pool: parseFloat(m.prize_pool),
        per_kill_prize: parseFloat(m.per_kill_prize || 0),
        first_prize: parseFloat(m.first_prize || 0),
        has_room_credentials: Boolean(m.room_id && m.room_password),
      })),
    };
  } catch (error) {
    console.error("getMyMatches error:", error);
    throw error;
  }
};

// 6. Admin: Get all tournaments with complete roster and organization status
tournamentService.getAdminTournaments = async () => {
  try {
    const [tournaments] = await db.promise().query(`
      SELECT
        t.*,
        g.name as game_name,
        g.slug as game_slug,
        COUNT(DISTINCT tt.id) as filled_teams,
        COUNT(DISTINCT tp.id) as filled_players,
        GROUP_CONCAT(DISTINCT tt.slot_number) as booked_slots_str
      FROM tournaments t
      JOIN games g ON g.id = t.game_id
      LEFT JOIN tournament_teams tt ON tt.tournament_id = t.id
      LEFT JOIN tournament_participants tp ON tp.tournament_id = t.id
      GROUP BY t.id
      ORDER BY
        CASE
          WHEN t.status = 'ready' THEN 1
          WHEN t.status = 'open' THEN 2
          WHEN t.status = 'ongoing' THEN 3
          ELSE 4
        END,
        t.match_start_at ASC
    `);

    // Fetch all registered teams and their players
    const [allTeams] = await db.promise().query(`
      SELECT tt.*, u.name as leader_name, u.email as leader_email, u.phone as leader_phone
      FROM tournament_teams tt
      JOIN users u ON u.id = tt.leader_user_id
      ORDER BY tt.tournament_id, tt.slot_number ASC
    `);

    const [allParticipants] = await db.promise().query(`
      SELECT * FROM tournament_participants
      ORDER BY tournament_id, team_id, slot_position ASC
    `);

    const data = tournaments.map(t => {
      const bookedSlots = t.booked_slots_str
        ? t.booked_slots_str.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
        : [];

      const teams = allTeams
        .filter(team => team.tournament_id === t.id)
        .map(team => ({
          ...team,
          players: allParticipants.filter(p => p.team_id === team.id),
        }));

      const filledTeams = parseInt(t.filled_teams || 0);
      const isReadyToHost = t.status === 'ready' || (filledTeams >= t.total_teams && (!t.room_id || !t.room_password));

      let winnerSummary = t.winner_summary;
      if (typeof winnerSummary === 'string') {
        try {
          winnerSummary = JSON.parse(winnerSummary);
        } catch (e) {
          winnerSummary = null;
        }
      }

      return {
        ...t,
        entry_fee: parseFloat(t.entry_fee),
        prize_pool: parseFloat(t.prize_pool),
        per_kill_prize: parseFloat(t.per_kill_prize || 0),
        first_prize: parseFloat(t.first_prize || 0),
        second_prize: parseFloat(t.second_prize || 0),
        third_prize: parseFloat(t.third_prize || 0),
        filled_teams: filledTeams,
        remaining_teams: Math.max(0, t.total_teams - filledTeams),
        filled_players: parseInt(t.filled_players || 0),
        is_full: filledTeams >= t.total_teams,
        is_ready_to_host: isReadyToHost,
        has_credentials: Boolean(t.room_id && t.room_password),
        booked_slots: bookedSlots,
        winner_summary: winnerSummary,
        teams,
      };
    });

    return { status: true, data };
  } catch (error) {
    console.error("getAdminTournaments error:", error);
    throw error;
  }
};

// 7. Admin: Update Room Credentials (Room ID & Password)
tournamentService.updateRoomCredentials = async (tournamentId, { roomId, roomPassword }) => {
  try {
    if (!roomId || !roomPassword) {
      return { status: false, message: "Both Room ID and Password are required." };
    }

    const [existing] = await db.promise().query(
      `SELECT * FROM tournaments WHERE id = ?`,
      [tournamentId]
    );

    if (existing.length === 0) {
      return { status: false, message: "Tournament not found." };
    }

    // Set credentials and transition status to 'ongoing' if ready/open
    await db.promise().query(
      `UPDATE tournaments
       SET room_id = ?, room_password = ?, room_shared_at = NOW(),
           status = CASE WHEN status = 'ready' OR status = 'open' THEN 'ongoing' ELSE status END
       WHERE id = ?`,
      [roomId.trim(), roomPassword.trim(), tournamentId]
    );

    return {
      status: true,
      message: `Room credentials set for Tournament #${tournamentId}! Players can now view credentials in their dashboard.`,
      data: {
        tournamentId,
        roomId: roomId.trim(),
        roomPassword: roomPassword.trim(),
      },
    };
  } catch (error) {
    console.error("updateRoomCredentials error:", error);
    throw error;
  }
};

// 8. Admin: Update Tournament Status
tournamentService.updateTournamentStatus = async (tournamentId, status) => {
  try {
    const validStatuses = ['upcoming', 'open', 'ready', 'ongoing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return { status: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
    }

    await db.promise().query(
      `UPDATE tournaments SET status = ? WHERE id = ?`,
      [status, tournamentId]
    );

    return {
      status: true,
      message: `Tournament #${tournamentId} status updated to ${status}.`,
    };
  } catch (error) {
    console.error("updateTournamentStatus error:", error);
    throw error;
  }
};

// 9. Admin: Manually create a new tournament
tournamentService.createTournamentAdmin = async (body) => {
  try {
    const {
      gameId,
      title,
      matchType,
      format,
      mapName = 'Bermuda',
      totalSlots,
      totalTeams,
      playersPerTeam = 1,
      entryFee = 0,
      prizePool = 0,
      perKillPrize = 0,
      firstPrize = 0,
      secondPrize = 0,
      thirdPrize = 0,
      matchStartAt,
    } = body;

    if (!gameId || !title || !matchType || !format || !totalSlots || !totalTeams || !matchStartAt) {
      return { status: false, message: "Please provide all required tournament fields." };
    }

    const [result] = await db.promise().query(
      `INSERT INTO tournaments (
        game_id, title, match_type, format, map_name, total_slots,
        total_teams, players_per_team, entry_fee, prize_pool, per_kill_prize,
        first_prize, second_prize, third_prize, match_start_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
      [
        gameId,
        title,
        matchType,
        format,
        mapName,
        totalSlots,
        totalTeams,
        playersPerTeam,
        entryFee,
        prizePool,
        perKillPrize,
        firstPrize,
        secondPrize,
        thirdPrize,
        new Date(matchStartAt),
      ]
    );

    return {
      status: true,
      message: `Tournament "${title}" created successfully!`,
      data: { id: result.insertId },
    };
  } catch (error) {
    console.error("createTournamentAdmin error:", error);
    throw error;
  }
};

// 10. Admin: Delete tournament and refund active participants
tournamentService.deleteTournamentAdmin = async (tournamentId) => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [tRows] = await connection.query(`SELECT * FROM tournaments WHERE id = ? FOR UPDATE`, [tournamentId]);
    if (tRows.length === 0) {
      await connection.rollback();
      return { status: false, message: "Tournament not found." };
    }
    const tournament = tRows[0];

    // If tournament was not finalized, refund entry fees
    if (tournament.status !== 'completed' && tournament.status !== 'cancelled') {
      const [teams] = await connection.query(
        `SELECT id, leader_user_id, entry_fee_paid FROM tournament_teams WHERE tournament_id = ?`,
        [tournamentId]
      );
      for (const team of teams) {
        const fee = parseFloat(team.entry_fee_paid || 0);
        if (fee > 0) {
          await connection.query(
            `UPDATE wallets SET deposit_balance = deposit_balance + ? WHERE user_id = ?`,
            [fee, team.leader_user_id]
          );
          await connection.query(
            `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, reference_id, status)
             VALUES (?, 'deposit', 'deposit', ?, ?, ?, 'completed')`,
            [
              team.leader_user_id,
              fee,
              `Refund: Tournament #${tournamentId} (${tournament.title}) deleted by Admin`,
              tournamentId.toString(),
            ]
          );
        }
      }
    }

    // Delete participants
    await connection.query(`DELETE FROM tournament_participants WHERE tournament_id = ?`, [tournamentId]);
    // Delete teams
    await connection.query(`DELETE FROM tournament_teams WHERE tournament_id = ?`, [tournamentId]);
    // Delete tournament
    await connection.query(`DELETE FROM tournaments WHERE id = ?`, [tournamentId]);

    await connection.commit();
    return { status: true, message: `Tournament #${tournamentId} deleted and players refunded successfully.` };
  } catch (error) {
    await connection.rollback();
    console.error("deleteTournamentAdmin error:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// 11. Admin: Remove/kick a team from a slot and refund entry fee
tournamentService.removeTeamFromTournament = async (tournamentId, teamId) => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [teamRows] = await connection.query(
      `SELECT * FROM tournament_teams WHERE id = ? AND tournament_id = ? FOR UPDATE`,
      [teamId, tournamentId]
    );
    if (teamRows.length === 0) {
      await connection.rollback();
      return { status: false, message: "Team not found in this tournament." };
    }
    const team = teamRows[0];

    const [tRows] = await connection.query(`SELECT * FROM tournaments WHERE id = ? FOR UPDATE`, [tournamentId]);
    const tournament = tRows[0];

    // Refund entry fee if paid
    const fee = parseFloat(team.entry_fee_paid || 0);
    if (fee > 0) {
      await connection.query(
        `UPDATE wallets SET deposit_balance = deposit_balance + ? WHERE user_id = ?`,
        [fee, team.leader_user_id]
      );
      await connection.query(
        `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, reference_id, status)
         VALUES (?, 'deposit', 'deposit', ?, ?, ?, 'completed')`,
        [
          team.leader_user_id,
          fee,
          `Refund: Slot #${team.slot_number} booking removed by Admin (${tournament?.title || ''})`,
          tournamentId.toString(),
        ]
      );
    }

    // Remove team participants
    await connection.query(`DELETE FROM tournament_participants WHERE team_id = ?`, [teamId]);
    // Remove team
    await connection.query(`DELETE FROM tournament_teams WHERE id = ?`, [teamId]);

    // If tournament was marked 'ready', reopen it since a slot was freed
    if (tournament && tournament.status === 'ready') {
      await connection.query(`UPDATE tournaments SET status = 'open' WHERE id = ?`, [tournamentId]);
    }

    await connection.commit();
    return {
      status: true,
      message: `Team "${team.team_name}" removed from Slot #${team.slot_number}. Fee of ₹${fee} refunded to wallet.`,
    };
  } catch (error) {
    await connection.rollback();
    console.error("removeTeamFromTournament error:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// 12. Admin: Update any tournament fields (price, prize, map, start time, etc.)
tournamentService.updateTournamentAdmin = async (tournamentId, body) => {
  try {
    const {
      title,
      entry_fee,
      prize_pool,
      first_prize,
      second_prize,
      third_prize,
      per_kill_prize,
      map_name,
      match_start_at,
      status,
      room_id,
      room_password,
    } = body;

    const [existing] = await db.promise().query(`SELECT * FROM tournaments WHERE id = ?`, [tournamentId]);
    if (existing.length === 0) {
      return { status: false, message: "Tournament not found." };
    }

    await db.promise().query(
      `UPDATE tournaments
       SET title = COALESCE(?, title),
           entry_fee = COALESCE(?, entry_fee),
           prize_pool = COALESCE(?, prize_pool),
           first_prize = COALESCE(?, first_prize),
           second_prize = COALESCE(?, second_prize),
           third_prize = COALESCE(?, third_prize),
           per_kill_prize = COALESCE(?, per_kill_prize),
           map_name = COALESCE(?, map_name),
           match_start_at = CASE WHEN ? IS NOT NULL THEN ? ELSE match_start_at END,
           status = COALESCE(?, status),
           room_id = COALESCE(?, room_id),
           room_password = COALESCE(?, room_password)
       WHERE id = ?`,
      [
        title !== undefined ? title : null,
        entry_fee !== undefined ? parseFloat(entry_fee) : null,
        prize_pool !== undefined ? parseFloat(prize_pool) : null,
        first_prize !== undefined ? parseFloat(first_prize) : null,
        second_prize !== undefined ? parseFloat(second_prize) : null,
        third_prize !== undefined ? parseFloat(third_prize) : null,
        per_kill_prize !== undefined ? parseFloat(per_kill_prize) : null,
        map_name !== undefined ? map_name : null,
        match_start_at ? new Date(match_start_at) : null,
        match_start_at ? new Date(match_start_at) : null,
        status !== undefined ? status : null,
        room_id !== undefined ? room_id : null,
        room_password !== undefined ? room_password : null,
        tournamentId,
      ]
    );

    return { status: true, message: `Tournament #${tournamentId} updated successfully.` };
  } catch (error) {
    console.error("updateTournamentAdmin error:", error);
    throw error;
  }
};

// 13. Admin: Manually add a player/team to a slot without payment
tournamentService.addTeamAdmin = async (tournamentId, body) => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const { slot_number, team_name, leader_user_id, players = [] } = body;

    if (!slot_number || !team_name) {
      await connection.rollback();
      return { status: false, message: "Slot number and Team name are required." };
    }

    const [tRows] = await connection.query(`SELECT * FROM tournaments WHERE id = ? FOR UPDATE`, [tournamentId]);
    if (tRows.length === 0) {
      await connection.rollback();
      return { status: false, message: "Tournament not found." };
    }
    const tournament = tRows[0];

    // Check if slot is already occupied
    const [existingSlot] = await connection.query(
      `SELECT id FROM tournament_teams WHERE tournament_id = ? AND slot_number = ?`,
      [tournamentId, slot_number]
    );
    if (existingSlot.length > 0) {
      await connection.rollback();
      return { status: false, message: `Slot #${slot_number} is already occupied.` };
    }

    // Default leader to user_id or first available user
    let leaderId = leader_user_id;
    if (!leaderId) {
      const [firstUser] = await connection.query(`SELECT id FROM users LIMIT 1`);
      leaderId = firstUser[0]?.id || 1;
    }

    // Insert team
    const [teamResult] = await connection.query(
      `INSERT INTO tournament_teams (tournament_id, slot_number, team_name, leader_user_id, entry_fee_paid)
       VALUES (?, ?, ?, ?, 0)`,
      [tournamentId, slot_number, team_name, leaderId]
    );
    const teamId = teamResult.insertId;

    // Insert players
    if (players.length > 0) {
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        await connection.query(
          `INSERT INTO tournament_participants (
            tournament_id, team_id, user_id, player_name, in_game_name, in_game_id, phone, is_leader, slot_position
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tournamentId,
            teamId,
            leaderId,
            p.player_name || p.in_game_name || `Player ${i + 1}`,
            p.in_game_name || `Player ${i + 1}`,
            p.in_game_id || `UID-${Date.now()}-${i}`,
            p.phone || null,
            i === 0 ? 1 : 0,
            i + 1,
          ]
        );
      }
    } else {
      // Default leader participant
      await connection.query(
        `INSERT INTO tournament_participants (
          tournament_id, team_id, user_id, player_name, in_game_name, in_game_id, is_leader, slot_position
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
        [tournamentId, teamId, leaderId, team_name, team_name, `UID-${Date.now()}`]
      );
    }

    // Check if match is now full
    const [teamCount] = await connection.query(
      `SELECT COUNT(*) as cnt FROM tournament_teams WHERE tournament_id = ?`,
      [tournamentId]
    );
    if (teamCount[0].cnt >= tournament.total_teams) {
      await connection.query(`UPDATE tournaments SET status = 'ready' WHERE id = ?`, [tournamentId]);
    }

    await connection.commit();
    return { status: true, message: `Team "${team_name}" added to Slot #${slot_number} by Admin!` };
  } catch (error) {
    await connection.rollback();
    console.error("addTeamAdmin error:", error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = tournamentService;

