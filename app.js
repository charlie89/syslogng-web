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
	extend = require('extend'),
	util = require('util'),
	q = require('q'),
	debug = {
		app: require('debug')('syslogng-web:app'),
		db: require('debug')('syslogng-web:db')
	};

var app = express();

if (process.env.DEBUG && (process.env.DEBUG === '*' || process.env.DEBUG.indexOf('syslogng-web.*') !== -1 || process.env.DEBUG.indexOf('syslogng-web.app') !== -1)) {
	setInterval(function __showProcessMemoryUsage() {
		var memoryUsage = process.memoryUsage();
		debug.app('process memory usage: RSS %dmb, heap (total): %dmb, heap (used): %dmb', Math.round(memoryUsage.rss / 1024 / 1024, 2), 
			Math.round(memoryUsage.heapTotal / 1024 / 1024, 2), 
			Math.round(memoryUsage.heapUsed / 1024 / 1024, 2));
	}, 10000);
}

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
app.use(express.logger('dev'));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	debug.app('development environment detected; using express.errorHandler');
	app.use(express.errorHandler());
}

// routes
app.get('/', routes.index);
app.get('/views/main', routes.main);

// socket.io to stream log messages
var server = http.createServer(app);
var io = sio.listen(server);

// build the connection string
function _createConnectionString () {
	var cs = 'mongodb://';
	
	if (config.db.username != '' && config.db.password != '') {
		cs += config.db.username + ':' + config.db.password + '@';
	}
	
	cs += config.db.host + ':' + config.db.port + '/' + config.db.name;
	
	debug.db('created connection string: %s', cs);
	
	return cs;	
}

// This promise will be resolved when the database connection and socket.io are ready
var subsystemUpDeferred = q.defer();

var dbLink, dbCursor, dbStream;

console.log('initializing subsystem');

mongodb.MongoClient.connect(_createConnectionString(), function(err, db) {
	
	if (err) {
		debug.db('failed to connect to database', err);
		return subsystemUpDeferred.reject(err);		
	}
		
	console.log('  ...connected to MongoDB database');
	
	dbLink = db;
	
	var findOptions = {
		fields: {
			'PROGRAM': 1,
			'PRIORITY': 1,
			'MESSAGE': 1,
			'DATE': 1,
			'HOST': 1,
			'HOST_FROM': 1,
			'SOURCEIP': 1,
			'SEQNUM': 1,
			'TAGS': 1
		},
		sort: {
			$natural: 1
		}
	};
	
	// the syslog collection (or as configured)
	debug.db('opening collection: %s', config.db.collection);
	var collection = db.collection(config.db.collection);
	
	collection.options(function (err, options) {
	
		if (err) {
			// fail
			debug.db('error while fetching collection options', err);
			return subsystemUpDeferred.reject(err);			
		}
		
		if (!options) {
			// fail
			debug.db('no options could be retrieved from collection');
			return subsystemUpDeferred.reject({
				message: 'cannot get collection properties. Please make sure it exists!'
			});	
		}
		
		if (!options.capped) {
			// fail
			debug.db('configured collection is not capped');
			return subsystemUpDeferred.reject({
				message: 'collection is not capped'
			});	
		}
		
		console.log('  ...opening tailable cursor on ' + config.db.name + '.' + config.db.collection);
	
		// the neverending tailable cursor
		var cursor = collection.find({}, extend({}, findOptions, {
				tailable : true,
				awaitdata : true,
				numberOfRetries : -1,
			}));
		
		// open a stream on the neverending cursor	
		var stream = cursor.stream();
		
		dbCursor = cursor;
		dbStream = stream;
		
		stream.on('data', function(data) {
			if (data) {
				io.sockets.emit('log', data);
			}
		});
	
		var allLogsHandler = function (socket) {
			debug.db('retrieving all documents from collection');
			collection.find({}, extend({}, findOptions, {
				sort: {
					'DATE': -1
				}
			}))
			.toArray(function (err, data) {
				if (err) {
					debug.db('failed retrieving all documents from collection', err);
					return;					
				}
			
				socket.emit('logs', data);
			});
		};
	
		// listen for fetchAll request
		io.sockets.on('fetchAll', allLogsHandler);	
	
		// per-connection socket events
		io.sockets.on('connection', allLogsHandler);
	
		// subsystem is ready
		subsystemUpDeferred.resolve();
	});
});

// shutdown listener
server.on('close', function () {
	
	console.log('  ...releasing tailable cursor');
	
	dbCursor.close(function (err) {
		if (err) {
			console.error(err);
		}
		
		console.log('  ...closing database connection');			
		
		dbLink.close(function (err, result) {			
			if (err) {
				console.error(err);
			}
			
			dbStream = null;
			dbLink = null;
			
			// exit process
			console.log('  ...Goodbye!');
		});
		
		dbCursor = null;
	});
});

// catch SIGTERM and SIGINT
var shutdown = function () {
	console.log('syslog-ng ' + pkg.version + ' shutting down');
	server.close();
	process.exit(0);
};

process.on('SIGTERM', shutdown).on('SIGINT', shutdown);

// start the server
subsystemUpDeferred.promise.then(function () {
	server.listen(app.get('port'), function() {
		console.log('syslogng-web ' + pkg.version + ' listening on port ' + app.get('port'));
	});
}, function (err) {
	console.error('An error occured while setting up syslogng-web:', err.message);
	console.error('Bail out');
	process.exit(1);
});

