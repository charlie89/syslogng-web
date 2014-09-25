"use strict";

angular.module("syslogng-web")
	.provider('mongoLogMessageSource', function () {
		
		
		this.$get = function (socketEventHandler, logger, $q, $timeout, $http) {
		
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
				
				fetchAll: function (page, count) {
					return $http.get('/api/messages', {
						from: (page - 1) * count,
						count: count
					});
				}
			};
		};
	});
