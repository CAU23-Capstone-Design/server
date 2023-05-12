const express = require('express');
const Gps = require('../schemas/gps');
const CouplesGps = require('../schemas/couplesGps');

const router = express.Router();
const User = require('../schemas/user');
const Couple = require('../schemas/couple');
const { verifyToken, verifyUser, verifyCouple} = require('./middlewares');

/**
 * @swagger
 * components:
 *   schemas:
 *     Gps:
 *       type: object
 *       properties:
 *         index:
 *           type: Number
 *           description: The auto-generated ID of the GPS record
 *         user_id:
 *           type: string
 *           description: The user's ID associated with the GPS record
 *         latitude:
 *           type: number
 *           format: double
 *           description: The latitude coordinate of the GPS record
 *         longitude:
 *           type: number
 *           format: double
 *           description: The longitude coordinate of the GPS record
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: The date and time when the GPS record was created
 *       required:
 *         - user_id
 *         - latitude
 *         - longitude
 *         - timestamp
 */

const getDistanceBetweenPoints = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return R * c;
  };
  
function haversineDistance(a, b) {
  const R = 6371e3; // 지구의 반지름 (미터)
  const lat1 = a.latitude * (Math.PI / 180);
  const lat2 = b.latitude * (Math.PI / 180);
  const dLat = (b.latitude - a.latitude) * (Math.PI / 180);
  const dLon = (b.longitude - a.longitude) * (Math.PI / 180);

  const aCalc = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));

  return R * c;
}

function rangeQuery(points, point, eps) {
  // 두 point 사이의 거리가 eps보다 작거나 같은 point를 반환
  return points.filter((other) => haversineDistance(point, other) <= eps);
}


// DBSCAN 알고리즘
// points : GPS 좌표들의 배열
// eps : 클러스터의 반경(m)
// minPts : 클러스터를 구성하는 최소 점의 개수
function dbscan(points, eps, minPts) {
  const clusters = [];
  const visited = new Set();
  const noise = new Set();

  for (const point of points) {
    if (visited.has(point)) continue;
    visited.add(point);

    const neighbors = rangeQuery(points, point, eps);

    if (neighbors.length < minPts) {
      noise.add(point);
    } else {
      // 주변에 minPts 이상의 점이 있으면 새로운 클러스터를 생성
      const cluster = [];
      clusters.push(cluster);

      // 주변 점들도 방문한 point로 취급
      for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i];

        // 방문하지 않은 점이면 방문한 점으로 표시
        if (!visited.has(neighbor)) {
          visited.add(neighbor);

          const neighborNeighbors = rangeQuery(points, neighbor, eps);

          if (neighborNeighbors.length >= minPts) {
            neighbors.push(...neighborNeighbors.filter((nn) => !visited.has(nn)));
          }
        }

        if (!clusters.some((c) => c.includes(neighbor))) {
          cluster.push(neighbor);
        }
      }
    }
  }

  return { clusters, noise };
}


  
/**
 * @swagger
 * /gps:
 *  post:
 *      summary: Save GPS location
 *      security:
 *       - jwtToken: []
 *      tags:
 *       - GPS
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                latitude:
 *                  type: number
 *                  format: double
 *                  description: The user's latitude
 *                longitude:
 *                  type: number
 *                  format: double
 *                  description: The user's longitude
 *              required:
 *                - latitude
 *                - longitude
 *      responses:
 *          201:
 *              description: GPS location saved successfully
 *          400:
 *              description: Invalid request body
 *          401:
 *              description: Invalid token
 *          500:
 *              description: Internal server error
*/
router.post('/',verifyToken, verifyUser, verifyCouple, async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    const user_id = req.decoded.user._id;

    // 시간 정보를 한국 시간으로 변환
    const currentUTCDate = new Date();
    const currentKSTDate = new Date(currentUTCDate.getTime() + 9 * 60 * 60 * 1000);

    const gpsData = await Gps.create({
      user_id,
      latitude,
      longitude,
      timestamp: currentKSTDate,
    });
    console.log(`${req.currentDate} - ${req.decoded.user.name} POST /gps 201 OK - `, 'lat: ',gpsData.latitude,', long: ' ,gpsData.longitude);
    res.status(201).json(gpsData);
  } catch (error) {
    next(error);
  }
});

/**
* @swagger
* /gps/check-nearby:
*  get:
*      summary: Check if both users are nearby
*      security:
*       - jwtToken: []
*      tags:
*       - GPS
*      responses:
*          200:
*              description: Success
*              content:
*                application/json:
*                  schema:
*                    type: object
*                    properties:
*                      isNearby:
*                        type: boolean
*                        description: Whether both users are nearby (within 100 meters)
*                      distance:
*                        type: Number
*                        description: distance between couples(m)
*          404:
*              description: User, couple, or GPS data not found
*          401:
*              description: Invalid token
*          500:
*              description: Internal server error
*/

