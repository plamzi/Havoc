/* Havoc (c) 2014 */

/* Char contains methods and properties intrinsic to characters. 
 * It can be extended by adding modules named "char.something.js".
 * If you are adding commands (actions, skills, etc), look at act.js instead. */

var u = require('util');
var fs = require('fs');
var events = require('events');
var Seq = require('sequelize');
jsdom = require('jsdom');

addStrings({
	eng: {
	}
});

var char_struct = {
	name: Seq.STRING,
	level: Seq.INTEGER,
	class: Seq.STRING,
	trade: Seq.STRING,
	sex: Seq.STRING,
	attr: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('attr')+')');
		},
		set: function(v) {
			this.setDataValue('attr', stringify(v));
		}
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
	},
	at: {
		type: Seq.STRING,
		get: function() {
			return eval('('+this.getDataValue('at')+')');
		},
		set: function(v) {
			this.setDataValue('at', stringify(v));
		}
	}
};

var char_attr_default = {
	pref: {}, 
	aff: {}
};

var char_points_default = {
	hit: 100, 
	maxhit: 100, 
	mana: 100, 
	maxmana: 100, 
	stamina: 100, 
	maxstamina: 100,
	exp: 0,
	gold: 0
};

var proc_struct = {
	type: Seq.STRING,
	name: Seq.STRING,
	func: Seq.TEXT
};

var proc_link_struct = {
	ProcId: Seq.INTEGER,
	MobProtoId: Seq.INTEGER,
	ItemProtoId: Seq.INTEGER,
	RoomId: Seq.INTEGER,
	CharId: Seq.INTEGER,
};

