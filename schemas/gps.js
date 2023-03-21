const mongoose = require('mongoose');
const Counter = require('./counter');

const { Schema } = mongoose;
const gpsSchema = new Schema({
  index: Number,
  user_id: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
  },
});


gpsSchema.pre('save', async function (next) {
  try {
    // 'postCounter'는 Post 모델에 대한 고유한 카운터를 식별하는 데 사용됩니다.
    let counter = await Counter.findByIdAndUpdate({ _id: 'gpsCounter' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    this.index = counter.seq;
    next();
  } catch (error) {
    next(error);
  }
});


module.exports = mongoose.model('Gps', gpsSchema);