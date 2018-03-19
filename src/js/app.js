App = {
	web3Provider: null,
	contracts: {},
	account: undefined,
	etherBalance: 0,

	init: function() {
		App.initWeb3();
	},

	initWeb3: function() {
		// Initialize web3 and set the provider to the testRPC.
		if (typeof web3 !== 'undefined') {
			// MetaMisk would inject web3
			App.web3Provider = web3.currentProvider;
		} else {
			// set the provider you want from Web3.providers
			App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
		}
		web3 = new Web3(App.web3Provider);

		// 初始化合約
		App.initContract('Token');
		App.initContract('Share');
		App.initContract('Trader', Trader.init); // 順邊直接創建Trader了
		// 做一些全域的UI初始化
		App.initUI();
		//異步更新
		App.startAsyncing();
	},

	initContract: function(name, callback) {
		$.getJSON(name + '.json', function(data) {
			// Get the necessary contract artifact file and instantiate it with truffle-contract.
			App.contracts[name] = TruffleContract(data);
			// Set the provider for our contract.
			App.contracts[name].setProvider(web3.currentProvider);
			// run callback
			if (callback != null)
				callback();
		});
	},

	initUI: function() {
		// 使用者帳戶地址
		if (web3.eth.defaultAccount === undefined) // 若沒登入
		{
			// alert to log in
			swal('Who are you ?', 'Please log in to your wallet for more', 'warning')
			// hide some cards
			$('.wallet-user, .token-userAllowance, .token-forUserAllowance, .trader-subscription, .trader-subscriber').hide();
			// 沒登入就來個提示登入的tooltip吧
			$('.tooltip-login').tooltip({ title: 'Please log in' });
			// 把上述的欄位進用
			$('.tooltip-login *').prop('disabled', true);
		} else {
			// 使用者
			App.account = web3.eth.defaultAccount;
			// 使用者ether餘額
			web3.eth.getBalance(web3.eth.defaultAccount, (error, result) => App.etherBalance = web3.fromWei(result));
			// 複製地址的欄位開啟複製功能
			new ClipboardJS('.address-copier');
			// 更新一波UI
			App.updateUI();
		}
	},

	updateUI: function() {
		// 使用者帳號
		$('input.ether-userAddress').val(App.account);
		$('.ether-userAddress:not(:input)').text(App.account);
		$('.ether-userAddress').attr('data-clipboard-text', App.account);
		// 使用者ether餘額
		$('.ether-userBalance').text(App.etherBalance);
		// 各種Tooltip的提示
		$('.tooltip-notOwner').attr('data-original-title', 'Need Authentication');
		$('.tooltip-gotFrozen').attr('data-original-title', 'Sorry, you\'ve got frozen');
		// 這邊初始化複製地址的tooltip以及綁定監聽器
		$('.address-copier').tooltip({ title: 'click to copy', trigger: 'manual' });
		addressCopier_listener('.address-copier');
		// input後的invalid-tooltip的內文
		$('input[placeholder*="Address"] + .invalid-tooltip').text('I need a valid address');
		$('input[placeholder*="Amount"] + .invalid-tooltip, input[placeholder*="ether"] + .invalid-tooltip').text('Come on... give me a positive number');
	},

	startAsyncing: function() {
		// 監聽最新的區塊
		web3.eth.filter('latest', (error, result) => {
			if (error) {
				console.error('App.startAsyncing()', error);
				return;
			}
			console.log('Block updated!');

			for (i = 1; i < 2; i++) {
				setTimeout(App.asyncList, 2000 * i); // 延遲幾秒後再多次訪問區塊比較不會漏抓資料
			}
		});
	},

	asyncList: function() // 在以下加入你要同步的函式
	{
		Token.async();
		Trader.async();
	}

};

$(function() {
	$(window).load(function() {
		App.init();
	});
});

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

// 「複製地址」的tooltip監聽器
function addressCopier_listener(_selector) {
	$(_selector).on({
		// 以下操作都是針對tooltip
		'mouseenter': (event) => $(event.delegateTarget).tooltip('show'),
		'mouseleave': (event) => $(event.delegateTarget).tooltip('hide'),
		'click': (event) => {
			var t = $(event.delegateTarget);
			var tID = t.attr('timeoutID');
			// 以DOM的屬性判斷這個元素是否還有計時器在跑
			if (typeof tID === typeof undefined || tID === false) {
				// 代表目前沒有計時器在跑，那我們就要換文字然後讓他懸停三秒
				// 先暫時停止監聽滑鼠離開
				t.off('mouseleave');
				// 因為要更新文字所以要先暫時隱藏他
				t.tooltip('hide');
				// 更新文字
				t.attr('data-original-title', 'Copied');
				// 剛剛上面那個暫時隱藏一隱藏完就...
				t.one('hidden.bs.tooltip', () => {
					// 當然就是趕快再顯示他，因為此時他已經換好提示文字了
					t.tooltip('show');
				});
			} else // 代表之前的計時器還沒停止
				clearTimeout(tID); // 那就清除前一個計時器，下面會重新計時

			// 讓他懸停三秒，三秒後變回原樣，在這個瞬間把這個計時器的id寫進DOM的屬性
			t.attr('timeoutID', setTimeout(() => {
				//　讓他再度隱藏，因為又要換文字
				t.tooltip('hide');
				t.attr('data-original-title', 'click to copy');
				//　別忘了重啟監聽滑鼠移開
				t.on('mouseleave', (event) => t.tooltip('hide'));
				// 計時順利完成救把DOM的計時器屬性移除，代表沒有計時器正在運行了
				t.removeAttr('timeoutID', false);
			}, 3000));
		}
	});
}

// 更方便的填入有繼承關係的選擇器
function multiSelector(preStr, arr, postStr) {
	var result = '';
	for (i in arr) {
		if (i > 0) // 第一項之後就需要加','
			result += ','
		result += (preStr + arr[i] + postStr);
	}
	return result;
}