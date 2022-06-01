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
		//$(this.dom).mousedown(function(event) {handleCommand(this.cmd);});
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

var buttonSys = new function() {
	this.init = function(args) {
		this.buttons = [];
		for (var i = 0; i < args.buttons.length; i++) {
			var buttonInfo = args.buttons[i];
			this.buttons.push(new Button(buttonInfo));
		}
	};

	//var hideFadeDuration = 5000;
	//var fadeButtonsTimeout = undefined;
	this.show = function() {
		for (var i = 0; i < this.buttons.length; i++) {
			var buttonDOM = this.buttons[i].dom;
			//$(buttonDOM).fadeTo(0,0);
			$(buttonDOM).show();
			//$(buttonDOM).fadeTo(0, .75);
		}
		/*if (fadeButtonsTimeout) clearTimeout(fadeButtonsTimeout);
		fadeButtonsTimeout = setTimeout(function() {
			for (var i = 0; i < this.buttons.length; i++) {
				var buttonDOM = this.buttons[i].dom;
				$(buttonDOM).fadeTo(1000, 0);
			}
		}, hideFadeDuration);*/
	};

	this.onresize = function() {
		for (var i = 0; i < this.buttons.length; i++) {
			this.buttons[i].refresh();
		}
	};
};
