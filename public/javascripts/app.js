angular.module('syslogng-web')
	
	// server name to display on page
	.value('serverName', 'localhost')
	
	.config(function ($locationProvider, $routeProvider, socketEventHandlerProvider) {
		$locationProvider.html5mode = false;
		$locationProvider.hashPrefix = '!';
		
		socketEventHandlerProvider.options = {
			syncDisconnectOnUnload: true
		};
		
		$routeProvider
			.when('/', {
				controller: 'MainController',
				templateUrl: '/views/main',
				reloadOnSearch: false
			});
	})
	.run(function ($rootScope) {
		
	});