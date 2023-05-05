const express = require('express');
const User = require('../schemas/user');
const Couple = require('../schemas/couple');
const router = express.Router();
const {verifyToken} = require('./middlewares');


/**
 * @swagger
 * /users/findByCode:
 *  get:
 *      summary: 코드를 기준으로 사용자 정보 반환
 *      tags:
 *       - User
 *      parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: 사용자 코드
 *      responses:
 *          200: 
 *              description: 코드에 일치하는 사용자 정보
 *              content: 
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/User'
 *          404:
 *              description: 사용자를 찾을 수 없음
 */
router.get('/findByCode', async (req, res, next) => {
    try {
        const { code } = req.query;
        const user = await User.findOne({ code: code });
  
        if (!user) {
            res.status(404).json({ "error": "user not found" });
            return;
        }
        res.json(user);
    } catch (err) {
        next(err);
    }
  });
  
  module.exports = router;