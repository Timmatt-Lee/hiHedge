var express = require('express');
var router = express.Router();

// home page
router.get('/', function(req, res, next) {

	var db = req.con;
	var data = "";

	db.query('SELECT * FROM `trader`', function(err, rows) {
		if (err) {
			console.log(err);
		}
		var data = rows;
		// use index.ejs
		res.render('index', { title: '`trader` Information', data: data });
	});

});

module.exports = router;