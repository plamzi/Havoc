//#!/usr/bin/env node

/* Havoc (c) 2014 */

/* built-in node.js modules */
var u = require('util');
var net = require('net');
var fs = require('fs');
var path = require('path');
var http = require('http');
var events = require('events');
var domain = require('domain');

/* 3rd party modules */
var ws = require('websocket').server;

module.exports = { 

	/* server(s) boot */
	init: function(re) {
		
		if (re)
			return this.open = 1; /* for now, we do nothing on server component reload but make sure we remain open to new connections */

		this.open = false; /* set to false when server is not accepting connections, e. g. when starting up or shutting down */

		havoc.register('server', 'ready', function() {
			if (!server.open) {
				server.open = 1;
				log('havoc.ready: game servers will now accept connections'.color('&W'));
			}
		});

		/* This is the array we'll use to keep track of all sockets, both raw and websockets */
		my().sockets = [];
		
		var dom = domain.create(); /* The server(s) error domain */
		
		dom.on('error', function(err) {
			error(err.stack);
		});

		dom.run(function() {
			/* Create a raw socket server */
			my().rserver = net.createServer({ allowHalfOpen: false }, server.initRawSocket);
			my().rserver.listen(config.server.port);
		
			log('(rs) socket server listening: port ' + config.server.port);
			
			/* Create a websocket server behind an http server */
			my().wserver = http.createServer(function(req, resp) {
				resp.writeHead(404);
				resp.end();
			}, function(err) {
				log(err);
			});

			//my().wserver.allowHalfOpen = false;
			//my().wserver.httpAllowHalfOpen = false;
			
			my().wserver.listen(config.server.wsport, function() {
				log('(ws) websocket server listening: port ' + config.server.wsport);
			});

			my().wsserver = new ws({
				httpServer: my().wserver,
				autoAcceptConnections: false,
				keepalive: true,
				dropConnectionOnKeepaliveTimeout: false
			})
			.on('request', server.initWebSocket);
		});
	},
	
	initRawSocket: function (s) { /* new client connects to the raw socket server */

		if (!server.open) {
			log('(rs): not open so denied connection from ' + s.remoteAddress);
			s.end?s.end():s.socket.end();
			return;
		}
/*
		if (server.isBanned(s.remoteAddress, 'IP')) {
			log(' (ws): connection from ' + s.remoteAddress + ' rejected (banned).');
			return s.end();
		}
*/
		my().sockets.push(s);
		s.setEncoding('binary');

		s.socket = s; /* conform to the websocket object to make easier to handle */
		
		s.on('data', function(d) { 
			s.do(d);
		})
		.on('error', function(e) { 
			log('(rs) ' + e, s);
		})
		.on('close', function() {
			log('(rs) socket close', s);
			server.closeSocket(s);
		});
		
		log('(rs): new connection from ' + s.remoteAddress);
		server.emit('request', s);
	},

	initWebSocket: function(req) {
		
		/*
		if (!server.originAllowed(req.origin)) {
			req.reject();
			log(' (ws): connection from ' + req.origin + ' rejected (bad origin).');
			return;
		}
		
		if (server.isBanned(request.remoteAddress, 'IP')) {
			request.reject();
			log(' (ws): connection from ' + request.remoteAddress + ' rejected (banned).');
			return;
		}

		 */
		var s = req.accept(null, req.origin);
		my().sockets.push(s);
		
		s.write = function(d) {
			
			if (typeof d == "string")
				d = new Buffer(d);

			try {
				s.sendUTF(d.toString("base64"));
			} catch(ex) {
				error(ex);
			}
			
			return s;
		};
		
		s.on('message', function(msg) {
			
			if (msg.utf8Data)
				msg = msg.utf8Data;

			s.do(msg);
		})
		.on('error', function(e) {
			log(' (ws) ' + e, s);
		})
		.on('close', function() {
			log('(ws) socket close', s);
			server.closeSocket(s);
		});

		log('(ws): new connection', s);
		server.emit('request', s);
	},
	
	/* Executed when client disconnects or is disconnected from either server */
	closeSocket: function(s) {
	
		if (my().sockets.has(s)) {
		
			server.emit('end', s);
			my().sockets.remove(s);
			
			log(u.format('socket removed (%s active)', my().sockets.length));
		}
		else {
			warning('server.closeSocket: socket already removed from index!', s);
		}
		
		s.socket.end();
	},

	getIP: function(req) {
		
		var ip, forwarded = req.headers['x-forwarded-for'];
		
		if (forwarded) 
			ip = forwarded.split(',')[0];

		return ip||req.connection.remoteAddress;
	},

	ban: function(addr, reason, by) {
		return true;
	},

	originAllowed: function(o) {
		return true;
	},
	
	close: function(core) {
		
		warning("server.close: rebooting raw socket and websocket servers");

		var ss = my().sockets;
		
		for (var i in ss) {
			ss[i].snd(my().SERVER_REBOOT).emit('end');
			ss[i].socket.end();
		}
		
		my().wserver.close();
		my().rserver.close();
		
		after(3, function() {
			server.emit('close');
		});
	}
};