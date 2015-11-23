/* Havoc (c) 2014 */

var events = require('events');
var u = require('util');

log = function(msg, s) {

	var t = (new Date()).toString();
	t = t.substr(0, 11) + t.substr(16, 8);

	if (msg.has('%'))
		msg = u.format.apply(this, arguments);
	
	if (s && s.remoteAddress) {
		
		console.log(
			t + ' '
			+ (s.user ? (s.ch ? (s.user.name + ' / ' + s.ch.name) : s.user.name) : s.remoteAddress) + ' ' 
			+ msg.colorize()
		);
	}
	else
		console.log(t + ' ' + msg.colorize());
};

info = function(msg, s) {
	//if (config && config.server.loglevel == 'high')
	return log('info: '.color('&L') + msg, s); 
};

debug = function(msg, s) {
	//if (config && ['medium', 'high'].has(config.server.loglevel))
	return log('debug: '.color('&g') + msg, s); 
};

error = function(msg, s) {
	return log('error: '.color('&R') + msg, s); 
};

warning = function(msg, s) {
	//if (config && config.server.loglevel == 'high')
	return log('warning: '.color('&y') + msg, s); 
};

/* this enables us to serve localized strings if it's run 
 * in the context of user or char with lang preferences */

my = function() {
	return this.lang ? global['strings.' + this.lang] : global['strings.'+config.server.language];
};

ansi = function(str, color) {

	if (/(&[a-zA-Z])/.test(str)) {
		
		for (var c in my().ANSI) {
			
			var re = new RegExp(c, 'g');
			str = color ? str.replace(re, my().ANSI[c]) : str.replace(re, '');
		}
	}
	
	if (/&([0-9]+)/.test(str))
		str = color ? str.replace(/&([0-9]+)/ig, '\033[38;5;$1m') : str.replace(re, '');
	
	return str;
};

after = function(t, f) { setTimeout(function() { f.call(); }, t * 1000); };

exists = function(A) { return (typeof (A) != 'undefined'); };

stringify = function(A) {
	
	var cache = [];
	
	var val = JSON.stringify(A, function(k, v) {
		
        if (typeof v === 'object' && v !== null) {

            if (cache.indexOf(v) !== -1)
                return;
            cache.push(v);
        }
        return v;
    });
	
    return val?val.replace(/,/g, ', '):'';
};

dump = function(o) {
	o = u.inspect(o, { showHidden: false, depth: 3 });
	log(o?o.replace(/,/g, ', '):o);
};

benchmark = function(A) {
    var start = new Date(), i = 1000;
    while (i--) A();
	log('benchmark: '+ (new Date() - start));
};

/* these methods will cast to positive integers */
MIN = function(A, B) { return [Math.abs(A), Math.abs(B)].min(); };
MAX = function(A, B) { return [Math.abs(A), Math.abs(B)].max(); };
NUM = function(A, B) { return [Math.abs(A), Math.abs(B)].between(); };

between = function(A, B) { return [A, B].between(); }

one_of = function() { return Array.prototype.slice.call(arguments).one(); }

merge = function(a, b) {
	for (var i in b)
		a[i] = b[i];
};

by_name = function(a, b) {     
	if (a.name < b.name) return -1;
	if (a.name > b.name) return 1;
	return 0; 
};

addStrings = function(o) {
	for (var lang in o) {
		if (global['strings.'+lang])
			point(global['strings.'+lang], o[lang]);
	}
};

clone = function(a) {
	return JSON.parse(stringify(a));
};

copy = function(a) {
	return JSON.parse(stringify(a));
};

extend = function() {
	var to = arguments[0];
	for (var i = 1; i < arguments.length; i++) {
		var from = arguments[i], 
		props = Object.getOwnPropertyNames(from);
		props.forEach(function(name) {
			var d = Object.getOwnPropertyDescriptor(from, name);
			Object.defineProperty(to, name, d);
		});
	}
	return this;
};

/* 	we use this utility function extensively to build and update our objects. it points rather than clones.
	it supports a whitelist and a blacklist of properties that should or shouldn't be included. */
