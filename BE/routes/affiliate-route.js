const {
  getAffiliateDashboard,
  getReferralDashboard,
} = require("../controllers/affiliate-controller");
const { verifyToken } = require("../middleware/userAuth");

module.exports = (app) => {
  const router = require("express").Router();

  router.get("/affiliate/dashboard", verifyToken, getAffiliateDashboard);
  router.get("/referral/dashboard", verifyToken, getReferralDashboard);

  app.use("/api", router);
};

