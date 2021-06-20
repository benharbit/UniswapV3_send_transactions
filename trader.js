var util = require('util');


const JSBI = require('jsbi');
const Provider = require('@truffle/hdwallet-provider')
let futures_eth_price = -99;
const fs = require('fs');
const do_convert_ETH_to_WETH = false;
const do_place_market_order = false;


require('dotenv').config()
const Web3 = require('web3');
const ethers = require('ethers');
//const erc20 = require('./erc20.json'); // Contract ABI


const ABI = require('./abis2.json'); // Contract ABI
const non_fungible_token_manager_abi = require("./non_fungible_token_manager_abi.json")
const swap_router_address =  '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const swap_router_abi = require('./swap_router_abi.json');
const multicall2_abi = require('./multicall2_abi.json')
const V3_pool_ABI = require('./UniswapV3Pool.json')

 


 

const V3_factory_ABI = require('./uniswapfactoryV3abi.json')



const addresses = require('./addresses2.json'); // Contract ABI
const contracts_info = require('./contracts_info_by_addresses.json')
const contracts_by_symbol = require('./contracts_info.json')


let pool_descriptions = new Map()

const pkey = process.env.PRIVATE_KEY;
const privatekey = process.env.PRIVATE_KEY;
//const provider = new Provider(pkey,"wss://mainnet.infura.io/ws/v3/8688261154c14c96ae13a2f0f381aea2")
const provider = new Provider(pkey,"ws://localhost:8546")
const web3 = new Web3(provider);


web3.eth.handleRevert = true;

const factoryV3_address = '0x1F98431c8aD98523631AE4a59f267346ea31F984';



var my_account = web3.eth.accounts.privateKeyToAccount(privatekey);
var my_public_address = my_account.address;
var my_address = my_public_address;


console.log("my_address",my_address)


var factoryV3 = new web3.eth.Contract(V3_factory_ABI.factory, factoryV3_address)
var swaprouter = new web3.eth.Contract(swap_router_abi, swap_router_address)



function no_expontial_to_string(str) {
  //var str = this.toFixed(n);
  if (str.indexOf('e+') === -1){


  	if(str.indexOf('.') != -1)
  		str  = String(Math.floor(Number(str)))
  

    return str;
  }


 // console.log("zzzz inital" + str)

  // if number is in scientific notation, pick (b)ase and (p)ower
  str = str.replace('.', '').split('e+').reduce(function(b, p) {
    return b + Array(p - b.length + 2).join(0);
  });

 // console.log("zzzz" + str + " " + str.length)
  
  //if (n > 0)
  //  str += '.' + Array(n + 1).join(0);
  
  return str;
};


