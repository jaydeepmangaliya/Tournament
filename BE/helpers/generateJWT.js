// BE/helpers/generateJWT.js
const jwt = require('jsonwebtoken');

exports.generateJWT = async (payload) => {
  if (typeof payload === 'string') {
    payload = { email: payload };
  }
  return jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '30d' });
};
