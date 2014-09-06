"use strict";

angular.module("syslogng-web")
	.provider('mongoLogMessageSource', function () {
		
		
		this.$get = function (socketEventHandler, logger, $q, $timeout) {
		
			var messages = [];
			var onMessageReceivedCallbacks = [];
			
			return {
				messageReceived: function (callback) {
					
					if (!angular.isFunction(callback)) {
						logger.error('MongoLogMessageSource::messageReceived: supplied callback is not a function');
						return;
					}
					
					var doBind = !onMessageReceivedCallbacks.length;
					
					onMessageReceivedCallbacks.push(callback);
					
					if (doBind) {
						socketEventHandler.on('log', function (message) {								
							angular.forEach(onMessageReceivedCallbacks, function (cb) {
								cb.apply(cb, [message]);
							});
						});
					}
				},
				
				fetchAll: function () {
					var deferred = $q.defer();

					socketEventHandler.on('logs', function (data) {
						if (!messages.length) {
							deferred.resolve(data);
						}
						else {
							deferred.resolve(data);
						}
					});
					
					return deferred.promise;
				}
			};
		};
	});
