const express = require("express");
const router = express.Router();
const Couple = require("../../schemas/couple");

/**
 * @swagger
 * /dev/couple:
 *  get:
 *       summary: 모든 커플 정보 반환
 *       tags:
 *          - Dev
 *       responses:
 *         200:
 *           description: 모든 커플
 *           content:
 *             application/json:
 *               schema:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Couple'
 *  post:
 *       summary: 새로운 커플 생성
 *       tags:
 *          - Dev
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Couple'
 *       responses:
 *         201:
 *           description: The created couple
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/Couple'
 *         500:
 *           description: Error creating couple
 * /dev/couple/{couple_id}:
 *  put:
 *       summary: 커플정보 수정
 *       tags:
 *          - Dev
 *       parameters:
 *         - name: couple_id
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CoupleUpdate'
 *       responses:
 *         200:
 *           description: The updated couple
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/Couple'
 *         500:
 *           description: Error updating couple
 *  delete:
 *       summary: 커플 정보 삭제
 *       tags:
 *          - Dev
 *       parameters:
 *         - name: couple_id
 *           in: path
 *           required: true
 *       schema:
 *             type: string
 *       responses:
 *         204:
 *           description: Couple deleted successfully
 *         500:
 *           description: Error deleting couple
 * components:
 *   schemas:
 *     Couple:
 *       type: object
 *       properties:
 *         couple_id:
 *           type: string
 *           description: The unique ID of the couple.
 *           example: "715abd62bd"
 *         user1_id:
 *           type: string
 *           description: The unique ID of the first user in the couple.
 *           example: "27197512"
 *         user2_id:
 *           type: string
 *           description: The unique ID of the second user in the couple.
 *           example: "23725672"
 *         firstDate:
 *           type: string
 *           format: date
 *           description: The date of the couple's first meeting.
 *           example: "2023-03-23"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The timestamp of when the couple was created.
 *       required:
 *         - couple_id
 *         - user1_id
 *         - user2_id
 *     CoupleUpdate:
 *       type: object
 *       properties:
 *         firstDate:
 *           type: string
 *           format: date
 *           description: 커플이 처음 만난 날 정보 업데이트
 */

// GET: Retrieve all couples
router.get("/", async (req, res) => {
  try {
    const couples = await Couple.find();
    res.json(couples);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving couples" });
  }
});

// POST: Create a new couple
router.post("/", async (req, res) => {
  const newCouple = new Couple(req.body);
  try {
    await newCouple.save();
    res.status(201).json(newCouple);
  } catch (error) {
    res.status(500).json({ error: "Error creating couple" });
  }
});

// PUT: Update a couple by couple_id
router.put("/:couple_id", async (req, res) => {
  try {
    const updatedCouple = await Couple.findOneAndUpdate({ couple_id: req.params.couple_id }, req.body, { new: true });
    res.json(updatedCouple);
  } catch (error) {
    res.status(500).json({ error: "Error updating couple" });
  }
});

// DELETE: Delete a couple by couple_id
router.delete("/:couple_id", async (req, res) => {
  try {
    await Couple.findOneAndDelete({ couple_id: req.params.couple_id });
    res.status(204).json({ message: "Couple deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting couple" });
  }
});

module.exports = router;