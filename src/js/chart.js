'use strict'

var TraderState = {
	LONG_COVER: -3,
	SHORT_IN: -2,
	SELL: -1,
	STILL: 0,
	BUY: 1,
	LONG_IN: 2,
	SHORT_COVER: 3,
};

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

	// Chart related defination
	const pr_clr = 'rgba(108, 117, 125, 0.4)';
	const pf_clr = '#099999';

	const l_clr = '#28a745'; // Long
	const s_clr = '#dc3545'; // Short
	const o_clr = '#6c757d'; // Offset

	var x_cursor_clr = 'rgba(9, 153, 153, 0.2)';

	/*
	 * Economy basic concepts
	 *
	 * Long = 看多, Short = 看空, offset = 出場
	 * when it comes to long or short means you `in`, = 進場; so `in` contains long and short
	 * but if you insist `offset` can do so, why not indentify long or short in `offset`?
	 * you are right; however, it doesn't really matter in later functions, so we don't do so
	 */

	var tick_agg = 1; // How much minute of tick should be aggregate
	var group_unit = [
		['minute', [tick_agg]]
	]; // Same idea above

	// Very important information aboffset timing of every long, short, offset and earning
	var actResult = runActEarn(ts_pr, ts_act, 'MXFC8');
	var ts_pf = actResult[3]; // Time stamp and profit

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
					text: '1 hour',
				},
				{
					// There is only 5 hours for trading each day
					type: 'hour',
					count: 5,
					text: '1 day',
				},
				{
					type: 'all',
					// count: 3,
					text: '5 day',
				},
			],
			buttonTheme: {
				width: 38
			},
			selected: 1, // Default active button index (from 1)
			inputDateFormat: '%Y-%m-%d', // Input is the date time selector input
			// enabled: false,
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
				},
				title: {
					align: 'high',
					text: 'Price',
					rotation: 0,
					style: { color: pr_clr },
					x: -13,
				},
			},
			// Profit
			{
				height: '85%',
				gridLineWidth: 1,
				labels: {
					align: "right",
					style: { color: pf_clr },
					x: 28
				},
				title: {
					align: 'high',
					text: 'Profit',
					rotation: 0,
					style: { color: pf_clr },
					x: -15,
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
			},
		],

		// Each graph type's setting
		plotOptions: {
			flags: {
				states: {
					hover: { enabled: false }
				}

			},
		},

		tooltip: {
			split: true,
			crosshairs: // x cursor
			{
				color: x_cursor_clr,
			},
			headerFormat: '{point.key}',
			// tooltip style
			useHTML: true,
			borderWidth: 0,
			shadow: false,
			style: { padding: 0, }
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
				color: pr_clr,
				yAxis: 0,
				zIndex: -1,
				tooltip: { valueDecimals: 0 },
			},
			// Profit
			{
				type: 'areaspline',
				name: 'Profit',
				id: 'txf_chart',
				data: ts_pf, // Very important!!! data
				lineWidth: 0,
				color: pf_clr,
				yAxis: 1, // Binding the index of the objct of yAxis
				zIndex: -1,
				tooltip: { valueDecimals: 1 },
				// Gradient color
				zones: [{
					// < 0
					value: 0,
					fillColor: {
						linearGradient: { // y1 & y2 means gradient-start-position & gradient-end-position
							x1: 0,
							y1: 1,
							x2: 0,
							y2: 0.2
						},
						stops: [
							// Gradient-start-color and gradient-end-color
							[0, 'rgba(0, 0, 0, 0.3)'],
							[1, 'rgba(9, 153, 153, 0.5)']
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
							[0, 'rgba(9, 153, 153, 1)'],
							[1, 'rgba(9, 153, 153, 0.1)']
						]
					}
				}],

			},
			// Volume
			{
				type: 'column',
				name: 'Volume',
				id: 'vol_chart',
				data: actResult[4],
				yAxis: 2,
				zIndex: -2,
				// Always show the region within max & min
				getExtremesFromAll: true,
				// Don't render marginal pixel, for better migrate in large scale
				crisp: false,
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
					approximation: "close", // How to calculate when aggregation
				},
				tooltip: {
					pointFormat: '<span style="color:{point.color}">●</span> {point.y} Lot',
				},
			},
			// Long
			{
				type: 'flags',
				data: actResult[0],
				onSeries: 'txf_chart', // Where to insert this flag (on profit line)
				fillColor: l_clr, // bg-color
				color: l_clr, // border
				// font color
				style: { color: '#ffffff' },
				shape: 'circlepin',
				width: 15,
				y: -30,
				yAxis: 0,
			},
			// Short
			{
				type: 'flags',
				data: actResult[1],
				onSeries: 'txf_chart',
				fillColor: s_clr,
				color: s_clr,
				style: { color: '#ffffff' },
				shape: 'circlepin',
				width: 15,
				y: -30,
				yAxis: 0,
			},
			// Offset
			{
				type: 'flags',
				data: actResult[2],
				onSeries: 'txf_chart',
				fillColor: o_clr,
				color: o_clr,
				style: { color: '#ffffff' },
				shape: 'circlepin',
				width: 15,
				y: 10,
				yAxis: 0,
			}
		],
	});
}


