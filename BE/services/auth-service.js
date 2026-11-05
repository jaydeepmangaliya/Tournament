const authService = {};
const db = require("../connection");
const { generateJWT } = require("../helpers/generateJWT");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Generate clean unique codes
function generateCode(prefix) {
  const randomStr = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${randomStr}`;
}

// Verify a referral or affiliate code
authService.verifyCode = async (code) => {
  try {
    if (!code || code.trim() === '') {
      return { status: false, message: "No code provided." };
    }
    const cleanCode = code.trim().toUpperCase();

    // Check affiliates
    const [affRows] = await db.promise().query(
      `SELECT a.id, a.affiliate_code, u.name as owner_name, u.email as owner_email
       FROM affiliates a
       JOIN users u ON u.id = a.user_id
       WHERE a.affiliate_code = ?`,
      [cleanCode]
    );

    if (affRows.length > 0) {
      return {
        status: true,
        type: 'affiliate',
        code: affRows[0].affiliate_code,
        ownerName: affRows[0].owner_name || "Official Partner",
        message: `Verified Affiliate Partner: ${affRows[0].owner_name || 'Official Partner'}`,
      };
    }

    // Check players
    const [userRows] = await db.promise().query(
      `SELECT id, name, referral_code, email FROM users WHERE referral_code = ?`,
      [cleanCode]
    );

    if (userRows.length > 0) {
      return {
        status: true,
        type: 'player',
        code: userRows[0].referral_code,
        ownerName: userRows[0].name || "Player",
        message: `Verified Player Referral from: ${userRows[0].name || 'A Gamer Friend'}`,
      };
    }

    return { status: false, message: "Invalid code. Please check or leave blank." };
  } catch (error) {
    console.error("verifyCode error:", error);
    throw error;
  }
};

authService.register = async (body) => {
  try {
    const { name, email, phone, password, role = 'player', referralCode } = body;

    if (!email || !password) {
      return { status: false, message: "Email and password are required." };
    }

    // Check if user already exists
    const [existing] = await db.promise().query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return { status: false, message: "User with this email already exists. Please login." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'affiliate' ? 'affiliate' : 'player';

    // Unique code for this user:
    // If affiliate -> AFF-XXXXXX
    // If player -> REF-XXXXXX
    const generatedCode = userRole === 'affiliate' ? generateCode("AFF") : generateCode("REF");

    let affiliateId = null;
    let referredByUserId = null;

    // Check referral / affiliate code if provided
    if (referralCode && referralCode.trim() !== '') {
      const cleanCode = referralCode.trim().toUpperCase();

      // Check if it belongs to an affiliate
      const [affRow] = await db.promise().query(
        "SELECT id, user_id FROM affiliates WHERE affiliate_code = ?",
        [cleanCode]
      );

      if (affRow.length > 0) {
        affiliateId = affRow[0].id;
      } else {
        // Check if it belongs to a player referral
        const [userRow] = await db.promise().query(
          "SELECT id FROM users WHERE referral_code = ?",
          [cleanCode]
        );
        if (userRow.length > 0) {
          referredByUserId = userRow[0].id;
        } else {
          return {
            status: false,
            message: `Referral code "${cleanCode}" is invalid. Please remove it or enter a valid code.`,
          };
        }
      }
    }

    // Insert user
    const [result] = await db.promise().query(
      `INSERT INTO users (name, email, phone, password, role, referral_code, referred_by_user_id, affiliate_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name || email.split("@")[0],
        email,
        phone || null,
        hashedPassword,
        userRole,
        generatedCode,
        referredByUserId,
        affiliateId,
      ]
    );

    const userId = result.insertId;

    // If affiliate, create affiliate record
    if (userRole === 'affiliate') {
      await db.promise().query(
        `INSERT INTO affiliates (user_id, affiliate_code, commission_type, commission_value)
         VALUES (?, ?, 'percentage', 10.00)`,
        [userId, generatedCode]
      );
    }

    // Initialize clean wallet with ₹0 balance (no free/welcome bonuses)
    await db.promise().query(
      `INSERT INTO wallets (user_id, deposit_balance, winning_balance, referral_balance)
       VALUES (?, 0.00, 0.00, 0.00)`,
      [userId]
    );

    // Instant Referral Reward: If user was referred by a friend, credit ₹10 instantly to the referrer!
    if (referredByUserId) {
      try {
        await db.promise().query(
          `INSERT IGNORE INTO wallets (user_id, deposit_balance, winning_balance, referral_balance) VALUES (?, 0.00, 0.00, 0.00)`,
          [referredByUserId]
        );
        await db.promise().query(
          `UPDATE wallets SET referral_balance = referral_balance + 10.00 WHERE user_id = ?`,
          [referredByUserId]
        );
        await db.promise().query(
          `INSERT INTO wallet_transactions (user_id, type, balance_type, amount, description, reference_id, status)
           VALUES (?, 'referral_bonus', 'referral', 10.00, ?, ?, 'completed')`,
          [
            referredByUserId,
            `Referral Bonus: ₹10 credited! Friend (${name || email.split('@')[0]}) joined using your referral code.`,
            `ref_${userId}_${Date.now()}`
          ]
        );
      } catch (refErr) {
        console.error("Error crediting ₹10 referral reward:", refErr);
      }
    }

    const token = await generateJWT({ id: userId, email, role: userRole });

    return {
      status: true,
      token,
      message: `Account created successfully! Your ${userRole === 'affiliate' ? 'Affiliate' : 'Referral'} code is ${generatedCode}`,
      user: {
        id: userId,
        name: name || email.split("@")[0],
        email,
        phone,
        role: userRole,
        code: generatedCode,
        referral_code: generatedCode,
        affiliate_code: userRole === 'affiliate' ? generatedCode : null,
        deposit_balance: 0,
        winning_balance: 0,
        referral_balance: 0,
        total_balance: "0.00",
      },
    };
  } catch (error) {
    console.error("Register error:", error.message);
    throw error;
  }
};

