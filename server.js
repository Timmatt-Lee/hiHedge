'use strict';

var fs = require('fs');
var express = require('express');
var reloadify = require('reloadify');
var path = require('path');
var favicon = require('serve-favicon');

// mysql
var mysql = require('mysql');
var con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "qpalzm794613",
	database: "hiHedge",
	charset: "utf8mb4_unicode_520_ci"
});

con.connect(err => {
	if (err) throw err;
	console.log("Data Base connected!");
});

// App
var app = express();

// Refresh browser on change
app.use(reloadify(path.join(__dirname, 'src')));

// Icon & baseDir
app.use(favicon(path.join(__dirname, 'src/img', 'favicon.png')));
app.use(express.static(path.join(__dirname, 'src')));
app.use(express.static(path.join(__dirname, 'build/contracts')));

// Bind every request with mysql
app.use((req, res, next) => {
	console.log('Request URL:', req.originalUrl);
	req.con = con;
	next();
});

// Register a new trader to db
app.use('/register', require('./routes/register'));

// Fetch trader information from db
app.use('/trader', require('./routes/trader'));

var getPrice = require('./routes/price');
// Fetch price
app.use('/price', (req, res, next) => {
	getPrice().then(p => {
		if (!p) res.send(null);
		else res.send(p);
	}).catch(console.error);
});

// Run data maker, once complete fetch price online per second
var chartData;
require('./dataMakers/timeMaker(second).js')().then(r => {
	chartData = r;
	// Fetch Price per second
	setInterval(() =>
		getPrice().then(p => {
			if (!p) return;
			var x = new Date(Date.now());
			x.setMilliseconds(0);
			x = x.getTime();
			// Fix holes in time elapse
			var preT = chartData.timeS[chartData.timeS.length - 1];
			chartData.priceS = require('./dataMakers/data/priceS.js');
			for (var i = (x - preT - 1000) / 1000; i >= 0; i--) 
				chartData.timeS.push(x - i * 1000);
		}).catch(console.error), 1000);
});

// Fetch timeS and priceS
app.use('/chartData', (req, res, next) => {
	res.send({ timeS: chartData.timeS, priceS: chartData.priceS });
});

app.listen(3000, () => console.log('App is listening on port 3000!'));