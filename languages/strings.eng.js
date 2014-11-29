/* AARALON (c) 2013-2014 */

module.exports = {

	LOGIN_SCREEN_ASCII:		"&c\r\n\
         ▁ ▂ ▄ ▅ ▆ ▇ █  [ ąąяąℓ๏ɲ ] █ ▇ ▆ ▅ ▄ ▂ ▁\r\n\
&c\r\n\
    █████╗  █████╗ *█████╗  ██*██╗ ██╗     *████╗ ███╗   █*╗\r\n\
   *█╔══██╗██╔══██╗██╔══██╗██╔══██╗██║    ██╔══██╗████╗  ██║\r\n\
   ███████║███*███║██████╔╝███████║██║    ██║  ██║██╔██╗ ██║\r\n\
   ██╔══██║██╔══██║██╔══██╗██╔══██║*█║    ██║  ██║██║╚██╗██║\r\n\
   ██║  ██║██║  ██║██║  ██║██║  ██║██████╗╚██*██╔╝██║ ╚*███║\r\n\
   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚════╝ ╚═╝  ╚═══╝\r\n\
&n\r\n\
       Running &WAlpha&n &YHavoc &y(c)&n custom game engine &Wv0.2&n\r\n\
&iPowered by &cnode.js&n. &iInspired by CircleMUD &Ki(derivative of DikuMUD)&n\r\n\
\r\n\
Enter new or existing username: ",
	
	LOGIN_SCREEN: 		"\x1b[1z<IMAGE AaralonSplash.jpg URL=\"http://www.mudportal.com/aaralon/images/\">\x1b[7z\
			\r\n\
Running &WAlpha&n &YHavoc &y(c)&n custom game engine &Wv0.3&n\r\n\
&KiPowered by node.js. Inspired by CircleMUD / DikuMUD.&n\r\n\
\r\n",

	SERVER_REBOOT: 				"Server is rebooting now. Your progress has been saved. Please reconnect.",
	SERVER_DOWN: 				"Servers are going down for maintenance.",
	
	COMMANDS:					"\r\n&BCommands:&n\r\n",
	YOU_CANNOT_DO_THIS_YET: 	"You cannot do this, yet.",
	
	NOONE_BY_THAT_NAME:			"No-one by that name.",
	NO_ONE_BY_THAT_NAME:		"No-one by that name.",
	DID_YOU_MEAN_X:				"Did you mean %s?",
	OKAY:						"Okay.",

	X_WHAT:						"%s what?",
	
	CURRENCY:					"gold",
	
	SEX: {
		neutral: {
			heshe: 'it',
			hisher: 'its',
			himher: 'it',
			symbol: '\u2205'
		},
		male: {
			heshe: 'he',
			hisher: 'his',
			himher: 'him',
			symbol: '\u2642'
		},
		female: {
			heshe: 'she',
			hisher: 'her',
			himher: 'her',
			symbol: '\u2640'
		},
		trans: {
			heshe: 'she',
			hisher: 'its',
			himher: 'him',
			symbol: '\u26A5'
		}
	},
	
	VERBOSE: 	1, 
	SILENT: 	2,
	
	UNHANDLED:	0, /* input was not handled by custom function, proceed to commands */
	HANDLED:	1, /* input was handled by a custom function */
	REDIRECTED:	2, /* input was handled and redirected to another custom handler, don't blow away ch.next, s.next, etc. */
	
	XWORDS: [ "ass", "arse", "balls", "bastard", "basterd", "basturd", "bitch", "blowjob", "handjob", "clit", "cock", "crap", "cum", "cunt", "dick", "fag", "fart", "motherf", "mothaf", "mothaf", "muthaf", "fuck", "fuk", "fukc", "fick", "lick", "orgasm", "penis", "piss", "prick", "pussy", "shit", "suck", "twat", "tit", "kike", "nigger", "nigga", "whore", "vagina", "slut" ],
	
	PROTOCOL: {
		DO_GMCP: 		new Buffer([ 255, 253, 201 ]),
		WILL_GMCP: 		new Buffer([ 255, 251, 201 ]),
		DO_MCCP: 		new Buffer([ 255, 253, 86 ]),
		DO_MSDP: 		new Buffer([ 255, 253, 69 ]),
		DO_MXP: 		new Buffer([ 255, 253, 91 ]),
		DO_CHARSET: 	new Buffer([ 255, 253, 42 ]),
		WILL_MXP: 		new Buffer([ 255, 251, 91 ]),
		GMCP_START:		new Buffer([ 255, 250, 201 ]),
		GMCP_STOP: 		new Buffer([ 255, 240 ]),
		GO_MXP:			new Buffer([ 255, 250, 91, 255, 240 ]),
		WILL_TTYPE:		new Buffer([ 255, 251, 24 ]),
		WILL_NEW:		new Buffer([ 255, 251, 39 ]),
		WILL_EXTASCII: 	new Buffer([ 255, 251, 17 ]),
		WONT_NAWS:		new Buffer([ 255, 252, 31 ]),
		WILL_ECHO:		new Buffer([ 255, 251, 1 ]),
		WONT_ECHO:		new Buffer([ 255, 252, 1 ]),
		WILL_CHARSET:	new Buffer([ 255, 251, 42 ]),
		WILL_UTF8:		new Buffer([ 255, 250, 42, 1, 32, 85, 84, 70, 45, 56, 255, 240 ]),

		MSDP_VAR: 	1,
		MSDP_VAL: 	2,
		IS:			0,
		REQUEST:	1,
		ECHO:		1,
		VAR:		1,
		ACCEPTED:	2,
		SGA:		3,
		REJECTED:	3,
		TTYPE:  	24,
		NAWS: 		31,
		ESC:		33,
		NEW:		39,
		MSDP:		69,
		MCCP2:		86,
		MXP:		91,
		CHARSET: 	42,
		ATCP:	200,
		GMCP:	201,
		SE:		240,
		SB:		250,
		WILL:	251,
		WONT:	252,
		DO:		253,
		DONT:	254,
		IAC:	255,
		0: 		'IS',
		1: 		'REQUEST | ECHO | VAR',
		2: 		'REJECTED | VAL',
		3: 		'SGA',
		24: 	'TTYPE',
		39: 	'NEW',
		42: 	'CHARSET',
		69: 	'MSDP',
		91: 	'MXP',
		201: 	'GMCP',
		240: 	'SE',
		250: 	'SB',
		251: 	'WILL',
		252:	'WONT',
		253: 	'DO',
		254: 	'DONT',
		255: 	'IAC'
	},

	U_EN_DASH:			'\u2013',
	U_EM_DASH:			'\u2014',
	U_TARGET_HIT: 		'\u29BF',
	U_TARGET_MISS: 		'\u29BE',
	U_STAR:		 		'\u2605',
	U_STAR_FULL: 		'\u2605',
	U_SQUARE_FULL: 		'\u25FC',
	U_SQUARE_HALF:		'\u25E7',
	U_SQUARE_EMPTY: 	'\u25FB',
	U_BOX_EMPTY:		'\u2610',
	U_BOX_CHECKED:		'\u2611',
	U_BOX_CROSSED:		'\u2612',
	U_SPEED:			'\u00BB',
	U_HASTE:			'\u2E29',
	U_WAVE:				'\u0F04',
	U_SLOPE:			'\u0F3C',
	U_POWER_OFF:		'\u0FC3',
	U_GRASS:			'\u1689',
	U_HILLS:			'\u2652',
	U_MOUNTAINS:		"\uD83C\uDF04",
	U_MOUNTAIN:			"\uD83C\uDF04",
	U_BRIDGE:			'\u1172',
	U_VILLAGE:			'\u1230',
	U_CASTLE: 			"\uD83C\uDFF0",
	U_SHIELD:			"\u26CA", //"\uD83D\uDEE1", //'\u26C9', //"\uD800\uDDDB"
	U_SHIP:				'\u26F5',
	U_CAMP:				'\u26FA',
	U_CITY:				'\u259F',
	U_UNDERGROUND:		'\u2A66',
	U_ENVELOPE:			'\u2709',
	U_SKILL:			'\u2726',
	U_SUN:				'\u2600',
	U_CLOUD:			'\u2601',
	U_SHAMROCK:			'\u2618',
	U_LIGHTNING:		'\u26A1',
	U_RAIN:				'\u26C6',
	U_MOON:				'\u263E',
	U_THUNDERSTORM:		'\u26C8',
	U_CLOUDY_SUN:		'\u26C5',
	U_STAFF_HERMES:		'\u269C',
	U_STAFF_CADUCEUS:	'\u2624',
	U_SWORDS:			'\u2694',
	U_FOUNTAIN:			'\u26F2',
	U_FLAG:				'\u2690',
	U_HOURGLASS:		'\u23F3',
	U_HOURGLASS_EMPTY:	'\u231B',
	U_FIRE:				'\u2668',
	U_FLOWER:			"\uD83C\uDF37",
	U_FLORETTE:			'\u2741',
	U_SCALES:			'\u2696',
	U_HAMMER:			'\u2692',
	U_ALCHEMY:			'\u269B',
	U_SHRINE:			'\u26E9',
	U_ENTRANCE:			'\u2A4D',
	U_BED:				'\u29E6',
	U_SNOW:				'\u2744',
	U_HEART:			'\u2665',
	U_SCISSORS:			'\u2702',
	U_HAND:				'\u270B',
	U_ARROW:			'\u27B3',
	U_GEAR:				'\u2699',
	U_QUILL:			'\u2712',
	U_ANCHOR:			'\u2693',
	U_KING:				'\u265A',
	U_SKULL:			'\u2620',
	U_PEACE:			'\u262E',
	U_CHAINS:			'\u26D3',
	U_MARRIAGE:			'\u26AD',
	U_MINERPICK:		'\u26CF',
	U_ROOK:				'\u265C',
	U_KNIGHT:			'\u2658',
	U_BISHOP:			'\u2657',
	U_PAWN:				'\u265F',
	U_FLORAL_REV:		'\u2619',
	U_KEY:				"\uD83D\uDD11",
	U_DIE:				'\u2683',
	U_TEMPLE:			'\u06E9',
	U_INDOOR:			'\u22C2',
	U_KEYBOARD:			'\u2328',
	U_COFFIN:			'\u26B0',
	U_URN:				'\u26B1',
	U_BREAD:			'\uD83C\uDF5E',
	U_CAVE:				'\uD83C\uDF59',
	U_RUNNER:			'\uD83C\uDFC3',
	U_CABIN:			'\u27F0',
	U_SCISSORS:			'\u2702',
	U_COIN:				'\u26C0',
	U_COINS:			'\u26C1',
	U_SCALES:			'\u2696',
	U_SHOP:				'\u2696',
	U_PORTAL:			'\u06DE',
	U_PORTAL_ALT:		'\u06DD',
	U_CHAT:				'\uD83D\uDCAC',
	U_CROSS:			'\u0FC7',
	U_INFO:				'\u2139',
	U_QUEST:			'\u21EA',
	U_RUDDER:			'\u2388',
	U_KARMA:			'\u2318',
	U_SCROLL:			'\u2315',
	U_USED:				'\u270A',
	U_STORAGE:			'\u2617',
	U_HUMAN:			"\uD83D\uDC64",
	U_BOOK:				'\uD83D\uDCD6',
	U_SHOE:				'\uD83D\uDC5E',
	U_TSHIRT:			'\uD83D\uDC55',
	U_PANTS:			"\uD83D\uDC56",
	U_DRESS:			"\uD83D\uDC57",
	U_POUCH:			"\uD83D\uDC5D",
	U_EAR:				"\uD83D\uDC42",
	U_NOSE:				"\uD83D\uDC43",
	U_CROWN:			"\uD83D\uDC51",
	U_GLASSES:			"\uD83D\uDC53",
	U_MEDICINE:			"\uD83C\uDFE5",
	U_KNIFE:		 	"\uD83D\uDD2A",
	U_LANTERN:			"\uD83C\uDFEE",
	U_FIST:				"\uD83D\uDC4A",
	U_ZZZ:				"\uD83D\uDCA4",
	U_SKULL:			"\uD83D\uDC80",
	U_CROSSROAD:		"\uD83D\uDCA2",
	U_ANGER:			"\uD83D\uDCA2",
	U_GROUP:			"\uD83D\uDC65",
	U_HOUSE:			"\uD83C\uDFE0",
	U_CITYHOUSE:		"\uD83C\uDFE2",
	U_SCHOLARLY:		"\uD83C\uDF93",
	U_FRACTURE:			"\uD83D\uDCC8",
	U_STRENGTH:			"\uD83D\uDCAA",
	U_INSPIRATION:		"\uD83C\uDF87",
	U_BED:				"\uD83C\uDFE8",
	U_TREE:				"\uD83C\uDF32",
	U_BULLSEYE:			"\uD83C\uDFAF",
	U_PEACH:			"\uD83C\uDF51",
	U_BOTTLECUP:		"\uD83C\uDF76",
	U_VOLCANO:			"\uD83C\uDF0B",
	U_MALE:				"\u2642",
	U_FEMALE:			"\u2640",
	U_NEUTRAL:			"\u26A5",
	U_BIRD:				"\uD83D\uDC26",
	U_LOCK:				"\uD83D\uDD12",
	U_INBOX:			"\uD83D\uDCEA",
	U_HOME:				"\uD83C\uDFE0",
	U_PENCIL:			"\u270E",
	
	/* nice spell runes at U 0800 - 0815 */
	
	IMPR: {
		"Fynt": "\u26F2 Fountain",
		"R": 	"\uD83C\uDFE2 Residential",
		"Vh": "\uD83C\uDFE0 House",
		"Vhc": "\u2617 House Ruin",
		"Vyb": "\u2692 Factory",
		"Sct": "\u06DE Portal",
		"Zbt": "\u26E9 Marble Shrine"
	},
	
	ANSI: {
		'&n': '\033[0m',
		'&d': '\033[1m', //bold
		'&i': '\033[3m', //italic
		'&u': '\033[4m', //underline
		'&l': '\033[5m', //blink
		'&k': '\033[30m',//black
		'&Ki': '\033[1;3;30m',//black,bold,italic
		'&K': '\033[1;30m',
		'&r': '\033[31m',
		'&Ri': '\033[1;3;31m',//red,bold,italic
		'&R': '\033[1;31m',
		'&g': '\033[32m',
		'&Gi': '\033[1;3;32m',//green,bold,italic
		'&G': '\033[1;32m',
		'&y': '\033[33m',
		'&Y': '\033[1;33m',
		'&b': '\033[34m',
		'&Bi': '\033[1;3;34m',//blue,bold,italic
		'&B': '\033[1;34m',
		'&m': '\033[35m',
		'&M': '\033[1;35m',
		'&c': '\033[36m',
		'&C': '\033[1;36m',
		'&w': '\033[37m',
		'&W': '\033[1;37m'
	},
	
	ANSI256: ['#000', '#B00','#0B0','#BB0','#00B','#B0B','#0BB','#BBB','#555','#F55','#5F5','#FF5','#55F','#F5F','#5FF','#FFF','#000','#005','#008','#00B','#00D','#00F','#050','#055','#058','#05B','#05D','#05F','#080','#085','#088','#08B','#08D','#08F','#0B0','#0B5','#0B8','#0BB','#0BD','#0BF','#0D0','#0D5','#0D8','#0DB','#0DD','#0DF','#0F0','#0F5','#0F8','#0FB','#0FD','#0FF','#500','#505','#508','#50B','#50D','#50F','#550','#555','#558','#55B','#55D','#55F','#580','#585','#588','#58B','#58D','#58F','#5B0','#5B5','#5B8','#5BB','#5BD','#5BF','#5D0','#5D5','#5D8','#5DB','#5DD','#5DF','#5F0','#5F5','#5F8','#5FB','#5FD','#5FF','#800','#805','#808','#80B','#80D','#80F','#850','#855','#858','#85B','#85D','#85F','#880','#885','#888','#88B','#88D','#88F','#8B0','#8B5','#8B8','#8BB','#8BD','#8BF','#8D0','#8D5','#8D8','#8DB','#8DD','#8DF','#8F0','#8F5','#8F8','#8FB','#8FD','#8FF','#B00','#B05','#B08','#B0B','#B0D','#B0F','#B50','#B55','#B58','#B5B','#B5D','#B5F','#B80','#B85','#B88','#B8B','#B8D','#B8F','#BB0','#BB5','#BB8','#BBB','#BBD','#BBF','#BD0','#BD5','#BD8','#BDB','#BDD','#BDF','#BF0','#BF5','#BF8','#BFB','#BFD','#BFF','#D00','#D05','#D08','#D0B','#D0D','#D0F','#D50','#D55','#D58','#D5B','#D5D','#D5F','#D80','#D85','#D88','#D8B','#D8D','#D8F','#DB0','#DB5','#DB8','#DBB','#DBD','#DBF','#DD0','#DD5','#DD8','#DDB','#DDD','#DDF','#DF0','#DF5','#DF8','#DFB','#DFD','#DFF','#F00','#F05','#F08','#F0B','#F0D','#F0F','#F50','#F55','#F58','#F5B','#F5D','#F5F','#F80','#F85','#F88','#F8B','#F8D','#F8F','#FB0','#FB5','#FB8','#FBB','#FBD','#FBF','#FD0','#FD5','#FD8','#FDB','#FDD','#FDF','#FF0','#FF5','#FF8','#FFB','#FFD','#FFF','rgb(8,8,8)','rgb(18,18,18)','rgb(28,28,28)','rgb(38,38,38)','rgb(48,48,48)','rgb(58,58,58)','rgb(68,68,68)','rgb(78,78,78)','rgb(88,88,88)','rgb(98,98,98)','rgb(108,108,108)','rgb(118,118,118)','rgb(128,128,128)','rgb(138,138,138)','rgb(148,148,148)','rgb(158,158,158)','rgb(168,168,168)','rgb(178,178,178)','rgb(188,188,188)','rgb(198,198,198)','rgb(208,208,208)','rgb(218,218,218)','rgb(228,228,228)','rgb(238,238,238)']

};


