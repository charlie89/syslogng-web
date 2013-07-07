angular.module('syslogng-web', [])
	
	// server name to display on page
	.value('serverName', 'localhost')
	
	.config(function ($locationProvider, $routeProvider) {
		$locationProvider.html5mode = false;
		$locationProvider.hashPrefix = '!';
		
		$routeProvider
			.when('/', {
				controller: 'MainController',
				templateUrl: '/views/main',
				resolve: {
					pkg: function ($http, $q) {
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