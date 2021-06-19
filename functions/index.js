require('dotenv').config()
const cors = require('cors')
const morgan = require('morgan')
const helmet = require('helmet')
const Bitkub = require('bitkub')
const express = require('express')
const moment = require('moment-timezone')
const functions = require("firebase-functions")
const sheets = require('array-to-google-sheets')
const Binance = require('binance-api-node').default

// Sets the timezone
moment.tz.setDefault('Asia/Ho_Chi_Minh')


/** @type {Object} client to interact with binance */
const clientBinance = new Binance({
    apiKey: process.env.BINANCE_KEY,
    apiSecret: process.env.BINANCE_SECRET
})

/** @type {Object} client to to interact with bitkub */
const clientBitkub = new Bitkub({
    api_key: process.env.BITKUB_KEY,
    api_secret: process.env.BITKUB_SECRET,
})

/**
 * Simple sorting function for dates
 *
 * @param {Array} arr array of objects in sheets
 * @return {Array} sorted array by date from oldest to newest 
 */
function sortByDate (arr) {
    return arr.sort(function compare (a, b) {
        var dateA = moment(`${a[0]} ${a[1]}`, 'DD/MM/YYYY HH:mm:ss A');
        var dateB = moment(`${b[0]} ${b[1]}`, 'DD/MM/YYYY HH:mm:ss A');
        return dateA - dateB;
    })
}


async function refreshTradeSheet () {


    /** @type {Sheet} Google sheet*/
    const excel = new sheets.ArrayToGoogleSheets({ keyFilename: './serviceAccount.json' })
    const spreadsheet = await excel.getSpreadsheet("1m47rv54M4OJwezVeXTJmnDvOSL6ydgz7RF3YtjYP_o4");

    const binanceCols = [
        'Date',
        'Time',
        'Coin',
        'Order',
        'Size',
        'Price',
        'Fee',
    ]

    const bitkubCols = [
        'Date',
        'Time',
        'Coin',
        'Order',
        'Size',
        'Price',
        'Fee',
        'Maker'
    ]

    const pnlCols = [
        'Date',
        'Time',
        'Type',
        'Asset',
        'Amount'
    ]

    const binancepnl = []
    const binance = []
    const bitkub = []

    console.log('get future trades on binance')
    // get future trades on binance
    const symBinance = await symsBinanceGet()
    for (let sym of symBinance) {
        const data = await tradesBinance(sym)
        data.forEach(d => {
            const arr = []
            binanceCols.forEach(dc => {
                arr.push(d[dc.toLowerCase()])
            })
            binance.push(arr)
        })
    }

    console.log('get binance PNL')
    // get binance PNL
    for (let sym of symBinance) {
        const data = await tradesBinanceFuture(sym)
        data.forEach(d => {
            const arr = []
            pnlCols.forEach(dc => {
                arr.push(d[dc.toLowerCase()])
            })
            binancepnl.push(arr)
        })
    }
    console.log('get trades on bitkub')
    // Get trades on bitkub
    const symBitkub = await symsBitkubGet()
    for (let sym of symBitkub) {
        const data = await tradesBitkub(sym)
        data.forEach(d => {
            const arr = []
            bitkubCols.forEach(dc => {
                arr.push(d[dc.toLowerCase()])
            })
            bitkub.push(arr)
        })
    }

    console.log('updating-sheets')
    await spreadsheet.updateSheet("Binance_Main", [binanceCols, ...sortByDate(binance)])
    await spreadsheet.updateSheet("Bitkub_Main", [bitkubCols, ...sortByDate(bitkub)])
    await spreadsheet.updateSheet("Binance_PNL", [pnlCols, ...sortByDate(binancepnl)])
    console.log('updated-sheets')
}

refreshTradeSheet()

async function tradesBinanceFuture (sym) {
    return clientBinance.futuresIncome({ symbol: sym })
        .then(trades => {
            return trades
                .map(trade => {
                    return {
                        date: moment(trade.time).format('DD/MM/yyyy'),
                        time: moment(trade.time).format('HH:mm:ss A'),
                        type: trade.incomeType,
                        asset: trade.symbol,
                        amount: trade.income,
                        unix: trade.time
                    }
                })
        })
}


async function tradesBinance (sym) {
    return clientBinance.futuresUserTrades({
        symbol: sym
    })
        .then(trades => {
            return trades
                .map(trade => {
                    return {
                        date: moment(trade.time).format('DD/MM/yyyy'),
                        time: moment(trade.time).format('HH:mm:ss A'),
                        coin: sym,
                        order: trade.isBuyer ? 'BUY' : 'SELL',
                        size: trade.qty,
                        price: trade.price,
                        fee: trade.commission,
                        unix: trade.time
                    }
                })
        })
}

/**
 * Return trade history on bitkub
 *
 * @param {String} sym symbol name
 * @return {Array} list of trades 
 */
