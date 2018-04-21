'use strict'

const TraderState = {
	LONG_COVER: -3,
	SHORT_IN: -2,
	SELL: -1,
	STILL: 0,
	BUY: 1,
	LONG_IN: 2,
	SHORT_COVER: 3,
};

// Color
const pr_clr = '#ffc107';
const pf_clr = '#099999';

const l_clr = '#28A745'; // Long
const s_clr = '#DC3545'; // Short
const o_clr = '#6C757D'; // Offset

const x_cursor_clr = '#099999';

// @param targetID Id selector of which would like to be contain chart
function drawChart(targetID) {
	// Prepare data
	// dt_l & tm_l to ts_l for plot.
	var ts_l = []; // TimeStamp list (combine date list and time list)
	// Combine date list and time list
	for (var idx = 0; idx < dt_l.length; idx++)
		ts_l.push(y4m2d2_hhmmss_2ts(dt_l[idx], tm_l[idx]));
	// Zip each 3 data list with time stamp list (because stock chart's x axis is time)
	var ts_pr = zip_list(ts_l, pr_l); // Price list
	var ts_act = zip_list(ts_l, act_l); // Action(Buy/Sell) list

	/*
	 * Economy basic concepts
	 *
	 * Long = 看多, Short = 看空, offset = 出場
	 * when it comes to long or short means you `in`, = 進場; so `in` contains long and short
	 * but if you insist `offset` can do so, why not indentify long or short in `offset`?
	 * you are right; however, it doesn't really matter in later functions, so we don't do so
	 */

	// Very important! Information aboffset timing of every long, short, offset and profit
	var actResult = runActGetProfit(ts_act, ts_pr, 'MXFC8');

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

		// Define every chunck's y axis information
		// In this order: Price, Profit, Volume
		yAxis: [
			// Price
			{
				height: '85%',
				gridLineWidth: 0, // no default grid line
				// Label is the nominal or whatever display
				labels: {
					format: ' {value:.0f}',
					style: { color: pr_clr },
					zIndex: -1,
					x: 38,
					y: 3,
				},
				title: {
					align: 'high',
					text: 'Price',
					rotation: 0,
					style: { color: pr_clr },
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
					style: { color: pf_clr },
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
					style: { color: pf_clr },
					x: 8,
					y: 2,
				},
			},
			// Volume
			{
				//labels: { enabled: false }, // invisible v ticks.
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
				onSeries: 'txf_chart', // Where to insert this flag (on profit line)
				yAxis: 0,
				style: { color: '#ffffff' }, // font color
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
			crosshairs: { color: Highcharts.Color(x_cursor_clr).setOpacity(0.4).get('rgba') }, // x line
			borderWidth: 0,
			useHTML: true,
		},

		// Every object corresponding to yAzis settings
		// In this order: Price, Profit, Volume, long(flag), short(flag), Offset(flag)
		series: [
			// Price
			{
				type: 'line',
				name: 'Price',
				id: 'txf_chart',
				data: ts_pr,
				color: Highcharts.Color(pr_clr).setOpacity(0.5).get('rgba'),
				yAxis: 0,
				zIndex: -1,
				tooltip: {
					pointFormat: '<span style="color:' + pr_clr + '">●</span>\
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
				id: 'txf_chart',
				data: actResult[0], // Very important!!! data
				lineWidth: 0,
				color: pf_clr,
				yAxis: 1, // Binding the index of the objct of yAxis
				zIndex: -1,
				turboThreshold: Infinity,
				tooltip: {
					// valueDecimal: 1,
					pointFormatter: function() {
						var tObj = actResult[1];
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
							t += '<p style="text-align:right;margin:0;color:' + l_clr + '">▲ \
									' + this.y.toFixed() + ' NTD</p>';
						else if (this.y < 0)
							t += '<p style="text-align:right;margin:0;color:' + s_clr + '">▼ \
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
							[0, Highcharts.Color(pf_clr).setOpacity(1).get('rgba')],
							[1, Highcharts.Color(pf_clr).setOpacity(0.1).get('rgba')]
						]
					}
				}],

			},
			// Volume
			{
				type: 'column',
				name: 'Volume',
				id: 'vol_chart',
				data: actResult[2],
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
					color: s_clr
				}, {
					// >= 0 && < 0.1 (that is 0)
					value: 0.1,
					color: o_clr
				}, {
					// >= 0.1
					color: l_clr
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
				data: actResult[3],
				color: Highcharts.Color(l_clr).setOpacity(0.12).get('rgba'),
				fillColor: Highcharts.Color(l_clr).setOpacity(0.12).get('rgba'),
				y: -38,
				states: {
					hover: {
						lineColor: l_clr,
						fillColor: l_clr,
					}
				}
			},
			// Short flag
			{
				type: 'flags',
				data: actResult[4],
				color: Highcharts.Color(s_clr).setOpacity(0.1).get('rgba'),
				fillColor: Highcharts.Color(s_clr).setOpacity(0.1).get('rgba'),
				y: -25,
				states: {
					hover: {
						lineColor: s_clr,
						fillColor: s_clr,
					}
				}
			},
			// Offset flag
			{
				type: 'flags',
				data: actResult[5],
				color: Highcharts.Color(o_clr).setOpacity(0.13).get('rgba'),
				fillColor: Highcharts.Color(o_clr).setOpacity(0.13).get('rgba'),
				y: 15,
				states: {
					hover: {
						lineColor: o_clr,
						fillColor: o_clr,
					}
				}
			}
		],
	});
}


