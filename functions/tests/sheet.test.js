const expect = require('chai').expect
const sheets = require('../container/sheets')

describe('sheets', () => {
    describe('get', () => {
        describe('  ', () => {
            it('returns bitkub defined symbols', async () => {
                const result = await sheets.get.bitkubSymbols()
                expect(result).to.have.length.above(0)
            })
        })

        describe('binanceSymbols', () => {
            it('returns binance defined symbols', async () => {
                const result = await sheets.get.binanceSymbols()
                expect(result).to.have.length.above(0)
            })
        })
    })

    describe('update', () => {
        it('updates balance sheet', async () => {
            const [currentValues, newValue] = await sheets.update.balance()
            expect(currentValues).to.include(newValue)
        })

        it('updates binance main', async () => {
            const [currentValues, newValues] = await sheets.update.binanceMain()
            newValues.forEach(newValue => expect(currentValues).to.include(newValue))
        })

        it('updates binance pnl', async () => {
            const [currentValues, newValues] = await sheets.update.binancePNL()
            newValues.forEach(newValue => expect(currentValues).to.include(newValue))
        })

        it('updates bitkub main', async () => {
            const [currentValues, newValues] = await sheets.update.bitkubMain()
            newValues.forEach(newValue => expect(currentValues).to.include(newValue))
        })
    })
})