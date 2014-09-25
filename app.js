var express = require('express'), 
	morgan = require('morgan'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	routes = require('./routes'), 
	http = require('http'), 
	path = require('path'), 
	sio = require('socket.io'),
	config = require('./config'),
	pkg = require('./package'),
	extend = require('extend'),
	util = require('util'),
	q = require('q'),
	debug = require('debug')('syslogng-web:app');

var app = express();

if (process.env.DEBUG && (process.env.DEBUG === '*' || process.env.DEBUG.indexOf('syslogng-web.*') !== -1 || process.env.DEBUG.indexOf('syslogng-web.app') !== -1)) {
	setInterval(function __showProcessMemoryUsage() {
		var memoryUsage = process.memoryUsage();
		debug('process memory usage: RSS %dmb, heap (total): %dmb, heap (used): %dmb', Math.round(memoryUsage.rss / 1024 / 1024, 2),
			Math.round(memoryUsage.heapTotal / 1024 / 1024, 2),
			Math.round(memoryUsage.heapUsed / 1024 / 1024, 2));
	}, 10000);
}

// setup express
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParse.json());
app.use(methodOverride());
app.use(app.router);

// routes
app.get('/', routes.index);
app.get('/views/main', routes.main);

// API routes
require('./lib/api');

// socket.io to stream log messages
var server = http.createServer(app);
var io = sio.listen(server);
var db = require('./lib/db');

// catch SIGTERM and SIGINT
var shutdown = function () {
	console.log('syslog-ng ' + pkg.version + ' shutting down');
	server.close();
	process.exit(0);
};

process.on('SIGTERM', shutdown).on('SIGINT', shutdown);

console.log('initializing subsystem');

// bring up database, configure websocket 

// This promise will be resolved when the database connection and socket.io are ready
var subsystemUpDeferred = q.defer();

db.connect().then((function () {
	require('./lib/socket')(io, db);
	subsystemUpDeferred.resolve();
}, function (err) {
	subsystemUpDeferred.reject(err);
}));

// start server
subsystemUpDeferred.promise.then(function () {
	server.listen(app.get('port'), function() {
		console.log('syslogng-web ' + pkg.version + ' listening on port ' + app.get('port'));
	});
}, function (err) {
	console.error('An error occured while setting up syslogng-web:', err.message);
	console.error('Bail out');
	process.exit(1);
});

