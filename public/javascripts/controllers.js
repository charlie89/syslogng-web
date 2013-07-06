angular.module('syslogng-web')
	.controller('MainController', function ($scope, $log, $http) {
		$scope.status = 'Retrieving log messages...';
		
		$http.get('/api/messages').success(function (data) {
			$scope.status = '';
			$scope.messages = data.messages;
			$scope.host = 'saturn.trd';
		});
	});