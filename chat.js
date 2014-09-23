
var chatFactory = function(io)
{
	// Rooms with lists of users
	var rooms = { 
		"lounge": {
			hidden: false,
			users: []
		}
	};

	var nsp = ((arguments[1] === '/') ? io : io.of(arguments[1] || '/chat'));
	
	var chat = 
	{
		get nsp() 
		{ 
			return nsp; 
		},
		get rooms() 
		{ 
			return rooms; 
		}
	};

	function isValidNickName(nick) { return (/^[A-Za-z][a-z]{2,19}$/g).test(nick); }
	
	function leaveRoom(socket) {
		if(socket.room && socket.room !== undefined) {
			if(socket.room && socket.room !== undefined) {
				var room = rooms[socket.room];
				if(room) {
					for(var i = 0; i < room.users.length; i++) {
						if(room.users[i].id === socket.id) {
							room.users.splice(i, 1);
							break;
						}
					}
					if(room.users.length == 0 && socket.room != 'lounge') {
						delete rooms[socket.room];
					}
				}
				nsp.to(socket.room).emit('leave', {id: socket.id } );
				socket.leave(socket.room);
				socket.room = null;
			}
		}
	}
	
	function sendRooms(socket) {
		var list = [];
		for(var room in rooms)
			if(!rooms[room].hidden)
				list.push(room);
		list.sort();
		socket.emit('rooms', list);
	}
	
	// Event handlers
	nsp.on('connection', function(socket) {

		socket.on('disconnect', function() {
			leaveRoom(socket);
			socket = null;
		});
		
		socket.on('kick', function(id){
			if(socket.id !== id)
			{				
				var users = rooms[socket.room].users;
				for(var i = 0; i < users.length; i++)
				{
					if(users[i].id == socket.id)
					{
						if(users[i].owner) 
						{
							socket.broadcast.to(socket.room).emit('kick', id); // {id: id} );
							if(nsp.connected[id]) nsp.connected[id].disconnect();
						}
						break;
					}
				}
			}
		});
		
		socket.on('logoff', function() {
			leaveRoom(socket);
			socket.emit('logoff');
		});

		socket.on('logon', function(data) {
			try {
				
				// console.log('logon', data);
				
				// Validate input
				// todo: test key? 
				if(!data 
				|| data.room === undefined 
				|| data.name === undefined 
				|| data.key === undefined
				|| data.hidden === undefined
				|| !(/^[a-z]{4,20}$/g).test(data.room)
				|| !isValidNickName(data.name)
				) {
					console.log('Logon failed, invalid data.');
					socket.disconnect();
					return;
				}
				// Did socket already join a room?
				if(socket.room && socket.room !== undefined) {
					console.error('Invalid state, user allready entered a room.');
					socket.disconnect();
					return;
				}
				// Get room and users
				var owner = !(rooms[data.room] && rooms[data.room] !== undefined) ;
				var room = owner ? (rooms[data.room] = {hidden: data.hidden, users: []}) : rooms[data.room];
				var users = room.users;
				for(var i = 0; i < users.length; i++)
				{
					if(users[i].name === data.name)
					{
						console.log('Logon failed, name in use.');
						socket.emit('logon', {success: false, message: 'Name in use.\nEnter a different name.'});
						return;
					}
				}
				// Create new room user
				var user = { owner: owner, key: data.key, name: data.name, id: socket.id };
				// Send new user to other users in room
				nsp.to(data.room).emit('enter', user);
				// Add user to users
				users.push(user);
				// Join socket.io room
				socket.join(data.room, function() {
					// Remember room
					socket.room = data.room;
					// Send users and info to client
					socket.emit('logon', {
						success: true, 
						id: socket.id,
						name: data.name, 
						room: data.room,  
						owner: owner,
						users: users
					});
				});
				
			} catch ( ex ) {
				console.error('socket.on(\'logon\') exception: ', ex);
			}
		});

		socket.on('message', function(data) {
			var target = data.target;
			delete data['target'];
			socket.broadcast.to(target).emit('message', data);
		});
		
		socket.on('nick', function(nick) {
			console.log('nick', nick);
			if(isValidNickName(nick) && socket.room) {
				var users = rooms[socket.room].users;
				for(var i = 0; i < users.length; i++)
					if(users[i].name == nick) 
						{ socket.emit('notify', 'Nick in use');	return; }
				for(var i = 0; i < users.length; i++)
				{
					if(users[i].id == socket.id) {
						users[i].name = nick;
						socket.broadcast.to(socket.room).emit('nick', {id: socket.id, nick: nick} );
						socket.emit('nick', {id: socket.id, nick: nick})
						return;
					}
				}
			}else socket.disconnect();
		});
		
		socket.on('private', function(data) {
			var target = data.target;
			delete data['target'];
			socket.broadcast.to(target).emit('private', data);
		});
		
		sendRooms(socket);
	});

	return chat;
}

exports = module.exports = chatFactory;


/*

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
*/