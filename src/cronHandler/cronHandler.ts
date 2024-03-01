import * as cron from "node-cron";
import stakeEvents from "../controller/cronEvents/contractEvent";
import * as dotenv from "dotenv";

dotenv.config();
class CronHandler {
  public cronScheduler() {
    cron.schedule("*/6 * * * * *", async () => {
      console.log("================fetching vesting events===================");
      stakeEvents.vestingEvents(
        process.env.FACTORY_ADDRESS,
        process.env.CHAIN
      );
    });

    cron.schedule("*/10 * * * * *", async () => {
      console.log("================fetching factory events===================");
      stakeEvents.getFactoryEvents(
        process.env.FACTORY_ADDRESS,
        process.env.CHAIN
      );
    });

    cron.schedule("*/15 * * * * *", async () => {
      console.log("================fetching OLDVesting events===================");
      stakeEvents.getOldContractEvent(
        process.env.ADDRESS1,
        process.env.CHAIN
      );
    });
  }
}

export default new CronHandler();
