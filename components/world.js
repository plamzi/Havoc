/* Havoc (c) 2014 */

/* 
	The world component below is fully compatible with Battle of Wesnoth maps.
	This means you can use the graphical map editor of that free game to rapidly
	lay out very large worlds. If you don't like hexagonal grids, you can still
	design the maps with the editor--they are actually 
	

*/

var fs = require('fs');
var Seq = require('sequelize');


/* 	As part of the design for this world, we don't load individual 
	rooms into the database (that way we can have millions w/o much overhead).
	Instead, we treat the Battle of Wesnoth map files as masters
	and overlay everything on top of them, such as portals and room procs: */

	
var portal_struct = {
	
	name: Seq.STRING,
	
	verb: Seq.STRING,
	
	/* 	All locations are currently stored in flexible stringified objects.
		This means they can be anything you need to determine a location. */
		
	from: {
		type: Seq.STRING,
		get: function() {
			return eval('('+this.getDataValue('from')+')');
		},
		set: function(v) {
			this.setDataValue('from', stringify(v));
		}
	},
	
	to: {
		type: Seq.STRING,
		get: function() {
			return eval('('+this.getDataValue('to')+')');
		},
		set: function(v) {
			this.setDataValue('to', stringify(v));
		}
	},
	
	/* placeholder for additional attributes, e. g. for restricting portal access */
	attr: {
		
		type: Seq.TEXT,
		
		allowNull: false,
		
		get: function() {
			return eval('('+this.getDataValue('attr')+')');
		},
		
		set: function(v) {
			this.setDataValue('attr', stringify(v));
		},
		
		//defaultValue: {}
	}
};