//symbol one is the symbol you want to buy
async function place_market_order(symbol0,symbol1,isbuy,fee_level,quant) {


	//console.log("type1=" + util.inspect(contracts_by_symbol))
//var  contracts_by_symbol = JSON.parse(contracts_by_symbol);

	if(fee_level != 500 && fee_level != 1000 && fee_level != 3000){
		console.log("fee level must be 500 1000 or 3000, the fee_level = ",fee_level);
		return;
	}

	if(contracts_by_symbol[symbol0] == undefined || contracts_by_symbol[symbol0]==undefined){

		if(contracts_by_symbol[symbol0]==false )
			console.log("didn't find symbol " + symbol0);

		if(contracts_by_symbol[symbol1]==false )
			console.log("didn't find symbol " + symbol1);	


		return;	

	}


	var address0 = contracts_by_symbol[symbol0].address;
	var address1 = contracts_by_symbol[symbol1].address;

	var pool_address =  await factoryV3.methods.getPool(address0,address1,fee_level).call();
	console.log("pool address: ",pool_address)
	if(pool_address==0){
		console.log("pool address is zero")
		return ;
	}

	var pool_1 = new web3.eth.Contract(V3_pool_ABI.abi, pool_address);



	var slot0 = await pool_1.methods.slot0.call().call();
	var token0_in_pool = await pool_1.methods.token0.call().call();
	var token1_in_pool = await pool_1.methods.token1.call().call();
	var token0_symbol_pool = contracts_info[token0_in_pool]["symbol"];
	var token1_symbol_pool = contracts_info[token1_in_pool]["symbol"];



	var sqrtPriceX96 = slot0[0];

	//var num1 = JSBI.BigInt(1000000000000)
	console.log("sqrtPriceX96 type="+ (sqrtPriceX96) + " " +  token0_symbol_pool + " symbol1 =" + token1_symbol_pool)
	var zeroforone = 0;
	var amount = 0;
	var limit_price;


	 var avg_gas_price = await web3.eth.getGasPrice();

	 var deadline = Date.now() + 120000;
   var num_decimals = contracts_by_symbol[symbol0].decimals;
   var num_decimals_sym_1 = contracts_by_symbol[symbol1].decimals;



	if(isbuy==1){


		/*

		struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }
    */



		var sqrtPriceX96_num = JSBI.BigInt(sqrtPriceX96);
    var sqrtPriceLimitX96 = sqrtPriceX96_num;
    var max_tokens_to_spend = JSBI.BigInt(0);
    var pool_price = JSBI.BigInt(sqrtPriceX96 );
    pool_price *= pool_price;
    var amountout =  JSBI.BigInt(quant * 10** num_decimals);
    var pool_price_in_decimals = pool_price / (10 ** (num_decimals)) * 10**(num_decimals_sym_1) /JSBI.BigInt(2) ** (JSBI.BigInt(192));
 

    if(token0_symbol_pool==  symbol0){
    	sqrtPriceLimitX96 = 1.05*sqrtPriceX96_num;
    	max_tokens_to_spend = quant * pool_price_in_decimals * 10**(num_decimals_sym_1) * 1.05; 
    }
    else{
    	sqrtPriceLimitX96 = .95*sqrtPriceX96_num  ;

    	
    //console.log("pool_price_in_decimals xxx = "+ pool_price_in_decimals + " " + 1/pool_price_in_decimals)

    	max_tokens_to_spend =  quant *1/pool_price_in_decimals * 10**(num_decimals_sym_1) * 1.05; 
   	

    }

   // console.log(" pool_price xxxxxx=" + pool_price + " " + (token0_symbol_pool==  symbol0) + " " + max_tokens_to_spend + " " + num_decimals + " " + num_decimals_sym_1 )

    var max_tokens_in_decimal = max_tokens_to_spend/10**(num_decimals_sym_1)
   // console.log("max_tokens as number " + max_tokens_in_decimal + " " + sqrtPriceX96 + " " + pool_price)

    
   console.log("buy order sent infomation=",[address1,address0,fee_level,my_address,deadline,amountout.toString(10),no_expontial_to_string(String(max_tokens_to_spend)),no_expontial_to_string(sqrtPriceLimitX96.toString(10))]);
    console.log("gas price used=",avg_gas_price)
    



		swaprouter.methods.exactOutputSingle([address1,address0,fee_level,my_address,deadline,amountout.toString(10),no_expontial_to_string(String(max_tokens_to_spend)),no_expontial_to_string(sqrtPriceLimitX96.toString(10))]).send({
				from: my_address,
				value:0,
				gasPrice: avg_gas_price,
				gas:1000000//s,
				//gasLimit:80000

				
				}

			);


			


	}
	else{
		/*
		struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    */
    var sqrtPriceX96_num = JSBI.BigInt(sqrtPriceX96);
    var sqrtPriceLimitX96 = sqrtPriceX96_num;
    if(token0_symbol_pool==  symbol0)
    	sqrtPriceLimitX96 = .95*sqrtPriceX96_num;
    else
    	sqrtPriceLimitX96 = 1.05*sqrtPriceX96_num;

   
    var amountIn =  JSBI.BigInt(quant * 10** num_decimals);
    var min_amount_out = 0;
    console.log("in:"+quant)
    console.log("input_sent= "+[address0,address1,fee_level,my_address,deadline,amountIn,min_amount_out,sqrtPriceLimitX96.toString(10)]);
    console.log("swap router send ");
    console.log("exponential " + no_expontial_to_string(sqrtPriceLimitX96.toString(10))  + " " + no_expontial_to_string(sqrtPriceLimitX96.toString(10)))

   // var amountIn_BN = web3.utils.from((amountIn))
    //var sqrtPriceLimitX96_BN = web3.utils.from(sqrtPriceLimitX96_BN)
    gas_price = JSBI.BigInt(16860000000);
    gas = JSBI.BigInt(200000);
    gasLimit = JSBI.BigInt(600000);

    max_gas = gasLimit* gas_price
    max_gas_in_usdt = max_gas/JSBI.BigInt(1e18)*2500
    console.log("gas max="+max_gas + " " + max_gas_in_usdt)


    gas_amount = gas* gas_price
    gas_in_usdt = gas_amount/JSBI.BigInt(1e18)*2500
   
    console.log("gas="+gas_amount + " " + gas_in_usdt + "average_gas" + avg_gas_price)

    ///gasLimit:200000

    /*
    
		swaprouter.methods.exactInputSingle([address0,address1,fee_level,my_address,deadline,amountIn.toString(10),0,noexpontial_to_string(sqrtPriceLimitX96.toString(10))]).send({
				from: my_address,
				value:0,
				gasPrice: avg_gas_price,
				gas:300000,
				gasLimit:80000

				
				}

			);
			*/

			
			
			
			

			
	
		
	}





	/*
	if(isbuy){
		if(token1_symbol==symbol1){
			zeroforone = 1;
			num_decimals = contracts_by_symbol[symbol1].decimals; 
			amount = JSBI.BigInt(quant * 10** num_decimals);
			amount = amount *-1;
			limit_price = sqrtPriceX96 * .95;
			
		}
		else{

			zeroforone = 0;
			num_decimals = contracts_by_symbol[symbol1].decimals; 
			amount = JSBI.BigInt(quant * 10** num_decimals);
			amount = amount * -1;
			limit_price = sqrtPriceX96 * 1.05;

		}
	}
	else{  //sell

		if(token1_symbol==symbol1){
			zeroforone = 0;
			num_decimals = contracts_by_symbol[symbol1].decimals; 
			amount = JSBI.BigInt(quant * 10** num_decimals);
			amount = amount *1;
			limit_price = sqrtPriceX96 * .95;
			
		}
		else{

			zeroforone =1;
			num_decimals = contracts_by_symbol[symbol1].decimals; 
			amount = JSBI.BigInt(quant * 10** num_decimals);
			amount = amount * 1;
			limit_price = sqrtPriceX96 * 1.05;

		}
		*/

		/*
		await	var result_of_deposit = await pool_1.methods.swap(my_address,zeroforone,amount,limit_price).send({
				from: my_public_address,
				value:0,
				gasPrice: 11330000000,
				gas:160000,
				gasLimit:1200000
			});



/*
[my_address,quant,]
 address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;




	}
	*/

//	var eth_amount =  web3.utils.fromWei(String(Math.abs(amount)))
//	console.log("parameters sent to swap functions my_address=" + my_address + " " + "zeroforone= " + zeroforone + " amount" + amount + " in eth " + eth_amount +  " limit_price=" +limit_price + " " + sqrtPriceX96 + " " +  limit_price/sqrtPriceX96)

	return;

	//watch_Swap_event_of_pool_v3(address1,address2,fee_level);

}



