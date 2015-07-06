//#!/usr/bin/env node

/* Havoc (c) 2013-2014 */

process.chdir(__dirname);
 
/* built-in modules */
var u = require('util');
var net = require('net');
var fs = require('fs');
var path = require('path');
var http = require('http');
var events = require('events');

/* 3rd party modules */
var tail = require('tail').Tail;

/* special cases: utility functions and the config file */
require('./config');
require('./util');

var re = exists(global.havoc); /* yes, my friends, global havoc may already exist */

if (re) {
	var _events = havoc._events;
	var _registered = havoc._registered;
}

havoc = { 

	scripts: fs.readdirSync('./').filenames(),

	languages: fs.readdirSync('./languages').filenames(),
	
	components: fs.readdirSync('./components').filenames(),

	plugins: fs.readdirSync('./plugins').filenames(),

	quests: fs.readdirSync('./quests').filenames(),
	
	init: function() { /* at this time, init should be called only on engine boot-up */
		
		console.log('havoc engine init');

		this.loadLanguages();
		this.loadComponents();
	
		console.log('havoc emitting init');
		
		/* some component listeners will be waiting here for all other components to init */
		havoc.emit('init');
		
		if (config.server.dynamic) {
			
			havoc.watchers = [];
			log('config.server.dynamic is true, watching for changes in the following files:');
			this.watch(this.scripts, 'script');
			this.watch(this.languages, 'language');
			this.watch(this.components, 'component');
			this.watch(this.plugins, 'plugin');
			this.watch(this.quests, 'quest');
		}
		
		server.register('havoc', 'close', function(core) {
			
			/* server(s) crashed or rebooted. re-init */
			if (core)
				error('game servers have crashed. respawning via server.init');
			else
				warning('havoc received close event from game servers. rebooting normally.');

			server.init();
			havoc.emit('init');
			/* setTimeout(process.exit, 3000, core?3:0);  -- we could send SIGQUIT to get a core dump */
		});
		
		var syslog = new tail(config.server.log);

		syslog.register('havoc', 'line', function(data) {
			havoc.emit('syslog', data);
		});
	},
	
	loadLanguages: function() {
		
		for (var i in this.languages)
			this.loadLanguage(this.languages[i]);

		console.log('detected & loaded language files: ' + this.languages.join(', '));
	},
	
	loadLanguage: function(a) {
		
		var f = './languages/' + a + '.js', re = exists(global[a]);
 
		if (re) { /* overwrite individual properties when reloading */
			delete require.cache[require.resolve(f)];
			point(global[a], require(f));
		}
		else
	    	global[a] = require(f);

	    log((re?'re-':'')+'loaded base language file: ' + a.color('&155'));
 	},
 
	loadComponents: function() {

		log('detected component files: %s', this.components.join(', '));

		for (var i in this.components)
			this.loadComponent(this.components[i]);

		for (var i in this.components)
			global[this.components[i]].init();
	},

	loadComponent: function(a) {
		
		log('havoc.loadComponent: %s', a);
		
		var f = './components/' + a + '.js', re = exists(global[a]);
		
	    delete require.cache[require.resolve(f)];
	    var _events = re ? global[a]._events : null; /* preserve any event listeners on component reload */
		var _registered = re ? global[a]._registered : null; /* also preserve the lookup index that enables us to register events w/o duplication */

	    global[a] = require(f);
	    global[a].__proto__ = events.EventEmitter.prototype;
	    global[a]._events = _events;
		global[a]._registered = _registered;
		
		global[a].setMaxListeners(100);
		 
	    log((re?'re-':'')+'loaded component: ' + a.color('&155') + ' ' + Object.keys(global[a]).join(', '));
		
		if (re)
	    	global[a].init(re);
 	},
 
	loadPlugin: function(a) {
		
		var f = './plugins/' + a + '.js';
		var bits = a.split('.'), component = bits[0], plugin = bits[1];
		    
		if (global[component]) { /* we let components decide what happens when a plugin of theirs is modified */
			log('detected plugin change: ' + a.color('&155'));
			havoc.emit('plugin.change', global[component], f);
		}
		else
			log('detected plugin change but no valid parent component: ' + a.color('&155'));
 	},
 	
	loadScript: function(a) {

		log('attempting to load script: %s', a);

		var f = './' + a;

	    delete require.cache[require.resolve(f)];
	    require(f);
	    
		log('(re-)loaded script: %s', a.color('&155'));
	},
	
	/* each quest is basically a plugin, but we want to organize them in their own folder */
	loadQuest: function(a) {
		
		var f = './quests/' + a + '.js';
		var bits = a.split('.'), component = bits[0], plugin = bits[1];
 
		if (global[component]) { /* we let components decide what happens when a plugin of theirs is modified */
			log('detected quest file change: ' + a.color('&155'));
			havoc.emit('plugin.change', global[component], f);
		}
		else
			log('detected quest plugin change but no valid parent component: ' + a.color('&155'));
 	},
 	
	updateLanguage: function(e, f) {
		
		//if (havoc['update'+f]) 
			clearTimeout(havoc['update'+f]);

		havoc['update'+f] = setTimeout(function() {
			havoc.loadLanguage(f.replace(/\.[^/.]+$/, ""));
		}, 1000);
	},
	
	updateScript: function(e, f) {

		//if (havoc['update'+f]) 
			clearTimeout(havoc['update'+f]);
		
		havoc['update'+f] = setTimeout(function() { 
			havoc.loadScript(f);
		}, 1000);
	},

	updateComponent: function(e, f) {
	
		//if (havoc['update'+f]) 
			clearTimeout(havoc['update'+f]);

		havoc['update'+f] = setTimeout(function() {
			havoc.loadComponent(f.replace(/\.[^/.]+$/, ""));
		}, 1000);
	},

	updatePlugin: function(e, f) {
		
		//if (havoc['update'+f]) 
			clearTimeout(havoc['update'+f]);

		havoc['update'+f] = setTimeout(function() {
			havoc.loadPlugin(f.replace(/\.[^/.]+$/, ""));
		}, 1000);
	},
	
	updateQuest: function(e, f) {
		
		//if (havoc['update'+f]) 
			clearTimeout(havoc['update'+f]);

		havoc['update'+f] = setTimeout(function() {
			havoc.loadQuest(f.replace(/\.[^/.]+$/, ""));
		}, 1000);
	},
	
	watch: function(f, type) {
		for (var i in f) {
			var fn = './'+(type == 'script'?f[i]:type+'s/' + f[i]) + '.js';
			var w = fs.watch(fn, havoc['update'+type.cap()]);
			havoc.watchers.push(w);
		}
	},
 
	die: function(core) {
		warning('havoc dying in 3 seconds'); /* to do: make sure everything is spick and span before exiting process */
		!global.server || server.close();
		setTimeout(process.exit, 3000, core?3:0); /* send SIGQUIT to get a core dump */
	},
	
	error: function(err) { log('error: ' + err); }
};

/* make havoc inherit from event emitter even though it's an object literal */
havoc.__proto__ = events.EventEmitter.prototype;

/* carry over events if we reload havoc.js itself, which is crazy of course :) */
if (re) {
	havoc._events = _events;
	havoc._registered = _registered;
}
else {
	process.stdin.resume();
	process
	.on( 'SIGINT', function () { log('Got SIGINT.'); havoc.die(); })
	.on('SIGABRT', function () { log('Got SIGABRT.'); havoc.die(); })
	.on('SIGSEGV', function () { log('Got SIGSEGV.'); havoc.die(1); /* die with core dump */ })
	.on('SIGTERM', function () { log('Got SIGTERM.'); havoc.die(); });
	//.on('uncaughtException', log);
	/* 
		we can catch any old exceptions here, but we won't get details
		about where they happened, so if this listener is enabled, it means
		we just don't want to let bugs crash us. those are bugs that should be fixed.
		it's almost always better to let it crash and get a nice trace.
		
		we'll be adding domains to intercept errors earlier & better
	*/
	havoc.init();
}