'use strict'

var fs = require('fs');
var express = require('express');
var chartData = express.Router();

// Fetch trader information acroding to query.address from db
chartData.get('/', function(req, res, next) {
	fs.readFile('src/log/priceS', (p) => )
	res.send(rows[0]);
});

module.exports = chartData;