Token = {
	contract: null,
	instance: null,
	symbol: '',
	name: '',
	owner: null,
	userTokenBalance: 0,
	minterTokenBalance: 0,
	userEtherBalance: 0,
	minterEtherBalance: 0,
	sellPrice: 1,
	buyPrice: 1,
	isFrozen: false,
	myAllowance: null,
	forMeAllowance: null,


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
		$(document).on('click', '#token #freeze .btn-group button', Token.toggleFrozen);
		$(document).on('click', '#token #approve button', Token.approve);
		$(document).on('click', '#token #transferFrom button', Token.transferFrom);
	},

	listeners: function() {
		$('#token #freeze input').on('keyup', function() { Token.updateFrozenButton(); });
	},

	// 要與區塊鏈同步的資料
	async: function() {
		// 取得ether、token的餘額
		Token.getBalances();
		// 取得現在token比ether的買賣價
		Token.getPrices();
		// 取得此帳戶有沒有被凍結
		Token.getThisFrozen();
		// 更新凍結欄位的帳戶的凍結狀態
		Token.updateFrozenButton();
		// 取得所有你認可的帳戶和對應允許金
		Token.getMyAllowance();
		// 取得所有認可你的帳戶和對應允許金
		Token.getForMeAllowance();
	},

	initUI: function() {
		console.log('Loading: init UI...');
		Token.contract.then(() => {
			// 使用者帳戶地址
			$('#token .address').text(web3.eth.defaultAccount);
			// Token符號
			return Token.instance.symbol();

		}).then((_symbol) => {
			Token.symbol = _symbol;
			$('#token .symbol').text(Token.symbol);
			// 設定買賣價的place holder
			$('#token #setSellPrice input,#token #setBuyPrice input').attr('placeholder', 'ether / ' + Token.symbol);
			// Token名稱
			return Token.instance.name();

		}).then((_name) => {
			Token.name = _name;
			$('#token .name').text(Token.name);
			// Token owner地址
			return Token.instance.owner();

		}).then((_owner) => {
			Token.owner = _owner;
			// 針對是否為owner去禁止欄位
			var _isOwner = web3.eth.defaultAccount == Token.owner;
			$('#token .isOwnerTooltip').tooltip(_isOwner ? 'disable' : 'enable');
			$('#token .isOwnerTooltip *').prop('disabled', !_isOwner);
			// 更新動態內容
			Token.async();
			// 成功
			console.log('Success: init UI!');

		}).catch((error) =>
			console.error('Token.initUI(): ', error.message));
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
		$('#token .isFrozenTooltip').tooltip(Token.isFrozen ? 'enable' : 'disable');
		$('#token .isFrozenTooltip *').prop('disabled', Token.isFrozen);

		// 更新允許清單
		$('#token #myAllowance_list table tbody').empty();
		$.each(Token.myAllowance, function(index, [account, value]) {
			$('#token #myAllowance_list table > tbody').append('<tr><th scope="row">' + (index + 1) + '</th> <td>' + account + '</td> <td>' + value + '</td></tr>');
		});

		// 更新被允許清單
		$('#token #forMeAllowance_list table tbody').empty();
		$.each(Token.forMeAllowance, function(index, [account, value]) {
			$('#token #forMeAllowance_list table > tbody').append('<tr><th scope="row">' + (index + 1) + '</th> <td>' + account + '</td> <td>' + value + '</td></tr>');
		});
	},

	getBalances: function() {
		var _message = Token.name + ' & ether balances';
		console.log('Loading: ' + _message + '...');

		Token.contract.then(function() {
			return Token.instance.getBalances();

		}).then(function(_balances) {
			Token.minterTokenBalance = web3.fromWei(_balances[0]);
			Token.userTokenBalance = web3.fromWei(_balances[1]);
			Token.minterEtherBalance = web3.fromWei(_balances[2]);
			Token.userEtherBalance = web3.fromWei(_balances[3]);
			Token.updateUI();
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) =>
			console.error('Token.getBalances(): ', error.message));
	},

	transfer: function() {
		var _toAddress = $('#token #transfer input[placeholder="Address"]').val();
		var _amount = $('#token #transfer input[placeholder="Amount"]').val();

		var _message = 'transfer ' + _amount + Token.symbol + ' to ' + _toAddress;
		console.log('Pending: ' + _message + '...');

		Token.contract.then(() => {
			// 如果沒在前端攔截，進到合約裡面它會自動把負數變成uint，然後就爆了
			if (_amount <= 0) {
				alert('Amount should more than 0');
				throw { message: 'amount should more than 0' };
			}
			return Token.instance.transfer(_toAddress, web3.toWei(_amount));

		}).then(() =>
			alert('Success: ' + _message + '!')

		).catch((error) =>
			console.error('Token.transfer(): ', error.message));
	},

	sell: function() {
		var _sellAmount = $('#token #sell input').val();
		var _message = 'sell ' + _sellAmount + Token.symbol;
		var _soldValue;

		console.log('Pending: ' + _message + '...');

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
			alert('Success: ' + _message + ' for ' + web3.fromWei(_soldValue) + ' ether!')

		).catch((error) =>
			console.error('Token.sell(): ', error.message));
	},

	buy: function() {
		var _buyValue = $('#token #buy input').val();
		var _message = ' by ' + _buyValue + 'ether';
		var _boughtAmount;

		console.log('Pending: buy ' + Token.symbol + _message + '...');

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
			alert('Success: buy ' + web3.fromWei(_boughtAmount) + Token.symbol + _message + '!')

		).catch((error) =>
			console.error('Token.buy(): ', error.message));
	},

	setSellPrice: function() {
		var _sellPrice = $('#token #setSellPrice input').val();
		var _message = 'set sell price for ' + _sellPrice + ' ether / ' + Token.symbol;

		console.log('Pending: ' + _message + '...');

		Token.contract.then(() => {
			// 如果沒在前端攔截，進到合約裡面它會自動把負數變成uint，然後就爆了
			if (_sellPrice <= 0) {
				alert('Price should more than 0');
				throw { message: 'price should more than 0' };
			}
			return Token.instance.setSellPrice(web3.toWei(_sellPrice));

		}).then(() => {
			alert('Success: ' + _message + '!');

		}).catch((error) =>
			console.error('Token.set sell price: ', error.message));
	},

	setBuyPrice: function() {
		var _buyPrice = $('#token #setBuyPrice input').val();
		var _message = 'set buy price for ' + _buyPrice + ' ether / ' + Token.symbol;

		console.log('Pending: ' + _message + '...');

		Token.contract.then(() => {
			// 如果沒在前端攔截，進到合約裡面它會自動把負數變成uint，然後就爆了
			if (_buyPrice <= 0) {
				alert('Price should more than 0');
				throw { message: 'price should more than 0' };
			}
			return Token.instance.setBuyPrice(web3.toWei(_buyPrice));

		}).then(() => {
			alert('Success: ' + _message + '!');

		}).catch((error) =>
			console.error('Token.setBuyPrice(): ', error.message));
	},

	getPrices: function() {
		var _message = 'sell & buy prices';
		console.log('Loading: ' + _message + '...');

		Token.contract.then(function() {
			return Token.instance.sellPrice();

		}).then(function(_sellPrice) {
			Token.sellPrice = web3.fromWei(_sellPrice);
			return Token.instance.buyPrice();

		}).then(function(_buyPrice) {
			Token.buyPrice = web3.fromWei(_buyPrice);
			Token.updateUI();
			// 成功
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) =>
			console.error('Token.getPrices(): ', error.message));
	},

	mint: function() {
		var _toAddress = $('#token #mint input[placeholder="Address"]').val();
		var _amount = $('#token #mint input[placeholder="Amount"]').val();

		// 如果留空則設為預設使用者
		if (_toAddress == '')
			_toAddress = web3.eth.defaultAccount;

		var _message = 'mint ' + _amount + Token.symbol + ' to ' + _toAddress;
		console.log('Pending: ' + _message + '...');

		Token.contract.then(() => {
			// 如果沒在前端攔截，進到合約裡面它會自動把負數變成uint，然後就爆了
			if (_amount <= 0) {
				alert('Amount should more than 0');
				throw { message: 'amount should more than 0' };
			}
			return Token.instance.mint(_toAddress, web3.toWei(_amount));

		}).then(() =>
			alert('Success: ' + _message + '!')

		).catch((error) =>
			console.error('Token.mint(): ', error.message));
	},

	updateFrozenButton: function() {
		var _address = $('#token #freeze input').val();

		// 如果留空則設為預設使用者
		if (_address == '')
			_address = web3.eth.defaultAccount;

		var _message = 'frozen button state for ' + _address;
		console.log('Loading: ' + _message + ' ...');

		Token.getFrozen(_address).then((_isFrozen) => {
			// 更新pre內文，顯示目前帳戶是否被凍結
			$('#token #freeze pre').text((_address == web3.eth.defaultAccount ? 'You are' : 'is') + (_isFrozen ? ' ' : ' NOT ') + 'frozen!');
			// 用btn-secondary、btn-primary指示現在的狀態可以操作的動作（即toggle它的狀態）
			$('#token #freeze .btn-group button:first').removeClass(!_isFrozen ? 'btn-secondary' : 'btn-primary').addClass(_isFrozen ? 'btn-secondary' : 'btn-primary');
			$('#token #freeze .btn-group button:last').removeClass(_isFrozen ? 'btn-secondary' : 'btn-primary').addClass(!_isFrozen ? 'btn-secondary' : 'btn-primary');
			// 只有發幣者才有權限按按鈕，沒有權限的人只能永遠看他disable
			if (web3.eth.defaultAccount == Token.owner) {
				// 針對帳戶凍結訊息鎖定/解鎖按鈕
				$('#token #freeze .btn-group button:first').prop('disabled', _isFrozen);
				$('#token #freeze .btn-group button:last').prop('disabled', !_isFrozen);
			}
			// 成功
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) =>
			console.error('Token.updateFrozenButton(): ', error.message));
	},

	toggleFrozen: function() {
		var _address = $('#token #freeze input').val();

		// 如果留空則設為預設使用者
		if (_address == '')
			_address = web3.eth.defaultAccount;

		var _isFrozen;
		Token.getFrozen(_address).then((result) => _isFrozen = result);

		console.log('Pending: ' + (_isFrozen ? 'Unfreeze ' : 'Freeze ') + _address + '...');

		Token.contract.then(() => {
			return Token.instance.toggleFrozen(_address);

		}).then(() =>
			alert('Success: ' + (_isFrozen ? 'Unfreeze ' : 'Freeze ') + _address + '!')

		).catch((error) =>
			console.error('Token.toggleFrozen(): ', error.message));
	},

	getThisFrozen: function() {
		var _message = 'this account\'s frozen state';
		console.log('Loading: ' + _message + '...');

		Token.getFrozen(web3.eth.defaultAccount).then((_isFrozen) => {
			Token.isFrozen = _isFrozen;
			// 成功
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) =>
			console.error('Token.getThisFrozen(): ', error.message));
	},

	getFrozen: function(_address) {
		return Token.contract.then(() => {
			return Token.instance.frozenAccount(_address);

		}).catch((error) =>
			console.error('Token.getForzen(): ', error.message));
	},

	approve: function() {
		var _toAddress = $('#token #approve  input[placeholder="Address"]').val();
		var _amount = $('#token #approve input[placeholder="Amount"]').val();

		// 如果Address留空則設為預設使用者
		if (_toAddress == '')
			_toAddress = web3.eth.defaultAccount;

		// 如果Amount留空則設為0
		if (_toAddress == '')
			_amount = 0;

		var _message = 'approve ' + _toAddress + ' with ' + _amount + Token.symbol;
		console.log('Pending: ' + _message + '...');

		Token.contract.then(() => {
			// 如果沒在前端攔截，進到合約裡面它會自動把負數變成uint，然後就爆了
			if (_amount < 0) {
				alert('Amount should not be negative');
				throw { message: 'amount should not be negative' };
			}
			return Token.instance.approve(_toAddress, web3.toWei(_amount));

		}).then(() =>
			alert('Success: ' + _message + '!')

		).catch((error) =>
			console.error('Token.approve: ', error.message));
	},

	getMyAllowance: function() {
		var _message = 'this account\'s allowance list';
		console.log('Loading: ' + _message + '...');

		Token.contract.then(() => {
			return Token.instance.getMyAllowance();

		}).then((result) => {
			// 排序允許操控金額的多寡
			Token.myAllowance = [];
			for (i = 0; i < result[0].length; i++)
				Token.myAllowance.push([result[0][i], web3.fromWei(result[1][i])]);
			Token.myAllowance.sort(function(a, b) {
				return b[1] - a[1];
			});
			Token.updateUI();
			// 成功
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) =>
			console.error('Token.getMyAllowance(): ', error.message));
	},

	getForMeAllowance: function() {
		var _message = 'the list of allowances who have approved you';
		console.log('Loading: ' + _message + '...');

		Token.contract.then(() => {
			return Token.instance.getForMeAllowance();

		}).then((result) => {
			// 排序允許操控金額的多寡
			Token.forMeAllowance = [];
			for (i = 0; i < result[0].length; i++)
				Token.forMeAllowance.push([result[0][i], web3.fromWei(result[1][i])]);
			Token.forMeAllowance.sort(function(a, b) {
				return b[1] - a[1];
			});
			Token.updateUI();
			// 成功
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) =>
			console.error('Token.getForMeAllowance(): ', error.message));
	},

	transferFrom: function() {
		var _fromAddress = $('#token #transferFrom input[placeholder="Address from"]').val();
		var _toAddress = $('#token #transferFrom input[placeholder="Address to"]').val();
		var _amount = $('#token #transferFrom input[placeholder="Amount"]').val();

		// 如果留空則設為預設使用者
		if (_toAddress == '')
			_toAddress = web3.eth.defaultAccount;

		var _message = 'transfer ' + _amount + Token.symbol + ' from ' + _fromAddress + ' to ' + _toAddress;
		console.log('Pending: ' + _message + '...');

		Token.contract.then(() => {
			// 如果沒在前端攔截，進到合約裡面它會自動把負數變成uint，然後就爆了
			if (_amount <= 0) {
				alert('Amount should more than 0');
				throw { message: 'amount should more than 0' };
			}
			// 直接call合約檢查
			return Token.instance.getForMeAllowance();

		}).then((result) => {
			var _index = result[0].indexOf(_fromAddress)
			// 檢查有沒有得到來源帳戶的許可
			if (_index == -1) {
				alert('You have not approved');
				throw { message: _fromAddress + ' have not approved you' };
			}
			// 檢查來源帳戶的許可金額
			if (_amount > web3.fromWei(result[1][_index]).c[0]) {
				alert('Allowance is not enough');
				throw { message: 'allowance is not enough' };
			}
			return Token.instance.transferFrom(_fromAddress, _toAddress, web3.toWei(_amount));

		}).then(() =>
			alert('Success ' + _message + '!')

		).catch((error) =>
			console.error('Token.transferFrom(): ', error.message));
	},

};