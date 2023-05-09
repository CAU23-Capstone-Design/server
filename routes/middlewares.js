const jwt = require('jsonwebtoken');
const User = require('../schemas/user');
const Couple = require('../schemas/couple');

module.exports = {
  verifyToken: (req, res, next) => {
    try {
      const bearerHeader = req.headers.authorization;
      if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const token = bearer[1];
        const currentKSTDate = new Date();
        req.currentDate = currentKSTDate;

        // 토큰을 검증합니다.
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
          if (err) {
            res.status(401).json({ error: err });
          } else {
            req.decoded = decoded;
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

  verifyUser: async (req,res,next) => {
    try {
      const user = await User.findById(req.decoded.user._id);

      if(!user){
        res.status(404).json({ error: 'User not found'});
      }

      next();
    } catch(error){
      next(error);
    }
  },

  verifyCouple: async (req, res, next) => {
    try {
      const couple = await Couple.findOne({ couple_id: req.decoded.couple.couple_id });

      if (!couple) {
        return res.status(404).json({ error: 'Couple not found' });
      }

      next();
    } catch (error) {
      next(error);
    }
  }

};