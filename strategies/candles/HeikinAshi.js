/*
 * Heikin Ashi Candles
 */

const math = require('mathjs');

var HACandle = {};

var xcloseprev = 0;
var xopenprev = 0;
var result = {
    xclose: 0,
    xopen: 0,
    xhigh: 0,
    xlow: 0
};

HACandle.calcHACandle = function(candle) {

    xcloseprev = result.xclose;
    xopenprev = result.xopen;

    // Calculate new Heikin-Ashi candles
    result.xclose = (candle.open + candle.close + candle.high + candle.low) / 4;
    // xOpen = [xOpen(Previous Bar) + xClose(Previous Bar)]/2
    result.xopen = (xopenprev + xcloseprev) / 2;
    // xHigh = Max(High, xOpen, xClose)
    result.xhigh = math.max(candle.high, result.xopen, result.xclose);
    // xLow = Min(Low, xOpen, xClose)
    result.xlow = math.min(candle.low, result.xopen, result.xclose);

    return result;
}





module.exports = HACandle;
