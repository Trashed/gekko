// Vervoort Heikin Ashi Candlestick Oscillator
//
// link: https://www.tradingview.com/script/UyhY8FuQ-Vervoort-Heiken-Ashi-Candlestick-Oscillator/

var log = require('../core/log');
var hac = require('./candles/HeikinAshi.js');
var tulind = require('tulind');

// Let's create our own strat
var strat = {};

// Candles array for storing custom candle data (Heikin Ashi)
var HAOpenCandles = [];
var HACloseCandles = [];
var MidPoints = []; // Refered as 'hl2' in TradingView

// Helper arrays for calculating ZLEMAs
var UpTMA1Array = [];
var UpTMA2Array = [];
var UpTMA12Array = [];
var UpTMA22Array = [];
var DownTMA1Array = [];
var DownTMA2Array = [];
var DownTMA12Array = [];
var DownTMA22Array = [];

// Helper variables
var avgUp = 0;
var avgDown = 0;
var closePrev = 0;
var lowPrev = 0;
var highPrev = 0;
var upKeepingPrev = undefined;
var upKeepAllPrev = undefined;
var downKeepingPrev = undefined;
var downKeepAllPrev = undefined;
var uptrendPrev = undefined;
var downtrendPrev = undefined;

// Prepare everything our method needs
strat.init = function() {

    this.requiredHistory = this.tradingAdvisor.historySize;

    avgUp = this.settings.avgUp;
    avgDown = this.settings.avgDown;

    console.log('\tsettings: ', this.settings);

    this.oscillator = 0;
    this.prevOsc = 0;

    this.adviced = false;
}

