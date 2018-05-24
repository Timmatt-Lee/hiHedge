'use strict'

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

const TRADE_FEE = 0.6; // Unit is point
const TAX_RATE = 0.0; // Transfer to `TRADE_FEE`, actual value is 0.00002
const POINT = 50; // Unit is NTD; value of every point

function createTrader(_address) {
	var Trader = {
		instance: null,
		hasDOM: false,
		address: 0x0, // Address of this contract
		registrant: 0x0, // Address who registered this trader
		img: '', // Image url
		domID: '', // JQ selector prefix
		abbr: '', // Abbreviation of this trader's share
		symbol: '', // Symbol of this trader
		name: '', // Nmae of this trader
		totalShare: 0,
		subscriber: {}, // Object<address:{share: uint, proportion: float}>
		price: 0, // Exchange rate of ETH per share
		performance_base: 0, // Base of today's profit change
		performance: 0, // Today's profit change
		performance_html: '', // Html code for formatted today's profit change
		splitting: 0, // Splitting ratio per share when appreciation
		fee: 0, // Subscription fee
		records: [], // Real world transaction record
		chart: null, // Stock chart object
		positionS: [], // Array of position in time index
		totalProfitS: [],
		profitS: [],
		position_stateS: [], // Detailed position and price Array in time index
		unreal_profitS: [],
		real_profitS: [],
		long_flag: [],
		short_flag: [],
		offset_flag: [],

		init: function(_address) {
			// Contract address
			Trader.address = _address;
			// JQ selector prefix
			Trader.domID = '#tab-' + _address;
			// Get contract instance
			return App.contracts.Trader.at(_address)
				.then(_instance => Trader.instance = _instance)
				.then(() => Trader.instance.ownerList(1)) // Get registrant
				.then(_registrant => Trader.registrant = _registrant)
				.then(Trader.fetchData) // DB
				.then(Trader.async) // BlockChain
				.then(Trader.eventListener) // BlockChain event listener
				.then(Trader.initRecords); // Calculate records to profitS, positionS...
		},

		// Data in blockChain
		async: function() {
			return Trader.instance.totalShare() // Total share
				.then(_totalShare => Trader.totalShare = _totalShare)
				.then(() => Trader.instance.price()) // Exchange rate of ETH per share
				.then(_price => Trader.price = _price)
				.then(() => Trader.instance.fee()) // Subscription fee
				.then(_fee => Trader.fee = _fee)
				.then(() => Trader.instance.getSubscribers()) // Addresses subscribed this trader
				.then(_subscriber =>
					_subscriber.reduce((p, _) => // Traverse all subscribers
						p.then(() =>
							Trader.instance.shareOf(_) // Get each subscriber's share
						).then(_share => // Record in {share: uint,proportion: float}
							Trader.subscriber[_] = { share: _share, proportion: _share / Trader.totalShare }
						), Promise.resolve())
				).then(Trader.updateUI);
		},

		// DataBase
		fetchData: function() {
			return $.ajax({
				url: "/trader",
				data: { address: Trader.address },
			}).then(res => {
				var l = ['name', 'description', 'abbr', 'symbol', 'img'];
				for (var i in l)
					Trader[l[i]] = res[l[i]];
			});
		},

		initDOM: function() {
			// toggle bool for pass updateUI()
			Trader.hasDOM = true;
			// Add a label in corresponding menu
			$('#navbarSupportedContent .dropdown-menu:' +
				(Trader.registrant == App.account ? 'first' : 'last')).append('\
				<a class="dropdown-item trader-nav" href="' + Trader.domID + '"\
					data-toggle="list" role="tab">' + Trader.name + ' ' + Trader.symbol + '</a>');
			// Only draw chart when switch th this tab
			$('.trader-nav[href="' + Trader.domID + '"]').on('shown.bs.tab', Trader.drawChart);
			// Prepare insert html
			$('.tab-content').append('<div id="tab-' + Trader.address + '" \
				class="tab-trader container container-xxxl fade tab-pane" role="tabpanel"></div>');
			// Insert HTML and update its UI after loading it
			$(Trader.domID).load('trader.html', Trader.initUI);
		},

		initUI: function() {
			// Info card top image source
			$('.info-img', Trader.domID).css(
				'background-image', 'url("../img/characters/' + Trader.img + '.jpg")'
			);
			// If user owns the trader, then user can record transactions
			if (Trader.registrant != App.account)
				$('#record', Trader.domID).hide();

			// Init carousel
			var s1 = 'info-carousel-' + Trader.address;
			$('.carousel', Trader.domID).attr('id', s1);
			$('.carousel-control-prev, .carousel-control-next', Trader.domID).attr('href', '#' + s1);
			$('.carousel-indicators li', Trader.domID).attr('data-target', '#' + s1);

			var s2 = 'chart-' + Trader.address;
			$('#' + s1 + ' .carousel-item:last', Trader.domID).attr('id', s2);

			Trader.UIListener(); // bind UI with listener
			Trader.updateUI();
		},

		updateUI: function() {
			// For concise code
			var domID_1 = Trader.domID;
			var domID_2 = '#card-' + Trader.address;
			var domID_1_2 = domID_1 + ', ' + domID_2;

			// Basic information
			['name', 'description', 'abbr', 'symbol'].map(_ => $('.' + _, domID_1_2).text(Trader[_]));

			// Format information
			$('.price', domID_1_2).html(myNumber(web3.fromWei(Trader.price)));
			$('.totalShare', domID_1_2).text(myNumber(Trader.totalShare));

			if (Trader.subscriber[App.account] != undefined) {
				$('.isSubscribed', domID_2).html('My Share: <t class="userShare"></t> ' + Trader.symbol);
				$('.userShare', domID_1_2).text(myNumber(Trader.subscriber[App.account].share));
			} else {
				$('.isSubscribed', domID_2).html('\
					<div tabindex="0" data-toggle="tooltip" class="tooltip-login d-inline-block">\
						<button class="btn btn-secondary" type="button">\
							Subscribe (' + web3.fromWei(Trader.fee) + ' ETH)\
						</button>\
					</div>');
				$('.isSubscribed button', domID_2).on('click', Trader.subscribe);
			}

			// Last Action time
			var recS = Trader.records;
			if (recS.length > 0)
				$('.last-action', domID_1_2).text(
					'Last Action: ' + fromDateNumber(recS[recS.length - 1][0]).toLocaleString('ja'));

			// Restrict input form
			$('#transfer input[for="transfer-Amount"], #sell input', domID_1).attr('max', Trader.subscriber[App.account].share)
			$('#buy input', domID_1).attr({ step: web3.fromWei(Trader.price), min: web3.fromWei(Trader.price) })

			// Call global's UI update
			App.updateUI();
		},

		UIListener: function() {
			// checkValidityMacro() generate listner to check validity input

			var domID = Trader.domID;
			checkValidityMacro($('#record', domID), Trader.record);
			checkValidityMacro($('#transfer ', domID), Trader.transfer);
			checkValidityMacro($('#sell', domID), Trader.sell);
			checkValidityMacro($('#buy', domID), Trader.buy);
		},

		eventListener: function() {
			// Transaction records
			Trader.instance.Records(null, { fromBlock: 0 }, (err, res) => {
				if (err) throw err;

				var r = res.args;
				Trader.records.push([
					r.time.toNumber(),
					r.stock,
					r.price.toNumber(),
					r.amount.toNumber()
				]);

				$('.record table > tbody', Trader.domID).prepend('\
					<tr>\
						<td>' + fromDateNumber(r.time.toNumber()).toLocaleString('ja') + '</td>\
						<td>' + r.stock + '</td>\
						<td>' + r.price.toNumber() + '</td>\
						<td>' + r.amount.toNumber() + '</td>\
					</tr>\
				');

				Trader.updateUI();
			});
		},

		transfer: function() {
			var _toAddress = $('#transfer input[placeholder="Address"]', Trader.domID).val();
			var _amount = $('#transfer input[placeholder="Amount"]', Trader.domID).val();

			var _message = 'transfer ' + _amount + ' ' + Trader.symbol + ' to ' + _toAddress;
			console.log('Pending: ' + _message + '...');

			Trader.instance.transfer(_toAddress, _amount)
				.then(() =>
					web3.eth.getBlockNumber((e, bNum) => swal('Mined in block #' + bNum, _message, 'success'))

				).catch(console.error);
		},

		sell: function() {
			var _sellAmount = $('#sell input', Trader.domID).val();
			var _message = 'sell ' + _sellAmount + ' ' + Trader.symbol;

			console.log('Pending: ' + _message + '...');

			var _soldETH = 0;
			Trader.instance.sell.call(_sellAmount)
				.then(res => {
					_soldETH = web3.fromWei(res);
					return Trader.instance.sell(_sellAmount);

				}).then(() =>
					web3.eth.getBlockNumber((e, bNum) => swal('Mined in block #' + bNum, _message + ' for ' + _soldETH + ' ether!', 'success'))

				).catch(console.error);
		},

		buy: function() {
			var _buyValue = $('#buy input', Trader.domID).val();
			var _message = ' by ' + _buyValue + ' ether';

			console.log('Pending: buy ' + Trader.symbol + _message + '...');

			var _boughtAmount = 0;
			Trader.instance.buy.call({ value: web3.toWei(_buyValue) })
				.then(res => {
					_boughtAmount = res;
					return Trader.instance.buy({ value: web3.toWei(_buyValue) })

				}).then(() =>
					web3.eth.getBlockNumber((e, bNum) => swal('Mined in block #' + bNum, 'buy ' + _boughtAmount + ' ' + Trader.symbol + _message, 'success'))

				).catch(console.error);
		},

		record: function() {
			$.ajax({ url: "/price" }).then(p => {
				if (!p)
					return swal('Not trading time', 'It\'s time for trader sleeping', 'warning');
				var amount = $('#record input', Trader.domID).val();
				Trader.instance.record(makeDateNumber(new Date(Date.now())), 'TXF', p, amount)
					.then(() =>
						web3.eth.getBlockNumber((e, bNum) => swal('Mined in block #' + bNum, Trader.name + '\'s transaction has been recorded on blockchain', 'success'))

					).catch(console.error);
			})
		},

		subscribe: function() {
			Trader.instance.subscribe({ value: Trader.fee })
				.then(() =>
					web3.eth.getBlockNumber((e, bNum) => swal('Mined in block #' + bNum, 'YA! Now you are ' + Trader.name + '\'s Shareholder!', 'success'))

				).catch(console.error);
		},

		initRecords: function() {
			// For concise code
			var recS = Trader.records;
			var rec_pivot = 0; // Index of records that has been processed
			var posS = Trader.positionS;
			var pos_stateS = Trader.position_stateS;
			var total_pS = Trader.totalProfitS;
			var pS = Trader.profitS;
			var unreal_pS = Trader.unreal_profitS;
			var real_pS = Trader.real_profitS;

			var long_flag = Trader.long_flag;
			var short_flag = Trader.short_flag;
			var offset_flag = Trader.offset_flag;

			var timeS = Chart.timeS;
			var priceS = Chart.priceS;

			for (var i = 0; i < timeS.length; i++) {
				var act = 0;
				// If this record is on the right time
				if (rec_pivot < recS.length &&
					fromDateNumber(recS[rec_pivot][0]).getTime() == timeS[i])
					// Record its action at this time
					act = recS[rec_pivot++][3];

				// Run action at this time and write the result
				runActGetProfit(timeS[i], priceS[i], act)
			}

			// Get today profit base
			for (var j = timeS.length - 1; j >= 0; j--) {
				var d = new Date(timeS[j]);
				if (d.getHours() == 4 && d.getMinutes() == 59) {
					Trader.performance_base = total_pS[j];
					break;
				}
			}

			// Set interval for every 1s
			setInterval(() => {
				// Today's profit Change
				// Percntage of change
				var p = Trader.performance = (total_pS[total_pS.length - 1] - Trader.performance_base) / Math.abs(Trader.performance_base);
				var t_p_txt = '';
				if (p > 0)
					t_p_txt += '<span style="color:' + long_color + '">▲';
				else if (p < 0)
					t_p_txt += '<span style="color:' + short_color + '">▼';

				t_p_txt += ' ' + Math.abs(total_pS[total_pS.length - 1] - Trader.performance_base) + ' NTD';
				// Show '%' or 'x'
				if (p != 0) {
					t_p_txt += ' ('
					if (Math.abs(p) < 2) // percentage < 200%
						t_p_txt += (100 * p).toFixed(1) + '%';
					else
						t_p_txt += p.toFixed() + 'x';
					t_p_txt += ')</span>';
				}

				Trader.performance_html = t_p_txt;
				$('.performance', Trader.domID + ', #card-' + Trader.address).html(Trader.performance_html);

				// If there are records that has not been drawn on chart
				if (rec_pivot < recS.length) {
					var start = timeS.indexOf(fromDateNumber(recS[rec_pivot][0]).getTime());
					for (var i = start; i < timeS.length; i++) {
						var act = 0;
						// If this record is on the right time
						if (rec_pivot < recS.length &&
							fromDateNumber(recS[rec_pivot][0]).getTime() == timeS[i])
							// Record its action at this time
							act = recS[rec_pivot++][3];

						// Run action at this time and write the result
						runActGetProfit(timeS[i], priceS[i], act, i);
					}
					// Only tab is shown to render chart
					if ($(Trader.domID).hasClass('show')) {
						// Update chart
						// @notice There is no way to update with animation in stock ctart

						// Profit, Position, Long flag, Short flag, Offset flag
						Trader.chart.series[0].setData(zip(timeS, total_pS));
						Trader.chart.series[2].setData(zip(timeS, posS));
						Trader.chart.series[3].setData(long_flag);
						Trader.chart.series[4].setData(short_flag);
						Trader.chart.series[5].setData(offset_flag);
					}
				}
				// When timeS and priceS is not updated, break this loop
				if (!Chart.updated) return;
				// Add new point every second
				var x = timeS[timeS.length - 1];
				// Run with no action
				runActGetProfit(x, priceS[priceS.length - 1], 0);
				// Only tab is shown to render chart
				if ($(Trader.domID).hasClass('show')) {
					// Profit, Price, Position
					Trader.chart.series[0].addPoint([x, total_pS[total_pS.length - 1]]);
					Trader.chart.series[1].addPoint([x, priceS[priceS.length - 1]]);
					Trader.chart.series[2].addPoint([x, posS[posS.length - 1]]);
				}
			}, 1000);


			/*
			 * Find the profit of long, short position and offset
			 *
			 * @param time Time in js default ms format
			 * @param price Price at this `time`
			 * @param act Action at this `time`
			 */
			function runActGetProfit(time, price, act, index = -1) {
				// Get previous data
				var a = real_pS;
				var i = index == -1 ? a.length : index;
				// @notice Base profit should be 1 for graph comparison
				var real_profit = i == 0 ? 1 : a[i - 1];
				a = unreal_pS;
				var unreal_profit = i == 0 ? 0 : a[i - 1];
				a = total_pS;
				var pre_profit = i == 0 ? 0 : a[i - 1];
				a = pos_stateS;
				var position_state = i == 0 ? [] : a[i - 1];
				a = posS;
				var position = i == 0 ? 0 : a[i - 1];

				////////////////////////////   START   ///////////////////////////

				// Calculate unreal profit at first
				unreal_profit = calCoverProfit(price, position_state);

				if (act > 0) { // Buy
					if (act + position > 0) // Long position after buying
					{
						if (position < 0) { // If it used to short position, short cover
							unreal_profit = 0; // Turn to real profit
							real_profit += calCoverProfit(price, position_state);
							offset_flag.push(actFlagTooltip(TraderState.SHORT_COVER, time, price, -position));
							position_state = []; // Clear because of offset
							long_flag.push(actFlagTooltip(TraderState.LONG_BUY, time, price, act + position));
							position += act; // Cover and add to long position
							position_state.push([position, price]); // Buy long
							real_profit -= calCost(price, position); // Cost of buying
						} else { // Just add more long position
							long_flag.push(actFlagTooltip(TraderState.LONG_BUY, time, price, act));
							position += act; // Add more long position
							position_state.push([act, price]); // Buy long
							real_profit -= calCost(price, act); // Cost of buying
						}
					} else if (act + position < 0) // Still at short position after buying
					{
						// Cover part of short position
						offset_flag.push(actFlagTooltip(TraderState.SHORT_COVER, time, price, act));
						// Try to find the best price to cover
						position_state.sort((a, b) => b[1] - a[1]); // Sort higher price with higher priority
						// Traverse all short record to satisfy this action (short cover)
						for (var j = 0; j < position_state.length && act != 0; j++) {
							if (-act > position_state[j][0]) { // This record can satisfy the action
								position += act;
								position_state[j][0] += act;
								real_profit += calProfit(price, position_state[j][1], -act);
								unreal_profit -= calProfit(price, position_state[j][1], -act);
								act = 0; // Action Satisfied
							} else { // This record cannot satisfy action
								position -= position_state[j][0]; // Short cover
								act += position_state[j][0]; // Decrease act (position_state[J][0] is negative)
								real_profit += calProfit(price, position_state[j][1], position_state[j][0]);
								unreal_profit -= calProfit(price, position_state[j][1], position_state[j][0]);
								position_state[j][0] = 0; // Exhaust the record
							}
						}
					} else // act + position == 0,  offset for short position
					{
						unreal_profit = 0; // Turn to real profit
						real_profit += calCoverProfit(price, position_state);
						offset_flag.push(actFlagTooltip(TraderState.SHORT_COVER, time, price, act));
						position = 0;
						position_state = [];
					}
				} else if (act < 0) { // Sell
					if (act + position < 0) // Short position after selling
					{
						if (position > 0) { // If it used to long position, long cover
							unreal_profit = 0; // Turn to real profit
							real_profit += calCoverProfit(price, position_state);
							offset_flag.push(actFlagTooltip(TraderState.LONG_COVER, time, price, -position));
							position_state = []; // Clear because of offset
							short_flag.push(actFlagTooltip(TraderState.SHORT_SELL, time, price, act + position));
							position += act; // Cover and add to short position
							position_state.push([position, price]); // Short selling
							real_profit -= calCost(price, position); // Cost of selling
						} else { // Just add more long position
							short_flag.push(actFlagTooltip(TraderState.SHORT_SELL, time, price, act));
							position += act; // Add more short position
							position_state.push([act, price]); // Short selling
							real_profit -= calCost(price, act); // Cost of selling
						}
					} else if (act + position > 0) // Still long position after selling
					{
						// Cover part of long position
						offset_flag.push(actFlagTooltip(TraderState.LONG_COVER, time, price, act));
						// Try to find the best price to cover
						position_state.sort((a, b) => a[1] - b[1]); // Sort lower price with higher priority
						// Traverse all long record to satisfy this action (long cover)
						for (var j = 0; j < position_state.length && act != 0; j++) {
							if (-act < position_state[j][0]) { // This record can satisfy the action
								position += act;
								position_state[j][0] += act;
								real_profit += calProfit(price, position_state[j][1], -act);
								unreal_profit -= calProfit(price, position_state[j][1], -act);
								act = 0; // Action Satisfied
							} else { // This record cannot satisfy action
								position -= position_state[j][0]; // long cover
								act += position_state[j][0]; // Increase act (act is negative)
								real_profit += calProfit(price, position_state[j][1], position_state[j][0]);
								unreal_profit -= calProfit(price, position_state[j][1], position_state[j][0]);
								position_state[j][0] = 0; // Exhaust the record
							}
						}
					} else // act + position == 0, offset for long position
					{
						unreal_profit = 0; // Turn to real profit
						real_profit += calCoverProfit(price, position_state);
						offset_flag.push(actFlagTooltip(TraderState.LONG_COVER, time, price, act));
						position = 0;
						position_state = [];
					}
				}

				if (index == -1) {
					posS.push(position);
					total_pS.push(real_profit + unreal_profit);
					pS.push(real_profit + unreal_profit - pre_profit);
					pos_stateS.push(position_state);
					real_pS.push(real_profit);
					unreal_pS.push(unreal_profit);
				} else {
					posS[index] = position;
					total_pS[index] = real_profit + unreal_profit;
					pS[index] = real_profit + unreal_profit - pre_profit;
					pos_stateS[index] = position_state;
					real_pS[index] = real_profit;
					unreal_pS[index] = unreal_profit;
				}
			}

			/*
			 * Flag's tooltip data
			 *
			 * @param s State of trader's action
			 * @param t time
			 * @param p Now price
			 * @param pos Position
			 * @return flag's tooltip needed object
			 */
			function actFlagTooltip(s, t, p, pos) {
				var text, title;
				switch (s) {
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
				text += '　<span style="color:#aaaaaa">( ' + p + 'pt )</span>';
				return { x: t, title: title, text: text };
			}

			function calCost(price, position) {
				var tax = price * POINT * TAX_RATE;
				return (TRADE_FEE * POINT + tax) * Math.abs(position);
			}

			function calProfit(price, hold_price, position) {
				return (price - hold_price) * POINT * position - calCost(price, position)
			}

			function calCoverProfit(price, position_state) {
				var pf = 0;
				for (var i in position_state)
					pf += calProfit(price, position_state[i][1], position_state[i][0])
				return pf;
			}

		},

		drawChart: function() {
			Trader.chart = Highcharts.stockChart('chart-' + Trader.address, {
				chart: {
					backgroundColor: 'transparent',
					plotBorderWidth: 0,
					spacingRight: 0,
					margin: [0, 90, 10, 10],
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
							count: 2,
							text: '2 m',
						},
						{
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
							type: 'all',
							text: 'All',
						},
					],
					selected: 1, // Default active button index
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
						data: zip(Chart.timeS, Trader.totalProfitS), // Data for graph
						lineWidth: 0,
						color: profit_color,
						yAxis: 0, // Binding the index of the objct of yAxis
						zIndex: -1,
						turboThreshold: Infinity,
						tooltip: {
							// Tooltip text
							pointFormatter: function() {
								var text = '<span style="color:' + this.color + '">●</span> \
														Total Profit: <b>' + this.y.toFixed(0) + '</b> NTD ';
								// Percentage of change
								var p = this.change / Math.abs(this.y - this.change);
								// If there is no change, then no need to show below
								if (!p)
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
						data: zip(Chart.timeS, Chart.priceS),
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
						data: zip(Chart.timeS, Trader.positionS),
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
						data: Trader.long_flag,
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
						data: Trader.short_flag,
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
						data: Trader.offset_flag,
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
		},
	}

	return Trader.init(_address).then(() => Trader);
};