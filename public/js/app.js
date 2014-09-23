
var appFactory = function($, chatFactory) {

	var ui = { chat: {}, login: {} };
	var chat = chatFactory();
	var rooms = [];
	
	var self = {
		get ui() { return ui; },
		get chat() { return chat; }
	};
	
	// Private methods 
	function appendHTML(html) {
		if((ui.chat.text.prop("scrollHeight") + 0) === (ui.chat.text.prop("scrollTop") + ui.chat.text.height()))
			ui.chat.text.append(html).animate( {scrollTop: ui.chat.text.prop("scrollHeight")}, 500);
		else
			ui.chat.text.append(html);
	}

	function enableLoginButton(enabled) {
		if(enabled)
			ui.login.enter.removeAttr('disabled').css({'background-color':'#444','cursor':'pointer'});
		else
			ui.login.enter.attr('disabled', 'disabled').css({'background-color':'buttonface','cursor':'default'});
	}	
	
	function logonError(e) {
		showLoginMessage(textToHtmlMargin(e), true);
		enableLoginButton(true);
		ui.login.user.focus();
	}
	
	function showChatHelp() {
		appendHTML('<p class="help">&nbsp;</p>');
		appendHTML('<p class="help"><b>Help</b></p>');
		appendHTML('<p class="help">** /help</p>');
		appendHTML('<p class="help">** /kick user</p>');
		appendHTML('<p class="help">** /logoff</p>');
		appendHTML('<p class="help">** /nick name</p>');
		appendHTML('<p class="help">** /private name message</p>');
		//appendHTML('<p>** /role name "OWNER"|"USER"</p>');
		appendHTML('<p class="help">** /users</p>');
		setTimeout(function() { $('.help').remove(); }, 10000);
	}
	
	function showChatMessage(user, message) {
		appendHTML($('<p>' + (arguments[2] ? '<i>PRIVATE </i> ' : '') + '</p>').append($('<b></b>').append(document.createTextNode(user + ': '))).append(document.createTextNode(message)));
	}

	function showChatNotification(html) {
		appendHTML($('<p class="chat notify"></p>').html(html));
	}

	function showChatUser(user) {
		var html = $('<p class="chat notify">*** ' + (user.owner ? 'Owner: ' : 'User: ') + ' </p>').append($('<b></b>').text(user.name));
		if(arguments[1]) html.append(arguments[1]);
		appendHTML(html);
	}
	
	function showChatUsers() {
		appendHTML('<p>&nbsp;</p>');
		appendHTML('<p><b>Users</b></p>');
		for(var i = 0; i < chat.users.length; i++)
			showChatUser(chat.users[i]);
	}
	
	function showLoginMessage() {
		var error = (arguments[1] || false);
		var message = arguments[0] || (error ? "Unspecified error" : "");
		var effect = arguments[2] || false;
		var hasEffect = ui.login.message.hasClass('login-effect');
		ui.login.message.html(message).css('color', (error ? "red" : "black"));
		if(effect && !hasEffect) {
			ui.login.message.addClass('login-effect');
		}else if(!effect && hasEffect){
			ui.login.message.removeClass('login-effect');
		}
	}
	
	function textToHtmlMargin(text) { return $('<p class="margin"></p>').html(document.createTextNode(text)); }
	function textToHtmlCenter(text) { return $('<p class="center"></p>').html(document.createTextNode(text)); }
	
	// jQuery load event
	$(document).ready(function() {
	
		// *** Get chat UI controls ***
		ui.chat.box = $('#chat-box');
		ui.chat.input = $('#chat-input');
		ui.chat.options = $('#chat-options');
		ui.chat.text = $('#chat-text');
		ui.chat.users = $('#chat-users');

		// *** Get login UI controls ***
		ui.login.box = $('#login-box');
		ui.login.enter = $('#login-enter');
		ui.login.hideRoom = $('#login-hide-room');
		ui.login.keySize = $('#login-keysize');
		ui.login.message = $('#login-message');
		ui.login.options = $('#login-options');
		ui.login.optionsBox = $('#login-options-box');
		ui.login.asyncKey = $('#login-key-async');
		ui.login.room = $('#login-room');
		ui.login.user = $('#login-user');

		// *** Add chat UI event handlers ***

		// Attach events
		ui.chat.input.keyup(function(e){
			if(e.keyCode == 13) 
			{
				var input = ui.chat.input.val();
				ui.chat.input.val('');
				if(input.length > 1 && input.substr(0, 1) === '/')
				{
					var cmd = input.substr(1);
					var offset = cmd.indexOf(' ');
					var args = null;
					if(offset > -1)
					{
						args = cmd.substr(offset + 1);
						cmd = cmd.substr(0, offset);
					}
					switch(cmd) {
					case 'help':
					case '?':
						showChatHelp();
						return;
					case 'kick':
						chat.kick(args);
						return;
					case 'logoff':
						chat.logoff();
						return;
					case 'nick':
						if((/^[A-Za-z][a-z]{2,19}$/g).test(args))
							chat.nick(args);
						else
							appendHTML('*** Invalid nick name');
						return;
					case 'private':
						if(args == null) return;
						offset = args.indexOf(' ');
						if(offset == -1) return;
						var name = args.substr(0, offset);
						var message = args.substr(offset + 1);
						chat.privateMessage(name, message);
						return;
					/*case 'role':
						if(args == null) return;
						offset = args.indexOf(' ');
						if(offset == -1) return;
						var name = args.substr(0, offset);
						var role = args.substr(offset + 1).toUpperCase();
						if(role == 'OWNER' || role == 'USER') chat.role(name, role);
						return;*/
					case 'users':
						showChatUsers();
						return;
					};
				}
				chat.sendMessage(input);
				showChatMessage(chat.name, input);
			}
		});
		
		ui.chat.options.click(function() {
			showChatHelp();
		});
		
		ui.chat.users.click(function(){
			showChatUsers();
		});
		
		// *** Add login UI event handlers ***
		
		// Click enter room
		ui.login.enter.click(function() {
			var info = {
				async: ui.login.asyncKey.prop('checked'),
				hidden: ui.login.hideRoom.prop('checked'),
				keySize: parseInt(ui.login.keySize.val()),
				name: ui.login.user.val(),
				room: ui.login.room.val()
			};
			if (!(/^[a-z]{4,20}$/g).test(info.room)) 
			{
				showLoginMessage(textToHtmlMargin('Room must be minimum 4 and maximum 20 characters long and only contain a-z.'), true);
				ui.login.room.focus();
			}
			else if(!(/^[A-Za-z][a-z]{2,19}$/g).test(info.name)) 
			{
				showLoginMessage(textToHtmlMargin('Your name must be minimum 3 and maximum 20 characters long, only contain a-z but may start with a capital.'), true);
				ui.login.user.focus();
			}
			else
			{
				showLoginMessage('<p class="center">Generating key,<br/> please wait on this page...</p>', false, true);
				enableLoginButton(false);
				chat.logon(info);
			}			
		});
		
		// Toggle visibility of extra login options
		ui.login.options.click(function(e) { 
			ui.login.optionsBox.slideToggle(1000);
			e.preventDefault();
			return false;
		});

		// Change the focus event for auto-dropdown on focus, 
		ui.login.room.focus(function(){
			var text = ui.login.room.val();
			if(text.length > 2 && text.substr(text.length - 3) === '...') ui.login.room.val('');
			if(ui.login.room.val() == "") ui.login.room.autocomplete('search','');
		});
		
		// *** Chat event handlers ***
		chat.on('connect', function() {
			enableLoginButton(true);
			//if(room.user !== undefined) {
			//	connectToRoom();
			//}
			showLoginMessage('<p class="center">Connected</p>');
		});

		chat.on('disconnect', function() {
			showLoginMessage('<p class="center">Disconnected</p>', true);
			enableLoginButton(false);
			$('.disconnect').remove();
			appendHTML($('<p class="disconnect">*** <b>Disconnected</b> <a href="#" class="disconnect" title="login">click here to return to login...</a></p>').on('click', function(){
				ui.chat.box.fadeOut(500, function(){ ui.login.box.fadeIn(500); });
			}));
		});
		
		chat.on('enter', function(user){
			showChatUser(user, ' enters.');
		});
		
		chat.on('kick', function(id) {
			showChatUser(chat.findUserById(id), ' was kicked.');
		});
		
		chat.on('leave', function(user) {
			showChatUser(user, ' leaves.');
		});

		chat.on('logon', function(data) {
			if(data.success) {
				$('.disconnect').remove();
				ui.login.box.fadeOut(500, function(){ ui.chat.box.fadeIn(500); });
				appendHTML($('<p></p>').append(app.chat.key.replace(/(\r\n|\r)/gm,"\n").replace(/\n/gm,"<br/>")));
				document.title = data.name + '@' + data.room + '~node2chat';
				for(var i = 0; i < data.users.length; i++)
					showChatUser(data.users[i], ' enters.');
			} else {
				logonError(data.message);
			}
		});

		chat.on('logoff', function() {
			enableLoginButton(true);
			showLoginMessage('<p class="center">Connected</p>');
			ui.chat.box.fadeOut(500, function(){ ui.login.box.fadeIn(500); });
		});
		
		chat.on('message', function(data) {
			showChatMessage(data.from, data.message);
		});
	
		chat.on('nick', function(data) {
			if(data.id == chat.id) document.title = chat.name + '@' + chat.room + '~node2chat';
			var name = $('<b></b>').html(document.createTextNode(data.name));
			var nick = $('<b></b>').html(document.createTextNode(data.nick));
			appendHTML($('<p></p>').html('*** User: ').append(name).append(' changed nick to ').append(nick) );
		});
		
		chat.on('notify', function(message) {
			appendHTML($('<p>*** </p>').append(document.createTextNode(message)));
		});
		
		chat.on('private', function(data){
			showChatMessage(data.from, data.message, true);
		});

		chat.on('rooms', function(data) {
			ui.login.room.autocomplete({ 
				source: data, 
				minLength:0,
				select: function() { ui.login.user.focus(); }
			});
		});
		
		// *** Other event handlers ***
		
		// Prevent dragging and contextmenu of controls
		$('*').on('dragstart', function(event) { 
			event.preventDefault(); 
		}).bind("contextmenu",function(e){
			console.log('context', e);
			return false;
		}); 
		
		// *** Init ***
		
		// show login
		ui.login.box.removeClass('hidden');
		
		// Connect with delay 
		setTimeout(function() {	chat.connect(); }, 1000);
	});
	
	return self;
}