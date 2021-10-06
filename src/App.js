import web3 from "web3";
import { masterChef_ABI, masterChef_address, stake_token_LP_ABI, ERC_20_ABI } from "./config.js";
import { useEffect, useState } from 'react';
import Active_pools from "./components/Active_pools"
import Symbols_array from "./components/Symbols_array"
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import AsyncRetry from "async-retry";



async function active_pools() {
  const Web3 = new web3('https://bsc-dataseed.binance.org/');
  const MasterChef_contract = new Web3.eth.Contract(masterChef_ABI, masterChef_address)
  const poolLength=await AsyncRetry(async () => {return await MasterChef_contract.methods.poolLength().call();},{retries: 5,});
  const active_pools = []
  var batch = new Web3.BatchRequest()
  var batch2 = new Web3.BatchRequest()
  var totalAllocPoint
  var count_callbacks = 0

  //copy all the pools with allocPoint!=0
  //batch all the call and then execute them(web3-batch-call is a tool for querying large amounts of contract data in {one} json-rpc call.)
  batch.add(MasterChef_contract.methods.totalAllocPoint().call.request({ from: masterChef_address }, (error, result) => { totalAllocPoint = result }))

  const fn = () => new Promise(resolve => {
    for (let i = 0; i < poolLength; i++) {
      batch.add(MasterChef_contract.methods.poolInfo(i).call.request({ from: masterChef_address }, (error, result) => {
        count_callbacks++
        if (result['allocPoint'] != 0) {
          var obj = {}
          obj.result = result
          obj.allocPoint = result['allocPoint']
          obj.lpToken_address = result["lpToken"]
          active_pools.push(obj)
        }
        if (count_callbacks == poolLength) {
          resolve()
        }
      }))
    }
    batch.execute();
  })
  //find the rest of info for the active pools
  const fn2 = () => new Promise(resolve => {
    count_callbacks = 0
    for (let i = 0; i < active_pools.length; i++) {
      batch2.add(MasterChef_contract.methods.cakePerBlock().call.request({ from: masterChef_address }, (error, result) => {
        count_callbacks++
        active_pools[i].cakePerBlock = web3.utils.fromWei(result);
        active_pools[i].totalAllocPoint = totalAllocPoint
        active_pools[i].reward_per_block_percent = Math.round((active_pools[i].allocPoint / totalAllocPoint) * 100)
        active_pools[i].reward = active_pools[i].cakePerBlock * (active_pools[i].allocPoint / totalAllocPoint);
        if (count_callbacks == active_pools.length) {
          resolve()
        }
      }))
    }
    batch2.execute();
  })

  //call the batches
  await fn()
  await fn2()
  return active_pools
}

async function tokensymbols(Web3, active_pools, LP_contracts_array) {
  //find the symbols of the Pancakepair(token 0, token1) and push in the array symbols_array(slow af needs batching)
  var batch = new Web3.BatchRequest()
  var batch2 = new Web3.BatchRequest()
  var tokensymbol
  var symbols_array = []
  var num_of_batches=2
  var count_callbacks = 0
  
  const fn = () => new Promise(resolve => {
    for (let i = 0; i < active_pools.length; i++) {
      tokensymbol={}
      symbols_array.push(tokensymbol)
      symbols_array[i].LP_address = active_pools[i].result[0]
      batch.add(LP_contracts_array[i].methods.token0().call.request({ from: symbols_array[i].LP_address }, (error, result) => {
        count_callbacks++
        symbols_array[i].token0_address = result 
        if((active_pools.length*num_of_batches)==count_callbacks){
          resolve()
        }
      }))
      batch.add(LP_contracts_array[i].methods.token1().call.request({ from: symbols_array[i].LP_address }, (error, result) => {
        count_callbacks++
        symbols_array[i].token1_address = result 
        if((active_pools.length*num_of_batches)==count_callbacks){
          resolve()
        }
      }))
    }
    batch.execute();
  })
  
  const fn2 = () => new Promise(resolve => {
    for (let i = 0; i < symbols_array.length; i++) {
      //skip not Cake-LP tokkens
      if(symbols_array[i].token0_address==undefined){
        continue
      }
      symbols_array[i].token0_contract = new Web3.eth.Contract(ERC_20_ABI, symbols_array[i].token0_address)
      symbols_array[i].token1_contract = new Web3.eth.Contract(ERC_20_ABI, symbols_array[i].token1_address)
      
      batch2.add(symbols_array[i].token0_contract.methods.symbol().call.request({ from: symbols_array[i].token0_address },(error, result)=>{
        count_callbacks++
        symbols_array[i].token0_symbol = result
        if((active_pools.length*num_of_batches)==count_callbacks){
          resolve()
        }
      }))
      batch2.add(symbols_array[i].token1_contract.methods.symbol().call.request({ from: symbols_array[i].token1_address },(error, result)=>{
        count_callbacks++
        symbols_array[i].token1_symbol = result
        resolve()
        if((active_pools.length*num_of_batches)==count_callbacks){
          resolve()
        }
      }))
    }
    batch2.execute();
  })
  await fn()
  await fn2()
  return symbols_array
}

async function loadBlockchainData() {
  // var isFinished = false
  const Web3 = new web3('https://bsc-dataseed.binance.org/');
  const MasterChef_contract = new Web3.eth.Contract(masterChef_ABI, masterChef_address)
  const poolLength = await AsyncRetry(async () => {return await MasterChef_contract.methods.poolLength().call();},{retries: 5,});
  const active_pools_array = await active_pools()
  const LP_contracts_array = []
  var symbols_array = []

  // console.log("active_pools:", active_pools_array)
  for (let i = 0; i < active_pools_array.length; i++) {
    LP_contracts_array.push(new Web3.eth.Contract(stake_token_LP_ABI, active_pools_array[i].result[0]))
    // var test=await LP_contracts_array[i].methods.symbol().call()
    // console.log(test)
  }
  // console.log("LP_contracts_array:",LP_contracts_array)
  symbols_array = await tokensymbols(Web3, active_pools_array, LP_contracts_array)
  // console.log("symbols_array", symbols_array)

  return [poolLength, active_pools_array,symbols_array]
}



function App() {
  var [poollength, setpoollength] = useState()
  var callfunc_loadBlockchainData = async () => setpoollength(await loadBlockchainData())

  useEffect(() => {
    callfunc_loadBlockchainData()
  }, [])

  return (
    <div className="App">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" >
            MasterChef App
          </Typography>
        </Toolbar>
      </AppBar>
      <Active_pools array={poollength} />
      <Symbols_array array={poollength} />
    </div>
  );
}

export default App;
