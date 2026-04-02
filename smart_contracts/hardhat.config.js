require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 1337
    },
    beam: {
      url: "https://build.onbeam.com/rpc/testnet", // Beam testnet RPC placeholder
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 13337 // Placeholder: Beam testnet chain id is actually 13337 normally or 4337
    }
  }
};
