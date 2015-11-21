/* built-in player guilds implementation is makes all characters belonging to a user members of the same guild */

var u = require('util');
var Seq = require('sequelize');

addStrings({
	eng: {

	}
});

var guild_struct = {
		
	name: 	Seq.STRING,
	
	motto: 	Seq.STRING,
	
	status: { /* open, invite-only, closed, full, or anything else you may want */
		type: Seq.STRING,
		allowNull: false,
		defaultValue: 'open'
	},
	
	level:	{
		type: Seq.INTEGER,
		allowNull: false,
		defaultValue: 1
	},
	
	members: { /* number of unique members */
		type: Seq.INTEGER,
		allowNull: false,
		defaultValue: 0
	}, 
	
	attr: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('attr')+')');
		},
		set: function(v) {
			this.setDataValue('attr', stringify(v));
		},
		allowNull: false
	},
	
	points: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('points')+')');
		},
		set: function(v) {
			this.setDataValue('points', stringify(v));
		},
		allowNull: false
	}
};

var guild_attr_default = { /* we set defaults manually because Seq.TEXT doesn't support default values */
	ranks: ["Leader", "Master", "Lieutenant", "Member", "Initiate"]
};

var guild_points_default = { /* we can use this to store lifetime guild stats (e. g. frags members scored while in this guild) as well as shared changing points like guild gold */
	exp: 0,
	gold: 0,
	frags: 0,
	qp: 0,
	karma: 0
};


/* private method taking care of persistence stuff */

var initDB = function() {
	
	db.debug(0);
	
	Guild = db.define('Guilds', guild_struct);
	Char.belongsTo(Guild, { as: 'guild' });
	Mob.belongsTo(Guild, { as: 'guild' });
	
	//Guild.sync();
	//Char.sync();
	//Mob.sync();
};

/* private method loading guild info on char entry */

var initGuildChar = function(ch) {
	
	/* load a character's guild info */
	if (ch.getGuild) {

		ch.getGuild().then(function(r) {
			ch.guild = r;
			act.initChar(ch);
		});
	}
	
	ch.register('char.guild', 'post.stat', function(vict) {
		ch.send('').statGuild(vict);
	});
};

