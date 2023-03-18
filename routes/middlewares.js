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

/**
 * 
 * router.get('/protected', verifyToken, async (req, res) => {
  try {
    // verifyToken 미들웨어를 통과한 후에는
    // req.decoded 객체에 토큰에 담긴 정보가 들어있습니다.
    const { couple_id, user_id } = req.decoded;

    // 이곳에서 토큰이 유효한지 여부를 확인할 수 있습니다.
    // ...

    res.status(200).json({ message: 'Hello, world!' });
  } catch (error) {
    console.error(error);
    next(error);
  }
});
 */