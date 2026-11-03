const {
  getWallet,
  addFunds,
  requestWithdrawal,
  getWithdrawals,
} = require("../controllers/wallet-controller");
const { verifyToken } = require("../middleware/userAuth");
const { verifyAdmin } = require("../middleware/adminAuth");

module.exports = (app) => {
  const router = require("express").Router();

  router.get("/me", verifyToken, getWallet);
  // Manual fund adjustment restricted to active administrators only
  router.post("/add-funds", verifyAdmin, addFunds);
  router.post("/withdraw", verifyToken, requestWithdrawal);
  router.get("/withdrawals", verifyToken, getWithdrawals);

  app.use("/api/wallet", router);
};
