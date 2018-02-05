// required indicators
var EMA = require('./EMA.js');

var Indicator = function(config) {
  this.input = 'price'
  this.result = false;
  this.ema1 = new EMA(config.length);
  this.ema2 = new EMA(config.length);
  this.ema3 = new EMA(config.length);
}

// add a price and calculate the EMAs and
// the final TEMA value.
Indicator.prototype.update = function(price) {
  this.ema1.update(price);
  this.ema2.update(this.ema1.result);
  this.ema3.update(this.ema2.result);
  this.calculateTEMA();
}

Indicator.prototype.calculateTEMA = function() {
  var ema1 = this.ema1.result;
  var ema2 = this.ema2.result;
  var ema3 = this.ema3.result;

  this.result = 3 * (ema1 - ema2) + ema3;
}

module.exports = Indicator;