/*
 * Find the earning of long, short position and offset
 *
 * @param ts_pr Price with Time stamp
 * @param ts_act Action with Time stamp
 * @return [long_list, short_list, o_list, ts_earn, ts_vl]
 */
function runActEarn(ts_pr, ts_act, _actual) {
	var long_trade_num = 0; // Count of long position
	var short_trade_num = 0; // Count of short position
	var win_trade_num = 0; // Count of earning money

	const l_clr = '#28a745'; // Long
	const s_clr = '#dc3545'; // Short
	const o_clr = '#6c757d'; // Offset

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
	var long_list = [];
	var short_list = [];
	var o_list = [];
	var ts_earn = [];
	var ts_vl = [];

	var unreal_earn = 0; // Before offset, the balance binds with future
	var real_earn = 0; // The actual earning after offset
	var in_price = 0; // average price when long or short
	var in_pos = 0; // If expect long in_pos > 0, else if short < 0

	// Flag's tooltip data
	function create_act_dict(s, t, p, v) {
		var ls_msg, act;
		if (s === TraderState.LONG_IN) {
			ls_msg = '<span style="color:' + l_clr + '">Long</span><br>';
			act = 'L';
		} else if (s === TraderState.SHORT_IN) {
			ls_msg = '<span style="color:' + s_clr + '">Short</span><br>';
			act = 'S';
		} else if (s === TraderState.SHORT_COVER || s === TraderState.LONG_COVER) {
			ls_msg = '<span style="color:' + o_clr + '">Offset</span><br>';
			act = 'O';
		}
		var hhmm = formatTime(t, ":");
		var act_msg = ls_msg + 'Price ' + p + '<br>Volume ' + v;
		return { x: t, title: act, text: act_msg };
	}

	function cal_cost(now_price, in_pos) {
		var tax = Math.round(now_price * POINT * TAX_RATE);
		return (TRADE_FEE + tax) * Math.abs(in_pos);
	}

	function cal_earn(now_price, in_price, in_pos) {
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

		// Super important! calculate unreal earn every step no matter what
		unreal_earn = cal_earn(now_price, in_price, in_pos);

		if (act > 0) { // Buy
			if (act + in_pos > 0) // Long position after buying
			{
				if (in_pos < 0) { // If it used to short position, short cover
					real_earn += cal_earn(now_price, in_price, in_pos);
					o_list.push(create_act_dict(TraderState.SHORT_COVER, now_ts, now_price, -in_pos));
					act += in_pos;
					in_pos = 0;
				}
				if (in_pos == 0)
					long_list.push(create_act_dict(TraderState.LONG_IN, now_ts, now_price, act));

				in_price = now_price;
				in_pos += act;
				unreal_earn = 0;
				real_earn -= cal_cost(now_price, in_pos);

			} else if (act + in_pos < 0) // Still short position after buying
			{
				in_price = now_price;
				in_pos += act;
				unreal_earn = 0;
				real_earn -= cal_cost(now_price, in_pos);

			} else // act + in_pos == 0, short cover after buying
			{
				real_earn += cal_earn(now_price, in_price, in_pos);
				o_list.push(create_act_dict(TraderState.SHORT_COVER, now_ts, now_price, act));
				in_pos = 0;
			}

		} else if (act < 0) { // Sell
			if (act + in_pos < 0) // Short position after selling
			{
				if (in_pos > 0) { // If it used to long position, long cover
					real_earn += cal_earn(now_price, in_price, in_pos);
					o_list.push(create_act_dict(TraderState.LONG_COVER, now_ts, now_price, in_pos));
					act += in_pos;
					in_pos = 0;
				}
				if (in_pos == 0)
					short_list.push(create_act_dict(TraderState.SHORT_IN, now_ts, now_price, -act));

				in_price = now_price;
				in_pos += act;
				unreal_earn = 0;
				real_earn -= cal_cost(now_price, in_pos);

			} else if (act + in_pos > 0) // Still long position after selling
			{
				in_price = now_price;
				in_pos += act;
				unreal_earn = 0;
				real_earn -= cal_cost(now_price, in_pos);

			} else // act + in_pos == 0, long cover after selling
			{
				real_earn += cal_earn(now_price, in_price, in_pos);
				o_list.push(create_act_dict(TraderState.LONG_COVER, now_ts, now_price, -act));
				in_pos = 0;
			}
		}

		// Blue line, means the total balance
		ts_earn.push([now_ts, real_earn + unreal_earn]);
		// Volume column
		ts_vl.push([now_ts, in_pos]);
	}
	// return
	return [long_list, short_list, o_list, ts_earn, ts_vl];
}

