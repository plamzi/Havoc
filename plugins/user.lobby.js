/* Havoc (c) 2014 */

/* handles character creation as well as any other actions users can take in the lobby */

var u = require('util');
var md5 = require('MD5');

addStrings({

	eng: {
	
		CHECKED:			my().U_BOX_CHECKED.style(18, '&n'),
		UNCHECKED:			my().U_BOX_EMPTY.style(18, '&n'),
		
		PROMPT_CHAR:		'Create new character'.mxpsend('new') + " or click on existing character name.",
		CREATE_NEW:			'Create New',
		LOBBY:				my().U_HOME + " Lobby:",
		RETURN_TO_LOBBY:	my().U_HOME + " Back to lobby",
		
		PASSWORD_NOT_CHANGED: "Password was not changed.",
		PASSWORDS_DIFFER:	"Passwords did not match so it was not changed.",
		PASSWORD_CHANGED: 	"You have successfully changed your password.",
		
		INBOX:				my().U_INBOX + " Inbox",
		INBOX_EMPTY:		"Birds are nesting in your  empty inbox... " + my().U_BIRD,
		FROM_X:				"From %s:",
		RETURN_TO_INBOX:	my().U_INBOX + " Back to inbox",
		YOUR_PRIVATE_MESSAGE_WAS_SENT:	"Your private message was sent. If the user has enabled forwarding, it will be emailed to them.",
		MESSAGE_DELETED:	"Message deleted.",
		
		PROMPT_NEW_CHAR:	"Name your new character:",
		HEROIC_NAME_LIKE_:	"a heroic name like ",
		CANCEL:				"Cancel",
		SUGGEST:			"Suggest",
		ACCEPT:				"Accept",
		NEXT:				"Next",
		CHAR_X_EXISTS:		"The name '%s' is not available. Please try another: ",
		CHAR_AVAILABLE:		"\r\nWould you like to create '%s'? ",
		CHAR_INVALID:		"Invalid character name. Please try another: ",
		CREATION_ERROR: 	'Creation error:',
		INVALID_CHARNAME: 	'Invalid character name. Try something more heroic.',
		CREATION_ABORTED: 	'Character creation was aborted.',
		MALE:				"Male",
		MALE_INFO:			"Ale-chugging, back-slapping brutes with nary a care (nor a clue).",
		FEMALE:				"Female",
		FEMALE_INFO:		"Head-turning damsels sans distress (except the one they cause).",
		BACK:				("B".font('color=white') + "ack").mxpsend('back') + ' ',
		SELECT_SEX:			" Select sex: ",
		SELECT_CLASS:		" Select class: ",
		SELECT_BACKGROUND:	" Select background:",
							
		CHAR_BACKGROUNDS:	{
		                 	 	Martial: "A martial background makes you more effective in melee combat.",
		            		   	Spiritual: "A spiritual background makes you better at enhancement skills and spells (buffs).",
		            		   	Criminal:  "A criminal background makes you better at evasive and ranged combat skills.",
		            		   	Scholarly: "A scholarly background makes you better at targeted skills and spells."
							},
		CREATE_CONFIRM:		" Create %s, a %s %s with a %s past? ",
		YOU_SELECTED: 		"You selected",
		YES_NO:				("Y".font('color=white') + "es").mxpsend('yes') + ' ' + ("N".font('color=white') + "o").mxpsend('no') + ' ',
		YOUR_PREFERENCES: 	my().U_GEAR + " Preferences:",
		USER_PREFERENCES:	[
		            		 ['Forward Private Messages', 'Forward any private messages immediately to your email address (if supplied).'],
		            		 ['Daily Summary Email', 'Once daily, send an email with in-game updates such as guild news and activities, private messages, etc.'],
		            		 ['Send Daily Gossip', 'Include gossip channel in the daily summary email (if enabled)']
		            		]
	}
});

/* private function handling pm from lobby inbox */

var pm = function(s, cmd, d) {

	if (!cmd || cmd == '/a' || !d)
		return user.showInbox(s, my().PM_ABORTED);
	
	s.pm.text = d;
	
	Message.create(s.pm).then(function() {
		
		var usr = my().userindex[s.pm.to_id];
		
		if (usr && usr.attr.pref['Forward Private Messages'] && usr.email && usr.email.has('@')) {

			user.sendMail({
				from: s.pm.from + " <noreply@aaralon.com>",
				to: usr.email,
				subject: config.game.name + ': New Private Message',
				text: d
			},
			function(e, r) { dump(e || r); });
		}
		
		delete(s.pm);
		user.showInbox(s, my().YOUR_PRIVATE_MESSAGE_WAS_SENT);
	});
}

