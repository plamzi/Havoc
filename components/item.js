/* Havoc (c) 2014 */

var fs = require('fs');
var u = require('util');
var events = require('events');
var Seq = require('sequelize');

addStrings({

	eng: {
		
		ITEM_TYPE_ICON: {
			potion: 	my().U_URN,
			scroll:		my().U_SCROLL,
			weapon: 	my().U_SWORDS,
			armor: 		my().U_SHIELD,
			light: 		my().U_LANTERN,
			key:		my().U_KEY,
			money:  	my().U_COINS,
			book:		my().U_BOOK,
			quest:		my().U_QUEST,
			handwear:	my().U_FIST,
			footwear:	my().U_SHOE,
			bodywear:	my().U_TSHIRT,
			legwear:	my().U_PANTS,
			earwear:	my().U_EAR,
			eyewear:	my().U_GLASSES,
			headgear:	my().U_CROWN,
		},
		
		ITEM_LOCATION_ICON: {
			worn: 		my().U_USED,
			carried: 	my().U_POUCH,
			shop: 		my().U_SCALES,
			storage: 	my().U_STORAGE,
			ground:		my().U_HILLS
		}
	}
});

var item_struct = {

	name: Seq.STRING,

	type: Seq.STRING,

	position: Seq.STRING,

	location: Seq.STRING,

	attr: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('attr')+')');
		},
		set: function(v) {
			this.setDataValue('attr', stringify(v));
		},
		defaultValue: {}
	},

	affects: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('affects')+')');
		},
		set: function(v) {
			this.setDataValue('affects', stringify(v));
		}
	},

	at: {
		type: Seq.STRING,
		get: function() {
			return eval('('+this.getDataValue('at')+')');
		},
		set: function(v) {
			this.setDataValue('at', stringify(v));
		}
	}
};

