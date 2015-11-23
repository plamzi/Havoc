var u = require('util');

addStrings({
	
	eng: {
		
		YOUR_ITEMS:						"Your items:",
		YOU_GET_X:						"You get %s.",
		YOU_DROP_X:						"You drop %s.",
		YOU_GIVE_X_TO_Y:				"You give %s to %s.",
		YOU_GIVE_X_TO_Y:				"You give %s to %s.",
		X_GIVES_YOU_Y:					"%s gives you %s.",
		YOU_EQUIP_X:					"You equip %s.",
		YOU_UNEQUIP_X:					"You un-equip %s.",
		YOU_JUNK_X:						"You junk %s.",
		YOU_NOW_HAVE_X: 				"You now have %s.",
		YOU_ARE_NOT_WEARING_X:			"You are not wearing %s.",
		REMOVE_USAGE:					"Usage: remove worn_item_keyword",
		WEAR_USAGE:						"Usage: wear carried_item_keyword",
		LIST_USAGE:						"Usage: list search_word",
		TAKE_USAGE:						"Usage: take item_keyword",
		GET_USAGE:						"Usage: get item_keyword",
		DROP_USAGE:						"Usage: drop item_keyword",
		USE_USAGE:						"Usage: use item_keyword [target]",
		JUNK_USAGE:						"Usage: junk item_keyword",
		SELL_USAGE: 					"Usage: sell item_price",
		BUY_USAGE: 						"Usage: list search_word then buy",
		IDENTIFY_USAGE:					"Usage: identify item_keyword",
		YOU_DONT_HAVE_X:				"You don't have %s.",
		YOU_DONT_SEE_X:					"You don't see %s here.",
		YOU_CANT_USE_X_YET:				"You can't use %s, yet?",
		NO_SUCH_ITEM:					"No such item exists.",
		NO_SUCH_ITEM_FOR_SALE: 			"No such item for sale.",
		YOU_DONT_HAVE_X_GOLD:			"You don't have %s %s.",
		YOU_BOUGHT_X: 					"You bought %s.",
		YOU_BOUGHT_X_Y: 				"You bought %s %s.",
		USE_FULL_NAME_TO_DISPOSE:		"To dispose of an item, you have to type its full name.",
		MATCHING_SHOP_ITEMS:			"Matching items for sale:",
		ITEM_DETAILS:					"Item details:",
		ITEM_ALREADY_IN_STORAGE:		"This item is already in storage.",
		ITEM_NOT_IN_STORAGE:			"This item is not in storage.",
		X_PLACED_IN_STORAGE:			"%s was placed in storage.",
		X_TAKEN_FROM_STORAGE:			"%s was taken out of storage.",
	}
});

var onDo = function(ch) {
	if (ch.input) {
		for (var i in act.item) {
			if (i.isAbbrev(ch.input.cmd) && ch.cmd[i]) {
				ch.cmd[i].call(ch, ch.input.arg);
				return delete ch.input;
			}
		}
	}
};

