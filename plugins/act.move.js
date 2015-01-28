var u = require('util');

addStrings({
	eng: {
	
		INVALID_DIR:				"That's not a direction you can go in.",
		TRAVEL_USAGE:				"Usage: travel x y",
		ENTER_USAGE:				"Usage: enter portal_name",
		NO_ENTRANCE:				"There is no such entrance here.",
		NO_EXIT:					"There is no such exit here.",
		YOU_CANNOT_ENTER_X:			"You cannot enter %s",
		
		JOIN_USAGE:					"Usage: join char_name",
		X_PREFERS_TO_BE_ALONE:		"%s prefers to be alone right now.",
		X_WHO:						"%s who?",
		X_HAS_ANOTHER_LEADER_B:		"%s already follows %s.",
		YOU_JOIN_X_S_PARTY:			"You join %s's party.",
		X_HAS_JOINEND_YOUR_PARTY:	"A has joined your party.",
		YOU_NO_LONGER_FOLLOW_X:		"You leave %s's party."
	}
});

module.exports = {
		
	init: function() {
			
	},
		
	//down: function(ch) 	{ this.cmd.go(ch, 'down') },
	//up: function(ch) 		{ this.cmd.go(ch, 'up') },
	east: function() 		{ this.go('east'); },
	west: function() 		{ this.go('west'); },
	south: function() 		{ this.go('south'); },
	north: function() 		{ this.go('north'); },

	northeast: 	function() 	{ this.go('northeast'); },
	ne:			function() 	{ this.go('northeast'); },
	northwest: 	function() 	{ this.go('northwest'); },
	nw: 		function() 	{ this.go('northwest'); },
	southeast: 	function() 	{ this.go('southeast'); },
	se:			function() 	{ this.go('southeast'); },
	southwest: 	function() 	{ this.go('southwest'); },
	sw: 		function() 	{ this.go('southwest'); },

	travel: function(arg) {

		if (!arg || arg.length != 2)
			return this.send(my().TRAVEL_USAGE);
		
		var ch = this, path = ch.path({ zone: ch.at.zone, x: parseInt(arg[0]), y: parseInt(arg[1]) });
		
		if (path && path.length)
			ch.do(path.map(function(i) { return i[0]; }).join(';'));
	},

	enter: function(arg) { /* this handles portal movement (jump across or within zones) */

		if (!arg)
			return this.send(my().ENTER_USAGE);
		
		var ch = this, from = ch.at, p = world.getPortals(ch.at);

		if (!p || !p.length)
			return ch.send(my().NO_ENTRANCE);

		p = p.filter(function(i) { return i.id == arg[0]; })[0];
		
		if (!p || !ch.canSee(p))
			return ch.send(my().NO_ENTRANCE);
		
		if (ch.canEnter(p)) {
			if (ch.canExit(p))
				ch.emitExit(p.to).fromRoom().toRoom(p.to).emitEntry(from);
		}
		else
			ch.send(u.format(my().YOU_CANNOT_ENTER_X, to.zone));
		
		return this;
	},
	
	join: function(arg) {

		if (!arg)
			return this.send(my().JOIN_USAGE);
		
		var ch = this, vict = ch.findActor(arg[0]);
		
		if (!vict)
			return ch.send(u.format(my().CANT_X_SOMEONE_NOT_HERE, 'join'));
			
		if (ch == vict) {
			if (vict.attr.leader) {
				ch.send(u.format(my().YOU_NO_LONGER_FOLLOW_X, vict.attr.leader.name));
				ch.unsetAttr('leader');
			}
			return;
		}
		
		if (vict.pref('loner'))
			return ch.send(u.format(my().X_PREFERS_TO_BE_ALONE, vict.name));
		
		if (vict.attr.leader)
			return ch.send(u.format(my().X_HAS_ANOTHER_LEADER_Y, vict.name, vict.attr.leader.name));
		
		ch.setAttr({ leader: { id: vict.id, name: vict.name, pc: vict.pc()?1:0 } });
		
		ch.send(u.format(my().YOU_JOIN_X_S_PARTY, vict.name));
		vict.send(u.format(my().X_HAS_JOINED_YOUR_PARTY, ch.name));
	},
	
	recall: function() {
		this.recall();
	},
	
	party:	function() {
		
	}
};