
const jwt = require("jsonwebtoken")


exports.verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'token is required for authentication'
    });
  }

  try {
    const decoded = jwt.verify(token,process.env.JWT_SECRET_KEY);
    req.user = decoded;
    return next();
  } 

  catch (err) {

    return res.status(401).json({
      success: false,
      message: 'Invalid Token'
    });
    
  }
};