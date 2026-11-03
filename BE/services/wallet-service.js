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

    // Get user and verify role, state, and KYC compliance
    const [users] = await connection.query(
      `SELECT id, role, status, state, kyc_status, pan_number, pan_name FROM users WHERE id = ? FOR UPDATE`,
      [userId]
    );
    if (users.length === 0) {
      await connection.rollback();
      return { status: false, message: "User account not found." };
    }
    const user = users[0];
    if (user.status === 'banned') {
      await connection.rollback();
      return { status: false, message: "Account is restricted. Cannot process withdrawal." };
    }

    // Pillar B: State Restriction Check
    const PROHIBITED_STATES = ['assam', 'as', 'odisha', 'orissa', 'od', 'telangana', 'tg', 'ts', 'andhra pradesh', 'andhra', 'ap', 'nagaland', 'nl', 'sikkim', 'sk'];
    const userState = (user.state || '').trim().toLowerCase();
    if (userState && PROHIBITED_STATES.some(p => userState === p || userState.includes(p))) {
      await connection.rollback();
      return {
        status: false,
        message: `Payout Restricted: Real-money contests and cash withdrawals are prohibited in ${user.state} under Entry 34 of the State List.`,
      };
    }

    // Pillar C: Mandatory KYC Verification Check (IT Rules & DPDP Compliance)
    if (user.kyc_status !== 'verified') {
      await connection.rollback();
      return {
        status: false,
        requireKyc: true,
        message: "Mandatory KYC Required: Under Indian IT Rules and DPDP compliance, PAN & State verification must be completed before withdrawing cash.",
      };
    }

    const userRole = user.role;

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

    // Pillar D: Taxation Laws (30% TDS Compliance under Section 194BA)
    const tdsRate = 30.00;
    const grossAmount = withdrawAmount;
    const tdsAmount = parseFloat((grossAmount * (tdsRate / 100)).toFixed(2));
    const netPayout = parseFloat((grossAmount - tdsAmount).toFixed(2));

    // Record withdrawal request with complete Section 194BA tax audit trail
    const [withdrawResult] = await connection.query(
      `INSERT INTO withdrawals (
        user_id, role, amount, gross_amount, tds_rate, tds_amount, net_payout,
        payout_method, upi_id, bank_account_number, bank_ifsc, account_holder_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        userRole,
        withdrawAmount,
        grossAmount,
        tdsRate,
        tdsAmount,
        netPayout,
        payoutMethod,
        upiId ? upiId.trim() : null,
        bankAccountNumber ? bankAccountNumber.trim() : null,
        bankIfsc ? bankIfsc.trim().toUpperCase() : null,
        accountHolderName ? accountHolderName.trim() : null,
      ]
    );

    // Record wallet ledger transaction with transparent tax breakdown
    await connection.query(
      `INSERT INTO wallet_transactions (
        user_id, type, balance_type, amount, description, reference_id, status
      ) VALUES (?, 'withdrawal', 'winning', ?, ?, ?, 'pending')`,
      [
        userId,
        withdrawAmount,
        `Withdrawal: Gross ₹${grossAmount.toFixed(2)} (Sec 194BA 30% TDS: -₹${tdsAmount.toFixed(2)}, Net Payout: ₹${netPayout.toFixed(2)}) via ${(payoutMethod || 'upi').toUpperCase()}`,
        withdrawResult.insertId.toString(),
      ]
    );

    await connection.commit();

    return {
      status: true,
      message: `Withdrawal request for ₹${grossAmount.toFixed(2)} submitted! (30% TDS: ₹${tdsAmount.toFixed(2)}, Net Payout: ₹${netPayout.toFixed(2)}). Payout will be sent within 2-4 hours.`,
      withdrawalId: withdrawResult.insertId,
      grossAmount,
      tdsAmount,
      netPayout,
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

