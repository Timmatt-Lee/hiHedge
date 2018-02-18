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
	isFrozen: false,


	init: function() {
		Token.initUI(); // 初始化UI
		Token.bindEvents(); // 監聽UI，綁定事件
		Token.listeners(); // 監聽事件
		return true;
	},

	bindEvents: function() {
		$(document).on('click', '#token #transfer button', Token.transfer);
		$(document).on('click', '#token #buy button', Token.buy);
		$(document).on('click', '#token #sell button', Token.sell);
		$(document).on('click', '#token #setBuyPrice button', Token.setBuyPrice);
		$(document).on('click', '#token #setSellPrice button', Token.setSellPrice);
		$(document).on('click', '#token #mint button', Token.mint);
		$(document).on('click', '#token #freeze input+button', Token.getFrozen);
		$(document).on('click', '#token #freeze .btn-group button', Token.toggleFrozen);
	},

	listeners: function() {
		$('#token #freeze input').on('keydown', function() { $('#token #freeze .btn-group').hide(); });
	},

	// 要與區塊鏈同步的資料
	async: function() {
		// 取得ether、token的餘額
		Token.getBalances();
		// 取得現在token比ether的買賣價
		Token.getPrices();
		// 取得此帳戶有沒有被凍結
		Token.getThisFrozen();
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
			// 設定買賣價的place holder
			$('#token #setPrices input').attr('placeholder', 'ether/' + Token.name);
			Token.owner = _owner;
			// 針對是否為owner去禁止或開放一些UI
			var _isOwner = web3.eth.defaultAccount == Token.owner;
			$(multiSelector('#token ', ['#setPrices', '#mint', '#freeze'], ' [data-toggle="tooltip"]')).tooltip(_isOwner ? 'disable' : 'enable');
			$(multiSelector('#token ', ['#setPrices', '#mint', '#freeze'], ' *')).prop('disabled', !_isOwner);

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

		// 若帳戶被凍結
		$(multiSelector('#token ', ['#transfer', '#sell', '#buy'], ' [data-toggle="tooltip"]')).tooltip(Token.isFrozen ? 'enable' : 'disable');
		$(multiSelector('#token ', ['#transfer', '#sell', '#buy'], ' *')).prop('disabled', Token.isFrozen);
		if ($('#token #freeze input').val() == 0) { // 為零代表是抓此使用者
			$('#token #freeze .btn-group button:first').prop('disabled', Token.isFrozen);
			$('#token #freeze .btn-group button:last').prop('disabled', !Token.isFrozen);
		}

		return true;
	},

	getBalances: function() {
		var _message = Token.name + ' & ether balances';
		console.log('Loading: ' + _message + ' ...');

		Token.contract.then(function() {
			return Token.instance.getBalances();

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
		var _toAddress = $('#token #transfer  input[placeholder="Address"]').val();
		var _amount = $('#token #transfer input[placeholder="Amount"]').val();

		var _message = 'transfer ' + plural(_amount, Token.name) + ' to ' + _toAddress;
		console.log('Pending: ' + _message + ' ...');

		Token.contract.then(() => {
			// 如果沒在前端攔截，進到合約裡面它會自動把負數變成uint，然後就爆了
			if (_amount <= 0) {
				alert('Amount should more than 0');
				throw { message: 'amount should more than 0' };
			}
			// 用預設帳號進行token轉帳
			return Token.instance.transfer(_toAddress, web3.toWei(_amount));

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
			// 如果沒在前端攔截，進到合約裡面它會自動把負數變成uint，然後就爆了
			if (_sellAmount <= 0) {
				alert('Amount should more than 0');
				throw { message: 'amount should more than 0' };
			}
			return Token.instance.sell.call(web3.toWei(_sellAmount));

		}).then((result) => {
			_soldValue = result;
			return Token.instance.sell(web3.toWei(_sellAmount));

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
			// 如果沒在前端攔截，進到合約裡面它會自動把負數變成uint，然後就爆了
			if (_buyValue <= 0) {
				alert('Price should more than 0');
				throw { message: 'price should more than 0' };
			}
			// 換算成ether
			return Token.instance.buy.call({ value: web3.toWei(_buyValue) });

		}).then((result) => {
			_boughtAmount = result;
			return Token.instance.buy({ value: web3.toWei(_buyValue) });

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
			// 如果沒在前端攔截，進到合約裡面它會自動把負數變成uint，然後就爆了
			if (_sellPrice <= 0) {
				alert('Price should more than 0');
				throw { message: 'price should more than 0' };
			}
			return Token.instance.setSellPrice(web3.toWei(_sellPrice));

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
			// 如果沒在前端攔截，進到合約裡面它會自動把負數變成uint，然後就爆了
			if (_buyPrice <= 0) {
				alert('Price should more than 0');
				throw { message: 'price should more than 0' };
			}
			return Token.instance.setBuyPrice(web3.toWei(_buyPrice));

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

	mint: function() {
		var _toAddress = $('#token #mint  input[placeholder="Address"]').val();
		var _amount = $('#token #mint input[placeholder="Amount"]').val();

		// 如果留空則設為預設使用者
		if (_toAddress == 0)
			_toAddress = web3.eth.defaultAccount;

		var _message = 'mint ' + plural(_amount, Token.name) + ' to ' + _toAddress;
		console.log('Pending: ' + _message + ' ...');

		Token.contract.then(() => {
			// 如果沒在前端攔截，進到合約裡面它會自動把負數變成uint，然後就爆了
			if (_amount <= 0) {
				alert('Amount should more than 0');
				throw { message: 'amount should more than 0' };
			}
			// 用預設帳號發幣
			return Token.instance.mint(_toAddress, web3.toWei(_amount));

		}).then(() => {
			Token.getBalances();
			return true;

		}).then((_isSuccuss) =>
			alert((_isSuccuss ? 'Succuss ' : 'Fail ') + _message + '!')

		).catch((error) =>
			console.log('Error: mint: ', error.message));
	},

	getFrozen: function() {
		var _address = $('#token #freeze input').val();
		var _isFrozen;

		// 如果留空則設為預設使用者
		if (_address == 0)
			_address = web3.eth.defaultAccount;

		console.log('Loading: ' + _address + ' got frozen or not...');

		Token.contract.then(() => {
			return Token.instance.frozenAccount(_address);

		}).then((result) => {
			_isFrozen = result;

			$('#token #freeze .btn-group').show();
			// 針對帳號凍結訊息顯示按鈕
			$('#token #freeze .btn-group button:first').prop('disabled', _isFrozen);
			$('#token #freeze .btn-group button:last').prop('disabled', !_isFrozen);

			return true;

		}).then((_isSuccuss) =>
			console.log((_isSuccuss ? 'Succuss: ' : 'Fail: ') + _address + (_isFrozen ? ' is' : ' is NOT') + ' frozen !')

		).catch((error) =>
			console.log('Error: get frozen information: ', error.message));
	},

	toggleFrozen: function() {
		var _address = $('#token #freeze input').val();

		// 如果留空則設為預設使用者
		if (_address == 0)
			_address = web3.eth.defaultAccount;

		console.log('Pending: toggle frozen state of ' + _address + ' ...');

		Token.contract.then(() => {
			return Token.instance.toggleFrozen(_address);

		}).then(() =>
			console.log('Success: toggle frozen state of ' + _address + ' !')

		).catch((error) =>
			console.log('Error: toggle frozen: ', error.message));;

	},

	getThisFrozen: function() {
		var _message = 'get this account\'s frozen information';
		console.log('Loading: ' + _message + ' ...');

		Token.contract.then(() => {
			return Token.instance.frozenAccount(web3.eth.defaultAccount);

		}).then((_isFrozen) => {
			Token.isFrozen = _isFrozen;
			return Token.updateUI();

		}).then((_isUpdated) =>
			console.log((_isUpdated ? 'Succuss: ' : 'Fail: ') + _message + ' updated!')

		).catch((error) =>
			console.log('Error: get this forzen: ', error.message));

	},

};


// 回傳要不要加s
function plural(value, str) {
	return value + ' ' + str + (value > 1 ? 's' : '');
};

// 更方便的填入有繼承關係的選擇器
function multiSelector(preStr, arr, postStr) {
	var result = '';
	for (i in arr) {
		if (i > 0) // 第一項之後就需要加','
			result += ','
		result += (preStr + arr[i] + postStr);
	}
	return result;
};