import express, { Application } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import router from "./router";
import dbConnect from "./helpers/db.helper";
import cronHandler from "./cronHandler/cronHandler";

import dotenv from "dotenv";
dotenv.config();

class Server {
  public app: Application;

  constructor() {
    this.app = express();
    this.app.use(cors());

    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));

    dbConnect.dbConnection();
    this.initialiseRouter();

    // cron service
    cronHandler.cronScheduler();
  }

  private initialiseRouter() {
    router(this.app);
    return this;
  }

  public listen(port: number) {
    this.app.listen(port, () => {
      console.log(`Server is running on port....... ${port}`);
    });
  }
}

export default new Server();