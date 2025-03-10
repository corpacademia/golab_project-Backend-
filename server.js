const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const path = require('path')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser');

const app = express();
const Port = 3000;

const authRouter = require('./src/Routes/authRoutes')
const cloudRouter = require('./src/Routes/cloudRoute')
const restartInstanceRouter = require('./src/Routes/restartInstanceRoute')
const workspaceRouter = require('./src/Routes/workspaceRoute')
const organizationRouter = require('./src/Routes/organizationRouter') 

const fs = require('fs');
const uploadsDir = path.join(__dirname, './uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


dotenv.config({path:"./.env"})
app.use('/uploads', express.static(path.join(__dirname, 'src/public/uploads')));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json())
// app.use("*",(req,res)=>{
//     res.json("Hello from Backend")
// })
app.use('/api/v1',authRouter);
app.use('/api/v1',cloudRouter);
app.use('/api/v1',restartInstanceRouter)
app.use('/api/v1',workspaceRouter)
app.use('/api/v1',organizationRouter);



app.listen(Port,()=>{
    console.log(`Server Started at Port: ${Port}`);
});