module.exports = {

	init: function(re) {

		debug('char.init');

		havoc.register('char', 'plugin.change', this.reloadPlugin);
		
		user.register('char', 'create.pc', this.createChar);
		
		user.register('char', 'enter', function(ch) { /* PC entry from lobby */
			char.initChar(ch);
			char.validateChar(ch);
		});
		
		server.register('char', 'end', function(s) {
			if (s.ch)
				char.emit('exit', s.ch);
		});

		char.initPlugins(re);
		
		user.register('char', 'init', function() {
			log('char received init from user');
			char.initDB();
		});

		item.register('char', 'init', function() {
			char.initMobInstances();
		});
		
		if (re)
			char.initDB(re);
	},

	updateActors: function() {

		debug('char.updateActors: re-init existing online actors');

		var a = char.getActors();

		for (var i in a) {
			
			char.initChar(a[i], 1);
			
			if (a[i].pc())
				debug('updated '+a[i].name);
		}
	},

	initDB: function(re) {
		
		debug('char.initDB');

		Char = db.define('Chars', char_struct);
		MobProto = db.define('MobProto', char_struct);
		Mob = db.define('Mobs', char_struct, { timestamps: 0 });
		Proc = db.define('Procs', proc_struct, { timestamps: 0 });
		ProcLink = db.define('ProcLinks', proc_link_struct, { timestamps: 0 });
		
		User.hasMany(Char, { as: 'chars' });
		Char.belongsTo(User);
		
		Char.hasMany(Mob, { as: 'mobs' });
		Mob.belongsTo(Char); /* npc followers */
		
		MobProto.hasMany(Mob);
		Mob.belongsTo(MobProto);
		
		MobProto.belongsToMany(Proc, { through: ProcLink, as : 'procs' });
		Proc.belongsToMany(MobProto, { through: ProcLink });
		
		/* future ability to proc PC's. we can use this for advanced behavior automation e. g. */
		//Char.belongsToMany(Proc, { as: 'procs', through: ProcLink });
		//Proc.belongsToMany(Char, { through: ProcLink });

		char.emit('init'); /* item is listening for char init */
	},

	initPlugins: function(re) {

		debug('char.initPlugins');

		var plugins = fs.readdirSync('./plugins').filter(function(i) { return i.match(/^char\..+\.js$/i); });
		log('char component detected plugins: ' + plugins.join(', '));
		
		for (var i in plugins) {

			var f = './plugins/'+plugins[i];

			delete require.cache[require.resolve('../'+f)];
			var p = require('../'+f);

			if (p.init)
				p.init(re), delete p.init;
	
			point(char.instanceMethods, p);
			log('loaded: ' + f.color('&155') + ' ' + Object.keys(p).join(', ').font('size=10'));
		}
		
		if (re)
			this.updateActors();
	},

	reloadPlugin: function(comp, f) {

		if (comp != char) 
			return;

		debug('char.reloadPlugin');
		char.initPlugins(1); /* call with reload = true */
	},
	
	initMobInstances: function() {
		
		//Mob.sync();
		Mob.findAll({
			include: [{ model: Item, as: 'items', order: "location" }]
		})
		.then(function(r) {
			
			if (!r) {
				info('char.initMobInstances: no mob instances defined');
				my().mobs = [];
				return;
			}
			
			if (my().mobs) {
			
				for (var i in r) {
					point(r[i], char.instanceMethods);
					char.initProcs(r[i]);
				}
				
				return info('char.initMobInstances: mob instances already loaded, updated procs only');
			}
			
			my().mobs = r;
			
			for (var i = 0; i < r.length; i++) {

				/* set all necessary props without delay */
				char.initChar(r[i]);
				char.initProcs(r[i]);

				/* distribute mob instance timers over time so they would not cluster up */
				after((i * 50) / 1000, 
					function(r, i) {
						return function() {
							char.initTimers(r[i]);
							if (i == r.length - 1)
								info('char.initMobInstances: finished distributing mob instance timers');
						};
					}(r, i)
				);
			}
			
			info('char.initMobInstances: loaded mob instances ' + r.length);
		})
		.then(char.loadUniqueMobs)
		.then(char.loadSimpleMobs)
		.then(function() {
			havoc.emit('ready'); /* this is the signal to open the game for connections */
		});
	},
	
	createChar: function(s) {
		
		debug('char.createChar (PC)');

		Char.create({
			name: s.create.name,
			class: s.create.cls,
			sex: s.create.sex.toLowerCase(),
			trade: 'Adventurer',
			level: 1,
			attr: { aff: {}, bg: s.create.bg || 'none', pref: {} },
			points: char_points_default,
			at: config.game.start,
			UserId: s.user.id,
			GuildId: s.user.attr.guild ? s.user.attr.guild.id : null
		})
		.then(function(ch) {
			s.user.getChars().then(function(r) {
				s.user.chars = r;
				char.emit('create.pc', ch);
				return user.lobby(s);
			});
		});
		
		delete s.create, delete s.next;
	},
	
	validateChar: function(ch) {
		
		ch.user = ch.s.user;
		
		var ss = my().sockets;

		for (var i in ss) {
			if (ss[i].ch && ss[i].user.id == ch.s.user.id && ss[i] != ch.s) {
				if (ss[i].ch.id == ch.id) {
					ss[i].send(my().RECONNECTING_CHAR);
					info('reconnecting socket (same char) ', ss[i]);
					server.closeSocket(ss[i]);
				}
				else
				if (!config.game.allowMultipleCharacters && !ch.immo()) {
					ss[i].send(my().RECONNECTING);
					info('reconnecting socket (same user) ', ss[i]);
					server.closeSocket(ss[i]);
				}
			}
		}	

		/* User's character's may have changed while in lobby. For example, if dismissed from a guild */
		Char.findAll({
			where: { UserId: ch.s.user.id }
		})
		.then(function(r) {
			ch.s.user.chars = r;
		});
	},
	
	initChar: function(ch, re) {

		if (!re) {
			/* turn all ch instances into event emitters */
			ch.__proto__.__proto__.__proto__ = events.EventEmitter.prototype;
			ch.setMaxListeners(100);
			/* shim the default event emit method so we can chain it */
			ch._emit = ch.emit;
		}
		
		/* assign instance methods */
		point(ch, char.instanceMethods);

		/* init all regen and pulse timers */ 
		char.initTimers(ch);
		
		/* we don't have to do this if we don't use ch.do lazily during enter */
		delete ch.next;
		
		/* first emit enter to initialize basic/common character properties */
		char.emit('enter', ch);
		char.emit(ch.pc() ? 'enter.pc' : 'enter.npc', ch);
	},
	
	initTimers: function(ch) {

		if (ch.intervals) {
			//if (ch.npc())
				//return;
			this.clearTimers(ch);
		}
		
		ch.intervals = [], ch.timeouts = [];
		
		ch.intervals.add(
			setInterval(function() { ch.save(); }, ( ch.pc()?60:180 ) * 1000)
		);
	
		ch.intervals.add(
			setInterval(function() { ch.gain('hit', 1); }, 12 * 1000)
		);
		
		ch.intervals.add(
			setInterval(function() { ch.gain('mana', 1); }, 13 * 1000)
		);

		ch.intervals.add(
			setInterval(function() { ch.gain('stamina', 1); }, 24 * 1000)
		);
		
		ch.intervals.add(
			setInterval(function() { ch.emit('proc.pulse'); }, 40 * 1000)
		);
	},

	clearTimers: function(ch) {
		
		for (var i in ch.intervals)
			clearInterval(ch.intervals[i]);

		for (var i in ch.timeouts)
			clearTimeout(ch.timeouts[i]);
	},
	
	createMob: function(o, cb) {
		
		debug('char.createMob (instance)');
		//dump(o);

		if (!cb)
			warning('char.createMob called with no callback. this is normal for auto-spawning');
		
		if (typeof o == 'string')
			o = char.protoByName(o);
		else
		if (typeof o == 'number')
			o = my().mobproto[o];

		if (!o)
			return error('char.createMob could not locate mob proto for: ' + stringify(o));	

		o = o.values || o;
		
		if (o.id)
			o.MobProtoId = o.id, delete o.id;

		if (o.at) {
			if (o.at.pop) /* if proto at is an array, pick a random position for the mob instance */
				o.at = o.at.one();

			if (o.at.terrain) /* if terrain specified, pick a random terrain tile */
				o.at = world.getRandomByTerrain(o.at);
		}

		Mob.create(o).then(function(ch) {
			my().mobs.push(ch);
				char.initChar(ch);
				char.initProcs(ch);
			char.emit('create.npc', ch);
			!cb || cb(ch);
		});
	},

	initProcs: function(ch) {
		
		if (!ch) {
			for (var i in my().mobs)
				char.initProcs(my().mobs[i]);
			return;
		}
		
		var procs;
		
		if (!ch.getProto)
			return warning('char.initProcs: no getProto method on ' + ch.name);
			
		if (!(procs = ch.getProto().procs))
			return;
		
		if (ch.unique())
			info('char.initProcs assigning procs to '+ ch.name);
		
		for (var i in procs) {
			try {
				
				var p = procs[i]; 
				ch.register('mob' + ch.MobProtoId, 'proc.' + p.type, eval('('+p.func + ')'));
				
				if (ch.unique())
					info(p.name + ' proc.' + p.type + ' added to unique mob: ' + ch.name);

			} catch(ex) {
				warning(ex);
			}
		}
	}, 
	
	destroyMob: function(ch, cb) {
		my().mobs.remove(ch);
		ch.fromRoom().destroy().then(function() {
			!cb || cb();
		});
	},
	
	destroy: function() {
		this.destroyMob.apply(this, arguments);
	},
	
	/* resets certain properties of a mob instance to the values of their prototype, useful during rapid content creation cycles */

	resetMob: function(ch) {
		var p = ch.getProto();
		if (p) {
			dump(p.values);
			ch.updateAttributes({
				class: p.class,
				trade: p.trade,
				points: p.points,
				attr: p.attr
			});
		}
	},

	resetMobs: function() {
		for (var i in my().mobs)
			char.resetMob(my().mobs[i]);
	},

	getProto: function(a) {
		return my().mobproto[a.MobProtoId]; 
	},

	protoByName: function(a) {
		var mp = my().mobproto;
		for (var i in mp)
			if (mp[i].name.toLowerCase() == a.toLowerCase())
				return mp[i];
		return null;
	},

	protoIdByName: function(a) {
		var mp = char.protoByName(a);
		return mp?mp.id:null;
	},
 
	loadUniqueMobs: function() {
		
		debug('char.loadUniqueMobs: loading unique mobs, if needed');
		
		var r = my().mobproto;
		var mobs = my().mobs;

		for (var i in r) {
			
			if (r[i].attr.max == 1) {
				
				var found = mobs.filter(function(M) { return M.MobProtoId == r[i].id; });
				
				if (!found.length) {
					
					char.createMob(r[i].values, function() {
						char.emit('create.npcs'); /* this will tip off act.info to re-index instances */
					});
					
					info('char.loadUniqueMobs: spawned unique mob ' + r[i].name);
				}
			}
		}
	},

	loadSimpleMobs: function() {

		debug('char.loadSimpleMobs: spawning simple mob instances, if under max');
		
		var r = my().mobproto;
		var mobs = my().mobs;
		
		for (var i in r) {
			
			if (r[i].attr.max > 1) {
				
				var n = mobs.filter(function(M) { return M.MobProtoId == r[i].id; }).length;
				
				while (n < r[i].attr.max) {
					
					if (++n == r[i].attr.max)
						char.createMob(r[i].values, function() {
							char.emit('create.npcs'); /* this will tip off act.info to re-index instances on last spawn */
						});
					else
						char.createMob(r[i].values);
				}
			}
		}
	},

	getActors: function() {

		var a = [], ss = my().sockets;
		
		for (var i in ss)
			if (ss[i].ch)
				a.push(ss[i].ch);
		
		return my().mobs?a.concat(my().mobs):a;
	},
	
	getStruct: function() {
		return char_struct;
	},
	
	instanceMethods: {
		
		emit: function() {
			this._emit.apply(this, arguments);
			return this;
		}
	}
};