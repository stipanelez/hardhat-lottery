const { developmentChains } = require("../helper-hardhat-config")
const { network, ethers } = require("hardhat")
//https://docs.chain.link/vrf/v2/subscription/supported-networks

//base fee we can check in chainlink docs,for each request need 0.25link
const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 is the premium

//calculated value based on the gas price of the chain
//They price of request change based on the price of gas
const GAS_PRICE_LINK = 1e9 //Link per gas

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const args = [BASE_FEE, GAS_PRICE_LINK] //args from constructor of VRFCoordinatorV2Mock.sol

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks..")
        //deploy a mock vrfcoordinator...
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        log("Mocks Deployed!")
        log("----------------------------------------------------------")

        log("----------------------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
