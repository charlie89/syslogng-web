angular.module('syslogng-web')
	.controller('MainController', function ($scope, $log, $location) {
		
		$scope.host = 'saturn.trd';		
		$scope.messages = [];
		$scope.max = 5;
		
		$scope.filterMessages = function () {
			return _.first($scope.messages, $scope.max);
		};
		
		var socket = io.connect('http://' + $location.host() + ':' + $location.port());
		
		socket.on('message', function (data) {
			$scope.$apply(function (s) {
				s.status = '';				
				s.messages.unshift(data);
			});
		});
	});