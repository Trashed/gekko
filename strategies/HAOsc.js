// Vervoort Heikin Ashi Candlestick Oscillator
//
// link: https://www.tradingview.com/script/UyhY8FuQ-Vervoort-Heiken-Ashi-Candlestick-Oscillator/

var log = require('../core/log');
var hac = require('./candles/HeikinAshi.js');
var tulind = require('tulind');

// Let's create our own strat
var strat = {};

// Candles array for storing custom candle data (Heikin Ashi)
var OpenCandles = [];
var CloseCandles = [];

// Prepare everything our method needs
strat.init = function() {

    this.requiredHistory = this.tradingAdvisor.historySize;

    this.avgUp = this.settings.avgUp;
    this.avgDown = this.settings.avgDown;

    console.log('settings: ', this.settings);


}

// What happens on every new candle?
strat.update = function(candle) {

    // Get a Heikin Ashi candle
    var haCandle = hac.calcHACandle(candle);
    var haOpen = haCandle.xopen;
    var haClose = haCandle.xclose;
    OpenCandles.push(haOpen);
    CloseCandles.push(haClose);
    console.log('haOpen: ', haOpen);
    console.log('haClose: ', haClose);

    var upTMA1;
    tulind.indicators.zlema.indicator([CloseCandles], [this.avgUp], function(err, results) {
        console.log("Zlema result: ", results[0]);
        upTMA1 = results[0][results[0].length -1];
    });
    console.log(upTMA1);
    // // this.tulipIndicators.zlema.run([haClose]);
    // var zlema = this.tulipIndicators.zlema;
    // var run = zlema.run;
    // console.log('zlema: ', zlema);
    // console.log('run: ', run(CloseCandles));



}

// For debugging purposes.
strat.log = function() {
}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function() {
}

var zltema = function(src, length) {
    // var tma1 =
}

module.exports = strat;
