//grab our development chains,so that we only run our unit tests on dev chain
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

const { getNamedAccounts, deployments, ethers } = require("hardhat")

const { assert, expect } = require("chai")

//Check what kind of network run (run only on testnet)
developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Test", function () {
          let deployer, raffle, raffleEntranceFee
          const chainId = network.config.chainId
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()

              //We dont need any fixtures because we are going to run our deploy script and our contracts should already be deployed
          })
          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  //enter the raffle
                  //Chainlink Keepers will do everything
                  const startingTimeStamp = await raffle.getLatestTimeStamp() //we want to check if is moving forward
                  const accounts = await ethers.getSigners()

                  await new Promise(async (resolve, reject) => {
                      //setup listener before we enter the raffle
                      //Just in case the bockchain moves really fast
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          //only once we got Winner we can start asserts
                          resolve()
                          try {
                              //asserts
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()

                              await expect(raffle.getPlayer(0)).to.be.reverted //because there is not even going to be an object at zero
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(raffleState, 0) //RaffleState back to OPEN after we done
                              // we make a sure that money transfer correctly
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                          } catch (error) {
                              console.log(error)
                              reject(e)
                          }
                          resolve()
                      })

                      // Then entering the raffle
                      console.log("Entering Raffle...")
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                      await tx.wait(3)
                      console.log("Time to wait...")
                      const winnerStartingBalance = await accounts[0].getBalance()

                      // and this code wont complete until our listener has finished listening
                  })
              })
          })
      })
