/* private methods for automated NPC behaviors */

var u = require('util');

addStrings({
	
	eng: {
		
	}
});

var pulse = {};

pulse.roam = function() {
	
	if (!this.isNearPlayers())
		return;
	
	var ch = this, dir = my().DIR.one();
	
	if (ch.canRoam(dir))
		ch.do(dir);
};

pulse.herbalist = function() {
	
	var ch = this;
	
	if (!ch.hasItem('a simple red potion'))
		item.create('a simple red potion', function(it) {
			ch.take(it, function() {
				ch.do('sell ' + it.id);
			});
		});
};

module.exports = {

	requires: function(ch) {
	
		/* we could return some methods here that could then be used as npc-only commands */
		
		return false;
	},

	init: function(re) {
		
		char.register('act.npc', 'enter.npc', function(ch) {
			
			/* if npc has roam attribute, assign roaming behavior */
			if (ch.attr.roam)
				ch.register('act.npc', 'proc.pulse', pulse.roam);

			/* assign automated pulse behaviors based on npc trade */
			if (module['pulse.' + ch.trade.toLowerCase()])
				ch.register('act.npc', 'proc.pulse', pulse[ch.trade.toLowerCase()]);
		});
	}
};