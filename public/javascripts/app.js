angular.module('syslogng-web')
	
	// server name to display on page
	.value('serverName', 'localhost')
	
	.config(function ($locationProvider, $routeProvider, socketEventHandlerProvider, loggerProvider) {
		$locationProvider.html5mode = false;
		$locationProvider.hashPrefix = '!';
		
		socketEventHandlerProvider.options = {
			syncDisconnectOnUnload: true
		};
		
		loggerProvider.prefix = 'syslogng-web';
		
		$routeProvider
			.when('/', {
				controller: 'MainController',
				templateUrl: '/views/main',
				reloadOnSearch: false
			});
	})
	.run(function ($rootScope) {
		
	});