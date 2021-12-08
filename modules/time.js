const moment = require('moment-timezone');
require('moment-countdown');

exports.now = () => {
    return moment().tz("Asia/Tomsk").format('[[Date: ]DD.MM.YYYY, [Time: ]HH:mm:ss:SSS[]]');
};

exports.nowTimestamp = () => {
    return moment().unix();
};

exports.dateTimestamp = date => {
    return moment(date).unix();
};

exports.addToDate = (date, value, units) => {
    return moment(date).add(value, units);
};

exports.addToDateTimestamp = (date, value, units) => {
    return moment(date).add(value, units).unix();
};

exports.to = time => { // '2017-11-09'
    return moment(time).countdown();
};

exports.from = time => {
    let diff = moment().diff(moment(time));
    let duration = moment.duration(diff);
    return {
        years: duration.years(),
        months: duration.months(),
        days: duration.days(),
        hours: duration.hours(),
        minutes: duration.minutes(),
        seconds: duration.seconds()
    }
};