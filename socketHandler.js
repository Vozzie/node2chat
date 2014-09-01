
module.exports = function(server) {
	io = require('socket.io').listen(server, {log: false})
	io.sockets.on('connection', connection)
}

function connection(socket) {

	socket.on('disconnect', function() {
		console.log('disconnect');
		cleanupSocket(socket);
		socket = null;
    });
  
	var rooms = ['shibby'];
	for(var room in io.sockets.manager.rooms) {
		if(room !== '' && !io.sockets.manager.rooms[room].hidden){
			rooms.push(room.substr(1));
		}
	}
	rooms.sort();
	socket.emit('room_list', rooms);
  
	socket.on('message', function(data) {
		try {
			io.sockets.sockets[data.id].emit('message', data);
		} catch ( ex ) {
			console.log('message exception');
			console.log(ex);
		}
	});
	
	socket.on('enter_room', function (data) {
		try {
			// Validate input
			if(!data 
			|| data.room === undefined 
			|| data.user === undefined 
			|| data.key === undefined
			|| data.hidden === undefined
			|| !(/^[a-z]{4,20}$/g).test(data.room)
			|| !(/^[A-Za-z][a-z]{2,19}$/g).test(data.user)
			) {
				socket.disconnect();
				return;
			}

			// did socket already join a room?
			if(socket.room && socket.room !== undefined) {
				socket.disconnect();
				return;
			}

			// get the users, returns null if name already in room
			var users = getClients(data.user.toLowerCase(), io.sockets.clients(data.room));
			// name already in room
			if(!users) {
				socket.emit('login', {success: false, message: 'Enter a different name.'});
				return;
			}

			// store socket info
			socket.user = data.user;
			socket.room = data.room;
			socket.key = data.key;
			
			var exists = false;
			for(var room in io.sockets.manager.rooms) {
				if(room !== '' && data.room === room.substr(1)){	
					exists = true;
				}
			}
	
			// join room
			socket.join(data.room, function() {
				if(!exists) {
					io.sockets.manager.rooms['/' + data.room].hidden = data.hidden;
				} 
			});
			
			// send users to client
			socket.emit('login', {success: true, room: data.room, user: data.user, users: users});
			
			// broadcast info to other users in room
			var info = {user: data.user, key: data.key, id: socket.id};
			socket.broadcast.to(data.room).emit('room_enter', info);
			
		} catch ( ex ) {
			console.log('socket.on("enter") exception: ' + ex.toString());
			socket.disconnect();
		}		
	});
}

function cleanupSocket(socket) {
	if(socket.room && socket.room !== undefined) {
		socket.broadcast.to(socket.room).emit('room_leave', socket.user);
		socket.leave(socket.room);
		socket.room = null;
	}
}

function getClients(lowerName, clients) {
	var result = [];
	for(var i = 0; i < clients.length; i++) {
		if(clients[i].user.toLowerCase() == lowerName) {
			return null;
		}
		result.push({user: clients[i].user, key: clients[i].key, id: clients[i].id });
	}
	return result;
}