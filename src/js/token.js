Token = {
	contract: null,
	instance: null,
	id: '',
	symbol: '',
	name: '',
	owner: null,
	userTokenBalance: 0,
	minterTokenBalance: 0,
	minterEtherBalance: 0,
	sellPrice: 1,
	buyPrice: 1,
	isFrozen: false,
	myAllowance: {},
	forMeAllowance: {},

	init: function(_address) {
		// 取得該地址的Token合約實例
		Token.id = 'tab-token-' + _address;
		Token.contract = App.contracts.Token.at(_address);
		Token.contract.then((instance) => {
			Token.instance = instance;
			// 確實抓取到instance，才開始做其他的初始化
			// 在Nav Bar裡新增一個標籤
			$('#navbarSupportedContent ul').append('<li class="nav-item"><a class="nav-link" href="#' + Token.id + '" data-toggle="list" role="tab"><span class="token-name"></span></a></li>');
			// 插入DOM並載入
			$('.tab-content').append('<div id="' + Token.id + '" class="container fade tab-pane" role="tabpanel"></div>');
			$('#' + Token.id).load('token.html', () => {
				// 等DOM載入完成再做下面的事情
				Token.initUI(); // 初始化UI
				Token.bindEvents(); // 監聽UI，綁定事件
				Token.listeners(); // 監聽事件
			});
		});
	},

	bindEvents: function() {
		// checkValidityMacro()會生成該選擇器下的檢查input是否valid的按鈕
		checkValidityMacro('#' + Token.id + ' #token-transfer', Token.transfer);
		checkValidityMacro('#' + Token.id + ' #token-sell', Token.sell);
		checkValidityMacro('#' + Token.id + ' #token-buy', Token.buy);
		checkValidityMacro('#' + Token.id + ' #token-setSellPrice', Token.setSellPrice);
		checkValidityMacro('#' + Token.id + ' #token-setBuyPrice', Token.setBuyPrice);
		checkValidityMacro('#' + Token.id + ' #token-mint', Token.mint);
		checkValidityMacro('#' + Token.id + ' #token-freeze', Token.toggleFrozen);
		checkValidityMacro('#' + Token.id + ' #token-approve', Token.approve);
		checkValidityMacro('#' + Token.id + ' #token-transferFrom', Token.transferFrom);
		checkValidityMacro('#' + Token.id + ' #token-burn', Token.burn);
		checkValidityMacro('#' + Token.id + ' #token-burnFrom', Token.burnFrom);
	},

	listeners: function() {
		// 偵測凍結欄位只要一變動就刷新該帳號凍結資訊
		$('#' + Token.id + ' #token-freeze input').on('keyup', () => { Token.updateFrozenForm(); });
		// 獲得此帳號的	myAllowance、forMeAllowance
		Token.getApprove();
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
		console.log('Loading: init Token UI...');

		// Token符號
		Token.instance.symbol().then((_symbol) => {
			Token.symbol = _symbol;
			$('#' + Token.id + ' .token-symbol').text(Token.symbol);
			// 設定買賣價的place holder
			$('#' + Token.id + ' #token-setSellPrice input, #token-setBuyPrice input').attr('placeholder', 'ether / ' + Token.symbol);
			// Token名稱
			return Token.instance.name();

		}).then((_name) => {
			Token.name = _name;
			$('#' + Token.id + ' .token-name').text(Token.name);
			$('nav .token-name').text(Token.name); // 記得nav bar也要
			// Token owner地址
			return Token.instance.owner();

		}).then((_owner) => {
			Token.owner = _owner;
			// 針對是否為owner去禁止欄位
			var _isOwner = App.account == Token.owner;
			$('#' + Token.id + ' .tooltip-notOwner').tooltip(_isOwner ? 'disable' : 'enable');
			$('#' + Token.id + ' .tooltip-notOwner *').prop('disabled', !_isOwner);
			// 更新動態內容
			Token.async();
			// 成功
			console.log('Success: init Token UI!');

		}).catch((error) => console.error(error.message));
	},

	updateUI: function() {
		// minter Balances
		$('#' + Token.id + ' .token-minterBalance').text(Token.minterTokenBalance);
		$('#' + Token.id + ' .ether-minterBalance').text(Token.minterEtherBalance);
		// 更新買賣價
		$('#' + Token.id + ' .token-sellPrice').text(Token.sellPrice);
		$('#' + Token.id + ' .token-buyPrice').text(Token.buyPrice);
		// 要登入才能更新以下內容
		if (App.account === undefined)
			return;
		// 用戶Balances
		$('#' + Token.id + ' .token-userBalance').text(Token.userTokenBalance);
		// 設定各與token相關的input上限
		$(multiSelector('#' + Token.id + ' ', ['#token-transfer', '#token-sell', '#token-approve', '#token-burn'], ' input[placeholder="Amount"]')).attr('max', Token.userTokenBalance);
		// 若帳戶被凍結
		$('#' + Token.id + ' .tooltip-gotFrozen').tooltip(Token.isFrozen ? 'enable' : 'disable');
		$('#' + Token.id + ' .tooltip-gotFrozen *').prop('disabled', Token.isFrozen);
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
			$.each(arr, (index, [account, value]) =>
				$(table_id + ' table > tbody').append('<tr><th scope="row">' + (index + 1) + '</th><td data-simplebar data-toggle="tooltip" class="address-copier" data-clipboard-text="' + account + '">' + account + '</td><td>' + value + '</td></tr>')
			);
		});
		// 呼叫Global去更新UI
		App.updateUI();
	},

	getBalances: function() {
		var _message = Token.name + ' & ether balances';
		console.log('Loading: ' + _message + '...');

		Token.instance.getBalances().then((_balances) => {
			Token.minterTokenBalance = web3.fromWei(_balances[0]);
			Token.userTokenBalance = web3.fromWei(_balances[1]);
			Token.minterEtherBalance = web3.fromWei(_balances[2]);
			Token.updateUI();
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) => console.error(error.message));
	},

	transfer: function() {
		var _toAddress = $('#' + Token.id + ' #token-transfer input[placeholder="Address"]').val();
		var _amount = $('#' + Token.id + ' #token-transfer input[placeholder="Amount"]').val();

		var _message = 'transfer ' + _amount + ' ' + Token.symbol + ' to ' + _toAddress;
		console.log('Pending: ' + _message + '...');

		// 檢查傳送帳號是否被凍結
		Token.instance.frozenAccount(_toAddress).then((_isFrozen) => {
			if (_isFrozen) {
				swal('Bad News!', 'He/She seems got frozen...', 'error');
				throw ({ message: 'target address got frozen' });
			}
			return Token.instance.transfer(_toAddress, web3.toWei(_amount));

		}).then(() =>
			swal('Now only wait for mined', _message, 'success')

		).catch((error) => console.error(error.message));
	},

	sell: function() {
		var _sellAmount = $('#' + Token.id + ' #token-sell input').val();
		var _message = 'sell ' + _sellAmount + ' ' + Token.symbol;

		console.log('Pending: ' + _message + '...');

		Token.instance.sell.call(web3.toWei(_sellAmount)).then((result) => [result, Token.instance.sell(web3.toWei(_sellAmount))]

		).then((arr) =>
			swal('Now only wait for mined', _message + ' for ' + web3.fromWei(arr[0]) + ' ether!', 'success')

		).catch((error) => console.error(error.message));
	},

	buy: function() {
		var _buyValue = $('#' + Token.id + ' #token-buy input').val();
		var _message = ' by ' + _buyValue + ' ether';

		console.log('Pending: buy ' + _buyValue + ' ' + Token.symbol + _message + '...');

		Token.instance.buy.call({ value: web3.toWei(_buyValue) }).then((result) => [result, Token.instance.buy({ value: web3.toWei(_buyValue) })]

		).then((arr) =>
			swal('Now only wait for mined', 'buy ' + web3.fromWei(arr[0]) + ' ' + Token.symbol + _message, 'success')

		).catch((error) => console.error(error.message));
	},

	setSellPrice: function() {
		var _sellPrice = $('#' + Token.id + ' #token-setSellPrice input').val();
		var _message = 'set sell price for ' + _sellPrice + ' ether / ' + Token.symbol;

		console.log('Pending: ' + _message + '...');

		Token.instance.setSellPrice(web3.toWei(_sellPrice)).then(() =>
			swal('Now only wait for mined', _message, 'success')

		).catch((error) => console.error(error.message));
	},

	setBuyPrice: function() {
		var _buyPrice = $('#' + Token.id + ' #token-setBuyPrice input').val();
		var _message = 'set buy price for ' + _buyPrice + ' ether / ' + Token.symbol;

		console.log('Pending: ' + _message + '...');

		Token.instance.setBuyPrice(web3.toWei(_buyPrice)).then(() =>
			swal('Now only wait for mined', _message, 'success')

		).catch((error) => console.error(error.message));
	},

	getPrices: function() {
		var _message = 'sell & buy prices';
		console.log('Loading: ' + _message + '...');

		Token.instance.sellPrice().then((_sellPrice) => {
			Token.sellPrice = web3.fromWei(_sellPrice);
			return Token.instance.buyPrice();

		}).then((_buyPrice) => {
			Token.buyPrice = web3.fromWei(_buyPrice);
			Token.updateUI();
			// 成功
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) => console.error(error.message));
	},

	mint: function() {
		var _toAddress = $('#' + Token.id + ' #token-mint input[placeholder="Address"]').val();
		var _amount = $('#' + Token.id + ' #token-mint input[placeholder="Amount"]').val();

		// 如果留空則設為預設使用者
		if (_toAddress == '')
			_toAddress = App.account;

		var _message = 'mint ' + _amount + ' ' + Token.symbol + ' to ' + _toAddress;
		console.log('Pending: ' + _message + '...');

		Token.instance.mint(_toAddress, web3.toWei(_amount)).then(() =>
			swal('Now only wait for mined', _message, 'success')

		).catch((error) => console.error(error.message));
	},

	updateFrozenForm: function() {
		var _address = $('#' + Token.id + ' #token-freeze input').val();

		// 如果留空則設為預設使用者
		if (_address == '')
			_address = App.account;

		var _message = 'frozen button state for ' + _address;
		console.log('Loading: ' + _message + '...');

		Token.instance.frozenAccount(_address).then((_isFrozen) => {
			// 更新pre內文，顯示目前帳戶是否被凍結
			$('#' + Token.id + ' #token-freeze small').text((_address == App.account ? 'You are' : 'is') + (_isFrozen ? ' ' : ' NOT ') + 'frozen!');
			// 用btn-secondary、btn-primary指示現在的狀態可以操作的動作（即toggle它的狀態）
			$('#' + Token.id + ' #token-freeze .btn-group button:first').removeClass(!_isFrozen ? 'btn-secondary' : 'btn-primary').addClass(_isFrozen ? 'btn-secondary' : 'btn-primary');
			$('#' + Token.id + ' #token-freeze .btn-group button:last').removeClass(_isFrozen ? 'btn-secondary' : 'btn-primary').addClass(!_isFrozen ? 'btn-secondary' : 'btn-primary');
			// 只有發幣者才有權限按按鈕，沒有權限的人只能永遠看他disable
			if (App.account == Token.owner) {
				// 針對帳戶凍結訊息鎖定/解鎖按鈕
				$('#' + Token.id + ' #token-freeze .btn-group button:first').prop('disabled', _isFrozen);
				$('#' + Token.id + ' #token-freeze .btn-group button:last').prop('disabled', !_isFrozen);
			}
			// 成功
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) => console.error(error.message));
	},

	toggleFrozen: function() {
		var _address = $('#' + Token.id + ' #token-freeze input').val();

		// 如果留空則設為預設使用者
		if (_address == '')
			_address = App.account;

		var _isFrozen;
		Token.instance.frozenAccount(_address).then((result) => _isFrozen = result);

		console.log('Pending: ' + (_isFrozen ? 'Unfreeze ' : 'Freeze ') + _address + '...');

		Token.instance.toggleFrozen(_address).then(() =>
			swal('Now only wait for mined', (_isFrozen ? 'Unfreeze ' : 'Freeze ') + _address, 'success')

		).catch((error) => console.error(error.message));
	},

	getThisFrozen: function() {
		var _message = 'this account\'s frozen state';
		console.log('Loading: ' + _message + '...');

		Token.instance.frozenAccount(App.account).then((_isFrozen) => {
			Token.isFrozen = _isFrozen;
			// 成功
			console.log('Success: ' + _message + ' updated!');

		}).catch((error) => console.error(error.message));
	},

	approve: function() {
		var _toAddress = $('#' + Token.id + ' #token-approve input[placeholder="Address"]').val();
		var _amount = $('#' + Token.id + ' #token-approve input[placeholder="Amount"]').val();

		// 如果Address留空則設為預設使用者
		if (_toAddress == '')
			_toAddress = App.account;

		// 如果Amount留空則設為0
		if (_toAddress == '')
			_amount = 0;

		var _message = 'approve ' + _toAddress + ' with ' + _amount + ' ' + Token.symbol;
		console.log('Pending: ' + _message + '...');

		// 檢查傳送帳號是否被凍結
		Token.instance.frozenAccount(_toAddress).then((_isFrozen) => {
			if (_isFrozen) {
				swal('Bad News!', 'He/She seems got frozen...', 'error');
				throw ({ message: 'target address got frozen' });
			}
			return Token.instance.approve(_toAddress, web3.toWei(_amount));

		}).then(() =>
			swal('Now only wait for mined', _message, 'success')

		).catch((error) => console.error(error.message));
	},

	getApprove: function() {
		// 監聽自己傳送的Allowance
		Token.instance.Allowance({ from: App.account }, { fromBlock: 0 }, (error, result) =>
			error ? console.error(error) : Token.myAllowance[result.args.to] = web3.fromWei(result.args.value)
		);
		// 監聽被別人允許的Allowance
		Token.instance.Allowance({ to: App.account }, { fromBlock: 0 }, (error, result) =>
			error ? console.error(error) : Token.forMeAllowance[result.args.from] = web3.fromWei(result.args.value)
		);
	},

	transferFrom: function() {
		var _fromAddress = $('#' + Token.id + ' #token-transferFrom input[placeholder="Address from"]').val();
		var _toAddress = $('#' + Token.id + ' #token-transferFrom input[placeholder="Address to"]').val();
		var _amount = $('#' + Token.id + ' #token-transferFrom input[placeholder="Amount"]').val();

		// 如果留空則設為預設使用者
		if (_toAddress == '')
			_toAddress = App.account;

		var _message = 'transfer ' + _amount + ' ' + Token.symbol + ' from ' + _fromAddress + ' to ' + _toAddress;
		console.log('Pending: ' + _message + '...');

		// 檢查來源帳號是否被凍結
		Token.instance.frozenAccount(_fromAddress).then((_isFrozen) => {
			if (_isFrozen) {
				swal('Bad News!', 'Resourse Account got frozen...', 'error');
				throw ({ message: 'resourse address got frozen' });
			}
			return Token.instance.frozenAccount(_toAddress);

			// 檢查傳送帳號是否被凍結
		}).then((_isFrozen) => {
			if (_isFrozen) {
				swal('Bad News!', 'Target Account got frozen...', 'error');
				throw ({ message: 'target resourse address got frozen' });
			}
			// 直接call合約的mapping檢查
			return Token.instance.allowance(_fromAddress, App.account);

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

		).catch((error) => console.error(error.message));
	},

	burn: function() {
		var _amount = $('#' + Token.id + ' #token-burn input[placeholder="Amount"]').val();

		var _message = 'burn ' + _amount + ' ' + Token.symbol;
		console.log('Pending: ' + _message + '...');

		Token.instance.burn(web3.toWei(_amount)).then(() =>
			swal('Now only wait for mined', _message, 'success')

		).catch((error) => console.error(error.message));
	},

	burnFrom: function() {
		var _fromAddress = $('#' + Token.id + ' #token-burnFrom input[placeholder="Address from"]').val();
		var _amount = $('#' + Token.id + ' #token-burnFrom input[placeholder="Amount"]').val();

		var _message = 'burn ' + _amount + ' ' + Token.symbol + ' from ' + _fromAddress;
		console.log('Pending: ' + _message + '...');

		Token.instance.allowance(_fromAddress, App.account).then((result) => {
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

		).catch((error) => console.error(error.message));
	},
};