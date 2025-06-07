const authService = {};
const db = require("../connection");
const { generateJWT } = require("../helpers/generateJWT");
const bcrypt = require("bcrypt");

authService.login = async (body) => {
  try {
    const { email, password } = body;

    if (!email || !password) {
      throw new Error("Please enter both email and password.");
    }

    const [rows] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);

    if (rows.length === 0) {
      // User doesn't exist, create one
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.promise().query("INSERT INTO users (email, password) VALUES (?, ?)", [
        email,
        hashedPassword,
      ]);

      
      const token = await generateJWT(email);
      return { status: true, token, message: "User created and logged in." };
    } else {
      // User exists — compare password
      const user = rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // Instead of throwing, return a status for frontend toast
        return { status: false, message: "Password not match." };
      }

      const token = await generateJWT(email);
      return { status: true, token, message: "Logged in successfully." };
    }
  } catch (error) {
    console.error("Login error:", error.message);
    throw error;
  }
};

module.exports = authService;
