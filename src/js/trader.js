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
			Trader.selectorID = '#tab-' + _address;
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
				data: { address: Trader.address },
				success: (data) => {
					var l = ['name', 'description', 'abbr', 'symbol'];
					for (var i in l)
						Trader[l[i]] = data[l[i]];
				},
			});
		},

		initDOM: function() {
			// toggle bool for pass updateUI()
			Trader.hasDOM = true;
			// Add a label in corresponding menu
			$('#navbarSupportedContent .dropdown-menu:' +
				(Trader.registrant == App.account ? 'first' : 'last')).append('\
				<a class="dropdown-item trader-nav" href="' + Trader.selectorID + '"\
					data-toggle="list" role="tab">' + Trader.name + ' ' + Trader.symbol + '</a>');
			// When there is tab switch
			$('.trader-nav[href="' + Trader.selectorID + '"]').on('shown.bs.tab', function(e) {
				Trader.drawChart(); // When this tab is activated
				$('.chart', e.relatedTarget.hash).empty() // previous active tab
			});
			// Prepare insert html
			$('.tab-content').append('<div id="tab-' + Trader.address + '" \
				class="tab-trader container container-xxxl fade tab-pane" role="tabpanel"></div>');
			// Insert HTML and update its UI after loading it
			$(Trader.selectorID).load('trader.html', Trader.initUI);
		},

		initUI: function() {
			// Info card top image source
			$('.info-img', Trader.selectorID).css(
				'background-image', 'url("../img/characters/' + Trader.name + '.jpg")'
			);
			// Init carousel
			var s1 = 'info-carousel-' + Trader.address;
			$('.carousel', Trader.selectorID).attr('id', s1);
			$('.carousel-indicators li', Trader.selectorID).attr('data-target', '#' + s1);

			var s2 = 'chart-' + Trader.address;
			$('#' + s1 + ' .carousel-inner', Trader.selectorID).append(
				'<div class="carousel-item chart" style="padding: 15 0 0 10" id="' + s2 + '"></div>');

			Trader.eventListener(); // BlockChain event listener
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
				$('.' + l[i], Trader.selectorID).text(Trader[l[i]]);

			// Numeral information
			$('.price', Trader.selectorID).text(web3.fromWei(Trader.price));
			$('.totalShare', Trader.selectorID).text(myNumber(Trader.totalShare));
			$('.userShare', Trader.selectorID).text(myNumber(Trader.subscriber[App.account].share));

			// Call global's UI update
			App.updateUI();
		},

		UIListener: function() {
			// checkValidityMacro() generate listner to check validity input
			checkValidityMacro(Trader.selectorID + ' #transfer', Trader.transfer);
			checkValidityMacro(Trader.selectorID + ' #sell', Trader.sell);
			checkValidityMacro(Trader.selectorID + ' #buy', Trader.buy);
		},

		eventListener: function() {
			var timeOut = 0;
			Trader.instance.records(null, { fromBlock: 0 }, (error, record) => {
				if (error)
					return console.error(error);

				var r = record.args;

				// Because blockChain will prevent branch, so if it watchs any new block
				// it would output previous event; here is to prevent repeated events
				if (Trader.records.length > 0 && r.time.toNumber() == Trader.records[Trader.records.length - 1][0])
					return;

				Trader.records.push([
					r.time.toNumber(),
					r.stock,
					r.price.toNumber(),
					r.amount.toNumber()
				]);

				$('.record table > tbody', Trader.selectorID).prepend('\
					<tr>\
						<td>' + revertDateNumber(r.time.toNumber()).toLocaleString('ja') + '</td>\
						<td>' + r.stock + '</td>\
						<td>' + r.price.toNumber() + '</td>\
						<td>' + r.amount.toNumber() + '</td>\
					</tr>\
				');
			});
		},

		drawChart: function() {
			drawChart('chart-' + Trader.address, Trader.records);
		},

		transfer: function() {
			var _toAddress = $('#transfer input[placeholder="Address"]', Trader.selectorID).val();
			var _amount = $('#transfer input[placeholder="Amount"]', Trader.selectorID).val();

			var _message = 'transfer ' + _amount + ' ' + Trader.abbr + ' to ' + _toAddress;
			console.log('Pending: ' + _message + '...');

			Trader.instance.transfer(_toAddress, _amount)
				.then(() =>
					swal('Now only wait for mined', _message, 'success')

				).catch((error) => console.error(error.message));
		},

		sell: function() {
			var _sellAmount = $('#sell input', Trader.selectorID).val();
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
			var _buyValue = $('#buy input', Trader.selectorID).val();
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