const {
  getWallet,
  addFunds,
  requestWithdrawal,
  getWithdrawals,
} = require("../controllers/wallet-controller");
const { verifyToken } = require("../middleware/userAuth");

module.exports = (app) => {
  const router = require("express").Router();

  router.get("/me", verifyToken, getWallet);
  router.post("/add-funds", verifyToken, addFunds);
  router.post("/withdraw", verifyToken, requestWithdrawal);
  router.get("/withdrawals", verifyToken, getWithdrawals);

  app.use("/api/wallet", router);
};

