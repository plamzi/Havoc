var u = require('util');

addStrings({
	
	eng: {
		ATTACKS_USAGE:		"Usage: attacks (no arguments)",
		YOUR_ATTACKS:		"Your Attacks:",
		KILL_USAGE:			"Usage: kill target",
		PEACE_USAGE:		"Usage: peace (no arguments) " + "\u262E".font('size=20')
	}
});

module.exports = {

	requires: function(ch) {
		
		if (ch.immo() && !ch.imp())
			return 0;
		
		return 1;
	},
	
	init: function(re) {
	
	},
	
	kill: function(arg) {

		var ch = this;
		
		if (!arg)
			return ch.Send(my().KILL_USAGE);

		vict = ch.findActor(arg.join(' '));

		if (!vict)
			vict = ch.findActor(arg[0]);
		
		if (!vict)
			return ch.send(my().NOONE_TO_KILL);
		
		if (ch == vict)
			return ch.send(my().KILL_YOURSELF);
		
		if (ch.imp())
			dump(vict.at);
		
		if (ch.fighting) {
			if (ch.fighting == vict)
				ch.send(u.format(my().ALREADY_FIGHTING, vict.name));
			else
				ch.send(u.format(my().TOO_BUSY_FIGHTING, vict.name));
			return;
		}
		
		if (!ch.canAttack(vict, my().VERBOSE))
			return;
		
		ch.startFighting(vict);
	},
	
	peace: function() {
		this.stopFighting(this.fighting, my().VERBOSE);
	},
	
	/* display the attacks available to the character */
	attacks: function() {
		
		var ch = this;
		
		var att = ch.getAttack(), skl = ch.getSkill(), def = ch.getDefense();
		
		var msg = ch.attacks.map(function(a) {
			
			var box = my().U_SQUARE_EMPTY.style(18, '&n');
			var icon = (a.source=='skill')?my().U_SKILL.color('&B'):my().U_HAND.color('&124');

			if (a.source == 'weapon')
				icon = my().U_SWORDS.style(18, '&124');

			if (a.type.has('defensive'))
				icon = my().U_SHIELD.style(18, '&134');

			if (def && a.name == def.name)
				box = my().U_SQUARE_FULL.style(18, '&134');
			else
			if (skl && a.name == skl.name)
				box = my().U_SQUARE_FULL.style(18, '&B');			
			else
			if (att && a.name == att.name)
				box = my().U_SQUARE_FULL.style(18, '&124');
			
			return (box + ' ' + a.name + ' ' 
			+ icon + ' ' + (a.attr.damage||a.attr.armor) + ' ' 
			+ my().U_SPEED + ' ' + (a.attr.speed / 1000) + ' ' 
			+ a.type.join(',').color('&Ki')).mxpsend(a.name);
			
		}).join('\r\n');
		
		//ch.snd('<FRAME Name="attacks" Parent="ChatterBox">'.mxp());
		ch.snd((my().YOUR_ATTACKS + '\r\n' + msg).mxpdest('Modal'));
	}
};