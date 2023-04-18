//grab our development chains,so that we only run our unit tests on dev chain
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

const { getNamedAccounts, deployments, ethers } = require("hardhat")

const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Test", function () {
          let deployer, raffle, vrfCoordinatorV2Mock, raffleEntranceFee, interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"]) //to deploy everything
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", function () {
              it("Initializes the raffle correctly", async function () {
                  // Ideally we make our tests have just 1 assert per "it"
                  const raffleState = await raffle.getRaffleState()
                  // const interval = await raffle.getInterval() // micemo iz ovoga jer ga stavljamo  u beforeEach kao global
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("enterRaffle", function () {
              it("reverts when you don't pay enough", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWith(
                      "Raffle__NotEnoughETHEnterce"
                  )
              })
              it("records players when they enter", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  // We make sure that deployer actually is in our contract
                  const playerFromContract = await raffle.getPlayer(0)
                  assert.equal(playerFromContract, deployer)
              })
              it("emits event on enter", async function () {
                  //to.emit we get from chai matchers
                  //to.emit(contract, "name of event in that contract")
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })
              it("doesnt allow enterce when raffle is calculating", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  //time traveling -> taken from hardhat-network references
                  //increase a time for interval to make sure that upkeepNeeded is true

                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  //[] empty because we just want to mine one extra block
                  await network.provider.send("evm_mine", [])
                  // We pretend to be a Chainlink Keeper -- we want to be in CALCULATING state
                  await raffle.performUpkeep([])
                  //after this(performUpkeep) we are in CALCULATING state
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                      "Raffle__NotOpen"
                  )
              })
          })
          describe("checkUpkeep", function () {
              it("returns false if people havent't sent any ETH", async function () {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  //checkUpkeep is a public function
                  //so this will triger transaction
                  //want to simulate sending this transaction ande seeing what upkeepneeded would return--zato stavljamo callStatic
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle isn't open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep([])
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]) // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]) // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert(upkeepNeeded)
              })
          })
          describe("performUpkeep", function () {
              it("it can only run if checkupkeep is true", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.performUpkeep([])
                  assert(tx) //If tx doesnt work or some error is out or something,this will fail
              })
              it("reverts when checkupkeep is false", async function () {
                  await expect(raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded" //on zapravo vraca sve sta je u funkciji,al je dovoljno pametan da vrati sad samo error koji smo naveli
                  )
              })
              it("updates the raffle state, emits and event, and calls the vrf coordinator", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  //from receipt we get requestID

                  //first event instead of the zero with event because before
                  //this event gets emitted, function /*requestId* = i_vrfCo..requestRandomWords()/ is going to emit an event
                  const raffleState = await raffle.getRaffleState() // updates state
                  const requestId = txReceipt.events[1].args.requestId
                  assert(requestId.toNumber() > 0)
                  assert(raffleState == 1) // 0 = open, 1 = calculating
              })
          })
          describe("fulfillRandomWords", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
              })
              //want to check that fulfillRandomWords can only be called so long as ther is a request
              it("can only be called after performUpkeep", async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) //requestId, consumer
                  ).to.be.revertedWith("nonexistent request") // reverts if not fulfilled
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address) //requestId, consumer
                  ).to.be.revertedWith("nonexistent request") // reverts if not fulfilled
              })
              it("picks a winner, reset the lottery and send money", async function () {
                  //additiona people who enterce in lottery
                  const additionalEntrances = 3
                  const startingAccountIndex = 2 //deployer = 0
                  const accounts = await ethers.getSigners()
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrances;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(accounts[i])
                      //we are connected 3 additional account to raffle
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
                  }

                  const startingTimeStamp = await raffle.getLatestTimeStamp()

                  //performUpkeep (mock being Chainlink Keepers)
                  //fulfillRandomWords (mock being the Chainlink VRF)
                  //We will have to wait for th fulfillRandomWords to be called

                  //All inside Promise is setting up a listener for this winner picked event
                  await new Promise(async (resolve, reject) => {
                      //anonymus function
                      raffle.once("WinnerPicked", async () => {
                          // once picks happend(and event emitted) do some stuff
                          //we are going to add all of our certs because
                          //we want to wait winner to get picked
                          //inside Promise because outside will never ger resolved(because the listener will never fire into event)
                          //uvik ce cekat da se izaber pobjednik i nikad nece bit rijesen
                          console.log("Found the event!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              console.log(recentWinner)
                              console.log(accounts[0].address)
                              console.log(accounts[1].address)
                              console.log(accounts[2].address)
                              console.log(accounts[3].address)

                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()
                              //Checking that is restart
                              const numPlayers = await raffle.getNumberOfPlayers()

                              const winnerBalance = await accounts[1].getBalance()
                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0") //0 means OPEN

                              //we are going to be sure that winner is paid for what he need
                              assert.equal(
                                  winnerBalance.toString(),
                                  startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                                      .add(
                                          raffleEntranceFee
                                              .mul(additionalEntrances)
                                              .add(raffleEntranceFee)
                                      )
                                      .toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve() // if try passes, resolves the promise
                              //winner balance is equal as a his starting balance + Enterce fee of each player + enterce fee which winner paid // all money in contract
                          } catch (e) {
                              reject(e)
                          }
                      })

                      //Setting up the listener ...ovo iznad je listener
                      //below,we will fire the event,and the listener will pick it up,and resolve
                      const tx = await raffle.performUpkeep([])
                      const txReceipt = await tx.wait(1)
                      const startingBalance = await accounts[1].getBalance() //balance of winner ..sad je to bija akaunt 1
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      ) //requestId, consumer
                      //fulfillRandomWords should be emit a winner picked event
                      //After this ..raffle.once("WinnerPicked", async () will be fired
                      //Samo kad je fulfillRandomWords pozvana i emitira ovaj once idemo u try dio koda
                      //Za lokalno testiranje udaramo mock pa cemo ovaj dio morat zakomentirat za staging testiranje koje ce bit na testnetu
                  })
              })
          })
      })