point = function(to, from, allowed, forbidden) {
	
	var props = Object.getOwnPropertyNames(from);	
	props.forEach(function(name) {
		if (!allowed || allowed === true || allowed === 1 || allowed.has(name)) {
			if (!forbidden || !forbidden.has(name))
				to[name] = from[name];
		}
	});
	
	return to;
};

/*  this lets us define a prototype extension without 
	overwriting potentially existing ones, and allowing
	other modules to rewrite them if they have collisions */
	
var define = function(O, k, v) {
	if (!O.prototype[k])
		Object.defineProperty(O.prototype, k, {
			enumerable: false,
			writable: true,
			value: v	
		});
};

/* begin prototype extensions */

define(Object, 'clone', function(o) {
	return JSON.parse(stringify(this));
});

define(Array, 'has', function(o) {
	return (this.indexOf(o) != -1);
});

define(Array, "add", function(a) {
	if (!this.has(a))
		this.push(a);
	else 
		info('util.add detected and prevented duplicate add to array');
	return this;
});

define(Array, "remove", function() {
	var r, a;
	for (var i = 0; i < arguments.length; i++) {
		if ((r = this.indexOf(arguments[i])) != -1)
			this.splice(r, 1);
	}
	return this;
});

define(Array, 'max', function() {
	return Math.max.apply(null, this);
});

define(Array, 'min', function() {
	return Math.min.apply(null, this);
});

define(Array, 'one', function() {
	return this[[0, this.length-1].between()];
});

define(Array, 'between', function() {
	return Math.floor(Math.random()*(this[1]-this[0]+1)+this[0]);
});

define(Array, 'filenames', function() {
	return this
	.filter(function(i) { return i.toLowerCase().match(/\.js$/); })
	.map(function(i) { return i.replace(/\.[^/.]+$/, ""); });
});

define(Array, 'trim', function() { /* remove spaces before and after each item in an array of strings */
	return this.map(function(i) { return i.trim() });
});

define(Array, 'mxpsend', function(a) { /* turn each array member into an mxp send tag */
	if (a)
		return this.map(function(i) { return (a + i).mxpsend(i); });
	else
		return this.map(function(i) { return i.mxpsend(); });
});

/*  
	the following helper will let us register events by overwriting any
	existing event listener from the same source id. this will
	enable us to swap listeners on the fly w/o worrying about duplicating
	calls. you can set 'id' to any unique and descriptive id and then
	not have to keep track of the original listening function. in
	the examples, the id always carries the name of the listening object
*/

define(events.EventEmitter, 'register', function(id, event, callback) {
	
	if (!this._registered)
		this._registered = {};
	else
	if (this._registered[id + '.' + event]) {
		this.removeListener(event, this._registered[id + '.' + event]);
		//log('removed existing listener: ' + by + '.' + event);
	}

	this.on(event, callback);
	this._registered[id + '.' + event] = callback;
	
	return this;
});

define(events.EventEmitter, 'unregister', function(id, event, callback) {

	if (!this._registered)
		return this;
	
	if (this._registered[id + '.' + event])
		this.removeListener(event, this._registered[id + '.' + event]);

	return this;
});

String.prototype.pronoun = function(ch, vict) {
	var m = this;
		m = m.replace('$n', ch.name);
		m = m.replace('$s', ch.hisher());
		m = m.replace('$m', ch.himher());
	if (vict) {
		m = m.replace(/(\$N)(.+)(\$N)/, '$1$2'+vict.heshe().cap());
		m = m.replace('$N', vict.name);
		m = m.replace('$S', vict.hisher());
		m = m.replace('$M', vict.himher());
	}
	return m;
};

String.prototype.has = function(a) { return ( this.indexOf(a) != -1 ); };

String.prototype.start = function(a) { return ( this.indexOf(a) == 0 ); };

String.prototype.cap = function() {  return this.charAt(0).toUpperCase() + this.slice(1); };

String.prototype.isnum = function() {  return this.match(/^[0-9]+$/); };

String.prototype.vulgar = function() { for (var i = 0; i < my().XWORDS.length; i++) if (this.has(my().XWORDS[i])) return 1; return 0; };

