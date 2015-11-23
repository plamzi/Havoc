var u = require('util');
var Seq = require('sequelize');

addStrings({
	
	eng: {

		GUILD_COLOR:	"&80",
		
		GUILD_USAGE:	"Usage: "
						+ "guild create".mxpsend('guild create', 'Creates a new guild if you\'re guildless. Changes a guild\'s name or motto if you\'re a guild leader.') + "  "
						+ "guild join".mxpsend('guild join', 'See a list of open guilds as well as any guild invites you may have received.') + "  "
						+ "guild news".mxpsend('guild news', 'A log of recent inter-guild and intra-guild events.') + "  "
						+ "guild say".mxpsend('guild say', 'Share priceless thoughts and ideas with guildies on and offline.') + "  "
						+ "guild invite".mxpsend('guild invite', 'Invites a player to your guild. You can also use a character name to invite an online char.') + "  "
						+ "guild uninvite".mxpsend('guild uninvite', 'Higher-ranking guild members may revoke pending invitations.') + "  "
						+ "guild stat".mxpsend('guild stat', 'Displays detailed statistics about your guild.') + "  "
						+ "guild rank".mxpsend('guild rank', 'Compares the top-ranking guilds in the game vs. your own.') + "  "
						+ "guild members".mxpsend('guild members', 'List the active members of your guild, with options to communicate or manage them.') + "  "
						+ "guild dismiss".mxpsend('guild dismiss', 'Removes a member of the guild from the roster. Offline members can be removed.') + "  "
						+ "guild leave".mxpsend('guild leave', 'Removes you and all your characters from a guild. You must be guildless to start a guild or join an existing one.') + "  "
						+ "guild ranks".mxpsend('guild ranks', 'Sets the names of the 5 guild ranks (guild leader only).') + "  ",
		
		GUILD_CREATE_USAGE:			"Usage: guild create name, motto.\r\nA guild leader can use this command to rename the guild or change the motto.",
		
		GUILD_JOIN_USAGE:			"Usage: guild join guild_name",
		
		GUILD_LEAVE_USAGE:			"Usage: guild leave yesimsure",
		
		GUILD_INVITE_USAGE:			"Usage: guild invite (no argument) lists current invitees | guild invite target invites target to your guild.",
		
		GUILD_UNINVITE_USAGE:		"Usage: guild uninvite target",
		
		GUILD_NEWS_USAGE:			"Usage: guild news #(200 max)",
		
		GUILD_RANK_USAGE:			"Usage: guild rank [char_name | user_id] rank_name",
		
		GUILD_RANKS_USAGE:			"Usage: guild ranks (no argument) lists current guild ranks. | guild ranks rank1, rank2, ..., rank5 lets you define the rank names (must be 5).",

		GUILD_SAY_USAGE:			"Usage: guild say [immortal words to share with members on and offline]",
		
		X_CREATED_GUILD_Y_WITH_MOTTO_Z:			"%s created the guild '%s' under the motto '%s.'",
		
		GUILD_YOU_HAVE_JOINED_X_WITH_RANK_Y: 	"You have joined the guild '%s' with the rank of '%s'.",
		
		GUILD_X_JOINED_Y_WITH_RANK_Z:			"%s joined the guild with the rank of '%s'.",
		
		GUILD_NOT_IN_GUILD:			"You are not in any guild that you know of.",
		
		GUILD_YOU_LEFT_GUILD_X:		"You left the guild '%s'.",
		
		GUILD_X_Y_LEFT_THE_GUILD:	"%s (%s) left the guild.",
		
		GUILD_X_WAS_DISMISSED_BY_Y:	"%s was dismissed from the guild by %s.",
		
		GUILD_YOU_UNINVITED_X:		"You uninvited %s.",
		
		GUILD_RANKS_UPDATED_BY_X: 	"The guild ranks have been updated by %s.",
		
		GUILD_INVALID_NAME:			"Invalid name or motto (profanity check failed!). Rephrase please.",
		
		GUILD_NOT_ENOUGH_POWERS:	"Your rank is not high enough for this.",
		
		GUILD_MEMBERS:				"Guild Members:",
		
		GUILD_MEMBER_NOT_FOUND:		"There is no guild character by this name online.",
		
		GUILD_X_IS_NOT_A_MEMBER:	"%s is not a member of your guild.",
		
		GUILD_INVITATIONS:			"Guild Invitations:".color('&c'),
		
		GUILD_X_NOT_FOUND:			"There is no guild named '%s'. Use " + "guild create".mxpsend('guild create') + " if you wish to create it.",
		
		GUILD_YOU_DECLINED_AN_INVITATION_FROM_X:	"You declined an invitation to join '%s'.",
		
		GUILD_OPENINGS:				"Open Guilds:".color('&c'),
		
		GUILD_X_RANK_IS_Y:			"%s's current guild rank is '%s'.",
		
		GUILD_VALID_RANKS_ARE_X:	"The rank has to be one of: ",
		
		GUILD_X_NEW_RANK_IS_Y:		"%s's new guild rank is '%s'.",
		
		GUILD_NAMED_X_EXISTS:		"A guild with the name '%s' already exists. Try a different name",

		X_IS_NOT_IN_A_GUILD:		"%s is not a member of any guild.",
		
		GUILD_YOU_CREATED_X: 		"Congratulations! You have founded '%s'.",
		
		GUILD_IS_X:					"This guild is currently %s.",
		
		GUILD_INFO:					"Guild Info:",
		
		GUILD_YOU_ARE_NOT_IN_ONE:	"You are not a member of any guild.\r\n" + "join a guild".mxpsend('guild join') + '  ' + "create a guild".mxpsend('guild create')
	}
 
});

