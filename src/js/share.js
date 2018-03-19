createShare = function(_address) {
	Share = {
		contract: null,
		instance: null,
		id: '',
		symbol: '',
		name: '',
		owner: null,
		share: {},
		price: 1,

		init: function(_address) {
			// 取得該地址的Share合約實例
			Share.id = 'tab-share-' + _address;
			Share.contract = App.contracts.Share.at(_address);
			return Share.contract.then((instance) => Share.instance = instance).then(() => Share.initDOM());
		},

		initDOM: function(_address) {
			// 在Nav Bar裡新增一個標籤
			$('#navbarSupportedContent ul').append('<li class="nav-item"><a class="nav-link" href="#' + Share.id + '" data-toggle="list" role="tab"><span class="share-name"></span></a></li>');
			// 插入DOM並載入
			$('.tab-content').append('<div id="' + Share.id + '" class="container fade tab-pane" role="tabpanel"></div>');
			$('#' + Share.id).load('share.html', () => {
				// 等DOM載入完成再做下面的事情
				// Share.initUI(); // 初始化UI
				// Share.bindEvents(); // 監聽UI，綁定事件
				// Share.listeners(); // 監聽事件
			});
		},

		bindEvents: function() {
			// checkValidityMacro()會生成該選擇器下的檢查input是否valid的按鈕
			checkValidityMacro('#' + Share.id + ' #share-transfer', Share.transfer);
			checkValidityMacro('#' + Share.id + ' #share-sell', Share.sell);
			checkValidityMacro('#' + Share.id + ' #share-buy', Share.buy);
			checkValidityMacro('#' + Share.id + ' #share-setSellPrice', Share.setSellPrice);
			checkValidityMacro('#' + Share.id + ' #share-setBuyPrice', Share.setBuyPrice);
			checkValidityMacro('#' + Share.id + ' #share-mint', Share.mint);
			checkValidityMacro('#' + Share.id + ' #share-freeze', Share.toggleFrozen);
			checkValidityMacro('#' + Share.id + ' #share-approve', Share.approve);
			checkValidityMacro('#' + Share.id + ' #share-transferFrom', Share.transferFrom);
			checkValidityMacro('#' + Share.id + ' #share-burn', Share.burn);
			checkValidityMacro('#' + Share.id + ' #share-burnFrom', Share.burnFrom);
		},

		listeners: function() {
			// 偵測凍結欄位只要一變動就刷新該帳號凍結資訊
			$('#' + Share.id + ' #share-freeze input').on('keyup', () => { Share.updateFrozenForm(); });
			// 獲得此帳號的	myAllowance、forMeAllowance
			Share.getApprove();
		},

		// 要與區塊鏈同步的資料
		async: function() {
			// 取得ether、share的餘額
			Share.getBalances();
			// 取得現在share比ether的買賣價
			Share.getPrices();
			// 取得此帳戶有沒有被凍結
			Share.getThisFrozen();
			// 更新凍結欄位的帳戶的凍結狀態
			Share.updateFrozenForm();
		},

		initUI: function() {
			console.log('Loading: init Share UI...');

			// Share符號
			Share.instance.symbol().then((_symbol) => {
				Share.symbol = _symbol;
				$('#' + Share.id + ' .share-symbol').text(Share.symbol);
				// 設定買賣價的place holder
				$('#' + Share.id + ' #share-setSellPrice input, #share-setBuyPrice input').attr('placeholder', 'ether / ' + Share.symbol);
				// Share名稱
				return Share.instance.name();

			}).then((_name) => {
				Share.name = _name;
				$('#' + Share.id + ' .share-name').text(Share.name);
				$('nav .share-name').text(Share.name); // 記得nav bar也要
				// Share owner地址
				return Share.instance.owner();

			}).then((_owner) => {
				Share.owner = _owner;
				// 針對是否為owner去禁止欄位
				var _isOwner = App.account == Share.owner;
				$('#' + Share.id + ' .tooltip-notOwner').tooltip(_isOwner ? 'disable' : 'enable');
				$('#' + Share.id + ' .tooltip-notOwner *').prop('disabled', !_isOwner);
				// 更新動態內容
				Share.async();
				// 成功
				console.log('Success: init Share UI!');

			}).catch((error) => console.error(error.message));
		},

		updateUI: function() {
			// minter Balances
			$('#' + Share.id + ' .share-minterBalance').text(Share.minterTokenBalance);
			$('#' + Share.id + ' .ether-minterBalance').text(Share.minterEtherBalance);
			// 更新買賣價
			$('#' + Share.id + ' .share-sellPrice').text(Share.sellPrice);
			$('#' + Share.id + ' .share-buyPrice').text(Share.buyPrice);
			// 要登入才能更新以下內容
			if (App.account === undefined)
				return;
			// 用戶Balances
			$('#' + Share.id + ' .share-userBalance').text(Share.userTokenBalance);
			// 設定各與share相關的input上限
			$(multiSelector('#' + Share.id + ' ', ['#share-transfer', '#share-sell', '#share-approve', '#share-burn'], ' input[placeholder="Amount"]')).attr('max', Share.userTokenBalance);
			// 若帳戶被凍結
			$('#' + Share.id + ' .tooltip-gotFrozen').tooltip(Share.isFrozen ? 'enable' : 'disable');
			$('#' + Share.id + ' .tooltip-gotFrozen *').prop('disabled', Share.isFrozen);
			// 更新允許與被允許清單
			$.each({ '.share-userAllowance': Share.myAllowance, '.share-forUserAllowance': Share.forMeAllowance }, (table_id, obj) => {
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

		getShare: function(_address) {
			return Share.instance.share(_address).then((result) => result).catch((error) => console.error(error.message));
		},

		getBalances: function() {
			var _message = Share.name + ' & ether balances';
			console.log('Loading: ' + _message + '...');

			Share.instance.getBalances().then((_balances) => {
				Share.minterTokenBalance = web3.fromWei(_balances[0]);
				Share.userTokenBalance = web3.fromWei(_balances[1]);
				Share.minterEtherBalance = web3.fromWei(_balances[2]);
				Share.updateUI();
				console.log('Success: ' + _message + ' updated!');

			}).catch((error) => console.error(error.message));
		},

		transfer: function() {
			var _toAddress = $('#' + Share.id + ' #share-transfer input[placeholder="Address"]').val();
			var _amount = $('#' + Share.id + ' #share-transfer input[placeholder="Amount"]').val();

			var _message = 'transfer ' + _amount + ' ' + Share.symbol + ' to ' + _toAddress;
			console.log('Pending: ' + _message + '...');

			// 檢查傳送帳號是否被凍結
			Share.instance.frozenAccount(_toAddress).then((_isFrozen) => {
				if (_isFrozen) {
					swal('Bad News!', 'He/She seems got frozen...', 'error');
					throw ({ message: 'target address got frozen' });
				}
				return Share.instance.transfer(_toAddress, web3.toWei(_amount));

			}).then(() =>
				swal('Now only wait for mined', _message, 'success')

			).catch((error) => console.error(error.message));
		},

		sell: function() {
			var _sellAmount = $('#' + Share.id + ' #share-sell input').val();
			var _message = 'sell ' + _sellAmount + ' ' + Share.symbol;

			console.log('Pending: ' + _message + '...');

			Share.instance.sell.call(web3.toWei(_sellAmount)).then((result) => [result, Share.instance.sell(web3.toWei(_sellAmount))]

			).then((arr) =>
				swal('Now only wait for mined', _message + ' for ' + web3.fromWei(arr[0]) + ' ether!', 'success')

			).catch((error) => console.error(error.message));
		},

		buy: function() {
			var _buyValue = $('#' + Share.id + ' #share-buy input').val();
			var _message = ' by ' + _buyValue + ' ether';

			console.log('Pending: buy ' + _buyValue + ' ' + Share.symbol + _message + '...');

			Share.instance.buy.call({ value: web3.toWei(_buyValue) }).then((result) => [result, Share.instance.buy({ value: web3.toWei(_buyValue) })]

			).then((arr) =>
				swal('Now only wait for mined', 'buy ' + web3.fromWei(arr[0]) + ' ' + Share.symbol + _message, 'success')

			).catch((error) => console.error(error.message));
		},

		setSellPrice: function() {
			var _sellPrice = $('#' + Share.id + ' #share-setSellPrice input').val();
			var _message = 'set sell price for ' + _sellPrice + ' ether / ' + Share.symbol;

			console.log('Pending: ' + _message + '...');

			Share.instance.setSellPrice(web3.toWei(_sellPrice)).then(() =>
				swal('Now only wait for mined', _message, 'success')

			).catch((error) => console.error(error.message));
		},

		getPrices: function() {
			var _message = 'sell & buy prices';
			console.log('Loading: ' + _message + '...');

			Share.instance.sellPrice().then((_sellPrice) => {
				Share.sellPrice = web3.fromWei(_sellPrice);
				return Share.instance.buyPrice();

			}).then((_buyPrice) => {
				Share.buyPrice = web3.fromWei(_buyPrice);
				Share.updateUI();
				// 成功
				console.log('Success: ' + _message + ' updated!');

			}).catch((error) => console.error(error.message));
		},
	}
	return Share.init(_address).then(() => Share);
};