/*
 * Find the profit of long, short position and offset
 *
 * @param ts_pr Price with Time stamp
 * @param ts_act Action with Time stamp
 * @return [ts_pf, ts_vl, ts_Lflag,ts_Sflag, ts_Oflag]
 */
function runActGetProfit(ts_act, ts_pr, _actual) {
	var long_trade_num = 0; // Count of long position
	var short_trade_num = 0; // Count of short position
	var win_trade_num = 0; // Count of profit money

	const TRADE_FEE = 0.6; // Unit is point
	const TAX_RATE = 0.0; // Transfer to TRADE_FEE, actual value is 0.00002
	/*
	 * Economy basic concepts
	 *
	 * Trade fee is usaully fixed per future, but it still corresponds to future's price per lot
	 * for example, 小台指期's trader fee is $20, 大台指期 is $50, no matter how much lots
	 * pay Trade fee in every transaction (in or offset, no matter long or short)
	 * Tax rate is related, it depond on the future's price and the volumn you trader
	 * but its formula is the same accross every future
	 */

	var POINT = 1; // Value of every point of the future (e.g. 小台指期 = 50)
	if (_actual == "MXFC8")
		POINT = 50;

	var ts_list = [];
	var ts_Lflag = [];
	var ts_Sflag = [];
	var ts_Oflag = [];
	var ts_pf = [];
	var ts_tt = {}; // Total profit, for profit graph's tooltip data
	var ts_vl = [];

	var unreal_pf = 0; // Before offset, the balance binds with future
	var real_pf = 0; // The actual profit after offset
	var in_price = 0; // average price when long or short
	var in_pos = 0; // If expect long in_pos > 0, else if short < 0

	// Flag's tooltip data
	function create_act_dict(s, t, p, v) {
		var ls_msg, act;
		if (s === TraderState.LONG_IN) {
			ls_msg = '<b><span style="color:' + l_clr + '">Long ' + plural(v, 'Lot') + '</span></b>';
			act = 'L';
		} else if (s === TraderState.SHORT_IN) {
			ls_msg = '<b><span style="color:' + s_clr + '">Short ' + plural(v, 'Lot') + '</span></b>';
			act = 'S';
		} else if (s === TraderState.SHORT_COVER || s === TraderState.LONG_COVER) {
			ls_msg = '<b><span style="color:' + o_clr + '">Offset ' + plural(v, 'Lot') + '</span></b>';
			act = 'O';
		}
		var act_msg = ls_msg + '　<span style="color:#aaaaaa">( ' + p + 'pt )</span>';
		return { x: t, title: act, text: act_msg };
	}

	function cal_cost(now_price, in_pos) {
		var tax = Math.round(now_price * POINT * TAX_RATE);
		return (TRADE_FEE + tax) * Math.abs(in_pos);
	}

	function cal_pf(now_price, in_price, in_pos) {
		var p_del = (now_price - in_price);
		return p_del * POINT * in_pos - cal_cost(now_price, in_pos);
	}

	// Start calculation
	for (var i = 0; i < ts_pr.length; i++) {
		var now_ts = ts_pr[i][0];
		ts_list.push(now_ts);
		var this_ymd = formatYMD(now_ts, "-");
		var now_price = ts_pr[i][1];
		var act = ts_act[i][1];
		var pre_pf = real_pf + unreal_pf;
		// Super important! calculate unreal profit every step no matter what
		unreal_pf = cal_pf(now_price, in_price, in_pos);

		if (act > 0) { // Buy
			if (act + in_pos > 0) // Long position after buying
			{
				if (in_pos < 0) { // If it used to short position, short cover
					real_pf += cal_pf(now_price, in_price, in_pos);
					ts_Oflag.push(create_act_dict(TraderState.SHORT_COVER, now_ts, now_price, -in_pos));
					act += in_pos;
					in_pos = 0;
				}
				if (in_pos == 0)
					ts_Lflag.push(create_act_dict(TraderState.LONG_IN, now_ts, now_price, act));

				in_price = now_price;
				in_pos += act;
				unreal_pf = 0;
				real_pf -= cal_cost(now_price, in_pos);

			} else if (act + in_pos < 0) // Still short position after buying
			{
				in_price = now_price;
				in_pos += act;
				unreal_pf = 0;
				real_pf -= cal_cost(now_price, in_pos);

			} else // act + in_pos == 0, short cover after buying
			{
				real_pf += cal_pf(now_price, in_price, in_pos);
				ts_Oflag.push(create_act_dict(TraderState.SHORT_COVER, now_ts, now_price, act));
				in_pos = 0;
			}

		} else if (act < 0) { // Sell
			if (act + in_pos < 0) // Short position after selling
			{
				if (in_pos > 0) { // If it used to long position, long cover
					real_pf += cal_pf(now_price, in_price, in_pos);
					ts_Oflag.push(create_act_dict(TraderState.LONG_COVER, now_ts, now_price, in_pos));
					act += in_pos;
					in_pos = 0;
				}
				if (in_pos == 0)
					ts_Sflag.push(create_act_dict(TraderState.SHORT_IN, now_ts, now_price, -act));

				in_price = now_price;
				in_pos += act;
				unreal_pf = 0;
				real_pf -= cal_cost(now_price, in_pos);

			} else if (act + in_pos > 0) // Still long position after selling
			{
				in_price = now_price;
				in_pos += act;
				unreal_pf = 0;
				real_pf -= cal_cost(now_price, in_pos);

			} else // act + in_pos == 0, long cover after selling
			{
				real_pf += cal_pf(now_price, in_price, in_pos);
				ts_Oflag.push(create_act_dict(TraderState.LONG_COVER, now_ts, now_price, -act));
				in_pos = 0;
			}
		}
		ts_tt[now_ts] = real_pf + unreal_pf;
		// Blue line, means the total balance
		ts_pf.push({ x: now_ts, y: real_pf + unreal_pf - pre_pf, name: "TTTTT" });
		// Volume column
		ts_vl.push([now_ts, in_pos]);
	}
	// return
	return [ts_pf, ts_tt, ts_vl, ts_Lflag, ts_Sflag, ts_Oflag];
}