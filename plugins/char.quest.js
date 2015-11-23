/* Havoc (c) 2014 */

/* non-user-facing utility methods related to quests that will be attached to character instances */

var u = require('util');

addStrings({
	
	eng: {
		
	}
});

module.exports = {
 
	init: function(re) {
		
		char.register('char.quest', 'enter.pc', function(ch) {
			
			debug('char.quest enter.pc');
			
			/* load up a character's active quests. their linking table will be inside CharQuest */
			ch.getQuests().then(function(r) {
				ch.quests = r;
			});
			
			/* load up all of a user's characters' quests so we can check for completions at user level */
			ch.s.user.chars.forEach(function(ch) {
				ch.getQuests().then(function(r) {
					ch.quests = r;
				});
			})
		});
	},

	hasQuest: function(name, status) { /* check if a character has a quest, or if the quest status matches a certain string (e. g. completed) */

		if (!this.quests)
			return false;
			
		if (typeof name == "number") /* can also check by numeric id */
			name = quest[name].name;

        var res = null;
        
		this.quests.some(function(q) { 

			if (status && q.name == name && q.CharQuest.status == status) {
			    res = q.CharQuest;
			    return true;
			}
			
			if (!status && q.name == name) {
			    res = q.CharQuest;
			    return true;
			}
			
			return false;
		});
		
		return res;
	},
	
	/* check any of a user's chars for an active quest record. this enables once-per-user quests */
	anyHasQuest: function(name, status) {
	   
	    if (this.npc())
			return false;
			
		if (typeof name == "number") /* can also check by id */
			name = quest[name].name;

        var res = null;

		this.s.user.chars.some(function(ch) { 
		    res = ch.hasQuest(name, status);
			res = exists(res.name) ? res.CharQuest : null;
			return res?1:0;
		});
		
		return res;
	},
	
	hasCompletedQuest: function(name) {

		if (this.npc())
			return false;
		
		if (typeof name == "number") /* can also check by number */
			name = quest[name].name;
		
		/* 	As per sequelize goodness, we can access the CharQuest object of a quest to determine its individual status 
			for a given character. Note that this is different from q.status, which would be the status of the quest summary record
			showing whether a quest is enabled, etc.
		*/
		return this.quests.filter(function(q) { return q.name == name && q.CharQuest.status == 'completed'; }).length;
	},
	
	/* 	enables quiet destruction of carried item 
		can also destroy using unique id since we're casting name to string
		and since ch.findItem handles unique id finding for us
	*/
	
	destroyItem: function(name) {
		
		var ch = this, it = ch.findItem(name + '', 'has');
		
		if (!it)
			return warning('char.quest destroyItem: '  + name + ' failed ');
		
		item.destroy(it, function() {
			info('char.quest destroyItem: '  + name + ' success ');
			ch.do('inv');
		});
		
		return this;
	},

	alterItem: function(name, o) {
	
		var ch = this, it = ch.findItem(name, 'has-at');
		
		if (!it)
			return warning('char.quest alterItem: '  + name + ' failed ');
		
		it.updateAttributes(o).then(function() {
			log('char.quest alterItem success');
			ch.do('inv');
		});
		
		return this;
	}
};