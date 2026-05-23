import express from 'express';
import { connectDB } from './src/db/db.js';

connectDB();

const app = express();
const PORT = 3001;

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})