const Bitkub = require('bitkub')
const { localDate, localTime } = require('./time')
const { BITKUB_KEY, BITKUB_SECRET } = require('../constants')

/** @type {Object} client to to interact with bitkub */
const client = new Bitkub({
    api_key: BITKUB_KEY,
    api_secret: BITKUB_SECRET,
})

/**
 * Return trades from bitkub by symbol
 *
 * @param {*} sym token symbol
 * @return {*} list of trades made within the account
 */
async function trades (sym) {
    /** @type {Number} starting page */
    let page = 0

    /** @type {Number} ending page */
    let maxPage = 1

    /** @type {Array} collection of trades ids */
    const ids = []

    /** @type {Array} collection of trades */
    const trades = []

    // if current page is not equal to max page of trade pagination
    while (page != maxPage) {
        // request for the trades and pass sym: symbol p: page
        await client.my_order_history({ sym: sym, p: page })
            .then(results => {
                // replace max page to result's last pagination page
                maxPage = results.pagination.last + 1

                //  for each trade
                results.result
                    .forEach(trade => {
                        // if trade is not in ids and not processed
                        if (!ids.includes(trade.txn_id)) {
                            // push trade to trades collection
                            trades.push({ // data to show in sheets
                                // ! ID should always be first
                                ID: trade.txn_id,
                                Date: localDate(trade.date),
                                Time: localTime(trade.time),
                                Coin: sym,
                                Order: trade.side === 'sell' ? 'SELL' : 'BUY',
                                Size: parseFloat(trade.amount),
                                Price: parseFloat(trade.rate),
                                Fee: parseFloat(trade.fee),
                                Maker: trade.is_maker ? 'Yes' : 'No',
                            })
                            // push to already processed trades
                            ids.push(trade.txn_id)
                        }
                    })

                // go to next page
                page += 1
            })
    }
    return trades
}

/**
 * Returns balance in account by type
 *
 * @param {String} type type of balance
 * @return {Number} total balanace in THB
 * @example bitkub.balance('THB')
 */
async function balance (type) {
    return client.wallet()
        .then(res => {
            return res.result.THB
        })
}

module.exports = {
    trades,
    balance
}