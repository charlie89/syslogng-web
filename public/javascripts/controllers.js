angular.module('syslogng-web')
	.controller('MainController', function ($scope, $log, $http, $timeout) {
		$scope.status = 'Retrieving log messages...';
		
		var cancelPoll = null;
		
		var pollFn = function() {
		    cancelPoll = $timeout(function updateLogs() {
		    	
		    	$http.get('/api/messages').success(function (data) {
					$scope.status = '';
					$scope.messages = data.messages;
					$scope.host = 'saturn.trd';
				});
		    	
		    	cancelPoll = $timeout(updateLogs, 10000);
		    }, 10000);
		};
		
		$scope.$on('$destroy', function () {
			$timeout.cancel(cancelPoll);
		});
	
		// Start polling
		pollFn();
	});