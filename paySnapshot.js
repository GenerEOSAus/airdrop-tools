Eos = require('eosjs');
fs = require("fs");
Papa = require("papaparse");
filename = "payment-" + Date.now() + ".csv";


process.on('unhandledRejection', error => {
  // Nodejs generic handler
});


airdropConfig = {
  contract: 'poormantoken',
  privKey: 'TOKEN CONTRACT PRIVATE KEY',
  symbol: 'POOR',
  precision: 4,
  minimum: '1.0000 POOR', //minimum award
  threshold: 1, //minimum awarded to anyone below this threshold
  memo: 'Thanks for being POOR with us!',
}

eosConfig = {
  chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906', // 32 byte (64 char) hex string
  keyProvider: [airdropConfig.privKey], // WIF string or array of keys..
  httpEndpoint: 'http://localhost:8080', //probably localhost
  expireInSeconds: 60,
  broadcast: true, //set to false for testing
  verbose: false, // API and transactions
  debug: false,
  sign: true,
  //mockTransactions: () => 'pass', //use this to test success and fail
}

eosClient = Eos(eosConfig);

async function Payment(tr,name,quantity) {
  //Calculate the actual payment amount based on the provided CSV
  let actual = `${Number(quantity).toFixed(airdropConfig.precision).toString()} ${airdropConfig.symbol}`;
  //Determine if we award the minimum
  let payment = Number(quantity) < airdropConfig.threshold ? airdropConfig.minimum : actual;
  return tr.issue(
    name.toString().trim(), //the person receiving the airdrop
    payment,                //the payment quantity
    airdropConfig.memo,     //the airdrop memo
    {authorization: airdropConfig.contract}
  );
}

async function IssuePayment(names) {
  //we create a transaction with multiple issue actions
  return eosClient.transaction(airdropConfig.contract,tr => {
    for(let i = 0; i < names.length; i++) {
      if(names[i][0] !== "") {
        Payment(tr,names[i][0],names[i][1]);
      }
    }
  });
}

async function PayAllAccounts() {
  //read the snapshot.csv file
  fs.readFile(__dirname + '/' + 'snapshot.csv', 'utf8', async function (err,csv) {
    if (err) {
      return console.log(err);
    }

    var data = Papa.parse(csv).data;
    let total = data.length;

    console.log("Found " + total + " accounts.");
    let proc = 0;

    fs.appendFile(__dirname + '/' + filename, 'name,payment,processed', (err) => {
        if (err) throw err;
    });

    //we get a chunk of 30 payments at a time
    while(data.length > 0) {
      let names = data.splice(0,30);
      let success = false;
      let done = false;
      let attempts = 0;
      proc += names.length;

      while(!done) {
        if(attempts < 3) {
          try {
            await IssuePayment(names);
            success = true;
            done = true;
          } catch(e) {
            console.log("Failed, retrying segement " + proc + "...");
            attempts++;
          }
        } else {
          done = true;
        }
      }

      names.map(name => {
        let formatted = {
          name: name[0],
          payment: name[1],
          processed: success
        };
        var write = Papa.unparse([formatted],{header:false});
        fs.appendFile(__dirname + '/' + filename, '\n'+write, (err) => {
            if (err) throw err;
        });
      })

      process.stdout.write("Have processed " + proc + " of " + total + "\r");
    }

    console.log("Have processed " + proc + " of " + total);
    console.log("Done");
  });
}

async function run() {
  await PayAllAccounts();
}

// Let's do it!!!
run();
