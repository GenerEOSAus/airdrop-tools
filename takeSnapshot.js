Eos = require('eosjs'); // Eos = require('./src')
fs = require("fs");
Papa = require("papaparse");
filename = "snapshot-" + Date.now() + ".csv";
names = "names-" + Date.now() + ".csv";


process.on('unhandledRejection', error => {
  // Nodejs generic handler
});

// if you are running an airgrab, specify your contract
airgrab = 'zkstokensr4u'; //set to false if no airgrab

config = {
  chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906', // 32 byte (64 char) hex string
  httpEndpoint: 'https://mainnet.genereos.io:443', //probably localhost
  expireInSeconds: 60,
  broadcast: true,
  debug: false, // API and transactions
  sign: true
}

eosClient = Eos(config);

async function IsRegistered(token,name) {
  try {
    return await eosClient.getCurrencyBalance(token, name);
  } catch(e) {
    return [];
  }
}

async function GetDelegated(name) {
  try {
    const table =  {
      json: true,
      scope: name,
      code: 'eosio',
      table: 'delband',
      limit: 500
    }
    let total = 0;
    const delegated = await eosClient.getTableRows(table);
    delegated.rows.map((row)=> {
      const net = Number(row.net_weight.split(' ')[0]);
      const cpu = Number(row.cpu_weight.split(' ')[0]);
      total += (net+cpu);
    });
    return total;
  } catch(e) {
    return 0;
  }
}

async function GetClaimed(name) {
  try {
    const table =  {
      json: true,
      scope: name,
      code: airgrab,
      table: "accounts",
      limit: 5
    }
    let claimed = false;
    const data = await eosClient.getTableRows(table);
    console.log(data);
    data.rows.map((row)=> {
      claimed = row.claimed == 1;
    });
    return claimed;
  } catch(e) {
    console.log(e);
    return false;
  }
}

async function GetDetails(name,tries=0) {
  try {
    const account = await eosClient.getAccount(name);
    account.delegated = await GetDelegated(name);
    account.claimed = await GetClaimed(name);
    if(airgrab) {
      const registered = await IsRegistered(airgrab,name);
      account.registered = registered;
    } else {
      account.registered = [];
    }

    const liquid = await IsRegistered('eosio.token',name);
    account.core_liquid_balance = liquid[0];
    return account;
  } catch(e) {
    console.log(name + ": " + tries);
    if(tries < 3) {
      return await GetDetails(name,++tries);
    } else {
      return false;
    }
  }
}

async function GetProxyVotes(proxy) {
  const account = await eosClient.getAccount(proxy);
  if(account.voter_info.proxy) {
    return await GetProxyVotes(account.voter_info.proxy);
  } else {
    return account.voter_info.producers.length
  }
}

async function CreateRow(row) {
  let name = row[0].trim()
  if(name === '') return;
  let details = await GetDetails(name);

  if(details) {
    try {
      let eos = Number(details.core_liquid_balance ? details.core_liquid_balance.split(' ')[0] : 0);
      let stake = details.delegated;
      let proxyVotes = 0;
      if(details.voter_info && details.voter_info.proxy) {
        proxyVotes = await GetProxyVotes(details.voter_info.proxy);
      }
      let formatted = {
        "name": details.account_name,
        "eos": Number(eos.toFixed(4)),
        "stake": Number(stake.toFixed(4)),
        "totalEos": Number((stake+eos).toFixed(4)),
        "proxy": details.voter_info ? details.voter_info.proxy : '',
        "proxyVotes": proxyVotes,
        "votes": details.voter_info ? details.voter_info.producers.length : 0,
        "registered": details.registered,
        "claimed": details.claimed,
      };
      var write = Papa.unparse([formatted],{header:false});
      fs.appendFile(__dirname + '/' + filename, '\n'+write, (err) => {
          if (err) throw err;
      });
    } catch(e) {
      console.log(JSON.stringify(details));
      console.log(JSON.stringify(e));
    }

  } else {
    //console.log("Skipping: " + name);
  }
}

async function GetAllAccounts() {
  fs.readFile(__dirname + '/' + 'names.csv', 'utf8', async function (err,csv) {
    if (err) {
      return console.log(err);
    }

    var data = Papa.parse(csv).data;
    let total = data.length;

    console.log("Found " + total + " accounts.");
    let proc = 0;

    fs.appendFile(__dirname + '/' + filename, 'name,eos,stake,totalEos,proxy,proxyVotes,votes,registered', (err) => {
        if (err) throw err;
    });

    while(data.length > 0) {
      let names = data.splice(0,100);
      await Promise.all(
        names.map(CreateRow)
      );

      proc += names.length;
      process.stdout.write("Have processed " + proc + " of " + total + "\r");
    }

    console.log("Have processed " + proc + " of " + total);
    console.log("Done");
  });
}

async function run() {
  await GetAllAccounts();
}

run();
