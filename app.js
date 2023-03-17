const express = require('express');
const path = require('path');
const morgan = require('morgan');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const connect = require('./schemas');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const md5 = require('md5')

const usersRouter = require('./routes/users');
const couplesRouter = require('./routes/couples')
const tokenRouter = require('./routes/token');

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
                url : "http://localhost:3000"
            }
        ],
    },
    apis: ["./routes/*.js"]
}

const specs = swaggerJsDoc(options)

app.use('/api-docs',swaggerUI.serve,swaggerUI.setup(specs))
app.use(morgan('dev'));
app.use(express.json())
app.use('/users',usersRouter);
app.use('/couples',couplesRouter);
app.use('/token', tokenRouter);

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
    console.log(md5(Date.now()));

})

