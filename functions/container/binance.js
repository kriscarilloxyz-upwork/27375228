const Binance = require('binance-api-node').default
const { localDate, localTime } = require('./time')
const { BINANCE_KEY, BINANCE_SECRET } = require('../constants')

/** @type {Binance} client to interact with binance */
const client = new Binance({
    apiKey: BINANCE_KEY,
    apiSecret: BINANCE_SECRET
})

/**
 * Returns future trades from binance by symbol
 *
 * @param {String} symbol coin symbol
 * @return {Array} list of trades 
 */
async function trades (symbol) {
    return client.futuresUserTrades({
        symbol: symbol
    })
        .then(trades => trades
            .map(trade => {
                return {
                    // ! ID should always be first
                    ID: trade.id,
                    Date: localDate(trade.time),
                    Time: localTime(trade.time),
                    Coin: symbol,
                    Order: trade.side === 'BUY' ? 'BUY' : 'SELL',
                    Size: parseFloat(trade.qty),
                    Price: parseFloat(trade.price),
                    Fee: parseFloat(trade.commission),
                }
            }))
}

/**
 * Returns future income from binance by symbol
 *
 * @param {String} symbol coin symbol
 * @return {Array} list of future income
 */
async function pnl (symbol) {
    return client.futuresIncome({ symbol: symbol })
        .then(trades => trades
            .map(trade => {
                return {
                    // ! ID should always be first
                    ID: trade.tranId,
                    Date: localDate(trade.time),
                    Time: localTime(trade.time),
                    Type: trade.incomeType,
                    Asset: trade.symbol,
                    Amount: trade.income
                }
            }))
}


/**
 * Returns current balance from binance by symbol
 *
 * @param {String} symbol coin symbol
 * @return {Number} amount of available free balance  
 */
async function balance (symbol) {
    return await client.accountCoins()
        .then(coins => {
            const free = coins.find(coin => coin.coin === symbol).free
            return parseFloat(free) || 0
        })
}


module.exports = {
    trades,
    pnl,
    balance
}