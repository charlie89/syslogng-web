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
	pkg = require('./package'),
	extend = require('extend');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
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

// Reduce log messages in production environment (WARN & ERROR)
io.set('log level', process.env.NODE_ENV === 'production' ? 1 : 3);

var connectionString = 'mongodb://' + 
	config.db.host + 
	':' + 
	config.db.port + 
	'/' + 
	config.db.name;

mongodb.MongoClient.connect(connectionString, function(err, db) {
	
	if (err)
		throw err;
	
	var findOptions = {
		fields: {
			'PROGRAM': 1,
			'PRIORITY': 1,
			'MESSAGE': 1,
			'DATE': 1
		},
		sort: {
			$natural: 1
		}
	};
	
	// the syslog collection (or as configured)
	var collection = db.collection(config.db.collection);

	// the neverending tailable cursor
	var cursor = collection.find({}, extend({}, findOptions, {
			tailable : true,
			awaitdata : true,
			numberOfRetries : -1,
		}));
		
	// open a stream on the neverending cursor
	var stream = cursor.stream();
		
	stream.on('data', function(data) {
		if (data) {
			io.sockets.emit('log', data);
		}
	});
		
	stream.on('error', function (err) {
		console.log(err);
	});
	
	// per-connection socket events
	io.sockets.on('connection', function (socket) {
		
		collection.find({}, extend({}, findOptions, {
			sort: {
				'DATE': -1
			}
		}))
		.toArray(function (err, data) {
			if (err) 
				throw err;
			
			socket.emit('logs', data);
		});
		
		socket.on('disconnect', function () {
			console.log('socket disconnected');
		});
	});
});

// start the server
server.listen(app.get('port'), function() {
	console.log('syslogng-web ' + pkg.version + ' listening on port ' + app.get('port'));
});
