const sheets = require('./container/sheets')
exports.update = functions
    .pubsub
    // change the line below to modify schedule
    // do not go below 1 minute
    // default 2 minutes to allow sheets and platforms to breathe
    .schedule('every 2 minutes')
    .onRun(async () => {
        await sheets.update.balance()
        await sheets.update.bitkubMain()
        await sheets.update.binanceMain()
        await sheets.update.binancePNL()
    })