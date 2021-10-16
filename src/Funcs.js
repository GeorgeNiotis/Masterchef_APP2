import web3 from 'web3';
import AsyncRetry from 'async-retry';

import {
  masterChefABI,
  masterChefAddress,
  stakeTokenLPABI, ERC20ABI
} from './config.js';

const activePools = async () => {
  const Web3 = new web3('https://bsc-dataseed.binance.org/');
  const MasterChefContract = new Web3.eth.Contract(masterChefABI, masterChefAddress)
  const poolLength = await AsyncRetry(
    async () => {
      return await MasterChefContract.methods.poolLength().call();
    },
    { retries: 5, }
  )
  const activePoolsArray = []
  const batch = new Web3.BatchRequest()
  const batch2 = new Web3.BatchRequest()
  let totalAllocPoint
  let countCallbacks = 0

  batch.add(MasterChefContract.methods.totalAllocPoint().call.request({ from: masterChefAddress }, (error, result) => { totalAllocPoint = result }))
  const batcher = () => new Promise(resolve => {
    for (let i = 0; i < poolLength; i++) {
      batch.add(MasterChefContract.methods.poolInfo(i).call.request({ from: masterChefAddress }, (error, result) => {
        countCallbacks++
        if (result['allocPoint'] !== '0') {
          const obj = {
            result: result,
            allocPoint: result['allocPoint'],
            lpTokenAddress: result['lpToken']
          }
          activePoolsArray.push(obj)
        }
        if (countCallbacks.toString() === poolLength) {
          resolve()
        }
      }))
    }
    batch.execute();
  })

  const batcher2 = () => new Promise(resolve => {
    countCallbacks = 0
    activePoolsArray.map((pool) => {
      batch2.add(MasterChefContract.methods.cakePerBlock().call.request({ from: masterChefAddress }, (error, result) => {
        countCallbacks++
        pool.cakePerBlock = web3.utils.fromWei(result);
        pool.totalAllocPoint = totalAllocPoint
        pool.rewardPerBlockPercent = Math.round((pool.allocPoint / totalAllocPoint) * 100)
        pool.reward = pool.cakePerBlock * (pool.allocPoint / totalAllocPoint);
        if (countCallbacks === activePoolsArray.length) {
          resolve()
        }
      }))
      return null
    })
    batch2.execute();
  })

  await batcher()
  await batcher2()
  return activePoolsArray
}

const tokenSymbols = async (Web3, activePoolsArray, LPContractsArray) => {
  const batch = new Web3.BatchRequest()
  const batch2 = new Web3.BatchRequest()
  let tokensymbol
  const symbolsArray = []
  const NumOfBatches = 2
  let countCallbacks = 0

  const batcher = () => new Promise(resolve => {
    activePoolsArray.map((pool, i) => {
      tokensymbol = {}
      symbolsArray.push(tokensymbol)
      symbolsArray[i].LPAddress = pool.result[0]
      batch.add(LPContractsArray[i].methods.token0().call.request({ from: symbolsArray[i].LPAddress }, (error, result) => {
        countCallbacks++
        symbolsArray[i].token0Address = result
        if ((activePoolsArray.length * NumOfBatches) === countCallbacks) {
          resolve()
        }
      }))
      batch.add(LPContractsArray[i].methods.token1().call.request({ from: symbolsArray[i].LPAddress }, (error, result) => {
        countCallbacks++
        symbolsArray[i].token1Address = result
        if ((activePoolsArray.length * NumOfBatches) === countCallbacks) {
          resolve()
        }
      }))
      return null
    })
    batch.execute();
  })

  const batcher2 = () => new Promise(resolve => {
    countCallbacks = 0
    symbolsArray.map((symbol, i) => {
      if (symbol.token0Address === undefined) {
        countCallbacks=countCallbacks+NumOfBatches
        return false
      }
      symbol.token0Contract = new Web3.eth.Contract(ERC20ABI, symbol.token0Address)
      symbol.token1Contract = new Web3.eth.Contract(ERC20ABI, symbol.token1Address)
      batch2.add(symbol.token0Contract.methods.symbol().call.request({ from: symbol.token0Address }, (error, result) => {
        countCallbacks++
        symbol.token0Symbol = result
        if ((activePoolsArray.length * NumOfBatches) === countCallbacks) {
          resolve()
        }
      }))
      batch2.add(symbol.token1Contract.methods.symbol().call.request({ from: symbol.token1Address }, (error, result) => {
        countCallbacks++
        symbol.token1Symbol = result
        if ((activePoolsArray.length * NumOfBatches) === countCallbacks) {
          resolve()
        }
      }))
      return null
    })
    batch2.execute();
  })
  await batcher()
  await batcher2()
  return symbolsArray
}

