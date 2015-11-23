var u = require('util');
var Seq = require('sequelize');

addStrings({

	eng: {
		
		IMPOSSIBLE_TO_ATTACK_X:			"You find it impossible to attack %s.",
		TOO_FAR_FROM_X_TO_Y_Z:			"You are too far from %s to %s %s.",
		YOU_PREPARE_TO_A: 				"You prepare to %s.",
		NOONE_TO_KILL:					"Can't attack someone who isn't here.",
		CANT_X_SOMEONE_NOT_HERE:		"Can't %s someone who isn't here.",
		KILL_YOURSELF:					"You can't attack yourself.",
		YOU_START_FIGHTING: 			"You start fighting %s!",
		A_STARTS_FIGHTING_YOU: 			"%s starts fighting you!",
		A_STARTS_FIGHTING_B:			"%s starts fighting %s!",
		YOU_STOP_FIGHTING: 				"You stop fighting %s.",
		A_STOPS_FIGHTING_YOU: 			"%s stops fighting you.",
		A_STOPS_FIGHTING_B:				"%s stops fighting %s.",
		YOU_STOP_FIGHTING_NULL: 		"You stop fighting.",
		A_STOPS_FIGHTING_NULL:			"%s stops fighting.",
		ALREADY_FIGHTING: 				"You are already fighting %s.",
		TOO_BUSY_FIGHTING: 				"You are too busy fighting %s.",
		YOU_NEED_MORE_STAMINA_TO:  		"You need more stamina to %s.",
		YOU_NEED_MORE_MANA_TO:  		"You need more mana to %s.",
		YOU_KILLED_X:					"You killed %s.",
		YOU_WERE_DEFEATED_BY:			"You were defeated by %s.",
		TOO_IMMORTAL_TO_DIE: 			"Alas, you are too immortal to die...",
		X_IS_TOO_IMMORTAL_TO_DIE:		"%s is too immortal to die...",
	}
});

var attack_struct = {
	name: Seq.STRING(100),
	source: Seq.STRING(45),
	thirdperson: Seq.STRING(45),
	hit: Seq.STRING(255),
	action: Seq.STRING(255),
	type: {
		type: Seq.TEXT,
		get: function() {
			return this.getDataValue('type').split(',').trim();
		},
		set: function(v) {
			this.setDataValue('type', stringify(v));
		}
	},
	targets: {
		type: Seq.TEXT,
		get: function() {
			return this.getDataValue('targets').split(',').trim();
		},
		set: function(v) {
			this.setDataValue('targets', stringify(v));
		}
	},
	req: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('req')+')');
		},
		set: function(v) {
			this.setDataValue('req', stringify(v));
		}
	},
	cost: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('cost')+')');
		},
		set: function(v) {
			this.setDataValue('cost', stringify(v));
		}
	},
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

var onDo = function(ch) {
	if (ch.input) {
		var c;
		if ((c = ch.canCombat(ch.input.cmd))) {
			ch.setAttack(c, ch.input.arg);
			return delete ch.input;
		}
	}
};

