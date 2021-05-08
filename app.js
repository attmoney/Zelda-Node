const cron = require('node-cron');
const dotenv = require("dotenv");
const zeldaConfig = require("./contracts/zelda.json");
const pairConfig = require("./contracts/pair.json");
const WEB3 = require('web3');
const Tx = require('ethereumjs-tx');

dotenv.config();
const chainID = process.env.CHAIN_ID_TN || "<update your chain_id here>";
const walletID = process.env.WALLET_ID_TN || "<update your wallet_id here>";
const walletKey= process.env.WALLET_KEY_TN || "<update your walley_key here>";
const NetworkUrl = process.env.NETWORK_URL_TN || "<update your netowrk_url here>";

//update schedule time
cron.schedule(' */1 * * * *', () => {
  console.log('Initiating Zelda Winner Announcement ...');
  zWins();
});

// winner announcement function
async function zWins() {
  try {
      var winner;
      var randomWinnerIndex;
      console.log("NetworkUrl: ", NetworkUrl);
      const web3 = new WEB3(NetworkUrl);
      var currentBlockNumber = await web3.eth.getBlockNumber();
      console.log("currentBlockNumber: ", currentBlockNumber);

      let zeldaInstance = new web3.eth.Contract(
          zeldaConfig.abi,
          zeldaConfig.address
      );

      const lastAnnoucementBlock = await zeldaInstance.methods.getLastAnnoucementBlock().call();
      const nextCoolDownBlock = await zeldaInstance.methods.getNextCoolDOwn().call();
      console.log("lastAnnoucementBlock: ", lastAnnoucementBlock);
      console.log("nextCoolDownBlock: ", nextCoolDownBlock);

      if (currentBlockNumber > nextCoolDownBlock) {

          let pairInstance = new web3.eth.Contract(
              pairConfig.abi,
              web3.utils.toChecksumAddress(pairConfig.address)
          );

          const events = await pairInstance.getPastEvents('Swap', {
              filter: {},
              fromBlock: lastAnnoucementBlock,
              toBlock: currentBlockNumber
          });
          console.log("Number of tx recieved: ",events.length)

          randomWinnerIndex = getRandomInt(events.length);
          console.log("random Winner Index: ", randomWinnerIndex)

          var obj = JSON.parse(JSON.stringify(events));
          winner = obj[randomWinnerIndex].returnValues.to;
          console.log("The Choosen One: ", winner);

          const myData = zeldaInstance.methods
              .announceWinner(winner)
              .encodeABI();

          var txCount = await web3.eth.getTransactionCount(myAcc);
          const txObject = {
              nonce: web3.utils.toHex(txCount),
              gasLimit: web3.utils.toHex(1000000),
              gasPrice: web3.utils.toHex(1000000000),
              from: walletID,
              to: zeldaConfig.address,
              data: myData,
              chainId: chainID,
          };

          const tx = new Tx(txObject);
          const signerKey = Buffer.from(walletKey, 'hex');
          tx.sign(signerKey);
          const serializedTx = tx.serialize();
          const raw = '0x' + serializedTx.toString('hex');
          const txHash = await web3.eth.sendSignedTransaction(raw)
          console.log('txHash:', txHash.status);
              
          if(txHash.status == true){
              console.log("winner announced");
          }
      } else {
          console.log("waiting for cool down");
      }

  } catch (err) {
      console.log("inside catch", err);
  }
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}