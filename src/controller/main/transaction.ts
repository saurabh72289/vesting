import * as dotenv from "dotenv";
dotenv.config();
import { Request, Response } from "express";
import { MessageUtil } from "../../utils/message";
import Joi, { number } from "joi";
import { RESPONSES } from "../../constant/response";
import transactionModel from "../../models/adminTransaction.model";
import UserVestingModel from "../../models/user.Vesting.model";
import userTransactionModel from "../../models/userTransaction.model";
import singleBeneficiaryModel from "../../models/singleBeneficiary.model";
import vestingUserModel from "../../models/vesting.User.model";
const vestingAbi = require("../../abis/VestingAbi.json");

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

  public async getAllTransactionsAmount(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        vestingAddress: Joi.string()
          .required()
          .error(new Error("Please provide contract address")),
        userAddress: Joi.string()
          .required()
          .error(new Error("Please provide contract address")),
      });
      const { error } = schema.validate(req.body);
      if (error) {
        return MessageUtil.success(res, {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        });
      }
      const vestingAddress = req.body.vestingAddress.toLowerCase();
      const userAddress = req.body.userAddress.toLowerCase();

      // Calculating the amount released from the contract in fixed intervals of time
      //create the contract instance
      const contractInstance = new web3.eth.Contract(
        vestingAbi,
        vestingAddress
      );

      //fetch the cliff value
      const cliff = Number(await contractInstance.methods.cliff().call());

      //fetch the duration of claim time
      const duration = Number(await contractInstance.methods.duration().call());
      //
      const userAllocation = Number(await contractInstance.methods.userAllocation(userAddress).call());

      let totalSupply = Math.round(userAllocation / 10 ** 18);
      console.log(totalSupply, "totalSupply");

      // find the data of vesting contract present in DB 
      const singleBenData = await singleBeneficiaryModel.findOne({ vestingAddress: vestingAddress });
      const multiVesData = await vestingUserModel.findOne({ vestingAddress: vestingAddress });

      if (!singleBenData && !multiVesData) {
        MessageUtil.success(res, {
          status: "USER NOT PRESENT IN DB",
          error: false,
          data: []
        });
        return ;
      }

      // calculate the number of vesting for this contract
      const numberOfVesting = (singleBenData === null) ? (multiVesData?.noOfVesting) : (singleBenData.noOfVesting);
      // this is base amount released from fixed interval of time
      const baseAmount = Math.round(totalSupply / Number(numberOfVesting));
      console.log(baseAmount, "baseAmount for", vestingAddress);


      // Find user transaction details from the database
      let userData = await userTransactionModel.findOne({
        userAddress: userAddress
      });

      // this contains final timeline data of this vesting contract. 
      let addedData: any[] = [];

      if (userData) {
        // filter out the data of this vesting contract 
        const filterData = userData.transactionDetails.filter(e => e.vestingAddress == vestingAddress);

        // find the sum of total amount claimed by the user
        const claimedAmount = filterData.reduce((total, item) => (total + item.amount), 0);

        // this is data of how many times user claimed
        let howManyTimesUserClaimed = Math.round(claimedAmount / baseAmount);

        // add data accordingly (this is past data which user has claimed)
        for (let i = 0; i < howManyTimesUserClaimed; i++) {
          const obj = {
            amount: baseAmount,
            timeStamp: filterData[i]?.createdAt,
            isClaimed: true,
            isClaimable: false,
            isNotClaim: false,
          };
          addedData.push(obj);
        }
        console.log(addedData, "added before");
      }

      // Iterate through the total number of claims allowed
      for (let ind = addedData.length + 1; ind <= Number(numberOfVesting); ind++) {
        // Calculate the timestamp for the current claim
        let timeSec = cliff + duration * ind;
        const data = new Date(timeSec * 1000);
        const timeStamp = data.toISOString();

        // Get the current date in seconds
        const currentDateMilliseconds = new Date().getTime() / 1000;

        // Check if the claim is claimable
        let isClaimable = currentDateMilliseconds > timeSec ? true : false;

        // Check if the claim is not claimed and not claimable
        let isNotClaim = isClaimable === true ? true : false;

        // Create the claim data object
        const tempData = {
          timeStamp: timeStamp,
          amount: baseAmount,
          isClaimed: false,
          isClaimable: isClaimable,
          isNotClaim: isNotClaim,
        };

        // Add the claim data to the array
        addedData.push(tempData);
      }
      console.log("Total added data:", addedData.length);

      return MessageUtil.success(res, {
        status: RESPONSES.SUCCESS,
        error: false,
        data: addedData,
        totalCount: addedData.length,
      });
    } catch (error: any) {
      console.log(error, "eeee");
      return MessageUtil.error(res, {
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }


  public async transactionData(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        page: Joi.number()
          .required()
          .min(0)
          .error(new Error("Invalid page Amount")),
        perPage: Joi.number()
          .required()
          .min(1)
          .error(new Error("Invalid perPage Amount")),
        vestingAddress: Joi.string()
          .required()
          .min(1)
          .error(new Error("Please provide contract address")),
        userAddress: Joi.string()
          .required()
          .min(1)
          .error(new Error("Please provide contract address")),
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
      const vestingAddress = req.body.vestingAddress.toLowerCase();
      const userAddress = req.body.userAddress.toLowerCase();

      const userData: any = await userTransactionModel.findOne({userAddress: userAddress});
      if(!userData){
        MessageUtil.success(res, {
          status: "Data not found",
          error: false,
          data: [],
        });
        return ;
      };
      const filterData = userData.transactionDetails.filter((e : any)=> e.vestingAddress == vestingAddress);

      MessageUtil.success(res, {
        status: RESPONSES.SUCCESS,
        error: false,
        data: filterData,
      });
    } catch (error: any) {
      MessageUtil.error(res, {
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async getUserVestingContract(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        userAddress: Joi.string()
          .required()
          .error(new Error("Please provide contract address")),
      });
      const { error } = schema.validate(req.body);
      if (error) {
        throw {
          status: RESPONSES.BADREQUEST,
          error: true,
          message: error.message,
        };
      }

      const userAddress = req.body.userAddress.toLowerCase();
      
      // find the vesting contract in single beneficiary
      const isSingleBen = await singleBeneficiaryModel.find({
        userAddress: userAddress
      });

      // find the vesting in multivesting collection
      const isMulti = await UserVestingModel.findOne(
        { userAddress: userAddress }
      );

      if(!isSingleBen && !isMulti){
        return MessageUtil.error(res, {
          status: RESPONSES.INTERNALSERVER,
          error: false,
          data: []
        });
      }

      const vestingAddressSingle = isSingleBen?.map((e) => e.vestingAddress);
      console.log(vestingAddressSingle, "vesAdd");

      // Make sure vestingAddressFinal is initialized as an array
      const vestingAddressFinal = isMulti?.vestingAddress || [];

      // Push each vesting address from vestingAddressSingle into vestingAddressFinal
      if (vestingAddressSingle) {
        for (const add of vestingAddressSingle) {
          vestingAddressFinal.push((add as any)); // Pushing each vesting address individually
        }
      }

      MessageUtil.success(res, {
        status: RESPONSES.SUCCESS,
        error: false,
        data: vestingAddressFinal
      });
    } catch (error: any) {
      MessageUtil.error(res, {
        status: RESPONSES.INTERNALSERVER,
        error: true,
      });
    }
  }

  public async adminTransactions(req: Request, res: Response) {
    try {
      const page = req.body.page;
      const perPage = req.body.perPage;

      const totalDocument = await transactionModel.countDocuments({});

      const transactionData = await transactionModel.find({}).sort({ updatedAt: -1 })
        .limit(perPage)
        .skip(perPage * page - perPage);

      MessageUtil.success(res, {
        status: RESPONSES.SUCCESS,
        error: false,
        data: transactionData,
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
