'use strict'

var TraderCenter = artifacts.require("./TraderCenter.sol");
var Trader = artifacts.require("./Trader.sol");

module.exports = function(callback) {

	var traderAddress = [];
	var instance;

	return TraderCenter.deployed()
		.then((_instance) =>
			instance = _instance
		).then(() =>
			instance.registerTrader(1000000, web3.toWei(0.0001), web3.toWei(0.1), 0, {
				from: web3.eth.accounts[0],
				value: web3.toWei(10)
			})
		).then(() =>
			instance.registerTrader(100000, web3.toWei(0.002), web3.toWei(0.2), web3.toWei(0.25), {
				from: web3.eth.accounts[1],
				value: web3.toWei(20)
			})
		).then(() =>
			instance.registerTrader(10000, web3.toWei(0.02), web3.toWei(0.2), web3.toWei(0.5), {
				from: web3.eth.accounts[1],
				value: web3.toWei(2.22222222)
			})
		).then(() =>
			instance.registerTrader(1000, web3.toWei(0.3), web3.toWei(0.3), web3.toWei(0.75), {
				from: web3.eth.accounts[2],
				value: web3.toWei(30)
			})
		).then(() =>
			instance.registerTrader(100, web3.toWei(4), web3.toWei(0.4), web3.toWei(1), {
				from: web3.eth.accounts[3],
				value: web3.toWei(40)
			})
		).then(() => {
			return instance.getTraders(web3.eth.accounts[0]);
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
		}).then((_instance) =>
			instance = _instance
		).then(() =>
			instance.buy({
				from: web3.eth.accounts[1],
				value: web3.toWei(2)
			})
		).then(() =>
			instance.buy({
				from: web3.eth.accounts[2],
				value: web3.toWei(3.1415926)
			})
		).then(() =>
			instance.buy({
				from: web3.eth.accounts[3],
				value: web3.toWei(4.4)
			})
		).then(() =>
			instance.buy({
				from: web3.eth.accounts[4],
				value: web3.toWei(50.1)
			})
		).then(() =>
			instance.getSubscribers()
		).then((_subscribers) => {
			console.log("Subscribers for Account 0 :", _subscribers)
			return Trader.at(traderAddress[1][0]);
		}).then((_instance) => {
			instance = _instance
			_instance.buy({
				from: web3.eth.accounts[0],
				value: web3.toWei(1.23456789)
			});
			return Trader.at(traderAddress[2][0]);
		}).then((_instance) => {
			instance = _instance
			_instance.buy({
				from: web3.eth.accounts[0],
				value: web3.toWei(1.1111111)
			});
			return Trader.at(traderAddress[3][0]);
		}).then((_instance) => {
			instance = _instance
			_instance.buy({
				from: web3.eth.accounts[0],
				value: web3.toWei(10)
			});
		});
};