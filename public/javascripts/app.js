angular.module('syslogng-web')
	
	.config(function ($locationProvider, $routeProvider, socketEventHandlerProvider, loggerProvider) {
		
		$locationProvider.html5mode = false;
		$locationProvider.hashPrefix = '!';
		
		// do a synchronous disconnect call upon window unload
		socketEventHandlerProvider.options = {
			syncDisconnectOnUnload: true
		};
		
		// prefix to prepend to all log messages sent through the logger service
		loggerProvider.prefix = 'syslogng-web';
			
		$routeProvider
			.when('/', {
				controller: 'MainController',
				templateUrl: '/views/main',
				reloadOnSearch: false,
				resolve: {
					
					config: function ($log, $http, $q) {
						var deferred = $q.defer();
						
						$http.get('/package.json').success(function (data) {
							deferred.resolve(data);
						});
						
						return deferred.promise;
					},
					
					pkg: function ($log, $http, $q) {
						var deferred = $q.defer();
						
						$http.get('/package.json').success(function (data) {
							deferred.resolve(data);
						});
						
						return deferred.promise;
					}
				}
			});
	})
	.run(function ($rootScope) {
		
	});