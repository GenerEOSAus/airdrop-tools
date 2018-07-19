Eos = require('eosjs');
fs = require("fs");
Papa = require("papaparse");
filename = "snapshot-" + Date.now() + ".csv";
names = "names-" + Date.now() + ".csv";


process.on('unhandledRejection', error => {
  // Nodejs generic handler
});


config = {
  chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906', // 32 byte (64 char) hex string
  httpEndpoint: 'localhost:8080', //probably localhost
  expireInSeconds: 60,
  broadcast: true,
  debug: false, // API and transactions
  sign: true
}

eosClient = Eos(config);


async function GetAccountsSegment(key) {
  var voters = {
    json: true,
    scope: "eosio",
    code: "eosio",
    table: "voters",
    limit: 1001,
    table_key: "owner",
    lower_bound: key,
  }

  return await eosClient.getTableRows(voters);
}

async function GetAllAccountNames() {
  let accounts = [];
  let key = "";
  let data = {"more":true};

  while(data.more) {
    process.stdout.write("Have downloaded " + accounts.length + " accounts\r");
    data = await GetAccountsSegment(key);
    key = data.rows.pop().owner;
    data.rows.map(async function(v) {
      let formatted = {
        "name": v.owner,
      };
      accounts.push(formatted);
    });
  }

  console.log("Have downloaded " + accounts.length + " accounts\r");
  console.log("Making unique");

  try {
    let unique = [...new Set(accounts)];
    console.log("Saving names");
    var csv = Papa.unparse(unique,{header:false});
    fs.appendFile(__dirname + '/' + names, '\n'+csv, (err) => {
        if (err) throw err;
    });
    console.log("Have saved " + unique.length + " accounts\r");
  } catch(e) {
    console.log(e);
  }
}

async function run() {
  await GetAllAccountNames()
}

run();
