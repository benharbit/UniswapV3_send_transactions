# UniswapV3_send_transactions
UniswapV3 send transactions, provide liquidity, send orders


The trader.js file places a liquidity position order on UniswapV3.
To use the program you must include include your 
own .env file which includes the line "PRIVATE_KEY" = "your private key".


Additionally, it is assumed that you have enough ETH to pay for gas 
fees and you have more than a dollars worth of USDC and ETH in your address.

Additionally, you have to call the approve function on the USDC smart contract 
to approve the address of the NFT_manger address at 0xC36442b4a4522E871399CD717aBDD847Ab11FE88.

Additionally, it assumed that there is a local node runnning.  You can change use
an infura address by changing the line 

const provider = new Provider(pkey,"ws://localhost:8546")
to 
const provider = new Provider(pkey,"wss://your infura key")
