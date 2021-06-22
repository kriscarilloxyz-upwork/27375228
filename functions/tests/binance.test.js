const expect = require('chai').expect
const binance = require('../container/binance')

describe('binance', () => {
    const SYMBOL = 'BTCUSDT'

    describe('trades', () => {
        it('returns trades by symbol', async () => {
            const result = await binance.trades(SYMBOL)
            expect(result).to.have.length.above(0)
        })
    })

    describe('pnl', () => {
        it('returns trades by symbol', async () => {
            const result = await binance.pnl(SYMBOL)
            expect(result).to.have.length.above(0)
        })
    })

    describe('balance', () => {
        it('returns balance in USDT', async () => {
            const result = await binance.balance('USDT')
            expect(result).to.be.above(0)
        })
    })
})