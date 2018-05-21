'use strict'

var express = require('express');
var traders = express.Router();

// Insert the new trader information to db
traders.get('/', (req, res, next) => {
	var r = req.query;
	req.con.query('INSERT INTO `trader` (`address`,`name`,`description`,`abbr`,`symbol`,`img`) VALUES (\
		"' + r.address + '","' + r.name + '","' + r.description + '","' + r.abbr + '","' + r.symbol + '",' + r.img + ')',
		(console.log));
});

module.exports = traders;