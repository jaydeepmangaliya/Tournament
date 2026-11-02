const affiliateService = require("../services/affiliate-service");
const referralService = require("../services/referral-service");
const db = require("../connection");

async function resolveUserId(req) {
  if (req.user?.id) return req.user.id;
  if (req.user?.email) {
    const [rows] = await db.promise().query("SELECT id FROM users WHERE email = ?", [req.user.email]);
    if (rows.length > 0) return rows[0].id;
  }
  return null;
}

exports.getAffiliateDashboard = async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return res.status(401).json({ status: false, message: "Unauthorized" });

    const result = await affiliateService.getDashboard(userId);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.getReferralDashboard = async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return res.status(401).json({ status: false, message: "Unauthorized" });

    const result = await referralService.getDashboard(userId);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

