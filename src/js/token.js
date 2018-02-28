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
	myAllowance: {},
	forMeAllowance: {},


	init: function() {
		Token.initUI(); // 初始化UI
		Token.bindEvents(); // 監聽UI，綁定事件
		Token.listeners(); // 監聽事件
		return true;
	},

	bindEvents: function() {
		// checkValidityMacro()會生成該選擇器下的檢查input是否valid的按鈕
		checkValidityMacro('#token-transfer', Token.transfer);
		checkValidityMacro('#token-sell', Token.sell);
		checkValidityMacro('#token-buy', Token.buy);
		checkValidityMacro('#token-setSellPrice', Token.setSellPrice);
		checkValidityMacro('#token-setBuyPrice', Token.setBuyPrice);
		checkValidityMacro('#token-mint', Token.mint);
		checkValidityMacro('#token-freeze', Token.toggleFrozen);
		checkValidityMacro('#token-approve', Token.approve);
		checkValidityMacro('#token-transferFrom', Token.transferFrom);
		checkValidityMacro('#token-burn', Token.burn);
		checkValidityMacro('#token-burnFrom', Token.burnFrom);
	},

	listeners: function() {
		$('#token-freeze input').on('keyup', () => { Token.updateFrozenForm(); });

		// 監聽event: Allowance
		Token.contract.then(() => {
			// 自己傳送的Allowance
			Token.instance.Allowance({ from: web3.eth.defaultAccount }, { fromBlock: 0 }, (error, result) => {
				if (error) {
					console.error('Token.getMyAllowance', error);
					return;
				}
				Token.myAllowance[result.args.to] = web3.fromWei(result.args.value);
			});
			// 被別人允許的Allowance
			Token.instance.Allowance({ to: web3.eth.defaultAccount }, { fromBlock: 0 }, (error, result) => {
				if (error) {
					console.error('Token.getForMeAllowance', error);
					return;
				}
				Token.forMeAllowance[result.args.from] = web3.fromWei(result.args.value);
			});
		}).catch((error) =>
			console.error('Token.Allowance(Event)', error.message));
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
		Token.updateFrozenForm();
	},

	initUI: function() {
		console.log('Loading: init UI...');

		// Tooltip基本attribute寫入
		$('.tooltip-notOwner').attr('data-toggle', 'tooltip');
		$('.tooltip-notOwner').attr('title', 'Need Authentication');
		$('.tooltip-gotFrozen').attr('data-toggle', 'tooltip');
		$('.tooltip-gotFrozen').attr('title', 'Sorry, you\'ve got frozen');
		// input後的invalid-tooltip的內文
		$('input[placeholder*="Address"] + .invalid-tooltip').text('I need a valid address');
		$('input[placeholder*="Amount"] + .invalid-tooltip, input[placeholder*="ether"] + .invalid-tooltip').text('Come on... give me a positive number');

		Token.contract.then(() => {
			// 使用者帳戶地址
			$('.ether-userAddress').text(web3.eth.defaultAccount);
			// Token符號
			return Token.instance.symbol();

		}).then((_symbol) => {
			Token.symbol = _symbol;
			$('.token-symbol').text(Token.symbol);
			// 設定買賣價的place holder
			$('#token-setSellPrice input, #token-setBuyPrice input').attr('placeholder', 'ether / ' + Token.symbol);
			// Token名稱
			return Token.instance.name();

		}).then((_name) => {
			Token.name = _name;
			$('.token-name').text(Token.name);
			// Token owner地址
			return Token.instance.owner();

		}).then((_owner) => {
			Token.owner = _owner;
			// 針對是否為owner去禁止欄位
			var _isOwner = web3.eth.defaultAccount == Token.owner;
			$('.tooltip-notOwner').tooltip(_isOwner ? 'disable' : 'enable');
			$('.tooltip-notOwner *').prop('disabled', !_isOwner);
			// 更新動態內容
			Token.async();
			// 成功
			console.log('Success: init UI!');

		}).catch((error) =>
			console.error('Token.initUI()', error.message));
	},

	updateUI: function() {
		// 更新Balances
		$('.token-userBalance').text(Token.userTokenBalance);
		$('.token-minterBalance').text(Token.minterTokenBalance);
		$('.ether-userBalance').text(Token.userEtherBalance);
		$('.ether-minterBalance').text(Token.minterEtherBalance);

		// 更新買賣價
		$('.token-sellPrice').text(Token.sellPrice);
		$('.token-buyPrice').text(Token.buyPrice);

		// 若帳戶被凍結
		$('.tooltip-gotFrozen').tooltip(Token.isFrozen ? 'enable' : 'disable');
		$('.tooltip-gotFrozen *').prop('disabled', Token.isFrozen);

		// 更新允許與被允許清單
		$.each({ '.token-userAllowance': Token.myAllowance, '.token-forUserAllowance': Token.forMeAllowance }, (table_id, obj) => {
			// 將原本的obj轉成[[],[],[],...]比較好排序
			var arr = [];
			for (var _address in obj) {
				if (obj[_address] > 0) // 過濾掉Allowance已經是0的
					arr.push([_address, obj[_address]]);
			}
			arr.sort((a, b) => { return b[1] - a[1] });
			// table UI
			$(table_id + ' table tbody').empty();
			$.each(arr, (index, [account, value]) => {
				$(table_id + ' table > tbody').append('<tr><th scope="row">' + (index + 1) + '</th> <td>' + account + '</td> <td>' + value + '</td></tr>');
			});
		});
	},

	getBalances: function() {
		var _message = Token.name + ' & ether balances';
		console.log('Loading: ' + _message + '...');

		Token.contract.then(() => {
			return Token.instance.getBalances();

		}).then((_balances) => {
			Token.minterTokenBalance = web3.fromWei(_balances[0]);
			Token.userTokenBalance = web3.fromWei(_balances[1]);
			Token.minterEtherBalance = web3.fromWei(_balances[2]);
			Token.userEtherBalance = web3.fromWei(_balances[3]);
			Token.updateUI();
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) =>
			console.error('Token.getBalances()', error.message));
	},

	transfer: function() {
		var _toAddress = $('#token-transfer input[placeholder="Address"]').val();
		var _amount = $('#token-transfer input[placeholder="Amount"]').val();

		var _message = 'transfer ' + _amount + Token.symbol + ' to ' + _toAddress;
		console.log('Pending: ' + _message + '...');

		// 檢查傳送帳號是否被凍結
		Token.getFrozen(_toAddress).then((_isFrozen) => {
			if (_isFrozen) {
				swal('Bad News!', 'He/She seems got frozen...', 'error');
				throw ({ message: 'target address got frozen' });
			}
			return Token.instance.transfer(_toAddress, web3.toWei(_amount));

		}).then(() =>
			swal('Now only wait for mined', _message, 'success')

		).catch((error) =>
			console.error('Token.transfer()', error.message));
	},

	sell: function() {
		var _sellAmount = $('#token-sell input').val();
		var _message = 'sell ' + _sellAmount + Token.symbol;
		var _soldValue;

		console.log('Pending: ' + _message + '...');

		Token.contract.then(() => {
			return Token.instance.sell.call(web3.toWei(_sellAmount));

		}).then((result) => {
			_soldValue = result;
			return Token.instance.sell(web3.toWei(_sellAmount));

		}).then(() =>
			swal('Now only wait for mined', _message + ' for ' + web3.fromWei(_soldValue) + ' ether!', 'success')

		).catch((error) =>
			console.error('Token.sell()', error.message));
	},

	buy: function() {
		var _buyValue = $('#token-buy input').val();
		var _message = ' by ' + _buyValue + 'ether';
		var _boughtAmount;

		console.log('Pending: buy ' + Token.symbol + _message + '...');

		Token.contract.then(() => {
			// 換算成ether
			return Token.instance.buy.call({ value: web3.toWei(_buyValue) });

		}).then((result) => {
			_boughtAmount = result;
			return Token.instance.buy({ value: web3.toWei(_buyValue) });

		}).then(() =>
			swal('Now only wait for mined', 'buy ' + web3.fromWei(_boughtAmount) + Token.symbol + _message, 'success')

		).catch((error) =>
			console.error('Token.buy()', error.message));
	},

	setSellPrice: function() {
		var _sellPrice = $('#token-setSellPrice input').val();
		var _message = 'set sell price for ' + _sellPrice + ' ether / ' + Token.symbol;

		console.log('Pending: ' + _message + '...');

		Token.contract.then(() => {
			return Token.instance.setSellPrice(web3.toWei(_sellPrice));

		}).then(() => {
			swal('Now only wait for mined', _message, 'success')

		}).catch((error) =>
			console.error('Token.setSellPrice()', error.message));
	},

	setBuyPrice: function() {
		var _buyPrice = $('#token-setBuyPrice input').val();
		var _message = 'set buy price for ' + _buyPrice + ' ether / ' + Token.symbol;

		console.log('Pending: ' + _message + '...');

		Token.contract.then(() => {
			return Token.instance.setBuyPrice(web3.toWei(_buyPrice));

		}).then(() => {
			swal('Now only wait for mined', _message, 'success')

		}).catch((error) =>
			console.error('Token.setBuyPrice()', error.message));
	},

	getPrices: function() {
		var _message = 'sell & buy prices';
		console.log('Loading: ' + _message + '...');

		Token.contract.then(() => {
			return Token.instance.sellPrice();

		}).then((_sellPrice) => {
			Token.sellPrice = web3.fromWei(_sellPrice);
			return Token.instance.buyPrice();

		}).then((_buyPrice) => {
			Token.buyPrice = web3.fromWei(_buyPrice);
			Token.updateUI();
			// 成功
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) =>
			console.error('Token.getPrices()', error.message));
	},

	mint: function() {
		var _toAddress = $('#token-mint input[placeholder="Address"]').val();
		var _amount = $('#token-mint input[placeholder="Amount"]').val();

		// 如果留空則設為預設使用者
		if (_toAddress == '')
			_toAddress = web3.eth.defaultAccount;

		var _message = 'mint ' + _amount + Token.symbol + ' to ' + _toAddress;
		console.log('Pending: ' + _message + '...');

		Token.contract.then(() => {
			return Token.instance.mint(_toAddress, web3.toWei(_amount));

		}).then(() =>
			swal('Now only wait for mined', _message, 'success')

		).catch((error) =>
			console.error('Token.mint()', error.message));
	},

	updateFrozenForm: function() {
		var _address = $('#token-freeze input').val();

		// 如果留空則設為預設使用者
		if (_address == '')
			_address = web3.eth.defaultAccount;

		var _message = 'frozen button state for ' + _address;
		console.log('Loading: ' + _message + '...');

		Token.getFrozen(_address).then((_isFrozen) => {
			// 更新pre內文，顯示目前帳戶是否被凍結
			$('#token-freeze small').text((_address == web3.eth.defaultAccount ? 'You are' : 'is') + (_isFrozen ? ' ' : ' NOT ') + 'frozen!');
			// 用btn-secondary、btn-primary指示現在的狀態可以操作的動作（即toggle它的狀態）
			$('#token-freeze .btn-group button:first').removeClass(!_isFrozen ? 'btn-secondary' : 'btn-primary').addClass(_isFrozen ? 'btn-secondary' : 'btn-primary');
			$('#token-freeze .btn-group button:last').removeClass(_isFrozen ? 'btn-secondary' : 'btn-primary').addClass(!_isFrozen ? 'btn-secondary' : 'btn-primary');
			// 只有發幣者才有權限按按鈕，沒有權限的人只能永遠看他disable
			if (web3.eth.defaultAccount == Token.owner) {
				// 針對帳戶凍結訊息鎖定/解鎖按鈕
				$('#token-freeze .btn-group button:first').prop('disabled', _isFrozen);
				$('#token-freeze .btn-group button:last').prop('disabled', !_isFrozen);
			}
			// 成功
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) =>
			console.error('Token.updateFrozenForm()', error.message));
	},

	toggleFrozen: function() {
		var _address = $('#token-freeze input').val();

		// 如果留空則設為預設使用者
		if (_address == '')
			_address = web3.eth.defaultAccount;

		var _isFrozen;
		Token.getFrozen(_address).then((result) => _isFrozen = result);

		console.log('Pending: ' + (_isFrozen ? 'Unfreeze ' : 'Freeze ') + _address + '...');

		Token.contract.then(() => {
			return Token.instance.toggleFrozen(_address);

		}).then(() =>
			swal('Now only wait for mined', (_isFrozen ? 'Unfreeze ' : 'Freeze ') + _address, 'success')

		).catch((error) =>
			console.error('Token.toggleFrozen()', error.message));
	},

	getThisFrozen: function() {
		var _message = 'this account\'s frozen state';
		console.log('Loading: ' + _message + '...');

		Token.getFrozen(web3.eth.defaultAccount).then((_isFrozen) => {
			Token.isFrozen = _isFrozen;
			// 成功
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) =>
			console.error('Token.getThisFrozen()', error.message));
	},

	getFrozen: function(_address) {
		return Token.contract.then(() => {
			return Token.instance.frozenAccount(_address);

		}).catch((error) =>
			console.error('Token.getForzen()', error.message));
	},

	approve: function() {
		var _toAddress = $('#token-approve input[placeholder="Address"]').val();
		var _amount = $('#token-approve input[placeholder="Amount"]').val();

		// 如果Address留空則設為預設使用者
		if (_toAddress == '')
			_toAddress = web3.eth.defaultAccount;

		// 如果Amount留空則設為0
		if (_toAddress == '')
			_amount = 0;

		var _message = 'approve ' + _toAddress + ' with ' + _amount + Token.symbol;
		console.log('Pending: ' + _message + '...');

		// 檢查傳送帳號是否被凍結
		Token.getFrozen(_toAddress).then((_isFrozen) => {
			if (_isFrozen) {
				swal('Bad News!', 'He/She seems got frozen...', 'error');
				throw ({ message: 'target address got frozen' });
			}
			return Token.instance.approve(_toAddress, web3.toWei(_amount));

		}).then(() =>
			swal('Now only wait for mined', _message, 'success')

		).catch((error) =>
			console.error('Token.approve()', error.message));
	},

	transferFrom: function() {
		var _fromAddress = $('#token-transferFrom input[placeholder="Address from"]').val();
		var _toAddress = $('#token-transferFrom input[placeholder="Address to"]').val();
		var _amount = $('#token-transferFrom input[placeholder="Amount"]').val();

		// 如果留空則設為預設使用者
		if (_toAddress == '')
			_toAddress = web3.eth.defaultAccount;

		var _message = 'transfer ' + _amount + Token.symbol + ' from ' + _fromAddress + ' to ' + _toAddress;
		console.log('Pending: ' + _message + '...');

		// 檢查來源帳號是否被凍結
		Token.getFrozen(_fromAddress).then((_isFrozen) => {
			if (_isFrozen) {
				swal('Bad News!', 'Resourse Account got frozen...', 'error');
				throw ({ message: 'resourse address got frozen' });
			}
			return Token.getFrozen(_toAddress);

			// 檢查傳送帳號是否被凍結
		}).then((_isFrozen) => {
			if (_isFrozen) {
				swal('Bad News!', 'Target Account got frozen...', 'error');
				throw ({ message: 'target resourse address got frozen' });
			}
			// 直接call合約的mapping檢查
			return Token.instance.allowance(_fromAddress, web3.eth.defaultAccount);

		}).then((result) => {
			// 檢查有沒有得到來源帳戶的許可
			if (result == 0) {
				swal('Oops...', 'Seems like you haven\'t got his/her approval', 'error');
				throw { message: _fromAddress + ' have not approved you' };
			}
			// 檢查來源帳戶的許可金額
			if (_amount > web3.fromWei(result).toNumber()) {
				swal('Ahhh...', 'His/Her Allowance for you is not enough', 'error');
				throw { message: 'allowance is not enough' };
			}
			return Token.instance.transferFrom(_fromAddress, _toAddress, web3.toWei(_amount));

		}).then(() =>
			swal('Now only wait for mined', _message, 'success')

		).catch((error) =>
			console.error('Token.transferFrom()', error.message));
	},

	burn: function() {
		var _amount = $('#token-burn input[placeholder="Amount"]').val();

		var _message = 'burn ' + _amount + Token.symbol;
		console.log('Pending: ' + _message + '...');

		Token.contract.then(() => {
			return Token.instance.burn(web3.toWei(_amount));

		}).then(() =>
			swal('Now only wait for mined', _message, 'success')

		).catch((error) =>
			console.error('Token.burn()', error.message));
	},

	burnFrom: function() {
		var _fromAddress = $('#token-burnFrom input[placeholder="Address from"]').val();
		var _amount = $('#token-burnFrom input[placeholder="Amount"]').val();

		var _message = 'burn ' + _amount + Token.symbol + ' from ' + _fromAddress;
		console.log('Pending: ' + _message + '...');

		Token.contract.then(() => {
			// 直接call合約檢查
			return Token.instance.allowance(_fromAddress, web3.eth.defaultAccount);

		}).then((result) => {
			// 檢查有沒有得到來源帳戶的許可
			if (result == 0) {
				swal('Oops...', 'Seems like you haven\'t got his/her approval', 'error');
				throw { message: _fromAddress + ' have not approved you' };
			}
			// 檢查來源帳戶的許可金額
			if (_amount > web3.fromWei(result).toNumber()) {
				swal('Ahhh...', 'His/Her Allowance for you is not enough', 'error');
				throw { message: 'allowance is not enough' };
			}
			return Token.instance.burnFrom(_fromAddress, web3.toWei(_amount));

		}).then(() =>
			swal('Now only wait for mined', _message, 'success')

		).catch((error) =>
			console.error('Token.burnFrom()', error.message));
	},
};

// 生成該選擇器下的檢查input是否valid的按鈕
function checkValidityMacro(_selector, _function) {
	// 點按按鈕時開啟檢查，若全數input都valid則call `_function`
	$(_selector + ' button').on('click', () => {
		// 遍歷選擇器底下的所有input
		var _selectArr = $(_selector + ' input');
		var _flag = true;
		// 檢查所有input是否都valid
		for (var i = 0; i < _selectArr.length; i++) {
			if (!_selectArr[i].checkValidity())
				_flag = false;
		}
		if (_flag) // 如果全數通過則call `_function`
			_function();
		else // 否則把檢查的class加入讓底下的input顯示提示
			$(_selector).addClass('was-validated');
	});
	// 當focus到其他地方後，檢查就取消
	$(':not(' + _selector + ' *)').on('focus', () => $(_selector).removeClass('was-validated'));
}