// @ts-ignore
import web3Service from "./eventService";
import { VestingAbi, FactoryAbi, OldVestingAbi } from "../../abis/index";
import { adminTransactionsModel, blockinfoModel, UserVestingModel, vestingUserModel, singleBeneficiaryModel, userTransactionModel } from "../../models/index";
import Web3 from 'web3';
import dotenv from "dotenv";
dotenv.config();

class stakeEvents {
    public removeNFromBigInt = async (bigIntValue: any) => {
        if (typeof bigIntValue !== 'bigint') {
            throw new Error('Input must be a BigInt');
        }

        const stringValue: any = bigIntValue.toString();
        const stringWithoutN = stringValue.replace('n', '');

        return stringWithoutN;
    }

    public createDate = async (blockNumber: any) => {

        let rpc = process.env.POLYGONRPC;
        const web3Instance: any = new Web3(rpc as string);
        // convert blockNumber from BigInt to integer
        const blockNumberInt = await this.removeNFromBigInt(blockNumber);

        // get block information along with timestamp
        const getBlockTime = await web3Instance.eth.getBlock(blockNumberInt);
        // console.log(getBlockTime,"getBlockTime.............")

        // extract timeStamp from blockInfo and convert it into INT
        const timeStamp = await this.removeNFromBigInt(getBlockTime.timestamp);

        //convert it into date
        const date = new Date(timeStamp * 1000);
        console.log("..........", date.toISOString());

        return date;
    }

    public getFactoryEvents = async (address: any, chain: any) => {
        try {
            const contractName = "VestingFactory";
            const web3_service = new web3Service();
            const eventName = "VestingDeployed";
            const result: any = await web3_service.getWeb3Events(address, FactoryAbi, eventName, chain, contractName);

            if (result) {
                // first store the transaction of vesting deploy event then store DEPOSIT transaction
                const VestingDeployed: any = result.filter((data: any) => {
                    return data.event == "VestingDeployed";
                });
                console.log("VestingDeployed----------", VestingDeployed);

                for (let val of VestingDeployed) {
                    const date = await this.createDate(val.blockNumber);

                    const percentageArray = val.returnValues._percentages
                        .filter((e: any) => e)
                        .map((e: any) => Number(e) / 100);

                    const beneficiariesAddress = val.returnValues._beneficiaries
                        .filter((e: any) => e) // Filter out undefined, null, and empty strings
                        .map((e: any) => e.toLowerCase());

                    let formattedData = beneficiariesAddress.map((e: any, index: any) => {
                        return {
                            address: e.toLowerCase(),
                            percentage: percentageArray[index]
                        };
                    });

                    const pazaVes = (Number(val.returnValues._totalAllocation) / 10 ** 18).toFixed(2);

                    //single beneficiaries
                    if (beneficiariesAddress.length === 1) {

                        const tv = await singleBeneficiaryModel.create({
                            userAddress: beneficiariesAddress[0].toLowerCase(),
                            transactionHash: val.transactionHash,
                            vestingAddress: val.returnValues._vesting.toLowerCase(),
                            event: val.event,
                            chain: process.env.CHAIN,
                            pazaVested: pazaVes,
                            noOfVesting: Number(val.returnValues._noOfVesting),
                            createdAt: date,
                            updatedAt: date
                        });
                        console.log(tv, "tvtv")

                    } else {  //multiple beneficiaries
                        // create the transaction record in DB    USER => VESTING mapping
                        for (const beneficiary of beneficiariesAddress) {
                            const userVes = await UserVestingModel.findOneAndUpdate(
                                {
                                    userAddress: beneficiary,
                                },
                                {
                                    $push: {
                                        transactionHash: val.transactionHash,
                                        vestingAddress: val.returnValues._vesting.toLowerCase(),
                                    },
                                    $set: {
                                        userAddress: beneficiary.toLowerCase(),
                                        event: val.event,
                                        chain: chain
                                    }
                                }, { upsert: true, new: true }
                            );

                            console.log(userVes, "UV....................");
                        }

                        // create transaction record in VESTING => USER
                        const vu = await vestingUserModel.create(
                            {
                                vestingAddress: val.returnValues._vesting.toLowerCase(),
                                transactionHash: val.transactionHash,
                                beneficiaries: formattedData,
                                event: val.event,
                                chain: chain,
                                pazaVested: pazaVes,
                                noOfVesting: Number(val.returnValues._noOfVesting),
                                createdAt: date,
                                updatedAt: date
                            }
                        );
                        console.log(vu, "VU\n\n");
                    }

                    const create = await adminTransactionsModel.create(
                        {
                            VestingAddress: val.returnValues._vesting.toLowerCase(),
                            transactionHash: val.transactionHash,
                            totalAllocation: pazaVes,
                            event: val.event,
                            beneficiaries: beneficiariesAddress,
                            createdAt: date,
                            updatedAt: date
                        }
                    );
                    create.save();
                    console.log(create, "admin insertion")
                }


                // store DEPOSIT transaction
                const vestingDeposite: any = result.filter((data: any) => {
                    return data.event == "Deposit";
                });
                console.log("vesting Deposite.....", vestingDeposite);
                for (const val of vestingDeposite) {
                    const vestingAddress = (val.returnValues._to).toLowerCase();

                    const adminTransaction = await adminTransactionsModel.findOne({ VestingAddress: vestingAddress });
                    if (!adminTransaction) return;

                    const update = await adminTransactionsModel.findOneAndUpdate(
                        { VestingAddress: vestingAddress },
                        {
                            deposit: true
                        },
                        { new: true } //return the updated document
                    );
                    console.log("deposite updation on", vestingAddress, update);
                }
            }

        } catch (error) {
            console.log(error)
        }
    }

