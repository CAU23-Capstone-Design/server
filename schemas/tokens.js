const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    user_id: String,
    user_name: String,
    couple_id: String,
    token: String,
});

const Token = mongoose.model('Token',tokenSchema);

module.exports = Token;