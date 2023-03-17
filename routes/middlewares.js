const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.verifyToken = (req, res, next) => {
  // 인증 완료
  try {
    if( !req.headers.authorization){
        return res.status(403).json({
            code: 403,
            message: "jwt token 정보가 존재하지 않습니다."
        })
    }

    const token = req.headers.authorization.split(' ')[1];
    console.log(token);
    req.decoded = jwt.verify(token, process.env.JWT_SECRET)
    return next();
  }
  
  // 인증 실패 
  catch(error) {
    if (error.name === 'TokenExpireError') {
      return res.status(419).json({
        code: 419,
        message: '토큰이 만료되었습니다.'
      });
    }
   return res.status(401).json({
     code: 401,
     message: '유효하지 않은 토큰입니다.'
   });
  }
}