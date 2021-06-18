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

// Timezone
moment.tz.setDefault('Asia/Ho_Chi_Minh')

// Binance client
const clientBinance = new Binance({
    apiKey: process.env.BINANCE_KEY,
    apiSecret: process.env.BINANCE_SECRET
})

// Bitkub client
const clientBitkub = new Bitkub({
    api_key: process.env.BITKUB_KEY,
    api_secret: process.env.BITKUB_SECRET,
})


// Setup
const app = express()

// Plugins
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

function sortByDate (arr) {
    return arr.sort(function compare (a, b) {
        var dateA = moment(`${a[0]} ${a[1]}`, 'DD/MM/YYYY HH:mm:ss A');
        var dateB = moment(`${b[0]} ${b[1]}`, 'DD/MM/YYYY HH:mm:ss A');
        return dateA - dateB;
    })
}


async function updateSheets () {
    // Google sheets

    console.log('getting-sheets')
    const excel = new sheets.ArrayToGoogleSheets({ keyFilename: './serviceAccount.json' })
    const spreadsheet = await excel.getSpreadsheet("1m47rv54M4OJwezVeXTJmnDvOSL6ydgz7RF3YtjYP_o4");

    // trading
    const defaultCols = [
        'Date',
        'Time',
        'Coin',
        'Order',
        'Size',
        'Price',
        'Fee',
    ]

    // earnings
    const futureCols = [
        'Date',
        'Time',
        'Type',
        'Asset',
        'Amount'
    ]

    // const spreadsheetBinancepnl = []
    // const spreadsheetBinance = []
    // const spreadsheetBitkub = []
    // const spreadsheetWallet = []

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
            defaultCols.forEach(dc => {
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
            futureCols.forEach(dc => {
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
            defaultCols.forEach(dc => {
                arr.push(d[dc.toLowerCase()])
            })
            bitkub.push(arr)
        })
    }

    console.log('updating-sheets')
    await spreadsheet.updateSheet("Binance_Main", [defaultCols, ...sortByDate(binance)]);
    await spreadsheet.updateSheet("Bitkub_Main", [defaultCols, ...sortByDate(bitkub)]);
    await spreadsheet.updateSheet("Binance_PNL", [futureCols, ...sortByDate(binancepnl)]);
    console.log('updated-sheets')
}

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

async function tradesBinanceFuture (sym) {
    return clientBinance.futuresIncome({ symbol: sym })
        .then(trades => {
            console.log(trades)
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

async function tradesBitkub (sym) {
    const ids = []
    const trades = []
    let page = 0
    let maxPage = 1
    while (page != maxPage) {
        await clientBitkub.my_order_history({ sym: sym, p: page })
            .then(results => {
                maxPage = results.pagination.last + 1
                results.result
                    .forEach(trade => {
                        if (!ids.includes(trade.order_id)) {
                            trades.push({
                                date: moment(trade.date, 'YYYY-MM-DD HH:mm:ss').format('DD/MM/YYYY'),
                                time: moment(trade.date, 'YYYY-MM-DD HH:mm:ss').format('HH:mm:ss A'),
                                coin: sym,
                                order: trade.side === 'sell' ? 'SELL' : 'BUY',
                                size: trade.amount,
                                price: trade.rate,
                                fee: trade.fee,
                                unix: trade.ts
                            })
                            ids.push(trade.order_id)
                        }
                    })
                page += 1
            })
    }
    return trades
}

async function symsBinanceGet () {
    const excel = new sheets.ArrayToGoogleSheets({ keyFilename: './serviceAccount.json' })
    const spreadsheet = await excel.getSpreadsheet("1m47rv54M4OJwezVeXTJmnDvOSL6ydgz7RF3YtjYP_o4");
    const sheet = await spreadsheet.findOrCreateSheet("Symbols");
    const objects = await sheet.exportAsObjectSheet()
    return objects.rawValues.map((i, idx) => idx > 0 ? i[0] : '').filter(i => i != '')
}

async function symsBitkubGet () {
    const excel = new sheets.ArrayToGoogleSheets({ keyFilename: './serviceAccount.json' })
    const spreadsheet = await excel.getSpreadsheet("1m47rv54M4OJwezVeXTJmnDvOSL6ydgz7RF3YtjYP_o4");
    const sheet = await spreadsheet.findOrCreateSheet("Symbols");
    const objects = await sheet.exportAsObjectSheet()
    return objects.rawValues.map((i, idx) => idx > 0 ? i[1] : '').filter(i => i != '')
}

async function walletBitkub () {
    return clientBitkub.wallet()
        .then(res => {
            return res.result.THB
        })
}

async function walletBinance () {
    return await clientBinance.accountCoins()
        .then(coins => {
            const usdt = coins.find(coin => coin.coin === 'USDT')
            return usdt.free
        })
}

async function updateSheetWallet () {
    const excel = new sheets.ArrayToGoogleSheets({ keyFilename: './serviceAccount.json' })
    const spreadsheet = await excel.getSpreadsheet("1m47rv54M4OJwezVeXTJmnDvOSL6ydgz7RF3YtjYP_o4");
    const spreadsheetWallet = await spreadsheet.findSheet('Balance').getValues()
    console.log(spreadsheetWallet)
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

exports.api = functions.https.onRequest(app);
exports.update_sheet = functions
    .pubsub
    .schedule('every 1 minutes')
    .onRun(async () => {
        await updateSheets()
        await updateSheetWallet()
    })

