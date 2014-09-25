var extend = require('extend'),
	express = require('express'),
	q = require('q'),
	_ = require('lodash'),
	debug = require('debug')('syslogng-web:api'),
	router = express.Router();

var db;

/**
 * // GET /api/messages
 *
 * @return list of messages in JSON format
 */
router.get('/messages', function (req, res) {
	var count = parseInt(req.query.count) || 10,
		from = parseInt(req.query.from) || 0;

	db.getMessages(from, count).then(function (result) {
		res.send(result);
	}, function (err) {
		res.send(err, 500);
	});
});

module.exports = function (pDb) {
	db = pDb;
	app.use('/api', router);
};
