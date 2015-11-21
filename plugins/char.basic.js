/* Havoc (c) 2014 */

/* Basic char instance methods. These are not user-facing and generally provide 
the ability to modify a character or manipulate the world through the lens of one. */

var u = require('util');

addStrings({
	eng: {

	}
});
 
/* private functions that we'll attach to listeners inside char.init */

var onDo = function(ch) {
	
	if (ch.input) {
		
		var c;

		/* check for two-word commands so we can support simpler spell-casting e. g. */
		if (ch.input.arg)
			
			if ((c = ch.canDo(ch.input.cmd + ' ' + ch.input.arg[0]))) {
				
				ch.input.arg.shift();
				
				if (ch.input.arg && !ch.input.arg.length)
					ch.input.arg = null; /* set to null for 2-word commands as well to conform in-command arg checks */
				
				c.call(ch, ch.input.arg);
				return delete ch.input;
			}
		
		/* and now one-word commands */
		if ((c = ch.canDo(ch.input.cmd))) {
			c.call(ch, ch.input.arg);
			delete ch.input;
		}
	}
};

/* expire any persistent character affects that are due to go away */

var expireAffs = function(ch) {
	var aff = ch.attr.aff;
	if (aff)
		for (var i in aff) {
			if (aff[i].expires && aff[i].expires < now()) 
				ch.unsetAff(i);
		}
};

var applyAff = function(ch, stat) {

	var aff = ch.attr.aff;
	
	if (aff)
		for (var i in aff) {
			
			/* 	First check if already expired. This means we don't need to be very strict about expiring. 
				Even if we don't expire aggressively, the affect will drop on the next application attempt.
			*/
			if (aff[i].expires && aff[i].expires < now()) {
				ch.unsetAff(i);
				continue;
			}

			if (aff[i].affects[stat])
				ch.temp[stat] += aff[i].affects[stat]; 
		}
};

