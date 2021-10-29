import web3 from 'web3';
import AsyncRetry from 'async-retry';
import BigNumber from 'bignumber.js'
import {
  masterChefABI,
  masterChefAddress,
  stakeTokenLPABI, ERC20ABI
} from './config.js';

const activePools = async () => {
  const Web3 = new web3(process.env.REACT_APP_NODE_URL);
  const MasterChefContract = new Web3.eth.Contract(masterChefABI, masterChefAddress)
  const poolLength = await AsyncRetry(
    async () => {
      return await MasterChefContract.methods.poolLength().call();
    },
    { retries: 5, }
  )
  const activePoolsArray = []
  const batchPoolInfo = new Web3.BatchRequest()
  const batchCakePerBlock = new Web3.BatchRequest()
  let totalAllocPoint
  let countCallbacks = 0

  const processAllocPointReq = (error, result) => {
    if (error) {
      console.log(error)
    }
    totalAllocPoint = result
  }
  batchPoolInfo.add(
    MasterChefContract
      .methods
      .totalAllocPoint()
      .call
      .request(
        { from: masterChefAddress }, (error, result) => processAllocPointReq(error, result)
      )
  )
  const processPoolInfo = (result, index) => {
    if (result.allocPoint !== '0') {
      activePoolsArray.push({
        result: result,
        allocPoint: result['allocPoint'],
        lpTokenAddress: result['lpToken'],
        pid: index
      })
    }
  }

  const PoolInfoPromiseCallBack = resolve => {
    for (let i = 0; i < poolLength; i++) {
      batchPoolInfo.add(
        MasterChefContract
          .methods.poolInfo(i)
          .call
          .request(
            { from: masterChefAddress }, (error, result) => {
              countCallbacks += 1
              processPoolInfo(result, i)
              if (countCallbacks === Number(poolLength)) {
                resolve()
              }
            }
          )
      )
    }
    batchPoolInfo.execute();
  }

  const PoolInfoPromise = () => new Promise(resolve => {
    PoolInfoPromiseCallBack(resolve)
  })

  const processCakePerBlock = (pool, result) => {
    // pool.cakePerBlock = web3.utils.fromWei(result);
    pool.cakePerBlock = result;
    pool.totalAllocPoint = totalAllocPoint
    pool.rewardPerBlockPercent = Math.round((pool.allocPoint / totalAllocPoint) * 100)
    pool.rewardPerBlock = new BigNumber(pool.cakePerBlock).multipliedBy(new BigNumber(pool.allocPoint).dividedBy(new BigNumber(pool.totalAllocPoint))).toString()
  }

  const cakePerBlockPromiseCallBack = resolve => {
    countCallbacks = 0
    activePoolsArray.map((pool) => {
      batchCakePerBlock.add(
        MasterChefContract
          .methods
          .cakePerBlock()
          .call
          .request(
            { from: masterChefAddress }, (error, result) => {
              countCallbacks += 1
              processCakePerBlock(pool, result)
              if (countCallbacks === activePoolsArray.length) {
                resolve()
              }
            }
          )
      )
      return null
    })
    batchCakePerBlock.execute();
  }

  const cakePerBlockPromise = () => new Promise(resolve => {
    cakePerBlockPromiseCallBack(resolve)
  })

  await PoolInfoPromise()
  await cakePerBlockPromise()
  // await Promise.all([PoolInfoPromise(), cakePerBlockPromise()]) //not working
  return activePoolsArray
}

