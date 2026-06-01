import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import router from './routers/cart.router.js';



const app = express();

app.use(express.json());
app.use(bodyParser.json());
dotenv.config();
app.use(cookieParser());


app.use('/cart', router);

export default app;