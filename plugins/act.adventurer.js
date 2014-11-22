var u = require('util');

addStrings({
	
	eng: {
		
		YOU_NEED_X_INSPIRATION: "You need %s inspiration to perform this craft.",
		
		MEND_USAGE: "Usage: mend armor_name",
		X_DOESNT_NEED_MENDING: "%s doesn't need any mending.",
		YOU_DONT_HAVE_X_GOLD_TO_MEND_Y: "You don't have the %s gold you need to mend %s.",
		YOU_MENDED_X_Y: "You managed to mend %s %s.",
		
		PATCH_USAGE: "Usage: mend armor_name",
		X_DOESNT_NEED_PATCHING: "%s doesn't need any patching.",
		YOU_DONT_HAVE_X_GOLD_TO_PATCH_Y: "You don't have the %s gold you need to patch %s.",
		YOU_PATCHED_X_Y: "You managed to patch %s %s.",
		
		IMPROVISE_SHOES_USAGE: "Usage: improvise shoes basic | average | good",
		IMPROVISE_SHOES_MIN_X_LVL_FOR_Y: "You need to be level %s to improvise %s quality shoes.",
		IMPROVISE_SHOES_X_ATTEMPT: "You attempt to improvise some %s shoes."
	}
});

module.exports = {
	
	requires: function(ch) {
		return ch.trade == 'Adventurer';
	},
	
	init: function(re) {
		db.debug(0);
	},

	mend: function(arg) {
		
		var ch = this, it;
		
		if (!arg || arg.length != 1)
			return ch.send(my().MEND_USAGE);

		if (!(it = ch.findItem(arg[0], 'hasvis')))
			return ch.send(u.format(my().YOU_DONT_HAVE_X, arg[0]));
		
		if (!it.attr.dura)
			return ch.send(u.format(my().X_DOESNT_NEED_MENDING, it.name));
		
		var cost = 100 - it.attr.dura - ch.level, gold = ch.getGold();
		
		if (cost > gold)
			return ch.send(u.format(my().YOU_DONT_HAVE_X_GOLD_TO_MEND_Y, cost, it.name));
		
		if (cost > 0)
			ch.takeGold(cost);
		
		it.unsetAttr('dura');
		
		ch.send(
			u.format(my().YOU_MENDED_X_Y, it.name, ( cost > 0 ? 'for ' + cost + ' ' + my().CURRENCY + '.': 'at no cost' ))
		);
	},
	
	patch: function(arg) {
		
		var ch = this, it;
		
		if (!arg || arg.length != 1)
			return ch.send(my().PATCH_USAGE);

		if (!(it = ch.findItem(arg[0], 'hasvis')))
			return ch.send(u.format(my().YOU_DONT_HAVE_X, arg[0]));
		
		if (!it.attr.dura)
			return ch.send(u.format(my().X_DOESNT_NEED_PATCHING, it.name));
		
		var cost = 100 - it.attr.dura - ch.level, gold = ch.getGold();
		
		if (cost > gold)
			return ch.send(u.format(my().YOU_DONT_HAVE_X_GOLD_TO_PATCH_Y, cost, it.name));
		
		if (cost > 0)
			ch.takeGold(cost);
		
		it.unsetAttr('dura');
		
		ch.send(
			u.format(my().YOU_PATCHED_X_Y, it.name, ( cost > 0 ? 'for ' + cost + ' ' + my().CURRENCY + '.': 'at no cost' ))
		);
	},
	
	'improvise shoes': function(arg) {
		
		var ch = this, it;
		
		if (!arg || arg.length != 1)
			return ch.send(my().IMPROVISE_SHOES_USAGE);
		
		var basic = arg[0].isAbbrev('basic'),
			average = arg[0].isAbbrev('average'),
			good = arg[0].isAbbrev('good');
		
		if (average && ch.level < 5)
			return ch.send(u.format(my().IMPROVISE_SHOES_MIN_X_LVL_FOR_Y, 5, 'average'));
			
		if (good && ch.level < 10)
			return ch.send(u.format(my().IMPROVISE_SHOES_MIN_X_LVL_FOR_Y, 10, 'good'));
		
		if (ch.getPoints('inspiration') < 1)
			return ch.send(u.format(my().YOU_NEED_X_INSPIRATION, 1));
		
		var o = {
			type: 'worn',
			position: 'feet',
			affects: { armor: between(1, 2) }
		};
		
		if (basic) {
			ch.send(u.format(my().IMPROV_SHOES_X_ATTEMPT, 'basic'));
			o.affects = { armor: between(3, 4), maxstamina: between(1, 5) };
			o.name = 'some basic leather shoes';
		}
		
		if (average) {
			ch.send(u.format(my().IMPROV_SHOES_X_ATTEMPT, 'average'));
			o.affects = { armor: between(3, 4), maxstamina: between(1, 5) };
			o.name = 'some average leather shoes';
		}
		
		if (good) {
			ch.send(u.format(my().IMPROV_SHOES_X_ATTEMPT, 'good'));
			o.affects = { armor: between(3, 4), maxstamina: between(1, 5) };
			o.name = 'some good leather shoes';
		}
		
		db.debug(1);
		item.craft(o, function(it) {
			db.debug(0);
			ch.take(it, function() {
				ch.send(u.format(my().YOU_NOW_HAVE_X, it.name));
				ch.do('inv');
			});
		});
	}
};
	