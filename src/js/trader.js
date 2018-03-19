Trader = {
	contract: null,
	instance: null,
	trader_share: {},
	subscription: {},
	subscriber: {},

	init: function() {
		// 存下已部屬的合約和實例
		Trader.contract = App.contracts.Trader.deployed();
		Trader.contract.then((instance) => {
			Trader.instance = instance;
			// 確實抓取到instance，才開始做其他的初始化
			Trader.initUI(); // 初始化UI
			Trader.bindEvents(); // 監聽UI，綁定事件
			Trader.listeners(); // 監聽事件
		});
	},

	bindEvents: function() {},

	listeners: function() {

	},

	// 要與區塊鏈同步的資料
	async: function() {
		// 獲得此帳號的訂閱與被訂閱
		Trader.getSubscription();
	},

	initUI: function() {
		console.log('Loading: init Trader UI...');
		Trader.getTraderShare().then(() => {
			// 更新動態內容
			Trader.async()
			// 成功
			console.log('Success: init Trader UI!');
		});
	},

	updateUI: function() {
		// 更新訂閱與被訂閱清單
		$.each({ '.trader-subscription': Trader.subscription, '.trader-subscriber': Trader.subscriber }, (table_id, obj) => {
			// 將原本的obj轉成[[],[],[],...]比較好排序
			var arr = [];
			for (var _address in obj)
				arr.push([_address, obj[_address]]);
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

	getTraderShare: function() {
		var _message = 'traders & their share contract address';
		console.log('Loading: ' + _message + '...');

		return Trader.instance.getTraders().then((_traders) =>
			// traverse traders' Share contracts' address
			_traders.reduce((p, _) => p.then(() =>
				Trader.instance.share(_)

			).then((_address) =>
				// new a Share object (class definition in share.js)
				createShare(_address)

			).then((_share) =>
				Trader.trader_share[_] = _share

			), Promise.resolve())

		).then(() =>
			console.log('Success: ' + _message + ' updated!')

		).catch((error) => console.error(error.message));
	},

	getSubscription: function() {
		var _message = 'your subscriptions & subscribers';
		console.log('Loading: ' + _message + '...');
		Trader.traderArr().reduce((p, _) =>
			p.then(() => Trader.instance.getSubscribers(_)
				.then((_subscribers) => {
					// detect trader is you or the other
					if (_ == App.account)
						// when trader is you, traverse your subscribers' shares
						return _subscribers.reduce((pp, __) =>
							pp.then(() =>
								Trader.trader_share[_].getShare(__)

							).then((_share) =>
								Trader.subscriber[__] = _share

							), Promise.resolve());

					else if (_subscribers.includes(App.account))
						// you are one of the other traders' subscribers, get your shares
						return Trader.trader_share[_].getShare(App.account).then((_share) =>
							Trader.subscription[_] = _share
						);
				})
			), Promise.resolve()

		).then(() => {
			console.log('Success: ' + _message + ' updated!');
			Trader.updateUI();
		});
	},

	getShare: function(_trader, _address) {
		// call function in share object, return a Promise
		return Trader.trader_share[_trader].getShare(_address);
	},

	traderArr: function() {
		var arr = [];
		for (var key in Trader.trader_share)
			arr.push(key);
		return arr;
	},
};