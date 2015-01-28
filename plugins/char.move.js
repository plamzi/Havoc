/* movement */
var u = require('util');

addStrings({
	eng: {
		APPROACHES_FROM_THE:		" approaches from the ",
		LEAVES:						" leaves ",
		ENTERS:						" enters ",
		EXITS:						" exits ",
		X_DISAPPEARS: 				'%s disappears.',
		X_APPEARS: 					'%s appears.'
	}
});

module.exports = {
	
	init: function() {
		
		/* here, we assign our movement-related listeners when all chars enter (or re-enter) the game */
		char.register('char.move', 'enter', function(ch) {
			
			ch.register('char.move', '1.do', function() { /* first check for directional commands */
				var ch = this, c;
				if (ch.input)
					if ((c = world.isDir(ch.input.cmd))) { 
						ch.cmd[c].call(ch, ch.input.arg);
						return delete ch.input;
					}
			});
			
			ch.register('char.move', 'disappear', function(c) {
				this.sendAt((u.format(my().X_DISAPPEARS, this.name).style('move')), [this]);
			});
			
			ch.register('char.move', 'appear', function() {
				this.sendAt((u.format(my().X_APPEARS, this.name).style('move')), [this]);
			});

			ch.register('char.move', 'die', function() {
				ch.restore().recall(); 
				/* we can shuffle mobs smartly instead of constantly recreating them */
				/* to do: add cooldowns so that the same players can't spam-kill the same bosses etc. */
			});

			if (!ch.at.zone)
				ch.at = config.game.start;
			
			if (!ch.inRoom().has(ch)) /* easiest way to detect if char is being reloaded */
				after(0.2, function() {
					ch.do('look');
				});
			
			ch.fromRoom().toRoom(); /* we extract from room array and re-add to prevent ghosting if this is a dynamic reload */
		});
		
		/* this is when a PC exits the game. we may modify this to keep linkless players around for a while. */
		char.register('char.move', 'exit', function(ch) {
			ch.fromRoom();
		});
	},
	
	go: function(dir) { /* this handles user-initiated spacial movement */

		var to, ch = this, from = ch.at;

		if ((to = ch.canMove(dir))) {
			if (ch.canExit(to))
				ch.fromRoom().emitExit(dir).toRoom(to).emitEntry(dir);
		}
		else
			ch.send(my().INVALID_DIR);
		
		return this;
	},
	
	inRoom: function() {
		return my().zone[this.at.zone].actors[this.at.x + 'x' + this.at.y];
	},

	fromRoom: function() { /* removes character from a room array (index) */
		
		var ch = this;

		if (ch.pc() && !ch.inRoom().has(ch))
			warning('ch not in room ch.at when fromRoom called: ' + ch.name);
		
		ch.inRoom().remove(ch);
			
		return ch;
	},
	
	toRoom: function(to) {
		
		var ch = this;

		to = to || ch.at; /* if there's no destination, we assume we want to place the char in the location stored in ch.at */
		
		if (ch.pc())
			ch.updateAttributes({ at: to });
		else
			ch.setAttributes({ at: to });

		ch.inRoom().add(ch);

		return ch;
	},

	setOrigin: function() { /* pick a starting position for an NPC instance from prototype's specified ranges */

		var ch = this, at = clone(ch.getProto().at);
		
		if (at.pop) /* if "at" is an array, pick a random position */
			at = o.at.one();
		
		if (at.terrain) /* if "at" has a terrain attribute, pick a random tile from this terrain */
			at = world.getRandomByTerrain(at);
		
		ch.setAttributes({ at: at });
		return ch;
	},
	
	/* this is the return-to-origin internal recall. the command is in act.move.js */
	recall: function() {

		var ch = this;

		ch.emit('disappear');
		
		if (ch.npc())
			ch.setOrigin().fromRoom().toRoom();
		else
			ch.fromRoom().toRoom(config.game.start);
		
		ch.emit('appear').do('look');
		return this;
	},

	path: function(to) {
		
		//info('char.path to '+stringify(to));

		var ch = this, at = ch.at, limit = 0, i, n, e, p, q = [], h = [ at.x + '@' + at.y ];

		if (to.x >= my().zone[to.zone].grid[0].length)
			return null;

		if (to.y >= my().zone[to.zone].grid.length)
			return null;

		if (to.y == at.y && to.x == at.x)
			return null;
			
		q.push([ ['@', at] ]);
		
		while (q.length) {

			p = q.shift(),
			n = p[p.length - 1];
			ch.at = n[1];

			if (++limit > 5000) {
				warning('char.move path hit safety limit (1000 iterations).');
				return null;
			}

			var m = my();
			
			for (var i in m.HEXDIR) {

				var dir = m.HEXDIR[i], e = ch.canMove(dir);

				if (!e || h.has(e.x + '@' + e.y))
					continue;
				
				var a = p.slice(0);
				a.push([dir, e]);

				if (e.x == to.x && e.y == to.y) {
					ch.at = at;
					//info('char.move path found in this many iterations: '+limit);
					a.shift();
					return a;
				}
				
				if (
					Math.abs(to.x - e.x) < Math.abs(to.x - ch.at.x)
					&& Math.abs(to.y - e.y) < Math.abs(to.y - ch.at.y)
						)
					q.unshift(a);
				else
					q.push(a);
				
				h.push(e.x + '@' + e.y);
			}
		}
		
		ch.at = at;
		return null;
	},
	
	emitEntry: function(from) {

		var ch = this, A = ch.getActorsAt('seeing', [ ch ]);
		
		ch.cmd.look.call(ch);

		for (var i in A) {
		
			if (from.zone)
				A[i].send((ch.name.cap() + my().EXITS + from.zone + '.').style('move'));
			else
				A[i].send((ch.name.cap() + my().APPROACHES_FROM_THE + my().REVDIR[from] + '.').style('move'));
			
			A[i].emit('proc.entry', ch);
		}
		
		ch.emit('self.entry', ch).emit('entry');
		return this;
	},
	
	emitExit: function(to) {
		
		var ch = this, A = ch.getActorsAt('seeing', [ ch ]);
		
		for (var i in A) {
				
			if (to.zone)
				A[i].send((ch.name.cap() + my().ENTERS + to.zone + '.').style('move'));
			else
				A[i].send((ch.name.cap() + my().LEAVES + to + '.').style('move'));
			
			A[i].emit('proc.exit', ch);
		}

		ch.emit('self.exit', ch).emit('exit');
		return this;
	},
	
	canExit: function(to) {
		return 1;
	},
	
	canMove: function(dir) {

		//log('char.move canMove');
		
		var ch = this, at = ch.at, m = my();

		if (ch.fighting)
			return 0;
		
		if (dir.has('st'))
			dir = (at.x % 2) ? m.DIR_ODD[dir] : m.DIR_EVEN[dir];
			
		var x = at.x + m.DIR_OFFSET[dir][0];
		var y = at.y + m.DIR_OFFSET[dir][1];
		var g = m.zone[at.zone].grid;
		var mp;

		if (x < 0 || x >= g[0].length)
			return 0;

		if (y < 0 || y >= g.length)
			return 0;
			
		if (!ch.immo() && g[y][x].toLowerCase().has('x'))
			return 0;
	
		var to = { zone: at.zone, x: x, y: y };
		
		if (at.proto)
			to.proto = at.proto;
		
		return to;
	},

	/* handle randomly roaming npcs - used by act.npc */
	canRoam: function(dir) {
		
		var ch = this;
		
		if (ch.pc()) {
			warning('ch.canRoam called on a PC: ' + ch.name);
			return 1;
		}
		
		var mp = char.getProto(ch);
		var radius = mp.attr.radius || 10;
		var at = ch.canMove(dir);
		
		if (!at)
			return 0;
		
		if (!mp.at.terrain && !mp.at.pop) {
			if ( Math.abs(mp.at.x - at.x) > radius || Math.abs(mp.at.y - at.y) > radius ) {
				//log('roaming NPC reached radius limit: ' + ch.name);
				return 0;
			}
		}
		
		if (mp.at.terrain && at.terrain != mp.at.terrain) {
			//log('roaming NPC reached terrain edge: ' + ch.name);
			return 0;
		}
		
		return at;
	},
		
	canEnter: function(to) {
		return 1;
	},

	isAt: function(a) {
		a = a.at || a;
		return ( this.at.zone == a.zone && this.at.x == a.x && this.at.y == a.y );
	},

	/* this determines whether certain automated mob activity will go into suspension */
	isNearPlayers: function() {
		
		var ch = this, near = 0;
		
		ch.getPlayers().forEach(function(p) {
			if (p.at.zone == ch.at.zone 
				&& Math.abs(p.at.x - ch.at.x) < 10
				|| Math.abs(p.at.y - ch.at.y) < 10)
			near = 1;
		});
		
		return near;
	}
};