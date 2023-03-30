const jwt = require('jsonwebtoken');

module.exports = {
  verifyToken: (req, res, next) => {
    try {
      console.log("Token Verify 진입");
      const bearerHeader = req.headers.authorization;
      if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const token = bearer[1];
        console.log("raw token: ", bearerHeader);

        // 토큰을 검증합니다.
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
          if (err) {
            res.status(401).json({ error: err });
          } else {
            req.decoded = decoded;
            console.log('JWT Decoded',decoded.user._id,decoded.user.name);
            next();
          }
        });
      } else {
        res.status(401).json({ error: 'Invalid token : bearerHeader 오류' });
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  },
};