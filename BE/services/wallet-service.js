const db = require("../connection");

const walletService = {};

walletService.getWallet = async (userId) => {
  try {
    const [wallets] = await db.promise().query(
      `SELECT deposit_balance, winning_balance, referral_balance FROM wallets WHERE user_id = ?`,
      [userId]
    );

    let wallet = wallets[0];
    if (!wallet) {
      await db.promise().query(
        `INSERT IGNORE INTO wallets (user_id, deposit_balance, winning_balance, referral_balance) VALUES (?, 0, 0, 0)`,
        [userId]
      );
      wallet = { deposit_balance: 0, winning_balance: 0, referral_balance: 0 };
    }

    const deposit = parseFloat(wallet.deposit_balance || 0);
    const winning = parseFloat(wallet.winning_balance || 0);
    const referral = parseFloat(wallet.referral_balance || 0);
    const total = (deposit + winning + referral).toFixed(2);
    const withdrawable = (winning + referral).toFixed(2);

    const [transactions] = await db.promise().query(
      `SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    return {
      status: true,
      data: {
        balances: {
          deposit,
          winning,
          referral,
          total: parseFloat(total),
          withdrawable: parseFloat(withdrawable),
        },
        transactions,
      },
    };
  } catch (error) {
    console.error("getWallet error:", error);
    throw error;
  }
};

walletService.addFunds = async (userId, amount) => {
  try {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { status: false, message: "Invalid amount." };
    }

    await db.promise().query(
      `UPDATE wallets SET deposit_balance = deposit_balance + ? WHERE user_id = ?`,
      [numAmount, userId]
    );

    await db.promise().query(
      `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, status)
       VALUES (?, 'deposit', 'deposit', ?, 'Wallet Top-up', 'completed')`,
      [userId, numAmount]
    );

    return { status: true, message: `Successfully added ₹${numAmount} to wallet.` };
  } catch (error) {
    console.error("addFunds error:", error);
    throw error;
  }
};

walletService.requestWithdrawal = async (userId, body) => {
  try {
    const { amount, payoutMethod = 'upi', upiId, bankAccountNumber, bankIfsc, accountHolderName } = body;
    const withdrawAmount = parseFloat(amount);

    if (isNaN(withdrawAmount) || withdrawAmount < 30) {
      return { status: false, message: "Minimum withdrawal amount is ₹30." };
    }

    if (payoutMethod === 'upi' && !upiId) {
      return { status: false, message: "UPI ID is required for UPI payout." };
    }

    if (payoutMethod === 'bank_transfer' && (!bankAccountNumber || !bankIfsc)) {
      return { status: false, message: "Bank account and IFSC code are required for bank transfer." };
    }

    // Get user and wallet
    const [users] = await db.promise().query(`SELECT role FROM users WHERE id = ?`, [userId]);
    if (users.length === 0) return { status: false, message: "User not found." };
    const userRole = users[0].role;

    const [wallets] = await db.promise().query(
      `SELECT deposit_balance, winning_balance, referral_balance FROM wallets WHERE user_id = ?`,
      [userId]
    );
    if (wallets.length === 0) return { status: false, message: "Wallet not found." };

    const wallet = wallets[0];
    let winning = parseFloat(wallet.winning_balance || 0);
    let referral = parseFloat(wallet.referral_balance || 0);
    const availableWithdrawable = winning + referral;

    if (withdrawAmount > availableWithdrawable) {
      return {
        status: false,
        message: `Insufficient withdrawable balance. You can withdraw up to ₹${availableWithdrawable.toFixed(2)} (Winning + Referral balance).`,
      };
    }

    // Deduct from winning balance first, then referral
    let deductWinning = 0;
    let deductReferral = 0;

    if (winning >= withdrawAmount) {
      deductWinning = withdrawAmount;
    } else {
      deductWinning = winning;
      deductReferral = withdrawAmount - winning;
    }

    await db.promise().query(
      `UPDATE wallets
       SET winning_balance = winning_balance - ?, referral_balance = referral_balance - ?
       WHERE user_id = ?`,
      [deductWinning, deductReferral, userId]
    );

    // If affiliate, update affiliates table
    if (userRole === 'affiliate') {
      await db.promise().query(
        `UPDATE affiliates SET total_withdrawn = total_withdrawn + ? WHERE user_id = ?`,
        [withdrawAmount, userId]
      );
    }

    // Record withdrawal request
    const [withdrawResult] = await db.promise().query(
      `INSERT INTO withdrawals (
        user_id, role, amount, payout_method, upi_id,
        bank_account_number, bank_ifsc, account_holder_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        userRole,
        withdrawAmount,
        payoutMethod,
        upiId || null,
        bankAccountNumber || null,
        bankIfsc || null,
        accountHolderName || null,
      ]
    );

    // Record wallet ledger transaction
    await db.promise().query(
      `INSERT INTO wallet_transactions (
        user_id, type, balance_type, amount, description, reference_id, status
      ) VALUES (?, 'withdrawal', 'winning', ?, ?, ?, 'pending')`,
      [
        userId,
        withdrawAmount,
        `Withdrawal Request via ${payoutMethod.toUpperCase()}`,
        withdrawResult.insertId.toString(),
      ]
    );

    return {
      status: true,
      message: `Withdrawal request for ₹${withdrawAmount} submitted successfully! Funds will be transferred within 2-4 hours.`,
      withdrawalId: withdrawResult.insertId,
    };
  } catch (error) {
    console.error("requestWithdrawal error:", error);
    throw error;
  }
};

walletService.getWithdrawals = async (userId) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    return { status: true, data: rows };
  } catch (error) {
    console.error("getWithdrawals error:", error);
    throw error;
  }
};

module.exports = walletService;

