import * as mongoose from "mongoose";

const transactions = new mongoose.Schema({
  vestingAddress: { type: String, required: true },
  transactionHash: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, require: true }
});

const TransactionModel = new mongoose.Schema(
  {
    userAddress: {
      type: String,
      required: true,
      unique: true
    },
    transactionDetails: {
      type: [transactions],
      unique: true
    },
    event: { type: String, required: true },
    totalClaimed: { type: Number, default: 0 },
    createdAt: { type: Date, require: true },
    updatedAt: { type: Date, require: true }
  },
  { timestamps: true, versionKey: false }
);

TransactionModel.index({ 'transactionDetails.transactionHash': 1 }, { unique: true });
export default mongoose.model("userTransactions", TransactionModel);
