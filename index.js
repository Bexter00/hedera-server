const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3030;
const {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  AccountBalanceQuery,
  Hbar,
  TransferTransaction,
} = require("@hashgraph/sdk");
const { type } = require("express/lib/response");

require("dotenv").config();
app.use(express.json());
app.use(cors());
cors({ origin: "http://localhost:3030" });

const clientAccountId = process.env.MY_ACCOUNT_ID;
const clientPrivateKey = process.env.MY_PRIVATE_KEY;

const client = Client.forTestnet();
client.setOperator(clientAccountId, clientPrivateKey);

async function accountNew() {
  try {
    //Create new keys
    const newAccountPrivateKey = await PrivateKey.generateED25519();
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    console.log("Private key = " + newAccountPrivateKey);
    console.log("Public key = " + newAccountPublicKey);

    //Create a new account with 1,000 tinybar starting balance
    const newAccount = await new AccountCreateTransaction()
      .setKey(newAccountPublicKey)
      .setInitialBalance(Hbar.fromTinybars(1000))
      .execute(client);

    const getReceipt = await newAccount.getReceipt(client);
    const newAccountId = getReceipt.accountId;
    console.log("The new account ID is: " + newAccountId);

    //Verify the account balance
    const accountBalance = await new AccountBalanceQuery()
      .setAccountId(newAccountId)
      .execute(client);
    console.log(
      "The new account balance is: " +
        accountBalance.hbars.toTinybars() +
        " tinybar."
    );

    return (accountInfo = {
      newAccountId: newAccountId.toString(),
      privatekey: newAccountPrivateKey.toString(),
      publicKey: newAccountPublicKey.toString(),
    });
  } catch (err) {
    console.log(err);
    return err;
  }
}

async function transactionNew(req) {
  try {
    let hexTransactionHash = "";
    let { newAccountId, amount } = req.body;
    const sendHbar = await new TransferTransaction()
      .addHbarTransfer(clientAccountId, Hbar.fromTinybars(amount * -1))
      .addHbarTransfer(newAccountId, Hbar.fromTinybars(amount))
      .execute(client);
    console.log(typeof sendHbar.transactionHash);

    //Verify the transaction reached consensus
    const transactionReceipt = await sendHbar.getReceipt(client);
    console.log(
      "The transfer transaction from my account to the new account was: " +
        transactionReceipt.status.toString()
    );

    //Request the cost of the query
    const queryCost = await new AccountBalanceQuery()
      .setAccountId(newAccountId)
      .getCost(client);

    //Check the new account's balance
    const getNewBalance = await new AccountBalanceQuery()
      .setAccountId(newAccountId)
      .execute(client);

    const getClientBalance = await new AccountBalanceQuery()
      .setAccountId(clientAccountId)
      .execute(client);

    //const newTransactionHash = Object.values(sendHbar.transactionHash);
    console.log(sendHbar.transactionHash);

    for (val of Object.values(sendHbar.transactionHash)) {
      hexTransactionHash += val.toString(16);
    }

    return (transactionInfo = {
      transactionHash: hexTransactionHash,
      newAccountBalance: getNewBalance.hbars.toTinybars().toString(),
      clientAccountBalance: getNewBalance.hbars.toTinybars().toString(),
      tranStatus: transactionReceipt.status.toString(),
    });
  } catch (err) {
    console.log(err);
    return err;
  }
}

app.post("/transactionNew", (req, res) => {
  transactionNew(req).then((transactionInfo) => {
    //res.header("Access-Control-Allow-Origin:", "http://localhost:3030");
    res.send(transactionInfo);
  });
});

app.post("/accountNew", (req, res) => {
  accountNew().then((accountInfo) => {
    //res.header("Access-Control-Allow-Origin:", "http://localhost:3030");
    res.send(accountInfo);
  });
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} port open`);
});
