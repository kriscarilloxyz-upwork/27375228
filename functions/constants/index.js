require('dotenv').config()

module.exports = {
    BITKUB_KEY: process.env.BITKUB_KEY,
    BITKUB_SECRET: process.env.BITKUB_SECRET,

    BINANCE_KEY: process.env.BINANCE_KEY,
    BINANCE_SECRET: process.env.BINANCE_SECRET,

    SERVICE_ACCOUNT: require('./serviceAccount.json'),
    SHEET_ID: process.env.SHEET_ID
}