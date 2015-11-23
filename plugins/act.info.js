/* Havoc (c) 2014 */

var u = require('util');
var Seq = require('sequelize');

var Help;

var help_struct = {
	name: Seq.STRING,
	alias: Seq.STRING,
	topic: Seq.STRING,
	content: Seq.TEXT
};

addStrings({
	
	eng: {
		TEST_USAGE:					"Usage: test color | unicode",
		WHOIS_USAGE:				"Usage: whois user_id (available in context menus)",
		NO_SUCH_HELP_FILE:			"No detailed help for this keyword. Your search has been logged so we can improve our help system.",
		AVAILABLE_COMMANDS:			"Available Commands:",
		SEE_ALSO:					"See also",
		STAT_USAGE:					"Usage: stat [target] (For items, use " + "id".mxpsend('help identify') + ")",
		X_ENTERED_THE_WORLD:		"\r\n%s entered the world of %s on " + new Date() + "."
	}
});

/* tag room entities with MXP\
]interaction options */
var interacts = function(target, ch) {
	
	var res = [(target.sex?'stat ':'id ') + target.id];
	
	if (target.sex && ch.canAttack(target))
		res.push(['kill ' + target.id]);
	
	if (target.attr) {

		if (target.attr.talk)
			res.push(['talk ' + target.id]);
		
		if (target.attr.read)
			res.push(['read ' + target.id]);
		
		if (target.location) {
			
			if (target.location == 'storage')
				res.push(['unstore ' + target.id]);
			else
				res.push(['store ' + target.id]);
			
			if (target.location == 'shop')
				res.push(['unsell ' + target.id]);
			else
				res.push(['sell ' + target.id]);
		}
	}
	
	return res;
};

var onDo = function(ch) {
	
	if (!ch.input)
		return;
		
	for (var i in act.info) {
		if (ch.input.cmd.isAbbrev(i) && ch.cmd[i]) {
			ch.cmd[i].call(ch, ch.input.arg);
			return delete ch.input;
		}
	}
};

var index = function(what) {
	
	if (!what || what == 'help') {
		Help = db.define('Help', help_struct, { timestamps: 0 });
		Help.sync();
	}

	if (!what || what == 'user')
		User.findAll().then(function(r) {
			var m = my(); m.userindex = {};
			for (var i in r) {
				m.userindex[r[i].id] = r[i];
				m.userindex[r[i].id].name = user.displayName(r[i]);
			}	
			info('act.info indexed users: ' + r.length);
		});
	
	if (!what || what == 'pc')
		Char.findAll().then(function(r) {
			var m = my(); m.charindex = {};
			for (var i in r)
				m.charindex[r[i].id] = r[i];
			info('act.info indexed chars: ' + r.length);
		});
	
	if (!what || what == 'npc')
		Mob.findAll().then(function(r) {
			var m = my(); m.mobindex = {};
			for (var i in r)
				m.mobindex[r[i].id] = r[i];
			info('act.info indexed mobs: ' + r.length);
		});
};

