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
				reloadOnSearch: false
			});
	})
	.run(function ($rootScope) {
		
	});