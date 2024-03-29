const mongoose = require('mongoose');

const connect = () => {
    if (process.env.NODE_ENV !== 'pub'){
        mongoose.set('debug',true);
    }
    mongoose.connect('mongodb://127.0.0.1:27017/lovestory')
        .then(() => {
            console.log("몽고디비 연결 성공");
        })
        .catch((err) => {
            console.error('몽고디비 연결 실패');
        })
}

mongoose.connection.on('error',(error) => {
    console.error('몽고디비 연결 에러',error);
});

mongoose.connection.on('disconencted',() => {
    console.error('몽고디비 연결이 끊겼습니다. 연결을 재시도 합니다.');
    connect();
})

module.exports = connect;