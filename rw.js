'use strict'

var fs = require('fs')
var basic = require('./src/js/policy/basic.js')

var timestampS = [];
for (var i = 0; i < basic.dateS.length; i++)
	timestampS.push(y4m2d2_hhmmss_2ts(basic.dateS[i], basic.timeS[i]));

fs.readdir('src/js/policy/all', (err, files) => {
	var act_buffer = 'var actS=[';
	var log_str = '';

	// var policyS = require('./src/js/policy/all/1510700394_18187-32768.js');
	// var r = runActGetProfit(timestampS, basic.priceS, policyS);
	// var r2 = runActGetProfit2(zip(timestampS, basic.priceS), zip(timestampS, policyS));
	//
	// for (var i in r.profitS) {
	// 	//log_str += (formatYMD(timestampS[i]) + ' ' + formatTime(timestampS[i]) + ' ' + policyS[i].toFixed(4) + ' ' + basic.priceS[i].toFixed() + ' ' + r.actS[i] + ' ' + r.profitS[i].toFixed(1) + ' ' + r2.actS[i] + ' ' + r2.profitS[i].toFixed(1));
	// 	log_str += (formatYMD(timestampS[i]) + ' ' + formatTime(timestampS[i]) + ' ' + basic.priceS[i] + ' ' + policyS[i].toFixed(4) + ' ' + r.actS[i] + ' ' + r.positionS[i] + ' ' + r.profitS[i].toFixed(1) + ' ' + r.totalProfitS[i].toFixed(1));
	// 	// if (r.actS[i] != r2.actS[i])
	// 	// 	log_str += ('*************');
	// 	// if (r.profitS[i] != r2.profitS[i])
	// 	// 	log_str += ('--------------');
	// 	log_str += '\n'
	// }
	// fs.writeFile('log', log_str + r.totalProfit + ' ' + r2.totalProfit);
	// // console.log(zip(r.profitS.slice(0, 200), r2.profitS.slice(0, 200)));
	//
	// fs.writeFile('./src/js/act/acts.js', 'var actS=[[' + r.actS + ']]');
	//
	// return;

	var all_policy = [];
	var all_totalProfit = [];
	var all_totalProfit2 = [];


	files.forEach(file => {

		var policyS = require('./src/js/policy/all/' + file);
		// all_policy.push(policyS)
		// console.log(policyS);

		var r = runActGetProfit(timestampS, basic.priceS, policyS);
		var r2 = runActGetProfit2(zip(timestampS, basic.priceS), zip(timestampS, policyS));
		// console.log(zip(r[1], r2[1]));
		//console.log(r[2], r2[2]);

		// for (var i in r[1]) {
		// 	if (r[1][i] != r2[1][i])
		// 		console.log(i);
		// }

		// for (var i in r[0]) {
		// 	if (r[0][i] == 2)
		// 		console.log(i);
		// }


		act_buffer += '[' + r.actS + '],';
		all_totalProfit.push(r.totalProfit);
		all_totalProfit2.push(r2.totalProfit);

		//fs.writeFile('data.js', [r[1][302], r2[1][302]]);

		// fs.writeFile('log/' + file, 'module.exports =' + runActGetProfit(ts_pr, ts_policy));



		// fs.readFile('src/js/log/' + file, function(err, data) {
		// 	if (err) throw err;
		//
		// 	console.log(data.toString());
		// });
	});
	//log_str += zip(all_totalProfit, all_totalProfit2) + '\n';

	for (var i in all_totalProfit) {
		log_str += all_totalProfit[i] + ' ' + all_totalProfit2[i];
		log_str += '\n'
	}
	log_str += '\n'
	log_str += (Math.max(...all_totalProfit) + ' ' + Math.max(...all_totalProfit2) + '\n');


	var c1 = 0,
		c2 = 0
	for (var i in all_totalProfit) {
		if (all_totalProfit[i] < 0)
			c1++;

		if (all_totalProfit2[i] < 0)
			c2++;
	}

	log_str += (c1 + ' ' + c2 + '\n');
	// console.log(Math.max(...all_totalProfit));


	fs.writeFile('log', log_str);

	fs.writeFile('./src/js/act/acts.js', act_buffer + ']');

	// var all_policyStr = '';
	// var i = 0,
	// 	j = 0;
	// console.log(all_policy.length, all_policy[i].length);
	// // start transpose to a csv formatTime
	// for (; j < all_policy[i].length; j++) {
	// 	for (; i < all_policy.length; i++) {
	// 		// transpose
	// 		//console.log(i, j);
	// 		all_policyStr += all_policy[i][j] + ',';
	// 	}
	// 	all_policyStr += '\n';
	// 	i = 0;
	// }
	//
	// fs.writeFile('all_policy.csv', all_policyStr);
})

