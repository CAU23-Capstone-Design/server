const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../schemas/user');
const Couple = require('../schemas/couple'); // Import Couple schema
const router = express.Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: 카카오톡 access Token을 이용한 lovestory
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: The access token from Kakao
 *     responses:
 *       200:
 *         description: Login successful and JWT token is returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the login was successful
 *                 message:
 *                   type: string
 *                   description: A message describing the result of the login process
 *                 token:
 *                   type: string
 *                   description: The JWT token for the authenticated user
 *       500:
 *         description: Error occurred while processing the access token
 */

router.post('/', async (req, res) => {
    const accessToken = req.body.accessToken;
    console.log(accessToken);
    try {
        // Verify and get user information from Kakao API
        const response = await axios.get('https://kapi.kakao.com/v2/user/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const userData = response.data;
        const userId = userData.id;
        const gender = userData.kakao_account.gender;
        const birthday = userData.kakao_account.birthday;
        const nickname = userData.kakao_account.profile.nickname;

        // Check if the user exists in the database
        let user = await User.findById(userId);

        if (!user) {
            // Generate a random 6-character code
            const code = (Math.random().toString(36) + '00000000000000000').slice(2, 8).toUpperCase();

            // Create a new user in the database
            user = new User({
                _id: userId,
                name: nickname,
                birthday: new Date(`${birthday.slice(0, 2)}-${birthday.slice(2, 4)}-${new Date().getFullYear()}`),
                gender: gender,
                code: code,
                createdAt: new Date(),
            });

            await user.save();
        }

        // Check if the couple exists for the user
        const couple = await Couple.findOne({ $or: [{ user1_id: userId }, { user2_id: userId }] });

        // Create JWT payload
        const jwtPayload = {
            user: {
                _id: user._id,
                name: user.name,
                code: user.code,
            },
            couple: null,
        };

        if (couple) {
            // If a couple is found, add couple_id to the JWT payload
            jwtPayload.couple = { couple_id: couple.couple_id };
        }

        // Sign and return JWT token
        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({
            success: true,
            message: '카카오 로그인 성공',
            token,
        });
        console.log('/login 토큰 발급',token);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error occurred while processing the access token');
    }
});

/**
 * @swagger
 * /login/test:
 *   post:
 *     summary: 카카오톡 access Token을 이용한 lovestory
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: The access token from Kakao
 *     responses:
 *       200:
 *         description: Login successful and JWT token is returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the login was successful
 *                 message:
 *                   type: string
 *                   description: A message describing the result of the login process
 *                 token:
 *                   type: string
 *                   description: The JWT token for the authenticated user
 *       500:
 *         description: Error occurred while processing the access token
 */


router.post('/test', async (req, res) => {
    // 클라이언트에서 전송된 accessToken을 정상적인 토큰이라고 가정
    const accessToken = req.body.accessToken;

    // 새로운 사용자 생성을 위해 테스트 데이터 사용
    const userId = `kakao_${accessToken}`;
    const gender = 'male';
    const birthday = '0101';
    const nickname = `User_${userId}`;

    try {
        // Check if the user exists in the database
        let user = await User.findById(userId);

        if (!user) {
            // Generate a random 6-character code
            const code = (Math.random().toString(36) + '00000000000000000').slice(2, 8).toUpperCase();

            // Create a new user in the database
            user = new User({
                _id: userId,
                name: nickname,
                birthday: new Date(`${birthday.slice(0, 2)}-${birthday.slice(2, 4)}-${new Date().getFullYear()}`),
                gender: gender,
                code: code,
                createdAt: new Date(),
            });

            await user.save();
        }
        // Check if the couple exists for the user
        const couple = await Couple.findOne({ $or: [{ user1_id: userId }, { user2_id: userId }] });

        // Create JWT payload
        const jwtPayload = {
            user: {
                _id: user._id,
                name: user.name,
                code: user.code,
            },
            couple: null,
        };

        if (couple) {
            // If a couple is found, add couple_id to the JWT payload
            jwtPayload.couple = { couple_id: couple.couple_id };
        }

        // Sign and return JWT token
        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({
            success: true,
            message: '카카오 로그인 성공',
            token,
        });

    } catch (error) {
        res.status(500).send('Error occurred while processing the access token');
    }
});

module.exports = router;