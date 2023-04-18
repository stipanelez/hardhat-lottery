const { run } = require("hardhat")

async function verify(contractAddress, args) {
    //for verification contract
    console.log("Verifying contract...")

    // we are adding try/catch to avoid break
    //it can be error because contract already verify
    try {
        //inside run we run task and list of actual parameters
        await run("verify:verify", {
            // this will be a object that contains parameters
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already Verified!")
        } else {
            console.log(e)
        }
    }
}

module.exports = { verify }