module.exports = {
	
	init: function(re) {

		debug('item init');

		havoc.register('item', 'plugin.change', item.reloadPlugin);

		char.register('item', 'enter', function(ch) {
			
			ch.getItems().then(function(items) {
			
				ch.items = items;
				
				for (var i in ch.items)
					item.initItem(ch.items[i]);
							
				/* give out a starter kit, if needed */
				ch.kit();
			});
		});

		char.register('item', 'init', item.initDB);
		
		if (re)
			item.initDB();
		
		item.initPlugins();
	},

	initDB: function() {

		debug('item initDB');
	
		ItemProto = db.define('ItemProto', item_struct);
		Item = db.define('Items', item_struct);

		ItemProto.hasMany(Item);
		Item.belongsTo(ItemProto);
		
		ItemProto.hasMany(Proc, { as: 'procs', through: 'ProcLinks' });
		Proc.hasMany(ItemProto, { through: 'ProcLinks' });
		
		Char.hasMany(Item, { as: 'items' });
		Item.belongsTo(Char);
		
		Item.belongsTo(User); /* shared storage */
		
		Mob.hasMany(Item, { as: 'items' });
		Item.belongsTo(Mob);
		
		/* support for hardcoded mob drops */
		/*
		 * MobProto.hasMany(ItemProto, { as: 'items' });
		 * ItemProto.belongsTo(MobProto); 
		 */
		
		User.sync()
		.then(function() {
			return Proc.sync();
		})
		.then(function() {
			return Item.sync();
		})
		.then(function() {
			return ItemProto.sync();
		})
		.then(function() {
			return Char.sync();
		})
		.then(function() {
			return Mob.sync();
		})
		.then(function() {
			return ItemProto.findAll({
				include: [{ model: Proc, as: "procs" }]
			});
		})
		.then(function(r) {
			
			my().itemproto = {};
		
			for (var i in r)
				my().itemproto[r[i].id] = r[i];

			info('item.init: finished indexing item prototypes: ' + Object.keys(my().itemproto).length);
			item.updateProcs(); /* item proto may finish loading after some instances have entered the game */
			
			return Item.findAll();
		})
		.then(function(r) {
			
			my().items = r;
			info('item.init: Finished loading item instances: ' + r.length);

			for (var i in r)
				item.initItem(r[i]);
			
			info('item.init: Finished instancing and placing ground items.');
			item.emit('init');
		});
	},
	
	initPlugins: function() {

		var plugins = fs.readdirSync('./plugins').filter(function(i) { return i.match(/^item\..+\.js$/i); });
		info('item.initPlugins detected: ' + plugins.join(', '));
		
		for (var i in plugins) {
	
			//log('loading item plugin: '+plugins[i]);
			var pg = plugins[i].split('.')[1];
			var f = './plugins/'+plugins[i];
			
			delete require.cache[require.resolve('../'+f)];
			item[pg] = require('../'+f);

			if (item[pg].init)
				item[pg].init(re), delete item[pg].init;	
			
			info('loaded: '+f.color('&155') + ' '+ Object.keys(item[pg]).join(', ').font('size=11'));
		}
	},
	
	reloadPlugin: function(comp, f) {

		if (comp != item)
			return;
		
		debug('item.reloadPlugin');
		item.initPlugins(1);
	},
	
	initProcs: function(it) {
		
		var procs;
		
		if (!(procs = it.getProto().procs))
			return;
		
		for (var i in procs) {
			try {
				var p = procs[i];
				it.register('item' + it.ItemProtoId, 'proc.' + p.type, eval('('+p.func + ')'));
			} catch(ex) {
				warning(ex);
			}
		}
	}, 

	initItem: function(it, re) {

		if (!re) {
			/* turn all item instances into event emitters */
			it.__proto__.__proto__.__proto__ = events.EventEmitter.prototype;
			
			/* shim the default event emit method so we can chain it */
			it._emit = it.emit;
		}
		
		/* give them the basic instance methods of items */
		point(it, item.instanceMethods);

		my().items.add(it);
		
		if (it.location == 'ground') {
			if (!world.getItems(it.at).has(it))
				item.toGround(it);
		}
		
		if (my().itemproto)
			item.initProcs(it);
		
		//log('initItem ' + it.name);
		item.emit('enter', it);
	},
	
	updateProcs: function() {

		info('item.updateProcs: re-init procs on existing online items');

		var a = my().items;

		for (var i in a) 
			item.initProcs(a[i]);
	},
	
	createItem: function(o, cb) { /* create an instance of a prototyped item from a name string, proto id number, or an object of values */
		
		debug('item.createItem');
		
		if (!cb)
			warning('item.create called with no callback!');
		
		if (typeof o == 'string' && !o.isnum())
			o = item.protoByName(o);
		else
		if (typeof o == 'number' || o.isnum())
			o = my().itemproto[o];

		o = o ? clone(o.values) : null;
		
		if (!o)
			return error('item.createItem could not locate proto for: ' + stringify(o));	

		o.ItemProtoId = o.id, delete o.id, delete o.createdAt, delete o.updatedAt;
		
		Item.create(o).then(function (it) { 
			item.initItem(it);
			!cb || cb(it); 
		});
	},

	create: function() { /* forward to createItem */
		this.createItem.apply(this, arguments);
	},
	
	destroyItem: function(it, cb) {
		
		debug('item.destroyItem');
		
		my().items.remove(it);
		
		it.destroy().then(function() {
			!cb || cb();
		});
	},
	
	destroy: function() { /* forward to destroyItem */
		this.destroyItem.apply(this, arguments);
	},
	
	craft: function(o, cb) {
		
		log('item.craft');
		
		if (!cb)
			warning('item.craft called with no callback!');
		
		var opt = copy(o);
		
		if (o.attr)
			opt.attr = stringify(o.attr);
		
		if (o.affects)
			opt.affects = stringify(o.affects);

		/* sequelize findOrCreate doesn't work properly with our custom stringified fields, yet */
		
		/*ItemProto.findOrCreate(o).spread(function(proto, created) {
			
			log('item.craft produced ' + proto.name + '. new proto is: ' + created);
			
			if (created)
				my().itemproto[proto.id] = proto;
	
			item.create(proto.id, cb);
		});*/
		
		ItemProto.find({
			where: opt
		})
		.then(function(proto) {
			if (proto) {
				log('item.craft re-produced existing proto item: ' + proto.name + '. proto id: ' + proto.id);
				item.create(proto.id, cb);			
			}
			else 
			ItemProto.create(o).success(function(proto) {
				log('item.craft created new proto item: ' + proto.name + '. new id: ' + proto.id);
				my().itemproto[proto.id] = proto;
				item.create(proto.id, cb);
			});
		});
	},
	
	toGround: function(it) {

		if (!my().zone[it.at.zone])
			return warning('orpaned ground item: ' + stringify(it));
		
		world.getItems(it.at).add(it);
	},

	fromGround: function(it) {
		
		//log('item.fromGround');
		if (!my().zone[it.at.zone])
			return warning('orpaned ground item: ' + stringify(it));
		
		world.getItems(it.at).remove(it);
	},
	
	getProto: function(it) {
		return my().itemproto[it.ItemProtoId];
	},
	
	protoByName: function(a) {
		
		var ip = my().itemproto;
		
		for (var i in ip)
			if (ip[i].name.toLowerCase() == a.toLowerCase())
				return ip[i];
		
		return null;
	},

	protoIdByName: function(a) {
		var ip = item.protoByName(a);
		return ip ? ip.id : null;
	},
	
	/* these methods will be attached to every item instance */
	instanceMethods: {
		
		getProto: function() {
			return my().itemproto[this.ItemProtoId];
		},
		
		setAttr: function(a, cb) {
			var it = this, attr = it.attr;
			extend(attr, a);
			it.updateAttributes({ attr: attr }, ['attr'], function() { !cb || cb(it) });
		},
	
		unsetAttr: function(a, cb) {
			var it = this, attr = it.attr;
			delete attr[a];
			it.updateAttributes({ attr: attr }, ['attr'], function() { !cb || cb(it) });
		},
		
		emit: function() {
			this._emit.apply(this, arguments);
			return this;
		}
	}
};