//Raffle

//Enter the lottery (paying some amount)
//Pick a random winner (verifiably random)
//Winner to be selected every X minutes -> completely automated

//Chainlink Oracle -> Randomness, Automated Execution(Trigger for selecting winner -> Chainlink keeper)

//SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Raffle__NotEnoughETHEnterce();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/** @title A sample Raffle Contract
 *  @author Stipan Elez
 *  @notice This contract is for creating an untamperable decentralized smart contract
 *  @dev This implements Chainlink VRF v2 and Chainlink Keepers
 */

//inheritance
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /*Typs */
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    /* State Variables */
    uint256 private immutable i_entranceFee; //i_ jer se radi o immut variable,za ustedit na memoriji/gasu
    address payable[] private s_players; // have to be in storage because we are going to modify
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId; // can be smaller than uint256
    uint32 private i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3; // we need 3 blocks to confirmation
    uint32 private constant NUM_WORDS = 1; // we want 1 random number

    /* Lottery Variables */
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    /*Events */
    //always when we want update something we want to emit event
    //Events allow you to "print" stuff to Log
    //listening for event then do something
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestID);
    event WinnerPicked(address indexed winner);

    //indexed param(topics)-much easier to search and to query
    //non-indexed param-hard to search bcz they get ABI encoded,you have to know ABI

    //nasljeduje ovo VRF pa smo pogledali i u njegov constructor
    //vrfCordinator is address of contract that does random verification

    constructor(
        address vrfCoordinatorV2, // contract address (consumer)
        uint256 entranceFee,
        bytes32 gasLane, //key hash
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            //using msg.value can sent eth to our contract
            revert Raffle__NotEnoughETHEnterce();
            //Cheaper use error code instead string
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));
        //msg.sender is not a payable

        //Events
        //kad god updatamo dynamicki obj(array ili mapping) zelimo emitirat event
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This is the function that the Chainlink keeper nodes call
     * they look for the "upkeepNeeded" to return true
     * The following should be true in the order to return true:
     * 1.Our time interval should have passed
     * 2.The lottery should have at least 1 player and have some ETH
     * 3.Our subscription is funded with LINK
     * 4.The lottery should be "open" state
     *
     * ako je istina da je vrime za novi random number vraca true
     */

    //run off chain by node from Chainlink keeper network
    //check is it time to get a random number to update the recent winner and sent them money
    //with public instead of external even our contract can call this function
    function checkUpkeep(
        //bytes calldata -calldata doesnt work with strings, so instead calldata here we put memory
        bytes memory /*checkData*/
    ) public override returns (bool upkeepNeeded, bytes memory /* performData */) {
        //performData - if we want to checkh some other staff
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        //to get how much time pass(interval)
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        //to check do we have a player
        bool hasPlayers = (s_players.length > 0);
        //to check do we have a balance
        bool hasBalance = address(this).balance > 0;

        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        // if upkeepNeeded is true it is time to request a new random number and its time to end the lottery
    }

    //external je malo jeftinija od public
    //prvo smo ga nazvali requestRandomWinner()
    //verify that things are correct,run on chain and then on chain make a state change is if needed
    function performUpkeep(bytes calldata /* performData */) external override {
        //This function will be called by chainlink keeper and automaticlly run, when upkeepNeeded
        //Request random number,than do something ->2 transaction process
        // 2 transaction da ne bude brutal force numbera

        //(bool upkeepNeeded, )ode je prazno jer nas ne zanima performData
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }

        s_raffleState = RaffleState.CALCULATING;

        //we have to call requestRandomWords to get the coordinator contract
        //define who request
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, //keyHash -maximum gas price you are willing to pay for a request in wei. It functions as an ID of the off-chain VRF job that runs in response to requests
            i_subscriptionId, //The subscription ID that this contract uses for funding requests
            //How many confirmations the Chainlink node should wait before responding. The longer the node waits, the more secure the random value is.
            //It must be greater than the minimumRequestBlockConfirmations limit on the coordinator contract
            REQUEST_CONFIRMATIONS,
            //The limit for how much gas to use for the callback request to contract’s fulfillRandomWords() function
            //How much computation fulfill can do
            i_callbackGasLimit,
            // How many random values(numbers we want) to request
            NUM_WORDS
        );

        emit RequestedRaffleWinner(requestId);
    }

    //Initiate request to the Orcle
    function fulfillRandomWords(
        uint256 /*requestId */, // because its unused
        uint256[] memory randomWords
    ) internal override {
        //override virtual function
        //Let's pick random winner using modulo function
        //Modulo operation a % n yields the remainder after diversion npr.304%10=4
        //pick random winner from array s_players
        uint256 indexOfWinner = randomWords[0] % s_players.length; //randomWords[0] always 1 random num
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN; //Reset raffle stat
        s_players = new address payable[](0); //Reset player array
        s_lastTimeStamp = block.timestamp; //reset timestamp
        //Transfer all money to winner
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        //we can track all winners
        emit WinnerPicked(recentWinner);
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint256) {
        //doesnt read from storage so can be pure,its const and is in the bytecode
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        //doesnt read from storage so can be pure,its const
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
