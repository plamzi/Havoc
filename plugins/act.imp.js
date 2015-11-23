/* AARALON (c) 2013-2014 */

/* This plugin handles the implementor role */

var u = require('util');

addStrings({
	eng: {
		WHERE_USAGE:			"Usage: where what | who",
		EXEC_USAGE: 			"Usage: exec fingers_crossed_any_code",
		RELOAD_USAGE: 			"Usage: reload " + havoc.components.join(', '),
		TRANSFER_USAGE:			"Usage: transfer pc | npc",
		RESTORE_USAGE:			"Usage: restore pc | npc",
		CREATE_USAGE:			"Usage: create npc_name | npc_proto_id",
		DESTROY_USAGE:			"Usage: destroy npc_keyword",
		MAKE_USAGE:				"Usage: make item_name | item_proto_id",
		YOU_DESTROYED_X:		"You destroyed %s.",
		POSSESS_X: 				"You now possess %s.",
		SNOOP_X: 				"You are now snooping %s.",
		UNSNOOP_X: 				"You unsnooped %s.",
		YOU_TRANSFERRED_A:		"You transferred %s.",
		NOONE_BY_THAT_NAME: 	"No such creature within your boundless powers.",
		NO_SUCH_ITEM_PROTO:		"No such item prototype found.",
		NO_SUCH_MOB_PROTO:		"No such mob prototype found.",
		YOU_ARE_NOW_MORTINVIS:	"You are now invisible to mortals.",
		YOU_ARE_NOW_MORTVIS:	"You are now visible to mortals."
	}
});

var onDo = function(ch) {
	var c
	if (ch.input) {
		for (var i in act.imp) {
			if (i.isAbbrev(ch.input.cmd) && ch.cmd[i]) {
				ch.cmd[i].call(ch, ch.input.arg);
				return delete ch.input;
			}
		}
	}
};

var onStat = function(ch, vict) {
	return;
	after(0.1, function() {
		ch.send(stringify(vict.get({ plain: true })).style(10, '&I'));
	});
};

