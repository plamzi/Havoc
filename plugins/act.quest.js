var u = require('util');
var Seq = require('sequelize');

var Help;

var help_struct = {
	name: Seq.STRING,
	alias: Seq.STRING,
	topic: Seq.STRING,
	content: Seq.TEXT
};

addStrings({
	
	eng: {
		TALK_USAGE:			"Usage: talk target",
		QUEST_USAGE:		"Usage: " 
							+ "quest list".mxpsend('quest list', 'Displays all quests in game.') + "  " 
							+ "quest log".mxpsend('quest log', 'Displays the on-going quests for your character'),
		READ_USAGE:			"Usage: read item_keyword"
	}
 
});

module.exports = {

	init: function(re) {
		
		char.on('enter', function(ch) {
		
			ch.on('2.do', function() {
				
				var ch = this;
				
				if (ch.input)
				for (var i in act.quest) {
					if (i.isAbbrev(ch.input.cmd) && ch.cmd[i]) {
						ch.cmd[i].call(ch, ch.input.arg);
						return delete ch.input;
					}
				}
			});
		});
	},
	
	talk: function(arg) {
		
		var ch = this;

		if (!arg)
			return ch.send(my().TALK_USAGE);

		var vict = ch.findActor(arg[0], 'at-vis');

		if (!vict)
			return ch.send(my().NO_ONE_BY_THAT_NAME);

		vict.emit('proc.talk', ch, arg);
	},

	read: function(arg) {
		
		var ch = this;

		if (!arg)
			return ch.send(my().READ_USAGE);
		
		var it = ch.findItem(arg[0], 'has-at-vis');
				
		if (!it)
			it = ch.findItem(arg.join(' '), 'has-at-vis');

		if (!it)
			return ch.send(u.format(my().YOU_DONT_SEE_X, arg.join(' ')));

		log('act.quest calling proc.read');
		it.emit('proc.read', ch, arg);
	},
	
	quest: function(arg) {
		
		var ch = this;
		
		ch.send('');
		
		if (!arg)
			return ch.send(my().QUEST_USAGE);
		
		if (arg[0].isAbbrev("list"))
			return quest.listAllQuests(ch);
		
		if (arg[0].isAbbrev("log"))
			return quest.showCharQuests(ch);
		
		return ch.send(my().QUEST_USAGE);
	}
};