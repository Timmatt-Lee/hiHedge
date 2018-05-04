'use strict'

var fs = require('fs');
var priceS = require('./data/priceS.js');
var timeS = require('./data/timeS.js')

fs.readdir('data/all_policy', (err, files) => {

	var act_buffer = '';
	var log_buffet = '';
	var all_totalProfit = [];

	files.forEach(file => {
		var policyS = require('./data/all_policy/' + file);
		var r = runActGetProfit(timeS, priceS, policyS);
		act_buffer += '[' + r.actS + '],';
		all_totalProfit.push(r.totalProfit);
	});

	for (var i in all_totalProfit) {
		log_buffet += all_totalProfit[i];
		log_buffet += '\n'
	}
	log_buffet += '\n'

	// For developer
	fs.writeFileSync('../logs/log', log_buffet);
	fs.writeFileSync('../src/js/data/actS.js', 'var actS=[' + act_buffer + ']');
	fs.writeFileSync('./data/actS.js', 'module.exports=[' + act_buffer + ']');
})

function runActGetProfit(timeS, priceS, policyS) {
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
	for (var i = 0; i < timeS.length; i++) {
		var now_time = timeS[i];
		var this_ymd = revertDateNumber(now_time).getDate();
		var next_n_ymd = null;
		if (i + OUT_BEFORE < timeS.length) // OUT_BEFORE: check further ticks from back
			next_n_ymd = revertDateNumber(timeS[i + OUT_BEFORE]).getDate();
		var now_price = priceS[i];
		var policy = policyS[i];
		var pre_profit = real_profit + unreal_profit;
		unreal_profit = calCoverProfit(now_price);

		if (this_ymd != next_n_ymd || (i + OUT_BEFORE) >= timeS.length) {
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


function revertDateNumber(n) {
	var tz = '+00:00'; // set 00:00 or system will change ts by local timezone.
	str = n.toString();
	var Y = str.slice(0, 4);
	var M = str.slice(4, 6);
	var D = str.slice(6, 8);

	var h = str.slice(8, 10);
	var m = str.slice(10, 12);
	var s = str.slice(12, 14);

	var str = Y + "-" + M + "-" + D + "T" + h + ":" + m + ":" + s + tz;
	return (new Date(str));
}