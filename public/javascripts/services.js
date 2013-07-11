angular.module('syslogng-web')

	.provider('logger', function () {
		
		var that = this;
		
		this.prefix = '';
		
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
				}
			};
		};
	})
	
	.provider('socketEventHandler', function () {
		
		var DEFAULTS = {
				
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
					$rootScope.$broadcast('socket.connect');
					$rootScope.$apply();
				});
				
				this.socket.on('connecting', function () {
					logger.info('socketEventHandler: attempting connection');
					$rootScope.$broadcast('socket.connecting');
					$rootScope.$apply();
				});
				
				this.socket.on('disconnect', function () {
					logger.info('socketEventHandler: disconnected');
					$rootScope.$broadcast('socket.disconnect');
					$rootScope.$apply();
				});
				
				this.socket.on('reconnect', function () {
					logger.info('socketEventHandler: socket reconnected successfully');
					$rootScope.$broadcast('socket.reconnect');
					$rootScope.$apply();
				});
				
				this.socket.on('reconnecting', function () {
					logger.info('socketEventHandler: socket attempting reconnection');
					$rootScope.$broadcast('socket.reconnecting');
					$rootScope.$apply();
				});
				
				this.socket.on('connect_fail', function () {
					logger.error('socketEventHandler: could not connect');
					$rootScope.$broadcast('socket.connect_fail');
					$rootScope.$apply();
				});
				
				this.socket.on('reconnect_fail', function () {
					logger.error('socketEventHandler: could not reconnect');
					$rootScope.$broadcast('socket.reconnect_fail');
					$rootScope.$apply();
				});
				
				this.socket.on('error', function () {
					logger.error('socketEventHandler: an error occured');
					$rootScope.$broadcast('socket.error');
					$rootScope.$apply();
				});
			}
			
			return {
				/**
				 * 
				 * @param eventName
				 * @param handler
				 * @returns
				 */
				on: function (eventName, handler) {
					that.socket.on(eventName, handler);
				},
				
				/**
				 * 
				 * @param eventName
				 * @param data
				 * @returns
				 */
				emit: function (eventName, data) {
					that.socket.emit(eventName, data);
				}
			};
		};
	
	});