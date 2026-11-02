const adminController = require("../controllers/admin-controller");
const { verifyToken } = require("../middleware/userAuth");

// Admin middleware helper: checks if token belongs to an admin or allows in development
const requireAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    // If user role is admin, let them through
    if (req.user?.role === 'admin') {
      return next();
    }
    // Also allow admin requests if user is admin
    return res.status(403).json({
      status: false,
      message: "Access forbidden: Admin credentials required.",
    });
  });
};

module.exports = (app) => {
  const router = require("express").Router();

  // All Admin Tournament endpoints
  router.get("/tournaments", requireAdmin, adminController.getTournaments);
  router.post("/tournaments/:id/room-credentials", requireAdmin, adminController.updateRoomCredentials);
  router.post("/tournaments/:id/status", requireAdmin, adminController.updateStatus);
  router.post("/tournaments/create", requireAdmin, adminController.createTournament);

  app.use("/api/admin", router);
};

