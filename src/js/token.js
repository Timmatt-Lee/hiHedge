Token = {
	contract: null,
	instance: null,
	symbol: '',
	name: '',
	decimal: 0,
	owner: null,
	userTokenBalance: 0,
	minterTokenBalance: 0,
	userEtherBalance: 0,
	minterEtherBalance: 0,


	init: function() {
		// 初始化UI
		Token.initUI();
		return Token.bindEvents(); // 監聽UI，綁定事件
	},

	bindEvents: function() {
		$(document).on('click', '#token #transferButton', Token.handleTransfer);
		$(document).on('click', '#token #buyButton', Token.handleBuy);
		$(document).on('click', '#token #sellButton', Token.handleSell);
	},

	// 要與區塊鏈同步的資料
	async: function() {
		Token.getBalances();
	},

	initUI: function() {
		// 載入token符號和名稱...等靜態內容
		Token.contract.then(() => {
			console.log('Loading: init imformations...');
			return Token.instance.symbol()

		}).then((_symbol) => {
			Token.symbol = _symbol;
			$('#token .symbol').text(Token.symbol);
			return Token.instance.name();

		}).then((_name) => {
			Token.name = _name;
			$('#token .name').text(Token.name);
			Token.getBalances(); // 最後要記得呼叫動態內容
			return true;

		}).catch((error) => console.log('Error: init imformations: ', error.message)).then((_isSuccuss) =>
			console.log((_isSuccuss ? 'Succuss' : 'Fail') + ': init imformations!'));
	},

	updateUI: function() {
		$('#token #user_wallet .balance').text(Token.userTokenBalance);
		$('#token #minter_wallet .balance').text(Token.minterTokenBalance);
		$('#user_wallet .etherBalance').text(Token.userEtherBalance);
		$('#minter_wallet .etherBalance').text(Token.minterEtherBalance);
		return true;
	},

	handleTransfer: function() {
		var _amount = $('#token #transferAmount').val();
		var _toAddress = $('#token #transferAddress').val();

		var _message = 'transfer ' + plural(_amount, Token.name) + ' to ' + _toAddress;
		console.log('Pending: ' + _message + ' ...');

		Token.contract.then(() => {
			// 用預設帳號進行token轉帳
			return Token.instance.transfer(_toAddress, web3.toWei(_amount, 'ether'), { from: web3.eth.defaultAccount });

		}).then(() => {
			Token.getBalances();
			return true;

		}).then((_isSuccuss) =>
			alert((_isSuccuss ? 'Succuss ' : 'Fail ') + _message + '!')

		).catch((error) =>
			console.log('Error: transfer: ', error.message));
	},

	handleBuy: function() {
		var _buyValue = $('#token #buyValue').val();
		var _message = ' by ' + plural(_buyValue, 'ether');
		var _boughtAmount;

		console.log('Pending: buy ' + Token.name + _message + ' ...');

		Token.contract.then(() => {
			// 換算成ether
			return Token.instance.buy.call({ value: web3.toWei(_buyValue, 'ether') });

		}).then((result) => {
			_boughtAmount = result;
			return Token.instance.buy({ from: web3.eth.defaultAccount, value: web3.toWei(_buyValue, 'ether') });

		}).then(() =>
			alert('Success: buy ' + plural(web3.fromWei(_boughtAmount), Token.name) + _message + '!')

		).catch((error) =>
			console.log('Error: buy: ', error.message));

	},

	handleSell: function() {
		var _sellAmount = $('#token #sellValue').val();
		var _message = plural(_sellAmount, Token.name);
		var _soldValue;

		console.log('Pending: sell ' + _message + ' ...');

		Token.contract.then(() => {
			return Token.instance.sell.call(web3.toWei(_sellAmount, 'ether'));

		}).then((result) => {
			_soldValue = result;
			return Token.instance.sell(web3.toWei(_sellAmount, 'ether'), { from: web3.eth.defaultAccount });

		}).then(() =>
			alert('Success: sell ' + _message + ' for ' + plural(web3.fromWei(_soldValue), 'ether') + '!')

		).catch((error) =>
			console.log('Error: sell: ', error.message));

	},

	getBalances: function() {
		var _message = Token.name + ' & ether balances';
		console.log('Loading: ' + _message + ' ...');

		Token.contract.then(function() {
			return Token.instance.getBalances({ from: web3.eth.defaultAccount });

		}).then(function(_balances) {
			Token.minterTokenBalance = web3.fromWei(_balances[0]);
			Token.userTokenBalance = web3.fromWei(_balances[1]);
			Token.minterEtherBalance = web3.fromWei(_balances[2]);
			Token.userEtherBalance = web3.fromWei(_balances[3]);
			return Token.updateUI();

		}).then((_isUpdateBalance) =>
			console.log((_isUpdateBalance ? 'Succuss: ' : 'Fail: ') + _message + ' updated!')

		).catch((error) =>
			console.log('Error: getBalances: ', error.message));

	}

};


// 回傳要不要加s
function plural(value, str) {
	return value + ' ' + str + (value > 1 ? 's' : '');
};