'use strict'

var fs = require('fs')
var priceS = require('./data/priceS.js')
var timeS = [];

var last_closing_time = new Date(Date.now());

// Go back to the nearest 13:44 or 4:59 (exclude holiday)
while (!(
		(last_closing_time.getHours() == 13 && last_closing_time.getMinutes() == 44 && last_closing_time.getDay() % 6 != 0) ||
		(last_closing_time.getHours() == 4 && last_closing_time.getMinutes() == 59 && last_closing_time.getDay() > 1)
	))
	last_closing_time.setTime(last_closing_time.getTime() - 60 * 1000)
last_closing_time.setSeconds(59);

var last_opening_time = new Date(Date.now());
// Go back to the nearest 15:00 or 8:45 (exclude holiday)
while (!(
		(last_opening_time.getHours() == 15 && last_opening_time.getMinutes() == 0 && last_opening_time.getDay() % 6 != 0) ||
		(last_opening_time.getHours() == 8 && last_opening_time.getMinutes() == 45 && last_opening_time.getDay() % 6 != 0)
	))
	last_opening_time.setTime(last_opening_time.getTime() - 60 * 1000)
last_opening_time.setSeconds(0);

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

// Generate fit fake price series before now
for (var counter = 0; counter < priceS.length; counter++) {
	// If now is opening, then replenish prices from last opening time to now
	if (time_iterator != last_closing_time && time_iterator.getTime() > last_opening_time.getTime())
		priceS.push(priceS[priceS.length - 1] - 10 + Math.round(Math.random() * 20));
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
	timeS.unshift(formatDateNumber(time_iterator));
	// Iterate
	time_iterator.setTime(time_iterator.getTime() - minus_time);
}

fs.writeFileSync('../src/js/data/timeS.js', 'var timeS=[' + timeS + '];');
fs.writeFileSync('../src/js/data/priceS.js', 'var priceS=[' + priceS + '];');
fs.writeFileSync('../txMakers/data/priceS.js', 'module.exports=[' + priceS + '];');
fs.writeFileSync('../txMakers/data/timeS.js', 'module.exports=[' + timeS + '];');
fs.writeFileSync('../logs/timeS', timeS);
fs.writeFileSync('../logs/priceS', priceS);

function formatDateNumber(date) {
	var Y = date.getFullYear();
	var M = date.getMonth() + 1;
	if (M < 10)
		M = '0' + M;
	var D = date.getDate();
	if (D < 10)
		D = '0' + D;
	var h = date.getHours();
	if (h < 10)
		h = '0' + h;
	var m = date.getMinutes();
	if (m < 10)
		m = '0' + m;
	var s = date.getSeconds();
	if (s < 10)
		s = '0' + s;
	return Y + M + D + h + m + s;
}