module.exports = {

	init: function(re) {
		
		if (re)  {
			info('act.info re-init will re-index entities');
			index();
		}

		/* when a new user is created */
		user.register('act.info', 'create', function() { index('user'); });

		user.register('act.info', 'do.portal', function(s) {

			info('act.info setting up mxp frames for a portal client', s);
			
			s
			.write('<FRAME Name="items" Parent="ChatterBox">'.mxp())
			.write('<FRAME Name="stats" Parent="ChatterBox">'.mxp())
			//.write('<FRAME Name="chat" Parent="ChatterBox">'.mxp())
			//.write('<FRAME Name="events" Parent="ChatterBox">'.mxp())
			.write('<FRAME Name="who" Parent="ChatterBox">'.mxp())
			//.write('<FRAME Name="attacks" Parent="ChatterBox">'.mxp())
			;
		});
		
		user.register('act.info', 'json', function(s, d) {
		
			if (d.portal) {
				s.portal = d.portal; /* we assign the incoming value so that we can set it to a version, e. g. */
				info('portal client detected', s);
				user.emit('do.portal', s);
			}
			
			if (d.gui) {
				s.portal = s.gui = d.gui;
				info('portal GUI client detected', s);
				user.emit('do.portal', s);
				user.emit('do.gui', s);
			}
			
			if (d.fav && s.ch) {
				info('set favorites detected', s);
				s.ch.setPref(d, function() {
					s.sendGMCP('ch.attr.pref', s.ch.attr.pref);
				});
			}
		});
		
		/* index user and char when char component has loaded up */
		char.register('act.info', 'init', index);

		/* when a user creates a new character */
		char.register('act.info', 'create.pc', function() { index('pc'); });

		/* when the char component creates a new NPC instance */
		char.register('act.info', 'create.npc', function() { /* index('npc'); */ });

		/* when the char component batch-creates new NPC instances */
		char.register('act.info', 'create.npcs', function() { index('npc'); });

		/* when a PC enters the game */
		char.register('act.info', 'enter.pc', function(ch) {

			ch.register('act.info', '1.do', function() {
				onDo(this);
			});

			if (ch.s.portal)
			after(2, function() {
				ch.do('eq;stat');
			});
			
			if (ch.s.portal)
			after(1, function() {
				ch.do('who');
			});
			
			if (ch.s.gui) {
				ch.sendGMCP('ch.attr.pref', ch.attr.pref);
			}
			
			ch.sendGMCP('ch.points ', ch.points);
		});
		
		/* unlike char enter, user enter event will be called only once per char entry, and not on dynamic reloads e. g. */
		user.register('act.info', 'enter', function(ch) {
			var ss = my().sockets;
			for (var i in ss)
				if (ss[i].ch)
					ss[i].send(u.format(my().X_ENTERED_THE_WORLD.style('info'), ch.name, config.game.name));
		});
	},
	
	look: function(arg) {

		var ch = this, z = ch.at, i, portals, m = my();
		var tstring = m.zone[z.zone].grid[z.y][z.x], flags = tstring.split('^');
		var terrain = flags[0], impr = flags[1], props = [];

		if (!ch.s)
			return ch;
		
		if (m.TERRAIN[tstring])
			props.push(m.TERRAIN[tstring].name);
		else {
			if (m.TERRAIN[terrain] && m.TERRAIN[terrain].name)
				props.push(m.TERRAIN[terrain].name);
			
			if (m.TERRAIN['^'+impr] && m.TERRAIN['^'+impr].name)
				props.push(m.TERRAIN['^'+impr].name);
		}
		
		for (i in terrain)
			if (m.TERRAIN[terrain[i]])
				props.push(m.TERRAIN[terrain[i]]);

		if (impr && m.IMPR[impr])
			props.push(m.IMPR[impr]);
		
		props = props.join(' ');
		
		ch
		.snd((' '+m.U_TEMPLE+' ').mxpsend('recall', 'Return to Calandor Temple.').font('color=Gold') + ' ')
		.snd(z.zone.color('&136') + ': ' + z.x + 'x'.color('&K') + z.y +' ' + props.font('size=11').color('&K'));
		
		if (ch.imp())
			ch.snd(' ' + m.zone[z.zone].grid[z.y][z.x].color('&I'));

		ch.send(''); /* line break */
		ch.sendGMCP("ch.at", ch.at);
			
		if (ch.moving) /* cut output short because next command is another move */
			return;
		
		if ((portals = world.getPortals(ch.at))) {
			for (i in portals) {
				var msg = m.U_PORTAL.font('color=Gold') + ' ' + ((portals[i].verb || 'enter') + ' ' + portals[i].name);
				ch.snd(msg.mxpsend('enter ' + portals[i].id).font('size=11') + '  ', 'portals');
			}
			ch.send('');
		}
		
		var I = ch.getItemsAt().sort(by_name);
		
		for (i in I)
			ch.send(I[i].name.color('&m') + ', ' + I[i].type.color('&I'));

		var M = ch.getMobsAt().sort(by_name), n = 0;

		for (var i = 0; i < M.length; i++) {
			
			if (M[i+1] && M[i+1].MobProtoId == M[i].MobProtoId) { /* stack mobs with same proto id */
				n++; 
				continue;
			}
			
			ch.send(
				M[i].name.mxpselect(interacts(M[i], ch)).color('&160')
				+ (n > 1?(' x'+n):'') + ' ' 
				+ m.SEX[M[i].sex].symbol.color('&K') + ' ' 
				+ (M[i].class + ', ').color('&I') 
				+ M[i].trade.style('info')
			);

			n = 0;
		}
		
		var P = ch.getPlayersAt();
		
		for (i in P) {
			
			//if (ch == P[i])
				//ch.snd(m.U_SQUARE_FULL + ' ');
				
			ch.send(
				P[i].name.mxpselect(interacts(P[i], ch)).color('&B') + ' ' 
				+ m.SEX[P[i].sex].symbol + ' ' 
				+ P[i].class.color('&I') + ', ' 
				+ P[i].trade.font('size=11').color('&I')
			);
		}

		var info = {
			name: props,
			terrain: tstring
		};
		
		if (portals)
			info.portals = portals;
		
		clearTimeout(ch.temp.gmcplook);
		ch.temp.gmcplook = setTimeout(function() {
			ch.sendGMCP("room.info", info);
			ch.sendGMCP("room.opponents", M);
			ch.sendGMCP("room.allies", P);
		}, 200);
		
		return ch;
	},

	inventory: function(arg) {
		
		var ch = this, m = my(), n = 0, its;

		if (arg)
			its = (m.U_POUCH + ' inventory').mxpsend('inventory') 
			+ '  |  ' + (m.U_STORAGE + ' storage').mxpsend('storage') 
			+ '  |  ' + (m.U_SELECT + ' filter').mxpselect(['inventory worn', 'inventory carried', 'inventory usable'], ['apply inventory filter','worn', 'carried', 'usable'])  
			+ '\r\n\r\n'
		else
			its = (m.U_STORAGE + ' storage').mxpsend('storage') 
			+ '  |  ' + (m.U_SCALES + ' shop').mxpsend('inventory shop') 
			+ '  |  ' + (m.U_SELECT + ' filter').mxpselect(['inventory worn', 'inventory carried', 'inventory usable'], ['apply inventory filter','worn', 'carried', 'usable']) 
			+ '\r\n\r\n'
					
		//ch.send(my().YOUR_ITEMS.color('&B'));
		if (!ch.items)
			return;

		ch.items.sort(function(a, b) {
			
			if (a.location == b.location)
				return by_name(a, b);
			
			if (a.location < b.location) 
				return -1;
			
			if (a.location > b.location) 
				return 1;
			
			return 0;
		})
		.forEach(function(it, i) {

			if (arg) {
				if (arg[0] == 'usable') {
					if (!it.attr.use)
						return;
				}
				else
				if (it.location != arg[0])
					return;
			}
			else
				if (['ground', 'storage', 'shop'].has(it.location))
					return;

			if (ch.items[i + 1] 
			 && ch.items[i + 1].ItemProtoId == it.ItemProtoId
			 && ch.items[i + 1].location == it.location) {
				n++;
				return;
			}
			
			var details = '';

			if (it.location == 'worn')
				details = '  on ' + it.position;
			
			if (it.location == 'shop')
				details = ' (asking ' + m.U_COINS.color('&220') + ' ' + it.attr.price.comma() + ')';

			try {
				var tooltip = ch.cmd.identify.apply(ch, [it, m.SILENT]).nomxp().nocolor().nolf();
			}
			catch(ex) { error(ex); };
			
			its +=
				(' ' + it.name).mxpselect(interacts(it, ch), tooltip || null) + ' ' 
				+ m.ITEM_LOCATION_ICON[it.location] + ' ' 
				+ (n?('x' + (n + 1) + ' ').color('&K'):'') + ' '
				+ it.location.color('&K') + details + ' ' 
				+ m.ITEM_TYPE_ICON[it.type].color('&K')
				+ '\r\n';
			
			n = 0;
		});
		
		ch
		.snd('<FRAME Name="items" Parent="ChatterBox">'.mxp()) /* flush frame contents */
		.snd(its.mxpdest('items'));
	},
	
	equipment: function() {
		return this.cmd.inventory.call(this);
	},
	
	storage: function(arg) {
		
		var ch = this, m = my(), n = 0;

		//ch.send(my().YOUR_ITEMS.color('&B'));
		Item.findAll({
			where: {
				UserId: ch.user.id,
				location: 'storage'
			},
			order: 'name DESC'
		})
		.then(function(items) {
			
			var its = (m.U_POUCH + ' inventory').mxpsend('inventory') + '  |  ' + (m.U_SCALES + ' shop').mxpsend('inventory shop') + '\r\n\r\n';
			
			items.forEach(function(it, i) {

				if (items[i + 1] 
					&& items[i + 1].ItemProtoId == it.ItemProtoId
					&& items[i + 1].location == it.location) {
					n++;
					return;
				}
				
				var details = '';

				if (it.location == 'worn')
					details = '  on ' + it.position;
				
				if (it.location == 'shop')
					details = ' (asking ' + m.U_COINS.color('&220') + ' ' + it.attr.price.comma() + ')';

				try {
					var tooltip = ch.cmd.identify.apply(ch, [it, m.SILENT]).nomxp().nocolor().nolf();
				}
				catch(ex) { error(ex); };
				
				its +=
					(' ' + it.name).mxpselect(interacts(it, ch), tooltip || null) + ' ' 
					+ m.ITEM_LOCATION_ICON[it.location] + ' ' 
					+ (n?('x' + (n + 1) + ' ').color('&K'):'') + ' '
					+ it.location.color('&K') + details + ' ' 
					+ m.ITEM_TYPE_ICON[it.type].color('&K')
					+ '\r\n';
				
				n = 0;
			});
			
			ch
			.snd('<FRAME Name="items" Parent="ChatterBox">'.mxp())
			.snd(its.mxpdest('items'));
		});
	},
	
	score: function(arg) {
		return this.cmd.stat.call(this, arg);  /* forward to stat command */
	},

	stat: function(arg) {
		
		var ch = this, vict;
		
		var _stat = function(ch, vict) {
			
			ch.snd('<FRAME Name="stats" Parent="ChatterBox">'.mxp()).snd('<DEST stats>'.mxp());
			
			var msg = 'Name: '.color('&K') + vict.name.color('&W') + ' ' 
					+ 'Class: '.color('&K') + vict.class + ' '
					+ 'Trade: '.color('&K') + vict.trade + ' \r\n';
			
			if (ch != vict) { /* not self-stat */
				ch.snd(msg).emit('proc.stat', vict); /* we can't chain on emit method. to do: shim it so we can */
				ch.emit('proc.aff', vict);
				ch.emit('post.stat', vict);
				ch.snd('</DEST>'.mxp());
				return;
			}
			
			msg += '&KHealth: &R' + vict.stat('hit') + '&n/&r' + vict.stat('maxhit')
					+'&n &KMana:&n &B' + vict.stat('mana') + '&n/&b' + vict.stat('maxmana')
					+'&n &KStamina:&n &G' + vict.stat('stamina') + '&n/&g' + vict.stat('maxstamina') + '&n\r\n';
			
			msg += my().U_SHIELD.color('&M') + ' ' + vict.stat('armor') + ' ' + my().U_SWORDS.color('&R') + ' ' + vict.stat('damage') + ' ';
			msg += my().U_COINS.color('&220') + ' ' + vict.getGold().comma() + ' ';
			
			ch.snd(msg).emit('proc.stat', vict); /* other plugins can listen to proc.stat and append any extra info, e. g. char.class will add info on exp */
			
			msg = '';
			for (var i in ch.attr.aff) {
				if (!ch.attr.aff[i].hidden) {
					for (var a in ch.attr.aff[i].affects)
						msg +=  '\r\n' + (i + ': ').color('&K') + a + ' ' + ch.attr.aff[i].affects[a] + ' ' + expires(ch.attr.aff[i].expires).color('&K');
				}
			}
				
			ch.snd(msg).emit('proc.aff', vict);
			ch.emit('post.stat', vict);
			ch.snd('</DEST>'.mxp());
		};
		
		if (!arg)
			return _stat(ch, ch); 
		
		if (arg[0].isnum())
			vict = my().charindex[arg[0]]; 
		
		if (!vict)
			vict = ch.findActor(arg.join(' '), 'at-vis');

		if (!vict)
			vict = ch.findActor(arg[0], 'world');
		
		if (vict)
			_stat(ch, vict);
	},

	identify: function(arg, mode) {
		
		var ch = this, it, m = my();
		
		if (!arg)
			return ch.send(m.IDENTIFY_USAGE);
	
		if (arg.location) /* can pass an item object directly */
			it = arg;
		else
		if (arg[0].isnum()) {
			for (var i in m.items)
				if (m.items[i].id == arg[0])
					it = m.items[i];
		}
		
		if (!it)
			it = ch.findItem(arg.join(' '), 'has-at-vis-world');

		if (!it)
			it = ch.findItem(arg[0], 'has-at-vis-world');
		
		if (!it) {
			log('act.item identify no such item: ' + stringify(arg));
			return ch.send(m.NO_SUCH_ITEM);
		}
		
		var details = '';
		
		if (it.location == 'worn')
			details = ' on ' + it.position;
		
		if (it.location == 'shop')
			details = ' (price ' + m.U_COINS.color('&220') + ' ' + it.attr.price.comma() + ')';
		
		var msg = ' ' + it.name.mxpsend('id ' + it.id) + ' '
			
			+ m.ITEM_LOCATION_ICON[it.location] + ' ' 
			
			+ it.location.color('&K') + details + ' ' 
			
			+ m.ITEM_TYPE_ICON[it.type].color('&K') + ' ' + it.type
			
			//+ (it.position?"position: ".color('&I') + it.position : "") + ' '
			
			+ (it.attr.use ? "\r\nuse: ".color('&K') + it.attr.use.name : " ")
			
			+ (it.attr.use && it.attr.use.times ? " x" + it.attr.use.times : " ")
			
			+ (it.attr.dura ? "durability " + it.attr.dura + "/100 " : " ");
			
		if (it.affects && Object.keys(it.affects).length) {
			
			msg += 'affects: ';
			var aff = [];
			
			for (var i in it.affects)
				aff.push(i + ' ' + it.affects[i]);
			
			msg += aff.join(', ')+' ';	 
		}
			
		msg += 'owner: '.color('&K') + ( it.CharId ? m.charindex[it.CharId].name : m.mobindex[it.MobId].name );
		
		if (mode == m.SILENT)
			return msg;
		
		ch.send(msg);
	},

	who: function() {
		
		var ch = this, m = my()/*, ss = m.sockets*/;

		Char.findAll({ 
			where: [ 'updatedAt > DATE_SUB(NOW(), INTERVAL 30 DAY)' ],
			order: 'updatedAt DESC',
			group: 'UserId',
			limit: 50
		})
		.then(function(r) {
			
			if (!r) 
				return;
				
			var who = '';

			for (var i in r) {
				var usr = m.userindex[r[i].UserId]; 
				who
				+= m.U_HUMAN.style(16, '&178') + ' ' + usr.name.mxpselect(['pm ' + usr.id, 'whois ' + usr.id ], ['', 'pm ' + usr.name, 'whois ' + usr.name]) + ' '
				+ m.U_GROUP.style(16, '&B') + ' ' + r[i].name.mxpselect(['pm ' + usr.id, 'stat ' + r[i].id], ['', 'pm ' + r[i].name, 'stat ' + r[i].name]) + ' '
				+ m.U_STAR.style(16, '&208') + ' ' + r[i].level + ' '
				+ r[i].updatedAt.toUTCString().substring(0, 11).replace(',','').style(11, '&I') + ' '
				+ '\r\n';
			}
	
			ch.snd('<FRAME Name="who" Parent="ChatterBox">'.mxp() + who.mxpdest('who'));
		});
	},

	whois: function(arg) {
		
		//debug('act.info whois');
	
		var ch = this, m = my();

		if (!arg)
			return ch.send(my().WHOIS_USAGE);
			
		var usr = m.userindex[arg[0]];

		if (!usr)
			return;
		
		var whois = m.U_HUMAN.style(16, '&178') + ' ' + usr.name.mxpsend('pm ' + usr.id, 'pm ' + usr.name) + '\r\n\r\n'
		+ m.U_SWORDS.style(15, '&R') + ' ' + (usr.points.frags || 0 ) + ' '
		+ m.U_KARMA.style(15, '&212') + ' ' + (usr.points.karma || 0) + '\r\n'
		+ ('Created: ' + usr.createdAt.toUTCString().substring(0, 16).replace(',' , '')).style(11, '&I') + '\r\n'
		+ ('Last seen: ' + usr.updatedAt.toUTCString().substring(0, 16).replace(',' , '')).style(11, '&I') + '\r\n';
		
		ch.send(whois, 'Modal');
	},
	
	test: function(arg) {
		
		var ch = this;
		
		if (!arg)
			return ch.send(my().TEST_USAGE);
		
		if (arg[0].abbrev('color')) {
			for (var i = 1; i <= 256; i++)
				ch.snd(('#'+i).color('&'+i) + '  ');
			ch.send('');
		}
		
		if (arg[0].abbrev('unicode')) {
			var m = my();
				for (var i in m)
					if (i.start('U_'))
						ch.snd(i + ': ' + m[i] + '  ');
			ch.send('');
		}
	},

	help: function(arg) {
		
		var ch = this;
		
		ch.send('');
		
		if (!arg)
			return ch.do('commands');

		arg = arg.join(' ');
		
		if (ch.s.portal)
			ch.send('<DEST Modal>'.mxp() + arg.toUpperCase());
		else
			ch.send(arg.toUpperCase().color('&Y'));
		
		var usage = my()[arg.toUpperCase().replace(/ /g,'_')+'_USAGE'];
		!usage || ch.send(usage);
		
		ch.send('');
		
		Help.find({ 
			where: [ 'name LIKE ? OR alias LIKE ?', arg+'%', arg+'%' ]
		})
		.then(function(r) {

			if (!r) {
				ch.send(my().NO_SUCH_HELP_FILE.font('size=11'));
				
				if (ch.s.portal)
					ch.snd('</DEST>'.mxp());
					
				return;
			}

			ch.send(r.content);

			Help.findAll({ 
				where: [ "topic = ? AND name != ?", r.topic, r.name ]
			})
			.then(function(r) {
				
				if (r.length) {
					ch.snd('\r\n' + my().SEE_ALSO + ': ');
					ch.Send(r.map(function(i) { return i.name.mxpsend('help ' + i.name); }).join(' '));
				}
				
				if (ch.s.portal)
					ch.snd('</DEST>'.mxp());
			});
		});
	},

	commands: function(arg) {
		
		var ch = this;

		if (ch.s.portal)
			ch.send('<DEST Modal>'.mxp() + my().AVAILABLE_COMMANDS);
		
		for (var i in act) {
			
			if (act[i] instanceof Function || typeof(act[i]) != 'object' || i[0] == '_')
				continue;
			
			if (arg && i != arg[0]) /* filtering */
				continue; 

			var cmds = Object.keys(act[i]).sort();
			
			cmds = cmds
			.filter(function(n) {
				return ch.cmd[n]; 
			})
			.map(function(n) { 
				return n.mxpsend('help '+n); 
			});
			
			if (cmds.length)
				ch.send((i + ': ').color('&243') + cmds.join('  ')).send('');
		}

		if (ch.s.portal)
			ch.snd('</DEST>'.mxp());
	},
	
	credits: function() {
		this.do("help credits");
	}
};