async function tradesBitkub (sym) {
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
        await clientBitkub.my_order_history({ sym: sym, p: page })
            .then(results => {
                // replace max page to result's last pagination page
                maxPage = results.pagination.last + 1

                //  for each trade
                results.result
                    .forEach(trade => {
                        // if trade is not in ids and not processed
                        if (!ids.includes(trade.order_id)) {
                            // push trade to trades collection
                            trades.push({ // data to show in sheets
                                // transform date to DD/MM/YYYY format
                                date: moment(trade.date, 'YYYY-MM-DD HH:mm:ss').format('DD/MM/YYYY'),
                                // transform date to HH:mm:ss A
                                time: moment(trade.date, 'YYYY-MM-DD HH:mm:ss').format('HH:mm:ss A'),
                                // display coin
                                coin: sym,
                                // display order : if trade.side SELL if not BUY
                                order: trade.side === 'sell' ? 'SELL' : 'BUY',
                                // display trade asize
                                size: trade.amount,
                                // display trade  price
                                price: trade.rate,
                                // display fee
                                fee: trade.fee,
                                // display is_maker
                                maker: trade.is_maker ? 'Yes' : 'No',
                                // timestamp
                                unix: trade.ts
                            })
                            // push to already processed trades
                            ids.push(trade.order_id)
                        }
                    })
                // increase page to + 1 
                page += 1
            })
    }
    // return trades collection
    return trades
}

/**
 *
 *
 * @return {*} 
 */
async function symsBinanceGet () {
    const excel = new sheets.ArrayToGoogleSheets({ keyFilename: './serviceAccount.json' })
    const spreadsheet = await excel.getSpreadsheet("1m47rv54M4OJwezVeXTJmnDvOSL6ydgz7RF3YtjYP_o4");
    const sheet = await spreadsheet.findOrCreateSheet("Symbols");
    const objects = await sheet.exportAsObjectSheet()
    return objects.rawValues.map((i, idx) => idx > 0 ? i[0] : '').filter(i => i != '')
}

/**
 *
 *
 * @return {*} 
 */
async function symsBitkubGet () {
    const excel = new sheets.ArrayToGoogleSheets({ keyFilename: './serviceAccount.json' })
    const spreadsheet = await excel.getSpreadsheet("1m47rv54M4OJwezVeXTJmnDvOSL6ydgz7RF3YtjYP_o4");
    const sheet = await spreadsheet.findOrCreateSheet("Symbols");
    const objects = await sheet.exportAsObjectSheet()
    return objects.rawValues.map((i, idx) => idx > 0 ? i[1] : '').filter(i => i != '')
}

/**
 *
 *
 * @return {*} 
 */
async function walletBitkub () {
    return clientBitkub.wallet()
        .then(res => {
            return res.result.THB
        })
}

/**
 *
 *
 * @return {*} 
 */
async function walletBinance () {
    return await clientBinance.accountCoins()
        .then(coins => {
            const usdt = coins.find(coin => coin.coin === 'USDT')
            return usdt.free
        })
}

/**
 * 
 *
 */
async function updateSheetWallet () {
    const excel = new sheets.ArrayToGoogleSheets({ keyFilename: './serviceAccount.json' })
    const spreadsheet = await excel.getSpreadsheet("1m47rv54M4OJwezVeXTJmnDvOSL6ydgz7RF3YtjYP_o4");
    const spreadsheetWallet = await spreadsheet.findSheet('Balance').getValues()
    // Current data
    const date = moment().format('DD/MM/yyyy')
    const bitkub = await walletBitkub()
    const binance = await walletBinance()
    const data = [date, bitkub, binance]
    const dataOld = spreadsheetWallet.find(da => da[0] === data[0])

    if (dataOld) {
        dataOld[1] = bitkub
        dataOld[2] = binance
        spreadsheetWallet.pop()
        spreadsheetWallet.push(dataOld)
    }
    spreadsheet.updateSheet('Balance', spreadsheetWallet)
}


/** @type {Object} scheduled function that updates the sheet */
exports.update_sheet = functions
    .pubsub
    // change the line below to modify schedule
    // do not go over under a minute
    .schedule('every 1 minutes')
    .onRun(async () => {
        // update the sheet for trades
        await refreshTradeSheet()
        // update the balance
        await updateSheetWallet()
    })


/**
* Creates an API that interacts with your accounts
* 
* @return {Express} app 
*/
// eslint-disable-next-line no-unused-vars
function createApi () {
    /** @type {Express} API */
    const app = express()

    // Logging
    app.use(morgan('tiny'))
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))

    // Security
    app.use(helmet())
    app.disable('x-powered-by')

    app.use(cors({
        credentials: true,
        origin: process.env.NODE_ENV === 'production' ? ['https://upw-27375228.web.app', ' https://upw-27375228.firebaseapp.com'] : true
    }))

    app.post('/trades', async (req, res) => {
        try {
            const { email } = req.body.auth
            const auths = process.env.AUTH.split(',')
            if (!auths.includes(email)) throw new Error('Unauthorized')
            const trades = []

            // Get trades on binance
            const symBinance = await symsBinanceGet()
            for (let sym of symBinance) {
                const data = await tradesBinance(sym)
                data.forEach(d => trades.push(d))
            }

            // Get trades on bitkub
            const symBitkub = await symsBitkubGet()
            for (let sym of symBitkub) {
                const data = await tradesBitkub(sym)
                data.forEach(d => trades.push(d))
            }
            res.send(trades)

        } catch (error) {
            console.log(error)
            res.sendStatus(401)
        }
    })
    return app
}

/** @type {Object} handles API requests */
// Uncomment below if needed 
// exports.api = functions.https.onRequest(createApi());
