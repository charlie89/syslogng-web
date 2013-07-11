angular.module('syslogng-web')
	
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
			
			var result = fuzzy.filter(terms, [input], options);
			
			if (result.length) {				
				return result[0].score >= MIN_SCORE ? result[0].string : result[0].original;
			}
			
			return input;		
		};
	});