function guildOp(ch, guild, msg) { /* guild operations message - join, leave, invite, dismiss, etc. */
	
	Message.create({
		type: 		'guild.op',
		from: 		ch.name,
		from_id: 	ch.id,
		to:			guild.name,
		to_id:		guild.id,
		text: 		msg,
		attr: 		{ pc: ch.pc() }
	});	
};

function guildInvite(ch, vict, msg) { /* if all chars have same guild, vict would be the user */
	
	Message.create({
		type: 		'guild.invite',
		from: 		ch.name,
		from_id: 	ch.id,
		to:			vict.displayName ? vict.displayName() : vict.name,
		to_id:		vict.id,
		text: 		msg,
		attr:		{ guild: { id: ch.guild.id, name: ch.guild.name } }
	});	
};

module.exports = {

	init: function(re) {
		
	},
	
	requires: function(ch) {
		
		/* example of using "allowed" and updating char commands if guild status changes (using act.initChar) */
		var allowed = Object.keys(this);
		
		if (!ch.guild) {
			allowed.remove('guild leave');
			allowed.remove('guild say');
			allowed.remove('guild members');
		}
		
		if (!ch.canGuildInvite())
			allowed.remove('guild invite');
		
		if (!ch.isGuildMaster()) {
			allowed.remove('guild uninvite');
			allowed.remove('guild dismiss');
			allowed.remove('guild rank');
		}
		
		if (ch.guild && !ch.isGuildLeader()) {
			allowed.remove('guild create');
		}
		
		if (!ch.isGuildLeader())
			allowed.remove('guild ranks');
		
		return allowed;
	},
	
	guild: function() {
		
		if (this.guild)
			return this.do('guild stat');

		this.send(my().GUILD_INFO + '\r\n\r\n' + my().GUILD_YOU_ARE_NOT_IN_ONE, 'Modal');
		//this.do('help guild');
	},
	
	'guild create': function(arg) {
		
		var ch = this;

		if (!arg)
			return ch.send(my().GUILD_CREATE_USAGE);
		
		arg = arg.join(' ');
		
		if (!arg.has(', '))
			return ch.send(my().GUILD_CREATE_USAGE);
		
		arg = arg.split(', ');
		
		if (arg.length != 2) {
			dump(arg);
			return ch.send(my().GUILD_CREATE_USAGE);
		}
		
		if (arg[0].vulgar() || arg[1].vulgar())
			return ch.send(my().GUILD_INVALID_NAME);
		
		if (ch.guild) {
			if (ch.isGuildLeader())
				return ch.renameGuild(arg[0], arg[1]);
			else
				return ch.send(my().GUILD_NOT_ENOUGH_POWERS);
		}
		else
		ch.createGuild(arg[0], arg[1], function(guild) {
			
			var msg = u.format(my().X_CREATED_GUILD_Y_WITH_MOTTO_Z, ch.name, guild.name, guild.motto);
			
			ch.send(msg);
			
			Message.create({
				type: 		'guild.news',
				from: 		ch.name,
				from_id: 	ch.id,
				text: 		msg,
				attr: 		{ pc: ch.pc() }
			});
			
			ch.joinGuild(guild);
		});
	},
	
	'guild leave': function(arg) {
		
		var ch = this;

		if (!arg || arg[0] != 'yesimsure')
			return ch.send(my().GUILD_LEAVE_USAGE);
		
		if (!ch.guild)
			return ch.send(my().GUILD_NOT_IN_GUILD);
		
		var guild = ch.guild;
		
		ch.leaveGuild(function() {
			
			ch.send(u.format(my().GUILD_YOU_LEFT_GUILD_X, guild.name));
			
			var msg = u.format(my().GUILD_X_Y_LEFT_THE_GUILD, ch.name, ch.pc() ? user.displayName(ch.s.user) : 'NPC');
			
			guildOp(ch, guild, msg);
		});
	},
	
	'guild join': function(arg) {
		
		var ch = this;
		
		if (!arg) {
			
			Message.findAll({
				where: { 
					to_id: ch.UserId, 
					type: "guild.invite" 
				}
			})
			.then(function(r) {
				
				if (r.length)
					ch.send(my().GUILD_INVITATIONS);
					
				for (var i in r) {
					
					var name = r[i].attr.guild.name;
					ch.send(name.mxpselect([ 'guild decline ' + name, 'guild join ' + name]) + '  ' + ('invited by ' + r[i].from + ' at ' + r[i].createdAt).style('info'));
					
					if (!ch.canJoinGuild(r[i]), my().VERBOSE)
						continue;
				}
			});
			
			
			Guild.findAll({
				where: { status: 'open' },
				order: 'members DESC',
				limit: 10
			})
			.then(function(r) {
				
				if (r.length)
					ch.send(my().GUILD_OPENINGS);
					
				for (var i in r) {
					ch.send(r[i].name.mxpsend(['guild join ' + r[i].name], 'join ' + r[i].name) + '  ' + ('members: ' + r[i].members).style('info'));
				}
			});			
			
			return;
			//return ch.send(my().GIULD_JOIN_USAGE);
		}
		
		var name = arg.join(' ');
		
		Guild.find({
			where: { name: name }
		})
		.then(function(r) {
			
			if (!r)
				return ch.send(u.format(my().GUILD_X_NOT_FOUND, name));
			
			if (ch.canJoinGuild(r, my().VERBOSE)) {
				
				ch.joinGuild(r, function(guild) {
				
					Message.findAll({
						where: { 
							to_id: ch.UserId, 
							type: "guild.invite" 
						}
					})
					.then(function(r) {
						for (var i in r)
							r[i].destroy();
					});
					
					ch.send(u.format(my().GUILD_YOU_HAVE_JOINED_X_WITH_RANK_Y, guild.name, ch.getGuildRank()));
					var msg = u.format(my().GUILD_X_JOINED_Y_WITH_RANK_Z, ch.name, guild.name, ch.getGuildRank());
					guildOp(ch, guild, msg);
				});
			}
		});
	},
	
	'guild invite': function(arg) {
		
		var ch = this;

		if (!arg)
			return ch.send(my().GUILD_INVITE_USAGE);
		
		var vict = ch.findActor(arg[0], 'world');
		
		if (!vict)
			return ch.send(my().NOONE_BY_THAT_NAME);
		
		if (vict.npc())
			return ch.send(my().YOU_CANNOT_DO_THIS_YET);
		
		var msg = u.format(my().X_INVITED_Y_TO_JOIN_THE_GUILD, ch.name, vict.name);
		
		guildInvite(ch, my().userindex[ch.UserId], msg); /* we use userindex so we can invite via linkless chars */
		guildOp(ch, ch.guild, msg);
	},

	'guild uninvite': function(arg) {
		
		var ch = this;

		if (!arg) {
			return Message.findAll({
				where: { type: "guild.invite" }
			})
			.then(function(r) {
				
				for (var i in r)
					if (r[i].attr.guild.id == ch.guild.id)
						ch.send(r[i].to.mxpselect([ 'guild uninvite ' + r[i].to ]) + ' ' + ('invited by ' + r[i].from + ' at ' + r[i].createdAt).style('info'));
			});
		}
		
		Message.findAll({
			where: { to: arg[0], type: "guild.invite" }
		})
		.then(function(r) {
			
			for (var i in r) {
				if (r[i].attr.guild.id == ch.guild.id) {
					u.format(my().GUILD_YOU_UNINVITED_X, r[i].to);
					r[i].destroy();
				}
			}
		});
	},
	
	'guild decline': function(arg) {
		
		if (!arg)
			return this.do('guild join');
			
		var name = arg.join(' ');
		
		Guild.find({
			where: { name: name }
		})
		.then(function(r) {
			
			if (!r)
				return ch.send(u.format(my().GUILD_X_NOT_FOUND, name));
			
			Message.findAll({
				where: { 
					to_id: ch.UserId, 
					type: "guild.invite" 
				}
			})
			.then(function(r) {
				
				for (var i in r) {
					if (name == r[i].attr.guild.name)
						r[i].destroy().then(function() {
							ch.send(u.format(my().GUILD_YOU_DECLINED_AN_INVITATION_FROM_X, name));
						});	
				}
			});
		});
	},
	
	'guild members': function() {
		
		var ch = this, m = my(), members = '';
		
		Char.findAll({
			where: { GuildId: ch.guild.id },
			group: ['UserId']
		})
		.then(function(r) {
			
			for (var i in r) {
				
				var user = m.userindex[r[i].UserId]; /* the user index already sets the user display name */
				var o = [ 'pm ' + user.id, 'whois ' + user.id ];
				var hint = [ 'pm ' + user.name, 'whois ' + user.name ];
				
				if (ch.isGuildLeader() && user.id != ch.user.id) {
					o.push('guild dismiss ' + user.id);
					hint.push('guild dismiss ' + user.name);
				}
				
				members +=
				  m.U_HUMAN.style(16, '&178') + ' ' + user.name.mxpselect(o, hint) + ' '
				+ m.U_GROUP.style(16, '&B') + ' ' + r[i].name.mxpsend('pm ' + user.id, 'pm ' + r[i].name) + ' '
				+ m.U_STAR.style('guild') + ' ' + ch.getGuildRank(user) + ' '
				+ r[i].updatedAt.toUTCString().substring(0, 11).replace(',','').style(11, '&I') + ' '
				+ '\r\n';
			}
			
			ch.send(my().GUILD_MEMBERS + '\r\n\r\n' + members, 'Modal');
		});
	},

	'guild dismiss': function(arg) {
		
		var ch = this, vict;

		if (!arg)
			return ch.do('guild members');
		
		if (arg[0].isnum()) {
			
			var usr = my().userindex[arg[0]];
			
			if (!usr)
				return ch.send(my().GUILD_MEMBER_NOT_FOUND);
			
			if (ch.guild.id != usr.attr.guild.id)
				return ch.send(u.format(my().GUILD_X_IS_NOT_A_MEMBER, usr.name));
			
			vict = ch.getOnlineChar(usr.id);
			
			if (!vict) { /* user has no char online (but may be in lobby) */
				
				usr.unsetAttr('guild');
				
				Char
				.find({ where: { UserId: usr.id } })
				.then(function(r) {
					r.forEach(function(ch) {
						ch.setGuild(null);
					});
				});
				
				var msg = u.format(my().GUILD_X_WAS_DISMISSED_BY_Y, usr.name, ch.name);
				return guildOp(ch, ch.guild, msg);
			}
		}
		
		/* target can be an online character */
		
		if (!vict)
			vict = ch.findActor(arg[0], 'world');
		
		if (!vict)
			return ch.send(my().GUILD_MEMBER_NOT_FOUND);
		
		if (!ch.isGuildiesWith(vict))
			return ch.send(u.format(my().GUILD_X_IS_NOT_A_MEMBER, vict.name));
		
		vict.leaveGuild(function() {
			var msg = u.format(my().GUILD_X_WAS_DISMISSED_BY_Y, vict.name, ch.name);
			vict.send(msg);
			guildOp(ch, ch.guild, msg);
		});
	},
	
	'guild rank': function(arg) {
		
		var ch = this, usr, vict, isnum;

		if (!arg)
			return ch.send(my().GUILD_RANK_USAGE);

		if (arg[0].isnum()) {
			usr = my().userindex[arg[0]];
			isnum = 1;
		}
		
		vict = usr ? ch.getOnlineChar(usr.id) : ch.findActor(arg[0], 'world');
		
		if (!arg[1]) {
			
			if (usr)
				return ch.send(u.format(my().GUILD_X_RANK_IS_Y, usr.name, ch.getGuildRank(usr)))
			
			if (vict)
				return ch.send(u.format(my().GUILD_X_RANK_IS_Y, vict.name, ch.getGuildRank(vict)))
				
			return ch.send(my().GUILD_MEMBER_NOT_FOUND);
		}
		
		var rank = ch.guild.attr.ranks.indexOf(arg[1]);
		
		if (rank == -1)
			return ch.send(u.format(my().GUILD_VALID_RANKS_ARE_X, ch.guild.attr.ranks.reverse().join(', ')));
		
		usr = vict ? vict.user : usr;

		if (!usr)
			return ch.send(my().GUILD_MEMBER_NOT_FOUND);
			
		usr.setAttr({
			guild:{
				id: ch.guild.id,
				rank: rank
			}
		}, function() {
			
			if (usr)
				return ch.send(u.format(my().GUILD_X_NEW_RANK_IS_Y, usr.name, ch.getGuildRank(usr)))
			
			if (vict)
				return ch.send(u.format(my().GUILD_X_NEW_RANK_IS_Y, vict.name, ch.getGuildRank(vict)))
		});
	},
	
	'guild stat': function(arg) {
		
		var ch = this, vict = ch;
		
		if (arg)
			vict = ch.findActor(arg[0], 'at-vis');
			
		ch.statGuild(vict);
	},

	/* leader only */
	
	'guild ranks': function(arg) {
		
		if (!arg)
			return ch.send(my().GUILD_RANKS_USAGE);
		
		arg = arg.join(' ').split(', ');
		
		if (arg.length != 5)
			return ch.send(my().GUILD_RANKS_USAGE);
		
		var attr = copy(ch.guild.attr);
		attr.ranks = arg;
		
		ch.guild.updateAttributes({
			attr: attr
		}, ['attr'])
		.then(function() {
			var ss = my().sockets;
			for (var i in ss)
				if (ss[i].ch && ch.isGuildiesWith(ss[i].ch))
					ss[i].ch.getGuild().then(function(r) {
						ss[i].ch.guild = r;
						act.initChar(ss[i].ch);
					});
			var msg = u.format(my().GUILD_RANKS_UPDATED_BY_X, ch.name);
			ch.send(msg);
			guildOp(ch, ch.guild, msg);
		});
	},
	
	/* communication */
	
	'guild say': function(arg) {
		
		var ch = this, ss = my().sockets;
		
		if (!arg)
			return ch.send(my().GUILD_SAY_USAGE);
		
		if (arg[0].isnum()) {
			
			var n = MIN(100, parseInt(arg[0]));
			
			Message.findAll({ 
				where: { type: 'guild.say', to_id: ch.guild.id }, 
				order: 'createdAt DESC', 
				limit: n 
			})
			.then(function(r) {
			
				if (!r)
					return ch.send(u.format(my().NO_RECENT_X_TO_SHOW, 'guild chatter'));
				
				r.reverse();
				var chat = '';
				
				for (var i in r) {
					var t = r[i].createdAt.toUTCString().substring(0, 22).replace(',','').split(' ');
					chat += (t[0] + ' ' + t[4]).style(11, '&K') + '  ' + r[i].from.color(my().GUILD_COLOR) + ': ' + r[i].text + '\r\n';
				}
				
				ch.snd(chat.mxpdest('chat'));
			});
			
			return;
		}
		
		var msg = arg.join(' ');
		
		var format = function(from, to, msg) {
			if (from == to)
				return u.format(my().CHAT_SELF.style('guild'), msg);
			else
				return u.format("%s: &n%s".style('guild'), from.name, msg);
		};
		
		for (var i = 0; i < ss.length; i++)
			if (ss[i].ch && ss[i].ch.isGuildiesWith(ch))
				ss[i].ch.send(format(ch, ss[i].ch, msg), 'chat');
		
		Message.create({
			type: 		'guild.say',
			from: 		ch.name,
			from_id: 	ch.id,
			to:			ch.guild.name,
			to_id:		ch.guild.id,
			text: 		msg,
			attr: 		{ pc: ch.pc() }
		});
	},
	
	'guild news': function(arg) {
		
		var ch = this, n = arg && arg[0] && arg[0].isnum() ? arg[0] : 20;
		n = MIN(50, n);
		
		Message.findAll({ 
			where: Seq.or({ type: 'guild.news' }, { type: 'guild.op' }), 
			order: 'createdAt DESC', 
			limit: n 
		})
		.then(function(r) {
		
			if (!r)
				return ch.send(u.format(my().NO_RECENT_X_TO_SHOW, 'guild news'));
			
			r.reverse();
			var chat = '';
			
			for (var i in r) {
				var t = r[i].createdAt.toUTCString().substring(0, 22).replace(',','').split(' ');
				chat += (t[0] + ' ' + t[4]).style(11, '&K') + '  ' + r[i].text.style('guild') + '\r\n';
			}
		});
	}
};