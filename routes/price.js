'use strict'

var request = require('request-promise');

// Fetch trader information acroding to query.address from db
function getPrice() {
	var now = new Date(Date.now());
	var url;
	// If now is in closing time, return nothing
	if ( // Holiday, Saturday 4:59 ~ Monday 8:45
		(((now.getHours() == 4 && now.getMinutes() > 59) || (now.getHours() > 4)) && now.getDay() == 6) ||
		(now.getDay() == 0) ||
		(((now.getHours() == 8 && now.getMinutes() < 45) || (now.getHours() < 8)) && now.getDay() == 1) ||
		// Closing time on workday 4:59~8:45 , 13:44~15:00
		(
			((now.getHours() == 4 && now.getMinutes() > 59) || (now.getHours() > 4)) &&
			((now.getHours() == 8 && now.getMinutes() < 45) || (now.getHours() < 8))
		) ||
		(
			((now.getHours() == 13 && now.getMinutes() > 44) || (now.getHours() > 13)) &&
			((now.getHours() == 15 && now.getMinutes() < 0) || (now.getHours() < 15))
		)
	)
		return Promise.resolve(null);

	if (now.getHours() < 15)
		url = 'http://info512.taifex.com.tw/Future/ImgChartDetail.ashx?type=1&contract=TX' + getSuffix();
	else
		url = 'http://info512ah.taifex.com.tw/Future/ImgChartDetail.ashx?type=1&contract=TX' + getSuffix();

	return request({
		url: url,
		transform: function(body) {
			if (!body) return Promise.resolve(null);

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
			return body;
		}
	});
}


// Get the requested suffix of the http get url
function getSuffix(date = new Date(Date.now())) {
	var suffix = '';
	var before_billingDay = undefined;

	if (date.getDate() < 15)
		before_billingDay = true;
	else { // >= 15th
		if ((date.getDate() - 15) / 7 < 1) { // Between 15 th~21 th
			if ((date.getDay() + 3) % 7 >= (date.getDate() - 15))
				before_billingDay = true;
			else
				before_billingDay = false;
		} else // >= 22th
			before_billingDay = false;
	}

	if (before_billingDay) {
		if (date.getMonth() + 1 < 10)
			suffix += '0'
		suffix += date.getMonth() + 1;
		suffix += date.getYear() % 10; // Get the units digit of year
	} else {
		if (date.getMonth() + 2 < 10)
			suffix += '0'
		suffix += date.getMonth() + 2;
		suffix += (date.getYear() + (date.getMonth() == 12 ? 1 : 0)) % 10; // Get the units digit of year
	}
	return suffix;
}

module.exports = getPrice;