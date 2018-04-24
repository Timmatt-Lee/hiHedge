var fs = require('fs')
var basic = require('./src/js/pl/basic.js')

var ts_l = []; // TimeStamp list (combine date list and time list)
// Combine date list and time list
for (var idx = 0; idx < basic.dt_l.length; idx++)
	ts_l.push(y4m2d2_hhmmss_2ts(basic.dt_l[idx], basic.tm_l[idx]));
// Zip each 3 data list with time stamp list (because stock chart's x axis is time)
var ts_pr = zip_list(ts_l, basic.pr_l); // Price list



fs.readdir('src/js/pl/all', (err, files) => {
	var all_act_str = 'var all_act_l=[';
	var all_pl = [];
	var all_pf = [];
	var all_pf2 = [];
	files.forEach(file => {

		var pl_l = require('./src/js/pl/all/' + file);
		// all_pl.push(pl_l)
		// console.log(pl_l);

		var ts_pl = zip_list(ts_l, pl_l); // Policy list
		var r = find_in_offset(ts_pr, ts_pl);
		//var r2 = find_in_offset2(ts_pr, ts_pl);
		//console.log(zip_list(r[1], r2[1]));
		//console.log(r[2], r2[2]);

		// for (var i in r[1]) {
		// 	if (r[1][i] != r2[1][i])
		// 		console.log(i);
		// }

		// for (var i in r[0]) {
		// 	if (r[0][i] == 2)
		// 		console.log(i);
		// }


		all_act_str += '[' + r[0] + '],';
		// all_pf.push(r[2]);
		// all_pf2.push(r2[2]);

		//fs.writeFile('data.js', [r[1][302], r2[1][302]]);

		// fs.writeFile('log/' + file, 'module.exports =' + find_in_offset(ts_pr, ts_pl));



		// fs.readFile('src/js/log/' + file, function(err, data) {
		// 	if (err) throw err;
		//
		// 	console.log(data.toString());
		// });
	});
	// console.log([Math.max(...all_pf), Math.max(...all_pf2)]);
	//console.log(zip_list(all_pf, all_pf2));
	// var c1 = 0,
	// 	c2 = 0
	// for (var i in all_pf) {
	// 	if (all_pf[i] < 0)
	// 		c1++;
	//
	// 	if (all_pf2[i] < 0)
	// 		c2++;
	// }
	//
	// console.log(c1, c2);
	// console.log(Math.max(...all_pf));

	fs.writeFile('all_act.js', all_act_str + ']');

	// var all_pl_str = '';
	// var i = 0,
	// 	j = 0;
	// console.log(all_pl.length, all_pl[i].length);
	// // start transpose to a csv formatTime
	// for (; j < all_pl[i].length; j++) {
	// 	for (; i < all_pl.length; i++) {
	// 		// transpose
	// 		//console.log(i, j);
	// 		all_pl_str += all_pl[i][j] + ',';
	// 	}
	// 	all_pl_str += '\n';
	// 	i = 0;
	// }
	//
	// fs.writeFile('all_pl.csv', all_pl_str);
})

