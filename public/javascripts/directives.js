angular.module('syslogng-web')
	.directive('popover', ['$window', function ($window) {

		return {
			restrict: 'E',
			transclude: true,
			templateUrl: 'views/template/popover.html',
			scope: {
				title: '@',
				position: '@',
				trigger: '@'
			},
			link: function (scope, element, attrs) {

				var trigger = $(scope.trigger),
					position = trigger.offset(),
					w = trigger.width(),
					h = trigger.height(),
					popoverElement = element.find('.popover');
				
				scope.visible = false;
				
				scope.style = {
					display: 'none',
					top: position.top + h + 5,
					left: position.left + w - 150,
					width: 200
				};
				
				$(scope.trigger).on('click', function () {
					scope.$apply(function (s) {
						s.visible = !s.visible;
					});
				});
				
				scope.$watch('visible', function (newVal, oldVal) {
					if (newVal && newVal !== oldVal) {
						scope.style.display = 'block';
					}
					else if (!newVal && newVal !== oldVal) {
						scope.style.display = 'none';					
					}
				});

				$($window).on('resize', function (e) {
					scope.$apply(function (s) {
						var position = trigger.offset();
						s.style.top = position.top + trigger.height() + 5;
						s.style.left = position.left + trigger.width() - 150;
					});			
				});
			}
		}
	}]);
