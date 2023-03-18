const express = require('express');
const jwt = require('jsonwebtoken');
const Couple = require('../schemas/couple');
require('dotenv').config();

const { verifyToken } = require('./middlewares');

const router = express.Router();


/**
 * @swagger
 * components:
 *  securitySchemes:
 *      jwtToken:
 *          type: http
 *          scheme: bearer
 *          bearerForamt: JWT              
 * 
 * security:
 *  - jwtToken: []
 */



/**
 * @swagger
 * /token:
 *  post:
 *      summary: 토큰 생성
 *      tags:
 *       - Token
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          couple_id:
 *                              type: string
 *                          user_id:
 *                              type: string
 *                      example:
 *                          couple_id: "2d61bee99121f226661d03bd96e97a43"
 *                          user_id: "28019"
 *      responses:
 *          201:
 *              description: 토큰 생성 성공
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              token:
 *                                  type: string
 *                          example:
 *                              token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb3VwbGVfaWQiOiIyZDYxYmVlOTkxMjFmMjI2NjYxZDAzYmQ5NmU5N2E0MyIsInVzZXJfaWQiOiIyODAxOSIsImlhdCI6MTY3OTA0MzA4MCwiZXhwIjoxNjk0NTk1MDgwLCJpc3MiOiJsb3Zlc3RvcnkifQ.N4epvps54jcuguGjaD2UvqPWOMFCA2-44JlGUHdI7xY
 */

router.post('/', async (req,res) => {
    try{
        const couple_id = req.body.couple_id;
        const user_id = req.body.user_id;
        const couple = await Couple.findOne({$and : [{couple_id : couple_id},{$or:[{user1_id:user_id},{user2_id:user_id}]}]});
        if (!couple){
            res.status(400).json({"error":"Invalid couple_id or user_id"});
            return;
        }

        const token = jwt.sign({couple_id,user_id},process.env.JWT_SECRET,{
            expiresIn: '180d',
            issuer:'lovestory'
        });

        return res.status(201).json({token})
    } catch(error){
        console.error(error);
        next(error);
    }
})



/**
 * @swagger
 * /test:
 *   get:
 *     summary: JWT 토큰 검증
 *     tags:
 *       - Token
 *     security:
 *       - jwtToken: []
 *     responses:
 *       200:
 *         description: JWT 토큰 검증 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 couple_id:
 *                   type: string
 *                 user_id:
 *                   type: string
 *               example:
 *                 couple_id: "2d61bee99121f226661d03bd96e97a43"
 *                 user_id: "28019"
 *       401:
 *         description: JWT 토큰 검증 실패
 */


router.get('/test', verifyToken, (req, res) => {
    res.json(req.decoded);
  });

module.exports = router;