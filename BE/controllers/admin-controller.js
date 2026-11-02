const tournamentService = require("../services/tournament-service");

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

