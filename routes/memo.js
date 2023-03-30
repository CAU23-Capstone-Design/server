const express = require('express');
const router = express.Router();
const { verifyToken } = require('./middlewares');
const Memo = require('../schemas/memo');

/**
 * @swagger
 * tags:
 *   name: memos
 *   description: Memo management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Memo:
 *       type: object
 *       required:
 *         - content
 *         - date
 *         - couple_id
 *       properties:
 *         _id:
 *           type: string
 *           description: _id
 *         content:
 *           type: string
 *           description: 메모
 *         date:
 *           type: string
 *           format: date
 *           description: 메모 날짜
 *         couple_id:
 *           type: string
 *           description: 커플 id
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 메모 생성 일자
 */

/**
 * @swagger
 * /memos:
 *   post:
 *     summary: 메모 생성
 *     tags: [memos]
 *     security:
 *       - jwtToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: The content of the memo
 *               date:
 *                 type: string
 *                 format: date
 *                 description: The date of the memo
 *             required:
 *               - content
 *               - date
 *     responses:
 *       201:
 *         description: Memo created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Memo'
 *       500:
 *         description: Error creating memo
 */
router.post('/', verifyToken, async (req, res) => {
  const { content, date } = req.body;
  const couple_id = req.decoded.couple.couple_id;

  try {
    const newMemo = new Memo({ couple_id, content, date });
    await newMemo.save();
    res.status(201).json(newMemo);
  } catch (error) {
    res.status(500).json({ error: 'Error creating memo' });
  }
});

/**
 * @swagger
 * paths:
 *   /memos:
 *     get:
 *       security:
 *         - jwtToken: []
 *       summary: 메모 확인
 *       tags: [memos]
 *       responses:
 *         '200':
 *           description: A list of memos associated with the couple
 *           content:
 *             application/json:
 *               schema:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Memo'
 *         '401':
 *           description: Unauthorized access
 *         '500':
 *           description: Internal server error
 */
router.get('/', verifyToken, async (req, res) => {
  const couple_id = req.decoded.couple.couple_id;

  try {
    const memos = await Memo.find({ couple_id });
    res.status(200).json(memos);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving memos' });
  }
});

module.exports = router;