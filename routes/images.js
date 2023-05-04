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
const sharp = require('sharp');

dotenv.config();
const base64Key = process.env.AES_SECRET_KEY;
const secretKey = Buffer.from(base64Key, 'base64');

function getTimestamp() {
  const date = new Date();

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 두 자리로 만들기
  const day = date.getDate().toString().padStart(2, '0'); // 두 자리로 만들기
  const hour = date.getHours().toString().padStart(2, '0'); // 두 자리로 만들기
  const minute = date.getMinutes().toString().padStart(2, '0'); // 두 자리로 만들기
  const second = date.getSeconds().toString().padStart(2, '0'); // 두 자리로 만들기

  const timestamp = `${year}${month}${day}${hour}${minute}${second}`;

  return timestamp;
}

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
      const timestamp = getTimestamp()
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
    const area1 = response.data.results[0].region.area1.name;
    const area2 = response.data.results[0].region.area2.name;
    const area3 = response.data.results[0].region.area3.name;

    return { 'area1' : area1, 'area2': area2, 'area3':area3 };
  } catch (error) {
    console.error(error);
    return {};
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
 *           type: object
 *           properties:
 *             area1:
 *               type: string
 *               description: 서울특별시
 *             area2:
 *               type: string
 *               description: 은평구
 *             area3:
 *               type: string
 *               description: 응암1동
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
  const local_id = req.body.local_id.replace(/"/g, '');
  const couple_id = req.decoded.couple.couple_id;
  const user_id = req.decoded.user._id;

  const existingImage = await Image.findOne({ local_id });
  if (existingImage) {
    console.error('local_id must be unique')
    return res.status(400).json({ error: 'local_id must be unique' });
  }

  try {
    // 이미지 암호화
    const metadata = await exifr.parse(req.file.path);

    const date = metadata.DateTimeOriginal.toISOString();
    const latitude = metadata.latitude;
    const longitude = metadata.longitude;

    console.time("naver_map_api_call");
    // api 호출(네이버 맵)
    const location = await getGeoLocation(longitude, latitude);
    console.timeEnd("naver_map_api_call");
    console.log(location);

    console.time("image_encryption");
    // 이미지 저장    
    const imageBuffer = await fs.promises.readFile(req.file.path);
    const { iv, encrypted } = encryptImage(imageBuffer, secretKey);
    console.timeEnd("image_encryption");

    const originDir = path.join(__dirname, '..', 'uploads', couple_id, 'origin');
    if (!fs.existsSync(originDir)) {
      fs.mkdirSync(originDir, { recursive: true });
    }
    const thumbnailDir = path.join(__dirname, '..', 'uploads', couple_id, 'thumbnail');
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    // 암호화된 이미지 저장
    const encryptedImagePath = path.join(originDir, 'encrypted_' + req.file.filename);
    fs.promises.writeFile(encryptedImagePath, Buffer.concat([iv, encrypted]));

    // 썸네일 생성 및 암호화
    const thumbnailBuffer = await sharp(req.file.path).resize({ width: 200 }).toBuffer();
    const { iv: thumbnailIv, encrypted: thumbnailEncrypted } = encryptImage(thumbnailBuffer, secretKey);

    // 암호화된 썸네일 저장
    const encryptedThumbnailPath = path.join(thumbnailDir, 'encrypted_thumbnail_' + req.file.filename);
    fs.promises.writeFile(encryptedThumbnailPath, Buffer.concat([thumbnailIv, thumbnailEncrypted]));

    const newImage = new Image({
      couple_id,
      user_id,
      local_id,
      image_url: encryptedImagePath,
      thumbnail_url: encryptedThumbnailPath,
      location,
      date,
      longitude,
      latitude,
    });
    
    await newImage.save();
    console.log(req.decoded.user.name,' POST /images 201 OK ', newImage.date,  newImage.couple_id, req.file.filename);
    res.status(201).json(newImage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error uploading image' });
  } finally{
    // 원본 이미지 삭제
    fs.promises.unlink(req.file.path);
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
    console.log(req.decoded.user.name,' GET /images/local-ids 200 OK ', local_ids);
    res.status(200).json(local_ids);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error retrieving local_ids' });
  }
});

/**
 * @swagger
 * /images/local-ids/info:
 *   get:
 *     summary: 주어진 couple_id에 대한 모든 이미지 정보 조회
 *     tags:
 *       - Images
 *     security:
 *       - jwtToken: []
 *     responses:
 *       200:
 *         description: 이미지 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Image'
 *       500:
 *         description: 이미지 정보 조회 오류
 */
router.get('/local-ids/info', verifyToken, async (req, res) => {
  const couple_id = req.decoded.couple.couple_id;

  try {
    const images = await Image.find({ couple_id });
    // console.log에 출력되는 정보는 images 배열중에서 각 요소의 local_id만 출력
    console.log(req.decoded.user.name,' GET /images/local-ids/info 200 OK ', images.map(image => image.local_id));
    res.status(200).json(images);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error retrieving local_ids' });
  }
});

/**
 * @swagger
 * /images/thumbnails:
 *   get:
 *     summary: 암호화된 썸네일 이미지 범위 다운로드
 *     tags:
 *       - Images
 *     security:
 *       - jwtToken: []
 *     parameters:
 *       - in: query
 *         name: start
 *         required: false
 *         schema:
 *           type: integer
 *         description: 시작 이미지 인덱스 (기본값 0)
 *       - in: query
 *         name: end
 *         required: false
 *         schema:
 *           type: integer
 *         description: 종료 이미지 인덱스 (기본값 무한대)
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *         description: 필터링할 날짜 (YYYYMMDD 형식)
 *       - in: query
 *         name: area1
 *         required: false
 *         schema:
 *           type: string
 *         description: 필터링할 지역 1
 *       - in: query
 *         name: area2
 *         required: false
 *         schema:
 *           type: string
 *         description: 필터링할 지역 2
 *     responses:
 *       200:
 *         description: 썸네일 이미지 범위 다운로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   image_info:
 *                     type: object
 *                     properties:
 *                       local_id:
 *                         type: string
 *                       date:
 *                         type: string
 *                       area1:
 *                         type: string
 *                       area2:
 *                         type: string
 *                   thumbnail:
 *                     type: string
 *                     format: binary
 *                     example: "썸네일 이미지 파일 raw 데이터 리턴"
 *       404:
 *         description: 썸네일 이미지를 찾을 수 없음
 *       500:
 *         description: 썸네일 이미지 범위 다운로드 오류
 */
router.get('/thumbnails', verifyToken, async (req, res) => {
  const start = parseInt(req.query.start);
  const end = parseInt(req.query.end);
  const date = req.query.date;
  const area1 = req.query.area1;
  const area2 = req.query.area2;
  const couple_id = req.decoded.couple.couple_id;

  try {
    const filter = { couple_id };

    if (date) filter.date = date;
    if (area1) filter['location.area1'] = area1;
    if (area2) filter['location.area2'] = area2;

    const images = await Image.find(filter)
                              .sort({ date: -1 })
                              .skip(start)
                              .limit(end - start + 1);

    if (!images.length) {
      res.status(404).json({ error: 'Thumbnail images not found' });
      return;
    }

    const thumbnails = [];

    for (const image of images) {
      const thumbnailPath = image.thumbnail_url;
      const encryptedThumbnailBuffer = fs.readFileSync(thumbnailPath);

      // 썸네일 이미지 복호화
      const decryptedThumbnail = decryptImage(encryptedThumbnailBuffer, secretKey);

      const imageInfo = {
        local_id: image.local_id,
        date: image.date,
        area1: image.location.area1,
        area2: image.location.area2
      };

      thumbnails.push({ image_info: imageInfo, thumbnail: decryptedThumbnail });
    }
    // thunmbnails 중에서 image_info만 뽑아서 console.log에 기록
    console.log(req.decoded.user.name,' GET /images/thumbnails 200 OK ', thumbnails.map(thumbnail => thumbnail.image_info.local_id));
    res.status(200).json(thumbnails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error downloading thumbnail images range' });
  }
});

/**
 * @swagger
 * /images/{local_id}:
 *   get:
 *     summary: 암호화된 이미지 다운로드(화질 선택 가능)
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
 *       - in: query
 *         name: quality
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 100
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
  const quality = parseInt(req.query.quality) || 100;

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

    // 이미지 리사이징
    const resizedImageBuffer = await sharp(decryptedImage)
      .metadata()
      .then(({ width, height }) =>
        sharp(decryptedImage)
          .resize({
            width: Math.round(width * (quality / 100)),
            height: Math.round(height * (quality / 100)),
            fit: 'contain',
          })
          .toBuffer()
      )
      .catch((error) => {
        console.error(error);
        throw new Error('Error resizing image');
      });
    console.log(req.decoded.user.name,' GET /images/{local_id} 200 OK ', local_id);
    const fileExtension = path.extname(imagePath);
    res.setHeader('Content-Type', `image/${fileExtension}`);
    res.status(200).send(resizedImageBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error downloading image' });
  }
});
/**
 * @swagger
 * /images/{local_id}/thumbnail:
 *   get:
 *     summary: 암호화된 썸네일 이미지 다운로드
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
 *         description: 썸네일 이미지 다운로드 성공
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *               example: "썸네일 이미지 파일 raw 데이터 리턴"
 *       404:
 *         description: 썸네일 이미지를 찾을 수 없음
 *       500:
 *         description: 썸네일 이미지 다운로드 오류
 */
router.get('/:local_id/thumbnail', verifyToken, async (req, res) => {
  const local_id = req.params.local_id;
  const couple_id = req.decoded.couple.couple_id;

  try {
    const image = await Image.findOne({ couple_id, local_id });

    if (!image) {
      res.status(404).json({ error: 'Thumbnail image not found' });
      return;
    }

    const thumbnailPath = image.thumbnail_url;
    const encryptedThumbnailBuffer = fs.readFileSync(thumbnailPath);

    // 썸네일 이미지 복호화
    const decryptedThumbnail = decryptImage(encryptedThumbnailBuffer, secretKey);

    console.log(req.decoded.user.name,' GET /images/{local_id}/thumbnail 200 OK ', local_id);
    const fileExtension = path.extname(thumbnailPath);
    res.setHeader('Content-Type', `image/${fileExtension}`);
    res.status(200).send(decryptedThumbnail);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error downloading thumbnail image' });
  }
});


/**
 * @swagger
 * /images/{local_id}/info:
 *   get:
 *     summary: 이미지 정보 가져오기
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
 *         description: 이미지 정보 성공적으로 가져옴
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Image'
 *       404:
 *         description: 이미지를 찾을 수 없음
 *       500:
 *         description: 이미지 정보 가져오는 중 오류 발생
 */
router.get('/:local_id/info', verifyToken, async (req, res) => {
  const local_id = req.params.local_id;
  const couple_id = req.decoded.couple.couple_id;

  try {
    const image = await Image.findOne({ couple_id, local_id });

    if (!image) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    console.log(req.decoded.user.name,' GET /images/{local_id}/info 200 OK ', local_id);
    res.status(200).json(image);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching image information' });
  }
});

/**
 * @swagger
 * /images/{local_id}:
 *   delete:
 *     summary: 이미지 삭제
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
 *         description: 이미지 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Image deleted successfully"
 *       404:
 *         description: 이미지를 찾을 수 없음
 *       500:
 *         description: 이미지 삭제 중 오류 발생
 */
router.delete('/:local_id', verifyToken, async (req, res) => {
  const local_id = req.params.local_id;
  const couple_id = req.decoded.couple.couple_id;

  try {
    const image = await Image.findOne({ couple_id, local_id });

    if (!image) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    // 이미지 파일 삭제
    await fs.promises.unlink(image.image_url);
    await fs.promises.unlink(image.thumbnail_url);

    // DB에서 이미지 정보 삭제
    await Image.deleteOne({ couple_id, local_id });

    console.log(req.decoded.user.name,' DELETE /images/{local_id} 200 OK ', local_id);
    res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting image' });
  }
});

/**
 * @swagger
 * /images:
 *   delete:
 *     summary: 커플의 모든 이미지 삭제
 *     tags:
 *       - Images
 *     security:
 *       - jwtToken: []
 *     responses:
 *       200:
 *         description: 커플의 모든 이미지 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "All images deleted successfully"
 *       500:
 *         description: 이미지 삭제 중 오류 발생
 */
router.delete('/', verifyToken, async (req, res) => {
  const couple_id = req.decoded.couple.couple_id;

  try {
    const images = await Image.find({ couple_id });

    // 이미지 파일들 삭제
    for (const image of images) {
      await fs.promises.unlink(image.image_url);
      await fs.promises.unlink(image.thumbnail_url);
    }

    // DB에서 이미지 정보들 삭제
    await Image.deleteMany({ couple_id });

    console.log(req.decoded.user.name,' DELETE /images 200 OK ');
    res.status(200).json({ message: 'All images deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting images' });
  }
});

module.exports = router;