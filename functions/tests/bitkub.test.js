const expect = require('chai').expect
const bitkub = require('../container/bitkub')

describe('bitkub', () => {
    const SYMBOL = 'THB_USDT'

    describe('trades', () => {
        it('returns trades by symbol', async () => {
            const result = await bitkub.trades(SYMBOL)
            expect(result).to.have.length.above(0)
        })
    })

    describe('balance', () => {
        it('returns balance in THB', async () => {
            const result = await bitkub.balance('THB')
            expect(result).to.be.above(0)
        })
    })
})