addStrings({

	eng: {

		DIR: ['north', 'east', 'south', 'west'],
		
		HEXDIR: ['north', 'northeast', 'northwest', 'south', 'southeast', 'southwest'], /* used in path-finding, and savvy users can type diagonals as well */
		
		REVDIR: {
			south: 'north',
			east: 'west', 
			north: 'south',
			west: 'east',
			southeast: 'northwest',
			northeast: 'southwest',
			southwest: 'northeast',
			northwest: 'southeast',
			up: 'down',
			down: 'up'
		},

		DIR_OFFSET: {
			north: 		[ 0, -1, 0],
			south: 		[ 0, +1, 0],
			east:  		[+1, 0,  0],
			west:  		[-1, 0,  0],
			northeast:  [+1, -1, 0],
			northwest:  [-1, -1, 0],
			southeast:  [+1, +1, 0],
			southwest:  [-1, +1, 0]
		},
		
		/* This is used to simplify manual movement down to 4 commands (n, s, e, w) instead of the "actual" 6 */
		DIR_EVEN: {
			northeast: 'east',
			northwest: 'west',
			east: 'east',
			west: 'west',
			southeast: 'southeast',
			southwest: 'southwest'
		},

		DIR_ODD: {
			southeast: 'east',
			southwest: 'west',
			east: 'east',
			west: 'west',
			northwest: 'northwest',
			northeast: 'northeast'
		},
		
		
	TERRAIN: {
		"A": "\u2744 Arctic",
		"B": "\u1172 Bridge",
		"C": my().U_CASTLE + " Castle",
		"D": "\u0601 Desert",
		"E": "",
		"F": my().U_TREE + " Forest",
		"G": "\u1689 Grass",
		"H": "\u2652 Hills",
		"I": "\u22C2 Interior",
		"K": my().U_CASTLE + " Keep",
		"M": my().U_MOUNTAINS + " Mountains",
		"Q": "\u2718 Unwalkable",
		"R": "\u275A Road",
		"S": "\u2243 Swamp",
		"U": "\u2A66 Underground",
		"V": my().U_HOUSE + " Village",
		"W": "\u0F04 Water",
		"X": "\u2718 Impassable",
	   "\\": "\u250F Bridge-left",
		"|": "\u2533 Bridge-middle",
		"/": "\u2513 Bridge-right",
		"a": "\u2744 Snowy",
		"c": "\u259F City",
		"d": "\u0601 Desert",
		"e": "\u26FA Camp",
		"f": my().U_FLOWER + " Flowers",
		"h": my().U_HUMAN + " Human",
		"i": "\u2746 Ice",
		"l": my().U_VOLCANO + " Lava",
		"m": "",
		"o": "\u1699 Orc",
		"p": "\u2E19 Pine",
		"s": "",
		"u": "\u2A66 Underground",
		"v": "\u06E9 Elven",
		"x": "\u2620 Chasm",

		"Wog": { name:"Gray Deep Water", img:"ocean-grey-tile.png", alias:"Wo", group:"water" },
		"Wo": { name:"Medium Deep Water", img:"ocean-tile.png", alias:"", group:"water" },
		"Wot": { name:"Tropical Deep Water", img:"ocean-tropical-tile.png", alias:"Wo", group:"water" },
		"Wwg": { name:"Gray Shallow Water", img:"coast-grey-tile.png", alias:"Ww", group:"water" },
		"Ww": { name:"Medium Shallow Water", img:"coast-tile.png", alias:"", group:"water" },
		"Wwt": { name:"Tropical Shallow Water", img:"coast-tropical-tile.png", alias:"Ww", group:"water" },
		"Wwf": { name:"Ford", img:"ford-tile.png", alias:"Gt, Ww", group:"water" },
		"Wwrg": { name:"Gray Coastal Reef", img:"reef-gray-tile.png", alias:"Wwr", group:"water" },
		"Wwr": { name:"Coastal Reef", img:"reef-tile.png", alias:"", group:"water" },
		"Wwrt": { name:"Tropical Coastal Reef", img:"reef-tropical-tile.png", alias:"Wwr", group:"water" },
		"Ss": { name:"Swamp", img:"water-tile.png", alias:"", group:"water" },
		"Sm": { name:"Muddy Quagmire", img:"mud-tile.png", alias:"Ss", group:"water" },
		"Gg": { name:"Green Grass", img:"green.png", alias:"Gt", group:"flat" },
		"Gs": { name:"Semi-dry Grass", img:"semi-dry.png", alias:"Gt", group:"flat" },
		"Gd": { name:"Dry Grass", img:"dry.png", alias:"Gt", group:"flat" },
		"Gll": { name:"Leaf Litter", img:"leaf-litter.png", alias:"Gt", group:"flat,fall" },
		"Rb": { name:"Dark Dirt", img:"dirt-dark.png", alias:"Gt", group:"flat" },
		"Re": { name:"Regular Dirt", img:"dirt.png", alias:"Gt", group:"flat" },
		"Rd": { name:"Dry Dirt", img:"desert-road.png", alias:"Gt", group:"desert, flat" },
		"Rr": { name:"Regular Cobbles", img:"road.png", alias:"Gt", group:"flat" },
		"Rrc": { name:"Clean Gray Cobbles", img:"road-clean.png", alias:"Gt", group:"flat" },
		"Rp": { name:"Overgrown Cobbles", img:"stone-path.png", alias:"Gt", group:"flat" },
		"Ai": { name:"Ice", img:"ice.png", alias:"At", group:"frozen" },
		"Aa": { name:"Snow", img:"snow.png", alias:"At", group:"frozen" },
		"Dd": { name:"Desert Sands", img:"desert.png", alias:"Ds", group:"desert" },
		"Ds": { name:"Beach Sands", img:"beach.png", alias:"", group:"desert" },
		"^Do": { name:"Oasis", img:"desert-oasis.png", alias:"_bas", group:"desert, forest" },
		"^Dr": { name:"Rubble", img:"rubble-tile.png", alias:"_bas, Hh", group:"desert, rough" },
		"Dd^Dc": { name:"Crater", img:"crater.png", alias:"Ds", group:"desert" },
		"^Efm": { name:"Mixed Flowers", img:"flowers-mixed.png", alias:"_bas", group:"embellishments" },
		"^Gvs": { name:"Farmland", img:"farm-veg-spring-icon.png", alias:"_bas", group:"embellishments" },
		"^Es": { name:"Stones", img:"stones-small7.png", alias:"_bas", group:"embellishments" },
		"^Em": { name:"Small Mushrooms", img:"mushroom.png", alias:"_bas", group:"embellishments" },
		"^Emf": { name:"Mushroom Farm", img:"mushroom-farm-small.png", alias:"_bas", group:"embellishments,cave" },
		"^Edp": { name:"Desert Plants", img:"desert-plant5.png", alias:"_bas", group:"embellishments, desert" },
		"^Edpp": { name:"Desert Plants without Bones", img:"desert-plant.png", alias:"_bas", group:"embellishments, desert" },
		"^Wm": { name:"Windmill", img:"windmill-embellishment-tile.png", alias:"_bas", group:"embellishments" },
		"^Ecf": { name:"Campfire", img:"fire-A01.png", alias:"_bas", group:"embellishments" },
		"^Eff": { name:"Fence", img:"fence-se-nw-01.png", alias:"_bas", group:"embellishments" },
		"^Esd": { name:"Stones with Sand Drifts", img:"rocks.png", alias:"_bas", group:"embellishments, desert" },
		"^Ewl": { name:"Water Lilies", img:"water-lilies-tile.png", alias:"_bas", group:"water,embellishments" },
		"^Ewf": { name:"Flowering Water Lilies", img:"water-lilies-flower-tile.png", alias:"_bas", group:"water,embellishments" },
		"^Fet": { name:"Great Tree", img:"great-tree-tile.png", alias:"_bas,Ft", group:"forest" },
		"^Fetd": { name:"Dead Great Tree", img:"great-tree-dead-tile.png", alias:"_bas,Ft", group:"forest" },
		"^Ft": { name:"Tropical Forest", img:"jungle-tile.png", alias:"_bas,Ft", group:"forest" },
		"^Ftr": { name:"Rainforest", img:"rainforest-tile.png", alias:"_bas,Ft", group:"forest" },
		"^Ftd": { name:"Palm Forest", img:"palm-desert-tile.png", alias:"_bas,Ft", group:"forest,desert" },
		"^Ftp": { name:"Dense Palm Forest", img:"palms-tile.png", alias:"_bas,Ft", group:"forest" },
		"^Fts": { name:"Savanna", img:"savanna-tile.png", alias:"_bas,Ft", group:"forest,desert" },
		"^Fp": { name:"Pine Forest", img:"pine-tile.png", alias:"_bas,Ft", group:"forest" },
		"^Fpa": { name:"Snowy Pine Forest", img:"snow-forest-tile.png", alias:"_bas,At,Ft", group:"frozen, forest" },
		"^Fds": { name:"Summer Deciduous Forest", img:"deciduous-summer-tile.png", alias:"_bas,Ft", group:"forest" },
		"^Fdf": { name:"Fall Deciduous Forest", img:"deciduous-fall-tile.png", alias:"_bas,Ft", group:"forest, fall" },
		"^Fdw": { name:"Winter Deciduous Forest", img:"deciduous-winter-tile.png", alias:"_bas,Ft", group:"forest, fall" },
		"^Fda": { name:"Snowy Deciduous Forest", img:"deciduous-winter-snow-tile.png", alias:"_bas,At,Ft", group:"frozen, forest" },
		"^Fms": { name:"Summer Mixed Forest", img:"mixed-summer-tile.png", alias:"_bas,Ft", group:"forest" },
		"^Fmf": { name:"Fall Mixed Forest", img:"mixed-fall-tile.png", alias:"_bas,Ft", group:"forest, fall" },
		"^Fmw": { name:"Winter Mixed Forest", img:"mixed-winter-tile.png", alias:"_bas,Ft", group:"forest, fall" },
		"^Fma": { name:"Snowy Mixed Forest", img:"mixed-winter-snow-tile.png", alias:"_bas,At,Ft", group:"frozen, forest" },
		"Hh": { name:"Regular Hills", img:"regular.png", alias:"", group:"rough" },
		"Hhd": { name:"Dry Hills", img:"dry.png", alias:"Hh", group:"rough" },
		"Hd": { name:"Dunes", img:"desert.png", alias:"Ds, Hh", group:"desert, rough" },
		"Ha": { name:"Snow Hills", img:"snow.png", alias:"At, Hh", group:"frozen, rough" },
		"Mm": { name:"Mountains", img:"basic-tile.png", alias:"", group:"rough" },
		"Md": { name:"Dry Mountains", img:"dry-tile.png", alias:"Mm", group:"rough, desert" },
		"Ms": { name:"Snowy Mountains", img:"snow-tile.png", alias:"At, Mm", group:"rough, frozen" },
		"Hh^Fp": { name:"Forested Hills", img:"forested-hills-tile.png", alias:"Hh,Ft", group:"forest, rough" },
		"Ha^Fpa": { name:"Forested Snow Hills", img:"forested-snow-hills-tile.png", alias:"Hh,At,Ft", group:"forest, rough, frozen" },
		"Hh^Fds": { name:"Summer Deciduous Forested Hills", img:"forested-deciduous-summer-hills-tile.png", alias:"Hh,Ft", group:"forest, rough" },
		"Hhd^Fdf": { name:"Fall Deciduous Forested Hills", img:"forested-deciduous-fall-hills-tile.png", alias:"Hh,Ft", group:"forest, rough, fall" },
		"Hhd^Fdw": { name:"Winter Deciduous Forested Hills", img:"forested-deciduous-winter-hills-tile.png", alias:"Hh,Ft", group:"forest, rough, fall" },
		"Ha^Fda": { name:"Snowy Deciduous Forested Hills", img:"forested-deciduous-winter-snow-hills-tile.png", alias:"Hh,At,Ft", group:"frozen, forest, rough" },
		"Hh^Fms": { name:"Summer Mixed Forested Hills", img:"forested-mixed-summer-hills-tile.png", alias:"Hh,Ft", group:"forest, rough" },
		"Hhd^Fmf": { name:"Fall Mixed Forested Hills", img:"forested-mixed-fall-hills-tile.png", alias:"Hh,Ft", group:"forest, rough, fall" },
		"Hhd^Fmw": { name:"Winter Mixed Forested Hills", img:"forested-mixed-winter-hills-tile.png", alias:"Hh,Ft", group:"forest, rough, fall" },
		"Ha^Fma": { name:"Snowy Mixed Forested Hills", img:"forested-mixed-winter-snow-hills-tile.png", alias:"Hh,At,Ft", group:"frozen, forest, rough" },
		"Hh^Ft": { name:"Tropical Forested Hills", img:"jungle-hills-tile.png", alias:"Hh,Ft", group:"forest, rough" },
		"Hd^Ftd": { name:"Palm Forested Hills", img:"palms-on-dunes-tile.png", alias:"Hh,Ds,Ft", group:"desert, forest, rough" },
		"Hh^Ftp": { name:"Dense Palm Forested Hills", img:"palms-on-hills-tile.png", alias:"Hh,Ft", group:"forest, rough" },
		"Hhd^Fts": { name:"Savanna Forested Hills", img:"savanna-hills-tile.png", alias:"Hh,Ft", group:"forest, rough" },
		"Iwr": { name:"Basic Wooden Floor", img:"wood-regular.png", alias:"Gt", group:"flat" },
		"^Ii": { name:"Beam of Light", img:"beam-tile.png", alias:"_bas", group:"cave" },
		"Uu": { name:"Cave Floor", img:"floor6.png", alias:"", group:"cave" },
		"Uue": { name:"Earthy Cave Floor", img:"earthy-floor3.png", alias:"Uu", group:"cave" },
		"Urb": { name:"Dark Flagstones", img:"flagstones-dark.png", alias:"Gt", group:"cave, flat" },
		"Ur": { name:"Cave Path", img:"path.png", alias:"Gt", group:"cave" },
		"^Uf": { name:"Mushroom Grove", img:"mushrooms-tile.png", alias:"", group:"cave, forest" },
		"^Ufi": { name:"Lit Mushroom Grove", img:"mushrooms-beam-tile.png", alias:"^Uf", group:"cave" },
		"Uh": { name:"Rockbound Cave", img:"hills-variation.png", alias:"Uu, Hh", group:"cave, rough" },
		"^Br|": { name:"Mine Rail", img:"rails-n-s.png", alias:"_bas,Rt", group:"cave" },
		"^Br/": { name:"Mine Rail", img:"rails-ne-sw.png", alias:"_bas,Rt", group:"cave" },
		"^Br\\": { name:"Mine Rail", img:"rails-se-nw.png", alias:"_bas,Rt", group:"cave" },
		"Qxu": { name:"Regular Chasm", img:"regular-tile.png", alias:"Qt", group:"cave, obstacle" },
		"Qxe": { name:"Earthy Chasm", img:"earthy-tile.png", alias:"Qt", group:"cave, obstacle" },
		"Qxua": { name:"Ethereal Abyss", img:"abyss-tile.png", alias:"Qt", group:"cave, obstacle" },
		"Ql": { name:"Lava Chasm", img:"lava-chasm-tile.png", alias:"Qt", group:"cave, obstacle" },
		"Qlf": { name:"Lava", img:"lava.png", alias:"Qt", group:"cave, obstacle" },
		"^Rh": { name:"City House", img:"", alias:"", group:"village" },
		"Mv": { name:"Volcano", img:"volcano-tile.png", alias:"Qt", group:"rough, obstacle" },
		"Mm^Xm": { name:"Regular Impassable Mountains", img:"cloud-tile.png", alias:"Xt", group:"rough,obstacle" },
		"Md^Xm": { name:"Desert Impassable Mountains", img:"cloud-desert-tile.png", alias:"Xt", group:"rough,obstacle,desert" },
		"Ms^Xm": { name:"Snowy Impassable Mountains", img:"cloud-snow-tile.png", alias:"Xt", group:"rough,obstacle,frozen" },
		"Xu": { name:"Natural Cave Wall", img:"wall-rough-tile.png", alias:"Xt", group:"cave,obstacle" },
		"Xuc": { name:"Hewn Cave Wall", img:"wall-hewn-tile.png", alias:"Xt", group:"cave,obstacle" },
		"Xue": { name:"Natural Earthy Cave Wall", img:"earthy-wall-rough-tile.png", alias:"Xt", group:"cave,obstacle" },
		"Xuce": { name:"Reinforced Earthy Cave Wall", img:"earthy-wall-hewn-tile.png", alias:"Xt", group:"cave,obstacle" },
		"Xos": { name:"Stone Wall", img:"wall-stone-tile.png", alias:"Xt", group:"cave,obstacle" },
		"Xol": { name:"Lit Stone Wall", img:"wall-stone-lit-tile.png", alias:"Xt", group:"cave,obstacle" },
		"^Xo": { name:"Impassable Overlay", img:"impassable-editor.png", alias:"_bas,Xt", group:"special" },
		"^Qov": { name:"Unwalkable Overlay", img:"unwalkable-editor.png", alias:"_bas,Qt", group:"special" },
		"Xv": { name:"Void", img:"void-editor.png", alias:"Xt", group:"obstacle, special" },
		"^Vda": { name:"Adobe Village", img:"desert-tile.png", alias:"_bas, Vi", group:"village, desert" },
		"^Vdt": { name:"Desert Tent Village", img:"desert-camp-tile.png", alias:"_bas, Vi", group:"village, desert" },
		"^Vct": { name:"Tent Village", img:"camp-tile.png", alias:"_bas, Vi", group:"village" },
		"^Vo": { name:"Orcish Village", img:"orc-tile.png", alias:"_bas, Vi", group:"village" },
		"^Voa": { name:"Snowy Orcish Village", img:"orc-snow-tile.png", alias:"_bas, Vi", group:"village, frozen" },
		"^Vea": { name:"Snowy Elven Village", img:"elven-snow-tile.png", alias:"_bas, Vi", group:"village, frozen" },
		"^Ve": { name:"Elven Village", img:"elven-tile.png", alias:"_bas, Vi", group:"village" },
		"^Vh": { name:"Cottage", img:"human-tile.png", alias:"_bas, Vi", group:"village" },
		"^Vha": { name:"Snowy Cottage", img:"snow-tile.png", alias:"_bas, Vi", group:"village, frozen" },
		"^Vhr": { name:"Ruined Cottage", img:"human-cottage-ruin-tile.png", alias:"_bas, Vi", group:"village" },
		"^Vhc": { name:"Human City", img:"human-city-tile.png", alias:"_bas, Vi", group:"village" },
		"^Vwm": { name:"Windmill Village", img:"windmill-tile.png", alias:"_bas, Vi", group:"village" },
		"^Vhca": { name:"Snowy Human City", img:"human-city-snow-tile.png", alias:"_bas, Vi", group:"village" },
		"^Vhcr": { name:"Ruined Human City", img:"human-city-ruin-tile.png", alias:"_bas, Vi", group:"village" },
		"^Vhh": { name:"Hill Stone Village", img:"human-hills-tile.png", alias:"_bas, Vi", group:"village, rough" },
		"^Vhha": { name:"Snowy Hill Stone Village", img:"human-snow-hills-tile.png", alias:"_bas, Vi", group:"village, frozen, rough" },
		"^Vhhr": { name:"Ruined Hill Stone Village", img:"human-hills-ruin-tile.png", alias:"_bas, Vi", group:"village, rough" },
		"^Vht": { name:"Tropical Village", img:"tropical-tile.png", alias:"_bas, Vi", group:"village" },
		"^Vd": { name:"Drake Village", img:"drake-tile.png", alias:"_bas, Vi", group:"village" },
		"^Vu": { name:"Cave Village", img:"cave-tile.png", alias:"_bas, Vi", group:"village, cave" },
		"^Vud": { name:"Dwarven Village", img:"dwarven-tile.png", alias:"_bas, Vi", group:"village, cave" },
		"^Vc": { name:"Hut", img:"hut-tile.png", alias:"_bas, Vi", group:"village" },
		"^Vca": { name:"Snowy Hut", img:"hut-snow-tile.png", alias:"_bas, Vi", group:"village, frozen" },
		"^Vl": { name:"Log Cabin", img:"log-cabin-tile.png", alias:"_bas, Vi", group:"village" },
		"^Vla": { name:"Snowy Log Cabin", img:"log-cabin-snow-tile.png", alias:"_bas, Vi", group:"village, frozen" },
		"^Vaa": { name:"Igloo", img:"igloo-tile.png", alias:"_bas, Vi", group:"village, frozen" },
		"^Vhs": { name:"Swamp Village", img:"swampwater-tile.png", alias:"_bas, Vi", group:"water, village" },
		"^Vm": { name:"Merfolk Village", img:"coast-tile.png", alias:"_bas", group:"water, village" },
		"^Vov": { name:"Village Overlay", img:"village-overlay-editor.png", alias:"_bas", group:"village, special" },
		"Ce": { name:"Encampment", img:"regular-tile.png", alias:"Ch", group:"castle" },
		"Cea": { name:"Snowy Encampment", img:"snow-tile.png", alias:"Ch", group:"castle, frozen" },
		"Co": { name:"Orcish Castle", img:"tile.png", alias:"Ch", group:"castle" },
		"Coa": { name:"Snowy Orcish Castle", img:"tile.png", alias:"Ch", group:"castle, frozen" },
		"Ch": { name:"Human Castle", img:"castle-tile.png", alias:"", group:"castle" },
		"Cha": { name:"Snowy Human Castle", img:"castle-tile.png", alias:"Ch, At", group:"castle, frozen" },
		"Cv": { name:"Elvish Castle", img:"tile.png", alias:"Ch", group:"castle" },
		"Cud": { name:"Dwarven Castle", img:"dwarven-castle-tile.png", alias:"Ch", group:"castle, cave" },
		"Chr": { name:"Ruined Human Castle", img:"ruin-tile.png", alias:"Ch", group:"castle" },
		"Chw": { name:"Sunken Human Ruin", img:"sunken-ruin-tile.png", alias:"Ch, Ww", group:"castle, water" },
		"Chs": { name:"Swamp Human Ruin", img:"swamp-ruin-tile.png", alias:"Ch, Ss", group:"castle, water" },
		"Cd": { name:"Desert Castle", img:"tile.png", alias:"Ch", group:"castle, desert" },
		"Cdr": { name:"Ruined Desert Castle", img:"ruin-tile.png", alias:"Ch", group:"castle, desert" },
		"Ke": { name:"Encampment Keep", img:"regular-keep-tile.png", alias:"Ch", group:"castle" },
		"Ket": { name:"Tall Encampment Keep", img:"tall-keep-tile.png", alias:"Ch", group:"castle" },
		"Kea": { name:"Snowy Encampment Keep", img:"snow-keep-tile.png", alias:"Ch", group:"castle, frozen" },
		"Ko": { name:"Orcish Keep", img:"keep-tile.png", alias:"Ch", group:"castle" },
		"Koa": { name:"Snowy Orcish Keep", img:"keep-tile.png", alias:"Ch", group:"castle, frozen" },
		"Kh": { name:"Human Castle Keep", img:"keep-tile.png", alias:"Ch", group:"castle" },
		"Kha": { name:"Snowy Human Castle Keep", img:"keep-tile.png", alias:"Ch, At", group:"castle, frozen" },
		"Kv": { name:"Elven Castle Keep", img:"keep-tile.png", alias:"Ch", group:"castle" },
		"Kud": { name:"Dwarven Castle Keep", img:"dwarven-keep-tile.png", alias:"Ch", group:"castle, cave" },
		"Khr": { name:"Ruined Human Castle Keep", img:"ruined-keep-tile.png", alias:"Ch", group:"castle" },
		"Khw": { name:"Sunken Human Castle Keep", img:"sunken-keep-tile.png", alias:"Ch, Ww", group:"castle, water" },
		"Khs": { name:"Swamp Human Castle Keep", img:"swamp-keep-tile.png", alias:"Ch, Ss", group:"castle, water" },
		"Kd": { name:"Desert Keep", img:"keep-tile.png", alias:"Ch", group:"castle, desert" },
		"Kdr": { name:"Ruined Desert Keep", img:"ruin-keep-tile.png", alias:"Ch", group:"castle, desert" },
		"^Cov": { name:"Castle Overlay", img:"castle-overlay-editor.png", alias:"_bas", group:"castle, special" },
		"^Kov": { name:"Keep Overlay", img:"keep-overlay-editor.png", alias:"_bas", group:"castle, special" },
		"^Bw|": { name:"Wooden Bridge", img:"wood-n-s.png", alias:"_bas, Gt", group:"bridge, water" },
		"^Bw/": { name:"Wooden Bridge", img:"wood-ne-sw.png", alias:"_bas, Gt", group:"bridge, water" },
		"^Bw\\": { name:"Wooden Bridge", img:"wood-se-nw.png", alias:"_bas, Gt", group:"bridge, water" },
		"^Bw|r": { name:"Rotting Bridge", img:"wood-rotting-n-s.png", alias:"_bas, Gt", group:"bridge, water" },
		"^Bw/r": { name:"Rotting Bridge", img:"wood-rotting-ne-sw.png", alias:"_bas, Gt", group:"bridge, water" },
		"^Bw\r": { name:"Rotting Bridge", img:"wood-rotting-se-nw.png", alias:"_bas, Gt", group:"bridge, water" },
		"^Bsb|": { name:"Basic Stone Bridge", img:"stonebridge-n-s-tile.png", alias:"_bas, Gt", group:"bridge,water" },
		"^Bsb\\": { name:"Basic Stone Bridge", img:"stonebridge-se-nw-tile.png", alias:"_bas, Gt", group:"bridge,water" },
		"^Bsb/": { name:"Basic Stone Bridge", img:"stonebridge-ne-sw-tile.png", alias:"_bas, Gt", group:"bridge,water" },
		"^Bs|": { name:"Cave Chasm Bridge", img:"chasm-stone-bridge-s-n-tile.png", alias:"Uu,_bas", group:"bridge, cave" },
		"^Bs/": { name:"Cave Chasm Bridge", img:"chasm-stone-bridge-sw-ne-tile.png", alias:"Uu,_bas", group:"bridge, cave" },
		"^Bs\\": { name:"Cave Chasm Bridge", img:"chasm-stone-bridge-se-nw-tile.png", alias:"Uu,_bas", group:"bridge, cave" },
		"^Bh\\": { name:"Hanging Bridge", img:"hanging-se-nw-tile.png", alias:"_bas, Gt", group:"bridge, cave" },
		"^Bh/": { name:"Hanging Bridge", img:"hanging-sw-ne-tile.png", alias:"_bas, Gt", group:"bridge, cave" },
		"^Bh|": { name:"Hanging Bridge", img:"hanging-s-n-tile.png", alias:"_bas, Gt", group:"bridge, cave" },
		"^Bcx\\": { name:"Stone Chasm Bridge", img:"chasm-se-nw-tile.png", alias:"_bas, Gt", group:"bridge, cave" },
		"^Bcx/": { name:"Stone Chasm Bridge", img:"chasm-sw-ne-tile.png", alias:"_bas, Gt", group:"bridge, cave" },
		"^Bcx|": { name:"Stone Chasm Bridge", img:"chasm-s-n-tile.png", alias:"_bas, Gt", group:"bridge, cave" },
		"^Bp\\": { name:"Plank Bridge", img:"planks-se-nw-tile.png", alias:"_bas, Gt", group:"bridge, cave" },
		"^Bp/": { name:"Plank Bridge", img:"planks-sw-ne-tile.png", alias:"_bas, Gt", group:"bridge, cave" },
		"^Bp|": { name:"Plank Bridge", img:"planks-s-n.png", alias:"_bas, Gt", group:"bridge, cave" },
		"_off^_usr": { name:"Off Map", img:"offmap-editor.png", alias:"", group:"special, obstacle" },
		"^_fme": { name:"Experimental Fake Map Edge", img:"border-ne-se-s-sw-nw-n.png", alias:"", group:"special, obstacle" },
		"_s": { name:"Shroud", img:"shroud-editor.png", alias:"", group:"special" },
		"_f": { name:"Fog", img:"fog-editor.png", alias:"", group:"special" },
	},

	
	}
});

