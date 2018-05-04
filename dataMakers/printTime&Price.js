'use strict'

var fs = require('fs');
var timeS = require('./data/timeS.js');
var priceS = require('./data/priceS.js');

var buffer = '';
for (var i = 0; i < Math.max(timeS.length, priceS.length); i++) {
	// console.log(timeS[i], priceS[i]);
	buffer += Math.floor(timeS[i] / 1000000) + ' ' + timeS[i] % 1000000 + ' ' + priceS[i] + '\n';
}

fs.writeFileSync('../logs/log', buffer);