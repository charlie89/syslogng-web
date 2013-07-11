angular.module('syslogng-web')
	
	.filter('highlight', function () {
		
		var term = null,
			regexp = null;
		
		return function (input, terms) {
			
			if (!input || !terms || terms === '') {
				return input;
			}
			
			if (term !== terms) {
				regexp = new RegExp('(' + terms + ')', 'gi');
				term = terms;
			}
			
			return input.replace(regexp, "<em class='highlight'>\$1</em>");			
		};
	});