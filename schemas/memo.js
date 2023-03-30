const mongoose = require('mongoose');

const { Schema } = mongoose;
const memoSchema = new Schema({
    date: {
        type: Date,
        required: true,
    },
    couple_id: {
        type: String,
        required: true,
    },
    content:{
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model('Memo',memoSchema);