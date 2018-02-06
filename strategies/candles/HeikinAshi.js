/*
 * Heikin Ashi Candles
 * @link: https://www.investopedia.com/articles/technical/04/092204.asp
 */

const math = require('mathjs');

var HACandle = {};

var prevclose = 0;
var prevopen = 0;
var result = {
    xclose: 0,
    xopen: 0,
    xhigh: 0,
    xlow: 0,
    xcloseprev: 0,
    xopenprev: 0
};

HACandle.calcHACandle = function(candle) {

    prevclose = result.xclose;
    prevopen = result.xopen;

    // Calculate new Heikin-Ashi candles
    result.xclose = (candle.open + candle.close + candle.high + candle.low) / 4;
    // xOpen = [xOpen(Previous Bar) + xClose(Previous Bar)]/2
    result.xopen = (prevopen + prevclose) / 2;
    // xHigh = Max(High, xOpen, xClose)
    result.xhigh = math.max(candle.high, result.xopen, result.xclose);
    // xLow = Min(Low, xOpen, xClose)
    result.xlow = math.min(candle.low, result.xopen, result.xclose);

    result.xcloseprev = prevclose;
    result.xopenprev = prevopen;

    return result;
}

module.exports = HACandle;
