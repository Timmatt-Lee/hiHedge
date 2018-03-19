'use strict';

var express = require('express');
var reloadify = require('reloadify');
var path = require('path');
var favicon = require('serve-favicon');

var routes = require('./routes/index');

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
	// var sql = "INSERT INTO `trader` VALUES ('0x1234567890123456789012345678901234567890', 'Jugar', 'I am the smartest', 'Jugar', '🐷')";
	// con.query(sql, function(err, result) {
	// 	if (err) throw err;
	// 	console.log("Result: " + result);
	// });
});

// App
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// refresh browser on change
app.use(reloadify(path.join(__dirname, 'src')));

// icon & baseDir
app.use(favicon(path.join(__dirname, 'src/img', 'favicon.png')));
app.use(express.static(path.join(__dirname, 'src')));
app.use(express.static(path.join(__dirname, 'build/contracts')));

// Bind every request with mysql
app.use(function(req, res, next) {
	console.log('Request URL:', req.originalUrl);
	req.con = con;
	next();
});

// index router
app.use('/', routes);

app.listen(3000, function() {
	console.log('App listening on port 3000!');
});