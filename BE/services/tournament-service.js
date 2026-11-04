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
tournamentService.getTournaments = async (filters = {}, userId = null) => {
  try {
    const { gameSlug, matchType, format, status, includeFull } = filters;
    const targetStatus = status || 'open';
    const hideFull = includeFull !== true && includeFull !== 'true';

    const uid = userId ? parseInt(userId, 10) : 0;

    let query = `
      SELECT
        t.*,
        g.name as game_name,
        g.slug as game_slug,
        COUNT(DISTINCT tt.id) as filled_teams,
        COUNT(DISTINCT tp.id) as filled_players,
        GROUP_CONCAT(DISTINCT tt.slot_number) as booked_slots_str,
        MAX(CASE WHEN (tp.user_id = ? AND ? > 0) OR (tt.leader_user_id = ? AND ? > 0) THEN 1 ELSE 0 END) as is_my_registration,
        MAX(CASE WHEN (tp.user_id = ? AND ? > 0) OR (tt.leader_user_id = ? AND ? > 0) THEN tt.slot_number ELSE NULL END) as my_slot_number
      FROM tournaments t
      JOIN games g ON g.id = t.game_id
      LEFT JOIN tournament_teams tt ON tt.tournament_id = t.id
      LEFT JOIN tournament_participants tp ON tp.tournament_id = t.id
      WHERE 1=1
    `;
    const params = [uid, uid, uid, uid, uid, uid, uid, uid];

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
    if (targetStatus && targetStatus !== 'all') {
      query += ` AND t.status = ?`;
      params.push(targetStatus);
    }

    query += ` GROUP BY t.id`;

    // By default for public players: NEVER show full matches. Only open joinable matches.
    if (hideFull && targetStatus === 'open') {
      query += ` HAVING filled_teams < t.total_teams`;
    }

    query += ` ORDER BY t.id ASC`;

    const [tournaments] = await db.promise().query(query, params);

    const mapped = tournaments.map(t => {
      const totalTeams = t.total_teams;
      const filledTeams = parseInt(t.filled_teams || 0);
      const remainingTeams = Math.max(0, totalTeams - filledTeams);
      const isFull = filledTeams >= totalTeams;
      const bookedSlots = t.booked_slots_str
        ? t.booked_slots_str.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
        : [];

      // Calibrate Free Entry & Prize Cap <= ₹70 for all matches
      let prizePool = parseFloat(t.prize_pool || 0);
      let firstPrize = parseFloat(t.first_prize || 0);
      let secondPrize = parseFloat(t.second_prize || 0);
      let thirdPrize = 0.00;

      if (t.format === '1v1') {
        prizePool = 50.00;
        firstPrize = 50.00;
        secondPrize = 0.00;
      } else if (t.format === '2v2' || t.format === '4v4') {
        prizePool = 70.00;
        firstPrize = 70.00;
        secondPrize = 0.00;
      } else {
        // Battle Royale (Solo, Duo, Squad): Max ₹70 total (Booyah = ₹50, 2nd Place = ₹20)
        prizePool = 70.00;
        firstPrize = 50.00;
        secondPrize = 20.00;
      }

      return {
        ...t,
        entry_fee: 0.00,
        prize_pool: prizePool,
        per_kill_prize: 0.00,
        first_prize: firstPrize,
        second_prize: secondPrize,
        third_prize: thirdPrize,
        filled_teams: filledTeams,
        remaining_teams: remainingTeams,
        filled_players: parseInt(t.filled_players || 0),
        is_full: isFull,
        booked_slots: bookedSlots,
        is_registered: Boolean(t.is_my_registration),
        my_slot_number: t.my_slot_number ? parseInt(t.my_slot_number, 10) : null,
      };
    });

    // Double-check: ensure full matches never leak through if hideFull is active
    const result = hideFull && targetStatus === 'open'
      ? mapped.filter(t => !t.is_full && t.status === 'open' && t.filled_teams < t.total_teams)
      : mapped;

    return {
      status: true,
      data: result,
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
      userRegistration = teamsWithRoster.find(team => 
        team.leader_user_id === userId || team.players?.some(p => p.user_id === userId)
      ) || null;
    }

    // Calibrate Free Entry & Prize Cap <= ₹70
    let prizePool = parseFloat(tournament.prize_pool || 0);
    let firstPrize = parseFloat(tournament.first_prize || 0);
    let secondPrize = parseFloat(tournament.second_prize || 0);

    if (tournament.format === '1v1') {
      prizePool = 50.00;
      firstPrize = 50.00;
      secondPrize = 0.00;
    } else if (tournament.format === '2v2' || tournament.format === '4v4') {
      prizePool = 70.00;
      firstPrize = 70.00;
      secondPrize = 0.00;
    } else {
      prizePool = 70.00;
      firstPrize = 50.00;
      secondPrize = 20.00;
    }

    return {
      status: true,
      data: {
        ...tournament,
        entry_fee: 0.00,
        prize_pool: prizePool,
        per_kill_prize: 0.00,
        first_prize: firstPrize,
        second_prize: secondPrize,
        third_prize: 0.00,
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

    // Legal Compliance & State Restriction (Entry 34 of State List)
    if (parseFloat(tournament.entry_fee || 0) > 0) {
      const [uRows] = await connection.query(`SELECT state, is_18_plus FROM users WHERE id = ?`, [userId]);
      if (uRows.length > 0) {
        const u = uRows[0];
        const PROHIBITED_STATES = ['assam', 'as', 'odisha', 'orissa', 'od', 'telangana', 'tg', 'ts', 'andhra pradesh', 'andhra', 'ap', 'nagaland', 'nl', 'sikkim', 'sk'];
        const uState = (u.state || '').trim().toLowerCase();
        if (uState && PROHIBITED_STATES.some(p => uState === p || uState.includes(p))) {
          await connection.rollback();
          return {
            status: false,
            message: `State Restriction: Residents of ${u.state} are prohibited from participating in paid esports contests under state gaming regulations.`,
          };
        }
      }
    }

    // B. Check if user is already registered for this match
    const [existingReg] = await connection.query(
      `SELECT tp.id, tt.slot_number 
       FROM tournament_participants tp
       JOIN tournament_teams tt ON tt.id = tp.team_id
       WHERE tp.tournament_id = ? AND (tp.user_id = ? OR tt.leader_user_id = ?)`,
      [tournamentId, userId, userId]
    );
    if (existingReg.length > 0) {
      await connection.rollback();
      return {
        status: false,
        message: `You are already registered for this match in Slot #${existingReg[0].slot_number}! One player account cannot register twice in the same match. View your room credentials in 'My Matches'.`
      };
    }

    // C. Handle Join Mode: Random Squad (Auto-Match / Solo Fill) vs Full Squad
    const joinMode = (body.joinMode === 'random' && tournament.players_per_team > 1) ? 'random' : 'squad';
    const requiredPlayers = tournament.players_per_team;

    let chosenSlot = slotNumber ? parseInt(slotNumber) : null;
    let targetTeamId = null;
    let targetSlotPosition = 1;
    let effectiveTeamName = '';
    let entryFee = 0;

    if (joinMode === 'random') {
      // 1-Player Fee calculation (e.g. ₹25 for 4v4 ₹100 entry fee)
      entryFee = parseFloat((parseFloat(tournament.entry_fee) / requiredPlayers).toFixed(2));

      // Player roster only requires Player #1
      if (!players || !players[0] || !players[0].inGameName || !players[0].inGameId) {
        await connection.rollback();
        return {
          status: false,
          message: "Please enter your In-Game Name (IGN) and In-Game ID (UID) to join.",
        };
      }

      const submittedUid = String(players[0].inGameId).trim();

      // Check if this UID is already registered in this match
      const [duplicateUids] = await connection.query(
        `SELECT in_game_id, player_name FROM tournament_participants 
         WHERE tournament_id = ? AND in_game_id = ?`,
        [tournamentId, submittedUid]
      );
      if (duplicateUids.length > 0) {
        await connection.rollback();
        return {
          status: false,
          message: `Free Fire ID "${submittedUid}" is already registered in this match! Game IDs must be unique per match.`,
        };
      }

      // Check if there is an existing incomplete random squad in this tournament
      const [incompleteRandomTeams] = await connection.query(
        `SELECT tt.id, tt.slot_number, tt.team_name, COUNT(tp.id) as current_players
         FROM tournament_teams tt
         JOIN tournament_participants tp ON tp.team_id = tt.id
         WHERE tt.tournament_id = ? AND tt.is_random_squad = 1
         GROUP BY tt.id
         HAVING current_players < ?
         ORDER BY tt.slot_number ASC
         LIMIT 1`,
        [tournamentId, requiredPlayers]
      );

      if (incompleteRandomTeams.length > 0) {
        // Join existing incomplete random squad
        const matchedTeam = incompleteRandomTeams[0];
        targetTeamId = matchedTeam.id;
        chosenSlot = matchedTeam.slot_number;
        targetSlotPosition = matchedTeam.current_players + 1;
        effectiveTeamName = matchedTeam.team_name;
      } else {
        // Need to start a new random squad in an open slot
        const [bookedSlots] = await connection.query(
          `SELECT slot_number FROM tournament_teams WHERE tournament_id = ?`,
          [tournamentId]
        );
        const takenSlots = new Set(bookedSlots.map(b => b.slot_number));

        if (takenSlots.size >= tournament.total_teams) {
          await connection.rollback();
          return { status: false, message: "Tournament is already completely full." };
        }

        // Auto-assign first free slot if not specified or taken
        if (!chosenSlot || takenSlots.has(chosenSlot)) {
          for (let i = 1; i <= tournament.total_teams; i++) {
            if (!takenSlots.has(i)) {
              chosenSlot = i;
              break;
            }
          }
        }

        effectiveTeamName = `Auto-Match Squad #${chosenSlot}`;
      }
    } else {
      // FULL SQUAD MODE (Captain registers entire team)
      entryFee = parseFloat(tournament.entry_fee);

      // Check capacity
      const [bookedSlots] = await connection.query(
        `SELECT slot_number FROM tournament_teams WHERE tournament_id = ?`,
        [tournamentId]
      );
      const takenSlots = new Set(bookedSlots.map(b => b.slot_number));

      if (takenSlots.size >= tournament.total_teams) {
        await connection.rollback();
        return { status: false, message: "Tournament is already completely full." };
      }

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
        for (let i = 1; i <= tournament.total_teams; i++) {
          if (!takenSlots.has(i)) {
            chosenSlot = i;
            break;
          }
        }
      }

      if (!players || players.length < requiredPlayers) {
        await connection.rollback();
        return {
          status: false,
          message: `Full squad requires all ${requiredPlayers} players' details (${tournament.format}).`,
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

      const submittedUids = players
        .slice(0, requiredPlayers)
        .map(p => (p.inGameId ? String(p.inGameId).trim() : ''))
        .filter(Boolean);

      if (new Set(submittedUids).size !== submittedUids.length) {
        await connection.rollback();
        return {
          status: false,
          message: "Duplicate In-Game IDs (UIDs) detected in your squad. Every player must enter a unique game UID.",
        };
      }

      if (submittedUids.length > 0) {
        const [duplicateUids] = await connection.query(
          `SELECT in_game_id, player_name FROM tournament_participants 
           WHERE tournament_id = ? AND in_game_id IN (?)`,
          [tournamentId, submittedUids]
        );
        if (duplicateUids.length > 0) {
          await connection.rollback();
          return {
            status: false,
            message: `Free Fire ID "${duplicateUids[0].in_game_id}" is already registered in this match! Game IDs must be unique per match.`,
          };
        }
      }

      effectiveTeamName = teamName && teamName.trim() !== ''
        ? teamName.trim()
        : `Team Slot #${chosenSlot} (${players[0].inGameName})`;
    }

    // F. Handle Free Entry (Payment Bypassed - Open for Anyone to Join)
    // Matches are 100% FREE to join. Win Booyah to earn cash!
    await connection.query(
      `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, reference_id, status)
       VALUES (?, 'entry_fee', 'deposit', 0.00, ?, ?, 'completed')`,
      [
        userId,
        `Free Entry Registration for ${tournament.title} (Slot #${chosenSlot}${joinMode === 'random' ? ' Random Fill' : ''})`,
        `free_${Date.now()}`
      ]
    );

    // G. Create or Update Tournament Team & Participant Roster
    let teamId = targetTeamId;

    if (joinMode === 'random') {
      if (!teamId) {
        const [teamResult] = await connection.query(
          `INSERT INTO tournament_teams (tournament_id, slot_number, team_name, leader_user_id, entry_fee_paid, is_random_squad)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [tournamentId, chosenSlot, effectiveTeamName, userId, entryFee]
        );
        teamId = teamResult.insertId;
      } else {
        await connection.query(
          `UPDATE tournament_teams SET entry_fee_paid = entry_fee_paid + ? WHERE id = ?`,
          [entryFee, teamId]
        );
      }

      const p = players[0];
      await connection.query(
        `INSERT INTO tournament_participants (
          tournament_id, team_id, user_id, player_name, in_game_name, in_game_id, phone, is_leader, slot_position
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tournamentId,
          teamId,
          userId,
          p.playerName || p.inGameName,
          p.inGameName,
          p.inGameId,
          p.phone || null,
          targetSlotPosition === 1 ? 1 : 0,
          targetSlotPosition,
        ]
      );
    } else {
      // Full Squad Mode
      const [teamResult] = await connection.query(
        `INSERT INTO tournament_teams (tournament_id, slot_number, team_name, leader_user_id, entry_fee_paid, is_random_squad)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [tournamentId, chosenSlot, effectiveTeamName, userId, entryFee]
      );
      teamId = teamResult.insertId;

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
    }

    // Check if tournament is completely full
    const [pCountRows] = await connection.query(
      `SELECT COUNT(*) as total_participants FROM tournament_participants WHERE tournament_id = ?`,
      [tournamentId]
    );
    const totalParticipants = pCountRows[0]?.total_participants || 0;
    const maxCapacity = tournament.total_teams * requiredPlayers;

    if (totalParticipants >= maxCapacity) {
      await connection.query(
        `UPDATE tournaments SET status = 'ready' WHERE id = ?`,
        [tournamentId]
      );

      await tournamentService.ensureOpenLobbyExists(
        tournament.game_id,
        tournament.format,
        tournament.match_type,
        tournament,
        connection
      );
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

    const successMsg = joinMode === 'random'
      ? `Auto-matched into Slot #${chosenSlot} (${effectiveTeamName})! Seat #${targetSlotPosition} confirmed (Paid ₹${entryFee.toFixed(2)}).`
      : `Successfully registered for ${tournament.title}! Assigned Slot #${chosenSlot}.`;

    return {
      status: true,
      message: successMsg,
      data: {
        tournamentId,
        teamId,
        slotNumber: chosenSlot,
        teamName: effectiveTeamName,
        joinMode,
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
      SELECT DISTINCT
        t.*,
        g.name as game_name,
        g.slug as game_slug,
        tt.id as my_team_id,
        tt.slot_number as my_slot_number,
        tt.team_name as my_team_name,
        tt.is_random_squad,
        CASE 
          WHEN tt.is_random_squad = 1 THEN ROUND(t.entry_fee / t.players_per_team, 2)
          ELSE tt.entry_fee_paid 
        END as entry_fee_paid,
        tt.created_at as registered_at
      FROM tournaments t
      JOIN games g ON g.id = t.game_id
      JOIN tournament_teams tt ON tt.tournament_id = t.id
      LEFT JOIN tournament_participants tp ON tp.team_id = tt.id
      WHERE tt.leader_user_id = ? OR tp.user_id = ?
      ORDER BY t.match_start_at DESC
    `;
    const [matches] = await db.promise().query(query, [userId, userId]);

    return {
      status: true,
      data: matches.map(m => {
        let winnerSummary = m.winner_summary;
        if (typeof winnerSummary === 'string') {
          try {
            winnerSummary = JSON.parse(winnerSummary);
          } catch (e) {
            winnerSummary = null;
          }
        }
        return {
          ...m,
          entry_fee: parseFloat(m.entry_fee),
          prize_pool: parseFloat(m.prize_pool),
          per_kill_prize: parseFloat(m.per_kill_prize || 0),
          first_prize: parseFloat(m.first_prize || 0),
          has_room_credentials: Boolean(m.room_id && m.room_password),
          winner_summary: winnerSummary,
        };
      }),
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

    // Dispatch Native Background Web Push Notifications to all participants' phones
    try {
      const notificationService = require('./notification-service');
      const tourneyTitle = existing[0]?.title || `Tournament #${tournamentId}`;
      const cleanRoom = roomId.trim();
      const cleanPass = roomPassword.trim();
      notificationService.sendToTournamentParticipants(tournamentId, {
        title: `⚡ Room Ready! ${tourneyTitle}`,
        body: `Room ID: ${cleanRoom} | Pass: ${cleanPass}\nMatch starts soon! Tap action below to copy credentials.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `match-room-${tournamentId}`,
        url: `/yourmatches?copied=id&val=${encodeURIComponent(cleanRoom)}`,
        roomId: cleanRoom,
        roomPassword: cleanPass,
        data: {
          url: `/yourmatches?copied=id&val=${encodeURIComponent(cleanRoom)}`,
          tournamentId,
          roomId: cleanRoom,
          roomPassword: cleanPass,
        },
        actions: [
          { action: 'copy-id', title: `📋 Copy Room: ${cleanRoom}` },
          { action: 'copy-pass', title: `🔑 Copy Pass: ${cleanPass}` },
        ],
      }).catch((e) => console.warn('[NotificationService] Async push error:', e.message));
    } catch (pushErr) {
      console.warn('[NotificationService] Push trigger error:', pushErr.message);
    }

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

    if (status === 'cancelled') {
      return await tournamentService.cancelTournamentAdmin(tournamentId, 'Status updated to cancelled by Admin');
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

// 9b. Admin: Cancel tournament and immediately refund 100% of entry fees to players' WITHDRAWABLE (winning) balance
tournamentService.cancelTournamentAdmin = async (tournamentId, reason = 'Cancelled by Admin') => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();

    const [tRows] = await connection.query(`SELECT * FROM tournaments WHERE id = ? FOR UPDATE`, [tournamentId]);
    if (tRows.length === 0) {
      await connection.rollback();
      return { status: false, message: "Tournament not found." };
    }
    const tournament = tRows[0];

    if (tournament.status === 'completed') {
      await connection.rollback();
      return { status: false, message: "Cannot cancel a match that is already completed." };
    }

    if (tournament.status === 'cancelled') {
      await connection.rollback();
      return { status: false, message: "This match is already cancelled and refunded." };
    }

    // Fetch all registered teams
    const [teams] = await connection.query(
      `SELECT id, leader_user_id, team_name, entry_fee_paid, is_random_squad FROM tournament_teams WHERE tournament_id = ? FOR UPDATE`,
      [tournamentId]
    );

    let refundedCount = 0;
    let totalRefunded = 0;

    for (const team of teams) {
      if (team.is_random_squad) {
        const [members] = await connection.query(
          `SELECT DISTINCT user_id FROM tournament_participants WHERE team_id = ? AND user_id IS NOT NULL`,
          [team.id]
        );
        const memberCount = Math.max(1, members.length);
        const perPlayerFee = parseFloat((parseFloat(team.entry_fee_paid || 0) / memberCount).toFixed(2));

        for (const m of members) {
          if (perPlayerFee > 0) {
            await connection.query(
              `UPDATE wallets SET winning_balance = winning_balance + ? WHERE user_id = ?`,
              [perPlayerFee, m.user_id]
            );
            await connection.query(
              `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, reference_id, status)
               VALUES (?, 'refund', 'winning', ?, ?, ?, 'completed')`,
              [
                m.user_id,
                perPlayerFee,
                `Match Cancelled Refund: ${tournament.title} (Withdrawable Credit)`,
                tournamentId.toString(),
              ]
            );
            refundedCount++;
            totalRefunded += perPlayerFee;
          }
        }
      } else {
        const fee = parseFloat(team.entry_fee_paid || 0);
        if (fee > 0) {
          await connection.query(
            `UPDATE wallets SET winning_balance = winning_balance + ? WHERE user_id = ?`,
            [fee, team.leader_user_id]
          );

          await connection.query(
            `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, reference_id, status)
             VALUES (?, 'refund', 'winning', ?, ?, ?, 'completed')`,
            [
              team.leader_user_id,
              fee,
              `Match Cancelled Refund: ${tournament.title} (Withdrawable Credit)`,
              tournamentId.toString(),
            ]
          );

          refundedCount++;
          totalRefunded += fee;
        }
      }
    }

    // Update status to 'cancelled'
    await connection.query(
      `UPDATE tournaments SET status = 'cancelled' WHERE id = ?`,
      [tournamentId]
    );

    await connection.commit();

    // Spawn replacement open lobby so players can immediately join the next match
    try {
      await tournamentService.ensureOpenLobbyExists(
        tournament.game_id,
        tournament.format,
        tournament.match_type,
        tournament
      );
    } catch (rebirthErr) {
      console.warn("[AUTO-LOBBY REBIRTH on Cancel] Warning:", rebirthErr.message);
    }

    return {
      status: true,
      message: `Tournament #${tournamentId} cancelled successfully! Refunded ₹${totalRefunded.toFixed(2)} to ${refundedCount} registered team(s) into their withdrawable wallet balance.`,
      data: {
        tournamentId,
        refundedCount,
        totalRefunded,
      },
    };
  } catch (error) {
    await connection.rollback();
    console.error("cancelTournamentAdmin error:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// 10. Admin: Delete tournament and refund active participants to withdrawable balance
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

    // If tournament was not finalized, refund entry fees directly to winning (withdrawable) balance
    if (tournament.status !== 'completed' && tournament.status !== 'cancelled') {
      const [teams] = await connection.query(
        `SELECT id, leader_user_id, entry_fee_paid FROM tournament_teams WHERE tournament_id = ?`,
        [tournamentId]
      );
      for (const team of teams) {
        const fee = parseFloat(team.entry_fee_paid || 0);
        if (fee > 0) {
          await connection.query(
            `UPDATE wallets SET winning_balance = winning_balance + ? WHERE user_id = ?`,
            [fee, team.leader_user_id]
          );
          await connection.query(
            `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, reference_id, status)
             VALUES (?, 'refund', 'winning', ?, ?, ?, 'completed')`,
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
    return { status: true, message: `Tournament #${tournamentId} deleted and players refunded to withdrawable balance.` };
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

    if (status === 'cancelled' && existing[0].status !== 'cancelled') {
      return await tournamentService.cancelTournamentAdmin(tournamentId, 'Admin set status to cancelled in edit modal');
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
      // Trigger Auto-Lobby Rebirth if this match just got full
      await tournamentService.ensureOpenLobbyExists(
        tournament.game_id,
        tournament.format,
        tournament.match_type,
        tournament,
        connection
      );
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

// 12. Automated 24/7 Match Loop: Ensure an open lobby is always available for players
tournamentService.ensureOpenLobbyExists = async (gameId, format, matchType, sourceTournament = null, connection = null) => {
  const runner = connection || db.promise();
  try {
    const entryFee = sourceTournament ? parseFloat(sourceTournament.entry_fee) : null;
    let querySql = `
      SELECT t.id, t.total_teams, COUNT(tt.id) as filled_teams
      FROM tournaments t
      LEFT JOIN tournament_teams tt ON tt.tournament_id = t.id
      WHERE t.game_id = ? AND t.format = ? AND t.status = 'open'
    `;
    const params = [gameId, format];

    if (matchType) {
      querySql += ` AND t.match_type = ?`;
      params.push(matchType);
    }
    if (entryFee !== null && !isNaN(entryFee)) {
      querySql += ` AND t.entry_fee = ?`;
      params.push(entryFee);
    }

    querySql += `
      GROUP BY t.id
      HAVING filled_teams < t.total_teams
      LIMIT 1
    `;

    // Check if there is an active 'open' tournament with available seats for this exact tier
    const [openTourneys] = await runner.query(querySql, params);

    // If an open tournament with open slots already exists, no need to duplicate
    if (openTourneys.length > 0) {
      return null;
    }

    // Need to spawn fresh match! Get template tournament
    let tmpl = sourceTournament;
    if (!tmpl) {
      let tmplSql = `SELECT * FROM tournaments WHERE game_id = ? AND format = ?`;
      const tmplParams = [gameId, format];
      if (matchType) {
        tmplSql += ` AND match_type = ?`;
        tmplParams.push(matchType);
      }
      tmplSql += ` ORDER BY id DESC LIMIT 1`;
      const [rows] = await runner.query(tmplSql, tmplParams);
      if (rows.length > 0) tmpl = rows[0];
    }

    if (!tmpl) return null;

    // Determine next title with auto-incrementing match number
    let nextTitle = tmpl.title;
    const matchHash = nextTitle.match(/#(\d+)$/);
    if (matchHash) {
      const nextNum = parseInt(matchHash[1], 10) + 1;
      nextTitle = nextTitle.replace(/#\d+$/, `#${nextNum}`);
    } else {
      nextTitle = `${nextTitle} #2`;
    }

    // Schedule next match: 2 hours from now
    const nextStartTime = new Date(Date.now() + 3600000 * 2);

    const [inserted] = await runner.query(`
      INSERT INTO tournaments (
        game_id, title, match_type, format, map_name, total_slots,
        total_teams, players_per_team, entry_fee, prize_pool, per_kill_prize,
        first_prize, second_prize, third_prize, match_start_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `, [
      tmpl.game_id,
      nextTitle,
      tmpl.match_type || 'battle_royale',
      tmpl.format,
      tmpl.map_name || 'Bermuda',
      tmpl.total_slots,
      tmpl.total_teams,
      tmpl.players_per_team,
      tmpl.entry_fee,
      tmpl.prize_pool,
      tmpl.per_kill_prize || 0,
      tmpl.first_prize,
      tmpl.second_prize || 0,
      tmpl.third_prize || 0,
      nextStartTime,
    ]);

    console.log(`[AUTO-LOBBY REBIRTH] Spawned fresh Match #${inserted.insertId} (${nextTitle}) for 24/7 continuous play!`);
    return inserted.insertId;
  } catch (err) {
    console.error('[AUTO-LOBBY REBIRTH] Error:', err.message);
    return null;
  }
};

// 14. Weekly & All-Time Leaderboard
// 14. Competitive Leaderboard (100% Real Database Aggregation, ZERO Dummy Data)
tournamentService.getLeaderboard = async (query = {}) => {
  try {
    const period = query.period === 'all_time' ? 'all_time' : 'weekly';

    const sql = `
      SELECT 
        u.id as user_id,
        u.name as player_name,
        COALESCE(SUM(CASE WHEN wt.type = 'winning' THEN wt.amount ELSE 0 END), 0) as total_earnings,
        COUNT(DISTINCT tt.id) as matches_played,
        SUM(CASE WHEN tt.rank_position = 1 THEN 1 ELSE 0 END) as matches_won,
        COALESCE(SUM(tt.kills), 0) as total_kills
      FROM users u
      LEFT JOIN wallet_transactions wt ON wt.user_id = u.id AND wt.type = 'winning'
        ${period === 'weekly' ? "AND wt.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)" : ""}
      LEFT JOIN tournament_teams tt ON tt.leader_user_id = u.id
      WHERE u.role != 'admin'
      GROUP BY u.id
      HAVING total_earnings > 0 OR matches_won > 0
      ORDER BY total_earnings DESC, matches_won DESC, total_kills DESC
      LIMIT 25
    `;

    const [rows] = await db.promise().query(sql);

    const mappedDb = rows.map((r, idx) => ({
      rank: idx + 1,
      userId: r.user_id,
      playerName: r.player_name || `Player_${r.user_id}`,
      totalEarnings: parseFloat(r.total_earnings || 0),
      matchesPlayed: parseInt(r.matches_played || 0, 10),
      matchesWon: parseInt(r.matches_won || 0, 10),
      totalKills: parseInt(r.total_kills || 0, 10),
      winRate: r.matches_played > 0 ? Math.round((r.matches_won / r.matches_played) * 100) : 0,
      isReal: true,
    }));

    return {
      status: true,
      period,
      data: mappedDb,
    };
  } catch (err) {
    console.error('getLeaderboard error:', err);
    throw err;
  }
};

// 15. Live Recent Winners & Payouts Ticker (100% Real Database Activity)
tournamentService.getLiveTicker = async () => {
  try {
    const [recentWinnings] = await db.promise().query(`
      SELECT 
        u.name as player_name,
        wt.amount,
        wt.description,
        wt.created_at
      FROM wallet_transactions wt
      JOIN users u ON u.id = wt.user_id
      WHERE wt.type = 'winning' AND wt.status = 'completed'
      ORDER BY wt.created_at DESC
      LIMIT 12
    `);

    const [recentWithdrawals] = await db.promise().query(`
      SELECT 
        u.name as player_name,
        w.amount,
        w.payout_method,
        w.created_at
      FROM withdrawals w
      JOIN users u ON u.id = w.user_id
      WHERE w.status = 'approved'
      ORDER BY w.created_at DESC
      LIMIT 12
    `);

    const realEvents = [];

    recentWinnings.forEach((w) => {
      const matchName = w.description
        ? w.description.replace(/^Match #\d+ Rank #\d+ Prize \((.*?)\).*/, '$1').replace(/\(Random Squad Share: .*\)/, '').trim()
        : 'Tournament Arena';
      realEvents.push({
        id: `win_${w.created_at}_${w.player_name}_${w.amount}`,
        type: 'winning',
        text: `${w.player_name} won ₹${parseFloat(w.amount).toFixed(2)} in ${matchName}`,
        timestamp: w.created_at,
      });
    });

    recentWithdrawals.forEach((wd) => {
      realEvents.push({
        id: `wd_${wd.created_at}_${wd.player_name}_${wd.amount}`,
        type: 'withdrawal',
        text: `${wd.player_name} cashed out ₹${parseFloat(wd.amount).toFixed(2)} via ${(wd.payout_method || 'upi').toUpperCase()}`,
        timestamp: wd.created_at,
      });
    });

    realEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const platformHighlights = [
      { id: 'h1', type: 'info', category: 'TOURNAMENTS', text: 'Free Fire 1v1 Solo Duel, 2v2 Duo & 4v4 Clash Squads open for registration' },
      { id: 'h2', type: 'info', category: 'CASHOUTS', text: 'Instant payouts verified directly to UPI & Bank accounts within 4 hours' },
      { id: 'h3', type: 'info', category: 'ROOM CREDENTIALS', text: 'Custom Room ID & Password dispatched 15 minutes before match start' },
      { id: 'h4', type: 'info', category: 'SOLO MATCHMAKING', text: 'Play 2v2 & 4v4 even without a squad with proportional entry fee' },
      { id: 'h5', type: 'info', category: 'LEADERBOARD', text: 'Season 1 podium is live: compete to win the weekly cash prizepool' },
    ];

    return {
      status: true,
      hasRealEvents: realEvents.length > 0,
      data: realEvents.length > 0 ? realEvents : platformHighlights,
    };
  } catch (error) {
    console.error('getLiveTicker error:', error);
    throw error;
  }
};

module.exports = tournamentService;

