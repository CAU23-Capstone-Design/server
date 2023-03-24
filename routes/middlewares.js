const jwt = require('jsonwebtoken');

module.exports = {
  verifyToken: (req, res, next) => {
    try {
      const bearerHeader = req.headers.authorization;
      if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const token = bearer[1];

        // 토큰을 검증합니다.
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
          if (err) {
            res.status(401).json({ error: 'Invalid token' });
          } else {
            req.decoded = decoded;
            next();
          }
        });
      } else {
        res.status(401).json({ error: 'Invalid token' });
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  },
};