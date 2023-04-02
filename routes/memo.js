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

/**
 * @swagger
 * /memos/{memoId}:
 *   put:
 *     summary: 메모 수정
 *     tags: [memos]
 *     security:
 *       - jwtToken: []
 *     parameters:
 *       - in: path
 *         name: memoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: The updated content of the memo
 *               date:
 *                 type: string
 *                 format: date
 *                 description: The updated date of the memo
 *             required:
 *               - content
 *               - date
 *     responses:
 *       200:
 *         description: Memo updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Memo'
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Error updating memo
 */
router.put('/:memoId', verifyToken, async (req, res) => {
  const { content, date } = req.body;
  const memoId = req.params.memoId;

  try {
    const updatedMemo = await Memo.findByIdAndUpdate(
      memoId,
      { content, date },
      { new: true }
    );
    if (updatedMemo) {
      res.status(200).json(updatedMemo);
    } else {
      res.status(400).json({ error: 'Invalid request' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error updating memo' });
  }
});

/**
 * @swagger
 * /memos/memoid/{memoId}:
 *   delete:
 *     summary: 메모 삭제 (memoid로 삭제)
 *     tags: [memos]
 *     security:
 *       - jwtToken: []
 *     parameters:
 *       - in: path
 *         name: memoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Memo deleted successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Error deleting memo
 */
router.delete('/memoid/:memoId', verifyToken, async (req, res) => {
  const memoId = req.params.memoId;

  try {
    const deletedMemo = await Memo.findByIdAndDelete(memoId);
    if (deletedMemo) {
      res.status(200).json({ message: 'Memo deleted successfully' });
    } else {
      res.status(400).json({ error: 'Invalid request' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error deleting memo' });
  }
});

/**
 * @swagger
 * /memos/date/{date}:
 *   delete:
 *     summary: 메모 삭제 (날짜로 삭제)
 *     tags: [memos]
 *     security:
 *       - jwtToken: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Memos deleted successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Error deleting memos
 */
router.delete('/date/:date', verifyToken, async (req, res) => {
  const date = req.params.date;
  const couple_id = req.decoded.couple.couple_id;

  try {
    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(targetDate.getDate() + 1);

    const deletedMemos = await Memo.deleteMany({
      couple_id,
      date: {
        $gte: targetDate,
        $lt: nextDate,
      },
    });

    if (deletedMemos) {
      res.status(200).json({ message: 'Memos deleted successfully' });
    } else {
      res.status(400).json({ error: 'Invalid request' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error deleting memos' });
  }
});


module.exports = router;