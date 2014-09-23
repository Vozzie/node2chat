
if(!window.console || window.console === undefined) {
	window.console = { log: function(){} };
}

window.onerror = function(errorMsg, url, lineNumber) {
	console.log('error: "' + errorMsg + '"\nfile: ' + url + '\nline: ' + lineNumber);
};