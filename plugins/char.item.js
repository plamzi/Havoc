var u = require('util');

addStrings({
	
	eng: {
		
		X_IS_NOT_EQUIPPED: "You're not wearing %s.",

		KIT: [
			 'a plain shield', 
			 'a simple dagger', 
			 'a leather jerkin',
			 'a leather jerkin',
			 'a simple red potion'
		]
	}
});

module.exports = {

	init: function(re) {
		
		char.register('char.item', 'enter', function(ch) {

			/* listener for always giving out some stuff on kill */
			ch.register('char.item', 'kill', function(vict) {
				ch.giveGold(vict.level);
				ch.send(my().U_COINS.color('&220') + ' +' + vict.level);
			});
			
			/* hook to the basic stat method so worn items can modify a stat */
			ch.register('char.item', 'stat', function(d) {
				ch.applyAff(d, 'worn');
			});
			
			ch.register('char.item', 'absorb', function(vict, dam) {
				vict.updateDurability(this, dam);
			});
		});
	},
	
	getGold: function() {
		if (this.s)
			return this.s.user.points.gold;
		else
			return this.points.gold;
	},
	
	setGold: function(d) {
		if (this.s) {
			var p = this.s.user.points;
			p.gold = d;
			this.s.user.updateAttributes({ points: p }, ['points']);
		}
		else {
			var p = this.points;
			p.gold = d;
			this.updateAttributes({ points: p }, ['points']);
		}
	},
	
	takeGold: function(d) {
		var gold = this.getGold();
		this.setGold(gold - d);
	},
	
	giveGold: function(d) {
		var gold = this.getGold();
		this.setGold(gold + d);
	},
	
	/* item manipulation */
	
	canTake: function(it) {
		return 1;
	},

	canEquip: function(it, mode) {
		return 1;
	},
	
	canUnequip: function(it, mode) {
		
		if (it.location != 'worn')
			return ch.send(u.format(m.X_IS_NOT_EQUIPPED, it.name));
	
		return 1;
	},

	canUse: function(it) {
		return 1;
	},

	take: function(it, cb) {

		var ch = this;

		if (it.location == 'ground')
			item.fromGround(it);

		var o = {
			location: 'carried',
			CharId: ch.pc()?ch.id:null,
			MobId: ch.npc()?ch.id:null
		};

		it.updateAttributes(o).then(function() {
			ch.items.add(it); /* are we violating ORM restrictions by doing this? testing is needed */
			!cb || cb(it);
		});

		return ch;
	},

	drop: function(it, cb) {
		
		var ch = this;

		it.updateAttributes({
			location: 'ground',
			at: clone(ch.at)
		})
		.then(function() {

			item.toGround(it);
			
			ch.save(['at']).then(function() {
				ch.reload().then(function() {
					!cb||cb(it);
				});
			});
		});
	},

	equip: function(it, cb) {
		
		var ch = this;
		
		if (!ch.canEquip(it, my().VERBOSE))
			return thia;
		
		for (var i = 0; i < ch.items.length; i++)
			if (ch.items[i].location == 'worn' && ch.items[i].position == it.position)
				ch.unequip(ch.items[i]);
		
		it.location = 'worn';
		it.save().then(function() { !cb||cb(it); });
		
		return this;
	},
 
	unequip: function(it, cb) {

		var ch = this;
		
		if (!ch.canUnequip(it, my().VERBOSE))
			return;
		
		it.updateAttributes( { location: 'carried' }).then(function() { !cb||cb(it); });
		
		return this;
	},

	kit: function() {

		var ch = this;
		
		if (ch.npc())
			return;
			
		if (ch.pref('kit'))
			return log('has starter kit', ch.s);
		
		var _equip = function(it) {
			
			ch.take(it, function() {
				
				if (ch.canEquip(it, my().SILENT))
					ch.equip(it);
			});
		};
		
		my().KIT.forEach(function(i) {
			item.create(i, _equip);	
		});
		
		/* starting gold */
		ch.setGold(50);
		
		ch.setPref({ kit: 1 });
	},
		
	applyAff: function(stat, type) {
		var ch = this;
		for (var i in ch.items)
			if (   ch.items[i].location == type 
				&& ch.items[i].attr
				&& ch.items[i].attr.affects
				&& ch.items[i].attr.affects[stat])
					ch.temp[stat] += ch.items[i].attr.affects[stat];
	},
	
	getOne: function(filter) {
		
		var ch = this, its = ch.items.filter(filter);
		return its.length ? its.one() : null;
	},
	
	updateDurability: function(from, dam) {
		
		var ch = this, it = ch.getOne(function(it) { return it.type == 'armor'; });
		
		if (!it)
			return;
			
		var dura = it.attr.dura || 100;
		
		if ((--dura) < 0)
			return;
			
		it.setAttr({ dura: dura });
		
		if (ch.s) {
			ch.send(it.name + ' durability -1');
			log('lowering durability of ' + it.name + ' to ' + dura + ' for ' + ch.name, ch.s);
		}
	},
	
	hasItem: function(name) {
		
		if (typeof name == 'number')
			return this.hasItemId(name);
		
		return (this.items.filter(function(i) { return i.name == name; }).length);
	},

	hasItemId: function(id) {
		return (this.items.filter(function(i) { return i.ItemProtoId == id; }).length);
	},

	
	findItem: function(arg, mode) {
		
		var ch = this, n = 1, j = 0;
		mode = mode || 'hasvis';
		
		if (arg.has('.')) {
			var ar = arg.split('.'),
			n = parseInt(ar[0]),
			arg = ar[1];
		}

		var a = [];

		if (mode.has('has'))
			a = a.concat(ch.items);
		
		if (mode.has('at'))
			a = a.concat(ch.getItemsAt(mode));
		
		if (mode.has('world'))
			a = a.concat(my().items);
		
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
			
			for (var k in x) {
				
				if (arg.isAbbrev(x[k])) {
					
					if (mode.has('vis') && !ch.canSee(a[i]))
						continue;
					
					if (++j == n) 
						return a[i];
				}
			}
		}
		return null;
	}
};