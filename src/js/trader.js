'use strict'

var createTrader = function(_address) {
	var Trader = {
		instance: null,
		address: 0x0, // Address of this contract
		registrant: 0x0, // Address who registered this trader
		selectorID: '', // JQ selector prefix
		abbr: '', // Abbreviation of this trader's share
		symbol: '', // Symbol of this trader
		name: '', // Nmae of this trader
		totalShare: 0,
		subscriber: {}, // {subscriber<address>: {share: uint, proportion: float}}
		price: 0, // Exchange rate of ETH per share
		splitting: 0, // Splitting ratio per share when appreciation
		fee: 0, // Subscription fee

		init: function(_address) {
			// Contract address
			Trader.address = _address;
			// JQ selector prefix
			Trader.selectorID = '#tab-trader-' + _address;
			// Get contract instance
			return App.contracts.Trader.at(_address)
				.then((_instance) => { Trader.instance = _instance })
				.then(() => Trader.instance.ownerList(1)) // get registrant
				.then((_registrant) => Trader.registrant = _registrant)
				.then(Trader.fetchData) //dataBase
				.then(Trader.async); //blockChain
		},

		// Data in blockChain
		async: function() {
			return Trader.instance.totalShare() // Total share
				.then((_totalShare) => Trader.totalShare = _totalShare)
				.then(() => Trader.instance.price()) // Exchange rate of ETH per share
				.then((_price) => Trader.price = _price)
				.then(() => Trader.instance.getSubscribers()) // Addresses subscribed this trader
				.then((_subscriber) =>
					_subscriber.reduce((p, _) => // Traverse all subscribers
						p.then(() =>
							Trader.instance.shareOf(_) // Get each subscriber's share
						).then((_share) => // Record in {share: uint,proportion: float}
							Trader.subscriber[_] = { share: _share, proportion: _share / Trader.totalShare }
						), Promise.resolve())
				);
		},

		// DataBase
		fetchData: function() {
			return $.ajax({
				method: "GET",
				url: "/trader",
				dataType: 'json',
				data: { address: Trader.address },
				success: (data) => {
					var l = ['name', 'description', 'abbr', 'symbol'];
					for (var i in l)
						Trader[l[i]] = data[0][l[i]];
				},
			});
		},

		initDOM: function() {
			// Add a label in corresponding menu
			$('#navbarSupportedContent .dropdown-menu:' +
				(Trader.registrant == App.account ? 'first' : 'last')).append('\
				<a class="dropdown-item" href="' + Trader.selectorID + '"\
					data-toggle="list" role="tab">' + Trader.name + ' ' + Trader.symbol + '</a>');
			// Prepare insert html
			$('.tab-content').append('<div id="tab-trader-' + Trader.address + '" \
				class="container fade tab-pane" role="tabpanel"></div>');
			// Insert HTML and update its UI after loading it
			$(Trader.selectorID).load('trader.html', Trader.initUI);
		},

		initUI: function() {
			// Info card top image source
			$(Trader.selectorID + ' .trader-info-img').css(
				'background-image', 'url("../img/characters/' + Trader.name + '.jpg")'
			);
			Trader.updateUI();
		},

		updateUI: function() {
			// Basic information
			var l = ['name', 'description', 'abbr', 'symbol'];
			for (var i in l)
				$(Trader.selectorID + ' .trader-' + l[i]).text(Trader[l[i]]);

			// Numeral information
			$(Trader.selectorID + ' .trader-price').text(web3.fromWei(Trader.price));
			$(Trader.selectorID + ' .trader-totalShare').text(myNumber(Trader.totalShare));
			$(Trader.selectorID + ' .trader-userShare').text(myNumber(Trader.subscriber[App.account].share));

			// Call global's UI update
			App.updateUI();
		},

		transfer: function() {
			var _toAddress = $(Trader.selectorID + ' #trader-transfer input[placeholder="Address"]').val();
			var _amount = $(Trader.selectorID + ' #trader-transfer input[placeholder="Amount"]').val();

			var _message = 'transfer ' + _amount + ' ' + Trader.abbr + ' to ' + _toAddress;
			console.log('Pending: ' + _message + '...');

			Trader.instance.transfer(_toAddress, web3.toWei(_amount))
				.then(() =>
					swal('Now only wait for mined', _message, 'success')

				).catch((error) => console.error(error.message));
		},

		sell: function() {
			var _sellAmount = $(Trader.selectorID + ' #trader-sell input').val();
			var _message = 'sell ' + _sellAmount + ' ' + Trader.abbr;

			console.log('Pending: ' + _message + '...');

			Trader.instance.sell.call(web3.toWei(_sellAmount)).then((result) => [result, Trader.instance.sell(web3.toWei(_sellAmount))]

			).then((arr) =>
				swal('Now only wait for mined', _message + ' for ' + web3.fromWei(arr[0]) + ' ether!', 'success')

			).catch((error) => console.error(error.message));
		},

		buy: function() {
			var _buyValue = $(Trader.selectorID + ' #trader-buy input').val();
			var _message = ' by ' + _buyValue + ' ether';

			console.log('Pending: buy ' + _buyValue + ' ' + Trader.abbr + _message + '...');

			Trader.instance.buy.call({ value: web3.toWei(_buyValue) }).then((result) => [result, Trader.instance.buy({ value: web3.toWei(_buyValue) })]

			).then((arr) =>
				swal('Now only wait for mined', 'buy ' + web3.fromWei(arr[0]) + ' ' + Trader.abbr + _message, 'success')

			).catch((error) => console.error(error.message));
		}
	}

	return Trader.init(_address).then(() => Trader);
};