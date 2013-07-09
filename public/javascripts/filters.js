angular.module('syslogng-web')
	
	.filter('highlight', function () {
		
		return function (input, terms) {
			if (input && terms !== '' && terms !== null) {
				return input.replace(new RegExp('(' + terms + ')', 'gi'), "<em class='highlight'>\$1</em>");
			}
			
			return input;
		};
	});