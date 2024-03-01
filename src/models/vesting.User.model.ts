import * as mongoose from "mongoose";

const beneficiarySchema = new mongoose.Schema({
    address: { type: String, required: true },
    percentage: { type: Number, required: true }
}, { _id: false });

const vestingDataSchema = new mongoose.Schema(
    {
        vestingAddress: { type: String, required: true, unique: true },
        transactionHash: { type: String, required: true },
        beneficiaries: [beneficiarySchema],
        event: { type: String, required: true },
        chain: { type: Number, required: true },
        pazaVested: { type: Number, required: true },
        claimed: { type: Number, default: 0 },
        noOfVesting: { type: Number, require: true }
    },
    { timestamps: true, versionKey: false }
);

export default mongoose.model("vestingUser", vestingDataSchema);
