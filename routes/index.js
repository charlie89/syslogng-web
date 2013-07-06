
/*
 * GET home page.
 */

var MongoClient = require('mongodb').MongoClient;

var logsCollection = null;

MongoClient.connect('mongodb://db.trd:27017/syslog', function (err, db) {
	if (err) throw err;
	
	logsCollection = db.collection('messages');
	
});

exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};

// GET /api/messages
exports.messages = function (req, res) {
	logsCollection.find({}, {
		fields: {
			'PROGRAM': 1,
			'PRIORITY': 1,
			'MESSAGE': 1,
			'DATE': 1
		},
		sort: {
			'DATE': -1
		}
	}).toArray(function (err, results) {
		if (err) {
			console.log(err);
			res.status(500);
			res.send(err);
		}
		else {
			res.send({
				messages: results
			});
		}
	});
};