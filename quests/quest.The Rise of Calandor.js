var u = require('util');

addStrings({
	
	eng: {

		Q2_YOU_FEEL_LESS_BOOKSMART: "You feel book-smart.",
        
		Q2_YOU_FEEL_LESS_BOOKSMART: "You feel less book-smart.",
        
		Q2_DESC: "A collection of essays by Bastun the Thrice Learned. You should read them or forever swim in ignorance.",
		
		Q2_INTRO: "What would you like to learn more about?",
		
		Q2_SEGUAY: "Bastun the Thrice Learned writes:\r\n".color('&K'),
		
		Q2_CONTENTS: [
			"Calandor City", 
			"Local laws of propriety", 
			"Things to do while avoiding prison", 
			"Defending the realm",
			"Rulers and Rulees",
			"Test your memory"
		],
		
		Q2_CHAPTERS: [

"The first thing a visitor to Calandor City notices is how positively huge it is. And how positively clean. Very clean. Not like the dirty hovel you undoubtedly hail from, Dear Reader. Let's keep it clean, and let's keep it huge, and prosperous, shall we? It is a fresh breath of non-barbarous air in the otherwise forsaken and forlorn realm of Aaralon. But I digress.\r\n\
\r\n\
The City was built 894 years and 12 or so days ago by Koelin the Mad. He was King of the now extinct Uruk-Vai. Part of the reason they are extinct, methinks, is the great wall encircling the City. Some of the stones were brought down from the Wide North on giant sleds pulled by a dozen mammoths. Which is why graffiti is very much frowned upon by passionate historians such as myself, and I will be sure to twist the nose of anyone I catch doing it! But I digress...", 

"Don't spit on the cobblestones. Bow to ladies, even those who prefer to spit on the cobblestones rather than look at your filthy demeanour. Praise the King, and not so much the Queen, who is still a foreigner that every sane person in Calandor is righteously suspicious of. She will have to hug a whole lot of babies before we forgive her quaint Drapur ancestry, I say. And observe the curfew at all cost, unless you wish to pick a fight with the hired swords of the Royal Adjuncts regiment.\r\n\r\nLet me tell you something about those mercenaries. They are less royal and more of a royal dose of heat and hurt, you understand. It is the King's Law to be sure, but down on the ground no-one will think twice if a foreign adventurer popped up drowned in a sewer ditch. There, I said it.", 

"Seeing as you are from the province, chances are you will see the inside of a prison cell soon enough. That's just statistically very likely and not a judgement on your character, if you have any.\r\n\r\nWhen imprisoned, avoid angering the guards and make sure to bring a good book with you, like this one. Magistrates hear petty crime cases only once a fortnight, and forgive me for assuming that your offence will be a petty one.\r\n\r\nTo safeguard from haphazard imprisonment, keep a good hygiene and try to lose your country accent. For instance, never say Ma'am, My Lady, or My Lord. The dialect of the Capital rounds vowels the way the Twin Gods intended them to be rounded. So, you should say Mo'om, Mo'lady, and Mo'lord. If you make the mistake of chuckling while attempting to imitate cityfolk, please refer to the beginning of this chapter.",

"Defend the realm at all costs, and some of your taxes may be pardoned by the merciful Chief Collector Haardis. If you give your life in the service of Calandor, your family will be fed by the City Granary for a generation. Only immediate family, mind you. Cousins twice removed, illegitimate children, and claimants without proper birth certificates will naturally be denied. But what a great way to motivate the hunger-stricken migrants to do something useful with their lives beyond cluttering the lakeshores with their tents!",

"Our King's two elder brothers shall not be mentioned in conversations about the Crown, but for your edification, their names are Faisel and Ingod. Our new Queen's name is Felis, may the Gods keep an eye on her.\r\n\r\nIn most circumstances, you will do well to praise our glorious King Eigor's many achievements, such as the public lavatories and green spaces he has created within these enlightened walls. You shall make no remarks regarding his propensity to re-marry without divorce and thus run afoul of almost every religion.\r\n\r\nYou shall not heed those who say the King was intentionally slow getting to the battlefield at Elorin. You shall instead praise his love of science and his generous donations to medical guilds, which have been key to extending the average lifespan of a Calandor citizen to upwards of 34 years."

		],
		
		Q2_QUIZ: [
			{
				norepeat: { user: true, character: true }, /* we will allow neither users nor characters to repeat this quest. once per user account. normally, user-unique quests would be rare */
				
				question: "Who built Calandor City, in your own view?",
				
				options: [
                    "Chief Collector Haardis",
				    "Koelin the Mad",
				    "The Uruk-Vai people",
				    "Royal Mercenaries",
				    "Queen Felis"
				],
				
				answer: 3,
				
				reward: {
				    exp: 100
				},
				
				penalty: 'repeat' /* 
				                   * repeat - allow instant repeat of question (default), 
				                   * skip - move on without reward, 
				                   * fail - drop char from quest. keep a record so you can choose to disallow restart */
			},
			
			{
				question: "Which of these is " + "not".bold() + " part of Bastun's advice on staying out of prison?",
				
				options: [
				    "lose your accent",
				    "stay clean",
				    "be exceedingly polite",
				    "chuckle at citizens",
				    "don't commit petty crime"
				],

				answer: 4,
				
				reward: {
				    exp: 150,
					item: 'a simple red potion'
				},
				
				penalty: 'repeat'
			},
			
			{
				question: "Which of these is " + "not".bold() + " a rumour you learned about our good King Eigor?",
				
				options: [
				    "possibly a coward",
				    "loves music",
				    "patron of science",
				    "focused on sanitation",
				    "unfaithful"
				],
				
				answer: 2,
				
				reward: {
				    exp: 200,
					aff:  {
						msg: my().Q2_YOU_FEEL_BOOKSMART,
						'book smarts': {
    						affects: {  INT: 3 },
    						expires: now() + (3).days(),
    						msg: my().Q2_YOU_FEEL_LESS_BOOKSMART
						},
					}
				},
				
				penalty: 'repeat'
			}
		]
	}
});
 
