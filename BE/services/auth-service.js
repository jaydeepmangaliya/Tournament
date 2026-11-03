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
      return await authService.register(body);
    }

    const user = rows[0];
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

module.exports = authService;
