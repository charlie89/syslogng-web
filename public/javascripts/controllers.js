angular.module('syslogng-web')

	.controller('MainController', function ($scope, $location, $timeout, $http, serverName, socketEventHandler, logger) {
		
		$http.get('/package.json').success(function (data) {
			$scope.pkg = data;
		});
		
		$http.get('/config.json').success(function (data) {
			$scope.config = data;
		});
				
		// host name to display
		$scope.host = serverName;		
		
		// log messages
		$scope.messages = [];
		$scope.sortBy = null;
		$scope.sortDirection = -1;
		
		$scope.setSortField = function (field) {
			$scope.sortBy = field;
		};
		
		$scope.filterMessages = function () {
			
			var _msg = $scope.messages;
			
			// array bounds to get the correct slice
			var start = ($scope.page - 1) * $scope.perPage,
				end = start + $scope.perPage;
			
			// if no search filter specified, feed off directly from the message source
			if ($scope.filter === null || $scope.filter === '') {
				
				$scope.numPages = Math.ceil(_msg.length / $scope.perPage);
				
				if ($scope.sortBy !== null) {
					_msg = _.sortBy(_msg, $scope.sortBy);
					
					if ($scope.sortDirection === -1) {
						$scope.sortDirection = 1;
					}
					else {
						$scope.sortDirection = -1;
						_msg.reverse();
					}
				}
				
				// if not in bounds, return empty array
				if (start >= _msg.length || end >= _msg.length) {
					$scope.filteredMessages = [];
				}
				
				var slice = _msg.slice(start, end);
				
				$scope.filteredMessages = slice;
				
				return;
			}
			
			// Search			
			searching = true;
			var result = fuse.search($scope.filter);
			searching = false;
			
			$scope.numPages = Math.ceil(result.length / $scope.perPage);
			$scope.searchResultNum = result.length;
			
			if ($scope.page > $scope.numPages) {
				//$location.search('page', 1);
			}
			
			$scope.filteredMessages = _.sortBy(result.slice(start, end), 'DATE').reverse();
		};
		
		// pagination attributes
		$scope.perPage = 25;
		$scope.numPages = 0;
		$scope.page = $location.search().page ? parseInt($location.search().page) : 1;
		
		// search attributes
		var searching = false;
		
		$scope.search = null;
		$scope.filter = null;
		
		function createFuse() {
			return new Fuse($scope.messages, {
				keys: ['PROGRAM', 'PRIORITY', 'MESSAGE'],
				threshold: 0.00000001
			});
		}
		
		var fuse = createFuse();
		
		// socket status
		var socketPhases = {
				CONNECTING: 0,
				CONNECTED: 1,
				DISCONNECTED: 2,
				ERROR: 3
			};
		
		$scope.phases = socketPhases;
		$scope.phase = null;
		$scope.statusMessage = 'Initializing...';		
		
		$scope.getClass = function (message) {
			return 'log-' + message.PRIORITY;
		};
		
		$scope.pagesRange = function () {
			return _.range(1, $scope.numPages, 1);
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
			
			$scope.numPages = Math.ceil(newValue.length / $scope.perPage);
			
			if (newValue !== oldValue) {
				fuse = createFuse();
			}
			
			$scope.filterMessages();
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
			
			$scope.page = parseInt(newValue.page);
			
			$scope.filterMessages();
		}, true);
		
		// Don't trigger a search at each keystroke. Wait at least 200ms
		// before checking if something changed. If not, then trigger the search.
		var searchCancel = null;
		$scope.$watch("search", function (newValue, oldValue) {
			
			if (newValue === null || newValue === '') {
				$scope.filter = null;
				$scope.filterMessages();
				return;
			}
			
			if (newValue === oldValue) {
				return;
			}
			
			searchCancel = $timeout(function searchTimer() {
				if (!$timeout.cancel(searchCancel)) {
					$scope.filter = newValue;
					$scope.filterMessages();
				}
				else {
					searchCancel = $timeout(searchTimer, 200);
				}
			}, 200);
		});
		
		$scope.$on('socket.connecting', function () {
			$scope.phase = socketPhases.CONNECTING;
			$scope.statusMessage = 'Connecting to log data source...';
		});
		
		$scope.$on('socket.reconnecting', function () {
			$scope.phase = socketPhases.CONNECTING;
			$scope.statusMessage = 'Reconnecting to log data source...';
		});
		
		$scope.$on('socket.connect', function () {
			$scope.phase = socketPhases.CONNECTED;
			$scope.statusMessage = null;
		});
		
		$scope.$on('socket.reconnect', function () {
			$scope.phase = socketPhases.CONNECTED;
			$scope.statusMessage = null;
		});
		
		$scope.$on('socket.error', function () {
			$scope.phase = socketPhases.ERROR;
			$scope.statusMessage = 'Error connecting to log data source...';
		});
		
		$scope.$on('socket.disconnect', function () {
			$scope.phase = socketPhases.DISCONNECTED;
			$scope.statusMessage = 'Disconnected from log data source...';
		});
		
		// Get log messages as they come
		socketEventHandler.on('log', function (data) {
			
			logger.info(data);
			
			$scope.$apply(function (s) {
				s.status = '';			
				
				// We need to block addding new messages to the list until
				// the current search is done. If not, then the search
				// might return unrelated results.
				if (searching) {
					var stopWatch = s.$watch(function () {
						return searching;
					}, function (newValue) {
						if (!newValue) {
							stopWatch();
							s.messages.unshift(data);
							s.filterMessages();
						}
					});
				}
				else {
					s.messages.unshift(data);
					s.filterMessages();
				}
				
			});
		});
		
		// Get initial list of messages
		socketEventHandler.on('logs', function (data) {
			
			logger.info("Receiving full list of log messages (" + data.length + ")");
			
			$scope.$apply(function (s) {
				s.messages = data;
				s.filterMessages();
			});
		});
	});