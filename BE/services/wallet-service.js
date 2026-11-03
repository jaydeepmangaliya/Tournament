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
  const connection = await db.promise().getConnection();
  try {
    const { amount, payoutMethod = 'upi', upiId, bankAccountNumber, bankIfsc, accountHolderName } = body;
    const withdrawAmount = parseFloat(amount);

    if (isNaN(withdrawAmount) || withdrawAmount < 30) {
      return { status: false, message: "Minimum withdrawal amount is ₹30." };
    }

    if (withdrawAmount > 50000) {
      return { status: false, message: "Maximum single withdrawal limit is ₹50,000." };
    }

    if (payoutMethod === 'upi' && !upiId) {
      return { status: false, message: "UPI ID is required for UPI payout." };
    }

    if (payoutMethod === 'bank_transfer' && (!bankAccountNumber || !bankIfsc)) {
      return { status: false, message: "Bank account and IFSC code are required for bank transfer." };
    }

    // Begin ACID transaction with row-level locking to prevent race-condition concurrency double-spends
    await connection.beginTransaction();

    // Get user and verify role
    const [users] = await connection.query(`SELECT id, role, status FROM users WHERE id = ? FOR UPDATE`, [userId]);
    if (users.length === 0) {
      await connection.rollback();
      return { status: false, message: "User account not found." };
    }
    if (users[0].status === 'banned') {
      await connection.rollback();
      return { status: false, message: "Account is restricted. Cannot process withdrawal." };
    }
    const userRole = users[0].role;

    // Lock wallet row for update
    const [wallets] = await connection.query(
      `SELECT deposit_balance, winning_balance, referral_balance FROM wallets WHERE user_id = ? FOR UPDATE`,
      [userId]
    );
    if (wallets.length === 0) {
      await connection.rollback();
      return { status: false, message: "Wallet not found." };
    }

    const wallet = wallets[0];
    const winning = parseFloat(wallet.winning_balance || 0);
    const referral = parseFloat(wallet.referral_balance || 0);
    const availableWithdrawable = parseFloat((winning + referral).toFixed(2));

    if (withdrawAmount > availableWithdrawable) {
      await connection.rollback();
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
      deductReferral = parseFloat((withdrawAmount - winning).toFixed(2));
    }

    // Atomic update with strict non-negative check
    const [updateResult] = await connection.query(
      `UPDATE wallets
       SET winning_balance = winning_balance - ?, referral_balance = referral_balance - ?
       WHERE user_id = ? AND winning_balance >= ? AND referral_balance >= ?`,
      [deductWinning, deductReferral, userId, deductWinning, deductReferral]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return {
        status: false,
        message: "Withdrawal conflict detected. Please refresh and try again.",
      };
    }

    // If affiliate, update affiliates total_withdrawn
    if (userRole === 'affiliate') {
      await connection.query(
        `UPDATE affiliates SET total_withdrawn = total_withdrawn + ? WHERE user_id = ?`,
        [withdrawAmount, userId]
      );
    }

    // Record withdrawal request
    const [withdrawResult] = await connection.query(
      `INSERT INTO withdrawals (
        user_id, role, amount, payout_method, upi_id,
        bank_account_number, bank_ifsc, account_holder_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        userRole,
        withdrawAmount,
        payoutMethod,
        upiId ? upiId.trim() : null,
        bankAccountNumber ? bankAccountNumber.trim() : null,
        bankIfsc ? bankIfsc.trim().toUpperCase() : null,
        accountHolderName ? accountHolderName.trim() : null,
      ]
    );

    // Record wallet ledger transaction
    await connection.query(
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

    await connection.commit();

    return {
      status: true,
      message: `Withdrawal request for ₹${withdrawAmount.toFixed(2)} submitted successfully! Funds will be transferred within 2-4 hours.`,
      withdrawalId: withdrawResult.insertId,
    };
  } catch (error) {
    await connection.rollback();
    console.error("requestWithdrawal error:", error);
    throw error;
  } finally {
    connection.release();
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

