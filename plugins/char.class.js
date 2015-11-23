var u = require('util');
var Seq = require('sequelize');

addStrings({

	eng: {
		GAIN_LEVEL_X_MSG:	('\u2605 \u2605 \u2605').color('&208') + " You have reached level %s! " + ('\u2605 \u2605 \u2605').color('&208')
	}
});

var class_struct = {
	name: Seq.STRING(100),
	desc: Seq.STRING(255),
	abbrev: Seq.STRING(10), 
	minLevel: Seq.INTEGER
};

my().exp = (function() {
	var exp = [];
		for (var i = 1; i < 100; i++)
			exp[i] = (i * 50) + (i << 8);
	return exp;
})();

/* private methods */

var onExp = function(ch, gain) {
	
	ch.send(my().U_STAR.color('&208') + ' +' + gain, 'events');
	
	if (ch.points.exp > my().exp[ch.level + 1]) { /* fanfares & fireworks */
	
		ch.setPoints({ maxhit: ch.points.maxhit + 10 });
		ch.setPoints({ maxmana: ch.points.maxmana + 10 });
		ch.setPoints({ maxstamina: ch.points.maxstamina + 10 });
		
		ch.updateAttributes({ level: ch.level + 1 }, ['level']).then(function() {
			ch.restore().send(u.format(my().GAIN_LEVEL_X_MSG, ch.level));
		});
	}
};

var onKill = function(ch, vict) {
	ch.gain('exp', vict.level);
};

var onStat = function(ch, vict) {
	
	var m = my(), exp = m.exp;
	var tnl = (vict.points.exp - exp[vict.level]) / (exp[vict.level + 1] - exp[vict.level]);
	tnl = Math.round(tnl * 100);
	tnl = isNaN(tnl) ? 0 : tnl;
	
	var bar = function(tnl) {
		var bar = [];
			for (var i = 1; i <= 10; i++) {
				if (tnl < i && tnl > (i - 1))
					bar.push(m.U_SQUARE_HALF);
				else
					bar.push(tnl > i?m.U_SQUARE_FULL:m.U_SQUARE_EMPTY);
			}
		return bar;
	}(tnl / 10);
	
	//dump(exp);
	ch.snd(
		m.U_STAR.color('&208') + ' ' + vict.level + ' ' 
		+ bar.join('').color('&130') + ' ' + (tnl + '%').style(11, '&I')
	);
};

module.exports = {

	init: function(re) {

		char.register('char.class', 'enter', function(ch) {
			
			/* classic gain exp on kill */
			ch.register('char.class', 'kill', function(vict) {
				onKill(this, vict);
			});
			
			/* other plugins can call ch.gain and it will alert char.class */
			ch.register('char.class', 'gain.exp', function(gain) {
				onExp(this, gain);
			});
			
			ch.register('char.class', 'proc.stat', function(vict) {
				onStat(this, vict);
			});
			
			if (ch.attr.bg == 'criminal')
				ch.setAff({
					'criminal background': {
						affects: {
							maxstamina: parseInt(ch.points.maxstamina / 10)
						}
					}
				});
		});

		havoc.register('char.class', 'init', function() {
			
			Class = db.define('Classes', class_struct, { timestamps: 0 });
			//Class.sync();
			Class.findAll()
			.then(function(r) {
				/* we'll keep the resulting array in my() so we can reload the rest of the code */
				my().classes = r;
				char.emit('classes.loaded');
				info('char.class loaded classes: ' + my().classes.length);
			});	
		});
	},
	
	isAsn: function() { return this.class == 'Assassin'; },
	isNecro: function() { return this.class == 'Necromancer'; },
	isRaider: function() { return this.class == 'Raider'; },
	isPaladin: function() { return this.class == 'Paladin'; }

};