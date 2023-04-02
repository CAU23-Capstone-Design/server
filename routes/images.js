// routes/images.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Image = require('../schemas/image');
const { verifyToken } = require('./middlewares');

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const coupleDir = path.join(__dirname, '..', 'uploads', req.decoded.couple.couple_id);
      if (!fs.existsSync(coupleDir)) {
        fs.mkdirSync(coupleDir, { recursive: true });
      }
      cb(null, coupleDir);
    },
    filename(req, file, cb) {
      cb(null, `${Date.now()}_${file.originalname}`);
    },
  }),
});

router.use(verifyToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     Image:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the image
 *         couple_id:
 *           type: string
 *           description: The couple's ID associated with the image
 *         user_id:
 *           type: string
 *           description: The user's ID who uploaded the image
 *         local_id:
 *           type: string
 *           description: The locally assigned ID of the image on the user's device
 *         url:
 *           type: string
 *           description: The URL of the uploaded image
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the image was uploaded
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time when the image was last updated
 *       required:
 *         - couple_id
 *         - user_id
 *         - local_id
 *         - url
 */

/**
 * @swagger
 * /images:
 *   post:
 *     summary: 이미지 업로드
 *     security:
 *       - jwtToken: []
 *     tags:
 *       - Images
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               local_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: 이미지 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Image'
 *       400:
 *         description: 이미지 업로드 실패
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const couple_id = req.decoded.couple.couple_id;
    const user_id = req.decoded.user._id;

    const { originalname, filename } = req.file;
    /*

    const image = await Image.create({
      image_id: `${couple_id}_${Date.now()}`,
      local_id,
      couple_id,
      user_id,
      original_name: originalname,
      server_file_name: filename,
    });
    */
    console.log(req.file);
    console.log(req.body);
    console.log(req.decoded);

    res.status(201).json({'message' : 'merrong'});
  } catch (error) {
    console.error(error);
    next(error);
  }
});

/**
 * @swagger
 * /images/sync:
 *   post:
 *     summary: 이미지 동기화 확인
 *     security:
 *       - jwtToken: []
 *     tags:
 *       - Images
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               local_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 이미지 동기화 확인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 images_to_upload:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: 이미지 동기화 확인 실패
 */
router.post('/sync', async (req, res, next) => {
    try {
      const { couple_id, user_id } = req.decoded;
      const { local_ids } = req.body;
  
      const server_images = await Image.find({ couple_id });
  
      const images_to_upload = local_ids.filter(
        (local_id) => server_images.some((img) => img.local_id === local_id),
      );
  
      res.status(200).json({
        images_to_upload,
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  });

module.exports = router;