authService.login = async (body) => {
  try {
    const { email, password } = body;

    if (!email || !password) {
      return { status: false, message: "Please enter both email and password." };
    }

    const [rows] = await db.promise().query(
      `SELECT u.*, a.affiliate_code, a.commission_value, w.deposit_balance, w.winning_balance, w.referral_balance
       FROM users u
       LEFT JOIN affiliates a ON a.user_id = u.id
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return { status: false, message: "No account found with this email. Please register first." };
    }

    const user = rows[0];

    if (user.status === 'banned') {
      return { status: false, message: "Your account has been suspended. Please contact support." };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { status: false, message: "Invalid email or password." };
    }

    // Ensure wallet exists
    if (user.deposit_balance === null) {
      await db.promise().query(
        `INSERT IGNORE INTO wallets (user_id, deposit_balance, winning_balance, referral_balance) VALUES (?, 0.00, 0.00, 0.00)`,
        [user.id]
      );
    }

    const token = await generateJWT({ id: user.id, email: user.email, role: user.role });

    const depBal = parseFloat(user.deposit_balance || 0);
    const winBal = parseFloat(user.winning_balance || 0);
    const refBal = parseFloat(user.referral_balance || 0);
    const totBal = (depBal + winBal + refBal).toFixed(2);

    return {
      status: true,
      token,
      message: "Logged in successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        referral_code: user.referral_code,
        affiliate_code: user.affiliate_code,
        code: user.role === 'affiliate' ? (user.affiliate_code || user.referral_code) : user.referral_code,
        deposit_balance: depBal,
        winning_balance: winBal,
        referral_balance: refBal,
        total_balance: totBal,
        state: user.state || null,
        is_18_plus: user.is_18_plus !== undefined ? user.is_18_plus : 1,
        kyc_status: user.kyc_status || 'not_submitted',
        pan_number: user.pan_number || null,
        pan_name: user.pan_name || null,
        aadhaar_last4: user.aadhaar_last4 || null,
        kyc_rejection_reason: user.kyc_rejection_reason || null,
      },
    };
  } catch (error) {
    console.error("Login error:", error.message);
    throw error;
  }
};

authService.getProfile = async (emailOrId) => {
  try {
    const isId = Number.isInteger(Number(emailOrId)) && !emailOrId.toString().includes("@");
    const query = `
      SELECT
        u.id, u.name, u.email, u.phone, u.role, u.referral_code, u.status, u.created_at,
        u.state, u.is_18_plus, u.kyc_status, u.pan_number, u.pan_name, u.aadhaar_last4, u.kyc_rejection_reason,
        u.affiliate_id, u.referred_by_user_id,
        a.affiliate_code, a.commission_value, a.total_earned, a.total_withdrawn,
        w.deposit_balance, w.winning_balance, w.referral_balance,
        ref_u.name as referred_by_player_name,
        ref_u.referral_code as referred_by_player_code,
        aff_u.name as referred_by_affiliate_name,
        aff_entry.affiliate_code as referred_by_affiliate_code
      FROM users u
      LEFT JOIN affiliates a ON a.user_id = u.id
      LEFT JOIN wallets w ON w.user_id = u.id
      LEFT JOIN users ref_u ON ref_u.id = u.referred_by_user_id
      LEFT JOIN affiliates aff_entry ON aff_entry.id = u.affiliate_id
      LEFT JOIN users aff_u ON aff_u.id = aff_entry.user_id
      WHERE ${isId ? 'u.id = ?' : 'u.email = ?'}
    `;
    const [rows] = await db.promise().query(query, [emailOrId]);
    if (rows.length === 0) {
      return { status: false, message: "User not found." };
    }

    const user = rows[0];

    // Determine referral attribution
    let referralSource = {
      isReferred: false,
      type: 'none',
      name: null,
      code: null,
    };

    if (user.affiliate_id && user.referred_by_affiliate_code) {
      referralSource = {
        isReferred: true,
        type: 'affiliate',
        name: user.referred_by_affiliate_name || 'Official Partner',
        code: user.referred_by_affiliate_code,
      };
    } else if (user.referred_by_user_id && user.referred_by_player_code) {
      referralSource = {
        isReferred: true,
        type: 'player',
        name: user.referred_by_player_name || 'Player Friend',
        code: user.referred_by_player_code,
      };
    }

    const primaryCode = user.role === 'affiliate'
      ? (user.affiliate_code || user.referral_code)
      : user.referral_code;

    return {
      status: true,
      data: {
        ...user,
        my_code: primaryCode,
        referral_source: referralSource,
        deposit_balance: parseFloat(user.deposit_balance || 0),
        winning_balance: parseFloat(user.winning_balance || 0),
        referral_balance: parseFloat(user.referral_balance || 0),
        total_balance: (
          parseFloat(user.deposit_balance || 0) +
          parseFloat(user.winning_balance || 0) +
          parseFloat(user.referral_balance || 0)
        ).toFixed(2),
      },
    };
  } catch (error) {
    console.error("getProfile error:", error.message);
    throw error;
  }
};

// Prohibited states under Entry 34 of State List for paid contests
const PROHIBITED_STATES = [
  'assam', 'as',
  'odisha', 'orissa', 'od',
  'telangana', 'tg', 'ts',
  'andhra pradesh', 'andhra', 'ap',
  'nagaland', 'nl',
  'sikkim', 'sk'
];

authService.isProhibitedState = (state) => {
  if (!state) return false;
  const s = state.trim().toLowerCase();
  return PROHIBITED_STATES.some(p => s === p || s.includes(p));
};

authService.submitKYC = async (userId, body) => {
  try {
    const { panNumber, panName, aadhaarLast4, state, is18Plus } = body;

    if (!is18Plus) {
      return {
        status: false,
        message: "Age Requirement: You must be at least 18 years of age to participate in real-money contests under IT rules.",
      };
    }

    if (!state || !state.trim()) {
      return { status: false, message: "Please select your state of residence." };
    }

    const trimmedState = state.trim();
    if (authService.isProhibitedState(trimmedState)) {
      return {
        status: false,
        message: `Participation Restricted: Under Entry 34 of the State List, real-money gaming is prohibited in ${trimmedState}. Residents cannot register or withdraw funds.`,
      };
    }

    if (!panNumber || !panNumber.trim()) {
      return { status: false, message: "PAN card number is mandatory under Section 194BA & DPDP compliance." };
    }

    const cleanPan = panNumber.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(cleanPan)) {
      return {
        status: false,
        message: "Invalid PAN format. Standard PAN is 10 alphanumeric characters (e.g., ABCDE1234F).",
      };
    }

    if (!panName || panName.trim().length < 2) {
      return { status: false, message: "Please enter your full legal name as printed on your PAN card." };
    }

    let cleanAadhaar = null;
    if (aadhaarLast4) {
      cleanAadhaar = aadhaarLast4.toString().trim().slice(-4);
      if (cleanAadhaar.length !== 4 || isNaN(cleanAadhaar)) {
        return { status: false, message: "Aadhaar must be the last 4 digits of your Aadhaar card." };
      }
    }

    // Check if PAN is already linked to another account
    const [existingPan] = await db.promise().query(
      `SELECT id FROM users WHERE pan_number = ? AND id != ? AND kyc_status = 'verified'`,
      [cleanPan, userId]
    );
    if (existingPan.length > 0) {
      return {
        status: false,
        message: "This PAN card number is already linked to another verified player account.",
      };
    }

    await db.promise().query(
      `UPDATE users
       SET pan_number = ?, pan_name = ?, aadhaar_last4 = ?, state = ?, is_18_plus = 1, kyc_status = 'verified', kyc_rejection_reason = NULL
       WHERE id = ?`,
      [cleanPan, panName.trim(), cleanAadhaar, trimmedState, userId]
    );

    return {
      status: true,
      message: "KYC verified successfully! Your account is now fully compliant under Section 194BA & DPDP rules.",
      data: {
        pan_number: cleanPan,
        pan_name: panName.trim(),
        aadhaar_last4: cleanAadhaar,
        state: trimmedState,
        is_18_plus: 1,
        kyc_status: 'verified',
      },
    };
  } catch (error) {
    console.error("submitKYC error:", error.message);
    throw error;
  }
};

module.exports = authService;
