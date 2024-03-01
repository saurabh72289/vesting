import * as mongoose from "mongoose";
const TransactionModel = new mongoose.Schema(
  {
    VestingAddress: {
      type: String,
      require: true
    },
    transactionHash : {
      type: String,
      unique: true
    },
    totalAllocation: {
      type: Number,
      require: true
    },
    event : { type : String , required : true},
    beneficiaries : { type : [String] , required: true},
    deposit : { type: Boolean, default: false}
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("adminTransactions", TransactionModel);
