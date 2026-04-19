import express from 'express';
import authRouter from './routers/auth.route.js';
import cookieParser from 'cookie-parser';

// Initialize Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

// All routes
app.use('/api/auth', authRouter)

export default app;
