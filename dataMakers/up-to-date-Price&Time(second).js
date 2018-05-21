'use strict'

module.exports = () => {

	var fs = require('fs');
	var priceS = require('./data/priceS.js');
	var timeS = [];
	var timeS_ms = []; // For log, store js default format of date (in ms)

	var last_closing_time = new Date(Date.now());

	// Go back to the nearest 13:44 or 4:59 (exclude holiday)
	while (!(
			(last_closing_time.getHours() == 13 && last_closing_time.getMinutes() == 44 && last_closing_time.getDay() % 6 != 0) ||
			(last_closing_time.getHours() == 4 && last_closing_time.getMinutes() == 59 && last_closing_time.getDay() > 1)
		))
		last_closing_time.setTime(last_closing_time.getTime() - 60 * 1000)
	last_closing_time.setSeconds(59);

	var time_iterator = new Date(Date.now());
	// If now is in closing time, just iterate from last closing time
	if ( // Holiday, Saturday 4:59 ~ Monday 8:45
		(((time_iterator.getHours() == 4 && time_iterator.getMinutes() > 59) || (time_iterator.getHours() > 4)) && time_iterator.getDay() == 6) ||
		(time_iterator.getDay() == 0) ||
		(((time_iterator.getHours() == 8 && time_iterator.getMinutes() < 45) || (time_iterator.getHours() < 8)) && time_iterator.getDay() == 1) ||
		// Closing time on workday 4:59~8:45 , 13:44~15:00
		(
			((time_iterator.getHours() == 4 && time_iterator.getMinutes() > 59) || (time_iterator.getHours() > 4)) &&
			((time_iterator.getHours() == 8 && time_iterator.getMinutes() < 45) || (time_iterator.getHours() < 8))
		) ||
		(
			((time_iterator.getHours() == 13 && time_iterator.getMinutes() > 44) || (time_iterator.getHours() > 13)) &&
			((time_iterator.getHours() == 15 && time_iterator.getMinutes() < 0) || (time_iterator.getHours() < 15))
		)
	)
		time_iterator = last_closing_time;

	time_iterator.setMilliseconds(0);

	// Generate fit fake price series before now
	for (var counter = 0; counter < priceS.length; counter++) {
		// Calculate how much `time_iterator` should minus
		var minus_time = 0;
		if (time_iterator.getHours() == 8 && time_iterator.getMinutes() == 45 && time_iterator.getSeconds() == 0) { // When iterate to 8:45:00
			if (time_iterator.getDay() == 1) // Monday
				minus_time += 2 * 24 * 60 * 60 * 1000; // Skip 2 holiday day
			else if (time_iterator.getDay() == 0) // Sunday
				minus_time += 24 * 60 * 60 * 1000; // Skip 1 holiday day

			minus_time += (3 * 60 * 60 + 45 * 60 + 1) * 1000; // Jump to 4:59:59
		} else if (time_iterator.getHours() == 15 && time_iterator.getMinutes() == 0 && time_iterator.getSeconds() == 0) { // When iterate to 15:00:00
			if (time_iterator.getDay() == 0) // Sunday
				minus_time += 2 * 24 * 60 * 60 * 1000; // Skip 2 holiday days
			else if (time_iterator.getDay() == 6) // Saturday
				minus_time += 24 * 60 * 60 * 1000; // Skip 1 holiday day

			minus_time += (60 * 60 + 15 * 60 + 1) * 1000; // Jump to 13:44:59
		} else
			minus_time = 1000 // Just simply minus 1 sec

		// Write
		timeS.unshift(makeDateNumber(time_iterator));
		timeS_ms.unshift(time_iterator.getTime());
		// Iterate
		time_iterator.setTime(time_iterator.getTime() - minus_time);
	}
	// Data for blockChain records
	fs.writeFileSync('txMakers/data/timeS.js', 'module.exports=[' + timeS + '];');
	fs.writeFileSync('txMakers/data/priceS.js', 'module.exports=[' + priceS + '];');
	// Server needed data
	return Promise.resolve({ timeS: timeS_ms, priceS: priceS });
}

function makeDateNumber(date) {
	var Y = date.getUTCFullYear();
	var M = date.getUTCMonth() + 1;
	if (M < 10)
		M = '0' + M;
	var D = date.getUTCDate();
	if (D < 10)
		D = '0' + D;
	var h = date.getUTCHours();
	if (h < 10)
		h = '0' + h;
	var m = date.getUTCMinutes();
	if (m < 10)
		m = '0' + m;
	var s = date.getUTCSeconds();
	if (s < 10)
		s = '0' + s;
	return Y + M + D + h + m + s;
}