//provide liquidity in V3 Uniswap
//lower cutoff is set as percent of price for example .95
//higher cutoff is set as percent of price for example 1.05



async function place_liquidity(symbol0,symbol1,fee_level,lower_cutoff,higher_cutoff,amount_in_token_0) {


	if(fee_level != 500 && fee_level != 10000 && fee_level != 3000){
		console.log("fee level must be 500 1000 or 3000, the fee_level = ",fee_level);
		return;
	}

	if(contracts_by_symbol[symbol0] == undefined || contracts_by_symbol[symbol0]==undefined){

		if(contracts_by_symbol[symbol0]==false )
			console.log("didn't find symbol " + symbol0);

		if(contracts_by_symbol[symbol1]==false )
			console.log("didn't find symbol " + symbol1);	


		return;	

	}


	var address0 = contracts_by_symbol[symbol0].address;
	var address1 = contracts_by_symbol[symbol1].address;

	var pool_address =  await factoryV3.methods.getPool(address0,address1,fee_level).call();
	console.log("pool address: ",pool_address)
	if(pool_address==0){
		console.log("pool address is zero")
		return ;
	}

	var pool_1 = new web3.eth.Contract(V3_pool_ABI.abi, pool_address);



	var slot0 = await pool_1.methods.slot0.call().call();
	var token0_in_pool = await pool_1.methods.token0.call().call();
	var token1_in_pool = await pool_1.methods.token1.call().call();
	var tickspacing = Number( await pool_1.methods.tickSpacing.call().call());
	var token0_symbol_pool = contracts_info[token0_in_pool]["symbol"];
	var token1_symbol_pool = contracts_info[token1_in_pool]["symbol"];

	var amount_pool_0_desired = 0;
	var amount_pool_1_desired = 0;

	var sqrtPriceX96 = slot0[0];
	var current_tick = Number(slot0[1]);
	var price_ratio =  JSBI.signedRightShift(JSBI.BigInt(JSBI.BigInt(sqrtPriceX96)**2), JSBI.BigInt(192));
	console.log("price_ratio ", price_ratio.toString(10))


	if(token0_symbol_pool == symbol0){
		amount_pool_0_desired = amount_in_token_0 * 10 ** contracts_info[token0_in_pool]["decimals"];
		amount_pool_1_desired =  JSBI.BigInt(Math.floor(amount_pool_0_desired * price_ratio));

	}
	else{
		console.log(token1_in_pool)
		var desired_0 = amount_in_token_0 * 10 ** contracts_info[token1_in_pool]["decimals"];
		console.log("amount_1_desired" + desired_0)
	
		desired_1 =  JSBI.BigInt(Math.floor(desired_0 / price_ratio));
	
		amount_pool_0_desired = desired_1
		amount_pool_1_desired = desired_0
	}


	console.log("amount_desired token 0=",amount_pool_0_desired.toString()," token1=", amount_pool_1_desired.toString() )


	
	

	var higher_tick = Math.log(higher_cutoff*1.0001**current_tick)/Math.log(1.0001)
	var lower_tick =  Math.log(lower_cutoff*1.0001**current_tick)/Math.log(1.0001)
	var higher_mult = Math.floor(higher_tick/tickspacing)
	var lower_mult = Math.floor( current_tick/tickspacing)

	higher_tick = (higher_mult * tickspacing) + tickspacing ;
	lower_tick =  (lower_mult * tickspacing) - tickspacing ;






	current_tick= current_tick - 1
	higher_price = (1.0001**(higher_tick )) /1e12 
	lower_price =  1.0001**lower_tick /1e12 
	tick_now_price = 1.0001**current_tick /1e12
	console.log("tick ratios for debug:",higher_price/tick_now_price + " " + lower_price/tick_now_price + " " + tick_now_price +" " +  higher_price)



	var avg_gas_price = await web3.eth.getGasPrice();

	
	console.log("avg_gas_price=" + avg_gas_price)



	/*	

	struct MintParams {
	        address token0;
	        address token1;
	        uint24 fee;
	        int24 tickLower;
	        int24 tickUpper;
	        uint256 amount0Desired;
	        uint256 amount1Desired;
	        uint256 amount0Min;
	        uint256 amount1Min;
	        address recipient;
	        uint256 deadline;
	    }
	*/

	var non_fungible_manager_contract = new web3.eth.Contract(non_fungible_token_manager_abi,"0xC36442b4a4522E871399CD717aBDD847Ab11FE88")

    

     var deadline = Date.now() + 1200000;

   

    avg_gas_price  = Math.floor(JSBI.BigInt(avg_gas_price)*1.1);


    
    
    lower_tick -=  lower_tick %tickspacing ;
    higher_tick =  higher_tick - higher_tick % tickspacing + tickspacing  ;

     var amount_0_str = no_expontial_to_string(String(amount_pool_0_desired))
     var amount_1_str =  no_expontial_to_string(String(amount_pool_1_desired))
     const data_to_send = [token0_in_pool,token1_in_pool,fee_level,lower_tick,higher_tick,amount_0_str,amount_1_str,1,1,my_address,deadline];
     console.log("sent info for mint function in NFM contract" + data_to_send);
    

		var result = await non_fungible_manager_contract.methods.mint(data_to_send).send({
				from: my_address,
				gasPrice: avg_gas_price,
				gas:1000000

				
				}

			);
			
			
			

		console.log("result for liquidity provision " + util.inspect(result))
		console.log("result status :"+ result.status)
	
		
		



}



async function getRevertReason(txHash){

  const tx = await web3.eth.getTransaction(txHash)

  console.log(tx.blockNumber)
  var result = await web3.eth.call(tx, tx.blockNumber)
   console.log(result)

  result = result.startsWith('0x') ? result : `0x${result}`

  if (result && result.substr(138)) {

    const reason = web3.utils.toAscii(result.substr(138))
    console.log('Revert reason:', reason)
    return reason

  } else {

    console.log('Cannot get reason - No return value')

  }

}




async function main_2() {

	
	//var zzz = await place_market_order("weth","usdc",isbuy,fee_level,quant) ;

	const isbuy = 1
	const fee_level = 3000
	const quant = .0005
	const token_0  = "usdc";
	const token_1 = "weth"
	const range_lower = .99;  //defined as fraction  of the price
	const range_higher = 1.01; //defined as fraction  of the price
	const  amount_in_token_0 = .01; //approximately 1/100 of a dollar

	//it will try to place a equivalent amount in usd notional in both contracts   
	var zzz = await place_liquidity("usdc","weth",fee_level,range_lower,range_higher,amount_in_token_0) ;



}
main_2()


