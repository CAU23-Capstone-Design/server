const express = require("express");
const router = express.Router();
const User = require("../../schemas/user");

/**
 * @swagger
 * /dev/user:
 *  get:
 *       summary: 모든 유저 정보
 *       tags:
 *          - Dev
 *       responses:
 *         200:
 *           description: 데이터베이스의 모든 유저 정보 
 *           content:
 *             application/json:
 *               schema:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/User'
 *  post:
 *       summary: 사용자 추가
 *       tags:
 *          - Dev
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       responses:
 *         201:
 *           description: The created user
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/User'
 *         500:
 *           description: Error creating user
 * /dev/user/{_id}:
 *  put:
 *       summary: _id 정보로 사용자 정보 수정
 *       tags:
 *          - Dev
 *       parameters:
 *         - name: _id
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       responses:
 *         200:
 *           description: The updated user
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/User'
 *         500:
 *           description: Error updating user
 *  delete:
 *       summary: _id 정보로 사용자 삭제
 *       tags:
 *          - Dev
 *       parameters:
 *         - name: _id
 *           in: path
 *           required: true
 *           schema:
 *             type: string
 *       responses:
 *         204:
 *           description: User deleted successfully
 *         500:
 *           description: Error deleting user
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "12345678"
 *           description: 카카오톡 API 회원번호
 *         name:
 *           type: string
 *           example: "강명석"
 *           description: 회원 이름
 *         birthday:
 *           type: string
 *           format: date
 *           example: "1990-01-01"
 *           description: 생년월일
 *         gender:
 *           type: string
 *           example: "M"
 *           description: 성별
 *         code:
 *           type: string
 *           example: "ABCD1234"
 *           description: 8자리의 커플 동기화용 코드
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2023-03-23T00:00:00Z"
 *           description: The date and time the user was created.
 *       required:
 *         - _id
 *         - name
 *         - birthday
 *         - code
 */


// GET: Retrieve all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving users" });
  }
});

// POST: Create a new user
router.post("/", async (req, res) => {
  const newUser = new User(req.body);
  try {
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: "Error creating user" });
  }
});

// PUT: Update a user by _id
router.put("/:_id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params._id, req.body, { new: true });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Error updating user" });
  }
});

// DELETE: Delete a user by _id
router.delete("/:_id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params._id);
    res.status(204).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting user" });
  }
});

module.exports = router;