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
function drawChart(targetID, AI) {
	// Prepare data
	var timestampS = []; // TimeStamp array (combine date array and time array)
	for (var i = 0; i < dateS.length; i++) // Combine date array and time array
		timestampS.push(formatTimeStamp(dateS[i], timeS[i]));
	// Zip each data array with time stamp array (because stock chart's x axis is time)
	var price_withT = zip(timestampS, priceS); // Price array with timeStamp
	var act_withT = zip(timestampS, actS[AI]); // Action(Buy/Sell) array with timeStamp

	// Information aboffset timing of every long, short, offset and profit
	var r = runActGetProfit(act_withT, price_withT);

	// Draw chart
	Highcharts.stockChart(targetID, {
		chart: {
			backgroundColor: 'transparent',
			plotBorderWidth: 0,
			spacingRight: 0,
			margin: [0, 90, 10, 10],
		},

		// "Credit by..." now set don't display
		credits: {
			enabled: false
		},

		// Time range selector
		rangeSelector: {
			// Style of range selector button
			buttons: [{
					type: 'hour',
					count: 1,
					text: '1 h',
				},
				{
					type: 'day',
					count: 1,
					text: '1 d',
				},
				{
					type: 'day',
					count: 3,
					text: '3 d',
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
			selected: 5, // Default active button index (from 1)
			inputDateFormat: '%Y-%m-%d', // Input is the date time selector input
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
				tooltip: { xDateFormat: '%A, %b %e, %H:%M' } // Fix format
			},
			series: {
				dataGrouping: {
					// Best density of each data
					groupPixelWidth: 5,
					// No matter how narrow scale is, just apply the dataGrouping
					forced: true,
					// Only grouped to these units
					units: [
						['minute', [1, 2, 3, 4, 5, 10, 15, 30, 60]]
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
				data: price_withT,
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
				data: r.profit_withT, // Very important!!! data
				lineWidth: 0,
				color: profit_color,
				yAxis: 1, // Binding the index of the objct of yAxis
				zIndex: -1,
				turboThreshold: Infinity,
				tooltip: {
					// valueDecimal: 1,
					pointFormatter: function() {
						var tObj = r.totalProfit_withT;
						var total = tObj[this.x];
						if (total == undefined) return;
						// Ratio compare with the beginning of the visible range
						var cmp_base;
						if (!(cmp_base = tObj[this.series.processedXData[0]]))
							cmp_base = 1;
						var c = ((total - cmp_base) * 2 / cmp_base);
						var t = '<span style="color:' + this.color + '">●</span> Profit (from recent): \
							' + (c > 0 ? '+' : '') + c.toFixed(1) + '%';
						// Total profit
						t += '<p style="text-align:right;margin:0">　&nbsp;Total: <b>\
							' + total.toFixed(1) + ' NTD</b></p>';
						// Gain or Loss
						if (this.y > 0)
							t += '<p style="text-align:right;margin:0;color:' + long_color + '">▲ \
									' + this.y.toFixed() + ' NTD</p>';
						else if (this.y < 0)
							t += '<p style="text-align:right;margin:0;color:' + short_color + '">▼ \
									' + Math.abs(this.y).toFixed() + ' NTD</p>';

						return t;
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
				id: 'vol_chart',
				data: r.position_withT,
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
						lineColor: long_color,
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
						lineColor: short_color,
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
						lineColor: offset_color,
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
 * @param price_withT Price with Time stamp
 * @param act_withT Action with Time stamp
 * @return {profit_withT, totalProfit_withT,position_withT, long_flag,short_flag, offset_flag}
 */
function runActGetProfit(act_withT, price_withT) {
	const TRADE_FEE = 0.6; // Unit is point
	const TAX_RATE = 0.0; // Transfer to TRADE_FEE, actual value is 0.00002
	var POINT = 50; // Value of every point of the future (e.g. 小台指期 = 50)

	var timestampS = [];
	var long_flag = [];
	var short_flag = [];
	var offset_flag = [];
	var profit_withT = [];
	var totalProfit_withT = {}; // Total profit, for profit graph's tooltip data
	var position_withT = [];

	var unreal_profit = 0; // Before offset, the balance binds with future
	var real_profit = 0; // The actual profit after offset
	var hold_price = 0; // Price trader held when long buy or short sell
	var position = 0; // If expect long position > 0, else if short < 0

	// Flag's tooltip data
	function actFlagTooltip(s, t, p, v) {
		var text, title;
		if (s === TraderState.LONG_BUY) {
			text = '<b><span style="color:' + long_color + '">Long ' + plural(v, 'Lot') + '</span></b>';
			title = 'L';
		} else if (s === TraderState.SHORT_SELL) {
			text = '<b><span style="color:' + short_color + '">Short ' + plural(v, 'Lot') + '</span></b>';
			title = 'S';
		} else if (s === TraderState.SHORT_COVER || s === TraderState.LONG_COVER) {
			text = '<b><span style="color:' + offset_color + '">Offset ' + plural(v, 'Lot') + '</span></b>';
			title = 'O';
		}
		text += '　<span style="color:#aaaaaa">( ' + p + 'pt )</span>';
		return { x: t, title: title, text: text };
	}

	function calCost(now_price, position) {
		var tax = Math.round(now_price * POINT * TAX_RATE);
		return (TRADE_FEE + tax) * Math.abs(position);
	}

	function calProfit(now_price, hold_price, position) {
		var p_del = (now_price - hold_price);
		return p_del * POINT * position - calCost(now_price, position);
	}

	// Start calculation
	for (var i = 0; i < price_withT.length; i++) {
		var now_ts = price_withT[i][0];
		timestampS.push(now_ts);
		var this_ymd = formatYMD(now_ts, "-");
		var now_price = price_withT[i][1];
		var act = act_withT[i][1];
		var pre_profit = real_profit + unreal_profit;
		// Super important! calculate unreal profit every step no matter what
		unreal_profit = calProfit(now_price, hold_price, position);

		if (act > 0) { // Buy
			if (act + position > 0) // Long position after buying
			{
				if (position < 0) { // If it used to short position, short cover
					real_profit += calProfit(now_price, hold_price, position);
					offset_flag.push(actFlagTooltip(TraderState.SHORT_COVER, now_ts, now_price, -position));
					act += position;
					position = 0;
				}
				if (position == 0)
					long_flag.push(actFlagTooltip(TraderState.LONG_BUY, now_ts, now_price, act));

				hold_price = now_price;
				position += act;
				unreal_profit = 0;
				real_profit -= calCost(now_price, position);

			} else if (act + position < 0) // Still short position after buying
			{
				hold_price = now_price;
				position += act;
				unreal_profit = 0;
				real_profit -= calCost(now_price, position);

			} else // act + position == 0, short cover after buying
			{
				real_profit += calProfit(now_price, hold_price, position);
				offset_flag.push(actFlagTooltip(TraderState.SHORT_COVER, now_ts, now_price, act));
				position = 0;
			}

		} else if (act < 0) { // Sell
			if (act + position < 0) // Short position after selling
			{
				if (position > 0) { // If it used to long position, long cover
					real_profit += calProfit(now_price, hold_price, position);
					offset_flag.push(actFlagTooltip(TraderState.LONG_COVER, now_ts, now_price, position));
					act += position;
					position = 0;
				}
				if (position == 0)
					short_flag.push(actFlagTooltip(TraderState.SHORT_SELL, now_ts, now_price, -act));

				hold_price = now_price;
				position += act;
				unreal_profit = 0;
				real_profit -= calCost(now_price, position);

			} else if (act + position > 0) // Still long position after selling
			{
				hold_price = now_price;
				position += act;
				unreal_profit = 0;
				real_profit -= calCost(now_price, position);

			} else // act + position == 0, long cover after selling
			{
				real_profit += calProfit(now_price, hold_price, position);
				offset_flag.push(actFlagTooltip(TraderState.LONG_COVER, now_ts, now_price, -act));
				position = 0;
			}
		}
		totalProfit_withT[now_ts] = real_profit + unreal_profit;
		// Blue line, means the total balance
		profit_withT.push({ x: now_ts, y: real_profit + unreal_profit - pre_profit, name: "TTTTT" });
		// Position column
		position_withT.push([now_ts, position]);
	}
	// return
	return {
		profit_withT: profit_withT,
		totalProfit_withT: totalProfit_withT,
		position_withT: position_withT,
		long_flag: long_flag,
		short_flag: short_flag,
		offset_flag: offset_flag
	};
}