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

// @param targetID Id selector of which would like to be contain chart
function drawChart(targetID, records) {
	var chart; // Stock chart object

	var real_profit = 0;
	var unreal_profit = 0;
	var profitS = []; //Array of profit at each time (for graph)
	var positionS = []; // Array of position (for graph)
	var position_withP = []; // Array of position bind with Price
	var totalProfitS = {};

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
				if (j < records.length && revertDateNumber(records[j][0]).getTime() == timeS[i])
					act = records[j++][3];
				// console.log(records[j][0], formatDateNumber(new Date(Date.UTC(timeS[i]))));
				// Run action at this time and write the result
				runActGetProfit(timeS[i], priceS[i], act)
			}

			// Draw chart
			Highcharts.stockChart(targetID, {
				chart: {
					backgroundColor: 'transparent',
					plotBorderWidth: 0,
					spacingRight: 0,
					margin: [0, 90, 10, 10],
					events: {
						load: function() {
							chart = this;
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
										chart.series[0].addPoint([x, Number(p)], true, true);
										// Run with no action
										runActGetProfit(x, p, 0);
										// Profit
										chart.series[1].addPoint([x, profitS[profitS.length - 1]], true, true);
										// Position
										chart.series[2].addPoint([x, positionS[positionS.length - 1]], true, true);
									},
								}), 60 * 1000);
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
							type: 'week',
							count: 1,
							text: '1 w',
						},
						{
							type: 'all',
							text: 'All',
						},
					],
					selected: 1, // Default active button index (from 0)
					inputDateFormat: '%Y/%m/%d', // Input is the date now_time selector input
				},

				// Define every chunck's y axis information (Price, Profit, Position)
				yAxis: [
					// Price
					{
						height: '85%',
						gridLineWidth: 0, // no default grid line
						// Label is the nominal or whatever display
						labels: {
							format: ' {value:.0f}',
							style: { color: price_color },
							zIndex: -1,
							x: 38,
							y: 3,
						},
						title: {
							align: 'high',
							text: 'Price',
							rotation: 0,
							style: { color: price_color },
							x: -13,
							y: 3,
						},
					},
					// Profit
					{
						height: '85%',
						gridLineWidth: 1,
						labels: {
							format: '<b>{value}</b>',
							align: "right",
							style: { color: profit_color },
							useHTML: true,
							x: 43,
							y: 2,
						},
						title: {
							text: '<b>Profit</b>',
							align: 'high',
							useHTML: true,
							rotation: 0,
							margin: 0,
							style: { color: profit_color },
							x: 8,
							y: 2,
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
						lineColor: 'transparent',
						states: {
							hover: {
								lineColor: 'transparent',
							}
						}
					},
					series: {
						dataGrouping: {
							// Best density of each data
							groupPixelWidth: 5,
							// No matter how narrow scale is, just apply the dataGrouping
							forced: true,
							// Only grouped to these units
							units: [
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

				// Every object corresponding to yAzis settings (Price, Profit, Position, long(flag), Short(flag), Offset(flag))
				series: [
					// Price
					{
						type: 'line',
						name: 'Price',
						id: 'price_line',
						data: zip(timeS, priceS),
						color: Highcharts.Color(price_color).setOpacity(0.5).get('rgba'),
						yAxis: 0,
						zIndex: -1,
						tooltip: {
							pointFormat: '<span style="color:' + price_color + '">●</span>\
						{series.name}: <b>{point.y:.0f}</b><br/>',
						},
						dataGrouping: {
							approximation: "open", // When needed aggregation, find the extremes
						},
					},
					// Profit
					{
						type: 'areaspline',
						name: 'Profit',
						id: 'profit_line',
						data: zip(timeS, profitS), // Data for plot the graph
						lineWidth: 0,
						color: profit_color,
						yAxis: 1, // Binding the index of the objct of yAxis
						zIndex: -1,
						turboThreshold: Infinity,
						tooltip: {
							// valueDecimal: 1,
							pointFormatter: function() {
								var t = totalProfitS[this.x];
								if (t == undefined) return;
								// Ratio compare with the beginning of the visible range
								var cmp_base;
								var i = 0;
								while (!(cmp_base = totalProfitS[this.series.processedXData[i++]])); // Find the first available number
								var rr = ((t - cmp_base) / Math.abs(cmp_base)); // Rate of retuen
								// Tooltip text
								// Prefix
								var text = '<p style="text-align:right;margin:0">\
									<span style="color:' + this.color + '">●</span> Total Profit:';
								// Percentage or Multiplier
								if (Math.abs(rr) < 2) // percentage < 200%
									text += '(' + (rr > 0 ? '+' : '') + (100 * rr).toFixed(1) + '%)'
								else
									text += '(' + (rr > 0 ? '+' : '') + rr.toFixed(1) + 'x)'
								// Total profit number
								text += '<b> ' + t.toFixed(1) + ' NTD</b></p>';
								// Gain or Loss
								if (this.y > 0)
									text += '<p style="text-align:right;margin:0;color:' + long_color + '">▲ \
									' + this.y.toFixed(2) + ' NTD</p>';
								else if (this.y < 0)
									text += '<p style="text-align:right;margin:0;color:' + short_color + '">▼ \
									' + Math.abs(this.y).toFixed(2) + ' NTD</p>';

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
					// Position
					{
						type: 'column',
						name: 'Position',
						id: 'pos_chart',
						data: zip(timeS, positionS),
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
						dataGrouping: {
							approximation: "close",
						},
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
		const TAX_RATE = 0.0; // Transfer to TRADE_FEE, actual value is 0.00002
		const POINT = 1; // Value of every point of the future (e.g. 小台指期 = 50)

		var pre_profit = real_profit + unreal_profit;
		var position = (positionS.length == 0) ? 0 : positionS[positionS.length - 1]; // Last position

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
			var tax = Math.round(price * POINT * TAX_RATE);
			return (TRADE_FEE + tax) * Math.abs(position);
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
		positionS.push(position);
		profitS.push(real_profit + unreal_profit - pre_profit);
		totalProfitS[time] = real_profit + unreal_profit;
	}
}