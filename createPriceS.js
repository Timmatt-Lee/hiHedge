'use strict'

var fs = require('fs')
var basic = require('./src/js/policy/basic.js')

var time_iterator = y4m2d2_hhmmss_2ts(basic.dateS[basic.dateS.length - 1], basic.timeS[basic.timeS.length - 1]);

// Generate fake price series before now
for (var i in basic.dateS) {
	basic.dateS[i] = '\'' + basic.dateS[i] + '\'';
	basic.timeS[i] = '\'' + basic.timeS[i] + '\'';
}

for (; time_iterator.getTime() <= (new Date(Date.now())).getTime(); time_iterator.setTime(time_iterator.getTime() + ((time_iterator.getHours() == 21 && time_iterator.getMinutes() == 45) ? 18 * 60 * 60 * 1000 : 60 * 1000))) {
	basic.dateS.push('\'' + formatYMD(time_iterator.getTime(), '') + '\'');
	basic.timeS.push('\'' + formatTime(time_iterator.getTime(), '') + '\'');
	basic.priceS.push(10580 + Math.floor((Math.random() * 100)));
}

fs.writeFile('basic.js', 'var dateS=[' + basic.dateS + '];\nvar timeS=[' + basic.timeS + '];\nvar priceS=[' + basic.priceS + '];');




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
	return dt;
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

	return hours + slicer + minutes + '00';
}

function round(v, deci) {
	var x = Math.pow(10, deci);
	return Math.round(v * x) / x;
}