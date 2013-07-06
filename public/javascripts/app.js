angular.module('syslogng-web', [])
	.config(function ($locationProvider, $routeProvider) {
		$locationProvider.html5mode = false;
		$locationProvider.hashPrefix = '!';
		
		$routeProvider
			.when('/', {
				controller: 'MainController',
				templateUrl: 'views/main.html'
			});
	})
	.run(function ($rootScope) {
		
	});