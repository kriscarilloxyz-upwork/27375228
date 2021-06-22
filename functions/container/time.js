const moment = require('moment-timezone')
moment.tz.setDefault('Asia/Ho_Chi_Minh')

/**
 * Convert timestamp to DD/MM/yyyy
 *
 * @param {String} timestamp unix
 * @return {String}  DD/MM/yyyy
 */
function localDate (timestamp) {
    const format = 'DD/MM/yyyy'
    return moment(timestamp).format(format)
}

/**
 * Convert timestamp to HH:mm:ss
 *
 * @param {String} timestamp unix
 * @return {String} HH:mm:ss
 */
function localTime (timestamp) {
    const format = 'HH:mm:ss'
    return moment(timestamp).format(format)
}

/**
 * Sort array by date
 *
 * @param {Array} arr array of objects in sheets
 * @return {Array} sorted array by date from oldest to newest 
 */
function sortByDate (arr) {
    return arr.sort(function compare (a, b) {
        var dateA = moment(`${a[1]} ${a[2]}`, 'DD/MM/YYYY HH:mm:ss A').unix();
        var dateB = moment(`${b[1]} ${b[2]}`, 'DD/MM/YYYY HH:mm:ss A').unix();
        return dateA - dateB;
    })
}

module.exports = {
    moment,
    localDate,
    localTime,
    sortByDate,
}