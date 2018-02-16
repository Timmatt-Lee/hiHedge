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
		$(document).on('click', '#token #transfer button', Token.transfer);
		$(document).on('click', '#token #buy button', Token.buy);
		$(document).on('click', '#token #sell button', Token.sell);
		$(document).on('click', '#token #setBuyPrice button', Token.setBuyPrice);
		$(document).on('click', '#token #setSellPrice button', Token.setSellPrice);
	},

	// 要與區塊鏈同步的資料
	async: function() {
		Token.getBalances();
		Token.getPrices();
	},

	initUI: function() {
		console.log('Loading: init imformations...');
		Token.contract.then(() => {
			// Token符號
			return Token.instance.symbol()

		}).then((_symbol) => {
			Token.symbol = _symbol;
			$('#token .symbol').text(Token.symbol);
			// Token名稱
			return Token.instance.name();

		}).then((_name) => {
			Token.name = _name;
			$('#token .name').text(Token.name);
			// Token owner地址
			return Token.instance.owner();

		}).then((_owner) => {
			Token.owner = _owner;
			// 針對是否為owner去禁止或開放一些UI
			if (web3.eth.defaultAccount == Token.owner) {
				// 更新設定買賣價的place holder
				$('#token #setPrices input').attr('placeholder', 'ether/' + Token.name);
			} else {
				// 將設定買賣價的按鈕封鎖
				$('#token #setPrices button').prop('disabled', true);
				// 禁止買賣
				$('#token #setPrices input').prop('disabled', true);
				$('#token #setPrices input').attr('placeholder', 'Sorry, you have no permission');
			}

			// 更新動態內容
			Token.getBalances();
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

		// 更新買賣價
		$('#token .sellPrice').text(Token.sellPrice);
		$('#token .buyPrice').text(Token.buyPrice);

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

	transfer: function() {
		var _amount = $('#token #transfer input[placeholder="Amount"]').val();
		var _toAddress = $('#token #transfer  input[placeholder="Address"]').val();

		var _message = 'transfer ' + plural(_amount, Token.name) + ' to ' + _toAddress;
		console.log('Pending: ' + _message + ' ...');

		Token.contract.then(() => {
			// 用預設帳號進行token轉帳
			return Token.instance.transfer(_toAddress, web3.toWei(_amount), { from: web3.eth.defaultAccount });

		}).then(() => {
			Token.getBalances();
			return true;

		}).then((_isSuccuss) =>
			alert((_isSuccuss ? 'Succuss ' : 'Fail ') + _message + '!')

		).catch((error) =>
			console.log('Error: transfer: ', error.message));
	},

	sell: function() {
		var _sellAmount = $('#token #sell input').val();
		var _message = plural(_sellAmount, Token.name);
		var _soldValue;

		console.log('Pending: sell ' + _message + ' ...');

		Token.contract.then(() => {
			return Token.instance.sell.call(web3.toWei(_sellAmount));

		}).then((result) => {
			_soldValue = result;
			return Token.instance.sell(web3.toWei(_sellAmount), { from: web3.eth.defaultAccount });

		}).then(() =>
			alert('Success: sell ' + _message + ' for ' + plural(web3.fromWei(_soldValue), 'ether') + '!')

		).catch((error) =>
			console.log('Error: sell: ', error.message));

	},

	buy: function() {
		var _buyValue = $('#token #buy input').val();
		var _message = ' by ' + plural(_buyValue, 'ether');
		var _boughtAmount;

		console.log('Pending: buy ' + Token.name + _message + ' ...');

		Token.contract.then(() => {
			// 換算成ether
			return Token.instance.buy.call({ value: web3.toWei(_buyValue) });

		}).then((result) => {
			_boughtAmount = result;
			return Token.instance.buy({ from: web3.eth.defaultAccount, value: web3.toWei(_buyValue) });

		}).then(() =>
			alert('Success: buy ' + plural(web3.fromWei(_boughtAmount), Token.name) + _message + '!')

		).catch((error) =>
			console.log('Error: buy: ', error.message));

	},

	setSellPrice: function() {
		var _sellPrice = $('#token #setSellPrice input').val();
		var _message = 'set sell price for ' + _sellPrice + ' ether/' + Token.name;

		console.log('Pending: ' + _message + ' ...');

		Token.contract.then(() => {
			if (_sellPrice <= 0)
				throw { message: 'price should more than 0' };
			return Token.instance.setSellPrice(web3.toWei(_sellPrice), { from: web3.eth.defaultAccount });

		}).then(() => {
			alert('Success: ' + _message + ' !');
			return Token.getPrices();

		}).catch((error) =>
			console.log('Error: set sell price: ', error.message));

	},

	setBuyPrice: function() {
		var _buyPrice = $('#token #setBuyPrice input').val();
		var _message = 'set buy price for ' + _buyPrice + ' ether/' + Token.name;

		console.log('Pending: ' + _message + ' ...');

		Token.contract.then(() => {
			if (_buyPrice <= 0)
				throw { message: 'price should more than 0' };
			return Token.instance.setBuyPrice(web3.toWei(_buyPrice), { from: web3.eth.defaultAccount });

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
			Token.sellPrice = web3.fromWei(_sellPrice);
			return Token.instance.buyPrice();

		}).then(function(_buyPrice) {
			Token.buyPrice = web3.fromWei(_buyPrice);
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