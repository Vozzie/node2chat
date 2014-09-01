
if(!window.console || window.console === undefined) {
	window.console = { log: function(){} };
}

window.onerror = function(errorMsg, url, lineNumber) {
	console.log('error: "' + errorMsg + '"\nfile: ' + url + '\nline: ' + lineNumber);
};



(function(){
	
	window.chat = (function(){

		// Chat gui parts
		var chat = {}; 
		// JSEncrypt instance
		var crypto = {};
		// Login gui parts
		var login = {};
		// Current room and user info
		var room = {};
		// rooms
		var rooms = null;
		// socket.io
		var socket = null;
		
		
		function appendHTML(html) {
			if((chat.text.prop("scrollHeight") + 0) === (chat.text.prop("scrollTop") + chat.text.height()))
				chat.text.append(html).animate( {scrollTop: chat.text.prop("scrollHeight")}, 500);
			else
				chat.text.append(html);
		}
		
		function appendUsers() {
			for(var name in this.room.users) { 
				appendHTML($('<p class="chat notify"></p>').html('*** User: ').append(document.createTextNode(name)).append(' ***'));
				//this.doAppendHTML($('<p class="chat notify"></p>').html('*** User: ').append(document.createTextNode(name)).append(' ***'));
			}
		}
		
		function checkKeys(generated) {
			var original = 'this is a test';
			crypto.engine = new JSEncrypt();
			crypto.publicKey = login.publicKey.val();
			crypto.engine.setPublicKey(crypto.publicKey);
			var encrypted = crypto.engine.encrypt(original);
			crypto.engine.setPrivateKey(login.privateKey.val());
			var decrypted = crypto.engine.decrypt(encrypted);
			if(decrypted === original) {
				// ... ok, enter
				enableLoginButton(true);
				showLoginMessage('Connecting to room...', false, true);
				socket.emit('enter_room', {
					room: login.room.val(),
					user: login.user.val(),
					key: crypto.publicKey,
					hidden: login.hideRoom.prop('checked')
				});
			} else if(!generated) {
				// generate, call back recursive,...
				var enc = new JSEncrypt({ default_key_size: parseInt(login.keySize.val()) }	);
				login.privateKey.val(enc.getPrivateKey());
				login.publicKey.val(enc.getPublicKey());
				checkKeys(true);
			} else {
				enableLoginButton(true);
				showLoginMessage('<p class="center">Encryption error.</p>', true);
			}
		}
		
		function connectToRoom() {
			if(!validateLogin()) {
				return;
			}
			showLoginMessage('<p class="center">Checking key, please wait...</p>', false, true);
			enableLoginButton(false);
			// Make sure UI updates before generating key for effect to start
			setTimeout(function(){ checkKeys(false); }, 1);
		}

		function enableLoginButton(enabled) {
			if(enabled)
				login.enter.removeAttr('disabled').css({'background-color':'#444','cursor':'pointer'});
			else
				login.enter.attr('disabled', 'disabled').css({'background-color':'buttonface','cursor':'default'});
		}

		function setRoomList(data) {
			rooms = data;
			login.room.autocomplete({ 
				source: rooms, 
				minLength:0,
				select: function() { login.user.focus(); }
			});
		}

		function showLoginMessage() {
			var error = (arguments[1] || false);
			var message = arguments[0] || (error ? "Unspecified error" : "");
			var effect = arguments[2] || false;
			var hasEffect = login.message.hasClass('login-effect');
			login.message.html(message).css('color', (error ? "red" : "black"));
			if(effect && !hasEffect) {
				login.message.addClass('login-effect');
			}else if(!effect && hasEffect){
				login.message.removeClass('login-effect');
			}
		}
		
		function validateLogin() {
			if(!(/^[a-z]{4,20}$/g).test(login.room.val()))
			{
				showLoginMessage('<p class="margin">Room must be minimum 4 and maximum 20 characters long and only contain a-z.</p>', true);
				login.room.focus();
				return false;
			}
			if(!(/^[A-Za-z][a-z]{2,19}$/g).test(login.user.val()))
			{
				showLoginMessage('<p class="margin">Your name must be minimum 3 and maximum 20 characters long, only contain a-z but may start with a capital.</p>', true);
				login.user.focus();
				return false;
			}
			return true;
		}

		return {
			init: function() {
			
				// Get controls
				chat.box = $('#chat-box');
				chat.input = $('#chat-input');
				chat.options = $('#chat-options');
				chat.text = $('#chat-text');
				chat.users = $('#chat-users');

				login.box = $('#login-box');
				login.enter = $('#login-enter');
				login.hideRoom = $('#login-hide-room');
				login.keySize = $('#login-keysize');
				login.message = $('#login-message');
				login.options = $('#login-options');
				login.optionsBox = $('#login-options-box');
				login.privateKey = $('#login-privatekey');
				login.publicKey = $('#login-publickey');
				login.room = $('#login-room');
				login.user = $('#login-user');
				
				// Attach events
				chat.input.keyup(function(e){
					if(e.keyCode == 13) sendLine();
					appendUsers();
				});
				chat.options.click(function(){
				
				});
				chat.users.click(function(){
				
				});
				login.enter.click(function() {
					connectToRoom();
				});
				login.options.click(function(e) { 
					login.optionsBox.slideToggle(1000);
					e.preventDefault();
					return false;
				});
				login.room.focus(function(){
					var text = login.room.val();
					if(text === 'Enter room name...') login.room.val('');
					if (login.room.val() == "") login.room.autocomplete('search','');
				});

				try {
					// Connect
					socket = io.connect('http://' + location.host);
				} catch( ex ) {
					
				}
				socket.on('connect', function() {
					console.log('socket::connect');
					enableLoginButton(true);
					if(room.user !== undefined) {
						connectToRoom();
					}
					showLoginMessage('<p class="center">Connected</p>');
				});
				socket.on('connect_failed', function() {
					console.log('socket::connect_failed');
					showLoginMessage('<p class="center">Connection failed</p>', true);
				});
				socket.on('connecting', function() {
					console.log('socket::connecting');
					showLoginMessage('<p class="center">Connecting...</p>', false, true);
				});
				socket.on('disconnect', function() {
					console.log('socket::disconnect');
					showLoginMessage('<p class="center">Disconnected</p>', true);


/*					if ( this.room.name ){
				this.room.users = {};
				this.chat.input.attr('disabled', 'disabled').val('connection lost...').css('font-style', 'italic');
				$('.cell>div').fadeToggle(1000);
			} else {
			}
	*/
				});
				socket.on('error', function(data) {
					console.log('socket::error');
					console.log(data);
					showLoginMessage(data, true);
				});
				socket.on('login', function(data){ 
					console.log('socket::login');
					if(data.success){
						room.room = data.room;
						room.user = data.user;
						document.title = data.user + '@' + data.room + '~VibeChat';
						for(var i = 0; i < data.users.length; i++)
							this.room.users[data.users[i].user] = data.users[i];
						login.box.fadeOut(500, function(){ chat.box.fadeIn(500); });
						doAppendHTML('<p class="chat notify"> *** Connected ***</p>');
						doAppendUsers();	
					} else {
						showLoginMessage(data.message, true);
						login.name.focus();
					}
				});
				socket.on('message', function(data) {
					console.log('socket::message');
				
				});
				socket.on('reconnect', function() {
					console.log('socket::reconnect');
				
				});
				socket.on('reconnect_failed', function() {
					console.log('socket::reconnect_failed');
				
				});
				socket.on('reconnecting', function() {
					console.log('socket::reconnecting');
				
				});
				socket.on('room_enter', function (data) { 
					console.log('socket::room_enter');
					
				});
				socket.on('room_leave', function (data) { 
					console.log('socket::room_leave');
					
				});
				socket.on('room_list', function (data) { 
					console.log('socket::room_list');
					setRoomList(data);
				});
				
				// default room list
				setRoomList(['shibby']);
				// Show login
				login.box.removeClass('hidden');

			}
		};
	
	}());
	
	$(document).ready(function(){
		window.chat.init();
		$('*').on('dragstart', function(event) { event.preventDefault(); });
	});
	
}());




