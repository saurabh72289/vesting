import * as dotenv from "dotenv"
dotenv.config()
import Server from "./server";
const port = parseInt(process.env.PORT ?? "7000");

Server.listen(port);
