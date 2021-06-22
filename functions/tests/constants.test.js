const expect = require('chai').expect
const constants = require('../constants')

describe('constants', () => {

    describe('bitkub', () => {
        it('contains bitkub key', () => {
            expect(constants.BITKUB_KEY).exists
        })

        it('contains bitkub secret', () => {
            expect(constants.BITKUB_SECRET).exists
        })
    })


    describe('binance', () => {
        it('contains binance key', () => {
            expect(constants.BINANCE_KEY).exists
        })

        it('contains binance secret', () => {
            expect(constants.BINANCE_SECRET).exists
        })
    })

    describe('sheets', () => {
        it('contains service account', () => {
            expect(constants.SERVICE_ACCOUNT).exists
        })

        it('contains sheet ID', () => {
            expect(constants.SHEET_ID).exists
        })
    })
})