angular.module('syslogng-web')

	.controller('MainController', function ($scope, $location, $timeout, $http, $sce, $filter, $q, socketEventHandler, logger, config, pkg, mongoLogMessageSource) {
		
		var MAX_MESSAGES_COUNT = 1000;
		
		// trust html in log messages
		$scope.trustedHTML = function (input) {
			var html = arguments.length > 1 && arguments[1] === true ? $filter('highlight')(input, $scope.search) : input;			
			return $sce.trustAsHtml(html);
		};
		 
		$scope.pkg = pkg;
		$scope.config = config;
		
		// log messages
		$scope.messages = [];
		$scope.sortBy = 'DATE';

		// Sorting (WIP)
		$scope.sortReverse = false;
		
		$scope.setSortField = function (field) {
			$scope.sortBy = field;
			$scope.sortReverse = !$scope.sortReverse;
			logger.info('Sorting by ', $scope.sortBy, $scope.sortReverse);
		};

		// pagination attributes
		$scope.perPage = 25;
		$scope.numPages = 0;
		$scope.page = $location.search().page ? parseInt($location.search().page, 10) : 1;
		
		// search attributes		
		$scope.search = null;
		
		// socket status	
		$scope.phases = socketEventHandler.event;
		$scope.phase = null;
		$scope.statusMessage = 'Initializing...';		
		
		$scope.getClass = function (message) {
			return 'log-' + message.PRIORITY;
		};
		
		$scope.pagesRange = function () {
			return _.range(1, $scope.numPages + 1, 1);
		};
		
		$scope.goToPage = function (page) {
			$location.search({
				page: page
			});
		};
		
		$scope.nextPage = function () {
			if ($scope.page < $scope.numPages) {
				$location.search({
					page: $scope.page + 1
				});
			}
		};
		
		$scope.prevPage = function () {
			if ($scope.page > 1) {
				$location.search({
					page: $scope.page - 1
				});
			}
		};
		
		$scope.$watch("messages", function (newValue, oldValue) {
			
			if (newValue.length === oldValue.length) {
				return;
			}
			
			// Prevent a infinitely growing message list
			if (newValue.length >= MAX_MESSAGES_COUNT) {
				// pop out last element
				do {
					newValue.pop();
				} while (newValue.length >= MAX_MESSAGES_COUNT);
			}
			
			$scope.numPages = Math.ceil(newValue.length / $scope.perPage);
		}, true);
		
		$scope.$watch(function () {
			return $location.search();
		}, function (newValue, oldValue) {
			if (!newValue.page) {
				$scope.page = 1;
				return;
			}

			if (newValue.page === oldValue.page) {
				return;
			}
			
			if (newValue.page < 1) {
				$location.search({
					page: 1
				});
				
				return;
			}
			
			$scope.page = parseInt(newValue.page, 10);
		}, true);
		
		$scope.$on(socketEventHandler.event.CONNECTING, function () {
			$scope.phase = socketEventHandler.event.CONNECTING;
			$scope.statusMessage = 'Connecting to log data source...';
		});
		
		$scope.$on(socketEventHandler.event.RECONNECTING, function () {
			$scope.phase = socketEventHandler.event.CONNECTING;
			$scope.statusMessage = 'Reconnecting to log data source...';
		});
		
		$scope.$on(socketEventHandler.event.CONNECT, function () {
			$scope.phase = socketEventHandler.event.CONNECT;
			$scope.statusMessage = null;
		});
		
		$scope.$on(socketEventHandler.event.RECONNECT, function () {
			$scope.phase = socketEventHandler.event.CONNECT;
			$scope.statusMessage = null;
		});
		
		$scope.$on(socketEventHandler.event.ERROR, function () {
			$scope.phase = socketEventHandler.event.ERROR;
			$scope.statusMessage = 'Error connecting to log data source...';
		});
		
		$scope.$on(socketEventHandler.event.DISCONNECT, function () {
			$scope.phase = socketEventHandler.event.DISCONNECT;
			$scope.statusMessage = 'Disconnected from log data source...';
		});
		
		$scope.clear = function () {
			
			logger.info("clearing all log messages");
			
			$scope.search = null;
			$scope.messages = [];
			$scope.page = 1;
		};
		
		$scope.refresh = function () {
			
			logger.info("refreshing log messages");
			
			mongoLogMessageSource.fetchAll().then(function (data) {
				$scope.messages = data;
			}, function (error) {
				logger.error(error);
			});
		};
		
		// Get log messages as they come		
		mongoLogMessageSource.messageReceived(function (data) {						

			data.ID = data._id;

			$scope.$apply(function (s) {
				s.status = '';							
				s.messages.unshift(data);
			});
		});
		
		mongoLogMessageSource.fetchAll().then(function (data) {

			angular.forEach(data, function (val, i) {
				val.ID = val._id;
			});

			$scope.messages = data;
		}, function (error) {
			logger.error(error);
		});
	});
