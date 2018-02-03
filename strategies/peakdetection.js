// This is a basic example strategy for Gekko.
// For more information on everything please refer
// to this document:
//
// https://gekko.wizb.it/docs/strategies/creating_a_strategy.html
//
// The example below is pretty bad investment advice: on every new candle there is
// a 10% chance it will recommend to change your position (to either
// long or short).
var math = require('mathjs');
var _ = require('lodash');
var log = require('../core/log');

// Let's create our own strat
var strat = {};

// Prepare everything our method needs
strat.init = function() {
    // keep state about the current trend
    // here, on every new candle we use this
    // state object to check if we need to
    // report it.
    this.trend = {
      lastDirection: '',
      direction: 'none',
      duration: 0,
      persisted: false,
      wasLastPersisted: false,
      adviced: false
    };

    this.uptrendStat = {
        avgDur: 0,
        duration: 0,
        maxDuration: 0,
        minDuration: 1
    };

    this.downtrendStat = {
        avgDur: 0,
        duration: 0,
        maxDuration: 0,
        minDuration: 1
    };

    console.log('peakdetection - settings: ', this.settings);

    // this.requiredHistory = this.tradingAdvisor.historySize;


    this.addIndicator('zsignal', 'ZSignal', this.settings);
}

// What happens on every new candle?
strat.update = function(candle) {


}

// For debugging purposes.
strat.log = function() {

}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function() {

    var zsignal = this.indicators.zsignal;
    var lastDir = this.trend.direction;

    if (zsignal.result == -1) {

        // console.log('\n\tSignal: ', zsignal.result);

        if (this.trend.direction !== 'down') {

            // var lastDir = this.trend.direction;
            var wasPersisted = this.trend.persisted;
            this.trend = {
              duration: 0,
              persisted: false,
              wasLastPersisted: wasPersisted,
              direction: 'down',
              // lastDirection: lastDir,
              adviced: false
            };
        }
        this.trend.lastDirection = lastDir;

        this.trend.duration++;
        this.downtrendStat.duration = this.trend.duration;

        if (this.downtrendStat.duration > this.downtrendStat.maxDuration)
            this.downtrendStat.maxDuration = this.downtrendStat.duration;


        this.trend.persisted = this.trend.duration > 1;
        // var diff = this.downtrendStat.maxDuration - this.downtrendStat.avgDur;
        // log.debug("\tdiff: ", diff);
        // this.trend.persisted = this.trend.duration >= diff && diff > 1;

        // if (this.trend.persisted && !this.trend.adviced /*&& this.trend.duration >= this.downtrendStat.avgDur*/) {
        //     this.trend.adviced = true;
        //     console.log('\n\tBuy signal received.\n');
        //     this.advice('long');
        // }

        // this.advice();

    } else if (zsignal.result == 1) {

        // console.log('\n\tSignal: ', zsignal.result);

        if (this.trend.direction !== 'up') {

            // var lastDir = this.trend.direction;
            var wasPersisted = this.trend.persisted;
            this.trend = {
              duration: 0,
              persisted: false,
              wasLastPersisted: wasPersisted,
              direction: 'up',
              // lastDirection: lastDir,
              adviced: false
            };
        }
        this.trend.lastDirection = lastDir;

        this.trend.duration++;
        this.uptrendStat.duration = this.trend.duration;

        if (this.uptrendStat.duration > this.uptrendStat.maxDuration)
            this.uptrendStat.maxDuration = this.uptrendStat.duration;

        this.trend.persisted = this.trend.duration > 1;
        // var diff = this.uptrendStat.maxDuration - this.uptrendStat.avgDur;
        // log.debug("\tdiff: ", diff);
        // this.trend.persisted = this.trend.duration >= diff && diff > 1;

        // if (this.trend.persisted && !this.trend.adviced /*&& this.trend.duration >= this.uptrendStat.avgDur*/) {
        //     this.trend.adviced = true;
        //     console.log('\n\tSell signal received.\n');
        //     this.advice('short');
        // }

        // this.advice();
    } else {

        if (this.trend.direction !== 'none') {
            // var lastDir = this.trend.direction;
            var wasPersisted = this.trend.persisted;

            this.trend = {
              duration: 0,
              persisted: false,
              wasLastPersisted: wasPersisted,
              direction: 'none',
              // lastDirection: lastDir,
              adviced: false
            };
        }
        this.trend.lastDirection = lastDir;

        // this.advice();
    }


    if (this.trend.direction !== this.trend.lastDirection) {
        if (this.trend.lastDirection == 'up') {
            // console.log('Updated up trend strat.\n');
            this.uptrendStat.avgDur = (this.uptrendStat.avgDur + this.uptrendStat.duration) / 2;
            this.uptrendStat.duration = 0;
        } else if (this.trend.lastDirection == 'down') {
            // console.log('Updated down trend strat.\n');
            this.downtrendStat.avgDur = (this.downtrendStat.avgDur + this.downtrendStat.duration) / 2;
            this.downtrendStat.duration = 0;
        }
    }


    // log.debug('##### Smoothed Z-score #####');

    // Detect possible trade
    if (this.trend.direction === 'none') {

        if (this.trend.lastDirection === 'down' && this.trend.wasLastPersisted && !this.trend.adviced) {

            this.trend.adviced = true;
            console.log('\t\nBuy signal received.\n');
            this.advice('long');
        } else if (this.trend.lastDirection == 'up' && this.trend.wasLastPersisted && !this.trend.adviced) {

            this.trend.adviced = true;
            console.log('\t\nSell signal received.\n');
            this.advice('short');
        }
    } else {

        // console.log('\t\tPIERU');
        this.advice();
    }

    // log.debug('\tsignal: ', zsignal.result);
    // log.debug("\ttrend direction: ", this.trend.direction);
    // log.debug("\tlast direction: ", this.trend.lastDirection);
    // log.debug("\tpersisted: ", this.trend.persisted);
    // log.debug("\twas persisted: ", this.trend.wasLastPersisted);
    // log.debug("\ttrend duration: ", this.trend.duration);
    // log.debug('\taverage up duration: ', this.uptrendStat.avgDur);
    // log.debug('\tmax up duration: ', this.uptrendStat.maxDuration);
    // log.debug('\taverage down duration: ', this.downtrendStat.avgDur);
    // log.debug('\tmax down duration: ', this.downtrendStat.maxDuration);
    // log.debug('############################\n\n');





}

module.exports = strat;
