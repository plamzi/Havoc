/* AARALON (c) 2013-2014 */

/* This plugin exposes or handles the methods available to magical items */

var u = require('util');

addStrings({
	
	eng: {
		X_MAKES_YOU_FEEL_BETTER:		"%s makes you feel better."
	}
});

module.exports = {

	heal: function(ch, it, use, arg) {
		ch.gain('health', use.level * 2);
		ch.send(u.format(my().X_MAKES_YOU_FEEL_BETTER, it.name).cap());
	}
};