String.prototype.clean = function() { 
	var m = this;
	for (var i = 0; i < my().XWORDS.length; i++) 
		if (m.has(my().XWORDS[i])) 
			m = m.replace(new RegExp(my().XWORDS[i], 'ig'), '*****'); 
	return m;
};

String.prototype.noarticles = function() { return this.replace(/^(a |an |the )/i,''); };

String.prototype.comma = function() { return Number(this).comma(); };

String.prototype.trim = function() { return this.replace(/^\s\s*/, '').replace(/\s\s*$/, ''); };

String.prototype.abbrev = function(a) { return (a.toLowerCase().indexOf(this.toLowerCase()) == 0); };

String.prototype.isAbbrev = function(a) { return (a.toLowerCase().indexOf(this.toLowerCase()) == 0); };

/* Here, we support shortcuts for both 16 and 256 colors that we will transform in the "ansi" function */
String.prototype.color = function(a) { return a + this + '&n'; };

/* Strip color shortcuts - &<number> */
String.prototype.nocolor = function(a) { return ansi(this.replace(/\&[0-9]+/, ''), false); };

/* Strip line feeds and replace with single space */
String.prototype.nolf = function(a) { return this.replace(/[\r\n]/g, ' '); };

String.prototype.colorize = function() { return ansi(this, true); };

String.prototype.ellipse = function(n) { return (this.length > n - 3) ? this.substr(0, n) + '...' : this; };

/* MXP begin */

String.prototype.mxp = function() { return '\x1b[1z' + this + '\x1b[7z'; };

String.prototype.font = function(a) { return ('<font '+a+'>').mxp() + this + '</font>'.mxp(); };

String.prototype.mxpsend = function(a, b) { return ('<send href="'+ ( exists(a) ? a : this ) + '"' + ( b ? ' hint="'+b+'"' : '') + '>').mxp() + this + '</send>'.mxp(); };

String.prototype.mxpselect = function(arr, b) {
	var hint = (b && b.pop) ? b.join('|') : b;
	return ('<send href="'+arr.join('|') + '"' + ( b ? ' hint="' + hint + '"':'') +'>').mxp() + this + '</send>'.mxp(); 
};

String.prototype.mxpdest = function(b) { var a = this; return ('<DEST '+b+'>').mxp() + a + '</DEST>'.mxp(); };

String.prototype.bold = function(b) { var a = this; return ('<B>').mxp() + a + '</B>'.mxp(); };

String.prototype.nomxp = function() { return this.replace(/\x1b\[1z.+?\x1b\[7z/ig, ''); };

String.prototype.style = function(a, b) {
	
	if (b)
		return this.font("size="+a).color(b);

	if (a == 'info') 
		return this.font("size=13").color("&I");

	if (a == 'move') 
		return this.font("size=13").color("&246");
	
	if (a == 'social') 
		return this.font("size=13").color("&37");
		
	if (a == 'syslog') 
		return this.font("size=12").color("&g");

	if (a == 'guild')
		return this.color(my().GUILD_COLOR);
	
	return this;
};

/* number extensions */

Number.prototype.comma = function() {
	var n = this + '', x = n.split('.'), x1 = x[0], x2 = x.length > 1 ? '.' + x[1] : '', rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1))
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	return x1 + x2;
};

/* time utilities */

now = function() {
	return parseInt(new Date().getTime() / 1000); /* current time in seconds since 1970 */
};

expires = function(a) { return sec2string(a - now()); };

sec2string = function(sec) {

	var days = Math.floor(sec / 86400);
	var hours = Math.floor((sec % 86400) / 3600);
	var minutes = Math.floor(((sec % 86400) % 3600) / 60);
	var seconds = ((sec % 86400) % 3600) % 60;

	var res = 
		(days?days + "d ":"")
		+ (hours?hours + "h ":"") 
		+ (minutes?minutes + "m ":"") 
		+ (seconds?seconds + "s ":"");
		
	return(res);
}

Number.prototype.years = function() { return (this * 365).days(); };

Number.prototype.weeks = function() { return (this * 7).days(); };

Number.prototype.days = function() { return (this * 24).hours(); };

Number.prototype.hours = function() { return this * 60 * 60; };

Number.prototype.minutes = function() { return this * 60; };

Number.prototype.min = function() { return this * 60; };