'use strict'

var TraderCenter = artifacts.require("./TraderCenter.sol");
var Trader = artifacts.require("./Trader.sol");

var timeS = require('./data/timeS.js');
var priceS = require('./data/priceS.js');
var actS = require('./data/acts.js')

module.exports = function(callback) {
	var traderAddress = [];
	var instance;

	return TraderCenter.deployed()
		.then((_instance) => {
			instance = _instance;
			return instance.getTraders(web3.eth.accounts[0])
		}).then((_traders) => {
			console.log("Account 0 registered Traders:", _traders);
			traderAddress.push(_traders);
			return instance.getTraders(web3.eth.accounts[1]);
		})
		.then((_traders) => {
			console.log("Account 1 registered Traders:", _traders);
			traderAddress.push(_traders);
			return instance.getTraders(web3.eth.accounts[2]);
		})
		.then((_traders) => {
			console.log("Account 2 registered Traders:", _traders);
			traderAddress.push(_traders);
			return instance.getTraders(web3.eth.accounts[3]);
		})
		.then((_traders) => {
			console.log("Account 3 registered Traders:", _traders);
			traderAddress.push(_traders);
			return Trader.at(traderAddress[0][0]);
		}).then((_instance) => {
			instance = _instance;
			return actS[44].reduce((p, _, i) =>
				p.then(() =>
					actS[44][i] != 0 ? instance.record(timeS[i], 'TXF', priceS[i], _) : Promise.resolve()
				), Promise.resolve()).then(() => Trader.at(traderAddress[1][0]));
		}).then((_instance) => {
			instance = _instance;
			return actS[103].reduce((p, _, i) =>
				p.then(() =>
					actS[103][i] != 0 ? instance.record(timeS[i], 'TXF', priceS[i], _) : Promise.resolve()
				), Promise.resolve()).then(() => Trader.at(traderAddress[1][1]));
		}).then((_instance) => {
			instance = _instance;
			return actS[9].reduce((p, _, i) =>
				p.then(() =>
					actS[9][i] != 0 ? instance.record(timeS[i], 'TXF', priceS[i], _) : Promise.resolve()
				), Promise.resolve()).then(() => Trader.at(traderAddress[2][0]));
		}).then((_instance) => {
			instance = _instance;
			return actS[61].reduce((p, _, i) =>
				p.then(() =>
					actS[61][i] != 0 ? instance.record(timeS[i], 'TXF', priceS[i], _) : Promise.resolve()
				), Promise.resolve()).then(() => Trader.at(traderAddress[3][0]));
		}).then((_instance) => {
			instance = _instance;
			actS[0].reduce((p, _, i) =>
				p.then(() =>
					actS[0][i] != 0 ? instance.record(timeS[i], 'TXF', priceS[i], _) : Promise.resolve()
				), Promise.resolve())
		});
};