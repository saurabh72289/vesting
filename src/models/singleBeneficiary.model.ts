import * as mongoose from "mongoose";
const singleBen = new mongoose.Schema(
    {
        userAddress: { type: String, require: false },
        transactionHash: { type: String, require: false, unique: true },
        vestingAddress: { type: String, require: false ,unique: true},
        event: { type: String, require: false },
        chain: { type: Number, require: false },
        claimed: { type: Number, default: 0 },
        pazaVested: { type: Number, default: 0 },
        noOfVesting: { type: Number, require: true }
    },
    { timestamps: true, versionKey: false }
);

singleBen.index({ 'transactionHash': 1 }, { unique: true });
export default mongoose.model("singleBenificiary", singleBen);
