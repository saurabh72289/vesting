import * as dotenv from "dotenv";
dotenv.config();
import { Request, Response } from "express";
import { MessageUtil } from "../../utils/message";
import Joi, { array } from "joi";
import { RESPONSES, RES_MSG } from "../../constant/response";
import TransactionModel from "../../models/adminTransaction.model";
import transactionTokenModel from "../../models/singleBeneficiary.model";
import UserVestingModel from "../../models/user.Vesting.model";
import singleBeneficiaryModel from "../../models/singleBeneficiary.model";
import vestingUserModel from "../../models/vesting.User.model";
import userTransactionModel from "../../models/userTransaction.model";
const contractAbi = require("../../abis/VestingAbi.json");

const { Web3 } = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.POLYGONRPC));

class transaction {
    public removeNFromBigInt = async (bigIntValue: any) => {
        if (typeof bigIntValue !== "bigint") {
            throw new Error("Input must be a BigInt");
        }

        const stringValue: any = bigIntValue.toString();
        const stringWithoutN = stringValue.replace("n", "");

        return stringWithoutN;
    };

    public async multipleBeneficiary(req: Request, res: Response) {
        try {
            const schema = Joi.object({
                page: Joi.number().required().min(1).error(new Error("Please provide admin address")),
                perPage: Joi.number()
                    .required()
                    .min(1)
                    .error(new Error("Please provide contract address")),
            });
            const { error } = schema.validate(req.body);
            if (error) {
                return MessageUtil.success(res, {
                    status: RESPONSES.BADREQUEST,
                    error: false,
                });
            }

            const page = req.body.page;
            const perPage = req.body.perPage;
            const totalDocument = await vestingUserModel.countDocuments({});
            const data = await vestingUserModel.find().sort({ updatedAt: -1 })
                .limit(perPage)
                .skip(perPage * page - perPage);

            MessageUtil.success(res, {
                status: RESPONSES.SUCCESS,
                error: false,
                data: data,
                totalCount: totalDocument,
            });
        } catch (error) {
            MessageUtil.error(res, {
                status: RESPONSES.INTERNALSERVER,
                error: true,
            });
        }
    }

    public async singleBeneficiary(req: Request, res: Response) {
        try {
            const schema = Joi.object({
                page: Joi.number().required(),
                perPage: Joi.number().required()
            });
            const { error } = schema.validate(req.body);
            if (error) {
                throw {
                    status: RESPONSES.BADREQUEST,
                    error: true,
                    message: error.message,
                };
            }
            const page = req.body.page;
            const perPage = req.body.perPage;
            const totalDocument = await singleBeneficiaryModel.countDocuments({});
            const data = await singleBeneficiaryModel.find().sort({ updatedAt: -1 })
                .limit(perPage)
                .skip(perPage * page - perPage);

            MessageUtil.success(res, {
                status: RESPONSES.SUCCESS,
                error: false,
                data: data,
                totalCount: totalDocument,
            });
        } catch (error: any) {
            MessageUtil.error(res, {
                status: RESPONSES.INTERNALSERVER,
                error: true,
            });
        }
    }

    public async userTransactions(req: Request, res: Response) {
        try {
            const schema = Joi.object({
                page: Joi.number().required(),
                perPage: Joi.number().required()
            });
            const { error } = schema.validate(req.body);
            if (error) {
                console.log(error, "error")
                throw {
                    status: RESPONSES.BADREQUEST,
                    error: true,
                    message: error.message,
                };
            }
            const page = req.body.page;
            const perPage = req.body.perPage;
            const totalDocument = await userTransactionModel.countDocuments({});
            const data = await userTransactionModel.find().sort({ updatedAt: -1 })
                .limit(perPage)
                .skip(perPage * page - perPage);

            MessageUtil.success(res, {
                status: RESPONSES.SUCCESS,
                error: false,
                data: data,
                totalCount: totalDocument,
            });
        } catch (error) {
            MessageUtil.error(res, {
                status: RESPONSES.INTERNALSERVER,
                error: true,
            });
        }
    }
}
export default new transaction();
