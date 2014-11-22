/* AARALON (c) 2013-2014 */
 
var fs = require('fs');
var u = require('util');
var path = require('path');

module.exports = {
	
	init: function(re) {
	
		log('act.init');
		
		havoc.register('act', 'plugin.change', this.reloadPlugin);
		char.register('act', 'enter', this.initChar);
		
		this.initPlugins(re);
		this.emit('init');
	},
 
	initPlugins: function(re) {
	
		var plugins = fs.readdirSync('./plugins').filter(function(i) { return i.match(/^act\..+\.js/i); });
		log('act component detected plugins: ' + plugins.join(', '));
		
		for (var i in plugins) {
			
			log('loading act plugin: '+plugins[i]);
			
			var pg = plugins[i].split('.')[1];
			var f = './plugins/'+plugins[i];

			delete require.cache[require.resolve('../'+f)];
			act[pg] = require('../'+f);

			if (act[pg].init)
				act[pg].init(re), delete act[pg].init;	
			
			log('loaded: '+f.color('&155') + ' '+ Object.keys(act[pg]).join(', ').font('size=10'));
		}
		
		if (re)
			char.updateActors(re);
	},
	
	initChar: function(ch) {

		ch.cmd = point({}, act.basic);
		var allowed = true; /* act plugins without a requires check will allow every command in them */
		
		for (var i in act) {
			
			if (act[i] instanceof Function || i[0] == '_')
				continue;
			
			if (act[i].requires && !(allowed = act[i].requires(ch)))
				continue;
			
			//if (ch.PC())
				//log(ch.name + ' +command set: ' + i);

			point(ch.cmd, act[i], allowed); /* point will only assign properties in the 'allowed' array */
		}
		
		delete ch.cmd.requires;
	},
	
	reloadPlugin: function(comp, f) {

		if (comp != act)
			return;
		
		log('act.reloadPlugin');
		act.initPlugins(1);
	},

	basic: {
		
		quit: function() {
			var ch = this;

			char.emit('exit', ch);
			
			ch.stop().save().success(function() {
				if (ch.s)
					user.lobby(ch.s);
			});
		},
		
		exit: function(arg) {
			this.cmd.quit.apply(this, arg);
		}
	}
};