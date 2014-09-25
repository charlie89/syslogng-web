var MongoClient = require('mongodb').MongoClient,
	extend = require('extend'),
	q = require('q'),
	_ = require('lodash'),
	throttle = require('throttle-function');

// modules and objects provided by application
var debug,
	io,
	config;

// database-related global handles used for all websocket clients
var dbLink, 
	dbCursor, 
	dbStream,
	dbCollection;

// default options used by the find() mongodb driver methods
var DEFAULT_FIND_OPTIONS = {
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

// keep track of connected clients
var clients = [];

/**
 * Create the MongoDB connection string from the user configuration
 *
 * @return {String} the connection string
 */
function createConnectionString() {
	var cs = 'mongodb://';
	
	if (config.db.username != '' && config.db.password != '') {
		cs += config.db.username + ':' + config.db.password + '@';
	}
	
	cs += config.db.host + ':' + config.db.port + '/' + config.db.name;
	
	debug.db('created connection string: %s', cs);
	
	return cs;	
}

/**
 * Connect to the database and initialize required cursors and streams
 *
 * @return {q/Promise} promise to be fulfilled or rejected later
 */
function connectDatabase() {
	var dbDeferred = q.defer();

	debug.db('attempting to connect to data source');

	MongoClient.connect(createConnectionString(), function (err, db) {
		if (err) {
			debug.db('failed to connect to database', err);
			return dbDeferred.reject(err);
		}

		dbLink = db;

		debug.db('opening collection: %s', config.db.collection);

		dbCollection = db.collection(config.db.collection);

		if (!dbCollection) {
			debug.db('rejecting db promise: could not open collection %s', config.db.collection);
			dbDeferred.reject({
				messge: 'could not open collection %s'
			})
		}

		dbCollection.options(function (err, options) {
			if (err) {
				debug.db('rejecting db promise: error while fetching collection options', err);
				return dbDeferred.reject(err);
			}

			if (!options) {
				// fail
				debug.db('rejecting db promise: no options could be retrieved from collection');
				return dbDeferred.reject({
					message: 'cannot get collection properties. Please make sure it exists!'
				});	
			}

			if (!options.capped) {
				// fail
				debug.db('rejecting db promise: configured collection is not capped');
				return dbDeferred.reject({
					message: 'collection is not capped'
				});	
			}

			debug.db('opening tailable cursor on %s', config.db.collection);

			dbCursor = dbCollection.find({}, extend({}, DEFAULT_FIND_OPTIONS, {
				tailable : true,
				awaitdata : true,
				numberOfRetries : -1,
			}));

			debug.db('opening stream on trailable cursor');

			dbStream = dbCursor.stream();

			debug.db('resolving db promise');

			dbDeferred.resolve();
		});
	});

	return dbDeferred.promise;
}

/**
 * Attach websocket events
 *
 * @return {Boolean} true if success, false otherwise
 */
function setupSocket() {

	debug.socket('configuring websockets');

	if (!dbStream) {
		debug.db('cannot configure socket; db stream is not initialized');
		return false;
	}

	// handle always on stream data
	dbStream.on('data', throttle(broadcastLogMessage, {
		window: (1 / 1000) * 50,
		limit: 1
	}));

	io.on('connection', handleSocketConnection);

	return true;
}

/**
 * Websocket connection event handler
 *
 * @param {Socket} socket
 */
function handleSocketConnection(socket) {

	debug.socket('client socket connection: %s', socket.id);

	clients.push(socket);

	debug.socket('%d client(s) connected', clients.length);

	socket.on('fetchAll', _.partial(handleFetchAll, socket));	
	socket.on('disconnect', _.partial(handleDisconnect, socket));
}

/**
 * Websocket handler to fetch all messages from collection
 *
 * @param {Socket} socket
 */
function handleFetchAll(socket) {

	debug.socket('fetch all documents handler requested by %s', socket.id);

	var allDocumentsDbCursor = dbCollection.find({}, extend({}, DEFAULT_FIND_OPTIONS, {
		sort: {
			'DATE': 1
		}
	}));

	var allDocumentsDbStream = allDocumentsDbCursor.stream();

	var count = 0;
	allDocumentsDbStream.on('data', throttle(function (message) {
		//debug.socket('sending data to client %s', socket.id); // log flood alert!
		sendLogMessage(message, socket);
		debug.socket('fetch all documents: stream count is %d', ++count);
	}, {
		window: (1 / 1000) * 50,
		limit: 1
	}));

	allDocumentsDbStream.on('close', function () {

		debug.db('closed stream for fetch all documents handler requested by %s', socket.id);

		allDocumentsDbCursor.close(function (err, result) {
			debug.db('closed cursor for fetch all documents handler requested by %s', socket.id);
		});
	});
}

/**
 * Websocket disconnect event handler
 *
 * @param {Socket} socket
 */
function handleDisconnect(socket) {

	debug.socket('client disconnected: %s', socket.id);

	_.remove(clients, function (s) {
		return s.id === socket.id;
	});

	debug.socket('%d client(s) connected', clients.length);
}

/**
 * Websocket handler to broadcast a log message to all clients
 *
 * @param {Object} the message to broadcast
 */
function broadcastLogMessage(message) {
	sendLogMessage(message, io.sockets);
}

/**
 * Websocket handler to emit a log message to a specific socket
 *
 * @param {Object} the message to emit
 * @param {Socket} the socket to emit the message through
 */
function sendLogMessage(message, socket) {
	if (message) {
		socket.emit('log', message);
	}
}

/**
 *
 */
function debounceReduce(func, wait, combine) {
	var allargs,
		context,
		wrapper = _.debounce(function() {
		    var args = allargs;
		    allargs = undefined;
		    func.apply(context, args);
		}, wait);
    
    return function() {
        context = this;
        allargs = combine.apply(context, [allargs,  Array.prototype.slice.call(arguments,0)]);
        wrapper();
    };
}

/**
 *
 */
function debounceReduceAccumulator(acc, args) {
	debug.socket('accumulator size is now', (acc || []).length);
	return (acc || []).concat(args);
}

/**
 * Initialize socket module
 *
 * @param pConfig {Object} app configuration
 * @param pIo {Socket} master socket.io server
 * @param pDebug {Object} debug API object
 * @return {Promise} promise to be fulfilled when everything is ready
 */
module.exports = function (pConfig, pIo, pDebug) {
	// keep references
	debug = pDebug;
	io = pIo;
	config = pConfig;

	var deferred = q.defer();

	connectDatabase()	
		.then(function () {
			setupSocket();
			deferred.resolve();
		}, function (err) {
			deferred.reject(err);
		});

	return deferred.promise;
};
