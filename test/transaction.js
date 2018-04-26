'use strict'

var TraderCenter = artifacts.require("./TraderCenter.sol");
var Trader = artifacts.require("./Trader.sol");

var basic = require('.././src/js/policy/basic.js')
var actS = require('../acts.js')
// Trader.instance.record((new Date(time)).valueOf(), stock, price, amount)



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
			return basic.timeS.reduce((p, _, i) =>
				p.then(() =>
					actS[98][i] != 0 ? instance.record(basic.dateS[i] + basic.timeS[i], 'TXF', basic.priceS[i], actS[98][i]) : Promise.resolve()
				), Promise.resolve()).then(() => Trader.at(traderAddress[1][0]));
		}).then((_instance) => {
			instance = _instance;
			return basic.timeS.reduce((p, _, i) =>
				p.then(() =>
					actS[101][i] != 0 ? instance.record(basic.dateS[i] + basic.timeS[i], 'TXF', basic.priceS[i], actS[101][i]) : Promise.resolve()
				), Promise.resolve()).then(() => Trader.at(traderAddress[1][1]));
		}).then((_instance) => {
			instance = _instance;
			return basic.timeS.reduce((p, _, i) =>
				p.then(() =>
					actS[15][i] != 0 ? instance.record(basic.dateS[i] + basic.timeS[i], 'TXF', basic.priceS[i], actS[15][i]) : Promise.resolve()
				), Promise.resolve()).then(() => Trader.at(traderAddress[2][0]));
		}).then((_instance) => {
			instance = _instance;
			return basic.timeS.reduce((p, _, i) =>
				p.then(() =>
					actS[3][i] != 0 ? instance.record(basic.dateS[i] + basic.timeS[i], 'TXF', basic.priceS[i], actS[3][i]) : Promise.resolve()
				), Promise.resolve()).then(() => Trader.at(traderAddress[3][0]));
		}).then((_instance) => {
			instance = _instance;
			basic.timeS.reduce((p, _, i) =>
				p.then(() =>
					actS[25][i] != 0 ? instance.record(basic.dateS[i] + basic.timeS[i], 'TXF', basic.priceS[i], actS[25][i]) : Promise.resolve()
				), Promise.resolve())
		});
};