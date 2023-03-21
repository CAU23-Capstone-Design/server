// models/image.js
const mongoose = require('mongoose');

const { Schema } = mongoose;

const imageSchema = new Schema({
  image_id: {
    type: String,
    required: true,
  },
  local_id: {
    type: String,
    required: true,
  },
  couple_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  original_name: {
    type: String,
    required: true,
  },
  server_file_name: {
    type: String,
    required: true,
  },
  upload_date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Image', imageSchema);