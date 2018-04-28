'use strict'

var createTrader = function(_address) {
	var Trader = {
		instance: null,
		hasDOM: false,
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
		records: [], // Real world transaction record

		init: function(_address) {
			// Contract address
			Trader.address = _address;
			// JQ selector prefix
			Trader.selectorID = '#tab-trader-' + _address;
			// Get contract instance
			return App.contracts.Trader.at(_address)
				.then((_instance) => Trader.instance = _instance)
				.then(() => Trader.instance.ownerList(1)) // Get registrant
				.then((_registrant) => Trader.registrant = _registrant)
				.then(Trader.fetchData) // DataBase
				.then(Trader.async); // BlockChain
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
				).then(Trader.updateUI);
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
			// toggle bool for pass updateUI()
			Trader.hasDOM = true;
			// Add a label in corresponding menu
			$('#navbarSupportedContent .dropdown-menu:' +
				(Trader.registrant == App.account ? 'first' : 'last')).append('\
				<a class="dropdown-item" href="' + Trader.selectorID + '"\
					data-toggle="list" role="tab">' + Trader.name + ' ' + Trader.symbol + '</a>');
			// Prepare insert html
			$('.tab-content').append('<div id="tab-trader-' + Trader.address + '" \
				class="container container-xxxl fade tab-pane" role="tabpanel"></div>');
			// Insert HTML and update its UI after loading it
			$(Trader.selectorID).load('trader.html', Trader.initUI);
		},

		initUI: function() {
			// Info card top image source
			$(Trader.selectorID + ' .trader-info-img').css(
				'background-image', 'url("../img/characters/' + Trader.name + '.jpg")'
			);
			Trader.eventListener(); // BlockChain event listener
			Trader.initInfo();
			Trader.UIListener(); // bind UI with listener
			Trader.updateUI();
		},

		updateUI: function() {
			// if there is no DOM, don't updated
			if (!Trader.hasDOM)
				return;
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

		initInfo: function() {
			// Init carousel
			var s1 = 'trader-info-carousel-' + Trader.address;
			$(Trader.selectorID + ' .carousel').attr('id', s1);
			$(Trader.selectorID + ' .carousel-indicators li').attr('data-target', '#' + s1);

			// Init chart
			var s2 = 'trader-chart-' + Trader.address;
			$(Trader.selectorID + ' #' + s1 + ' .carousel-inner').append(
				'<div class="carousel-item" style="padding: 15px 0px 0px 10px" id="' + s2 + '"></div>')
			// Wait for reocrd ready then draw chart
			setTimeout(() => drawChart(s2, Trader.records), 2000 + Math.random() * 4000);
		},

		UIListener: function() {
			// checkValidityMacro() generate listner to check validity input
			checkValidityMacro(Trader.selectorID + ' #trader-transfer', Trader.transfer);
			checkValidityMacro(Trader.selectorID + ' #trader-sell', Trader.sell);
			checkValidityMacro(Trader.selectorID + ' #trader-buy', Trader.buy);
		},

		eventListener: function() {
			Trader.instance.records(null, { fromBlock: 0 }, (error, r) => {
				if (error)
					return console.error(error);

				// Because blockChain will prevent branch, so if it watchs any new block
				// it would output previous event; here is to prevent repeated events
				if (Trader.records.length > 0 && r.args.time.toNumber() == Trader.records[Trader.records.length - 1][0])
					return;

				Trader.records.push([
					r.args.time.toNumber(),
					r.args.stock,
					r.args.price.toNumber(),
					r.args.amount.toNumber()
				]);

				$(Trader.selectorID + ' .trader-record table > tbody').append('\
					<tr>\
						<td>' + myDateTime(r.args.time.toNumber()) + '</td>\
						<td>' + r.args.stock + '</td>\
						<td>' + r.args.price.toNumber() + '</td>\
						<td>' + r.args.amount.toNumber() + '</td>\
					</tr>\
				');
			});
		},

		transfer: function() {
			var _toAddress = $(Trader.selectorID + ' #trader-transfer input[placeholder="Address"]').val();
			var _amount = $(Trader.selectorID + ' #trader-transfer input[placeholder="Amount"]').val();

			var _message = 'transfer ' + _amount + ' ' + Trader.abbr + ' to ' + _toAddress;
			console.log('Pending: ' + _message + '...');

			Trader.instance.transfer(_toAddress, _amount)
				.then(() =>
					swal('Now only wait for mined', _message, 'success')

				).catch((error) => console.error(error.message));
		},

		sell: function() {
			var _sellAmount = $(Trader.selectorID + ' #trader-sell input').val();
			var _message = 'sell ' + _sellAmount + ' ' + Trader.abbr;

			console.log('Pending: ' + _message + '...');

			var _soldETH = 0;
			Trader.instance.sell.call(_sellAmount)
				.then((result) => {
					_soldETH = web3.fromWei(result);
					return Trader.instance.sell(_sellAmount);

				}).then(() =>
					swal('Now only wait for mined', _message + ' for ' + _soldETH + ' ether!', 'success')

				).catch((error) => console.error(error.message));
		},

		buy: function() {
			var _buyValue = $(Trader.selectorID + ' #trader-buy input').val();
			var _message = ' by ' + _buyValue + ' ether';

			console.log('Pending: buy ' + _buyValue + ' ' + Trader.abbr + _message + '...');

			var _boughtAmount = 0;
			Trader.instance.buy.call({ value: web3.toWei(_buyValue) })
				.then((result) => {
					_boughtAmount = result;
					return Trader.instance.buy({ value: web3.toWei(_buyValue) })

				}).then(() =>
					swal('Now only wait for mined', 'buy ' + _boughtAmount + ' ' + Trader.abbr + _message, 'success')

				).catch((error) => console.error(error.message));
		},

		record: function(time, stock, price, amount) {
			Trader.instance.record((new Date(time)).valueOf(), stock, price, amount)
				.catch((error) => console.error(error.message));
		}
	}

	return Trader.init(_address).then(() => Trader);
};