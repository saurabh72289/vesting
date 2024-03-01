import * as mongoose from "mongoose";
const usesData = new mongoose.Schema(
    {
        userAddress : { type: String, require: true, unique: true },
        transactionHash : { type: [String]},
        vestingAddress: { type: [String] },
        event : { type: String, require:false },
        chain: { type: Number, require: true },
        amount: { type: Number, default: 0, require: false }
    },
    { timestamps: true, versionKey: false }
);

export default mongoose.model("userVesting", usesData);
