
var fs = require('fs');
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

var States = [];
var closePrices = [];
var closePrice = 0.0;
var rawClosePrices = [];
var volumes = [];
var volume = 0.0;
var rawVolumes = [];
var count = 0;
var candleCount = 0;
var hasPredicted = false;
var lastAction = 0; // Actions: 0 - hold, 1 - buy, 2 - sell
// var windowSize = 16;



// Options for Q-learner
var inputs = 2;
var actions = 3;
var temporalWindow = 3;
var networkSize = inputs * temporalWindow + actions * temporalWindow + inputs;

const MAX_STORED_CANDLES = 500;


// Network layer setup
var layerDefs = [];
layerDefs.push({type: 'input', out_sx: 1, out_sy: 1, out_depth: networkSize});
layerDefs.push({type: 'fc', num_neurons: 7, activation: 'relu'});
// layerDefs.push({type: 'fc', num_neurons: 10, activation: 'relu'});
layerDefs.push({type: 'svm', num_classes: actions});
layerDefs.push({type:'regression', num_neurons: 3});
// Network trainer
var tdTrainerOpts = {learning_rate: 0.001, momentum: 0.0, batch_size: 64, l2_decay: 0.01};
var opts = {};
opts.temporal_window = temporalWindow;
opts.experience_size = 300;
opts.start_learn_threshold = 10;
opts.gamma = 0.9;
opts.learning_steps_total = 2000;
opts.learning_steps_burnin = 30;
opts.epsilon_min = 0.05;
opts.epsilon_test_time = 0.05;
opts.random_action_distribution = [0.97, 0.02, 0.01];    // Random action should try to hold more than buy or sell
opts.layer_defs = layerDefs;
opts.tdtrainer_options = tdTrainerOpts;
opts.threads = numCPUs;
opts.learns = 100;


// prepare everything our method needs
var brain = undefined;
method.init = function() {
    this.requiredHistory = this.tradingAdvisor.historySize;
    log.debug('requiredHistory: ', this.requiredHistory);

    // Create the 'brain' for Q-learning
    if (brain == undefined) {
        var savedBrain;
        brain = new deepqlearn.Brain(inputs, actions, opts);
        if (fs.existsSync("deepqlearn-model.json")) {
            savedBrain = JSON.parse(fs.readFileSync("deepqlearn-model.json"));
            // console.log("savedBrain: ", savedBrain);
            // brain = new deepqlearn.Brain(inputs, actions);
            brain.value_net.fromJSON(savedBrain);
        }
    }
}



