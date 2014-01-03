angular.module('syslogng-web')

	.provider('logger', function () {
		
		var that = this;
		
		this.prefix = null;
		
		function addPrefixIfNeeded (arr) {
			if (that.prefix && that.prefix !== '') {
				arr.unshift(that.prefix + ':');
			}
		}
		
		this.$get = function ($log) {
			
			return {				
				error: function () {
					
					var args = _.toArray(arguments);
					
					addPrefixIfNeeded(args);
					$log.error.apply($log, args);
				},
				
				info: function () {
					
					var args = _.toArray(arguments);
					
					addPrefixIfNeeded(args);
					$log.info.apply($log, args);
				},
				
				log: function () {
					
					var args = _.toArray(arguments);
					
					addPrefixIfNeeded(args);
					$log.log.apply($log, args);
				},
				
				warn: function () {
					
					var args = _.toArray(arguments);
					
					addPrefixIfNeeded(args);
					$log.warn.apply($log, args);
				},
				
				debug: function () {
					var args = _.toArray(arguments);
					
					addPrefixIfNeeded(args);
					
					if ($log.debug) {
						$log.debug.apply($log, args);
					}
					else {
						$log.info.apply($log, args);
					}
				}
			};
		};
	})
	
	.provider('socketEventHandler', function () {
		
		var DEFAULTS = {
				
		};
		
		var EVENT =  {
			CONNECT: 'socket.connect',
			CONNECTING: 'socket.connecting',
			DISCONNECT: 'socket.disconnect',
			RECONNECT: 'socket.reconnect',
			RECONNECTING: 'socket.reconnecting',
			CONNECT_FAIL: 'socket.connect_fail',
			RECONNECT_FAIL: 'socket.reconnect_fail',
			ERROR: 'socket.error'
		};
			
		var that = this;
		
		// Configurable stuff via the provider
		this.protocol = null;
		this.host = null;			
		this.port = null;
		this.options = null;
		
		// Implementation
		this.socket = null;
		
		this.$get = function ($location, $rootScope, logger) {
			
			if (this.socket === null) {
				
				var cstring = this.protocol && this.host && this.port ? 
						this.protocol + '://' + this.host + ':' + this.port : '';
				
				this.socket = io.connect(cstring, angular.extend({}, DEFAULTS, this.options || {}));
				
				this.socket.on('connect', function () {
					logger.info('socketEventHandler: socket connected successfully');
					$rootScope.$broadcast(EVENT.CONNECT);
					$rootScope.$apply();
				});
				
				this.socket.on('connecting', function () {
					logger.info('socketEventHandler: attempting connection');
					$rootScope.$broadcast(EVENT.CONNECTING);
					$rootScope.$apply();
				});
				
				this.socket.on('disconnect', function () {
					logger.info('socketEventHandler: disconnected');
					$rootScope.$broadcast(EVENT.DISCONNECT);
					$rootScope.$apply();
				});
				
				this.socket.on('reconnect', function () {
					logger.info('socketEventHandler: socket reconnected successfully');
					$rootScope.$broadcast(EVENT.RECONNECT);
					$rootScope.$apply();
				});
				
				this.socket.on('reconnecting', function () {
					logger.info('socketEventHandler: socket attempting reconnection');
					$rootScope.$broadcast(EVENT.RECONNECTING);
					$rootScope.$apply();
				});
				
				this.socket.on('connect_fail', function () {
					logger.error('socketEventHandler: could not connect');
					$rootScope.$broadcast(EVENT.CONNECT_FAIL);
					$rootScope.$apply();
				});
				
				this.socket.on('reconnect_fail', function () {
					logger.error('socketEventHandler: could not reconnect');
					$rootScope.$broadcast(EVENT.RECONNECT_FAIL);
					$rootScope.$apply();
				});
				
				this.socket.on('error', function () {
					logger.error('socketEventHandler: an error occured');
					$rootScope.$broadcast(EVENT.ERROR);
					$rootScope.$apply();
				});
			}
			
			return {

				event: EVENT,
				
				/**
				 * 
				 * @param eventName
				 * @param handler
				 * @returns
				 */
				on: function (eventName, handler) {
					logger.info('socketEventHandler: registering callback for "' + eventName + '" event');
					that.socket.on(eventName, handler);
				},
				
				/**
				 * 
				 * @param eventName
				 * @param data
				 * @returns
				 */
				emit: function (eventName, data) {
					logger.info('socketEventHandler: emitting event "' + eventName + '"');
					that.socket.emit(eventName, data);
				}
			};
		};
	
	});