    public vestingEvents = async (address: any, chain: any) => {
        try {
            const web3Instance = new Web3(process.env.POLYGONRPC as string);
            let startBlock: number;
            let endBlock: number;
            let currentBlock: number;

            // this data from single beneficiary
            const token1 = await singleBeneficiaryModel.find({ chain: process.env.CHAIN });
            //this is from multi beneficiary
            const token2 = await vestingUserModel.find({ chain: process.env.CHAIN });

            // if both collection is empty the simplt return 
            if (!token1 && !token2) return;

            // Extract vestingAddress from token1
            const token1Addresses = token1.map(obj => obj?.vestingAddress);

            // Extract vestingAddress from token2
            const token2Addresses = token2.map(obj => obj?.vestingAddress);

            // Concatenate the arrays
            const tokens = token1Addresses.concat(token2Addresses);

            const blocks = await blockinfoModel.findOne({
                contractName: "MultipleVesting"
            });

            if (blocks) {
                startBlock = Number(blocks.blockNumber);
            } else {
                startBlock = Number(process.env.startBlock);
            }
            currentBlock = Number(await web3Instance?.eth.getBlockNumber());
            if (
                Number(startBlock) + Number(process.env.eventBatchSize) >
                Number(currentBlock)
            ) {
                endBlock = Number(currentBlock);
            } else {
                endBlock = Number(startBlock) + Number(process.env.eventBatchSize);
            }
            console.log(startBlock, endBlock, "getAlleventsssss");

            if (tokens.length > 0) {
                if (currentBlock > startBlock) {
                    const addressArray = tokens.map(
                        (value: any) => value
                    );
                    var hashArray: any = [];
                    for (var i = 0; i < VestingAbi.length; i++) {
                        var item: any = VestingAbi[i];
                        if (item.type != "event") continue;
                        var signature: any =
                            item.name +
                            "(" +
                            item.inputs
                                // @ts-ignore
                                .map(function (input) {
                                    return input.type;
                                })
                                .join(",") +
                            ")";
                        var hash = web3Instance.utils.sha3(signature);
                        var data = { hash, item };
                        hashArray.push(data);
                    }
                    const a = await web3Instance.eth.getPastLogs({
                        fromBlock: startBlock,
                        toBlock: endBlock,
                        //   address: ["0x164fbd7BBc365922cB1489b5528DB81970E0f152"],
                        address: addressArray,
                    });
                    console.log(addressArray, "addressArray")
                    if (a.length) {
                        for (let i = 0; i < a.length; i++) {
                            const txReceipt = await web3Instance.eth.getTransactionReceipt(
                                (a[i] as any).transactionHash
                            );

                            if (Number(txReceipt.status) && txReceipt.logs.length > 0) {
                                for (const event of txReceipt.logs as any) {
                                    var eventValue = null;
                                    for (var j = 0; j < hashArray.length; j++) {
                                        if (hashArray[j].hash == event.topics[0]) {
                                            eventValue = hashArray[j].item;
                                            break;
                                        }
                                    }

                                    if (eventValue != null) {
                                        let data: any = {};
                                        var inputValue = eventValue.inputs;
                                        for (let i = 0; i < eventValue.inputs.length; i++) {
                                            const dd = event.data.replace("0x", "");
                                            if (dd.length) {
                                                const eee = web3Instance.eth.abi.decodeParameters(
                                                    inputValue,
                                                    event.data
                                                );

                                                data.amount = eee.amount;
                                                data.user = eee._user;
                                            }
                                        }
                                        event.event = eventValue.name;
                                        event.returnValues = data;
                                        console.log(event, "event.......................");
                                        if (event.event == "ERC20TokenClaimed") {
                                            console.log("=============EVENT===============");

                                            const date = await this.createDate(event.blockNumber);
                                            const data = {
                                                vestingAddress: event.address.toLowerCase(),
                                                transactionHash: event.transactionHash,
                                                amount: (Number(event.returnValues.amount) / 10 ** 18).toFixed(2),
                                                createdAt: date
                                            };

                                            // const userTrx = await userTransactionModel.findOne({ userAddress: event.returnValues.user.toLowerCase() });
                                            // if (userTrx === null) {
                                            //     await userTransactionModel.create(
                                            //         {
                                            //             userAddress: event.returnValues.user.toLowerCase(),
                                            //             transactionDetails: data,
                                            //             event: event.event,
                                            //             totalClaimed: (Number(event.returnValues.amount) / 10 ** 18).toFixed(2),
                                            //             createdAt: date,
                                            //             updatedAt: date,
                                            //         },
                                            //     )
                                            // } else {
                                            //     let flag = false;
                                            //     for (const val of userTrx?.transactionDetails) {
                                            //         if (val.transactionHash == event.transactionHash) {
                                            //             flag = true;
                                            //             break;
                                            //         }
                                            //     }
                                            //     if (!flag) {
                                                    const insert = await userTransactionModel.findOneAndUpdate(
                                                        {
                                                            userAddress: event.returnValues.user.toLowerCase()
                                                        },
                                                        {
                                                            $push: { transactionDetails: data }, // Correctly push the transaction data object into the transactionDetails array
                                                            $set: {
                                                                event: event.event,
                                                                createdAt: date,
                                                                updatedAt: date
                                                            },
                                                            $inc: { totalClaimed: (Number(event.returnValues.amount) / 10 ** 18).toFixed(2) }
                                                        },
                                                        { upsert: true, new: true }
                                                    );
                                                    console.log(insert, "USER TRANSACTIONS")
                                        //         }
                                        //     }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            const updateBlock = await blockinfoModel.findOneAndUpdate({
                contractName: "MultipleVesting"
            }, {
                blockNumber: endBlock
            }, { upsert: true });

            console.log("======================", updateBlock);
        } catch (error) {
            console.log("error!!!", error);
        }
    }

    public getOldContractEvent = async (address: any, chain: any) => {
        try {
            const web3Instance = new Web3(process.env.POLYGONRPC as string);
            let startBlock: number;
            let endBlock: number;
            let currentBlock: number;

            const tokens = ["0x5aa24E4626694034c6Bb43E1E4baACF51A0F2EBc"];


            const blocks = await blockinfoModel.findOne({
                contractName: "OwnedUpgradeabilityProxy"
            });
            console.log(blocks, "bbbbb");

            if (blocks) {
                startBlock = Number(blocks.blockNumber);
            } else {
                startBlock = Number(process.env.startBlock);
            }
            currentBlock = Number(await web3Instance?.eth.getBlockNumber());
            if (
                Number(startBlock) + Number(process.env.eventBatchSize) >
                Number(currentBlock)
            ) {
                endBlock = Number(currentBlock);
            } else {
                endBlock = Number(startBlock) + Number(process.env.eventBatchSize);
            }
            console.log(startBlock, endBlock, "getAlleventsssss");
            // console.log(tokens, "tokens..");

            // console.log(tokens, "tokensssssssssssssssssss");
            if (tokens.length > 0) {
                if (currentBlock > startBlock) {
                    const addressArray = tokens.map(
                        (value: any) => value
                    );
                    var hashArray = [];
                    for (var i = 0; i < OldVestingAbi.length; i++) {
                        var item = OldVestingAbi[i];
                        if (item.type != "event" && item.name !== "ERC20Released") continue;
                        var signature =
                            item.name +
                            "(" +
                            item.inputs
                                .map(function (input) {
                                    return input.type;
                                })
                                .join(",") +
                            ")";
                        var hash = web3Instance.utils.sha3(signature);
                        var data = { hash, item };
                        hashArray.push(data);
                    }
                    const a = await web3Instance.eth.getPastLogs({
                        fromBlock: startBlock,
                        toBlock: endBlock,
                        //   address: ["0x164fbd7BBc365922cB1489b5528DB81970E0f152"],
                        address: addressArray,
                    });
                    console.log(addressArray, "addressArray")
                    if (a.length) {
                        for (let i = 0; i < a.length; i++) {
                            const txReceipt = await web3Instance.eth.getTransactionReceipt(
                                (a[i] as any).transactionHash
                            );
                            // console.log(txReceipt, "txReceipt...")
                            if (Number(txReceipt.status) && txReceipt.logs.length > 0) {
                                for (const event of txReceipt.logs as any) {
                                    var eventValue = null;
                                    for (var j = 0; j < hashArray.length; j++) {
                                        if (hashArray[j].hash == event.topics[0]) {
                                            eventValue = hashArray[j].item;
                                            break;
                                        }
                                    }
                                    // console.log(eventValue, "eventValue..")
                                    console.log(event.data, "event.data");

                                    if (eventValue != null) {
                                        let data: any = {};
                                        var inputValue = eventValue.inputs;
                                        for (let i = 0; i < eventValue.inputs.length; i++) {
                                            const dd = event.data.replace("0x", "");
                                            if (dd.length) {
                                                // console.log(dd,"dddd");
                                                // console.log(event.data,"dataaaaa")
                                                const eee = web3Instance.eth.abi.decodeParameters(
                                                    [
                                                        // {
                                                        //     "indexed": true,
                                                        //     "internalType": "address",
                                                        //     "name": "token",
                                                        //     "type": "address"
                                                        // },
                                                        {
                                                            "indexed": true,
                                                            "internalType": "uint256",
                                                            "name": "amount",
                                                            "type": "uint256"
                                                        }
                                                    ],
                                                    event.data
                                                );
                                                data.amount = eee.amount;
                                                data.user = eee._user;
                                            }
                                        }
                                        event.event = eventValue.name;
                                        event.returnValues = data;
                                        // console.log(event, "event.......................");
                                        if (event.event == "ERC20Released") {
                                            console.log("=============EVENT===============");

                                            const beneficiary: any = web3Instance.eth.abi.decodeParameter("address", "0x0000000000000000000000005aa24e4626694034c6bb43e1e4baacf51a0f2ebc");

                                            const date = await this.createDate(event.blockNumber);
                                            const data = {
                                                vestingAddress: event.address.toLowerCase(),
                                                transactionHash: event.transactionHash,
                                                amount: (Number(event.returnValues.amount) / 10 ** 18).toFixed(2),
                                                createdAt: date
                                            };

                                            const insert = await userTransactionModel.findOneAndUpdate(
                                                {
                                                    userAddress: beneficiary.toLowerCase()
                                                },
                                                {
                                                    $push: { transactionDetails: data },
                                                    $set: {
                                                        event: event.event,
                                                        createdAt: date,
                                                        updatedAt: date
                                                    },
                                                    $inc: { totalClaimed: (Number(event.returnValues.amount) / 10 ** 18).toFixed(2) }
                                                },
                                                { upsert: true, new: true }
                                            );
                                            console.log(insert, "USER TRANSACTIONS")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            const updateBlock = await blockinfoModel.findOneAndUpdate({
                contractName: "OwnedUpgradeabilityProxy"
            }, {
                blockNumber: endBlock
            }, { upsert: true });

            console.log("======================", updateBlock);
        } catch (error) {
            console.log("error!!!", error);
        }

    }
}
export default new stakeEvents();