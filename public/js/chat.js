
var chatFactory = function () {
	// Private vars
	var socket = null;
	var subscribers = { '*' : [] };
	var ioevents = ['connect', 'connect_error', 'connect_timeout', 'disconnect', 'error', 
		'reconnect', 'reconnect_attempt', 'reconnect_error', 'reconnect_failed', 'reconnecting',
		'rooms', 'logon', 'logoff', 'enter', 'leave', 'message', 'private', 'nick', 'kick', 'notify'];
	var info = { };
	var crypto = { };

	var jse = (function() {
	
		var engine = null;

		var encrypt = function(message, key) {
			var e = new JSEncrypt();
			e.setPublicKey(key);
			var max = (((e.getKey().n.bitLength()+7)>>3)-11);
			var target = new Array(Math.ceil(message.length / max));
			for(var j = 0, k = 0; k < message.length; j++, k += max)
				target[j] = ((k + max) < message.length) 
					? e.encrypt(message.substr(k, max))
					: e.encrypt(message.substr(k));
			return target;		
		};
		
		var decrypt = function(data) {
			var result = new Array(data.length);
			for(var i = 0; i < data.length; i++)
				result[i] = engine.decrypt(data[i]);
			return result.join('');
		};
		
		var generate = function(keySize, callback) {
			engine = new JSEncrypt({ default_key_size: keySize });
			if(callback) engine.getKey(callback);
			else engine.getKey();
		};
		
		var test = function() {
			if(!engine) return false;
			var original = 'this is a test';
			var encrypted = engine.encrypt(original);
			return engine.decrypt(encrypted) === original;
		};
		
		return {
			get encrypt() { return encrypt; },
			get decrypt() { return decrypt; },
			get generate() { return generate; },
			get publicKey() { return engine.getPublicKey(); },
			get test() { return test; }
		};
	
	}());

	
	function encryptMessage(message, key) {
		var encrypt = new JSEncrypt();
		encrypt.setPublicKey(key);
		var maxLength = (((encrypt.getKey().n.bitLength()+7)>>3)-11);
		var target = new Array(Math.ceil(message.length / maxLength));
		for(var j = 0, k = 0; k < message.length; j++, k += maxLength)
			target[j] = ((k + maxLength) < message.length) 
				? encrypt.encrypt(message.substr(k, maxLength))
				: encrypt.encrypt(message.substr(k));
		return target;
	}

	function onMessage(message) 
	{
		for(var i = 0; i < message.data.length; i++)
			message.data[i] = crypto.engine.decrypt(message.data[i]);
		message.message = message.data.join('');
		delete message['data'];
		message.from = 'Unknown';
		for(var i = 0; i < info.users.length; i++)
			if(message.source === info.users[i].id) 
				{ message.from = info.users[i].name; break; }
		delete message['source'];
	}
	
	function testCrypto() 
	{
		if(!crypto.engine) return false;
		var original = 'this is a test';
		var encrypted = crypto.engine.encrypt(original);
		return crypto.engine.decrypt(encrypted) === original;
	}
	
	// Exposed chat object
	var self = {
		get id() {
			return info.id || ''
		},
		get key() {
			return crypto.engine ? crypto.engine.getPublicKey() : '';
		},
		get name() {
			return info.name || '';
		},
		get room() {
			return info.room || '';
		},
		get socket() {
			return socket;
		},
		get users() {
			return info.users || '';
		},
		connect: function() {
			if(socket != null) throw new Error('Can\'t call \'connect\' method twice.');
			socket = io.connect('http://' + (arguments[0] || location.host) + '/' + (arguments[1] || 'chat'));
			for(var i = 0; i < ioevents.length; i++)
				socket.on(ioevents[i], (function(e) { return function() { 
					console.log('chat::' + e, arguments);
					self.trigger(e, Array.prototype.slice.call(arguments)); 
				};}(ioevents[i])));
		},
		findUserById: function(id) {
			for(var i = 0; i < info.users.length; i++)
				if(info.users[i].id === id)
					return info.users[i];
			return null;
		},
		findUserByName: function(name) {
			for(var i = 0; i < info.users.length; i++)
				if(info.users[i].name === name)
					return info.users[i];
			return null;
		},
		kick: function(name) {
			var user = self.findUserByName(name);
			if(!user) self.trigger('notify', 'User doesn\'t exist.')
			else socket.emit('kick', user.id);
		},
		logoff: function() {
			socket.emit('logoff');
		},
		logon: function(data) {
			if(info.room) throw new Error('Can\'t login while logged in room.');
			var login = function() {
				if(!testCrypto()) return false;
				socket.emit('logon', { room: data.room, name: data.name, key: crypto.engine.getPublicKey(), hidden: data.hidden });
				return true;
			}, keyError = function() {
				self.trigger('logon', { success: false, message: 'Could not create keys.' + (arguments[0] ? ' ' + arguments[0] : '') }); 
			};
			try {
				if(!login()) {
					crypto.engine = new JSEncrypt({ default_key_size: data.keySize });
					if(data.async) {
						crypto.engine.getKey( function() {
							try {
								if(!login()) keyError();
							} catch (e) {
								keyError(e);
							}
						});
					} else {
						crypto.engine.getKey();
						if(!login()) keyError();
					}
				}
			} catch(e) { 
				keyError(e); 
			}
		},
		nick: function(nick) {
			socket.emit('nick', nick);
		},
		privateMessage: function(name, message) {
			var user = self.findUserByName(name);
			if(user) 
			{
				var target = encryptMessage(message, user.key);
				socket.emit('private', {target: user.id, source: info.id, data: target });
			}
			else self.trigger('notify', 'User doesn\'t exist.')
		},
		sendMessage: function(message) {
			var users = info.users;
			for(var i = 0; i < users.length; i++)
			{
				var user = users[i];
				if(user.id !== info.id) 
				{
					//encrypt.setPublicKey(user.key);
					//var maxLength = (((encrypt.getKey().n.bitLength()+7)>>3)-11);
					//var target = new Array(Math.ceil(message.length / maxLength));
					//for(var j = 0, k = 0; k < message.length; j++, k += maxLength)
					//	target[j] = ((k + maxLength) < message.length) 
					//		? encrypt.encrypt(message.substr(k, maxLength))
					//		: encrypt.encrypt(message.substr(k));
					////this.socket.emit('message', {target: user.id, source: info.id, data: target });
					var target = encryptMessage(message, user.key);
					socket.emit('message', {target: user.id, source: info.id, data: target });
				}
			}
		},		
		// event stuff
		on: function(what, callback/*, owner */) {
			if(typeof callback !== "function") return;
			if(typeof subscribers[what] === "undefined")
				subscribers[what] = [];
			subscribers[what].push({callback: callback, context: arguments[2] || this})
		},
		off: function(what, callback/*, owner */) {
			if(typeof subscribers[what] === "undefined")
				return;
			for(var i = 0, subs = subscribers[what]; i < subs.length; i++)
				if(subs[i].callback === callback /*&& ((arguments[2] || this) === subs[i].context)*/)
					{ subs.splice(i, 1); return; }
		},
		trigger: function(what, args) {
			var subs = subscribers['*'];
			if(typeof subscribers[what] !== "undefined")
				subs = subs.concat(subscribers[what]);
			for(var i = 0; i < subs.length; i++)
			{
				if(typeof args === "array" || args instanceof Array)	
					subs[i].callback.apply(subs[i].context, args);
				else if(typeof args !== 'undefined')
					subs[i].callback.call(subs[i].context, args);
				else
					subs[i].callback.call(subs[i].context);
			}
		}
	};
	
	self.on('disconnect', function(){
		info = {};
	});
	
	self.on('enter', function(data) {
		if(info && info.users) {
			info.users.push(data);
		}
	});
	
	self.on('leave', function(data) {
		for(var i = 0; i < info.users.length; i++)
		{
			if(info.users[i].id === data.id)
			{
				for(var prop in info.users[i]) data[prop] = info.users[i][prop];
				info.users.splice(i, 1); 
				break; 
			}
		}
	});

	self.on('logon', function(data) {
		if(data.success) {
			info = data;
		}
	});
	
	self.on('logoff', function(data) {
		info = {};
	});
	
	self.on('message', onMessage);
	
	self.on('nick', function(data) {
		if(data.id == info.id)
			info.name = data.nick;
		for(var i = 0; i < info.users.length; i++)
		{
			if(info.users[i].id == data.id)
			{
				data.name = info.users[i].name;
				info.users[i].name = data.nick;
				break;
			}
		}
	});
	
	self.on('private', onMessage);
	
	return self;
};


