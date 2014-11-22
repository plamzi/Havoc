var u = require('util');

addStrings({
	
	eng: {
		HEAL_USAGE:			"Usage: heal target.",
		HEAL_AFFECT:		"You feel better."
	}

});

module.exports = {

	requires: function(ch) {
		
		if (ch.NPC())
			return false;
		
		return ch.isPaladin() || ch.imp();
	},

	init: function(re) {
		
		char.on('init', function() {
			//char.instanceMethods.social = social;
			//char.instanceMethods.canSocial = canSocial;

		});
	},

	heal: function(arg) {

		var ch = this;
		
		ch.gain('health', ch.level * 2);

		ch.send(my().HEAL_AFFECT);
	}
};