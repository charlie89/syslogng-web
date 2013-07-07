/**
 * Module dependencies.
 */

var express = require('express'), 
	routes = require('./routes'), 
	http = require('http'), 
	path = require('path'), 
	mongodb = require('mongodb'), 
	sio = require('socket.io');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

var server = http.createServer(app);
var io = sio.listen(server);

io.sockets.on('connection', function(socket) {

	var logsCollection = null;

	mongodb.MongoClient.connect('mongodb://db.trd:27017/syslog', function(err, db) {

		if (err)
			throw err;

		logsCollection = db.collection('messages');

		var stream = logsCollection.find({}, {
			tailable : true,
			await_data : true,
			numberOfRetries : -1,
			fields : {
				'PROGRAM' : 1,
				'PRIORITY' : 1,
				'MESSAGE' : 1,
				'DATE' : 1
			},
			sort : {
				'$natural' : 1
			}			
		})
		.stream()
		.on('data', function(data) {
			if (data) {
				socket.emit('message', data);
			}
		});
	});
});

app.get('/', routes.index);

server.listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'));
});
