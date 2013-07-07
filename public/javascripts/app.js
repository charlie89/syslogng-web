angular.module('syslogng-web', [])
	
	// server name to display on page
	.value('serverName', 'saturn.trd')
	
	.config(function ($locationProvider, $routeProvider) {
		$locationProvider.html5mode = false;
		$locationProvider.hashPrefix = '!';
		
		$routeProvider
			.when('/', {
				controller: 'MainController',
				templateUrl: '/views/main'
			});
	})
	.run(function ($rootScope) {
		
	});