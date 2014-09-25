var _ = require('lodash'),
	throttle = require('throttle-function'),
	debug = require('debug')('syslogng-web:socket');

// modules and objects provided by application
var io,
	config,
	db;

// keep track of connected clients
var clients = [];

/**
 * Attach websocket events
 *
 * @return {Boolean} true if success, false otherwise
 */
function setupSocket() {

	debug('configuring websockets');

	// handle always on stream data
	db.onStreamData(throttle(broadcastLogMessage, {
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

	debug('client socket connection: %s', socket.id);

	clients.push(socket);

	debug('%d client(s) connected', clients.length);

	socket.on('fetchAll', _.partial(handleFetchAll, socket));	
	socket.on('disconnect', _.partial(handleDisconnect, socket));
}

/**
 * Websocket handler to fetch all messages from collection
 *
 * @param {Socket} socket
 */
function handleFetchAll(socket) {

	debug('fetch all documents handler requested by %s', socket.id);

	db.getMessages().then(function (messages) {
		sendLogMessageBatch(messages, socket);
	}, function (err) {
		debug('failed to send message batch to socket %s', socket.id, err);
	});
}

/**
 * Websocket disconnect event handler
 *
 * @param {Socket} socket
 */
function handleDisconnect(socket) {

	debug('client disconnected: %s', socket.id);

	_.remove(clients, function (s) {
		return s.id === socket.id;
	});

	debug('%d client(s) connected', clients.length);
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
 * Websocket handler to emit a batch of log messages to a specific socket
 *
 * @param {Array} the messages to send
 * @param {Socket} the socket to emit the messages through
 */
function sendLogMessageBatch(messages, socket) {
	if (messages) {
		socket.emit('logs', messages);
	}
}

/**
 * Initialize socket module
 *
 * @param pIo {Socket} master socket.io server
 * @param pDebug {Object} debug API object
 * @return {Promise} promise to be fulfilled when everything is ready
 */
module.exports = function (pIo, pDb) {
	// keep references
	io = pIo;
	db = pDb;

	setupSocket();
};