module.exports = {
	
	init: function(re) {
		
		debug('user.lobby init');
		
		point(user, this, null, ['init']); /* merge into user component methods, leave out the init method */
		
		user.register('user.lobby', 'login', user.lobby);

		if (re)
			user.updateUsers();
	},
	
	lobby: function(s, err) { /* List all characters under a player's account */
		
		var m = my(), msg = '';

		if (s.ch) {
			info('user.lobby: after game exit', s);
			delete s.ch;
		}
		else {
			info('user.lobby: entry w/o a char', s);
		}

		s.sendGMCP('Modal', { close: 1 });
		
		if (err && !s.portal)
			s.send(err);
		
		msg = m.U_GEAR.style(16, '&178').mxpsend('pref', 'Manage your user account preferences.') + '   ' 
			+ s.user.displayName().mxpsend('password', 'Click to set or change your account password.').style(16, '&Ki') + '   ' 
			+ (m.U_INBOX.style(16, '&178') + ' inbox').mxpsend('inbox', 'Check your message inbox.').style(16, '&Ki') + '   ' 
			+ (m.U_ENVELOPE.style(16, '&178') + ' ' + (s.user.email.length ? s.user.email : 'no email')).mxpsend('email', 'Set up or change your email address.').style(16, '&Ki') + '\r\n';
	
		for (var i in s.user.chars) {
			var a = s.user.chars[i];
			var c = m.U_HUMAN.style(16, '&B') + ' '
				+ a.name.mxpsend(a.name) + ' ' 
				+ m.U_STAR.color('&208') + ' ' 
				+ a.level + ' ' + m.SEX[a.sex].symbol + ' ' 
				+ (a.class + ', ' + a.trade).color('&Ki') + '\r\n';
			msg += c;
		}

		msg += '\r\n' + m.PROMPT_CHAR;
		
		if (s.portal && !s.gui)
			s.sendGMCP('Modal', {
				title: my().LOBBY,
				info: err,
				mxp: msg.replace(/\r\n/g, '\x1b<br\x1b>').colorize(),
				closeable: 0,
				backdrop: 'static',
				buttons: [{
					text: my().CREATE_NEW,
					send: 'new'
				}]
			});
		else
			s.send('\r\n' + msg);
		
		s.sendGMCP('user.chars', s.user.chars);
		s.next = user.lobbyAction;
	},
	
	lobbyAction: function(s, d) {
		
		debug('user.lobbyAction: ' + stringify(d));
		
		if (!d || !d.length || d == 'lobby')
			return user.lobby(s);
		
		if (d == 'new')
			return user.createChar(s);
		
		if (d == 'email')
			return user.changeEmailStart(s);
		
		if (d == 'password')
			return user.changePasswordStart(s);
		
		if (d == 'pref')
			return user.showPrefs(s);
		
		if (d == 'inbox')
			return user.showInbox(s, 'start');
		
		return user.selectChar(s, d);
	},
	
	selectChar: function(s, d) {
		
		d = d.cap();

		Char.find({
			where: { name: d, UserId: s.user.id }
		})
		.then(function(r) {
			
			if (!r) {
				
				if (!user.validName(d, 'char'))
					return user.lobby(s, my().INVALID_CHARNAME);
				
				/* available character name */
				user.createChar(s, d);
			}
			else /* existing character name belonging to this user */
			if (s.user.id == r.UserId) {
				s.ch = r;
				user.enter(s);
			}
			else /* existing char name belonging to another user */
				user.lobby(u.format(my().CHAR_X_EXISTS, d));
		});
	},
	
	changeEmailStart: function(s) {
		
		s.sendGMCP('Modal', { close: 1 });
		
		if (s.portal)
			s.sendGMCP('ModalInput', {
				title: my().PROMPT_EMAIL,
				tag: 'input',
				type: 'email',
				placeholder: my().EMAIL_PLACEHOLDER,
				text: s.user.email || '',
				sendText: 'Save',
				abort: s.user.email || ''
			});
		else
			s.snd(my().PROMPT_EMAIL);
		
		s.next = user.changeEmail;
		return;
	},
	
	changeEmail: function(s, d) {

		debug('user.changeEmail: ' + stringify(d));
		
		s.user.updateAttributes({ email: d })
		.then(function() {
			user.lobby(s);
		});
	},

	changePasswordStart: function(s) {
		
		s.sendGMCP('Modal', { close: 1 });
		
		if (!s.portal) {
			s.snd(my().PROTOCOL.WILL_ECHO);
			s.snd('\r\n' + my().CHANGE_PASSWORD);
		}
		else
			s.sendGMCP('ModalInput', {
				title: my().CREATE_NEW_PASSWORD,
				info: my().PASSWORD_INFO,
				placeholder: my().NEW_PASSWORD_PLACEHOLDER,
				tag: 'input',
				type: 'password',
				sendText: 'Save',
				attr: 'change',
				abort: ''
			});
			
		s.next = user.changePassword;
		return;
	},
	
	changePassword: function(s, d) {
		
		if (!d)
			return user.lobby(s, my().PASSWORD_NOT_CHANGED);
		
		if (!user.validPass(d))
			return user.lobby(s, my().INVALID_PASSWORD);
		
		s.password = d;
		s.snd('\r\n' + my().PASS_CONFIRM);
		s.next = user.changePasswordConfirm;
	},
	
	changePasswordConfirm: function(s, d) {
		
		if (!d)
			return user.lobby(s, my().PASSWORD_NOT_CHANGED);
		
		if (s.password != d)
			return user.lobby(s, my().PASSWORDS_DIFFER);
		
		s.user.updateAttributes({ password: md5(d) })
		.then(function() {
			user.lobby(s, my().PASSWORD_CHANGED);
		});
	},

	showPrefs: function(s) {

		debug('user.showPrefs', s);
		
		var m = my(), msg = '';
		
		my().USER_PREFERENCES.forEach(function(i) {
			msg += ((s.user.attr.pref[i[0]] ? m.CHECKED : m.UNCHECKED) + ' ' + i[0]).mxpsend(i[0], i[1]) + '\r\n';
		});
		
		msg += '\r\n' + m.RETURN_TO_LOBBY.mxpsend('');
		
		if (!s.portal)
			s.snd('\r\n' + m.YOUR_PREFERENCES.color('&178') + msg);
		else
			s.sendGMCP('Modal', {
				title: m.YOUR_PREFERENCES,
				mxp: msg.replace(/\r\n/g, '\x1b<br\x1b>').colorize(),
				buttons: []
			});

		s.next = user.updatePrefs;
	},
	
	updatePrefs: function(s, d) {
		
		if (!d)
			return user.lobby(s);
		
		var match = my().USER_PREFERENCES.filter(function(i) { return i[0] == d; });
		
		if (!match.length)
			return user.lobby(s);
		else
			match = match[0][0];
		
		var pref = copy(s.user.attr.pref);
		
		pref[match] = pref[match] ? 0 : 1;
		dump(pref);
		
		s.user.setAttr({ pref: pref }, function() {
			user.showPrefs(s);
		});
	},
	
	showInbox: function(s, d) {

		debug('user.showInbox', s);
		
		if (!d || d == 'lobby')
			return user.lobby(s);
		
		var m = my(), msg = '';
		
		Message.findAll({
			where: { to_id: s.user.id }
		})
		.then(function(r) {
			
			s.user.inbox = r;
			
			if (!r)
				msg = m.INBOX_EMPTY;
			
			r.forEach(function(i) {
				msg += 'x'.mxpsend('delete ' + i.id) + '  ' 
					+ m.U_PENCIL.mxpsend('pm ' + i.from_id) + '  ' 
					+ i.from + ': ' + i.text.nolf().ellipse(30).mxpsend('read ' + i.id, i.text) + ' ' 
					+ i.createdAt.toUTCString().substring(0, 11).replace(',','').style(11, '&Ki') + '\r\n';
			});
			
			msg += '\r\n' + m.RETURN_TO_LOBBY.mxpsend('');
			
			if (!s.portal)
				s.snd('\r\n' + m.U_HUMAN.color('&178') + s.user.displayName() + ' ' + m.INBOX + msg);
			else
				s.sendGMCP('Modal', {
					title: m.INBOX,
					info: d != 'start' ? d : null,
					mxp: msg.replace(/\r\n/g, '\x1b<br\x1b>').colorize(),
					abort: 'lobby',
					buttons: []
				});
		});

		s.next = user.inboxAction;
	},
	
	inboxAction: function(s, d) {

		debug('user.inboxAction', s);
		
		if (!d)
			return user.lobby(s);
		
		arg = d.split(' ');
		
		if (arg[0] == 'lobby')
			return user.lobby(s);
		
		if (arg[0] == 'inbox')
			return user.showInbox(s, 'start');
		
		if (arg[0] == 'read' && arg[1] && arg[1].isnum()) {
			 
			var msg = s.user.inbox.filter(function(i) { return i.id == arg[1]; });
			 
			 if (!msg[0])
				 return;
			
			msg = msg[0].text + '\r\n\r\n' + my().RETURN_TO_LOBBY.mxpsend('') + '  |  ' + my().RETURN_TO_INBOX.mxpsend('inbox');
			
			s.sendGMCP('Modal', {
				title: u.format(my().FROM_X, msg[0].from),
				mxp: msg.replace(/\r\n/g, '\x1b<br\x1b>').colorize(),
				abort: 'inbox',
				closeable: 1,
				buttons: []
			});
		}
		
		if (arg[0] == 'pm' && arg[1] && arg[1].isnum()) {

			var usr = my().userindex[arg[1]];
			
			if (!usr)
				return warning('lobby inbox pm invalid userid');
			
			s.pm = {
				type: 'pm',
				from: s.user.displayName(),
				from_id: s.user.id,
				to: usr.name,
				to_id: usr.id,
				text: ''
			};
	
			s.sendGMCP('ModalInput', {
				title: my().PRIVATE_MESSAGE_TO_ + usr.name,
				after: '\r\n/s',
				abort: '/a'
			});
			
			s.next = pm;
		}
		
		if (arg[0] == 'delete' && arg[1] && arg[1].isnum()) {
			
			var msg = s.user.inbox.filter(function(i) { return i.id == arg[1]; });
			 
			if (!msg[0])
				return;
			 
			Message.find(arg[1])
			.then(function(r){
				r.destroy().then(function() {
					return user.showInbox(s, 'start', my().MESSAGE_DELETED);
				});
			});
		}
	},
	
	/* begin char create steps */
	
	charPromptClass: function(s, d) {

		debug('user.charPromptClass');
		
		var m = my(), cls = m.classes, names = cls.map(function(i) { return i.name; }), msg = '';
		
		if (!d || d == 'lobby') {
			delete s.create;
			return user.lobby(s, m.CREATION_ABORTED);
		}
		
		if (d != 'start') {

			if (d == 'next')
				return user.createChar(s);
			
			if (!names.has(d))
				return user.createChar(s);
			
			s.create.cls = d;
		}
		
		cls.forEach(function(i) {
			msg += ((s.create.cls && s.create.cls == i.name ? m.CHECKED : m.UNCHECKED) + ' ' + i.name).mxpsend(i.name, i.desc) + '\r\n';
		});
		
		msg += '\r\n' + m.RETURN_TO_LOBBY.mxpsend('') + '  |  ' + m.NEXT.mxpsend();
		
		if (!s.portal)
			s.snd(m.SELECT_CLASS.color('&178') + '\r\n\r\n' + msg);
		else
			s.sendGMCP('Modal', {
				title: m.SELECT_CLASS,
				mxp: msg.replace(/\r\n/g, '\x1b<br\x1b>').colorize(),
				abort: 'lobby',
				buttons: []
			});
	},
	
	charPromptSex: function(s, d) {

		debug('user.charPromptSex');
		
		var m = my(), msg = '';
		
		if (!d || d == 'lobby') {
			delete s.create;
			return user.lobby(s, m.CREATION_ABORTED);
		}
		
		if (d != 'start') {
			
			if (d == 'next')
				return user.createChar(s);
			
			if (![m.MALE, m.FEMALE].has(d))
				return user.createChar(s);
			
			s.create.sex = d;
		}
		
		msg += ((s.create.sex && s.create.sex == m.MALE ? m.CHECKED : m.UNCHECKED) + ' ' + m.U_MALE + ' ' + m.MALE).mxpsend(m.MALE, m.MALE_INFO) + '\r\n';
		msg += ((s.create.sex && s.create.sex == m.FEMALE ? m.CHECKED : m.UNCHECKED) + ' ' + m.U_FEMALE + ' ' + m.FEMALE).mxpsend(m.FEMALE, m.FEMALE_INFO) + '\r\n';
		
		msg += '\r\n' + m.RETURN_TO_LOBBY.mxpsend('') + '  |  ' + m.NEXT.mxpsend();
		
		if (!s.portal)
			s.snd(m.SELECT_SEX.color('&178') + '\r\n\r\n' + msg);
		else
			s.sendGMCP('Modal', {
				title: m.SELECT_SEX,
				mxp: msg.replace(/\r\n/g, '\x1b<br\x1b>').colorize(),
				abort: 'lobby',
				buttons: []
			});
	},
	
	charPromptBg: function(s, d) {

		debug('user.charPromptBg');
		
		var m = my(), bg = m.CHAR_BACKGROUNDS, msg = '';
		
		if (!d || d == 'lobby') {
			delete s.create;
			return user.lobby(s, m.CREATION_ABORTED);
		}
		
		if (d != 'start') {
			
			if (d == 'next')
				return user.createChar(s);
			
			if (!Object.keys(bg).has(d))
				return user.createChar(s);

			s.create.bg = d;
		}
		
		dump(s.create);
		
		for (var i in bg) {
			msg += ((s.create.bg && s.create.bg == i ? m.CHECKED : m.UNCHECKED) + ' ' + i).mxpsend(i, bg[i]) + '\r\n';
		};
		
		msg += '\r\n' + m.RETURN_TO_LOBBY.mxpsend('') + '  |  ' + m.NEXT.mxpsend();
		
		if (!s.portal)
			s.snd(m.SELECT_BACKGROUND.color('&178') + '\r\n\r\n' + msg);
		else
			s.sendGMCP('Modal', {
				title: m.SELECT_BACKGROUND,
				mxp: msg.replace(/\r\n/g, '\x1b<br\x1b>').colorize(),
				abort: 'lobby',
				buttons: []
			});
	},
	
	charPromptName: function(s, d, info) {
		
		debug('user.charPromptName');
		
		if (!d || d == 'lobby') {
			delete s.create;
			return user.lobby(s, m.CREATION_ABORTED);
		}
		
		if (d == 'next')
			return user.createChar(s);
		
		if (d == 'start') {
			
			if (s.portal) {
				
				s.sendGMCP('Modal', { close: 1 }); /* buttons are custom, so we need to close and rebuild */
				
				s.sendGMCP('ModalInput', {
					
					title: my().PROMPT_NEW_CHAR,
					info: info,
					text: user.genCharname(),
					tag: 'input',
					type: 'text',
					abort: 'lobby',
					buttons: [
					    { text: my().CANCEL, send: '' },
					    { text: my().SUGGEST, send: 'start' },
					    { text: my().ACCEPT }
					]
				});
			}
			else {
				!info || s.send(info);
				s.snd('\r\n' + my().PROMPT_NEW_CHAR);
			}
			
			return;
		}
		
		Char.find({
			where: { name: d.cap() }
		})
		.then(function(r) {
			
			if (r)
				return user.charPromptName(s, 'start', u.format(my().CHAR_X_EXISTS, d));

			if (!user.validName(d, 'char'))
				return user.charPromptName(s, 'start', my().INVALID_CHARNAME);
			
			/* all good, create character */
			s.create.name = d;
			user.createChar(s);
		});
	},
	
	createChar: function(s) {

		debug('user.createChar');

		var m = my(), cls = m.classes;

		if (!s.create) {
			s.create = {};
			s.sendGMCP('Modal', { close: 1 });
		}
		
		if (!s.create.cls) {
			s.next = user.charPromptClass;
			return user.charPromptClass(s, 'start');
		}
		
		if (!s.create.sex) {
			s.next = user.charPromptSex;
			return user.charPromptSex(s, 'start');
		}
		
		if (!s.create.bg) {
			s.next = user.charPromptBg;
			return user.charPromptBg(s, 'start');
		}
		
		if (!s.create.name) {
			s.next = user.charPromptName;
			return user.charPromptName(s, 'start');
		}
		
		/* ready to create - hand off to char component */
		user.emit('create.pc', s);
	},
	
	enter: function (s) {
		
		delete s.next;
		s.ch.s = s;
		
		s.sendGMCP('Modal', { close: 1 });
		
		log('user.enter', s);
		user.emit('enter', s.ch);
	}
};