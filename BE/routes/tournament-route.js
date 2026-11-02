const {
  getTournaments,
  getTournamentById,
  joinTournament,
  getRoomCredentials,
  getMyMatches,
} = require("../controllers/tournament-controller");
const { verifyToken } = require("../middleware/userAuth");

// Optional auth helper: if token present, decode it, otherwise let it pass
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();
  try {
    const jwt = require("jsonwebtoken");
    req.user = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (err) {
    // Ignore invalid token for optional endpoints
  }
  next();
};

module.exports = (app) => {
  const router = require("express").Router();

  router.get("/", getTournaments);
  router.get("/my-matches", verifyToken, getMyMatches);
  router.get("/:id", optionalAuth, getTournamentById);
  router.post("/:id/join", verifyToken, joinTournament);
  router.get("/:id/room", verifyToken, getRoomCredentials);

  app.use("/api/tournaments", router);
};

