angular.module('syslogng-web')
	.controller('MainController', function ($scope, $log, $location, serverName, pkg) {
		
		$scope.pkg = pkg;
		$scope.host = serverName;		
		$scope.messages = [];
		$scope.max = 10;
		
		$scope.showSettings = false;
		$scope.toggleSettings = function () {
			$scope.showSettings = !$scope.showSettings;
		};
		
		$scope.filterMessages = function () {
			return _.first($scope.messages, $scope.max);
		};
		
		$scope.getClass = function (message) {
			return 'log-' + message.PRIORITY;
		};
		
		var socket = io.connect('http://' + $location.host() + ':' + $location.port());
		
		socket.on('message', function (data) {
			$scope.$apply(function (s) {
				s.status = '';				
				s.messages.unshift(data);
			});
		});
	});