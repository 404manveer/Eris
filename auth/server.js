// ES Module imports
import "dotenv/config.js";
import connectDB from "./src/db/db.js";
import redisClient from "./src/db/redis.js";
import app from "./src/app.js"; 


connectDB();


app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