const GetLPTokenSymbols = async (Web3, activePoolsArray, LPContractsArray) => {
  const batchTokens = new Web3.BatchRequest()
  const batchTokenSymbols = new Web3.BatchRequest()
  let tokensymbol
  const symbolsArray = []
  const NumOfBatches = 2
  let countCallbacks = 0

  const TokensPromiseCallBack = (resolve,reject) => {
    activePoolsArray.map((pool, i) => {
      tokensymbol = {}
      symbolsArray.push(tokensymbol)
      symbolsArray[i].LPAddress = pool.result[0]
      batchTokens.add(
        LPContractsArray[i]
          .methods
          .token0()
          .call
          .request(
            { from: symbolsArray[i].LPAddress }, (error, result) => {
              countCallbacks += 1
              symbolsArray[i].token0Address = result
              if ((activePoolsArray.length * NumOfBatches) === countCallbacks) {
                resolve()
              }else if ((activePoolsArray.length * NumOfBatches) < countCallbacks) {
                reject()
              }
            }
          )
      )
      batchTokens.add(
        LPContractsArray[i]
          .methods
          .token1()
          .call
          .request(
            { from: symbolsArray[i].LPAddress }, (error, result) => {
              countCallbacks += 1
              symbolsArray[i].token1Address = result
              if ((activePoolsArray.length * NumOfBatches) === countCallbacks) {
                resolve()
              }
            }
          )
      )
      return null
    })
    batchTokens.execute();
  }

  const TokensPromise = () => new Promise((resolve,reject) => {
    TokensPromiseCallBack(resolve,reject)
  })

  const SymbolsPromiseCallBack=(resolve,reject)=>{
    countCallbacks = 0
    symbolsArray.map((symbol, i) => {
      if (symbol.token0Address === undefined) {
        countCallbacks = countCallbacks + NumOfBatches
        return false
      }
      symbol.token0Contract = new Web3.eth.Contract(ERC20ABI, symbol.token0Address)
      symbol.token1Contract = new Web3.eth.Contract(ERC20ABI, symbol.token1Address)
      batchTokenSymbols.add(
        symbol
          .token0Contract
          .methods
          .symbol()
          .call
          .request(
            { from: symbol.token0Address }, (error, result) => {
              countCallbacks += 1
              symbol.token0Symbol = result
              if ((activePoolsArray.length * NumOfBatches) === countCallbacks) {
                resolve()
              }else if ((activePoolsArray.length * NumOfBatches) < countCallbacks) {
                console.log('reject:')
                reject()
              }
            }
          )
      )
      batchTokenSymbols.add(
        symbol
          .token1Contract
          .methods
          .symbol()
          .call
          .request(
            { from: symbol.token1Address }, (error, result) => {
              countCallbacks += 1
              symbol.token1Symbol = result
              if ((activePoolsArray.length * NumOfBatches) === countCallbacks) {
                resolve()
              }
            }
          )
      )
      return null
    })
    batchTokenSymbols.execute();
  }

  const SymbolsPromise = () => new Promise((resolve,reject) => {
    SymbolsPromiseCallBack(resolve,reject)
  })

  await TokensPromise()
  await SymbolsPromise()
  // await Promise.all([TokensPromise(), SymbolsPromise()]) //not working
  return symbolsArray
}

const setWithExpiry = (key, value, ttl) => {
  const now = new Date()
  const item = {
    value: value,
    expiry: now.getTime() + ttl
  }

  localStorage.setItem(key, JSON.stringify(item))
}

const getWithExpiry = key => {

  const itemStr = localStorage.getItem(key)
  if (!itemStr) {
    return null
  }

  const item = JSON.parse(itemStr)
  const now = new Date()

  if (now.getTime() > item.expiry) {
    localStorage.removeItem(key)

    return null
  }
  return item.value
}
const coinGecko = async (symbolsArray) => {
  const url = new URL(process.env.REACT_APP_COINGECKO_LIST_URL)
  const url2 = new URL(process.env.REACT_APP_COINGECKO_PRICE_URL)
  let idsString = ''
  let list = getWithExpiry('list')
  let idPriceData = getWithExpiry('idPriceData')

  if (list === null) {
    let fetchResponsePromise = await fetch(url)
    list = JSON.parse(await fetchResponsePromise.text())

    setWithExpiry('list', list, 60000)
  }

  symbolsArray.forEach((symbol, mapIndex) => {
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
  })

  if (idPriceData === null) {
    url2.searchParams.set('ids', idsString)
    let fetchResponsePromise2 = await fetch(url2)

    idPriceData = JSON.parse(await fetchResponsePromise2.text())
    setWithExpiry('idPriceData', idPriceData, 60000)
  }

  symbolsArray.forEach((symbol, index) => {
    if (symbol.token0Address === undefined) {
      return false
    }
    if (idPriceData[symbol.symbol0Id] !== undefined) {
      symbol.token0Price = Object.values(idPriceData[symbol.symbol0Id])[0]
    }
    if (idPriceData[symbol.symbol1Id] !== undefined) {
      symbol.token1Price = Object.values(idPriceData[symbol.symbol1Id])[0]
    }
  })
}

