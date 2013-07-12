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
				reloadOnSearch: false
			});
	})
	.run(function ($rootScope) {
		
	});