function zip_list(l1, l2) {
	var l12 = l1.map(function(e, i) {
		return [e, l2[i]]
	});
	return l12;
}

function y4m2d2_hhmmss_2ts(y4m2d2, hhmmss) {
	var tz = '+00:00'; // set 00:00 or system will change ts by local timezone.
	var year = y4m2d2.slice(0, 4);
	var month = y4m2d2.slice(4, 6);
	var day = y4m2d2.slice(6, 8);

	var hr = hhmmss.slice(0, 2);
	var mn = hhmmss.slice(2, 4);
	var sc = hhmmss.slice(4, 6);

	var date_str = year + "-" + month + "-" + day + "T" + hr + ":" + mn + ":" + sc + tz;
	var dt = new Date(date_str);
	return dt.getTime();
}


function formatYMD(timestamp_in_ms, slicer) {
	var offset = new Date().getTimezoneOffset();
	var dt_offset = offset * 60 * 1000;
	var dt = new Date(timestamp_in_ms + dt_offset);

	var y = dt.getFullYear();
	var m = dt.getMonth() + 1;
	var d = dt.getDate();

	// the above dt.get...() functions return a single digit
	// so I prepend the zero here when needed
	if (m < 10) {
		m = '0' + m;
	}
	if (d < 10) {
		d = '0' + d;
	}
	return y + slicer + m + slicer + d;
}


function formatTime(timestamp_in_ms, slicer) {
	var offset = new Date().getTimezoneOffset();
	var dt_offset = offset * 60 * 1000;
	var dt = new Date(timestamp_in_ms + dt_offset);

	var hours = dt.getHours();
	var minutes = dt.getMinutes();
	// var seconds = dt.getSeconds();

	// the above dt.get...() functions return a single digit
	// so I prepend the zero here when needed
	if (hours < 10)
		hours = '0' + hours;

	if (minutes < 10)
		minutes = '0' + minutes;
	return hours + slicer + minutes;
}

function round(v, deci) {
	var x = Math.pow(10, deci);
	return Math.round(v * x) / x;
}