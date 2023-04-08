const express = require('express');
const Gps = require('../schemas/gps');
const router = express.Router();
const User = require('../schemas/user');
const Couple = require('../schemas/couple');
const {verifyToken} = require('./middlewares');

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
router.post('/',verifyToken, async (req, res, next) => {
  try {

    const { latitude, longitude } = req.body;
    const user_id = req.decoded.user._id;
    const gpsData = await Gps.create({
      user_id,
      latitude,
      longitude,
      timestamp: Date.now(),
    });

    res.status(201).json(gpsData);
  } catch (error) {
    console.error(error);
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

router.get('/check-nearby',verifyToken, async (req, res, next) => {
  try {
    const user_id = req.decoded.user._id;
    const user = await User.findById(user_id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const couple = await Couple.findOne({ $or: [{ user1_id: user_id }, { user2_id: user_id }] });
    if (!couple) {
      res.status(404).json({ error: 'Couple not found' });
      return;
    }

    const otherUserId = couple.user1_id === user_id ? couple.user2_id : couple.user1_id;

    const currentUserGps = await Gps.findOne({ user_id: user_id }).sort({ timestamp: -1 });
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
    res.status(200).json({ isNearby ,distance});
  } catch (error) {
    console.error(error);
    next(error);
  }
});

/**
 * @swagger
 * /gps/couple:
 *  get:
 *      summary: Get GPS locations of both users in the same couple using JWT token
 *      tags:
 *       - GPS
 *      security:
 *       - jwtToken: []
 *      responses:
 *          200:
 *              description: Success
 *          404:
 *              description: GPS data not found for the given couple_id
 *          401:
 *              description: Invalid token
 *          500:
 *              description: Internal server error
 */
// Get GPS locations of both users in the same couple using JWT token
router.get('/couple', verifyToken, async (req, res, next) => {
    try {
      const couple_id = req.decoded.couple_id;
      const couple = await Couple.findOne({ couple_id: couple_id });
  
      if (!couple) {
        res.status(404).json({ error: 'Couple not found for the given couple_id' });
        return;
      }
  
      const user1_id = couple.user1_id;
      const user2_id = couple.user2_id;
      const gpsDataUser1 = await Gps.find({ user_id: user1_id });
      const gpsDataUser2 = await Gps.find({ user_id: user2_id });
  
      res.status(200).json({ user1: gpsDataUser1, user2: gpsDataUser2 });
    } catch (error) {
      console.error(error);
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
router.get('/user', verifyToken, async (req, res, next) => {
try {
    const user_id = req.decoded.user_id;
    const gpsData = await Gps.find({ user_id: user_id });

    if (!gpsData) {
    res.status(404).json({ error: 'GPS data not found for the given user_id' });
    } else {
    res.status(200).json(gpsData);
    }
} catch (error) {
    console.error(error);
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
router.put('/:index', verifyToken, async (req, res, next) => {
    try {
      const updatedGpsData = await Gps.findOneAndUpdate({ index: req.params.index }, req.body, {
        new: true,
      });
      if (!updatedGpsData) {
        res.status(404).json({ error: 'GPS data not found' });
        return;
      }
      res.json(updatedGpsData);
    } catch (error) {
      console.error(error);
      next(error);
    }
  });
  
  // Delete GPS data by index
  router.delete('/:index', verifyToken, async (req, res, next) => {
    try {
      const result = await Gps.findOneAndDelete({ index: req.params.index });
      if (!result) {
        res.status(404).json({ error: 'GPS data not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error(error);
      next(error);
    }
  });

  
module.exports = router;