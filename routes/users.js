const express = require('express');
const User = require('../schemas/user');
const router = express.Router();

/**
 * @swagger
 * components:
 *  schemas:
 *      User:
 *          type: object
 *          required:
 *           - _id
 *           - name
 *           - birthday
 *           - gender
 *          properties:
 *              _id:
 *                  type: string
 *                  description: 카카오톡 API 회원번호         
 *              name:
 *                  type: string
 *              birthday:
 *                  type: date
 *              gender:
 *                  type: string
 *              code:
 *                  type: string
 *                  description: 커플 동기화용 코드
 *              createdAt:
 *                  type: date
 * 
 *          example:
 *              _id: "280715"
 *              name: "강명석"
 *              birthday: "1998-01-29"
 *              gender: "M"
 *              code: "395467"
 *              createdAt: "2023-03-16"
 *              
 */

/**
 * @swagger
 * components:
 *  schemas:
 *      createUserInput:
 *          type: object
 *          required:
 *           - _id
 *           - name
 *           - birthday
 *           - gender
 *          properties:
 *              _id:
 *                  type: string
 *                  description: 카카오톡 회원번호
 *              name:
 *                  type: string
 *              birthday:
 *                  type: date
 *              gender:
 *                  type: string
 * 
 *          example:
 *              _id: 28015
 *              name: 강명석
 *              birthday: 1998-01-29
 *              gender: M
 *              
 */


function generateRandomCode(n){
    let str = '';
    for (let i=0; i<n; i++){
        str += Math.floor(Math.random()*10);
    }
    return str;
}

/**
 * @swagger
 * /users:
 *  get:
 *      summary: 전체 사용자 정보 반환
 *      tags:
 *       - User
 *      responses:
 *          200: 
 *              description: 전체 사용자 정보
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items: 
 *                              $ref: '#/components/schemas/User'
 */
router.get('/',async (req, res, next) => {
    try {
      const users = await User.find({});
      res.json(users);
    } catch (err) {
      console.error(err);
      next(err);
    }
});


/**
 * @swagger
 * /users:
 *  post:
 *      summary: 사용자 정보 생성
 *      tags:
 *       - User
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/createUserInput'
 *      responses:
 *          201:
 *              description: 사용자 생성 성공
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/User'
 * 
 */
router.post('/',async (req, res, next) => {
    try {
      const user = await User.create({
        _id: req.body._id,
        name: req.body.name,
        birthday: req.body.birthday,
        gender: req.body.gender,
        code: generateRandomCode(6)
      });
      console.log(user);
      res.status(201).json(user);
    } catch (err) {
      console.error(err);
      next(err);
    }
});



/**
 * @swagger
 * /users/{id}:
 *  get:
 *      summary: 회원번호가 {id}인 사용자 반환
 *      tags:
 *       - User
 *      parameters:
 *          - name: id
 *            in: path
 *            description: 카카오톡 회원번호
 *            required: true
 *      responses:
 *          200: 
 *              description: 사용자 정보
 *              content: 
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/User'
 */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findOne({ _id:req.params.id });
    console.log(user);
    res.json(user);
  } catch (err) {
    console.error(err);
    next(err);
  }
});
/**
 * @swagger
 * /users/{id}:
 *  put:
 *      summary: 회원번호가 {id}인 사용자 정보 업데이트
 *      tags:
 *       - User
 *      parameters:
 *          - name: id
 *            in: path
 *            description: 카카오톡 회원번호
 *            required: true
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/createUserInput'
 *      responses:
 *          200:
 *              description: 사용자 정보 업데이트 성공
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/User'
 * 
 *          404:
 *              description: 해당 회원번호를 가진 사용자가 존재하지 않음
 * 
 *          500:
 *              description: 서버 에러
 *              
 */
router.put('/:id', async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id },
      {
        name: req.body.name,
        birthday: req.body.birthday,
        gender: req.body.gender
      },
      { new: true }
    );
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    console.log(user);
    res.json(user);
  } catch (err) {
    console.error(err);
    next(err);
  }
});


/**
 * @swagger
 * /users/{id}:
 *  delete:
 *      summary: 회원번호가 {id}인 사용자 정보 삭제
 *      tags:
 *       - User
 *      parameters:
 *          - name: id
 *            in: path
 *            description: 카카오톡 회원번호
 *            required: true
 *      responses:
 *          204:
 *              description: 사용자 정보 삭제 성공
 * 
 *          404:
 *              description: 해당 회원번호를 가진 사용자가 존재하지 않음
 * 
 *          500:
 *              description: 서버 에러
 *              
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    console.log(user);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    next(err);
  }
});


module.exports = router;