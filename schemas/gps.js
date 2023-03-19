const mongoose = require('mongoose');
const AutoIncrementFactory = require('mongoose-sequence');

const { Schema } = mongoose;
const gpsSchema = new Schema({
  index: {
    type: Number,
    unique: true,
  },
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

const AutoIncrement = AutoIncrementFactory(mongoose.connection);
gpsSchema.plugin(AutoIncrement, { inc_field: 'index', id: 'gpsIndex' });

module.exports = mongoose.model('Gps', gpsSchema);