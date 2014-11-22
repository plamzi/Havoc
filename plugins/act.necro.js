var u = require('util');

addStrings({
	
	eng: {
		UNHOLY_ARMOR_AFFECT:			"You feel unholy-armored.",
		UNHOLY_ARMOR_UNAFFECT:			"Your unholy armor has fallen."
	}

});

module.exports = {

	requires: function(ch) {
	
		if (ch.NPC())
			return false;
		
		var allowed = Object.keys(this).remove('requires', 'init');
		
		if (ch.imp())
			allowed.remove('raise spirit');
		
		return allowed;
	},

	init: function(re) {
		
		char.on('init', function() {
			//char.instanceMethods.social = social;
			//char.instanceMethods.canSocial = canSocial;

		});
	},

	'raise spectre': function(arg) {

		var ch = this;
		
		ch.send('raise spectre: '+ arg.join(' '));

	},

	'raise spirit': function(arg) {

		var ch = this;
		
		ch.send('raise spirit: '+ arg.join(' '));
		
	},

	'unholy armor': function(arg) {

		var ch = this;

		ch.setAff({
			
			'unholy armor': {
				
				affects: {
					armor: 2 
				},
				
				expires: now() + (5).minutes(),
				
				msg: my().UNHOLY_ARMOR_UNAFFECT
			}
		});

		ch.send(my().UNHOLY_ARMOR_AFFECT);
	}
};