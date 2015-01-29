var u = require('util');

addStrings({
	
	eng: {
		
		X_QUEST_REFUSAL: "%s wishes you would keep out of %s affairs.",
		
		Q1_DESC: 'If you press this subject, you will find out more about Naumi\'s secret identity. Possibly the kind of knowledge that dislodges one\'s head from one\'s shoulders.',
		
		Q1_ALREADY_HELPING: "You're already helping me on this matter. Right?",
		
		Q1_FARM_INTRO:	"I see you are capable, have seen things that cannot be unseen. Still, I need to know that I can trust you...",
		
		Q1_WRONG_ANSWER: "This is not the answer I was hoping to hear.",
		
		Q1_FARM_QUESTION:	'Imagine you are in the service of a powerful benefactor who knighted you for your talents. '
				+ 'One day, he orders you to burn down a small farm, with the farmer\'s family still inside. Do you: ',
				
		Q1_FARM_QUIZ:	["Execute eagerly", "Ask for the reason", "Refuse on principle", "Attempt to leave"],

		Q1_FARM_QUIZ_ANSWER: 2, /* answers are 1-indexed for convenience. so 2 maps to "Ask for the reason" */

		Q1_FARM_COMMENT:	'To know more is all we can hope for before having to make a hard choice.',
		
		Q1_DIE_QUESTION:	'Have you ever been prepared to die for someone or something? ',
		
		Q1_DIE_QUIZ:	["Yes, but I'd rather kill my enemies first!", 
		         	 "Yes, I'd die gladly for a good cause or a good soul.", 
		         	 "No, but I imagine I will if the circumstances require it.", 
		         	 "No, and I'm not crazy enough to do it.",
		         	 "This is getting too intense. I'm out of here!"],
		         	 
		Q1_DIE_QUIZ_ANSWER: 3,
		
		Q1_GIVE_SIGIL: 'Forgive my questions. Let\'s begin with a small errand.'
			+ ' Seek out Harrol the Apothecar and give him this cinder sigil. He\'ll know what it means.',
			
		Q1_SEIZE_THE_TRAITOR: 'Seize the traitor, by any means necessary!',
		
		Q1_SIGIL_GLOW:	'The cinder sigil Naumi gave you is now glowing.',
		
		Q1_THANK_GODS: 'Thankgods your blade is sharper than Naumi\'s wits. I see the sigil is already activated. Make haste to the Dawsum Farm east of town. I pray the beautiful corpse is still there. Take a blood sample using the sigil. Even a drop will suffice. Then take the sample to Neskar in the Palace Dungeon. Avoid drawing any attention.',
		
		Q1_CORPSE_FOUND: "You found the right farm and what looks like the right corpse, but it doesn't look like a blood sample would be easy to obtain. What to do next?",
		
		Q1_CORPSE_QUIZ: [
			"Look around for blood", 
			"Slit the young woman's wrist", 
			"Stab open the corpse's heart", 
			"Abandon quest"
		],
	
		Q1_CORPSE_QUIZ_RESP: [
			"There is not a trace of blood to be seen anywhere, not even on your own horrified face!", 
			"You cut gently but the young woman's limbs appear to be completely bloodless.", 
			"You hope the Twins are in a forgiving mood as you carve out a hole in the dead woman's chest.\r\nYou find a few tiny drops of blood in the heart itself, and quickly dab the sigil.",
			"You decide to abandon this madness and stay out of harm's way, for now."
		],
		
		Q1_CORPSE_QUIZ_ANSWER: 3,
		
		Q1_SAMPLE_TAKEN: "You have taken the blood sample Harrol requested, and done so in the most gruesome fashion. You must now take it back to the Apothecary to see this through.",
		
		Q1_TAKE_ANALYZE_SAMPLE: "Thank you for going where scholars dare not go. I will analyze this sample instantly using ancient Jarrot magic" + my().U_EM_DASH + "speed is of the essence.",
		
		Q1_RETURN_TO_NAUMI: "It is as I feared, our King's new Eastern bride is but a viper in our midst. I have transformed this sigil into a call for action. Make your way back to Naumi and let her see the Sigil on your shoulder. She will tell you what must be done to dethrone the murderess."
	}
});
 