module.exports = {
		
		init: function(re) {

			/* act.item commands will be looked up in the first pass */
			char.register('act.item', 'enter', function(ch) {
				ch.register('act.imp', '1.do', function() { onDo(this); });
			});
		},
		
		remove: function(arg) {
			
			var ch = this; 
			
			if (!arg)
				return ch.send(my().REMOVE_USAGE);

			var it = ch.findItem(arg[0], 'has-vis');
					
			if (!it)
				it = ch.findItem(arg.join(' '), 'has-vis');
				
			if (it)
				ch.unequip(it, function() { ch.emit('remove', it); ch.do('inv'); });
			else
				ch.send(u.format(my().YOU_ARE_NOT_WEARING_X, arg[0]));
		},
		
		wear: function(arg) {
			
			var ch = this; 
			
			if (!arg)
				return ch.send(my().WEAR_USAGE);

			var it = ch.findItem(arg[0], 'has-vis');
					
			if (!it)
				it = ch.findItem(arg.join(' '), 'has-vis');
				
			if (it)
				ch.equip(it, function() { ch.emit('wear', it); ch.do('inv'); });
			else
				ch.send(u.format(my().YOU_DONT_HAVE_X, arg[0]));
		},
		
		take: function(arg) {
			
			var ch = this; 
			
			if (!arg)
				return ch.send(my().TAKE_USAGE);
			
			var it = ch.findItem(arg[0], 'at-vis');
		
			if (!it)
				it = ch.findItem(arg.join(' '), 'at-vis');

			if (!it)
				ch.send(u.format(my().YOU_DONT_SEE_X, arg[0]));

			if (!ch.canTake(it, my().VERBOSE))
				return;

			ch.take(it, function() {
				ch.send(u.format(my().YOU_GET_X, it.name));
				ch.do('inv'); 
			});
		},
		
		get: function(arg) {
			return this.cmd.take.call(this, arg);
		},
		
		drop: function(arg) {

			var ch = this; 
			
			if (!arg)
				return ch.send(my().DROP_USAGE);
			
			var it = ch.findItem(arg[0], 'has-vis');
					
			if (!it)
				it = ch.findItem(arg.join(' '), 'has-vis');
				
			if (!it)
				return ch.send(u.format(my().YOU_DONT_HAVE_X, arg[0]));
			
			ch.drop(it, function() {
				ch.send(u.format(my().YOU_DROP_X, it.name));
				ch.do('look'); 
			});
		},
		
		use: function(arg) {
			
			var ch = this;
			
			if (!arg)
				return ch.send(my().USE_USAGE);
			
			var it = ch.findItem(arg[0], 'has-vis');
		
			if (!it)
				it = ch.findItem(arg.join(' '), 'has-at-vis');
				
			if (!it)
				return ch.send(u.format(my().YOU_DONT_HAVE_X, arg[0]));
			
			if (!it.attr.use)
				return ch.send(u.format(my().YOU_CANT_USE_X, it.name));
				
			if (!item.use[it.attr.use.name]) {
				warning('item asked for a use not found in item.use: ' + it.name + ' - ' + it.attr.use.name);
				return ch.send(u.format(my().YOU_CANT_USE_X_YET, it.name));
			}

			if (!ch.canUse(it))
				return ch.send(u.format(my().YOU_CANT_USE_X_YET, it.name));
			
			var n = it.attr.use.times || 1;

			for (var i = 0; i < n; i++)
				item.use[it.attr.use.name](ch, it, it.attr.use, arg);

			var _it = it;

			it.destroy().then(function() {
				ch.items.remove(_it);
				ch.do('inv');
			});
		},
		
		sell: function(arg) {

			var ch = this;
			
			if (!arg)
				return ch.send(my().SELL_USAGE);

			var it = ch.findItem(arg[0], 'has-vis');
		
			if (!it)
				it = ch.findItem(arg.join(' '), 'has-vis');
				
			if (it) {
				
				it.location = 'shop';
				
				if (arg[1])
					it.setAttr({ price: parseInt(arg[1]) });
				else
					if (!it.attr.price)
						return ch.send(my().SELL_USAGE);

				it.save().then(function(it) {
					ch.do('inv');
				});
			}
			else
				ch.send(u.format(my().YOU_DONT_HAVE_X, arg[0]));
		},
		
		unsell: function(arg) {

			var ch = this;
			
			if (!arg)
				return ch.send(my().UNSELL_USAGE);

			var it = ch.findItem(arg[0], 'has-vis');
			
			if (!it)
				it = ch.findItem(arg.join(' '), 'has-vis');

			if (it) {
				it.location = 'carried';
				it.save().then(function(it) {
					ch.do('inv');
				});
			}
			else
				ch.send(u.format(my().YOU_DONT_HAVE_X, arg[0]));
		},
		
		buy: function(arg) {

			var ch = this;
			
			if (!arg)
				return ch.send(my().BUY_USAGE);
				
			Item.findAll({
				where: [{ location: "shop", id: arg[0] }]
			})
			.then(function(r) {
				
				if (!r.length || r.length > 1)
					return ch.send(my().NO_SUCH_ITEM_FOR_SALE);

				ch.send(my().MATCHING_SHOP_ITEMS.color('&B'));

				if (r[0].attr.price > ch.getGold())
					return ch.send(u.format(my().YOU_DONT_HAVE_X_GOLD, r[0].attr.price, my().CURRENCY));
					
				ch.takeGold(r[0].attr.price);
				
				r[0].location = 'carried';
				
				if (ch.PC())
					r[0].CharId = ch.id;
				
				r[0].save().then(function() {
					ch.send(u.format(my().YOU_BOUGHT_X, r[0].name));
				});
			});
		},
		
		list: function(arg) {

			var ch = this, m = my();
			
			if (!arg)
				return ch.send(m.LIST_USAGE);

			Item.findAll({
				where: [
					{ location: "shop" }, 
					[ "name LIKE '%" + arg.join(' ') + "%'" ] 
				],
				group: ['CharId', 'MobId', 'ItemProtoId']
			})
			.then(function(r) {
				
				if (!r.length)
					return ch.send(m.NO_SUCH_ITEM_FOR_SALE);

				//ch.send(my().MATCHING_SHOP_ITEMS.color('&B'));

				for (var i in r)
					ch.send(
						r[i].name.mxpselect([ 'id ' + r[i].id, 'buy ' + r[i].id ]) + ' ' 
						+ my().U_COINS.color('&221') + ' ' + r[i].attr.price.comma() + ' '
						+ (r[i].CharId?m.charindex[r[i].CharId].name:m.mobindex[r[i].MobId].name).color('&I')
					);
			});
		},

		store: function(arg) {
			
			if (!arg || !arg[0].isnum())
				return;
			
			var ch = this, it = ch.items.filter(function(i) { return i.id == arg[0]; });
			
			if (it)
				it = it[0];
			else
				return;
			
			if (it.location == 'storage')
				return ch.send(my().ITEM_ALREADY_IN_STORAGE);
			
			it.location = 'storage';
			
			it.updateAttributes({
				location: 'storage',
				UserId: ch.user.id
			})
			.then(function() {
				ch.getItems().then(function(r) {
					ch.items = r;
					if (ch.s.portal)
						ch.do('inventory');
					else
						ch.send(u.format(my().X_PLACED_IN_STORAGE, it.name.cap()));
				});
			});
		},
		
		unstore: function(arg) {
			
			if (!arg || !arg[0].isnum())
				return;
			
			var ch = this;
			
			Item.findAll({
				where: {
					UserId: ch.user.id,
					location: 'storage'
				}
			})
			.then(function(storage) {
				
				var it = storage.filter(function(i) { return i.id == arg[0]; });
				
				if (it)
					it = it[0];
				else
					return;
				
				it.updateAttributes({
					location: 'carried',
					CharId: ch.id
				})
				.then(function() {
					ch.getItems().then(function(r) {
						ch.items = r;
						if (ch.s.portal)
							ch.do('inventory');
						else
							ch.send(u.format(my().X_TAKEN_FROM_STORAGE, it.name.cap()));
					});
				});
			});
		},

		junk: function(arg) {

			var ch = this;
			
			if (!arg)
				return ch.send(my().JUNK_USAGE);
			
			var it = ch.findItem(arg.join(' '), 'has-vis');

			if (!it)
				return ch.send(my().USE_FULL_NAME_TO_DISPOSE);
			
			var _it = it;
			
			it.destroy().then(function() {
				ch.items.remove(_it);
				ch.send(u.format(my().YOU_JUNK_X, _it.name));
			});
		}
	};