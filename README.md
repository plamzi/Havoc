Havoc Web-Based Game Engine
===========================
v0.3 :: Alpha :: Unstable

Havoc is an open source multiplayer RPG game engine in node.js especially suited for realtime social web-based multiplayer games with a lot of interactive rich text. It does not include a physics or particle engine--it comes bundled with a hexagonal world map in which any number of entities can occupy the same hex (maps are linked via portals).


<b>Screenshots:</b>

http://www.cloudgamer.org/images/Havoc1.png

http://www.cloudgamer.org/images/Havoc2.png

http://www.cloudgamer.org/images/Havoc3.png


<b>Live Demos:</b>

http://www.cloudgamer.org/play?host=aaralon.com&havoc=1

(mostly text, very close to what you will get out-of-the-box)


http://www.aaralon.com 

(graphics, requires a Facebook account or existing user at this time, in progress so not fully playable yet)


<b>Features include:</b>

* Modular design that can be extended with components and plugins.

* High persistence (via Sequelize ORM).

* Full localization and UTF-8 support.

* Dynamic code loading for rapid development.

* Support for social network silent authentication.

* Compatibility with third-party tools (Wesnoth map editor, express-admin, codebox) that can accelerate content creation.

* Implementation of a range of protocols to make sending parallel json data, user-readable text, and interactive content, easier.

* A complete set of built-in components and plugins for a generic fantasy game with player guilds, real-time combat, quest engine, item affects and crafting, and a lot more.

* Pairs with a highly responsive websocket client that can be used and customized in the cloud, or hosted locally.


<h2>Installation Notes:</h2>

* Install node.js from: 

https://github.com/joyent/node

* Clone or download this repository:
```
git clone https://github.com/plamzi/Havoc
```
* Modify config.js to include your SQL server credentials. If you are not using MySQL for storage (recommended), you will need to modify the dialect and port settings as well. For example:
```
    db: {
        user:			"DB_USER",
        password:		"DB_USER_PASSWORD",
        database:		"DB_SCHEMA",
        dialect: 		'mysql',
        host:			"localhost",
        port:			3306
    }
```
* Import the included SQL schema with sample content (highly recommended). If you don't import the SQL schema, an empty one will be created by the ORM on first run. However, you may need to perform some additional tweaks, and you will be missing out on a lot of examples. Only start with a clean schema if you intend to immediately strike out on your own in a different direction.

* Optionally, near the top of config.js, modify the ports on which the simple socket and websocket servers for the game should run.
```
	server: {
		port:		6000, 		/* raw socket server port */
		wsport:		6001, 		/* websocket server port */
		dev:		true, 		/* flag for dev environment */
		dynamic:	true, 		/* allow dynamic loading of scripts when modified */
		language:	'eng', 		/* default language / strings file */
		log: 		'./syslog' 	/* path to the syslog */
	}
```
* Optionally, install Node Package Manager if you want to update 3rd party modules ahead of time (no guarantees that the updates will just work):

https://github.com/npm/npm

* On recent Linux distros you can set up an Upstart script by modifying the included havoc.conf and copying it to /etc/init/havoc.conf.

* To set up in-browser content creation:
```
npm install express-admin
```
- edit ./dbadmin/custom.json to point to the /www folder of your havoc directory

- run ./dbadmin.sh and create your admin user as prompted

- maintain the files under ./dbadmin as per the express-admin documentation available here:

http://simov.github.io/express-admin-site/

* To set up in-browser coding:
```
npm install codebox
```
- configure and run ./codebox.sh as per:

https://github.com/CodeboxIDE/codebox


* To set up for map creation, note that the built-in world component can read maps created by the Battle for Wesnoth map editor, which can be downloaded here:

http://www.wesnoth.org/


<h2>Client Notes:</h2>

Although Havoc can be easily adapted to drive any client, it is specifically designed to work out of the box with the web app at http://www.cloudgamer.org/. 

The cloud app allows for deep customizations (and collaborations) via online tools after free site registration. Customizing the cloud app gives you the advantage of receiving automatic improvements without the need to host and maintain your own client.

That said, if you'd like to run your own web client, you can start by grabbing the web app source code. which is available here: 
```
git clone https://github.com/plamzi/MUDPortal-Web-App
```

Once you install Havoc, you should immediately be able to access and play your game server on a tailored web GUI at the following URL:

http://www.cloudgamer.org/play?host=your-host-name&port=your-websocket-port&havoc=1

The port parameter is optional if your websocket server is listening on the default port of 6001.


By default, the cloud app will load the graphical overhead map and will look for your world map images at:

http://your-host-name/world/map-name.jpg

To disable the graphical map, add &map=0 to the URL parameters:

http://www.cloudgamer.org/play?host=your-host-name&port=your-websocket-port&havoc=1&map=0


<h2>License Notes:</h2>

Havoc is made available under the GPLv2 license. The gist of it is that you are free to use and modify the software, including in commercial projects, but you are not permitted to derive work from it (or make it part of a larger work) and license that work differently. Also, you are not allowed to patent derivative work.

Because Havoc is modular, it is possible to develop and publish commercial components and plugins for it, as well as closed-source extensions whose code is yours to license as you see fit. However, if you modify the extensions that come with Havoc, the rules above apply and you have to make those modifications available under GPLv2.

The license applies to all files with a header specifying that they are part of Havoc. It covers all files and folder trees listed below (subject to additions and changes):

havoc.js
havoc.sql.zip
config.js
util.js
components/
languages/
plugins/
quests/
world/
www/


Contributing to Havoc:

All GitHub pull requests will be considered. In the early days, priority will be given to stability-related changes. 

In addition, you can reach the author via the Havoc forum at http://www.cloudgamer.org/forums. This is also the place where you can discuss any topics that are outside the scope of the GitHub Issues page.