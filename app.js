const express = require('express');
const path = require('path');
const morgan = require('morgan');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const connect = require('./schemas');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const md5 = require('md5')

// 실 서비스 라우터들
const imagesRouter = require('./routes/images');
const loginRouter = require('./routes/login');
const couplesRouter = require('./routes/couples')
const gpsRouter = require('./routes/gps');

// 개발용 라우터들
const devUserRouter = require('./routes/dev/users');
const devCoupleRouter = require('./routes/dev/couples');
const devTokenRouter = require('./routes/dev/token');

dotenv.config();
const app = express();
app.set('port',process.env.PORT || 3000);
app.set('view engine','html');
nunjucks.configure('views',{
    express: app,
    watch: true,
})

connect();
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "LoveStory API",
            version: "1.0.0",
            description: "LoveStory API Docs"
        },
        servers: [
            {
                url: "http://3.34.189.103:3000"
            },
            {
                url: "http://localhost:3000"
            }
        ],
    },
    apis: ["./routes/*.js","./routes/dev/*.js"]
}


const specs = swaggerJsDoc(options)

app.use('/api-docs',swaggerUI.serve,swaggerUI.setup(specs))
app.use(morgan('dev'));
app.use(express.json())

// 서비스용 라우터
app.use('/couples',couplesRouter);
app.use('/gps',gpsRouter);
app.use('/images', imagesRouter);
app.use('/login', loginRouter);

// 개발용 라우터
app.use('/dev/user',devUserRouter);
app.use('/dev/couple',devCoupleRouter);
app.use('/dev/token',devTokenRouter);


app.use((req, res, next) => {
    const error =  new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
  });
  
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});
  
app.listen(app.get('port'), ()=>{
    console.log(app.get('port'),'번 포트에서 리스닝 중');

})

