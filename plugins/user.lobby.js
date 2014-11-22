/* Havoc (c) 2014 */

/* handles character creation as well as any other actions users can take in the lobby */

var u = require('util');
var md5 = require('MD5');

addStrings({

	eng: {
	
		PROMPT_CHAR:		"To create or play existing, select a character name.\r\nBy what name would you like to be known? ",
		
		RESET_PROMPT_EMAIL:	"Enter the email address associated with your account: ",
		RESET_PROMPT_TOKEN:	"Enter the token you received in an email: ",
		RESET_EMAIL_SENT:	"If we have this email on record, a reset token has been sent.",
		RESET_EMAIL_SUBJECT:"Your password reset token",
		RESET_EMAIL_BODY:	"Hello,\r\n\r\nA password reset token was requested for " + config.game.name + " username '%s'.\r\nThe reset token is: %s\r\n\r\nEnter the token at the login prompt to complete your password reset.\r\n\r\nYours sincerely,\r\nVeda",
		CHANGE_PASSWORD:	"Enter a new password (or " + "cancel".mxpsend('') + "): ",
		YOU_CHANGED_PASSWORD: "You changed your password successfully",
		
		CHAR_EXISTS:		"The name '%s' is not available. Please try another: ",
		CHAR_AVAILABLE:		"Would you like to create '%s'? ",
		CHAR_INVALID:		"Invalid character name. Please try another: ",
		CREATION_ERROR: 	'Creation error:',
		INVALID_CHARNAME: 	'Invalid character name. Try something more heroic, like &c%s&n.',
		MALE:				"Male",
		FEMALE:				"Female",
		BACK:				("B".font('color=white') + "ack").mxpsend('back') + ' ',
		SELECT_SEX:			" Select sex: ",
		SELECT_CLASS:		" Select class: ",
		SELECT_BACKGROUND:	" Select background:\r\n" 
							+ ("Martial").mxpsend('martial', 'A martial background makes you untrackable and grants +5% Experience.') + ' '
							+ ("Scholarly").mxpsend('scholarly', 'A scholarly background grants permanent sense life and detect magic.') + ' '
							+ ("Criminal").mxpsend('criminal', 'A criminal background grants permanent infravision and protection from good.') + ' '
							+ ("Spiritual").mxpsend('spiritual', 'A spiritual background bestows permanent detect align and protection from evil.'),
		CREATE_CONFIRM:		" Create %s, a %s %s with a %s past? ",
		YOU_SELECTED: 		"You selected",
		YES_NO:				("Y".font('color=white') + "es").mxpsend('yes') + ' ' + ("N".font('color=white') + "o").mxpsend('no') + ' ',
		
		YOUR_PREFERENCES: 	"Notification Options:".color('&c'),
		
		USER_PREFERENCES:	[
		            		 ['Forward Private Messages', 'Forward any private messages immediately to your email address (if supplied).'],
		            		 ['Daily Summary Email', 'Once daily, send an email with in-game updates such as guild news and activities, private messages, etc.'],
		            		 ['Send Daily Gossip', 'Include gossip channel in the daily summary email (if enabled)']
		            		]
	}
});