module.exports = {
	
	init: function(re) {
	
		char.register('char.basic', 'enter', function(ch) {
			
			/* queue for throttling in-character commands */
			ch.temp.cmds = [];
			
			/* assign the basic command parser, as a 2nd tier priority */
			ch.register('char.basic', '2.do', function() { onDo(this); });
			
			/* expire old affects on pulse */
			ch.register('char.basic', 'proc.pulse', function() { expireAffs(this); });

			/* hook to the basic stat method so char affs can modify stats */
			ch.register('char.basic', 'stat', function(d) { applyAff(this, d); });
		});
		
		char.register('char.basic', 'exit', function(ch) {
			ch.stop();
		});
	},
	
	temp: { }, /* we'll use this for temporary storage of values we need to pass to listeners and check after that, e. g. stat affects */
	
	/* output - forward to socket functions */

	snd: function(d, dest) { if (this.s) this.s.snd(d, dest); return this; },
	
	send: function(d, dest) { this.snd(d + '\r\n', dest); return this; },
	
	Send: function(d) { this.snd(d + '\r\n\r\n'); return this; },
	
	sendGMCP: function() { if (this.s) this.s.sendGMCP.apply(this.s, arguments); return this; },
	
	sendMXP: function() { if (this.s) this.s.sendMXP.apply(this.s, arguments); return this; },

	sendAt: function (msg, skip, dest) {
		
		var ch = this, a = ch.getActorsAt('all');
		
		for (var i = 0; i < a.length; i++) {
			
			if (a[i] == ch)
				continue;
			
			if (skip && skip.has(a[i]))
				continue;
				
			a[i].send(msg.cap(), dest);
		}
		
		return this;
	},

	/* character-level interpreter, used by MobProcs as well */
	
	do: function(d) {

		var ch = this, c, line, cmd, arg = null;
		
		if (d && d.length) {
			d = d.trim().replace(/([^ ]);([^ ])/gi, '$1\r\n$2');
			ch.temp.cmds = ch.temp.cmds.concat(d.split('\r\n'));
		}

		var cmds = ch.temp.cmds;
		
		if (!cmds[0])
			return;
		
		line = cmds.shift(1);
		cmd = line.split(' ');
		
		/* if next command is a move, set moving flag so we can shorten output */
		ch.moving = (cmds[0] && world.isDir(cmds[0]));

		if (ch.s && !world.isDir(line) && config.server.dev)
			info('char.basic ch.do: ' + line, ch.s);

		ch.emit('snoop', line);

		if (cmd.length > 1)
			arg = cmd.slice(1);

		cmd = cmd[0];

		ch.input = { cmd: cmd, arg: arg, line: line };

		/* a function may be waiting in ch.next. if it returns true, assume the input
		*  was handled by it. if not, we go on. */
		if (ch.next) {
			
			debug('detected active ch.next');
			
			var res = ch.next(cmd, arg);
			
			if (res == my().UNHANDLED)
				delete ch.next;
			else
			if (res == my().HANDLED)
				delete ch.input, delete ch.next;
			else
			if (res == my().REDIRECTED)
				delete ch.input; /* we don't delete ch.next here - handler wants to stay active or passed us to another handler */
		}

		/* higher priority commands like movement, look, etc. */
		if (ch.input)
			ch.emit('1.do');

		/* normal priority commands should go under 2.do */
		if (ch.input)
			ch.emit('2.do');
		
		/* lower priority commands (like socials) can listen for 3.do */
		if (ch.input)
			ch.emit('3.do');
		
		if (ch.input) /* could not recognize input as any of the available commands, suggest */
			ch.suggest(cmd, arg);
		
		/* more commands in queue. re-run after brief delay */
		!cmds[0] || after(0.1, function() { ch.do(); });
		
		return ch;
	},
	
	/* basic modification methods */
	
	gain: function(type, gain) {
		
		var ch = this, p = ch.points, was;
		
		if (!p[type])
			p[type] = 0;
		
		was = p[type], p[type] += gain;
		
		if (exists(p['max'+type]))
			p[type] = MIN(p[type], p['max'+type]);
		
		if (was != p[type]) {
			//log('ch.gain was is' + was + ' -> ' + p[type]);
			ch.updateAttributes({ points: p }, ['points']).then(function() {
				ch.emit('gain.' + type, gain);
				ch.sendGMCP("ch.points", p);
			});
		}
		
		return ch;
	},
	
	restore: function() {
		
		var ch = this, p = ch.points;
		
		for (var i in p)
			if (p['max'+i])
				p[i] = p['max'+i];
		
		ch.updateAttributes({ points: p }, ['points']);
		ch.sendGMCP("ch.points", p);
		
		return ch;
	},

	/* finders & getters */

	findActor: function(arg, mode) {
	
		var ch = this, n = 1, j = 0;
		
		mode = mode || 'at-vis';
		
		if (!arg)
			return null;
		
		if (arg.has('.')) {
			var ar = arg.split('.');
			n = parseInt(arg[0]);
			arg = ar[1];
		}
		
		var a = (mode == 'world')?char.getActors():ch.getActorsAt(mode);
		
		if (!a.length)
			return null;
		
		for (var i in a) {
			
			/* enable match by exact name or unique id */
			if (a[i].name == arg || a[i].id == arg) {
				if (mode.has('vis') && !ch.canSee(a[i]))
					continue;
				return a[i];
			}

			var x = a[i].name.split(' ');
			for (var k in x)
				if (arg.isAbbrev(x[k])) {
					if (mode.has('vis') && !ch.canSee(a[i]))
						continue;
					if (++j == n) 
						return a[i];
				}
		}
		
		return null;
	},
	
	getPlayers: function() {
		var res = [], ss = my().sockets;
			for (var i in ss)
				if (ss[i].ch)
					res.push(ss[i].ch);
		return res;
	},
	
	getOnlineChar: function(userid) {
		
		var online = this.getPlayers().filter(function(ch) { return ch.UserId == vict.id; });
		return online.length ? online[0] : null;	
	},
	
	getMobsAt: function(mode) {

		var ch = this;
		mode = mode || 'at';

		if (mode.has('vis'))
			return ch.inRoom().filter(function(vict) {
				return vict.npc() && ch != vict && ch.canSee(vict);
			});
			
		if (mode.has('at') || mode.has('all'))
			return ch.inRoom().filter(function(vict) {
				return vict.npc() && ch != vict;
			});
		
		log('char.getMobsAt: unknown mode '+mode);
	},
	
	getPlayersAt: function(mode) {
		
		var ch = this, s = server.sockets;
		mode = mode || 'at-vis';

		if (mode.has('world'))
			return ch.getPlayers();

		if (mode.has('vis'))
			return ch.inRoom()
			.filter(function(vict) {
				return vict.pc() && ch.canSee(vict);
			});

		if (mode.has('at') || mode.has('all'))
			return ch.inRoom()
			.filter(function(vict) {
				return vict.pc();
			});
			
		log('char.getPlayersAt: unknown mode '+mode);
	},

	getActorsAt: function(mode, exclude) {
	
		var ch = this;
		mode = mode || 'vis';

		if (mode == 'all')
			return world.getActors(ch.at).filter(function(vict) {
				if (exclude && exclude.has(vict))
					return false;
				return true;
			});

		if (mode.has('seeing') && mode.has('vis'))
			return world.getActors(ch.at).filter(function(vict) {
				if (exclude && exclude.has(vict))
					return false;
				return ( ch.canSee(vict) && vict.canSee(ch) );
			});
			
		if (mode.has('seeing'))
			return world.getActors(ch.at).filter(function(vict) {
				if (exclude && exclude.has(vict))
					return false;
				return vict.canSee(ch);
			});
			
		if (mode.has('vis'))
			return world.getActors(ch.at).filter(function(vict) {
				if (exclude && exclude.has(vict))
					return false;
				return ch.canSee(vict);
			});
		
		if (mode.has('at') || mode.has('all'))
			return world.getActors(ch.at).filter(function(vict) {
				if (exclude && exclude.has(vict))
					return false;
				return true;
			});
				
		log('char.getActorsAt: unknown mode '+mode);
	},
	
	getItemsAt: function(mode) {

		var ch = this;
		mode = mode||'atvis';
		
		if (mode.has('vis'))
			return world.getItems(ch.at).filter(function(it) {
				return ch.canSee(it);
			});
		
		return world.getItems(ch.at);
	},

	getProto: function() {
		return my().mobproto[this.MobProtoId]; 
	},

	/* can - ability checks */
	
	canSee: function(vict) {
	
		var ch = this;
		
		if (ch == vict)
			return 1;

		if (vict.attr.invis && !ch.imp()) /* this is mortinvis */
			return 0;

		if (vict.CharId && vict.CharId == ch.id) /* these are NPC followers, minions, etc. */
			return 1;
				
		if (vict.attr.CharId && ch.id != vict.attr.CharId) /* these are bound entities, e. g. quest mobs that belong to a char */
			return 0;
			
		if (vict.attr.UserId && ch.user && ch.user.id != vict.attr.UserId) /* these are entities that belong to a user, e. g. a house entrance */
			return 0;
		
		return 1;
	},

	canDo: function(c, mode) {

		if (this.cmd[c])
			return (mode==my().SILENT)?c:this.cmd[c];

		for (var C in this.cmd)
			if (c.isAbbrev(C))
				return (mode==my().SILENT)?C:this.cmd[C];
		
		return null;
	},

	/* has - attribute/eq checks */
	
	hasHands: function() {
		return 1;
	},
	
	hasLegs: function() {
		return 1;
	},

	/* is - property checks */

	PC: function() { return this.UserId; },	
	NPC: function() { return !this.UserId; },
	pc: function() { return this.UserId; },	
	npc: function() { return !this.UserId; },
	
	immo: function() { return this.s && this.s.immo(); },
	builder: function() { return this.s && this.s.builder(); },
	imp: function() { return this.s && this.s.imp(); },
	
	heshe: function() { return my().SEX[this.sex].heshe; },
	hisher: function() { return my().SEX[this.sex].hisher; },
	himher: function() { return my().SEX[this.sex].himher; },
	
	/* unique mobs will have attr max (existing) 1 */
	unique: function() { return this.npc() && this.getProto().attr.max == 1; },
	
	stop: function() {
		
		for (var i in this.intervals)
			clearInterval(this.intervals[i]);
		
		for (var i in this.timeouts)
			clearTimeout(this.timeout[i]);
		
		return this;
	},
	
	suggest: function(cmd, arg) {

		var ch = this, i, cm, c;
		
		for (var l = cmd.length - 1; l > 1; l--) {
		
		    cm = cmd.substr(0, l); /* we shrink the first word until we find a match */
			if ((c = ch.canDo(cm, my().SILENT)))
				return ch.send(u.format(my().DID_YOU_MEAN_X, c.mxpsend('help ' + c)));
		}

		ch.do('commands');
	},
	
	stat: function(d) {
		
		this.temp[d] = this.points[d] || 0;
		
		/* emit a single stat value 
		 * and let any listeners modify it 
		 * for example, this is how worn items affect stats */
		
		this.emit('stat', d);
		return this.temp[d];
	},
	
	/* attr & pref getters / setters */
	
	setAttr: function(d, cb) {
		
		var attr = this.attr;
		extend(attr, d);

		this.updateAttributes({ attr: attr }, ['attr']).then(cb || function() {});
		return this;
	},
	
	unsetAttr: function(d, cb) {
	
		var attr = this.attr;
		delete attr[d];
		
		this.updateAttributes({ attr: attr }, ['attr']).then(cb || function() {});
		return this;
	},
	
	setPoints: function(d, cb) {
		
		var p = this.points;
		extend(p, d);

		this.updateAttributes({ points: p }, ['points']).then(cb || function() {});
		return this;
	},
	
	unsetPoints: function(d, cb) {
	
		var p = this.points;
		delete p[d];
		
		this.updateAttributes({ points: p }, ['points']).then(cb || function() {});
		return this;
	},
	
	setPref: function(d, cb) {
		
		var attr = this.attr;
		extend(attr.pref, d);
		
		this.updateAttributes({ attr: attr }, ['attr']).then(cb || function() {});
		return this;
	},
	
	getPref: function(a) {
		return this.attr.pref?this.attr.pref[a]:null;
	},

	pref: function(a) {
		if (typeof a === "string" || a instanceof String)
			return this.getPref(a);
		else
			return this.setPref(a);
	},
	
	setAff: function(a) {
		
		var ch = this, attr = ch.attr;
		
		attr.aff = attr.aff || {};
        
		if (a.msg)
			ch.send(a.msg), delete a.msg;
		
        /* to do - support for cumulative affs (with the same id) */
        
		extend(attr.aff, a);

		ch.updateAttributes({ attr: attr }, ['attr']).then(function() {
			ch.cmd.stat.apply(ch);
		});

		return ch;
	},
	
	unsetAff: function(a) {
		var ch = this, attr = ch.attr;
		
		if (!attr.aff[a])
			return warning('char.unsetAff: no such aff ' + a + ' on char ' + ch.name);
		
		if (attr.aff[a].msg)
			ch.send(attr.aff[a].msg);
		
		delete attr.aff[a];
		
		ch.setAttributes({ attr: attr }, ['attr']);
		return ch;
	},
	
	aff: function(a) {
		if (typeof a === "string" || a instanceof String)
			return this.getAff(a);
		else
			return this.setAff(a);
	}
};