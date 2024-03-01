import * as mongoose from "mongoose";
const BlockInfo = new mongoose.Schema(
    {
        address: { type: String, require: true },
        contractName: { type: String, require: true },
        blockNumber: { type: Number },
    }
);

export default mongoose.model("blockInfo", BlockInfo);
