const express = require('express');
const dotenv = require('dotenv');
const connect = require('./schemas');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const https = require('https');
const fs = require('fs');

// 실 서비스 라우터
const imagesRouter = require('./routes/images');
const loginRouter = require('./routes/login');
const couplesRouter = require('./routes/couples')
const gpsRouter = require('./routes/gps');
const usersRouter = require('./routes/users');
const memosRouter = require('./routes/memo');

// 개발용 라우터
const devUserRouter = require('./routes/dev/users');
const devCoupleRouter = require('./routes/dev/couples');
const devTokenRouter = require('./routes/dev/token');
const devLogRouter = require('./routes/dev/log');

dotenv.config();
const app = express();
app.set('port',process.env.PORT || 3000);

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
                url: "https://api.cau-lovestory.site:3000"
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
// app.use(morgan('dev'));
app.use(express.json())

// 서비스용 라우터
app.use('/couples',couplesRouter);
app.use('/gps',gpsRouter);
app.use('/images', imagesRouter);
app.use('/login', loginRouter);
app.use('/users',usersRouter);
app.use('/memos',memosRouter);

// 개발용 라우터
app.use('/dev/user',devUserRouter);
app.use('/dev/couple',devCoupleRouter);
app.use('/dev/token',devTokenRouter);
app.use('/dev/log',devLogRouter);


app.use((req, res, next) => {
    const error =  new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
  });
  
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({message: err.message});
});

// 로컬 환경에서 실행할 때 사용할 기본 리스닝 설정
const startLocalServer = () => {
    app.listen(app.get('port'), () => {
        console.log(app.get('port'), '번 포트에서 리스닝 중');
    });
}

// 배포 환경에서 실행할 때 사용할 HTTPS 리스닝 설정
const startHttpsServer = () => {
    const privateKey = fs.readFileSync('/etc/letsencrypt/live/cau-lovestory.site/privkey.pem', 'utf8');
    const certificate = fs.readFileSync('/etc/letsencrypt/live/cau-lovestory.site/fullchain.pem', 'utf8');
    const credentials = { key: privateKey, cert: certificate };
  
    https.createServer(credentials, app).listen(app.get('port'), () => {
      console.log(app.get('port'), '번 포트에서 리스닝 중');
    });
  };

// 환경 변수에 따라 실행할 서버를 선택합니다.
if (process.env.NODE_ENV === 'dev') {
    startLocalServer();
  } else if (process.env.NODE_ENV === 'pub') {
    startHttpsServer();
  } else {
    console.error('.env 파일에서 NODE_ENV 환경변수를 설정해야 함');
  }
  

