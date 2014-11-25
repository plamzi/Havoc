var u = require('util');

addStrings({
	
	eng: {
	}
});

module.exports = {
	
	requires: function(ch) {
		return ch.builder() || ch.imp();
	},
	
	init: function(re) {

	}
};
	