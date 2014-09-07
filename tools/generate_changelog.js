"use strict";


var fs = require('fs');

// read changelog
console.log('reading changelog.json');
fs.readFile('../changelog.json', function (err, data) {
	if (err) {
		throw err;
	}
	
	// parse as json
	console.log('parsing json changelog');
	var json;
	try {
		json = JSON.parse(data);
	} catch (e) {
		throw e;
	}
	
	// create output file
	var output = "# CHANGELOG\n";
	
	// loop on every tag
	Object.keys(json).forEach(function (tag) {
		output += '## ' + tag + '\n';
		
		var tagData = json[tag] || [];
		
		console.log('writing ' + tagData.length + ' commit(s) for tag ' + tag);
		
		if (tagData && tagData.length) {
			// loop on each commit
			tagData.forEach(function(commit) {
				output += '*  ' + commit.message + ' ([' + commit.sha + '](http://github.com/nlaplante/syslogng-web/commit/' + commit.sha + '))\n';
			});
			
		}		
		
		output += '\n\n';
	});
	
	console.log('writing CHANGELOG.md');
	fs.writeFile('../CHANGELOG.md', output, function (err) {	
		if (err) {
			throw err;
		}
		
		console.log('finished');
	});
});

