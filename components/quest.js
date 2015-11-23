/* AARALON (c) 2013-2014 */

var fs = require('fs');
var u = require('util');
var path = require('path');
var events = require('events');
var Seq = require('sequelize');

addStrings({
	
	eng: {
		X_HAS_NOTHING_TO_TALK_TO_YOU_ABOUT:		"%s has nothing to talk to you about.",
		X_HAS_NOTHING_TO_SAY_ABOUT_THIS:		"%s has nothing to say about this.",
		X_SAYS_NOTHING_ABOUT_THIS:				"%s says nothing about this.",
		X_CANT_HELP_WITH_THIS_RIGHT_NOW:		"%s can't help with this right now.",
		X_CANT_DISCUSS_THIS_RIGHT_NOW:			"%s can't discuss this subject right now.",
		YOU_STRIKE_UP_A_CONVERSATION_WITH_X:	"You strike up a conversation with %s.",
		YOUR_CONVERSATION_WITH_X_HAS_ENDED:		"Your conversation with %s has ended.",
		YOU_START_READING_X:					"You start reading %s.",
		YOU_STOP_READING_X:						"You stop reading %s.",
		YOU_HAVE_GAINED_A_NEW_QUEST:			"You have gained a new quest.",
		YOU_ALREADY_HAVE_X:						"You already have %s",
		QUEST_LOG_UPDATED:						"Your " + "quest log".mxpsend() + " was updated.",
		SEE_QUEST_LOG:							"See " + "quest log".mxpsend(),
		NO_ACTIVE_QUESTS:						"No active quests to display. Try " + "quest list".mxpsend('quest list', 'Lists all currently available quests.') + " and go get some!",
		YOU_HAVE_JUST_EMBARKED:					"You have just embarked on this quest.", /* a generic status description */
		QUEST_ONCE_PER_USER: 					"You can only complete this quest on one of your characters.",
		QUEST_ONCE_PER_CHAR: 					"You can only complete this quest once per character.",
		QUEST_QUIZ_START:						"You have started taking a quiz.",
		QUEST_QUIZ_STOP:						"You have stopped taking the quiz.",
		QUEST_QUIZ_WRONG_ANSWER:				["Alas, you cannot be more wrong.", "Not exactly right.", "You can do better than that.", "Sorry, but you're incorrect."].one().color('&124'),
		QUEST_QUIZ_RIGHT_ANSWER:				"You have answered correctly!".color('&118'),
		QUEST_QUIZ_COMPLETED:					"You have completed the quiz.".color('&118'),
	}
});

var quest_struct = {

	name: Seq.STRING,

	type: Seq.STRING,

	status: Seq.STRING, /* e. g. enabled, disabled */
	
	desc: Seq.TEXT,
	
	at: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('at')+')');
		},
		set: function(v) {
			this.setDataValue('at', stringify(v));
		}
	},

	attr: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('attr')+')');
		},
		set: function(v) {
			this.setDataValue('attr', stringify(v));
		}
	},
	
	MobProtoId: Seq.INTEGER,
	
	ItemProtoId: Seq.INTEGER
	
};

var char_quest_struct = {

	CharId: Seq.INTEGER,
	
	QuestId: Seq.INTEGER,

	status: Seq.STRING, /* can be active, inactive, completed, etc. */
	
	desc: Seq.TEXT, /* this is what we'll show in the quest log. would normally be the last communication describing the next step */
	
	expires: {
		type: Seq.INTEGER, /* expire an adventure due to inactivity so user can restart it, expire quest races and events when they're over, etc */
	
		defaultValue: now() + (7).days() /* 7 days */
	},
	
	attr: {
		type: Seq.TEXT,
		get: function() {
			return eval('('+this.getDataValue('attr')+')');
		},
		set: function(v) {
			this.setDataValue('attr', stringify(v));
		}
	}
};

