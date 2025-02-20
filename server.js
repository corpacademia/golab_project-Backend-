const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const path = require('path')
const bodyParser = require('body-parser')

const app = express();
const Port = 3000;

const authRouter = require('./src/Routes/authRoutes')
const cloudRouter = require('./src/Routes/cloudRoute')
const restartInstanceRouter = require('./src/Routes/restartInstanceRoute')


const fs = require('fs');
const uploadsDir = path.join(__dirname, './uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


dotenv.config({path:"./.env"})
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors())
app.use(express.json())
// app.use("*",(req,res)=>{
//     res.json("Hello from Backend")
// })
app.use('/api/v1',authRouter);
app.use('/api/v1',cloudRouter);
app.use('/api/v1',restartInstanceRouter)



app.listen(Port,()=>{
    console.log(`Server Started at Port: ${Port}`);
})


