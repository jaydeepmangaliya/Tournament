const adminController = require("../controllers/admin-controller");
const { verifyToken } = require("../middleware/userAuth");

// Admin middleware helper: checks if token belongs to an admin
const requireAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user?.role === 'admin') {
      return next();
    }
    return res.status(403).json({
      status: false,
      message: "Access forbidden: Admin credentials required.",
    });
  });
};

module.exports = (app) => {
  const router = require("express").Router();

  // 1. Financial & Operational Analytics
  router.get("/analytics", requireAdmin, adminController.getAnalytics);

  // 2. Tournament & Room Management
  router.get("/tournaments", requireAdmin, adminController.getTournaments);
  router.post("/tournaments/:id/room-credentials", requireAdmin, adminController.updateRoomCredentials);
  router.post("/tournaments/:id/status", requireAdmin, adminController.updateStatus);
  router.post("/tournaments/:id/results", requireAdmin, adminController.declareMatchResults);
  router.post("/tournaments/create", requireAdmin, adminController.createTournament);

  // 3. UPI Cashout / Withdrawals Desk
  router.get("/withdrawals", requireAdmin, adminController.getWithdrawals);
  router.post("/withdrawals/:id/approve", requireAdmin, adminController.approveWithdrawal);
  router.post("/withdrawals/:id/reject", requireAdmin, adminController.rejectWithdrawal);

  // 4. Player & Anti-Cheat Management
  router.get("/users", requireAdmin, adminController.getUsers);
  router.post("/users/:id/ban", requireAdmin, adminController.toggleUserBan);

  app.use("/api/admin", router);
};
