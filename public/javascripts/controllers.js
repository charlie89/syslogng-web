angular.module('syslogng-web')
	.controller('MainController', function ($scope, $log, $location, serverName, pkg) {
		
		// scope variables
		$scope.pkg = pkg;
		$scope.host = serverName;		
		
		// log messages
		$scope.messages = [];
		
		// settings
		$scope.max = 10;
		$scope.showSettings = false;
		$scope.toggleSettings = function () {
			$scope.showSettings = !$scope.showSettings;
		};
		
		// scope methods
		$scope.filterMessages = function () {
			return _.first($scope.messages, $scope.max);
		};
		
		$scope.getClass = function (message) {
			return 'log-' + message.PRIORITY;
		};
		
		// socket.io
		var socket = io.connect('http://' + $location.host() + ':' + $location.port());
		
		socket.on('message', function (data) {
			$scope.$apply(function (s) {
				s.status = '';				
				s.messages.unshift(data);
			});
		});
	});