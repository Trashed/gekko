// This strategy is using Heikin-Ashi format candlesticks to better identify trends.
//
// Reference: https://www.investopedia.com/articles/technical/04/092204.asp
//

var log = require('../core/log');
var math = require('mathjs');
var hacandles = require('./candles/HeikinAshi.js');

// Let's create our own strat
var strat = {};

// Prepare everything our method needs
strat.init = function() {

    this.trend = {
      direction: 'none',
      duration: 0,
      persisted: false,
      adviced: false
    };
}

// What happens on every new candle?
strat.update = function(candle) {

    this.haCandle = hacandles.calcHACandle(candle);

}

// For debugging purposes.
strat.log = function() {
}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function() {

    // Hallow candle with no lower "shadow" -> should indicate strong uptrend.
    if (this.haCandle.xlow >= this.haCandle.xopen) {

        if (this.trend.duration > this.uptrend.maxduration && this.trend.direction == 'up')
            this.uptrend.maxduration = this.trend.duration;

        // New trend detected
        if(this.trend.direction !== 'up')
          // reset the state for the new trend
          this.trend = {
            duration: 0,
            persisted: false,
            direction: 'up',
            adviced: false
          };
        //this.trend.duration++;
        //this.trend.persisted = this.trend.duration > 1;

        log.debug('>>>>>> Up trend properties:');
        log.debug('\txClose: ', this.haCandle.xclose);
        log.debug('\txOpen: ', this.haCandle.xopen);
        log.debug('\txHigh: ', this.haCandle.xhigh);
        log.debug('\txLow: ', this.haCandle.xlow);
        log.debug('\tDuration: ', this.trend.duration);
        log.debug('>>>>>>>>>>>>>>>>>>>>>>>>>>\n');

    } else if (this.haCandle.xhigh <= this.haCandle.xopen) {

        if (this.trend.duration > this.downtrend.maxduration && this.trend.direction == 'down')
            this.downtrend.maxduration = this.trend.duration;

        // New trend detected
        if(this.trend.direction !== 'down')
          // reset the state for the new trend
          this.trend = {
            duration: 0,
            persisted: false,
            direction: 'down',
            adviced: false
          };
        //this.trend.duration++;
        //this.trend.persisted = this.trend.duration > 0;

        log.debug('<<<<<<< Down trend properties:');
        log.debug('\txClose: ', this.haCandle.xclose);
        log.debug('\txOpen: ', this.haCandle.xopen);
        log.debug('\txHigh: ', this.haCandle.xhigh);
        log.debug('\txLow: ', this.haCandle.xlow);
        log.debug('\tDuration: ', this.trend.duration);
        log.debug('<<<<<<<<<<<<<<<<<<<<<<<<<\n');

    } else {

        // New trend detected
        //if(this.trend.direction !== 'none')
        //  // reset the state for the new trend
        //  this.trend = {
        //    duration: 0,
        //    persisted: false,
        //    direction: 'none',
        //    adviced: false
        //  };
        //this.trend.duration++;
        //this.trend.persisted = this.trend.duration > 1;

        log.debug('======== Trend is ranging:');
        log.debug('\txClose: ', this.haCandle.xclose);
        log.debug('\txOpen: ', this.haCandle.xopen);
        log.debug('\txHigh: ', this.haCandle.xhigh);
        log.debug('\txLow: ', this.haCandle.xlow);
        // log.debug('\tDuration: ', this.trend.duration);
        // log.debug('\tRangetrend Max Duration: ', this.rangetrend.maxduration);
        // log.debug('\tRangetrend Avg Duration: ', this.rangetrend.avgduration);
        log.debug('====================\n');
    }

    // Give advice
    if (this.trend.direction == 'up'/* && this.trend.persisted */&& !this.trend.adviced) {
        log.debug('Buying signal received\n');
        this.advice('long');
        this.trend.adviced = true;
    } else if (this.trend.direction == 'down' /*&& this.trend.persisted */&& !this.trend.adviced) {
        log.debug('Selling signal received\n');
        this.advice('short');
        this.trend.adviced = true;
    } else {
        this.advice();
    }

}

module.exports = strat;