/*
			this.chat.input.keyup(function() { me.onChatInputKeyUp.apply(me, arguments); });
				this.chat.users.click(function(){ me.onChatUsersClick.apply(me, arguments); });
				
				// add more event handlers
				this.login.enter.click(function() { me.connectToRoom.apply(me, arguments); });
				this.login.optionsButton.click(function(){ me.onLoginOptionsClick.apply(me, arguments); });
				this.login.room.focus(function(){ me.onLoginRoomFocus.apply(me, arguments); });

				// add even more event handlers
				this.socket.on('connect', function() { me.socketConnect.apply(me, arguments); });
				this.socket.on('connect_failed', function () { me.socketConnectFailed.apply(me, arguments); });
				this.socket.on('connecting', function () {me.socketConnecting.apply(me, arguments); });
				this.socket.on('disconnect', function () { me.socketDisconnect.apply(me, arguments); });
				this.socket.on('error', function() { me.socketError.apply(me, arguments); });
				this.socket.on('login', function(){ me.socketLogin.apply(me, arguments); });
				this.socket.on('message', function() { me.socketMessage.apply(me, arguments); });
				this.socket.on('reconnect', function () { me.socketReconnect.apply(me, arguments); });
				this.socket.on('reconnect_failed', function () { me.socketReconnectFailed.apply(me, arguments); });
				this.socket.on('reconnecting', function () { me.socketReconnecting.apply(me, arguments); });
				this.socket.on('room_enter', function () { me.roomEnter.apply(me, arguments); });
				this.socket.on('room_leave', function () { me.roomLeave.apply(me, arguments); });
				this.socket.on('room_list', function () { me.roomList.apply(me, arguments); });
				// and focus the first element
			} catch(ex) {
				me.showLoginMessage(ex.message, true);
			}
		},

		doClearText: function() {
			this.chat.text.html('');
		},
		doSendLine: function() {
			var text = this.chat.input.val();
			this.chat.input.val('');
			var encrypt = new JSEncrypt();
			for(var name in this.room.users){
				try {
					var user = this.room.users[name];
					encrypt.setPublicKey(user.key);
					var encrypted = encrypt.encrypt(text);
					this.socket.emit('message', {from: this.room.name, id: user.id, message: encrypted });
				} catch ( ex ) {
					console.log('exception');
					console.log(ex);
				}
			}
			this.doAppendHTML( $( '<p class="chat message"></p>' ).html( $('<span class="chat user"></span>').text(this.room.name + ': ') ).append(document.createTextNode(text)) );		
		},
			onLoginRoomFocus: function() {
			
			//this.login.room.trigger('keydown.autocomplete');
		},
		onLoginOptionsClick: function(){
			this.login.options.toggle(500);
		},
		roomEnter: function(data) {
			console.log('room enter');
			console.log(data);
			this.doAppendHTML($('<p class="chat notify"></p>').html('*** User entered: ').append(document.createTextNode(data.name)).append(' ***'));
			this.room.users[data.name] = data;
		},
		roomLeave: function(name) {
			console.log('room leave');
			console.log(name);
			delete this.room.users[name];
			this.doAppendHTML($('<p class="chat notify"></p>').html('*** User left: ').append(document.createTextNode(name)).append(' ***'));
		},
		roomList: function(data) {
			var me = this;
			this.rooms = data;
			this.login.room.autocomplete({ 
				source: this.rooms, 
				minLength:0,
				select: function() {
					me.login.name.focus();
				}
			});
		},
		socketError: function(error) {
			console.log('socketError');
			this.showLoginMessage(error, true);
		},
		socketLogin: function(data) {
			
		},
		socketMessage: function (data) {
			console.log('socketMessage');
			var encrypt = new JSEncrypt();
			encrypt.setPrivateKey(this.crypt.private);
			var decrypted = encrypt.decrypt(data.message);
			this.doAppendHTML( $( '<p class="chat message"></p>' ).html( $('<span class="chat user"></span>').text(data.from + ': ') ).append(document.createTextNode(decrypted)) );
		},
		socketReconnect: function(){
			console.log('socketReconnect');
			this.showLoginMessage('Reconnect', true);
		},
		socketReconnectFailed: function(){
			console.log('socketReconnectFailed');
			this.showLoginMessage('Connection failed', true);
		},
		socketReconnecting: function(){
			console.log('socketReconnecting');
			this.showLoginMessage('Reconnecting...', false, true);
		}
	};
}());

$(function(){ Client.init(); });



*/