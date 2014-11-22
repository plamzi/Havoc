/* basic user instance methods merged into the s.user object, which is also made accessible under ch.user */

var u = require('util');

addStrings({
	eng: {
	}
});

module.exports = {
	
	init: function(re) {

		point(user.instanceMethods, this, null, ['init']); /* merge into instanceMethods, except for init method */
		
		if (re)
			user.updateUsers();

		/* support for user input via JSON, e. g. quick character creation, facebook silent auth */
		user.register('user.basic', 'json', function(s, d) {
			
			/* Create character support */
			if (d.create) {
			
				log('detected json char create attempt');
				
				if (!d.name || !user.validName(d.name, 'char')) {
					var msg = u.format(my().INVALID_CHARNAME, user.genCharname(d).color('&B'));
					s.Send( (my().CREATION_ERROR + '\r\n' + msg).mxpdest('Modal') );
				}
				
				s.create = [ d.name.cap(), d.cls.cap(), d.sex.toLowerCase(), d.bg.toLowerCase() ];
				user.emit('create.pc', s);
				
				return;
			}
			
			if (d.genCharname) {
				s.sendGMCP('create.suggest', user.genCharname(d));
				return;
			}
			
			/* Facebook authentication */
			if (d.fbid) {
			
				log('detected facebook auth attempt');
				
				s.username = d.fbid;
				s.password = d.fbid;
				s.email = d.email;
				s.fb = d;
				
				user.usercheck(s, function(r) {
					if (r)
						user.password(s, s.password);
					else
						user.createUser(s, s.password);
				});
				return;
			}
			
			/* Facebook user details */
			if (d.fb) {
				log('detected json facebook user details');
				!s.user || s.user.setAttr({ fb: d.fb });
				return;
			}
		});
	},
	
	immo: function() {
		return (this.attr.role.has('immo') || this.attr.role.has('imp'));	
	},
	
	imp: function() {
		return (this.attr.role.has('imp'));	
	},
	
	/* we will scan all known user info for something to show as a username */
	displayName: function() {
		
		if (!u.name.isnum())
			return u.name;
	
		if (u.email && u.email.has('@'))
			return u.email.split('@')[0];
	
		if (u.attr.fb && u.attr.fb.email && u.attr.fb.email.has('@'))
			return u.attr.fb.email.split('@')[0];
			
		return 'unknown';
	},
	
	/* begin basic getters and setters */
	setAttr: function(a, cb) {
		
		var attr = this.attr;
		extend(attr, a);

		this.updateAttributes({ attr: attr }, ['attr'])
		.success(function() {
			!cb || cb(this)
		});
		
		return this;
	},
	
	unsetAttr: function(a) {
	
		var attr = this.attr;
		delete attr[a];
		
		this.updateAttributes({ attr: attr }, ['attr']);
		return this;
	},
	
	setPoints: function(a) {
	
		var p = this.points;
		extend(p, a);

		this.updateAttributes({ points: p }, ['points']);
		return this;
	},
	
	unsetPoints: function(a) {

		var p = this.points;
		delete p[a];
		
		this.updateAttributes({ points: p }, ['points']);
		return this;
	},
	
	setPref: function(a) {
		
		var attr = this.attr;
		
		extend(attr.pref, a);
		
		this.updateAttributes({ attr: attr }, ['attr']);
		return this;
	},
	
	getPref: function(a) {
		return this.attr.pref?this.attr.pref[a]:null;
	},

	pref: function(a) {
		if (typeof a === "string" || a instanceof String)
			this.getPref(a);
		else
			this.setPref(a);
		return this;
	}
};