'use strict'

var fs = require('fs');
var timeS = require('./src/js/policy/timeS.js');
var priceS = require('./src/js/policy/priceS.js');

var str = '';
for (var i = 0; i < Math.max(timeS.length, priceS.length); i++) {
	// console.log(timeS[i], priceS[i]);
	str += Math.floor(timeS[i] / 1000000) + ' ' + timeS[i] % 1000000 + ' ' + priceS[i] + '\n';
}

fs.writeFile('log', str);