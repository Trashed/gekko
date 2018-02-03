// This strategy is using Heikin-Ashi format candlesticks to better identify trends.
//
// Reference: https://www.investopedia.com/articles/technical/04/092204.asp
//

var log = require('../core/log');
var math = require('mathjs');

// Let's create our own strat
var strat = {};

// Prepare everything our method needs
strat.init = function() {

    this.xclose = 0;
    this.xcloseprev = 0;
    this.xopen = 0;
    this.xopenprev = 0;
    this.xhigh = 0;
    this.xlow = 0;

    this.trend = {
      direction: 'none',
      duration: 0,
      persisted: false,
      adviced: false
    };

    this.uptrend = {
        maxduration: 0,
        avgduration: 0
    };

    this.downtrend = {
        maxduration: 0,
        avgduration: 0
    };

    this.rangetrend = {
        maxduration: 0,
        avgduration: 0
    };

    this.lastTrend = 'none';
}

// What happens on every new candle?
strat.update = function(candle) {

    // console.log('new candle: ', candle);
    this.xcloseprev = this.xclose;
    this.xopenprev = this.xopen;

    // Calculate new Heikin-Ashi candles
    this.xclose = (candle.open + candle.close + candle.high + candle.low) / 4;
    // xOpen = [xOpen(Previous Bar) + xClose(Previous Bar)]/2
    this.xopen = (this.xopenprev + this.xcloseprev) / 2;
    // xHigh = Max(High, xOpen, xClose)
    this.xhigh = math.max(candle.high, this.xopen, this.xclose);
    // xLow = Min(Low, xOpen, xClose)
    this.xlow = math.min(candle.low, this.xopen, this.xclose);
}

// For debugging purposes.
strat.log = function() {
}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function() {

    // Hallow candle with no lower "shadow" -> should indicate strong uptrend.
    if (this.xlow >= this.xopen) {

        if (this.trend.duration > this.uptrend.maxduration && this.trend.direction == 'up')
            this.uptrend.maxduration = this.trend.duration;

        // New trend detected
        if(this.trend.direction !== 'up') {

          // reset the state for the new trend
          this.trend = {
            duration: 0,
            persisted: false,
            direction: 'up',
            adviced: false
          };
        }
        this.trend.duration++;

        this.uptrend.avgduration = (this.uptrend.avgduration + this.trend.duration) / 2;
        this.trend.persisted = this.trend.duration > 2;

        log.debug('>>>>>> Up trend properties:');
        log.debug('\txClose: ', this.xclose);
        log.debug('\txOpen: ', this.xopen);
        log.debug('\txHigh: ', this.xhigh);
        log.debug('\txLow: ', this.xlow);
        log.debug('\tDuration: ', this.trend.duration);
        log.debug('\tUptrend Max Duration: ', this.uptrend.maxduration);
        log.debug('\tUptrend Avg Duration: ', this.uptrend.avgduration);
        log.debug('>>>>>>>>>>>>>>>>>>>>>>>>>>\n');

    } else if (this.xhigh <= this.xopen) {

        if (this.trend.duration > this.downtrend.maxduration && this.trend.direction == 'down')
            this.downtrend.maxduration = this.trend.duration;

        // New trend detected
        if(this.trend.direction !== 'down') {
          // reset the state for the new trend
          this.trend = {
            duration: 0,
            persisted: false,
            direction: 'down',
            adviced: false
          };
        }
        this.trend.duration++;

        this.downtrend.avgduration = (this.downtrend.avgduration + this.trend.duration) / 2;
        this.trend.persisted = this.trend.duration > 1;

        log.debug('<<<<<<< Down trend properties:');
        log.debug('\txClose: ', this.xclose);
        log.debug('\txOpen: ', this.xopen);
        log.debug('\txHigh: ', this.xhigh);
        log.debug('\txLow: ', this.xlow);
        log.debug('\tDuration: ', this.trend.duration);
        log.debug('\tDowntrend Max Duration: ', this.downtrend.maxduration);
        log.debug('\tDowntrend Avg Duration: ', this.downtrend.avgduration);
        log.debug('<<<<<<<<<<<<<<<<<<<<<<<<<\n');

    } else {

        /*if (this.trend.duration > this.rangetrend.maxduration && this.trend.direction == 'none')
            this.rangetrend.maxduration = this.trend.duration;

        var lastadviced = this.trend.adviced;
        // New trend detected
        if(this.trend.direction !== 'none') {
          // reset the state for the new trend


          log.debug('\tADVICED: ', lastadviced);
          this.trend = {
            duration: 0,
            persisted: false,
            direction: 'none',
            adviced: lastadviced
          };
        }
        this.trend.duration++;

        this.rangetrend.avgduration = (this.rangetrend.avgduration + this.trend.duration) / 2;*/
        //this.trend.persisted = this.trend.duration > 1;

        log.debug('======== Trend is ranging:');
        log.debug('\txClose: ', this.xclose);
        log.debug('\txOpen: ', this.xopen);
        log.debug('\txHigh: ', this.xhigh);
        log.debug('\txLow: ', this.xlow);
        // log.debug('\tDuration: ', this.trend.duration);
        // log.debug('\tRangetrend Max Duration: ', this.rangetrend.maxduration);
        // log.debug('\tRangetrend Avg Duration: ', this.rangetrend.avgduration);
        log.debug('====================\n');
    }

    // Give advice
    if (this.trend.direction == 'up' && this.trend.persisted && !this.trend.adviced) {
        log.debug('Buying signal received\n');
        this.advice('long');
        this.trend.adviced = true;
    } else if (this.trend.direction == 'down' && this.trend.persisted && !this.trend.adviced) {
        log.debug('Selling signal received\n');
        this.advice('short');
        this.trend.adviced = true;
    } else {
        this.advice();
    }

}

module.exports = strat;
