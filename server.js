
var server = require('http').createServer(handler),
	socket = require('./socketHandler')(server),
	url = require("url"),
    path = require("path"),
    fs = require("fs")

var port = process.argv[2] || 9000;

var mimeTypes = {
	"js" : "application/javascript",
	"htm": "text/html",
	"css": "text/css",
	"png": "image/png",
	"swf": "application/x-shockwave-flash",
	"": "application/octet-stream"
};

function handler(request, response) {

	var uri = url.parse(request.url).pathname,
		filename = path.join(process.cwd(), uri);

	fs.exists(filename, function(exists) {
	
		if(!exists) {
			response.writeHead(404, {"Content-Type": "text/plain"});
			response.write("404 Not Found\n");
			response.end();
			return;
		}

		if (fs.statSync(filename).isDirectory()) filename += '/chat.htm';

		fs.readFile(filename, "binary", function(err, file) {
		
			if(err) {        
				response.writeHead(500, {"Content-Type": "text/plain"});
				response.write(err + "\n");
				response.end();
				return;
			}

			var extension = filename.split(".");
			extension = extension[extension.length - 1] || "";
			response.writeHead(200, {"Content-Type": mimeTypes[extension] || mimeTypes[""]});
			response.write(file, "binary");
			response.end();
		
		});
	});
};

server.listen(parseInt(port, 10), function() {
	console.log("Server running at localhost:" + port + "\nCTRL + C to shutdown");
});