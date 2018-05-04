'use strict'

var express = require('express');
var traders = express.Router();

// Fetch trader information acroding to query.address from db
traders.get('/', function(req, res, next) {
	req.con.query('SELECT * FROM `trader` WHERE `address`="' + req.query.address + '"', function(err, rows) {
		if (err) return console.error(err);
		res.send(rows[0]);
	});
});

module.exports = traders;