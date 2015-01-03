/*
TODO
treasure chests in leaf nodes of dungeon tree graph - populate based on player gold
enemies pathfind to get to you
blink floodfill for targetting
better magic integration in randgen items
range weapons (bows, stars, crossbows, javelins) ... where you target beyond the 4 cardinal directions
... auto attack when an enemy is in your range?
status screen
	view items
	view character stats
	view setup
general client prompt
	integrate with display (no longer a dom)
*/

// util functions

(function($){
	$.fn.disableSelection = function() {
		return this.each(function() {
			$(this).attr('unselectable', 'on')
			   .css({
				   '-moz-user-select':'none',
				   '-webkit-user-select':'none',
				   'user-select':'none',
				   '-ms-user-select':'none'
			   })
			   .each(function() {
				   this.onselectstart = function() { return false; };
			   });
		});
	};
})(jQuery);

Math.sign = function(x) {
	if (x < 0) return -1;
	if (x > 0) return 1;
	return 0;
}

function mapNames(ar) {
	for (var i = 0; i < ar.length; i++) {
		var v = ar[i];
		if (v.name in ar) console.log("array has two names "+v.name);
		ar[v.name] = v; 
	}
}

function randomRange(min,max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(ar) {
	return ar[randomRange(0,ar.length-1)];
}

function randomBoxPos(box) {
	return new vec2(
		randomRange(box.min.x,box.max.x),
		randomRange(box.min.y,box.max.y));
}

function assert(s, msg) {
	if (!s) throw msg || "assertion failed!";
	return s;
}

function assertEquals(a,b,msg) {
	if (a != b) throw a+"!="+b+": "+(msg || "assertion failed!");
	return true;
}

function assertExists(obj,field,msg) {
	if (!(field in obj)) throw "no "+field+" in "+obj+": "+(msg || "assertion failed!");
	return obj[field];
}

function mergeInto(mergedst, mergesrc) {
	for (var k in mergesrc) {
		if (!(k in mergedst)) mergedst[k] = mergesrc[k];
	}
	return mergedst;
}

function distLInf(a,b) {
	var dx = Math.abs(a.x - b.x);
	var dy = Math.abs(a.y - b.y);
	return Math.max(dx,dy);
}

function distL1(a,b) {
	var dx = Math.abs(a.x - b.x);
	var dy = Math.abs(a.y - b.y);
	return dx + dy;
}

function round(x, r) {
	return Math.round(x * r) / r;
}

function makeDOM(elem/*, props*/) {
	var dom = document.createElement(elem);
	if (arguments.length > 1) {
		var props = arguments[1];
		for (var k in props) {
			if (k != 'style' && k != 'parent') {
				dom[k] = props[k];
			}
		}
		if ('style' in props) {
			for (var k in props.style) {
				dom.style[k] = props.style[k];
			}
		}
		if ('parent' in props) {
			props.parent.appendChild(dom);
		}
	}
	return dom;
}


// 2D simplex noise

var grad3 = [
	[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
	[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
	[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];

var p = [151,160,137,91,90,15,
	131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
	190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
	88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
	77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
	102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
	135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
	5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
	223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
	129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
	251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
	49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
	138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
var perm = [];
for(var i=0; i<512; i++) perm[i]=p[i & 255];

function dot() {
	var g = arguments[0];
	var sum = 0;
	for (var i=0; i < arguments.length-1; i++) {
		sum += arguments[i+1] * g[i];
	}
	return sum;
}

function noise(xin, yin) {
	var n0, n1, n2; // Noise contributions from the three corners
	// Skew the input space to determine which simplex cell we're in
	var F2 = 0.5*(Math.sqrt(3.0)-1.0);
	var s = (xin+yin)*F2; // Hairy factor for 2D
	var i = Math.floor(xin+s);
	var j = Math.floor(yin+s);
	var G2 = (3.0-Math.sqrt(3.0))/6.0;
	var t = (i+j)*G2;
	var X0 = i-t; // Unskew the cell origin back to (x,y) space
	var Y0 = j-t;
	var x0 = xin-X0; // The x,y distances from the cell origin
	var y0 = yin-Y0;
	// For the 2D case, the simplex shape is an equilateral triangle.
	// Determine which simplex we are in.
	var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
	if(x0>y0) {i1=1; j1=0;} // lower triangle, XY order: (0,0)->(1,0)->(1,1)
	else {i1=0; j1=1;} // upper triangle, YX order: (0,0)->(0,1)->(1,1)
	// A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
	// a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
	// c = (3-sqrt(3))/6
	var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
	var y1 = y0 - j1 + G2;
	var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
	var y2 = y0 - 1.0 + 2.0 * G2;
	// Work out the hashed gradient indices of the three simplex corners
	var ii = i & 255;
	var jj = j & 255;
	var gi0 = perm[ii+perm[jj]] % 12;
	var gi1 = perm[ii+i1+perm[jj+j1]] % 12;
	var gi2 = perm[ii+1+perm[jj+1]] % 12;
	// Calculate the contribution from the three corners
	var t0 = 0.5 - x0*x0-y0*y0;
	if(t0<0) n0 = 0.0;
	else {
	t0 *= t0;
	n0 = t0 * t0 * dot(grad3[gi0], x0, y0); // (x,y) of grad3 used for 2D gradient
	}
	var t1 = 0.5 - x1*x1-y1*y1;
	if(t1<0) n1 = 0.0;
	else {
	t1 *= t1;
	n1 = t1 * t1 * dot(grad3[gi1], x1, y1);
	}
	var t2 = 0.5 - x2*x2-y2*y2;
	if(t2<0) n2 = 0.0;
	else {
	t2 *= t2;
	n2 = t2 * t2 * dot(grad3[gi2], x2, y2);
	}
	// Add contributions from each corner to get the final noise value.
	// The result is scaled to return values in the interval [-1,1].
	return 70.0 * (n0 + n1 + n2);
}


// client prompt stuff


var popupMessage = [];

function clientMessage(str) {
	popupMessage.splice(0, 0, str);
}

var clientPromptStack = [];

function closeAllPrompts() {
	while (clientPromptStack.length) {
		clientPromptStack[clientPromptStack.length-1].close();
	}
}

function promptKeyCallback(key, event) {
	var clientPrompt = clientPromptStack[clientPromptStack.length-1];
	keyCallback = undefined;
	switch (key) {
	case 'ok':
		clientPrompt.onchoose(clientPrompt.options[clientPrompt.index], clientPrompt.index);
		break;
	case 'up': 
		clientPrompt.cycle(-1); 
		break;
	case 'down': 
		clientPrompt.cycle(1); 
		break;
	case 'left': 
		//option 1: page scroll
		clientPrompt.cycle(-10); 
		//option 2: ok/cancel
		//clientPrompt.close();
		break;
	case 'right': 
		//option 1: page scroll
		clientPrompt.cycle(10); 
		//option 2: ok/cancel
		//clientPrompt.onchoose(clientPrompt.options[clientPrompt.index], clientPrompt.index);
		break;
	case 'cancel':
	default:
		if (event != undefined && event.keyCode >= 49 && event.keyCode <= 57) {
			var index = event.keyCode - 49;
			index += clientPrompt.topIndex;
			if (index >= 0 && index < clientPrompt.options.length) {
				clientPrompt.onchoose(clientPrompt.options[index], index);
			}
		} else {
			clientPrompt.close();
		}
		break;
	}
	return false;
}

/*
TODO args:
options
onselect
onchoose
onclose
*/
function ClientPrompt(options, onchoose, onselect, onclose) {
	options = options.slice();
	this.div = makeDOM('div', {
		parent:document.body,
		style:{
			position:'absolute',
			border:'2px solid black',
			color:'#ffffff',
			fontSize:fontSize+'px',
			overflow:'hidden',
			scroll:'vertical'
		}
	});
	var divsHigh = options.length;
	if (divsHigh > 9) divsHigh = 9;
	this.options = options;
	this.onchoose = onchoose;
	this.onselect = onselect;
	this.onclose = onclose;
	this.topIndex = 0;
	this.index = 0;
	this.optionDivs = [];
	var visibleHeight = 0;//$(this.div).height();
	for (var i = 0; i < options.length; i++) {
		var option = options[i];
		var optionDiv = makeDOM('div', {
			style:{
				border:'1px solid white',
				paddingTop:'1px',
				paddingBottom:'1px', 
				paddingLeft:'4px',
				paddingRight:'4px',
				cursor:'pointer'
			},
			prompt:this,
			parent:this.div,
			innerHTML:''
		});
		this.optionDivs[i] = optionDiv;
		if (i < divsHigh) visibleHeight += fontSize+12;//$(optionDiv).height();
		/*
		$(optionDiv).click(eval('\n\
var v = function() {\n\
	if (this.prompt.enabled) {\n\
		this.prompt.disable();\n\
		onchoose.call(this, "'+option+'", '+i+');\n\
	}\n\
}; v;'));
		*/
	}
	this.div.style.height = visibleHeight+'px';

	if (clientPromptStack.length > 0) {
		clientPromptStack[clientPromptStack.length-1].disable();
	}
	clientPromptStack.push(this);

	keyCallback = promptKeyCallback;
	
	this.refreshPos();
	this.enable();
	this.refreshContent();
}
ClientPrompt.prototype = {
	enabled : true,
	enable : function() {
		this.enabled = true;
		this.div.style.background = '#595848';	//'#28288c';
	},
	disable : function() {
		this.enabled = false;
		this.div.style.background = '#cfcfcf';
	},
	close : function() {
		if (this.div.parentNode) this.div.parentNode.removeChild(this.div);
		var index = clientPromptStack.indexOf(this);
		if (index != -1) {
			if (index == clientPromptStack.length-1) {
				if (index) {
					clientPromptStack[index-1].enable();
				}
			}
			clientPromptStack.splice(index, 1);
		}
		if (this.onclose) this.onclose();
	},
	refreshPos : function() {
		this.div.style.left = (0 + (clientPromptStack.indexOf(this) + 1) * 10)+'px';
		this.div.style.top = (fontSize + 4 + (clientPromptStack.indexOf(this) + 1) * 10)+'px';
	},
	refreshContent : function() {
		this.div.scrollTop = (fontSize+8)*this.topIndex;
		for (var i = 0; i < this.options.length; i++) {
			var delta = i - this.topIndex;
			var s = this.options[i];
			if (delta >= 0 && delta <= 8) {
				s = (delta+1)+' - '+s;
			}
			if (this.index == i) s = '-> '+s;
			this.optionDivs[i].innerHTML = s;
		}

		if (this.onselect) {
			this.onselect(this.options[this.index], this.index);
		}
	},
	cycle : function(ofs) {
		this.index += ofs;
		/* wrap
		this.index %= this.options.length;
		this.index += this.options.length;
		this.index %= this.options.length;
		*/
		/* clamp */
		if (this.index < 0) this.index = 0;
		if (this.index >= this.options.length) this.index = this.options.length-1;
		/**/

		
		if (this.index > this.topIndex + 8) {
			this.topIndex = this.index - 8;
		}
		if (this.index < this.topIndex) {
			this.topIndex = this.index;
		}
		
		this.refreshContent();
	}
};

function isa(subclassObj, classObj) {
	if (subclassObj == classObj) return true;
	if ('super' in subclassObj.prototype) return isa(subclassObj.prototype.super, classObj);
	return false;
}

/*
args.init is the function that becomes the class object
args.super is the parent class
the rest of args becomes the prototype
if super is provided then super's prototype is merged into this class' prototype
*/
function makeClass(args) {
	var classname = ('classname' in args) ? args.classname : 'classObj';
	if (args == undefined) args = {};
	if (!('init' in args)) {
		if ('super' in args) {
			args.init = eval('var '+classname+' = function() { args.super.apply(this, arguments); }; '+classname+';');
		} else {
			args.init = eval('var '+classname+' = function() {}; '+classname+';');
		}		
	}
	var classFunc = args.init;
	
	classFunc.prototype = args;
	if ('super' in args) {
		mergeInto(classFunc.prototype, args.super.prototype);
		classFunc.super = args.super;
		classFunc.superProto = args.super.prototype;
	}
	classFunc.prototype.isa = function(classObj) {
		return isa(this.init, classObj);
	}

	return classFunc;
}

function makevec(n) {
	var allFields = ['x', 'y', 'z', 'w'];
	assert(n <= allFields.length);
	var fields = allFields.splice(0,n);
	var repeat = function(str, repl, sep) {
		if (sep == undefined) sep = ' ';
		var res = [];
		
		var repeatLength;
		for (var k in repl) {
			if (repeatLength == undefined) {
				repeatLength = repl[k].length;
			} else {
				assert(repeatLength == repl[k].length);
			}
		}
		
		for (var i = 0; i < repeatLength; i++) {
			var s = str;
			for (var k in repl) {
				s = s.replace(new RegExp('\\$'+k, 'g'), repl[k][i]);
			}
			s = s.replace(new RegExp('\\#', 'g'), i);
			res.push(s);
		}
		return res.join(sep);
	};
	var s = '\
	var vec'+n+' = function() {\n\
		switch (arguments.length) {\n\
		case 0: '+repeat('this.$field = 0;', {field:fields})+' break;\n\
		case 1:\n\
			var v = arguments[0];\n\
			if (typeof(v) == "object" && '+repeat('"$field" in v', {field:fields}, ' && ')+') {\n\
				'+repeat('this.$field = v.$field;', {field:fields})+'\n\
			} else {\n\
				v = parseFloat(v);\n\
				'+repeat('this.$field = v;', {field:fields})+'\n\
			}\n\
			break;\n\
		default: '+repeat('this.$field = parseFloat(arguments[#]);', {field:fields})+' break;\n\
		}\n\
	};\n\
	vec'+n+'.prototype = {\n\
		set : function() {\n\
			switch (arguments.length) {\n\
			case 0:'+repeat('this.$field = 0;', {field:fields})+' break;\n\
			case 1: var v = arguments[0]; '+repeat('this.$field = v.$field;', {field:fields})+' break;\n\
			case '+n+':'+repeat('this.$field = arguments[#];', {field:fields})+' break;\n\
			default: throw "set needs '+n+' arguments";\n\
			};\n\
			return this;\n\
		},\n\
		toString : function() { return '+repeat('this.$field', {field:fields}, ' + "," + ')+'; },\n\
		tileDist : function(v) { return '+repeat('Math.abs(Math.floor(this.$field + .5) - Math.floor(v.$field + .5))', {field:fields}, ' + ')+'; },\n\
		tileEquals : function(v) { return this.tileDist(v) == 0; },\n\
		equals : function(v) { return '+repeat('this.$field == v.$field', {field:fields}, ' && ')+'; },\n\
		neg : function() { return new vec'+n+'('+repeat('-this.$field', {field:fields}, ',')+'); },\n\
		'+repeat('\n\
		$op : function(v) {\n\
			if (typeof(v) == "object" && '+repeat('"$field" in v', {field:fields}, ' && ')+') return new vec'+n+'('+repeat('this.$field $sym v.$field', {field:fields}, ',')+');\n\
			return new vec'+n+'('+repeat('this.$field $sym v', {field:fields}, ',')+');\n\
		},', {op:['add', 'sub', 'mul', 'div'], sym:['+', '-', '*', '/']})+'\n\
		clamp : function() {\n\
			var mins, maxs;\n\
			if (arguments.length == 1 && "min" in arguments[0] && "max" in arguments[0]) {\n\
				mins = arguments[0].min;\n\
				maxs = arguments[0].max;\n\
			} else {\n\
				mins = arguments[0];\n\
				maxs = arguments[1];\n\
			}\n\
			'+repeat('\n\
			if (this.$field < mins.$field) this.$field = mins.$field;\n\
			if (this.$field > maxs.$field) this.$field = maxs.$field;', {field:fields}, '\n')+'\n\
			return this;\n\
		},\n\
		floor : function() {'+repeat('this.$field = Math.floor(this.$field);',{field:fields})+' return this; }\n\
	};\n\
	vec'+n+';';
	//console.log(s);
	return eval(s);
}
var vec2 = makevec(2);
var vec3 = makevec(3);


function box2() {
	switch (arguments.length) {
	case 0:
		this.min = new vec2();
		this.max = new vec2();
		break;
	case 1:
		var v = arguments[0];
		if (typeof(v) == 'object') {
			if ('min' in v && 'max' in v) {
				this.min = new vec2(v.min);
				this.max = new vec2(v.max);
			} else if ('x' in v && 'y' in v) {
				this.max = new vec2(v);
				this.min = this.max.neg();
			}
		} else {
			v = parseFloat(v);
			this.max = new vec2(v, v);
			this.min = this.max.neg();
		}
		break;
	case 4:
		this.min = new vec2(arguments[0], arguments[1]);
		this.max = new vec2(arguments[2], arguments[3]);
		break;
	default:
		this.min = new vec2(arguments[0]);
		this.max = new vec2(arguments[1]);
		break;
	}
}
box2.prototype = {
	toString : function() { return this.min + ':' + this.max; },
	size : function() { return this.max.sub(this.min); },
	contains : function(v) {
		if ('min' in v && 'max' in v) {
			return this.contains(v.min) && this.contains(v.max);
		} else {
			return v.x >= this.min.x && v.x <= this.max.x
				&& v.y >= this.min.y && v.y <= this.max.y;
		}
	},
	touches : function(b) {
		return b.min.x <= this.max.x && this.min.x <= b.max.x
			&& b.min.y <= this.max.y && this.min.y <= b.max.y;
	},
	clamp : function(b) {
		this.min.clamp(b);
		this.max.clamp(b);
		return this;
	},
	stretch : function(v) {
		if ('min' in v && 'max' in v) {
			this.stretch(v.min);
			this.stretch(v.max);
		} else {
			if (this.min.x > v.x) this.min.x = v.x;
			if (this.max.x < v.x) this.max.x = v.x;
			if (this.min.y > v.y) this.min.y = v.y;
			if (this.max.y < v.y) this.max.y = v.y;
		}
	}
}

var dirs = [
	{name:'e', offset:new vec2(1,0)},
	{name:'s', offset:new vec2(0,1)},
	{name:'w', offset:new vec2(-1,0)},
	{name:'n', offset:new vec2(0,-1)}
];

function getPixel(imgData, x, y) {
	var i = 4 * (x + imgData.width * y);
	var r = imgData.data[i++];
	var g = imgData.data[i++];
	var b = imgData.data[i++];
	return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}


// spawn classes


var GameObj = makeClass({
	init : function(args) {
		this.pos = new vec2();
		if ('pos' in args) {
			this.pos.x = Math.floor(args.pos.x);
			this.pos.y = Math.floor(args.pos.y);
		}
		if ('angle' in args) this.angle = args.angle;
		this.setPos(this.pos.x, this.pos.y); //link to tile
		if ('onInteract' in args) this.onInteract = args.onInteract;
		if (map) map.objs.push(this);
	},
	clearTile : function() {
		if ('tile' in this) {
			var tile = this.tile;
			if ('objs' in tile) {
				var objIndex = tile.objs.indexOf(this);
				tile.objs.splice(objIndex, 1);
				if (tile.objs.length == 0) delete tile.objs;
			}
			delete this.tile;
		}
	},
	setPos : function(x,y) {
		this.clearTile();
		this.pos.x = x;
		this.pos.y = y;
		if (map) {
			var tile = map.getTile(x,y);
			if (tile) {
				this.tile = tile;
				if (!('objs' in tile)) tile.objs = [];
				tile.objs.push(this);
			}
		}
	},
	move : function(dx, dy) {
		var nx = Math.floor(this.pos.x + dx);
		var ny = Math.floor(this.pos.y + dy);
		if (this == player && 'exitMap' in map) {
			if (nx < 0 || ny < 0 || nx >= map.size.x || ny >= map.size.y) {
				setMapRequest = {map:map.exitMap};
				return;
			}
		}
		if (map.wrap) {
			nx = (nx + map.size.x) % map.size.x;
			ny = (ny + map.size.y) % map.size.y;
		} else {
			if (nx < 0) nx = 0;
			if (ny < 0) ny = 0;
			if (nx >= map.size.x) nx = map.size.x-1;
			if (ny >= map.size.y) ny = map.size.y-1;
		}
		
		var tile = map.getTile(nx,ny);
		if (tile) {
			var blocked = false;
			if ('objs' in tile) {
				for (var i = 0; i < tile.objs.length; i++) {
					var obj = tile.objs[i];
					if (obj != this) {
						if (obj.solid) {
							if ('moveIntoObj' in this) this.moveIntoObj(obj);	//only player has this
							blocked = true;
						}
					}
				}
			}
			if (blocked) return true;

			if (this.movesInWater) {
				if (!tile.water) return true;
			} else {
				if (tile.solid || tile.water) return true;
			}
		}

		//do this after moveIntoObj so player can moveIntoObj neighbors while still being stuck
		if ('hasAttribute' in this && this.hasAttribute("Don't Move")) return true;

		this.setPos(nx,ny);
	},
	postUpdate : function() {
		this.applyLight();
	},
	applyLight : function() {
		if (!('fogColor' in map)) return;
		//update fog of war
		var lightRadius = this.getLightRadius();
		if (lightRadius === undefined) return;

		map.floodFill({
			pos:this.pos,
			maxDist:lightRadius,
			callback:function(tile,dist) {
				var newLight = (lightRadius-dist)/lightRadius; 
				var oldLight = 0;
				if ('light' in tile) oldLight = tile.light;
				tile.light = Math.max(oldLight, newLight);
				if (tile.solid) return false;
				if ('objs' in tile) {
					for (var i = 0; i < tile.objs.length; i++) {
						var obj = tile.objs[i];
						if (obj.blocksLight) return false;
					}
				}
				return true;
			}
		});
	},
	getLightRadius : function() { return this.lightRadius; },
	draw : function(ctx) {
		
		var dx = this.pos.x - view.center.x;
		var dy = this.pos.y - view.center.y;
		if (map.wrap) {
			if (dx < -map.size.x/2) dx += map.size.x;
			if (dx > map.size.x/2) dx -= map.size.x;
			if (dy < -map.size.y/2) dy += map.size.y;
			if (dy > map.size.y/2) dy -= map.size.y;
		}
		dx += view.center.x;
		dy += view.center.y;
		
		var rx = dx;
		var ry = dy;
		if (rx < view.bbox.min.x || ry < view.bbox.min.y || rx > view.bbox.max.x || ry > view.bbox.max.y) return;
		rx -= view.bbox.min.x;
		ry -= view.bbox.min.y;
		rx *= tileSize.x;
		ry *= tileSize.y;
	
		this.drawLocal(ctx, rx, ry);
	},
	drawLocal : function(ctx, rx, ry) {
		if (this.img == undefined) return;
		if ('angle' in this) {
			var pivotX = rx + tileSize.x / 2;
			var pivotY = ry + tileSize.y / 2;
			ctx.save();
			ctx.translate(pivotX, pivotY);
			ctx.rotate(this.angle);
			ctx.translate(-pivotX, -pivotY);
			ctx.drawImage(this.img, rx, ry, tileSize.x, tileSize.y);
			ctx.restore();
		} else {
			ctx.drawImage(this.img, rx, ry, tileSize.x, tileSize.y);
		}
	}
});

var ChestObj = makeClass({
});

var DeadObj = makeClass({
	super : GameObj,
	solid : false,
	//TODO z-sorting upon draw()
	url : 'objs/dead.png',
	init : function(args) {
		DeadObj.super.apply(this, arguments);
		this.life = randomRange(10, 100);
	},
	update : function() {
		this.life--;
		if (this.life <= 0) this.remove = true;
	}
});

var BattleObj = makeClass({
	super : GameObj,
	solid : true,
	equipFields : ['rhand', 'lhand', 'body', 'head', 'relic1', 'relic2'],

	hpMax : 1,
	mpMax : 1,
	gold : 0,
	physAttack : 1,
	physHitChance : 80,
	physEvade : 20,
	magicAttack : 1,
	magicHitChance : 80,
	magicEvade : 0,
	inflictChance : 1/4,
	inflictAttributes : [],
	attackOffsets : [new vec2(1,0)],
	damageType : 'bludgeon',

	init : function(args) {
		BattleObj.super.apply(this, arguments);
		
		var classItems = this.items;
		this.items = [];
		if (classItems) {
			for (var i = 0; i < classItems.length; i++) {
				var item = classItems[i];
				if (typeof(item) == 'string') item = itemClasses[item];
				if ('prototype' in item) item = new item();
				this.items.push(item);
			}
		}
		if (args.items) this.items = this.items.concat(args.items);
		
		this.spells = [];
		this.attributes = [];
		this.hp = this.stat('hpMax');
		this.mp = this.stat('mpMax');
	},
	stat : function(field) {
		var value = this[field];
		var srcInfos = [];
		var thiz = this;
		srcInfos = srcInfos.concat(
			this.equipFields.filter(function(equipField) { 
				return equipField in thiz;
			}).map(function(equipField) { 
				return {equip:equipField, src:thiz[equipField]};
			})
		);
		srcInfos = srcInfos.concat(
			this.attributes.map(function(attribute) { 
				return {attribute:true, src:attribute};
			})
		);
		for (var i = 0; i < srcInfos.length; i++) {
			var srcInfo = srcInfos[i];
			var src = srcInfo.src;
			if (field in src) {
				var srcvalue = src[field];
				if (typeof(value) == 'number') {
					value += srcvalue;
				} else if (typeof(value) == 'object' && value.constructor == Array) {

					//special case for attackOffsets -- mirror left hand on the 'y' axis
					if (field == 'attackOffsets' && srcInfo.equip == 'lhand') {
						srcvalue = srcvalue.map(function(ofs) { return new vec2(ofs.x, -ofs.y); });
					}
				
					value = value.concat(srcvalue);
				} else {	//strings? functions? booleans? override...
					value = srcvalue;
				}
			}
		}
		//and now that we've accum'd (+) all our stats
		//now we run through their modifiers (*)
		var baseValue = value;
		for (var i = 0; i < srcInfos.length; i++) {
			var src = srcInfos[i].src;
			if (field+'Modify' in src) {
				value = src[field+'Modify'](value, baseValue, this);
			}
		}
		return value;
	},
	getLightRadius : function() { return this.stat('lightRadius'); },
	setAttribute : function(attrName) {
		this.removeAttribute(attrName);
		new PopupText({msg:attrName, pos:this.pos});
		var attrClass = attributes[attrName];
		if (attrClass == undefined) {
			console.log("!! tried to set an unknown attributes", attrName);
		} else {
			this.attributes.push(new attrClass(this));
		}
	},
	setAttributes : function(attrNames) {
		for (var i = 0; i < attrNames.length; i++) {
			this.setAttribute(attrNames[i]);
		}
	},
	//don't call this from within attribute.update. instead just set its '.remove' to true
	removeAttribute : function(attrName) {
		for (var i = 0; i < this.attributes.length; i++) {
			if (this.attributes[i].name == attrName) {
				this.attributes.splice(i,1);
				i--;
			}
		}
	},
	removeAttributes : function(attrNames) {
		for (var i = 0; i < attrNames.length; i++) {
			this.removeAttribute(attrNames[i]);
		}
	},
	hasAttribute : function(attrName) {
		for (var i = 0; i < this.attributes.length; i++) {
			if (this.attributes[i].name == attrName) return true;
		}
		return false;
	},
	setEquip : function(field, item) {
		if (field in this) {
			this.items.push(this[field]);
			delete this[field];
		}

		if (item && this.canEquip(field, item)) {
			this[field] = item;
		}	//else put the old thing on? nah...
	
		//now that we've changed fields, make sure hp & mp are within their proper bounds...
		if (this.hp > this.stat('hpMax')) this.hp = this.stat('hpMax');
		if (this.mp > this.stat('mpMax')) this.mp = this.stat('mpMax');
	},
	canEquip : function(field, item) {
		if ((item.type == 'weapon' || item.type == 'shield') && (field == 'lhand' || field == 'rhand')) return true;
		if (item.type == 'armor' && field == 'body') return true;
		if (item.type == 'helm' && field == 'head') return true;
		if (item.type == 'relic' && (field == 'relic1' || field == 'relic2')) return true;
		return false;
	},
	postUpdate : function() {
		for (var i = 0; i < this.attributes.length; i++) {
			var attribute = this.attributes[i];
			attribute.update(this);
			if (attribute.remove) {
				this.attributes.splice(i,1);
				i--;
			}
		}

		if ('tile' in this) {
			var tile = this.tile;
			if ('objs' in tile) {
				for (var i = 0; i < tile.objs.length; i++) {
					var obj = tile.objs[i];
					if (obj != this) {
						if ('onTouch' in obj) obj.onTouch(this);
					}
				}
			}
		}

		BattleObj.superProto.postUpdate.apply(this, arguments);
	},
	interact : function(dx, dy) {
		var nx = Math.floor(this.pos.x + dx + map.size.x) % map.size.x;
		var ny = Math.floor(this.pos.y + dy + map.size.y) % map.size.y;
		var tile = map.getTile(nx,ny);
		if (tile && 'objs' in tile) {
			for (var i = 0; i < tile.objs.length; i++) {
				var obj = tile.objs[i];
				if ('onInteract' in obj) {
					obj.onInteract(this);
					return;
				}
			}
		}
	},
	attack : function(dx, dy) {
		var thiz = this;
		var angle = Math.atan2(dy, dx);
		var physAttack = this.stat('physAttack');
		var baseDamageType = this.stat('damageType');
		var attackOffsets = this.stat('attackOffsets');
		var inflictAttributes = this.stat('inflictAttributes');
		var pos = new vec2();
		for (var j = 0; j < attackOffsets.length; j++) {
			attackOffset = attackOffsets[j];
			//rotate the offset by the dir (cplxmul)
			pos.x = dx * attackOffset.x - dy * attackOffset.y + this.pos.x;
			pos.y = dx * attackOffset.y + dy * attackOffset.x + this.pos.y;
			if (!map.wrapPos(pos)) continue;
			var damageType = baseDamageType;
			if ('type' in attackOffset) damageType = attackOffset.type; 
			switch (damageType) {
			case 'slash':
				new PopupSlashAttack({pos:pos, angle:angle});
				break;
			case 'pierce':
				new PopupPierceAttack({pos:pos, angle:angle});
				break;
			default:
				console.log("unknown damage type: "+damageType);
			case 'bludgeon':
				new PopupBludgeonAttack({pos:pos, angle:angle});
				break;
			}

			var tile = map.tiles[pos.y][pos.x];
			if (tile && 'objs' in tile) {
				var entsThere = tile.objs.length;
				for (var i = 0; i < entsThere; i++) {
					var obj = tile.objs[i];
					if (obj.isa(BattleObj)) {
						if (this.physHitRoll(obj)) {
							var dmg = -physAttack;
							obj.adjustPoints('hp', dmg, this);
							if (inflictAttributes.length) {
								for (var k = 0; k < inflictAttributes.length; k++) {
									var attr = inflictAttributes[k];
									if (Math.random() < this.inflictChance) {
										obj.setAttribute(attr);
									}
								}
							}
						} else {
							new PopupText({msg:'MISS!', pos:obj.pos});
						}
					}
				}
			}
		}
	},
	physHitRoll : function(defender) {
		var percent = this.stat('physHitChance') - defender.stat('physEvade');
		return randomRange(1,100) <= percent;
	},
	magicHitRoll : function(defender) {
		var percent = this.stat('magicHitChance') - defender.stat('magicEvade');
		return randomRange(1,100) <= percent;
	},
	adjustPoints : function(field, amount, inflictor) {
		var color;
		if (amount > 0) color = 'rgb(0,127,255)';
		var msg = amount+' '+field;
		if (amount >= 0) msg = '+'+msg;
		new PopupText({msg:msg, pos:this.pos, color:color});
		this[field] += amount;
		if (field == 'food') return;

		var fieldMax = field+'Max';
		var fieldMaxValue = this.stat(fieldMax);
		if (this[field] > fieldMaxValue) {
			this[field] = fieldMaxValue;
		} else if (this[field] < 0) {
			this[field] = 0;
		}
		if (this.hp == 0) {
			//don't let monsters take your items/gold when they kill you
			if (inflictor && inflictor.isa(HeroObj)) {
				if ('gold' in inflictor && 'gold' in this) inflictor.gold += this.gold;
				if ('items' in inflictor && 'items' in this) inflictor.items = inflictor.items.concat(this.items);
			}
			this.die();
		}
	},
	die : function() {
		this.remove = true;
		new DeadObj({pos:this.pos});
	}
});

var HeroObj = makeClass({
	super : BattleObj,
	url : 'objs/hero.png',
	hpMax : 25,
	mpMax : 25,
	foodMax : 5000,
	gold : 0, 
	nominalTemp : 80,
	warmth : 28.6,
	physAttack:1,
	physHitChance:70,
	physEvade:10,
	
	lightRadius : 10,
	
	init : function(args) {
		HeroObj.super.apply(this, arguments);
		this.hp = this.hpMax;
		this.mp = 0;
		this.food = Math.ceil(this.foodMax/2);
		this.temp = this.nominalTemp; 
	},
	update : function() {
		this.food--;
		if (this.food <= 0) {
			clientMessage("HUNGRY!!!");
			this.adjustPoints('hp', -Math.ceil(this.stat('hpMax')/20));
		} else if (this.food > this.stat('foodMax')) {
			clientMessage("FATTY FAT FAT!!!");
			var overweight = this.food - this.stat('foodMax');
			if (Math.random() < this.stat('hpMax')/100) {
				var dmg = overweight/1000;
				//dmg *= this.stat('hpMax')/20;
				this.adjustPoints('hp', -Math.ceil(dmg));
			}
			this.food -= Math.ceil(overweight * .1);
		}

		envTemp = map.temp + this.stat('warmth');
		this.temp += (envTemp - this.temp) * .1;
		if (Math.abs(this.temp - this.nominalTemp) > 50) {
			if (this.temp > this.nominalTemp) {
				clientMessage("You're too hot!");
			} else {
				clientMessage("You're too cold!");
			}
			this.adjustPoints('hp', -Math.ceil(this.stat('hpMax')/20));
		}
	},
	move : function(dx, dy) {
		if (!HeroObj.superProto.move.apply(this, arguments)) {
			var tile = map.getTile(this.pos.x, this.pos.y);
			if ('playerTouch' in tile) {
				tile.playerTouch(this);
			}
		}
	},
	moveIntoObj : function(obj) {
		if ('onInteract' in obj) {
			obj.onInteract(this);
		} else {
			if (obj.isa(MonsterObj)) {
				this.attack(obj.pos.x - this.pos.x, obj.pos.y - this.pos.y);
			}
		}
	},
	die : function() {
		//don't call super -- all that does is remove us
		clientMessage("YOU DIED");
		setMapRequest = {map:'Helpless Village', dontSavePos:true};
		this.attributes = [];	//clear attributes
		this.hp = 1; 
		this.mp = 0;
		this.food = Math.ceil(this.foodMax/2);
		this.temp = this.nominalTemp; 
		this.gold = Math.floor(this.gold / 2);
		for (var i = 0; i < maps.length; i++) {
			var map = maps[i];
			delete map.lastPlayerStart;
		}
	}
});

/*
moveent behaviors:
hostile : runs towards player
distToHostile : how close player can get before a monster turns hostile 
retreat : runs away from player
distToRetreat : how far a player can get for a monster to stop running
*/
var AIObj = makeClass({
	super : BattleObj,
	url : 'objs/orc.png',
	update : function() {
		if (!player) return;
		
		var acted = this.performAction();	//either act or move

		//now attempt to move:
		if (acted) return;
		
		var deltax = player.pos.x - this.pos.x;
		var deltay = player.pos.y - this.pos.y;
		if (map.wrap) {
			if (deltax < -map.size.x/2) deltax += map.size.x;
			if (deltax > map.size.x/2) deltax -= map.size.x;
			if (deltay < -map.size.y/2) deltay += map.size.y;
			if (deltay > map.size.y/2) deltay -= map.size.y;
		}
		var absdeltax = Math.abs(deltax);
		var absdeltay = Math.abs(deltay);
		var playerDist = absdeltax + absdeltay; 
	
		if (typeof(this.distToHostile) == 'number') {
			if (playerDist <= this.distToHostile) {
				this.hostile = true;
			} else {
				this.hostile = false;
			}
		}
	
		if (typeof(this.distToRetreat) == 'number') {
			if (playerDist <= this.distToRetreat) {
				this.retreat = true;
			} else {
				this.retreat = false;
			}
		}
	
		var dx, dy;
		if (!(this.hostile || this.retreat || this.wander)) return;
		
		if (this.retreat) {
			dx = Math.sign(-deltax);
			dy = Math.sign(-deltay);
		} else if (this.hostile) {
			/* walk towards-ish ... */
			dx = Math.sign(deltax);
			dy = Math.sign(deltay);
			/**/
			/* pathfind! * /
			var path = map.pathfind(this.pos, player.pos);
			if (path && path.length > 1) {
				var nextstep = path[1];
				var dx = nextstep.x - this.pos.x;
				var dy = nextstep.y - this.pos.y;
				this.move(dx, dy);
			}
			return;
			/**/
		} else if (this.wander) {
			if (Math.random() > .2) return;
			var dir = pickRandom(dirs).offset;
			dx = dir.x;
			dy = dir.y;
		}
	
		if (dx && dy) {
			if (absdeltax > absdeltay) {
				if (!this.move(dx, 0)) return;
				dx = 0;	//try the other dir, move on to the rotate-and-test
			} else {
				if (!this.move(0, dy)) return;
				dy = 0;	//try the other dir, move on to the rotate-and-test
			}
		}
		//for (var i = 0; i < 4; i++) {	
			var result = this.move(dx, dy);
		//	if (!result) break;
		//	var tmp = dx;
		//	dx = -dy;
		//	dy = tmp;
		//}
	},
	performAction : function() {
		//do attack as part of move (so we can keep tabs on who acted - no multiple actions!)
		if (this.hostile && distL1(player.pos, this.pos) <= 1) {
			this.attack(player.pos.x - this.pos.x, player.pos.y - this.pos.y);
			return true;
		}
	}
});

var MonsterObj = makeClass({
	super:AIObj,
//	wander:true,
//	distToHostile:10
	hostile:true
});

var OrcObj = makeClass({
	super:MonsterObj, 
	hpMax:1, 
	gold:1,
	physEvade:10,
	damageType:'pierce'
});

var ThiefObj = makeClass({
	super:MonsterObj,
	url:'objs/thief.png',
	hpMax:2,
	physEvade:30,
	gold:10,
	performAction : function() {
		if (this.retreat) return;

		if (distL1(this.pos, player.pos) <= 1 
		&& randomRange(1,5) == 5)
		{
			if (player.items.length && this.physHitRoll(player)) {
				var item = player.items.splice(randomRange(0, player.items.length-1), 1)[0];
				this.items.push(item);
				clientMessage('Thief Stole '+item.name+'!');
				this.retreat = true;
			}
			return true;
		} else {
			return ThiefObj.superProto.performAction.apply(this, arguments);
		}
	}
});

var TroggleObj = makeClass({
	super:MonsterObj,
	url:'objs/imp.png',
	hpMax:4,
	gold:4,
	performAction : function() {
		if (distL1(this.pos, player.pos) <= 3
		&& randomRange(1,5) == 5)
		{
			//cast spell
			if (this.magicHitRoll(player)) {
				player.setAttribute("Don't Move");
			}
		} else {
			return TroggleObj.superProto.performAction.apply(this, arguments); 
		}
	}
});

var FighterObj = makeClass({
	super:MonsterObj,
	url:'objs/fighter.png',
	hpMax:8,
	gold:8,
	physAttack:3,
	physHitChance:80
});

var SnakeObj = makeClass({
	super:MonsterObj,
	url:'objs/snake.png',
	hpMax:1,
	gold:2,
	physEvade:30,
	inflictAttributes:['Poison'],
	damageType:'pierce'
});

var FishObj = makeClass({
	super:MonsterObj,
	url:'objs/fish.png',
	hpMax:1,
	items:['Fish Fillet', 'Fish Fillet', 'Fish Fillet'],
	physEvade:50,
	wander:true,
	distToHostile:undefined,
	movesInWater:true
});

var DeerObj = makeClass({
	super:MonsterObj,
	url:'objs/deer.png',
	hpMax:1,
	items:['Venison'],	//TODO prevent steal.  have a 'drop on kill' item instead
	physEvade:50,
	wander:true,
	distToHostile:undefined,
	distToRetreat:10
});

var SeaMonsterObj = makeClass({
	super:MonsterObj,
	url:'objs/seamonster.png',
	hpMax:20,
	gold:100,
	physAttack:5,
	physEvade:50,
	movesInWater:true
});

var EnemyBoatObj = makeClass({
	super:MonsterObj,
	url:'objs/boat.png',
	hpMax:10,
	gold:50,
	physAttack:5,
	physEvade:30,
	movesInWater:true
});

/*
TODO..
DeerObj for hunting
BearObj for hunting
ultima classics:
var DevilObj = makeClass({super:MonsterObj, hpMax:32, gold:32});
var WizardObj = makeClass({super:MonsterObj, hpMax:64, gold:64});
var BalrogObj = makeClass({super:MonsterObj, hpMax:128, gold:128});

things you can ride:
Boat, Horse, Plane, Rocket
*/

var TownNPCObj = makeClass({
	super : AIObj,
	onInteract : function(player) {
		if (this.msg) {
			clientMessage(this.msg);
		}
	},
	adjustPoints : function() {
		if (arguments.length > 2 && arguments[2] == player) {
			for (var i = 0; i < map.objs.length; i++) {
				var obj = map.objs[i];
				if (obj.isa(TownNPCObj)) {
					if (obj.isa(GuardObj)) obj.hostile = true;
					else obj.retreat = true;
				}
			}
		}
		TownNPCObj.superProto.adjustPoints.apply(this, arguments);
	}
});

var HelperObj = makeClass({
	super : AIObj,
	solid : false,
	moveTowards : function(destX, destY) {
		var deltax = destX - this.pos.x;
		var deltay = destY - this.pos.y;
		var absdeltax = Math.abs(deltax);
		var absdeltay = Math.abs(deltay);
		var dx = Math.sign(deltax);
		var dy = Math.sign(deltay);
		if (dx && dy) {
			if (absdeltax > absdeltay) {
				if (!this.move(dx, 0)) return;
				dx = 0;	//try the other dir, move on to the rotate-and-test
			} else {
				if (!this.move(0, dy)) return;
				dy = 0;	//try the other dir, move on to the rotate-and-test
			}
		}
		var result = this.move(dx, dy);
	},
	update : function() {
		if (this.target) {
			if (this.target.hp <= 0) {
				this.target = undefined;
			} else {
				if (distL1(this.pos, this.target.pos) <= 1) {
					this.attack(this.target.pos.x - this.pos.x, this.target.pos.y - this.pos.y);
				} else {
					this.moveTowards(this.target.pos.x, this.target.pos.y);
				}
				if (this.target.hp <= 0) {
					this.target = undefined;
				}
			}
		}
		if (!this.target) {
			//move towards the player
			if (player) this.moveTowards(player.pos.x + randomRange(-5,5), player.pos.y + randomRange(-5,5));
			//and look for enemies while we go
			var searchRadius = 5;
			for (var y = this.pos.y - searchRadius; y <= this.pos.y + searchRadius; y++) {
				for (var x = this.pos.x - searchRadius; x <= this.pos.x + searchRadius; x++) {
					var tile = map.getTile(x,y);
					if (tile && 'objs' in tile) {
						for (var i = 0; i < tile.objs.length; i++) {
							var obj = tile.objs[i];
							if (obj.isa(MonsterObj) && obj.hostile) {
								this.target = obj;
							}
						}
					}
				}
			}
		}
	}
});

var GuardObj = makeClass({
	super:TownNPCObj,
	url:'objs/fighter.png',
	msg:'Stay in school!',
	hpMax:100,
	gold:100,
	physAttack:10,
	physHitChance:100,
	physEvade:60
});

var MerchantObj = makeClass({
	super : TownNPCObj,
	url : 'objs/merchant.png',
	hpMax : 10,
	init : function(args) {
		MerchantObj.super.apply(this, arguments);
		if ('store' in args && args.store) {
			this.store = args.store;
			if (!('itemClasses' in args)) throw "store needs itemClasses";
			this.itemClasses = args.itemClasses;
			
			//merchants respawn every time you walk in the town (in case you kill them)
			//so upon respawn, regen some new items based on the player's gold
			var items = [];

			for (var i = 0; i < 100; i++) {
				var itemClass = pickRandom(this.itemClasses);
				items.push(new itemClass());
			}

			items.sort(function(itemA, itemB) { 
				return Math.sign(Math.abs(itemA.cost - player.gold) - Math.abs(itemB.cost - player.gold));
			});
			
			var numItems = randomRange(10,20);
			for (var i = 0; i < numItems; i++) {
				this.items.push(items[i]);
			}
		}
		if ('msg' in args) this.msg = args.msg;
	},
	onInteract : function(player) {
		MerchantObj.superProto.onInteract.apply(this, arguments);
		if (this.store) {
			var thiz = this;
			var buySellPrompt = new ClientPrompt(['Buy', 'Sell'], function(cmd, index) {
				if (cmd == 'Buy') {
					var buyOptions = thiz.items.map(function(item, index) {
						return item.name+" ("+item.cost+" GP)";
					});
					if (buyOptions.length == 0) {
						clientMessage("I have nothing to sell you!");
					} else {
						var buyPrompt = new ClientPrompt(buyOptions, function(cmd, index) {
							var item = thiz.items[index];
							//TODO 'how many?'
							if (player.gold >= item.cost) {
								player.gold -= item.cost;
								clientMessage('Sold!');
								player.items.push(item);
							} else {
								clientMessage("You can't afford that!");
							}
						}, function(cmd, index) {
							var item = thiz.items[index];
							possibleEquipItem = item;
							if (item.isa(EquipItem)) {
								if (item.isa(WeaponItem)) possibleEquipField = 'rhand';
								if (item.isa(ShieldItem)) possibleEquipField = 'lhand';
								if (item.isa(ArmorItem)) possibleEquipField = 'body';
								if (item.isa(HelmItem)) possibleEquipField = 'head';
								if (item.isa(RelicItem)) possibleEquipField = 'relic2';
							}
						}, function() {
							possibleEquipField = undefined;
						});
					}
				} else if (cmd == 'Sell') {
					var sellScale = .5;
					var sellOptions = player.items.map(function(item, index) {
						return item.name+" ("+Math.ceil(item.cost * sellScale)+" GP)";
					});
					if (sellOptions.length == 0) {
						clientMessage("You have nothing to sell me!");
					} else {
						var sellPrompt = new ClientPrompt(sellOptions, function(cmd, index) {
							var item = player.items[index];
							//TODO howmany?
							player.gold += Math.ceil(item.cost * sellScale);
							player.items.splice(index, 1);
							clientMessage("Thanks!");
							sellPrompt.close();	//TODO repopulate
						});
					}
				}
			});
		}
	}
});

var WarpObj = makeClass({
	super : GameObj,
	solid : true,
	init : function(args) {
		WarpObj.super.apply(this, arguments);
		this.destMap = args.destMap;
		if ('destPos' in args) this.destPos = args.destPos;
	},
	onInteract : function(player) {
		setMapRequest = {map:this.destMap};
		if ('destPos' in this) setMapRequest.pos = this.destPos;
	}
});

var TownObj = makeClass({super:WarpObj, url:'objs/town.png'});
var UpStairsObj = makeClass({super:WarpObj, url:'objs/upstairs.png'});
var DownStairsObj = makeClass({super:WarpObj, url:'objs/downstairs.png'});

var FireWallObj = makeClass({
	super : GameObj,
	url : 'objs/firewall.png',
	lightRadius : 10,
	init : function(args) {
		FireWallObj.super.apply(this, arguments);
		this.life = randomRange(10,100);
		this.caster = args.caster;
	},
	getLightRadius : function() {
		return (Math.random() * .5 + .5) * this.lightRadius;
	},
	update : function() {
		this.life--;
		if (this.life <= 0) this.remove = true;
	},
	onTouch : function(other) {
		if (other.isa(BattleObj)) {
			spells.Fire.useOnTarget(this.caster, other);
		}
	}
});

var FriendlyFrogObj = makeClass({
	super : HelperObj,
	url : 'objs/frog.png',
	init : function(args) {
		FriendlyFrogObj.super.apply(this, arguments);
	}
});

var FriendlySnakeObj = makeClass({
	super : HelperObj,
	url : 'objs/snake.png',
	hpMax : 1,
	physEvade : 30,
	inflictAttributes : ['Poison'],
	damageType : 'pierce',
	init : function(args) {
		FriendlySnakeObj.super.apply(this, arguments);
	}
});

var PopupObj = makeClass({
	super : GameObj,
	update : function() { 
		this.remove = true;
	}
});

/*
args:
	ctx = context
	text
	color
	outlineColor
	outlineSize
	x
	y
*/
function drawOutlineText(args) {
	var ctx = args.ctx;
	var text = args.text;
	var outlineSize = args.outlineSize;
	var posX = args.x;
	var posY = args.y;
	ctx.save();
	ctx.fillStyle = args.outlineColor;
	for (var x = -1; x <= 1; x++) {
		for (var y = -1; y <= 1; y++) {
			ctx.fillText(text, posX + x * outlineSize, posY + y * outlineSize);
		}
	}
	ctx.fillStyle = args.color;
	ctx.fillText(text, posX, posY);
	ctx.restore();
}

var PopupText = makeClass({
	super : PopupObj,
	color : 'rgb(255,0,0)',
	init : function(args) {
		PopupText.super.apply(this, arguments);
		this.msg = args.msg;
		if (args.color) this.color = args.color;
	},
	drawLocal : function(ctx, rx, ry) {
		ctx.save();
		ctx.fillStyle = this.color; 
		ctx.globalAlpha = .35;
		ctx.beginPath();
		ctx.arc(rx + tileSize.x/2, ry + tileSize.y/2, tileSize.x/2, 0, Math.PI*2);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
		
		ctx.save();
		var fontSize = Math.ceil(tileSize.x/2);
		ctx.font = fontSize+'px sans-serif';
		//ctx.fillStyle = this.color;
		var msgs = this.msg.split(' ');
		var y = ry + fontSize - 3;
		for (var i = 0; i < msgs.length; i++) {
			var length = ctx.measureText(msgs[i]).width;
			//ctx.fillText(msgs[i], rx + tileSize.x/2 - length/2, y);
			drawOutlineText({
				ctx:ctx,
				text:msgs[i],
				color:'rgb(255,255,255)',
				outlineColor:'rgb(0,0,0)',
				outlineSize:Math.ceil(fontSize/16), 
				x:rx+tileSize.x/2 - length/2, 
				y:y
			});
			y += fontSize;
		}
		ctx.restore();
	}
});

//don't convert classes to this too hastily without making sure their image is precached
//I'm using this with Spell.use() and putting all spells.url's in the image precache
var PopupSpellIcon = makeClass({
	super:PopupObj,
	init : function(args) {
		PopupSpellIcon.super.apply(this, arguments);
		this.img = args.img; 
	}
});

var PopupSlashAttack = makeClass({super:PopupObj, url:'objs/damage-slash.png'});
var PopupPierceAttack = makeClass({super:PopupObj, url:'objs/damage-pierce.png'});
var PopupBludgeonAttack = makeClass({super:PopupObj, url:'objs/damage-bludgeon.png'});

var DoorObj = makeClass({
	super:GameObj,
	url:'objs/door.png',
	solid:true,
	blocksLight:true,
	onInteract:function(player) {
		this.remove = true;
	}
});

var TreasureObj = makeClass({
	super:GameObj,
	url:'objs/treasure.png',
	solid:true,
	onInteract:function(player) {
		var itemClass = pickRandom(itemClasses);

		//store trick: spawn 100, pick the closest to the player's gp level
		var item = new itemClass();
		for (var i = 0; i < 100; i++) {
			var newItem = new itemClass();
			if (Math.abs(newItem.cost - player.gold) <= Math.abs(item.cost - player.gold)) {
				item = newItem;
			}
		}

		clientMessage("you got "+item.name);
		player.items.push(item);

		this.remove = true;
	}
});

var SignObj = makeClass({super:GameObj, solid:true});
var WeaponSign = makeClass({super:SignObj, url:'objs/shop-weapon-sign.png'});
var ArmorSign = makeClass({super:SignObj, url:'objs/shop-armor-sign.png'});
var FoodSign = makeClass({super:SignObj, url:'objs/shop-food-sign.png'});
var ItemSign = makeClass({super:SignObj, url:'objs/shop-item-sign.png'});
var RelicSign = makeClass({super:SignObj, url:'objs/shop-relic-sign.png'});
var SpellSign = makeClass({super:SignObj, url:'objs/shop-spell-sign.png'});
var HealSign = makeClass({super:SignObj, url:'objs/shop-heal-sign.png'});

//a list of all types that need graphics to be cached
var objTypes = [
	//hero
	HeroObj,
	//monsters
	OrcObj, ThiefObj, TroggleObj, FighterObj, SnakeObj, SeaMonsterObj, EnemyBoatObj,
	//DevilObj, WizardObj, BalrogObj,
	//wildlife:
	FishObj, DeerObj,
	//warps:
	TownObj, UpStairsObj, DownStairsObj,
	//town guys:
	MerchantObj, GuardObj,
	//spells:
	FireWallObj, FriendlyFrogObj, FriendlySnakeObj,
	//effects:
	DeadObj,
	//popups:
	PopupSlashAttack, PopupPierceAttack, PopupBludgeonAttack,
	//misc objs
	WeaponSign, ArmorSign, FoodSign, ItemSign, RelicSign, SpellSign, HealSign,
	DoorObj, TreasureObj
];


// attributes

var Attribute = makeClass({
	init : function(target) {
		if ('lifeRange' in this) this.life = randomRange.apply(undefined, this.lifeRange);
	},
	update : function(target) {
		if ('life' in this) {
			this.life--;
			if (this.life <= 0) this.remove = true;
		}
	}
});

var attributes = [
	makeClass({
		super : Attribute,
		name : "Don't Move",
		lifeRange : [5,10]
	}),
	makeClass({
		super : Attribute,
		name : "Poison",
		lifeRange : [10,20],
		update : function(target) {
			target.adjustPoints('hp', -Math.ceil(target.stat('hpMax')/50));
			Attribute.prototype.update.apply(this, arguments);
		}
	}),
	makeClass({
		super : Attribute,
		name : "Regen",
		lifeRange : [10,20],
		update : function(target) {
			target.adjustPoints('hp', Math.ceil(target.stat('hpMax')/50));
			Attribute.prototype.update.apply(this, arguments);
		}
	}),
	makeClass({
		super : Attribute,
		name : "Light",
		lightRadius : 10,
		life : 100
	})
];
for (var i = 0; i < attributes.length; i++) {
	attributes[attributes[i].prototype.name] = attributes[i];
}


//spells

/*
castingInfo:
	spell = current spell casting
	target = where it's being targetted
	dontCost = override costing mp (for scrolls)
	onCast = what to do upon casting it (for scrolls)
*/
var castingInfo;

function spellTargetKeyCallback(key, event) {
	var nx = castingInfo.target.x;
	var ny = castingInfo.target.y;
	switch (key) {
	case 'left': nx--; break;	//left
	case 'up': ny--; break; //up
	case 'right': nx++; break; //right
	case 'down': ny++; break; //down
	case 'cancel':
		castingInfo = undefined;
		keyCallback = undefined;
		return false;
	case 'ok':
		castingInfo.spell.use(player, castingInfo.target);
		castingInfo = undefined;
		keyCallback = undefined;
		return true;
	}
	if (distL1(player.pos, new vec2(nx,ny)) <= castingInfo.spell.range) {
		castingInfo.target.x = nx;
		castingInfo.target.y = ny;
	}
	clientMessage("choose target for spell "+castingInfo.spell.name);
	return false;
}

var Spell = makeClass({
	inflictAttributes : [],
	inflictChance : 1/4,
	clientUse : function(args) {
		//prompt the user for a target location
		castingInfo = {};
		castingInfo.spell = this;
		
		castingInfo.target = new vec2(player.pos);
		if (!this.targetSelf) {
			var bestDist = this.range + 1;
			for (var y = player.pos.y - this.range; y <= player.pos.y + this.range; y++) {
				for (var x = player.pos.x - this.range; x <= player.pos.x + this.range; x++) {
					var tilePos = new vec2(x,y);
					var tileDist = distL1(player.pos, tilePos);
					if (tileDist <= this.range) {
						var tile = map.getTile(x,y);
						if (tile && 'objs' in tile) {
							for (var i = 0; i < tile.objs.length; i++) {
								var obj = tile.objs[i];
								if (obj.isa(BattleObj) && obj.hostile) {
									if (tileDist < bestDist) {
										bestDist = tileDist;
										castingInfo.target = tilePos;
									}
								}
							}
						}
					}
				}
			}
		}
		
		for (var k in args) {
			castingInfo[k] = args[k];
		}
		clientMessage("choose target for spell "+castingInfo.spell.name);
		keyCallback	= spellTargetKeyCallback;
	},
	canPayFor : function(caster) {
		if (caster == player && castingInfo && castingInfo.dontCost) return true;
		return caster.mp >= this.cost;
	},
	payFor : function(caster) {
		if (caster == player && castingInfo && castingInfo.dontCost) return;
		caster.mp -= this.cost;
	},
	use : function(caster, pos) {
		if (!this.canPayFor(caster)) {
			new PopupText({msg:'NO MP!', pos:caster.pos});
			return;
		}
		this.payFor(caster);
	
		for (var y = pos.y - this.area; y <= pos.y + this.area; y++) {
			for (var x = pos.x - this.area; x <= pos.x + this.area; x++) {
				if (distL1(pos, new vec2(x,y)) <= this.area) {
					var tile = map.getTile(x,y);
					if (tile) {
						this.useOnTile(caster, tile);
					}
				}
			}
		}
		if (caster == player && castingInfo && castingInfo.onCast) {
			castingInfo.onCast(caster);
		}
	},
	useOnTile : function(caster, tile) {
		if ('img' in this) {
			new PopupSpellIcon({pos:tile.pos, img:this.img});
		}
		if ('objs' in tile) {
			for (var i = 0; i < tile.objs.length; i++) {
				var obj = tile.objs[i];
				if (obj.isa(BattleObj)) {
					this.useOnTarget(caster, obj);
				}
			}
		}
		if ('spawn' in this) {
			//don't allow solid spawned objects to spawn over other solid objects
			var blocking = false;
			if (this.spawn.prototype.solid) {
				if ('objs' in tile) {
					for (var i = 0; i < tile.objs.length; i++) {
						var obj = tile.objs[i];
						if (obj.solid) {
							blocking = true;
							break;
						}
					}
				}
			}
			if (!blocking) {
				//spawn
				var spawnObj = new this.spawn({pos:new vec2(tile.pos), caster:caster});
				//do an initial touch test
				if ('onTouch' in spawnObj && 'tile' in spawnObj && 'objs' in spawnObj.tile) {
					for (var i = 0; i < spawnObj.tile.objs.length; i++) {
						var obj = spawnObj.tile.objs[i];
						spawnObj.onTouch(obj);
					}
				}
			}
		}
	},
	useOnTarget : function(caster, target) {
		if (!this.alwaysHits && !caster.magicHitRoll(target)) {
			new PopupText({msg:'MISS!',pos:target.pos});
			return;
		}
		if ('damage' in this) {
			target.adjustPoints('hp', -this.damage * caster.stat('magicAttack'), caster);
		}
		if ('inflictAttributes' in this) {
			target.setAttributes(this.inflictAttributes);
		}
		if ('removeAttributes' in this) {
			target.removeAttributes(this.removeAttributes);
		}
	}
});

var spells = [
	// TODO get rid of these, and route the damage call from Fire Wall through spell itself some other way ...
	{name:'Fire', damage:5, range:8, area:2, cost:1, url:'objs/firewall.png'},
	{name:'Ice', damage:5, range:8, area:2, cost:1, url:'objs/firewall.png'},
	{name:'Bolt', damage:5, range:8, area:2, cost:1, url:'objs/firewall.png'},
	{name:'Fire Wall', spawn:FireWallObj, range:5, area:2, cost:3},
	{name:'Frog Wall', spawn:FriendlyFrogObj, range:10, area:3, cost:1, alwaysHits:true},
	{name:'Snake Wall', spawn:FriendlySnakeObj, range:10, area:3, cost:2, alwaysHits:true},
	{name:"Don't Move", inflictAttributes:["Don't Move"], range:10, area:3, cost:3},
	{name:"Poison", inflictAttributes:["Poison"], damage:5, range:10, area:3, cost:3},
	{name:"Heal", damage:-10, range:3, area:0, cost:3, targetSelf:true, alwaysHits:true},
	{name:"Antidote", removeAttributes:["Poison"], range:0, area:0, cost:1, targetSelf:true, alwaysHits:true},
	{name:"Regen", inflictAttributes:["Regen"], inflictChance:1, range:0, area:0, cost:1, targetSelf:true, alwaysHits:true},
	{name:"Blink", range:20, area:0, cost:10, targetSelf:true, useOnTile:function(caster, tile) { player.setPos(tile.pos.x, tile.pos.y); }},
	{name:"Light", range:20, area:0, cost:1, targetSelf:true, inflictAttributes:["Light"], inflictChance:1, alwaysHits:true}
];
for (var i = 0; i < spells.length; i++) {
	var spellProto = spells[i];
	if (!('super' in spellProto)) spellProto.super = Spell;
	var spell = new (makeClass(spellProto))();
	spells[i] = spell;
	if (spellProto.name in spells) throw "got two spells with matching names";
	spells[spellProto.name] = spell;
}


// items


var weaponBaseTypes = [
	{name:'Derp', damageType:'slash', fieldRanges:{physAttack:1, physHitChance:5}},
	{name:'Staff', damageType:'bludgeon', fieldRanges:{physAttack:1, physHitChance:10, magicAttack:5, magicHitChance:10}},
	{name:'Dagger', damageType:'slash', fieldRanges:{physAttack:2, physHitChance:10}},
	{name:'Sword', damageType:'slash', fieldRanges:{physAttack:3, physHitChance:15}},
	{name:'Flail', damageType:'bludgeon', fieldRanges:{physAttack:4, physHitChance:20}},
	{name:'Axe', damageType:'slash', fieldRanges:{physAttack:5, physHitChance:25}},
	//TODO range for these (targetting past the four cardinal directions)
	{name:'Boomerang', damageType:'bludgeon', fieldRanges:{physAttack:6, physHitChance:30}},
	{name:'Bow', damageType:'pierce', fieldRanges:{physAttack:7, physHitChance:35}},
	{name:'Star', damageType:'pierce', fieldRanges:{physAttack:8, physHitChance:40, range:10}},
	{name:'Crossbow', damageType:'pierce', fieldRanges:{physAttack:9, physHitChance:45, range:20}}
];

var weaponModifiers = [
	{name:"Plain ol'"},
	{name:'Short', fieldRanges:{physAttack:[0,5], physHitChance:[0,10]}},
	{name:'Long', fieldRanges:{physAttack:[3,8], physHitChance:[5,15]}},
	{name:'Heavy', fieldRanges:{physAttack:[3,8], physHitChance:[5,15]}},
	{name:'Bastard', fieldRanges:{physAttack:[0,10], physHitChance:[10,20]}},
	{name:'Demon', fieldRanges:{physAttack:[20,20], physHitChance:[30,35]}},
	{name:'Were', fieldRanges:{physAttack:[20,25], physHitChance:[35,45]}},
	{name:'Rune', fieldRanges:{physAttack:[30,35], physHitChance:[40,50]}},
	{name:'Dragon', fieldRanges:{physAttack:[30,40], physHitChance:[40,50]}},
	{name:'Quick', fieldRanges:{physAttack:[40,45], physHitChance:[90,100]}}
];
var weaponModifierFields = ['physAttack', 'physHitChance'];

var defenseModifiers = [
	{name:"Cloth", fieldRanges:{magicEvade:1, hpMax:1, physEvade:1}},
	{name:"Leather", fieldRanges:{magicEvade:2, hpMax:2, physEvade:2}},
	{name:"Wooden", fieldRanges:{magicEvade:3, hpMax:3, physEvade:3}},
	{name:"Chain", fieldRanges:{magicEvade:4, hpMax:4, physEvade:4}},
	{name:"Plate", fieldRanges:{magicEvade:5, hpMax:5, physEvade:5}},
	{name:"Copper", fieldRanges:{magicEvade:6, hpMax:6, physEvade:6}},
	{name:"Iron", fieldRanges:{magicEvade:7, hpMax:7, physEvade:7}},
	{name:"Bronze", fieldRanges:{magicEvade:8, hpMax:8, physEvade:8}},
	{name:"Steel", fieldRanges:{magicEvade:9, hpMax:9, physEvade:9}},
	{name:"Silver", fieldRanges:{magicEvade:10, hpMax:10, physEvade:10}},
	{name:"Gold", fieldRanges:{magicEvade:11, hpMax:11, physEvade:11}},
	{name:"Crystal", fieldRanges:{magicEvade:12, hpMax:12, physEvade:12}},
	{name:"Opal", fieldRanges:{magicEvade:13, hpMax:13, physEvade:13}},
	{name:"Platinum", fieldRanges:{magicEvade:14, hpMax:14, physEvade:14}},
	{name:"Plutonium", fieldRanges:{magicEvade:15, hpMax:15, physEvade:15}},
	{name:"Adamantium", fieldRanges:{magicEvade:16, hpMax:16, physEvade:16}},
	{name:"Potassium", fieldRanges:{magicEvade:17, hpMax:17, physEvade:17}},
	{name:"Osmium", fieldRanges:{magicEvade:18, hpMax:18, physEvade:18}},
	{name:"Holmium", fieldRanges:{magicEvade:19, hpMax:19, physEvade:19}},
	{name:"Mithril", fieldRanges:{magicEvade:20, hpMax:20, physEvade:20}},
	{name:"Aegis", fieldRanges:{magicEvade:21, hpMax:21, physEvade:21}},
	{name:"Genji", fieldRanges:{magicEvade:22, hpMax:22, physEvade:22}},
	{name:"Pro", fieldRanges:{magicEvade:23, hpMax:23, physEvade:23}},
	{name:"Diamond", fieldRanges:{magicEvade:24, hpMax:24, physEvade:24}}
];
var armorBaseTypes = [
	{name:'Armor'}
];
var armorModifiers = defenseModifiers;
var armorModifierFields = ['magicEvade', 'physEvade', 'hpMax'];

var helmBaseTypes = [
	{name:'Helm'}
];
var helmModifiers = defenseModifiers;
var helmModifierFields = ['magicEvade', 'physEvade'];

var shieldBaseTypes = [
	{name:'Buckler'},
	{name:'Shield', evadeRange:[5,10]}
];
var shieldModifiers = defenseModifiers;
var shieldModifierFields = ['magicEvade', 'physEvade'];

var Item = makeClass({
	costPerField : {
		physAttack : 10,
		physHitChance : 5,
		physEvade : 3,
		magicEvade : 7,
		hpMax : 5,	//equipment uses hp/mp Max
		mpMax : 3,
		hp : .8,	//usable items use hp/mp
		mp : 2,
		food : .02,
	},
	init : function() {
		if ('fieldRanges' in this) this.applyRanges(this.fieldRanges);
	},
	applyRanges : function(fieldRanges) {
		for (var field in fieldRanges) {
			var rangeInfo = fieldRanges[field];
			if (typeof(rangeInfo) == 'number') {
				rangeInfo = [Math.ceil(rangeInfo * .75), rangeInfo];
			}
			if (this[field] == undefined) this[field] = 0;
			var statValue = randomRange.apply(undefined, rangeInfo);
			this[field] += statValue;
			if (field in this.costPerField) {
				if (this.cost == undefined) this.cost = 0;
				this.cost += statValue * this.costPerField[field];
			}
		}
		if (this.cost !== undefined) this.cost = Math.ceil(this.cost);
	}
});

var UsableItem = makeClass({
	super : Item,
	use : function() {
		var result;
		if ('hp' in this) player.adjustPoints('hp', this.hp);
		if ('mp' in this) player.adjustPoints('mp', this.mp);
		if ('food' in this) player.adjustPoints('food', this.food);
		if ('attributes' in this) player.setAttributes(this.attributes);
		if ('removeAttributes' in this) player.removeAttributes(this.removeAttributes);
		//TODO player.giveSpell ... and have it up the spell level if the player already knows it
		if ('spellTaught' in this) {
			clientMessage("You learned "+this.spellTaught.name);
			player.spells.push(this.spellTaught);
		}
		if ('spellUsed' in this) {
			var thiz = this;
			this.spellUsed.clientUse({dontCost:true, onCast:function() {
				player.items.splice(player.items.indexOf(thiz), 1);
			}});
			result = 'keep';
		}
		return result;
	}
});

var EquipItem = makeClass({
	super : Item,
	init : function() {
		EquipItem.super.apply(this, arguments);
		var name = undefined;
		var area = 0;
		if ('baseTypes' in this) {
			var baseTypes = this.baseTypes;
			var baseType = pickRandom(baseTypes);
			if (baseType.damageType !== undefined) this.damageType = baseType.damageType;
			if (baseType.area !== undefined) area += baseType.area;
			this.applyRanges(baseType.fieldRanges);
			name = baseType.name;
		}
		if ('modifiers' in this) {
			if (!('modifierFields' in this)) {
				throw "class "+this.name+" has no modifierFields";
			}
			var modifiers = this.modifiers;
			var modifier = pickRandom(modifiers);
			if (modifier.area !== undefined) area += modifier.area;
			if ('fieldRanges' in modifier) {
				var modifierRanges = {};
				for (var i = 0; i < this.modifierFields.length; i++) {
					var field = this.modifierFields[i]
					modifierRanges[field] = modifier.fieldRanges[field];
				}
				this.applyRanges(modifierRanges);
			}
			if (name !== undefined) name = modifier.name+' '+name;
			else name = modifier.name;
		}
		if (name !== undefined) this.name = name;
		this.attackOffsets = [new vec2(1,0)];
		var used = {};
		used[(new vec2(0,0)).toString()] = true;
		used[(new vec2(1,0)).toString()] = true;
		for (var i = 0; i < area; i++) {
			for (var tries = 0; tries < 100; tries++) {
				var src = pickRandom(this.attackOffsets);
				var ofs = pickRandom(dirs).offset;
				var dst = src.add(ofs);
				var dstkey = dst.toString();
				if (dstkey in used) continue;
				this.attackOffsets.push(dst);
				used[dstkey] = true;
				break;
			}
		}
		this.attackOffsets.splice(0,1);
	}
});

var WeaponItem = makeClass({
	super : EquipItem,
	name : 'Weapon',
	type : 'weapon',
	baseTypes : weaponBaseTypes,
	modifiers : weaponModifiers,
	modifierFields : weaponModifierFields
});

var ArmorItem = makeClass({
	super : EquipItem,
	name : 'Armor',
	type : 'armor',
	baseTypes : armorBaseTypes,
	modifiers : armorModifiers,
	modifierFields : armorModifierFields
});

var ShieldItem = makeClass({
	super : EquipItem,
	name : 'Shield',
	type : 'shield',
	baseTypes : shieldBaseTypes,
	modifiers : shieldModifiers,
	modifierFields : shieldModifierFields
});

var HelmItem = makeClass({
	super : EquipItem,
	name : 'Helm',
	type : 'helm',
	baseTypes : helmBaseTypes,
	modifiers : helmModifiers,
	modifierFields : helmModifierFields
});

var RelicItem = makeClass({
	super : EquipItem,
	name : 'Relic',
	type : 'relic'
});

var itemClasses = [
	//potions 
	makeClass({super:UsableItem, name:'Potion', fieldRanges:{hp:25}}),
	makeClass({super:UsableItem, name:'Big Potion', fieldRanges:{hp:150}}),
	makeClass({super:UsableItem, name:'Mana', fieldRanges:{mp:25}}),
	makeClass({super:UsableItem, name:'Big Mana', fieldRanges:{mp:150}}),
	makeClass({super:UsableItem, name:'Antidote', cost:10, removeAttributes:['Poison']}),
	makeClass({super:UsableItem, name:'Torch', cost:10, attributes:['Light']}),
	//food
	makeClass({super:UsableItem, name:'Apple', fieldRanges:{food:100}}),
	makeClass({super:UsableItem, name:'Bread', fieldRanges:{food:200}}),
	makeClass({super:UsableItem, name:'Cheese', fieldRanges:{food:350}}),
	makeClass({super:UsableItem, name:'Fish Fillet', fieldRanges:{food:500}}),
	makeClass({super:UsableItem, name:'Venison', fieldRanges:{food:1000}}),
	makeClass({super:UsableItem, name:'Steak', fieldRanges:{food:2000}}),
	//weapon
	WeaponItem,
	//shields, armor, helms
	ArmorItem,
	ShieldItem,
	HelmItem,
	//relics
	makeClass({super:RelicItem, name:'Flashlight', cost:500, lightRadius:20}),
	makeClass({super:RelicItem, name:'MPify', cost:500, mpMaxModify:function(value) { return value * 2; }, hpMaxModify:function(value) { return Math.ceil(value/2); }}),
	makeClass({super:RelicItem, name:'HPify', cost:500, hpMaxModify:function(value) { return value * 2; }, mpMaxModify:function(value) { return Math.ceil(value/2); }})
];
for (var i = 0; i < spells.length; i++) {
	var spell = spells[i];
	itemClasses.push(makeClass({super:UsableItem, name:spell.name+' Book', cost:100, spellTaught:spell}));
}
for (var i = 0; i < spells.length; i++) {
	var spell = spells[i];
	itemClasses.push(makeClass({super:UsableItem, name:spell.name+' Scroll', cost:10, spellUsed:spell}));
}
for (var i = 0; i < itemClasses.length; i++) {
	itemClasses[itemClasses[i].prototype.name] = itemClasses[i];
}



// tile types


var Tile = makeClass({
	init : function() {
		this.img = pickRandom(this.imgs);
		assert(arguments.length == 1);
		var pos = arguments[0];
		this.pos = new vec2(pos);
	}
});


var tileTypes = [
	makeClass({
		super:Tile,
		name:'Grass', 
		urls:['images/grass.png','images/grass2.png','images/grass3.png']
	}),
	makeClass({super:Tile, name:'Trees', urls:['images/trees.png']}),
	makeClass({super:Tile, name:'Water', urls:['images/water.png'], water:true}),
	makeClass({super:Tile, name:'Stone', urls:['images/stone.png'], solid:true}),
	makeClass({super:Tile, name:'Bricks', urls:['images/bricks.png']}),
	makeClass({super:Tile, name:'Wall', urls:['images/wall.png'], solid:true})
];
for (var i = 0; i < tileTypes.length; i++) {
	var tileType = tileTypes[i];
	if (tileType.prototype.name in tileTypes) console.log("tileTypes name "+tileType.prototype.name+" used twice!");
	tileTypes[tileType.prototype.name] = tileType;
}

var tileTypeForPixel = {
	0x00ff00 : tileTypes.Grass,
	0x007f00 : tileTypes.Trees,
	0x0000ff : tileTypes.Water,
	0x7f0000 : tileTypes.Stone,
	0xffffff : tileTypes.Bricks,
	0x000000 : tileTypes.Wall
};


// globals


var canvas;
var map;
var tileSize = new vec2(64, 64);
var fontSize = 32;
var player;
var setMapRequest = undefined;
var keyCallback;

var maps = [];
var storyInfo = {};


var Map = makeClass({
	/*
	args:
		name
		size = required for non-url maps
		url = optional, says to load the map from a specified png file
		onload = optional for url maps
		exitMap
		temp
		wrap
		spawn
		resetObjs
		fixedObjs
		playerStart
		tileType
	*/
	init : function(args) {
		this.name = assertExists(args, 'name');
		
		this.fixedObjs = [];
		if ('url' in args) this.url = args.url;
		if ('exitMap' in args) this.exitMap = args.exitMap;
		if ('temp' in args) this.temp = args.temp;
		if ('wrap' in args) this.wrap = args.wrap;
		if ('spawn' in args) this.spawn = args.spawn;
		if ('resetObjs' in args) this.resetObjs = args.resetObjs;
		if ('fixedObjs' in args) this.fixedObjs = args.fixedObjs;
		if ('playerStart' in args) this.playerStart = new vec2(args.playerStart);
		if ('fogColor' in args) this.fogColor = args.fogColor;
		if ('url' in args) {
			var img = makeDOM('img');
			var thiz = this;
			img.onload = function() {
				thiz.size = new vec2(img.width, img.height);
				thiz.bbox = new box2(new vec2(), thiz.size.sub(1));
				var canvas = makeDOM('canvas', {width:img.width, height:img.height});
				var ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0);
				var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				thiz.tiles = [];
				for (var y = 0; y < thiz.size.y; y++) {
					var tilerow = [];
					thiz.tiles[y] = tilerow;
					for (var x = 0; x < thiz.size.x; x++) {
						var pixel = getPixel(imgData, x, y);
						var tileType = tileTypeForPixel[pixel];
						if (!tileType) {
							console.log("failed to get type for pixel "+pixel);
							tileType = tileTypeForPixel[0xffffff];
						}
						var tile = new tileType(new vec2(x,y));
						tilerow[x] = tile;
					}
				}
				maps.push(thiz);
				maps[thiz.name] = thiz;
				if ('onload' in args) args.onload(thiz);
			};
			img.src = args.url;
		} else if ('size' in args) {
			this.size = new vec2(args.size);
			this.bbox = new box2(new vec2(), this.size.sub(1));
	
			var tileType = tileTypes.Grass;
			if ('tileType' in args) tileType = args.tileType;
			this.tiles = [];
			for (var y = 0; y < this.size.y; y++) {
				var tilerow = [];
				this.tiles[y] = tilerow;
				for (var x = 0; x < this.size.x; x++) {
					tilerow[x] = new tileType(new vec2(x,y));
				}
			}
			
			maps.push(this);
			maps[this.name] = this;
			if ('onload' in args) args.onload(this);
		}
	},
	//wraps the position if the map is a wrap map
	//if not, returns false
	wrapPos : function(pos) {
		pos.y = Math.floor(pos.y);
		pos.x = Math.floor(pos.x);
		if (this.wrap) {
			pos.y = ((pos.y % this.size.y) + this.size.y) % this.size.y;
			pos.x = ((pos.x % this.size.x) + this.size.x) % this.size.x;
		} else {
			if (pos.x < 0 || pos.y < 0 || pos.x >= this.size.x || pos.y >= this.size.y) return false;
		}
		return true;
	},
	getTile : function(x,y) {
		var pos = new vec2(x,y);
		if (!this.wrapPos(pos)) return;
		var tile = this.tiles[pos.y][pos.x];
		return tile;
	},
	setTileType : function(x,y,tileType) {
		var pos = new vec2(x,y);
		if (!this.wrapPos(pos)) return;
		var tile = new tileType(pos);
		this.tiles[pos.y][pos.x] = tile;
		return tile;
	},
	/*
	args:
		pos
		range,
		callback
	*/
	floodFill : function(args) {
		var allTiles = {};
		var startPos = new vec2(args.pos);
		var startTile = this.getTile(startPos.x, startPos.y);
		var startInfo = {tile:startTile, pos:startPos, dist:0};
		args.callback(startInfo.tile, startInfo.dist);
		allTiles[startPos.toString()] = startInfo;
		var current = [startInfo];
		while (current.length > 0) {
			var next = [];
			for (var i = 0; i < current.length; i++) {
				var currentInfo = current[i];
				var nextDist = currentInfo.dist + 1;
				if (nextDist <= args.maxDist) {
					for (var j = 0; j < dirs.length; j++) {
						var nextPos = currentInfo.pos.add(dirs[j].offset);
						if (this.wrapPos(nextPos)) {
							var nextkey = nextPos.toString();
							if (!(nextkey in allTiles)) {
								var tile = this.getTile(nextPos.x, nextPos.y);
								var nextInfo = {tile:tile, pos:nextPos, dist:nextDist};
								allTiles[nextkey] = true;
								if (args.callback(tile, nextDist)) {
									next.push(nextInfo);
								}
							}
						}
					}
				}
			}
			current = next;
		}
	},
	pathfind : function(start, end) {
		if (!this.wrapPos(start)) return;
		if (!this.wrapPos(end)) return;
		var srcX = start.x;
		var srcY = start.y;
		var dstX = end.x;
		var dstY = end.y;
		
		var srcpos = new vec2(srcX, srcY);
		var currentset = [{pos:srcpos}];
		var alltiles = {};	//keys are serialized vectors
		alltiles[srcpos.toString()] = true;
		
		while (currentset.length > 0) {
			/*
			for all current options
			test neighbors
			if any are not in all tiles then add it to the next set and to the all tiles
			*/
			var nextset = [];
			for (var i = 0; i < currentset.length; i++) {
				var currentmove = currentset[i];
				for (var dirIndex = 0; dirIndex < dirs.length; dirIndex++) {
					var nextpos = currentmove.pos.add(dirs[dirIndex].offset);
					if (this.wrapPos(nextpos)) {
						if (nextpos.x == dstX && nextpos.y == dstY) {
							//process the list and return it
							var rpath = [nextpos, currentmove.pos];
							var src = currentmove.src;
							while (src) {
								rpath.push(src.pos);
								src = src.src;
							}
							var path = rpath.reverse();
							return path;
						}
						var nextkey = nextpos.toString();
						if (!(nextkey in alltiles)) {
							var tile = this.tiles[nextpos.y][nextpos.x];
							if (!(tile.solid || tile.water)) {
								alltiles[nextkey] = true;
								nextset.push({pos:nextpos, src:currentmove});
							}
						}
					}
				}
			}
			currentset = nextset;
		}
	}
});


/*
args:
	map
	classify
	bbox <- default: range
*/
function pickFreeRandomFixedPos(args) {
	var map = args.map;
	var bbox;
	if ('bbox' in args) bbox = new box2(args.bbox);
	else bbox = new box2(map.bbox);
	var classify = args.classify;
	
	for (var attempt = 0; attempt < 1000; attempt++) {
		var pos = randomBoxPos(bbox);
		var tile = map.getTile(pos.x, pos.y);
		
		var good;
		if (classify) good = classify(tile);
		else good = !(tile.solid || tile.water);
		if (!good) continue;

		var found = false;
		for (var i = 0; i < map.fixedObjs.length; i++) {
			var obj = map.fixedObjs[i];
			if (obj.pos.x == pos.x && obj.pos.y == pos.y) {
				found = true;
				break;
			}
		}
		if (found) continue;
		
		return pos;
	}
	console.log("failed to find free position");
	return new vec2();
}

function findFixedObj(map, callback) {
	for (var i = 0; i < map.fixedObjs.length; i++) {
		var fixedObj = map.fixedObjs[i];
		if (callback(fixedObj)) return fixedObj;
	}
}

/*
args:
	name
	size
	temp
	healer
	stores
	world
	worldPos
*/
function genTown(args) {
	
	var world = args.world;
	world.fixedObjs.push({
		type:TownObj,
		pos:args.worldPos,
		destMap:args.name
	});
	
	var map = new Map({
		name:args.name,
		size:new vec2(args.size),
		temp:args.temp,
		exitMap:world.name,
		resetObjs:true
	});
	map.playerStart = new vec2(Math.floor(map.size.x/2), map.size.y-2);
	var border = 3;
	var entrance = 6;
	for (var y = 0; y < map.size.y; y++) {
		for (var x = 0; x < map.size.x; x++) {
			if (x < border || y < border || y >= map.size.y-border) {
				if (Math.abs(x-map.size.x/2) >= entrance) {
					map.setTileType(x,y,tileTypes.Stone);
				}
			} else if (x >= map.size.x-border) {
				map.setTileType(x,y,tileTypes.Water);
			}
		}
	}

	map.fixedObjs.push({
		type:GuardObj,
		pos:new vec2(Math.floor(map.size.x/2-entrance)+2, map.size.y-2)
	});
	
	map.fixedObjs.push({
		type:GuardObj,
		pos:new vec2(Math.floor(map.size.x/2+entrance)-2, map.size.y-2)
	});
	
	var brickradius = 3;
	var buildBricksAround = function(pos) {
		var minx = pos.x - brickradius;
		var miny = pos.y - brickradius;
		var maxx = pos.x + brickradius;
		var maxy = pos.y + 1;
		if (minx < 0) minx = 0;
		if (miny < 0) miny = 0;
		if (maxx >= map.size.x) maxx = map.size.x-1;
		if (maxy >= map.size.y) maxy = map.size.y-1;
		for (var y = miny; y <= maxy; y++) { 
			for (var x = minx; x <= maxx; x++) {
				if (map.getTile(x,y).isa(tileTypes.Grass)) {
					if (distLInf(pos,{x:x,y:y}) == Math.ceil(brickradius/2) && y <= pos.y) {
						map.setTileType(x,y,tileTypes.Wall);
					} else {
						map.setTileType(x,y,tileTypes.Bricks);
					}
				}
			}
		}
	};

	var dockGuy = {
		type:MerchantObj,
		pos:new vec2(map.size.x-border-brickradius-1, randomRange(border+1, map.size.y-border-2)),
		onInteract:function(player) {
			if (!storyInfo.foundPrincess) {
				clientMessage("I'm the guy at the docks");
			} else {
				clientMessage("We're sailing for the capitol! All set?");
				var prompt = clientPrompt(['No', 'Yes'], function(cmd, index) {
					prompt.close();
					if (cmd == 'Yes') {
						//TODO make the player a boat ...
						setMapRequest = {map:'World'};
					}
				});
			}
		}
	};
	buildBricksAround(dockGuy.pos);
	map.fixedObjs.push(dockGuy);

	var pathwidth = 1;
	var brickradius = 3;
	
	var findNPCPos = function() {
		return pickFreeRandomFixedPos({
			map:map,
			classify:function(tile) { 
				return tile.isa(tileTypes.Grass);
			},
			bbox:new box2(
				new vec2(border+brickradius+1, border+brickradius+1), 
				new vec2(map.size.x-border-brickradius-2,map.size.y-border-brickradius-3))
		});
	}

	var suckGuy = {
		type:MerchantObj,
		msg:'YOU SUCK',
		pos:findNPCPos()
	};
	buildBricksAround(suckGuy.pos);
	map.fixedObjs.push(suckGuy);
	
	var storyGuy = {
		type:MerchantObj, 
		pos:findNPCPos(),
		onInteract:function(player) {
			if (!storyInfo.foundPrincess) {
				clientMessage("They stole the princess! Follow the brick path and you'll find them!");
			} else {
				clientMessage("Thank you for saving her! Now you must take her to the capital.  Talk to the guy at the dock to take the next boat out of town.");
			}
		}
	}
	buildBricksAround(storyGuy.pos);
	map.fixedObjs.push(storyGuy);
	
	var signOffset = new vec2(-2,0);

	if (args.healer) {
		var healerGuy = {
			type:MerchantObj,
			pos:findNPCPos(),
			onInteract:function(player) {
				var cost = 1;
				if (player.hp == player.stat('hpMax') && player.mp == player.stat('mpMax')) {
					clientMessage("Come back when you need a healin'!");
				} else if (player.gold >= cost) {
					player.gold -= cost;
					player.adjustPoints('mp', Math.ceil(player.stat('mpMax')/5));
					player.adjustPoints('hp', Math.ceil(player.stat('hpMax')/5));
					clientMessage("Heal yo self!");
				} else {
					clientMessage("No free lunches!!! One coin please!");
				}
			}
		};
		buildBricksAround(healerGuy.pos);
		map.fixedObjs.push(healerGuy);
		map.fixedObjs.push({
			type:HealSign,
			pos:healerGuy.pos.add(signOffset)
		});
	}

	if ('stores' in args) {
		for (var i = 0; i < args.stores.length; i++) {
			var storeInfo = args.stores[i];
			var storeGuy = {
				type:MerchantObj,
				pos:findNPCPos(),
				store:true,
				itemClasses:storeInfo.itemClasses
			};
			if ('msg' in storeInfo) storeGuy.msg = storeInfo.msg;
			buildBricksAround(storeGuy.pos);
			map.fixedObjs.push(storeGuy);
			map.fixedObjs.push({
				type:storeInfo.signType,
				pos:storeGuy.pos.add(signOffset)
			});
		}
	}

	for (var y = 0; y < map.size.y; y++) {
		for (var x = Math.floor(map.size.x/2)-pathwidth; x <= Math.floor(map.size.x/2)+pathwidth; x++) {
			if (map.getTile(x,y).isa(tileTypes.Grass)) {
				map.setTileType(x,y,tileTypes.Bricks);
			}
		}
	}

	for (var i = 0; i < map.fixedObjs.length; i++) {
		var fixedObj = map.fixedObjs[i];
		if (fixedObj.type == MerchantObj) {
			for (var x = Math.min(fixedObj.pos.x, Math.floor(map.size.x/2)); x <= Math.max(fixedObj.pos.x, Math.floor(map.size.x/2)); x++) {
				for (var y = fixedObj.pos.y-pathwidth; y <= fixedObj.pos.y+pathwidth; y++) {
					if (x >= 0 && y >= 0 && x < map.size.x && y < map.size.y) {
						if (map.getTile(x,y).isa(tileTypes.Grass)) {
							map.setTileType(x,y,tileTypes.Bricks);
						}
					}
				}
			}
		}
	}
	
	maps.push(map);

	return map;
}


function genDungeonLevel(map,prevMapName,nextMapName,avgRoomSize) {
	var rooms = [];

	//console.log("begin gen "+map.name);

	var max = Math.floor(map.size.x * map.size.y / avgRoomSize);
	for (var i = 0; i < max; i++) {
		var room = {pos:randomBoxPos(map.bbox)};
		room.bbox = new box2(room.pos, room.pos);
		rooms.push(room);
		map.tiles[room.pos.y][room.pos.x].room = room;
	}

	var modified;
	do {
		modified = false;
		for (var j = 0; j < rooms.length; j++) {
			var room = rooms[j];
			var bbox = new box2(room.bbox.min.sub(1), room.bbox.max.add(1)).clamp(map.bbox);
			var roomcorners = [room.bbox.min, room.bbox.max];
			var corners = [bbox.min, bbox.max];
			for (var i = 0; i < corners.length; i++) {
				var corner = corners[i];
				var found = false;
				for (var y = room.bbox.min.y; y <= room.bbox.max.y; y++) {
					if ('room' in map.tiles[y][corner.x]) {
						found = true;
						break;
					}
				}
				if (!found) {
					for (var y = room.bbox.min.y; y <= room.bbox.max.y; y++) {
						map.tiles[y][corner.x].room = room;
					}
					roomcorners[i].x = corner.x;
					modified = true;
				}

				found = false;
				for (var x = room.bbox.min.x; x <= room.bbox.max.x; x++) {
					if ('room' in map.tiles[corner.y][x]) {
						found = true;
						break;
					}
				}
				if (!found) {
					for (var x = room.bbox.min.x; x <= room.bbox.max.x; x++) {
						map.tiles[corner.y][x].room = room;
					}
					roomcorners[i].y = corner.y;
					modified = true;
				}
			}
		}
	} while(modified);

	//clear tile rooms for reassignment
	for (var y = 0; y < map.size.y; y++) {
		for (var x = 0; x < map.size.x; x++) {
			delete map.tiles[y][x].room;
		}
	}

	//carve out rooms
	//console.log("carving out rooms");
	for (var i = 0; i < rooms.length; i++) {
		var room = rooms[i];
		room.bbox.min.x++;
		room.bbox.min.y++;

		//our room goes from min+1 to max-1
		//so if that distance is zero then we have no room
		var dead = (room.bbox.min.x > room.bbox.max.x) || (room.bbox.min.y > room.bbox.max.y);
		if (dead) {
			rooms.splice(i,1);
			i--;
			continue;
		}
		
		for (var y = room.bbox.min.y; y <= room.bbox.max.y; y++) {
			for (var x = room.bbox.min.x; x <= room.bbox.max.x; x++) {
				map.setTileType(x,y,tileTypes.Bricks);
			}
		}
	
		//rooms
		for (var y = room.bbox.min.y; y <= room.bbox.max.y; y++) {
			for (var x = room.bbox.min.x; x <= room.bbox.max.x; x++) {
				map.tiles[y][x].room = room;
			}
		}
	}
	

	var dimfields = ['x','y'];
	var minmaxfields = ['min','max'];
	//see what rooms touch other rooms
	//console.log("finding neighbors");
	var pos = new vec2();
	for (var i = 0; i < rooms.length; i++) {
		var room = rooms[i];
		room.neighbors = [];

		for (var dim = 0; dim < 2; dim++) {
			var dimfield = dimfields[dim];
			var dimnextfield = dimfields[(dim+1)%2];
			for (var minmax = 0; minmax < 2; minmax++) {
				var minmaxfield = minmaxfields[minmax];
				var minmaxofs;
				if (minmax == 0) minmaxofs = -1;
				else minmaxofs = 1;
				pos[dimfield] = room.bbox[minmaxfield][dimfield] + minmaxofs;
				for (pos[dimnextfield] = room.bbox.min[dimnextfield]+1; pos[dimnextfield] <= room.bbox.max[dimnextfield]-1; pos[dimnextfield]++) {
					//step twice to find our neighbor
					var nextpos = new vec2(pos);
					nextpos[dimfield] += minmaxofs;
					var tile = map.getTile(nextpos.x,nextpos.y);
					if (!tile) continue;
					if (!('room' in tile)) continue;
					var neighborRoom = tile.room;
					var neighborRoomIndex = rooms.indexOf(neighborRoom);
					if (neighborRoomIndex == -1) throw "found unknown neighbor room";
					var j = 0;
					for (; j < room.neighbors.length; j++) {
						if (room.neighbors[j].room == neighborRoom) break;
					}
					if (j == room.neighbors.length) room.neighbors.push({room:neighborRoom, positions:[]});
					room.neighbors[j].positions.push(new vec2(pos));
				}
			}
		}
	}

	//pick a random room as the start
	//TODO start in a big room.
	var startRoom = pickRandom(rooms);
	var lastRoom = startRoom;

	var leafRooms = [];
	var usedRooms = [startRoom];

	//console.log("establishing connectivity");
	while (true) {
		var srcRoomOptions = usedRooms.filter(function(room) {
			//if the room has no rooms that haven't been used,then don't consider it
			//so keep all of the neighbor's neighbors that haven't been used
			var usedNeighbors = room.neighbors.filter(function(neighborInfo) {
				return usedRooms.indexOf(neighborInfo.room) == -1;
			});
			//if this has any good neighbors then consider it
			return usedNeighbors.length > 0;
		});
		if (srcRoomOptions == 0) break;
		var srcRoom = pickRandom(srcRoomOptions);

		var leafRoomIndex = leafRooms.indexOf(srcRoom);
		if (leafRoomIndex != -1) leafRooms.splice(leafRoomIndex, 1);
	
		//this is the same filter as is within the srcRoomOptions filter -- so if you want to cache this info, feel free
		var neighborInfoOptions = srcRoom.neighbors.filter(function(neighborInfo) {
			return usedRooms.indexOf(neighborInfo.room) == -1;
		});
		var neighborInfo = pickRandom(neighborInfoOptions);
		var dstRoom = neighborInfo.room;
		lastRoom = dstRoom;
		//so find dstRoom in srcRoom.neighbors
		var pos = pickRandom(neighborInfo.positions);
		map.setTileType(pos.x, pos.y, tileTypes.Bricks);
		map.fixedObjs.push({
			pos:pos,
			type:DoorObj
		});
		usedRooms.push(dstRoom);
		leafRooms.push(dstRoom);
	}

	/*
	for (var y = 0; y < map.size.y; y++) {
		for (var x = 0; x < map.size.x; x++) {
			delete map.tiles[y][x].room;
		}
	}
	*/

	var upstairs = {
		type:UpStairsObj,
		pos:pickFreeRandomFixedPos({map:map, bbox:startRoom.bbox}),
		destMap:prevMapName
	};
	map.fixedObjs.push(upstairs);
	map.playerStart = upstairs.pos;
	if (nextMapName) {
		map.fixedObjs.push({
			type:DownStairsObj,
			pos:pickFreeRandomFixedPos({map:map, bbox:lastRoom.bbox}),
			destMap:nextMapName
		});
	} else {
		//add a princess or a key or a crown or something stupid
		map.fixedObjs.push({
			type:MerchantObj,
			pos:pickFreeRandomFixedPos({map:map, bbox:lastRoom.bbox}),
			msg:'Tee Hee! Take me back to the village',
			onInteract:function(player) {
				MerchantObj.prototype.onInteract.apply(this, arguments);
				player.adjustPoints('hp', player.stat('hpMax'));
				// unlock the next story point
				//TODO quests?
				storyInfo.foundPrincess = true;
				this.remove = true;
			}
		});
	}
	
	//add treasure - after stairs so they get precedence
	for (var i = 0; i < usedRooms.length; i++) {
		var room = usedRooms[i];
		if (room == startRoom) continue;
		if (room == lastRoom) continue;
		if (Math.random() > .5) continue;

		map.fixedObjs.push({
			type:TreasureObj,
			pos:pickFreeRandomFixedPos({map:map, bbox:room.bbox})
		});
	}

	//console.log("end gen "+map.name);
}

/*
args:
	prefix - name prefix (1..n appended to it for each level)
	depth - how many levels deep
	size
	spawn
	tempRange : {from:#, to:#}
	world
	worldPos
	avgRoomSize
*/
function genDungeon(args) {
	var world = args.world;
	world.fixedObjs.push({
		type:TownObj,
		pos:args.worldPos,
		destMap:args.prefix+'1'
	});

	var avgRoomSize = 20;
	if ('avgRoomSize' in args) avgRoomSize = args.avgRoomSize;

	//console.log("generating dungeon stack "+args.prefix);
	var depth = 1;
	if ('depth' in args) depth = args.depth;
	var firstMap;
	for (var i = 0; i < depth; i++) {
		var map = new Map({
			name:args.prefix+(i+1),
			size:new vec2(args.size),
			spawn:args.spawn,	//all keeping the same copy for now
			temp:args.temp.to*i/depth + args.temp.from*(depth-1-i)/depth,
			tileType:tileTypes.Wall,
			fogColor:'rgb(0,0,0)',
			fogDecay:.01
		});
		if (!firstMap) firstMap = map;

		var prevMapName = undefined;
		var nextMapName = undefined;
		if (i == 0) prevMapName = 'World';
		else prevMapName = args.prefix+i;
		if (i < depth-2) nextMapName = args.prefix+(i+2);
		genDungeonLevel(map, prevMapName, nextMapName, avgRoomSize);

		//after generating it and before adding it
		//modify all warps to this dungeon -- give them the appropriate location
		if (i == 0) {
			for (var j = 0; j < maps.length; j++) {
				var othermap = maps[j];
				if ('fixedObjs' in othermap) {
					for (var k = 0; k < othermap.fixedObjs.length; k++) {
						var fixedObj = othermap.fixedObjs[k];
						if (fixedObj.destMap == args.prefix+'1') {
							for (var l = 0; l < map.fixedObjs.length; l++) {
								if (map.fixedObjs[l].type == UpStairsObj) {
									fixedObj.destPos = map.fixedObjs[l].pos;
									break;
								}
							}
						}
					}
				}
			}
		}
		maps.push(map);
	}

	//console.log("done with "+args.prefix);
	return firstMap;
}

/*
args:
	name
	size
	temp

start it out 
*/

function drawGrassBlob(map, cx,cy,r) {
	var extra = 3;
	var sr = r + extra;
	for (var dy = -sr; dy <= sr; dy++) {
		for (var dx = -sr; dx <= sr; dx++) {
			var x = dx + cx;
			var y = dy + cy;
			var rad = Math.sqrt(dx*dx + dy*dy);
			rad -= extra*(1+noise(x/10,y/10));
			if (rad <= r) {
				var mx = (x + map.size.x) % map.size.x;
				var my = (y + map.size.y) % map.size.y;
				map.setTileType(mx, my, tileTypes.Grass);
			}
		}
	}
}

function initMaps() {
	/* randgen world */
	var worldBaseSpawnRate = .02;
	var world = new Map({
		name:'World',
		size:new vec2(256, 256),
		temp:70,
		tileType:tileTypes.Water,
		wrap:true,
		spawn:[
			{type:OrcObj, rate:worldBaseSpawnRate},
			{type:ThiefObj, rate:worldBaseSpawnRate/10},
			{type:TroggleObj, rate:worldBaseSpawnRate/20},
			{type:FighterObj, rate:worldBaseSpawnRate/30},
			{type:FishObj, rate:worldBaseSpawnRate/20},
			{type:DeerObj, rate:worldBaseSpawnRate/20},
			{type:SeaMonsterObj, rate:worldBaseSpawnRate/40},
			{type:EnemyBoatObj, rate:worldBaseSpawnRate/80}
		]
	});
	
	var grassRadius = 15;
	var townGrassPos = randomBoxPos(world.bbox);
	var dungeonDist = 10;
	var dungeonPos = new vec2(randomRange(-2*dungeonDist,-dungeonDist),randomRange(-dungeonDist,dungeonDist)).add(townGrassPos);
	var delta = dungeonPos.sub(townGrassPos);
	var divs = Math.ceil(Math.max(Math.abs(delta.x), Math.abs(delta.y)));
	for (var i = 0; i <= divs; i++) {
		var frac = i / divs;
		var x = Math.floor(townGrassPos.x + delta.x * frac + .5);
		var y = Math.floor(townGrassPos.y + delta.y * frac + .5);
		//TODO single ellipsoid with control points at townGrassPos and dungeonPos
		drawGrassBlob(world, x, y, grassRadius);
	}
	//TODO then trace from townGrassPos to the sea

	var townPos = new vec2(townGrassPos);
	while (world.getTile(townPos.x,townPos.y).isa(tileTypes.Grass)) townPos.x++;
	world.playerStart = townPos.sub(new vec2(1,0));

	function isWeapon(itemClass) { return isa(itemClass, WeaponItem); }
	function isRelic(itemClass) { return isa(itemClass, RelicItem); }
	function isArmor(itemClass) { return !isWeapon(itemClass) && !isRelic(itemClass) && isa(itemClass, EquipItem); }	//all else
	function isFood(itemClass) { return isa(itemClass, UsableItem) && 'food' in itemClass.prototype || 'fieldRanges' in itemClass.prototype && 'food' in itemClass.prototype.fieldRanges; }
	function isSpell(itemClass) { return isa(itemClass, UsableItem) && 'spellUsed' in itemClass.prototype || 'spellTaught' in itemClass.prototype; }
	function isMisc(itemClass) { return isa(itemClass, UsableItem) && !isFood(itemClass) && !isSpell(itemClass); }

	var town = genTown({
		world:world,
		worldPos:townPos,
		name:'Helpless Village',
		size:new vec2(32, 32),
		temp:70,
		healer:true,
		//TODO gen a whole bunch of items, then divy them up (rather than searching through their prototypes and trying to predict their behavior)
		stores:[
			{signType:WeaponSign, itemClasses:itemClasses.filter(isWeapon), msg:'Weapons for sale'},
			{signType:RelicSign, itemClasses:itemClasses.filter(isRelic), msg:'Relics for sale'},
			{signType:ArmorSign, itemClasses:itemClasses.filter(isArmor), msg:'Armor for sale'},
			{signType:FoodSign, itemClasses:itemClasses.filter(isFood), msg:'Welcome to the food library. Foooood liiibraaary.'},
			{signType:SpellSign, itemClasses:itemClasses.filter(isSpell), msg:'Double,  double,  toil and trouble...'},
			{signType:ItemSign, itemClasses:itemClasses.filter(isMisc), msg:'Items for sale'}
		]
	});

	var dungeonBaseSpawnRate = .1;
	var dungeon = genDungeon({
		world:world,
		worldPos:dungeonPos,
		prefix:'DungeonA',
		depth:16, 
		size:new vec2(64, 64),
		avgRoomSize:100,
		spawn:[
			{type:OrcObj, rate:dungeonBaseSpawnRate},
			{type:SnakeObj, rate:dungeonBaseSpawnRate/2},
			{type:FighterObj, rate:dungeonBaseSpawnRate/10}
		],
		temp:{from:70, to:40}
	});

	var townFixedObj = findFixedObj(world, function(fixedObj) { return fixedObj.destMap == town.name; });
	var dungeonFixedObj = findFixedObj(world, function(fixedObj) { return fixedObj.destMap == dungeon.name; });
	//now pathfind from townFixedObj.pos to dungeonFixedObj.pos, follow the path, and fill it in as brick
	var path = world.pathfind(townFixedObj.pos, dungeonFixedObj.pos);
	if (!path) console.log("from",townFixedObj.pos,"to",dungeonFixedObj.pos);
	if (path) {
		for (var i = 0; i < path.length; i++) {
			var pos = path[i];
			world.setTileType(pos.x, pos.y, tileTypes.Bricks);
		}	
	}

	//put rocks around the town
	var rockRadius = 3;
	for (var y = townFixedObj.pos.y - rockRadius; y <= townFixedObj.pos.y + rockRadius; y++) {
		for (var x = townFixedObj.pos.x - rockRadius; x <= townFixedObj.pos.x + rockRadius; x++) {
			var tile = world.getTile(x,y);
			if (tile.isa(tileTypes.Grass)) {
				if (distLInf(townFixedObj.pos,{x:x,y:y}) <= 1) {
					world.setTileType(x,y,tileTypes.Bricks);
				} else {
					world.setTileType(x,y,tileTypes.Stone);
				}
			}
		}
	}

	//now sprinkle in trees
	for (var y = 0; y < world.size.y; y++) {
		for (var x = 0; x < world.size.x; x++) {
			if (world.getTile(x,y).isa(tileTypes.Grass)) {
				if (Math.random() < (noise(x/20,y/20)+1)*.5 - .1) {
					world.setTileType(x,y,tileTypes.Trees);
				}
			}
		}
	}

	//and add a mountain range or two ... 
}

function drawTextBlock(ctx, msgs, x, y, floatRight) {
	ctx.save();
	ctx.font = fontSize+'px sans-serif';
	
	var maxWidth = 0;
	for (var j = 0; j < msgs.length; j++) {
		maxWidth = Math.max(maxWidth, ctx.measureText(msgs[j]).width);
	}

	var rectx = x;
	if (floatRight) rectx -= maxWidth + 20;
	
	ctx.save();
	ctx.globalAlpha = .35;
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(rectx, y, maxWidth + 20, fontSize * msgs.length + 10);
	ctx.restore();

	y += fontSize;
	for (var j = 0; j < msgs.length; j++) {
		var rowx = x;
		var msg = msgs[j];
		if (floatRight) rowx -= ctx.measureText(msg).width + 10;
		//ctx.fillText(msg, rowx, y);
		drawOutlineText({
			ctx:ctx,
			text:msg,
			color:'rgb(255,255,255)',
			outlineColor:'rgb(49,48,32)',
			outlineSize:Math.ceil(fontSize/16),
			x:rowx,
			y:y
		});
		 y += fontSize;
	}	
	ctx.restore();
}

var view = {
	center : new vec2(),
	bbox : new box2()
};

var possibleEquipField;
var possibleEquipItem;
function draw() {
	var ctx = canvas.getContext('2d');
	if (!player) {
		return;
	}

	view.center.set(player.pos);
	if (castingInfo) view.center.set(castingInfo.target);

	ctx.fillRect(0,0,canvas.width,canvas.height);
	
	var widthInTiles = Math.floor(canvas.width / tileSize.x);
	var heightInTiles = Math.floor(canvas.height / tileSize.y);
	view.bbox.min.x = Math.ceil(view.center.x - widthInTiles / 2);
	view.bbox.min.y = Math.ceil(view.center.y - heightInTiles / 2);
	if (!map.wrap) {
		if (view.bbox.min.x + widthInTiles >= map.size.x) view.bbox.min.x = map.size.x - widthInTiles;
		if (view.bbox.min.y + heightInTiles >= map.size.y) view.bbox.min.y = map.size.y - heightInTiles;
		if (view.bbox.min.x < 0) view.bbox.min.x = 0;
		if (view.bbox.min.y < 0) view.bbox.min.y = 0;
	}
	view.bbox.max.x = view.bbox.min.x + widthInTiles;
	view.bbox.max.y = view.bbox.min.y + heightInTiles;
	if (!map.wrap) {
		if (view.bbox.max.x >= map.size.x) view.bbox.max.x = map.size.x-1;
		if (view.bbox.max.y >= map.size.y) view.bbox.max.y = map.size.y-1;
	}
	var x, y, rx, ry;
	//draw tiles first
	for (y = view.bbox.min.y, ry = 0; y <= view.bbox.max.y; y++, ry++) {
		for (x = view.bbox.min.x, rx = 0; x <= view.bbox.max.x; x++, rx++) {
			var tile = map.getTile(x,y);
			
			ctx.drawImage(tile.img, rx * tileSize.x, ry * tileSize.y, tileSize.x, tileSize.y);
			
			if ('objs' in tile) {
				for (var i = 0; i < tile.objs.length; i++) {
					var obj = tile.objs[i];
					if ('draw' in obj) obj.draw(ctx);
				}
			}
		}
	}

	if ('fogColor' in map) {
		ctx.save();
		ctx.fillColor = map.fogColor;
		for (y = view.bbox.min.y, ry = 0; y <= view.bbox.max.y; y++, ry++) {
			for (x = view.bbox.min.x, rx = 0; x <= view.bbox.max.x; x++, rx++) {
				var tile = map.getTile(x,y);
				var light = 0;
				if ('light' in tile) {
					light = tile.light;
				}
				ctx.globalAlpha = 1 - light;
				ctx.fillRect(rx * tileSize.x, ry * tileSize.y, tileSize.x, tileSize.y);
			}
		}
		ctx.restore();
	}

	if (castingInfo) {
		for (var y = player.pos.y - castingInfo.spell.range; y <= player.pos.y + castingInfo.spell.range; y++) {
			for (var x = player.pos.x - castingInfo.spell.range; x <= player.pos.x + castingInfo.spell.range; x++) {
				if (distL1(player.pos, new vec2(x,y)) <= castingInfo.spell.range) {
					var rx = (x - view.bbox.min.x) * tileSize.x;
					var ry = (y - view.bbox.min.y) * tileSize.y;
					ctx.save();
					ctx.globalAlpha = .5;
					ctx.fillStyle = 'rgb(0,0,255)';
					ctx.fillRect(rx, ry, tileSize.x, tileSize.y);
					ctx.restore();
				}
			}
		}
	
		for (var y = castingInfo.target.y - castingInfo.spell.area; y <= castingInfo.target.y + castingInfo.spell.area; y++) {
			for (var x = castingInfo.target.x - castingInfo.spell.area; x <= castingInfo.target.x + castingInfo.spell.area; x++) {
				if (distL1(castingInfo.target, new vec2(x,y)) <= castingInfo.spell.area) {
					var rx = (x - view.bbox.min.x) * tileSize.x;
					var ry = (y - view.bbox.min.y) * tileSize.y;
					ctx.save();
					ctx.globalAlpha = .5;
					ctx.fillStyle = 'rgb(255,0,0)';
					ctx.fillRect(rx, ry, tileSize.x, tileSize.y);
					ctx.restore();
				}
			}
		}
	}

	var statFields = ['hpMax', 'mpMax', 'warmth', 'physAttack', 'physHitChance', 'physEvade', 'magicAttack', 'magicHitChance', 'magicEvade', 'attackOffsets'];
	var stats = {};
	for (var i = 0; i < statFields.length; i++) {
		var field = statFields[i];
		stats[field] = player.stat(field);
		if (field == 'attackOffsets') stats[field] = stats[field].length;
	}
	if (possibleEquipField) {
		var altStats = {};
		var oldEquip = player[possibleEquipField];
		if (possibleEquipItem) {
			player[possibleEquipField] = possibleEquipItem;
		} else {
			delete player[possibleEquipField];
		}
		for (var i = 0; i < statFields.length; i++) {
			var field = statFields[i];
			var altStat = player.stat(field);
			if (field == 'attackOffsets') altStat = altStat.length;
			var diff = altStat - stats[field];
			if (diff > 0) {
				stats[field] = '(+' + diff + ')';
			} else if (diff < 0) {
				stats[field] = '(' + diff + ')';
			}
		}
		if (oldEquip) {
			player[possibleEquipField] = oldEquip;
		} else {
			delete player[possibleEquipField];
		}
	}

	drawTextBlock(ctx, [
		'HP:' + player.hp+'/'+stats.hpMax,
		'MP:' + player.mp+'/'+stats.mpMax,
		'Cal.:' + player.food,
		'Temp:' + round(player.temp, 10),
		'Warmth:' + stats.warmth,
		'Gold:' + player.gold,
		'PA:' + stats.physAttack,
		'P.Hit:' + stats.physHitChance,
		'P.Evd:' + stats.physEvade,
		'P.Area:' + stats.attackOffsets,
		'MA:' + stats.magicAttack,
		'M.Hit:' + stats.magicHitChance,
		'M.Evd:' + stats.magicEvade
	], canvas.width, 0, true);

	if (player.attributes.length) {
		drawTextBlock(ctx, player.attributes.map(function(attribute) { return attribute.name; }),
			0, canvas.height - player.attributes.length * fontSize - 8);
	}

	if (popupMessage.length) {
		drawTextBlock(ctx, popupMessage, 0, 0);
		popupMessage = [];
	}
}

function pickFreePos(classifier) {
	for (var attempt = 0; attempt < 1000; attempt++) {
		var pos = randomBoxPos(map.bbox);
		var tile = map.getTile(pos.x, pos.y);
		if ('objs' in tile) continue;
		var good;
		if (classifier) good = classifier(tile);
		else good = !(tile.solid || tile.water);
		if (!good) continue;

		return pos;
	}
	console.log("failed to find free position");
	return new vec2();
}

function update() {
	if ('spawn' in map) {
		for (var i = 0; i < map.spawn.length; i++) {
			var spawnInfo = map.spawn[i];
			if (Math.random() < spawnInfo.rate && map.objs.length < 2000) {
				var spawnClass = spawnInfo.type;
				var classifier = undefined;
				if (spawnClass.prototype.movesInWater) {
					classifier = function(tile) { return tile.water; };
				}
				new spawnClass({pos:pickFreePos(classifier)});
			}
		}
	}
	
	//decay light
	if ('fogDecay' in map) {
		for (y = view.bbox.min.y-1; y <= view.bbox.max.y+1; y++) {
			for (x = view.bbox.min.x-1; x <= view.bbox.max.x+1; x++) {
				var tile = map.getTile(x,y);
				if (tile && 'light' in tile) {
					if (view.bbox.contains(new vec2(x,y))) {
						tile.light = Math.max(0, tile.light - map.fogDecay);
					} else {
						delete tile;
					}
				}
			}
		}
	}

	for (var i = 0; i < map.objs.length; i++) {
		var obj = map.objs[i];
		if (obj.remove) {
			obj.clearTile();
			map.objs.splice(i,1);
			if (obj == player) {
				player = undefined;
			}
			i--;
		} else {
			if ('update' in obj) obj.update();
			if ('postUpdate' in obj) obj.postUpdate();
		}
		if (setMapRequest !== undefined) break;	//christmas came early
	}

	if (setMapRequest !== undefined && player) {
		setMap(setMapRequest);
		setMapRequest = undefined;
	} else {
		draw();
	}
}


function setMap(args) {
	
	//if we were somewhere already...
	if (map) {
		//remove player
		if (player) {
			player.clearTile();
			map.objs.splice(map.objs.indexOf(player),1);
			if (!args.dontSavePos) {
				map.lastPlayerStart = new vec2(player.pos);
			}
		}
	
		if (map.resetObjs) {
			for (var i = 0; i < map.objs.length; i++) {
				map.objs[i].clearTile();
			}
			delete map.objs;
		}
	}

	//now load the new map
	if (!(args.map in maps)) throw "failed to find map "+args.map; 
	map = maps[args.map];

	var firstSpawn = false;
	if (!('objs' in map)) {
		firstSpawn = true;
		map.objs = [];
	}

	//spawn any fixed objs
	if (map.fixedObjs && firstSpawn) {
		for (var i = 0; i < map.fixedObjs.length; i++) {
			var fixedObj = map.fixedObjs[i];
			new fixedObj.type(fixedObj);
		}
	}

	if (player) {
		map.objs.splice(0, 0, player);

		//init hero
		if ('pos' in args) {
			player.setPos(args.pos.x, args.pos.y);
		} else if ('lastPlayerStart' in map) {
			player.setPos(map.lastPlayerStart.x, map.lastPlayerStart.y);
		} else if ('playerStart' in map) {
			player.setPos(map.playerStart.x, map.playerStart.y);
		} else {
			console.log("we don't have a setMap pos and we don't have a map.playerStart ...");
			player.setPos(0,0);
		}
		player.applyLight();
	}
	
	if ('done' in args) args.done();

	clientMessage("Entering "+map.name);
	
	draw();
}



function attackKeyCallback(key, event) {
	keyCallback = undefined;
	switch (key) {
	case 'left': player.attack(-1, 0); return true;	//left
	case 'up': player.attack(0, -1); return true; //up
	case 'right': player.attack(1, 0); return true; //right
	case 'down': player.attack(0, 1); return true; //down
	}
	return true;
}

function interactKeyCallback(key, event) {
	keyCallback = undefined;
	switch (key) {
	case 'left': player.interact(-1, 0); return true;	//left
	case 'up': player.interact(0, -1); return true; //up
	case 'right': player.interact(1, 0); return true; //right
	case 'down': player.interact(0, 1); return true; //down
	}
	return true;
}

function doEquipScreen() {
	var equipPrompt;
	var refreshEquipPrompt = function() {
		for (var i = 0; i < player.equipFields.length; i++) {
			var field = player.equipFields[i];
			var s = field;
			if (field in player) s += ': ' + player[field].name;
			equipPrompt.options[i] = s;
		}
		equipPrompt.refreshContent();
	}
	equipPrompt = new ClientPrompt(
		player.equipFields,
		function(cmd, index) {
			var equipField = player.equipFields[index];
			var equippableItems = player.items.filter(function(item) {
				return player.canEquip(equipField, item);
			});
			equippableItems.splice(0, 0, undefined);
			var equipFieldPrompt = new ClientPrompt(
				equippableItems.map(function(item) { 
					if (item) return item.name;
					return 'Nothing';
				}),
				function(itemName, index) {
					equipFieldPrompt.close();
					
					var item = equippableItems[index];
					if (item) player.items.splice(player.items.indexOf(item), 1);
					player.setEquip(equipField, item);
					
					refreshEquipPrompt();
				},
				function(cmd, index) {
					possibleEquipField = equipField;
					possibleEquipItem = equippableItems[index];
				},
				function() {
					possibleEquipField = undefined;
				}
			);
		}
	);
	refreshEquipPrompt();
}

function doSpellScreen() {
	var spells = player.spells.filter(function(spell) {
		return spell.canPayFor(player);	//TODO grey out uncastable spells
	});
	if (!spells.length) {
		clientMessage("You don't have any spells that you can use right now"); 
		return;
	}
	var spellPrompt = new ClientPrompt(
		spells.map(function(spell) {
			return spell.name+' ('+spell.cost+')';
		}),
		function(cmd, index) {
			closeAllPrompts();
			spells[index].clientUse();
		}
	);
}

function doItemScreen() {
	var items = player.items.filter(function(item) {
		return 'use' in item;	//TODO grey out unusable items
	});
	if (!items.length) {
		clientMessage("You don't have any items that you can use right now"); 
		return;
	}
	var itemPrompt = new ClientPrompt(items.map(function(item, index) {
		return item.name;
	}), function(cmd, index) {
		itemPrompt.close();
		var item = items[index];
		var result = item.use(player);
		if (result !== 'keep') {
			player.items.splice(player.items.indexOf(item), 1);
		}
	});
}

function doMenu() {
	var menuPrompt = new ClientPrompt([
		'Pass (p)',
		'Attack (a)',
		'Spell (s)',
		'Item (z)',
		'Talk (t)',
		'Equip (e)',
		'Zoom In',
		'Zoom Out',
		'Cheat'
	], function(cmd, index) {
		switch (cmd) {
		case 'Attack (a)':
			menuPrompt.close();
			keyCallback = attackKeyCallback; 
			clientMessage("Attack Whom?");
			break;
		case 'Spell (s)':
			doSpellScreen();
			break;
		case 'Item (z)':
			doItemScreen();
			break;
		case 'Talk (t)':
			menuPrompt.close();
			keyCallback = interactKeyCallback; 
			clientMessage("Talk to Whom?"); 
			break;
		case 'Equip (e)':
			doEquipScreen();
			break;
		case 'Zoom In':
			zoomIn();
			break;
		case 'Zoom Out':
			zoomOut();
			break;
		case 'Cheat':
			cheat();
			break;
		}
	});
}

function defaultKeyCallback(key, event) {
	switch (key) {
	case 'ok':
		doMenu();
		return false;
	case 'left': player.move(-1, 0); return true;	//left
	case 'up': player.move(0, -1); return true; //up
	case 'right': player.move(1, 0); return true; //right
	case 'down': player.move(0, 1); return true; //down
	default:
		if (event) {
			switch (event.keyCode) { 
			case 65: 	//'a'
				keyCallback = attackKeyCallback; 
				clientMessage("Attack Whom?"); 
				return false;
			case 69:	//'e'
				doEquipScreen();
				return false;
			case 83:	//'s'
				doSpellScreen();
				return false;
			case 84: //'t'
				keyCallback = interactKeyCallback; 
				clientMessage("Talk to Whom?"); 
				return false;
			case 90: //'z'
				doItemScreen();
				return false;
			}
		}
	}
	return true;
}

function handleCommand(key, event) {
	if (!keyCallback) keyCallback = defaultKeyCallback;
	if (keyCallback == defaultKeyCallback && clientPromptStack.length) keyCallback = promptKeyCallback;
	if (keyCallback(key, event)) {
		update();
	} else {
		draw();
	}
}

function handleKeyEvent(event) {
	var keyCode = event.keyCode;
	var key = 'cancel';
	switch (keyCode) {
	case 13:
	case 32:
		key = 'ok'; 
		break;
	case 74://'j':
	case 37: 
		key = 'left'; 
		break;
	case 73://'i':
	case 38: 
		key = 'up'; 
		break;
	case 76://'l':
	case 39: 
		key = 'right'; 
		break;
	case 75://'k':
	case 40: 
		key = 'down'; 
		break;
	case 16:	//shift
	case 17:	//ctrl
	case 18:	//alt
	case 91:	//windows
	case 93:	//windows
		return;
	}
	handleCommand(key, event);
}

//0 = button mash + repeat key
//1 = button mash, but no repeat keys
//2 = no button mash, no repeat keys 
var keyIntervalMethod = 0;

var keyDownInterval;
var lastKeyEvent;
function keyEventHandler(event) {
	event.preventDefault();
	lastKeyEvent = event;
	if (event.type == 'keydown') {
		if (keyIntervalMethod == 0) {
			handleKeyEvent(lastKeyEvent);
		} else {
			if (keyDownInterval !== undefined) {
				if (keyIntervalMethod == 1) {
					//method 1: repeat keys = repeat events
					clearInterval(keyDownInterval);
				} else if (keyIntervalMethod == 2) {
					//method 2: delay
					return;
				}
			}
			handleKeyEvent(lastKeyEvent);
			keyDownInterval = setInterval(function() {
				handleKeyEvent(lastKeyEvent);
			}, 300);
		}
	} else if (event.type == 'keyup') {
		if (keyIntervalMethod != 0) {
			if (keyDownInterval !== undefined) clearInterval(keyDownInterval);
			keyDownInterval = undefined;
		}
	}
}



var buttons = [];

var buttonBorder = new vec2(.02, .04);
var buttonSeparation = new vec2(.005, .01);
var buttonSize = new vec2(.1, .2);

var buttonInfos = [
	{cmd:'left', url:'icons/left.png', bbox:new box2(buttonBorder.x, 1-buttonBorder.y-buttonSize.y, buttonBorder.x+buttonSize.x, 1-buttonBorder.y)},
	{cmd:'down', url:'icons/down.png', bbox:new box2(buttonBorder.x+buttonSize.x+buttonSeparation.x, 1-buttonBorder.y-buttonSize.y, buttonBorder.x+2*buttonSize.x+buttonSeparation.x, 1-buttonBorder.y)},
	{cmd:'up', url:'icons/up.png', bbox:new box2(buttonBorder.x+buttonSize.x+buttonSeparation.x, 1-buttonBorder.y-buttonSize.y*2-buttonSeparation.y, buttonBorder.x+2*buttonSize.x+buttonSeparation.x, 1-buttonBorder.y-buttonSize.y-buttonSeparation.y)},
	{cmd:'right', url:'icons/right.png', bbox:new box2(buttonBorder.x+buttonSize.x*2+buttonSeparation.x*2, 1-buttonBorder.y-buttonSize.y, buttonBorder.x+3*buttonSize.x+buttonSeparation.x*2, 1-buttonBorder.y)},
	{cmd:'ok', url:'icons/ok.png', bbox:new box2(1-buttonBorder.x-buttonSize.x, 1-buttonBorder.y-buttonSize.y, 1-buttonBorder.x, 1-buttonBorder.y)},
	{cmd:'cancel', url:'icons/cancel.png', bbox:new box2(1-buttonBorder.x-buttonSize.x*2-buttonSeparation.x, 1-buttonBorder.y-buttonSize.y, 1-buttonBorder.x-buttonSize.x-buttonSeparation.x, 1-buttonBorder.y)} 
];

function handleScreenEvent(event) {
	if (!player) return;
	var x = event.pageX / $(window).width();
	var y = event.pageY / $(window).height();
	for (var i = 0; i < buttons.length; i++) {
		var button = buttons[i];
		if (button.bbox.contains(new vec2(x,y))) {
			handleCommand(button.cmd);
			break;
		}
	}
}

var mouseIntervalMethod = 2;
var mouseDownInterval;
var lastMouseEvent;
function mouseEventHandler(event) {
	showButtons();
	event.preventDefault();
	lastMouseEvent = event;
	if (event.type == 'mousedown') {
		if (mouseIntervalMethod == 0) {
			handleScreenEvent(lastMouseEvent);
		} else {
			if (mouseDownInterval !== undefined) {
				if (mouseIntervalMethod == 1) {
					clearInterval(mouseDownInterval);
				} else if (mouseIntervalMethod == 2) {
					return;
				}
			}
			handleScreenEvent(lastMouseEvent);
			mouseDownInterval = setInterval(function() {
				handleScreenEvent(lastMouseEvent);
			}, 300);
		}
	} else if (event.type == 'mouseup') {
		if (mouseIntervalMethod != 0) {
			if (mouseDownInterval !== undefined) clearInterval(mouseDownInterval);
			mouseDownInterval = undefined;
		}
	}
}

var touchIntervalMethod = 2;
var touchInterval;
var lastTouch;
function touchEventHandler(event) {
	showButtons();
	event.preventDefault();
	lastTouch = event.touches[0];
	if (event.type == 'touchstart') {
		if (touchIntervalMethod == 0) {
			handleScreenEvent(lastTouch);
		} else {
			if (touchInterval !== undefined) {
				if (touchIntervalMethod == 1) {
					//method 1: repeat keys = repeat events
					clearInterval(touchInterval);
				} else if (touchIntervalMethod == 2) {
					//method 2: delay
					return;
				}
			}
			if (lastTouch) handleScreenEvent(lastTouch);
			touchInterval = setInterval(function() {
				if (lastTouch) handleScreenEvent(lastTouch);
			}, 300);
		}
	} else if (event.type == 'toouchend' || event.type == 'touchcancel') {
		if (touchIntervalMethod != 0) {
			if (touchInterval !== undefined) clearInterval(touchInterval);
			touchInterval = undefined;
		}
	}
}

function buttonMouseDown(event) {
	handleCommand(this.cmd);
}

var Button = makeClass({
	init : function(args) {
		this.bbox = args.bbox;
		this.cmd = args.cmd;
		this.url = args.url;
		this.dom = makeDOM('div', {
			parent:document.body,
			cmd:args.cmd,
			style:{
				backgroundColor:'rgb(255,255,255)',
				position:'absolute',
				textAlign:'center',
				fontSize:Math.ceil(fontSize*.65)+'pt',
				background:'url('+args.url+') no-repeat',
				backgroundSize:'100%'
			}
		});
		$(this.dom).fadeTo(0, 0);
		$(this.dom).disableSelection();
		//$(this.dom).mousedown(buttonMouseDown);
		this.refresh();
	},
	refresh : function() {
		var width = $(window).width();
		var height = $(window).height();
		this.dom.style.left = (width * this.bbox.min.x)+'px';
		this.dom.style.top = (height * this.bbox.min.y)+'px';
		this.dom.style.width = (width * (this.bbox.max.x - this.bbox.min.x))+'px';
		this.dom.style.height = (height * (this.bbox.max.y - this.bbox.min.y))+'px';
	}
});

var hideFadeDuration = 5000;
var fadeButtonsTimeout = undefined;
function showButtons() {
	for (var i = 0; i < buttons.length; i++) {
		var buttonDOM = buttons[i].dom;
		$(buttonDOM).fadeTo(0, .75);
	}
	if (fadeButtonsTimeout) clearTimeout(fadeButtonsTimeout);
	fadeButtonsTimeout = setTimeout(function() {
		for (var i = 0; i < buttons.length; i++) {
			var buttonDOM = buttons[i].dom;
			$(buttonDOM).fadeTo(1000, 0);
		}
	}, hideFadeDuration);
}

function initButtons() {
	for (var i = 0; i < buttonInfos.length; i++) {
		var buttonInfo = buttonInfos[i];
		buttons.push(new Button(buttonInfo));
	}
}

function resizeButtons() {
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].refresh();
	}
}

var baseRatio = 64/2000;	//2000 resolution, 64 tilesize
function onresize() {
	canvas.width = $(window).width();
	canvas.height = $(window).height() - 50;
	tileSize.x = tileSize.y = Math.ceil(canvas.width*baseRatio);
	fontSize = Math.ceil(canvas.width*64/2000);
	draw();
	resizeButtons();
}

function zoomIn() { baseRatio *= 2; onresize(); }
function zoomOut() { baseRatio *= .5; onresize(); }

function cheat() {
	player.gold = player.hp = player.hpMax = player.mp = player.mpMax = Infinity; 
	player.spells = spells.slice(); 
	draw();
}

function initGame() {
	canvas = $('<canvas>', {
		css:{
			position:'absolute',
			top:'50px',
			left:'0px'
		}
	}).attr('width', 640)
		.attr('height', 480)
		.appendTo(document.body)
		.get(0);

	makeDOM('div', {
		parent:document.body,
		style:{height:'100px'}
	});

	//scroll past titlebar in mobile devices
	// http://stackoverflow.com/questions/4068559/removing-address-bar-from-browser-to-view-on-android
	//TODO if mobile then set the canvas size to the screen size
	if (navigator.userAgent.match(/Mobile/i)) {
		mobile = true;
		window.scrollTo(0,0); // reset in case prev not scrolled 
		var nPageH = $(document).height(); 
		var nViewH = window.outerHeight; 
		if (nViewH > nPageH) { 
			nViewH /= window.devicePixelRatio;
			$('BODY').css('height',nViewH + 'px'); 
		} 
		window.scrollTo(0,1); 
	}

	//now that we have preloaded images, assign tiles
	for (var i = 0; i < tileTypes.length; i++) {
		var tileType = tileTypes[i];
		tileType.prototype.imgs = [];
		for (var j = 0; j < tileType.prototype.urls.length; j++) {
			tileType.prototype.imgs[j] = makeDOM('img', {src:tileType.prototype.urls[j]});
		}
	}
	for (var i = 0; i < objTypes.length; i++) { 
		var objType = objTypes[i];
		objType.prototype.img = makeDOM('img', {src:objType.prototype.url});
	}
	for (var i = 0; i < spells.length; i++) {
		var spell = spells[i];
		if ('url' in spell) spell.img = makeDOM('img', {src:spell.url});
	}

	initMaps();
	
	$(document).keydown(keyEventHandler);
	$(document).keyup(keyEventHandler);
	$(document).mousedown(mouseEventHandler);
	$(document).mouseup(mouseEventHandler);
	//android...
	if (document.addEventListener) {
		document.addEventListener('touchstart', touchEventHandler, false);
		document.addEventListener('touchmove', touchEventHandler, false);
		document.addEventListener('touchend', touchEventHandler, false);
		document.addEventListener('touchcancel', touchEventHandler, false);
		document.addEventListener('gesturestart', touchEventHandler, false);
		document.addEventListener('gesturechange', touchEventHandler, false);
		document.addEventListener('gestureend', touchEventHandler, false);
	}
	//document.addEventListener('click', function(event) { event.preventDefault(); }, false);

	$(window).resize(onresize);
	onresize();

	initButtons();

	player = new HeroObj({});
	setMap({map:'Helpless Village'});
}

function initRes() {
	var urls = [];
	//add tile types
	for (var i = 0; i < tileTypes.length; i++) {
		urls = urls.concat(tileTypes[i].prototype.urls);
	}
	//add objs
	for (var i = 0; i < objTypes.length; i++) { 
		urls.push(objTypes[i].prototype.url);
	}
	//add spells
	for (var i = 0; i < spells.length; i++) {
		var spell = spells[i];
		if ('url' in spell) urls.push(spell.url);
	}
	//add icons
	for (var i = 0; i < buttonInfos.length; i++) {
		urls.push(buttonInfos[i].url);
	}
	$(urls).preload(initGame);
}

$(document).ready(function() {
	initRes();
});

