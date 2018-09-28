'use strict'

var TraderCenter = artifacts.require("./TraderCenter.sol");
var Trader = artifacts.require("./Trader.sol");

var timeS = require('./../data/timeS.js');
var priceS = require('./../data/priceS.js');
var actS = require('./../data/acts.js')

module.exports = callback => {
    var traderActIndex = [44, 103, 9, 61, 0]
    var j = 0;

    return TraderCenter.deployed()
        .then(_traderCenter => [...Array(4).keys()].reduce((p, _, i) =>
            p.then(traderAddr => traderAddr.reduce((p2, addr) => p2.then(()=>Trader.at(addr)).then(_trader => {
                console.log("Account", i, "registered Traders:", addr);
                return actS[traderActIndex[j++]].reduce((p3, act, act_index) =>
                    p3.then(() =>
                        act != 0 ? _trader.record(timeS[act_index], 'TXF', priceS[act_index], act) : Promise.resolve()
                    ), Promise.resolve());
            }), Promise.resolve()).then(() => _traderCenter.getTraders(web3.eth.accounts[i + 1]))), _traderCenter.getTraders(web3.eth.accounts[0])));
};