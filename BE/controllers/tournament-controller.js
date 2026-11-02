const tournamentService = require("../services/tournament-service");
const db = require("../connection");

async function resolveUserId(req) {
  if (req.user?.id) return req.user.id;
  if (req.user?.email) {
    const [rows] = await db.promise().query("SELECT id FROM users WHERE email = ?", [req.user.email]);
    if (rows.length > 0) return rows[0].id;
  }
  return null;
}

exports.getTournaments = async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const result = await tournamentService.getTournaments(req.query, userId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.getTournamentById = async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const result = await tournamentService.getTournamentById(req.params.id, userId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.joinTournament = async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ status: false, message: "Unauthorized. Please log in." });
    }
    const result = await tournamentService.joinTournament(req.params.id, userId, req.body);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.getRoomCredentials = async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ status: false, message: "Unauthorized. Please log in." });
    }
    const result = await tournamentService.getRoomCredentials(req.params.id, userId);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.getMyMatches = async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ status: false, message: "Unauthorized. Please log in." });
    }
    const result = await tournamentService.getMyMatches(userId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

