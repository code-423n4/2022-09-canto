import "@nomiclabs/hardhat-ethers";
//import "@nomiclabs/hardhat-waffle";
import {HardhatUserConfig} from 'hardhat/types';
import "hardhat-deploy";
import "ethereum-waffle";
import "hardhat-preprocessor";
import "solidity-coverage";
import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  namedAccounts : {
    deployer: 0,
    user1: 1,
    user2: 2,
    liquidator: 3 
  },
  paths: {
    sources: "./src",
    deploy: "./deploy",
    tests: "./test",
    cache:"./cache_hardhat",
    artifacts: "./artifacts"
  }
};


export default config;