function runActGetProfit(timestampS, priceS, policyS) {
	const OUT_BEFORE = 3; // Offset before every day's end 3 tick forward (13:43)
	const TRADE_FEE = 0.6; // Unit is point
	const TAX_RATE = 0; // Transfer to TRADE_FEE, actual value is 0.00002

	//const now_position = 1; // Constraint AI trade 1 lot each time
	function pos_unit(n) {
		return (n > 0 ? 1 : -1) * 1;
		// After test, too much action would cause too much cost on transaction
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

	var profitS = [];
	var totalProfitS = [];
	var actS = [];
	var positionS = [];

	var unreal_profit = 0; // Before offset, the balance binds with future
	var real_profit = 0; // The actual profiting after offset
	var position = 0; // If expect long position = 1, else if short = -1

	var position_withP = [];

	function calCost(now_price, position) {
		var tax = now_price * POINT * TAX_RATE;
		return (TRADE_FEE + tax) * Math.abs(position);
	}

	function calCoverProfit(now_price) {
		var pf = 0;
		for (var i in position_withP)
			pf += calProfit(now_price, position_withP[i][1], position_withP[i][0])
		return pf;
	}

	function calProfit(now_price, hold_price, position) {
		return (now_price - hold_price) * POINT * position - calCost(now_price, position)
	}

	// Start calculation
	for (var i = 0; i < timestampS.length; i++) {
		var now_time = timestampS[i];
		var this_ymd = formatYMD(now_time);
		var next_n_ymd = null;
		if (i + OUT_BEFORE < timestampS.length) // OUT_BEFORE, check further ticks from back
			next_n_ymd = formatYMD(timestampS[i + OUT_BEFORE]);
		var now_price = priceS[i];
		var policy = policyS[i];
		var pre_profit = real_profit + unreal_profit;
		unreal_profit = calCoverProfit(now_price);

		if (this_ymd != next_n_ymd || (i + OUT_BEFORE) >= timestampS.length) {
			// Offset before the end of the day
			if (position != 0) { // Forced Offset
				actS.push(-position);
				// Transfer unreal profit to real profit
				unreal_profit = 0;
				real_profit += calCoverProfit(now_price);
				// Clear position
				position = 0;
				position_withP = [];
			} else // It has already been offset, no need to do anything
				actS.push(0);

		} else {
			// After this block, position must be this
			var now_position = pos_unit(policy);
			var act = now_position - position;
			// Policy want to stay at long position
			if (policy > 0.3) {
				if (now_position > position) { // Have to buy more long to satisfy policy
					if (position < 0) { // If it used to short position
						// Cover short position fiist
						real_profit += calCoverProfit(now_price);
						position_withP = [];
						unreal_profit = 0;
						// Then buy long to required position
						position = now_position;
						actS.push(act);
						real_profit -= calCost(now_price, now_position); // Cost of buying
						position_withP.push([now_position, now_price]);
					} else {
						// Long a little more to satisfy
						real_profit -= calCost(now_price, act);
						actS.push(act);
						position_withP.push([act, now_price]);
						position = now_position;
					}
				} else if (now_position < position) { // Have to cover part of long
					actS.push(act); // negative
					// Try to find the best price to cover
					position_withP.sort((a, b) => a[1] - b[1]); // Sort lower price with higher priority
					// Traverse all long buying record to complete this action (long cover)
					for (var j = 0; j < position_withP.length && act != 0; j++) {
						if (-act < position_withP[j][0]) { // This record can satisfy the action
							unreal_profit -= calProfit(now_price, position_withP[j][1], -act);
							real_profit += calProfit(now_price, position_withP[j][1], -act);
							position = now_position;
							position_withP[j][0] += act;
							act = 0; // Action Satisfied
						} else {
							act += position_withP[j][0]; // Increase act (act is negative)
							unreal_profit -= calProfit(now_price, position_withP[j][1], position_withP[j][0]);
							real_profit += calProfit(now_price, position_withP[j][1], position_withP[j][0]);
							position -= position_withP[j][0];
							position_withP[j][0] = 0; // Exhaust record
						}
					}
				} else // Position remain the same, so no need to act
					actS.push(0);

			} else if (policy < -0.3) { // Short position
				if (now_position < position) { // Have to sell more short to satisfy policy
					if (position > 0) { // If it used to long position
						// Cover long position fiist
						real_profit += calCoverProfit(now_price);
						position_withP = [];
						unreal_profit = 0;
						// Then sell short to required position
						actS.push(act);
						position = now_position;
						real_profit -= calCost(now_price, now_position); // Cost of selling
						position_withP.push([now_position, now_price]);
					} else {
						// Short a little more to satisfy
						real_profit -= calCost(now_price, act);
						actS.push(act);
						position_withP.push([act, now_price]);
						position = now_position;
					}
				} else if (now_position > position) { // Have to cover part of short
					actS.push(act); // positive
					// Try to find the best price to cover
					position_withP.sort((a, b) => a[1] - b[1]); // Sort higher price with higher priority
					// Traverse all short record to complete this action (short cover)
					for (var j = 0; j < position_withP.length && position != now_position; j++) {
						// console.log(j, act, position_withP[j][0], position, now_position);
						if (-act > position_withP[j][0]) { // This record can satisfy the action
							unreal_profit -= calProfit(now_price, position_withP[j][1], -act);
							real_profit += calProfit(now_price, position_withP[j][1], -act);
							position = now_position;
							position_withP[j][0] += act;
							act = 0; // Action Satisfied
						} else {
							act += position_withP[j][0]; // Decrease act (position_withP[J][0] is negative)
							unreal_profit -= calProfit(now_price, position_withP[j][1], position_withP[j][0]);
							real_profit += calProfit(now_price, position_withP[j][1], position_withP[j][0]);
							position -= position_withP[j][0];
							position_withP[j][0] = 0; // Exhaust record
						}
					}
				} else // Position remain the same, so no need to act
					actS.push(0);

			} else { // If policy = -0.3 ~ 0.3
				if (position != 0) { // Then if there is any position, definately offset
					actS.push(-position);
					real_profit += calCoverProfit(now_price);
					unreal_profit = 0;
					position = 0;
					position_withP = [];
				} else // It has already been offset, no need to do anything
					actS.push(0);
			}
		}
		profitS.push(real_profit + unreal_profit - pre_profit);
		totalProfitS.push(real_profit + unreal_profit);
		positionS.push(position);
		// console.log(formatYMD(timestampS[i]), formatTime(timestampS[i]), policyS[i].toFixed(4), priceS[i].toFixed(), actS[i], profitS[i].toFixed(1), actS[i], profitS[i].toFixed(1));
	}
	// return
	return {
		actS: actS,
		profitS: profitS,
		positionS: positionS,
		totalProfitS: totalProfitS,
		totalProfit: totalProfitS[totalProfitS.length - 1]
	};
}


function runActGetProfit2(ts_pr, ts_pl) {
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
	var ts_earn = zip(ts_list, earn_list);
	return {
		actS: LISTTTTTTTTTTT,
		profitS: earn_list,
		totalProfit: profit_value
	};
}



function zip(l1, l2) {
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


function formatYMD(timestamp_in_ms, slicer = '/') {
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


function formatTime(timestamp_in_ms, slicer = ':') {
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