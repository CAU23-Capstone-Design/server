const express = require('express');
const User = require('../schemas/user');
const Couple = require('../schemas/couple');
const Token = require('../schemas/tokens');
const router = express.Router();
const { verifyToken, verifyUser, verifyCouple} = require('./middlewares');
const jwt = require('jsonwebtoken');

const crypto = require('crypto');
const user = require('../schemas/user');

function generateCoupleId() {
  const randomValue = crypto.randomBytes(16).toString('hex');
  return crypto.createHash('md5').update(randomValue).digest('hex');
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Couple:
 *       type: object
 *       properties:
 *         couple_id:
 *           type: string
 *           example: "5f8d02461b56e7b29f53e4e7"
 *           description: The unique identifier of the couple.
 *         user1_id:
 *           type: string
 *           example: "12345678"
 *           description: The unique identifier of the first user in the couple.
 *         user2_id:
 *           type: string
 *           example: "87654321"
 *           description: The unique identifier of the second user in the couple.
 *         firstDate:
 *           type: string
 *           format: date
 *           example: "2023-03-23"
 *           description: The date of the couple's first meeting.
 *         createdAt:
 *           type: string
 *           format: date
 *           example: "2023-03-23T18:04:00Z"
 *           description: The date when the couple was created.
 *       required:
 *         - couple_id
 *         - user1_id
 *         - user2_id
 */
/**
 * components:
 *   schemas:
 *     CoupleUpdate:
 *       type: object
 *       properties:
 *         firstDate:
 *           type: string
 *           format: date
 *           example: "2023-03-23"
 *           description: The updated date of the couple's first meeting.
 *       required:
 *         - firstDate
 */

/**
 * @swagger
 * /couples:
 *   post:
 *     summary: 새로운 커플을 생성 및 토큰 발행
 *     description: 두 명의 사용자를 짝지어서 새로운 커플을 생성한다. user_id가 담긴 jwtToken 정보와, 상대방의 code 정보가 필요하다.
 *     tags:
 *       - Couple
 *     security:
 *       - jwtToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: The unique code of the user to pair with
 *                 example: "A1B2C3"
 *               firstDate:
 *                 type: string
 *                 format: date-time
 *                 description: The date of the couple's first meeting
 *                 example: "2023-03-24T07:30:00.000Z"
 *     responses:
 *       201:
 *         description: Successfully created couple
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Couple successfully created"
 *                 token:
 *                   type: string
 *                   description: The JWT token with user, couple, and firstDate information
 *       400:
 *         description: Bad request, e.g., invalid code, users already in a couple, etc.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { code,firstDate } = req.body;
    const user1_id = req.decoded.user._id;
    console.log(user1_id);  
    console.log(code);
    console.log(firstDate);
    console.log(req.body);

    // user1
    const user1 = await User.findOne({ _id: req.decoded.user._id});
    // Find the user with the provided code
    const user2 = await User.findOne({ code });

    if (!user2) {
      return res.status(400).json({ message: 'User not found with the provided code' });
    }

    const user2_id = user2._id;

    // Check if either user is already in a couple
    const existingCouple1 = await Couple.findOne({ $or: [{ user1_id }, { user2_id: user1_id }] });
    const existingCouple2 = await Couple.findOne({ $or: [{ user1_id: user2_id }, { user2_id }] });

    if (existingCouple1 || existingCouple2) {
      return res.status(400).json({ message: 'One or both users are already in a couple' });
    }

    // Create new couple
    const couple_id = generateCoupleId();
    const couple = new Couple({ couple_id, user1_id, user2_id, firstDate });
    await couple.save();

    // Generate new JWT with user and couple information
    const jwtPayload = {
      user: {
        _id : user1._id,
        name: user1.name,
        code: user1.code,
        birthday: user1.birthday,
        gender: user1.gender
      },
      couple:{
        couple_id: couple.couple_id,
        user1_id : couple.user1_id,
        user2_id : couple.user2_id,
        firstDate: couple.firstDate
      }
    }

    const newToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '180d' });
    Token.create({
      user_id: user1._id,
      user_name: user1.name,
      couple_id: couple.couple_id,
      token: newToken
    })

    res.status(201).json({
      message: 'Couple successfully created',
      token: newToken,
    }); 
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /couples:
 *   get:
 *     summary: 로그인한 사용자 정보를 토대로 커플 정보가 담긴 토큰 발행
 *     tags:
 *       - Couple
 *     security:
 *       - jwtToken: []
 *     responses:
 *       200:
 *         description: 커플 정보가 조회되어, couple_id 와 user_id 가 담긴 jwtToken을 리턴한다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 token:
 *                   type: string
 *                   description: user_id,couple_id 가 담긴 jwtToken
 *       404:
 *         description: Couple not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const user1_id = req.decoded.user._id;
    const user1 = await User.findOne({ _id: req.decoded.user._id});
    const couple = await Couple.findOne({ $or: [{ user1_id }, { user2_id: user1_id }] });

    if (!couple) {
      return res.status(404).json({ message: 'Couple not found' });
    }

    // Generate new JWT with user and couple information
    const jwtPayload = {
      user: {
        _id : user1._id,
        name: user1.name,
        code: user1.code,
        birthday: user1.birthday,
        gender: user1.gender
      },
      couple:{
        couple_id: couple.couple_id,
        user1_id : couple.user1_id,
        user2_id : couple.user2_id,
        firstDate: couple.firstDate
      }
    }

    const newToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '180d' });

    Token.create({
      user_id: user1._id,
      user_name: user1.name,
      couple_id: couple.couple_id,
      token: newToken
    })

    res.status(200).json({
      message: 'Couple found',
      token: newToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /couples/info:
 *   get:
 *     summary: 커플의 두 사용자 정보를 조회
 *     tags:
 *       - Couple
 *     security:
 *       - jwtToken: []
 *     responses:
 *       200:
 *         description: 커플의 정보가 반환된다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user1:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     gender:
 *                       type: string
 *                 user2:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     gender:
 *                       type: string
 *                 firstDate:
 *                   type: string
 *                   format: date
 *       404:
 *         description: Couple not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 */
router.get('/info', verifyToken, async (req, res) => {
  try {
    // 만약 커플의 정보나 사용자 정보가 없으면 404 에러를 반환한다.
    const user1_id = req.decoded.user._id;
    const couple = await Couple.findOne({ $or: [{ user1_id }, { user2_id: user1_id }] });
    const user2_id = couple.user1_id == user1_id ? couple.user2_id : couple.user1_id;
    const user1 = await User.findOne({ _id: user1_id });
    const user2 = await User.findOne({ _id: user2_id });

    if (!couple || !user1 || !user2) {
      return res.status(404).json({ message: 'Couple not found' });
    }


    res.status(200).json({
      "user1": {
        "name": user1.name,
        "gender": user1.gender,
      },
      "user2": {
        "name": user2.name,
        "gender": user2.gender,
      },
      "firstDate": couple.firstDate
    });
    
  } catch (error) {
    next(error);
  }
});


/**
 * @swagger
 * /couples:
 *   put:
 *     summary: 커플 정보 수정
 *     description: couple_id가 담긴 jwtToken을 주면, 해당 커플을 찾아서 정보를 수정한다.
 *     tags:
 *       - Couple
 *     security:
 *       - jwtToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CoupleUpdate'
 *     responses:
 *       200:
 *         description: Couple updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Couple'
 *       401:
 *         description: Invalid token
 *       404:
 *         description: Couple not found
 *       500:
 *         description: Internal server error
 */
router.put('/', verifyToken, async (req, res) => {
  try {
    const couple_id = req.decoded.couple.couple_id;
    const updateData = req.body;

    const couple = await Couple.findOneAndUpdate(
      { couple_id },
      updateData,
      { new: true }
    );

    if (!couple) {
      return res.status(404).json({ message: 'Couple not found' });
    }

    res.json({ message: 'Couple updated successfully', couple });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /couples:
 *   delete:
 *     summary: 커플 정보 삭제
 *     description: couple_id가 담긴 jwtToken을 주면, 해당 커플 정보를 삭제한다.
 *     tags:
 *       - Couple
 *     security:
 *       - jwtToken: []
 *     responses:
 *       200:
 *         description: Couple deleted successfully
 *       401:
 *         description: Invalid token
 *       404:
 *         description: Couple not found
 *       500:
 *         description: Internal server error
 */
router.delete('/', verifyToken, verifyUser, verifyCouple, async (req, res) => {
  try {
    const couple_id = req.decoded.couple.couple_id;

    const couple = await Couple.findOneAndDelete({ couple_id });
    const user2 = await User.findOneAndDelete({ _id: req.decoded.couple.user2_id });
    const user1 = await User.findOneAndDelete({ _id: req.decoded.couple.user1_id });

    if (!couple) {
      return res.status(404).json({ message: 'Couple not found' });
    }
    console.log(`${req.currentDate} ${req.decoded.user.name} DELETE /couples 200 OK ${couple_id}`);
    res.json({ message: 'Couple deleted successfully' });
  } catch (error) {
    next(error);
  }
});




module.exports = router;