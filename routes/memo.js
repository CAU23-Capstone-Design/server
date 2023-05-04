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
    console.log(req.decoded.user.name,' POST /memos 201 OK' , content, date);
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
    // console.log로 메모의 memos의 내용중, content만 출력
    console.log(req.decoded.user.name,' GET /memos 200 OK', memos.map(memo => memo.content));
    res.status(200).json(memos);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving memos' });
  }
});


/**
 * @swagger
 * paths:
 *   /memos/{date}:
 *     get:
 *       security:
 *         - jwtToken: []
 *       summary: 특정 날짜의 메모 확인
 *       tags: [memos]
 *       parameters:
 *         - in: path
 *           name: date
 *           required: true
 *           schema:
 *             type: string
 *             format: date
 *       responses:
 *         '200':
 *           description: A memo associated with the couple for the specified date
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/Memo'
 *         '401':
 *           description: Unauthorized access
 *         '500':
 *           description: Internal server error
 */
router.get('/:date', verifyToken, async (req, res) => {
  const date = req.params.date;
  const couple_id = req.decoded.couple.couple_id;

  try {
    const memo = await Memo.findOne({ couple_id, date });
    if (memo) {
      console.log(req.decoded.user.name,' GET /memos/:date 200 OK', memo.content);
      res.status(200).json(memo);
    } else {
      res.status(404).json({ error: 'Memo not found for the specified date' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving memo' });
  }
});

/**
 * @swagger
 * /memos/{date}:
 *   put:
 *     summary: 메모 수정 또는 생성
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
 *             required:
 *               - content
 *     responses:
 *       200:
 *         description: Memo updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Memo'
 *       201:
 *         description: Memo created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Memo'
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Error updating or creating memo
 */
router.put('/:date', verifyToken, async (req, res) => {
  const { content } = req.body;
  const date = req.params.date;
  const couple_id = req.decoded.couple.couple_id;

  try {
    let updatedMemo = await Memo.findOneAndUpdate(
      { couple_id, date },
      { content },
      { new: true }
    );

    if (updatedMemo) {
      console.log(req.decoded.user.name,' PUT /memos/:date 200 OK', updatedMemo.content);
      res.status(200).json(updatedMemo);
    } else {
      const newMemo = new Memo({ couple_id, date, content });
      await newMemo.save();
      res.status(201).json(newMemo);
    }
  } catch (error) {
    res.status(500).json({ error: 'Error updating or creating memo' });
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
 *         example: 64288a7563afd02dcd0f4357
 *     responses:
 *       200:
 *         description: Memo deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Memo deleted successfully
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid request
 *       500:
 *         description: Error deleting memo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error deleting memo
 */
router.delete('/memoid/:memoId', verifyToken, async (req, res) => {
  const memoId = req.params.memoId;

  try {
    const deletedMemo = await Memo.findByIdAndDelete(memoId);
    if (deletedMemo) {
      console.log(req.decoded.user.name,' DELETE /memos/memoid/:memoId 200 OK', deletedMemo.content);
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
 *         example: '2023-04-02'
 *     responses:
 *       200:
 *         description: Memos deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Memos deleted successfully
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid request
 *       500:
 *         description: Error deleting memos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error deleting memos
 *       examples:
 *         'application/json':
 *           message: Memos deleted successfully
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
      console.log(req.decoded.user.name,' DELETE /memos/date/:date 200 OK', deletedMemos);
      res.status(200).json({ message: 'Memos deleted successfully' });
    } else {
      res.status(400).json({ error: 'Invalid request' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error deleting memos' });
  }
});


module.exports = router;