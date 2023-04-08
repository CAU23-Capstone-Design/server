// routes/images.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Image = require('../schemas/image');
const { verifyToken } = require('./middlewares');
const exifr = require('exifr');
const axios = require('axios');
const dotenv = require('dotenv');
const router = express.Router();
const crypto = require('crypto');

dotenv.config();
const base64Key = process.env.AES_SECRET_KEY;
const secretKey = Buffer.from(base64Key, 'base64');


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
      // Get current timestamp and append it to the file name
      const timestamp = Date.now();
      const filename = `${file.fieldname}-${timestamp}-${file.originalname}`;
      cb(null, filename);
    },
  }),
});

function encryptImage(imageBuffer, secretKey) {
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substr(0, 32);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(imageBuffer), cipher.final()]);
  return { iv, encrypted };
}

function decryptImage(encryptedBuffer, secretKey) {
  const algorithm = 'aes-256-cbc';
  const iv = encryptedBuffer.slice(0, 16); // Extract the IV from the encrypted buffer
  const encryptedData = encryptedBuffer.slice(16); // Extract the encrypted data from the buffer
  const key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substr(0, 32);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted;
}

const getGeoLocation = async (longitude, latitude) => {
  try {
    const naverApiUrl = `https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?request=coordsToaddr&coords=${longitude},${latitude}&sourcecrs=epsg:4326&output=json&orders=admcode,roadaddr,addr`;
    const headers = {
      'Content-Type': 'application/json',
      'X-NCP-APIGW-API-KEY-ID': process.env.CLIENT_ID,
      'X-NCP-APIGW-API-KEY': process.env.CLIENT_SECRET
    };

    const response = await axios.get(naverApiUrl, { headers });
    const location = response.data.results[0].region.area1.name + ' ' + response.data.results[0].region.area2.name + ' ' + response.data.results[0].region.area3.name;
    return location;
  } catch (error) {
    console.error(error);
    return '';
  }
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Image:
 *       type: object
 *       required:
 *         - couple_id
 *         - user_id
 *         - local_id
 *         - location
 *         - date
 *         - latitude
 *         - longitude
 *       properties:
 *         _id:
 *           type: string
 *           description: 이미지 고유 ID
 *         couple_id:
 *           type: string
 *           description: 커플 ID
 *         user_id:
 *           type: string
 *           description: 사용자 ID
 *         local_id:
 *           type: string
 *           description: 로컬 이미지 ID
 *         date:
 *           type: string
 *           format: date
 *           description: 이미지 촬영 날짜
 *         location:
 *           type: string
 *           description: 이미지 촬영 위치
 *         latitude:
 *           type: number
 *           description: 이미지 촬영 위도
 *         longitude:
 *           type: number
 *           description: 이미지 촬영 경도
 *
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
 *                 example: "image.jpg"
 *               local_id:
 *                 type: string
 *                 example: "5d5c5e5f5g5h5i5j5k5l5m5n5o5p5q5r5s5t5u5v5w5x5y5z"
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

router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  const { local_id } = req.body;
  const couple_id = req.decoded.couple.couple_id;
  const user_id = req.decoded.user._id;

  const existingImage = await Image.findOne({ local_id });
  if (existingImage) {
    return res.status(400).json({ error: 'local_id must be unique' });
  }

  try {
    console.log('req.file : ', req.file);

    // 이미지 암호화
    const metadata = await exifr.parse(req.file.path);
    const date = metadata.DateTimeOriginal.toISOString().split('T')[0];
    const latitude = metadata.latitude;
    const longitude = metadata.longitude;

    const location = await getGeoLocation(longitude, latitude);    
    const imageBuffer = await fs.promises.readFile(req.file.path);
    const { iv, encrypted } = encryptImage(imageBuffer, secretKey);

    // 암호화된 이미지 저장
    const encryptedImagePath = path.join(path.dirname(req.file.path), 'encrypted_' + req.file.filename);
    await fs.promises.writeFile(encryptedImagePath, Buffer.concat([iv, encrypted]));

    // 원본 이미지 삭제
    await fs.promises.unlink(req.file.path);

    const newImage = new Image({
      couple_id,
      user_id,
      local_id,
      image_url: encryptedImagePath,
      location,
      date,
      longitude,
      latitude,
    });

    await newImage.save();
    res.status(201).json(newImage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error uploading image' });
  }
});

/**
 * @swagger
 * /images/local-ids:
 *   get:
 *     summary: 서버에 저장된 로컬 이미지 ID 목록 조회
 *     tags:
 *       - Images
 *     security:
 *       - jwtToken: []
 *     responses:
 *       200:
 *         description: 로컬 이미지 ID 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *                 oneOf:
 *                   - example: "d41d8cd98f00b204e9800998ecf8427e"
 *                   - example: "a3cca2b2aa1e3b5b3b5aad99a8529074"
 *                   - example: "7b52009b64fd0a2a49e6d8a939753077"
 *                   - example: "9a0364b9e99bb480dd25e1f0284c8555"
 *                   - example: "c8fe7662c1bfa254f6759a8f6759c3db"
 *       500:
 *         description: 로컬 이미지 ID 목록 조회 오류
 */
router.get('/local-ids', verifyToken, async (req, res) => {
  const couple_id = req.decoded.couple.couple_id;

  try {
    const images = await Image.find({ couple_id });
    const local_ids = images.map(image => image.local_id);
    res.status(200).json(local_ids);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error retrieving local_ids' });
  }
});


/**
 * @swagger
 * /images/{local_id}:
 *   get:
 *     summary: 암호화된 이미지 다운로드
 *     tags:
 *       - Images
 *     security:
 *       - jwtToken: []
 *     parameters:
 *       - in: path
 *         name: local_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 이미지 다운로드 성공
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *               example: "이미지 파일 raw 데이터 리턴"
 *       404:
 *         description: 이미지를 찾을 수 없음
 *       500:
 *         description: 이미지 다운로드 오류
 */
router.get('/:local_id', verifyToken, async (req, res) => {
  const local_id = req.params.local_id;
  const couple_id = req.decoded.couple.couple_id;

  try {
    const image = await Image.findOne({ couple_id, local_id });

    if (!image) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    const imagePath = image.image_url;
    const encryptedImageBuffer = fs.readFileSync(imagePath);

    // 이미지 복호화
    const decryptedImage = decryptImage(encryptedImageBuffer, secretKey);

    const fileExtension = path.extname(imagePath);
    res.setHeader('Content-Type', `image/${fileExtension}`);
    res.status(200).send(decryptedImage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error downloading image' });
  }
});



module.exports = router;