const express = require('express');
const User = require('../schemas/user');
const Couple = require('../schemas/couple');
const router = express.Router();
const md5 = require('md5');

/**
 * @swagger
 * components:
 *  schemas:
 *      Couple:
 *          type: object
 *          required:
 *           - couple_id
 *           - user1_id
 *           - user2_id
 *           - firstDate
 *          properties:
 *              couple_id:
 *                  type: string
 *                  description: 커플의 id (랜덤 값)
 *              user1_id:
 *                  type: string
 *                  description: 코드를 입력한 계정의 id
 *              user2_id:
 *                  type: string
 *                  description: 코드를 입력받은 계정의 id
 *              firstDate:
 *                  type: date
 *                  description: 처음만난 날
 *              createdAt:
 *                  type: date
 * 
 *          example:
 *              couple_id: 15027a3a71f40c3a55960ca1d6415587
 *              user1_id: 28015
 *              user2_id: 63452
 *              firstDate: 2023-03-16
 *              createdAt: 2023-03-16
 *              
 */

/**
 * @swagger
 * components:
 *  schemas:
 *      createCoupleInput:
 *          type: object
 *          required:
 *           - user1_id
 *           - code
 *           - firstDate
 *          properties:
 *              user1_id:
 *                  type: string
 *                  description: 요청하는 사용자의 카카오 회원번호
 *              code:
 *                  type: string
 *                  description: 상대방 사용자의 코드 번호
 *              firstDate:
 *                  type: date
 *                  description: 요청하는 사용자가 입력한 처음 만난 날
 * 
 *          example:
 *              user1_id: 28015
 *              code: 369712
 *              firstDate: 2023-03-16
 *              
 */

/**
 * @swagger
 * /couples:
 *  get:
 *      summary: 전체 커플 정보 반환
 *      tags:
 *       - Couple
 *      responses:
 *          200: 
 *              description: 전체 커플 정보
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items: 
 *                              $ref: '#/components/schemas/Couple'
 */
router.get('/',async (req, res, next) => {
    try {
      const couples = await Couple.find({});
      res.status(200).json(couples);
    } catch (err) {
      console.error(err);
      next(err);
    }
});

/**
 * @swagger
 * /couples/findByUserId:
 *  get:
 *      summary: 사용자 번호를 통해서 커플정보 찾기
 *      tags:
 *       - Couple
 *      parameters:
 *        - in: query
 *          name: userid
 *          schema:
 *            type: string
 *          required: false
 *      responses:
 *          200: 
 *              description: 전체 커플 정보
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items: 
 *                              $ref: '#/components/schemas/Couple'
 */
router.get('/findByUserId',async (req, res, next) => {
  try {
    const couples = await Couple.findOne({'$or' : [{user1_id:req.query.userid},{user2_id:req.query.userid}]});
    res.status(200).json(couples);
  } catch (err) {
    console.error(err);
    next(err);
  }
});



/**
 * @swagger
 * /couples:
 *  post:
 *      summary: 커플 정보 생성
 *      tags:
 *       - Couple
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/createCoupleInput'
 *      responses:
 *          201:
 *              description: 커플 정보 생성 성공
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Couple'
 * 
 */
router.post('/',async (req, res, next) => {
    try {
        const user1_id = req.body.user1_id;
        const user2_id = await User.findOne({code: req.body.code});

        if (user1_id == user2_id){
          res.status(400).json({"error" : "user1 insert self code"});
          return;
        }

        if(!user2_id){
            res.status(400).json({"error":"wrong code"});
            return;
        }
        
        if( await Couple.exists({user1_id: user1_id})){
            res.status(409).json({"error": "user1 already have couple code"});
            return;
        }

        if( await Couple.exists({user2_id: user2_id})){
            res.status(409).json({"error": "user2 already have couple code"});
        }



        const couple = await Couple.create({
            couple_id: md5(Date.now()),
            user1_id: user1_id,
            user2_id: user2_id,
            firstDate: req.body.firstDate,
        });
        console.log('couple created',couple);

        // 커플 생성후 user1,user2의 코드 삭제
        await User.findByIdAndUpdate(user1_id,{ $unset: {code:1} });
        await User.findByIdAndUpdate(user2_id,{ $unset: {code:1} });
        
        res.status(201).json(couple);
    } catch (err) {
      console.error(err);
      next(err);
    }
});



/**
 * @swagger
 * /couples/{id}:
 *  get:
 *      summary: 커플번호가 {id}인 사용자 반환
 *      tags:
 *       - Couple
 *      parameters:
 *          - name: id
 *            in: path
 *            description: 커플 번호
 *            required: true
 *      responses:
 *          200: 
 *              description: 커플 정보
 *              content: 
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Couple'
 */
router.get('/:id', async (req, res, next) => {
  try {
    const couple = await Couple.findOne({couple_id:req.params.id});
    res.json(couple);
  } catch (err) {
    console.error(err);
    next(err);
  }
});


/**
 * @swagger
 * /couples/{id}:
 *  put:
 *      summary: 커플 정보 수정
 *      tags:
 *       - Couple
 *      parameters:
 *          - in: path
 *            name: id
 *            schema:
 *              type: string
 *            required: true
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/createCoupleInput'
 *      responses:
 *          200:
 *              description: 커플 정보 수정 성공
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Couple'
 *          404:
 *              description: 해당 id의 커플 정보가 없음
 *          409:
 *              description: 이미 해당 사용자에게 커플 코드가 부여된 상태
 */
router.put('/:id', async (req, res, next) => {
  try {
      const couple = await Couple.findById(req.params.id);
      if (!couple) {
          res.status(404).json({"error":"couple not found"});
          return;
      }
      
      const user1_id = req.body.user1_id;
      const user2_id = await User.findOne({code: req.body.code});
      if(!user2_id){
          res.status(400).json({"error":"wrong code"});
          return;
      }
      
      if( await Couple.exists({user1_id: user1_id}) && couple.user1_id !== user1_id){
          res.status(409).json({"error": "user1 already have couple code"});
          return;
      }

      if( await Couple.exists({user2_id: user2_id}) && couple.user2_id !== user2_id){
          res.status(409).json({"error": "user2 already have couple code"});
          return;
      }

      couple.user1_id = user1_id;
      couple.user2_id = user2_id;
      couple.firstDate = req.body.firstDate;
      await couple.save();
      res.status(200).json(couple);
  } catch (err) {
      console.error(err);
      next(err);
  }
});

/**
* @swagger
* /couples/{id}:
*  delete:
*      summary: 커플 정보 삭제
*      tags:
*       - Couple
*      parameters:
*          - in: path
*            name: id
*            schema:
*              type: string
*            required: true
*      responses:
*          204:
*              description: 커플 정보 삭제 성공
*          404:
*              description: 해당 id의 커플 정보가 없음
*/
router.delete('/:id', async (req, res, next) => {
  try {
      const couple = await Couple.findOneAndDelete({couple_id:req.params.id});
//      const couple = await Couple.findByIdAndDelete(req.params.id);
      if (!couple) {
          res.status(404).json({"error":"couple not found"});
          return;
      }
      res.sendStatus(204);
  } catch (err) {
      console.error(err);
      next(err);
  }
});

module.exports = router;