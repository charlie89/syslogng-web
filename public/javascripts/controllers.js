angular.module('syslogng-web')

	.controller('MainController', function ($scope, $location, $timeout, $http, socketEventHandler, logger, config, pkg) {
		
		var MAX_MESSAGES_COUNT = 1000;
		 
		$scope.pkg = pkg;
		$scope.config = config;
		
		// log messages
		$scope.messages = [];
		$scope.sortBy = null;
		$scope.sortDirection = -1;
		
		$scope.setSortField = function (field) {
			$scope.sortBy = field;
			$scope.filterMessages();
		};
		
		$scope.filterMessages = function () {
			
			var _msg = $scope.messages;
			
			// array bounds to get the correct slice
			var start = ($scope.page - 1) * $scope.perPage;
			
			if (start < 0) {
				start = 0;
			}
			
			var end = start + $scope.perPage;
			
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
			logger.log('MainController: searching for "' + $scope.filter + '"...');
			searching = true;
			var result = (function () {
				var arr = [];
				var refs = index.search($scope.filter);
				
				angular.forEach(refs, function (v) {
					arr.push(_.first(_.where($scope.messages, {
						_id: v.ref
					})));
				});
				
				return arr;
			}());
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
		$scope.page = $location.search().page ? parseInt($location.search().page, 10) : 1;
		
		// search attributes
		var searching = false;
		
		$scope.search = null;
		$scope.filter = null;
		
		function createFuse() {
			return new Fuse($scope.messages, {
				keys: ['PROGRAM', 'PRIORITY', 'MESSAGE']
			});
		}
		
		var fuse = createFuse();
		
		var index = lunr(function () {
			this.field('PROGRAM');
			this.field('PRIORITY');
			this.field('MESSAGE', { boost: 10 });
			this.ref('_id');
		});
		
		function feedIndex() {
			angular.forEach($scope.messages, function (v) {
				index.add(v);
			});
		}
		
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
			
			if (newValue !== oldValue) {
				for (var i = 0; i < Math.abs((oldValue.length || 0) - (newValue.length || 0)); i++) {
					logger.info("adding log message to search index", $scope.messages[i]);
					index.add($scope.messages[i]);
				}
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
			
			if (newValue.page < 1) {
				$location.search({
					page: 1
				});
				
				return;
			}
			
			$scope.page = parseInt(newValue.page, 10);
			
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
					$scope.filter = $scope.search;
					$scope.filterMessages();
				}
				else {
					searchCancel = $timeout(searchTimer, 200);
				}
			}, 200);
		});
		
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
			
			logger.info("MainController::socketEventHandler: Receiving full list of log messages (" + data.length + ")");
			
			$scope.$apply(function (s) {
				s.messages = data;
				s.filterMessages();
			});
		});
	});