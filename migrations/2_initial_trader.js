
var Trader = artifacts.require("./Trader.sol");

module.exports = function(deployer) {
	deployer.deploy(Trader);
};