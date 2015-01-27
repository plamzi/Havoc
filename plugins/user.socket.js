/* basic char instance methods */
var u = require('util');

addStrings({
	eng: {

	}
});

module.exports = {
	
	init: function(re) {
	
		point(user.socketMethods, this, null, ['init']); /* merge into socketMethods, except for init method */
	},
	
	color: 1,
	
	buf: '',
	
	do: function(d) {
		
		var s = this, cmd;

		debug('got: |' + d + '|', s);
		
		if (d && d.length) /* normalize CR LF */
			d = d.replace(/(\r\n|\n\r)/gi, '\n').replace(/\n/gi, '\r\n');
		
		if (d && d != '\r\n') /* skip this for empty line feeds */
			if (!(d = this.oob(d))) /* first check for out-of-band input */
				return this;
		
		//log('user.do past oob check: ' + d);
		
		if (s.ch)  /* active char - forward to ch.do */ 
			return s.ch.do(d);

		/* handle multiline input here */
		cmd = d.split('\r\n')[0];
		//log('user.do fallback to user commands: ' + cmd);
		
		if (s.next)
			s.next(s, d.replace(/[\r\n]/g, ''));
		else
			error('user.socket do reached end with nothing to do next');
	},
	
	snd: function(msg, dest) {
		
		if (dest && this.portal)
			msg = msg.mxpdest(dest);
			
		try {
			this.write(ansi(msg, this.color));
		} 
		catch(ex) {
			error('unable to write to socket: ' + msg, s);
		}
		return this;
	},

	send: function(msg) { this.snd(msg + '\r\n'); return this; },
	
	Send: function(msg) { this.snd(msg + '\r\n\r\n'); return this; },
	
	sendGMCP: function(name, msg) {
		var m = my();
		this.snd(m.PROTOCOL.GMCP_START);
		this.write(name + ' ' + stringify(msg));
		this.snd(m.PROTOCOL.GMCP_STOP);
		return this;
	},

	receiveGMCP: function(s, d) {
		
		d = d.match(/(.+?) (.+)/);
		log('gmcp: ' + stringify(d), s);
		
		user.emit('gmcp', s, d);
	},
	
	sendJSON: function(msg) {
		this.snd(stringify(msg));
		return this;
	},
	
	receiveJSON: function(d) {

		try {
			d = eval('(' + d + ')');
		}
		catch(ex) {
			//warning('unable to parse: ' + d, s);
			return d;
		}
		
		if (!d)
			return '';

		user.emit('json', this, d);
		return 1;
	},
	
	oob: function(d) {

		d = this.buf + d;
		
		if (d.has('\xff\xfb\xc9')) { //IAC WILL GMCP
			d = d.replace('\xff\xfb\xc9', '');
			user.emit('will.gmcp', this);
		}
		
		if (d.has('\xff\xfd\xc9')) { //IAC DO GMCP
			d = d.replace('\xff\xfd\xc9', '');
			user.emit('do.gmcp', this);
		}

		if (d.has('\xff\xfd\x5b')) { //IAC DO MXP
			log('got IAC DO MXP');
			d = d.replace('\xff\xfd\x5b', '');
			user.emit('do.mxp', this);
		}
		
		if (d.has('\xff\xfc')) { //IAC WON'T *
			d = d.replace(/\xff\xfc./g, '');
		}
		
		if (d.has('\xff\xfa\xc9')) {

			if (!d.has('\xff\xf0')) {
				log('incomplete GMCP package', this);
				this.buf = d;
				return 0;
			}

			var j = d.match(/\xff\xfa\xc9([^]+?)\xff\xf0/gm);
			if (j && j.length) {
				for (var i = 0; i < j.length; i++) {
					log('GMCP: '+ j[i].slice(3, -2), this);
					user.emit('gmcp', this, j[i].slice(3, -2));
					d = d.replace(j[i], '');
				}
			}
			
			if (d.has('\xff\xfa\xc9')) {
				//log('remainder: '+d);
				this.buf = d;
				return 0;
			}
			else
				this.buf = '';
		}
		
		if ((d.has('{') || d.has('}'))) {
		
			var json;
			
			if ((json = d.match(/\{[\s\S]+\}/g))) {
				
				//log('possible json in user input');
				for (var i in json) {
					if (this.receiveJSON(json[i]));
						d = d.replace(json[i], '');
				}
			}
			
			if (d && d.length) { /* to do: put a limit on how long we wait for a complete json object, and process pending input another way */
				if ((d.has('{') || d.has('}'))) {
					this.buf = d;
					return 0;
				}
			}
		}
		
		if (d.has('��*')) { /* IAC WILL CHARSET */
			log('IAC WILL CHARSET - negotiating UTF8');
			d = d.replace('��*', '');
			//this.send(my().PROTOCOL.WILL_UTF8);
		}
		
		if (d.search(/[^\x00-\x7f]/) != -1) {
			
			log('unsupported char range: ' + d.split('').map(function(i) { 
				var n = i.charCodeAt(0); 
				return my().PROTOCOL[n] || i; 
			}).join(', '), this);
			
			d = d.replace(/\xff\xfa[^]+?\xff\xf0/gm, '');
			d = d.replace(/\xff../g, '');
			//d = d.replace(/[^\\x00-\\x7f]/g, '');
			//log('after protocol cleanup: '+d, this);
		}
		
		return d.trim().length ? d : 0;
	},
	
	immo: function() { return this.user && this.user.attr.role.has('immo'); },
	
	imp: function() { return this.user && this.user.attr.role.has('imp'); },
	
	builder: function() { return this.user && this.user.attr.role.has('builder'); },
};