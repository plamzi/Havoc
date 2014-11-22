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
		
		USERNAME:			("Enter " + "reset".mxpsend() + " to request a password reset email.\r\nEnter " + "token".mxpsend() + " if you already have one.").style(11, "&Ki") + "\r\nEnter new or existing username: ",
		PASSWORD:			"Password: ",
		AUTH_FAIL:			"Invalid password. Try again: ",
		INVALID_PASSWORD:	"Invalid password (must be at least 6 characters). Try again: ",
		INVALID_NAME:		"Invalid name. Try another.",
		USER_AVAILABLE:		"Username available. Would you like to create the account '%s'?",
		USER_EXISTS:		"Username exists. Enter password, or " + "try another name".mxpsend('') + ".\r\nPassword: ",
		PASS_GET:			"Give me a password for this user: ",
		PASS_GET_FOR_X:		"Give me a password for user '%s': ",
		PASS_CONFIRM:		"Retype the password for this user: ",
		PROMPT_EMAIL:		"\r\nAn email address enables password resets and offline notifications for which you have to opt in explicitly.\r\nWe'll never send you unsolicited email.".style(11, "&Ki") + "\r\n" + " opt out ".mxpsend('') + " Enter email address: ",
		OPT_OUT_OF_EMAIL:	"\r\nYou opted out of providing an email and will not be able to request password reminders or set up notifications.".style(11, "&Ki"),
		CONNECTED:			"\r\n&BConnected:&n",
		RECONNECTING:		"This user account has connected from elsewhere."
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
		defaultValue: { pref: {}, role: 'player' }
	},
	points: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('points')+')');
		},
		set: function(v) {
			this.setDataValue('points', stringify(v));
		},
		allowNull: false,
		defaultValue: { gold: 0, karma: 0 }
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
			
			User.sync().then(function() {
				user.emit('init');
			});
		});
		
		havoc.register('user', 'plugin.change', user.reloadPlugin);
		
		user.initPlugins(re);
	},

	initPlugins: function(re) {

		log('user.initPlugins');
		
		var plugins = fs.readdirSync('./plugins');

		for (var i in plugins) {

			if (plugins[i].match(/^user\..+\.js/i)) {
	
				var f = './plugins/'+plugins[i];

				delete require.cache[require.resolve('../'+f)];
				var p = require('../'+f);
				
				log(plugins[i]);
				
				if (p.init)
					p.init(re), delete p.init;
				
				/* 	user plugins are not just extensions to the user instance, so we let each plugin
					decide where they want to go in their init method */
					
				log('loaded: ' + f.color('&155') + ' ' + Object.keys(p).join(', ').font('size=10'));
			}
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
					log('reconnecting socket (same user) ', ss[i]);
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
			if (!s.user)
				s.snd(m.LOGIN_SCREEN + m.USERNAME);
		});
		
		s.next = user.userName;
	},

	userName: function (s, d) {
		
		if (!d) {
			server.closeSocket(s);
			return;
		}

		s.username = d;
		debug('username: ' + d, s);
		user.userCheck(s);
	},
	
	userCheck: function (s, cb) {
		
		debug('userCheck', s);
		
		if (s.username.toLowerCase() == 'reset') {
			s.snd(my().RESET_PROMPT_EMAIL);
			s.next = user.resetRequest;
			return;
		}
		
		if (s.username.toLowerCase() == 'token') {
			s.snd(my().RESET_PROMPT_TOKEN);
			s.next = user.resetConfirm;
			return;
		}
				
		if (!user.validName(s.username, 'user')) {
			s.send(my().INVALID_NAME);
			if (cb)
				return cb(-1);
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
				s.snd(m.PROTOCOL.WILL_ECHO).snd(m.USER_EXISTS);
				s.next = user.password;
			}
			else {
				s.snd(u.format(m.USER_AVAILABLE, s.username) + ' ' + m.YES_NO);
				s.next = user.usernameConfirm;
			}
		});
	}, 

	resetRequest: function(s, d) {
		
		if (d && d.has('@') && d.has('.')) /* don't even try to email if it smacks of an invalid email */

			User.find({
				where: { email: d } 
			})
			.then(function(r) {
				
				if (!r)
					return log('invalid reset token request for email ' + d);
				
				user.sendMail({
					from: "Aaralon <admin@aaralon.com>",
					to: r.email,
					subject: my().RESET_EMAIL_SUBJECT,
					text: u.format(my().RESET_EMAIL_BODY, r.name, md5(r.password))
				},
				function(e, r) { 
					dump(e || r); 
				});
			});
		
		s
		.send(my().RESET_EMAIL_SENT)
		.snd(my().USERNAME);
		
		s.next = user.userName;
	},
	
	resetConfirm: function(s, d) {
		
		if (!d || d > 255) {
			s.next = user.userName;
			s.snd(my().USERNAME);
			return;
		}
		
		User.find({
			where: [ 'MD5(password)', d ]
		})
		.then(function(r) {
			
			if (r) {
				s.username = r.name;
				s.next = user.passGet;
				s.snd(u.format(my().PASS_GET_FOR_X, s.username));
			}
			else {
				s.send(my().TOKEN_INVALID);
				s.next = user.userName;
				s.snd(my().USERNAME);
			}
		});
	},
	
	usernameConfirm: function(s, d) {
		if (!d || d.cap()[0] != 'Y') {
			s.next = user.userName;
			s.snd(my().USERNAME);
			return;
		}
		s.next = user.email;
		s.snd(my().PROMPT_EMAIL);
	},

	email: function(s, d) {
		
		if (d)
			s.email = d;
		else
			s.send(my().OPT_OUT_OF_EMAIL);
		
		s.next = user.passGet;
		s.snd(u.format(my().PASS_GET_FOR_X, s.username));
		return;
	},

	passGet: function(s, d) {
		if (!d || !user.validPass(d)) {
			s.snd(my().INVALID_PASSWORD);
			return;
		}
		s.password = d;
		s.next = user.passConfirm;
		s.snd(my().PASS_CONFIRM);
	},

	passConfirm: function (s, d) {

		if (!s.username) {
			log('register error');
			server.closeSocket(s);
			return;
		}
		
		if (s.password != d) {
			s.snd(my().PASSWORDS_DIFFER.style(11, "&Ki"));
			s.snd(my().PASS_GET);
			s.next = user.passGet;
			return;
		}
		
		debug('confirm: ' + d);
		user.createUser(s, d);
	},
	
	password: function (s, d) {
		
		debug('user.password', s);
		
		if (!s.attempts)
			s.attempts = 0;

		if (!user.validPass(d)) {
			
			if (++s.attempts >= 3)
				server.closeSocket(s);
			else {
				s
				.snd(my().PROTOCOL.WILL_ECHO)
				.snd(my().PASSWORD);
				return;
			}
		}

		User.find({ 
			where: {
				name: s.username, 
				password: md5(d) 
			},
			include: [{
				model: Char, as: "chars", 
			    //include: [{ model: Quest, as: "quests" }]
			}]
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
				return s.snd(my().AUTH_FAIL);
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
				role: my().userindex.length ? 'player' : 'imp' 
			}
		})
		.success(function() {
			user.emit('create', s);
			delete s.next, delete s.username;
			user.password(s, d);
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
