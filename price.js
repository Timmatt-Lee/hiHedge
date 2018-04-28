'use strict'

var fs = require('fs')
var basic = require('./src/js/policy/basic.js')
var request = require('ajax-request')

// 產生對應日期的期貨代碼 給網站去拿價格
function getSuffix(date = new Date(Date.now())) {
	var result = '';
	var before_billingDay = undefined;

	if (date.getDate() < 15)
		before_billingDay = true;
	else { // >= 15th
		if ((date.getDate() - 15) / 7 < 1) { // Between 15 th~21 th
			if ((date.getDay() + 4) % 7 >= (date.getDate() - 15))
				before_billingDay = true;
			else
				before_billingDay = false;
		} else // >= 22th
			before_billingDay = false;
	}

	if (before_billingDay) {
		if (date.getMonth() + 1 < 10)
			result += '0'
		result += date.getMonth() + 1;
		result += date.getYear() % 10; // Get the units digit of year
	} else {
		if (date.getMonth() + 2 < 10)
			result += '0'
		result += date.getMonth() + 2;
		result += (date.getYear() + (date.getMonth() == 12 ? 1 : 0)) % 10; // Get the units digit of year
	}
	return result;
}

function getPrice() {
	var now = new Date(Date.now());
	var url;
	if (((now.getHours() >= 5) && (now.getHours() <= 8 && now.getMinutes() <= 45)) || ((now.getHours() >= 13 && now.getMinutes() >= 45) && (now.getHours() < 15))) {
		if (!(now.getHours() == 5 && now.getMinutes() == 0) &&
			!(now.getHours() == 8 && now.getMinutes() == 45) &&
			!(now.getHours() == 13 && now.getMinutes() == 45)) {
			console.log('JJJJJJJJJ');
			return;
		}
	}

	if (now.getHours() < 15)
		url = 'http://info512.taifex.com.tw/Future/ImgChartDetail.ashx?type=1&contract=TX' + getSuffix();
	else
		url = 'http://info512ah.taifex.com.tw/Future/ImgChartDetail.ashx?type=1&contract=TX' + getSuffix();

	request({
		url: url,
	}, function(err, res, body) {
		// Slice the response, price is between the 11st and 12nd camma
		var pos = 0,
			counter = 0,
			camma_11 = 0,
			camma_12 = 0;
		for (var i in body) {
			var new_pos = body.indexOf(',', pos + 1)
			if (new_pos > pos) {
				counter++;
				if (counter == 11)
					camma_11 = new_pos;
				else if (counter == 12) {
					camma_12 = new_pos;
					break;
				}
				pos = new_pos;
			}
		}
		body = body.slice(camma_11 + 1, camma_12);
		fs.appendFileSync('log', '[' + now.getTime() + ',' + body + '],');
	});
}


function formatTimeStamp(y4m2d2, hhmmss) {
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

setInterval(getPrice, 1000);