import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();


const app = express();

app.use(express.json());
app.use(cookieParser());

export default app;