function find_in_offset(ts_pr, ts_pl) {
	var long_trade_num = 0; // Count of long position
	var short_trade_num = 0; // Count of short position
	var win_trade_num = 0; // Count of earning money

	const l_in = 0.3;
	const l_offset = 0.3;
	const s_in = -0.3;
	const s_offset = -0.3;

	const OUT_BEFORE = 3; // Offset before every day's end 3 tick forward (13:43)
	const TRADE_FEE = 0.6; // Unit is point
	const TAX_RATE = 0.0; // Transfer to TRADE_FEE, actual value is 0.00002

	var all_cause_act_pl = []

	//const pos_unit(pl) = 1; // Constraint AI trade 1 lot each time
	function pos_unit(n) {
		if (Math.abs(n) <= 0.9991)
			return (n > 0 ? 1 : -1) * 1;
		else if (Math.abs(n) <= 0.9994)
			return (n > 0 ? 1 : -1) * 2;
		else if (Math.abs(n) <= 0.9998)
			return (n > 0 ? 1 : -1) * 3;
		else if (Math.abs(n) <= 0.9999)
			return (n > 0 ? 1 : -1) * 4;
		else
			return (n > 0 ? 1 : -1) * 5;

	}
	const POINT = 1; // Value of every point of the future (e.g. 小台指期 = 50)

	var long_list = [];
	var short_list = [];
	var o_list = [];
	var ts_list = [];
	var earn_list = [];

	var unreal_earn = 0; // Before offset, the balance binds with future
	var real_earn = 0; // The actual earning after offset
	var in_price = 0; // average price when long or short
	var in_pos = 0; // If expect long in_pos = 1, else if short = -1

	var in_pos_pr = [];


	var LISTTTTTTTTTTT = [];


	function cal_cost(now_price, in_pos) {
		var tax = Math.round(now_price * POINT * TAX_RATE);
		return (TRADE_FEE + tax) * Math.abs(in_pos);
	}

	// function cal_earn(now_price, in_price, in_pos) {
	// 	var p_del = (now_price - in_price);
	// 	return p_del * POINT * in_pos - cal_cost(now_price, in_pos);
	// }

	function cal_earn(now_price) {
		var t = 0;
		for (var i in in_pos_pr)
			t += (now_price - in_pos_pr[i][1]) * POINT * in_pos_pr[i][0] - cal_cost(now_price, in_pos_pr[i][0])
		return t;
	}

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
		unreal_earn = cal_earn(now_price);


		var notPushed = true;

		// Super important! check if it needs forced offset
		if (this_ymd != next_n_ymd || (i + OUT_BEFORE) >= parseInt(ts_pr.length)) {
			if (in_pos != 0) { // Offset if it had in
				// Forced Offset
				notPushed = false;
				LISTTTTTTTTTTT.push(-in_pos);
				// act earn is how much it earn in this action
				// Transfer unreal earn to real earn
				real_earn += cal_earn(now_price);
				unreal_earn = 0;
				in_pos = 0;
				in_pos_pr = [];
			}
		} else {
			if (pl > l_in) {
				if (pos_unit(pl) > in_pos) {

					notPushed = false;
					// Long position

					if (in_pos < 0) { // If it used to short position
						// Short covering
						real_earn += cal_earn(now_price);
						in_pos_pr = [];
						unreal_earn = 0;
						in_pos = 0;
					}

					real_earn -= cal_cost(now_price, pos_unit(pl) - in_pos);
					LISTTTTTTTTTTT.push(pos_unit(pl) - in_pos);

					in_pos_pr.push([pos_unit(pl) - in_pos, now_price]);
					in_pos = pos_unit(pl);

				} else if (pos_unit(pl) < in_pos) {
					notPushed = false;

					real_earn -= cal_cost(now_price, in_pos - pos_unit(pl));
					LISTTTTTTTTTTT.push(pos_unit(pl) - in_pos); // negative

					in_pos_pr.sort((a, b) => a[1] - b[1]);
					for (var j = 0; j < in_pos_pr.length; j++) {
						if (in_pos - pos_unit(pl) < in_pos_pr[j][0]) {
							in_pos = pos_unit(pl);
							in_pos_pr[j][0] -= in_pos - pos_unit(pl)
							real_earn += (now_price - in_pos_pr[j][1]) * POINT * in_pos_pr[j][0];
							break;
						} else {
							in_pos -= in_pos_pr[j][0];
							real_earn += (now_price - in_pos_pr[j][1]) * POINT * in_pos_pr[j][0];
							in_pos_pr.splice(j, 1);
							j--;
							if (in_pos == pos_unit(pl))
								break;
						}
					}
				}
			} else if (pl < s_in) { // Short position
				if (pos_unit(pl) < in_pos) { // need more short

					notPushed = false;
					// Short position

					if (in_pos > 0) { // If it used to long position
						// Long covering
						real_earn += cal_earn(now_price);
						in_pos_pr = [];
						unreal_earn = 0;
						in_pos = 0;
					}

					real_earn -= cal_cost(now_price, pos_unit(pl) - in_pos);
					LISTTTTTTTTTTT.push(pos_unit(pl) - in_pos);

					in_pos_pr.push([pos_unit(pl) - in_pos, now_price]);
					in_pos = pos_unit(pl);

				} else if (pos_unit(pl) > in_pos) {
					notPushed = false;

					real_earn -= cal_cost(now_price, in_pos - pos_unit(pl));
					LISTTTTTTTTTTT.push(pos_unit(pl) - in_pos); // negative

					in_pos_pr.sort((a, b) => b[1] - a[1]);
					for (var j = 0; j < in_pos_pr.length; j++) {
						if (in_pos - pos_unit(pl) > in_pos_pr[j][0]) {
							in_pos = pos_unit(pl);
							in_pos_pr[j][0] += in_pos - pos_unit(pl)
							real_earn += (now_price - in_pos_pr[j][1]) * POINT * in_pos_pr[j][0];
							break;
						} else {
							in_pos -= in_pos_pr[j][0];
							real_earn += (now_price - in_pos_pr[j][1]) * POINT * in_pos_pr[j][0];
							in_pos_pr.splice(j, 1);
							j--;
							if (in_pos == pos_unit(pl))
								break;
						}
					}
				}
			} else { // If policy = -0.3 ~ 0.3
				// Then if there is any position, definately offset
				if (in_pos > 0 && l_offset >= pl || in_pos < 0 && s_offset <= pl) {
					notPushed = false;
					LISTTTTTTTTTTT.push(-in_pos);
					real_earn += cal_earn(now_price);
					unreal_earn = 0;
					in_pos = 0;
					in_pos_pr = [];
				}
			}
		}


		if (notPushed)
			LISTTTTTTTTTTT.push(0);


		// Blue line, means the total balance
		earn_list.push(real_earn + unreal_earn);
	}
	// Statistic UI
	var profit_value = earn_list[earn_list.length - 1];
	var total_trade_num = long_trade_num + short_trade_num;
	// return
	var ts_earn = zip_list(ts_list, earn_list);
	return [LISTTTTTTTTTTT, earn_list, profit_value];
	//return [long_list, short_list, o_list, ts_earn];
}

