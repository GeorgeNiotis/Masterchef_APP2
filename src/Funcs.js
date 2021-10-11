import web3 from 'web3';
import AsyncRetry from 'async-retry';
import {
  masterChef_ABI,
  masterChef_address,
  stake_token_LP_ABI, ERC_20_ABI
} from './config.js';

async function active_pools() {
    const Web3 = new web3('https://bsc-dataseed.binance.org/');
    const MasterChef_contract = new Web3.eth.Contract(masterChef_ABI, masterChef_address)
    const poolLength = await AsyncRetry(
      async () => {
        return await MasterChef_contract.methods.poolLength().call();
      },
      { retries: 5, }
    )
    const active_pools = []
    const batch = new Web3.BatchRequest()
    const batch2 = new Web3.BatchRequest()
    let totalAllocPoint
    let count_callbacks = 0
  
    batch.add(MasterChef_contract.methods.totalAllocPoint().call.request({ from: masterChef_address }, (error, result) => { totalAllocPoint = result }))
    const batcher = () => new Promise(resolve => {
      for (let i = 0; i < poolLength; i++) {
        batch.add(MasterChef_contract.methods.poolInfo(i).call.request({ from: masterChef_address }, (error, result) => {
          count_callbacks++
          if (result['allocPoint'] !== '0') {
            const obj = {
              result: result,
              allocPoint: result['allocPoint'],
              lpToken_address: result['lpToken']
            }
            active_pools.push(obj)
          }
          if (count_callbacks.toString() === poolLength ) {
            resolve()
          }
        }))
      }
      batch.execute();
    })
  
    const batcher2 = () => new Promise(resolve => {
      count_callbacks = 0
      active_pools.map((pool) => {
        batch2.add(MasterChef_contract.methods.cakePerBlock().call.request({ from: masterChef_address }, (error, result) => {
          count_callbacks++
          pool.cakePerBlock = web3.utils.fromWei(result);
          pool.totalAllocPoint = totalAllocPoint
          pool.reward_per_block_percent = Math.round((pool.allocPoint / totalAllocPoint) * 100)
          pool.reward = pool.cakePerBlock * (pool.allocPoint / totalAllocPoint);
          if (count_callbacks === active_pools.length) {
            resolve()
          }
        }))
        return null
      })
      batch2.execute();
    })
  
    await batcher()
    await batcher2()
    return active_pools
  }
  
async function tokensymbols(Web3, active_pools, LP_contracts_array) {
    const batch = new Web3.BatchRequest()
    const batch2 = new Web3.BatchRequest()
    let tokensymbol
    let symbols_array = []
    let num_of_batches = 2
    let count_callbacks = 0
  
    const batcher = () => new Promise(resolve => {
      active_pools.map((pool, i) => {
        tokensymbol = {}
        symbols_array.push(tokensymbol)
        symbols_array[i].LP_address = pool.result[0]
        batch.add(LP_contracts_array[i].methods.token0().call.request({ from: symbols_array[i].LP_address }, (error, result) => {
          count_callbacks++
          symbols_array[i].token0_address = result
          if ((active_pools.length * num_of_batches) === count_callbacks) {
            resolve()
          }
        }))
        batch.add(LP_contracts_array[i].methods.token1().call.request({ from: symbols_array[i].LP_address }, (error, result) => {
          count_callbacks++
          symbols_array[i].token1_address = result
          if ((active_pools.length * num_of_batches) === count_callbacks) {
            resolve()
          }
        }))
        return null
      })
      batch.execute();
    })
  
    const batcher2 = () => new Promise(resolve => {
      symbols_array.map((symbol, i) => {
        if (symbol.token0_address === undefined) {
          return false
        }
        symbol.token0_contract = new Web3.eth.Contract(ERC_20_ABI, symbol.token0_address)
        symbol.token1_contract = new Web3.eth.Contract(ERC_20_ABI, symbol.token1_address)
        batch2.add(symbol.token0_contract.methods.symbol().call.request({ from: symbol.token0_address }, (error, result) => {
          count_callbacks++
          symbol.token0_symbol = result
          if ((active_pools.length * num_of_batches) === count_callbacks) {
            resolve()
          }
        }))
        batch2.add(symbol.token1_contract.methods.symbol().call.request({ from: symbol.token1_address }, (error, result) => {
          count_callbacks++
          symbol.token1_symbol = result
          resolve()
          if ((active_pools.length * num_of_batches) === count_callbacks) {
            resolve()
          }
        }))
        return null
      })
      batch2.execute();
    })
    await batcher()
    await batcher2()
    return symbols_array
  }
  
async function loadBlockchainData() {
    const Web3 = new web3('https://bsc-dataseed.binance.org/');
    const MasterChef_contract = new Web3.eth.Contract(masterChef_ABI, masterChef_address)
    const poolLength = await AsyncRetry(
      async () => {
        return await MasterChef_contract.methods.poolLength().call();
      },
      { retries: 5, }
    );
    const active_pools_array = await active_pools()
    const LP_contracts_array = []
    let symbols_array = []
    for (let i = 0; i < active_pools_array.length; i++) {
      LP_contracts_array.push(new Web3.eth.Contract(stake_token_LP_ABI, active_pools_array[i].result[0]))
  
    }
    symbols_array = await tokensymbols(Web3, active_pools_array, LP_contracts_array)
    return [poolLength, active_pools_array, symbols_array]
  }

export default loadBlockchainData