module.exports = {

	init: function(re) {

		if (re)
			this.loadAttacks(re);
		
		havoc.register('char.fight', 'init', this.loadAttacks);
		
		char.register('char.fight', 'enter', function(ch) {
			
			ch.setAttacks();

			ch
			.register('char.fight', 'wear', ch.setAttacks)
			.register('char.fight', 'remove', ch.setAttacks)
			.register('char.fight', '2.do', function() { onDo(this); });
			
		});

		char.register('char.fight', 'enter.pc', function(ch) {

			ch
			.sendGMCP('ch.points', ch.points)
			.sendGMCP('ch.attacks', ch.attacks);

			ch.register('char.fight', 'post.stat', function(vict) {
				if (ch == vict)
					ch.snd('\r\n' + 'attacks'.mxpsend());
			});
		});
		
		char.register('char.fight', 'exit', function(ch) {
			ch.stopFighting();
		});
		
		char.register('char.fight', 'attacks.loaded', function () {
			/* if attacks loaded after some actors did, grant them attacks */
			var a = char.getActors();
			debug('char.fight: updating attacks on existing actors ' + a.length);
				for (var i in a)
					a[i].setAttacks();
		});
	},
	
	loadAttacks: function(re) {

		var Attacks = db.define('Attacks', attack_struct, { timestamps: 0 });

		//Attacks.sync();
		Attacks.findAll()
		.then(function(r) {
			/* we keep reference data in my() so we can reload the rest of the code */
			my().attacks = r;
			char.emit('attacks.loaded');
			
			info('char.fight loaded attacks: ' + my().attacks.length);
		});	
	},
	
	canAttack: function(vict, mode) {
		
		var ch = this, m = my();
		
		if (vict.attr.nohassle) {
			if (mode == m.VERBOSE)
				this.send(u.format(m.IMPOSSIBLE_TO_ATTACK_X, vict.name));
			return 0;
		}
		
		if (!ch.isAt(vict))
			ch.send(m.NOONE_BY_THAT_NAME);
		
		return 1;
	},
	
	canPerformAttack: function(att) {
		
		var ch = this, p = ch.points, change = 0, vict = ch.fighting, m = my();

		if (!vict)
			return 0;
			
		if (att.type.has('melee') && !ch.isAt(vict)) {
			//ch.send(u.format(m.TOO_FAR_FROM_X_TO_Y_Z, vict.name, att.name, m.SEX[vict.sex].himher));
			ch.stopFighting(vict);
			vict.stopFighting(ch);
			return 0;
		}
		
		if (att.cost.stamina) {
			if (p.stamina > att.cost.stamina) {
				p.stamina -= att.cost.stamina;
				change = 1;
			}
			else 
				ch.send(u.format(m.YOU_NEED_MORE_STAMINA_TO, att.name));
		}

		if (att.cost.mana) {
			if (p.mana > att.cost.mana) {
				p.mana -= att.cost.mana;
				change = 1;
			}
			else
				ch.send(u.format(m.YOU_NEED_MORE_MANA_TO, att.name));
		}

		if (change) {
			ch.updateAttributes({ points: p }, ['points']);
			ch.sendGMCP("ch.points", p);
			return 1;
		}
		
		return 0;
	},
	
	setAttacks: function() {
		
		if (!my().attacks)
			return;

		//log('char.fight setAttacks');
		
		var ch = this, can, a = my().attacks;
		ch.attacks = [];
		
		for (var i in a) {
			
			can = true;
			
			for (var n in a[i].req) {
				try {
					if (!eval('ch.'+a[i].req[n] + '()'))
						can = false;
				}
				catch(ex) {
					log(ex);
				}
			}
			
			if (ch.imp())
				can = true;
			
			if (can) {
				ch.attacks.push(a[i]);
				//if (ch.PC())
					//log('+attack ' + a[i].name);
			}
		}
	},
	
	canCombat: function(c, mode) {

		for (var C in this.attacks)
			if (c.isAbbrev(this.attacks[C].name))
				return (mode==my().SILENT)?C:this.attacks[C];
		
		return null;
	},
	
	canSlash: function() {
		if (!this.items || !this.items.length)
			return 0;
		var w = this.items.filter(function(i) { return i.location == 'worn' && i.attr.canSlash; });
		return (w && w[0])?w[0]:0;
	},
	
	canStab: function() {
		if (!this.items || !this.items.length)
			return 0;
		var w = this.items.filter(function(i) { return i.location == 'worn' && i.attr.canStab; });
		return (w && w[0])?w[0]:0;
	},

	isArmed: function() {
		if (!this.items || !this.items.length)
			return 0;
		var w = this.items.filter(function(i) { return i.location == 'worn' && i.type == 'weapon'; });
		return (w && w[0])?w[0]:0;
	},

	startFighting: function(vict) {
		
		var ch = this, m = my();
		var att = ch.getAttack(), skl = ch.getSkill(), def = ch.getDefense();

		ch.fighting = vict;
		
		if (ch.pc())
			ch.send(u.format(m.YOU_START_FIGHTING, vict.name) + ' &I' + att.name + ', ' + skl.name + ', ' + (exists(def)?def.name:'no defense') + '&n');
		
		vict.send(u.format(m.A_STARTS_FIGHTING_YOU, ch.name));
		ch.sendAt(u.format(m.A_STARTS_FIGHTING_B, ch.name, vict.name), /* exclude */[ch, vict]);
		
		if (exists(att))
			att.timeout = setTimeout(function() { ch.attack('att'); }, att.attr.speed);
		
		if (exists(skl))
			skl.timeout = setTimeout(function() { ch.attack('skill'); }, skl.attr.speed);
		
		if (exists(def)) {
			def.attr.ready = 0;
			def.timeout = setTimeout(function() { def.attr.ready = 1; }, def.attr.speed);
		}
		
		if (!vict.fighting) {
			
			att = ch.getAttack(), skl = ch.getSkill(), def = ch.getDefense();

			vict.fighting = ch;

			if (exists(att))
				att.timeout = setTimeout(function() { vict.attack('att'); }, 1000 + att.attr.speed);

			if (exists(skl))
				skl.timeout = setTimeout(function() { vict.attack('skill'); }, 1500 + skl.attr.speed);

			if (exists(def)) {
				def.attr.ready = 0;
				def.timeout = setTimeout(function() { def.attr.ready = 1; }, 1000 + def.attr.speed);
			}
		}
		
		return ch;
	},
	
	stopFighting: function(vict, silent) {
		
		var ch = this, m = my();
		
		if (!ch.fighting)
			return ch;
		
		vict = vict||ch.fighting;
		
		if (!vict) {
			ch.send(m.YOU_STOP_FIGHTING_NULL);
			//ch.sendAt(u.format(m.A_STOPS_FIGHTING_NULL, ch.name));
			return ch;
		}
		
		if (ch.fighting != vict)
			return ch;

		ch.fighting = null;

		if (vict.fighting && vict.fighting == ch)
			vict.fighting = null;
		
		var att = ch.getAttack(), skl = ch.getSkill(), def = ch.getDefense();
		
		if (exists(att))
			clearTimeout(att.timeout);

		if (exists(skl))
			clearTimeout(skl.timeout);

		if (exists(def))
			clearTimeout(def.timeout);
		
		if (!silent) {
			ch.send(u.format(m.YOU_STOP_FIGHTING, vict.name));
			vict.send(u.format(m.A_STOPS_FIGHTING_YOU, ch.name));
			ch.sendAt(u.format(m.A_STOPS_FIGHTING_B, ch.name, vict.name), [vict]);
		}
		
		return ch;
	},
	
	attack: function(mode) {
		
		var ch = this, vict = ch.fighting, att;
		
		if (!vict)
			return ch.stopFighting();
		
		if (mode == 'att')
			att = ch.getAttack();
		else
		if (mode == 'skill')
			att = ch.getSkill();
		else
			return log('ch.attack called w/o mode');

		if (!att) /* char lost the ability to perform this type of attack */
			return;

		var repeat = function() { ch.attack(mode); };
		
		if (ch.canPerformAttack(att)) {
			ch.damage(att, vict);
			att.timeout = setTimeout(repeat, att.attr.speed);
		}
		
		return ch;
	},
	
	absorb: function(foe, att, dam) {
		
		var ch = this, ac = ch.stat('armor');
		
		if (NUM(0, 5) < ac) {
			var absorb = MIN(dam / 3, ac);
			dam -= absorb;
			ch.send(my().U_SHIELD.color('&Y') + absorb + ' armor'.color('&K'));
			ch.emit('absorb', foe, absorb);
		}
			
		return MAX(dam, 0);
	},
	
	defend: function(foe, att, dam) {
		
		var ch = this, def = ch.getDefense();
		
		if (def.attr.ready) {
			
			var absorb = MIN(dam / 2, def.attr.armor);
			
			dam -= absorb;
			ch.send('&Y'+my().U_SHIELD+'&n '+absorb+' '+def.name.color('&I'));			

			def.attr.ready = 0;
			setTimeout(function() { def.attr.ready = 1; }, def.attr.speed);
		}
			
		return MAX(dam, 0);
	},
	
	damage: function(att, vict) {
		
		//log('ch.damage');
		var ch = this, p = vict.points, dam = 0;
		
		dam = att.attr.damage;
		
		if (att.type == 'melee') 
			dam += ch.stat('damage');
		
		dam = vict.defend(ch, att, dam);
		dam = vict.absorb(ch, att, dam);
		
		if (!dam) 
			return;
		
		p.hit -= dam;
		ch.dam_message(att, vict, 'hit');
		ch.emit('damage', vict, dam);
		
		vict.updateAttributes({ points: p }, ['points']);
		vict.sendGMCP("ch.points", p);
		//log(p.hit);
		
		if (p.hit <= 0) 
			vict.die(ch);
			
		return ch;
	},
	
	dam_message: function(att, vict, type) {
		
		var ch = this, m = my(), msg, icon = att.source=='skill'?m.U_SKILL.color('&B'):m.U_HAND.color('&124');
		
		if (att.source == 'weapon')
			icon = my().U_SWORDS.color('&124');
		
		if (type == 'hit') {
			
			msg = att.hit.replace('$C', 'you');
			msg = msg.replace(/\$A/i, att.action||att.name);
			msg = msg.replace('$Vr', vict.name + "'s");
			msg = msg.replace('$V', vict.name);
			ch.send('&r' + att.attr.damage + '&n '+icon+' ' + msg.cap());

			msg = att.hit.replace('$Cr', ch.name + "'s");
			msg = msg.replace('$C', ch.name);
			msg = msg.replace('$A', att.thirdperson);
			msg = msg.replace('$V', 'you');
			msg = msg.replace('$E', m.SEX[ch.sex].heshe);
			msg = msg.replace('$S', m.SEX[ch.sex].hisher);
			msg = msg.replace('$M', m.SEX[ch.sex].himher);
			vict.send('&r' + att.attr.damage + '&n '+icon+' ' + msg.cap());
			
			msg = att.hit.replace('$Cr', ch.name + "'s");
			msg = msg.replace('$C', ch.name);
			msg = msg.replace('$A', att.thirdperson);
			msg = msg.replace('$a', att.action||att.name);
			msg = msg.replace('$E', m.SEX[ch.sex].heshe);
			msg = msg.replace('$S', m.SEX[ch.sex].hisher);
			msg = msg.replace('$M', m.SEX[ch.sex].himher);
			msg = msg.replace('$V', vict.name);
			ch.sendAt('&r' + att.attr.damage + '&n '+icon+' ' + msg.cap(), [vict]);
		}
	},
	
	die: function(from) {
				
		var ch = this, m = my();
		
		log("ch.die: " + ch.name);
		
		if (ch.immo()) {
			
			ch
			.send(m.TOO_IMMORTAL_TO_DIE)
			.stopFighting(from, m.SILENT)
			.restore();
			
			from
			.send(u.format(m.X_IS_TOO_IMMORTAL_TO_DIE, ch.name))
			.stopFighting(ch, m.SILENT);
			
			return;
		}
		
		ch
		.stopFighting(from, m.SILENT)
		.send(u.format(m.YOU_WERE_DEFEATED_BY, from.name));
		
		from
		.stopFighting(ch, m.SILENT)
		.send(u.format(m.YOU_KILLED_X, ch.name));

		from.emit('kill', ch);
		ch.emit('die', from);
		from.send(''); /* send line feed after plugins add their info */
		
		return ch;
	},

	setAttack: function(att) {
		
		var ch = this;
		
		if (att.type.has('defensive')) {
			
			ch.send(u.format(my().YOU_PREPARE_TO_A, att.name));
			ch.setPref({ defense: att.name });
			
			if (ch.fighting) {
				var def = ch.getDefense();
				setTimeout(function() { def.attr.ready = 1; }, def.attr.speed);
			}
		}
		else
		if (att.source.has('skill') && att.type.has('melee')) {
			ch.send(u.format(my().YOU_PREPARE_TO_A, att.name));
			ch.setPref({ skill: att.name });
			var skl = ch.getSkill();
			if (exists(skl))
				clearTimeout(skl.timeout);
		}
		else
		if (att.type.has('melee')) {
			ch.send(u.format(my().YOU_PREPARE_TO_A, att.name));
			ch.setPref({ attack: att.name });
			var att = ch.getAttack();
			if (exists(att))
				clearTimeout(att.timeout);
		}
		
		ch.do('attacks');
		ch.sendGMCP("ch.attacks", ch.attacks);
		ch.sendGMCP("ch.attr.pref", ch.attr.pref);
		
		return ch;
	},

	getAttack: function() {
		
		var ch = this;
		var first = ch.attacks.filter(function(a) { return !a.source.has('skill') && a.type.has('melee'); })[0];
		
		if (!ch.attr.pref.attack)
			return first;

		var att = ch.attacks.filter(function(a) { return a.name == ch.attr.pref.attack; });
		return att[0] || first;
	},

	getSkill: function() {

		var ch = this;
		var first = ch.attacks.filter(function(a) { return a.source.has('skill') && a.type.has('melee'); })[0];

		if (!ch.attr.pref.skill)
			return first;

		var skl = ch.attacks.filter(function(a) { return a.name == ch.attr.pref.skill; });
		return skl[0] || first;
	},

	getDefense: function() {

		var ch = this;
		var first = ch.attacks.filter(function(a) { return a.type.has('defensive'); })[0];
		
		if (!ch.attr.pref.defense)
			return first;

		var skl = ch.attacks.filter(function(a) { return a.name == ch.attr.pref.defense; });
		return skl[0] || first;
	},
	
	getWornArmor: function(a) {
		return ch.items.filter(function(it) { return it.position == 'worn' && it.type == 'armor' });
	}
};