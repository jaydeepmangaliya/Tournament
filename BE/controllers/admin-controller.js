const tournamentService = require("../services/tournament-service");
const adminService = require("../services/admin-service");

// 1. Analytics & Overview
exports.getAnalytics = async (req, res) => {
  try {
    const result = await adminService.getAnalytics();
    return res.json(result);
  } catch (error) {
    console.error("Admin getAnalytics error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

// 2. Tournaments & Room Credentials
exports.getTournaments = async (req, res) => {
  try {
    const result = await tournamentService.getAdminTournaments();
    return res.json(result);
  } catch (error) {
    console.error("Admin getTournaments error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.updateRoomCredentials = async (req, res) => {
  try {
    const result = await tournamentService.updateRoomCredentials(req.params.id, req.body);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin updateRoomCredentials error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const result = await tournamentService.updateTournamentStatus(req.params.id, req.body.status);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin updateStatus error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.cancelTournament = async (req, res) => {
  try {
    const result = await tournamentService.cancelTournamentAdmin(req.params.id, req.body?.reason);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin cancelTournament error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.createTournament = async (req, res) => {
  try {
    const result = await tournamentService.createTournamentAdmin(req.body);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.status(201).json(result);
  } catch (error) {
    console.error("Admin createTournament error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

// 3. Match Results & Instant Prize Payouts
exports.declareMatchResults = async (req, res) => {
  try {
    const result = await adminService.declareMatchResults(req.params.id, req.body);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin declareMatchResults error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

// 4. UPI Withdrawals Desk
exports.getWithdrawals = async (req, res) => {
  try {
    const result = await adminService.getWithdrawals(req.query.status);
    return res.json(result);
  } catch (error) {
    console.error("Admin getWithdrawals error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.approveWithdrawal = async (req, res) => {
  try {
    const result = await adminService.approveWithdrawal(req.params.id, req.body);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin approveWithdrawal error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.rejectWithdrawal = async (req, res) => {
  try {
    const result = await adminService.rejectWithdrawal(req.params.id, req.body);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin rejectWithdrawal error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

// 5. Users & Anti-Cheat
exports.getUsers = async (req, res) => {
  try {
    const result = await adminService.getUsers(req.query.search, req.query.role);
    return res.json(result);
  } catch (error) {
    console.error("Admin getUsers error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.toggleUserBan = async (req, res) => {
  try {
    const result = await adminService.toggleUserBan(req.params.id, req.body.status);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin toggleUserBan error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.updateTournament = async (req, res) => {
  try {
    const result = await tournamentService.updateTournamentAdmin(req.params.id, req.body);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin updateTournament error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.addTeam = async (req, res) => {
  try {
    const result = await tournamentService.addTeamAdmin(req.params.id, req.body);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin addTeam error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.deleteTournament = async (req, res) => {
  try {
    const result = await tournamentService.deleteTournamentAdmin(req.params.id);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin deleteTournament error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.removeTeamFromTournament = async (req, res) => {
  try {
    const result = await tournamentService.removeTeamFromTournament(req.params.id, req.params.teamId);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin removeTeamFromTournament error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const result = await adminService.deleteUser(req.params.id, req.user.id);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin deleteUser error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const result = await adminService.updateUser(req.params.id, req.body);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin updateUser error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.testEmailAlert = async (req, res) => {
  try {
    const mailService = require('../services/mail-service');
    const result = await mailService.sendMatchReadyAlert({
      id: 999,
      title: 'Free Fire 1v1 Solo Test Duel (Diagnostic Test)',
      game_name: 'Free Fire',
      format: '1v1',
      prize_pool: 50,
      map_name: 'Bermuda',
      total_teams: 2,
      total_slots: 2,
      match_start_at: new Date()
    });
    return res.json(result);
  } catch (error) {
    console.error("Admin testEmailAlert error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.impersonateUser = async (req, res) => {
  try {
    const result = await adminService.impersonateUser(req.params.id);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin impersonateUser error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};