module.exports = {
	
	init: function(re) {

		debug('quest init');

		havoc.register('quest', 'plugin.change', quest.reloadPlugin);
		
		char.register('quest', 'enter', quest.initQuestChar);
		
		item.register('quest', 'init', function() {
			quest.initDB(); /* we need both chars and items to be loaded, so we wait for items because items are waiting for char */
			item.register('quest', 'enter', quest.initQuestItem);
		});
		
		if (re)
			this.initDB(re);
	},

	initDB: function() {

		Quest = db.define('Quests', quest_struct);
		CharQuest = db.define('CharQuests', char_quest_struct);
		
		Char.hasMany(Quest, { through: CharQuest });
		Quest.hasMany(Char, { through: CharQuest });
		//MobProto.hasMany(Quest, { through: 'MobQuests' });
		//ItemProto.hasMany(Quest, { through: 'ItemQuests' });
		
		//Quest.sync();
		//Char.sync();
		//CharQuest.sync();
		
		Quest.findAll()
		.then(function(r) {
			
			my().quests = {};

			for (var i in r)
				my().quests[r[i].id] = r[i];
			
			info('quest.init: finished loading quest summaries: ' + Object.keys(my().quests).length);
			quest.initPlugins();
		});

		return this;
	},

	/*  The plugins of the quest component are individual quests of various types: story lines, timed auto-quests and events, races, etc. 
		Any mob or item proc that involves a sequence of actions or needs persistence is a good candidate for turning into a quest.
	*/
	
	initPlugins: function() { 

		var plugins = fs.readdirSync('./quests').filter(function(i) { return i.match(/^quest\..+\.js/i); });
		log('quest.initPlugins detected: ' + plugins.join(', '));
		
		my().questmobs = [], my().questitems = [];
		
		for (var i in plugins) {

			//log('loading quest plugin: '+plugins[i]); 
			var pg = plugins[i].split('.')[1];
			var f = './quests/'+plugins[i];

			delete require.cache[require.resolve('../'+f)];
			var q = require('../'+f);

			quest[q.id] = q, q.init();

			log('loaded: '+f.color('&155') + ' '+ Object.keys(q).join(', '));
			
			if (q.at.mob) {
				q.MobProtoId = char.protoIdByName(q.at.mob);
				my().questmobs.add(q.MobProtoId);
			}
			else
			if (q.at.item) {
				q.ItemProtoId = item.protoIdByName(q.at.item);
				my().questitems.add(q.ItemProtoId);
			}
			//db.debug(1);
			//dump(q);
			var cb = function(q) {
				return function(Q) {
					if (Q && Q.save)
						Q.updateAttributes(q).then(function() { 
							info('updated existing quest summary: ' + q.name);
						}); 
					else
						quest.create(q, function() {
							info('created new quest summary: ' + q.name);
						});
				};
			}(q);
			
			Quest.find(q.id).then(cb);
		}
		
		info('quest component: loaded mobs w/ active quests: ' + my().questmobs.length + ' items w/ active quests: ' + my().questitems.length);
		
		quest.updateActors();
		quest.updateItems();
		
		return this;
	},

	reloadPlugin: function(comp, f) {

		if (comp != quest) 
			return;
		
		log('quest.reloadPlugin');
		quest.initPlugins(1);
		
		return this;
	},
	
	/* this is what we attach to the char enters game event */
	initQuestChar: function(ch) {

		if (!my().questmobs) /* at boot, wait until after we've indexed the active quest mobs */
			return;
		
		if (ch.npc())
			quest.initQuestNPC(ch);

		if (ch.pc())
			quest.initQuestPC(ch);
		
		return this;
	},

	initQuestNPC: function(ch) {
	
		if (my().questmobs.has(ch.MobProtoId)) {

			debug('quest.initQuestChar: ' + ch.name);
			
			/* we enable talking to NPCs with active quests */
			ch.register('quest', 'proc.talk', function(vict, arg) {
				quest.talk(this, vict, arg);
			});
			
			ch.setAttr({ talk: 1 }); /* we set a flag so we can quickly add a talk interaction to quest mobs */
		}
		else {
			ch.unregister('quest', 'proc.talk');
			ch.unsetAttr('talk');
		}
		
		if (ch.attr.quest) /* ephemeral quest npc instances get destroyed on death */
			ch.register('quest', 'die', function(ch) {
				log('destroying quest NPC: ' + ch.name);
				char.destroyMob(ch, function() {});
			});
	},
	
	initQuestPC: function(ch) {

		/* we listen for PC kills and trigger proc.victor on any surrounding mobs */
			
		ch.register('quest', 'kill', function(vict) {
			var M = this.getMobsAt();
			for (var i in M)
				M[i].emit('proc.victor', this, vict);
		});
	},
	
	updateActors: function() {

		debug('quest.updateActors: re-init existing online actors');

		var a = char.getActors();

		for (var i in a)
			quest.initQuestChar(a[i]);
	},
	
	/* if they don't have quests assigned, they'll refuse to talk much */
	talk: function(ch, vict, arg) {
		
		debug('quest.talk ' + stringify(arg));
		
		if (!arg[1])
			return Quest
			.findAll({ where: { MobProtoId: ch.MobProtoId } })
			.then(function(q) {
				if (!q)
					vict.send(u.format(my().X_HAS_NOTHING_TO_TALK_TO_YOU_ABOUT, ch.name));
				else
				for (var i in q)
					vict
					.snd((my().U_CHAT + ' ' + q[i].name).mxpsend('talk ' + ch.name + ' ' + q[i].id) + ' ')
					.send(q[i].desc.color('&I'));
			});

		Quest
		.find({ where: { MobProtoId: ch.MobProtoId, id: arg[1] } })
		.then(function(q) {
			if (!q)
				vict.send(u.format(my().X_HAS_NOTHING_TO_SAY_ABOUT_THIS, ch.name));
			else
				if (!quest[q.id]) {
					vict.send(u.format(my().X_CANT_DISCUSS_THIS_RIGHT_NOW, ch.name));
					warning('no quest plugin found for existing quest summary: '+q.name);
				}
			else
				quest[q.id].begin(ch, vict);
		});
		
		return this;
	},
	
	/* quest-style say: from a mob to a specific target only. if quest is passed as last argument, update the CharQuest description */
	say: function(ch, vict, msg, q) {
		
		msg = ch.name + ': '.color('&W') + msg;
		
		vict.Send(msg);
		
		!q || quest.update(vict, q, { desc: msg });

		return this;
	},
	
	startTalking: function(ch, vict) {
		
		if (vict.talking)
			this.stopTalking(vict.talking, vict);
			
		vict.send(u.format(my().YOU_STRIKE_UP_A_CONVERSATION_WITH_X, ch.name));
		vict.talking = ch;
		
		return this;
	},
	
	stopTalking: function(ch, vict) {
		delete vict.talking;
		vict.send(u.format(my().YOUR_CONVERSATION_WITH_X_HAS_ENDED, ch.name));
		
		return this;
	},
	
	/* this makes items with active quests able to display quests on being read */
	
	initQuestItem: function(it) {

		if (!my().questitems) /* at boot, wait until after we've indexed the active quest items */
			return;

		if (my().questitems.has(it.ItemProtoId)) {

			//log('quest.initQuestItem: ' + it.name);
		
			it.register('quest', 'proc.read', function(vict, arg) {
				//log('quest.initQuestItem proc.read');
				quest.read(this, vict, arg);
			});
			
			it.setAttr({ read: 1 }); /* we do this so we can quickly add a read interaction to items */
		}
		else {
			it.unregister('quest', 'proc.read');
			it.unsetAttr('read');
		}
		
		return this;
	},

	updateItems: function() {

		debug('quest.updateItems: re-init existing item instances');

		var a = my().items;

		for (var i in a)
			quest.initQuestItem(a[i]);
	},
	
	/* if they don't have quests assigned, they'll refuse to talk much */
	read: function(it, ch, arg) {
		
		debug('quest.read: ' + stringify(arg));
		
		quest.stopReading(ch);
		
		if (!arg[1] || !arg[1].isnum()) {
			for (var i in quest) {
				
				var q = quest[i];
				
				if (!q || !q.ItemProtoId || q.ItemProtoId != it.ItemProtoId)
					continue;
				
				//ch.snd('<FRAME Name="scroll-view">'.mxp());
				ch
				.send((my().U_BOOK + ' ' + q.name).mxpsend('read ' + it.id + ' ' + q.id) + ' ')
				.send(q.desc.color('&I'));
			};
			return;
		}

		for (var i in quest) {
			
			var q = quest[i];
			
			if (q && q.id && q.id == arg[1])
				return quest[q.id].begin(it, ch);
		};
		
		warning('no quest found for requested item handle: ' + it.name + ' ' + stringify(arg));
	},
	
	startReading: function(ch, it) {
		
		if (ch.reading)
			this.stopReading(ch);
	
		ch.send(u.format(my().YOU_START_READING_X, it.name), 'scroll-view');
		ch.reading = it;
		
		return this;
	},
	
	stopReading: function(ch) {
		
		if (ch.reading) {
			ch.send(u.format(my().YOU_STOP_READING_X, ch.reading.name), 'scroll-view');
			delete ch.reading;
		}
		
		return this;
	},
	
	addChar: function(ch, qname, o, cb) {
		
		/* associate a char with a quest, with optional properties to pass to the CharQuests linking table */

		var by = { where: { name: qname } };
		 
		if (typeof qname == 'number')
			by = qname; /* find by id */
			
		o = o || {
			status: 'begin', /* This is a string we can use to identify the stage / phase the quest is in. */
			desc: my().YOU_HAVE_JUST_EMBARKED, /* This is what the player sees in the quest log for this character. */
			attr: {}
		};
		
		Quest.find(by).then(function(q) {

			
				ch.addQuest(q, o).then(function() {
					
					debug('quest.addChar: ' + ch.name + " +quest " + q.name);
					
					ch
					.getQuests()
					.then(function(qs) {
						ch.quests = qs;
						!cb || cb(q);
					});
				});
		});
		
		return this;
	},

	removeChar: function(ch, qname, cb) {
		
		/* de-associate a char with a quest */
		var by = { where: { name: qname } };
		 
		if (typeof qname == 'number')
			by = qname; /* find by id */
			
		Quest.find(by).then(function(q) {
			ch.removeQuest(q).then(function() {
				ch.quests.remove(q);
				log('quest.removeChar: ' + ch.name + " -quest " + q.name);
				!cb || cb(q);
			});
		});
		
		return this;
	},
	
	matchInput: function(input, arr) {

		for (var i = 0; i < arr.length; i++)
			if (arr[i].isAbbrev(input.line))
				return i + 1;

		return 0;
	},

	/* the quest flavor of giveItem will check if char already has this quest item and prevent duplicates. */
	giveItem: function(ch, name, q) {

		if (ch.hasItem(name)) {
			
			warning('quest.giveItem: char already has: ' + ch.name + ' | ' + name);
			return ch.send(u.format(my().YOU_ALREADY_HAVE_X, name));
		}
		
		item.create(name, function(it) {
		
			/* set quest id as attribute and bind this item to the quest owner */
			it.setAttr({
				quest: q.id,
				CharId: ch.id
			});
		
			ch.take(it, function() {
				ch.send(u.format(my().YOU_NOW_HAVE_X, it.name));
			});
		});	
		
		return this;
	},
	
	/* the quest flavor of createItem will check if char already has this quest item in their set and prevent duplicates. */
	/* we assume you want an item outside of a char's inventory because we have giveItem for that */
	createItem: function(ch, name, at, q, cb) {

		if (ch.hasItem(name)) {
			warning('quest.createItem: char already has: ' + ch.name + ' | ' + name);
			return ch.send(u.format(my().YOU_ALREADY_HAVE_X, name));
		}
		
		item.create(name, function(it) {
		
			/* set quest id as attribute and bind this item to the quest owner */
			it.setAttr({
				quest: q.id,
				CharId: ch.id
			});
			
			it.updateAttributes({
				at: at,
				location: 'ground'
			})
			.then(function() {
				item.initItem(it);
				!cb || cb(it);
			});
		});	
		
		return this;
	},
	
	createMob: function(ch, name, at, q, cb) {
		
		var mob = char.protoByName(name);
		
		if (!mob)
			return warning('quest.createMob could not find proto for mob named ' + name);
		
		var o = mob.get({ plain: true });
		o.MobProtoId = o.id, delete o.id;
		o.at = at;
		
		Mob.create(o).then(function(mob) {

			char.initChar(mob);
						
			/* set quest number and bind this mob to the quest owner */
			mob.setAttr({
				quest: q.id,
				CharId: ch.id
			});
			
			!cb || cb(mob);
		});
		
		return this;
	},

	quiz: function(ch, quiz, q) {
	    
		debug('quest.quiz');
		
	    var nr, ch_q = ch.hasQuest(q.id);
	    
		//dump('quiz: '+ch_q);
		
		if (!ch_q || ch_q.status == 'failed') {
		
			if ((nr = quiz[0].norepeat)) {
				
				/* we may disallow repeating at the user level */
				if (nr.user && ch.anyHasQuest(q.id)) {
					ch.send(my().QUEST_ONCE_PER_USER);
					return my().HANDLED;
				}
				
				/* we may disallow repeating at the character level */
				if (nr.char && ch.hasQuest(q.id)) {
					ch.send(my().QUEST_ONCE_PER_CHAR);
					return my().HANDLED;
				}
			}  
	    }
		
	    if (!ch_q) {
	    	
	        quest.addChar(ch, q.id, { attr: { step: 1 }, desc: my().QUEST_QUIZ_STARTED }, function() {
				quest.quiz(ch, quiz, q);
	        });
	        
	        return my().HANDLED;
	    }
	    
		/* if we got here, ch should have this quest for sure */
		dump('quest.quiz: '+ ch_q.get({ plain: true }));
		
		var step = ch_q.attr.step - 1;
		//dump(step);
		
		if (ch_q.status == 'completed' && !quiz[step]) {
			ch.send(my().QUEST_QUIZ_COMPLETED);
			return my().HANDLED;
		}
		
		if (!quiz[step] || !quiz[step].question || !quiz[step].options) {
			warning('quest: ' + ch.name + ' triggered an invalid quiz step for quest ' + q.name);
			return my().HANDLED;
		}

		quest.quizStart(ch, quiz, q);
		
		ch.Send(quiz[step].question);
		ch.Send(quiz[step].options.mxpsend(my().U_CHAT + ' ').join('\r\n'));
		
		ch.next = quest.quizNext;
		
		return my().REDIRECTED; /* because we're passing user on to another input handler */
	},
	
	quizNext: function() {
		
		var ch = this, res, quiz = ch.temp.quiz, q = ch.temp.quest, ch_q = ch.hasQuest(q.id);
		
		if (!ch_q) { /* this shouldn't happen if quiz was started properly */
			quest.quizStop(ch);
	        return my().UNHANDLED;
	    }
	    
	    var step = ch_q.attr.step - 1, penalty = quiz[step].penalty, reward = quiz[step].reward;
	    
	    if (!quiz[step]) {
	    	quest.quizStop(ch);
	        return my().UNHANDLED;
	    }
		
		/* 0 from matchInput means they typed something other than a response */
	    if (!(res = quest.matchInput(ch.input, quiz[step].options))) {
			quest.quizStop(ch);
	        return my().UNHANDLED;
	    }
	    
	    if (res != quiz[step].answer) {
	    	
	    	ch.send(my().QUEST_QUIZ_WRONG_ANSWER);
	    	
	    	if (!penalty || penalty == 'repeat')
	    		return quest.quiz(ch, quiz, q);
	    	
	    	if (penalty == 'skip') {
	    		ch_q.updateAttributes({
	    			attr: { step: ++step }
	    		})
	    		.then(function() {
	    			quest.quiz(ch, quiz, q);
	    		});
	    		return my().HANDLED;
	    	}
	    	
			if (penalty == 'fail') {
	    		ch_q.updateAttributes({
	    			status: 'failed'
	    		})
	    		.then(function() {
	    			quest.quiz(ch, quiz, q);
	    		});
	    		return my().HANDLED;
	    	}
	    }
		
		ch.send(my().QUEST_QUIZ_RIGHT_ANSWER);
		
		for (var i in reward) {
		
			if (i == 'exp') {
				ch.gain('exp', reward[i]);
			}
			else
			if (i == 'aff')
				ch.setAff(reward[i]);
			else
			if (i == 'item')
				item.create(reward[i], function(it) {
					ch.take(it).send(u.format(my().YOU_NOW_HAVE_X, it.name));
				});
		}
				
		if (!quiz[++step]) { /* no next question, complete quiz */
		
			ch_q.updateAttributes({
				attr: { step: ++step },
				status: 'completed' /* note that we keep track of the step they reached. if more steps are added later, players would be able to continue */
			})
			.then(function() {
				ch.send(my().QUEST_QUIZ_COMPLETED);
			});
					
			return my().HANDLED;
		}
			
		ch_q.updateAttributes({
			attr: { step: ++step }
		})
		.then(function() {
			quest.quiz(ch, quiz, q);
		});

		return my().HANDLED;
	},
	
	quizStart: function(ch, quiz, q) {
		if (ch.temp.quiz != quiz) {
			ch.send(my().QUEST_QUIZ_START);
			ch.temp.quiz = quiz, ch.temp.quest = q;
		}
	},
	
	quizStop: function(ch) {
		ch.send(my().QUEST_QUIZ_STOP);
		delete ch.temp.quiz, delete ch.temp.quest;	
	},
	
	purgePropsAt: function(ch, qid) {
		
		var M = ch.getMobsAt();
		
		for (var i in M)
			if (M[i].attr.quest && M[i].attr.CharId && M[i].attr.CharId == ch.id)
				char.destroy(M[i]);
		
		var I = ch.getItemsAt();
		
		for (var i in I)
			if (I[i].attr.quest && I[i].attr.CharId && I[i].attr.CharId == ch.id)
				item.destroy(I[i]);
		
	},
	
	create: function(o, cb) { /* create a quest summary record in Quests table from a quest plugin / file */
		
		debug('quest.create');
		
		if (!cb)
			log('quest.create called with no callback');
		
		Quest.create(o).then(function(q) { !cb || cb(q); });
		return this;
	},

	/* modify the attributes of a character quest record */
	update: function(ch, q, o) { 
		
		if (typeof q == 'number')
			q = quest[q];
		
		CharQuest.find({
			CharId: ch.id, 
			QuestId: q.id
		})
		.then(function(cq) {
			
			if (!cq)
				return warning('no active quest found on requested status update: ' + ch.name + ' ' + q.name);

			cq.updateAttributes(o).then(function() {
				ch.getQuests().then(function(qs) {
					ch.quests = qs;
				});
			});
		});
		
		return this;
	},
	
	showCharQuests: function(ch) {

		ch.getQuests().then(function(cq) {

			if (!cq.length)
				return ch.send(my().NO_ACTIVE_QUESTS);

			cq.forEach(function(q) {
				ch.send(q.name.color('&208') + ' ' 
				+ q.type.color('&K') + '\r\n' 
				+ q.CharQuest.desc);
			});
		});
		
		return this;
	},

	listAllQuests: function(ch) {
		
		Quest.findAll({ where: { status: 'enabled'} })
		.then(function(cq) {
			cq.forEach(function(q) {
				ch.send(
					q.name.color('&208') + ' ' 
					+ q.type.color('&K')  + '\r\n' 
					+ q.desc
				);
			});
		});
		
		return this;
	}
};