// What happens on every new candle?
strat.update = function(candle) {

    // console.log("candle: ", candle);

    // Get a Heikin Ashi candle
    var haCandle = hac.calcHACandle(candle);
    // console.log('haCandle: ', haCandle);
    var haOpen = haCandle.xopen;
    var haClose = haCandle.xclose;
    var haOpenPrev = haCandle.xopenprev;
    var haClosePrev = haCandle.xcloseprev;
    HAOpenCandles.push(haOpen);
    console.log("HAOpenCandles - length: ", HAOpenCandles.length);
    HACloseCandles.push(haClose);
    // console.log('HAOpenCandles: ', HAOpenCandles);
    // console.log('HACloseCandles: ', HACloseCandles);

    // ================================
    // Calculations for the uptrend.
    var upTMA1 = calcZlema(HACloseCandles, avgUp);
    UpTMA1Array.push(upTMA1);
    // console.log('UpTMA1Array: ', UpTMA1Array);
    var upTMA2 = calcZlema(UpTMA1Array, avgUp);
    UpTMA2Array.push(upTMA2);
    // console.log("upTMA2: ", upTMA2);

    var upDiff = upTMA1 - upTMA2;
    var upZlHA = upTMA1 + upDiff;

    var midp = midpoint(candle);
    MidPoints.push(midp);
    // console.log('MidPoints: ', MidPoints);
    var upTMA12 = calcZlema(MidPoints, avgUp);
    UpTMA12Array.push(upTMA12);
    // console.log('UpTMA12Array: ', UpTMA12Array);
    var upTMA22 = calcZlema(UpTMA12Array, avgUp);
    UpTMA22Array.push(upTMA22);

    var upDiff2 = upTMA12 - upTMA22;
    var upZlCl = upTMA12 + upDiff2;
    var upZlDiff = upZlCl - upZlHA;

    var upKeep = (haClose >= haOpen) && (haClosePrev >= haOpenPrev);
    var upKeep2 = upZlDiff >= 0;
    var upKeeping = upKeep || upKeep2;
    var upKeepAll = upKeeping || ((upKeepingPrev == undefined ? false : upKeepingPrev) &&
        (candle.close >= candle.open) || (candle.close >= closePrev));
    var upKeep3 = (Math.abs(candle.close - candle.open) < (candle.high - candle.low)*0.35 && (candle.high >= lowPrev));
    var upTrend = upKeepAll || ((upKeepAllPrev == undefined ? false : upKeepAllPrev) && upKeep3);


    // ================================
    // Calculations for the downtrend.
    var downTMA1 = calcZlema(HACloseCandles, avgDown);
    DownTMA1Array.push(downTMA1);
    // console.log('DownTMA1Array: ', DownTMA1Array);
    // console.log("upTMA1: ", upTMA1);

    var downTMA2 = calcZlema(DownTMA1Array, avgDown);
    DownTMA2Array.push(downTMA2);
    // console.log("upTMA2: ", upTMA2);

    var downDiff = downTMA1 - downTMA2;
    var downZlHA = downTMA1 + downDiff;

    var downTMA12 = calcZlema(MidPoints, avgDown);
    DownTMA12Array.push(downTMA12);
    // console.log('DownTMA12Array: ', DownTMA12Array);
    var downTMA22 = calcZlema(DownTMA12Array, avgDown);
    DownTMA22Array.push(downTMA22);

    var downDiff2 = downTMA12 - downTMA22;
    var downZlCl = downTMA12 + downDiff2;
    var downZlDiff = downZlCl - downZlHA;

    var downKeep = (haClose < haOpen) && (haClosePrev < haOpenPrev);
    var downKeep2 = downZlDiff < 0;
    var downKeeping = downKeep || downKeep2;
    var downKeepAll = downKeeping || ((downKeepingPrev == undefined ? false : downKeepingPrev) &&
        (candle.close < candle.open) || (candle.close < closePrev));
    var downKeep3 = (Math.abs(candle.close - candle.open) < (candle.high - candle.low)*0.35 && (candle.low < highPrev));
    var downTrend = downKeepAll || ((downKeepAllPrev == undefined ? false : downKeepAllPrev) && downKeep3);

    var upw = (!downTrend && (downtrendPrev == undefined ? false : downtrendPrev) && upTrend);
    var dnw = (!upTrend && (uptrendPrev == undefined ? false : uptrendPrev) && downTrend);

    // console.log("upw: ", upw, ", dnw: ", dnw);

    // Give the oscillator signal
    this.prevOsc = this.oscillator;
    this.oscillator = upw ? 1 : (dnw ? -1 : this.prevOsc);



    // Set previous values for next update call
    closePrev = candle.close;
    lowPrev = candle.low;
    upKeepingPrev = upKeeping;
    upKeepAllPrev = upKeepAll;
    downKeepingPrev = downKeeping;
    downKeepAllPrev = downKeepAll;
    uptrendPrev = upTrend;
    downtrendPrev = downTrend;


    // console.log("\n\n");
}

// For debugging purposes.
strat.log = function() {
}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function() {

    log.debug("\t=== Heikin Ashi Oscillator == ");
    // console.log("oscillator: ", this.oscillator, ", prevOsc: ", this.prevOsc);
    if (this.oscillator === 1 && (this.prevOsc === 0 || this.prevOsc === -1) && !this.adviced) {
        log.debug("\tBuying signal received\n");
        this.advice('long');
        this.adviced = true;
    } else if (this.prevOsc === 1 && (this.oscillator === 0 || this.oscillator === -1) && this.adviced) {
        log.debug("\tSelling signal received\n");
        this.advice('short');
        this.adviced = false;
    } else {
        log.debug("\tNo actions needed.\n");
    }

}

// Calculates zlema (zero-lag EMA) from the provided candle array.
var calcZlema = function(candles, length) {
    var retVal;

    tulind.indicators.zlema.indicator([candles], [length], function(err, results) {
        // console.log("calcZlema - error: ", err);
        // console.log("Zlema results: ", results);
        if (results != null && results[0].length > 0) {
            // console.log("Zlema result: ", results[0]);
            retVal = results[0][results[0].length -1];
        } else {
            retVal = candles[candles.length -1];
        }
    });
    // console.log("calcZlema - retVal: ", retVal);
    return retVal;
}

// Get the mid point of the candle.
var midpoint = function(candle) {
    return (candle.high + candle.low) / 2;
}

module.exports = strat;
