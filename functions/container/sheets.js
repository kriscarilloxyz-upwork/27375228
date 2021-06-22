const time = require('./time')
const bitkub = require('./bitkub')
const binance = require('./binance')
const { SHEET_ID } = require('../constants')
const GoogleSheets = require('array-to-google-sheets')
const GoogleExcel = new GoogleSheets.ArrayToGoogleSheets({
    keyFilename: './constants/serviceAccount.json'
})


/**
 * Get client by defined SHEET_ID in environment
 *
 * @return {GoogleSheets} client to interact with google sheet 
 */
async function client () {
    return GoogleExcel.getSpreadsheet(SHEET_ID)
}

/**
 *
 *
 * @return {*} 
 */
async function bitkubMain () {
    const c = await client()
    const symbols = await bitkubSymbols()

    const [headers, currentValues] = await c.findSheet('Bitkub_Main').exportAsObjectSheet()
        .then(objs => [objs.rawHeaders, objs.rawValues])

    currentValues.shift()

    for (let symbol of symbols) {
        const result = await bitkub.trades(symbol)
        result.forEach(res => {
            const nVal = Object.values(res)
            if (!currentValues.map(cv => cv[0]).includes(nVal[0])) currentValues.push(nVal)
        })
    }


    const updatedValues = [headers, ...time.sortByDate(currentValues)]
    await c.updateSheet('Bitkub_Main', updatedValues)
    return [[headers, ...currentValues], updatedValues]
}

/**
 * Returns defined symbols in sheet to watch in bitkub
 *
 * @return {Array} symbols to watch for bitkub 
 */
async function bitkubSymbols () {
    const c = await client()
    return c.findOrCreateSheet('Symbols')
        .then(sheet => sheet.exportAsObjectSheet())
        .then(objects => objects.rawValues.map((i, idx) => idx > 0 ? i[1] : '').filter(i => i != ''))
}

/**
 * Updates binance main sheet
 *
 * @return {Array} updated sheet values
 */
async function binanceMain () {
    const c = await client()
    const symbols = await binanceSymbols()

    const [headers, currentValues] = await c.findSheet('Binance_Main').exportAsObjectSheet()
        .then(objs => [objs.rawHeaders, objs.rawValues])

    currentValues.shift()

    for (let symbol of symbols) {
        const result = await binance.trades(symbol)
        result.forEach(res => {
            const nVal = Object.values(res)
            if (!currentValues.map(cv => cv[0]).includes(nVal[0])) currentValues.push(nVal)
        })
    }


    const updatedValues = [headers, ...time.sortByDate(currentValues)]
    await c.updateSheet('Binance_Main', updatedValues)
    return [[headers, ...currentValues], updatedValues]
}


/**
 *
 *
 * @param {*} trades
 * @return {*} 
 */
async function binancePNL () {
    const c = await client()
    const symbols = await binanceSymbols()

    const [headers, currentValues] = await c.findSheet('Binance_PNL').exportAsObjectSheet()
        .then(objs => [objs.rawHeaders, objs.rawValues])

    currentValues.shift()

    for (let symbol of symbols) {
        const result = await binance.pnl(symbol)
        result.forEach(res => {
            const nVal = Object.values(res)
            if (!currentValues.map(cv => cv[0]).includes(nVal[0])) currentValues.push(nVal)
        })
    }


    const updatedValues = [headers, ...time.sortByDate(currentValues)]
    await c.updateSheet('Binance_PNL', updatedValues)
    return [[headers, ...currentValues], updatedValues]
}


/**
 *
 *
 * @param {*} amount
 * @return {*} 
 */
async function balance (amount) {
    const c = await client()
    const date = time.localDate(time.moment())
    const currentValues = await c.findSheet('Balance').getValues()
    const bitkubValue = await bitkub.balance('THB')
    const binanceValue = await binance.balance('USDT')
    const newValue = [date, bitkubValue, binanceValue]

    if (!currentValues.map(i => i[0]).includes(newValue[0])) currentValues.push(newValue)
    else currentValues[currentValues.length - 1] = newValue

    await c.updateSheet('Balance', currentValues)
    return [currentValues, newValue]
}

/**
 * Returns defined symbols in sheet to watch in bitkub
 *
 * @return {Array} symbols to watch for bitkub
 */
async function binanceSymbols () {
    const c = await client()
    return c.findOrCreateSheet('Symbols')
        .then(sheet => sheet.exportAsObjectSheet())
        .then(objects => objects.rawValues.map((i, idx) => idx > 0 ? i[0] : '').filter(i => i != ''))
}

module.exports = {
    update: {
        bitkubMain,
        binanceMain,
        binancePNL,
        balance
    },

    get: {
        binanceSymbols,
        bitkubSymbols
    }
}