module.exports = {

	init: function(re) {

		debug('world.init');

		this.loadMaps(re);
		this.loadOverlays(re);
	},
	
	loadMaps: function(re) {

		var maps = fs.readdirSync('./world/').filter(function(i) { return i.has('.map'); });

		if (!re)
			my().zone = {};

		for (var i in maps) {
			
			var n = 0;
			var map = {
				zone: maps[i].split('.')[0],
				grid: function() { return fs.readFileSync('./world/' + maps[i], 'utf8'); }(),
				actors: {},
				items: {},
				portals: {}
			};
			
			map.grid = map.grid.split('\n').slice(3, -1); /* remove header */
			
			for (var y = 0; y < map.grid.length; y++) {
				
				map.grid[y] = map.grid[y].split(',');
				
				for (var x = 0; x < map.grid[y].length; x++) {

					/* small hack to make custom city house tiles accessible */
					map.grid[y][x] = map.grid[y][x].trim().replace('Rr^Rhx', 'Rr^Rh').replace('Rr^Vhx', 'Rr^Vh');
					var id = x + 'x' + y;
					
					/* hash room contents for best performance. copy over contents on reload */
					if (re) {
						map.actors[id] = my().zone[map.zone].actors[id] || [];
						map.items[id] = my().zone[map.zone].items[id] || [];
					}
					else {
						map.actors[id] = [];
						map.items[id] = [];
					}
					
					map.grid[y][x].toLowerCase().has('x')||n++; /* let's log how many accessible rooms an area has */
				}
			}

			my().zone[map.zone] = map;
			info('world.init: loaded map ' + map.zone + ': ' + map.grid[0].length + 'x' + map.grid.length + ' accessible rooms: ' + n + '/' + Object.keys(map.items).length);
		}

		info('world.init: Finished loading maps');
	},

	loadMapInstance: function(re, proto, id) {
		
		var z = my().zone[proto];
		
		if (!z)
			return warning('world.loadMapInstance called with invalid proto zone id: ' + proto);
		
		var map = {
			proto: proto,
			zone: id,
			grid: z.grid,
			actors: {},
			items: {},
			portals: {}
		};
		
		for (var y = 0; y < map.grid.length; y++) {
			
			for (var x = 0; x < map.grid[y].length; x++) {
				
				var id = x + 'x' + y;
				
				/* hash room contents for best performance. copy over contents on reload */
				if (my().zone[map.zone]) {
					map.actors[id] = my().zone[map.zone].actors[id] || [];
					map.items[id] = my().zone[map.zone].items[id] || [];
				}
				else {
					map.actors[id] = [];
					map.items[id] = [];
				}
			}
		}
		
		my().zone[map.zone] = map;
		info('world.loadMapInstance: loaded ' + map.zone + ' / ' + map.proto + ': ' + map.grid[0].length + 'x' + map.grid.length);
	},
	
	loadOverlays: function(re) {
		
		var Portal = db.define('Portals', portal_struct, { timestamps: 0 });
		//var RoomProc = db.define('RoomProcs', room_proc_struct, { timestamps: 0 });
	
		Portal.sync()
		.then(function() {
			return Portal.findAll();
		})
		.then(function(r) {
			
			var n = 0;
			
			for (var i in r) {
				
				var from = r[i].from.zone, to = r[i].to.zone, id = r[i].from.x + 'x' + r[i].from.y;
					
				if (r[i].attr.UserId)
					world.loadMapInstance(re, r[i].to.proto, r[i].to.zone);
				else
				if (r[i].attr.GuildId)
					world.loadMapInstance(re, r[i].to.proto, r[i].to.zone);
				else
				if (!my().zone[from] || !my().zone[to]) {
					warning('world.loadOverlays detected portal from or to error: ' + stringify(r[i]));
					continue;
				}
			
				if (!my().zone[from].portals[id])
					my().zone[from].portals[id] = [];

				my().zone[from].portals[id].push(r[i]);
				n++;
			}
			
			info('world.init loaded portals: ' + n + ' / ' + r.length);
			
			//return RoomProc.sync();
		})/*
		.then(function() {
			return RoomProc.findAll();
		})
		.then(function(r) {
			
		});*/
	},
	
	getRandomByTerrain: function(at) {
		
		var z = my().zone[at.zone], 
		X = z.grid[0].length, Y = z.grid.length, 
		x = [0, X-1].between(), y = [0, Y-1].between();
		
		var n = 0;
		
		while (!z.grid[y][x].has(at.terrain)) {
			x = [0, X-1].between(), y = [0, Y-1].between();
			if (++n > 10000) {
				error('world.getRandomByTerrain reached max passes w/o result for ' + stringify(at));
				break;
			}
		}
		
		at.x = x, at.y = y;
		
		return at;
	},

	getPortals: function(at) {
		return my().zone[at.zone].portals[at.x + 'x' + at.y];
	},

	getActors: function(at) {
		return my().zone[at.zone].actors[at.x + 'x' + at.y];
	},

	getItems: function(at) {
		return my().zone[at.zone].items[at.x + 'x' + at.y];
	},

	isDir: function(str) {
		for (var i in my().DIR_OFFSET)
			if (str.isAbbrev(i))
				return i;
		return false;
	}
};