const calcTVL = async (symbolsArray, LPContractsArray) => {
  const Web3 = new web3(process.env.REACT_APP_NODE_URL);
  const batchReserves = new Web3.BatchRequest()
  let countCallbacks = 0
  const NumOfBatches = 2

  const getReservesPromise = () => new Promise(resolve => {
    symbolsArray.map((symbol, index) => {
      if (symbol.token0Address === undefined) {
        countCallbacks = countCallbacks + NumOfBatches

        return false
      }
      batchReserves.add(
        LPContractsArray[index]
          .methods
          .getReserves()
          .call
          .request(
            { from: symbol.LPAddress }, (error, result) => {
              countCallbacks += 1
              symbol.reserve0 = result[0]
              symbol.reserve1 = result[1]
              if (countCallbacks === (symbolsArray.length * NumOfBatches)) {
                resolve()
              }
            }
          )
      )
      batchReserves.add(
        LPContractsArray[index]
          .methods
          .totalSupply()
          .call
          .request(
            { from: symbol.LPAddress }, (error, result) => {
              countCallbacks += 1
              symbol.totalSupply = result
              if (countCallbacks === (symbolsArray.length * NumOfBatches)) {
                resolve()
              }
            }
          )
      )
      return null
    })
    batchReserves.execute();
  })

  await getReservesPromise()

  symbolsArray.forEach((symbol, index) => {
    if (symbol.token0Address === undefined) {
      return false
    }

    const a = new BigNumber(symbol.reserve0).multipliedBy(new BigNumber(symbol.token0Price))
    const b = new BigNumber(symbol.reserve1).multipliedBy(new BigNumber(symbol.token1Price))
    const add = a.plus(b)
    symbol.priceLP = add.dividedBy(new BigNumber(symbol.totalSupply))
  })
}

const calcAPR = async (activePoolsArray, LPContractsArray, symbolsArray) => {
  const Web3 = new web3(process.env.REACT_APP_NODE_URL);
  const url2 = new URL(process.env.REACT_APP_COINGECKO_CAKE_PRICE_URL)
  const batchBalanceOf = new Web3.BatchRequest()
  const fetchResponsePromise2 = await fetch(url2)
  const rewardTokenPrice = Object.values(JSON.parse(await fetchResponsePromise2.text())['pancakeswap-token'])[0]
  let countCallbacks = 0

  const balanceOfPromise = () => new Promise(resolve => {
    activePoolsArray.map((pool, index) => {
      batchBalanceOf.add(
        LPContractsArray[index]
          .methods
          .balanceOf(masterChefAddress)
          .call
          .request(
            {}, (error, result) => {
              if (symbolsArray[index].priceLP === undefined) {
                countCallbacks += 1
                symbolsArray[index].priceLP = 0
                return false
              }
              countCallbacks += 1
              const share = new BigNumber(pool.allocPoint).dividedBy(new BigNumber(pool.totalAllocPoint))
              const rewardPerBlock = new BigNumber(pool.rewardPerBlock).multipliedBy(new BigNumber(rewardTokenPrice))
              const totalstaked = new BigNumber(
                new BigNumber(result)
              ).multipliedBy(symbolsArray[index].priceLP) //tvl
              const rewardPerShare = rewardPerBlock.dividedBy(totalstaked)
              const apr = rewardPerShare.multipliedBy(process.env.REACT_APP_BLOCKS_PER_YEAR * 100)
              pool.apr = Math.round(apr * 100).toString() / 100
              symbolsArray[index].tvl = Math.round(
                symbolsArray[index]
                  .priceLP
                  .multipliedBy(
                    web3.utils.fromWei(result)
                  )
              ).toString()
              if (countCallbacks === (activePoolsArray.length)) {
                resolve()
              }
            }
          )
      )
      return null
    })
    batchBalanceOf.execute();
  })
  await balanceOfPromise()
}

const loadBlockchainData = async () => {
  const Web3 = new web3(process.env.REACT_APP_NODE_URL);
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
  const symbolsArray = await GetLPTokenSymbols(Web3, activePoolsArray, LPContractsArray)
  await coinGecko(symbolsArray, LPContractsArray)
  await calcTVL(symbolsArray, LPContractsArray)
  await calcAPR(activePoolsArray, LPContractsArray, symbolsArray)
  return [poolLength, activePoolsArray, symbolsArray]
}

export default loadBlockchainData