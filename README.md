Havoc Web-Based Game Engine
===========================

Havoc is an open source multiplayer RPG game engine in node.js especially suited for social web-based multiplayer games with a lot of interactive rich text.

Screenshot:

http://www.cloudgamer.org/images/Havoc1.png


Features include:

* Modular design.

* High persitence (via node-sequelize).

* Full localization and UTF-8 support.

* Dynamic code loading for rapid development.

* Support for social network silent authentication.

* Smart leveraging of third-party tools to accelerate content creation.

* Implementation of a range of protocols to make sending data (json), user-readable text, and interactive text, easier.

* A complete set of built-in components and plugins for a generic fantasy game with player guilds, real-time combat, quest engine, item affects and crafting, and a lot more.


Installation Notes:

* Install node.js: 

https://github.com/joyent/node

* Clone or download this repository:

git clone https://github.com/plamzi/Havoc

* Modify config.js to include your SQL server credentials. If you are not using MySQL for storage (recommended), you will need to modify the dialect and port settings as well. For example:

config = { 

...

    db: {
        user:			"DB_USER",
        password:		"DB_USER_PASSWORD",
        database:		"DB_SCHEMA",
        dialect: 		'mysql',
        host:			"localhost",
        port:			3306
    }

...

* Import the included SQL schema with sample content (highly recommended). If you don't import the SQL schema, an empty one will be created by the ORM on first run. However, you may need to perform some additional tweaks, and you will be missing out on a lot of examples. Only start with a clean schema if you intend to immediately strike out on your own in a different direction.

** Optionally, near the top of config.js, modify the ports on which the simple socket and websocket servers for the game should run.

config = { 

	server: {
		port:		6000, 		/* raw socket server port */
		wsport:		6001, 		/* Websocket server port */
		dev:		true, 		/* flag for dev environment */
		dynamic:	true, 		/* allow dynamic loading of scripts when they are modified. otherwise, you can still use reload command */
		language:	'eng', 		/* default language / strings file */
		log: 		'./syslog' 	/* path to the syslog */
	},
...
	
** Optionally, install Node Package Manager to be able to update 3rd party scripts ahead of time:

https://github.com/npm/npm


Client Notes:

Although Havoc can be easily adapted to drive any client, it is specifically designed to work out of the box with the web app at http://www.cloudgamer.org/. 

The cloud app allows for deep customizations via online tools after free site registration. Customizing the cloud app gives you the advantage of receiving automatic improvements without the need to host and maintain your own client.

That said, if you'd like to run your own web client, you can start by grabbing the web app source code. which is available here: 

https://github.com/plamzi/MUDPortal-Web-App

Once you install Havoc, you will immediately be able to play your game server on an interactive-text GUI at the following URL:

http://www.cloudgamer.org/play?host=your-host-name&port=your-websocket-port&havoc=1

By default, the cloud app will load the graphical overhead map and will look for your world map images at:

http://your-host-name/world/map-name.jpg

To disable the graphical map, add &map=0 to the URL parameters:

http://www.cloudgamer.org/play?host=your-host-name&port=your-websocket-port&havoc=1&map=0