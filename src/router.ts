import  { Application } from "express";
import mainRouter from "../src/controller/router.controller";

export default function router(server: Application): void {
  server.use("/api/v1", mainRouter);
}
