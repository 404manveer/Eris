import express from 'express';
import * as productRouter from './src/router/product.router';
import cookieParser from 'cookie-parser';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/api/products",productRouter.default);

export default app;