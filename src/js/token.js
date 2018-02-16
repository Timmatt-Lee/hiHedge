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
	sellPrice: 1,
	buyPrice: 1,


	init: function() {
		// 初始化UI
		Token.initUI();
		return Token.bindEvents(); // 監聽UI，綁定事件
	},

	bindEvents: function() {
		$(document).on('click', '#token #transfer button', Token.handleTransfer);
		$(document).on('click', '#token #buy button', Token.handleBuy);
		$(document).on('click', '#token #sell button', Token.handleSell);
		$(document).on('click', '#token #setBuyPrice button', Token.handleSetBuyPrice);
		$(document).on('click', '#token #setSellPrice button', Token.handleSetSellPrice);
	},

	// 要與區塊鏈同步的資料
	async: function() {
		Token.getBalances();
		Token.getPrices();
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
			Token.getPrices();
			return true;

		}).then((_isSuccuss) =>
			console.log((_isSuccuss ? 'Succuss' : 'Fail') + ': init imformations!')
		).catch((error) =>
			console.log('Error: init imformations: ', error.message));
	},

	updateUI: function() {
		// 更新Balances
		$('#token #user_wallet .balance').text(Token.userTokenBalance);
		$('#token #minter_wallet .balance').text(Token.minterTokenBalance);
		$('#user_wallet .etherBalance').text(Token.userEtherBalance);
		$('#minter_wallet .etherBalance').text(Token.minterEtherBalance);

		//更新買賣價
		$('#token .sellPrice').text(Token.sellPrice);
		$('#token .buyPrice').text(Token.buyPrice);

		//更新設定買賣價的place holder
		$('#token #setBuyPrice input').attr('placeholder', 'ether/' + Token.name);
		$('#token #setSellPrice input').attr('placeholder', 'ether/' + Token.name);
		return true;
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

		}).then((_isUpdated) =>
			console.log((_isUpdated ? 'Succuss: ' : 'Fail: ') + _message + ' updated!')

		).catch((error) =>
			console.log('Error: get balances: ', error.message));

	},

	handleTransfer: function() {
		var _amount = $('#token #transfer input[placeholder="Amount"]').val();
		var _toAddress = $('#token #transfer  input[placeholder="Address"]').val();

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
		var _buyValue = $('#token #buy input').val();
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
		var _sellAmount = $('#token #sell input').val();
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

	handleSetSellPrice: function() {
		var _sellPrice = $('#token #setSellPrice input').val();
		var _message = 'set sell price for ' + _sellPrice + ' ether/' + Token.name;

		console.log('Pending: ' + _message + ' ...');

		Token.contract.then(() => {
			if (_sellPrice <= 0)
				throw { message: 'price should more than 0' };
			return Token.instance.setSellPrice(_sellPrice, { from: web3.eth.defaultAccount });

		}).then(() => {
			alert('Success: ' + _message + ' !');
			return Token.getPrices();

		}).catch((error) =>
			console.log('Error: set sell price: ', error.message));

	},

	handleSetBuyPrice: function() {
		var _buyPrice = $('#token #setBuyPrice input').val();
		var _message = 'set buy price for ' + _buyPrice + ' ether/' + Token.name;

		console.log('Pending: ' + _message + ' ...');

		Token.contract.then(() => {
			if (_buyPrice <= 0)
				throw { message: 'price should more than 0' };
			return Token.instance.setBuyPrice(_buyPrice, { from: web3.eth.defaultAccount });

		}).then(() => {
			alert('Success: ' + _message + ' !');
			return Token.getPrices();

		}).catch((error) =>
			console.log('Error: set buy price: ', error.message));

	},

	getPrices: function() {
		var _message = 'sell & buy prices';
		console.log('Loading: ' + _message + ' ...');

		Token.contract.then(function() {
			return Token.instance.sellPrice();

		}).then(function(_sellPrice) {
			Token.sellPrice = _sellPrice;
			return Token.instance.buyPrice();

		}).then(function(_buyPrice) {
			Token.buyPrice = _buyPrice;
			return Token.updateUI();

		}).then((_isUpdated) =>
			console.log((_isUpdated ? 'Succuss: ' : 'Fail: ') + _message + ' updated!')

		).catch((error) =>
			console.log('Error: get prices: ', error.message));

	},


};


// 回傳要不要加s
function plural(value, str) {
	return value + ' ' + str + (value > 1 ? 's' : '');
};