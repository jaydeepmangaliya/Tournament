const adminController = require("../controllers/admin-controller");
const { verifyToken } = require("../middleware/userAuth");
const db = require("../connection");

// Admin middleware helper: checks if token belongs to an active admin directly in database
const requireAdmin = (req, res, next) => {
  verifyToken(req, res, async () => {
    try {
      let userRow = null;
      if (req.user?.id) {
        const [rows] = await db.promise().query("SELECT id, role, status FROM users WHERE id = ?", [req.user.id]);
        if (rows.length > 0) userRow = rows[0];
      }
      if (!userRow && req.user?.email) {
        const [rows] = await db.promise().query("SELECT id, role, status FROM users WHERE email = ?", [req.user.email]);
        if (rows.length > 0) userRow = rows[0];
      }

      if (userRow && userRow.role === 'admin' && userRow.status !== 'banned') {
        req.user.role = 'admin';
        req.user.id = userRow.id;
        return next();
      }
      return res.status(403).json({
        status: false,
        message: "Access forbidden: Admin credentials required.",
      });
    } catch (e) {
      console.error("requireAdmin check error:", e);
      return res.status(500).json({ status: false, message: "Error verifying admin privileges" });
    }
  });
};

module.exports = (app) => {
  const router = require("express").Router();

  // 1. Financial & Operational Analytics
  router.get("/analytics", requireAdmin, adminController.getAnalytics);

  // 2. Tournament & Room Management
  router.get("/tournaments", requireAdmin, adminController.getTournaments);
  router.put("/tournaments/:id", requireAdmin, adminController.updateTournament);
  router.post("/tournaments/:id/add-team", requireAdmin, adminController.addTeam);
  router.post("/tournaments/:id/room-credentials", requireAdmin, adminController.updateRoomCredentials);
  router.post("/tournaments/:id/status", requireAdmin, adminController.updateStatus);
  router.post("/tournaments/:id/cancel", requireAdmin, adminController.cancelTournament);
  router.post("/tournaments/:id/results", requireAdmin, adminController.declareMatchResults);
  router.post("/tournaments/create", requireAdmin, adminController.createTournament);
  router.delete("/tournaments/:id", requireAdmin, adminController.deleteTournament);
  router.delete("/tournaments/:id/teams/:teamId", requireAdmin, adminController.removeTeamFromTournament);

  // 3. UPI Cashout / Withdrawals Desk
  router.get("/withdrawals", requireAdmin, adminController.getWithdrawals);
  router.post("/withdrawals/:id/approve", requireAdmin, adminController.approveWithdrawal);
  router.post("/withdrawals/:id/reject", requireAdmin, adminController.rejectWithdrawal);

  // 4. Player & Affiliate & Superuser Management
  router.get("/users", requireAdmin, adminController.getUsers);
  router.put("/users/:id", requireAdmin, adminController.updateUser);
  router.delete("/users/:id", requireAdmin, adminController.deleteUser);
  router.post("/users/:id/ban", requireAdmin, adminController.toggleUserBan);

  app.use("/api/admin", router);
};