module.exports = {
	
	init: function(re) {
		
		if (re)
			initDB();
		
		char.register('char.guild', 'init', initDB);
		
		char.register('char.guild', 'enter', initGuildChar);
	},
	
	createGuild: function(name, motto, cb) {
		
		var ch = this, user = ch.pc() ? ch.user : ch;
		
		Guild.find({
			name: name
		})
		.then(function(r) {
			
			if (!r)
				Guild.create({
					name: name,
					motto: motto,
					attr: guild_attr_default,
					points: guild_points_default
				})
				.then(function(guild) {
					
					ch.send(u.format(my().GUILD_YOU_CREATED_X, guild.name));
					act.initChar(ch); /* update available commands */
					!cb || cb(guild);
				});
			
			if (r)
				ch.send(u.format(my().GUILD_NAMED_X_EXISTS, r.name));
		});	
	},
	
	joinGuild: function(guild, cb) {
		
		var ch = this, u = ch.pc() ? ch.user : ch;
		
		if (ch.guild) {
			if (ch.guild.id == id)
				return true;
			else
				return false; /* have to leave your existing guild first */
		}
		
		guild.increment({
			members: 1
		})
		.then(function() {
			
			/* first member becomes leader, else set to last rank in the chain */
			var rank = guild.members > 1 ? guild.attr.ranks.length - 1 : 0;

			u.setAttr({
				guild: {
					id: guild.id,
					rank: rank
				}
			});
			
			ch.setGuild(guild)
			.then(function() {
				
				if (u.chars)
					u.chars.forEach(function(ch) {
						ch.setGuild(guild);
					});
				
				act.initChar(ch); /* update available commands */
				!cb || cb(guild);
			});
		});
		
		return ch;
	},
	
	leaveGuild: function(cb) {
		
		var ch = this, u = ch.pc() ? ch.user : ch;
		
		if (!ch.guild)
			return true;
		
		ch.guild.decrement({
			members: 1
		})
		.then(function() {
			
			u.unsetAttr('guild');
			
			ch.setGuild(null).then(function() {
				
				if (u.chars)
					u.chars.forEach(function(ch) {
						ch.setGuild(null);
					});
				
				act.initChar(ch); /* update available commands */
				!cb || cb(ch, guild);
			});
		});

		return ch;
	},
	
	renameGuild: function(name, motto) {
		
		var ch = this, user = ch.pc() ? ch.user : ch;
		
		if (!ch.guild || !ch.isGuildLeader())
			return false;
		
		ch.guild.updateAttributes({
			name: name,
			motto: motto
		}, ['name', 'motto'])
		.then(function(r) {
			
			ch.send(u.format(my().GUILD_NAME_X_GUILD_MOTTO_Y, ch.guild.name, ch.guild.motto));
			
			var ss = my().sockets;
			for (var i in ss)
				if (ss[i].ch && ss[i].ch.guild.id == ch.guild.id)
					initGuildChar(ss[i].ch);
		});	
	},
	
	statGuild: function(vict) {
		
		var ch = this, m = my();
		
		if (!vict)
			vict = ch;
		
		if (!vict.guild) {
			if (vict == ch)
				ch.snd(m.GUILD_YOU_ARE_NOT_IN_ONE);
			else
				ch.snd(u.format(m.X_IS_NOT_IN_A_GUILD, vict.name));
			return;
		
		}
		
		ch.send(vict.guild.name.style('guild'));
		ch.send(vict.guild.motto.style('info'));
		ch.send(('Members: ' + ch.guild.members).mxpsend('guild members'));

		ch.snd(m.U_STAR.style(15, '&208') + ' ' + vict.guild.level + ' ');
		ch.snd(m.U_SWORDS.style(15, '&R') + ' ' + vict.guild.points.frags + ' ');
		ch.snd(m.U_KARMA.style(15, '&M') + ' ' + vict.guild.points.karma + ' ');	
	},
	
	/* check if user has the top guild rank, whatever it is called */
	isGuildLeader: function() {
		
		var ch = this, user = ch.pc() ? ch.user : ch;
		
		if (!ch.guild)
			return false;
		
		if (!exists(user.attr.guild) || user.attr.guild.rank != 0)
			return false;
		
		return true;
	},
	
	/* default master check is user has to be among the top 2 guild ranks */
	isGuildMaster: function() {
		
		var ch = this, user = ch.pc() ? ch.user : ch;
		
		if (!ch.guild)
			return false;
		
		if (![0, 1].has(user.attr.guild.rank))
			return false;

		return true;
	},
	
	isGuildiesWith: function(vict) {
		
		return (this.guild && vict.guild && this.guild.id == vict.guild.id)
	},
	
	/* default can guild invite check is user has to be above the bottom 2 guild ranks */
	canGuildInvite: function() {
		
		var ch = this, user = ch.pc() ? ch.s.user : ch;
		
		if (!ch.guild)
			return false;
		
		var rank = ch.guild.attr.ranks;
		
		if ([rank.length-1, rank.length-2].has(user.attr.guild.rank))
			return false;
		
		return true;
	},
	
	canJoinGuild: function(guild, mode) {
		
		var ch = this;
		
		if (!guild.members)
			return true;
		
		if (guild.status == 'closed' || guild.status == 'full') {
			
			if (mode == my().VERBOSE)
				ch.send(u.format(my().GUILD_IS_X, guild.status));
			
			return false;
		}
	},
	
	getGuildRank: function(vict) {
		
		var ch = this;
		
		if (!vict && !ch.guild)
			return 'Unguilded';
		
		if (vict) 
			return ch.guild.attr.ranks[vict.attr.guild.rank];
		
		return ch.guild.attr.ranks[ch.user.attr.guild.rank];
	}
};