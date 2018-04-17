var in_out_thres = [0.3, 0.3, -0.3, -0.3]; // Threshold of in and out: l_in, l_out, s_out, s_in

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
	var ts_vl = zip_list(ts_l, vl_l); // Volume list
	var ts_pl = zip_list(ts_l, pl_l); // Policy list

	// Chart related defination
	const pr_clr = '#60e093';
	const pf_clr = '#2c99e7';
	const vl_clr = '#66ddee';
	const pl_clr = '#ffced3';

	const l_clr = '#ff93a9'; // Long
	const s_clr = '#92ed6a'; // Short
	const out_clr = '#919191'; // Offset

	var border_clr = 'rgba(64,80,95,0.17)';
	var x_cursor_clr = 'rgba(64,80,95,0.87)';

	/*
	 * Economy basic concepts
	 *
	 * Long = 看多, Short = 看空, out = 出場
	 * when it comes to long or short means you `in`, = 進場; so `in` contains long and short
	 * but if you insist `out` can do so, why not indentify long or short in `out`?
	 * you are right; however, it doesn't really matter in later functions, so we don't do so
	 */

	var tick_agg = 1; // How much minute of tick should be aggregate
	var group_unit = [
		['minute', [tick_agg]]
	]; // Same idea above

	// Very important information about timing of every long, short, out and earning
	var l_s_out = find_in_out(ts_pr, ts_pl);
	var ts_pf = l_s_out[3]; // Time stamp and profit

	// Draw chart
	Highcharts.stockChart(targetID, {
		chart: {
			backgroundColor: 'transparent',
			plotBorderColor: border_clr,
			plotBorderWidth: 1,
			spacingRight: 0,
			margin: [20, 90, 10, 20],
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
		// In this order: Price, Profit, Volume, Policy
		yAxis: [
			// Price
			{
				height: '55%',
				gridLineWidth: 0, // no default grid line
				// Label is the nominal or whatever display
				labels: {
					style: { color: pr_clr, },
					x: 50, // x offset in order not to overlap the graph
					zIndex: -1,
				},
				title: {
					align: 'high',
					text: 'Price',
					rotation: 0,
					style: { color: pr_clr },
					x: -10,
				},
			},
			// Profit
			{
				height: '55%',
				gridLineWidth: 0,
				labels: {
					align: 'left',
					style: { color: pf_clr },
				},
				title: {
					align: 'high',
					text: 'Profit',
					rotation: 0,
					style: { color: pf_clr },
					x: -40,
				},
			},
			// Volume
			{
				labels: { enabled: false }, // invisible v ticks.
				top: '55%', // Under Price, and Profit graph's height
				height: '14.5%',
				gridLineWidth: 0,
			},
			// Policy
			{
				top: '70%',
				height: '30%',
				// Tick is like label, but the last tick won't be shown for no reason
				tickPositions: [-1.0, 0.0, 1.0, ''],
				labels: {
					align: 'right',
					style: { color: pl_clr },
					x: 10,
				},
				title: {
					text: 'Tendency',
					style: { color: pl_clr },
					x: 2,
				},
				// If no this limitation, highChart will keep stupid safety padding for overflow
				max: 1.0,
				min: -1.0,
				// These 2 settings is also questionable for keep tick display correctly
				startOnTick: false,
				endOnTick: false,
				opposite: true, // true = display on right side
				offset: 10, // Tick padding
				gridLineWidth: 1,
				// Dash line of thresholds of policy (5 lines, but 2 pairs of dash line laps, so looked like 3 lines)
				plotLines: [
					{ zIndex: 5, value: in_out_thres[0], dashStyle: 'Dash', color: '#fd3278', width: 1 },
					{ zIndex: 5, value: in_out_thres[1], dashStyle: 'Dash', color: '#fd3278', width: 1 },
					{ zIndex: 5, value: 0.0, dashStyle: 'Line', color: '#fd3278', width: 1 },
					{ zIndex: 5, value: in_out_thres[2], dashStyle: 'Dash', color: '#fd3278', width: 1 },
					{ zIndex: 5, value: in_out_thres[3], dashStyle: 'Dash', color: '#fd3278', width: 1 },
				],
			}
		],

		// Each graph type's setting
		plotOptions: {
			flags: {
				tooltip: { headerFormat: '' }, // Don't showing date tooltip below flag
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
		// In this order: Price, Profit, Volume, Policy, long(flag), short(flag), Offset(flag)
		series: [
			// Price
			{
				type: 'line',
				name: 'Price',
				id: 'txf_chart',
				data: ts_pr, // Very important!!! data
				color: pr_clr,
				yAxis: 0, // Binding the index of the objct of yAxis
				zIndex: 10,
				dataGrouping: {
					forced: true, // for tick aggregation setting
					units: group_unit,
				},
			},
			// Profit
			{
				type: 'line',
				name: 'Profit',
				id: 'txf_chart',
				data: ts_pf,
				color: pf_clr,
				yAxis: 1,
				zIndex: 1,
				dataGrouping: {
					forced: true,
					units: group_unit,
				},
				tooltip: {
					pointFormat: '<span style="color:{point.color}">●</span>' +
						'{series.name}: <b>{point.y:.1f}</b><br/>'
				},
			},
			// Volume
			{
				type: 'column',
				name: 'Volume',
				id: 'vol_chart',
				color: vl_clr,
				data: ts_vl,
				yAxis: 2,
				zIndex: -1,
				dataGrouping: {
					approximation: "sum", // How to calculate when aggregation
					forced: true, // Force to follow my rule
					units: group_unit,
				},
			},
			// Policy
			{
				type: 'column',
				name: 'Policy',
				id: 'pl_chart',
				color: pl_clr,
				data: ts_pl,
				yAxis: 3,
				zIndex: 0,
				tooltip: {
					changeDecimals: 4, // Decimals of tooltip
					pointFormat: '{point.y:.4f}',
				},
				dataGrouping: {
					approximation: "close", // Only capture the last value for whole aggregated group
					forced: true,
					units: group_unit,
				},
			},
			// Long
			{
				type: 'flags',
				data: l_s_out[0],
				onSeries: 'txf_chart', // Where to insert this flag (on profit line)
				fillColor: l_clr, // bg-color
				color: l_clr, // border
				// font color
				style: { color: '#ffffff' },
				shape: 'squarepin',
				width: 30,
				y: -50,
				yAxis: 0,
			},
			// Short
			{
				type: 'flags',
				data: l_s_out[1],
				onSeries: 'txf_chart',
				fillColor: s_clr,
				color: s_clr,
				style: { color: '#ffffff' },
				shape: 'squarepin',
				width: 30,
				y: -50,
				yAxis: 0,
			},
			// Offset
			{
				type: 'flags',
				data: l_s_out[2],
				onSeries: 'txf_chart',
				fillColor: out_clr,
				color: out_clr,
				style: { color: '#ffffff' },
				shape: 'squarepin',
				width: 30,
				y: 50,
				yAxis: 0,
			}
		],
	});
}


/*
 * Find the earning of long, short position and offset
 *
 * @param ts_pr Price with Time stamp
 * @param ts_pl Policy with Time stamp
 * @return [long_list, short_list, out_list, ts_earn]
 */
function find_in_out(ts_pr, ts_pl) {
	var long_trade_num = 0; // Count of long position
	var short_trade_num = 0; // Count of short position
	var win_trade_num = 0; // Count of earning money

	const l_clr = '#ff93a9';
	const s_clr = '#92ed6a';
	const out_clr = '#919191';

	const l_in = in_out_thres[0];
	const l_out = in_out_thres[1];
	const s_in = in_out_thres[2];
	const s_out = in_out_thres[3];

	const OUT_BEFORE = 3; // Offset before every day's end 3 tick forward (13:43)
	const TRADE_FEE = 0.6; // unit is point
	const TAX_RATE = 0.0; // transfer to TRADE_FEE, actual value is 0.00002

	/*
	 * Economy basic concepts
	 *
	 * Trade fee is usaully fixed per future, but it still corresponds to future's price per lot
	 * for example, 小台指期's trader fee is $20, 大台指期 is $50, no matter how much lots
	 * pay Trade fee in every transaction (in or out, no matter long or short)
	 * Tax rate is related, it depond on the future's price and the volumn you trader
	 * but its formula is the same accross every future
	 */

	const POS_UNIT = 1; // Constraint AI trade 1 lot each time
	const POINT = 1; // Value of every point of the future (e.g. 小台指期 = 50)

	var long_list = [];
	var short_list = [];
	var out_list = [];
	var ts_list = [];
	var earn_list = [];

	var unreal_earn = 0; // Before out, the balance binds with future
	var real_earn = 0; // The actual earning after out
	var in_price = 0; // average price when long or short
	var in_pos = 0; // If expect long in_pos = 1, else if short = -1

	// Detailed in out information list UI
	function create_act_rows(act_type, ts, price, act_msg, profit, total_profit) {
		// act_type in [act_long, act_shot, act_out]
		var date_time = formatYMD(ts, '-') + ' ' + formatTime(ts, ':');
		var profit_type = '';

		// Calculate Trade Statics
		if (act_type == 'act_long') {
			long_trade_num += 1
		} else if (act_type == 'act_short') {
			short_trade_num += 1
		} else {
			if (profit > 0) {
				profit_type = 'profit';
				win_trade_num += 1
			} else if (profit < 0) {
				profit_type = 'loss';
			}
		}
		var act_row =
			'<table class="act_row ' + act_type + '">' +
			'<tr class="time_tr">  <td>Time</td><td>' + date_time + '</td></tr>' +
			'<tr class="price_tr"> <td>Price</td><td>' + price + '</td></tr>' +
			'<tr class="act_tr">   <td>Action</td><td>' + act_msg + '</td></tr>' +
			'<tr class="profit_tr ' + profit_type + '"> <td>Profit</td><td>' + profit + '</td></tr>' +
			'<tr class="total_tr"> <td>Balance</td><td>' + Math.round(total_profit * 10) / 10 + '</td></tr>' +
			'</table>';
		return act_row;
	}

	// Flag's tooltip data
	function create_act_dict(ls_type, now_ts, now_price, act_pos) {
		if (ls_type == 'long') {
			var ls_msg = '<span style="color:' + l_clr + '">Long</span><br>';
			var act = 'Long';
		} else if (ls_type == 'short') {
			var ls_msg = '<span style="color:' + s_clr + '">Short</span><br>';
			var act = 'Short';
		} else {
			var ls_msg = '<span style="color:' + out_clr + '">Offset</span><br>';
			var act = 'Out';
		}
		var hhmm = formatTime(now_ts, ":");
		var act_msg = ls_msg + 'Time ' + hhmm + '<br>Price ' + now_price + '<br>Volume ' + act_pos;
		// var in_dt = ts2dt(now_ts);
		return { x: now_ts, title: act, text: act_msg };
	}

	function cal_cost(now_price, in_pos) {
		var tax = Math.round(now_price * POINT * TAX_RATE);
		return (TRADE_FEE + tax) * Math.abs(in_pos);
	}

	function cal_earn(now_price, in_price, in_pos) {
		var p_del = (now_price - in_price);
		return p_del * POINT * in_pos - cal_cost(now_price, in_pos);
	}

	var act_list = $('#act_list');
	act_list.html('');


	// Start calculation
	for (var i = 0; i < ts_pr.length; i++) {
		var now_ts = ts_pr[i][0];
		ts_list.push(now_ts);
		var this_ymd = formatYMD(now_ts, "-");
		var next_n_ymd = null;
		if (i + OUT_BEFORE < ts_pr.length) // OUT_BEFORE, check further ticks from back
			next_n_ymd = formatYMD(ts_pr[i + OUT_BEFORE][0], "-");
		var now_price = ts_pr[i][1];
		var pl = ts_pl[i][1];

		// Super important! calculate unreal earn every step no matter what
		unreal_earn = cal_earn(now_price, in_price, in_pos);

		// Super important! check if it needs forced out
		if (this_ymd != next_n_ymd || (i + OUT_BEFORE) >= parseInt(ts_pr.length)) {
			if (in_pos != 0) { // Out if it had in
				// Forced out
				var act_pos = 1 * POS_UNIT;
				out_list.push(create_act_dict('out', now_ts, now_price, act_pos)); // Out flag tooltip
				// act earn is how much it earn in this action
				var act_earn = cal_earn(now_price, in_price, in_pos);
				// Transfer unreal earn to real earn
				real_earn += act_earn;
				var act_msg = (in_pos > 0) ? 'Long Covering ' + Math.abs(in_pos) + ' Lot' : 'Short Covering ' + Math.abs(in_pos) + ' Lot';
				act_list.prepend(create_act_rows('act_out', now_ts, now_price, act_msg, act_earn, real_earn));
				unreal_earn = 0;
				in_pos = 0;
			}
		} else { // if no need forced out
			if (pl > l_in) { // Long position
				if (in_pos <= 0) {
					var act_pos = 1 * POS_UNIT;
					if (in_pos < 0) { // If it used to short position
						// Short covering
						act_pos += 1 * POS_UNIT;
						var act_earn = cal_earn(now_price, in_price, in_pos);
						real_earn += act_earn;
						var act_msg = 'Short Covering ' + Math.abs(in_pos) + ' Lot';
						act_list.prepend(create_act_rows('act_out', now_ts, now_price, act_msg, act_earn, real_earn));
					}
					long_list.push(create_act_dict('long', now_ts, now_price, act_pos));

					in_price = now_price;
					in_pos = 1 * POS_UNIT;
					unreal_earn = 0;
					var act_earn = -cal_cost(now_price, in_pos);
					real_earn += act_earn;
					var act_msg = 'Long ' + Math.abs(in_pos) + ' Lot';
					act_list.prepend(create_act_rows('act_long', now_ts, now_price, act_msg, act_earn, real_earn));
				}
			} else if (pl < s_in) { // Short position
				if (in_pos >= 0) { // If it used to long position
					// Long covering
					var act_pos = 1 * POS_UNIT;
					if (in_pos > 0) {
						act_pos += 1 * POS_UNIT;

						var act_earn = cal_earn(now_price, in_price, in_pos);
						real_earn += act_earn;
						var act_msg = 'Long Covering ' + Math.abs(in_pos) + ' Lot';
						act_list.prepend(create_act_rows('act_out', now_ts, now_price, act_msg, act_earn, real_earn));
					}
					short_list.push(create_act_dict('short', now_ts, now_price, act_pos));

					in_price = now_price;
					in_pos = -1 * POS_UNIT;
					unreal_earn = 0;
					var act_earn = -cal_cost(now_price, in_pos);
					real_earn += act_earn;
					var act_msg = 'Short ' + Math.abs(in_pos) + ' Lot';
					act_list.prepend(create_act_rows('act_short', now_ts, now_price, act_msg, act_earn, real_earn));
				}
			} else { // If policy = -0.3 ~ 0.3
				// Then if there is any position, definately offset
				if (in_pos > 0 && l_out >= pl || in_pos < 0 && s_out <= pl) {
					var act_earn = cal_earn(now_price, in_price, in_pos);
					var act_pos = 1 * POS_UNIT;
					out_list.push(create_act_dict('out', now_ts, now_price, act_pos));
					real_earn += act_earn;
					var act_msg = (in_pos > 0) ? 'Long Covering ' + Math.abs(in_pos) + ' Lot' : 'Short Covering ' + Math.abs(in_pos) + ' Lot';
					act_list.prepend(create_act_rows('act_out', now_ts, now_price, act_msg, act_earn, real_earn));
					unreal_earn = 0;
					in_pos = 0;
				}
			}
		}
		// Blue line, means the total balance
		earn_list.push(real_earn + unreal_earn);
	}
	// Statistic UI
	var profit_value = earn_list[earn_list.length - 1];
	var total_trade_num = long_trade_num + short_trade_num;
	var s = $('#stat_div');
	s.find('#profit_td').find('.state_value').text(round(profit_value, 1));
	s.find('#mdd_td').find('.state_value').text(round(Math.min.apply(Math, earn_list), 1));
	s.find('#trade_num_td').find('.state_value').text(total_trade_num);
	s.find('#avg_pl_td').find('.state_value').text(round(profit_value / total_trade_num, 1));
	s.find('#win_rate_td').find('.state_value').text(round(win_trade_num / total_trade_num * 100, 1) + '%');
	s.find('#long_rate_td').find('.state_value').text(round(long_trade_num / total_trade_num * 100, 1) + '%');
	// return
	var ts_earn = zip_list(ts_list, earn_list);
	return [long_list, short_list, out_list, ts_earn];
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
	dt_offset = offset * 60 * 1000;
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
	dt_offset = offset * 60 * 1000;
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