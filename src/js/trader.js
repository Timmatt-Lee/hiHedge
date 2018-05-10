'use strict'

function createTrader(_address) {
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
		chart: null, // Stock chart object
		positionS: [], // Array of position in timeStamp index
		totalProfitS: [], // Array of total profit in timeStamp index

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
				'<div class="carousel-item chart" style="padding: 15px 0px 0px 10px" id="' + s2 + '"></div>');

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

		transfer: function() {
			var _toAddress = $('#transfer input[placeholder="Address"]', Trader.selectorID).val();
			var _amount = $('#transfer input[placeholder="Amount"]', Trader.selectorID).val();

			var _message = 'transfer ' + _amount + ' ' + Trader.symbol + ' to ' + _toAddress;
			console.log('Pending: ' + _message + '...');

			Trader.instance.transfer(_toAddress, _amount)
				.then(() =>
					swal('Mined in block #1324', _message, 'success')

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
		},

		drawChart: function() {
			const TraderState = {
				LONG_COVER: -3,
				SHORT_SELL: -2,
				SELL: -1,
				STILL: 0,
				BUY: 1,
				LONG_BUY: 2,
				SHORT_COVER: 3,
			};

			// Color
			const price_color = '#ffc107';
			const profit_color = '#099999';

			const long_color = '#28A745';
			const short_color = '#DC3545';
			const offset_color = '#6C757D';

			const xCursor_clr = '#099999';

			var real_profit = 0;
			var unreal_profit = 0;
			var position_withP = []; // Array of position bind with Price

			var long_flag = [];
			var short_flag = [];
			var offset_flag = [];

			// Fetch timeS and priceS from server
			$.ajax({
				method: "GET",
				url: "/chartData",
				success: (data) => {
					// Start drawing
					var timeS = data.timeS;
					var priceS = data.priceS;

					// Prepare actS
					var actS = [];
					for (var i = 0, j = 0; i < timeS.length; i++) {
						var act = 0;
						// If this record is on the right time, trigger action at this time
						if (j < Trader.records.length && revertDateNumber(Trader.records[j][0]).getTime() == timeS[i])
							act = Trader.records[j++][3];
						// Run action at this time and write the result
						runActGetProfit(timeS[i], priceS[i], act)
					}

					// Draw chart
					Trader.chart = Highcharts.stockChart('chart-' + Trader.address, {
						chart: {
							backgroundColor: 'transparent',
							plotBorderWidth: 0,
							spacingRight: 0,
							margin: [0, 90, 10, 10],
							events: {
								load: function() {
									setInterval(() =>
										$.ajax({
											method: "GET",
											url: "/price",
											success: (p) => {
												if (!p) return;
												var x = new Date(Date.now());
												x.setMilliseconds(0);
												x = x.getTime();
												// Price
												Trader.chart.series[1].addPoint([x, Number(p)], true, true);
												// Run with no action
												runActGetProfit(x, p, 0);
												// Profit
												Trader.chart.series[0].addPoint([x, Trader.totalProfitS[Trader.totalProfitS.length - 1]], true, true);
												// Position
												Trader.chart.series[2].addPoint([x, Trader.positionS[Trader.positionS.length - 1]], true, true);
											},
										}), 1000);
								}
							}
						},

						time: {
							timezoneOffset: new Date().getTimezoneOffset(),
						},

						// "Credit by..." now set don't display
						credits: {
							enabled: false
						},

						// now_time range selector
						rangeSelector: {
							// Style of range selector button
							buttons: [{
									type: 'minute',
									count: 10,
									text: '10 m',
								},
								{
									type: 'hour',
									count: 1,
									text: '1 h',
								},
								{
									type: 'hour',
									count: 5,
									text: '5 h',
								},
								{
									type: 'day',
									count: 1,
									text: '1 d',
								},
								{
									type: 'all',
									text: 'All',
								},
							],
							selected: 0, // Default active button index (from 0)
							inputDateFormat: '%Y/%m/%d', // Input is the date now_time selector input
						},

						// Define every chunck's y axis information (Profit, Price, Position)
						yAxis: [
							// Profit
							{
								height: '85%',
								gridLineWidth: 1,
								labels: {
									format: '<b>{value}</b>',
									align: "right",
									style: { color: profit_color },
									useHTML: true,
									x: 38,
									y: 3,

								},
								title: {
									text: '<b>Profit</b>',
									align: 'high',
									useHTML: true,
									rotation: 0,
									margin: 0,
									style: { color: profit_color },
									x: 6,
									y: 3,
								},
							},
							// Price
							{
								height: '85%',
								gridLineWidth: 0, // no default grid line
								// Label is the nominal or whatever display
								labels: {
									format: ' {value:.0f}',
									style: { color: price_color },
									zIndex: -1,
									x: 43,
									y: 4,
								},
								title: {
									align: 'high',
									text: 'Price',
									rotation: 0,
									style: { color: price_color },
									x: 4,
									y: 4,
								},
							},
							// Position
							{
								// labels: { enabled: false }, // invisible v ticks.
								top: '85%', // Under Price, and Profit graph's height
								height: '15%',
								gridLineWidth: 0,
								labels: { enabled: false },
								plotLines: [{ zIndex: 5, value: 0, dashStyle: 'LongDash', color: 'black', width: 1 }],
								// At least leave space to opposite position when only one-way data displays
								softMin: -1,
								softMax: 1,
							},
						],

						// Each graph type's setting
						plotOptions: {
							flags: {
								onSeries: 'price_line', // Where to insert this flag (on profit line)
								yAxis: 0,
								style: { color: '#ffffff' }, // Font color
								shape: 'circlepin',
								width: 15,
								allowOverlapX: true,
								tooltip: { xDateFormat: '%A, %b %e, %H:%M:%S' }, // Fix format
								states: {
									hover: {
										lineColor: 'transparent',
									}
								}
							},
							series: {
								dataGrouping: {
									// Choose the closest data when grouping
									approximation: "close",
									// Best density of each data
									groupPixelWidth: 5,
									// No matter how narrow scale is, just apply the dataGrouping
									forced: true,
									// Only grouped to these units
									units: [
										['second', [1, 5, 10, 15, 30, 45]],
										['minute', [1, 5, 10, 15, 30, 45]],
										['hour', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]],
									],
								},
							},
						},

						tooltip: {
							crosshairs: { color: Highcharts.Color(xCursor_clr).setOpacity(0.4).get('rgba') }, // x line
							borderWidth: 0,
							useHTML: true,
						},

						// Every object corresponding to yAzis settings (Profit, Price, Position, long(flag), Short(flag), Offset(flag))
						series: [
							// Profit
							{
								compare: 'value',
								type: 'areaspline',
								name: 'Profit',
								id: 'profit_line',
								data: zip(timeS, Trader.totalProfitS), // Data for plot the graph
								lineWidth: 0,
								color: profit_color,
								yAxis: 0, // Binding the index of the objct of yAxis
								zIndex: -1,
								turboThreshold: Infinity,
								tooltip: {
									// pointFormat: '<span style="color:{series.color}">● {series.name}</span>: <b>{point.y:.0f}</b> NTD ({point.change}%)<br/>',

									// Tooltip text
									pointFormatter: function() {
										var text = '<span style="color:' + this.color + '">●</span> \
											Profit: <b>' + this.y.toFixed(0) + '</b> NTD ';
										// Percentage of change
										var p = this.change / (this.y - this.change);
										// If there is no change, then no need to show below
										if (p == 0)
											return text;
										// Arrow and color of up/down
										if (p > 0)
											text += '<span style="color:' + long_color + '">▲';
										else if (p < 0)
											text += '<span style="color:' + short_color + '">▼';
										// Show '%' or 'x'
										if (Math.abs(p) < 2) // percentage < 200%
											text += Math.abs((100 * p).toFixed(1)) + '%';
										else
											text += Math.abs(p.toFixed(1)) + 'x';
										text += '</span>';

										return text;
									}
								},
								dataGrouping: {
									approximation: "open",
								},
								// Gradient color
								zones: [{
									// < 0
									value: 0,
									fillColor: {
										linearGradient: { // y1 & y2 means gradient-start-position & gradient-end-position
											x1: 0,
											y1: 1,
											x2: 0,
											y2: 0
										},
										stops: [
											// Gradient-start-color and gradient-end-color
											[0, Highcharts.Color('black').setOpacity(0.5).get('rgba')],
											[1, Highcharts.Color('black').setOpacity(0.1).get('rgba')]
										]
									}
								}, {
									// >= 0
									fillColor: {
										linearGradient: {
											x1: 0,
											y1: 0,
											x2: 0,
											y2: 1
										},
										stops: [
											[0, Highcharts.Color(profit_color).setOpacity(1).get('rgba')],
											[1, Highcharts.Color(profit_color).setOpacity(0.1).get('rgba')]
										]
									}
								}],

							},
							// Price
							{
								type: 'line',
								name: 'Price',
								id: 'price_line',
								data: zip(timeS, priceS),
								color: Highcharts.Color(price_color).setOpacity(0.5).get('rgba'),
								yAxis: 1,
								zIndex: 0,
								tooltip: {
									pointFormat: '<span style="color:' + price_color + '">●</span>\
								{series.name}: <b>{point.y:.0f}</b><br/>',
								},
								dataGrouping: {
									approximation: "open", // When needed aggregation, find the extremes
								},
							},
							// Position
							{
								type: 'column',
								name: 'Position',
								id: 'pos_chart',
								data: zip(timeS, Trader.positionS),
								yAxis: 2,
								zIndex: -2,
								// Don't use getExtremesFromAll, CPU will be dead
								// Zero every padding
								pointPadding: 0,
								groupPadding: 0,
								// Color according to value
								zones: [{
									// < 0
									value: 0,
									color: short_color
								}, {
									// >= 0 && < 0.1 (that is 0)
									value: 0.1,
									color: offset_color
								}, {
									// >= 0.1
									color: long_color
								}],
								tooltip: {
									pointFormatter: function() {
										var t = '<span style="color:' + this.color + '">●</span> ';
										if (this.y == 0)
											t += '<b>No open position</b>';
										else if (this.y > 0)
											t += 'Bull position: <b>' + plural(this.y, 'Lot') + '</b>';
										else
											t += 'Bear position: <b>' + plural(Math.abs(this.y), 'Lot') + '</b>';
										return t;
									}
								},
							},
							// Long flag
							{
								type: 'flags',
								data: long_flag,
								color: Highcharts.Color(long_color).setOpacity(0.12).get('rgba'),
								fillColor: Highcharts.Color(long_color).setOpacity(0.12).get('rgba'),
								y: -38,
								states: {
									hover: {
										fillColor: long_color,
									}
								}
							},
							// Short flag
							{
								type: 'flags',
								data: short_flag,
								color: Highcharts.Color(short_color).setOpacity(0.1).get('rgba'),
								fillColor: Highcharts.Color(short_color).setOpacity(0.1).get('rgba'),
								y: -25,
								states: {
									hover: {
										fillColor: short_color,
									}
								}
							},
							// Offset flag
							{
								type: 'flags',
								data: offset_flag,
								color: Highcharts.Color(offset_color).setOpacity(0.13).get('rgba'),
								fillColor: Highcharts.Color(offset_color).setOpacity(0.13).get('rgba'),
								y: 15,
								states: {
									hover: {
										fillColor: offset_color,
									}
								}
							}
						],
					});
				}
			});

			/*
			 * Find the profit of long, short position and offset
			 *
			 * @param time Time in js default ms format
			 * @param price Price at this `time`
			 * @param act Action at this `time`
			 * @param *_flag For * flag in graph
			 */
			function runActGetProfit(time, price, act) {
				const TRADE_FEE = 0.6; // Unit is point
				const TAX_RATE = 0.0; // Transfer to `TRADE_FEE`, actual value is 0.00002
				const POINT = 50; // Unit is NTD; value of every point

				var pre_profit = real_profit + unreal_profit;
				var position = (Trader.positionS.length == 0) ? 0 : Trader.positionS[Trader.positionS.length - 1]; // Last position

				/*
				 * Flag's tooltip data
				 *
				 * @param st State of trader's action
				 * @param ts TimeStamp
				 * @param pr Now price
				 * @param pos Position
				 * @return flag's tooltip needed object
				 */
				function actFlagTooltip(st, ts, pr, pos) {
					var text, title;
					switch (st) {
						case TraderState.LONG_BUY:
							text = '<b><span style="color:' + long_color + '">Long ' + plural(Math.abs(pos), 'Lot') + '</span></b>';
							title = 'L';
							break;
						case TraderState.SHORT_SELL:
							text = '<b><span style="color:' + short_color + '">Short ' + plural(Math.abs(pos), 'Lot') + '</span></b>';
							title = 'S';
							break;
						case TraderState.SHORT_COVER:
						case TraderState.LONG_COVER:
							text = '<b><span style="color:' + offset_color + '">Offset ' + plural(Math.abs(pos), 'Lot') + '</span></b>';
							title = 'O';
							break;
					}
					text += '　<span style="color:#aaaaaa">( ' + pr + 'pt )</span>';
					return { x: ts, title: title, text: text };
				}

				function calCost(price, position) {
					var tax = price * POINT * TAX_RATE;
					return (TRADE_FEE * POINT + tax) * Math.abs(position);
				}

				function calProfit(price, hold_price, position) {
					return (price - hold_price) * POINT * position - calCost(price, position)
				}

				function calCoverProfit(price) {
					var pf = 0;
					for (var i in position_withP)
						pf += calProfit(price, position_withP[i][1], position_withP[i][0])
					return pf;
				}

				////////////////////////////   START   ///////////////////////////

				// Calculate unreal profit at first
				unreal_profit = calCoverProfit(price);

				if (act > 0) { // Buy
					if (act + position > 0) // Long position after buying
					{
						if (position < 0) { // If it used to short position, short cover
							unreal_profit = 0; // Turn to real profit
							real_profit += calCoverProfit(price);
							offset_flag.push(actFlagTooltip(TraderState.SHORT_COVER, time, price, -position));
							position_withP = []; // Clear because of offset
							long_flag.push(actFlagTooltip(TraderState.LONG_BUY, time, price, act + position));
							position += act; // Cover and add to long position
							position_withP.push([position, price]); // Buy long
							real_profit -= calCost(price, position); // Cost of buying
						} else { // Just add more long position
							long_flag.push(actFlagTooltip(TraderState.LONG_BUY, time, price, act));
							position += act; // Add more long position
							position_withP.push([act, price]); // Buy long
							real_profit -= calCost(price, act); // Cost of buying
						}
					} else if (act + position < 0) // Still at short position after buying
					{
						// Cover part of short position
						offset_flag.push(actFlagTooltip(TraderState.SHORT_COVER, time, price, act));
						// Try to find the best price to cover
						position_withP.sort((a, b) => b[1] - a[1]); // Sort higher price with higher priority
						// Traverse all short record to satisfy this action (short cover)
						for (var j = 0; j < position_withP.length && act != 0; j++) {
							if (-act > position_withP[j][0]) { // This record can satisfy the action
								position += act;
								position_withP[j][0] += act;
								real_profit += calProfit(price, position_withP[j][1], -act);
								unreal_profit -= calProfit(price, position_withP[j][1], -act);
								act = 0; // Action Satisfied
							} else { // This record cannot satisfy action
								position -= position_withP[j][0]; // Short cover
								act += position_withP[j][0]; // Decrease act (position_withP[J][0] is negative)
								real_profit += calProfit(price, position_withP[j][1], position_withP[j][0]);
								unreal_profit -= calProfit(price, position_withP[j][1], position_withP[j][0]);
								position_withP[j][0] = 0; // Exhaust the record
							}
						}
					} else // act + position == 0,  offset for short position
					{
						unreal_profit = 0; // Turn to real profit
						real_profit += calCoverProfit(price);
						offset_flag.push(actFlagTooltip(TraderState.SHORT_COVER, time, price, act));
						position = 0;
						position_withP = [];
					}
				} else if (act < 0) { // Sell
					if (act + position < 0) // Short position after selling
					{
						if (position > 0) { // If it used to long position, long cover
							unreal_profit = 0; // Turn to real profit
							real_profit += calCoverProfit(price);
							offset_flag.push(actFlagTooltip(TraderState.LONG_COVER, time, price, -position));
							position_withP = []; // Clear because of offset
							short_flag.push(actFlagTooltip(TraderState.SHORT_SELL, time, price, act + position));
							position += act; // Cover and add to short position
							position_withP.push([position, price]); // Short selling
							real_profit -= calCost(price, position); // Cost of selling
						} else { // Just add more long position
							short_flag.push(actFlagTooltip(TraderState.SHORT_SELL, time, price, act));
							position += act; // Add more short position
							position_withP.push([act, price]); // Short selling
							real_profit -= calCost(price, act); // Cost of selling
						}
					} else if (act + position > 0) // Still long position after selling
					{
						// Cover part of long position
						offset_flag.push(actFlagTooltip(TraderState.LONG_COVER, time, price, act));
						// Try to find the best price to cover
						position_withP.sort((a, b) => a[1] - b[1]); // Sort lower price with higher priority
						// Traverse all long record to satisfy this action (long cover)
						for (var j = 0; j < position_withP.length && act != 0; j++) {
							if (-act < position_withP[j][0]) { // This record can satisfy the action
								position += act;
								position_withP[j][0] += act;
								real_profit += calProfit(price, position_withP[j][1], -act);
								unreal_profit -= calProfit(price, position_withP[j][1], -act);
								act = 0; // Action Satisfied
							} else { // This record cannot satisfy action
								position -= position_withP[j][0]; // long cover
								act += position_withP[j][0]; // Increase act (act is negative)
								real_profit += calProfit(price, position_withP[j][1], position_withP[j][0]);
								unreal_profit -= calProfit(price, position_withP[j][1], position_withP[j][0]);
								position_withP[j][0] = 0; // Exhaust the record
							}
						}
					} else // act + position == 0, offset for long position
					{
						unreal_profit = 0; // Turn to real profit
						real_profit += calCoverProfit(price);
						offset_flag.push(actFlagTooltip(TraderState.LONG_COVER, time, price, act));
						position = 0;
						position_withP = [];
					}
				}
				// console.log(new Date(time), price, act, position, (real_profit + unreal_profit));
				Trader.positionS.push(position);
				Trader.totalProfitS.push(real_profit + unreal_profit);
			}
		},
	}

	return Trader.init(_address).then(() => Trader);
};