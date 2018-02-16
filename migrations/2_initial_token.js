
var Token = artifacts.require("./Token.sol");

module.exports = function(deployer) {
	deployer.deploy(Token, 100, "hiCoin", "✋", { value: 10000000000000000000 }); // 建構一個Token然後傳10 ether給他
};