'use strict';

var express = require('express');
var reloadify = require('reloadify');
var path = require('path');
var favicon = require('serve-favicon');

var trader = require('./routes/trader');
var price = require('./routes/price');

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
app.use('/trader', trader);

// Fetch price
app.use('/price', price);

app.listen(3000, function() {
	console.log('App listening on port 3000!');
});