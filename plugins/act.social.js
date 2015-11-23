var u = require('util');
var Seq = require('sequelize');

addStrings({
	
	eng: {
		CHAT_SELF:				"You: &w%s&n",
		NO_SUCH_PERSON:			"There's no such person around.",
		GOSSIP_USAGE:			"Usage: gossip message | gossip 1-100 (for gossip log)",
		SAY_USAGE:				"Usage: say message.",
		TELL_USAGE:				"Usage: tell (char_name | user_id) something | tell 1-100 (for tell log)",
		PM_USAGE:				"Usage: pm (char_name | user_id)",
		PRIVATE_MESSAGE_TO_:	"Private message to ",
		PM_BEGIN_MESSAGE_TO_X:	"Private message to %s. Enter /s on a line by itself to send.",
		PM_ABORTED:				"Private message aborted.",
		PM_SENT:				"Private message sent.",
		NO_RECENT_X_TO_SHOW:	"No recent %s to show.",
	}
});

var social_struct = {
	Command: Seq.STRING(45),
	CharNoArg: Seq.STRING(100),
	OthersNoArg: Seq.STRING(100),
	CharFound: Seq.STRING(100),
	OthersFound: Seq.STRING(100),
	VictFound: Seq.STRING(100),
	NotFound: Seq.STRING(100),
	CharAuto: Seq.STRING(100),
	OthersAuto: Seq.STRING(100),
	MinPos: Seq.STRING(100),
	Hide: Seq.INTEGER,
	Racy: Seq.INTEGER
};

var message_struct = {
	name: Seq.STRING(100),
	type: Seq.STRING(45),
	from: Seq.STRING(45),
	to: Seq.STRING(45),
	from_id: Seq.INTEGER,
	to_id: Seq.INTEGER,
	text: Seq.TEXT,
	attr: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('attr')+')');
		},
		set: function(v) {
			this.setDataValue('attr', stringify(v));
		}
	}
};

/* private functions calling socials from the db table */

var social = function(ch, soc, arg) {

	var c = my().socials[soc];

	if (!arg) {
		ch.send(c.CharNoArg.cap().style('social'), 'chat');
		ch.sendAt(c.OthersNoArg.pronoun(ch).cap().style('social'), [ /* exclude nobody */ ], 'chat');
		return;
	}
	
	var t = ch.findActor(arg[0]);
	
	if (!t) {
		ch.send(c.NotFound.cap());
		return;
	}
	
	if (t == ch) {
		ch.send(c.CharAuto.cap(), 'chat');
		ch.sendAt(c.OthersAuto.pronoun(ch, t).cap(), [], 'chat');
		return;
	}
	
	ch.send(c.CharFound.pronoun(ch, t).cap().style('social'), 'chat');
	t.send(c.VictFound.pronoun(ch, t).cap().style('social'), 'chat');
	ch.sendAt(c.OthersFound.pronoun(ch, t).cap().style('social'), [t], 'chat');
};

var canSocial = function(c) {
	
	if (my().socials[c])
		return c;

	for (var C in my().socials)
		if (c.isAbbrev(C))
			return C;
	
	return null;
};

var pm = function(cmd) {

	var ch = this;
	
	//log('act.social: pm input from ' + ch.name + ': ' + stringify(ch.input));
	
	if (cmd == '/a') { //debug('act.social: pm abort');
		
		if (!ch.portal)
			ch.send(my().PM_ABORTED);
		
		return my().HANDLED;
	}
	
	if (cmd == '/s') { //debug('act.social: pm send');

		Message.create(ch.pm).then(function() {
			
			ch.send(my().PM_SENT);
			var usr = my().userindex[ch.pm.to_id];
			
			if (usr && usr.attr.pref['Forward Private Messages'] && usr.email && usr.email.has('@')) {
				
				user.sendMail({ 
					from: ch.pm.from + " <noreply@aaralon.com>",
					to: usr.email,
					subject: config.game.name + ': New Private Message',
					text: ch.pm.text
				},
				function(e, r) { 
					dump(e || r); 
				});
			}
			
			delete(ch.pm);
		});
		
		return my().HANDLED;
	}
	
	ch.pm.text += ch.input.line + '\r\n';
	return my().REDIRECTED;
};

