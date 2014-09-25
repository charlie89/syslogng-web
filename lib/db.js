var MongoClient = require('mongodb').MongoClient,
	extend = require('extend'),
	q = require('q'),
	_ = require('lodash'),
	debug = require('debug')('syslogng-web:db');

// modules and objects provided by application
var config;

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
	
	debug('created connection string: %s', cs);
	
	return cs;	
}

/**
 * Connect to the database and initialize required cursors and streams
 *
 * @return {q/Promise} promise to be fulfilled or rejected later
 */
function connectDatabase() {
	var dbDeferred = q.defer();

	debug('attempting to connect to data source');

	MongoClient.connect(createConnectionString(), function (err, db) {
		if (err) {
			debug('failed to connect to database', err);
			return dbDeferred.reject(err);
		}

		dbLink = db;

		debug('opening collection: %s', config.db.collection);

		dbCollection = db.collection(config.db.collection);

		if (!dbCollection) {
			debug('rejecting db promise: could not open collection %s', config.db.collection);
			dbDeferred.reject({
				messge: 'could not open collection %s'
			})
		}

		dbCollection.options(function (err, options) {
			if (err) {
				debug('rejecting db promise: error while fetching collection options', err);
				return dbDeferred.reject(err);
			}

			if (!options) {
				// fail
				debug('rejecting db promise: no options could be retrieved from collection');
				return dbDeferred.reject({
					message: 'cannot get collection properties. Please make sure it exists!'
				});	
			}

			if (!options.capped) {
				// fail
				debug('rejecting db promise: configured collection is not capped');
				return dbDeferred.reject({
					message: 'collection is not capped'
				});	
			}

			debug('opening tailable cursor on %s', config.db.collection);

			dbCursor = dbCollection.find({}, extend({}, DEFAULT_FIND_OPTIONS, {
				tailable : true,
				awaitdata : true,
				numberOfRetries : -1,
			}));

			debug('opening stream on trailable cursor');

			dbStream = dbCursor.stream();

			dbDeferred.resolve();
		});
	});

	return dbDeferred.promise;
}

module.exports = function (config) {

	return {
		/**
		 * @see connectDatabase
		 */
		connect: connectDatabase,

		/**
		 * Add a listener on the 'data' event of the collection stream
		 *
		 * @return {Boolean} true if success, false otherwise
		 */
		onStreamData: function (callback) {

			if (!dbStream) {
				return false;
			}

			if (!_.isFunction(callback)) {
				return false;
			}
			
			dbStream.on('data', callback);
			
			return true;
		},

		/**
		 * Fetch a subset of the messages stored in the collection
		 *
		 * @return {Promise} promise to be fulfilled when the query finishes
		 */
		getMessages: function (from, count) {
			
			var deferred = q.defer();

			dbCollection.find({}, extend({}, DEFAULT_FIND_OPTIONS, {
				limit: count,
				skip: from,
				sort: [['DATE', -1]]
			})).toArray(function (err, result) {
				if (err) {
					return deferred.reject(err);
				}

				deferred.resolve(result);
			});

			return deferred.promise;
		},

		/**
		 * Close all database handles and opened cursors
		 */
		close: function () {

		}
	};
};