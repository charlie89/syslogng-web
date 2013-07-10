angular.module('syslogng-web')

	.controller('MainController', function ($scope, $log, $location, $timeout, serverName, socketEventHandler) {
				
		$scope.host = serverName;		
		$scope.messages = [];
		$scope.perPage = 10;
		$scope.numPages = 0;
		$scope.page = $location.search().page ? parseInt($location.search().page) : 1;
		$scope.search = null;
		$scope.filter = null;
		
		var searching = false;
		
		function createFuse() {
			return new Fuse($scope.messages, {
				keys: ['PROGRAM', 'PRIORITY', 'MESSAGE'],
				threshold: 0.00000001,
				distance: 0.000000001
			});
		}
		
		var fuse = createFuse();
		
		$scope.showSettings = false;
		$scope.toggleSettings = function () {
			$scope.showSettings = !$scope.showSettings;
		};
		
		$scope.filterMessages = function () {
			
			if ($scope.filter === null || $scope.filter === '') {
				var start = ($scope.page - 1) * $scope.perPage,
					end = start + $scope.perPage;
				
				return $scope.messages.slice(start, end);
			}
			
			// Search
			searching = true;
			var result = fuse.search($scope.filter);
			searching = false;
			
			$scope.numPages = Math.ceil(result.length / $scope.perPage);
			
			if ($scope.page > $scope.numPages) {
				//$location.search('page', 1);
			}
			
			var start = ($scope.page - 1) * $scope.perPage,
				end = start + $scope.perPage,
				slice = result.slice(start, end);
			
			return _.sortBy(slice, 'DATE').reverse();
		};
		
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
			
			$scope.numPages = Math.ceil(newValue.length / $scope.perPage);
			
			if (newValue !== oldValue) {
				fuse = createFuse();
			}
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
		}, true);
		
		// Don't trigger a search at each keystroke. Wait at least 200ms
		// before checking if something changed. If not, then trigger the search.
		var searchCancel = null;
		$scope.$watch("search", function (newValue, oldValue) {
			
			if (newValue === null || newValue === '') {
				return;
			}
			
			if (newValue === oldValue) {
				return;
			}
			
			searchCancel = $timeout(function searchTimer() {
				if (!$timeout.cancel(searchCancel)) {
					$scope.filter = newValue;
				}
				else {
					searchCancel = $timeout(searchTimer, 200);
				}
			}, 200);
		});
		
		var socketPhases = {
			CONNECTING: 0,
			CONNECTED: 1,
			DISCONNECTED: 2,
			ERROR: 3
		};
		
		$scope.phases = socketPhases;
		$scope.phase = null;
		
		$scope.$on('socket.connecting', function () {
			$scope.phase = socketPhases.CONNECTING;
		});
		
		$scope.$on('socket.reconnecting', function () {
			$scope.phase = socketPhases.CONNECTING;
		});
		
		$scope.$on('socket.connect', function () {
			$scope.phase = socketPhases.CONNECTED;
		});
		
		$scope.$on('socket.reconnect', function () {
			$scope.phase = socketPhases.CONNECTED;
		});
		
		$scope.$on('socket.error', function () {
			$scope.phase = socketPhases.ERROR;
		});
		
		$scope.$on('socket.disconnect', function () {
			$scope.phase = socketPhases.DISCONNECTED;
		});
		
		// Get log messages as they come
		socketEventHandler.on('log', function (data) {
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
						}
					});
				}
				else {
					s.messages.unshift(data);
				}
				
			});
		});
		
		// Get initial list of messages
		socketEventHandler.on('logs', function (data) {
			$scope.$apply(function (s) {
				s.messages = _.union(data, s.messages);
			});
		});
	});