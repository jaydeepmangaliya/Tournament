const authService = require("../services/auth-service");

exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.status(201).json(result);
  } catch (error) {
    console.error("Register controller error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Login controller error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.verifyCode = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await authService.verifyCode(code);
    return res.json(result);
  } catch (error) {
    console.error("verifyCode controller error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.me = async (req, res) => {
  try {
    const email = req.user?.email;
    const id = req.user?.id;
    if (!email && !id) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }
    const result = await authService.getProfile(id || email);
    return res.json(result);
  } catch (error) {
    console.error("Me controller error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.submitKYC = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }
    const result = await authService.submitKYC(userId, req.body);
    if (!result.status) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("submitKYC controller error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};