function find_in_offset2(ts_pr, ts_pl) {
	var long_trade_num = 0; // Count of long position
	var short_trade_num = 0; // Count of short position
	var win_trade_num = 0; // Count of earning money

	const l_in = 0.3;
	const l_offset = 0.3;
	const s_in = -0.3;
	const s_offset = -0.3;

	const OUT_BEFORE = 3; // Offset before every day's end 3 tick forward (13:43)
	const TRADE_FEE = 0.6; // Unit is point
	const TAX_RATE = 0.0; // Transfer to TRADE_FEE, actual value is 0.00002

	const POS_UNIT = 1; // Constraint AI trade 1 lot each time
	const POINT = 1; // Value of every point of the future (e.g. 小台指期 = 50)

	var long_list = [];
	var short_list = [];
	var o_list = [];
	var ts_list = [];
	var earn_list = [];

	var unreal_earn = 0; // Before offset, the balance binds with future
	var real_earn = 0; // The actual earning after offset
	var in_price = 0; // average price when long or short
	var in_pos = 0; // If expect long in_pos = 1, else if short = -1

	var LISTTTTTTTTTTT = [];


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
		var next_n_ymd = null;
		if (i + OUT_BEFORE < ts_pr.length) // OUT_BEFORE, check further ticks from back
			next_n_ymd = formatYMD(ts_pr[i + OUT_BEFORE][0], "-");
		var now_price = ts_pr[i][1];
		var pl = ts_pl[i][1];

		// Super important! calculate unreal earn every step no matter what
		unreal_earn = cal_earn(now_price, in_price, in_pos);


		var notPushed = true;

		// Super important! check if it needs forced offset
		if (this_ymd != next_n_ymd || (i + OUT_BEFORE) >= parseInt(ts_pr.length)) {
			if (in_pos != 0) { // Offset if it had in
				// Forced Offset
				var act_pos = 1 * POS_UNIT;

				notPushed = false;
				LISTTTTTTTTTTT.push(-in_pos);
				// act earn is how much it earn in this action
				var act_earn = cal_earn(now_price, in_price, in_pos);
				// Transfer unreal earn to real earn
				real_earn += act_earn;
				var act_msg = (in_pos > 0) ? 'Long Covering ' + Math.abs(in_pos) + ' Lot' : 'Short Covering ' + Math.abs(in_pos) + ' Lot';
				unreal_earn = 0;
				in_pos = 0;
			}
		} else {
			if (pl > l_in) {
				if (in_pos <= 0) { // if no need forced offset
					// Long position
					var act_pos = 1 * POS_UNIT;
					if (in_pos < 0) { // If it used to short position
						// Short covering
						act_pos += 1 * POS_UNIT;
						var act_earn = cal_earn(now_price, in_price, in_pos);
						real_earn += act_earn;
						var act_msg = 'Short Covering ' + Math.abs(in_pos) + ' Lot';
					}

					notPushed = false;
					if (in_pos < 0)
						LISTTTTTTTTTTT.push(2);
					else
						LISTTTTTTTTTTT.push(1);

					in_price = now_price;
					in_pos = 1 * POS_UNIT;
					unreal_earn = 0;
					var act_earn = -cal_cost(now_price, in_pos);
					real_earn += act_earn;
					var act_msg = 'Long ' + Math.abs(in_pos) + ' Lot';
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
					}

					notPushed = false;
					if (in_pos > 0)
						LISTTTTTTTTTTT.push(-2);
					else
						LISTTTTTTTTTTT.push(-1);

					in_price = now_price;
					in_pos = -1 * POS_UNIT;
					unreal_earn = 0;
					var act_earn = -cal_cost(now_price, in_pos);
					real_earn += act_earn;
					var act_msg = 'Short ' + Math.abs(in_pos) + ' Lot';
				}
			} else { // If policy = -0.3 ~ 0.3
				// Then if there is any position, definately offset
				if (in_pos > 0 && l_offset >= pl || in_pos < 0 && s_offset <= pl) {
					LISTTTTTTTTTTT.push(-in_pos);
					var act_earn = cal_earn(now_price, in_price, in_pos);
					var act_pos = 1 * POS_UNIT;

					real_earn += act_earn;
					var act_msg = (in_pos > 0) ? 'Long Covering ' + Math.abs(in_pos) + ' Lot' : 'Short Covering ' + Math.abs(in_pos) + ' Lot';
					unreal_earn = 0;
					in_pos = 0;
					notPushed = false;

				}
			}
		}

		if (notPushed)
			LISTTTTTTTTTTT.push(0);

		// Blue line, means the total balance
		earn_list.push(real_earn + unreal_earn);
	}
	// Statistic UI
	var profit_value = earn_list[earn_list.length - 1];
	var total_trade_num = long_trade_num + short_trade_num;
	// return
	var ts_earn = zip_list(ts_list, earn_list);
	return [LISTTTTTTTTTTT, earn_list, profit_value];
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