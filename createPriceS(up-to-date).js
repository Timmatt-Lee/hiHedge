'use strict'

var fs = require('fs')
var priceS = require('./src/js/policy/priceS.old.js')
var timeS = [];

var time_iterator = new Date(Date.now());
var last_billing_time = new Date(Date.now());

// Go back to the nearest 13:45
while (!(last_billing_time.getHours() == 7 && last_billing_time.getMinutes() == 45) && !(last_billing_time.getHours() == 5 && last_billing_time.getMinutes() == 0))
	last_billing_time.setTime(last_billing_time.getTime() - 60 * 1000)


// Generate fit fake price series before now
for (
	var counter = 0; counter < priceS.length; counter++, time_iterator.setTime(
		time_iterator.getTime() - (
			(time_iterator.getHours() == 8 && time_iterator.getMinutes() == 45) ?
			15 * 15 * 60 * 1000 : (
				(time_iterator.getHours() == 15 && time_iterator.getMinutes() == 0) ?
				5 * 15 * 60 * 1000 : 60 * 1000
			)
		)
	)
) {
	if (time_iterator.getTime() > last_billing_time.getTime())
		priceS.push(priceS[priceS.length - 1] - 10 + Math.round(Math.random() * 20));
	timeS.unshift(formatDateNumber(time_iterator));
}

fs.writeFile('./src/js/act/timeS.js', 'var timeS=[' + timeS + '];');
fs.writeFile('./src/js/act/priceS.js', 'var priceS=[' + priceS + '];');
fs.writeFile('./src/log/timeS', timeS);
fs.writeFile('./src/log/priceS', priceS);
fs.writeFile('./src/js/policy/timeS.js', 'module.exports=[' + timeS + ']');
fs.writeFile('./src/js/policy/priceS.js', 'module.exports=[' + priceS + ']');

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
	return Y + M + D + h + m + '00';
}