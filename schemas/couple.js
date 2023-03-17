const mongoose = require('mongoose');

const { Schema } = mongoose;
const coupleSchema = new Schema({
  couple_id: {
    type: String,
    required: true,
    unique: true
  },
  user1_id: {
    type: String,
    required: true,
    unique: true,
  },
  user2_id: {
    type: String,
    required: true,
    unique: true,
  },
  firstDate:{
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Couple', coupleSchema);