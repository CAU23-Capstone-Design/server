const express = require('express');
const router = express.Router();
const { verifyToken } = require('./middlewares');
const GPS = require('../schemas/gps');
const jwt = require('jsonwebtoken');

/**
 * @swagger
 * components:
 *   schemas:
 *     GPS:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           description: The ID of the user who saved the GPS information
 *           example: "user1234"
 *         longitude:
 *           type: number
 *           description: Longitude of the location
 *           example: 126.9784
 *         latitude:
 *           type: number
 *           description: Latitude of the location
 *           example: 37.5665
 *       required:
 *         - user_id
 *         - longitude
 *         - latitude
 */

/**
 * @swagger
 * components:
 *  securitySchemes:
 *      jwtToken:
 *          type: http
 *          scheme: bearer
 *          bearerFormat: JWT              
 * 
 * security:
 *  - jwtToken: []
 *
 * /gps:
 *   post:
 *     summary: Save GPS information
 *     tags:
 *      - GPS
 *     security:
 *       - jwtToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               longitude:
 *                 type: number
 *                 description: Longitude of the location
 *                 example: 126.9784
 *               latitude:
 *                 type: number
 *                 description: Latitude of the location
 *                 example: 37.5665
 *             required:
 *               - longitude
 *               - latitude
 *     responses:
 *       201:
 *         description: GPS information saved successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { longitude, latitude } = req.body;
    const userId = req.decoded.user_id; // JWT 토큰에서 user_id 추출
    if (!longitude || !latitude) {
      return res.status(400).json({ error: 'longitude and latitude are required' });
    }
    const gps = new GPS({
      user_id: userId,
      longitude,
      latitude,
    });
    await gps.save();
    return res.status(201).json({ message: 'GPS information saved successfully' });
  } catch (error) {
    console.error(error);
    next(error);
  }
});


/**
 * @swagger
 * /gps:
 *   get:
 *     summary: Get GPS information
 *     tags:
 *      - GPS
 *     security:
 *       - jwtToken: []
 *     responses:
 *       200:
 *         description: GPS information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gps:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GPS'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', verifyToken, async (req, res, next) => {
    try {
      const userId = req.decoded.user_id; // JWT 토큰에서 user_id 추출
      const gps = await GPS.find({ user_id: userId });
      return res.status(200).json({ gps });
    } catch (error) {
      console.error(error);
      next(error);
    }
  });

module.exports = router;