module.exports = {
	
	init: function(re) {
		
		log('user.lobby init');
		
		point(user, this, null, ['init']); /* merge into user component methods, leave out the init method */
		
		user.register('user.lobby', 'login', user.lobby);

		if (re)
			user.updateUsers();
	},
	
	lobby: function(s) { /* List all characters under a player's account */
		
		var m = my(), ss = m.sockets;

		if (s.ch) {
			log('returned to char menu', s);
			delete s.ch;
		}
		else
			log('user.lobby: first entry', s);

		s.send('\r\n' 
			+ m.U_GEAR.style(16, '&178').mxpsend('pref', 'Manage your user account preferences.') + ' ' 
			+ this.displayName(s.user).mxpsend('password', 'Click to set or change your account password.').style(12, '&Ki') + ' ' 
			+ m.U_ENVELOPE.style(16, '&178').mxpsend('email', 'Change or set an email address to enable notifications.') + ' ' 
			+ (s.user.email.length ? s.user.email : 'no email').mxpsend('email').style(12, '&Ki') + ' '
			
		);

		for (var i in s.user.chars) {
			var a = s.user.chars[i];
			s.send(
				m.U_PAWN.style(16, '&178') + ' '
				+ a.name.mxpsend(a.name) + ' ' 
				+ m.U_STAR.color('&208') + ' ' 
				+ a.level + ' ' + m.SEX[a.sex].symbol + ' ' 
				+ (a.class + ', ' + a.trade).color('&Ki')
			);
		}

		s.snd('\r\n' + m.PROMPT_CHAR);
		s.sendGMCP('user.chars', s.user.chars);
		
		s.next = user.charName;
	},
	
	charName: function(s, d) {
		
		log('user.charName');
		
		if (!d.length)
			return user.lobby(s);

		if (d == 'chars')
			return user.lobby(s);
		
		if (d == 'email') {
			s.snd(my().PROMPT_EMAIL);
			s.next = user.changeEmail;
			return;
		}
		
		if (d == 'pref') {
			user.showPrefs(s);
			return;
		}
		
		if (d == 'password') {
			s
			.snd(my().PROTOCOL.WILL_ECHO)
			.snd('\r\n' + my().CHANGE_PASSWORD);
			s.next = user.changePassword;
			return;
		}
		
		d = d.cap();

		Char.find({
			where: { name: d, UserId: s.user.id }
		})
		.success(function(r) {
			
			if (!r) {
				
				if (!user.validName(d, 'char')) { 
					s.snd(u.format(my().INVALID_CHARNAME, user.genCharname(d)));
					s.next = user.charName;
					return;
				}
				
				/* available character name */
				s.next = user.confirmChar;
				s.snd(u.format(my().CHAR_AVAILABLE, d) + ' ' + my().YES_NO);
				s.charname = d;
			}
			else /* existing character name belonging to this user */
			if (s.user.id == r.UserId) {
				s.ch = r;
				user.enter(s);
			}
			else { /* existing char name belonging to another user */
				s.snd(u.format(my().CHAR_EXISTS, d));
				s.next = user.charName;
			}
		});
	},
	
	changeEmail: function(s, d) {

		log('user.changeEmail: ' + stringify(d));
		
		s.user.updateAttributes({ email: d }).success(function() {
			user.lobby(s);
		});
	},
	
	showPrefs: function(s) {

		log('user.showPrefs');
		
		var checked = my().U_SQUARE_FULL.style(18, '&n');
		var unchecked = my().U_SQUARE_EMPTY.style(18, '&n');
		
		s.send('\r\n' + my().YOUR_PREFERENCES);
		
		my().USER_PREFERENCES.forEach(function(i) {
			s
			.snd(s.user.attr.pref[i[0]] ? checked : unchecked)
			.snd(' ' + i[0].mxpsend(i[0], i[1]) + '\r\n');
		});
		
		s.snd(' Done '.mxpsend());
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
	
	changePassword: function(s, d) {
		
		if (!d)
			return user.lobby(s);
		
		if (!user.validPass(d)) {
			s.send(my().INVALID_PASSWORD);
			s.snd(my().CHANGE_PASSWORD);
			return;
		}
		
		s.password = d;
		s.snd('\r\n' + my().PASS_CONFIRM);
		s.next = user.changePasswordConfirm;
	},
	
	changePasswordConfirm: function(s, d) {
		
		if (!d.length) {
			s.snd(my().PROTOCOL.WONT_ECHO);
			return user.lobby(s);
		}
		
		if (s.password != d) {
			s.send(my().PASSWORDS_DIFFER.style(11, "&Ki"));
			s.snd(my().CHANGE_PASSWORD);
			return;
		}
		
		s.snd(my().PROTOCOL.WONT_ECHO);
			
		s.user
		.updateAttribute({ password: md5(d) })
		.success(function() {
			s.send(my().YOU_CHANGED_PASSWORD);
			user.lobby(s);
		});
	},

	confirmChar: function(s, d) {
		
		log('user.confirmChar: '+d, s);
		
		if (!d || d.cap()[0] != 'Y') {
			delete s.charname;
			return user.lobby(s);
		}
		
		s.create = [];
		user.create(s, s.charname);
	},

	create: function(s, d) {

		log('user.create ' + d);
		var m = my(), cls = m.classes;
		
		if (s.create.length == 0) {
			
			if (!d || d.cap()[0] == 'B') {
				delete s.charname, delete s.create;
				return user.lobby(s);
			}
		
			s.create = [ s.charname ];
			s.next = user.create;
			delete s.charname;
			
			s.snd('\r\n');

			for (var i in cls)
				if (cls[i].minLevel == 0)
					s.send(cls[i].name.mxpsend(cls[i].name) + ' ' + cls[i].desc.color('&Ki'));
					
			s.snd('\r\n' + m.BACK.mxpsend() + m.SELECT_CLASS);
		}
		else
		if (s.create.length == 1) {
			
			if (!d || d.cap()[0] == 'B') {
				delete s.charname, delete s.create;
				return user.lobby(s);
			}

			d = cls.filter(function(c) { return d.isAbbrev(c.name); });
			
			if (!d) {
				s.charname = s.create.pop();
				return user.create(s);
			}
			
			s.create.push(d[0].name);
			
			s.snd(
			m.YOU_SELECTED + ' '+d[0].name.color('&W')  + '\r\n\r\n'
			+ m.MALE.mxpsend() + ' ' + m.FEMALE.mxpsend() + '\r\n\r\n' 
			+ m.BACK.mxpsend() + m.SELECT_SEX);
		}
		else
		if (s.create.length == 2) {
			
			if (!d || d.cap()[0] == 'B') {
				delete s.charname, delete s.create;
				return user.lobby(s);
			}
			
			d = d.cap();
			
			if (d[0] == 'M')
				s.create.push('male');
			else
			if (d[0] == 'F')
				s.create.push('female');
			else
				return user.create(s, s.create.pop());
			
			s.Send(m.YOU_SELECTED + ' ' + s.create[2].color('&W'));
			s.snd(m.BACK.mxpsend() + m.SELECT_BACKGROUND);	
		}
		else
		if (s.create.length == 3) {
			
			if (!d || d.cap()[0] == 'B') {
				delete s.charname, delete s.create;
				return user.lobby(s);
			}
			
			d = d.cap();
			
			if (d.isAbbrev('scholarly'))
				s.create.push('scholarly');
			else
			if (d.isAbbrev('criminal'))
				s.create.push('criminal');
			else
			if (d.isAbbrev('martial'))
				s.create.push('martial');
			else
			if (d.isAbbrev('spiritual'))
				s.create.push('spiritual');
			
			s.Send(m.YOU_SELECTED + ' ' + s.create[3].color('&W'));
			s.snd(u.format(m.BACK.mxpsend() + m.CREATE_CONFIRM + ' ' + m.YES_NO, s.create[0], s.create[2], s.create[1], s.create[3]));	
		}
		else
		if (s.create.length == 4) {
			
			if (!d || d.cap()[0] == 'B') {
				delete s.charname, delete s.create;
				return user.lobby(s);
			}
			
			if (d.cap()[0] == 'N') {
				delete s.charname, delete s.create;
				return user.lobby(s);
			}
			
			/* pass the baton to char component */
			user.emit('create.pc', s);
		}
	},
	
	enter: function (s) {
		
		delete s.next;
		s.ch.s = s;
		
		log('user.enter', s);
		user.emit('enter', s.ch);
	}
};