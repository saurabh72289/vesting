import { Router } from "express";
import healthCheckController from "./main/healthCheckController";
import transaction from "./main/transaction";
import beneficiary from "./main/beneficiary";

const router :any= Router();

router
.get("/healthCheck",healthCheckController.healthCheck)
.post("/transactions", transaction.transactionData)
.post("/getAllTransactionsAmount", transaction.getAllTransactionsAmount)
.post("/getAllUserVestingContract", transaction.getUserVestingContract)
.post("/adminTransactions",  transaction.adminTransactions)
.post("/singleBeneficiary",beneficiary.singleBeneficiary)
.post("/multipleBeneficiary",beneficiary.multipleBeneficiary)
.post("/userTransactions", beneficiary.userTransactions)

 
export default router;