module.exports = {
	
	init: function(re) {
		
		havoc.register('act.social', 'init', function() {
			
			Message = db.define('Messages', message_struct);
			//Message.sync();
			var Social = db.define('Socials', social_struct, { timestamps: 0 });
			
			//Social.sync()
			Social.findAll()
			.then(function(r) { 
				
				my().socials = {};
				
				for (var i in r)
					my().socials[r[i].Command] = r[i];
				
				info('act.social finished loading socials from db: '+Object.keys(my().socials).length);
			});
		});

		char.register('act.social', 'enter', function(ch) {
			
			ch.register('act.social', '3.do', function() {
				if (ch.input) {
					var c;
					if ((c = canSocial(ch.input.cmd))) {
						social(ch, c, ch.input.arg);
						delete ch.input;
						ch.emit('social', c);
					}
				}
			});
			
			ch.register('act.social', 'social', function(type, msg) {
				var a = this.getActorsAt();
				for (var i in a)
					if (a[i] != this)
						a[i].emit('proc.' + type, this, msg);
			});
			
			ch.register('act.social', 'speech', function(type, arg1, arg2) {
				
				var ch = this;
				
				/* trigger speech procs */
				var a = this.getActorsAt();
					for (var i in a)
						if (a[i] != ch) {
							a[i].emit('proc.' + type, ch, arg1, arg2);
							//log('proc.' + type + ' on ' + a[i].name);
						}
				/* Let's log for posterity */
				if (type == 'gossip') {
					Message.create({
						type: 'speech.gossip',
						from: ch.name,
						from_id: ch.id,
						text: arg1,
						attr: { pc: ch.pc() }
					});
				}
				else
				if (type == 'tell') {
					Message.create({
						type: 'speech.tell',
						from: ch.name,
						from_id: ch.id,
						to:		arg1.name,
						to_id:	arg1.id,
						text: arg2,
						attr: { from_pc: ch.pc(), to_pc: arg1.pc() }
					});
				}
			});
		});
		
		char.register('act.social', 'enter.pc', function(ch) {
			ch.snd('<FRAME Name="chat" Parent="ChatterBox">'.mxp());		
			ch.do('gossip 20');		
		});
	},

	gossip: function(arg) {
		
		var ch = this;
		
		if (!arg)
			return ch.send(my().GOSSIP_USAGE);
		
		if (arg[0].isnum()) {
			
			var n = MIN(100, parseInt(arg[0]));
			
			Message.findAll({ 
				where: { type: 'speech.gossip' }, 
				order: 'createdAt DESC', 
				limit: n 
			})
			.then(function(r) {
			
				if (!r)
					return ch.send(u.format(my().NO_RECENT_X_TO_SHOW, 'gossip'));
				
				r.reverse();
				var chat = '';
				
				for (var i in r) {
					var t = r[i].createdAt.toUTCString().substring(0, 22).replace(',','').split(' ');
					chat += (t[0] + ' ' + t[4]).style(11, '&K') + '  ' + r[i].from.color('&Y') + ': ' + r[i].text + '\r\n';
				}
				
				ch.snd(chat.mxpdest('chat'));
			});
			
			return;
		}
		
		msg = arg.join(' ');
		
		var format = function(from, to, msg) {
			if (from == to)
				return u.format(my().CHAT_SELF.color('&Y'), msg);
			else
				return u.format("%s: &n%s".color('&Y'), from.name, msg);
		};
		
		var s = my().sockets;
		
		for (var i = 0; i < s.length; i++)
			if (s[i].ch)
				s[i].ch.send(format(ch, s[i], msg), 'chat');
		
		ch.emit('speech', 'gossip', msg);
	},
	
	say: function(arg) {
		
		var ch = this;
		
		if (!arg)
			return ch.send(my().SAY_USAGE);
			
		msg = arg.join(' ');
		
		var format = function(from, to, msg) {
			if (from == to)
				return u.format(my().CHAT_SELF.color('&W'), msg);
			else
				return u.format("%s: &n%s".color('&W'), from.name.cap(), msg);
		};

		ch
		.sendAt(format(ch, 0, msg), [], 'chat')
		.send(format(ch, ch, msg), 'chat')
		.emit('speech', 'say', msg);
	},

	tell: function(arg) {

		if (!arg || arg.length < 2)
			return this.send(my().TELL_USAGE);

		var ch = this, to = arg.shift(), msg = arg.join(' ');

		if (arg[0].isnum()) {
			
			var n = MIN(100, parseInt(arg[0]));
			
			Message.findAll({ 
				where: Seq.and(
					{ type: 'speech.tell' },
					Seq.or(
						{ from_id: ch.id }, { to_id: ch.id }
					)
				),
				limit: n
			})
			.then(function(r) {
			
				if (!r)
					return ch.send(u.format(my().NO_RECENT_X_TO_SHOW, 'tells'));

				for (var i in r)
					ch.send(r[i].createdAt.toUTCString().substring(0, 22).style(11, '&I') + ' ' 
					+ r[i].from.color('&Y') + ': ' + r[i].text);
			});
			
			return;
		}
		
		to = ch.findActor(to, 'world');
		
		if (!to)
			ch.send(my().NO_SUCH_PERSON);
		
		ch
		.send(u.format("@%s: &n%s".color('&r'), to.name, msg), 'chat')
		.emit('speech', 'tell', to, msg);
		
		to.send(u.format("%s: &n%s".color('&r'), ch.name, msg), 'chat');
	},
	
	pm: function(arg, complete) {
		
		var ch = this;
		
		if (!arg)
			return ch.send(my().PM_USAGE);
		
		if (arg[0].isnum()) {
			
			var usr = my().userindex[arg[0]];
			
			if (!usr)
				return ch.send(my().PM_USAGE);
			
			ch.next = pm;
			ch.pm = {
				type: 'pm',
				from: ch.user.name || ch.name,
				from_id: ch.user.id,
				to: usr.name,
				to_id: usr.id,
				text: '',
				complete: complete
			};
			
			if (ch.s && ch.s.portal)
				ch.sendGMCP('ModalInput', {
					title: my().PRIVATE_MESSAGE_TO_ + usr.name,
					after: '\r\n/s',
					abort: '/a'
				});
			else
				ch.send(u.format(my().PM_BEGIN_MESSAGE_X, usr.name));
		}
		
		/* support for pm charname? */
	}
};
	