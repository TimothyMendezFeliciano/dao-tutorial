import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from 'dotenv'
dotenv.config()
const QUICKNODE_HTTP_URL = process.env.QUICKNODE_HTTP_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    goerli: {
      url: QUICKNODE_HTTP_URL,
      // @ts-ignore
      accounts: [PRIVATE_KEY]
    }
  }
};

export default config;
