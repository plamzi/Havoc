/* Havoc (c) 2013-2014 */

var events = require('events');
var Seq = require('sequelize');
var database;

module.exports = {
	
	init: function(re) {
		
		debug('db.init');

		database = new Seq(config.db.database, config.db.user, config.db.password, {
			host: config.db.host || 'localhost',
			port: config.db.port || 3306,
			dialect: config.db.dialect,
			logging: function() {},
			define: {
			    underscored: 0,
			    freezeTableName: 1,
			    syncOnAssociation: 1,
			    charset: 'utf8',
			    collate: 'utf8_general_ci',
			    timestamps: 1 
			},
			pool: { maxConnections: 10, maxIdleTime: 1000 }
		});
		
		if (config.db.debug)
			db.debug(1);
			
		db.emit('init');
	},

	define: function() { 
		return (database && database.define) ? database.define.apply(database, arguments) : null;
	},
	
	query: function() { 
		return (database && database.query) ? database.query.apply(database, arguments) : null; 
	},

	debug: function(a) { 
		if (database && database.options) 
			database.options.logging = a ? info : function() {}; 
	},

	conn: function() { return database; }
};