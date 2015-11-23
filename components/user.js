/* Havoc (c) 2014 */

/* This component handles interactions with the user while outside of a character
 * This includes creation of users and passwords, handling password resets.
 * Character creation and user preferences are handled in the user.lobby plugin.
 */

var fs = require('fs');
var u = require('util');
var events = require('events');

/* third-party */
var Seq = require('sequelize');
var md5 = require('MD5');
var eden = require('node-eden'); /* dictionary for fantasy names - see user.genCharname */
var mailer = require("nodemailer");
var sendmailTransport = require('nodemailer-sendmail-transport');
var transporter = mailer.createTransport(sendmailTransport());

addStrings({
	
	eng: {
		
		USERNAME:			("Press " + "reset".mxpsend() + " to request a password reset email.\r\nPress " + "token".mxpsend() + " if you already have one.").style(11, "&I") + "\r\nEnter new or existing username: ",
		USERPROMPT_INFO:	"To create a &dnew account&n, enter a desired username and leave the password field &dblank&n.".colorize(),
		USERNAME_PROMPT:	"Enter new or existing username: ",
		PASSWORD:			"Password: ",
		AUTH_FAIL:			"Invalid password. Try again: ",
		INVALID_PASSWORD:	"Invalid password (6 characters min.)",
		INVALID_NAME:		"Invalid name. Try another.",
		USERNAME_PLACEHOLDER:	"username",
		PASSWORD_PLACEHOLDER:	"password",
		
		RESET_REQUEST:		'Password Reset Request:',
		RESET_INFO:			'Enter the email address linked to your user account.',
		RESET_PROMPT_EMAIL:	"\r\nEnter the email address associated with your account: ",
		RESET_PROMPT_TOKEN:	"\r\nEnter the token you received in an email: ",
		RESET_EMAIL_SENT:	"\r\nIf we have this email on record, a reset token has been sent.",
		RESET_EMAIL_SUBJECT:"Your password reset token",
		RESET_EMAIL_BODY:	"Hello,\r\n\r\nA password reset token was requested for " + config.game.name + " username '%s'.\r\nThe reset token is: %s\r\n\r\nPress 'token' at the login prompt and enter it to complete your password reset.\r\n\r\nYours sincerely,\r\nVeda",
		ENTER_RESET_TOKEN:	"Enter Reset Token:",
		RESET_TOKEN:		"reset token",
		TOKEN_INFO:			"Check your linked email address for a reset token email.",
		TOKEN_INVALID:		"Invalid token. Please try again.",
		
		CREATE_NEW_PASSWORD: my().U_LOCK + " Create New Password:",
		CHANGE_PASSWORD:	"Enter a new password (or " + "cancel".mxpsend('') + "): ",
		YOU_CHANGED_PASSWORD: 	"You changed your password successfully",
		PASSWORD_INFO:		"Your password needs to be at least 6 characters long.",
		NEW_PASSWORD_PLACEHOLDER:	"new password",
		RE_PASSWORD_PLACEHOLDER:	"re-enter password",
		
		USER_AVAILABLE:		"\r\nUsername available. Would you like to create the account '%s'?",
		USER_EXISTS:		"\r\nUsername exists. Enter password, or " + "try another name".mxpsend('') + ".\r\nPassword: ",
		USER_EXISTS_INFO:	"Username exists. Enter password or try a different username to create.",
		PASS_GET:			"Give me a password for this user: ",
		PASS_GET_FOR_X:		"Give me a password for user '%s': ",
		PASS_CONFIRM:		"Retype the password for this user: ",
		EXPLAIN_EMAIL:		"\r\nAn email address enables password resets and offline notifications for which you have to opt in explicitly.\r\nWe'll never send you unsolicited email.",
		PROMPT_EMAIL:		my().U_ENVELOPE + " Enter email address: ",
		EMAIL_PLACEHOLDER:	"email address",
		
		OPT_OUT_EMAIL:		" opt out ".mxpsend(''),
		OPTED_OUT_OF_EMAIL:	"\r\nYou opted out of providing an email and will not be able to request password reminders or set up notifications unless you provide one later.",
		CONNECTED:			"\r\n&BConnected:&n",
		RECONNECTING:		"This user account has connected from elsewhere.",
		RECONNECTING_CHAR:	"This character has connected from elsewhere."
	}
});

