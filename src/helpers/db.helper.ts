import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();


class DbClass {
  dbConnection = async () => {
    if (process.env.MONGO_URL) {
      await mongoose.connect(process.env.MONGO_URL);
      const db = mongoose.connection;
      db.on("error", console.error.bind(console, "connection error: "));
      db.once("open", function () {
        console.log("Connected successfully");
      });
      mongoose.set("strictQuery", false);
    }
  };
}
export default new DbClass();