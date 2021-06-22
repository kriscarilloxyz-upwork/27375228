const moment = require('moment')
const expect = require('chai').expect
const time = require('../container/time')

describe('time', () => {
    const now = moment.unix()

    it('timezone is set to Asia/Ho_Chi_Minh', () => {
        const offset = time.moment().format('Z')
        expect(offset).equal('+07:00')
    })

    describe('localDate', () => {
        it('converts timestamp to DD/MM/yyyy', () => {
            expect(time.localDate(now)).equal(moment(now).format('DD/MM/yyyy'))
        })
    })

    describe('localTime', () => {
        it('converts timestamp to HH:mm:ss', () => {
            expect(time.localTime(now)).equal(moment(now).format('HH:mm:ss'))
        })
    })

    describe('sortByDate', () => {
        it('sorts date from oldest to newest', () => {
            const sorted = time.sortByDate([
                [5, 6],
                [1, 2],
                [3, 4]
            ])

            expect(sorted[0].join(' ')).equal('1 2')
            expect(sorted[1].join(' ')).equal('3 4')
            expect(sorted[2].join(' ')).equal('5 6')
        })
    })

})