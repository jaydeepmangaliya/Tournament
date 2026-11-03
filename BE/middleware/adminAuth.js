const jwt = require("jsonwebtoken");
const db = require("../connection");

exports.verifyAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: false,
      message: "Authentication token is required."
    });
  }

  try {
    const secret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    req.user = decoded;

    let userRow = null;
    if (decoded.id) {
      const [rows] = await db.promise().query("SELECT id, role, status FROM users WHERE id = ?", [decoded.id]);
      if (rows.length > 0) userRow = rows[0];
    }
    if (!userRow && decoded.email) {
      const [rows] = await db.promise().query("SELECT id, role, status FROM users WHERE email = ?", [decoded.email]);
      if (rows.length > 0) userRow = rows[0];
    }

    if (userRow && userRow.role === 'admin' && userRow.status !== 'banned') {
      req.user.role = 'admin';
      req.user.id = userRow.id;
      return next();
    }

    return res.status(403).json({
      status: false,
      message: "Access forbidden: Administrator privileges required."
    });
  } catch (err) {
    return res.status(401).json({
      status: false,
      message: "Invalid or expired authorization token."
    });
  }
};

