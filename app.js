/**
 * Module dependencies.
 */

var express = require('express'), 
	routes = require('./routes'), 
	http = require('http'), 
	path = require('path'), 
	mongodb = require('mongodb'), 
	sio = require('socket.io'),
	config = require('./config'),
	pkg = require('./package');

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

// routes
app.get('/', routes.index);
app.get('/views/main', routes.main);

// socket.io to stream log messages
var server = http.createServer(app);
var io = sio.listen(server);

io.sockets.on('connection', function(socket) {

	mongodb.MongoClient.connect('mongodb://' + config.db.host + ':' + config.db.port + '/' + config.db.name, function(err, db) {

		if (err)
			throw err;

		db.collection(config.db.collection)
			.find({}, {
				tailable : true,
				awaitdata : true,
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

// start the server
server.listen(app.get('port'), function() {
	console.log('syslogng-web ' + pkg.version + ' listening on port ' + app.get('port'));

});
