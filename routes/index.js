var config = require('../config'), pkg = require('../package'), extend = require('extend');

/*
 * GET home page.
 */
exports.index = function(req, res) {	
	res.render('index', extend({}, config, pkg));
};

/*
 * GET main view
 */
exports.main = function(req, res) {
	res.render('main');
};