router.get('/check-nearby', verifyToken, verifyUser, verifyCouple, async (req, res, next) => {
  try {
    const user_id = req.decoded.user._id; // 현재 user의 id
    const otherUserId = req.decoded.couple.user1_id === user_id ? req.decoded.couple.user2_id : req.decoded.couple.user1_id; // 상대방 user의 id

    const currentUserGps = await Gps.findOne({ user_id: user_id }).sort({ timestamp: -1 });
    // 상대방 user의 가장 최근 GPS 데이터, timestamp가 최근 5분 이내의 데이터만 가져옴
    // Date를 사용할때 한국 시간 기준으로 사용하기 위해 9시간을 더해줌
    /* 실제 서비스에서는 아래의 코드를 사용
      const otherUserGps = await Gps.findOne({
      user_id: otherUserId,
      timestamp: { $gte: new Date(new Date().getTime() + 9 * 60 * 60 * 1000 - 5 * 60 * 1000) },
    }).sort({ timestamp: -1 });
    */

    const otherUserGps = await Gps.findOne({ user_id: otherUserId }).sort({ timestamp: -1 });




    if (!currentUserGps || !otherUserGps) {
      res.status(404).json({ error: 'GPS data not found' });
      return;
    }

    const distance = getDistanceBetweenPoints(
      currentUserGps.latitude,
      currentUserGps.longitude,
      otherUserGps.latitude,
      otherUserGps.longitude
    );

    const isNearby = distance <= 100; // 100 meters

    if (isNearby) {
      const currentUTCDate = new Date();
      const currentKSTDate = new Date(currentUTCDate.getTime() + 9 * 60 * 60 * 1000);
      const oneMinuteAgo = new Date(currentKSTDate.getTime() - 60 * 1000);

      const existingCouplesGps = await CouplesGps.findOne({
        couple_id: req.decoded.couple.couple_id,
        timestamp: { $gte: oneMinuteAgo },
      });

      if (!existingCouplesGps) {
        const couplesGpsData = new CouplesGps({
          couple_id: req.decoded.couple.couple_id,
          latitude: currentUserGps.latitude,
          longitude: currentUserGps.longitude,
          timestamp: currentUserGps.timestamp,
        });
        await couplesGpsData.save();
      }
    }

    console.log(`${req.currentDate} - ${req.decoded.user.name} GET /gps/check-nearby 200 OK - `, 'isNearby: ',isNearby,', distance: ' ,distance);
    res.status(200).json({ isNearby, distance });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /gps/couples:
 *  get:
 *      summary: 커플의 gps 정보를 클러스터링 하여 반환
 *      tags:
 *       - GPS
 *      security:
 *       - jwtToken: []
 *      parameters:
 *       - name: date
 *         in: query
 *         description: 특정 날짜로 gps 데이터 필터링 가능 (YYYY-MM-DD)
 *         required: true
 *         schema:
 *           type: string
 *      responses:
 *          200:
 *              description: Success
 *              content:
 *                application/json:
 *                  schema:
 *                    type: object
 *                    properties:
 *                      clusters:
 *                        type: array
 *                        items:
 *                          type: array
 *                          items:
 *                            type: integer
 *          404:
 *              description: GPS data not found for the given couple_id
 *          401:
 *              description: Invalid token
 *          500:
 *              description: Internal server error
 */
router.get('/couples', verifyToken, verifyUser, verifyCouple, async (req, res, next) => {
  try {
    const { date } = req.query;

    // date 정보가 없을 경우 에러 처리
    if (!date) {
      res.status(400).json({ error: 'Date is required' });
      return;
    }

    const couple_id = req.decoded.couple.couple_id;
    const query = { couple_id };


    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    query.timestamp = { $gte: startDate, $lt: endDate };

    const gpsData = await CouplesGps.find(query, { _id: 0, latitude: 1, longitude: 1 });

    // 클러스터링 알고리즘에 필요한 파라미터 설정
    const eps = 15; // 밀도 기반 클러스터링에서 가장 중요한 하이퍼파라미터로, 한 클러스터에 포함되는 점들 사이의 최대 거리
    const minPoints = 10; // 클러스터를 구성하는 최소한의 점의 개수

    // 클러스터링 실행
    const result = dbscan(gpsData, eps, minPoints);
    const clusters = result.clusters;

    // clusters 중에서 대표 점 하나들만 추출, 각각의 클러스터에 몇개의 점이 포함되어 있는지도 확인
    clusters.forEach((cluster, index) => {
      const representativePoint = cluster[0];
      clusters[index] = {
        representativePoint,
        count: cluster.length,
      };
    });
    console.log(`${req.currentDate} - ${req.decoded.user.name} GET /gps/couples 200 OK - `, { clusters });
    // 클러스터링 결과를 반환
    res.status(200).json({ clusters });
  } catch (error) {
    next(error);
  }
});

/**
  * @swagger 
  * /gps/user:
  *  get:
  *      summary: Get GPS locations of a specific user using JWT token
  *      tags:
  *       - GPS
  *      security:
  *       - jwtToken: []
  *      responses:
  *          200:
  *              description: Success
  *          404:
  *              description: GPS data not found for the given user_id
  *          401:
  *              description: Invalid token
  *          500:
  *              description: Internal server error
  */
// Get GPS locations of a specific user using JWT token
router.get('/user', verifyToken, verifyUser, verifyCouple, async (req, res, next) => {
try {
    const user_id = req.decoded.user._id;
    const gpsData = await Gps.find({ user_id: user_id }).sort({ index : -1 }).limit(100);

    if (!gpsData) {
    res.status(404).json({ error: 'GPS data not found for the given user_id' });
    } else {

      console.log(`${req.currentDate} - ${req.decoded.user.name} GET /gps/user 200 OK - `, gpsData.length);
      res.status(200).json(gpsData);
    }
} catch (error) {
  next(error);
}
});


/**
 * @swagger
 * /gps/{index}:
 *   put:
 *     summary: Update GPS data by index
 *     tags:
 *       - GPS
 *     security:
 *       - jwtToken: []
 *     parameters:
 *       - in: path
 *         name: index
 *         schema:
 *           type: integer
 *         required: true
 *       - in: body
 *         name: gpsData
 *         schema:
 *           $ref: '#/components/schemas/Gps'
 *     responses:
 *       200:
 *         description: GPS data updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Gps'
 *       404:
 *         description: GPS data not found
 *   delete:
 *     summary: Delete GPS data by index
 *     tags:
 *       - GPS
 *     security:
 *       - jwtToken: []
 *     parameters:
 *       - in: path
 *         name: index
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       204:
 *         description: GPS data deleted successfully
 *       404:
 *         description: GPS data not found
 */
// Update GPS data by index
router.put('/:index', verifyToken, verifyUser, verifyCouple, async (req, res, next) => {
    try {
      const updatedGpsData = await Gps.findOneAndUpdate({ index: req.params.index }, req.body, {
        new: true,
      });
      if (!updatedGpsData) {
        res.status(404).json({ error: 'GPS data not found' });
        return;
      }

      console.log(`${req.currentDate} - ${req.decoded.user.name} PUT /gps/{index} 200 OK - `, updatedGpsData);
      res.json(updatedGpsData);
    } catch (error) {
      next(error);
    }
  });
  
// Delete GPS data by index
router.delete('/:index', verifyToken, verifyUser, verifyCouple, async (req, res, next) => {
  try {
    const result = await Gps.findOneAndDelete({ index: req.params.index });
    if (!result) {
      res.status(404).json({ error: 'GPS data not found' });
      return;
    }
      console.log(`${req.currentDate} - ${req.decoded.user.name} DELETE /gps/{index} 204 OK - `, result);
      res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /gps/couples/dates/{yearMonth}:
 *  get:
 *      summary: 연인이 해당 월에 만난 일자들을 반환
 *      security:
 *       - jwtToken: []
 *      tags:
 *       - GPS
 *      parameters:
 *        - in: path
 *          name: yearMonth
 *          schema:
 *            type: string
 *            example: '2023-05'
 *          required: true
 *          description: 연인이 만난 일자를 알고 싶은 년-월 정보를 입력 (형식 2023-05)
 *      responses:
 *          200:
 *              description: 성공적으로 일자가 리턴 된다.
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              type: integer
 *                              description: 만난 날짜의 일자
 *                          example: [1, 3, 5, 7, 8, 10, 14, 20, 21, 22, 30]
 *          400:
 *              description: Invalid yearMonth format
 *          401:
 *              description: Invalid token
 *          500:
 *              description: Internal server error
 */
router.get('/couples/dates/:yearMonth', async (req, res) => {
  const { yearMonth } = req.params;
  const startDate = new Date(`${yearMonth}-01T00:00:00Z`);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

  const gpsData = await CouplesGps.find({
      timestamp: {
          $gte: startDate,
          $lt: endDate
      }
  });

  const dates = [...new Set(gpsData.map(data => data.timestamp.getDate()))];

  res.json(dates);
});


  
module.exports = router;