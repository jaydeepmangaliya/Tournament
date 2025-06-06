const jwt = require('jsonwebtoken');
exports.generateJWT = async(email) => {
    if(!email){ 
        throw new Error('Email is required.'); 
    }
        const token = jwt.sign({ email },  process.env.JWT_SECRET_KEY);
    
        return token;
}

exports.ver