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
		db: require('debug')('syslogng-web:db'),
		socket: require('debug')('syslogng-web:socket')
	};

var app = express();

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
	app.use(express.errorHandler());
}

// routes
app.get('/', routes.index);
app.get('/views/main', routes.main);

// socket.io to stream log messages
var server = http.createServer(app);
var io = sio.listen(server);


// This promise will be resolved when the database connection and socket.io are ready
var subsystemUpDeferred = q.defer();

console.log('initializing subsystem');

require('./lib/socket')(config, io, debug).then(function () {
	subsystemUpDeferred.resolve();
}, function (err) {
	subsystemUpDeferred.reject(err);
});

// catch SIGTERM and SIGINT
var shutdown = function () {
	console.log('syslog-ng ' + pkg.version + ' shutting down');
	server.close();
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

