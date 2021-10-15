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
    symbolsArray.map((symbol, i) => {
      if (symbol.token0Address === undefined) {
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
        resolve()
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
  const url2=new URL('https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=pancakeswap-token,wbnb')
  var addressesString = ''
  // console.log(url.searchParams.get('contract_addresses'))
  // url.searchParams.set('contract_addresses',
  //   '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82,0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c,0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47'
  // )
  // symbolsArray.slice(0, 10).map((symbols) => {
  //   if (symbols.token0Address === undefined) {
  //     return false
  //   } else {
  //     addressesString = addressesString + ',' + symbols.token0Address
  //   }
  // })
  // console.log(url2.searchParams.get('ids'))
  // const fetchResponsePromise2 = await fetch(url2)
  // const data2 = JSON.parse(await fetchResponsePromise2.text())

  const fetchResponsePromise = await fetch(url)
  const list = JSON.parse(await fetchResponsePromise.text())
  // get the id for the coresponding symbol
  symbolsArray.map((symbol,mapIndex) => {
    if (symbol.token0Address === undefined) {
      return false
    }
    symbol.token0Symbol = symbol.token0Symbol.toLowerCase()
    symbol.token1Symbol = symbol.token1Symbol.toLowerCase()
    symbolsArray[mapIndex].symbol0Id=undefined
    symbolsArray[mapIndex].symbol1Id=undefined
    for (let index = 0; index < list.length; index++) {
      if (list[index].symbol === symbol.token0Symbol) {
        symbolsArray[mapIndex].symbol0Id=list[index].id
      }
      if (list[index].symbol === symbol.token1Symbol) {
        symbolsArray[mapIndex].symbol1Id=list[index].id
      }
      if ((symbolsArray[mapIndex].symbol0Id!==undefined)&&(symbolsArray[mapIndex].symbol1Id!==undefined)) {
        break
      }
    }
    return null
  })
  console.log(symbolsArray)
  // console.log(data2)

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
  coinGecko(symbolsArray)
  return [poolLength, activePoolsArray, symbolsArray]
}

export default loadBlockchainData