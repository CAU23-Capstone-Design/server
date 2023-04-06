const mongoose = require('mongoose');

const { Schema } = mongoose;
const imageSchema = new Schema({
  couple_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  local_id: {
    type: String,
    required: true,
  },
  image_url: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model('Image', imageSchema);