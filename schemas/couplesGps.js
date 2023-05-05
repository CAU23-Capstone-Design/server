const mongoose = require('mongoose');
const Counter = require('./counter');

const { Schema } = mongoose;
const couplesGpsSchema = new Schema({
  index: Number,
  couple_id: {
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

couplesGpsSchema.pre('save', async function (next) {
  try {
    // 'couplesGpsCounter'는 CouplesGps 모델에 대한 고유한 카운터를 식별하는 데 사용됩니다.
    let counter = await Counter.findByIdAndUpdate({ _id: 'couplesGpsCounter' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    this.index = counter.seq;
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('CouplesGps', couplesGpsSchema);