var user_struct = {
		
	name: Seq.STRING,
	
	password: Seq.STRING,
	
	email: Seq.STRING,
	
	attr: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('attr')+')');
		},
		set: function(v) {
			this.setDataValue('attr', stringify(v));
		},
		allowNull: false
		//defaultValue: { pref: {}, role: 'player' }
	},
	
	points: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('points')+')');
		},
		set: function(v) {
			this.setDataValue('points', stringify(v));
		},
		allowNull: false
	}
};

module.exports = {

	init: function(re) {
		
		debug('user.init');
		
		server.register('user', 'request', user.welcome);

		server.register('user', 'end', function(s) {
			
			if (s.ch)
				s.ch.emit('exit');
			
			if (s.user)
				s.user.save();
		});

		havoc.register('user', 'init', function() {
			
			User = db.define('Users', user_struct);
			//db.debug(1);
			user.emit('init');
		});
		
		havoc.register('user', 'plugin.change', user.reloadPlugin);
		
		user.initPlugins(re);
	},

	initPlugins: function(re) {

		log('user.initPlugins');
		
		var plugins = fs.readdirSync('./plugins').filter(function(i) { return i.match(/^user\..+\.js/i); });
		log('user component detected plugins: ' + plugins.join(', '));
		
		for (var i in plugins) {

			var f = './plugins/'+plugins[i];
			
			delete require.cache[require.resolve('../'+f)];
			var p = require('../'+f);
			
			if (p.init)
				p.init(re), delete p.init;
			
			/* 	user plugins are not just extensions to the user instance, so we let each plugin
				decide where they want to go in their init method */
				
			log('loaded: ' + f.color('&155') + ' ' + Object.keys(p).join(', ').font('size=10'));
		}
	},

	reloadPlugin: function(comp, f) {

		if (comp != user) 
			return;

		debug('user.reloadPlugin');
		user.initPlugins(1);
		user.updateUsers();
	},
	
	/* handle disconnecting of existing user socket if multiple connects are disallowed */
	
	validateUser: function(s) {
		var ss = my().sockets;
		if (!config.game.allowMultipleUserConnections && !s.user.immo()) {
			for (var i in ss) {
				if (ss[i].user && ss[i].user.id == s.user.id && ss[i] != s) {
					ss[i].send(my().RECONNECTING);
					info('reconnecting socket (same user) ', ss[i]);
					server.closeSocket(ss[i]);
				}
			}	
		}
	},
	
	initUser: function(s) {
		point(s, user.socketMethods);
		!s.user || point(s.user, user.instanceMethods);
		s.color = 1; /* Color TV detected !!! */
	},
	
	/* method for updating authenticated users if plugins change dynamically */
	updateUsers: function() {
		
		debug('user.updateUsers');
		
		var ss = my().sockets;
		for (var i in ss)
			if (ss[i].user)
				user.initUser(ss[i]);	
	},

	welcome: function(s) {
		
		var m = my();
		point(s, user.socketMethods);
		user.emit('connect', s);
		
		s
		.snd(m.PROTOCOL.WILL_MXP)
		.snd(m.PROTOCOL.DO_GMCP)
		.snd(m.PROTOCOL.DO_CHARSET)
		.snd(m.PROTOCOL.WILL_CHARSET)
		.snd(m.PROTOCOL.WILL_UTF8)
		.snd(m.PROTOCOL.WILL_EXTASCII)
		.snd(m.PROTOCOL.WILL_GMCP)
		.snd(m.PROTOCOL.GO_MXP);

		after(2, function() {
			if (!s.user) {
				s.snd(m.LOGIN_SCREEN);
				user.userPrompt(s);
			}
		});
		
		s.next = user.userName;
	},

	userPrompt: function(s, err) {
		
		debug('userPrompt', s);
		
		if (s.portal) {
			
			var o = {
				title: my().USERNAME_PROMPT,
		        placeholder: my().USERNAME_PLACEHOLDER,
		        error: err,
		        links: {
		        	'Reset password': 'reset',
		        	'Enter token': 'token'
		        },
		    	backdrop: 'static'
		    };
			
			if (!err)
				o.info = my().USERPROMPT_INFO;
			
			s.sendGMCP('LoginPrompt', o);
		}
		else {
			!err || s.snd(err);
			s.snd(my().PROTOCOL.WONT_ECHO).snd(my().USERNAME);
		}
		
		s.next = user.userName;
	},
	
	userName: function (s, d) {
		
		if (!d)
			return server.closeSocket(s);

		s.username = d;
		debug('username: ' + d, s);
		user.userCheck(s);
	},
	
	userCheck: function (s, cb) {
		
		debug('userCheck', s);
		
		if (s.username.toLowerCase() == 'reset') {
			
			if (s.portal)
				s.sendGMCP('ModalInput', {
					title: my().RESET_REQUEST,
					info: my().RESET_INFO,
					placeholder: my().EMAIL_PLACEHOLDER,
					tag: 'input',
					type: 'email',
					abort: ''
				});
			else
				s.snd(my().RESET_PROMPT_EMAIL);
			
			s.next = user.resetRequest;
			return;
		}

		if (s.username.toLowerCase() == 'token') {
			
			if (s.portal)
				s.sendGMCP('ModalInput', {
					title: my().ENTER_RESET_TOKEN,
					info:	my().TOKEN_INFO,
					placeholder: my().RESET_TOKEN,
					tag: 'input',
					type: 'text',
					abort: ''
				});
			else
				s.snd(my().RESET_PROMPT_TOKEN);
							
			s.next = user.resetConfirm;
			return;
		}
				
		if (!user.validName(s.username, 'user')) {
			
			if (cb)
				return cb(-1);
			
			user.userPrompt(s, my().INVALID_NAME);
			return;
		}

		User.find({
			where: { name: s.username } 
		})
		.then(function(r) {
			
			if (cb)
				return cb(r);
	
			var m = my();
			
			if (r) {
				
				if (s.portal)
					return user.userPrompt(s, m.USER_EXISTS_INFO);
				
				s.snd(m.PROTOCOL.WILL_ECHO).snd(m.USER_EXISTS);
				s.next = user.password;
			}
			else {
				if (s.portal)
					s.sendGMCP('Modal', {
						title: 'Create user?',
						text: u.format(m.USER_AVAILABLE, s.username),
						buttons: {
							'Yes': 'yes',
							'No': 'no'
						}
					});
				else
					s.snd(u.format(m.USER_AVAILABLE, s.username) + ' ' + m.YES_NO);
				s.next = user.usernameConfirm;
			}
		});
	}, 

	resetRequest: function(s, d) {
		
		if (d && d.has('@') && d.has('.')) /* don't even try if it smacks of an invalid email */

			User.find({
				where: { email: d }
			})
			.then(function(r) {
				
				user.userPrompt(s, my().RESET_EMAIL_SENT);
				
				if (!r)
					return log('invalid reset token request for email ' + d);
				
				user.sendMail({
					from: config.game.name + " <noreply@ " + config.game.name.toLowerCase() + ".com>",
					to: r.email,
					subject: my().RESET_EMAIL_SUBJECT,
					text: u.format(my().RESET_EMAIL_BODY, r.name, md5(r.password))
				},
				function(e, r) { 
					dump(e || r); 
				});
			});
		else
			user.userPrompt(s);
	},
	
	resetConfirm: function(s, d) {
		
		if (!d || !d.length)
			return user.userPrompt(s);
		
		User.find({
			where: [ 'MD5(password) = "' + d + '"' ]
		})
		.then(function(r) {
			
			if (!r)
				return user.userPrompt(s, my().TOKEN_INVALID);

			s.username = r.name;
			s.next = user.passGet;

			if (s.portal)
				s.sendGMCP('ModalInput', {
					title: my().CREATE_NEW_PASSWORD,
					info: my().PASSWORD_INFO,
					placeholder: my().NEW_PASSWORD_PLACEHOLDER,
					tag: 'input',
					type: 'password',
					attr: 'reset',
					abort: '/n'
				});
			else
				s.snd(u.format(my().PASS_GET_FOR_X, s.username));
		});
	},
	
	usernameConfirm: function(s, d) {
		
		if (!d || d.cap()[0] != 'Y') 
			return user.userPrompt(s);
		
		s.next = user.email;
		
		if (s.portal)
			s.sendGMCP('ModalInput', {
				title: my().PROMPT_EMAIL,
				info: my().EXPLAIN_EMAIL,
				tag: 'input',
				type: 'text',
				placeholder: my().EMAIL_PLACEHOLDER,
				abort: '',
				closeText: 'Opt Out'
			});
		else
			s.snd(my().EXPLAIN_EMAIL.style(11, "&I") + '\r\n' + my().OPT_OUT_EMAIL + '\r\n' + my().PROMPT_EMAIL);
	},

	email: function(s, d) {
		
		if (d)
			s.email = d;
		else
			s.send(my().OPTED_OUT_OF_EMAIL.style(11, "&I"));
		
		if (s.portal)
			s.sendGMCP('ModalInput', {
				title: my().CREATE_NEW_PASSWORD,
				info: my().PASSWORD_INFO,
				placeholder: my().NEW_PASSWORD_PLACEHOLDER,
				tag: 'input',
				type: 'password',
				attr: 'reset',
				abort: '/n'
			});
		else
			s.snd(u.format(my().PASS_GET_FOR_X, s.username));
		
		s.next = user.passGet;
	},

	passGet: function(s, d) {
		
		if (!d)
			return user.userPrompt(s);
		
		if (!user.validPass(d))
			return user.userPrompt(s, my().INVALID_PASSWORD);

		s.password = d;
		s.next = user.passConfirm;
		s.snd(my().PASS_CONFIRM);
	},

	passConfirm: function (s, d) {

		if (!d)
			return user.userPrompt(s);

		if (s.password != d)
			return user.userPrompt(s, my().PASSWORDS_DIFFER);
		
		debug('confirm: ' + d);
		user.createUser(s, d);
	},
	
	password: function (s, d) {
		
		debug('user.password', s);
		
		if (!d)
			return user.userPrompt(s);
		
		if (!s.attempts)
			s.attempts = 0;

		User.find({ 
			where: {
				name: s.username, 
				password: md5(d) 
			},
			include: [{ model: Char,  as: "chars" }]
		})
		.then(function(r) {
			
			if (r) {
				
				delete s.next, delete s.attempts, delete s.username, delete r.password;
				s.user = r;
				
				user.initUser(s);
				user.validateUser(s);
				
				s.snd(my().PROTOCOL.WONT_ECHO);
				
				user.emit('login', s);
				return;
			}
			
			if (++s.attempts >= 3)
				server.closeSocket(s);
			else
				return user.userPrompt(s, my().AUTH_FAIL);
		});
	},

	createUser: function(s, d) {
		
		debug('user.createUser');
		
		User.create({
			name: s.username,
			password: md5(s.password),
			email: s.email || '',
			attr: { 
				pref: {}, 
				fb: s.fb, 
				role: 'player'
			},
			points: { 
				gold: 0, 
				frags: 0, 
				karma: 0 
			}
		})
		.then(function(usr) {
			
			user.emit('create', s);
			
			s.user = usr;
			user.initUser(s);
			
			if (usr.id == 1)
				usr.setAttr({ role: 'imp' });
			
			delete s.next, delete s.username;
			user.lobby(s);
		});
	},
			
	validName: function(n, type) {
		
		if (n.length < 3 || n.length > 36)
			return 0;
		
		n = n.toLowerCase();
		
		if (type == 'user' && n.search(/^[a-z0-9]+$/i))
			return 0;
		
		if (type == 'char' && n.search(/^[a-z]+$/i))
			return 0;
		
		if (n.vulgar())
			return 0;
		
		return 1;
	},

	validPass: function(p) { return (p.length > 5 && p.length < 36); },

	existingCharname: function(n) {
		
		return my().charindex.some(function(i) { return (i.name == n); }); 
	},
	
	genCharname: function(d) {
		
		if (d && d.sex) {
			if (d.sex == 'Female')
				return eden.eve();
			else
				return eden.adam();
		}
		else
			return NUM(0, 1) ? eden.adam() : eden.eve();
	},
	
	displayName: function(u) {

		if (!u.name.isnum())
			return u.name;
	
		if (u.email && u.email.has('@'))
			return u.email.split('@')[0];

		if (u.attr.fb && u.attr.fb.email && u.attr.fb.email.has('@'))
			return u.attr.fb.email.split('@')[0];
			
		return 'unknown';
	},
	
	sendMail: function(o, cb) {
		debug('user.sendMail ' + stringify(o));
		transporter.sendMail(o, cb);
	},
	
	/* unlike char plugins, we can merge some plugin methods directly into the socket (s), others into s.user */

	socketMethods: {
	
	},
	
	/* 	here, we have the same basic setters and getters as char instances 
		this is where we will set attributes and preferences at the user level
		and we will attach these to s.user
	*/
	
	instanceMethods: {
	
	}
};
