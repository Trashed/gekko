

var convnetjs = require('convnetjs');
// var z = require('zero-fill')
// var stats = require('stats-lite')
// var n = require('numbro')
var math = require('mathjs');
// const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
var _ = require('lodash');

const deepqlearn = require('convnetjs/build/deepqlearn');

var log = require('../core/log.js');



// let's create our own method
var method = {};

// Settings for indicators
var adxSettings = {
    optInTimePeriod: 14
};

var rsiSettings = adxSettings;

// Options for Q-learner
var inputs = 4;
var actions = 3;
var temporalWindow = 4;
var networkSize = inputs * temporalWindow + actions * temporalWindow + inputs; // 4 * 4 + 3 * 4 + 4 = 16 + 12 + 4 = 32
// Network layer setup
var layerDefs = [];
layerDefs.push({type: 'input', out_sx: 1, out_sy: 1, out_depth: networkSize});
layerDefs.push({type: 'fc', num_neurons: 20});
layerDefs.push({type: 'svm', num_classes: actions});
// Network trainer
var trainerOpts = {learning_rate: 0.07, momentum: 0.0, batch_size: 32, l2_decay: 0.01};
var opts = {};
opts.temporal_window = temporalWindow;
opts.experience_size = 3000;
opts.start_learn_threshold = 5000;
opts.gamma = 0.1;
opts.learning_steps_total = 20000;
opts.learning_steps_burnin = 3000;
opts.epsilon_min = 0.05;
opts.epsilon_test_time = 0.05;
opts.layer_defs = layerDefs;
opts.tdtrainer_options = trainerOpts;
opts.threads = numCPUs;
opts.learns = 2;



// prepare everything our method needs
var brain = undefined;
method.init = function() {
    this.requiredHistory = this.tradingAdvisor.historySize;
    log.debug('requiredHistory: ', this.requiredHistory);

    // Add indicators
    this.addTalibIndicator('myadx', 'adx', adxSettings);
    this.addTalibIndicator('myrsi', 'rsi', rsiSettings);

    // Define Q-learning state size
    // state = [closePrice, prevClosePrice, ADX, RSI] => 4
    // this.stateSize = 4;


    // Create the 'brain' for Q-learning
    if (brain == undefined) {
        brain = new deepqlearn.Brain(4, 3, opts); // (4, 3)
    }
}



// what happens on every new candle?
var States = [];
var prevClosePrice = 0;
var count = 0;
var candleCount = 0;
var hasPredicted = false;
var lastAction = 0; // Actions: 0 - hold, 1 - buy, 2 - sell
var boughtPrice = 0;

method.update = function(candle) {

    // console.log('\tcandle: ', candle);

    // Get indicators values
    var adx = this.talibIndicators.myadx.result;
    var rsi = this.talibIndicators.myrsi.result;


    // Create a state array and push values to it.
    var state = [];
    state.push(candle.close);
    if (prevClosePrice == 0) {
        prevClosePrice = candle.close;
        state.push(prevClosePrice);
    } else {
        state.push(prevClosePrice);
    }
    prevClosePrice = candle.close;
    //state.push(prevClosePrice - candle.close);
    state.push(normalize(adx.outReal, 0, 100));
    state.push(normalize(rsi.outReal, 0, 100));

    // console.log("state: ", state);

    States.push(state);
    // console.log("States: ", States);

    // TODO: Handle Q-learning algo
    // Start training algorithm when there's more than one state array.
    log.debug('\t###### Training deepqlearn #######\n');
    // log.debug('\tadx: ', adx);
    // log.debug('\trsi: ', rsi);
    log.debug('\tCount: ', count);
    if (States.length > 1) {


        var trainState = States[0];

        // Randomize first action
        var lastAction = randomAction(1);  // Either hold or buy
        var action = brain.forward(trainState);
        // console.log('action: ', action);
        var reward = (action < 2) ? 0.5 : -0.5;
        brain.backward([reward]);

        count++;

        var lastState = trainState;
        var hasTrainBought = false;
        for (var i = 1; i < States.length - 1; i++) {
            trainState = States[i]
            // console.log('trainState: ', trainState);
            action = brain.forward(trainState);
            // console.log('action: ', action);

            reward = 0.0;

            // If Action is sell and current price is higher than last close price, reward is positive. Otherwise rewards is negative.
            if (action == 2 && hasTrainBought) {
                hasTrainBought = false;
                if (/*trainState[0] > (boughtPrice * 1.05) &&*/ trainState[2] > normalize(25, 0, 100) &&  trainState[3] > normalize(70, 0, 100)) {
                    log.debug('\tcurr price: ', trainState[0], ' bought price: ', boughtPrice);
                    reward = trainState[0] - boughtPrice;
                    log.debug('\treward: ', reward);
                }
            } else if (action == 1 && !hasTrainBought) { // If action is buy and current price is lower than last price, reward is positive. Otherwise reward is negative.
                hasTrainBought = true;
                if (/*trainState[0] < lastState[1] &&*/ trainState[2] > normalize(25, 0, 100) &&  trainState[3] < normalize(30, 0, 100)) {
                    boughtPrice = trainState[0];
                    log.debug('\tboughtPrice: ', boughtPrice);
                    // reward = 1.0;
                }
            }
            brain.backward([reward]);

            count++;
            hasPredicted = true;
            lastState = trainState;
            lastAction = action;
        }
        // console.log('count: ', count);
    }

    // After training is done, disable learning
    // brain.epsilon_test_time = 0.0;
    // brain.learning = false;

    // candleCount++;
}


method.log = function() {
    // log.debug("prediction count:", predictioncount);
}

const MAX_PREDICTION_COUNT = 5000;
var hasbought = false;
method.check = function() {

    if (hasPredicted && count > MAX_PREDICTION_COUNT) {

        var state = States[States.length - 1];
        var action = brain.forward(state);

        log.debug('\tpredicting action: ', action);

        if (action == 1 && !hasbought) {
            log.debug('\tBUY ACTION TRIGGERED\n');

            hasbought = true;
            hasPredicted = false;
            this.advice('long');
        } else if (action == 2 && hasbought) {
            log.debug('\tSELL ACTION TRIGGERED\n')

            hasbought = false;
            hasPredicted = false;
            this.advice('short');
        } else {
            log.debug('\tNO ACTION TRIGGERED\n')
            this.advice();
        }

    }

}

method.handleposition  = function(){

}

// Normalize values to range 0..1
var normalize = function(x, min, max) {
    return (x - min) / (max - min);
}

// Function to get random action
var randomAction = function(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

module.exports = method;
