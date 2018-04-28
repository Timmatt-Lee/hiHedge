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
	// Prepare data
	var timestampS = []; // TimeStamp array (combine date array and now_time array)
	for (var i = 0; i < timeS.length; i++) // Combine date array and now_time array
		timestampS.push(revertDateNumber(timeS[i]).getTime());
	var actS = [];
	for (var i = 0, j = 0; j < records.length && i < timeS.length; i++) {
		if (records[j][0] == timeS[i]) // If on the right time
		{
			actS.push(records[j][3]); // Then this is the right time to push action
			j++;
		} else
			actS.push(0);
	}
	// Information aboffset timing of every long, short, offset and profit
	var r = runActGetProfit(timestampS, priceS, actS);

	// Draw chart
	Highcharts.stockChart(targetID, {
		chart: {
			backgroundColor: 'transparent',
			plotBorderWidth: 0,
			spacingRight: 0,
			margin: [0, 90, 10, 10],
			events: {
				load: function() {
					var series = this.series;
					setInterval(() => $.ajax({
						method: "GET",
						url: "/price",
						dataType: 'json',
						success: (data) => {
							if (data == null) return;
							var x = (new Date()).getTime();
							series[0].addPoint([x, data], true, true);
						},
					}), 1000);
				}
			}
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
					count: 1,
					text: '1 m',
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
					count: 3,
					text: '3 h',
				},
				{
					type: 'all',
					text: 'All',
				},
			],
			selected: 5, // Default active button index (from 1)
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
						['second', [1, 5, 10, 30]],
						['minute', [1, 5, 10, 30]]
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
				data: zip(timestampS, priceS),
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
				data: zip(timestampS, r.profitS), // Data for plot the graph
				lineWidth: 0,
				color: profit_color,
				yAxis: 1, // Binding the index of the objct of yAxis
				zIndex: -1,
				turboThreshold: Infinity,
				tooltip: {
					// valueDecimal: 1,
					pointFormatter: function() {
						var tS = r.totalProfitS;
						var t = tS[this.x];
						if (t == undefined) return;
						// Ratio compare with the beginning of the visible range
						var cmp_base;
						var i = 0;
						while (!(cmp_base = tS[this.series.processedXData[i++]])); // Find the first available number
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
				data: zip(timestampS, r.positionS),
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
				data: r.long_flag,
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
				data: r.short_flag,
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
				data: r.offset_flag,
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


/*
 * Find the profit of long, short position and offset
 *
 * @param timestampS Date and Time array
 * @param priceS Price array
 * @param actS Action array
 * @return {profitS, totalProfitS, positionS long_flag, short_flag, offset_flag}
 */
function runActGetProfit(timestampS, priceS, actS) {
	const TRADE_FEE = 0.6; // Unit is point
	const TAX_RATE = 0.0; // Transfer to TRADE_FEE, actual value is 0.00002
	const POINT = 1; // Value of every point of the future (e.g. 小台指期 = 50)

	var long_flag = [];
	var short_flag = [];
	var offset_flag = [];
	var profitS = [];
	var totalProfitS = {}; // Total profit, for profit graph's tooltip data
	var positionS = [];
	var position_withP = []; // Position bind with Price array

	var unreal_profit = 0; // Before offset, the balance binds with future
	var real_profit = 0; // The actual profit after offset
	var position = 0; // long position > 0, short < 0

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

	function calCost(now_price, position) {
		var tax = Math.round(now_price * POINT * TAX_RATE);
		return (TRADE_FEE + tax) * Math.abs(position);
	}

	function calProfit(now_price, hold_price, position) {
		return (now_price - hold_price) * POINT * position - calCost(now_price, position)
	}

	function calCoverProfit(now_price) {
		var pf = 0;
		for (var i in position_withP)
			pf += calProfit(now_price, position_withP[i][1], position_withP[i][0])
		return pf;
	}

	// Start calculation
	for (var i = 0; i < timestampS.length; i++) {
		var now_time = timestampS[i];
		var now_price = priceS[i];
		var act = actS[i];
		var pre_profit = real_profit + unreal_profit;
		// Calculate unreal profit every step no matter what
		unreal_profit = calCoverProfit(now_price);

		if (act > 0) { // Buy
			if (act + position > 0) // Long position after buying
			{
				if (position < 0) { // If it used to short position, short cover
					unreal_profit = 0; // Turn to real profit
					real_profit += calCoverProfit(now_price);
					offset_flag.push(actFlagTooltip(TraderState.SHORT_COVER, now_time, now_price, -position));
					position_withP = []; // Clear because of offset
					long_flag.push(actFlagTooltip(TraderState.LONG_BUY, now_time, now_price, act + position));
					position += act; // Cover and add to long position
					position_withP.push([position, now_price]); // Buy long
					real_profit -= calCost(now_price, position); // Cost of buying
				} else { // Just add more long position
					long_flag.push(actFlagTooltip(TraderState.LONG_BUY, now_time, now_price, act));
					position += act; // Add more long position
					position_withP.push([act, now_price]); // Buy long
					real_profit -= calCost(now_price, act); // Cost of buying
				}
			} else if (act + position < 0) // Still at short position after buying
			{
				// Cover part of short position
				offset_flag.push(actFlagTooltip(TraderState.SHORT_COVER, now_time, now_price, act));
				// Try to find the best price to cover
				position_withP.sort((a, b) => b[1] - a[1]); // Sort higher price with higher priority
				// Traverse all short record to satisfy this action (short cover)
				for (var j = 0; j < position_withP.length && act != 0; j++) {
					if (-act > position_withP[j][0]) { // This record can satisfy the action
						position += act;
						position_withP[j][0] += act;
						real_profit += calProfit(now_price, position_withP[j][1], -act);
						unreal_profit -= calProfit(now_price, position_withP[j][1], -act);
						act = 0; // Action Satisfied
					} else { // This record cannot satisfy action
						position -= position_withP[j][0]; // Short cover
						act += position_withP[j][0]; // Decrease act (position_withP[J][0] is negative)
						real_profit += calProfit(now_price, position_withP[j][1], position_withP[j][0]);
						unreal_profit -= calProfit(now_price, position_withP[j][1], position_withP[j][0]);
						position_withP[j][0] = 0; // Exhaust the record
					}
				}
			} else // act + position == 0,  offset for short position
			{
				unreal_profit = 0; // Turn to real profit
				real_profit += calCoverProfit(now_price);
				offset_flag.push(actFlagTooltip(TraderState.SHORT_COVER, now_time, now_price, act));
				position = 0;
				position_withP = [];
			}
		} else if (act < 0) { // Sell
			if (act + position < 0) // Short position after selling
			{
				if (position > 0) { // If it used to long position, long cover
					unreal_profit = 0; // Turn to real profit
					real_profit += calCoverProfit(now_price);
					offset_flag.push(actFlagTooltip(TraderState.LONG_COVER, now_time, now_price, -position));
					position_withP = []; // Clear because of offset
					short_flag.push(actFlagTooltip(TraderState.SHORT_SELL, now_time, now_price, act + position));
					position += act; // Cover and add to short position
					position_withP.push([position, now_price]); // Short selling
					real_profit -= calCost(now_price, position); // Cost of selling
				} else { // Just add more long position
					short_flag.push(actFlagTooltip(TraderState.SHORT_SELL, now_time, now_price, act));
					position += act; // Add more short position
					position_withP.push([act, now_price]); // Short selling
					real_profit -= calCost(now_price, act); // Cost of selling
				}
			} else if (act + position > 0) // Still long position after selling
			{
				// Cover part of long position
				offset_flag.push(actFlagTooltip(TraderState.LONG_COVER, now_time, now_price, act));
				// Try to find the best price to cover
				position_withP.sort((a, b) => a[1] - b[1]); // Sort lower price with higher priority
				// Traverse all long record to satisfy this action (long cover)
				for (var j = 0; j < position_withP.length && act != 0; j++) {
					if (-act < position_withP[j][0]) { // This record can satisfy the action
						position += act;
						position_withP[j][0] += act;
						real_profit += calProfit(now_price, position_withP[j][1], -act);
						unreal_profit -= calProfit(now_price, position_withP[j][1], -act);
						act = 0; // Action Satisfied
					} else { // This record cannot satisfy action
						position -= position_withP[j][0]; // long cover
						act += position_withP[j][0]; // Increase act (act is negative)
						real_profit += calProfit(now_price, position_withP[j][1], position_withP[j][0]);
						unreal_profit -= calProfit(now_price, position_withP[j][1], position_withP[j][0]);
						position_withP[j][0] = 0; // Exhaust the record
					}
				}
			} else // act + position == 0, offset for long position
			{
				unreal_profit = 0; // Turn to real profit
				real_profit += calCoverProfit(now_price);
				offset_flag.push(actFlagTooltip(TraderState.LONG_COVER, now_time, now_price, act));
				position = 0;
				position_withP = [];
			}
		}
		totalProfitS[now_time] = real_profit + unreal_profit;
		profitS.push(real_profit + unreal_profit - pre_profit);
		positionS.push(position);
		// console.log(formatYMD(now_time), formatTime(now_time), priceS[i].toFixed(), actS[i], position, (real_profit + unreal_profit - pre_profit).toFixed(1), (real_profit + unreal_profit).toFixed(1));
	}
	// return
	return {
		profitS: profitS,
		totalProfitS: totalProfitS,
		positionS: positionS,
		long_flag: long_flag,
		short_flag: short_flag,
		offset_flag: offset_flag
	};
}