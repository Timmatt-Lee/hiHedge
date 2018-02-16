App = {
	web3Provider: null,
	contracts: {},
	web3: null,

	init: function() {
		return App.initWeb3();
	},

	initWeb3: function() {
		// Initialize web3 and set the provider to the testRPC.
		if (typeof web3 !== 'undefined') {
			App.web3Provider = web3.currentProvider;
			// 唯有這樣寫filter.watch才能正確被監聽
			//App.web3Provider = new Web3.providers.HttpProvider("http://localhost:8545")
			web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
		} else {
			// set the provider you want from Web3.providers
			App.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:9545');
			web3 = new Web3(App.web3Provider);
		}

		return App.initContract();
	},

	initContract: function() {
		$.getJSON('Token.json', function(data) {
			// Get the necessary contract artifact file and instantiate it with truffle-contract.
			var TokenArtifact = data;
			App.contracts.Token = TruffleContract(TokenArtifact);
			// Set the provider for our contract.
			App.contracts.Token.setProvider(App.web3Provider);

			// 將已部屬的合約和其實例加載到Token的成員變數裡
			Token.contract = App.contracts.Token.deployed(); // deployed()回傳一個Promise物件
			Token.contract.then((instance) => Token.instance = instance);

			// 初始化Token
			Token.init();
		});

		App.startAsyncing(); //異步同步
		return true;
	},

	startAsyncing: function() {
		// 監聽最新的區塊
		web3.eth.filter('latest', (error, result) => {
			if (error) {
				console.log('Watch error: ', error);
				return;
			}
			console.log('Block updated!');

			for (i = 0; i < 5; i++) {
				setTimeout(App.asyncList, 1000 * i); // 延遲幾秒後再多次訪問區塊比較不會漏抓資料
			}
		});
	},

	asyncList: function() // 在以下加入你要同步的函式
	{
		Token.async();
	}

};

$(function() {
	$(window).load(function() {
		App.init();
	});
});