const coinGecko = async (symbolsArray) => {
  const url = new URL('https://api.coingecko.com/api/v3/coins/list')
  const url2 = new URL('https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=<id1>,<id2>')
  const fetchResponsePromise = await fetch(url)
  const list = JSON.parse(await fetchResponsePromise.text())
  var idsString = ''

  symbolsArray.map((symbol, mapIndex) => {
    if (symbol.token0Address === undefined) {
      return false
    }
    symbol.token0Symbol = symbol.token0Symbol.toLowerCase()
    symbol.token1Symbol = symbol.token1Symbol.toLowerCase()
    for (let index = 0; index < list.length; index++) {
      if (list[index].symbol === symbol.token0Symbol) {
        symbolsArray[mapIndex].symbol0Id = list[index].id
        idsString = idsString + ',' + list[index].id
      } else if (list[index].symbol === symbol.token1Symbol) {
        symbolsArray[mapIndex].symbol1Id = list[index].id
        idsString = idsString + ',' + list[index].id
      }
      if ((symbolsArray[mapIndex].symbol0Id !== undefined) && (symbolsArray[mapIndex].symbol1Id !== undefined)) {
        break
      }
    }
    return null
  })

  url2.searchParams.set('ids', idsString)
  const fetchResponsePromise2 = await fetch(url2)
  const idPriceData = JSON.parse(await fetchResponsePromise2.text())

  symbolsArray.map((obj,index) => {
    if (obj.token0Address === undefined) {
      return false
    }
    if(idPriceData[obj.symbol0Id]!==undefined){
      obj.token0Price = Object.values(idPriceData[obj.symbol0Id])[0]
    }
    if(idPriceData[obj.symbol1Id]!==undefined){
      obj.token1Price = Object.values(idPriceData[obj.symbol1Id])[0]
    }
    // obj.token0Price = idPriceData[obj.symbol0Id]
    // obj.token1Price = idPriceData[obj.symbol1Id]
  })
}

const calcTVL = async (symbolsArray, LPContractsArray) => {
  const Web3 = new web3('https://bsc-dataseed.binance.org/');
  const batch = new Web3.BatchRequest()
  let countCallbacks = 0
  const NumOfBatches=2

  const batcher = () => new Promise(resolve => {
    symbolsArray.map((symbol,index) => {
      if (symbol.token0Address === undefined) {
        countCallbacks=countCallbacks+NumOfBatches
        return false
      }
      batch.add(LPContractsArray[index].methods.getReserves().call.request({ from: symbol.LPAddress }, (error, result) => {
        countCallbacks++
        symbol.reserve0=result[0]
        symbol.reserve1=result[1]
        if (countCallbacks === (symbolsArray.length * NumOfBatches)) {
          resolve()
        }
      }))
      batch.add(LPContractsArray[index].methods.totalSupply().call.request({ from: symbol.LPAddress }, (error, result) => {
        countCallbacks++
        symbol.totalSupply=result
        if (countCallbacks === (symbolsArray.length*NumOfBatches)) {
          resolve()
        }
      }))
    })
    batch.execute();
  })

  await batcher()

  symbolsArray.map((obj,index)=>{
    if (obj.token0Address === undefined) {
      return false
    }
    obj.tvl=((obj.reserve0 * obj.token0Price) + (obj.reserve1 * obj.token1Price)) / obj.totalSupply
    if (isNaN(obj.tvl)) {
      obj.tvl=undefined
    }
  })
}

const loadBlockchainData = async () => {
  const Web3 = new web3('https://bsc-dataseed.binance.org/');
  const MasterChefContract = new Web3.eth.Contract(masterChefABI, masterChefAddress)
  const poolLength = await AsyncRetry(
    async () => {
      return await MasterChefContract.methods.poolLength().call();
    },
    { retries: 5, }
  );
  const activePoolsArray = await activePools()
  const LPContractsArray = []
  for (let i = 0; i < activePoolsArray.length; i++) {
    LPContractsArray.push(new Web3.eth.Contract(stakeTokenLPABI, activePoolsArray[i].result[0]))

  }
  const symbolsArray = await tokenSymbols(Web3, activePoolsArray, LPContractsArray)
  await coinGecko(symbolsArray, LPContractsArray)
  await calcTVL(symbolsArray, LPContractsArray)
  console.log(activePoolsArray)
  console.log(symbolsArray)
  return [poolLength, activePoolsArray, symbolsArray]
}

export default loadBlockchainData