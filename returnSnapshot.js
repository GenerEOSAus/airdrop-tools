Eos = require('eosjs');
fs = require("fs");
Papa = require("papaparse");
filename = "payment-" + Date.now() + ".csv";


process.on('unhandledRejection', error => {
  // Nodejs generic handler
});


airdropConfig = {
  contract: 'democoindrop',
  privKey: '',
  symbol: 'DEMO',
  precision: 4,
  minimum: '1.0000 DEMO', //minimum award
  threshold: 1, //minimum awarded to anyone below this threshold
  memo: "Have a DEMO coin",
}

eosConfig = {
  chainId: '038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca', // 32 byte (64 char) hex string
  keyProvider: [airdropConfig.privKey], // WIF string or array of keys..
  httpEndpoint: 'http://jungle.cryptolions.io:38888', //probably localhost
  expireInSeconds: 60,
  broadcast: true, //set to false for testing
  verbose: false, // API and transactions
  debug: false,
  sign: true,
  //mockTransactions: () => 'fail', //use this to test success and fail
}

eosClient = Eos(eosConfig);

async function Payment(tr,name,quantity) {
  return tr.recover(
    name.toString().trim(),                               //the person losing the airdrop
    `${airdropConfig.precision},${airdropConfig.symbol}`, //the symbol
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
  },{broadcast: eosConfig.broadcast});
}

async function PayAllAccounts() {
  //read the snapshot.csv file
  fs.readFile(__dirname + '/' + 'snapshot.csv', 'utf8', async function (err,csv) {
    if (err) {
      return console.log(err);
    }

    var data = Papa.parse(csv).data;
    let total = data.length;
    let start = Date.now();
    console.log(start);

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
    let end = Date.now();
    console.log(end);
    console.log("Have processed " + proc + " of " + total);
    console.log("Done");
  });
}

async function run() {
  await PayAllAccounts();
}

// Let's do it!!!
run();