module.exports = {

	id: 1,
	
	status: 'enabled',

	name: "Naumi's Secret",

	type: 'Investigation', /* loose label of a quest category */
	
	desc: my().Q1_DESC,
	
	at: { mob: 'Naumi' },
	
	attr: {},
	
	requires: function(vict, ch) {

		if (vict.immo() && !vict.imp()) {
			!ch || vict.send(u.format(my().X_QUEST_REFUSAL, ch.name, my().SEX[ch.sex].hisher));
			return my().UNHANDLED;
		}

		if (vict.NPC()) {
			!ch || vict.send(u.format(my().X_QUEST_REFUSAL, ch.name, my().SEX[ch.sex].hisher));
			return my().UNHANDLED;
		}

		return my().HANDLED;
	},

	init: function(re) {
		
		char.register('quest.1', 'enter.npc', function(ch) {
			
			if (ch.name == 'Harrol') {
	
				ch.register('quest.1', 'proc.entry', function(vict) {
					quest[1].enterApothecary(this, vict);
				});
				
				ch.register('quest.1', 'proc.victor', function(ch, vict) {
					quest[1].dieSerip(this, ch, vict);
				});
			}
		});

		char.register('quest.1', 'enter.pc', function(ch) { 
			/* this is self-triggered when entering a room */
			ch.register('quest.1', 'self.entry', function() {
				quest[1].findCorpse(this);
			});
		});
	},
 
	begin: function(ch, vict) {

		log('quest.1.begin');

		var q = quest[1];
		
		if (!q.requires(vict, ch))
			return my().HANDLED;
		
		quest.startTalking(ch, vict);

		/* this is where we may refuse to restart the quest if it's in progress, or has been completed (vict.hasCompletedQuest) */
		if (vict.hasQuest(q.name))
			return quest.say(ch, vict, my().Q1_ALREADY_HELPING + '\r\n' 
			+ my().SEE_QUEST_LOG);

		after(0.5, function() {
			quest.say(ch, vict, my().Q1_FARM_INTRO);
		});
			
		after(4, function() {
			quest.say(ch, vict, my().Q1_FARM_QUESTION + '\r\n\r\n' 
			+ my().Q1_FARM_QUIZ.mxpsend(my().U_CHAT + ' ').join('   '));
			vict.next = quest[1].answer1;
		});
	},
	
	answer1: function() {

		var resp, vict = this, ch = vict.talking;

		if (!(resp = quest.matchInput(vict.input, my().Q1_FARM_QUIZ)))
			return my().UNHANDLED;
		
		if (resp != my().Q1_FARM_QUIZ_ANSWER) {
			quest.say(ch, vict, my().Q1_WRONG_ANSWER);
			quest.stopTalking(ch, vict);
			return my().HANDLED;
		}

		after(0.5, function() {
			ch.do('nod');
			quest.say(ch, vict, my().Q1_FARM_COMMENT);
		});
		
		after(4, function() {
			quest.say(ch, vict, my().Q1_DIE_QUESTION + '\r\n\r\n' + my().Q1_DIE_QUIZ.mxpsend(my().U_CHAT + ' ').join('\r\n'));
			vict.next = quest[1].answer2;
		});
		
		return my().HANDLED;
	},

	answer2: function() {

		var resp, vict = this, ch = vict.talking;

		if (!(resp = quest.matchInput(vict.input, my().Q1_DIE_QUIZ)))
			return my().UNHANDLED;

		if (resp != my().Q1_DIE_QUIZ_ANSWER) {
			
			quest.say(ch, vict, my().Q1_WRONG_ANSWER);
			quest.stopTalking(ch, vict);
			
			after(1.3, function() { ch.do("shake"); });
			return my().HANDLED;
		}

		after(1, function() {
		
			/*  This is where we finally add the quest to CharQuests. Up until now, they can just retry the questions. */
			
			quest.addChar(vict, "Naumi's Secret", { status: 'stage 1' });
			
			/* 	Passing the quest as last argument in quest.say will also set the communication line 
				as the description for this quest in a character's quest log. */
				
			quest.say(ch, vict, my().Q1_GIVE_SIGIL, quest[1]);
			
			/* 	We use a specialized version of give to hand a quest-related item */
			quest.giveItem(vict, 'a cinder sigil', quest[1]);
			
			quest.stopTalking(ch, vict);
		});
		
		return my().HANDLED;
	},
	
	enterApothecary: function(ch, vict) {
		
		/* first entry to Apothecary, ambush */
		if (vict.hasQuest(1, 'stage 1')) {

			vict
			.alterItem('a cinder sigil', { name: 'a glowing cinder sigil' })
			.send(my().Q1_SIGIL_GLOW);

			quest.createMob(vict, 'Serip', vict.at, quest[1], function(mob) {
				quest.say(mob, vict, my().Q1_SEIZE_THE_TRAITOR, quest[1]);
				mob.do('kill ' + vict.name);
			});

			quest.createMob(vict, 'a royal mercenary', vict.at, quest[1], function(mob) {
				mob.do('kill ' + vict.name);
			});
			
			quest.createMob(vict, 'a royal mercenary', vict.at, quest[1], function(mob) {
				mob.do('kill ' + vict.name);
			});
			
			quest.update(vict, 1, { status: 'stage 2' });
			return my().HANDLED;
		}
		
		/* return to Harrol after farm visit */
		if (vict.hasQuest(1, 'stage 5')) {
		
			quest.say(ch, vict, my().Q1_TAKE_ANALYZE_SAMPLE);
			
			ch.alterItem('a bloody sigil', { 
				name: 'Sigil of the Samarkent',
				type: 'worn',
				position: 'shoulder',
				affects: {
					maxhit: 10,
					maxmana: 10
				}
			});
			
			after(3, function() {
				quest.say(ch, vict, my().Q1_RETURN_TO_NAUMI);
			});
			
			quest.update(vict, 1, { status: 'stage 6', desc: my().Q1_TAKE_ANALYZE_SAMPLE + '\r\n' + my().Q1_RETURN_TO_NAUMI });
		};
	},

	dieSerip: function(me, ch, vict) { /* me is the mobile that witnesses victor ch kill victim vict */

		if (!ch.hasQuest(1, 'stage 2'))
			return;

		if (vict.name != 'Serip')
			return;

		after(2, function() {
			quest.update(vict, 1, { status: 'stage 3' });
			quest.say(me, ch, my().Q1_THANK_GODS, quest[1]);
			ch.alterItem('a glowing cinder sigil', { name: 'a burning cinder sigil' });
		});
	},

	findCorpse: function(vict) {
		
		if (!vict.hasQuest(1))
			return;
		
		if (!vict.isAt({ zone: 'Calandor', x: 91, y: 20 }))
			return;
		
		if (vict.hasQuest(1, 'stage 3')) {
		
			quest.createItem(vict, 'the bloodless corpse of a young woman', vict.at, quest[1], function() {
				
				vict.cmd.look.call(vict);
				quest.update(vict, 1, { status: 'stage 4', desc: my().Q1_CORPSE_FOUND });
				
				vict.send(my().Q1_CORPSE_FOUND + '\r\n\r\n' + my().Q1_CORPSE_QUIZ);
				vict.next = quest[0].corseQuiz;
			});
		}
		else /* if they have started the corpse quiz, just hand them the questions again */
		if (vict.hasQuest(1, 'stage 4')) {
		
			vict.send(my().Q1_CORPSE_FOUND + '\r\n\r\n' + my().Q1_CORPSE_QUIZ);
			vict.next = quest[0].corseQuiz;
		}
	},
	
	corpseQuiz: function() {
		
		if ((resp = quest.matchInput(vict.input, my().Q1_CORPSE_QUIZ)) < 0) 
			return 0;
		
		vict.send(my().Q1_CORPSE_QUIZ_RESP[resp]);
		
		if (resp == Q1_CORPSE_QUIZ_ANSWER) {
			vict.send(my().Q1_SAMPLE_TAKEN);
			quest.update(vict, 1, { status: 'stage 5', desc: my().Q1_SAMPLE_TAKEN });
			ch.alterItem('a burning cinder sigil', { name: 'a blood-stained sigil' });
		}
	}
};