module.exports = {

	requires: function(ch) {
		return ch.imp();
	},

	init: function(re) {

		char.register('act.imp', 'enter.pc', function(ch) {
		
			if (!ch.imp())
				return;

			/* imp commands will be looked up first */
			ch.register('act.imp', '1.do', function() { onDo(this); });
		
			/* here, we add details whenever an imp stats a target */
			ch.register('act.imp', 'proc.stat', function(vict) { onStat(this, vict); });
		});
	
		user.register('act.imp', 'login', function(s) {
	
			if (!s.imp())
				return;
				
			s.snd('<FRAME Name="syslog">'.mxp());
			
			/*  We begin to listen to syslog as soon as a user with implementor role logs in */
			havoc.register('act.imp.' + s.user.id, 'syslog', function(msg) { s.snd((msg + '\r\n').mxpdest('syslog')); });

			/*  Because implementors are listening to the syslog file to get the best debug info,
			 *  we must unregister syslog when socket ends (other side sends FIN) or risk an infinite loop when they disconnect! 
			 * 	The socket close event is too late. When we initiate a close, we will manually emit an 'end' first
			 */
			s.socket.on('end', function() {
				havoc.unregister('act.imp.' + s.user.id, 'syslog');
				log('act.imp unregistered syslog listener');
			});
		});
	},
	
	exec: function(arg) {

		if (!arg)
			return this.send(my().EXEC_USAGE);
	
		var ch = this;
	
		try {
			eval(arg.join(' '));
		}
		catch(ex) { 
			log(ex);
		}
	},
	
	dump: function(arg) {
		if (arg)
			this.do('exec log(stringify(' + arg[0] + ').replace(/\,/g, ", "))');
	},

	force: function(arg) {

		if (!arg)
			return this.send(my().NOONE_BY_THAT_NAME);
	
		var vict = this.findActor(arg[0], 'world');
		if (vict)
			arg.shift(), vict.do(arg.join(' '));
	},

	restore: function(arg) {
	
		if (!arg)
			return this.send(my().RESTORE_USAGE);
	
		var vict = this.findActor(arg[0], 'world');
	
		if (vict)
			vict.restore();
	},

	transfer: function(arg) {

		if (!arg)
			return this.send(my().TRANSFER_USAGE);
	
		var ch = this, vict = ch.findActor(arg[0], 'world');

		if (!vict)
			return ch.send(my().NOONE_BY_THAT_NAME);

		vict.emit('disappear');
			vict.fromRoom().toRoom(ch.at).do('look');
		vict.emit('appear');
	},

	where: function(arg) {

		if (!arg)
			return this.send(my().WHERE_USAGE);
	
		var a = my().mobs;
		
		for (var i in a)
			if (a[i].name.has(arg[0]))
				this.send(a[i].name + ': ' + stringify(a[i].at));
		
		var a = my().items;
		
		for (var i in a)
			if (a[i].name.has(arg[0]))
				this.send(a[i].name + ': ' + stringify(a[i].at));
	},
	
	create: function(arg) {
	
		var ch = this, id;
	
		if (!arg)
			return ch.send(my().CREATE_USAGE);

		if (arg[0].isnum())
			id = arg[0];
		else
			id = char.protoIdByName(arg.join(' '));
	
		if (!m.mobproto[id])
			return ch.send(my().NO_SUCH_MOB_PROTO);

		var o = my().mobproto[id].get({ plain: true }).clone();
		o.MobProtoId = o.id, delete o.id;
	
		log(stringify(o));
	
		char.createMob(o, function(vict) {
			vict.at = ch.at.clone();
			char.initMob(vict);
			vict.emit('appear');
		});
	},

	destroy: function(arg) {

		if (!arg)
			return this.send(my().DESTROY_USAGE);

		var ch = this, vict = ch.findActor(arg[0]);

		if (!vict || vict.pc())
			return ch.send(my().NOONE_BY_THAT_NAME);

		var name = vict.name;

		vict.emit('disappear');
	
		char.destroyMob(vict, function() {
			ch.send(u.format(my().YOU_DESTROYED_X, name));
		})
	},

	goto: function(arg) {

		if (!arg)
			return this.send(my().NOONE_BY_THAT_NAME);
	
		var ch = this, vict = ch.findActor(arg[0], 'world');
	
		if (!vict)
			return ch.send(my().NOONE_BY_THAT_NAME);
	
		ch.emit('disappear');
			ch.fromRoom().toRoom(vict.at).do('look');
		ch.emit('appear');
	},

	snoop: function(arg) {
	
		if (!arg)
			return this.send(my().NOONE_BY_THAT_NAME);

		var ch = this, vict = ch.findActor(arg[0], 'world');
	
		if (!vict)
			return ch.send(my().NOONE_BY_THAT_NAME);
	
		vict.on('snoop', function(d) {
			ch.send((vict.name + ': ' + d).color('&I'));
		})
	
		ch.send(u.format(my().SNOOP_X, vict.name));
	},

	unsnoop: function(arg) {
	
		if (!arg)
			return this.send(my().NOONE_BY_THAT_NAME);

		var ch = this, vict = ch.findActor(arg[0], 'world');
	
		if (!vict)
			return ch.send(my().NOONE_BY_THAT_NAME);
	
		vict.removeAllListeners('snoop');
	
		ch.send(u.format(my().UNSNOOP_X, vict.name));
	},

	reload: function(arg) {
	
		if (!arg)
			return this.send(my().RELOAD_USAGE);

		this.do(u.format('exec %s.init(1)', arg[0]));
	},

	path: function(arg) {

		var ch = this, path = ch.path({ zone: ch.at.zone, x: parseInt(arg[0]), y: parseInt(arg[1]) });
		if (path && path.length)
			dump(path.map(function(i) { return i[0]; }).join(';'));
		else
			dump(path);
	},

	make: function(arg) {
	
		var ch = this, id;
	
		if (!arg)
			return ch.send(my().MAKE_USAGE);
		
		arg = (arg.length > 1)?arg.join(' '):arg[0];

		item.create(arg, function (it) { 
			
			ch.take(it).send(u.format(my().YOU_NOW_HAVE_X, it.name));
		});
	
		return ch;
	},

	vis: function(arg) {
	
		var ch = this;
	
		if (ch.attr.invis) {
			ch.unsetAttr('invis');
			ch.send(my().YOU_ARE_NOW_MORTVIS);
			return;
		}
	
		ch.setAttr({ invis: 1 });
		ch.send(my().YOU_ARE_NOW_MORTINVIS);
	},

	adhoc: function() {
	
		return;

		var ch = this;
	
		Char.sync()
		.then(function() {
			return Char.findAll();
		})
		.then(function(r) {
			for (var i in r) {
				var p = r[i].attr;
				delete p.class, delete p.sex, delete p.trade;
				r[i].updateAttributes({ attr: p }, ['attr']);
			}
			ch.send('OK');
		});
	},
	
	reboot: function() {
		server.close();
	},
	
	die: function() {
		warning('havoc death warrant issued by ' + this.name);
		havoc.die();
	}
};