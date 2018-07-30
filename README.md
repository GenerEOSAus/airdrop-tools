# airdrop-tools
A set of nodejs tools to take a current snapshot and deploy tokens on the EOS network

# Installation
* Install Nodejs
* Clone this repository
* Run `npm install`

# The steps:
* Update `takeNames.js`, `takeSnapshot.js`, and `paySnapshot.js` with your preferred eos node connection
* Update `takeSnapshot.js` by setting `airgrab = 'yourairgrabtoken'` or `airgrab=false`
* Update `paySnapshot.js` by setting `airdropConfig` as appropriate
* 1. Get the most recent complete snapshot from https://www.eossnapshots.io/ by EOS New York

     Change the csv to a single column of names and rename it `names.csv`
     
     (These snapshots grab every account on EOS)

  1. or Run `node takesNames.js`. 
  
     This tool only gets names from the "voters table" of EOS... meaning they are either a genesis account or have voted for a block producer or proxy.

      If you don't pause blocks you may get duplicate names. Remove duplicates in excel or file editor. Rename the `names-timestamp.csv` to `names.csv`
* Run `node takeSnapshot.js`. This will take a while.
* Review `snapshot-timestamp.csv` and create a new file `snapshot.csv` in the following format:

   `account name,quantity` quantity should be just a number, no precision or symbol neccessary
* Finally, run `node paysnapShot.js`.

   If you want to run a test be sure to set broadcast: false and uncomment mockTransactions => 'pass'
* Review `payment-timestamp.csv` to confirm the deployment went out to everyone desired.

# Recommendations:
***This code is experimental***

Run this code against testnets and test thoroughly before doing a mainnet deploy

As per the license, GenerEOS does not accept any responsibility or liability for loss of tokens, invalid deployments, deployment failures, or damages of any kind related to using these snapshot and deployment tools.

# We hope this helps everyone with your future tokens!
