config = { 
	
	server: {
		port:		6000, 		/* raw socket server port */
		wsport:		6001, 		/* websocket server port */
		dev:		false, 		/* flag for dev environment */
		dynamic:	true, 		/* allow dynamic loading of scripts when they are modified. otherwise, you can still use reload command */
		language:	'eng', 		/* default language / strings file */
		log: 		'./syslog', /* path to the syslog */
		loglevel:	'medium'	/* low, medium, high */
	},

	db: {
		host:			"localhost",
		user:			"aaralon",
		password:		"uha8Hoo8*",
		database:		"AARALON",
		dialect:		"mysql",
		port:			3306,
		debug:			false 	/* enable to see all queries in syslog. you can toggle debug mode with db.debug(1) and db.debug(0) */
	},
	
	game: {
		name: 'Aaralon',
		version:	0.2,
		start: {
			zone: 'Calandor',
			x: 78,
			y: 29
		},
		allowMultipleUserConnections: false, /* can users with the player role have more than one connection at the same time? */
		allowMultipleCharacters: false, /* can users have more than one character in game at the same time? */
		fbAppId: '1500399353565374', /* Facebook app id: adds support for "Login via Facebook" */
		havoc: 0.3
	}
};