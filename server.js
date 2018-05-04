'use strict';

var fs = require('fs');
var express = require('express');
var reloadify = require('reloadify');
var path = require('path');
var favicon = require('serve-favicon');

var traderInfo = require('./routes/trader');
var getPrice = require('./routes/price');
var dataMaker = require('./dataMakers/up-to-date-Price&Time(second).js');

// mysql
var mysql = require('mysql');
var con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "qpalzm794613",
	database: "hiHedge",
	charset: "utf8mb4_unicode_520_ci"
});
con.connect(function(err) {
	if (err) throw err;
	console.log("Connected!");
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
app.use(function(req, res, next) {
	console.log('Request URL:', req.originalUrl);
	req.con = con;
	next();
});

// Fetch trader information from db
app.use('/trader', traderInfo);

// Fetch price
app.use('/price', (req, res, next) => {
	getPrice().then((p) => {
		if (!p) { res.send(null); return; };
		res.send(p);
	});
});

// Run data maker, once complete fetch price online per second
var chartData;
dataMaker().then((r) => {
	chartData = r;
	// Fetch Price per second
	setInterval(() =>
		getPrice().then((p) => {
			if (!p) return;
			chartData.timeS.push(Date.now());
			chartData.priceS.push(Number(p));
			// fs.appendFileSync('src/log/priceS', ',' + p);
			// fs.appendFileSync('src/log/timeS', ',' + );
		}), 1000);
});

// Fetch timeS and priceS
app.use('/chartData', (req, res, next) => {
	res.send({ timeS: chartData.timeS, priceS: chartData.priceS });
});

app.listen(3000, function() {
	console.log('App listening on port 3000!');
});