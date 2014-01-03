angular.module('syslogng-web')
	
	.filter('from', function () {
		return function (input, start) {
			start = +start;
			return input.slice(start);
		};
	})

	.filter('highlight', function (logger) {
				
		var MIN_SCORE = 10;
		
		var options = {
				pre: '<em class="highlight">',
				post: '</em>'
		};
		
		return function (input, terms) {
			
			if (!input || !terms || terms === '') {
				return input;
			}
			
			return input.replace(terms, options.pre + '$&' + options.post);
		};
	});
