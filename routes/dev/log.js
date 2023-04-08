const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    // current.log 파일을 읽어서 브라우저로 리턴
    const path = require('path');
    const logPath = path.join(__dirname, '..', '..', 'current.log');
    res.sendFile(logPath);
});

module.exports = router;