module.exports = {

	id: 2,
	
	name: "Essays on the Rise of Calandor",

	type: 'Easy Reading', /* loose label of a quest category */
	
	desc: my().Q2_DESC,
	
	at: { item: 'The Adventurer\'s Guide to Calandor' },
	
	status: 'enabled',

	attr: { },
	
	requires: function(vict, ch) {
		return vict.pc();
	},

	init: function() {

	},
 
	begin: function(it, vict) {

		log('quest.2.begin');

		var q = quest[2];
		
		if (!q.requires(vict))
			return 1;

		quest.startReading(vict, it);
		
		vict.Send(my().Q2_INTRO.color('&K') + '\r\n' + my().Q2_CONTENTS.mxpsend(my().U_BOOK + ' ').join('    '));
		vict.next = quest[2].read;
	},
	
	read: function() {

		log('quest.2.read');
		
		var vict = this, resp = quest.matchInput(vict.input, my().Q2_CONTENTS);

		if (!resp) {
			quest.stopReading(vict);
			return my().UNHANDLED;
		}

		if (my().Q2_CHAPTERS[resp-1]) {
			
			vict.Send(my().Q2_SEGUAY + my().Q2_CHAPTERS[resp-1].color('&230'));
			
			vict.Send(my().Q2_INTRO.color('&K') + '\r\n' + my().Q2_CONTENTS.mxpsend(my().U_BOOK + ' ').join('    '));
			
			vict.next = quest[2].read; /* sets this function to wait again in ch.next - that's why we return 2 */
			
			return my().REDIRECTED;
		}
		
		/* last content item is the memory test / pop quiz */
		if (resp == my().Q2_CONTENTS.length)
			 return quest[2].quiz(vict); /* we're passing ch on to another handler, so we let it decide what to return to ch.do */
		
		return my().HANDLED;
	},
	
	quiz: function(vict) {
		return quest.quiz(vict, my().Q2_QUIZ, quest[2]); /* we now pass a standard quiz object to the generic quiz handler */
	}
};