// what happens on every new candle?
var hasTrainBought = false;
const BUY_AMOUNT = 10;
var moneySpent = 0.0;
var boughtPrice = 0.0;
// var totalProfit = 0.0;
method.update = function(candle) {

    // console.log('\tcandle: ', candle);
    rawClosePrices.push(candle.close);
    rawVolumes.push(candle.volume);
    if (rawClosePrices.length > 1 && rawVolumes.length > 1) {
        closePrices = [];
        volumes = [];
        // for (var v = 0; v < rawVolumes.length; v++) {
        //     closePrices.push(normalize(rawClosePrices[v], Math.min(...rawClosePrices), Math.max(...rawClosePrices)));
        //     volumes.push(normalize(rawVolumes[v], Math.min(...rawVolumes), Math.max(...rawVolumes)));
        // }

        var l = rawClosePrices.length;
        closePrice = normalize(rawClosePrices[l-1], Math.min(...rawClosePrices), Math.max(...rawClosePrices));
        volume = normalize(rawVolumes[l-1], Math.min(...rawVolumes), Math.max(...rawVolumes));

    }

    // Keep candles amount equal to MAX_STORED_CANDLES
    // if (closePrices.length > MAX_STORED_CANDLES && volumes.length > MAX_STORED_CANDLES) {
    //     closePrices.shift();
    //     volumes.shift();
    // }

    // Start training algorithm when there's more than one state array.
    if (rawClosePrices.length > 1) {
        // log.debug('\t###### Training deepqlearn #######\n');

        var totalProfit = 0;
        // for (var t = 0; t < 100; t++) {
            // for (var i = 0; i < closePrices.length; i++) {

                // console.log('\tCurrent index = ', i, ' current length = ', closePrices.length);

                // Create 2-dimensional array, first row for price data and the second one for volume.

                var state = [];
                // state.push(closePrices[i]);
                // state.push(volumes[i]);
                state.push(closePrice);
                state.push(volume);
                // console.log("training data: ", state);
                var reward = 0;

                var action = brain.forward(state);
                // console.log("\taction (training): ", action);


                // If Action is sell and current price is higher than last close price, reward is positive. Otherwise rewards is negative.
                if (action == 2) {
                    if (hasTrainBought) {
                        hasTrainBought = false;

                        var prof = (BUY_AMOUNT * closePrice * 0.999) - moneySpent;
                        reward = (prof > 0) ? 1 : 0;
                        // reward = prof;
                        totalProfit += prof;
                        moneySpent = 0;
                        // console.log('\tRealized PnL: ', prof);
                    }

                } else if (action == 1) { // If action is buy and current price is lower than last price, reward is positive. Otherwise reward is negative.
                    if (!hasTrainBought) {

                        hasTrainBought = true;
                        // boughtPrice = closePrices[i];
                        boughtPrice = closePrice;
                        moneySpent = BUY_AMOUNT * boughtPrice * 1.001;
                    }
                } else if (action == 0) {
                    if (hasTrainBought == true) {
                        var unrealizedProfit = (BUY_AMOUNT * closePrice) - moneySpent;
                        // console.log('\tUnrealized PnL: ', unrealizedProfit);
                        reward = unrealizedProfit;
                    }
                }
                // console.log('\tReward: ', reward);

                brain.backward([reward]);
                // console.log("brain value net: ", brain.value_net, "\n\n");


                // count++;
                // hasPredicted = true;

            // }

            // console.log('\n\t###############################################');
            // console.log('\tTotal profit: ', totalProfit);
            // // console.log('\tLoops: ', t);
            //
            // // console.log('\tcount: ', count);
            // console.log('\n\t###############################################\n');
        // }

        count++;
        // hasPredicted = true;

    }

    // After training is done, disable learning
    // brain.epsilon_test_time = 0.0;
    // brain.learning = false;

    // candleCount++;

    // Save network to JSON on each candle.
    var json = brain.value_net.toJSON();
    var jsonString = JSON.stringify(json);
    if (fs.existsSync("deepqlearn-model.json")) {
        fs.unlink("deepqlearn-model.json", function(err) {
            if (err) {
                console.log(err);
            }

        });
    }
    // fs.truncate('deepqlearn-model.json', 0, function() {
        fs.writeFile('deepqlearn-model.json', jsonString, function(err) {
            // console.log(jsonString);
            if (err) {
                return console.log(err);
            }
        });
    // });

}


method.log = function() {
    // log.debug("prediction count:", predictioncount);
}

const MAX_PREDICTION_COUNT = 1000;
var hasbought = false;
method.check = function() {

    // if (/*hasPredicted && */count > MAX_PREDICTION_COUNT) {

        // After training is done, disable learning
        // if (brain.learning) {
        //     brain.epsilon_test_time = 0.0;
        //     brain.learning = false;
        // }

        // var state = States[States.length - 1];
        var state = [];
        // state.push(closePrices[closePrices.length - 1]);
        // state.push(volumes[volumes.length - 1]);
        state.push(closePrice);
        state.push(volume);

        var action = brain.forward(state);

        // log.debug('\tpredicting action: ', action);

        if (action == 1 && !hasbought) {
            log.debug('\n\tBUY ACTION TRIGGERED\n');

            hasbought = true;
            hasPredicted = false;
            this.advice('long');
        } else if (action == 2 && hasbought) {
            log.debug('\n\tSELL ACTION TRIGGERED\n')

            hasbought = false;
            hasPredicted = false;
            this.advice('short');
        } else {
            // log.debug('\tNO ACTION TRIGGERED\n')
            hasPredicted = false;
            this.advice();
        }

    // }

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
