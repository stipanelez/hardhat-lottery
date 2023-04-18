This is a section of the Javascript Blockchain/Smart Contract FreeCodeCamp Course.

I went through the entire course and wrote down some more detailed comments on English and Croatian language.

I consider this way to be the best for learning.

I hope that my comments will help you when reading the code

⌨️ (13:41:02) Lesson 9: Hardhat Smart Contract Lottery

Full Repo

Hardhat Smart Contract Lottery

Getting Started

Requirements
Quickstart
Usage

Testing
Test Coverage
Deployment to a testnet or mainnet

Estimate gas
Estimate gas cost in USD
Verify on etherscan
Linting

Formatting

Thank you!

This project is apart of the Hardhat FreeCodeCamp video.

Getting Started
Requirements
git
You'll know you did it right if you can run git --version and you see a response like git version x.x.x
Nodejs
You'll know you've installed nodejs right if you can run:
node --version and get an ouput like: vx.x.x
Yarn instead of npm
You'll know you've installed yarn right if you can run:
yarn --version and get an output like: x.x.x
You might need to install it with npm or corepack
Quickstart
git clone https://github.com/stipanelez/Hardhat-Smart-Contract-Lottery
cd Hardhat-Smart-Contract-Lottery
yarn
Usage
Deploy:

yarn hardhat deploy
Testing
yarn hardhat test
Test Coverage
yarn hardhat coverage
Deployment to a testnet or mainnet
Setup environment variables
You'll want to set your GOERLI_RPC_URL and PRIVATE_KEY as environment variables. You can add them to a .env file

PRIVATE_KEY: The private key of your account (like from metamask). NOTE: FOR DEVELOPMENT, PLEASE USE A KEY THAT DOESN'T HAVE ANY REAL FUNDS ASSOCIATED WITH IT.
You can learn how to export it here.
GOERLI_RPC_URL: This is url of the goerli testnet node you're working with. You can get setup with one for free from Alchemy
Get testnet ETH
Head over to faucets.chain.link and get some tesnet ETH. You should see the ETH show up in your metamask.

Deploy
yarn hardhat deploy --network goerli
Estimate gas
You can estimate how much gas things cost by running:

yarn hardhat test
And you'll see and output file called gas-report.txt

Estimate gas cost in USD
To get a USD estimation of gas cost, you'll need a COINMARKETCAP_API_KEY environment variable. You can get one for free from CoinMarketCap.

Then, uncomment the line coinmarketcap: COINMARKETCAP_API_KEY, in hardhat.config.js to get the USD estimation. Just note, everytime you run your tests it will use an API call, so it might make sense to have using coinmarketcap disabled until you need it. You can disable it by just commenting the line back out.

Verify on etherscan
If you deploy to a testnet or mainnet, you can verify it if you get an API Key from Etherscan and set it as an environemnt variable named ETHERSCAN_API_KEY. You can pop it into your .env file as seen in the .env.example.

In it's current state, if you have your api key set, it will auto verify goerli contracts!

However, you can manual verify with:

yarn hardhat verify --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS

Thank you!
