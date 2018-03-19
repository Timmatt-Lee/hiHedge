// console.log(web3.eth.getBalance);

var Trader = artifacts.require("./Trader.sol");

contract('Trader', (accounts) => {
	Trader.at("0x345ca3e014aaf5dca488057592ee47305d9b3e10").then((instance) => {
		//console.log(instance);
		return instance.trader[0];
	}).then((arr) =>
		//assert.equal(arr.length, 2, "10000 wasn't in the first account")
		console.log(arr)
	)
	// it("should put 10000 Trader in the first account", () =>
	// 	Trader.at("0x345ca3e014aaf5dca488057592ee47305d9b3e10").then((instance) => {
	// 		//console.log(instance);
	// 		return instance.trader[0];
	// 	}).then((arr) =>
	// 		//assert.equal(arr.length, 2, "10000 wasn't in the first account")
	// 		console.log(arr)
	// 	)
	// );
});