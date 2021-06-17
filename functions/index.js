require('dotenv').config()
const cors = require('cors')
const moment = require('moment')
const morgan = require('morgan')
const helmet = require('helmet')
const Bitkub = require('bitkub')
const express = require('express')
const admin = require('firebase-admin')
const functions = require("firebase-functions")
const sheets = require('array-to-google-sheets')
const Binance = require('binance-api-node').default

// Admin
admin.initializeApp();
const realtime = admin.database()

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


async function updateSheets () {
    // Google sheets
    const excel = new sheets.ArrayToGoogleSheets({ keyFilename: './serviceAccount.json' })
    const spreadsheet = await excel.getSpreadsheet("1m47rv54M4OJwezVeXTJmnDvOSL6ydgz7RF3YtjYP_o4");
    const defaultCols = [
        'Date',
        'Time',
        'Coin',
        'Order',
        'Size',
        'Price',
        'Fee',
    ]
    const binance = [defaultCols]
    const bitkub = [defaultCols]

    // Get trades on binance
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

    await spreadsheet.updateSheet("Binance_Main", binance);
    await spreadsheet.updateSheet("Bitkub_Main", bitkub);

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

async function tradesBinance (sym) {
    return clientBinance.myTrades({
        symbol: sym
    })
        .then(trades => {
            return trades
                .map(trade => {
                    return {
                        date: moment(trade.time).format('MM/DD/yyyy'),
                        time: moment(trade.time).format('HH:mm:ss A'),
                        coin: sym,
                        order: trade.isBuyer ? 'BUY' : 'SELL',
                        size: trade.qty,
                        price: parseFloat(trade.price).toFixed(2),
                        fee: parseFloat(trade.commission).toFixed(2)
                    }
                })
        })
}

async function tradesBitkub (sym) {
    return clientBitkub.my_order_history({ sym: sym })
        .then(results => {
            return results.result
                .map(trade => {
                    return {
                        date: moment(trade.date, 'YYYY-MM-DD HH:mm:ss').format('MM/DD/YYYY'),
                        time: moment(trade.date, 'YYYY-MM-DD HH:mm:ss').format('HH:mm:ss A'),
                        coin: sym,
                        order: trade.side === 'sell' ? 'SELL' : 'BUY',
                        size: trade.amount,
                        price: parseFloat(trade.rate).toFixed(2),
                        fee: parseFloat(trade.fee).toFixed(2)
                    }
                })
        })
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

exports.api = functions.https.onRequest(app);
exports.update_sheet = functions
    .pubsub
    .schedule('every 1 minute')
    .onRun(async () => {
        console.log('updating sheets')
        await updateSheets()
    })

