
var express = require('express');
var http = require('http');
var ioFactory = require('socket.io');
//var ajaxFactory = require('./ajax');
var chatFactory = require('./chat');

var app = express();
var server = http.Server(app);
var io = ioFactory(server);
//var ajax = ajaxFactory(app);
var chat = chatFactory(io);

//console.log(chat);
var port = process.argv[2] || 9000; 

app.get('/', function(req, res) { res.sendFile(__dirname + '/public/chat.htm'); });
app.use(express.static(__dirname + '/public'));
	
server.listen(parseInt(port, 10), function() {
	console.log("Server running at localhost:" + port + "\nCTRL + C to shutdown");
});
