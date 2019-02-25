/**
 * ol-ext - A set of cool extensions for OpenLayers (ol).
 * @abstract ol3,openlayers,popup,menu,symbol,renderer,filter,canvas,interaction,split,statistic,charts,pie,LayerSwitcher,toolbar,animation
 * @version v1.1.2
 * @author Jean-Marc Viglino (https://github.com/Viglino)
 * @link https://github.com/Viglino/ol-ext#,
 * @license BSD
 */
/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * Search Control.    
 * This is the base class for search controls. You can use it for simple custom search or as base to new class.
 * @see ol.control.SearchFeature
 * @see ol.control.SearchPhoton
 *
 * @constructor
 * @extends {ol.control.Control}
 * @fires select
 * @fires change:input
 * @param {Object=} options
 *	@param {string} options.className control class name
 *	@param {Element | string | undefined} options.target Specify a target if you want the control to be rendered outside of the map's viewport.
 *	@param {string | undefined} options.label Text label to use for the search button, default "search"
 *	@param {string | undefined} options.placeholder placeholder, default "Search..."
 *	@param {number | undefined} options.typing a delay on each typing to start searching (ms) use -1 to prevent autocompletion, default 300.
 *	@param {integer | undefined} options.minLength minimum length to start searching, default 1
 *	@param {integer | undefined} options.maxItems maximum number of items to display in the autocomplete list, default 10
 *	@param {function} options.getTitle a function that takes a feature and return the name to display in the index.
 *	@param {function} options.autocomplete a function that take a search string and callback function to send an array
 */
ol.control.Search = function(options) 
{	var self = this;
	if (!options) options = {};
	if (options.typing == undefined) options.typing = 300;

	var element;
	if (options.target) 
	{	element = $("<div>").addClass((options.className||"")+ " ol-search");
	}
	else
	{	element = $("<div>").addClass((options.className||"") + ' ol-search ol-unselectable ol-control ol-collapsed');
		this.button = $("<button>")
					.attr('type','button')
					.attr('title',options.label||"search")
					.click (function()
					{	element.toggleClass("ol-collapsed"); 
						if (!element.hasClass("ol-collapsed")) 
						{	$("input.search", element).focus();
							$('li', element).removeClass('select');
						}
					})
					.appendTo(element);
	}
	// Search input
	var tout, cur="";
	$("<input>").attr('type','search')
		.addClass("search")
		.attr('placeholder', options.placeholder||"Search...")
		.on('change', function(e) 
		{ 	self.dispatchEvent({ type:"change:input", input:e, value:$(this).val()  }); 
		})
		.on('keyup search cut paste input', function(e) 
		{	// console.log(e.type+" "+e.key)
			var li  = $("ul.autocomplete li.select", element);
			var	val = $(this).val();
			// move up/down
			if (e.key=='ArrowDown' || e.key=='ArrowUp' || e.key=='Down' || e.key=='Up')
			{	li.removeClass('select');
				li = (/Down/.test(e.key)) ? li.next() : li.prev();
				if (li.length) li.addClass('select');
				else $("ul.autocomplete li",element).first().addClass('select');
			}
			// Clear input
			else if (e.type=='input' && !val)
			{	self.drawList_();
			}
			// Select in the list
			else if (li.length && (e.type=="search" || e.key =='Enter'))
			{	if (element.hasClass("ol-control")) $(this).blur();
				li.removeClass('select');
				cur = val;
				self.select(li.data('search'));
			}
			// Search / autocomplete
			else if ( (e.type=="search" || e.key =='Enter')
					|| (cur!=val && options.typing>=0))
			{	// current search
				cur = val;
				if (cur)
				{	// prevent searching on each typing
					if (tout) clearTimeout(tout);
					tout = setTimeout(function()
					{	if (cur.length >= self.get("minLength")) 
						{	var s = self.autocomplete (cur, function(auto) { self.drawList_(auto); });
							if (s) self.drawList_(s);
						}
						else self.drawList_();
					}, options.typing);
				}
				else self.drawList_();
			}
			// Clear list selection
			else 
			{	$("ul.autocomplete li", element).removeClass('select');
			}
		})
		.blur(function()
		{	setTimeout(function(){ element.addClass('ol-collapsed') }, 200);
		})
		.focus(function()
		{	element.removeClass('ol-collapsed')
		})
		.appendTo(element);
	// Autocomplete list
	$("<ul>").addClass('autocomplete').appendTo(element);
	
	ol.control.Control.call(this, 
		{	element: element.get(0),
			target: options.target
		});

	if (typeof (options.getTitle)=='function') this.getTitle = options.getTitle;
	if (typeof (options.autocomplete)=='function') this.autocomplete = options.autocomplete;
	
	// Options
	this.set('minLength', options.minLength || 1);
	this.set('maxItems', options.maxItems || 10);

};
ol.inherits(ol.control.Search, ol.control.Control);

/** Returns the text to be displayed in the menu
*	@param {any} f feature to be displayed
*	@return {string} the text to be displayed in the index, default f.name
*	@api
*/
ol.control.Search.prototype.getTitle = function (f)
{	return f.name || "No title";
};

/** Force search to refresh
*/
ol.control.Search.prototype.search = function ()
{	$("input.search", this.element).trigger('search');
};

/** Set the input value in the form (for initialisation purpose)
*	@param {string} value
*	@param {boolean} search to start a search
*	@api
*/
ol.control.Search.prototype.setInput = function (value, search)
{	$("input.search",this.element).val(value);
	if (search) $("input.search",this.element).trigger("keyup");
};

/** A ligne has been clicked in the menu > dispatch event
*	@param {any} f the feature, as passed in the autocomplete
*	@api
*/
ol.control.Search.prototype.select = function (f)
{	this.dispatchEvent({ type:"select", search:f });
};

/** Autocomplete function
* @param {string} s search string
* @param {function} cback a callback function that takes an array to display in the autocomplete field (for asynchronous search)
* @return {Array|false} an array of search solutions or false if the array is send with the cback argument
* @api
*/
ol.control.Search.prototype.autocomplete = function (s, cback)
{	cback ([]);
	return false;
};

/** Prevent same feature to be drawn twice: test equality
 * @param {} f1 First feature to compare
 * @param {} f2 Second feature to compare
 * @return {boolean}
 * @api
 */
ol.control.Search.prototype.equalFeatures = function (f1, f2) {
	return (this.getTitle(f1) == this.getTitle(f2));
}

/** Draw the list 
* @param {Array} auto an array of search result
*/
ol.control.Search.prototype.drawList_ = function (auto)
{	var ul = $("ul.autocomplete", this.element).html("");
	if (!auto) return;
	var self = this;
	var max = Math.min (self.get("maxItems"),auto.length);
	for (var i=0; i<max; i++)
	{	if (!i || !self.equalFeatures(auto[i], auto[i-1])) {
			$("<li>").html(self.getTitle(auto[i]))
			.data('search', auto[i])
			.click(function(e)
			{	self.select($(this).data('search'));
			})
			.appendTo(ul);
		}
	}
};
/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * Search places using the photon API.
 *
 * @constructor
 * @extends {ol.control.Search}
 * @fires select
 * @param {Object=} Control options. 
 *	@param {string} options.className control class name
 *	@param {Element | string | undefined} options.target Specify a target if you want the control to be rendered outside of the map's viewport.
 *	@param {string | undefined} options.label Text label to use for the search button, default "search"
 *	@param {string | undefined} options.placeholder placeholder, default "Search..."
 *	@param {number | undefined} options.typing a delay on each typing to start searching (ms), default 1000.
 *	@param {integer | undefined} options.minLength minimum length to start searching, default 3
 *	@param {integer | undefined} options.maxItems maximum number of items to display in the autocomplete list, default 10
 *
 *	@param {string|undefined} options.url Url to photon api, default "http://photon.komoot.de/api/"
 *	@param {string|undefined} options.lang Force preferred language, default none
 *	@param {boolean} options.position Search, with priority to geo position, default false
 *	@param {function} options.getTitle a function that takes a feature and return the name to display in the index, default return street + name + contry 
 */
ol.control.SearchPhoton = function(options) 
{	options = options || {};
	delete options.autocomplete;
	options.minLength = options.minLength || 3;
	options.typing = options.typing || 800;
	ol.control.Search.call(this, options);
	this.set('lang', options.lang);
	this.set('position', options.position);
	// Handle Mix Content Warning
	// If the current connection is an https connection all other connections must be https either
	var url = options.url || "http://photon.komoot.de/api/";
	if (window.location.protocol === "https:") {
		var parser = document.createElement('a');
		parser.href = url;
		parser.protocol = window.location.protocol;
		url = parser.href;
	}
	this.set('url', url);
};
ol.inherits(ol.control.SearchPhoton, ol.control.Search);

/** Returns the text to be displayed in the menu
*	@param {ol.Feature} f the feature
*	@return {string} the text to be displayed in the index
*	@api
*/
ol.control.SearchPhoton.prototype.getTitle = function (f)
{	var p = f.properties;
	return (p.housenumber||"")
		+ " "+(p.street || p.name || "")
		+ "<i>"
		+ " "+(p.postcode||"")
		+ " "+(p.city||"")
		+ " ("+p.country
		+ ")</i>";
};

/** Autocomplete function11
* @param {string} s search string
* @param {function} cback a callback function that takes an array of {name, feature} to display in the autocomplete fielad
* @api
*/
ol.control.SearchPhoton.prototype.autocomplete = function (s, cback)
{	var data = 
	{	q: s,
		lang: this.get('lang'),
		limit: this.get('maxItems')
	}
	// Handle position proirity
	if (this.get('position'))
	{	var view = this.getMap().getView();
		var pt = new ol.geom.Point(view.getCenter());
		pt = (pt.transform (view.getProjection(), "EPSG:4326")).getCoordinates();
		
		data.lon = pt[0];
		data.lat = pt[1];
	}

	var url = this.get('url');
	$.support.cors = true;
	$.ajax(url,
		{	dataType: "json",
			//crossDomain: true,
			data: data,
			success: function(r) { 
				cback(r.features); 
			},
			error: function() {
				console.log(url, arguments);
			}
		});
};

/** Prevent same feature to be drawn twice: test equality
 * @param {} f1 First feature to compare
 * @param {} f2 Second feature to compare
 * @return {boolean}
 * @api
 */
ol.control.SearchPhoton.prototype.equalFeatures = function (f1, f2) {
	return (this.getTitle(f1) == this.getTitle(f2) 
		&& f1.geometry.coordinates[0] == f2.geometry.coordinates[0]
		&& f1.geometry.coordinates[1] == f2.geometry.coordinates[1]);
};

/** A ligne has been clicked in the menu > dispatch event
*	@param {any} f the feature, as passed in the autocomplete
*	@api
*/
ol.control.SearchPhoton.prototype.select = function (f)
{	var c = f.geometry.coordinates;
	// Add coordinate to the event
	try {
		c = ol.proj.transform (f.geometry.coordinates, 'EPSG:4326', this.getMap().getView().getProjection());
	} catch(e) {};
	this.dispatchEvent({ type:"select", search:f, coordinate: c });
};
/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * @classdesc OpenLayers 3 Layer Switcher Control.
 * @require jQuery
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} Control options.
 *	@param {boolean} options.show_progress show a progress bar on tile layers, default false
 *		- mouseover {boolean} show the panel on mouseover, default false
 *		- reordering {boolean} allow layer reordering, default true
 *		- trash {boolean} add a trash button to delete the layer, default false
 *		- oninfo {function} callback on click on info button, if none no info button is shown
 *		- extent {boolean} add an extent button to zoom to the extent of the layer
 *		- onextent {function} callback when click on extent, default fits view to extent
 *
 * Layers attributes that control the switcher
 *	- allwaysOnTop {boolean} true to force layer stay on top of the others while reordering, default false
 *	- displayInLayerSwitcher {boolean} display in switcher, default true
 *	- noSwitcherDelete {boolean} to prevent layer deletion (w. trash option), default false
 */
ol.control.LayerSwitcher = function(opt_options) 
{	var options = opt_options || {};
	var self = this;
	this.dcount = 0;
	this.show_progress = options.show_progress;
	this.oninfo = (typeof (options.oninfo) == "function" ? options.oninfo: null);
	this.onextent = (typeof (options.onextent) == "function" ? options.onextent: null);
	this.hasextent = options.extent || options.onextent;
	this.hastrash = options.trash;
	this.reordering = (options.reordering!==false);

	var element;
	if (options.target) 
	{	element = $("<div>").addClass(options.switcherClass || "ol-layerswitcher");
	}
	else
	{	element = $("<div>").addClass((options.switcherClass || 'ol-layerswitcher') +' ol-unselectable ol-control ol-collapsed');
	
		this.button = $("<button>")
					.attr('type','button')
					.on("touchstart", function(e)
					{	element.toggleClass("ol-collapsed"); 
						e.preventDefault(); 
						self.overflow();
					})
					.click (function()
					{	element.toggleClass("ol-forceopen").addClass("ol-collapsed"); 
						self.overflow();
					})
					.appendTo(element);
		if (options.mouseover)
		{	$(element).mouseleave (function(){ element.addClass("ol-collapsed"); })
				.mouseover(function(){ element.removeClass("ol-collapsed"); });
		}
		this.topv = $("<div>").addClass("ol-switchertopdiv")
			.click(function(){ self.overflow("+50%"); })
			.appendTo(element);
		this.botv = $("<div>").addClass("ol-switcherbottomdiv")
			.click(function(){ self.overflow("-50%"); })
			.appendTo(element);
	}
	this.panel_ = $("<ul>").addClass("panel")
				.appendTo(element);
	this.panel_.on ('mousewheel DOMMouseScroll onmousewheel', function(e)
		{	if (self.overflow(Math.max(-1, Math.min(1, (e.originalEvent.wheelDelta || -e.originalEvent.detail)))))
			{	e.stopPropagation();
				e.preventDefault();
			}
		});
	this.header_ = $("<li>").addClass("ol-header").appendTo(this.panel_);

	ol.control.Control.call(this, 
	{	element: element.get(0),
		target: options.target
	});

	// Enable jQuery dataTransfert
	// $.event.props.push('dataTransfer');
	this.target = options.target;

};
ol.inherits(ol.control.LayerSwitcher, ol.control.Control);


/** List of tips
*/
ol.control.LayerSwitcher.prototype.tip =
{	up: "up/down",
	down: "down",
	info: "informations...",
	extent: "zoom to extent",
	trash: "remove layer",
	plus: "expand/shrink"
}

/**
 * Set the map instance the control is associated with.
 * @param {ol.Map} map The map instance.
 */
ol.control.LayerSwitcher.prototype.setMap = function(map) 
{   ol.control.Control.prototype.setMap.call(this, map);
	this.drawPanel();
	
	if (this.map_)
	{	this.map_.getLayerGroup().un('change', this.drawPanel, this);
		this.map_.un('moveend', this.viewChange, this);
		this.map_.un('change:size', this.overflow, this);
		// console.log("remove");
	}

	this.map_ = map;
	// Get change (new layer added or removed)
	if (map) 
	{	map.getLayerGroup().on('change', this.drawPanel, this);
		map.on('moveend', this.viewChange, this);
		map.on('change:size', this.overflow, this);
	}
};

/** Add a custom header

*/
ol.control.LayerSwitcher.prototype.setHeader = function(html)
{	this.header_.html(html);
};

/** Calculate overflow and add scrolls
*	@param {Number} dir scroll direction -1|0|1|'+50%'|'-50%'
*/
ol.control.LayerSwitcher.prototype.overflow = function(dir)
{	
	if (this.button) 
	{	// Nothing to show
		if (this.panel_.css('display')=='none')
		{	$(this.element).css("height", "auto");
			return;
		}
		// Calculate offset
		var h = $(this.element).outerHeight();
		var hp = this.panel_.outerHeight();
		var dh = this.button.position().top + this.button.outerHeight(true);
		var top = this.panel_.position().top-dh;
		if (hp > h-dh)
		{	// Bug IE: need to have an height defined
			$(this.element).css("height", "100%");
			switch (dir)
			{	case 1: top += 2*$("li.visible .li-content",this.panel_).height(); break;
				case -1: top -= 2*$("li.visible .li-content",this.panel_).height(); break;
				case "+50%": top += Math.round(h/2); break;
				case "-50%": top -= Math.round(h/2); break;
				default: break;
			}
			// Scroll div
			if (top+hp <= h-3*dh/2) 
			{	top = h-3*dh/2-hp;
				this.botv.hide();
			}
			else
			{	this.botv.css("display","");//show();
			}
			if (top >= 0) 
			{	top = 0;
				this.topv.hide();
			}
			else
			{	this.topv.css("display","");
			}
			// Scroll ?
			this.panel_.css('top', top+"px");
			return true;
		}
		else
		{	$(this.element).css("height", "auto");
			this.panel_.css('top', "0px");
			this.botv.hide();
			this.topv.hide();
			return false;
		}
	}
	else return false;
}

/**
 * On view change hide layer depending on resolution / extent
 * @param {ol.event} map The map instance.
 * @private
 */
ol.control.LayerSwitcher.prototype.viewChange = function(e) 
{
	var map = this.map_;
	var res = this.map_.getView().getResolution();
	$("li", this.panel_).each(function()
	{	var l = $(this).data('layer');
		if (l)
		{	if (l.getMaxResolution()<=res || l.getMinResolution()>=res) $(this).addClass("ol-layer-hidden");
			else 
			{	var ex0 = l.getExtent();
				if (ex0)
				{	var ex = map.getView().calculateExtent(map.getSize());
					if (!ol.extent.intersects(ex, ex0)) 
					{	$(this).addClass("ol-layer-hidden");
					}
					else $(this).removeClass("ol-layer-hidden");
				}
				else $(this).removeClass("ol-layer-hidden");
			}
		}
	});
}

/**
 *	Draw the panel control (prevent multiple draw due to layers manipulation on the map with a delay function)
 */
ol.control.LayerSwitcher.prototype.drawPanel = function(e) 
{
	if (!this.getMap()) return;
	var self = this;
	// Multiple event simultaneously / draw once => put drawing in the event queue
	this.dcount++;
	setTimeout (function(){ self.drawPanel_(); }, 0);
}

/** Delayed draw panel control 
 * @private
 */
ol.control.LayerSwitcher.prototype.drawPanel_ = function(e) 
{	if (--this.dcount || this.dragging_) return;
	$("li", this.panel_).not(".ol-header").remove();
	this.drawList (this.panel_, this.getMap().getLayers());
}

/** Change layer visibility according to the baselayer option
 * @param {ol.layer}
 * @param {Array<ol.layer>} related layers
 */
ol.control.LayerSwitcher.prototype.switchLayerVisibility = function(l, layers)
{
	if (!l.get('baseLayer')) l.setVisible(!l.getVisible());
	else 
	{	if (!l.getVisible()) l.setVisible(true);
		layers.forEach(function(li)
		{	if (l!==li && li.get('baseLayer') && li.getVisible()) li.setVisible(false);
		});
	}
}

/** Check if layer is on the map (depending on zoom and extent)
 * @param {ol.layer}
 * @return {boolean}
 */
ol.control.LayerSwitcher.prototype.testLayerVisibility = function(layer)
{
	if (this.map_)
	{	var res = this.map_.getView().getResolution();
		if (layer.getMaxResolution()<=res || layer.getMinResolution()>=res) return false;
		else 
		{	var ex0 = layer.getExtent();
			if (ex0)
			{	var ex = this.map_.getView().calculateExtent(this.map_.getSize());
				return ol.extent.intersects(ex, ex0);
			}
			return true;
		}
	}
	return true;
};


/** Start ordering the list
*	@param {event} e drag event
*	@private
*/
ol.control.LayerSwitcher.prototype.dragOrdering_ = function(e)
{	var drag = e.data;
	switch (e.type)
	{	// Start ordering
		case 'mousedown': 
		case 'touchstart':
		{	e.stopPropagation();
			e.preventDefault();
			var pageY = e.pageY 
					|| (e.originalEvent.touches && e.originalEvent.touches.length && e.originalEvent.touches[0].pageY) 
					|| (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length && e.originalEvent.changedTouches[0].pageY);
			drag = 
				{	self: drag.self,
					elt: $(e.currentTarget).closest("li"), 
					start: true, 
					element: drag.self.element, 
					panel: drag.self.panel_, 
					pageY: pageY
				};
			drag.elt.parent().addClass('drag');
			$(document).on("mouseup mousemove touchend touchcancel touchmove", drag, drag.self.dragOrdering_);
			break;
		}
		// Stop ordering
		case 'touchcancel': 
		case 'touchend': 
		case 'mouseup':	
		{	if (drag.target) 
			{	// Get drag on parent
				var drop = drag.layer;
				var target = drag.target;
				if (drop && target) 
				{	var collection ;
					if (drag.group) collection = drag.group.getLayers();
					else collection = drag.self.getMap().getLayers();
					var layers = collection.getArray();
					// Switch layers
					for (var i=0; i<layers.length; i++) 
					{	if (layers[i]==drop) 
						{	collection.removeAt (i);
							break;
						}
					}
					for (var j=0; j<layers.length; j++) 
					{	if (layers[j]==target) 
						{	if (i>j) collection.insertAt (j,drop);
							else collection.insertAt (j+1,drop);
							break;
						}
					}
				}
			}
			
			$("li",drag.elt.parent()).removeClass("dropover dropover-after dropover-before");
			drag.elt.removeClass("drag");
			drag.elt.parent().removeClass("drag");
			$(drag.element).removeClass('drag');
			if (drag.div) drag.div.remove();

			$(document).off("mouseup mousemove touchend touchcancel touchmove", drag.self.dragOrdering_);
			break;
		}
		// Ordering
		case 'mousemove':
		case 'touchmove':
		{	// First drag (more than 2 px) => show drag element (ghost)
			var pageY = e.pageY 
					|| (e.originalEvent.touches && e.originalEvent.touches.length && e.originalEvent.touches[0].pageY) 
					|| (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length && e.originalEvent.changedTouches[0].pageY);
			if (drag.start && Math.abs(drag.pageY - pageY) > 2)
			{	drag.start = false;
				drag.elt.addClass("drag");
				drag.layer = drag.elt.data('layer');
				drag.target = false;
				drag.group = drag.elt.parent().parent().data('layer');
				// Ghost div
				drag.div = $("<li>").appendTo(drag.panel);
				drag.div.css ({ position: "absolute", "z-index":10000, left:drag.elt.position().left, opacity:0.5 })
						.html($(drag.elt).html())
						.addClass("ol-dragover")
						.width(drag.elt.outerWidth())
						.height(drag.elt.height());
				$(drag.element).addClass('drag');
			}
			if (!drag.start)
			{	e.preventDefault();
				e.stopPropagation();

				// Ghost div
				drag.div.css ({ top:pageY - drag.panel.offset().top + drag.panel.scrollTop() +5 });
				
				var li;
				if (e.pageX) li = $(e.target);
				else li = $(document.elementFromPoint(e.originalEvent.touches[0].clientX, e.originalEvent.touches[0].clientY));
				if (li.hasClass("ol-switcherbottomdiv")) 
				{	drag.self.overflow(-1);
					console.log('bottom')
				}
				else if (li.hasClass("ol-switchertopdiv")) 
				{	drag.self.overflow(1);
				}
				if (!li.is("li")) li = li.closest("li");
				if (!li.hasClass('dropover')) $("li", drag.elt.parent()).removeClass("dropover dropover-after dropover-before");
				if (li.parent().hasClass('drag') && li.get(0) !== drag.elt.get(0))
				{	var target = li.data("layer");
					// Don't mix layer level
					if (target && !target.get("allwaysOnTop") == !drag.layer.get("allwaysOnTop"))
					{	li.addClass("dropover");
						li.addClass((drag.elt.position().top < li.position().top)?"dropover-after":"dropover-before");
						drag.target = target;
					}
					else
					{	drag.target = false;
					}
					drag.div.show();
				} 
				else 
				{	drag.target = false;
					if (li.get(0) === drag.elt.get(0)) drag.div.hide();
					else drag.div.show();
				}
				
				if (!drag.target) drag.div.addClass("forbidden");
				else drag.div.removeClass("forbidden");
			}
			break;
		}
		default: break;

	}
};


/** Change opacity on drag 
*	@param {event} e drag event
*	@private
*/
ol.control.LayerSwitcher.prototype.dragOpacity_ = function(e)
{	var drag = e.data;
	switch (e.type)
	{	// Start opacity
		case 'mousedown': 
		case 'touchstart':
		{	e.stopPropagation();
			e.preventDefault();
			drag.start = e.pageX 
					|| (e.originalEvent.touches && e.originalEvent.touches.length && e.originalEvent.touches[0].pageX) 
					|| (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length && e.originalEvent.changedTouches[0].pageX);
			drag.elt = $(e.target);
			drag.layer = drag.elt.closest("li").data('layer')
			drag.self.dragging_ = true;
			$(document).on("mouseup touchend mousemove touchmove touchcancel", drag, drag.self.dragOpacity_);
			break;
		}
		// Stop opacity
		case 'touchcancel': 
		case 'touchend': 
		case 'mouseup':	
		{	$(document).off("mouseup touchend mousemove touchmove touchcancel", drag.self.dragOpacity_);
			drag.layer.setOpacity(drag.opacity);
			drag.elt.parent().next().text(Math.round(drag.opacity*100));
			drag.self.dragging_ = false;
			drag = false;
			break;
		}
		// Move opcaity
		default: 
		{	var x = e.pageX 
				|| (e.originalEvent.touches && e.originalEvent.touches.length && e.originalEvent.touches[0].pageX) 
				|| (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length && e.originalEvent.changedTouches[0].pageX);
			var dx = Math.max ( 0, Math.min( 1, (x - drag.elt.parent().offset().left) / drag.elt.parent().width() ));
			drag.elt.css("left", (dx*100)+"%");
			drag.elt.parent().next().text(Math.round(drag.opacity*100));
			drag.opacity = dx;
			drag.layer.setOpacity(dx);
			break;
		}
	}
}


/** Render a list of layer
 * @param {elt} element to render
 * @layers {Array{ol.layer}} list of layer to show
 * @api stable
 */
ol.control.LayerSwitcher.prototype.drawList = function(ul, collection)
{	var self = this;
	var layers = collection.getArray();
	var setVisibility = function(e) 
	{	e.stopPropagation();
		e.preventDefault();
		var l = $(this).parent().parent().data("layer");
		self.switchLayerVisibility(l,collection);
	};
	function moveLayer (l, layers, inc)
	{	
		for (var i=0; i<layers.getLength(); i++)
		{	if (layers.item(i) === l) 
			{	layers.remove(l);
				layers.insertAt(i+inc, l);
				return true;
			}
			if (layers.item(i).getLayers && moveLayer (l, layers.item(i).getLayers(), inc)) return true;
		}
		return false;
	};
	function moveLayerUp(e) 
	{	e.stopPropagation();
		e.preventDefault(); 
		moveLayer($(this).closest('li').data("layer"), self.map_.getLayers(), +1); 
	};
	function moveLayerDown(e) 
	{	e.stopPropagation();
		e.preventDefault(); 
		moveLayer($(this).closest('li').data("layer"), self.map_.getLayers(), -1); 
	};
	function onInfo(e) 
	{	e.stopPropagation();
		e.preventDefault(); 
		self.oninfo($(this).closest('li').data("layer")); 
	};
	function zoomExtent(e) 
	{	e.stopPropagation();
		e.preventDefault(); 
		if (self.onextent) self.onextent($(this).closest('li').data("layer")); 
		else self.map_.getView().fit ($(this).closest('li').data("layer").getExtent(), self.map_.getSize()); 
	};
	function removeLayer(e) 
	{	e.stopPropagation();
		e.preventDefault();
		var li = $(this).closest("ul").parent();
		if (li.data("layer")) 
		{	li.data("layer").getLayers().remove($(this).closest('li').data("layer"));
			if (li.data("layer").getLayers().getLength()==0 && !li.data("layer").get('noSwitcherDelete')) 
			{	removeLayer.call($(".layerTrash", li), e);
			}
		}
		else self.map_.removeLayer($(this).closest('li').data("layer"));
	};
	
	// Add the layer list
	for (var i=layers.length-1; i>=0; i--)
	{	var layer = layers[i];
		if (layer.get("displayInLayerSwitcher")===false) continue;

		var li = $("<li>").addClass((layer.getVisible()?"visible ":" ")+(layer.get('baseLayer')?"baselayer":""))
						.data("layer",layer).appendTo(ul);

		var layer_buttons = $("<div>").addClass("ol-layerswitcher-buttons").appendTo(li);

		var d = $("<div>").addClass('li-content').appendTo(li);
		if (!this.testLayerVisibility(layer)) d.addClass("ol-layer-hidden");
		
		// Visibility
		$("<input>")
			.attr('type', layer.get('baseLayer') ? 'radio' : 'checkbox')
			.attr("checked",layer.getVisible())
			.on ('click', setVisibility)
			.appendTo(d);
		// Label
		$("<label>").text(layer.get("title") || layer.get("name"))
			.attr('title', layer.get("title") || layer.get("name"))
			.on ('click', setVisibility)
			.attr('unselectable', 'on')
			.css('user-select', 'none')
			.on('selectstart', false)
			.appendTo(d);

		//  up/down
		if (this.reordering)
		{	if ( (i<layers.length-1 && (layer.get("allwaysOnTop") || !layers[i+1].get("allwaysOnTop")) )
				|| (i>0 && (!layer.get("allwaysOnTop") || layers[i-1].get("allwaysOnTop")) ) )
			{	$("<div>").addClass("layerup")
					.on ("mousedown touchstart", {self:this}, this.dragOrdering_ )
					.attr("title", this.tip.up)
					.appendTo(layer_buttons);
			}
		}

		// Show/hide sub layers
		if (layer.getLayers) 
		{	var nb = 0;
			layer.getLayers().forEach(function(l)
			{	if (l.get('displayInLayerSwitcher')!==false) nb++;
			});
			if (nb) 
			{	$("<div>").addClass(layer.get("openInLayerSwitcher") ? "collapse-layers" : "expend-layers" )
					.click(function()
					{	var l = $(this).closest('li').data("layer");
						l.set("openInLayerSwitcher", !l.get("openInLayerSwitcher") )
					})
					.attr("title", this.tip.plus)
					.appendTo(layer_buttons);
			}
		}

		// $("<div>").addClass("ol-separator").appendTo(layer_buttons);

		// Info button
		if (this.oninfo)
		{	$("<div>").addClass("layerInfo")
					.on ('click', onInfo)
					.attr("title", this.tip.info)
					.appendTo(layer_buttons);
		}
		// Layer remove
		if (this.hastrash && !layer.get("noSwitcherDelete"))
		{	$("<div>").addClass("layerTrash")
					.on ('click', removeLayer)
					.attr("title", this.tip.trash)
					.appendTo(layer_buttons);
		}
		// Layer extent
		if (this.hasextent && layers[i].getExtent())
		{	var ex = layers[i].getExtent();
			if (ex.length==4 && ex[0]<ex[2] && ex[1]<ex[3])
			{	$("<div>").addClass("layerExtent")
					.on ('click', zoomExtent)
					.attr("title", this.tip.extent)
					.appendTo(layer_buttons);
			}
		}

		// Progress
		if (this.show_progress && layer instanceof ol.layer.Tile)
		{	var p = $("<div>")
				.addClass("layerswitcher-progress")
				.appendTo(d);
			this.setprogress_(layer);
			layer.layerswitcher_progress = $("<div>").appendTo(p);
		}

		// Opacity
		var opacity = $("<div>").addClass("layerswitcher-opacity")
				.on("click", function(e)
				{	e.stopPropagation();
					e.preventDefault();
					var x = e.pageX 
						|| (e.originalEvent.touches && e.originalEvent.touches.length && e.originalEvent.touches[0].pageX) 
						|| (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length && e.originalEvent.changedTouches[0].pageX);
					var dx = Math.max ( 0, Math.min( 1, (x - $(this).offset().left) / $(this).width() ));
					$(this).closest("li").data('layer').setOpacity(dx);
				})
				.appendTo(d);
		$("<div>").addClass("layerswitcher-opacity-cursor")
				.on("mousedown touchstart", { self: this }, self.dragOpacity_ )
				.css ('left', (layer.getOpacity()*100)+"%")
				.appendTo(opacity);
		// Percent
		$("<div>").addClass("layerswitcher-opacity-label")
			.text(Math.round(layer.getOpacity()*100))
			.appendTo(d);

		// Layer group
		if (layer.getLayers)
		{	li.addClass('ol-layer-group');
			if (layer.get("openInLayerSwitcher")===true) 
			{	this.drawList ($("<ul>").appendTo(li), layer.getLayers());
			}
		}
		else if (layer instanceof ol.layer.Vector) li.addClass('ol-layer-vector');
		else if (layer instanceof ol.layer.VectorTile) li.addClass('ol-layer-vector');
		else if (layer instanceof ol.layer.Tile) li.addClass('ol-layer-tile');
		else if (layer instanceof ol.layer.Image) li.addClass('ol-layer-image');
		else if (layer instanceof ol.layer.Heatmap) li.addClass('ol-layer-heatmap');
	}

	if (ul==this.panel_) this.overflow();
};

/** Handle progress bar for a layer
*	@private
*/
ol.control.LayerSwitcher.prototype.setprogress_ = function(layer)
{
	if (!layer.layerswitcher_progress)
	{	var loaded = 0;
		var loading = 0;
		function draw()
		{	if (loading === loaded) 
			{	loading = loaded = 0;
				layer.layerswitcher_progress.width(0);
			}
			else 
			{	layer.layerswitcher_progress.css('width', (loaded / loading * 100).toFixed(1) + '%');
			}
		}
		layer.getSource().on('tileloadstart', function()
		{	loading++;
			draw();
		});
		layer.getSource().on('tileloadend', function()
		{	loaded++;
			draw();
		});
		layer.getSource().on('tileloaderror', function()
		{	loaded++;
			draw();
		});
	}
}

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** A simple push button control 
* @constructor
* @extends {ol.control.Control}
* @param {Object=} options Control options.
*	@param {String} options.className class of the control
*	@param {String} options.title title of the control
*	@param {String} options.html html to insert in the control
*	@param {function} options.handleClick callback when control is clicked (or use change:active event)
*/
ol.control.Button = function(options) 
{	options = options || {};
	var element = $("<div>").addClass((options.className||"") + ' ol-button ol-unselectable ol-control');
	var self = this;

	var bt = $("<button>").html(options.html || "")
				.attr('type','button')
				.attr('title', options.title)
				.on("click", function(e)
				{	if (e && e.preventDefault) 
					{	e.preventDefault();
						e.stopPropagation();
					}
					if (options.handleClick) options.handleClick.call(self, e);
				})
				.appendTo(element);
	// Try to get a title in the button content
	if (!options.title) bt.attr("title", bt.children().first().attr('title'));

	ol.control.Control.call(this, 
	{	element: element.get(0),
		target: options.target
	});

	if (options.title) this.set("title", options.title);
};
ol.inherits(ol.control.Button, ol.control.Control);

/** A simple push button control drawn as text
* @constructor
* @extends {ol.control.Button}
* @param {Object=} options Control options.
*	@param {String} options.className class of the control
*	@param {String} options.title title of the control
*	@param {String} options.html html to insert in the control
*	@param {function} options.handleClick callback when control is clicked (or use change:active event)
*/
ol.control.TextButton = function(options) 
{	options = options || {};
	options.className = (options.className||"") + " ol-text-button";
	ol.control.Button.call(this, options);
};
ol.inherits(ol.control.TextButton, ol.control.Button);

/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * @classdesc 
 *   OpenLayers 3 Attribution Control integrated in the canvas (for jpeg/png export purposes).
 * @see http://www.kreidefossilien.de/webgis/dokumentation/beispiele/export-map-to-png-with-scale
 *
 * @constructor
 * @extends {ol.control.Attribution}
 * @param {Object=} options extend the ol.control.Attribution options. 
 * 	@param {ol.style.Style} options.style  option is usesd to draw the text.
 */
ol.control.CanvasAttribution = function(options) 
{	if (!options) options = {};
	ol.control.Attribution.call(this, options);

	// Draw in canvas
	this.isCanvas_ = !!options.canvas;

	// Get style options
	if (!options) options={};
	if (!options.style) options.style = new ol.style.Style();
	this.setStyle (options.style);
}
ol.inherits(ol.control.CanvasAttribution, ol.control.Attribution);

/**
 * Draw attribution on canvas
 * @param {boolean} draw the attribution on canvas.
 */
ol.control.CanvasAttribution.prototype.setCanvas = function (b)
{	this.isCanvas_ = b;
	$(this.element).css("visibility", b ? "hidden":"visible");
	if (this.map_) this.map_.renderSync();
}

/**
 * Change the control style
 * @param {ol.style.Style} 
 */
ol.control.CanvasAttribution.prototype.setStyle = function (style)
{	var text = style.getText();
	this.font_ = text ? text.getFont() : "10px Arial";
	var stroke = text ? text.getStroke() : null;
	var fill = text ? text.getFill() : null;
	this.fontStrokeStyle_ = stroke ? ol.color.asString(stroke.getColor()) : "#fff";
	this.fontFillStyle_ = fill ? ol.color.asString(fill.getColor()) : "#000";
	this.fontStrokeWidth_ = stroke ? stroke.getWidth() : 3;
	if (this.getMap()) this.getMap().render();
}

/**
 * Remove the control from its current map and attach it to the new map.
 * Subclasses may set up event handlers to get notified about changes to
 * the map here.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.control.CanvasAttribution.prototype.setMap = function (map)
{	var oldmap = this.getMap();
	if (oldmap) oldmap.un('postcompose', this.drawAttribution_, this);
	
	ol.control.ScaleLine.prototype.setMap.call(this, map);
	if (oldmap) oldmap.renderSync();

	// Get change (new layer added or removed)
	if (map) map.on('postcompose', this.drawAttribution_, this);
	this.map_ = map;
	
	this.setCanvas (this.isCanvas_);
}

/** 
 * Draw attribution in the final canvas
 * @private
 */
ol.control.CanvasAttribution.prototype.drawAttribution_ = function(e)
{	var ctx = e.context;
	if (!this.isCanvas_) return;

	var text = "";
	$("li", this.element).each (function()
	{	if ($(this).css("display")!="none") text += (text ? " - ":"") + $(this).text();
	});

	// Get size of the scale div
	var position = $(this.element).position();
	// Retina device
	var ratio = e.frameState.pixelRatio;
	ctx.save();
	ctx.scale(ratio,ratio);

	// Position if transform:scale()
	var container = $(this.getMap().getViewport()).parent();
	var scx = container.outerWidth() / container.get(0).getBoundingClientRect().width;
	var scy = container.outerHeight() / container.get(0).getBoundingClientRect().height;
	position.left *= scx;
	position.top *= scy;

	position.right = position.left + $(this.element).outerWidth();
	position.bottom = position.top + $(this.element).outerHeight();

	// Draw scale text
	ctx.beginPath();
    ctx.strokeStyle = this.fontStrokeStyle_;
    ctx.fillStyle = this.fontFillStyle_;
    ctx.lineWidth = this.fontStrokeWidth_;
    ctx.textAlign = "right";
	ctx.textBaseline ="bottom";
    ctx.font = this.font_;
	ctx.strokeText(text, position.right, position.bottom);
    ctx.fillText(text, position.right, position.bottom);
	ctx.closePath();

	ctx.restore();
}
/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * @classdesc 
 *    OpenLayers 3 Scale Line Control integrated in the canvas (for jpeg/png export purposes).
 * @see http://www.kreidefossilien.de/webgis/dokumentation/beispiele/export-map-to-png-with-scale
 *
 * @constructor
 * @extends {ol.control.ScaleLine}
 * @param {Object=} options extend the ol.control.ScaleLine options. 
 * 	@param {ol.style.Style} options.style usesd to draw the scale line (default is black/white, 10px Arial).
 */
ol.control.CanvasScaleLine = function(options) 
{	ol.control.ScaleLine.call(this, options);
	
	this.scaleHeight_ = 6;

	// Get style options
	if (!options) options={};
	if (!options.style) options.style = new ol.style.Style();
	this.setStyle(options.style);
}
ol.inherits(ol.control.CanvasScaleLine, ol.control.ScaleLine);

/**
 * Remove the control from its current map and attach it to the new map.
 * Subclasses may set up event handlers to get notified about changes to
 * the map here.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.control.CanvasScaleLine.prototype.setMap = function (map)
{	var oldmap = this.getMap();
	if (oldmap) oldmap.un('postcompose', this.drawScale_, this);
	
	ol.control.ScaleLine.prototype.setMap.call(this, map);
	if (oldmap) oldmap.renderSync();

	// Add postcompose on the map
	if (map) map.on('postcompose', this.drawScale_, this);

	// Hide the default DOM element
	this.$element = $(this.element).css("visibility","hidden");
	this.olscale = $(".ol-scale-line-inner", this.element);
}


/**
 * Change the control style
 * @param {ol.style.Style} 
 */
ol.control.CanvasScaleLine.prototype.setStyle = function (style)
{	var stroke = style.getStroke();
	this.strokeStyle_ = stroke ? ol.color.asString(stroke.getColor()) : "#000";
	this.strokeWidth_ = stroke ? stroke.getWidth() : 2;

	var fill = style.getFill();
	this.fillStyle_ = fill ? ol.color.asString(fill.getColor()) : "#fff";
	
	var text = style.getText();
	this.font_ = text ? text.getFont() : "10px Arial";
	stroke = text ? text.getStroke() : null;
	fill = text ? text.getFill() : null;
	this.fontStrokeStyle_ = stroke ? ol.color.asString(stroke.getColor()) : this.fillStyle_;
	this.fontStrokeWidth_ = stroke ? stroke.getWidth() : 3;
	this.fontFillStyle_ = fill ? ol.color.asString(fill.getColor()) : this.strokeStyle_;
	// refresh
	if (this.getMap()) this.getMap().render();
}

/** 
 * Draw attribution in the final canvas
 * @private
 */
ol.control.CanvasScaleLine.prototype.drawScale_ = function(e)
{	if ( this.$element.css("display")=="none" ) return;
	var ctx = e.context;

	// Get size of the scale div
	var scalewidth = this.olscale.width();
	if (!scalewidth) return;
	var text = this.olscale.text();
	var position = this.$element.position();
	// Retina device
	var ratio = e.frameState.pixelRatio;
	ctx.save();
	ctx.scale(ratio,ratio);

	// Position if transform:scale()
	var container = $(this.getMap().getViewport()).parent();
	var scx = container.outerWidth() / container.get(0).getBoundingClientRect().width;
	var scy = container.outerHeight() / container.get(0).getBoundingClientRect().height;
	position.left *= scx;
	position.top *= scy;

	// On top
	position.top += this.$element.height() - this.scaleHeight_;

	// Draw scale text
	ctx.beginPath();
    ctx.strokeStyle = this.fontStrokeStyle_;
    ctx.fillStyle = this.fontFillStyle_;
    ctx.lineWidth = this.fontStrokeWidth_;
    ctx.textAlign = "center";
	ctx.textBaseline ="bottom";
    ctx.font = this.font_;
	ctx.strokeText(text, position.left+scalewidth/2, position.top);
    ctx.fillText(text, position.left+scalewidth/2, position.top);
	ctx.closePath();

	// Draw scale bar
	position.top += 2;
	ctx.lineWidth = this.strokeWidth_;
	ctx.strokeStyle = this.strokeStyle_;
	var max = 4;
	var n = parseInt(text);
	while (n%10 == 0) n/=10;
	if (n%5 == 0) max = 5;
	for (var i=0; i<max; i++)
	{	ctx.beginPath();
		ctx.fillStyle = i%2 ? this.fillStyle_ : this.strokeStyle_;
		ctx.rect(position.left+i*scalewidth/max, position.top, scalewidth/max, this.scaleHeight_);
		ctx.stroke();
		ctx.fill();
		ctx.closePath();
	}
	ctx.restore();
}
/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * OpenLayers 3 Title Control integrated in the canvas (for jpeg/png export purposes).
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} options extend the ol.control options. 
 * 	@param {ol.style.Style} options.style stye usesd to draw the title.
 */
ol.control.CanvasTitle = function(options) 
{	if (!options) options={};
	
	// Get style options
	if (!options.style) options.style = new ol.style.Style();
	this.setStyle(options.style);

	// Initialize parent
	var elt = $("<div>").text(this.text_)
				.addClass("ol-title ol-unselectable")
				.css(
				{	font: this.font_,
					position: 'absolute',
					top:0, left:0, right:0,
					display: 'block',
					visibility: 'hidden'
				});

	ol.control.Control.call(this, 
	{	element: elt.get(0),
		target: options.target
	});
}
ol.inherits(ol.control.CanvasTitle, ol.control.Control);

/**
 * Remove the control from its current map and attach it to the new map.
 * Subclasses may set up event handlers to get notified about changes to
 * the map here.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.control.CanvasTitle.prototype.setMap = function (map)
{	var oldmap = this.getMap();
	if (oldmap) oldmap.un('postcompose', this.drawTitle_, this);
	
	ol.control.Control.prototype.setMap.call(this, map);
	if (oldmap) oldmap.renderSync();

	// Get change (new layer added or removed)
	if (map) map.on('postcompose', this.drawTitle_, this);
}


/**
 * Change the control style
 * @param {ol.style.Style} 
 */
ol.control.CanvasTitle.prototype.setStyle = function (style)
{	var text = style.getText();
	this.font_ = text ? text.getFont() || "20px Arial" : "20px Arial";
	this.text_ = text ? text.getText() : "";
	var stroke = text ? text.getStroke() : null;
	var fill = text ? text.getFill() : null;
	this.strokeStyle_ = stroke ? ol.color.asString(stroke.getColor()) : "#fff";
	this.fillStyle_ = fill ? ol.color.asString(fill.getColor()) : "#000";
	if (this.element) 
	{	$(this.element).text(this.text_).css ({font: this.font_});
	}
	// refresh
	if (this.getMap()) this.getMap().render();
}

/**
 * Set the map title 
 * @param {string} map title.
 * @api stable
 */
ol.control.CanvasTitle.prototype.setTitle = function (title)
{	this.text_ = title;
	$(this.element).text(title);
	if (this.getMap()) this.getMap().renderSync();
}

/**
 * Get the map title 
 * @param {string} map title.
 * @api stable
 */
ol.control.CanvasTitle.prototype.getTitle = function (title)
{	return this.text_;
}


/**
 * Set control visibility
 * @param {bool}
 * @api stable
 */
ol.control.CanvasTitle.prototype.setVisible = function (b)
{	if (b) $(this.element).show();
	else $(this.element).hide();
	if (this.getMap()) this.getMap().renderSync();
}

/**
 * Get control visibility
 * @return {bool} 
 * @api stable
 */
ol.control.CanvasTitle.prototype.getVisible = function (b)
{	return ($(this.element).css('display') != 'none');
}

/** Draw scale line in the final canvas
*/
ol.control.CanvasTitle.prototype.drawTitle_ = function(e)
{	if (!this.getVisible()) return;
	var ctx = e.context;
	
	// Retina device
	var ratio = e.frameState.pixelRatio;
	ctx.save();
	ctx.scale(ratio,ratio);

	var w = ctx.canvas.width/ratio;
	var h = $(this.element).height();
	var position = { top:0, left:w/2 };

	ctx.beginPath();
    ctx.fillStyle = this.strokeStyle_;
	ctx.rect(0,0, w, h);
	ctx.fill();
	ctx.closePath();

	ctx.beginPath();
    ctx.fillStyle = this.fillStyle_;
    ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = this.font_;
    ctx.fillText(this.text_, position.left, position.top +h/2);
	ctx.closePath();

	ctx.restore();
}
/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** ol.control.Cloud adds an old map effect on a canvas renderer. 
* It colors the map, adds a parchment texture and compass onto the map. 
* @constructor
* @param {Object} options
*	@param {ol.Color} options.hue color to set hue of the map, default #963
*	@param {Number} options.saturation saturation of the hue color, default 0.6
*	@param {Number} options.opacity opacity of the overimpose image, default 0.7
* @todo add effects on pan / zoom change
*/
ol.control.Cloud = function(options) 
{	options = options || {};

	var div = document.createElement('div');
	div.className = "ol-cloud ol-unselectable ol-control";
	ol.control.Control.call(this, 
	{	element: div
	});

	// Defaut cloud image
	this.cloud = options.img;
	if (!this.cloud)
	{	this.cloud = new Image();
		this.cloud.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AYRBhgFS4lkHAAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAA6lBMVEUAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+Le70HAAAATnRSTlMAAwkMDxUXGiAiJSowMzU3Ojw/QkRGSUtOT1JUV1lbXmBiZGZoam1ucXN0d3l6fX6AgoSGh4qLjY6QkpSVl5mbnJ6foaKkpaeoqqutrrA/NNYeAAAAAWJLR0QB/wIt3gAALhJJREFUeNrtfel6azeuLAryd9//fbuFuj+IkYtLkr2902dyEseDLIkkiKFQAET+h3/gH/iL//v4Xy0w//Ul53/xJcAHq3q1WHD+/9feEbH+u3zw7+4H//Jpg++2Ctc3cvwT/gPSwX9U3PHhfvct5H8RDXE8r+/dirZ8+Mrg14AQggL252R8TfAf3oAfv+DdH2K+yvv9Zt+H3xWEv64Drq+HswDcvih36fft4N9Y+usN+HPZw+nu490rtC1Al4A/vQy3f47fXvd19Ygrn7bijfYbB94lgL+wAfsK8X1b9tHqh/Dv/7vRpGy/2y+E68XfFwP8vnJBlwB8bgSPBnCqAP6+cfxdJejiPZZ/kALmZ97dgnH4/Yvf3gJ8V/u9/D32he/2b78FtxIAXkWAf8E0+tvkDxd8v/yuBHDZiRQBvvSBt8Vf9uFv+QGvD/nenuCk/ptLEN/z+DRTBXQJIPjnUnBePX9LB1xkPxZ82JOXB44bK5Ar50E3/qetgLTj3RaNzS/wt4DL0nGjDgn25XKeP//o/DcvnT97Ipci7NYfcl3+JRwmuG1G+1VX+9Ma4BfVIf5s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";
	}
	this.bird = options.bird;
	if (!this.bird)
	{	this.bird = new Image();
		this.bird.src = "data:image/png;base64,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";
	}

	// Parameters
	this.set('opacity', options.opacity||0.3);
	this.set('density', options.density||0.5);
	this.setWind(options);

};

ol.inherits(ol.control.Cloud, ol.control.Control);

/**
 * Remove the control from its current map and attach it to the new map.
 * Subclasses may set up event handlers to get notified about changes to
 * the map here.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.control.Cloud.prototype.setMap = function (map)
{	if (this.getMap()) 
	{	this.getMap().un('postcompose', this.drawCloud_, this);
	}

	ol.control.Control.prototype.setMap.call(this, map);

	if (map) 
	{	map.on('postcompose', this.drawCloud_, this);
	}
};

/** Set wind direction / force
*/
ol.control.Cloud.prototype.setWind= function (options) 
{	options = options || {};
	
	var rnd = Math.random;	
	var a = options.windAngle || rnd()*Math.PI;
	var speed = options.windSpeed || rnd();
	this.wind = { angle: a, cos: Math.cos(a), sin: Math.sin(a), speed: speed };
}

/**
*	@private
*/
ol.control.Cloud.prototype.drawCloud_ = function (event)
{	if (!this.getMap()) return;
	var ctx = event.context;
	var canvas = ctx.canvas;
	var ratio = event.frameState.pixelRatio;

//	var m = Math.max(canvas.width, canvas.height);
//	var res = view.getResolution()/ratio;
//	var rot = view.getRotation();

	// Not ready !
	if (!this.cloud.width) return;

	// Go!
	var p = this.particules;
	var rnd = Math.random;	
	var w = this.cloud.width;
	var h = this.cloud.height;
	var w2 = this.cloud.width/2;
	var h2 = this.cloud.height/2;
	var d = (this.get('density')*10*canvas.width*canvas.height/w/h) << 0;

	function addClouds (nb, reset)
	{	for (var i=0; i<nb; i++)
		{	p.push({ x: rnd()*canvas.width-w2, y: rnd()*canvas.height-h2 });
		}
	}

	// First time: init clouds
	if (!p)
	{	p = this.particules = [];
		addClouds(d);
		// Wind
		var a = rnd()*Math.PI;
		this.width = canvas.width;
		this.height = canvas.height;
		// Birds
		this.birds = [];
		for (var i=0; i<5; i++)
		{	var b = { angle: rnd()*2*Math.PI, x: rnd()*canvas.width, y: rnd()*canvas.height, rot:0, fly:0 };
			b.cos = Math.cos(b.angle);
			b.sin = Math.cos(b.angle);
			this.birds.push (b);
		}
	}
	// Parameters changed
	else if (d != p.length)
	{	if (this.width != canvas.width || this.height != canvas.height)
		{	p = this.particules = [];
			addClouds(d);
			this.width = canvas.width;
			this.height = canvas.height;
		}
		else if (d > p.length)
		{	addClouds(1);
		}
		else if (d < p.length)
		{	p.splice ( (p.length*rnd()) << 0, 1);
		}
	}

	// Draw clouds
	var dx = this.wind.cos * this.wind.speed;
	var dy = this.wind.sin * this.wind.speed;
	for (var i=0; i<p.length; i++)
	{	p[i].x += dx + rnd()*2-1;
		p[i].y += dy + rnd()*2-1;
		// out!
		if (p[i].x < -w) 
		{	p[i].x = canvas.width;
			p[i].y = rnd()*canvas.height-h2;
		}
		else if (p[i].x > canvas.width) 
		{	p[i].x = -w;
			p[i].y = rnd()*canvas.height-h2;
		}
		if (p[i].y < -h) 
		{	p[i].y = canvas.height;
			p[i].x = rnd()*canvas.width-w2;
		}
		else if (p[i].y > canvas.height) 
		{	p[i].y = -h;
			p[i].x = rnd()*canvas.width-w2;
		}
	}

	// Draw clouds
	ctx.globalAlpha = this.get('opacity');
	for (var i=0; i<p.length; i++)
	{	ctx.drawImage(this.cloud, p[i].x,p[i].y);
	}
	ctx.globalAlpha = 1;

	// Draw birds
	var w = this.bird.width/2;
	var h = this.bird.height/2;
	var sc = 0.5;
	var dw = canvas.width+w;
	var dh = canvas.height+h;

	for (var i=0; i<this.birds.length; i++)
	{	var bi = this.birds[i];
		
		// Animate birds
		var sx = 0;
		if (bi.fly) 
		{	bi.fly = (++bi.fly%5)
			sx = -0.1
		}
		else if (rnd()<0.01) bi.fly=1;

		// Rotate birds
		if (bi.rot) 
		{	bi.angle += bi.rot;
			bi.cos = Math.cos(bi.angle);
			bi.sin = Math.sin(bi.angle);
		}
		if (rnd()<0.01)
		{	bi.rot = bi.rot ? 0 : rnd()*Math.PI/200-Math.PI/400;
			bi.cos = Math.cos(bi.angle);
			bi.sin = Math.sin(bi.angle);
		}
		
		// Move birds
		bi.x += bi.sin;
		if (bi.x>dw) bi.x = -w;
		if (bi.x<-w) bi.x = dw;
		bi.y -= bi.cos;
		if (bi.y>dh) bi.y = -h;
		if (bi.y<-h) bi.y = dh;

		// Draw birds
		ctx.save();
			ctx.translate (bi.x, bi.y);
			ctx.rotate(bi.angle)
			ctx.scale(sc+sx,sc);
			ctx.drawImage( this.bird, -w,-h );
		ctx.restore();
	}

	// Continue animation
	this.getMap().render();
}

/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * Draw a compass on the map. The position/size of the control is defined in the css.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} options Control options. The style {ol.style.Style} option is usesd to draw the text.
 *	@param {string} options.className class name for the control
 *	@param {Image} options.image an image, default use the src option or a default image
 *	@param {string} options.src image src, default use the image option or a default image
 *	@param {boolean} options.rotateVithView rotate vith view (false to show watermark), default true
 *	@param {ol.style.Stroke} options.style style to draw the lines, default draw no lines
 */
ol.control.Compass = function(options) 
{	var self = this;
	if (!options) options = {};
	
	// Initialize parent
	var elt = document.createElement("div");
	elt.className = "ol-compassctrl ol-unselectable ol-hidden" + (options.className ? " "+options.className : "");
	elt.style.position = "absolute";
	elt.style.visibility = "hidden";
	
	ol.control.Control.call(this, { element: elt });

	this.set('rotateVithView', options.rotateWithView!==false);
	// Style to draw the lines
	this.style = options.style;

	// The image
	if (options.image)
	{	this.img_ = options.image;
	}
	else if (options.src)
	{	this.img_ = new Image();
		this.img_.onload = function(){ if (self.getMap()) self.getMap().renderSync(); }
		this.img_.src =  options.src;
	}
	else this.img_ = this.defaultCompass_($(this.element).width(), this.style ? this.style.getColor():"");

	// 8 angles
	this.da_ = [];
	for (var i=0; i<8; i++) this.da_[i] = [ Math.cos(Math.PI*i/8), Math.sin(Math.PI*i/8) ];
};
ol.inherits(ol.control.Compass, ol.control.Control);

/**
 * Remove the control from its current map and attach it to the new map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.control.Compass.prototype.setMap = function (map)
{	var oldmap = this.getMap();
	if (oldmap) oldmap.un('postcompose', this.drawCompass_, this);
	
	ol.control.Control.prototype.setMap.call(this, map);
	if (oldmap) oldmap.renderSync();

	// Get change (new layer added or removed)
	if (map) map.on('postcompose', this.drawCompass_, this);
};

/**
 * Create a default image.
 * @param {number} s the size of the compass
 * @private
 */
ol.control.Compass.prototype.defaultCompass_ = function (s, color)
{	var canvas = document.createElement('canvas');
	var ctx = canvas.getContext("2d");
	var s = canvas.width = canvas.height;
	var r = s/2;
	var r2 = 0.22*r;

	function draw (r, r2)
	{	ctx.fillStyle = color ||"#963";
		ctx.beginPath();
		ctx.moveTo (0,0); 
		ctx.lineTo (r,0); ctx.lineTo (r2,r2); ctx.moveTo (0,0);
		ctx.lineTo (-r,0); ctx.lineTo (-r2,-r2); ctx.moveTo (0,0);
		ctx.lineTo (0,r); ctx.lineTo (-r2,r2); ctx.moveTo (0,0);
		ctx.lineTo (0,-r); ctx.lineTo (r2,-r2); ctx.moveTo (0,0);
		ctx.fill();
		ctx.stroke();
	};
		
	function draw2 (r, r2)
	{	ctx.globalCompositeOperation = "destination-out";
		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.moveTo (0,0); 
		ctx.lineTo (r,0); ctx.lineTo (r2,-r2); ctx.moveTo (0,0);
		ctx.lineTo (-r,0); ctx.lineTo (-r2,r2); ctx.moveTo (0,0);
		ctx.lineTo (0,r); ctx.lineTo (r2,r2); ctx.moveTo (0,0);
		ctx.lineTo (0,-r); ctx.lineTo (-r2,-r2); ctx.moveTo (0,0);
		ctx.fill();
		ctx.globalCompositeOperation="source-over";
		ctx.beginPath();
		ctx.moveTo (0,0); 
		ctx.lineTo (r,0); ctx.lineTo (r2,-r2); ctx.moveTo (0,0);
		ctx.lineTo (-r,0); ctx.lineTo (-r2,r2); ctx.moveTo (0,0);
		ctx.lineTo (0,r); ctx.lineTo (r2,r2); ctx.moveTo (0,0);
		ctx.lineTo (0,-r); ctx.lineTo (-r2,-r2); ctx.moveTo (0,0);
		ctx.stroke();
	};

	ctx.translate(r,r);
	ctx.strokeStyle = color || "#963";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc (0,0, s*0.41, 0, 2*Math.PI);
	ctx.arc (0,0, s*0.44, 0, 2*Math.PI);
	ctx.stroke();

	ctx.rotate(Math.PI/4)
	draw (r*0.9, r2*0.8);
	draw2 (r*0.9, r2*0.8);

	ctx.rotate(-Math.PI/4)
	draw (r, r2);
	draw2 (r, r2);
	
	return canvas;
};

/** Draw compass
* @param {ol.event} e postcompose event
* @private
*/
ol.control.Compass.prototype.drawCompass_ = function(e)
{	var ctx = e.context;
	var canvas = ctx.canvas;

	// Retina device
	var ratio = e.frameState.pixelRatio;
	ctx.save();
	ctx.scale(ratio,ratio);

	var w = $(this.element).width();
	var h = $(this.element).height();
	var pos = $(this.element).position();
	
	var compass = this.img_;
	var rot = e.frameState.viewState.rotation;
	
	ctx.beginPath();
		ctx.translate(pos.left+w/2, pos.top+h/2);
		if (this.get('rotateVithView')) ctx.rotate(rot);
		/*
		ctx.globalCompositeOperation = "multiply";
		ctx.globalAlpha = this.opacity || 1;
		*/
		if (this.style)
		{	ctx.beginPath();
				ctx.strokeStyle = this.style.getColor();
				ctx.lineWidth = this.style.getWidth();
				var m = Math.max(canvas.width, canvas.height);
				for (var i=0; i<8; i++)
				{	ctx.moveTo (-this.da_[i][0]*m, -this.da_[i][1]*m);
					ctx.lineTo (this.da_[i][0]*m, this.da_[i][1]*m);
				}
			ctx.stroke();
		}
		
		if (compass.width)
		{	ctx.drawImage (compass, -w/2, -h/2, w, h);
		}

	ctx.closePath();

	ctx.restore();
};
/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Control bar for OL3
 * The control bar is a container for other controls. It can be used to create toolbars.
 * Control bars can be nested and combined with ol.control.Toggle to handle activate/deactivate.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} options Control options.
 *	@param {String} options.className class of the control
 *	@param {bool} options.group is a group, default false
 *	@param {bool} options.toggleOne only one toggle control is active at a time, default false
 *	@param {bool} options.autoDeactivate used with subbar to deactivate all control when top level control deactivate, default false
 *	@param {Array<ol.control>} options.controls a list of control to add to the bar
 */
ol.control.Bar = function(options) 
{	if (!options) options={};
	var element = $("<div>").addClass('ol-unselectable ol-control ol-bar');
	if (options.className) element.addClass(options.className);
	if (options.group) element.addClass('ol-group');
	
	ol.control.Control.call(this, 
	{	element: element.get(0),
		target: options.target
	});

	this.set('toggleOne', options.toggleOne);
	this.set('autoDeactivate', options.autoDeactivate);

	this.controls_ = [];
	if (options.controls instanceof Array) 
	{	for (var i=0; i<options.controls.length; i++)
		{	this.addControl(options.controls[i]);
		}
	}
};
ol.inherits(ol.control.Bar, ol.control.Control);

/** Set the control visibility
* @param {boolean} b 
*/
ol.control.Bar.prototype.setVisible = function (val) {
	if (val) $(this.element).show();
	else $(this.element).hide();
}

/** Get the control visibility
* @return {boolean} b 
*/
ol.control.Bar.prototype.getVisible = function () 
{	return ($(this.element).css('display') != 'none');
}

/**
 * Set the map instance the control is associated with
 * and add its controls associated to this map.
 * @param {ol.Map} map The map instance.
 */
ol.control.Bar.prototype.setMap = function (map)
{	ol.control.Control.prototype.setMap.call(this, map);

	for (var i=0; i<this.controls_.length; i++)
	{	var c = this.controls_[i];
		// map.addControl(c);
		c.setMap(map);
	}
};

/** Get controls in the panel
*	@param {Array<ol.control>}
*/
ol.control.Bar.prototype.getControls = function ()
{	return this.controls_;
};

/** Set tool bar position
*	@param {top|left|bottom|right}
*/
ol.control.Bar.prototype.setPosition = function (pos)
{	$(this.element).removeClass('ol-left ol-top ol-bottom ol-right');
	pos=pos.split ('-');
	for (var i=0; i<pos.length; i++)
	{	switch (pos[i])
		{	case 'top':
			case 'left':
			case 'bottom':
			case 'right':
				$(this.element).addClass ("ol-"+pos[i]);
				break;
			default: break;
		}
	}
};

/** Add a control to the bar
*	@param {ol.control} c control to add
*/
ol.control.Bar.prototype.addControl = function (c)
{	this.controls_.push(c);
	c.setTarget(this.element);
	if (this.getMap()) 
	{	this.getMap().addControl(c);
	}
	// Activate and toogleOne
	c.on ('change:active', this.onActivateControl_, this);
	if (c.getActive && c.getActive())
	{	c.dispatchEvent({ type:'change:active', key:'active', oldValue:false, active:true });
	}
};

/** Deativate all controls in a bar
* @param {ol.control} except a control
*/
ol.control.Bar.prototype.deactivateControls = function (except)
{	for (var i=0; i<this.controls_.length; i++) 
	{	if (this.controls_[i] !== except && this.controls_[i].setActive) 
		{	this.controls_[i].setActive(false);
		}
	}
};


ol.control.Bar.prototype.getActiveControls = function ()
{	var active = [];
	for (var i=0, c; c=this.controls_[i]; i++) 
	{	if (c.getActive && c.getActive()) active.push(c);
	}
	return active;
}

/** Auto activate/deactivate controls in the bar
* @param {boolean} b activate/deactivate
*/
ol.control.Bar.prototype.setActive = function (b)
{	if (!b && this.get("autoDeactivate"))
	{	this.deactivateControls();
	}
	if (b)
	{	var ctrls = this.getControls();
		for (var i=0, sb; (sb = ctrls[i]); i++)
		{	if (sb.get("autoActivate")) sb.setActive(true);
		}
	}
}

/** Post-process an activated/deactivated control
*	@param {ol.event} an object with a target {ol.control} and active flag {bool}
*/
ol.control.Bar.prototype.onActivateControl_ = function (e)
{	if (this.get('toggleOne'))
	{	if (e.active)
		{	var n;
			var ctrl = e.target;
			for (n=0; n<this.controls_.length; n++) 
			{	if (this.controls_[n]===ctrl) break;
			}
			// Not here!
			if (n==this.controls_.length) return;
			this.deactivateControls (this.controls_[n]);
		}
		else
		{	// No one active > test auto activate
			if (!this.getActiveControls().length)
			{	for (var i=0, c; c=this.controls_[i]; i++) 
				{	if (c.get("autoActivate")) 
					{	c.setActive();
						break;
					}
				}
			}
		}
	}
};

/** A simple control to disable all actions on the map.
 * The control will create an invisible div over the map.
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} options Control options.
 *		@param {String} options.class class of the control
 *		@param {String} options.html html code to insert in the control
 *		@param {bool} options.on the control is on
 *		@param {function} options.toggleFn callback when control is clicked 
 */
ol.control.Disable = function(options) 
{	var options = options||{};
	var element = $("<div>").addClass((options.calssName||"")+' ol-disable ol-unselectable ol-control');
	element.css({ top:0, left:0, right:0, bottom:0, "z-index":10000, background:"none", display:"none" });

	ol.control.Control.call(this, 
	{	element: element.get(0)
	});
}
ol.inherits(ol.control.Disable, ol.control.Control);

/** Test if the control is on
 * @return {bool}
 * @api stable
 */
ol.control.Disable.prototype.isOn = function()
{	return $(this.element).hasClass("ol-disable");
}

/** Disable all action on the map
 * @param {bool} b, default false
 * @api stable
 */
ol.control.Disable.prototype.disableMap = function(b)
{	if (b) 
	{	$(this.element).addClass("ol-enable").show();
	}
	else 
	{	$(this.element).removeClass("ol-enable").hide();
	}
}
/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** A simple gauge control to display level information on the map.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} options Control options.
 *		@param {String} options.className class of the control
 *		@param {String} options.title title of the control
 *		@param {number} options.max maximum value, default 100;
 *		@param {number} options.val the value, default 0
 */
ol.control.Gauge = function(options) 
{	options = options || {};
	var element = $("<div>").addClass((options.className||"") + ' ol-gauge ol-unselectable ol-control');
	this.title_ = $("<span>").appendTo(element);
	this.gauge_ = $("<button>").attr('type','button').appendTo($("<div>").appendTo(element)).width(0);
	
	ol.control.Control.call(this, 
	{	element: element.get(0),
		target: options.target
	});

	this.setTitle(options.title);
	this.val(options.val);
	this.set("max", options.max||100);
};
ol.inherits(ol.control.Gauge, ol.control.Control);

/** Set the control title
* @param {string} title
*/
ol.control.Gauge.prototype.setTitle = function(title)
{	this.title_.html(title||"");
	if (!title) this.title_.hide();
	else this.title_.show();
};

/** Set/get the gauge value
* @param {number|undefined} v the value or undefined to get it
* @return {number} the value
*/
ol.control.Gauge.prototype.val = function(v)
{	if (v!==undefined) 
	{	this.val_ = v;
		this.gauge_.css("width", (v/this.get('max')*100)+"%");
	}
	return this.val_;
};
/** Bookmark positions on ol maps. 
 *
 * @constructor
 * @extends {ol.control.Control}
 * @fires add
 * @fires remove
 * @param {} options Geobookmark's options
 *  @param {string} options.className default ol-bookmark
 *  @param {string} options.placeholder input placeholder, default Add a new geomark...
 *  @param {bool} options.editable enable modification, default true
 *  @param {string} options.namespace a namespace to save the boolmark (if more than one on a page), default ol
 *  @param {Array<any>} options.marks a list of default bookmarks: 
 * @see [Geobookmark example](../../examples/map.control.geobookmark.html)
 * @example 
var bm = new GeoBookmark ({ 
  marks: {
    "Paris": {pos:ol.proj.transform([2.351828, 48.856578], 'EPSG:4326', 'EPSG:3857'), zoom:11, permanent: true },
    "London": {pos:ol.proj.transform([-0.1275,51.507222], 'EPSG:4326', 'EPSG:3857'), zoom:12}
  }
});
 */
ol.control.GeoBookmark = function(options) {
  options = options || {};
  var self = this;

  var element = document.createElement('div');
  if (options.target) {
    element.className = options.className || "ol-bookmark";
  } else {
    element.className = (options.className || "ol-bookmark") +
          " ol-unselectable ol-control ol-collapsed";
    element.addEventListener("mouseleave", function() {
      if (input !== document.activeElement) {
        menu.style.display = 'none';
      };
    });
    // Show bookmarks on click
    this.button = document.createElement('button');
    this.button.setAttribute('type', 'button');
    this.button.addEventListener('click', function(e) {
      menu.style.display = (menu.style.display === '' || menu.style.display === 'none' ? 'block': 'none');
    });
    element.appendChild(this.button);
  }
  // The menu
  var menu = document.createElement('div');
  element.appendChild(menu);
  var ul = document.createElement('ul');
  menu.appendChild(ul);
  var input = document.createElement('input');
  input.setAttribute("placeholder", options.placeholder || "Add a new geomark...")
  input.addEventListener("change", function(e) {
    var title = this.value;
    if (title) {
      self.addBookmark(title);
      this.value = '';
      self.dispatchEvent({
        type: "add",
        name: title
      });
    }
    menu.style.display = 'none';
  });
  input.addEventListener("blur", function() {
    menu.style.display = 'none';
  });
  menu.appendChild(input);

  // Init
  ol.control.Control.call(this, {
    element: element,
    target: options.target
  });

  this.on("propertychange", function(e) {
	if (e.key==='editable')
    {	element.className = element.className.replace(" ol-editable","");
		if (this.get('editable'))
		{	element.className += " ol-editable";
		}
    }
    console.log(e);
  }), this;

  this.set("namespace", options.namespace || 'ol');
  this.set("editable", options.editable !== false);
  
  // Set default bmark
  this.setBookmarks(localStorage[this.get('namespace')+"@bookmark"] ? null:options.marks);
};
ol.inherits(ol.control.GeoBookmark, ol.control.Control);

/** Set bookmarks
* @param {} bmark a list of bookmarks, default retreave in the localstorage
* @example 
bm.setBookmarks({ 
  "Paris": {pos:ol.proj.transform([2.351828, 48.856578], 'EPSG:4326', 'EPSG:3857'), zoom:11, permanent: true },
  "London": {pos:ol.proj.transform([-0.1275,51.507222], 'EPSG:4326', 'EPSG:3857'), zoom:12}
});
*/
ol.control.GeoBookmark.prototype.setBookmarks = function(bmark) {
  if (!bmark) bmark = JSON.parse(localStorage[this.get('namespace')+"@bookmark"] || "{}");
  var modify = this.get("editable");
  var ul = this.element.querySelector("ul");
  var menu = this.element.querySelector("div");
  var self = this;

  ul.innerHTML = '';
  for (var b in bmark) {
    var li = document.createElement('li');
    li.textContent = b;
    li.setAttribute('data-bookmark', JSON.stringify(bmark[b]));
    li.addEventListener('click', function() {
      var bm = JSON.parse(this.getAttribute("data-bookmark"));
      self.getMap().getView().setCenter(bm.pos);
      self.getMap().getView().setZoom(bm.zoom);
      menu.style.display = 'none';
    });
    ul.appendChild(li);
    if (modify && !bmark[b].permanent) {
      var button = document.createElement('button');
      button.setAttribute('data-name', b);
      button.setAttribute("title", "Suppr.");
      button.addEventListener('click', function(e) {
        self.removeBookmark(this.getAttribute("data-name"));
        self.dispatchEvent({ type: "remove", name: this.getAttribute("data-name") });
        e.stopPropagation();
      });
      li.appendChild(button);
    }
  }
  localStorage[this.get('namespace')+"@bookmark"] = JSON.stringify(bmark);
};

/** Get Geo bookmarks
* @return {any} a list of bookmarks : { BM1:{pos:ol.coordinates, zoom: integer}, BM2:{pos:ol.coordinates, zoom: integer} }
*/
ol.control.GeoBookmark.prototype.getBookmarks = function() {
  return JSON.parse(localStorage[this.get('namespace')+"@bookmark"] || "{}");
};

/** Remove a Geo bookmark
* @param {string} name
*/
ol.control.GeoBookmark.prototype.removeBookmark = function(name) {
  if (!name) {
    return;
  };
  var bmark = this.getBookmarks();
  delete bmark[name];
  this.setBookmarks(bmark);
};

/** Add a new Geo bookmark (replace existing one if any)
* @param {string} name name of the bookmark (display in the menu)
* @param {ol.Coordintes} position default current position
* @param {number} zoom default current map zoom
* @param {bool} permanent prevent from deletion, default false
*/
ol.control.GeoBookmark.prototype.addBookmark = function(name, position, zoom, permanent) 
{
  if (!name) return;
  var bmark = this.getBookmarks();
  // Don't override permanent bookmark
  if (bmark[name] && bmark[name].permanent) return;
  // Create or override
  bmark[name] = {
    pos: position || this.getMap().getView().getCenter(),
    zoom: zoom || this.getMap().getView().getZoom(),
	permanent: !!permanent
  };
  this.setBookmarks(bmark);
};

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * OpenLayers 3 Layer Overview Control.
 * The overview can rotate with map. 
 * Zoom levels are configurable.
 * Click on the overview will center the map.
 * Change width/height of the overview trough css.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} opt_options Control options.
 *	- rotation {boolean} enable rotation, default false
 *	- align {top|bottom-left|right} position
 *	- layers {Array<ol.layer>} list of layers
 *	- style {ol.style.Style | Array.<ol.style.Style> | undefined} style to draw the map extent on the overveiw
 */
ol.control.Globe = function(opt_options) 
{	var options = opt_options || {};
	var self = this;

	// API 
	var element;
	if (options.target) 
	{	element = $("<div>");
		this.panel_ = $(options.target);
	}
	else
	{	element = $("<div>").addClass('ol-globe ol-unselectable ol-control');
		if (/top/.test(options.align)) element.addClass('ol-control-top');
		if (/right/.test(options.align)) element.addClass('ol-control-right');
		this.panel_ = $("<div>").addClass("panel")
					.appendTo(element);
		this.pointer_ = $("<div>").addClass("ol-pointer")
					.appendTo(element);
		
	}

	ol.control.Control.call(this, 
	{	element: element.get(0),
		target: options.target
	});

	

// http://openlayers.org/en/latest/examples/sphere-mollweide.html ???

	// Create a globe map
	this.ovmap_ = new ol.Map(
	{	controls: new ol.Collection(),
		interactions: new ol.Collection(),
		target: this.panel_.get(0),
		view: new ol.View
			({	zoom: 0,
				center: [0,0]
			}),
		layers: options.layers
	});
	
	setTimeout (function()
	{	self.ovmap_.updateSize(); 
	}, 0);

	this.set('follow', options.follow || false);

	// Cache extent
	this.extentLayer = new ol.layer.Vector(
	{	name: 'Cache extent',
		source: new ol.source.Vector(),
		style: options.style || [new ol.style.Style(
					{	image: new ol.style.Circle(
						{	fill: new ol.style.Fill({
								color: 'rgba(255,0,0, 1)'
							}),
							stroke: new ol.style.Stroke(
							{	width: 7,
								color: 'rgba(255,0,0, 0.8)'
							}),
							radius: 5
						})
					}
				)]
	})
	this.ovmap_.addLayer(this.extentLayer);
};
ol.inherits(ol.control.Globe, ol.control.Control);


/**
 * Set the map instance the control associated with.
 * @param {ol.Map} map The map instance.
 */
ol.control.Globe.prototype.setMap = function(map) 
{	if (this.getMap()) this.getMap().getView().un('propertychange', this.setView, this);

	ol.control.Control.prototype.setMap.call(this, map);

	// Get change (new layer added or removed)
	if (map) 
	{	map.getView().on('propertychange', this.setView, this);
		this.setView();
	}
};

/** Set the globe center with the map center
*/
ol.control.Globe.prototype.setView = function() 
{	if (this.getMap() && this.get('follow'))
	{	this.setCenter(this.getMap().getView().getCenter());
	}
}


/** Get globe map
*	@return {ol.Map}
*/
ol.control.Globe.prototype.getGlobe = function() 
{	return this.ovmap_;
}

/** Show/hide the globe
*/
ol.control.Globe.prototype.show = function(b) 
{	if (b!==false) $(this.element).removeClass("ol-collapsed");
	else $(this.element).addClass("ol-collapsed");
	this.ovmap_.updateSize();
}

/** Set position on the map
*	@param {top|bottom-left|right} 
*/
ol.control.Globe.prototype.setPosition = function(align) 
{	if (/top/.test(align)) $(this.element).addClass("ol-control-top");
	else $(this.element).removeClass("ol-control-top");
	if (/right/.test(align)) $(this.element).addClass("ol-control-right");
	else $(this.element).removeClass("ol-control-right");
}

/** Set the globe center
* @param {ol.coordinate} center the point to center to
* @param {boolean} show true to show a pointer 
*/
ol.control.Globe.prototype.setCenter = function (center, show) 
{	var self = this;
	this.pointer_.addClass("hidden");
	if (center)
	{	var map = this.ovmap_;
		var p = map.getPixelFromCoordinate(center);
		var h = $(this.element).height();
		if (map.getView().animate)
		{	setTimeout(function()
			{	self.pointer_.css({ 'top': Math.min(Math.max(p[1],0),h) , 'left': "50%" } )
					.removeClass("hidden");
			}, 800);
			map.getView().animate({ center: [center[0],0] });
		}
		// Old version (<3.20)
		else
		{	var pan = ol.animation.pan(
			{	duration: 800,
				source: map.getView().getCenter()
			});
			map.beforeRender(function(map, frameState)
			{	var b = pan(map, frameState);
				if (!b && show!==false) 
				{	self.pointer_
						.css({ 'top': Math.min(Math.max(p[1],0),h) , 'left': "50%" } )
						.removeClass("hidden");
				}
				return b;
			});
			map.getView().setCenter([center[0],0]);
		}
	}
};

/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * Draw a graticule on the map.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} Control options. 
 *	- projection {ol.projectionLike} projection to use for the graticule, default EPSG:4326 
 *	- maxResolution {number} max resolution to display the graticule
 *	- style {ol.style.Style} Style to use for drawing the graticule, default black.
 *	- step {number} step beetween lines (in proj units), default 1
 *	- stepCoord {number} show a coord every stepCoord, default 1
 *	- spacing {number} spacing beetween lines (in px), default 40px 
 *	- borderWidth {number} width of the border (in px), default 5px 
 *	- margin {number} margin of the border (in px), default 0px 
 */
ol.control.Graticule = function(options) 
{	var self = this;
	if (!options) options = {};
	
	// Initialize parent
	var elt = document.createElement("div");
	elt.className = "ol-graticule ol-unselectable ol-hidden";
	
	ol.control.Control.call(this, { element: elt });

	this.set('projection', options.projection || 'EPSG:4326');

	// Use to limit calculation 
	var p = new ol.proj.Projection({code:this.get('projection')});
	var m = p.getMetersPerUnit();
	this.fac = 1;
	while (m/this.fac>10)
	{	this.fac *= 10;
	}
	this.fac = 10000/this.fac;

	this.set('maxResolution', options.maxResolution || Infinity);
	this.set('step', options.step || 0.1);
	this.set('stepCoord', options.stepCoord || 1);
	this.set('spacing', options.spacing || 40);
	this.set('margin', options.margin || 0);
	this.set('borderWidth', options.borderWidth || 5);
	this.set('stroke', options.stroke!==false);
	this.formatCoord = options.formatCoord || function(c){return c;};

	if (options.style instanceof ol.style.Style) this.style = options.style;
	else this.style = new ol.style.Style(
		{	stroke: new ol.style.Stroke({ color:"#000", width:1 }),
			fill: new ol.style.Fill({ color: "#fff" }),
			text: new ol.style.Text(
			{	stroke: new ol.style.Stroke({ color:"#fff", width:2 }),
				fill: new ol.style.Fill({ color:"#000" }),
			}) 
		});
};
ol.inherits(ol.control.Graticule, ol.control.Control);

/**
 * Remove the control from its current map and attach it to the new map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.control.Graticule.prototype.setMap = function (map)
{	var oldmap = this.getMap();
	if (oldmap) oldmap.un('postcompose', this.drawGraticule_, this);
	
	ol.control.Control.prototype.setMap.call(this, map);
	if (oldmap) oldmap.renderSync();

	// Get change (new layer added or removed)
	if (map) map.on('postcompose', this.drawGraticule_, this);
};

ol.control.Graticule.prototype.setStyle = function (style)
{	this.style = style;
};

ol.control.Graticule.prototype.getStyle = function (style)
{	return style;
};

ol.control.Graticule.prototype.drawGraticule_ = function (e)
{	if (this.get('maxResolution')<e.frameState.viewState.resolution) return;
	
	var ctx = e.context;
	var canvas = ctx.canvas;
	var ratio = e.frameState.pixelRatio;
	var w = canvas.width/ratio;
	var h = canvas.height/ratio;

	var proj = this.get('projection');

	var map = this.getMap();
	var bbox = 
	[	map.getCoordinateFromPixel([0,0]),
		map.getCoordinateFromPixel([w,0]),
		map.getCoordinateFromPixel([w,h]),
		map.getCoordinateFromPixel([0,h])
	];
	var xmax = -Infinity;
	var xmin = Infinity;
	var ymax = -Infinity;
	var ymin = Infinity;
	for (var i=0, c; c=bbox[i]; i++)
	{	bbox[i] = ol.proj.transform (c, map.getView().getProjection(), proj);
		xmax = Math.max (xmax, bbox[i][0]);
		xmin = Math.min (xmin, bbox[i][0]);
		ymax = Math.max (ymax, bbox[i][1]);
		ymin = Math.min (ymin, bbox[i][1]);
	}

	var spacing = this.get('spacing');
	var step = this.get('step');
	var step2 = this.get('stepCoord');
	var borderWidth = this.get('borderWidth');
	var margin = this.get('margin');

	// Limit max line draw
	var ds = (xmax-xmin)/step*spacing;
	if (ds>w) 
	{	var dt = Math.round((xmax-xmin)/w*spacing /step);
		step *= dt;
		if (step>this.fac) step = Math.round(step/this.fac)*this.fac;
	}

	xmin = (Math.floor(xmin/step))*step -step;
	ymin = (Math.floor(ymin/step))*step -step;
	xmax = (Math.floor(xmax/step))*step +2*step;
	ymax = (Math.floor(ymax/step))*step +2*step;

	var extent = ol.proj.get(proj).getExtent();
	if (extent)
	{	if (xmin < extent[0]) xmin = extent[0];
		if (ymin < extent[1]) ymin = extent[1];
		if (xmax > extent[2]) xmax = extent[2]+step;
		if (ymax > extent[3]) ymax = extent[3]+step;
	}

	var hasLines = this.style.getStroke() && this.get("stroke");
	var hasText = this.style.getText();
	var hasBorder = this.style.getFill();

	ctx.save();
		ctx.scale(ratio,ratio);

		ctx.beginPath();
		ctx.rect(margin, margin, w-2*margin, h-2*margin);
		ctx.clip();

		ctx.beginPath();

		var txt = {top:[],left:[],bottom:[], right:[]};

		for (var x=xmin; x<xmax; x += step)
		{	var p0 = ol.proj.transform ([x, ymin], proj, map.getView().getProjection());
			p0 = map.getPixelFromCoordinate(p0);
			if (hasLines) ctx.moveTo(p0[0], p0[1]);
			var p = p0;
			for (var y=ymin+step; y<=ymax; y+=step)
			{	var p1 = ol.proj.transform ([x, y], proj, map.getView().getProjection());
				p1 = map.getPixelFromCoordinate(p1);
				if (hasLines) ctx.lineTo(p1[0], p1[1]);
				if (p[1]>0 && p1[1]<0) txt.top.push([x, p]);
				if (p[1]>h && p1[1]<h) txt.bottom.push([x,p]);
				p = p1;
			}
		}
		for (var y=ymin; y<ymax; y += step)
		{	var p0 = ol.proj.transform ([xmin, y], proj, map.getView().getProjection());
			p0 = map.getPixelFromCoordinate(p0);
			if (hasLines) ctx.moveTo(p0[0], p0[1]);
			var p = p0;
			for (var x=xmin+step; x<=xmax; x+=step)
			{	var p1 = ol.proj.transform ([x, y], proj, map.getView().getProjection());
				p1 = map.getPixelFromCoordinate(p1);
				if (hasLines) ctx.lineTo(p1[0], p1[1]);
				if (p[0]<0 && p1[0]>0) txt.left.push([y,p]);
				if (p[0]<w && p1[0]>w) txt.right.push([y,p]);
				p = p1;
			}
		}

		if (hasLines)
		{	ctx.strokeStyle = this.style.getStroke().getColor();
			ctx.lineWidth = this.style.getStroke().getWidth();
			ctx.stroke();
		}

		// Draw text
		if (hasText)
		{
			ctx.fillStyle = this.style.getText().getFill().getColor();
			ctx.strokeStyle = this.style.getText().getStroke().getColor();
			ctx.lineWidth = this.style.getText().getStroke().getWidth();
			ctx.textAlign = 'center';
			ctx.textBaseline = 'hanging';
			var tf;
			var offset = (hasBorder ? borderWidth : 0) + margin + 2;
			for (var i=0, t; t = txt.top[i]; i++) if (!(Math.round(t[0]/this.get('step'))%step2))
			{	tf = this.formatCoord(t[0]);
				ctx.strokeText(tf, t[1][0], offset);
				ctx.fillText(tf, t[1][0], offset);
			}
			ctx.textBaseline = 'alphabetic';
			for (var i=0, t; t = txt.bottom[i]; i++) if (!(Math.round(t[0]/this.get('step'))%step2))
			{	tf = this.formatCoord(t[0]);
				ctx.strokeText(tf, t[1][0], h-offset);
				ctx.fillText(tf, t[1][0], h-offset);
			}
			ctx.textBaseline = 'middle';
			ctx.textAlign = 'left';
			for (var i=0, t; t = txt.left[i]; i++) if (!(Math.round(t[0]/this.get('step'))%step2))
			{	tf = this.formatCoord(t[0]);
				ctx.strokeText(tf, offset, t[1][1]);
				ctx.fillText(tf, offset, t[1][1]);
			}
			ctx.textAlign = 'right';
			for (var i=0, t; t = txt.right[i]; i++) if (!(Math.round(t[0]/this.get('step'))%step2))
			{	tf = this.formatCoord(t[0]);
				ctx.strokeText(tf, w-offset, t[1][1]);
				ctx.fillText(tf, w-offset, t[1][1]);
			}
		}

		// Draw border
		if (hasBorder)
		{	var fillColor = this.style.getFill().getColor();
			var color, stroke;
			if (stroke = this.style.getStroke())
			{	color = this.style.getStroke().getColor();
			}
			else
			{	color = fillColor;
				fillColor = "#fff";
			}
			
			ctx.strokeStyle = color;
			ctx.lineWidth = stroke ? stroke.getWidth() : 1;
			// 
			for (var i=1; i<txt.top.length; i++)
			{	ctx.beginPath();
				ctx.rect(txt.top[i-1][1][0], margin, txt.top[i][1][0]-txt.top[i-1][1][0], borderWidth);
				ctx.fillStyle = Math.round(txt.top[i][0]/step)%2 ? color: fillColor;
				ctx.fill(); 
				ctx.stroke(); 
			}
			for (var i=1; i<txt.bottom.length; i++)
			{	ctx.beginPath();
				ctx.rect(txt.bottom[i-1][1][0], h-borderWidth-margin, txt.bottom[i][1][0]-txt.bottom[i-1][1][0], borderWidth);
				ctx.fillStyle = Math.round(txt.bottom[i][0]/step)%2 ? color: fillColor;
				ctx.fill(); 
				ctx.stroke(); 
			}
			for (var i=1; i<txt.left.length; i++)
			{	ctx.beginPath();
				ctx.rect(margin, txt.left[i-1][1][1], borderWidth, txt.left[i][1][1]-txt.left[i-1][1][1]);
				ctx.fillStyle = Math.round(txt.left[i][0]/step)%2 ? color: fillColor;
				ctx.fill(); 
				ctx.stroke(); 
			}
			for (var i=1; i<txt.right.length; i++)
			{	ctx.beginPath();
				ctx.rect(w-borderWidth-margin, txt.right[i-1][1][1], borderWidth, txt.right[i][1][1]-txt.right[i-1][1][1]);
				ctx.fillStyle = Math.round(txt.right[i][0]/step)%2 ? color: fillColor;
				ctx.fill(); 
				ctx.stroke(); 
			}
			ctx.beginPath();
			ctx.fillStyle = color;
			ctx.rect(margin,margin, borderWidth, borderWidth);
			ctx.rect(margin,h-borderWidth-margin, borderWidth,borderWidth);
			ctx.rect(w-borderWidth-margin,margin, borderWidth, borderWidth);
			ctx.rect(w-borderWidth-margin,h-borderWidth-margin, borderWidth,borderWidth);
			ctx.fill(); 
		}

	ctx.restore();
};

/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * Draw a grid reference on the map and add an index.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @fires select
 * @param {Object=} Control options. 
 *	- style {ol.style.Style} Style to use for drawing the grid (stroke and text), default black.
 *	- maxResolution {number} max resolution to display the graticule
 *	- extent {ol.extent} extent of the grid, required
 *	- size {ol.size} number of lines and cols, required 
 *	- margin {number} margin to display text (in px), default 0px 
 *	- source {ol.source.Vector} source to use for the index, default none (use setIndex to reset the index)
 *	- property {string | function} a property to display in the index or a function that takes a feature and return the name to display in the index, default 'name'.
 *	- sortFeatures {function|undefined} sort function to sort 2 features in the index, default sort on property option
 *	- indexTitle {function|undefined} a function that takes a feature and return the title to display in the index, default the first letter of property option
 *	- filterLabel {string} label to display in the search bar, default 'filter'
 */
ol.control.GridReference = function(options) 
{	var self = this;
	if (!options) options = {};
	
	// Initialize parent
	var elt = document.createElement("div");
	elt.className = (!options.target ? "ol-control ":"") +"ol-gridreference ol-unselectable "+(options.className||"");
	
	ol.control.Control.call(this, 
		{	element: elt,
			target: options.target
		});

	if (typeof (options.property)=='function') this.getFeatureName = options.property;
	if (typeof (options.sortFeatures)=='function') this.sortFeatures = options.sortFeatures;
	if (typeof (options.indexTitle)=='function') this.indexTitle = options.indexTitle;
	
	// Set index using the source
	this.source_ = options.source;
	if (options.source) 
	{	this.setIndex(options.source.getFeatures(), options);
		// reload on ready
		options.source.once('change',function(e)
			{	if (options.source.getState() === 'ready') 
				{   this.setIndex(options.source.getFeatures(), options);
				}
			}, this);
	};

	// Options
	this.set('maxResolution', options.maxResolution || Infinity);
	this.set('extent', options.extent);
	this.set('size', options.size);
	this.set('margin', options.margin || 0);
	this.set('property', options.property || 'name');
	this.set('filterLabel', options.filterLabel || 'filter');

	if (options.style instanceof ol.style.Style) this.style = options.style;
	else this.style = new ol.style.Style(
		{	stroke: new ol.style.Stroke({ color:"#000", width:1 }),
			text: new ol.style.Text(
			{	font: "bold 14px Arial",
				stroke: new ol.style.Stroke({ color:"#fff", width:2 }),
				fill: new ol.style.Fill({ color:"#000" }),
			}) 
		});
};
ol.inherits(ol.control.GridReference, ol.control.Control);

/** Returns the text to be displayed in the index
*	@param {ol.Feature} f the feature
*	@return {string} the text to be displayed in the index
*	@api
*/
ol.control.GridReference.prototype.getFeatureName = function (f)
{	return f.get(this.get('property')||'name');
};

/** Sort function
*	@param {ol.Feature} a first feature
*	@param {ol.Feature} b second feature
*	@return {Number} 0 if a==b, -1 if a<b, 1 if a>b
*	@api
*/
ol.control.GridReference.prototype.sortFeatures = function (a,b)
{	return (this.getFeatureName(a) == this.getFeatureName(b)) ? 0 : (this.getFeatureName(a) < this.getFeatureName(b)) ? -1 : 1; 
};

/** Get the feature title
*	@param {ol.Feature} f
*	@return the first letter of the eature name (getFeatureName)
*	@api
*/
ol.control.GridReference.prototype.indexTitle = function (f)
{	return this.getFeatureName(f).charAt(0); 
};

/** Display features in the index
*	@param { Array<ol.Feature> | ol.Collection<ol.Feature> } features
*/
ol.control.GridReference.prototype.setIndex = function (features)
{	if (!this.getMap()) return;
	var self = this;
	if (features.getArray) features = features.getArray();
	features.sort ( function(a,b) { return self.sortFeatures(a,b); } );
	var elt = $(this.element).html("");

	var search = $("<input>").attr('type', 'search')
					.attr('placeholder', this.get('filterLabel') || 'filter')
					.on('search keyup', function()
					{	var v = $(this).val().replace(/^\*/,'');
						// console.log(v)
						var r = new RegExp (v, 'i');
						$('li',ul).each(function()
						{	var self = $(this);
							if (self.hasClass('ol-title')) self.show();
							else
							{	if (r.test($('.ol-name',self).text())) self.show();
								else self.hide();
							}
						});
						$("li.ol-title", ul).each(function()
						{	var nextVisible = $(this).nextAll("li:visible").first()
							if (nextVisible.length && !nextVisible.hasClass('ol-title')) $(this).show();
							else $(this).hide();
						});
					})
					.appendTo(elt);

	var ul = $("<ul>").appendTo(elt);
	var r, title;
	for (var i=0, f; f=features[i]; i++)
	{	r = this.getReference(f.getGeometry().getFirstCoordinate());
		if (r) 
		{	var name = this.getFeatureName(f);
			var c = this.indexTitle(f);
			if (c != title) 
			{	$("<li>").addClass('ol-title').text(c).appendTo(ul);
			}
			title = c;
			$("<li>").append($("<span>").addClass("ol-name").text(name))
					.append($("<span>").addClass("ol-ref").text(r))
					.data ('feature', f)
					.click(function()
						{	self.dispatchEvent({ type:"select", feature:$(this).data('feature') });
						})
					.appendTo(ul);
		}
	}
};

/** Get reference for a coord
*	@param {ol.coordinate} coords
*	@return {string} the reference
*/
ol.control.GridReference.prototype.getReference = function (coords)
{	if (!this.getMap()) return;
	var extent = this.get('extent');
	var size = this.get('size');

	var dx = Math.floor ( (coords[0] - extent[0]) / (extent[2]- extent[0]) * size[0] );
	if (dx<0 || dx>=size[0]) return "";
	var dy = Math.floor ( (extent[3] - coords[1]) / (extent[3]- extent[1]) * size[1] );
	if (dy<0 || dy>=size[1]) return "";
	return String.fromCharCode(65+dx)+dy;
};

/**
 * Remove the control from its current map and attach it to the new map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.control.GridReference.prototype.setMap = function (map)
{	var oldmap = this.getMap();
	if (oldmap) oldmap.un('postcompose', this.drawGrid_, this);
	
	ol.control.Control.prototype.setMap.call(this, map);
	if (oldmap) oldmap.renderSync();

	// Get change (new layer added or removed)
	if (map) 
	{	map.on('postcompose', this.drawGrid_, this);
		if (this.source_) this.setIndex(this.source_.getFeatures());
	}
};

/** Set style
* @param {ol.style.Style} style
*/
ol.control.GridReference.prototype.setStyle = function (style)
{	this.style = style;
};

/** Get style
* @return {ol.style.Style} style
*/
ol.control.GridReference.prototype.getStyle = function ()
{	return style;
};

/** Draw the grid 
* @param {ol.event} e postcompose event
* @private
*/
ol.control.GridReference.prototype.drawGrid_ = function (e)
{	if (this.get('maxResolution')<e.frameState.viewState.resolution) return;
	
	var ctx = e.context;
	var canvas = ctx.canvas;
	var ratio = e.frameState.pixelRatio;

	var w = canvas.width/ratio;
	var h = canvas.height/ratio;

	var extent = this.get('extent');
	var size = this.get('size');

	var map = this.getMap();
	var ex = ol.extent.boundingExtent([map.getPixelFromCoordinate([extent[0],extent[1]]), map.getPixelFromCoordinate([extent[2],extent[3]])]);
	var p0 = [ex[0],ex[1]];
	var p1 = [ex[2],ex[3]];
	var dx = (p1[0]-p0[0])/size[0];
	var dy = (p1[1]-p0[1])/size[1];

	ctx.save();
		var margin = this.get('margin');
		ctx.scale(ratio,ratio);

		ctx.strokeStyle = this.style.getStroke().getColor();
		ctx.lineWidth = this.style.getStroke().getWidth();

		// Draw grid
		ctx.beginPath();
		for (var i=0; i<=size[0]; i++)
		{	ctx.moveTo(p0[0]+i*dx, p0[1]);
			ctx.lineTo(p0[0]+i*dx, p1[1]);
		}
		for (var i=0; i<=size[1]; i++)
		{	ctx.moveTo(p0[0], p0[1]+i*dy);
			ctx.lineTo(p1[0], p0[1]+i*dy);
		}
		ctx.stroke();

		// Draw text
		ctx.font = this.style.getText().getFont();
		ctx.fillStyle = this.style.getText().getFill().getColor();
		ctx.strokeStyle = this.style.getText().getStroke().getColor();
		var lw = ctx.lineWidth = this.style.getText().getStroke().getWidth();
		var spacing = margin +lw;
		ctx.textAlign = 'center';
		var letter, x, y;
		for (var i=0; i<size[0]; i++)
		{	letter = String.fromCharCode(65+i);
			x = p0[0]+i*dx+dx/2;
			y = p0[1]-spacing;
			if (y<0) 
			{	y = spacing;
				ctx.textBaseline = 'hanging';
			}
			else ctx.textBaseline = 'alphabetic';
			ctx.strokeText(letter, x, y);
			ctx.fillText(letter, x, y);
			y = p1[1]+spacing;
			if (y>h) 
			{	y = h-spacing;
				ctx.textBaseline = 'alphabetic';
			}
			else ctx.textBaseline = 'hanging';
			ctx.strokeText(letter, x, y);
			ctx.fillText(letter, x, y);
		}
		ctx.textBaseline = 'middle';
		for (var i=0; i<size[0]; i++)
		{	y = p0[1]+i*dy+dy/2;
			ctx.textAlign = 'right';
			x = p0[0] - spacing;
			if (x<0) 
			{	x = spacing;
				ctx.textAlign = 'left';
			}
			else ctx.textAlign = 'right';
			ctx.strokeText(i, x, y);
			ctx.fillText(i, x, y);
			x = p1[0] + spacing;
			if (x>w) 
			{	x = w-spacing;
				ctx.textAlign = 'right';
			}
			else ctx.textAlign = 'left';
			ctx.strokeText(i, x, y);
			ctx.fillText(i, x, y);
		}


	ctx.restore();
};

/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * OpenLayers 3 Layer Switcher Control.
 * @require jQuery
 *
 * @constructor
 * @extends {ol.control.LayerSwitcher}
 * @param {Object=} opt_options Control options.
 */
ol.control.LayerPopup = function(options) 
{	options = options || {};
	options.switcherClass="ol-layerswitcher-popup";
	if (options.mouseover!==false) options.mouseover=true;
	ol.control.LayerSwitcher.call(this, options);
};
ol.inherits(ol.control.LayerPopup, ol.control.LayerSwitcher);

/** Disable overflow
*/
ol.control.LayerPopup.prototype.overflow = function(){};

/** Render a list of layer
 * @param {elt} element to render
 * @layers {Array{ol.layer}} list of layer to show
 * @api stable
 */
ol.control.LayerPopup.prototype.drawList = function(ul, layers)
{	var self=this;
	
	var setVisibility = function(e) 
	{	e.preventDefault(); 
		var l = $(this).data("layer");
		self.switchLayerVisibility(l,layers);
	};

	layers.forEach(function(layer)
	{	if (layer.get("displayInLayerSwitcher")!==false) 
		{	var d = $("<li>").text(layer.get("title") || layer.get("name"))
					.data ('layer', layer)
					.click (setVisibility)
					.on ("touchstart", setVisibility)
					.appendTo(ul);
			if (self.testLayerVisibility(layer)) d.addClass("ol-layer-hidden");
			if (layer.getVisible()) d.addClass("select");
		}
	});
};

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * @classdesc OpenLayers 3 Layer Switcher Control.
 * @require layer.getPreview
 * @require jQuery
 *
 * @constructor
 * @extends {ol.control.LayerSwitcher}
 * @param {Object=} opt_options Control options.
 */
ol.control.LayerSwitcherImage = function(options) 
{	options = options || {};
	options.switcherClass="ol-layerswitcher-image";
	if (options.mouseover!==false) options.mouseover=true;
	ol.control.LayerSwitcher.call(this, options);
};
ol.inherits(ol.control.LayerSwitcherImage, ol.control.LayerSwitcher);

/** Render a list of layer
 * @param {elt} element to render
 * @layers {Array{ol.layer}} list of layer to show
 * @api stable
 */
ol.control.LayerSwitcherImage.prototype.drawList = function(ul, layers)
{	var self = this;
	
	var setVisibility = function(e) 
	{	e.preventDefault(); 
		var l = $(this).data("layer");
		self.switchLayerVisibility(l,layers);
		if (e.type=="touchstart") $(self.element).addClass("ol-collapsed");
	};
	
	ul.css("height","auto");

	layers.forEach(function(layer)
	{	if (layer.get("displayInLayerSwitcher")!==false)
		{	var prev = layer.getPreview ? layer.getPreview() : ["none"];
			var d = $("<li>").addClass("ol-imgcontainer")
						.data ('layer', layer)
						.click (setVisibility)
						.on ("touchstart", setVisibility);
			if (layer.getVisible()) d.addClass("select");
			for (var k=0; k<prev.length; k++)
			{	$("<img>").attr('src', prev[k])
						.appendTo(d);
			}
			$("<p>").text(layer.get("title") || layer.get("name")).appendTo(d);

			if (self.testLayerVisibility(layer)) d.addClass("ol-layer-hidden");
			d.appendTo(ul);
		}
	});
};


/** Disable overflow
*/
ol.control.LayerSwitcherImage.prototype.overflow = function(){};

/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Control overlay for OL3
 * The overlay control is a control that display an overlay over the map
 *
 * @constructor
 * @extends {ol.control.Control}
 * @fire change:visible
 * @param {Object=} opt_options Control options.
 *	- className {String} class of the control
 *	- hideOnClick {bool} hide the control on click, default false
 *	- closeBox {bool} add a closeBox to the control, default false
 */
ol.control.Overlay = function(options) 
{	if (!options) options={};
	
	var element = $("<div>").addClass('ol-unselectable ol-overlay');
	if (options.className) element.addClass(options.className);
	
	ol.control.Control.call(this, 
	{	element: element.get(0),
		target: options.target
	});
	
	var self = this;
	if (options.hideOnClick) element.click(function(){self.hide();});

	this.set("closeBox", options.closeBox);

	this._timeout = false;
	this.setContent (options.content);
};
ol.inherits(ol.control.Overlay, ol.control.Control);

/** Set the content of the overlay
* @param {string} html the html to display in the control (or a jQuery object) 
*/
ol.control.Overlay.prototype.setContent = function (html) 
{	var self = this;
	if (html) 
	{	var elt = $(this.element);
		elt.html(html);
		if (this.get("closeBox")) 
		{	var cb = $("<div>").addClass("ol-closebox")
						.click(function(){self.hide();});
			elt.prepend(cb);
		}
	};
};

/** Set the control visibility
* @param {string} html the html to display in the control (or a jQuery object) 
* @param {ol.coordinate} coord coordinate of the top left corner of the control to start from
*/
ol.control.Overlay.prototype.show = function (html, coord) 
{	var self = this;
	var elt = $(this.element).show();
	if (coord)
	{	this.center_ = this.getMap().getPixelFromCoordinate(coord);
		elt.css({"top":this.center_[1], "left":this.center_[0] });
	}
	else 
	{	this.center_ = false;
		elt.css({"top":"", "left":"" });
	}
	this.setContent(html);
	if (this._timeout) clearTimeout(this._timeout);
	this._timeout = setTimeout(function()
		{	elt.addClass("ol-visible")
				.css({ "top":"", "left":"" });
			self.dispatchEvent({ type:'change:visible', visible:true, element: self.element });
		}, 10);
	self.dispatchEvent({ type:'change:visible', visible:false, element: self.element });
};

/** Set the control visibility hidden
*/
ol.control.Overlay.prototype.hide = function () 
{	var elt = $(this.element).removeClass("ol-visible");
	if (this.center_)
	{	elt.css({"top":this.center_[1], "left":this.center_[0] })
		this.center_ = false;
	}
	if (this._timeout) clearTimeout(this._timeout);
	this._timeout = setTimeout(function(){ elt.hide(); }, 500);
	this.dispatchEvent({ type:'change:visible', visible:false, element: this.element });
};

/** Toggle control visibility
*/
ol.control.Overlay.prototype.toggle = function () 
{	if (this.getVisible()) this.hide();
	else this.show();
}

/** Get the control visibility
* @return {boolean} b 
*/
ol.control.Overlay.prototype.getVisible = function () 
{	return ($(this.element).css('display') != 'none');
};

/** Change class name
* @param {String} className 
*/
ol.control.Overlay.prototype.setClass = function (className) 
{	var vis = $(this.element).hasClass("ol-visible");
	$(this.element).removeClass().addClass('ol-unselectable ol-overlay'+(vis?" ol-visible ":" ")+className);
};

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * OpenLayers 3 Layer Overview Control.
 * The overview can rotate with map. 
 * Zoom levels are configurable.
 * Click on the overview will center the map.
 * Change width/height of the overview trough css.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} options Control options.
 *	@param {ol.ProjectionLike} options.projection The projection. Default is EPSG:3857 (Spherical Mercator).
 *	@param {Number} options.minZoom default 0
 *	@param {Number} options.maxZoom default 18
 *	@param {boolean} options.rotation enable rotation, default false
 *	@param {top|bottom-left|right} options.align position
 *	@param {Array<ol.layer>} options.layers list of layers
 *	@param {ol.style.Style | Array.<ol.style.Style> | undefined} options.style style to draw the map extent on the overveiw
 *	@param {bool|elastic} options.panAnimation use animation to center map on click, default true
 */
ol.control.Overview = function(options) 
{	options = options || {};
	var self = this;

	// API 
	this.minZoom = options.minZoom || 0;
	this.maxZoom = options.maxZoom || 18;
	this.rotation = options.rotation;

	var element;
	if (options.target) 
	{	element = $("<div>");
		this.panel_ = $(options.target);
	}
	else
	{	element = $("<div>").addClass('ol-overview ol-unselectable ol-control ol-collapsed');
		if (/top/.test(options.align)) element.addClass('ol-control-top');
		if (/right/.test(options.align)) element.addClass('ol-control-right');
		$("<button>").on("touchstart", function(e){ self.toggleMap(); e.preventDefault(); })
					.attr('type','button')
					.click (function(){self.toggleMap()})
					.appendTo(element);
		this.panel_ = $("<div>").addClass("panel")
					.appendTo(element);
	}

	ol.control.Control.call(this, 
	{	element: element.get(0),
		target: options.target
	});

	// Create a overview map
	this.ovmap_ = new ol.Map(
	{	controls: new ol.Collection(),
		interactions: new ol.Collection(),
		target: this.panel_.get(0),
		view: new ol.View
			({	zoom: 14,
				center: [270148, 6247782],
				projection: options.projection
			}),
		layers: options.layers
	});

	this.oview_ = this.ovmap_.getView();

	// Cache extent
	this.extentLayer = new ol.layer.Vector(
	{	name: 'Cache extent',
		source: new ol.source.Vector(),
		style: options.style || [new ol.style.Style(
					{	image: new ol.style.Circle(
						{	fill: new ol.style.Fill({
								color: 'rgba(255,0,0, 1)'
							}),
							stroke: new ol.style.Stroke(
							{	width: 7,
								color: 'rgba(255,0,0, 0.8)'
							}),
							radius: 5
						}),
						stroke: new ol.style.Stroke(
						{	width: 5,
							color: "rgba(255,0,0,0.8)"
						})
					}
				)]
	})
	this.ovmap_.addLayer(this.extentLayer);

	/** Elastic bounce
	*	@param {Int} bounce number of bounce
	*	@param {Number} amplitude amplitude of the bounce [0,1] 
	*	@return {Number}
	*/
	ol.easing.bounceFn = function (bounce, amplitude)
	{	var a = (2*bounce+1) * Math.PI/2;
		var b = amplitude>0 ? -1/amplitude : -100;
		var c = - Math.cos(a) * Math.pow(2, b);
		return function(t)
		{	t = 1-Math.cos(t*Math.PI/2);
			return 1 + Math.abs( Math.cos(a*t) ) * Math.pow(2, b*t) + c*t;
		}
	}
	/** Elastic bounce
	*	@param {Int} bounce number of bounce
	*	@param {Number} amplitude amplitude of the bounce [0,1] 
	*	@return {Number}
	*/
	ol.easing.elasticFn = function (bounce, amplitude)
	{	var a = 3*bounce * Math.PI/2;
		var b = amplitude>0 ? -1/amplitude : -100;
		var c = Math.cos(a) * Math.pow(2, b);
		return function(t)
		{	t = 1-Math.cos(t*Math.PI/2);
			return 1 - Math.cos(a*t) * Math.pow(2, b*t) + c*t;
		}
	}

	// Click on the preview center the map
	this.ovmap_.addInteraction (new ol.interaction.Pointer(
	{	handleDownEvent: function(evt)
		{	// Old version OL3
			if (ol.animation) 
			{	var pan;
				if (options.panAnimation !==false)
				{	if (options.panAnimation=="elastic" || options.elasticPan) 
					{	pan = ol.animation.pan(
						{	duration: 1000,
							easing: ol.easing.elasticFn(2,0.3),
							source: self.getMap().getView().getCenter()
						});
					}
					else
					{	pan = ol.animation.pan(
						{	duration: 300,
							source: self.getMap().getView().getCenter()
						});
					}
				
				}
				self.getMap().beforeRender(pan);
				self.getMap().getView().setCenter(evt.coordinate);
			}
			else
			{	if (options.panAnimation !==false)
				{	if (options.panAnimation=="elastic" || options.elasticPan) 
					{	self.getMap().getView().animate(
						{	center: evt.coordinate,
							easing: ol.easing.elasticFn(2,0.3),
							duration: 1000
						});
					}
					else
					{	self.getMap().getView().animate(
						{	center: evt.coordinate,
							duration: 300
						});
					}
				}
				else self.getMap().getView().setCenter(evt.coordinate);
			}
			return false;
		}
	}));
};
ol.inherits(ol.control.Overview, ol.control.Control);

/** Get overview map
*	@return {ol.Map}
*/
ol.control.Overview.prototype.getOverviewMap = function() 
{	return this.ovmap_;
}

/** Toggle overview map
*/
ol.control.Overview.prototype.toggleMap = function() 
{	$(this.element).toggleClass("ol-collapsed");
	this.ovmap_.updateSize();
}

/** Set overview map position
*	@param {top|bottom-left|right} 
*/
ol.control.Overview.prototype.setPosition = function(align) 
{	if (/top/.test(align)) $(this.element).addClass("ol-control-top");
	else $(this.element).removeClass("ol-control-top");
	if (/right/.test(align)) $(this.element).addClass("ol-control-right");
	else $(this.element).removeClass("ol-control-right");
}

/**
 * Set the map instance the control associated with.
 * @param {ol.Map} map The map instance.
 */
ol.control.Overview.prototype.setMap = function(map) 
{   if (this.getMap())
	{	this.getMap().getView().un('propertychange', this.setView, this);
	}
	ol.control.Control.prototype.setMap.call(this, map);
	if (map) 
	{	map.getView().on('propertychange', this.setView, this);
		this.setView();
	}

};

/** Calculate the extent of the map and draw it on the overview
*/
ol.control.Overview.prototype.calcExtent_ = function(extent)
{	var map = this.getMap();
	if (!map) return;
	
	var source = this.extentLayer.getSource();
	source.clear();
	var f = new ol.Feature();

	var size = map.getSize();
	var resolution = map.getView().getResolution();
	var rotation = map.getView().getRotation();
	var center = map.getView().getCenter();
	if (!resolution) return;

	var dx = resolution * size[0] / 2;
	var dy = resolution * size[1] / 2;
	var res2 = this.oview_.getResolution();
	if (dx/res2>5 || dy/res2>5)
	{	var cos = Math.cos(rotation);
		var sin = Math.sin(rotation);
		var i, x, y;
		extent=[[-dx,-dy],[-dx,dy],[dx,dy],[dx,-dy]];
		for (i = 0; i < 4; ++i) 
		{	x = extent[i][0];
			y = extent[i][1];
			extent[i][0] = center[0] + x * cos - y * sin;
			extent[i][1] = center[1] + x * sin + y * cos;
		}
		f.setGeometry (new ol.geom.Polygon( [ extent ]));
	}
	else 
	{	f.setGeometry (new ol.geom.Point( center ));
	}
	source.addFeature(f);
}

/**
*	@private
*/
ol.control.Overview.prototype.setView = function(e) 
{	if (!e) 
	{	// refresh all
		this.setView({key:'rotation'});
		this.setView({key:'resolution'});
		this.setView({key:'center'});
		return;
	}
	// Set the view params
	switch (e.key)
	{	case 'rotation':
			if (this.rotation) this.oview_.setRotation(this.getMap().getView().getRotation());
			else if (this.oview_.getRotation()) this.oview_.setRotation(0);
			break;
		case 'center': 
		{	var mapExtent = this.getMap().getView().calculateExtent(this.getMap().getSize());
			var extent = this.oview_.calculateExtent(this.ovmap_.getSize());
			if (mapExtent[0]<extent[0] || mapExtent[1]<extent[1] 
				|| mapExtent[2]>extent[2] || mapExtent[3]>extent[3])
			{	this.oview_.setCenter(this.getMap().getView().getCenter()); 
			}
			break;
		}	
		case 'resolution':
		{	var z = Math.round(this.getMap().getView().getZoom()/2)*2-4;
			z = Math.min ( this.maxZoom, Math.max(this.minZoom, z) );
			this.oview_.setZoom(z);
			break;
		}
		default: break;
	}
	this.calcExtent_();
}

/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * @classdesc OpenLayers 3 Permalink Control.
 *	Layers with a permalink properties are handled by the control. 
 *  The permalink propertie is used to name the layer in the url.
 *	The control must be added after all layer are inserted in the map.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} Control options.
 *		- urlReplace {bool} replace url or not, default true
 *		- fixed {integer} number of digit in coords, default 6
 *		- anchor {bool} use "#" instead of "?" in href
 *		- onclick {function} a function called when control is clicked
 *
 * Layers attributes extension:
 *		- permalink {char} a short string to identify layer in the url
 */
ol.control.Permalink = function(opt_options) 
{	var options = opt_options || {};
	var self = this;
	
	var button = document.createElement('button');
	this.replaceState_ = (options.urlReplace!==false);
	this.fixed_ = options.fixed || 6;
	this.hash_ = options.anchor ? "#" : "?";

	function linkto()
	{	if (typeof(options.onclick) == 'function') options.onclick(self.getLink());
		else self.setUrlReplace(!self.replaceState_);
	}
    button.addEventListener('click', linkto, false);
    button.addEventListener('touchstart', linkto, false);

	var element = document.createElement('div');
    element.className = (options.className || "ol-permalink") + " ol-unselectable ol-control";
    element.appendChild(button);
    
	ol.control.Control.call(this, 
	{	element: element,
		target: options.target
	});

	this.on ('change', this.viewChange_, this);

	// Save search params
	this.search_ = {};
	var hash = document.location.hash || document.location.search;
	if (hash)
	{	hash = hash.replace(/(^#|^\?)/,"").split("&");
		for (var i=0; i<hash.length;  i++)
		{	var t = hash[i].split("=");
			switch(t[0])
			{	case 'lon':
				case 'lat':
				case 'z':
				case 'r':
				case 'l': break;
				default: this.search_[t[0]] = t[1];
			}
		}
	}
	
	// Decode permalink
	this.setPosition();
};
ol.inherits(ol.control.Permalink, ol.control.Control);

/**
 * Set the map instance the control associated with.
 * @param {ol.Map} map The map instance.
 */
ol.control.Permalink.prototype.setMap = function(map) 
{   if (this.getMap())
	{	this.getMap().getLayerGroup().un('change', this.layerChange_, this);
		this.getMap().un('moveend', this.viewChange_, this);
	}

	ol.control.Control.prototype.setMap.call(this, map);
	
	// Get change 
	if (map) 
	{	map.getLayerGroup().on('change', this.layerChange_, this);
		map.on('moveend', this.viewChange_, this);
		this.setPosition();
	}
};

/** Get layer given a permalink name (permalink propertie in the layer)
*	@param {string} the permalink to search for
*	@param {Array<ol.layer>|undefined} an array of layer to search in
*	@return {ol.layer|false}
*/
ol.control.Permalink.prototype.getLayerByLink =  function (id, layers)
{	if (!layers && this.getMap()) layers = this.getMap().getLayers().getArray();
	for (var i=0; i<layers.length; i++)
	{	if (layers[i].get('permalink') == id) return layers[i];
		// Layer Group
		if (layers[i].getLayers)
		{	var li = this.getLayerByLink ( id, layers[i].getLayers().getArray() );
			if (li) return li;
		}
	}
	return false;
}

/** Set map position according to the current link 
*/
ol.control.Permalink.prototype.setPosition = function() 
{	var map = this.getMap();
	if (!map) return;

	var hash = document.location.hash || document.location.search;
	if (!hash) return;
	
	var param = {};
	hash = hash.replace(/(^#|^\?)/,"").split("&");
	for (var i=0; i<hash.length;  i++)
	{	var t = hash[i].split("=");
		param[t[0]] = t[1];
	}
	var c = ol.proj.transform([Number(param.lon),Number(param.lat)], 'EPSG:4326', map.getView().getProjection());
	if (c[0] && c[1]) map.getView().setCenter(c);
	if (param.z) map.getView().setZoom(Number(param.z));
	if (param.r) map.getView().setRotation(Number(param.r));

	if (param.l)
	{	var l = param.l.split("|");

		// Reset layers 
		function resetLayers(layers)
		{	if (!layers) layers = map.getLayers().getArray();
			for (var i=0; i<layers.length; i++)
			{	if (layers[i].get('permalink')) 
				{	layers[i].setVisible(false);
					// console.log("hide "+layers[i].get('permalink'));
				}
				if (layers[i].getLayers)
				{	resetLayers (layers[i].getLayers().getArray());
				}
			}
		}
		resetLayers();

		for (var i=0; i<l.length; i++)
		{	var t = l[i].split(":");
			var li = this.getLayerByLink(t[0]);
			var op = Number(t[1]);
			if (li) 
			{	li.setOpacity(op);
				li.setVisible(true);
			}
		}
	}
}


/**
 * Get the parameters added to the url. The object can be changed to add new values.
 * @return {Object} a key value object added to the url as &key=value
 * @api stable
 */
ol.control.Permalink.prototype.getUrlParams = function()
{	return this.search_;
}

/**
 * Get the permalink
 * @return {permalink}
 */
ol.control.Permalink.prototype.getLink = function()
{	var map = this.getMap();
	var c = ol.proj.transform(map.getView().getCenter(), map.getView().getProjection(), 'EPSG:4326');
	var z = map.getView().getZoom();
	var r = map.getView().getRotation();
	var l = this.layerStr_;
	// Change anchor
	var anchor = "lon="+c[0].toFixed(this.fixed_)+"&lat="+c[1].toFixed(this.fixed_)+"&z="+z+(r?"&r="+(Math.round(r*10000)/10000):"")+(l?"&l="+l:"");

	for (var i in this.search_) anchor += "&"+i+"="+this.search_[i];

	//return document.location.origin+document.location.pathname+this.hash_+anchor;
	return document.location.protocol+"//"+document.location.host+document.location.pathname+this.hash_+anchor;
}

/**
 * Enable / disable url replacement (replaceSate)
 *	@param {bool}
 */
ol.control.Permalink.prototype.setUrlReplace = function(replace)
{	try{
		this.replaceState_ = replace;
		if (!replace) 
		{	var s = "";
			for (var i in this.search_)
			{	s += (s==""?"?":"&") + i+"="+this.search_[i];
			}
			window.history.replaceState (null,null, document.location.origin+document.location.pathname+s);
		}
		else window.history.replaceState (null,null, this.getLink());
	}catch(e){}
}


/**
 * On view change refresh link
 * @param {ol.event} The map instance.
 * @private
 */
ol.control.Permalink.prototype.viewChange_ = function() 
{	try{
		if (this.replaceState_) window.history.replaceState (null,null, this.getLink());
	}catch(e){}
}

/**
 * Layer change refresh link
 * @param {ol.event} The map instance.
 * @private
 */
ol.control.Permalink.prototype.layerChange_ = function(e) 
{	// Get layers
	var l = "";
	function getLayers(layers)
	{	for (var i=0; i<layers.length; i++)
		{	if (layers[i].getVisible() && layers[i].get("permalink"))
			{	if (l) l += "|";
				l += layers[i].get("permalink")+":"+layers[i].get("opacity");
			}
			// Layer Group
			if (layers[i].getLayers) getLayers(layers[i].getLayers().getArray());
		}
	}
	getLayers(this.getMap().getLayers().getArray());
	this.layerStr_ = l;

	this.viewChange_();
}

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * @classdesc OpenLayers 3 Profil Control.
 *	Draw a profil of a feature (with a 3D geometry)
 *
 * @constructor
 * @extends {ol.control.Control}
 * @fires  over, out, show
 * @param {Object=} Control options.
 *
 */
ol.control.Profil = function(opt_options) 
{	var options = opt_options || {};
	this.info = options.info || ol.control.Profil.prototype.info;
	var self = this;
	
	var element;
	if (options.target) 
	{	element = $("<div>").addClass(options.className || "ol-profil");
	}
	else
	{	element = $("<div>").addClass((options.className || 'ol-profil') +' ol-unselectable ol-control ol-collapsed');
		this.button = $("<button>")
					.attr('type','button')
					.on("click touchstart", function(e)
					{	self.toggle();
						e.preventDefault();
					})
					.appendTo(element);
    }

	var div = $("<div>").addClass("ol-inner").appendTo(element);
	div = $("<div>").css("position","relative").appendTo(div);

	var ratio = this.ratio = 2;
	this.canvas_ = document.createElement('canvas');
	this.canvas_.width = (options.width || 300)*ratio;
	this.canvas_.height = (options.height || 150)*ratio;
	$(this.canvas_).css({
		"transform":"scale(0.5,0.5)", "transform-origin":"0 0",
		"-ms-transform":"scale(0.5,0.5)", "-ms-transform-origin":"0 0",
		"-webkit-transform":"scale(0.5,0.5)", "-webkit-transform-origin":"0 0",
		"transform":"scale(0.5,0.5)", "transform-origin":"0 0"
	});
	$("<div>").appendTo(div)
		.width (this.canvas_.width/ratio)
		.height (this.canvas_.height/ratio)
		.append(this.canvas_)
		.on("click mousemove", function(e){ self.onMove(e); });

	ol.control.Control.call(this, 
	{	element: element.get(0),
		target: options.target
	});

	// Offset in px
	this.margin_ = { top:10*ratio, left:40*ratio, bottom:30*ratio, right:10*ratio };
	if (!this.info.ytitle) this.margin_.left -= 20*ratio;
	if (!this.info.xtitle) this.margin_.bottom -= 20*ratio;
	
	// Cursor
	this.bar_ = $("<div>").addClass("ol-profilbar")
			.css({top:(this.margin_.top/ratio)+"px", height:(this.canvas_.height-this.margin_.top-this.margin_.bottom)/ratio+"px" })
			.appendTo(div);
	this.cursor_ = $("<div>").addClass("ol-profilcursor")
			.appendTo(div);
	this.popup_ = $("<div>").addClass("ol-profilpopup")
			.appendTo(this.cursor_);

	// Track information
	var t = $("<table cellpadding='0' cellspacing='0'>").appendTo(div).width(this.canvas_.width/ratio);
	var tr = $("<tr>").addClass("track-info").appendTo(t);
	$("<td>").html((this.info.zmin||"Zmin")+': <span class="zmin">').appendTo(tr);
	$("<td>").html((this.info.zmax||"Zmax")+': <span class="zmax">').appendTo(tr);
	$("<td>").html((this.info.distance||"Distance")+': <span class="dist">').appendTo(tr);
	$("<td>").html((this.info.time||"Time")+': <span class="time">').appendTo(tr);
	tr = $("<tr>").addClass("point-info").appendTo(t);
	$("<td>").html((this.info.altitude||"Altitude")+': <span class="z">').appendTo(tr);
	$("<td>").html((this.info.distance||"Distance")+': <span class="dist">').appendTo(tr);
	$("<td>").html((this.info.time||"Time")+': <span class="time">').appendTo(tr);

	// Array of data
	this.tab_ = [];

	// Show feature
	if (options.feature)
	{	this.setGeometry (options.feature);
	}
};
ol.inherits(ol.control.Profil, ol.control.Control);

/** Custom infos list
* @api stable
*/
ol.control.Profil.prototype.info =
{	"zmin": "Zmin",
	"zmax": "Zmax",
	"ytitle": "Altitude (m)",
	"xtitle": "Distance (km)",
	"time": "Time",
	"altitude": "Altitude",
	"distance": "Distance"
};

/** Show popup info
* @param {string} info to display as a popup
* @api stable
*/
ol.control.Profil.prototype.popup = function(info)
{	this.popup_.html(info);
}

/** Mouse move over canvas
*/
ol.control.Profil.prototype.onMove = function(e)
{	if (!this.tab_.length) return;
	var pos = $(this.canvas_).offset();
	var dx = e.pageX -pos.left;
	var dy = e.pageY -pos.top;
	var ratio = this.ratio;
	if (dx>this.margin_.left/ratio && dx<(this.canvas_.width-this.margin_.right)/ratio
		&& dy>this.margin_.top/ratio && dy<(this.canvas_.height-this.margin_.bottom)/ratio) 
	{	this.bar_.css("left", dx+"px").show();
		var d = (dx*ratio-this.margin_.left)/this.scale_[0];
		var p0 = this.tab_[0];
		for (var i=1, p; p=this.tab_[i]; i++)
		{	if (p[0]>=d) 
			{	if (d < (p[0]+p0[0])/2) p = p0;
				break;
			}
		}
		if (p) this.cursor_.css({ 
			left:dx+"px", 
			top:(this.canvas_.height-this.margin_.bottom+p[1]*this.scale_[1]+this.dy_)/ratio+"px"
		}).show();
		else this.cursor_.hide();
		this.bar_.parent().addClass("over");
		$(".point-info .z", this.element).text(p[1]+"m");
		$(".point-info .dist", this.element).text((p[0]/1000).toFixed(1)+"km");
		$(".point-info .time", this.element).text(p[2]);
		if (dx>this.canvas_.width/ratio/2) this.popup_.addClass('ol-left');
		else this.popup_.removeClass('ol-left');
		this.dispatchEvent({ type:'over', click:e.type=="click", coord: p[3], time: p[2], distance: p[0] });
	}
	else
	{	if (this.bar_.parent().hasClass("over"))
		{	this.bar_.hide();
			this.cursor_.hide();
			this.bar_.parent().removeClass("over");
			this.dispatchEvent({ type:'out' });
		}
	}
}

/** Show panel
* @api stable
*/
ol.control.Profil.prototype.show = function()
{	$(this.element).removeClass("ol-collapsed"); 
	this.dispatchEvent({ type:'show', show: true });
}
/** Hide panel
* @api stable
*/
ol.control.Profil.prototype.hide = function()
{	$(this.element).addClass("ol-collapsed"); 
	this.dispatchEvent({ type:'show', show: false });
}
/** Toggle panel
* @api stable
*/
ol.control.Profil.prototype.toggle = function()
{	var b = $(this.element).toggleClass("ol-collapsed").hasClass("ol-collapsed"); 
	this.dispatchEvent({ type:'show', show: !b });
}
/** Is panel visible
*/
ol.control.Profil.prototype.isShown = function()
{	return (!$(this.element).hasClass("ol-collapsed"));
}

/**
 * Set the geometry to draw the profil.
 * @param {ol.Feature|ol.geom} f the feature.
 * @param {Object=} options
 *		- projection {ol.ProjectionLike} feature projection, default projection of the map
 *		- zunit {m|km} default m
 *		- unit {m|km} default km
 *		- zmin {Number|undefined} default 0
 *		- zmax {Number|undefined} default max Z of the feature
 *		- graduation {Number|undefined} z graduation default 100
 *		- amplitude {integer|undefined} amplitude of the altitude, default zmax-zmin
 * @api stable
 */
ol.control.Profil.prototype.setGeometry = function(g, options)
{	if (!options) options = {};
	if (g instanceof ol.Feature) g = g.getGeometry();
	var canvas = this.canvas_;
	var ctx = canvas.getContext('2d');
	var w = canvas.width;
	var h = canvas.height;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0,0, w, h);

	// No Z
	if (!/Z/.test(g.getLayout())) return;
	// No time
	if(/M/.test(g.getLayout())) $(".time", this.element).parent().show();
	else $(".time", this.element).parent().hide();

	// Coords
	var c = g.getCoordinates();
	switch (g.getType())
	{	case "LineString": break;
		case "MultiLineString": c = c[0]; break;
		default: return;
	}

	// Distance beetween 2 coords
	var wgs84Sphere = new ol.Sphere(6378137);
	var proj = options.projection || this.getMap().getView().getProjection();
	function dist2d(p1,p2)
	{	return wgs84Sphere.haversineDistance(
			ol.proj.transform(p1, proj, 'EPSG:4326'),
			ol.proj.transform(p2, proj, 'EPSG:4326'));
	}

	function getTime(t0, t1)
	{	if (!t0 || !t1) return "-"
		var dt = (t1-t0) / 60; // mn
		var ti = Math.trunc(dt/60);
		var mn = Math.trunc(dt-ti*60);
		return ti+"h"+(mn<10?"0":"")+mn+"mn";
	}

	// Margin
	ctx.setTransform(1, 0, 0, 1, this.margin_.left, h-this.margin_.bottom);
	var ratio = this.ratio;

	w -= this.margin_.right + this.margin_.left;
	h -= this.margin_.top + this.margin_.bottom;
	// Draw axes
	ctx.strokeStyle = "#000";
	ctx.lineWidth = 0.5*ratio;
	ctx.beginPath();
	ctx.moveTo(0,0); ctx.lineTo(0,-h);
	ctx.moveTo(0,0); ctx.lineTo(w, 0);
	ctx.stroke();
	
	//
	var zmin=Infinity, zmax=-Infinity;
	var d, z, ti, t = this.tab_ = [];
	for (var i=0, p; p=c[i]; i++)
	{	z = p[2];
		if (z<zmin) zmin=z;
		if (z>zmax) zmax=z;
		if (i==0) d = 0;
		else d += dist2d(c[i-1], p);
		ti = getTime(c[0][3],p[3]);
		t.push ([d, z, ti, p]);
	}

	// Info
	$(".track-info .zmin", this.element).text(zmin.toFixed(2)+"m");
	$(".track-info .zmax", this.element).text(zmax.toFixed(2)+"m");
	if (d>1000)
	{	$(".track-info .dist", this.element).text((d/1000).toFixed(1)+"km");
	}
	else
	{	$(".track-info .dist", this.element).text((d).toFixed(1)+"m");
	}
	$(".track-info .time", this.element).text(ti);

	// Set graduation
	var grad = options.graduation || 100;
	while (true) 
	{	zmax = Math.ceil(zmax/grad)*grad;
		zmin = Math.floor(zmin/grad)*grad;
		var nbgrad = (zmax-zmin)/grad;
		if (h/nbgrad < 15*ratio)
		{	grad *= 2;
		}
		else break;
	} 

	// Set amplitude
	if (typeof(options.zmin)=='number' && zmin > options.zmin) zmin = options.zmin;
	if (typeof(options.zmax)=='number' && zmax < options.zmax) zmax = options.zmax;
	var amplitude = options.amplitude;
	if (amplitude)
	{	zmax = Math.max (zmin + amplitude, zmax);
	}

	// Scales lines
	var scx = w/d;
	var scy = -h/(zmax-zmin);
	var dy = this.dy_ = -zmin*scy;
	this.scale_ = [scx,scy];
	// Draw
	ctx.font = (10*ratio)+"px arial";
	ctx.textAlign = "right";
	ctx.textBaseline = "middle";
	ctx.fillStyle="#000";
	// Scale Z
	ctx.beginPath();
	for (var i=zmin; i<=zmax; i+=grad)
	{	if (options.zunit!="km") ctx.fillText(i, -4*ratio, i*scy+dy);
		else ctx.fillText((i/1000).toFixed(1), -4*ratio, i*scy+dy);
		ctx.moveTo (-2*ratio, i*scy+dy);
		if (i!=0) ctx.lineTo (d*scx, i*scy+dy);
		else ctx.lineTo (0, i*scy+dy);
	}
	// Scale X
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	ctx.setLineDash([ratio,3*ratio]);
	var unit = options.unit ||"km";
	var step;
	if (d>1000)
	{	step = Math.round(d/1000)*100;
		if (step > 1000) step = Math.ceil(step/1000)*1000;
	}
	else
	{	unit = "m";
		if (d>100) step = Math.round(d/100)*10;
		else if (d>10) step = Math.round(d/10);
		else if (d>1) step = Math.round(d)/10;
		else step = d;
	}
	for (var i=0; i<=d; i+=step)
	{	var txt = (unit=="m") ? i : (i/1000);
		//if (i+step>d) txt += " "+ (options.zunits || "km");
		ctx.fillText(Math.round(txt*10)/10, i*scx, 4*ratio);
		ctx.moveTo (i*scx, 2*ratio); ctx.lineTo (i*scx, 0);
	}
	ctx.font = (12*ratio)+"px arial";
	ctx.fillText(this.info.xtitle.replace("(km)","("+unit+")"), w/2, 18*ratio);
	ctx.save();
	ctx.rotate(-Math.PI/2);
	ctx.fillText(this.info.ytitle, h/2, -this.margin_.left);
	ctx.restore();
	
	ctx.stroke();

	// 
	ctx.strokeStyle = "#369";
	ctx.lineWidth = 1;
	ctx.setLineDash([]);
	ctx.beginPath();
	for (var i=0, p; p=t[i]; i++)
	{	if (i==0) ctx.moveTo(p[0]*scx,p[1]*scy+dy);
		else ctx.lineTo(p[0]*scx,p[1]*scy+dy);
	}
	ctx.stroke();
};

/** Get profil image
* @param {string|undefined} type image format or 'canvas' to get the canvas image, default image/png.
* @param {Number|undefined} encoderOptions between 0 and 1 indicating image quality image/jpeg or image/webp, default 0.92.
* @return {string} requested data uri
* @api stable
*/
ol.control.Profil.prototype.getImage = function(type, encoderOptions)
{	if (type==="canvas") return this.canvas_;
	return this.canvas_.toDataURL(type, encoderOptions);
}

/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * Search places using the French National Base Address (BAN) API.
 *
 * @constructor
 * @extends {ol.control.Search}
 * @fires select
 * @param {Object=} Control options. 
 *	@param {string} options.className control class name
 *	@param {Element | string | undefined} options.target Specify a target if you want the control to be rendered outside of the map's viewport.
 *	@param {string | undefined} options.label Text label to use for the search button, default "search"
 *	@param {string | undefined} options.placeholder placeholder, default "Search..."
 *	@param {number | undefined} options.typing a delay on each typing to start searching (ms), default 500.
 *	@param {integer | undefined} options.minLength minimum length to start searching, default 3
 *	@param {integer | undefined} options.maxItems maximum number of items to display in the autocomplete list, default 10
 *
 *	@param {string|undefined} options.url Url to BAN api, default "https://api-adresse.data.gouv.fr/search/"
 *	@param {boolean} options.position Search, with priority to geo position, default false
 *	@param {function} options.getTitle a function that takes a feature and return the text to display in the menu, default return label attribute
 * @see {@link https://adresse.data.gouv.fr/api/}
 */
ol.control.SearchBAN = function(options) 
{	options = options || {};
	options.typing = options.typing || 500;
	options.url = options.url || "https://api-adresse.data.gouv.fr/search/";
	ol.control.SearchPhoton.call(this, options);
};
ol.inherits(ol.control.SearchBAN, ol.control.SearchPhoton);

/** Returns the text to be displayed in the menu
*	@param {ol.Feature} f the feature
*	@return {string} the text to be displayed in the index
*	@api
*/
ol.control.SearchBAN.prototype.getTitle = function (f) {	
	var p = f.properties;
	return (p.label);
};

/** A ligne has been clicked in the menu > dispatch event
*	@param {any} f the feature, as passed in the autocomplete
*	@api
*/
ol.control.SearchBAN.prototype.select = function (f){	
  var c = f.geometry.coordinates;
	// Add coordinate to the event
	try {
		c = ol.proj.transform (f.geometry.coordinates, 'EPSG:4326', this.getMap().getView().getProjection());
  } catch(e) {};
	this.dispatchEvent({ type:"select", search:f, coordinate: c });
};
/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * Search features.
 *
 * @constructor
 * @extends {ol.control.Search}
 * @fires select
 * @param {Object=} Control options. 
 *	@param {string} options.className control class name
 *	@param {Element | string | undefined} options.target Specify a target if you want the control to be rendered outside of the map's viewport.
 *	@param {string | undefined} options.label Text label to use for the search button, default "search"
 *	@param {string | undefined} options.placeholder placeholder, default "Search..."
 *	@param {number | undefined} options.typing a delay on each typing to start searching (ms), default 300.
 *	@param {integer | undefined} options.minLength minimum length to start searching, default 1
 *	@param {integer | undefined} options.maxItems maximum number of items to display in the autocomplete list, default 10
 *
 *	@param {string | undefined} options.property a property to display in the index, default 'name'.
 *	@param {function} options.getTitle a function that takes a feature and return the name to display in the index, default return the property 
 *	@param {function | undefined} options.getSearchString a function that take a feature and return a text to be used as search string, default geTitle() is used as search string
 */
ol.control.SearchFeature = function(options) 
{	if (!options) options = {};
		
	ol.control.Search.call(this, options);

	if (typeof(options.getSearchString)=="function") this.getSearchString = options.getSearchString;
	this.set('property', options.property||'name');

	this.source_ = options.source;
};
ol.inherits(ol.control.SearchFeature, ol.control.Search);

/** Returns the text to be displayed in the menu
*	@param {ol.Feature} f the feature
*	@return {string} the text to be displayed in the index
*	@api
*/
ol.control.SearchFeature.prototype.getTitle = function (f)
{	return f.get(this.get('property')||'name');
};

/** Return the string to search in
*	@param {ol.Feature} f the feature
*	@return {string} the text to be used as search string
*	@api
*/
ol.control.SearchFeature.prototype.getSearchString = function (f)
{	return this.getTitle(f);
}

/** Autocomplete function
* @param {string} s search string
* @param {int} max max 
* @param {function} cback a callback function that takes an array of {name, feature} to display in the autocomplete fielad
* @api
*/
ol.control.SearchFeature.prototype.autocomplete = function (s, cback)
{	var result = [];
	// regexp
	s = s.replace(/^\*/,'');
	var rex = new RegExp(s, 'i');
	// The source
	var features = this.source_.getFeatures();
	var max = this.get('maxItems')
	for (var i=0, f; f=features[i]; i++)
	{	if (rex.test(this.getSearchString(f)))
		{	result.push(f);
			if ((--max)<=0) break;
		}
	}
	return result;
};

/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * @classdesc OpenLayers 3 swipe Control.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} Control options.
 *	- layers {ol.layer} layer to swipe
 *	- rightLayer {ol.layer} layer to swipe on right side
 *	- className {string} control class name
 *	- position {number} position propertie of the swipe [0,1], default 0.5
 *	- orientation {vertical|horizontal} orientation propertie, default vertical
 */
ol.control.Swipe = function(opt_options) 
{	var options = opt_options || {};
	var self = this;
	
	var button = document.createElement('button');

	var element = document.createElement('div');
    element.className = (options.className || "ol-swipe") + " ol-unselectable ol-control";
    element.appendChild(button);

	$(element).on ("mousedown touchstart", this, this.move );
    
	ol.control.Control.call(this, 
	{	element: element
	});
	
	this.layers = [];
	if (options.layers) this.addLayer(options.layers, false);
	if (options.rightLayers) this.addLayer(options.rightLayers, true);

	this.on('propertychange', function() 
	{	if (this.getMap()) this.getMap().renderSync();
		if (this.get('orientation') === "horizontal")
		{	$(this.element).css("top", this.get('position')*100+"%");
			$(this.element).css("left", "");
		}
		else
		{	if (this.get('orientation') !== "vertical") this.set('orientation', "vertical");
			$(this.element).css("left", this.get('position')*100+"%");
			$(this.element).css("top", "");
		}
		$(this.element).removeClass("horizontal vertical");
		$(this.element).addClass(this.get('orientation'));
	}, this);
	
	this.set('position', options.position || 0.5);
	this.set('orientation', options.orientation || 'vertical');
};
ol.inherits(ol.control.Swipe, ol.control.Control);

/**
 * Set the map instance the control associated with.
 * @param {ol.Map} map The map instance.
 */
ol.control.Swipe.prototype.setMap = function(map) 
{   
	if (this.getMap())
	{	for (var i=0; i<this.layers.length; i++)
		{	var l = this.layers[i];
			if (l.right) l.layer.un('precompose', this.precomposeRight, this);
			else l.layer.un('precompose', this.precomposeLeft, this);
			l.layer.un('postcompose', this.postcompose, this);
		}
		this.getMap().renderSync();
	}

	ol.control.Control.prototype.setMap.call(this, map);

	if (map)
	{	for (var i=0; i<this.layers.length; i++)
		{	var l = this.layers[i];
			if (l.right) l.layer.on('precompose', this.precomposeRight, this);
			else l.layer.on('precompose', this.precomposeLeft, this);
			l.layer.on('postcompose', this.postcompose, this);
		}
		map.renderSync();
	}
};

/** @private
*/
ol.control.Swipe.prototype.isLayer_ = function(layer) 
{	for (k=0; k<this.layers.length; k++)
	{	if (this.layers[k].layer === layer)  return k;
	}
	return -1;
};

/** Add a layer to clip
 *	@param {ol.layer|Array<ol.layer>} layer to clip
*	@param {bool} add layer in the right part of the map, default left.
*/
ol.control.Swipe.prototype.addLayer = function(layers, right) 
{	if (!(layers instanceof Array)) layers = [layers];
	for (var i=0; i<layers.length; i++)
	{	l = layers[i];
		if (this.isLayer_(l)<0)
		{	this.layers.push({ layer:l, right:right });
			if (this.getMap())
			{	if (right) l.on('precompose', this.precomposeRight, this);
				else l.on('precompose', this.precomposeLeft, this);
				l.on('postcompose', this.postcompose, this);
				this.getMap().renderSync();
			}
		}
	}
};

/** Remove a layer to clip
 *	@param {ol.layer|Array<ol.layer>} layer to clip
 */
ol.control.Swipe.prototype.removeLayer = function(layers)
{	if (!(layers instanceof Array)) layers = [layers];
	for (var i=0; i<layers.length; i++)
	{	var k = this.isLayer_(layers[i]);
		if (k >=0 && this.getMap())
		{	if (this.layers[k].right) layers[i].un('precompose', this.precomposeRight, this);
			else layers[i].un('precompose', this.precomposeLeft, this);
			layers[i].un('postcompose', this.postcompose, this);
			this.layers.splice(k,1);
			this.getMap().renderSync();
		}
	}
};

/** @private
*/
ol.control.Swipe.prototype.move = function(e) 
{	var self = e.data;
	switch (e.type)
	{	case 'touchcancel': 
		case 'touchend': 
		case 'mouseup': 
		{	self.isMoving = false;
			$(document).off ("mouseup mousemove touchend touchcancel touchmove", self.move );
			break;
		}
		case 'mousedown': 
		case 'touchstart':
		{	self.isMoving = true;
			$(document).on ("mouseup mousemove touchend touchcancel touchmove", self, self.move );
		}
		case 'mousemove': 
		case 'touchmove':
		{	if (self.isMoving)
			{	if (self.get('orientation') === "vertical")
				{	var pageX = e.pageX 
						|| (e.originalEvent.touches && e.originalEvent.touches.length && e.originalEvent.touches[0].pageX) 
						|| (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length && e.originalEvent.changedTouches[0].pageX);
					if (!pageX) break;
					pageX -= $(self.getMap().getTargetElement()).offset().left;

					var l = self.getMap().getSize()[0];
					l = Math.min(Math.max(0, 1-(l-pageX)/l), 1);
					self.set('position', l);
				}
				else
				{	var pageY = e.pageY 
						|| (e.originalEvent.touches && e.originalEvent.touches.length && e.originalEvent.touches[0].pageY) 
						|| (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length && e.originalEvent.changedTouches[0].pageY);
					if (!pageY) break;
					pageY -= $(self.getMap().getTargetElement()).offset().top;

					var l = self.getMap().getSize()[1];
					l = Math.min(Math.max(0, 1-(l-pageY)/l), 1);
					self.set('position', l);
				}
			}
			break;
		}
		default: break;
	}
};

/** @private
*/
ol.control.Swipe.prototype.precomposeLeft = function(e) 
{	var ctx = e.context;
	var canvas = ctx.canvas;
	ctx.save();
	ctx.beginPath();
	if (this.get('orientation') === "vertical") ctx.rect (0,0, canvas.width*this.get('position'), canvas.height);
	else ctx.rect (0,0, canvas.width, canvas.height*this.get('position'));
	ctx.clip();
};

/** @private
*/
ol.control.Swipe.prototype.precomposeRight = function(e) 
{	var ctx = e.context;
	var canvas = ctx.canvas;
	ctx.save();
	ctx.beginPath();
	if (this.get('orientation') === "vertical") ctx.rect (canvas.width*this.get('position'), 0, canvas.width, canvas.height);
	else ctx.rect (0,canvas.height*this.get('position'), canvas.width, canvas.height);
	ctx.clip();
};

/** @private
*/
ol.control.Swipe.prototype.postcompose = function(e) 
{	e.context.restore();
};

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** ol.control.Target draw a target at the center of the map. 
 * @constructor
 * @param {Object}
 *  - style {ol.style.Style|Array<ol.style.Style>} ol.style.Stroke: draw a cross on the map, ol.style.Image: draw the image on the map
 *  - composite {string} composite operation : difference|multiply|xor|screen|overlay|darken|lighter|lighten|...
 */
ol.control.Target = function(options) 
{	options = options || {};

	this.style = options.style ||
		[	new ol.style.Style({ image: new ol.style.RegularShape ({ points: 4, radius: 11, radius1: 0, radius2: 0, snapToPixel:true, stroke: new ol.style.Stroke({ color: "#fff", width:3 }) }) }),
			new ol.style.Style({ image: new ol.style.RegularShape ({ points: 4, radius: 11, radius1: 0, radius2: 0, snapToPixel:true, stroke: new ol.style.Stroke({ color: "#000", width:1 }) }) })
		];
	if (!(this.style instanceof Array)) this.style = [this.style];
	this.composite = options.composite || '';

	var div = document.createElement('div');
	div.className = "ol-target ol-unselectable ol-control";
	ol.control.Control.call(this, 
	{	element: div,
		target: options.target
	});

	this.setVisible(options.visible!==false);
};
ol.inherits(ol.control.Target, ol.control.Control);

/**
 * Remove the control from its current map and attach it to the new map.
 * Subclasses may set up event handlers to get notified about changes to
 * the map here.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.control.Target.prototype.setMap = function (map)
{	if (this.getMap()) 
	{	this.getMap().un('postcompose', this.drawTarget_, this);
		if (this.getVisible()) this.getMap().renderSync();
	}

	ol.control.Control.prototype.setMap.call(this, map);

	if (map) 
	{	map.on('postcompose', this.drawTarget_, this);
	}
};

/** Set the control visibility
* @paraam {boolean} b 
*/
ol.control.Target.prototype.setVisible = function (b)
{	this.set("visible",b);
	if (this.getMap()) this.getMap().renderSync();
};

/** Get the control visibility
* @return {boolean} b 
*/
ol.control.Target.prototype.getVisible = function ()
{	return this.get("visible");
};

/** Draw the target
* @private
*/
ol.control.Target.prototype.drawTarget_ = function (e)
{	if (!this.getMap() || !this.getVisible()) return;
	var ctx = e.context;
	var ratio = e.frameState.pixelRatio;

	ctx.save();
	
		ctx.scale(ratio,ratio);

		var cx = ctx.canvas.width/(2*ratio);
		var cy = ctx.canvas.height/(2*ratio);
		var geom = new ol.geom.Point (this.getMap().getCoordinateFromPixel([cx,cy]));

		if (this.composite) ctx.globalCompositeOperation = this.composite;

		for (var i=0; i<this.style.length; i++)
		{	var style = this.style[i];

			if (style instanceof ol.style.Style)
			{	var sc=0;
				// OL < v4.3 : setImageStyle don't check retina
				var imgs = ol.Map.prototype.getFeaturesAtPixel ? false : style.getImage();
				if (imgs) 
				{	sc = imgs.getScale(); 
					imgs.setScale(ratio*sc);
				}
				e.vectorContext.setStyle(style);
				e.vectorContext.drawGeometry(geom);
				if (imgs) imgs.setScale(sc);
			}
		}

	/*
		for (var i=0; i<this.style.length; i++)
		{	var style = this.style[i];
			if (style.stroke instanceof ol.style.Stroke)
			{	ctx.lineWidth = style.stroke.getWidth();
				ctx.strokeStyle = ol.color.asString(style.stroke.getColor());
				var m = style.radius || 10;
				
				var dx = cx + ctx.lineWidth/2;
				var dy = cy + ctx.lineWidth/2;

				ctx.beginPath();
				ctx.moveTo (dx-m, dy);
				ctx.lineTo (dx+m, dy);
				ctx.moveTo (dx, dy-m);
				ctx.lineTo( dx, dy+m);
				ctx.stroke();
			}
			else if (style instanceof ol.style.Image)
			{	var img = style.getImage();
				ctx.drawImage(img, cx-img.width/2, cy-img.height/2);
			}
			else if (style instanceof ol.style.Text)
			{	ctx.font = style.getFont();
				ctx.textBaseline = "middle";
				ctx.textAlign = "center";
				var fill = style.getFill();
				if (fill)
				{	ctx.fillStyle = ol.color.asString(fill.getColor());
					ctx.fillText(style.getText(), cx, cy);
				}
				var stroke = style.getStroke();
				if (stroke) 
				{	ctx.lineWidth = stroke.getWidth();
					ctx.strokeStyle = ol.color.asString(stroke.getColor());
					ctx.strokeText(style.getText(), cx, cy);
				}
			}
		}
		*/

	ctx.restore();
};

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** A simple toggle control 
 * The control can be created with an interaction to control its activation.
 *
 * @constructor
 * @extends {ol.control.Button}
 * @fires change:active, change:disable
 * @param {Object=} opt_options Control options.
 *		className {String} class of the control
 *		title {String} title of the control
 *		html {String} html to insert in the control
 *		interaction {ol.interaction} interaction associated with the control 
 *		active {bool} the control is created active, default false
 *		disable {bool} the control is created disabled, default false
 *		bar {ol.control.Bar} a subbar associated with the control (drawn when active if control is nested in a ol.control.Bar)
 *		autoActive {bool} the control will activate when shown in an ol.control.Bar, default false
 *		onToggle {function} callback when control is clicked (or use change:active event)
 */
ol.control.Toggle = function(options) 
{	options = options || {};
	var self = this;

	this.interaction_ = options.interaction;
	if (this.interaction_)
	{	this.interaction_.on("change:active", function(e)
		{	self.setActive(!e.oldValue);
		});
	}

	if (options.toggleFn) options.onToggle = options.toggleFn; // compat old version
	options.handleClick = function()
		{	self.toggle();
			if (options.onToggle) options.onToggle.call(self, self.getActive());
		};
	options.className = (options.className||"") + " ol-toggle";
	ol.control.Button.call(this, options);

	this.set("title", options.title);

	this.set ("autoActivate", options.autoActivate);
	if (options.bar) 
	{	this.subbar_ = options.bar;
		this.subbar_.setTarget(this.element);
		$(this.subbar_.element).addClass("ol-option-bar");
	}

	this.setActive (options.active);
	this.setDisable (options.disable);
};
ol.inherits(ol.control.Toggle, ol.control.Button);

/**
 * Set the map instance the control is associated with 
 * and add interaction attached to it to this map.
 * @param {ol.Map} map The map instance.
 */
ol.control.Toggle.prototype.setMap = function(map)
{	if (!map && this.getMap())
	{	if (this.interaction_) 
		{	this.getMap().removeInteraction (this.interaction_);
		}
		if (this.subbar_) this.getMap().removeControl (this.subbar_);
	}

	ol.control.Control.prototype.setMap.call(this, map);

	if (map)
	{	if (this.interaction_) map.addInteraction (this.interaction_);
		if (this.subbar_) map.addControl (this.subbar_);
	}
};

/** Get the subbar associated with a control
* @return {ol.control.Bar}
*/
ol.control.Toggle.prototype.getSubBar = function ()
{	return this.subbar_;
};

/**
 * Test if the control is disabled.
 * @return {bool}.
 * @api stable
 */
ol.control.Toggle.prototype.getDisable = function()
{	return $("button", this.element).prop("disabled");
};

/** Disable the control. If disable, the control will be deactivated too.
* @param {bool} b disable (or enable) the control, default false (enable)
*/
ol.control.Toggle.prototype.setDisable = function(b)
{	if (this.getDisable()==b) return;
	$("button", this.element).prop("disabled", b);
	if (b && this.getActive()) this.setActive(false);

	this.dispatchEvent({ type:'change:disable', key:'disable', oldValue:!b, disable:b });
};

/**
 * Test if the control is active.
 * @return {bool}.
 * @api stable
 */
ol.control.Toggle.prototype.getActive = function()
{	return $(this.element).hasClass("ol-active");
};

/** Toggle control state active/deactive
*/
ol.control.Toggle.prototype.toggle = function()
{	if (this.getActive()) this.setActive(false);
	else this.setActive(true);
};

/** Change control state
* @param {bool} b activate or deactivate the control, default false
*/
ol.control.Toggle.prototype.setActive = function(b)
{	if (this.getActive()==b) return;
	if (b) $(this.element).addClass("ol-active");
	else $(this.element).removeClass("ol-active");
	if (this.interaction_) this.interaction_.setActive (b);
	if (this.subbar_) this.subbar_.setActive(b);

	this.dispatchEvent({ type:'change:active', key:'active', oldValue:!b, active:b });
};

/** Set the control interaction
* @param {ol.interaction} i interaction to associate with the control
*/
ol.control.Toggle.prototype.setInteraction = function(i)
{	this.interaction_ = i;
};

/** Get the control interaction
* @return {ol.interaction} interaction associated with the control
*/
ol.control.Toggle.prototype.getInteraction = function()
{	return this.interaction_;
};
/*
	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
*/
/** Feature animation base class
 * Use the {@link ol.Map#animateFeature} or {@link ol.layer.Vector#animateFeature} to animate a feature 
 * on postcompose in a map or a layer
* @constructor
* @fires animationstart|animationend
* @param {ol.featureAnimationOptions} options
*	@param {Number} options.duration duration of the animation in ms, default 1000
*	@param {bool} options.revers revers the animation direction
*	@param {Number} options.repeat number of time to repeat the animation, default 0
*	@param {oo.style.Style} options.hiddenStyle a style to display the feature when playing the animation
*		to be used to make the feature selectable when playing animation 
*		(@see {@link ../examples/map.featureanimation.select.html}), default the feature 
*		will be hidden when playing (and niot selectable)
*	@param {ol.easingFunction} options.fade an easing function used to fade in the feature, default none
*	@param {ol.easingFunction} options.easing an easing function for the animation, default ol.easing.linear
*/
ol.featureAnimation = function(options)
{	options = options || {};
	
	this.duration_ = typeof (options.duration)=='number' ? (options.duration>=0 ? options.duration : 0) : 1000;
	this.fade_ = typeof(options.fade) == 'function' ? options.fade : null;
	this.repeat_ = Number(options.repeat);

	var easing = typeof(options.easing) =='function' ? options.easing : ol.easing.linear;
	if (options.revers) this.easing_ = function(t) { return (1 - easing(t)); };
	else this.easing_ = easing;

	this.hiddenStyle = options.hiddenStyle;

	ol.Object.call(this);
};
ol.inherits(ol.featureAnimation, ol.Object);

/** Draw a geometry 
* @param {olx.animateFeatureEvent} e
* @param {ol.geom} geom geometry for shadow
* @param {ol.geom} shadow geometry for shadow (ie. style with zIndex = -1)
* @private
*/
ol.featureAnimation.prototype.drawGeom_ = function (e, geom, shadow)
{	if (this.fade_) 
	{	e.context.globalAlpha = this.fade_(1-e.elapsed);
	}
	var style = e.style;
	for (var i=0; i<style.length; i++)
	{	var sc=0;
		// OL < v4.3 : setImageStyle doesn't check retina
		var imgs = ol.Map.prototype.getFeaturesAtPixel ? false : style[i].getImage();
		if (imgs) 
		{	sc = imgs.getScale(); 
			imgs.setScale(e.frameState.pixelRatio*sc);
		}
		// Prevent crach if the style is not ready (image not loaded)
		try{
			e.vectorContext.setStyle(style[i]);
			if (style[i].getZIndex()<0) e.vectorContext.drawGeometry(shadow||geom);
			else e.vectorContext.drawGeometry(geom);
		} catch(e) {};
		if (imgs) imgs.setScale(sc);
	}
};

/** Function to perform manipulations onpostcompose. 
 * This function is called with an ol.featureAnimationEvent argument. 
 * The function will be overridden by the child implementation.    
 * Return true to keep this function for the next frame, false to remove it.
 * @param {ol.featureAnimationEvent} e
 * @return {bool} true to continue animation.
 * @api 
 */
ol.featureAnimation.prototype.animate = function (e)
{	return false;
};

/** An animation controler object an object to control animation with start, stop and isPlaying function.    
 * To be used with {@link olx.Map#animateFeature} or {@link ol.layer.Vector#animateFeature}
 * @typedef {Object} ol.animationControler
 * @property {function} start - start animation.
 * @property {function} stop - stop animation option arguments can be passed in animationend event.
 * @property {function} isPlaying - return true if animation is playing.
 */

/** Animate feature on a map
 * @function 
 * @fires animationstart, animationend
 * @param {ol.Feature} feature Feature to animate
 * @param {ol.featureAnimation|Array<ol.featureAnimation>} fanim the animation to play
 * @return {olx.animationControler} an object to control animation with start, stop and isPlaying function
 */
ol.Map.prototype.animateFeature = 

/** Animate feature on a vector layer 
 * @fires animationstart, animationend
 * @param {ol.Feature} feature Feature to animate
 * @param {ol.featureAnimation|Array<ol.featureAnimation>} fanim the animation to play
 * @return {olx.animationControler} an object to control animation with start, stop and isPlaying function
*/
ol.layer.Vector.prototype.animateFeature = function(feature, fanim)
{	var self = this;
	var listenerKey;
	
	// Save style
	var style = feature.getStyle();
	var flashStyle = style || (this.getStyleFunction ? this.getStyleFunction()(feature) : null);
	if (!flashStyle) flashStyle=[];
	if (!(flashStyle instanceof Array)) flashStyle = [flashStyle];

	// Hide feature while animating
	feature.setStyle(fanim.hiddenStyle || []);

	// Structure pass for animating
	var event = 
		{	// Frame context
			vectorContext: null,
			frameState: null,
			start: 0,
			time: 0,
			elapsed: 0,
			extent: false,
			// Feature information
			feature: feature,
			geom: feature.getGeometry(),
			typeGeom: feature.getGeometry().getType(),
			bbox: feature.getGeometry().getExtent(),
			coord: ol.extent.getCenter(feature.getGeometry().getExtent()),
			style: flashStyle
		};

	if (!(fanim instanceof Array)) fanim = [fanim];
	// Remove null animations
	for (var i=fanim.length-1; i>=0; i--)
	{	if (fanim[i].duration_===0) fanim.splice(i,1);
	}

	var nb=0, step = 0;

	function animate(e) 
	{	event.vectorContext = e.vectorContext;
		event.frameState = e.frameState;
		if (!event.extent) 
		{	event.extent = e.frameState.extent;
			event.start = e.frameState.time;
			event.context = e.context;
		}
		event.time = e.frameState.time - event.start;
		event.elapsed = event.time / fanim[step].duration_;
		if (event.elapsed > 1) event.elapsed = 1;
		
		// Stop animation?
		if (!fanim[step].animate(event))
		{	nb++;
			// Repeat animation
			if (nb < fanim[step].repeat_)
			{	event.extent = false;
			}
			// newt step
			else if (step < fanim.length-1)
			{	fanim[step].dispatchEvent({ type:'animationend', feature: feature });
				step++;
				nb=0;
				event.extent = false;
			}
			// the end
			else 
			{	stop();
			}
			
		}

		// tell OL3 to continue postcompose animation
		e.frameState.animate = true;
	}

	// Stop animation
	function stop(options)
	{	ol.Observable.unByKey(listenerKey);
		listenerKey = null;
		feature.setStyle(style);
		// Send event
		var event = { type:'animationend', feature: feature };
		if (options) 
		{	for (var i in options) if (options.hasOwnProperty(i))
			{ 	event[i] = options[i]; 
			}
		}
		fanim[step].dispatchEvent(event);
		self.dispatchEvent(event);
	}

	// Launch animation
	function start(options)
	{	if (fanim.length && !listenerKey)
		{	listenerKey = self.on('postcompose', animate, self);
			// map or layer?
			if (self.renderSync) self.renderSync();
			else self.changed();
			// Send event
			var event = { type:'animationstart', feature: feature };
			if (options) 
			{	for (var i in options) if (options.hasOwnProperty(i))
				{ 	event[i] = options[i]; 
				}
			}
			fanim[step].dispatchEvent(event);
			self.dispatchEvent(event);
		}
	}
	start();

	// Return animation controler
	return {
		start: start,
		stop: stop,
		isPlaying: function() { return (!!listenerKey); }
	};
};

/*
	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
*/

/** Bounce animation: 
 * @constructor
 * @extends {ol.featureAnimation}
 * @param {ol.featureAnimationBounceOptions} options
 *	@param {Integer} options.bounce number of bounce, default 3
 *	@param {Integer} options.amplitude bounce amplitude,default 40
 *	@param {ol.easing} options.easing easing used for decaying amplitude, use function(){return 0} for no decay, default ol.easing.linear
 *	@param {Integer} options.duration duration in ms, default 1000
 */
ol.featureAnimation.Bounce = function(options)
{	options = options || {};
	ol.featureAnimation.call(this, options);
	this.amplitude_ = options.amplitude || 40;
	this.bounce_ = -Math.PI*(options.bounce || 3);
}
ol.inherits(ol.featureAnimation.Bounce, ol.featureAnimation);

/** Animate
* @param {ol.featureAnimationEvent} e
*/
ol.featureAnimation.Bounce.prototype.animate = function (e)
{	// Animate
	var flashGeom = e.geom.clone();
	
	/*
	var t = this.easing_(e.elapsed)
	t = Math.abs(Math.sin(this.bounce_*t)) * this.amplitude_ * (1-t) * e.frameState.viewState.resolution;
	*/
	var t = Math.abs(Math.sin(this.bounce_*e.elapsed)) * this.amplitude_ * (1-this.easing_(e.elapsed)) * e.frameState.viewState.resolution;
	flashGeom.translate(0, t);
	this.drawGeom_(e, flashGeom, e.geom);
	
	return (e.time <= this.duration_);
}

/*
	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
*/

/** Drop animation: drop a feature on the map
 * @constructor
 * @extends {ol.featureAnimation}
 * @param {ol.featureAnimationDropOptions} options
 *  @param {Number} options.speed speed of the feature if 0 the duration parameter will be used instead, default 0
 *  @param {Number} options.side top or bottom, default top
 */
ol.featureAnimation.Drop = function(options)
{	options = options || {};
	this.speed_ = options.speed || 0;
	ol.featureAnimation.call(this, options);
	this.side_ = options.side || 'top';
}
ol.inherits(ol.featureAnimation.Drop, ol.featureAnimation);

/** Animate
* @param {ol.featureAnimationEvent} e
*/
ol.featureAnimation.Drop.prototype.animate = function (e)
{	// First time > calculate duration / speed
	if (!e.time) 
	{	var angle = e.frameState.viewState.rotation;
		var s = e.frameState.size[1] * e.frameState.viewState.resolution;
		if (this.side_!='top') s *= -1;
		this.dx = -Math.sin(angle)*s;
		this.dy = Math.cos(angle)*s;
		if (this.speed_) 
		{	this.duration_ = s/this.speed_/e.frameState.viewState.resolution;
		}
	}
	// Animate
	var flashGeom = e.geom.clone();
	flashGeom.translate(
		this.dx*(1-this.easing_(e.elapsed)),  
		this.dy*(1-this.easing_(e.elapsed))
	);
	this.drawGeom_(e, flashGeom, e.geom);
	
	return (e.time <= this.duration_);
}

/*
	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
*/

/** Fade animation: feature fade in
 * @constructor
 * @extends {ol.featureAnimation}
 * @param {ol.featureAnimationOptions} options
 */
ol.featureAnimation.Fade = function(options)
{	options = options || {};
	this.speed_ = options.speed || 0;
	ol.featureAnimation.call(this, options);
}
ol.inherits(ol.featureAnimation.Fade, ol.featureAnimation);

/** Animate
* @param {ol.featureAnimationEvent} e
*/
ol.featureAnimation.Fade.prototype.animate = function (e)
{	e.context.globalAlpha = this.easing_(e.elapsed);
	this.drawGeom_(e, e.geom);
	
	return (e.time <= this.duration_);
}

/*
	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
*/
/** Do nothing for a given duration
 * @constructor
 * @extends {ol.featureAnimation}
 * @param {ol.featureAnimationShowOptions} options
 * 
 */
ol.featureAnimation.None = function(options)
{	ol.featureAnimation.call(this, options);
};
ol.inherits(ol.featureAnimation.None, ol.featureAnimation);

/** Animate: do nothing during the laps time
* @param {ol.featureAnimationEvent} e
*/
ol.featureAnimation.None.prototype.animate = function (e)
{	
	return (e.time <= this.duration_);
};

/*
	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
*/
/** Do nothing 
 * @constructor
 * @extends {ol.featureAnimation}
 * @param {ol.featureAnimationShowOptions} options
 */
ol.featureAnimation.Null = function(options)
{	ol.featureAnimation.call(this, { duration:0 });
};
ol.inherits(ol.featureAnimation.Null, ol.featureAnimation);

/*
	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
*/
/** Path animation: feature follow a path
 * @constructor
 * @extends {ol.featureAnimation}
 * @param {ol.featureAnimationPathOptions} options
 *  @param {Number} options.speed speed of the feature, if 0 the duration parameter will be used instead, default 0
 *  @param {ol.geom.LineString|ol.Feature} options.path the path to follow
 */
ol.featureAnimation.Path = function(options)
{	options = options || {};
	ol.featureAnimation.call(this, options);
	this.speed_ = options.speed || 0;
	this.path_ = options.path;
	if (this.path_ && this.path_.getGeometry) this.path_ = this.path_.getGeometry();
	if (this.path_ && this.path_.getLineString) this.path_ = this.path_.getLineString();
	if (this.path_.getLength)
	{	this.dist_ = this.path_.getLength()
		if (this.path_ && this.path_.getCoordinates) this.path_ = this.path_.getCoordinates();
	}
	else this.dist_ = 0;
	if (this.speed_>0) this.duration_ = this.dist_/this.speed_;
}
ol.inherits(ol.featureAnimation.Path, ol.featureAnimation);

/** Animate
* @param {ol.featureAnimationEvent} e
*/
ol.featureAnimation.Path.prototype.animate = function (e)
{	// First time 
	if (!e.time) 
	{	if (!this.dist_) return false;
	}
	var dmax = this.dist_*this.easing_(e.elapsed);
	var p0, p, dx,dy, dl, d = 0;
	p = this.path_[0];
	// Linear interpol
	for (var i = 1; i<this.path_.length; i++)
	{	p0 = p;
		p = this.path_[i];
		dx = p[0]-p0[0];
		dy = p[1]-p0[1];
		dl = Math.sqrt(dx*dx+dy*dy);
		if (dl && d+dl>=dmax) 
		{	var s = (dmax-d)/dl;
			p = [ p0[0] + (p[0]-p0[0])*s, p0[1] + (p[1]-p0[1])*s];
			break;
		}
		d += dl;
	}
	e.geom.setCoordinates(p);
	// Animate
	this.drawGeom_(e, e.geom);
	
	return (e.time <= this.duration_);
}

/*
	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
*/

/** Shakee animation: 
 * @constructor
 * @extends {ol.featureAnimation}
 * @param {ol.featureAnimationShakeOptions} options
 *	@param {Integer} options.bounce number o bounds, default 6
 *	@param {Integer} options.amplitude amplitude of the animation, default 40
 *	@param {bool} options.horizontal shake horizontally default false (vertical)
 */
ol.featureAnimation.Shake = function(options)
{	options = options || {};
	ol.featureAnimation.call(this, options);
//	this.easing_ = options.easing_ || function(t){return (0.5+t)*t -0.5*t ;};
	this.amplitude_ = options.amplitude || 40;
	this.bounce_ = -Math.PI*(options.bounce || 6);
	this.horizontal_ = options.horizontal;
}
ol.inherits(ol.featureAnimation.Shake, ol.featureAnimation);

/** Animate
* @param {ol.featureAnimationEvent} e
*/
ol.featureAnimation.Shake.prototype.animate = function (e)
{	// Animate
	var flashGeom = e.geom.clone();
	var shadow = e.geom.clone();

	var t = this.easing_(e.elapsed)
	t = Math.sin(this.bounce_*t) * this.amplitude_ * (1-t) * e.frameState.viewState.resolution;
	if (this.horizontal_) 
	{	flashGeom.translate(t, 0);
		shadow.translate(t, 0);
	}
	else flashGeom.translate(0, t);
	this.drawGeom_(e, flashGeom, shadow);
	
	return (e.time <= this.duration_);
}

/*
	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
*/

/** Show an object for a given duration
 * @constructor
 * @extends {ol.featureAnimation}
 * @param {ol.featureAnimationOptions} options
 */
ol.featureAnimation.Show = function(options)
{	ol.featureAnimation.call(this, options);
}
ol.inherits(ol.featureAnimation.Show, ol.featureAnimation);

/** Animate: just show the object during the laps time
* @param {ol.featureAnimationEvent} e
*/
ol.featureAnimation.Show.prototype.animate = function (e)
{	
	this.drawGeom_(e, e.geom);
	return (e.time <= this.duration_);
}

/*
	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
*/
/** Slice animation: feature enter from left
 * @constructor
 * @extends {ol.featureAnimation}
 * @param {ol.featureAnimationSlideOptions} options
 *  @param {Number} options.speed speed of the animation, if 0 the duration parameter will be used instead, default 0
 */
ol.featureAnimation.Slide = function(options)
{	options = options || {};
	this.speed_ = options.speed || 0;
	ol.featureAnimation.call(this, options);
	this.side_ = options.side || 'left';
}
ol.inherits(ol.featureAnimation.Slide, ol.featureAnimation);

/** Animate
* @param {ol.featureAnimationEvent} e
*/
ol.featureAnimation.Slide.prototype.animate = function (e)
{	// First time > calculate duration / speed
	if (!e.time) 
	{	if (this.side_=='left') this.dx = (e.extent[0]-e.bbox[2])
		else this.dx = (e.extent[2]-e.bbox[0])
		if (this.speed_) this.duration_ = Math.abs(this.dx)/this.speed_/e.frameState.viewState.resolution;
	}
	// Animate
	var flashGeom = e.geom.clone();
	flashGeom.translate(this.dx*(1-this.easing_(e.elapsed)), 0);
	this.drawGeom_(e, flashGeom);
	
	return (e.time <= this.duration_);
}

/*
	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
*/

/** Teleport a feature at a given place
 * @constructor
 * @extends {ol.featureAnimation}
 * @param {ol.featureAnimationOptions} options
 */
ol.featureAnimation.Teleport = function(options)
{	ol.featureAnimation.call(this, options);
}
ol.inherits(ol.featureAnimation.Teleport, ol.featureAnimation);

/** Animate
* @param {ol.featureAnimationEvent} e
*/
ol.featureAnimation.Teleport.prototype.animate = function (e)
{	var sc = this.easing_(e.elapsed);
	if (sc)
	{	e.context.save()
			var ratio = e.frameState.pixelRatio;
			e.context.globalAlpha = sc;
			e.context.scale(sc,1/sc);
			var m = e.frameState.coordinateToPixelTransform;
			var dx = (1/sc-1) * ratio * (m[0]*e.coord[0] + m[1]*e.coord[1] +m[4]);
			var dy = (sc-1) * ratio * (m[2]*e.coord[0] + m[3]*e.coord[1] +m[5]);
			e.context.translate(dx,dy);
			this.drawGeom_(e, e.geom);
		e.context.restore()
	}

	return (e.time <= this.duration_);
}

/*
	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
*/
/** Slice animation: feature enter from left
 * @constructor
 * @extends {ol.featureAnimation}
 * @param {ol.featureAnimationThrowOptions} options
 *  @param {left|right} options.side side of the animation, default left
 */
ol.featureAnimation.Throw = function(options)
{	options = options || {};
	ol.featureAnimation.call(this, options);
	this.speed_ = options.speed || 0;
	this.side_ = options.side || 'left';
}
ol.inherits(ol.featureAnimation.Throw, ol.featureAnimation);

/** Animate
* @param {ol.featureAnimationEvent} e
*/
ol.featureAnimation.Throw.prototype.animate = function (e)
{	// First time > calculate duration / speed
	if (!e.time && this.speed_) 
	{	var dx, dy;
		if (this.side_=='left')
		{	dx = this.dx = e.extent[0]-e.bbox[2];
			dy = this.dy = e.extent[3]-e.bbox[1];
		}
		else
		{	dx = this.dx = e.extent[2]-e.bbox[0];
			dy = this.dy = e.extent[3]-e.bbox[1];
		}
		this.duration_ = Math.sqrt(dx*dx+dy*dy)/this.speed_/e.frameState.viewState.resolution;
	}
	// Animate
	var flashGeom = e.geom.clone();
	var shadow = e.geom.clone();

	flashGeom.translate(this.dx*(1-this.easing_(e.elapsed)), 
		this.dy*Math.cos(Math.PI/2*this.easing_(e.elapsed)));
	shadow.translate(this.dx*(1-this.easing_(e.elapsed)), 0);
	this.drawGeom_(e, flashGeom, shadow);
	
	return (e.time <= this.duration_);
}

/*
	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL license (http://www.cecill.info/).
	
*/

/** Zoom animation: feature zoom in (for points)
 * @constructor
 * @extends {ol.featureAnimation}
 * @param {ol.featureAnimationZoomOptions} options
 *  @param {bool} options.zoomOut to zoom out
 */
ol.featureAnimation.Zoom = function(options)
{	options = options || {};
	ol.featureAnimation.call(this, options);
	this.set('zoomout', options.zoomOut);
}
ol.inherits(ol.featureAnimation.Zoom, ol.featureAnimation);


/** Zoom animation: feature zoom out (for points)
 * @constructor
 * @extends {ol.featureAnimation}
 * @param {ol.featureAnimationZoomOptions} options
 */
ol.featureAnimation.ZoomOut = function(options)
{	options = options || {};
	options.zoomOut = true;
	ol.featureAnimation.Zoom.call(this, options);
}
ol.inherits(ol.featureAnimation.ZoomOut, ol.featureAnimation.Zoom);

/** Animate
* @param {ol.featureAnimationEvent} e
*/
ol.featureAnimation.Zoom.prototype.animate = function (e)
{	var fac = this.easing_(e.elapsed);
	if (fac)
	{	if (this.get('zoomout')) fac  = 1/fac;
		var style = e.style;
		var imgs, sc=[]
		for (var i=0; i<style.length; i++)
		{	imgs = style[i].getImage();
			if (imgs) 
			{	sc[i] = imgs.getScale(); 
				imgs.setScale(sc[i]*fac);
			}
		}

		e.context.save()
			var ratio = e.frameState.pixelRatio;
			var m = e.frameState.coordinateToPixelTransform;
			var dx = (1/fac-1)* ratio * (m[0]*e.coord[0] + m[1]*e.coord[1] +m[4]);
			var dy = (1/fac-1)* ratio * (m[2]*e.coord[0] + m[3]*e.coord[1] +m[5]);
			e.context.scale(fac,fac);
			e.context.translate(dx,dy);
			this.drawGeom_(e, e.geom);
		e.context.restore()
		
		for (var i=0; i<style.length; i++)
		{	imgs = style[i].getImage();
			if (imgs) imgs.setScale(sc[i]);
		}
	}
/*
	var sc = this.easing_(e.elapsed);
	if (sc)
	{	e.context.save()
		console.log(e)
			var ratio = e.frameState.pixelRatio;
			var m = e.frameState.coordinateToPixelTransform;
			var dx = (1/(sc)-1)* ratio * (m[0]*e.coord[0] + m[1]*e.coord[1] +m[4]);
			var dy = (1/(sc)-1)*ratio * (m[2]*e.coord[0] + m[3]*e.coord[1] +m[5]);
			e.context.scale(sc,sc);
			e.context.translate(dx,dy);
			this.drawGeom_(e, e.geom);
		e.context.restore()
	}
*/
	return (e.time <= this.duration_);
}

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
ol.filter = {};
/**
 * @classdesc 
 * Abstract base class; normally only used for creating subclasses and not instantiated in apps.    
 * Used to create filters    
 * Use {@link ol.Map#addFilter}, {@link ol.Map#removeFilter} or {@link ol.Map#getFilters} to handle filters on a map.    
 * Use {@link ol.layer.Base#addFilter}, {@link ol.layer.Base#removeFilter} or {@link ol.layer.Base#getFilters} 
 * to handle filters on layers.
 *
 * @constructor
 * @extends {ol.Object}
 * @param {} options Extend {@link ol.control.Control} options.
 *  @param {bool} options.active
 */
ol.filter.Base = function(options) 
{	ol.Object.call(this);
	if (options && options.active===false) this.set('active', false);
	else this.set('active', true);
};
ol.inherits(ol.filter.Base, ol.Object);

/** Activate / deactivate filter
*	@param {bool}
*/
ol.filter.Base.prototype.setActive = function (b)
{	this.set('active', b===true);
};

/** Get filter active
*	@return {bool}
*/
ol.filter.Base.prototype.getActive = function (b)
{	return this.get('active');
};

(function(){

/** Internal function  
* @scoop {ol.filter} this the filter
* @private
*/
function precompose_(e)
{	if (this.get('active')) this.precompose(e);
}
/** Internal function  
* @scoop {ol.filter} this the filter
* @private
*/
function postcompose_(e)
{	if (this.get('active')) this.postcompose(e);
}
/** Force filter redraw / Internal function  
* @scoop {ol.map||ol.layer} this: the map or layer the filter is added to
* @private
*/
function filterRedraw_(e)
{	if (this.renderSync) this.renderSync();
	else this.changed(); 
}

/** Add a filter to an ol object
* @scoop {ol.map||ol.layer} this: the map or layer the filter is added to
* @private
*/
function addFilter_(filter)
{	if (!this.filters_) this.filters_ = [];
	this.filters_.push(filter);
	if (filter.precompose) this.on('precompose', precompose_, filter);
	if (filter.postcompose) this.on('postcompose', postcompose_, filter);
	filter.on('propertychange', filterRedraw_, this);
	filterRedraw_.call (this);
};

/** Remove a filter to an ol object
* @scoop {ol.map||ol.layer} this: the map or layer the filter is added to
* @private
*/
function removeFilter_(filter)
{	if (!this.filters_) this.filters_ = [];
	for (var i=this.filters_.length-1; i>=0; i--)
	{	if (this.filters_[i]===filter) this.filters_.splice(i,1);
	}
	if (filter.precompose) this.un('precompose', precompose_, filter);
	if (filter.postcompose) this.un('postcompose', postcompose_, filter);
	filter.un('propertychange', filterRedraw_, this);
	filterRedraw_.call (this);
};

/** Add a filter to an ol.Map
*	@param {ol.filter}
*/
ol.Map.prototype.addFilter = function (filter)
{	addFilter_.call (this, filter);
};
/** Remove a filter to an ol.Map
*	@param {ol.filter}
*/
ol.Map.prototype.removeFilter = function (filter)
{	removeFilter_.call (this, filter);
};
/** Get filters associated with an ol.Map
*	@return {Array<ol.filter>}
*/
ol.Map.prototype.getFilters = function ()
{	return this.filters_;
};

/** Add a filter to an ol.Layer
*	@param {ol.filter}
*/
ol.layer.Base.prototype.addFilter = function (filter)
{	addFilter_.call (this, filter);
};
/** Remove a filter to an ol.Layer
*	@param {ol.filter}
*/
ol.layer.Base.prototype.removeFilter = function (filter)
{	removeFilter_.call (this, filter);
};

/** Get filters associated with an ol.Map
*	@return {Array<ol.filter>}
*/
ol.layer.Base.prototype.getFilters = function ()
{	return this.filters_;
};

})();

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Mask drawing using an ol.Feature
* 	@constructor
*	@requires ol.filter
*	@extends {ol.filter.Base}
*	@param {ol.filter.cropOptions}
*		- feature {ol.Feature} feature to mask with
*		- fill {ol.style.Fill} style to fill with
*		- inner {bool} mask inner, default false
*/
ol.filter.Mask = function(options)
{	options = options || {};
	ol.filter.Base.call(this, options);
	if (options.feature)
	{	switch (options.feature.getGeometry().getType())
		{	case "Polygon":
			case "MultiPolygon":
				this.feature_ = options.feature;
				break;
			default: break;
		}
	}
	this.set("inner", options.inner);
	this.fillColor_ = options.fill ? ol.color.asString(options.fill.getColor()) || "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.2)";
}
ol.inherits(ol.filter.Mask, ol.filter.Base);

/** Draw the feature into canvas
*/
ol.filter.Mask.prototype.drawFeaturePath_ = function(e, out)
{	var ctx = e.context;
	var canvas = ctx.canvas;
	var ratio = e.frameState.pixelRatio;
	// Transform
	var m = e.frameState.coordinateToPixelTransform;
	function tr(pt)
	{	return [
			(pt[0]*m[0]+pt[1]*m[1]+m[4])*ratio,
			(pt[0]*m[2]+pt[1]*m[3]+m[5])*ratio
		];
	}
	// Old version
	if (!m)
	{	m = e.frameState.coordinateToPixelMatrix;
		tr = function(pt)
		{	return [
				(pt[0]*m[0]+pt[1]*m[1]+m[12])*ratio,
				(pt[0]*m[4]+pt[1]*m[5]+m[13])*ratio
			];
		}
	}
	// Geometry
	var ll = this.feature_.getGeometry().getCoordinates();
	if (this.feature_.getGeometry().getType()=="Polygon") ll = [ll];
	ctx.beginPath();
        if (out)
		{	ctx.moveTo (0,0);
			ctx.lineTo (canvas.width, 0);
			ctx.lineTo (canvas.width, canvas.height);
			ctx.lineTo (0, canvas.height);
			ctx.lineTo (0, 0);
		}
		for (var l=0; l<ll.length; l++)
		{	var c = ll[l];
			for (var i=0; i<c.length; i++) 
			{	var pt = tr(c[i][0]);
				ctx.moveTo (pt[0], pt[1]);
				for (var j=1; j<c[i].length; j++) 
				{	pt = tr(c[i][j]);
					ctx.lineTo (pt[0], pt[1]);
				}
			}
		}
}

ol.filter.Mask.prototype.postcompose = function(e)
{	if (!this.feature_) return;
	var ctx = e.context;
	ctx.save();
		this.drawFeaturePath_(e, !this.get("inner"));
		ctx.fillStyle = this.fillColor_;
		ctx.fill("evenodd");
	ctx.restore();
}

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Clip layer or map 
* 	@constructor
*	@requires ol.filter
*	@extends {ol.filter.Base}
*	@param {ol.filter.clipOptions}
*		- coords {Array<ol.Coordinate>}
*		- extent {ol.Extent}
*		- units {%|px} coords units percent or pixel
*		- keepAspectRatio {boolean} keep aspect ratio
*		- color {string} backgroundcolor
*/
ol.filter.Clip = function(options)
{	options = options || {};
	ol.filter.Base.call(this, options);
	
	this.set("coords", options.coords);
	this.set("units", options.units);
	this.set("keepAspectRatio", options.keepAspectRatio);
	this.set("extent", options.extent || [0,0,1,1]);
	this.set("color", options.color);
	if (!options.extent && options.units!="%" && options.coords)
	{	var xmin = Infinity;
		var ymin = Infinity;
		var xmax = -Infinity;
		var ymax = -Infinity;
		for (var i=0, p; p=options.coords[i]; i++)
		{	if (xmin > p[0]) xmin = p[0];
			if (xmax < p[0]) xmax = p[0];
			if (ymin > p[1]) ymin = p[1];
			if (ymax < p[1]) ymax = p[1];
		}
		options.extent = [xmin,ymin,xmax,ymax];
	}
}
ol.inherits(ol.filter.Clip, ol.filter.Base);

ol.filter.Clip.prototype.clipPath_ = function(e)
{	var ctx = e.context;
	var canvas = ctx.canvas;
	var coords = this.get("coords");
	if (!coords) return;
	var ex = this.get('extent');
	var scx = 1, scy = 1;
	if (this.get("units")=="%") 
	{	scx = canvas.width/(ex[2]-ex[0]);
		scy = canvas.height/(ex[3]-ex[1]);
	}
	if (this.get("keepAspectRatio")) 
	{	scx = scy = Math.min (scx, scy);
	}
	var pos = this.get('position');
	var dx=0, dy=0;
	if (/left/.test(pos)) 
	{	dx = -ex[0]*scx;
	}
	else if (/center/.test(pos)) 
	{	dx = canvas.width/2 - (ex[2]-ex[0])*scx/2;
	}
	else if (/right/.test(pos)) 
	{	dx = canvas.width - (ex[2]-ex[0])*scx;
	}
	var fx = function(x) { return x*scx + dx };
	if (/top/.test(pos)) 
	{	dy = -ex[1]*scy;
	}
	else if (/middle/.test(pos)) 
	{	dy = canvas.height/2 - (ex[3]-ex[1])*scy/2;
	}
	else if (/bottom/.test(pos)) 
	{	dy = canvas.height - (ex[3]-ex[1])*scy;
	}
	var fy = function(y) { return y*scy + dy; };
	
	ctx.moveTo ( fx(coords[0][0]), fy(coords[0][1]) );
	for (var i=1; p=coords[i]; i++) 
	{	ctx.lineTo ( fx(p[0]), fy(p[1]) );
	}
	ctx.lineTo ( fx(coords[0][0]), fy(coords[0][1]) );
};

ol.filter.Clip.prototype.precompose = function(e)
{	if (!this.get("color"))
	{	e.context.save();
		e.context.beginPath();
		this.clipPath_(e);
		e.context.clip();
	}
}

ol.filter.Clip.prototype.postcompose = function(e)
{	if (this.get("color"))
	{	var ctx = e.context;
		var canvas = e.context.canvas;
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(0,0);
		ctx.lineTo(0,canvas.height);
		ctx.lineTo(canvas.width, canvas.height);
		ctx.lineTo(canvas.width, canvas.height);
		ctx.lineTo(canvas.width, 0);
		ctx.lineTo(0, 0);
		this.clipPath_(e);
		ctx.fillStyle = this.get("color");
		ctx.fill("evenodd");
	};
	
	e.context.restore();
}

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Colorize map or layer
* 	@constructor
*	@requires ol.filter
*	@extends {ol.filter.Base}
*	@author Thomas Tilak https://github.com/thhomas
*	@author Jean-Marc Viglino https://github.com/viglino
*	@param {ol.filter.cropOptions}
*		- feature {ol.Feature} feature to mask with
*		- color {Array<integer>} style to fill with
*		- inner {bool} mask inner, default false
*/
ol.filter.Colorize = function(options)
{	ol.filter.Base.call(this, options);

	this.setFilter(options);
}
ol.inherits(ol.filter.Colorize, ol.filter.Base);

ol.filter.Colorize.prototype.setFilter = function(options)
{	options = options || {};
	switch (options)
	{	case "grayscale": options = { operation:'hue', red:0, green:0, blue:0, value:1 }; break;
		case "invert": options = { operation:'difference', red:255, green:255, blue:255, value:1 }; break;
		case "sepia": options = { operation:'color', red:153, green:102, blue:51, value:0.6 }; break;
		default: break;
	}
	var color = options.color ? ol.color.asArray(options.color) : [ options.red, options.green, options.blue, options.value];
	this.set('color', ol.color.asString(color))
	this.set ('value', color[3]||1);
	switch (options.operation)
	{	case 'color':
		case 'hue':
		case 'difference':
		case 'color-dodge':
		case 'enhance':
			this.set ('operation', options.operation);
			break;
		case 'saturation':
			var v = 255*(options.value || 0);
			this.set('color', ol.color.asString([0,0,v,v||1]));
			this.set ('operation', options.operation);
			break;
		case 'luminosity':
			var v = 255*(options.value || 0);
			this.set('color', ol.color.asString([v,v,v,255]));
			//this.set ('operation', 'luminosity')
			this.set ('operation', 'hard-light');
			break;
		case 'contrast':
			var v = 255*(options.value || 0);
			this.set('color', ol.color.asString([v,v,v,255]));
			this.set('operation', 'soft-light');
			break;
		default: 
			this.set ('operation', 'color');
			break;
	}
}

ol.filter.Colorize.prototype.setValue = function(v)
{	this.set ('value', v);
	var c = ol.color.asArray(this.get("color"));
	c[3] = v;
	this.set("color", ol.color.asString(c));
}

ol.filter.Colorize.prototype.setColor = function(c)
{	c = ol.color.asArray(c);
	if (c)
	{	c[3] = this.get("value");
		this.set("color", ol.color.asString(c));
	}
}

ol.filter.Colorize.prototype.precompose = function(e)
{}

ol.filter.Colorize.prototype.postcompose = function(e)
{	// Set back color hue
	var ctx = e.context;
	var canvas = ctx.canvas;
	
	ctx.save();
		if (this.get('operation')=='enhance')
		{	var v = this.get('value');
			if (v)
			{	var w = canvas.width;
				var h = canvas.height;
				ctx.globalCompositeOperation = 'color-burn'
				ctx.globalAlpha = v;
				ctx.drawImage (canvas, 0, 0, w, h);
				ctx.drawImage (canvas, 0, 0, w, h);
				ctx.drawImage (canvas, 0, 0, w, h);
			}
		}
		else
		{	ctx.globalCompositeOperation = this.get('operation');
			ctx.fillStyle = this.get('color');
			ctx.fillRect(0,0,canvas.width,canvas.height);  
		}
	ctx.restore();
}

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Colorize map or layer
* 	@constructor
*	@requires ol.filter
*	@extends {ol.filter.Base}
*	@param {ol.filter.compositeOptions}
*		- operation {string} composite operation
*/
ol.filter.Composite = function(options)
{	ol.filter.Base.call(this, options);

	this.set("operation", options.operation || "source-over");
}
ol.inherits(ol.filter.Composite, ol.filter.Base);

/** Change the current operation
*	@param {string} operation composite function
*/
ol.filter.Composite.prototype.setOperation = function(operation)
{	this.set('operation', operation || "source-over");
}

ol.filter.Composite.prototype.precompose = function(e)
{	var ctx = e.context;
	ctx.save();
	ctx.globalCompositeOperation = this.get('operation');
}

ol.filter.Composite.prototype.postcompose = function(e)
{	e.context.restore();
}

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Crop drawing using an ol.Feature
* 	@constructor
*	@requires ol.filter
*	@requires ol.filter.Mask
*	@extends {ol.filter.Mask}
*	@param {ol.filter.cropOptions}
*		- feature {ol.Feature} feature to crop with
*		- inner {bool} crop inner, default false
*/
ol.filter.Crop = function(options)
{	options = options || {};
	ol.filter.Mask.call(this, options);
}
ol.inherits(ol.filter.Crop, ol.filter.Mask);

ol.filter.Crop.prototype.precompose = function(e)
{	if (!this.feature_) return;
	
	var ctx = e.context;
	ctx.save();
	this.drawFeaturePath_(e, this.get("inner"));
	ctx.clip("evenodd");
}

ol.filter.Crop.prototype.postcompose = function(e)
{	if (this.feature_) e.context.restore();
}

/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Fold filer map 
* 	@constructor
*	@requires ol.filter
*	@extends {ol.filter.Base}
*	@param {ol.filter.foldOptions}
*		- fold {Array<int>} number of fold (horizontal and vertical)
*		- margin {Number} margin in px, default 8
*		- padding {Number} padding in px, default 8
*		- fsize {integer|Array<integer>} fold size in px, default 8,10
*/
ol.filter.Fold = function(options)
{	options = options || {};
	ol.filter.Base.call(this, options);
	
	this.set("fold", options.fold || [8,4]);
	this.set("margin", options.margin || 8);
	this.set("padding", options.padding || 8);
	if (typeof options.fsize == "number") options.fsize = [options.fsize,options.fsize];
	this.set("fsize", options.fsize || [8,10]);
}
ol.inherits(ol.filter.Fold, ol.filter.Base);

ol.filter.Fold.prototype.drawLine_ = function(ctx, d, m)
{	var canvas = ctx.canvas;
	var fold = this.get("fold");
	var w = canvas.width;
	var h = canvas.height;

	ctx.beginPath();
	ctx.moveTo ( m, m );
	for (var i=1; i<=fold[0]; i++)
	{	x = i*w/fold[0] - (i==fold[0] ? m : 0);
		y =  d[1]*(i%2) +m;
		ctx.lineTo ( x, y );
	}
	for (var i=1; i<=fold[1]; i++)
	{	x = w - d[0]*(i%2) - m;
		y = i*h/fold[1] - (i==fold[1] ? d[0]*(fold[0]%2) + m : 0);
		ctx.lineTo ( x, y );
	}
	for (var i=fold[0]; i>0; i--)
	{	x = i*w/fold[0] - (i==fold[0] ? d[0]*(fold[1]%2) + m : 0);
		y = h - d[1]*(i%2) -m;
		ctx.lineTo ( x, y );
	}
	for (var i=fold[1]; i>0; i--)
	{	x = d[0]*(i%2) + m;
		y = i*h/fold[1] - (i==fold[1] ? m : 0);
		ctx.lineTo ( x, y );
	}
	ctx.closePath();
}

ol.filter.Fold.prototype.precompose = function(e)
{	var ctx = e.context;
	var canvas = ctx.canvas;

	var fold = this.get("fold");
	var w = canvas.width;
	var h = canvas.height;
	
	ctx.save();
		ctx.shadowColor = "rgba(0,0,0,0.3)";
		ctx.shadowBlur = 8;
		ctx.shadowOffsetX = 2;
		ctx.shadowOffsetY = 3;
		this.drawLine_(ctx, this.get("fsize"), this.get("margin"));
		ctx.fillStyle="#fff";
		ctx.fill();
		ctx.strokeStyle = "rgba(0,0,0,0.1)";
		ctx.stroke();
	ctx.restore();

	ctx.save();
	this.drawLine_(ctx, this.get("fsize"), this.get("margin") + this.get("padding"));
	ctx.clip();

}

ol.filter.Fold.prototype.postcompose = function(e)
{	var ctx = e.context;
	var canvas = ctx.canvas;

	ctx.restore();
	ctx.save();
		this.drawLine_(ctx, this.get("fsize"), this.get("margin"));
		ctx.clip();
		
		var fold = this.get("fold");
		var w = canvas.width/fold[0];
		var h = canvas.height/fold[1];

		var grd = ctx.createRadialGradient(5*w/8,5*w/8,w/4,w/2,w/2,w);
		grd.addColorStop(0,"transparent");
		grd.addColorStop(1,"rgba(0,0,0,0.2)");
		ctx.fillStyle = grd;
		ctx.scale (1,h/w);
		for (var i=0; i<fold[0]; i++) for (var j=0; j<fold[1]; j++)
		{	ctx.save()
			ctx.translate(i*w, j*w);
			ctx.fillRect(0,0,w,w);
			ctx.restore()
		}
	ctx.restore();
}

/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Make a map or layer look like made of a set of Lego bricks.
* 	@constructor
*	@requires ol.filter
*	@extends {ol.filter.Base}
*	@param {ol.filter.LegoOptions}
*		- brickSize {Number} size of te brick, default 30
*		- crossOrigin {null | string | undefined} crossOrigin attribute for loaded images.
*/
ol.filter.Lego = function(options)
{	if (!options) options = {};
	ol.filter.Base.call(this, options);

	var img = new Image();
	// Default image
	img.src = this.img[options.img] || this.img.ol3;
	img.crossOrigin = options.crossOrigin || null;
	
	// and pattern 
	this.pattern = 
	{	canvas: document.createElement('canvas')
	};
	this.setBrick (options.brickSize, img);
	this.internal_ = document.createElement('canvas');
}
ol.inherits(ol.filter.Lego, ol.filter.Base);

/** Image definition
*/
ol.filter.Lego.prototype.img =
{	brick: "data:image/png;base64,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",
	ol3: "data:image/png;base64,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",
	lego: "data:image/png;base64,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"
};

/** Overwrite to handle brickSize
* @param {string} key
* @param {} val
*/
ol.filter.Lego.prototype.set = function (key, val)
{	ol.filter.Base.prototype.set.call(this, key, val);
	if (key=="brickSize" && this.pattern.canvas.width!=val)
	{	this.setBrick(val);
	}
}

/** Set the current brick
*	@param {Number} width the pattern width, default 30
*	@param {brick|ol3|lego|undefined} img the pattern, default ol3
*	@param {string} crossOrigin
*/
ol.filter.Lego.prototype.setBrick = function (width, img, crossOrigin)
{	width = Number(width) || 30;
	if (typeof(img) === 'string') 
	{	var i = new Image;
		i.src = this.img[img] || this.img.ol3;
		i.crossOrigin = crossOrigin || null;
		img = i;
	}
	if (img) this.pattern.img = img;
	if (!this.pattern.img.width)
	{	var self = this;
		this.pattern.img.onload = function()
		{	self.setBrick(width,img);
		}
		return;
	}
	this.pattern.canvas.width = this.pattern.canvas.height = width;
	this.pattern.ctx = this.pattern.canvas.getContext("2d");
	this.pattern.ctx.fillStyle = this.pattern.ctx.createPattern (this.pattern.img, 'repeat');
	this.set("brickSize", width);
	this.set("img", img.src);
};

/** Get translated pattern
*	@param {number} offsetX x offset
*	@param {number} offsetY y offset
*/
ol.filter.Lego.prototype.getPattern = function (offsetX, offsetY)
{	
	if (!this.pattern.ctx) return "transparent";
	//return this.pattern.ctx.fillStyle

	var c = this.pattern.canvas;
	var ctx = this.pattern.ctx;
	var sc = c.width / this.pattern.img.width;
	
	ctx.save();
		ctx.clearRect(0,0,c.width,c.height);

		ctx.scale(sc,sc);
		offsetX /= sc;
		offsetY /= sc;

		ctx.translate(offsetX, offsetY);
		ctx.beginPath();
		ctx.clearRect(-2*c.width, -2*c.height, 4*c.width, 4*c.height);
		ctx.rect(-offsetX, -offsetY, 2*c.width/sc, 2*c.height/sc);
		ctx.fill(); 
	ctx.restore();
	return ctx.createPattern(c, 'repeat');
};

/** Postcompose operation
*/
ol.filter.Lego.prototype.postcompose = function(e)
{	// Set back color hue
	var ctx = e.context;
	var canvas = ctx.canvas;
	var ratio = e.frameState.pixelRatio;

	ctx.save();

		// resize 
		var step = this.pattern.canvas.width*ratio, step2 = step/2;
		var p = e.frameState.extent;
		var res = e.frameState.viewState.resolution/ratio;
		var offset = [ -Math.round((p[0]/res)%step), Math.round((p[1]/res)%step) ];
		var ctx2 = this.internal_.getContext("2d");
		var w = this.internal_.width = canvas.width;
		var h = this.internal_.height = canvas.height;

		// No smoothing please
		ctx2.webkitImageSmoothingEnabled = false;
		ctx2.mozImageSmoothingEnabled = false;
		ctx2.imageSmoothingEnabled = false;
/**/
		var w2 = Math.floor((w-offset[0])/step);
		var h2 = Math.floor((h-offset[1])/step);
		ctx2.drawImage (canvas, offset[0], offset[1], w2*step, h2*step, 0, 0, w2, h2);
		ctx.webkitImageSmoothingEnabled = false;
		ctx.mozImageSmoothingEnabled = false;
		ctx.imageSmoothingEnabled = false; //future
		ctx.clearRect (0, 0, w,h);
		ctx.drawImage (this.internal_, 0,0, w2,h2, offset[0],offset[1], w2*step, h2*step);
/* /
		for (var x=offset[0]; x<w; x+=step) for (var y=offset[1]; y<h; y+=step)
		{	if (x>=0 && y<h) ctx2.drawImage (canvas, x, y, 1, 1, x, y, step, step);
		}
		ctx.clearRect (0, 0, w,h);
		ctx.drawImage (c, 0, 0);
/**/
		// Draw brick stud
		ctx.scale(ratio,ratio);
		ctx.fillStyle = this.getPattern (offset[0]/ratio, offset[1]/ratio);
		ctx.rect(0,0, w, h);
		ctx.fill(); 

	ctx.restore();
};

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Add texture effects on maps or layers
* 	@constructor
*	@requires ol.filter
*	@extends {ol.filter.Base}
*	@param {ol.filter.cropOptions}
*		- feature {ol.Feature} feature to mask with
*		- fill {ol.style.Fill} style to fill with
*		- inner {bool} mask inner, default false
*/
ol.filter.Texture = function(options)
{	ol.filter.Base.call(this, options);

	this.setFilter(options);
}
ol.inherits(ol.filter.Texture, ol.filter.Base);

/** Set texture
*	@option {ol.filter.TextureOptions}
*		- img {Image | undefined} Image object for the texture
*		- src {string} Image source URI
*		- scale {number} scale to draw the image. Default 1.
*		- rotateWithView {bool} Whether to rotate the texture with the view (may cause animation lags on mobile or slow devices). Default is true.
*		- crossOrigin {null | string | undefined} The crossOrigin attribute for loaded images.
*/
ol.filter.Texture.prototype.setFilter = function(options)
{	var img;
	options = options || {};
	if (options.img) img = option.img;
	else 
	{	img = new Image();
		if (options.src) img.src = ol.filter.Texture[options.src] || options.src;
		img.crossOrigin = options.crossOrigin || null;
	}

	this.set('rotateWithView', options.rotateWithView !== false);
	this.set('opacity', typeof(options.opacity)=='number' ? options.opacity : 1);
	
	this.set('ready', false);
	var self = this;
	function setPattern(img)
	{	self.pattern = {};
		self.pattern.scale = options.scale || 1;
		self.pattern.canvas = document.createElement('canvas');
		self.pattern.canvas.width = img.width * self.pattern.scale;
		self.pattern.canvas.height = img.height * self.pattern.scale;
		self.pattern.canvas.width = img.width;// * self.pattern.scale;
		self.pattern.canvas.height = img.height;// * self.pattern.scale;
		self.pattern.ctx = self.pattern.canvas.getContext("2d");
		self.pattern.ctx.fillStyle = self.pattern.ctx.createPattern(img, 'repeat');
		// Force refresh
		self.set('ready', true);
	};

	if (img.width) 
	{	setPattern(img);
	}
	else
	{	img.onload = function()
		{	setPattern(img);
		}
	}
}

/** Get translated pattern
*	@param {number} x offset
*	@param {number} y offset
*/
ol.filter.Texture.prototype.getPattern = function (offsetX, offsetY)
{	var c = this.pattern.canvas;
	var ctx = this.pattern.ctx;
	ctx.save();
	/*
		offsetX /= this.pattern.scale;
		offsetY /= this.pattern.scale;
		ctx.scale(this.pattern.scale,this.pattern.scale);
	*/
		ctx.translate(-offsetX, offsetY);
		ctx.beginPath();
		ctx.rect(offsetX, -offsetY, c.width, c.height);
		ctx.fill();
	ctx.restore();
	return ctx.createPattern(c, 'repeat');
}

/** Draw pattern over the map on postcompose
*/
ol.filter.Texture.prototype.postcompose = function(e)
{	// not ready
	if (!this.pattern) return;
	
	// Set back color hue
	var ctx = e.context;
	var canvas = ctx.canvas;
	
	var m = 1.5 * Math.max(canvas.width, canvas.height);
	var mt = e.frameState.pixelToCoordinateTransform;
	// Old version (matrix)
	if (!mt)
	{	mt = e.frameState.pixelToCoordinateMatrix,
		mt[2] = mt[4];
		mt[3] = mt[5];
		mt[4] = mt[12];
		mt[5] = mt[13];
	}
	var ratio = e.frameState.pixelRatio;
	var res = e.frameState.viewState.resolution;
	var w = canvas.width/2, 
		h = canvas.height/2;

	ctx.save();

		ctx.globalCompositeOperation = "multiply";
		//ctx.globalCompositeOperation = "overlay";
		//ctx.globalCompositeOperation = "color";
		ctx.globalAlpha = this.get('opacity');
		ctx.scale(ratio*this.pattern.scale,ratio*this.pattern.scale);

		if (this.get('rotateWithView'))
		{	// Translate pattern
			res *= this.pattern.scale
			ctx.fillStyle = this.getPattern ((w*mt[0] + h*mt[1] + mt[4])/res, (w*mt[2] + h*mt[3] + mt[5])/res);

			// Rotate on canvas center and fill
			ctx.translate(w/this.pattern.scale, h/this.pattern.scale);
			ctx.rotate(e.frameState.viewState.rotation);
			ctx.beginPath();
			ctx.rect(-w-m, -h-m, 2*m, 2*m);
			ctx.fill(); 
		}
		else
		{
			/**/
				var dx = -(w*mt[0] + h*mt[1] + mt[4])/res;
				var dy = (w*mt[2] + h*mt[3] + mt[5])/res;
			
				var cos = Math.cos(e.frameState.viewState.rotation);
				var sin = Math.sin(e.frameState.viewState.rotation);
				var offsetX = (dx*cos - dy*sin) / this.pattern.scale;
				var offsetY = (dx*sin + dy*cos) / this.pattern.scale;

				ctx.translate(offsetX, offsetY);
				ctx.beginPath();
				ctx.fillStyle = this.pattern.ctx.fillStyle;
				ctx.rect(-offsetX -m , -offsetY -m, 2*m, 2*m);
				ctx.fill(); 
			/*	//old version without centered rotation
				var offsetX = -(e.frameState.extent[0]/res) % this.pattern.canvas.width;
				var offsetY = (e.frameState.extent[1]/res) % this.pattern.canvas.height;
				ctx.rotate(e.frameState.viewState.rotation);
				ctx.translate(offsetX, offsetY);
				ctx.beginPath();
				ctx.fillStyle = this.pattern.ctx.fillStyle
				ctx.rect(-offsetX -m , -offsetY -m, 2*m, 2*m);
				ctx.fill(); 
			*/
		}

	ctx.restore();
}

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Handles coordinates on the center of the viewport.
 * It can be used as abstract base class used for creating subclasses. 
 * The CenterTouch interaction modifies map browser event coordinate and pixel properties to force pointer on the viewport center to any interaction that them.
 * Only pointermove pointerup are concerned with it.
 * @constructor
 * @extends {ol.interaction.Interaction}
 * @param {olx.interaction.InteractionOptions} options Options
 *  - targetStyle {ol.style.Style|Array<ol.style.Style>} a style to draw the target point, default cross style
 *  - composite {string} composite operation : difference|multiply|xor|screen|overlay|darken|lighter|lighten|...
 */
ol.interaction.CenterTouch = function(options) 
{	options = options || {};
	// Filter event
	var rex = /^pointermove$|^pointerup$/;

	// Default style = cross
	this.targetStyle = options.targetStyle ||
		[	new ol.style.Style({ image: new ol.style.RegularShape ({ points: 4, radius: 11, radius1: 0, radius2: 0, snapToPixel:true, stroke: new ol.style.Stroke({ color: "#fff", width:3 }) }) }),
			new ol.style.Style({ image: new ol.style.RegularShape ({ points: 4, radius: 11, radius1: 0, radius2: 0, snapToPixel:true, stroke: new ol.style.Stroke({ color: "#000", width:1 }) }) })
		];
	if (!(this.targetStyle instanceof Array)) this.targetStyle = [this.targetStyle];
	this.composite = options.composite || '';

	// Interaction to defer center on top of the interaction 
	// this is done to enable other coordinates manipulation inserted after the interaction (snapping)
	this.ctouch = new ol.interaction.Interaction( 
		{	handleEvent: function(e) 
				{	if (rex.test(e.type) && this.getMap()) 
					{	e.coordinate = this.getMap().getView().getCenter();
						e.pixel = this.getMap().getSize();
						e.pixel = [ e.pixel[0]/2, e.pixel[1]/2 ];
					}
					return true; 
				}
		});

	ol.interaction.Interaction.call(this, 
		{	handleEvent: function(e) 
			{	if (rex.test(e.type)) this.pos_ = e.coordinate;
				if (options.handleEvent) return options.handleEvent.call (this,e);
				return true; 
			}
		});
};
ol.inherits(ol.interaction.CenterTouch, ol.interaction.Interaction);

/**
 * Remove the interaction from its current map, if any,  and attach it to a new
 * map, if any. Pass `null` to just remove the interaction from the current map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.interaction.CenterTouch.prototype.setMap = function(map) 
{	if (this.getMap())
	{	this.getMap().removeInteraction(this.ctouch);
		this.getMap().un('postcompose', this.drawTarget_, this);
	}

	ol.interaction.Interaction.prototype.setMap.call (this, map);

	if (this.getMap())
	{	if (this.getActive()) this.getMap().addInteraction(this.ctouch);
		this.getMap().on('postcompose', this.drawTarget_, this);
	}
};

/**
 * Activate or deactivate the interaction.
 * @param {boolean} active Active.
 * @observable
 * @api
 */
ol.interaction.CenterTouch.prototype.setActive = function(b) 
{	ol.interaction.Interaction.prototype.setActive.call (this, b);

	this.pos_ = null;

	if (this.getMap())
	{	if (this.getActive()) 
		{	this.getMap().addInteraction(this.ctouch);
		}
		else this.getMap().removeInteraction(this.ctouch);
	}
	
};

/** Get the position of the target
*/
ol.interaction.CenterTouch.prototype.getPosition = function (e)
{	if (!this.pos_) 
	{	var px =this.getMap().getSize();
		px = [ px[0]/2, px[1]/2 ];
		this.pos_ = this.getMap().getCoordinateFromPixel(px);
	}
	return this.pos_; 
};

/** Draw the target
* @private
*/
ol.interaction.CenterTouch.prototype.drawTarget_ = function (e)
{	if (!this.getMap() || !this.getActive()) return;

	var ctx = e.context;
	var ratio = e.frameState.pixelRatio;

	ctx.save();
	
		var cx = ctx.canvas.width/(2*ratio);
		var cy = ctx.canvas.height/(2*ratio);

		var geom = new ol.geom.Point (this.getMap().getCoordinateFromPixel([cx,cy]));

		if (this.composite) ctx.globalCompositeOperation = this.composite;

		for (var i=0; i<this.targetStyle.length; i++)
		{	var style = this.targetStyle[i];

			if (style instanceof ol.style.Style)
			{	var sc=0;
				// OL < v4.3 : setImageStyle doesn't check retina
				var imgs = ol.Map.prototype.getFeaturesAtPixel ? false : style.getImage();
				if (imgs) 
				{	sc = imgs.getScale(); 
					imgs.setScale(ratio*sc);
				}
				e.vectorContext.setStyle(style);
				e.vectorContext.drawGeometry(geom);
				if (imgs) imgs.setScale(sc);
			}
		}

	ctx.restore();
};

/** Clip interaction to clip layers in a circle
 * @constructor
 * @extends {ol.interaction.Pointer}
 *	@param {ol.interaction.clip.options} flashlight options param
 *		- radius {number} radius of the clip, default 100
 *		- layers {ol.layer|Array<ol.layer>} layers to clip
 */
ol.interaction.Clip = function(options) {

	this.layers_ = [];
	
	ol.interaction.Pointer.call(this, 
	{	handleDownEvent: this.setPosition,
		handleMoveEvent: this.setPosition
	});

	// Default options
	options = options || {};

	this.pos = false;
	this.radius = (options.radius||100);
	if (options.layers) this.addLayer(options.layers);
};
ol.inherits(ol.interaction.Clip, ol.interaction.Pointer);

/** Set the map > start postcompose
*/
ol.interaction.Clip.prototype.setMap = function(map)
{	if (this.getMap()) 
	{	for (var i=0; i<this.layers_.length; i++)
		{	this.layers_[i].un('precompose', this.precompose_, this);
			this.layers_[i].un('postcompose', this.postcompose_, this);
		}
		this.getMap().renderSync();
	}
	
	ol.interaction.Pointer.prototype.setMap.call(this, map);

	if (map)
	{	for (var i=0; i<this.layers_.length; i++)
		{	this.layers_[i].on('precompose', this.precompose_, this);
			this.layers_[i].on('postcompose', this.postcompose_, this);
		}
		map.renderSync();
	}
}

/** Set clip radius
 *	@param {integer} radius
 */
ol.interaction.Clip.prototype.setRadius = function(radius)
{	this.radius = radius;
	if (this.getMap()) this.getMap().renderSync();
}

/** Add a layer to clip
 *	@param {ol.layer|Array<ol.layer>} layer to clip
 */
ol.interaction.Clip.prototype.addLayer = function(layers)
{	if (!(layers instanceof Array)) layers = [layers];
	for (var i=0; i<layers.length; i++)
	{	if (this.getMap())
		{	layers[i].on('precompose', this.precompose_, this);
			layers[i].on('postcompose', this.postcompose_, this);
			this.getMap().renderSync();
		}
		this.layers_.push(layers[i]);
	}
}

/** Remove a layer to clip
 *	@param {ol.layer|Array<ol.layer>} layer to clip
 */
ol.interaction.Clip.prototype.removeLayer = function(layers)
{	if (!(layers instanceof Array)) layers = [layers];
	for (var i=0; i<layers.length; i++)
	{	var k;
		for (k=0; k<this.layers_.length; k++)
		{	if (this.layers_[k]===layers[i]) 
			{	break;
			}
		}
		if (k!=this.layers_.length && this.getMap())
		{	this.layers_.splice(k,1);
			layers[i].un('precompose', this.precompose_, this);
			layers[i].un('postcompose', this.postcompose_, this);
			this.getMap().renderSync();
		}
	}
}

/** Set position of the clip
*	@param {ol.Pixel|ol.MapBrowserEvent}
*/
ol.interaction.Clip.prototype.setPosition = function(e)
{	if (e.pixel) this.pos = e.pixel;
	else 
	{	if (e && e instanceof Array) this.pos = e;
		else e = [-10000000,-10000000];
	}
	if (this.getMap()) this.getMap().renderSync();
}

/* @private
*/
ol.interaction.Clip.prototype.precompose_ = function(e)
{	var ctx = e.context;
	var ratio = e.frameState.pixelRatio;

	ctx.save();
	ctx.beginPath();
	ctx.arc (this.pos[0]*ratio, this.pos[1]*ratio, this.radius*ratio, 0, 2*Math.PI);
	ctx.clip();
}

/* @private
*/
ol.interaction.Clip.prototype.postcompose_ = function(e)
{	e.context.restore();
};

/**
 * Activate or deactivate the interaction.
 * @param {boolean} active Active.
 * @observable
 * @api
 */
ol.interaction.Clip.prototype.setActive = function(b) 
{	ol.interaction.Pointer.prototype.setActive.call (this, b);
	if(b) {
		for(var i=0; i<this.layers_.length; i++) {
			this.layers_[i].on('precompose', this.precompose_, this);
			this.layers_[i].on('postcompose', this.postcompose_, this);
		}
	} else {
		for(var i=0; i<this.layers_.length; i++) {
			this.layers_[i].un('precompose', this.precompose_, this);
			this.layers_[i].un('postcompose', this.postcompose_, this);
		}
	}
	if (this.getMap()) this.getMap().renderSync();
}
/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Interaction rotate
 * @constructor
 * @extends {ol.interaction.Interaction}
 * @fires drawstart, drawing, drawend, drawcancel
 * @param {olx.interaction.TransformOptions} options
 *  @param {Array<ol.Layer>} source Destination source for the drawn features
 *  @param {ol.Collection<ol.Feature>} features Destination collection for the drawn features 
 *	@param {ol.style.Style | Array.<ol.style.Style> | ol.style.StyleFunction | undefined} style style for the sketch
 *	@param {integer} sides number of sides, default 0 = circle
 *	@param { ol.events.ConditionType | undefined } squareCondition A function that takes an ol.MapBrowserEvent and returns a boolean to draw square features.
 *	@param { ol.events.ConditionType | undefined } centerCondition A function that takes an ol.MapBrowserEvent and returns a boolean to draw centered features.
 *	@param { bool } canRotate Allow rotation when centered + square, default: true
 *	@param { number } clickTolerance click tolerance on touch devices, default: 6
 *	@param { number } maxCircleCoordinates Maximum number of point on a circle, default: 100
 */
ol.interaction.DrawRegular = function(options) 
{	if (!options) options={};
	var self = this;

	this.squaredClickTolerance_ = options.clickTolerance ? options.clickTolerance * options.clickTolerance : 36;
	this.maxCircleCoordinates_ = options.maxCircleCoordinates || 100;

	// Collection of feature to transform 
	this.features_ = options.features;
	// List of layers to transform 
	this.source_ = options.source;
	// Square condition
	this.squareFn_ = options.squareCondition;
	// Centered condition
	this.centeredFn_ = options.centerCondition;
	// Allow rotation when centered + square
	this.canRotate_ = (options.canRotate !== false);

	// Number of sides (default=0: circle)
	this.setSides(options.sides);

	// Style
	var white = [255, 255, 255, 1];
	var blue = [0, 153, 255, 1];
	var width = 3;
	var defaultStyle = [
		new ol.style.Style({
			stroke: new ol.style.Stroke({ color: white, width: width + 2 })
		}),
		new ol.style.Style({
			image: new ol.style.Circle({
				radius: width * 2,
				fill: new ol.style.Fill({ color: blue }),
				stroke: new ol.style.Stroke({ color: white, width: width / 2 })
			}),
			stroke: new ol.style.Stroke({ color: blue, width: width }),
			fill: new ol.style.Fill({
				color: [255, 255, 255, 0.5]
			})
		})
	];

	// Create a new overlay layer for the sketch
	this.sketch_ = new ol.Collection();
	this.overlayLayer_ = new ol.layer.Vector(
		{	source: new ol.source.Vector({
				features: this.sketch_,
				useSpatialIndex: false
			}),
			name:'DrawRegular overlay',
			displayInLayerSwitcher: false,
			style: options.style || defaultStyle
		});

	ol.interaction.Interaction.call(this, 
		{	
			/*
			handleDownEvent: this.handleDownEvent_,
			handleMoveEvent: this.handleMoveEvent_,
			handleUpEvent: this.handleUpEvent_,
			*/
			handleEvent: this.handleEvent_
		});
};
ol.inherits(ol.interaction.DrawRegular, ol.interaction.Interaction);

/**
 * Remove the interaction from its current map, if any,  and attach it to a new
 * map, if any. Pass `null` to just remove the interaction from the current map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.interaction.DrawRegular.prototype.setMap = function(map) 
{	if (this.getMap()) this.getMap().removeLayer(this.overlayLayer_);
	ol.interaction.Interaction.prototype.setMap.call (this, map);
	this.overlayLayer_.setMap(map);
};

/**
 * Activate/deactivate the interaction
 * @param {boolean}
 * @api stable
 */
ol.interaction.DrawRegular.prototype.setActive = function(b) 
{	this.reset();
	ol.interaction.Interaction.prototype.setActive.call (this, b);
}

/**
 * Reset the interaction
 * @api stable
 */
ol.interaction.DrawRegular.prototype.reset = function() 
{	this.overlayLayer_.getSource().clear();
	this.started_ = false;
}

/**
 * Set the number of sides.
 * @param {int} number of sides.
 * @api stable
 */
ol.interaction.DrawRegular.prototype.setSides = function (nb)
{	nb = parseInt(nb);
	this.sides_ = nb>2 ? nb : 0;
}

/**
 * Allow rotation when centered + square
 * @param {bool} 
 * @api stable
 */
ol.interaction.DrawRegular.prototype.canRotate = function (b)
{	if (b===true || b===false) this.canRotate_ = b;
	return this.canRotate_;
}

/**
 * Get the number of sides.
 * @return {int} number of sides.
 * @api stable
 */
ol.interaction.DrawRegular.prototype.getSides = function ()
{	return this.sides_;
}

/** Default start angle array for each sides
*/
ol.interaction.DrawRegular.prototype.startAngle =
{	'default':Math.PI/2,
	3: -Math.PI/2,
	4: Math.PI/4
};

/** Get geom of the current drawing
* @return {ol.geom.Polygon | ol.geom.Point}
*/
ol.interaction.DrawRegular.prototype.getGeom_ = function ()
{	this.overlayLayer_.getSource().clear();
	if (!this.center_) return false;

	var g;
	if (this.coord_)
	{	var center = this.center_;
		var coord = this.coord_;

		// Special case: circle
		if (!this.sides_ && this.square_ && !this.centered_){
			center = [(coord[0] + center[0])/2, (coord[1] + center[1])/2];
			var d = [coord[0] - center[0], coord[1] - center[1]];
			var r = Math.sqrt(d[0]*d[0]+d[1]*d[1]);
			var circle = new ol.geom.Circle(center, r, 'XY');
			// Optimize points on the circle
			var centerPx = this.getMap().getPixelFromCoordinate(center);
			var dmax = Math.max (100, Math.abs(centerPx[0]-this.coordPx_[0]), Math.abs(centerPx[1]-this.coordPx_[1]));
			dmax = Math.min ( this.maxCircleCoordinates_, Math.round(dmax / 3 ));
			return ol.geom.Polygon.fromCircle (circle, dmax, 0);
		}
		else {
			var hasrotation = this.canRotate_ && this.centered_ && this.square_;
			var d = [coord[0] - center[0], coord[1] - center[1]];
			if (this.square_ && !hasrotation) 
			{	//var d = [coord[0] - center[0], coord[1] - center[1]];
				var dm = Math.max (Math.abs(d[0]), Math.abs(d[1])); 
				coord[0] = center[0] + (d[0]>0 ? dm:-dm);
				coord[1] = center[1] + (d[1]>0 ? dm:-dm);
			}
			var r = Math.sqrt(d[0]*d[0]+d[1]*d[1]);
			if (r>0)
			{	var circle = new ol.geom.Circle(center, r, 'XY');
				var a;
				if (hasrotation) a = Math.atan2(d[1], d[0]);
				else a = this.startAngle[this.sides_] || this.startAngle['default'];

				if (this.sides_) g = ol.geom.Polygon.fromCircle (circle, this.sides_, a);
				else
				{	// Optimize points on the circle
					var centerPx = this.getMap().getPixelFromCoordinate(this.center_);
					var dmax = Math.max (100, Math.abs(centerPx[0]-this.coordPx_[0]), Math.abs(centerPx[1]-this.coordPx_[1]));
					dmax = Math.min ( this.maxCircleCoordinates_, Math.round(dmax / (this.centered_ ? 3:5) ));
					g = ol.geom.Polygon.fromCircle (circle, dmax, 0);
				}

				if (hasrotation) return g;
			
				// Scale polygon to fit extent
				var ext = g.getExtent();
				if (!this.centered_) center = this.center_;
				else center = [ 2*this.center_[0]-this.coord_[0], 2*this.center_[1]-this.coord_[1] ];
				var scx = (center[0] - coord[0]) / (ext[0] - ext[2]);
				var scy = (center[1] - coord[1]) / (ext[1] - ext[3]);
				if (this.square_) 
				{	var sc = Math.min(Math.abs(scx),Math.abs(scy));
					scx = Math.sign(scx)*sc;
					scy = Math.sign(scy)*sc;
				}
				var t = [ center[0] - ext[0]*scx, center[1] - ext[1]*scy ];
			
				g.applyTransform(function(g1, g2, dim)
				{	for (i=0; i<g1.length; i+=dim)
					{	g2[i] = g1[i]*scx + t[0];
						g2[i+1] = g1[i+1]*scy + t[1];
					}
					return g2;
				});
				return g;
			}
		}
	}

	// No geom => return a point
	return new ol.geom.Point(this.center_);
};

/** Draw sketch
* @return {ol.Feature} The feature being drawn.
*/
ol.interaction.DrawRegular.prototype.drawSketch_ = function(evt)
{	this.overlayLayer_.getSource().clear();
	if (evt)
	{	this.square_ = this.squareFn_ ? this.squareFn_(evt) : evt.originalEvent.shiftKey;
		this.centered_ = this.centeredFn_ ? this.centeredFn_(evt) : evt.originalEvent.metaKey || evt.originalEvent.ctrlKey;
		var g = this.getGeom_();
		if (g) 
		{	var f = this.feature_;
			f.setGeometry (g);
			this.overlayLayer_.getSource().addFeature(f);
			if (this.coord_ && this.square_ && ((this.canRotate_ && this.centered_ && this.coord_) || (!this.sides_ && !this.centered_)))
			{	this.overlayLayer_.getSource().addFeature(new ol.Feature(new ol.geom.LineString([this.center_,this.coord_])));
			}
			return f;
		}
	}
};

/** Draw sketch (Point)
*/
ol.interaction.DrawRegular.prototype.drawPoint_ = function(pt, noclear)
{	if (!noclear) this.overlayLayer_.getSource().clear();
	this.overlayLayer_.getSource().addFeature(new ol.Feature(new ol.geom.Point(pt)));
};


/**
 * @param {ol.MapBrowserEvent} evt Map browser event.
 */
ol.interaction.DrawRegular.prototype.handleEvent_ = function(evt) 
{	switch (evt.type)
	{	case "pointerdown": {
			this.downPx_ = evt.pixel;
			this.start_(evt);
		}
		break;
		case "pointerup":
			// Started and fisrt move
			if (this.started_ && this.coord_)
			{	var dx = this.downPx_[0] - evt.pixel[0];
				var dy = this.downPx_[1] - evt.pixel[1];
				if (dx*dx + dy*dy <= this.squaredClickTolerance_) 
				{	// The pointer has moved
					if ( this.lastEvent == "pointermove" )
					{	this.end_(evt);
					}
					// On touch device there is no move event : terminate = click on the same point
					else
					{	dx = this.upPx_[0] - evt.pixel[0];
						dy = this.upPx_[1] - evt.pixel[1];
						if ( dx*dx + dy*dy <= this.squaredClickTolerance_)
						{	this.end_(evt);
						}
						else 
						{	this.handleMoveEvent_(evt);
							this.drawPoint_(evt.coordinate,true);
						}
					}
				}
			}
			this.upPx_ = evt.pixel;	
		break;
		case "pointerdrag":
			if (this.started_)
			{	var centerPx = this.getMap().getPixelFromCoordinate(this.center_);
				var dx = centerPx[0] - evt.pixel[0];
				var dy = centerPx[1] - evt.pixel[1];
				if (dx*dx + dy*dy <= this.squaredClickTolerance_) 
				{ 	this.reset();
				}
			}
			break;
		case "pointermove":
			if (this.started_)
			{	var dx = this.downPx_[0] - evt.pixel[0];
				var dy = this.downPx_[1] - evt.pixel[1];
				if (dx*dx + dy*dy > this.squaredClickTolerance_) 
				{	this.handleMoveEvent_(evt);
					this.lastEvent = evt.type;
				}
			}
			break;
		default:
			this.lastEvent = evt.type;
			// Prevent zoom in on dblclick
			if (this.started_ && evt.type==='dblclick') 
			{	//evt.stopPropagation();
				return false;
			}
			break;
	}
	return true;
}

/** Stop drawing.
 */
ol.interaction.DrawRegular.prototype.finishDrawing = function() 
{	if (this.started_ && this.coord_)
	{	this.end_({ pixel: this.upPx_, coordinate: this.coord_});
	}
};

/**
 * @param {ol.MapBrowserEvent} evt Event.
 */
ol.interaction.DrawRegular.prototype.handleMoveEvent_ = function(evt) 
{	if (this.started_)
	{	this.coord_ = evt.coordinate;
		this.coordPx_ = evt.pixel;
		var f = this.drawSketch_(evt);
		this.dispatchEvent({ 
			type:'drawing', 
			feature: f, 
			pixel: evt.pixel, 
			startCoordinate: this.center_,
			coordinate: evt.coordinate, 
			square: this.square_, 
			centered: this.centered_ 
		});
	}
	else 
	{	this.drawPoint_(evt.coordinate);
	}
};

/** Start an new draw
 * @param {ol.MapBrowserEvent} evt Map browser event.
 * @return {boolean} `false` to stop the drag sequence.
 */
ol.interaction.DrawRegular.prototype.start_ = function(evt) 
{	if (!this.started_)
	{	this.started_ = true;
		this.center_ = evt.coordinate;
		this.coord_ = null;
		var f = this.feature_ = new ol.Feature();
		this.drawSketch_(evt);
		this.dispatchEvent({ type:'drawstart', feature: f, pixel: evt.pixel, coordinate: evt.coordinate });
	}
	else 
	{	this.coord_ = evt.coordinate;
	}
};

/** End drawing
 * @param {ol.MapBrowserEvent} evt Map browser event.
 * @return {boolean} `false` to stop the drag sequence.
 */
ol.interaction.DrawRegular.prototype.end_ = function(evt) 
{	this.coord_ = evt.coordinate;
	this.started_ = false;
	// Add new feature
	if (this.coord_ && this.center_[0]!=this.coord_[0] && this.center_[1]!=this.coord_[1])
	{	var f = this.feature_;
		f.setGeometry(this.getGeom_());
		if (this.source_) this.source_.addFeature(f);
		else if (this.features_) this.features_.push(f);
		this.dispatchEvent({ type:'drawend', feature: f, pixel: evt.pixel, coordinate: evt.coordinate, square: this.square_, centered: this.centered_ });
	}
	else
	{	this.dispatchEvent({ type:'drawcancel', feature: null, pixel: evt.pixel, coordinate: evt.coordinate, square: this.square_, centered: this.centered_ });
	}

	this.center_ = this.coord_ = null;
	this.drawSketch_();
};
/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Interaction DrawTouch :
 * @constructor
 * @extends {ol.interaction.CenterTouch}
 * @param {olx.interaction.DrawOptions} options
 *	- source {ol.source.Vector | undefined} Destination source for the drawn features.
 *	- type {ol.geom.GeometryType} Drawing type ('Point', 'LineString', 'Polygon') not ('MultiPoint', 'MultiLineString', 'MultiPolygon' or 'Circle'). Required.
 *	- tap {boolean} enable on tap, default true
 *	Inherited params
 *  - targetStyle {ol.style.Style|Array<ol.style.Style>} a style to draw the target point, default cross style
 *  - composite {string} composite operation : difference|multiply|xor|screen|overlay|darken|lighter|lighten|...
 */
ol.interaction.DrawTouch = function(options) 
{	var options = options||{};
	var self = this;

	options.handleEvent = function(e)
	{	if (this.get("tap"))
		{	switch (e.type)
			{	case "singleclick":
					this.addPoint();
					break;
				case "dblclick":
					this.addPoint();
					this.finishDrawing();
					return false;
					break;
				default: break;
			}
		}
		return true;
	}
	ol.interaction.CenterTouch.call(this, options);

	this.typeGeom_ = options.type;
	this.source_ = options.source;
	this.set("tap", (options.tap!==false));

	// Style
	var white = [255, 255, 255, 1];
	var blue = [0, 153, 255, 1];
	var width = 3;
	var defaultStyle = [
		new ol.style.Style({
			stroke: new ol.style.Stroke({ color: white, width: width + 2 })
		}),
		new ol.style.Style({
			image: new ol.style.Circle({
				radius: width * 2,
				fill: new ol.style.Fill({ color: blue }),
				stroke: new ol.style.Stroke({ color: white, width: width / 2 })
			}),
			stroke: new ol.style.Stroke({ color: blue, width: width }),
			fill: new ol.style.Fill({
				color: [255, 255, 255, 0.5]
			})
		})
	];

	this.overlay_ = new ol.layer.Vector(
		{	source: new ol.source.Vector({useSpatialIndex: false }),
			style: defaultStyle
		});

	this.geom_ = [];
	
};
ol.inherits(ol.interaction.DrawTouch, ol.interaction.CenterTouch);

/**
 * Remove the interaction from its current map, if any,  and attach it to a new
 * map, if any. Pass `null` to just remove the interaction from the current map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.interaction.DrawTouch.prototype.setMap = function(map) 
{	if (this.getMap())
	{	this.getMap().un("postcompose", this.drawSketchLink_, this);
	}

	ol.interaction.CenterTouch.prototype.setMap.call (this, map);
	this.overlay_.setMap(map);

	if (this.getMap())
	{	this.getMap().on("postcompose", this.drawSketchLink_, this);
	}
};

/** Start drawing and add the sketch feature to the target layer. 
* The ol.interaction.Draw.EventType.DRAWSTART event is dispatched before inserting the feature.
*/
ol.interaction.DrawTouch.prototype.startDrawing = function()
{	this.geom_ = [];
	this.addPoint();
};

/** Get geometry type
* @return {ol.geom.GeometryType}
*/
ol.interaction.DrawTouch.prototype.getGeometryType = function()
{	return this.typeGeom_;
};

/** Start drawing and add the sketch feature to the target layer. 
* The ol.interaction.Draw.EventType.DRAWEND event is dispatched before inserting the feature.
*/
ol.interaction.DrawTouch.prototype.finishDrawing = function()
{	if (!this.getMap()) return;

	var f;
	switch (this.typeGeom_)
	{	case "LineString":
			if (this.geom_.length > 1) f = new ol.Feature(new ol.geom.LineString(this.geom_));
			break;
		case "Polygon":
			// Close polygon
			if (this.geom_[this.geom_.length-1] != this.geom_[0]) 
			{	this.geom_.push(this.geom_[0]);
			}
			// Valid ?
			if (this.geom_.length > 3) 
			{	f = new ol.Feature(new ol.geom.Polygon([ this.geom_ ]));
			}
			break;
		default: break;
	}
	if (f) this.source_.addFeature (f);

	// reset
	this.geom_ = [];
	this.drawSketch_();
}

/** Add a new Point to the drawing
*/
ol.interaction.DrawTouch.prototype.addPoint = function()
{	if (!this.getMap()) return;

	this.geom_.push(this.getPosition());

	switch (this.typeGeom_)
	{	case "Point": 
			var f = new ol.Feature( new ol.geom.Point (this.geom_.pop()));
			this.source_.addFeature(f);
			break;
		case "LineString":
		case "Polygon":
			this.drawSketch_();
			break;
		default: break;
	}
}

/** Remove last point of the feature currently being drawn.
*/
ol.interaction.DrawTouch.prototype.removeLastPoint = function()
{	if (!this.getMap()) return;
	this.geom_.pop();
	this.drawSketch_();
}

/** Draw sketch
* @private
*/
ol.interaction.DrawTouch.prototype.drawSketch_ = function()
{	this.overlay_.getSource().clear();
	if (this.geom_.length)
	{	var f;
		if (this.typeGeom_ == "Polygon") 
		{	f = new ol.Feature(new ol.geom.Polygon([this.geom_]));
			this.overlay_.getSource().addFeature(f);
		}
		var geom = new ol.geom.LineString(this.geom_);
		f = new ol.Feature(geom);
		this.overlay_.getSource().addFeature(f);
		f = new ol.Feature( new ol.geom.Point (this.geom_.slice(-1).pop()) );
		this.overlay_.getSource().addFeature(f);
	}
}

/** Draw contruction lines on postcompose
* @private
*/
ol.interaction.DrawTouch.prototype.drawSketchLink_ = function(e)
{	if (!this.getActive() || !this.getPosition()) return;

	var ctx = e.context;
	ctx.save();
		var p, pt = this.getMap().getPixelFromCoordinate(this.getPosition());
		var ratio = e.frameState.pixelRatio || 1;
		ctx.scale(ratio,ratio);
		ctx.strokeStyle = "rgba(0, 153, 255, 1)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc (pt[0],pt[1], 5, 0, 2*Math.PI);
		ctx.stroke();
		if (this.geom_.length)
		{	p = this.getMap().getPixelFromCoordinate(this.geom_[this.geom_.length-1]);
			ctx.beginPath();
			ctx.moveTo(p[0],p[1]);
			ctx.lineTo(pt[0],pt[1]);
			if (this.typeGeom_ == "Polygon")
			{	p = this.getMap().getPixelFromCoordinate(this.geom_[0]);
				ctx.lineTo(p[0],p[1]);
			}
			ctx.stroke();
		}
	ctx.restore();
}

/**
 * Activate or deactivate the interaction.
 * @param {boolean} active Active.
 * @observable
 * @api
 */
ol.interaction.DrawTouch.prototype.setActive = function(b) 
{	ol.interaction.CenterTouch.prototype.setActive.call (this, b);

	if (!b) this.geom_ = [];
	this.drawSketch_();
}

/** Extend DragAndDrop choose drop zone + fires loadstart, loadend
 * @require jQuery
 * 
 * @constructor
 * @extends {ol.interaction.DragAndDrop}
 *	@fires loadstart, loadend, addfeatures
 *	@param {ol.dropfile.options} flashlight options param
 *		- zone {string} selector for the drop zone, default document
 *		- projection {ol.projection} default projection of the map
 *		- formatConstructors {Array<function(new:ol.format.Feature)>|undefined} Format constructors, default [ ol.format.GPX, ol.format.GeoJSON, ol.format.IGC, ol.format.KML, ol.format.TopoJSON ]
 *		- accept {Array<string>|undefined} list of eccepted format, default ["gpx","json","geojson","igc","kml","topojson"]
 */
ol.interaction.DropFile = function(options) 
{	options = options||{};

	ol.interaction.DragAndDrop.call(this, {});
	
	var zone = options.zone || document;
	$(zone).on('dragenter', this.onstop );
	$(zone).on('dragover', this.onstop );
	$(zone).on('dragleave', this.onstop );

	// Options
	this.formatConstructors_ = options.formatConstructors || [ ol.format.GPX, ol.format.GeoJSON, ol.format.IGC, ol.format.KML, ol.format.TopoJSON ];
	this.projection_ = options.projection;
	this.accept_ = options.accept || ["gpx","json","geojson","igc","kml","topojson"];

	var self = this;
	$(zone).on('drop', function(e){ return self.ondrop(e.originalEvent); });
};
ol.inherits(ol.interaction.DropFile, ol.interaction.DragAndDrop);

/** Set the map 
*/
ol.interaction.DropFile.prototype.setMap = function(map)
{	ol.interaction.Interaction.prototype.setMap.call(this, map);
};

/** Do somthing when over
*/
ol.interaction.DropFile.prototype.onstop = function(e) 
{	e.preventDefault();
	e.stopPropagation();
	return false;
}

/** Do somthing when over
*/
ol.interaction.DropFile.prototype.ondrop = function(e) 
{	if (e.dataTransfer && e.dataTransfer.files.length)
	{	var self = this;
		e.preventDefault();
		e.stopPropagation();
		// fetch FileList object
		var files = e.dataTransfer.files; // e.originalEvent.target.files ?
		// process all File objects
		var file;
		var pat = /\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/;
		for (var i=0; file=files[i]; i++) 
		{	var ex = file.name.match(pat)[0];
			self.dispatchEvent({ type:'loadstart', file: file, filesize: file.size, filetype: file.type, fileextension: ex, projection: projection, target: self });
						
			// Load file
			features = [];
			var reader = new FileReader();
			var projection = this.projection_ || this.getMap().getView().getProjection();
			var formatConstructors = this.formatConstructors_

			if (!projection) return;
			function tryReadFeatures (format, result, options)
			{	try 
				{	return format.readFeatures(result, options);
				} catch (e) {}
			}
			var theFile = file;
			reader.onload = function(e)
			{	var result = e.target.result;
				
				var features = [];
				var i, ii;
				for (i = 0, ii = formatConstructors.length; i < ii; ++i) 
				{	var formatConstructor = formatConstructors[i];
					var format = new formatConstructor();
					features = tryReadFeatures(format, result, { featureProjection: projection });
					if (features && features.length > 0) 
					{	self.dispatchEvent({ type:'addfeatures', features: features, file: theFile, projection: projection, target: self });
						self.dispatchEvent({ type:'loadend', features: features, file: theFile, projection: projection, target: self });
						return;
					}
				}
				self.dispatchEvent({ type:'loadend', file: theFile, target: self });
			};
			reader.readAsText(file);
		};
	}
    else {}
    return false;
};

/**
 * @constructor
 * @extends {ol.interaction.Pointer}
 *	@param {ol.flashlight.options} flashlight options param
 *		- color {ol.Color} light color, default transparent
 *		- fill {ol.Color} fill color, default rgba(0,0,0,0.8)
 *		- radius {number} radius of the flash
 */
ol.interaction.Flashlight = function(options) {

	ol.interaction.Pointer.call(this, 
	{	handleDownEvent: this.setPosition,
		handleMoveEvent: this.setPosition
	});

	// Default options
	options = options||{};

	this.pos = false;
	
	this.radius = (options.radius||100);
	
	this.setColor(options);

};
ol.inherits(ol.interaction.Flashlight, ol.interaction.Pointer);

/** Set the map > start postcompose
*/
ol.interaction.Flashlight.prototype.setMap = function(map)
{	if (this.getMap()) 
	{	this.getMap().un('postcompose', this.postcompose_, this);
		this.getMap().render();
	}
	
	ol.interaction.Pointer.prototype.setMap.call(this, map);

	if (map)
	{	map.on('postcompose', this.postcompose_, this);
	}
}

/** Set flashlight radius
 *	@param {integer} radius
 */
ol.interaction.Flashlight.prototype.setRadius = function(radius)
{	this.radius = radius
	if (this.getMap()) this.getMap().renderSync();
}

/** Set flashlight color
 *	@param {ol.flashlight.options} flashlight options param
 *		- color {ol.Color} light color, default transparent
 *		- fill {ol.Color} fill color, default rgba(0,0,0,0.8)
 */
ol.interaction.Flashlight.prototype.setColor = function(options)
{	// Backcolor
	var color = (options.fill ? options.fill : [0,0,0,0.8]);
	var c = ol.color.asArray(color);
	this.startColor = ol.color.asString(c);
	// Halo color
	var endColor;
	if (options.color)
	{	c = this.endColor = ol.color.asString(ol.color.asArray(options.color)||options.color);
	}
	else 
	{	c[3] = 0
		this.endColor = ol.color.asString(c);
	}
	c[3] = 0.1;
	this.midColor = ol.color.asString(c);
	if (this.getMap()) this.getMap().renderSync();
}

/** Set position of the flashlight
*	@param {ol.Pixel|ol.MapBrowserEvent}
*/
ol.interaction.Flashlight.prototype.setPosition = function(e)
{	if (e.pixel) this.pos = e.pixel;
	else this.pos = e;
	if (this.getMap()) 
	{	this.getMap().renderSync();
	}
}

/** Postcompose function
*/
ol.interaction.Flashlight.prototype.postcompose_ = function(e)
{	var ctx = e.context;
	var ratio = e.frameState.pixelRatio;
	var w = ctx.canvas.width;
	var h = ctx.canvas.height;
	ctx.save();
	ctx.scale(ratio,ratio);
	
	if (!this.pos) 
	{	ctx.fillStyle = this.startColor;
		ctx.fillRect( 0,0,w,h );
	}
	else
	{	var d = Math.max(w, h);
		// reveal wherever we drag
		var radGrd = ctx.createRadialGradient( this.pos[0], this.pos[1], w*this.radius/d, this.pos[0], this.pos[1], h*this.radius/d );
		radGrd.addColorStop(   0, this.startColor );
		radGrd.addColorStop( 0.8, this.midColor );
		radGrd.addColorStop(   1, this.endColor );
		ctx.fillStyle = radGrd;
		ctx.fillRect( this.pos[0] - d, this.pos[1] - d, 2*d, 2*d );
	}
	ctx.restore();
};
/** Interaction to draw on the current geolocation
 *	It combines a draw with a ol.Geolocation
 * @constructor
 * @extends {ol.interaction.Interaction}
 * @fires drawstart, drawend, drawing, tracking, follow
 * @param {olx.interaction.GeolocationDrawOption} options
 *	@param { ol.Collection.<ol.Feature> | undefined } option.features Destination collection for the drawn features.
 *	@param { ol.source.Vector | undefined } options.source Destination source for the drawn features.
 *	@param {ol.geom.GeometryType} options.type Drawing type ('Point', 'LineString', 'Polygon'). Required.
 *	@param {Number | undefined} options.minAccuracy minimum accuracy underneath a new point will be register (if no condition), default 20
 *	@param {function | undefined} options.condition a function that take a ol.Geolocation object and return a boolean to indicate whether location should be handled or not, default return true if accuraty < minAccuraty
 *	@param {Object} options.attributes a list of attributes to register as Point properties: {accuracy:true,accuracyGeometry:true,heading:true,speed:true}, default none.
 *	@param {Number} options.tolerance tolerance to add a new point (in projection unit), use ol.geom.LineString.simplify() method, default 5
 *	@param {Number} options.zoom zoom for tracking, default 16
 *	@param {boolean|auto|position|visible} options.followTrack true if you want the interaction to follow the track on the map, default true
 *	@param { ol.style.Style | Array.<ol.style.Style> | ol.StyleFunction | undefined } options.style Style for sketch features.
 */
ol.interaction.GeolocationDraw = function(options) 
{	if (!options) options={};
	var self = this;

	// Geolocation
	var geoloc = this.geolocation = new ol.Geolocation(/** @type {olx.GeolocationOptions} */ 
	({	projection: "EPSG:4326",
		trackingOptions: 
		{	maximumAge: 10000,
			enableHighAccuracy: true,
			timeout: 600000
		}
	}));
	this.geolocation.on('change', this.draw_, this);

	// Current path
	this.path_ = [];
	this.lastPosition_ = false;

	// Default style
	var white = [255, 255, 255, 1];
	var blue = [0, 153, 255, 1];
	var width = 3;
	var circle = new ol.style.Circle(
		{	radius: width * 2,
			fill: new ol.style.Fill({ color: blue }),
			stroke: new ol.style.Stroke({ color: white, width: width / 2 })
		});
	var style = 
	[	new ol.style.Style(
		{	stroke: new ol.style.Stroke({ color: white, width: width + 2 })
		}),
		new ol.style.Style(
		{	stroke: new ol.style.Stroke({ color: blue, width: width }),
			fill: new ol.style.Fill({
				color: [255, 255, 255, 0.5]
			})
		})
	];
	var triangle = new ol.style.RegularShape(
		{	radius: width * 3.5,
			points: 3,
			rotation: 0,
			fill: new ol.style.Fill({ color: blue }),
			stroke: new ol.style.Stroke({ color: white, width: width / 2 })
		});
	// stretch the symbol
	var c = triangle.getImage();
	var ctx = c.getContext("2d");
		var c2 = document.createElement('canvas');
		c2.width = c2.height = c.width;
		c2.getContext("2d").drawImage(c, 0,0);
	ctx.clearRect(0,0,c.width,c.height);
	ctx.drawImage(c2, 0,0, c.width, c.height, width, 0, c.width-2*width, c.height);

	var defaultStyle = function(f)
	{	if (f.get('heading')===undefined)
		{	style[1].setImage(circle);
		}
		else 
		{	style[1].setImage(triangle);
			triangle.setRotation( f.get('heading') || 0);
		}
		return style;
	}
	// Style for the accuracy geometry
	this.locStyle = 
		{	error: new ol.style.Style({ fill: new ol.style.Fill({ color: [255, 0, 0, 0.2] }) }),
			warn: new ol.style.Style({ fill: new ol.style.Fill({ color: [255, 192, 0, 0.2] }) }),
			ok: new ol.style.Style({ fill: new ol.style.Fill({ color: [0, 255, 0, 0.2] }) }),
		};

	// Create a new overlay layer for the sketch
	this.overlayLayer_ = new ol.layer.Vector(
	{	source: new ol.source.Vector(),
		name:'GeolocationDraw overlay',
		style: options.style || defaultStyle
	});

	this.sketch_ = [new ol.Feature(), new ol.Feature(), new ol.Feature()];
	this.overlayLayer_.getSource().addFeatures(this.sketch_);

	this.features_ = options.features;
	this.source_ = options.source;

	this.condition_ = options.condition || function(loc) { return loc.getAccuracy() < this.get("minAccuracy") };

	// Prevent interaction when tracking
	ol.interaction.Interaction.call(this, 
	{	handleEvent: function()
		{	return (!this.get('followTrack') || this.get('followTrack')=='auto');//  || !geoloc.getTracking());
		}
	});

	this.set("type", options.type||"LineString");
	this.set("attributes", options.attributes||{});
	this.set("minAccuracy", options.minAccuracy||20);
	this.set("tolerance", options.tolerance||5);
	this.set("zoom", options.zoom);
	this.setFollowTrack (options.followTrack===undefined ? true : options.followTrack);

	this.setActive(false);
};
ol.inherits(ol.interaction.GeolocationDraw, ol.interaction.Interaction);

/**
 * Remove the interaction from its current map, if any,  and attach it to a new
 * map, if any. Pass `null` to just remove the interaction from the current map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.interaction.GeolocationDraw.prototype.setMap = function(map) 
{	if (this.getMap()) this.getMap().removeLayer(this.overlayLayer_);
	ol.interaction.Pointer.prototype.setMap.call (this, map);
	this.overlayLayer_.setMap(map);
	if (map) this.geolocation.setProjection(map.getView().getProjection());
};

/** Activate or deactivate the interaction.
* @param {boolean} active
*/
ol.interaction.GeolocationDraw.prototype.setActive = function(active)
{	ol.interaction.Interaction.prototype.setActive.call(this, active);
	this.overlayLayer_.setVisible(active);
	if (this.getMap())
	{	this.geolocation.setTracking(active);
		this.getMap().renderSync();
	}
	this.pause(!active);
	if (active)
	{	// Start drawing
		this.reset();
		this.dispatchEvent({ type:'drawstart', feature: this.sketch_[1]});
	}
	else
	{	var f = this.sketch_[1].clone();
		if (f.getGeometry())
		{	if (this.features_) this.features_.push(f);
			if (this.source_) this.source_.addFeature(f);
			this.dispatchEvent({ type:'drawend', feature: f});
		}
	}
};

/** Reset drawing
*/
ol.interaction.GeolocationDraw.prototype.reset = function()
{	this.sketch_[1].setGeometry();
	this.path_ = [];
	this.lastPosition_ = false;
};

/** Start tracking = setActive(true)
*/
ol.interaction.GeolocationDraw.prototype.start = function()
{	this.setActive(true);
};

/** Stop tracking = setActive(false)
*/
ol.interaction.GeolocationDraw.prototype.stop = function()
{	this.setActive(false);
};

/** Pause drawing
* @param {boolean} b 
*/
ol.interaction.GeolocationDraw.prototype.pause = function(b)
{	this.pause_ = b!==false;
};

/** Enable following the track on the map
* @param {boolean|auto|position|visible} follow, 
*	false: don't follow, 
*	true: follow (position+zoom), 
*	'position': follow only position,
*	'auto': start following until user move the map,
*	'visible': center when position gets out of the visible extent
*/
ol.interaction.GeolocationDraw.prototype.setFollowTrack = function(follow)
{	this.set('followTrack', follow);
	var map = this.getMap();
	// Center if wanted
	if (follow !== false && !this.lastPosition_ && map) 
	{	var pos = this.path_[this.path_.length-1];
		if (pos)
		{	map.getView().animate({
				center: pos,
				zoom: (follow!="position" ? this.get("zoom") : undefined)
			})
		}
	}
	this.lastPosition_ = false;				
	this.dispatchEvent({ type:'follow', following: follow!==false });
};

/** Add a new point to the current path
* @private
*/
ol.interaction.GeolocationDraw.prototype.draw_ = function(active)
{	var map = this.getMap();
	if (!map) return;

	// Current location
	var loc = this.geolocation;
	var accu = loc.getAccuracy();
	var pos = loc.getPosition();
	pos.push (Math.round((loc.getAltitude()||0)*100)/100);
	pos.push (Math.round((new Date()).getTime()/1000));
	var p = loc.getAccuracyGeometry();

	// Center on point
	// console.log(this.get('followTrack'))
	switch (this.get('followTrack'))
	{	// Follow center + zoom
		case true:
			// modify zoom
			if (this.get('followTrack') == true) 
			{	map.getView().setZoom( this.get("zoom") || 16 );
				if (!ol.extent.containsExtent(map.getView().calculateExtent(map.getSize()), p.getExtent()))
				{	map.getView().fit(p.getExtent());
				}
			}
		// Follow  position 
		case 'position':
			// modify center
			map.getView().setCenter( pos );
		break;
		// Keep on following 
		case 'auto':
			if (this.lastPosition_)
			{	var center = map.getView().getCenter();
				// console.log(center,this.lastPosition_)
				if (center[0]!=this.lastPosition_[0] || center[1]!=this.lastPosition_[1])
				{	//this.dispatchEvent({ type:'follow', following: false });
					this.setFollowTrack (false);
				}
				else 
				{	map.getView().setCenter( pos );	
					this.lastPosition_ = pos;
				}
			}
			else 
			{	map.getView().setCenter( pos );	
				if (this.get("zoom")) map.getView().setZoom( this.get("zoom") );
				this.lastPosition_ = pos;
			}
		break;
		// Force to stay on the map
		case 'visible':
			if (!ol.extent.containsCoordinate(map.getView().calculateExtent(map.getSize()), pos))
			{	map.getView().setCenter (pos);
			}
		break;
		// Don't follow
		default: break;
	}
	
	// Draw occuracy
	var f = this.sketch_[0];
	f.setGeometry(p);
	if (accu < this.get("minAccuracy")/2) f.setStyle(this.locStyle.ok);
	else if (accu < this.get("minAccuracy")) f.setStyle(this.locStyle.warn);
	else f.setStyle(this.locStyle.error);

	var geo;
	if (!this.pause_ && this.condition_.call(this, loc))
	{	f = this.sketch_[1];
		this.path_.push(pos);
		switch (this.get("type"))
		{	case "Point":
				this.path_ = [pos];
				f.setGeometry(new ol.geom.Point(pos, 'XYZM'));
				var attr = this.get('attributes');
				if (attr.heading) f.set("heading",loc.getHeading());
				if (attr.accuracy) f.set("accuracy",loc.getAccuracy());
				if (attr.altitudeAccuracy) f.set("altitudeAccuracy",loc.getAltitudeAccuracy());
				if (attr.speed) f.set("speed",loc.getSpeed());
				break;
			case "LineString":
				if (this.path_.length>1)
				{	geo = new ol.geom.LineString(this.path_, 'XYZM');
					geo.simplify (this.get("tolerance"));
					f.setGeometry(geo);
				}
				else f.setGeometry();
				break;
			case "Polygon":
				if (this.path_.length>2)
				{	geo = new ol.geom.Polygon([this.path_], 'XYZM');
					geo.simplify (this.get("tolerance"));
					f.setGeometry(geo);
				}
				else f.setGeometry();
				break;
		}
		this.dispatchEvent({ type:'drawing', feature: this.sketch_[1], geolocation: loc });
	}
	this.sketch_[2].setGeometry(new ol.geom.Point(pos));
	this.sketch_[2].set("heading",loc.getHeading());
	// Drawing
	this.dispatchEvent({ type:'tracking', feature: this.sketch_[1], geolocation: loc });
};

/** Interaction hover do to something when hovering a feature
 * @constructor
 * @extends {ol.interaction.Interaction}
 * @fires hover, enter, leave
 * @param {olx.interaction.HoverOptions} 
 *	- cursor { string | undefined } css cursor propertie or a function that gets a feature, default: none
 *	- featureFilter {function | undefined} filter a function with two arguments, the feature and the layer of the feature. Return true to select the feature 
 *	- layerFilter {function | undefined} filter a function with one argument, the layer to test. Return true to test the layer
 *	- handleEvent { function | undefined } Method called by the map to notify the interaction that a browser event was dispatched to the map. The function may return false to prevent the propagation of the event to other interactions in the map's interactions chain.
*/
ol.interaction.Hover = function(options) 
{	if (!options) options={};
	var self = this;

	ol.interaction.Interaction.call(this, 
	{	handleEvent: function(e)
		{	if (e.type=="pointermove") { self.handleMove_(e); }; 
			if (options.handleEvent) return options.handleEvent(e);
			return true; 
		}
	});

	this.setFeatureFilter (options.featureFilter);
	this.setLayerFilter (options.layerFilter);
	this.setCursor (options.cursor);
};
ol.inherits(ol.interaction.Hover, ol.interaction.Interaction);

/**
 * Remove the interaction from its current map, if any,  and attach it to a new
 * map, if any. Pass `null` to just remove the interaction from the current map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.interaction.Hover.prototype.setMap = function(map) 
{	if (this.previousCursor_!==undefined && this.getMap())
	{	this.getMap().getTargetElement().style.cursor = this.previousCursor_;
		this.previousCursor_ = undefined;
	}
	ol.interaction.Interaction.prototype.setMap.call (this, map);
};

/**
 * Set cursor on hover
 * @param { string } cursor css cursor propertie or a function that gets a feature, default: none
 * @api stable
 */
ol.interaction.Hover.prototype.setCursor = function(cursor) 
{	if (!cursor && this.previousCursor_!==undefined && this.getMap())
	{	this.getMap().getTargetElement().style.cursor = this.previousCursor_;
		this.previousCursor_ = undefined;
	}
	this.cursor_ = cursor;
};

/** Feature filter to get only one feature
* @param {function} filter a function with two arguments, the feature and the layer of the feature. Return true to select the feature 
*/
ol.interaction.Hover.prototype.setFeatureFilter = function(filter) 
{	if (typeof (filter) == 'function') this.featureFilter_ = filter;
	else this.featureFilter_ = function(){ return true; };
};

/** Feature filter to get only one feature
* @param {function} filter a function with one argument, the layer to test. Return true to test the layer
*/
ol.interaction.Hover.prototype.setLayerFilter = function(filter) 
{	if (typeof (filter) == 'function') this.layerFilter_ = filter;
	else this.layerFilter_ = function(){ return true; };
};

/** Get features whenmove
* @param {ol.event} e "move" event
*/
ol.interaction.Hover.prototype.handleMove_ = function(e) 
{	var map = this.getMap();
	if (map)
	{	//var b = map.hasFeatureAtPixel(e.pixel);
		var feature, layer;
		var self = this;
		var b = map.forEachFeatureAtPixel(e.pixel, 
					function(f, l)
					{	if (self.layerFilter_.call(null, l) 
						 && self.featureFilter_.call(null,f,l))
						{	feature = f;
							layer = l;
							return true;
						}
						else 
						{	feature = layer = null;
							return false;
						}
					});

		if (b) this.dispatchEvent({ type:"hover", feature:feature, layer:layer, coordinate:e.coordinate, pixel: e.pixel, map: e.map, dragging:e.dragging });

		if (this.feature_===feature && this.layer_===layer)
		{	
		}
		else
		{	this.feature_ = feature;
			this.layer_ = layer;
			if (feature) this.dispatchEvent({ type:"enter", feature:feature, layer:layer, coordinate:e.coordinate, pixel: e.pixel, map: e.map, dragging:e.dragging });
			else this.dispatchEvent({ type:"leave", coordinate:e.coordinate, pixel: e.pixel, map: e.map, dragging:e.dragging });
		}

		if (this.cursor_) 
		{	var style = map.getTargetElement().style;
			if (b) 
			{	if (style.cursor != this.cursor_) 
				{	this.previousCursor_ = style.cursor;
					style.cursor = this.cursor_;
				}
			} 
			else if (this.previousCursor_ !== undefined) 
			{	style.cursor = this.previousCursor_;
				this.previousCursor_ = undefined;
			}
		}
	}
};
/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Interaction draw hole
 * @constructor
 * @extends {ol.interaction.Interaction}
 * @fires drawstart, drawend
 * @param {olx.interaction.DrawHoleOptions} options extend olx.interaction.DrawOptions
 * 	@param {Array<ol.layer.Vector> | undefined} options.layers A list of layers from which polygons should be selected. Alternatively, a filter function can be provided. default: all visible layers
 */
ol.interaction.DrawHole = function(options) 
{	if (!options) options = {};
	var self = this;

	// Select interaction for the current feature
	this._select = new ol.interaction.Select();
	this._select.setActive(false);

	// Geometry function that test points inside the current
	var geometryFn, geomFn = options.geometryFunction;
	if (geomFn)
	{	geometryFn = function(c,g) 
		{ 	g = self._geometryFn (c, g);
			return geomFn (c,g);
		}
	}
	else
	{	geometryFn = function(c,g) { return self._geometryFn (c, g); }
	}

	// Create draw interaction
	options.type = "Polygon";
	options.geometryFunction = geometryFn;
	ol.interaction.Draw.call(this, options);

	// Layer filter function
	if (options.layers) 
	{	if (typeof (options.layers) === 'function') this.layers_ = options.layers;
		else if (options.layers.indexOf) 
		{	this.layers_ = function(l) 
			{ return (options.layers.indexOf(l) >= 0); 
			};
		}
	}

	// Start drawing if inside a feature
	this.on('drawstart', this._startDrawing, this );
	// End drawing add the hole to the current Polygon
	this.on('drawend', this._finishDrawing, this);
};
ol.inherits(ol.interaction.DrawHole, ol.interaction.Draw);

/**
 * Remove the interaction from its current map, if any,  and attach it to a new
 * map, if any. Pass `null` to just remove the interaction from the current map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.interaction.DrawHole.prototype.setMap = function(map) 
{	if (this.getMap()) this.getMap().removeInteraction(this._select);
	if (map) map.addInteraction(this._select);
	ol.interaction.Draw.prototype.setMap.call (this, map);
};

/**
 * Activate/deactivate the interaction
 * @param {boolean}
 * @api stable
 */
ol.interaction.DrawHole.prototype.setActive = function(b) 
{	this._select.getFeatures().clear();
	ol.interaction.Draw.prototype.setActive.call (this, b);
};

/**
 * Remove last point of the feature currently being drawn 
 * (test if points to remove before).
 */
ol.interaction.DrawHole.prototype.removeLastPoint = function()
{	if (this._feature && this._feature.getGeometry().getCoordinates()[0].length>2) 
	{	ol.interaction.Draw.prototype.removeLastPoint.call(this);
	}
};

/** 
 * Get the current polygon to hole
 * @return {ol.Feature}
 */
ol.interaction.DrawHole.prototype.getPolygon = function()
{	return this._select.getFeatures().item(0);
};

/**
 * Get current feature to add a hole and start drawing
 * @param {ol.interaction.Draw.Event} e
 * @private
 */
ol.interaction.DrawHole.prototype._startDrawing = function(e)
{	var map = this.getMap();
	var layersFilter = this.layers_;
	this._feature = e.feature;
	coord = e.feature.getGeometry().getCoordinates()[0][0];
	// Check object under the pointer
	var features = map.getFeaturesAtPixel(
		map.getPixelFromCoordinate(coord),
		{ 	layerFilter: layersFilter
		}
	);
	var current = null;
	if (features)
	{	if (features[0].getGeometry().getType() !== "Polygon") current = null;
		else if (features[0].getGeometry().intersectsCoordinate(coord)) current = features[0];
		else current = null;
	}
	else current = null;
	
	if (!current)
	{	this.setActive(false);
		this.setActive(true);
		this._select.getFeatures().clear();
	}
	else
	{	this._select.getFeatures().push(current);
	}
};

/**
 * Stop drawing and add the sketch feature to the target feature. 
 * @param {ol.interaction.Draw.Event} e
 * @private
 */
ol.interaction.DrawHole.prototype._finishDrawing = function(e)
{	var c = e.feature.getGeometry().getCoordinates()[0];
	if (c.length > 3) this.getPolygon().getGeometry().appendLinearRing(new ol.geom.LinearRing(c));
	this._feature = null;
	this._select.getFeatures().clear();
};

/**
 * Function that is called when a geometry's coordinates are updated.
 * @param {Array<ol.coordinate>} coordinates
 * @param {ol.geom.Polygon} geometry
 * @return {ol.geom.Polygon}
 * @private
 */
ol.interaction.DrawHole.prototype._geometryFn = function(coordinates, geometry)
{	var coord = coordinates[0].pop();
	if (!this.getPolygon() || this.getPolygon().getGeometry().intersectsCoordinate(coord))
	{	this.lastOKCoord = [coord[0],coord[1]];
	}
	coordinates[0].push([this.lastOKCoord[0],this.lastOKCoord[1]]);

	if (geometry) 
	{	geometry.setCoordinates([coordinates[0].concat([coordinates[0][0]])]);
	} 
	else 
	{	geometry = new ol.geom.Polygon(coordinates);
	}
	return geometry;
};
/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Interaction to handle longtouch events
 * @constructor
 * @extends {ol.interaction.Interaction}
 * @param {olx.interaction.LongTouchOptions} 
 * 	@param {function | undefined} options.handleLongTouchEvent Function handling "longtouch" events, it will receive a mapBrowserEvent.
 *	@param {interger | undefined} options.delay The delay for a long touch in ms, default is 1000
 */
ol.interaction.LongTouch = function(options) 
{	if (!options) options = {};

	this.delay_ = options.delay || 1000;
	var ltouch = options.handleLongTouchEvent || function(){};
	
	var _timeout = null;
	ol.interaction.Interaction.call(this, 
	{	handleEvent: function(e)
		{	if (this.getActive())
			{	switch (e.type)
				{	case 'pointerdown': 
						if (_timeout) clearTimeout(_timeout);
						_timeout = setTimeout (function()
							{	e.type = "longtouch";
								ltouch(e) 
							}, this.delay_);
						break;
					/* case 'pointermove': */
					case 'pointerdrag':
					case 'pointerup':
						if (_timeout) 
						{	clearTimeout(_timeout);
							_timeout = null;
						}
						break;
					default: break;;
				}
			}
			else
			{	if (_timeout) 
				{	clearTimeout(_timeout);
					_timeout = null;
				}
			}
			return true;
		}
	});

};
ol.inherits(ol.interaction.LongTouch, ol.interaction.Interaction);

/*	
	Water ripple effect.
	Original code (Java) by Neil Wallis 
	@link http://www.neilwallis.com/java/water.html
	
	Original code (JS) by Sergey Chikuyonok (serge.che@gmail.com)
	@link http://chikuyonok.ru
	@link http://media.chikuyonok.ru/ripple/

	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
	@link https://github.com/Viglino
 */
 /**
 * @constructor
 * @extends {ol.interaction.Pointer}
 *	@param {ol.flashlight.options} flashlight options param
 *		- color {ol.Color} light color, default transparent
 *		- fill {ol.Color} fill color, default rgba(0,0,0,0.8)
 *		- radius {number} radius of the flash
 */
ol.interaction.Ripple = function(options) 
{
	ol.interaction.Pointer.call(this, 
	{	handleDownEvent: this.rainDrop,
		handleMoveEvent: this.rainDrop
	});

	// Default options
	options = options||{};

	this.riprad = options.radius || 3;

	this.ripplemap = [];
    this.last_map = [];
    
    // Generate random ripples
    this.interval = options.interval;
	this.rains (this.interval);
};
ol.inherits(ol.interaction.Ripple, ol.interaction.Pointer);

/** Set the map > start postcompose
*/
ol.interaction.Ripple.prototype.setMap = function(map)
{	if (this.oncompose)
	{	ol.Observable.unByKey(oncompose);
		if (this.getMap()) this.getMap().render();
	}
	
	ol.interaction.Pointer.prototype.setMap.call(this, map);

	if (map)
	{	this.oncompose = map.on('postcompose', this.postcompose_, this);
	}
}

/** Generate random rain drop
*	@param {integer} interval
*/
ol.interaction.Ripple.prototype.rains = function(interval)
{	if (this.onrain) clearTimeout (this.onrain);
	var self = this;
	vdelay = (typeof(interval)=="number" ? interval : 1000)/2;
	delay = 3*vdelay/2;
	var rnd = Math.random;
	function rain() 
	{	if (self.width) self.rainDrop([rnd() * self.width, rnd() * self.height]);
		self.onrain = setTimeout (rain, rnd()*vdelay + delay);
	};
	// Start raining
	if (delay) rain();
}

/** Disturb water at specified point
*	@param {ol.Pixel|ol.MapBrowserEvent}
*/
ol.interaction.Ripple.prototype.rainDrop = function(e)
{	if (!this.width) return;
	var dx,dy;
	if (e.pixel) 
	{	dx = e.pixel[0]*this.ratio;
		dy = e.pixel[1]*this.ratio;
	}
	else 
	{	dx = e[0]*this.ratio;
		dy = e[1]*this.ratio;
	}
	dx <<= 0;
    dy <<= 0;
    
    for (var j = dy - this.riprad*this.ratio; j < dy + this.riprad*this.ratio; j++) 
	{   for (var k = dx - this.riprad*this.ratio; k < dx + this.riprad*this.ratio; k++) 
		{   this.ripplemap[this.oldind + (j * this.width) + k] += 128;
        }
    }
}

/** Postcompose function
*/
ol.interaction.Ripple.prototype.postcompose_ = function(e)
{	var ctx = e.context;
	var canvas = ctx.canvas;
	
	// Initialize when canvas is ready / modified
	if (this.width != canvas.width || this.height != canvas.height)
	{	this.width = canvas.width;
		this.height = canvas.height;
		this.ratio = e.frameState.pixelRatio;
		this.half_width = this.width >> 1;
		this.half_height = this.height >> 1;
		this.size = this.width * (this.height + 2) * 2;
		this.oldind = this.width;
		this.newind = this.width * (this.height + 3);
		for (var i = 0; i < this.size; i++) {
			this.last_map[i] = this.ripplemap[i] = 0;
		}
	}
	this.texture = ctx.getImageData(0, 0, this.width, this.height);
	this.ripple = ctx.getImageData(0, 0, this.width, this.height);	

	// Run animation
	var a, b, data, cur_pixel, new_pixel;
    
    var t = this.oldind; this.oldind = this.newind; this.newind = t;
    var i = 0;
    var _rd = this.ripple.data,
        _td = this.texture.data;
    
    for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
            var _newind = this.newind + i,
				_mapind = this.oldind + i;
            data = (
                this.ripplemap[_mapind - this.width] + 
                this.ripplemap[_mapind + this.width] + 
                this.ripplemap[_mapind - 1] + 
                this.ripplemap[_mapind + 1]) >> 1;
                
            data -= this.ripplemap[_newind];
            data -= data >> 5;
            
            this.ripplemap[_newind] = data;

            //where data=0 then still, where data>0 then wave
            data = 1024 - data;
            
            if (this.last_map[i] != data) 
			{   this.last_map[i] = data;
				
				//offsets
                a = (((x - this.half_width) * data / 1024) << 0) + this.half_width;
                b = (((y - this.half_height) * data / 1024) << 0) + this.half_height;

                //bounds check
                if (a >= this.width) a = this.width - 1;
                if (a < 0) a = 0;
                if (b >= this.height) b = this.height - 1;
                if (b < 0) b = 0;

                new_pixel = (a + (b * this.width)) * 4;
                cur_pixel = i * 4;

				/**/
                _rd[cur_pixel] = _td[new_pixel];
                _rd[cur_pixel + 1] = _td[new_pixel + 1];
                _rd[cur_pixel + 2] = _td[new_pixel + 2];

				/*/
				// only in blue pixels 
                if (_td[new_pixel + 2]>_td[new_pixel + 1]
					&& _td[new_pixel + 2]>_td[new_pixel])
				{
                _rd[cur_pixel] = _td[new_pixel];
                _rd[cur_pixel + 1] = _td[new_pixel + 1];
                _rd[cur_pixel + 2] = _td[new_pixel + 2];
				}
				else this.ripplemap[_newind] = 0;
				/**/
            }
            
            ++i;
        }
    }
	ctx.putImageData(this.ripple, 0, 0);
	
	// tell OL3 to continue postcompose animation
	this.getMap().render(); 
};
/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Interaction to snap to guidelines
 * @constructor
 * @extends {ol.interaction.Interaction}
 * @param {olx.interaction.SnapGuidesOptions} 
 *	- pixelTolerance {number | undefined} distance (in px) to snap to a guideline, default 10 px
 *	- style {ol.style.Style | Array<ol.style.Style> | undefined} Style for the sektch features. 
 */
ol.interaction.SnapGuides = function(options) 
{	if (!options) options = {};

	// Intersect 2 guides
	function getIntersectionPoint (d1, d2)
	{	var d1x = d1[1][0] - d1[0][0];
		var d1y = d1[1][1] - d1[0][1];
		var d2x = d2[1][0] - d2[0][0];
		var d2y = d2[1][1] - d2[0][1];
		var det = d1x * d2y - d1y * d2x;
 
		if (det != 0)
		{	var k = (d1x * d1[0][1] - d1x * d2[0][1] - d1y * d1[0][0] + d1y * d2[0][0]) / det;
			return [d2[0][0] + k*d2x, d2[0][1] + k*d2y];
		}
		else return false;
	}
	function dist2D (p1,p2)
	{	var dx = p1[0]-p2[0];
		var dy = p1[1]-p2[1];
		return Math.sqrt(dx*dx+dy*dy);
	}

	// Snap distance (in px)
	this.snapDistance_ = options.pixelTolerance || 10;

	// Default style
 	var sketchStyle = 
	[	new ol.style.Style({
			stroke: new ol.style.Stroke(
			{	color: '#ffcc33',
				lineDash: [8,5],
				width: 1.25
			})
	   })
	 ];

	// Custom style
	if (options.style) sketchStyle = options.style instanceof Array ? options.style : [options.style];

	// Create a new overlay for the sketch
	this.overlaySource_ = new ol.source.Vector(
		{	features: new ol.Collection(),
			useSpatialIndex: false
		});
	this.overlayLayer_ = new ol.layer.Image(
		{	source: new ol.source.ImageVector(
			{	source: this.overlaySource_,
				style: function(f)
				{	return sketchStyle;
				}
			}),
			name:'Snap overlay',
			displayInLayerSwitcher: false
		});
/* Speed up with a ImageVector layer
	this.overlayLayer_ = new ol.layer.Vector(
		{	source: this.overlaySource_,
			style: function(f)
			{	return sketchStyle;
			},
			name:'Snap overlay',
			displayInLayerSwitcher: false
		});
*/
	// Use snap interaction
	ol.interaction.Interaction.call(this, 
		{	handleEvent: function(e)
			{	if (this.getActive())
				{	var features = this.overlaySource_.getFeatures();
					var prev = null;
					var p = null;
					var res = e.frameState.viewState.resolution;
					for (var i=0, f; f = features[i]; i++)
					{	var c = f.getGeometry().getClosestPoint(e.coordinate);
						if ( dist2D(c, e.coordinate) / res < this.snapDistance_)
						{	// Intersection on 2 lines
							if (prev)
							{	var c2 = getIntersectionPoint(prev.getGeometry().getCoordinates(),  f.getGeometry().getCoordinates());
								if (c2) 
								{	if (dist2D(c2, e.coordinate) / res < this.snapDistance_)
									{	p = c2;
									}
								}
							}
							else
							{	p = c;
							}
							prev = f;
						}
					}
					if (p) e.coordinate = p;
				}
				return true;
			}
		});
};
ol.inherits(ol.interaction.SnapGuides, ol.interaction.Interaction);

/**
 * Remove the interaction from its current map, if any,  and attach it to a new
 * map, if any. Pass `null` to just remove the interaction from the current map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.interaction.SnapGuides.prototype.setMap = function(map) 
{	if (this.getMap()) this.getMap().removeLayer(this.overlayLayer_);
	ol.interaction.Interaction.prototype.setMap.call (this, map);
	this.overlayLayer_.setMap(map);
	if (map) this.projExtent_ = map.getView().getProjection().getExtent();
};

/** Activate or deactivate the interaction.
* @param {boolean} active
*/
ol.interaction.SnapGuides.prototype.setActive = function(active) 
{	this.overlayLayer_.setVisible(active);
	ol.interaction.Interaction.prototype.setActive.call (this, active);
}

/** Clear previous added guidelines
* @param {Array<ol.Feature> | undefined} features a list of feature to remove, default remove all feature
*/
ol.interaction.SnapGuides.prototype.clearGuides = function(features) 
{	if (!features) this.overlaySource_.clear();
	else
	{	for (var i=0, f; f=features[i]; i++)
		{	this.overlaySource_.removeFeature(f);
		}
	}
}

/** Get guidelines
* @return {ol.Collection} guidelines features
*/
ol.interaction.SnapGuides.prototype.getGuides = function(features) 
{	return this.overlaySource_.getFeaturesCollection();
}

/** Add a new guide to snap to
* @param {Array<ol.coordinate>} v the direction vector
* @return {ol.Feature} feature guide
*/
ol.interaction.SnapGuides.prototype.addGuide = function(v, ortho) 
{	if (v)
	{	var map = this.getMap();
		// Limit extent
		var extent = map.getView().calculateExtent(map.getSize());
		extent = ol.extent.buffer(extent, Math.max (1e5+1, (extent[2]-extent[0])*100));
		extent = ol.extent.getIntersection(extent, this.projExtent_);
		var dx = v[0][0] - v[1][0];
		var dy = v[0][1] - v[1][1];
		var d = 1 / Math.sqrt(dx*dx+dy*dy);
		var p, g = [];
		var p0, p1;
		for (var i= 0; i<1e8; i+=1e5)
		{	if (ortho) p = [ v[0][0] + dy*d*i, v[0][1] - dx*d*i];
			else p = [ v[0][0] + dx*d*i, v[0][1] + dy*d*i];
			if (ol.extent.containsCoordinate(extent, p)) g.push(p);
			else break;
		}
		var f0 = new ol.Feature(new ol.geom.LineString(g));
		var g=[];
		for (var i= 0; i>-1e8; i-=1e5)
		{	if (ortho) p = [ v[0][0] + dy*d*i, v[0][1] - dx*d*i];
			else p = [ v[0][0] + dx*d*i, v[0][1] + dy*d*i];
			if (ol.extent.containsCoordinate(extent, p)) g.push(p);
			else break;
		}
		var f1 = new ol.Feature(new ol.geom.LineString(g));
		this.overlaySource_.addFeature(f0);
		this.overlaySource_.addFeature(f1);
		return [f0, f1];
	}
};

/** Add a new orthogonal guide to snap to
* @param {Array<ol.coordinate>} v the direction vector
* @return {ol.Feature} feature guide
*/
ol.interaction.SnapGuides.prototype.addOrthoGuide = function(v) 
{	return this.addGuide(v, true);
};

/** Listen to draw event to add orthogonal guidelines on the first and last point.
* @param {ol.interaction.Draw} drawi a draw interaction to listen to
* @api
*/
ol.interaction.SnapGuides.prototype.setDrawInteraction = function(drawi)
{	var self = this;
	// Number of points currently drawing
	var nb = 0;
	// Current guidelines
	var features = [];
	function setGuides(e)
	{	var coord = [];
		var s = 2;
		switch (e.target.getType())
		{	case 'LineString':
				coord = e.target.getCoordinates();
				s = 2;
				break;
			case 'Polygon':
				coord = e.target.getCoordinates()[0];
				s = 3;
				break;
			default: break;
		}
		var l = coord.length;
		if (l != nb && l > s)
		{	self.clearGuides(features);
			features = self.addOrthoGuide([coord[l-s],coord[l-s-1]]);
			features = features.concat(self.addGuide([coord[0],coord[1]]));
			features = features.concat(self.addOrthoGuide([coord[0],coord[1]]));
			nb = l;
		}
	};
	// New drawing
	drawi.on ("drawstart", function(e)
	{	// When geom is changing add a new orthogonal direction 
		e.feature.getGeometry().on("change", setGuides);
	});
	// end drawing, clear directions
	drawi.on ("drawend", function(e)
	{	self.clearGuides(features);
		e.feature.getGeometry().un("change", setGuides);
		nb = 0;
		features = [];
	});
};

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Interaction split interaction for splitting feature geometry
 * @constructor
 * @extends {ol.interaction.Interaction}
 * @fires  beforesplit, aftersplit
 * @param {olx.interaction.SplitOptions} 
 *	- source {ol.source.Vector|Array{ol.source.Vector}} a list of source to split (configured with useSpatialIndex set to true)
 *	- features {ol.Collection.<ol.Feature>} collection of feature to split
 *	- snapDistance {integer} distance (in px) to snap to an object, default 25px
 *	- cursor {string|undefined} cursor name to display when hovering an objet
 *	- filter {function|undefined} a filter that takes a feature and return true if it can be clipped, default always split.
 *	- featureStyle {ol.style.Style | Array<ol.style.Style> | false | undefined} Style for the selected features, choose false if you don't want feature selection. By default the default edit style is used.
 *	- sketchStyle {ol.style.Style | Array<ol.style.Style> | undefined} Style for the sektch features. 
 *	- tolerance {function|undefined} Distance between the calculated intersection and a vertex on the source geometry below which the existing vertex will be used for the split.  Default is 1e-10.
 */
ol.interaction.Split = function(options) 
{	if (!options) options = {};

	ol.interaction.Interaction.call(this, 
	{	handleEvent: function(e)
		{	switch (e.type)
			{	case "singleclick":
					return this.handleDownEvent(e);
				case "pointermove":
					return this.handleMoveEvent(e);
				default: 
					return true;
			}
			return true;
		}
	});

	// Snap distance (in px)
	this.snapDistance_ = options.snapDistance || 25;
	// Split tolerance between the calculated intersection and the geometry
	this.tolerance_ = options.tolerance || 1e-10;
	// Cursor
	this.cursor_ = options.cursor;

	// List of source to split
	this.sources_ = options.sources ? (options.sources instanceof Array) ? options.sources:[options.sources] : [];

	if (options.features)
	{	this.sources_.push (new ol.source.Vector({ features: features }));
	}

	// Get all features candidate
	this.filterSplit_ = options.filter || function(){ return true; };

	// Default style
	var white = [255, 255, 255, 1];
	var blue = [0, 153, 255, 1];
	var width = 3;
	var fill = new ol.style.Fill({ color: 'rgba(255,255,255,0.4)' });
	var stroke = new ol.style.Stroke({
		color: '#3399CC',
		width: 1.25
	});
 	var sketchStyle = 
	[	new ol.style.Style({
			image: new ol.style.Circle({
				fill: fill,
				stroke: stroke,
				radius: 5
			}),
			fill: fill,
			stroke: stroke
	   })
	 ];
	var featureStyle =
	[	new ol.style.Style({
			stroke: new ol.style.Stroke({
				color: white,
				width: width + 2
			})
		}),
		new ol.style.Style({
			image: new ol.style.Circle({
				radius: 2*width,
				fill: new ol.style.Fill({
					color: blue
				}),
				stroke: new ol.style.Stroke({
					color: white,
					width: width/2
				})
			}),
			stroke: new ol.style.Stroke({
					color: blue,
					width: width
				})
		}),
	];

	// Custom style
	if (options.sketchStyle) sketchStyle = options.sketchStyle instanceof Array ? options.sketchStyle : [options.sketchStyle];
	if (options.featureStyle) featureStyle = options.featureStyle instanceof Array ? options.featureStyle : [options.featureStyle];

	// Create a new overlay for the sketch
	this.overlayLayer_ = new ol.layer.Vector(
	{	source: new ol.source.Vector({
			useSpatialIndex: false
		}),
		name:'Split overlay',
		displayInLayerSwitcher: false,
		style: function(f)
		{	if (f._sketch_) return sketchStyle;
			else return featureStyle;
		}
	});

};
ol.inherits(ol.interaction.Split, ol.interaction.Interaction);

/**
 * Remove the interaction from its current map, if any,  and attach it to a new
 * map, if any. Pass `null` to just remove the interaction from the current map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.interaction.Split.prototype.setMap = function(map) 
{	if (this.getMap()) this.getMap().removeLayer(this.overlayLayer_);
	ol.interaction.Interaction.prototype.setMap.call (this, map);
	this.overlayLayer_.setMap(map);
};

/** Get closest feature at pixel
 * @param {ol.Pixel} 
 * @return {ol.feature} 
 * @private
 */
ol.interaction.Split.prototype.getClosestFeature = function(e) 
{	var f, c, g, d = this.snapDistance_+1;
	for (var i=0; i<this.sources_.length; i++)
	{	var source = this.sources_[i];
		f = source.getClosestFeatureToCoordinate(e.coordinate);
		if (f.getGeometry().splitAt, this.tolerance_) 
		{	c = f.getGeometry().getClosestPoint(e.coordinate);
			g = new ol.geom.LineString([e.coordinate,c]);
			d = g.getLength() / e.frameState.viewState.resolution;
			break;
		}
	}
	if (d > this.snapDistance_) return false;
	else 
	{	// Snap to node
		var coord = this.getNearestCoord (c, f.getGeometry().getCoordinates());
		var p = this.getMap().getPixelFromCoordinate(coord);
		if (ol.coordinate.dist2d(e.pixel, p) < this.snapDistance_) 
		{	c = coord;
		}
		//
		return { source:source, feature:f, coord: c, link: g };
	}
}

/** Get nearest coordinate in a list 
* @param {ol.coordinate} pt the point to find nearest
* @param {Array<ol.coordinate>} coords list of coordinates
* @return {ol.coordinate} the nearest coordinate in the list
*/
ol.interaction.Split.prototype.getNearestCoord = function(pt, coords)
{	var d, dm=Number.MAX_VALUE, p0;
	for (var i=0; i < coords.length; i++)
	{	d = ol.coordinate.dist2d (pt, coords[i]);
		if (d < dm)
		{	dm = d;
			p0 = coords[i];
		}
	}
	return p0;
};

/**
 * @param {ol.MapBrowserEvent} evt Map browser event.
 * @return {boolean} `true` to start the drag sequence.
 */
ol.interaction.Split.prototype.handleDownEvent = function(evt) 
{	// Something to split ?
	var current = this.getClosestFeature(evt);

	if (current)
	{	var self = this;
		self.overlayLayer_.getSource().clear();
		var split = current.feature.getGeometry().splitAt(current.coord, this.tolerance_);
		if (split.length > 1)
		{	var tosplit = [];
			for (var i=0; i<split.length; i++)
			{	var f = current.feature.clone();
				f.setGeometry(split[i]);
				tosplit.push(f);
			}
			self.dispatchEvent({ type:'beforesplit', original: current.feature, features: tosplit });
			current.source.dispatchEvent({ type:'beforesplit', original: current.feature, features: tosplit });
			current.source.removeFeature(current.feature);
			for (var i=0; i<tosplit.length; i++)
			{	current.source.addFeature(tosplit[i]);
			}
			self.dispatchEvent({ type:'aftersplit', original: current.feature, features: tosplit });
			current.source.dispatchEvent({ type:'aftersplit', original: current.feature, features: tosplit });
		}
	}
	return false;
};

/**
 * @param {ol.MapBrowserEvent} evt Event.
 */
ol.interaction.Split.prototype.handleMoveEvent = function(e) 
{	var map = e.map;
	this.overlayLayer_.getSource().clear();
	var current = this.getClosestFeature(e);

	if (current && this.filterSplit_(current.feature)) 
	{	var coord, p, l;
		// Draw sketch
		this.overlayLayer_.getSource().addFeature(current.feature);
		p = new ol.Feature(new ol.geom.Point(current.coord));
		p._sketch_ = true;
		this.overlayLayer_.getSource().addFeature(p);
		//
		l = new ol.Feature(new ol.geom.LineString([e.coordinate,current.coord]));
		l._sketch_ = true;
		this.overlayLayer_.getSource().addFeature(l);
	}

	var element = map.getTargetElement();
	if (this.cursor_) 
	{	if (current) 
		{	if (element.style.cursor != this.cursor_) 
			{	this.previousCursor_ = element.style.cursor;
				element.style.cursor = this.cursor_;
			}
		} 
		else if (this.previousCursor_ !== undefined) 
		{	element.style.cursor = this.previousCursor_;
			this.previousCursor_ = undefined;
		}
	}
};


/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Interaction splitter: acts as a split feature agent while editing vector features (LineString).
 * @constructor
 * @extends {ol.interaction.Interaction}
 * @fires  beforesplit, aftersplit
 * @param {olx.interaction.SplitOptions} 
 *	- source {ol.source.Vector|Array{ol.source.Vector}} The target source (or array of source) with features to be split (configured with useSpatialIndex set to true)
 *	- triggerSource {ol.source.Vector} Any newly created or modified features from this source will be used to split features on the target source. If none is provided the target source is used instead.
 *	- features {ol.Collection.<ol.Feature>} A collection of feature to be split (replace source target).
 *	- triggerFeatures {ol.Collection.<ol.Feature>} Any newly created or modified features from this collection will be used to split features on the target source (replace triggerSource).
 *	- filter {function|undefined} a filter that takes a feature and return true if the feature is eligible for splitting, default always split.
 *	- tolerance {function|undefined} Distance between the calculated intersection and a vertex on the source geometry below which the existing vertex will be used for the split. Default is 1e-10.
 * @todo verify auto intersection on features that split.
 */
ol.interaction.Splitter = function(options) 
{	if (!options) options = {};

	ol.interaction.Interaction.call(this, 
	{	handleEvent: function(e)
			{	// Hack to get only one changeFeature when draging with ol.interaction.Modify on.
				if (e.type != "pointermove" && e.type != "pointerdrag")
				{	if (this.lastEvent_)
					{	this.splitSource(this.lastEvent_.feature);
						this.lastEvent_ = null;
					}
					this.moving_ = false;
				}
				else this.moving_ = true;
				return true; 
			},
	});

	// Features added / remove
	this.added_ = [];
	this.removed_ = [];

	// Source to split
	if (options.features)
	{	this.source_ = new ol.source.Vector({ features: options.features });
	}
	else 
	{	this.source_ = options.source ? options.source : new ol.source.Vector({ features: new ol.Collection() });
	}
	var trigger = this.triggerSource;
	if (options.triggerFeatures)
	{	trigger = new ol.source.Vector({ features: options.triggerFeatures });
	}

	if (trigger)
	{	trigger.on("addfeature", this.onAddFeature, this);
		trigger.on("changefeature", this.onChangeFeature, this);
		trigger.on("removefeature", this.onRemoveFeature, this);
	}
	else
	{	this.source_.on("addfeature", this.onAddFeature, this);
		this.source_.on("changefeature", this.onChangeFeature, this);
		this.source_.on("removefeature", this.onRemoveFeature, this);
	}

	// Split tolerance between the calculated intersection and the geometry
	this.tolerance_ = options.tolerance || 1e-10;

	// Get all features candidate
	this.filterSplit_ = options.filter || function(){ return true; };
};
ol.inherits(ol.interaction.Splitter, ol.interaction.Interaction);

/** Calculate intersection on 2 segs
* @param {Array<ol.coordinate>} s1 first seg to intersect (2 points)
* @param {Array<ol.coordinate>} s2 second seg to intersect (2 points)
* @return { boolean | ol.coordiante } intersection point or false no intersection
*/
ol.interaction.Splitter.prototype.intersectSegs = function(s1,s2)
{	var tol = this.tolerance_;

	// Solve
	var x12 = s1[0][0] - s1[1][0];
	var x34 = s2[0][0] - s2[1][0];
	var y12 = s1[0][1] - s1[1][1];
	var y34 = s2[0][1] - s2[1][1];

	var det = x12 * y34 - y12 * x34;
	// No intersection
	if (Math.abs(det) < tol)
	{	return false;
	}
	else
	{	// Outside segement
		var r1 = ((s1[0][0] - s2[1][0])*y34 - (s1[0][1] - s2[1][1])*x34) / det;
		if (Math.abs(r1)<tol) return s1[0];
		if (Math.abs(1-r1)<tol) return s1[1];
		if (r1<0 || r1>1) return false;

		var r2 = ((s1[0][1] - s2[1][1])*x12 - (s1[0][0] - s2[1][0])*y12) / det;
		if (Math.abs(r2)<tol) return s2[1];
		if (Math.abs(1-r2)<tol) return s2[0];
		if (r2<0 || r2>1) return false;

		// Intersection
		var a = s1[0][0] * s1[1][1] - s1[0][1] * s1[1][0];
		var b = s2[0][0] * s2[1][1] - s2[0][1] * s2[1][0];
		var p = [(a * x34 - b * x12) / det, (a * y34 - b * y12) / det];
		// Test start / end
/*
console.log("r1: "+r1)
console.log("r2: "+r2)
console.log ("s10: "+(ol.coordinate.dist2d(p,s1[0])<tol)) ;
console.log ("s11: "+(ol.coordinate.dist2d(p,s1[1])<tol)) ;
console.log ("s20: "+(ol.coordinate.dist2d(p,s2[0])<tol)) ;
console.log ("s21: "+(ol.coordinate.dist2d(p,s2[1])<tol)) ;
*/
		return p;
	}
};

/** Split the source using a feature
* @param {ol.Feature} feature The feature to use to split.
*/
ol.interaction.Splitter.prototype.splitSource = function(feature)
{	// Allready perform a split
	if (this.splitting) return;
	var self = this;
	var i, k, f2;
	// Start splitting
	this.source_.dispatchEvent({ type:'beforesplit', feaure: feature, source: this.source_ });

	this.splitting = true;
	this.added_ = [];
	this.removed_ = [];

	var c = feature.getGeometry().getCoordinates();
	var seg, split = [];
	function intersect (f)
	{	if (f !== feature)
		{	var c2 = f.getGeometry().getCoordinates();
			for (var j=0; j<c2.length-1; j++)
			{	var p = this.intersectSegs (seg, [c2[j],c2[j+1]]);
				if (p)
				{	split.push(p);
					g = f.getGeometry().splitAt(p, this.tolerance_);
					if (g && g.length>1)
					{	found = f;
						return true;
					}
				}
			}
		}
		return false;
	}
	// Split existing features
	for (i=0; i<c.length-1; i++)
	{	seg = [c[i],c[i+1]];
		var extent = ol.extent.buffer(ol.extent.boundingExtent(seg), this.tolerance_ /*0.01*/ );
		var g;
		while (true)
		{	var found = false;
			this.source_.forEachFeatureIntersectingExtent(extent, intersect, this);
			// Split feature
			if (found)
			{	var f = found;
				this.source_.removeFeature(f);
				for (k=0; k<g.length; k++)
				{	f2 = f.clone();
					f2.setGeometry(g[k]);
					this.source_.addFeature(f2);
				}
			}
			else break;
		}
	}

	// Auto intersect
	for (i=0; i<c.length-2; i++)
	{	for (var j=i+1; j<c.length-1; j++)
		{	var p = this.intersectSegs ([c[i],c[i+1]], [c[j],c[j+1]]);
			if (p && p!=c[i+1])
			{	split.push(p);
			}
		}
	}

	// Split original
	var splitOriginal = false;
	if (split.length)
	{	var result = feature.getGeometry().splitAt(split, this.tolerance_);
		if (result.length>1)
		{	for (k=0; k<result.length; k++)
			{	f2 = feature.clone();
				f2.setGeometry(result[k]);
				this.source_.addFeature(f2);
			}
			splitOriginal = true;
		}
	}

	// If the interaction is inserted after modify interaction, the objet is not consistant 
	// > wait end of other interactions
	setTimeout (function()
	{	if (splitOriginal) self.source_.removeFeature(feature);
		self.source_.dispatchEvent({ type:'aftersplit', featureAdded: self.added_, featureRemoved: self.removed_, source: this.source_ });
		// Finish
		self.splitting = false;
	},0);
	
};

/** New feature source is added 
*/
ol.interaction.Splitter.prototype.onAddFeature = function(e)
{	this.splitSource(e.feature);
	if (this.splitting) 
	{	this.added_.push(e.feature);
	}
	/*
	if (this.splitting) return;
	var self = this;
	setTimeout (function() { self.splitSource(e.feature); }, 0);
	*/
};

/** Feature source is removed > count features added/removed
*/
ol.interaction.Splitter.prototype.onRemoveFeature = function(e)
{	if (this.splitting) 
	{	var n = this.added_.indexOf(e.feature);
		if (n==-1)
		{	this.removed_.push(e.feature);
		}
		else
		{	this.added_.splice(n,1);
		}
	}
};

/** Feature source is changing 
*/
ol.interaction.Splitter.prototype.onChangeFeature = function(e)
{	if (this.moving_) 
	{	this.lastEvent_ = e;
	}
	else this.splitSource(e.feature);
};

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Interaction synchronize
 * @constructor
 * @extends {ol.interaction.Interaction}
 * @param {olx.interaction.SynchronizeOptions} 
 *  - maps {Array<ol.Map>} An array of maps to synchronize with the map of the interaction
 */
ol.interaction.Synchronize = function(options) 
{	if (!options) options={};
	var self = this;

	ol.interaction.Interaction.call(this, 
		{	handleEvent: function(e)
				{	if (e.type=="pointermove") { self.handleMove_(e); }
					return true; 
				}
		});

	this.maps = options.maps;

};
ol.inherits(ol.interaction.Synchronize, ol.interaction.Interaction);

/**
 * Remove the interaction from its current map, if any,  and attach it to a new
 * map, if any. Pass `null` to just remove the interaction from the current map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.interaction.Synchronize.prototype.setMap = function(map) 
{	
	if (this.getMap())
	{
		this.getMap().getView().un('change:center', this.syncMaps, this);
		this.getMap().getView().un('change:rotation', this.syncMaps, this);
		this.getMap().getView().un('change:resolution', this.syncMaps, this);
		ol.events.unlisten(this.getMap().getViewport(), ol.events.EventType.MOUSEOUT, this.handleMouseOut_, this);
	}
	
	ol.interaction.Interaction.prototype.setMap.call (this, map);

	if (map)
	{	this.getMap().getView().on('change:center', this.syncMaps, this);
		this.getMap().getView().on('change:rotation', this.syncMaps, this);
		this.getMap().getView().on('change:resolution', this.syncMaps, this);

		var me = this;
		$(this.getMap().getTargetElement()).mouseout(function() {
			for (var i=0; i<me.maps.length; i++)
			{	me.maps[i].hideTarget();
			}
			me.getMap().hideTarget();
    });
		this.syncMaps();
	}
};

/** Synchronize the maps
*/
ol.interaction.Synchronize.prototype.syncMaps = function(e) 
{	var map = this.getMap();
	if (!e) e = { type:'all' };
	if (map)
	{	for (var i=0; i<this.maps.length; i++)
		{	switch (e.type)
			{	case 'change:rotation': 
					if (this.maps[i].getView().getRotation() != map.getView().getRotation())
						this.maps[i].getView().setRotation(map.getView().getRotation()); 
					break;
				case 'change:center': 
					if (this.maps[i].getView().getCenter() != map.getView().getCenter())
						this.maps[i].getView().setCenter(map.getView().getCenter()); 
					break;
				case 'change:resolution': 
					if (this.maps[i].getView().getResolution() != map.getView().getResolution())
					{	/* old version prior to 1.19.1
						this.maps[i].beforeRender ( ol.animation.zoom(
							{	duration: 250, 
								resolution: this.maps[i].getView().getResolution() 
							}));
						*/
						this.maps[i].getView().setResolution(map.getView().getResolution());
					}
					break;
				default: 
					this.maps[i].getView().setRotation(map.getView().getRotation());
					this.maps[i].getView().setCenter(map.getView().getCenter());
					this.maps[i].getView().setResolution(map.getView().getResolution());
					break;
			}
		}
	}
};

/** Cursor move > tells other maps to show the cursor
* @param {ol.event} e "move" event
*/
ol.interaction.Synchronize.prototype.handleMove_ = function(e) 
{	for (var i=0; i<this.maps.length; i++)
	{	this.maps[i].showTarget(e.coordinate);
	}
	this.getMap().showTarget();
};


/** Cursor out of map > tells other maps to hide the cursor
* @param {event} e "mouseOut" event
*/
ol.interaction.Synchronize.prototype.handleMouseOut_ = function(e, scope)
{	for (var i=0; i<scope.maps.length; i++)
	{
		scope.maps[i].targetOverlay_.setPosition(undefined);
	}
};

/** Show a target overlay at coord
* @param {ol.coordinate} coord
*/
ol.Map.prototype.showTarget = function(coord)
{	if (!this.targetOverlay_)
	{	var elt = $("<div>").addClass("ol-target");
		this.targetOverlay_ = new ol.Overlay({ element: elt.get(0) });
		this.targetOverlay_.setPositioning('center-center');
		this.addOverlay(this.targetOverlay_);
		elt.parent().addClass("ol-target-overlay");
		// hack to render targetOverlay before positioning it
		this.targetOverlay_.setPosition([0,0]);
	}
	this.targetOverlay_.setPosition(coord);
};

/** Hide the target overlay
*/
ol.Map.prototype.hideTarget = function()
{
	this.removeOverlay(this.targetOverlay_);
	this.targetOverlay_ = undefined;
};
/*	
	Tinker Bell effect on maps.
	
	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
	@link https://github.com/Viglino
 */
 /**
 * @constructor
 * @extends {ol.interaction.Pointer}
 *	@param {ol.interaction.TinkerBell.options} flashlight options param
 *		- color {ol.Color} color of the sparkles
 */
ol.interaction.TinkerBell = function(options) 
{	options = options || {};

	ol.interaction.Pointer.call(this, 
	{	handleDownEvent: this.onMove,
		handleMoveEvent: this.onMove
	});

	this.set('color', options.color ? ol.color.asString(options.color) : "#fff");
	this.sparkle = [0,0];
	this.sparkles = [];
	this.lastSparkle = this.time = new Date();

	var self = this;
	this.out_ = function() { self.isout_=true; };
	this.isout_ = true;
};
ol.inherits(ol.interaction.TinkerBell, ol.interaction.Pointer);

/** Set the map > start postcompose
*/
ol.interaction.TinkerBell.prototype.setMap = function(map)
{	if (this.getMap())
	{	this.getMap().un('postcompose', this.postcompose_, this);
		map.getViewport().removeEventListener('mouseout', this.out_, false);
		this.getMap().render();
	}
	
	ol.interaction.Pointer.prototype.setMap.call(this, map);

	if (map)
	{	map.on('postcompose', this.postcompose_, this);
		map.on('mouseout', this.onMove, this);
		map.getViewport().addEventListener('mouseout', this.out_, false);
	}
};

ol.interaction.TinkerBell.prototype.onMove = function(e)
{	this.sparkle = e.pixel;
	this.isout_ = false;
	this.getMap().render();
};

/** Postcompose function
*/
ol.interaction.TinkerBell.prototype.postcompose_ = function(e)
{	var delta = 15;
	var ctx = e.context;
	var canvas = ctx.canvas;
	var dt = e.frameState.time - this.time;
	this.time = e.frameState.time;
	if (e.frameState.time-this.lastSparkle > 30 && !this.isout_)
	{	this.lastSparkle = e.frameState.time;
		this.sparkles.push({ p:[this.sparkle[0]+Math.random()*delta-delta/2, this.sparkle[1]+Math.random()*delta], o:1 });
	}
	ctx.save();
		ctx.scale(e.frameState.pixelRatio,e.frameState.pixelRatio);
		ctx.fillStyle = this.get("color");
		for (var i=this.sparkles.length-1, p; p=this.sparkles[i]; i--)
		{	if (p.o < 0.2) 
			{	this.sparkles.splice(0,i+1);
				break;
			}
			ctx.globalAlpha = p.o;
			ctx.beginPath();
			ctx.arc (p.p[0], p.p[1], 2.2, 0, 2 * Math.PI, false);
			ctx.fill();
			p.o *= 0.98;
			p.p[0] += (Math.random()-0.5);
			p.p[1] += dt*(1+Math.random())/30;
		};
	ctx.restore();

	// tell OL3 to continue postcompose animation
	if (this.sparkles.length) this.getMap().render(); 
};
/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Interaction splitter: acts as a split feature agent while editing vector features (LineString).
 * @constructor
 * @extends {ol.interaction.Pointer}
 * @param {olx.interaction.TouchCompass} 
 *	- onDrag {function|undefined} Function handling "drag" events. It provides a dpixel and a traction (in projection) vector form the center of the compas
 *	- size {Number} size of the compass in px, default 80
 *	- alpha {Number} opacity of the compass, default 0.5
 */
ol.interaction.TouchCompass = function(options) 
{	var options = options||{};
	var self = this;

	var opt = {};
	// Click on the compass
	opt.handleDownEvent = function(e)
	{	var s = this.getCenter_();
		var dx = e.pixel[0]-s[0];
		var dy = e.pixel[1]-s[1];
		this.start = e;
		return (Math.sqrt(dx*dx+dy*dy) < this.size/2);
	};
	// Pn drag
	opt.handleDragEvent = function(e)
	{	if (!this.pos) 
		{	this.pos = this.start;
			this.getMap().renderSync();
		}
		this.pos = e;
	};
	// Stop drag
	opt.handleUpEvent = function(e)
	{	this.pos = false;
		return true;
	};

	ol.interaction.Pointer.call(this, opt);

	this.ondrag_ = options.onDrag;
	this.size = options.size || 80;
	this.alpha = options.alpha || 0.5;

	if (!ol.interaction.TouchCompass.prototype.compass)
	{	var canvas = ol.interaction.TouchCompass.prototype.compass = document.createElement('canvas');
		var ctx = canvas.getContext("2d");
		var s = canvas.width = canvas.height = this.size;
		var w = s/10;
		var r = s/2;
		var r2 = 0.22*r;

		ctx.translate(r,r);
		ctx.fillStyle = "#999";
		ctx.strokeStyle = "#ccc";
		ctx.lineWidth = w;
		ctx.beginPath();
		ctx.arc (0,0, s*0.42, 0, 2*Math.PI);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = "#99f";
		ctx.beginPath();
		ctx.moveTo (0,0); 
		ctx.lineTo (r,0); ctx.lineTo (r2,r2); ctx.moveTo (0,0);
		ctx.lineTo (-r,0); ctx.lineTo (-r2,-r2); ctx.moveTo (0,0);
		ctx.lineTo (0,r); ctx.lineTo (-r2,r2); ctx.moveTo (0,0);
		ctx.lineTo (0,-r); ctx.lineTo (r2,-r2); ctx.moveTo (0,0);
		ctx.fill();
		ctx.fillStyle = "#eee";
		ctx.beginPath();
		ctx.moveTo (0,0); 
		ctx.lineTo (r,0); ctx.lineTo (r2,-r2); ctx.moveTo (0,0);
		ctx.lineTo (-r,0); ctx.lineTo (-r2,r2); ctx.moveTo (0,0);
		ctx.lineTo (0,r); ctx.lineTo (r2,r2); ctx.moveTo (0,0);
		ctx.lineTo (0,-r); ctx.lineTo (-r2,-r2); ctx.moveTo (0,0);
		ctx.fill();
	}
};
ol.inherits(ol.interaction.TouchCompass, ol.interaction.Pointer);

/** Compass Image as a JS Image object
* @api
*/
ol.interaction.TouchCompass.prototype.compass = null;

/**
 * Remove the interaction from its current map, if any,  and attach it to a new
 * map, if any. Pass `null` to just remove the interaction from the current map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.interaction.TouchCompass.prototype.setMap = function(map) 
{	if (this.getMap())
	{	this.getMap().un('postcompose', this.drawCompass_, this);
	}

	ol.interaction.Pointer.prototype.setMap.call (this, map);

	if (map)
	{	map.on('postcompose', this.drawCompass_, this);
	}
};

/**
 * Activate or deactivate the interaction.
 * @param {boolean} active Active.
 * @observable
 * @api
 */
ol.interaction.TouchCompass.prototype.setActive = function(b) 
{	ol.interaction.Pointer.prototype.setActive.call (this, b);
	if (this.getMap()) this.getMap().renderSync();
}

/**
 * Get the center of the compass
 * @param {ol.coordinate} 
 * @private
 */
ol.interaction.TouchCompass.prototype.getCenter_ = function() 
{	var margin = 10;
	var s = this.size;
	var c = this.getMap().getSize(); 
	return [c[0]/2, c[1]-margin-s/2];
}

/**
 * Draw the compass on post compose
 * @private
 */
ol.interaction.TouchCompass.prototype.drawCompass_ = function(e) 
{	if (!this.getActive()) return;

	var ctx = e.context;
	var ratio = e.frameState.pixelRatio;

	ctx.save();
	ctx.scale(ratio,ratio);

	ctx.globalAlpha = this.alpha;
	ctx.strokeStyle = "#fff";
	ctx.lineWidth = 5;

	var s = this.size;
	var c = this.getCenter_();

	ctx.drawImage(this.compass, 0,0,this.compass.width,this.compass.height, c[0]-s/2, c[1]-s/2, s,s);

	if (this.pos)
	{	var dx = this.pos.pixel[0]-this.start.pixel[0];
		var dy = this.pos.pixel[1]-this.start.pixel[1];
		for (var i=1; i<=4; i++)
		{	ctx.beginPath();
			ctx.arc (c[0] +dx/4*i, c[1] +dy/4*i, s/2*(0.6+0.4*i/4), 0, 2*Math.PI);
			ctx.stroke();
		}
	}

	ctx.restore();

	if (this.pos)
	{	// Get delta
		if (this.ondrag_) 
		{	var r = this.getMap().getView().getResolution();
			var delta = 
				{	dpixel: [ this.pos.pixel[0] - this.start.pixel[0], this.pos.pixel[1] - this.start.pixel[1] ]
				}
			delta.traction = [ delta.dpixel[0]*r, -delta.dpixel[1]*r];

			this.ondrag_(delta, this.pos);
		}
		// Continue animation
		e.frameState.animate = true;
	}
};
/** Interaction rotate
 * @constructor
 * @extends {ol.interaction.Pointer}
 * @fires select | rotatestart | rotating | rotateend | translatestart | translating | translateend | scalestart | scaling | scaleend
 * @param {olx.interaction.TransformOptions} 
 *  - layers {Array<ol.Layer>} array of layers to transform, 
 *  - features {ol.Collection<ol.Feature>} collection of feature to transform, 
 *	- translateFeature {bool} Translate when click on feature
 *	- translate {bool} Can translate the feature
 *	- stretch {bool} can stretch the feature
 *	- scale {bool} can scale the feature
 *	- rotate {bool} can rotate the feature
 *	- keepAspectRatio { ol.events.ConditionType | undefined } A function that takes an ol.MapBrowserEvent and returns a boolean to keep aspect ratio, default ol.events.condition.shiftKeyOnly.
 *	- style {} list of ol.style for handles
 *
 */
ol.interaction.Transform = function(options) 
{	if (!options) options={};
	var self = this;

	// Create a new overlay layer for the sketch
	this.handles_ = new ol.Collection();
	this.overlayLayer_ = new ol.layer.Vector(
		{	source: new ol.source.Vector({
				features: this.handles_,
				useSpatialIndex: false
			}),
			name:'Transform overlay',
			displayInLayerSwitcher: false,
			// Return the style according to the handle type
			style: function (feature)
				{	return (self.style[(feature.get('handle')||'default')+(feature.get('constraint')||'')+(feature.get('option')||'')]);
				}
		});

	// Extend pointer
	ol.interaction.Pointer.call(this, 
	{	handleDownEvent: this.handleDownEvent_,
		handleDragEvent: this.handleDragEvent_,
		handleMoveEvent: this.handleMoveEvent_,
		handleUpEvent: this.handleUpEvent_
	});

	/** Collection of feature to transform */
	this.features_ = options.features;
	/** List of layers to transform */
	this.layers_ = options.layers ? (options.layers instanceof Array) ? options.layers:[options.layers] : null;

	/** Translate when click on feature */
	this.set('translateFeature', (options.translateFeature!==false));
	/** Can translate the feature */
	this.set('translate', (options.translate!==false));
	/** Can stretch the feature */
	this.set('stretch', (options.stretch!==false));
	/** Can scale the feature */
	this.set('scale', (options.scale!==false));
	/** Can rotate the feature */
	this.set('rotate', (options.rotate!==false));
	/** Keep aspect ratio */
	this.set('keepAspectRatio', (options.keepAspectRatio || function(e){ return e.originalEvent.shiftKey }));

	// Force redraw when changed
	this.on ('propertychange', function()
	{	this.drawSketch_();
	});

	// setstyle
	this.setDefaultStyle();

};
ol.inherits(ol.interaction.Transform, ol.interaction.Pointer);

/** Cursors for transform
*/
ol.interaction.Transform.prototype.Cursors = 
{	'default':	'auto',
	'select':	'pointer',
	'translate':'move',
	'rotate':	'move',
	'scale':	'ne-resize', 
	'scale1':	'nw-resize', 
	'scale2':	'ne-resize', 
	'scale3':	'nw-resize',
	'scalev':	'e-resize', 
	'scaleh1':	'n-resize', 
	'scalev2':	'e-resize', 
	'scaleh3':	'n-resize'
};

/**
 * Remove the interaction from its current map, if any,  and attach it to a new
 * map, if any. Pass `null` to just remove the interaction from the current map.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.interaction.Transform.prototype.setMap = function(map) 
{	if (this.getMap()) this.getMap().removeLayer(this.overlayLayer_);
	ol.interaction.Pointer.prototype.setMap.call (this, map);
	this.overlayLayer_.setMap(map);
 	if (map !== null) {
		this.isTouch = /touch/.test(map.getViewport().className);
		this.setDefaultStyle();
	}
};

/**
 * Activate/deactivate interaction
 * @param {bool} 
 * @api stable
 */
ol.interaction.Transform.prototype.setActive = function(b) 
{	this.select(null);
	this.overlayLayer_.setVisible(b);
	ol.interaction.Pointer.prototype.setActive.call (this, b);
};

/** Set efault sketch style
*/
ol.interaction.Transform.prototype.setDefaultStyle = function() 
{	// Style
	var stroke = new ol.style.Stroke({ color: [255,0,0,1], width: 1 });
	var strokedash = new ol.style.Stroke({ color: [255,0,0,1], width: 1, lineDash:[4,4] });
	var fill0 = new ol.style.Fill({ color:[255,0,0,0.01] });
	var fill = new ol.style.Fill({ color:[255,255,255,0.8] });
	var circle = new ol.style.RegularShape({
					fill: fill,
					stroke: stroke,
					radius: this.isTouch ? 12 : 6,
					points: 15
				});
	circle.getAnchor()[0] = this.isTouch ? -10 : -5;
	var bigpt = new ol.style.RegularShape({
					fill: fill,
					stroke: stroke,
					radius: this.isTouch ? 16 : 8,
					points: 4,
					angle: Math.PI/4
				});
	var smallpt = new ol.style.RegularShape({
					fill: fill,
					stroke: stroke,
					radius: this.isTouch ? 12 : 6,
					points: 4,
					angle: Math.PI/4
				});
	function createStyle (img, stroke, fill) 
	{	return [ new ol.style.Style({image:img, stroke:stroke, fill:fill}) ];
	}
	/** Style for handles */
	this.style = 
	{	'default': createStyle (bigpt, strokedash, fill0),
		'translate': createStyle (bigpt, stroke, fill),
		'rotate': createStyle (circle, stroke, fill),
		'rotate0': createStyle (bigpt, stroke, fill),
		'scale': createStyle (bigpt, stroke, fill),
		'scale1': createStyle (bigpt, stroke, fill),
		'scale2': createStyle (bigpt, stroke, fill),
		'scale3': createStyle (bigpt, stroke, fill),
		'scalev': createStyle (smallpt, stroke, fill),
		'scaleh1': createStyle (smallpt, stroke, fill),
		'scalev2': createStyle (smallpt, stroke, fill),
		'scaleh3': createStyle (smallpt, stroke, fill),
	};
	this.drawSketch_();
}

/**
 * Set sketch style.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.interaction.Transform.prototype.setStyle = function(style, olstyle) 
{	if (!olstyle) return;
	if (olstyle instanceof Array) this.style[style] = olstyle;
	else this.style[style] = [ olstyle ];
	for (var i=0; i<this.style[style].length; i++)
	{	var im = this.style[style][i].getImage();
		if (im) 
		{	if (style == 'rotate') im.getAnchor()[0] = -5;
			if (this.isTouch) im.setScale(1.8);
		}
		var tx = this.style[style][i].getText();
		if (tx) 
		{	if (style == 'rotate') tx.setOffsetX(this.isTouch ? 14 : 7);
			if (this.isTouch) tx.setScale(1.8);
		}
	}
	this.drawSketch_();
};

/** Get Feature at pixel
 * @param {ol.Pixel} 
 * @return {ol.feature} 
 * @private
 */
ol.interaction.Transform.prototype.getFeatureAtPixel_ = function(pixel) 
{	var self = this;
	return this.getMap().forEachFeatureAtPixel(pixel,
		function(feature, layer) 
		{	var found = false;
			// Overlay ?
			if (!layer)
			{	if (feature===self.bbox_) return false;
				self.handles_.forEach (function(f) { if (f===feature) found=true; });
				if (found) return { feature: feature, handle:feature.get('handle'), constraint:feature.get('constraint'), option:feature.get('option') };
			}
			// feature belong to a layer
			if (self.layers_)
			{	for (var i=0; i<self.layers_.length; i++)
				{	if (self.layers_[i]===layer) return { feature: feature };
				}
				return null;
			}
			// feature in the collection
			else if (self.features_)
			{	self.features_.forEach (function(f) { if (f===feature) found=true; });
				if (found) return { feature: feature };
				else return null;
			}
			// Others
			else return { feature: feature };
		}) || {};
}

/** Draw transform sketch
* @param {boolean} draw only the center
*/
ol.interaction.Transform.prototype.drawSketch_ = function(center)
{
	this.overlayLayer_.getSource().clear();
	if (!this.feature_) return;
	if (center===true)
	{	if (!this.ispt_) 
		{	this.overlayLayer_.getSource().addFeature(new ol.Feature( { geometry: new ol.geom.Point(this.center_), handle:'rotate0' }) );
			var ext = this.feature_.getGeometry().getExtent();
			var geom = ol.geom.Polygon.fromExtent(ext);
			var f = this.bbox_ = new ol.Feature(geom);
			this.overlayLayer_.getSource().addFeature (f);
		}
	}
	else
	{	var ext = this.feature_.getGeometry().getExtent();
		if (this.ispt_) 
		{	var p = this.getMap().getPixelFromCoordinate([ext[0], ext[1]]);
			ext = ol.extent.boundingExtent(
				[	this.getMap().getCoordinateFromPixel([p[0]-10, p[1]-10]),
					this.getMap().getCoordinateFromPixel([p[0]+10, p[1]+10])
				]);
		}
		var geom = ol.geom.Polygon.fromExtent(ext);
		var f = this.bbox_ = new ol.Feature(geom);
		var features = [];
		var g = geom.getCoordinates()[0];
		if (!this.ispt_) 
		{	features.push(f);
			// Middle
			if (this.get('stretch') && this.get('scale')) for (var i=0; i<g.length-1; i++)
			{	f = new ol.Feature( { geometry: new ol.geom.Point([(g[i][0]+g[i+1][0])/2,(g[i][1]+g[i+1][1])/2]), handle:'scale', constraint:i%2?"h":"v", option:i });
				features.push(f);
			}
			// Handles
			if (this.get('scale')) for (var i=0; i<g.length-1; i++)
			{	f = new ol.Feature( { geometry: new ol.geom.Point(g[i]), handle:'scale', option:i });
				features.push(f);
			}
			// Center
			if (this.get('translate') && !this.get('translateFeature'))
			{	f = new ol.Feature( { geometry: new ol.geom.Point([(g[0][0]+g[2][0])/2, (g[0][1]+g[2][1])/2]), handle:'translate' });
				features.push(f);
			}
		}
		// Rotate
		if (this.get('rotate')) 
		{	f = new ol.Feature( { geometry: new ol.geom.Point(g[3]), handle:'rotate' });
			features.push(f);
		}
		// Add sketch
		this.overlayLayer_.getSource().addFeatures(features);
	}

};

/** Select a feature to transform
* @param {ol.Feature} the feature to transform
*/
ol.interaction.Transform.prototype.select = function(feature)
{	this.feature_ = feature;
	this.ispt_ = this.feature_ ? (this.feature_.getGeometry().getType() == "Point") : false;
	this.drawSketch_();
	this.dispatchEvent({ type:'select', feature: this.feature_ });
}

/**
 * @param {ol.MapBrowserEvent} evt Map browser event.
 * @return {boolean} `true` to start the drag sequence.
 */
ol.interaction.Transform.prototype.handleDownEvent_ = function(evt) 
{
	var sel = this.getFeatureAtPixel_(evt.pixel);
	var feature = sel.feature;
	if (this.feature_ && this.feature_==feature && ((this.ispt_ && this.get('translate')) || this.get('translateFeature')))
	{	sel.handle = 'translate';
	}
	if (sel.handle)
	{	this.mode_ = sel.handle;
		this.opt_ = sel.option;
		this.constraint_ = sel.constraint;
		// Save info
		this.coordinate_ = evt.coordinate;
		this.pixel_ = evt.pixel;
		this.geom_ = this.feature_.getGeometry().clone();
		this.extent_ = (ol.geom.Polygon.fromExtent(this.geom_.getExtent())).getCoordinates()[0];
		this.center_ = ol.extent.getCenter(this.geom_.getExtent());
		this.angle_ = Math.atan2(this.center_[1]-evt.coordinate[1], this.center_[0]-evt.coordinate[0]);

		this.dispatchEvent({ type:this.mode_+'start', feature: this.feature_, pixel: evt.pixel, coordinate: evt.coordinate });
		return true;
	}
	else
	{	this.feature_ = feature;
		this.ispt_ = this.feature_ ? (this.feature_.getGeometry().getType() == "Point") : false;
		this.drawSketch_();
		this.dispatchEvent({ type:'select', feature: this.feature_, pixel: evt.pixel, coordinate: evt.coordinate });
		return false;
	}

};


/**
 * @param {ol.MapBrowserEvent} evt Map browser event.
 */
ol.interaction.Transform.prototype.handleDragEvent_ = function(evt) 
{
	switch (this.mode_)
	{	case 'rotate':
		{	var a = Math.atan2(this.center_[1]-evt.coordinate[1], this.center_[0]-evt.coordinate[0]);
			if (!this.ispt)
			{	var geometry = this.geom_.clone();
				geometry.rotate(a-this.angle_, this.center_);
				
				this.feature_.setGeometry(geometry);
			}
			this.drawSketch_(true);
			this.dispatchEvent({ type:'rotating', feature: this.feature_, angle: a-this.angle_, pixel: evt.pixel, coordinate: evt.coordinate });
			break;
		}
		case 'translate':
		{	var deltaX = evt.coordinate[0] - this.coordinate_[0];
			var deltaY = evt.coordinate[1] - this.coordinate_[1];

			this.feature_.getGeometry().translate(deltaX, deltaY);
			this.handles_.forEach(function(f)
			{	f.getGeometry().translate(deltaX, deltaY);
			});

			this.coordinate_ = evt.coordinate;
			this.dispatchEvent({ type:'translating', feature: this.feature_, delta:[deltaX,deltaY], pixel: evt.pixel, coordinate: evt.coordinate });
			break;
		}
		case 'scale':
		{	var center = this.center_;
			if (evt.originalEvent.metaKey || evt.originalEvent.ctrlKey)
			{	center = this.extent_[(Number(this.opt_)+2)%4];
			}

			var scx = (evt.coordinate[0] - center[0]) / (this.coordinate_[0] - center[0]);
			var scy = (evt.coordinate[1] - center[1]) / (this.coordinate_[1] - center[1]);

			if (this.constraint_)
			{	if (this.constraint_=="h") scx=1;
				else scy=1;
			}
			else
			{	if (this.get('keepAspectRatio')(evt)) //evt.originalEvent.shiftKey)
				{	scx = scy = Math.min(scx,scy);
				}
			}

			var geometry = this.geom_.clone();
			geometry.applyTransform(function(g1, g2, dim)
			{	if (dim<2) return g2;
				
				for (i=0; i<g1.length; i+=dim)
				{	if (scx!=1) g2[i] = center[0] + (g1[i]-center[0])*scx;
					if (scy!=1) g2[i+1] = center[1] + (g1[i+1]-center[1])*scy;
				}
				return g2;
			});
			this.feature_.setGeometry(geometry);
			this.drawSketch_();
			this.dispatchEvent({ type:'scaling', feature: this.feature_, scale:[scx,scy], pixel: evt.pixel, coordinate: evt.coordinate });
		}
		default: break;
	}
};

/**
 * @param {ol.MapBrowserEvent} evt Event.
 */
ol.interaction.Transform.prototype.handleMoveEvent_ = function(evt) 
{
	// console.log("handleMoveEvent");
	if (!this.mode_) 
	{	var map = evt.map;
		var sel = this.getFeatureAtPixel_(evt.pixel);
		var element = evt.map.getTargetElement();
		if (sel.feature) 
		{	var c = sel.handle ? this.Cursors[(sel.handle||'default')+(sel.constraint||'')+(sel.option||'')] : this.Cursors.select;
			
			if (this.previousCursor_===undefined) 
			{	this.previousCursor_ = element.style.cursor;
			}
			element.style.cursor = c;
		} 
		else  
		{	if (this.previousCursor_!==undefined) element.style.cursor = this.previousCursor_;
			this.previousCursor_ = undefined;
		}
	}
};


/**
 * @param {ol.MapBrowserEvent} evt Map browser event.
 * @return {boolean} `false` to stop the drag sequence.
 */
ol.interaction.Transform.prototype.handleUpEvent_ = function(evt) 
{	//dispatchEvent 
	this.dispatchEvent({ type:this.mode_+'end', feature: this.feature_, oldgeom: this.geom_ });
	
	this.drawSketch_();
	this.mode_ = null;
	return false;
};

/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
	
	@classdesc
	ol.source.DBPedia is a DBPedia layer source that load DBPedia located content in a vector layer.
	
	olx.source.DBPedia: olx.source.Vector
	{	url: {string} Url for DBPedia SPARQL 
	}

	@require jQuery
	
	Inherits from:
	<ol.source.Vector>
*/

/**
* @constructor ol.source.DBPedia
* @extends {ol.source.Vector}
* @param {olx.source.DBPedia=} options
*/
ol.source.DBPedia = function(opt_options)
{	var options = opt_options || {};
	var self = this; 

	options.loader = this._loaderFn;
	
	/** Url for DBPedia SPARQL */
	this._url = options.url || "http://fr.dbpedia.org/sparql";

	/** Max resolution to load features  */
	this._maxResolution = options.maxResolution || 100;
	
	/** Result language */
	this._lang = options.lang || "fr";

	/** Query limit */
	this._limit = options.limit || 1000;
	
	/** Default attribution */
	if (!options.attributions) options.attributions = [ new ol.Attribution({ html:"&copy; <a href='http://dbpedia.org/'>DBpedia</a> CC-by-SA" }) ];

	// Bbox strategy : reload at each move
    if (!options.strategy) options.strategy = ol.loadingstrategy.bbox;

	ol.source.Vector.call (this, options);	
};
ol.inherits (ol.source.DBPedia, ol.source.Vector);


/** Decode RDF attributes and choose to add feature to the layer
* @param {feature} the feature
* @param {attributes} RDF attributes
* @param {lastfeature} last feature added (null if none)
* @return {boolean} true: add the feature to the layer
* @API stable
*/
ol.source.DBPedia.prototype.readFeature = function (feature, attributes, lastfeature)
{	// Copy RDF attributes values
	for (var i in attributes) feature.set (i, attributes[i].value);

	// Prevent same feature with different type duplication
	if (lastfeature && lastfeature.get("subject") == attributes.subject.value)
	{	// Kepp dbpedia.org type ?
		// if (bindings[i].type.match ("dbpedia.org") lastfeature.get("type") = bindings[i].type.value;
		// Concat types
		lastfeature.set("type", lastfeature.get("type") +"\n"+ attributes.type.value);
		return false;
	}
	else 
	{	return true;
	}
};

/** Set RDF query subject, default: select label, thumbnail, abstract and type
* @API stable
*/
ol.source.DBPedia.prototype.querySubject = function ()
{	return "?subject rdfs:label ?label. "
		+ "OPTIONAL {?subject dbpedia-owl:thumbnail ?thumbnail}."
		+ "OPTIONAL {?subject dbpedia-owl:abstract ?abstract} . "
		+ "OPTIONAL {?subject rdf:type ?type}";
}

/** Set RDF query filter, default: select language
* @API stable
*/
ol.source.DBPedia.prototype.queryFilter = function ()
{	return	 "lang(?label) = '"+this._lang+"' "
		+ "&& lang(?abstract) = '"+this._lang+"'"
	// Filter on type 
	//+ "&& regex (?type, 'Monument|Sculpture|Museum', 'i')"
}


/** Loader function used to load features.
* @private
*/
ol.source.DBPedia.prototype._loaderFn = function(extent, resolution, projection) 
{	if (resolution > this._maxResolution) return;
	var self = this;
	var bbox = ol.proj.transformExtent(extent, projection, "EPSG:4326");
	// SPARQL request: for more info @see http://fr.dbpedia.org/
	query =	"PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#> "
				+ "SELECT DISTINCT * WHERE { "
				+ "?subject geo:lat ?lat . "
				+ "?subject geo:long ?long . "
				+ this.querySubject()+" . "
				+ "FILTER("+this.queryFilter()+") . "
				// Filter bbox
				+ "FILTER(xsd:float(?lat) <= " + bbox[3] + " && " + bbox[1] + " <= xsd:float(?lat) "
				+ "&& xsd:float(?long) <= " + bbox[2] + " && " + bbox[0] + " <= xsd:float(?long) "
				+ ") . "
				+ "} LIMIT "+this._limit;

	// Ajax request to get the tile
	$.ajax(
	{	url: this._url,
		dataType: 'jsonp', 
		data: { query: query, format:"json" },
		success: function(data) 
		{	var bindings = data.results.bindings;
			var features = [];
			var att, pt, feature, lastfeature = null;
			for ( var i in bindings )
			{	att = bindings[i];
				pt = [Number(bindings[i].long.value), Number(bindings[i].lat.value)];
				feature = new ol.Feature(new ol.geom.Point(ol.proj.transform (pt,"EPSG:4326",projection)));
				if (self.readFeature(feature, att, lastfeature))
				{	features.push(feature);
					lastfeature = feature;
				}
			}
			self.addFeatures(features);
    }});
};

(function(){

// Style cache
var styleCache = {};

/** Reset the cache (when fonts are loaded)
*/
ol.style.clearDBPediaStyleCache = function()
{	styleCache = {};
}

/** Get a default style function for dbpedia
* @param {} options
* @param {string|function|undefined} options.glyph a glyph name or a function that takes a feature and return a glyph
* @param {number} options.radius radius of the symbol, default 8
* @param {ol.style.Fill} options.fill style for fill, default navy
* @param {ol.style.stroke} options.stroke style for stroke, default 2px white
* @param {string} options.prefix a prefix if many style used for the same type
*
* @require ol.style.FontSymbol and FontAwesome defs are required for dbPediaStyleFunction()
*/
ol.style.dbPediaStyleFunction = function(options)
{	if (!options) options={};
	// Get font function using dbPedia type
	var getFont;
	switch (typeof(options.glyph))
	{	case "function": getFont = options.glyph; break;
		case "string": getFont = function(){ return options.glyph; }; break;
		default:
		{	getFont = function (f)
			{	var type = f.get("type");
				if (type)
				{	if (type.match("/Museum")) return "fa-camera";
					else if (type.match("/Monument")) return "fa-building";
					else if (type.match("/Sculpture")) return "fa-android";
					else if (type.match("/Religious")) return "fa-institution";
					else if (type.match("/Castle")) return "fa-key";
					else if (type.match("Water")) return "fa-tint";
					else if (type.match("Island")) return "fa-leaf";
					else if (type.match("/Event")) return "fa-heart";
					else if (type.match("/Artwork")) return "fa-asterisk";
					else if (type.match("/Stadium")) return "fa-futbol-o";
					else if (type.match("/Place")) return "fa-street-view";
				}
				return "fa-star";
			}
			break;
		}
	}
	// Default values
	var radius = options.radius || 8;
	var fill = options.fill || new ol.style.Fill({ color:"navy"});
	var stroke = options.stroke || new ol.style.Stroke({ color: "#fff", width: 2 });
	var prefix = options.prefix ? options.prefix+"_" : "";
	// Vector style function
	return function (feature, resolution)
	{	var glyph = getFont(feature);
		var k = prefix + glyph;
		var style = styleCache[k];
		if (!style)
		{	styleCache[k] = style = new ol.style.Style
			({	image: new ol.style.FontSymbol(
						{	glyph: glyph, 
							radius: radius, 
							fill: fill,
							stroke: stroke
						})
			});
		}
		return [style];
	}
};

})();

/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
	
	ol.source.GeoImage is a layer source with georeferencement to place it on a map.
	
	olx.source.GeoImageOptions:
	{	url: {string} url of the static image
		image: {image} the static image, if not provided, use url to load an image
		imageCenter: {ol.Coordinate} of the center of the image
		imageScale: {ol.Size|Number} [scalex, scaley] of the image
		imageRotate: {number} angle of the image in radian, default 0
		imageCrop: {ol.Extent} of the image to be show (in the image) default: [0,0,imageWidth,imageHeight]
		imageMask: {Array.<ol.Coordinate>} - linestring to mask the image on the map
	}
*/

/** Layer source with georeferencement to place it on a map
* @constructor 
* @extends {ol.source.ImageCanvas}
* @param {olx.source.GeoImageOptions=} options
*/
ol.source.GeoImage = function(opt_options)
{	var options = { 
		attributions: opt_options.attributions,
		logo: opt_options.logo,
		projection: opt_options.projection
	};
	
	// options.projection = opt_options.projection;

	// Coordinate of the image center 
	this.center = opt_options.imageCenter;
	// Scale of the image 
	this.scale = opt_options.imageScale;
	// Rotation of the image
	this.rotate = opt_options.imageRotate ? opt_options.imageRotate : 0;
	// Crop of the image
	this.crop = opt_options.imageCrop;
	// Mask of the image
	this.mask = opt_options.imageMask;

	// Load Image
	this.image = (opt_options.image ? opt_options.image : new Image );
	this.image.crossOrigin = opt_options.crossOrigin; // 'anonymous';
	// Show image on load
	var self = this;
	this.image.onload = function()
	{	self.setCrop (self.crop);
		self.changed();
	}
	if (!opt_options.image) this.image.src = opt_options.url;

	// Draw image on canvas
	options.canvasFunction = function(extent, resolution, pixelRatio, size, projection) 
	{	var canvas = document.createElement('canvas');
		canvas.width = size[0];
		canvas.height = size[1];
		var ctx = canvas.getContext('2d');

		if (!this.imageSize) return canvas;
		// transform coords to pixel
		function tr(xy)
		{	return [(xy[0]-extent[0])/(extent[2]-extent[0]) * size[0],
					(xy[1]-extent[3])/(extent[1]-extent[3]) * size[1]
					];
		}
		// Clipping mask
		if (this.mask)
		{	ctx.beginPath();
			var p = tr(this.mask[0]);
			ctx.moveTo(p[0],p[1]);
			for (var i=1; i<this.mask.length; i++) 
			{	p = tr(this.mask[i]);
				ctx.lineTo(p[0],p[1]);
			}
			ctx.clip();
		}
		
		// Draw
		var pixel = tr(this.center);
		var dx = (this.image.naturalWidth/2 - this.crop[0]) *this.scale[0] /resolution *pixelRatio;
		var dy = (this.image.naturalHeight/2 - this.crop[1]) *this.scale[1] /resolution *pixelRatio;
		var sx = this.imageSize[0]*this.scale[0]/resolution *pixelRatio;
		var sy = this.imageSize[1]*this.scale[1]/resolution *pixelRatio;

		ctx.translate(pixel[0],pixel[1]);
		if (this.rotate) ctx.rotate(this.rotate);
		ctx.drawImage(this.image, this.crop[0], this.crop[1], this.imageSize[0], this.imageSize[1], -dx, -dy, sx,sy);
		return canvas;
	}

	ol.source.ImageCanvas.call (this, options);	
	this.setCrop (this.crop);
};
ol.inherits (ol.source.GeoImage, ol.source.ImageCanvas);

/**
 * Get coordinate of the image center.
 * @return {ol.Coordinate} coordinate of the image center.
 * @api stable
 */
ol.source.GeoImage.prototype.getCenter = function()
{	return this.center;
}
/**
 * Set coordinate of the image center.
 * @param {ol.Coordinate} coordinate of the image center.
 * @api stable
 */
ol.source.GeoImage.prototype.setCenter = function(center)
{	this.center = center;
	this.changed();
}

/**
 * Get image scale.
 * @return {ol.size} image scale (along x and y axis).
 * @api stable
 */
ol.source.GeoImage.prototype.getScale = function()
{	return this.scale;
}
/**
 * Set image scale.
 * @param {ol.size|Number} image scale (along x and y axis or both).
 * @api stable
 */
ol.source.GeoImage.prototype.setScale = function(scale)
{	switch (typeof(scale))
	{	case 'number':
			scale = [scale,scale];
			break;
		case 'object': 
			if (scale.length != 2) return;
			break;
		default: return;
	}
	this.scale = scale;
	this.changed();
}

/**
 * Get image rotation.
 * @return {Number} rotation in degre.
 * @api stable
 */
 ol.source.GeoImage.prototype.getRotation = function()
{	return this.rotate;
}
/**
 * Set image rotation.
 * @param {Number} rotation in radian.
 * @api stable
 */
 ol.source.GeoImage.prototype.setRotation = function(angle)
{	this.rotate = angle;
	this.changed();
}

/**
 * Get the image.
 * @api stable
 */
 ol.source.GeoImage.prototype.getImage = function()
{	return this.image;
}

/**
 * Get image crop extent.
 * @return {ol.extent} image crop extent.
 * @api stable
 */
 ol.source.GeoImage.prototype.getCrop = function()
{	return this.crop;
}


/**
 * Set image mask.
 * @param {ol.geom.LineString} coords of the mask
 * @api stable
 */
 ol.source.GeoImage.prototype.setMask = function(mask)
{	this.mask = mask;
	this.changed();
}

/**
 * Get image mask.
 * @return {ol.geom.LineString} coords of the mask
 * @api stable
 */
 ol.source.GeoImage.prototype.getMask = function()
{	return this.mask;
}

/**
 * Set image crop extent.
 * @param {ol.extent|Number} image crop extent or a number to crop from original size.
 * @api stable
 */
 ol.source.GeoImage.prototype.setCrop = function(crop)
{	// Image not loaded => get it latter
	if (!this.image.naturalWidth) 
	{	this.crop = crop;
		return;
	}
	if (crop) 
	{	switch (typeof(crop))
		{	case 'number':
				crop = [crop,crop,this.image.naturalWidth-crop,this.image.naturalHeight-crop];
				break;
			case 'object': 
				if (crop.length != 4) return;
				break;
			default: return;
		}
		var crop = ol.extent.boundingExtent([ [crop[0],crop[1]], [crop[2],crop[3]] ]);
		this.crop = [ Math.max(0,crop[0]), Math.max(0,crop[1]), Math.min(this.image.naturalWidth,crop[2]), Math.min(this.image.naturalHeight,crop[3]) ];
	}
	else this.crop = [0,0, this.image.naturalWidth,this.image.naturalHeight];
	if (this.crop[2]<=this.crop[0]) this.crop[2] = this.crop[0]+1;
	if (this.crop[3]<=this.crop[1]) this.crop[3] = this.crop[1]+1;
	this.imageSize = [ this.crop[2]-this.crop[0], this.crop[3]-this.crop[1] ];
	this.changed();
}

/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * Return a preview image of the source.
 * @param {ol.Coordinate|undefined} lonlat The center of the preview.
 * @param {number} resolution of the preview.
 * @return {String} the preview url
 * @api
 */
ol.source.Source.prototype.getPreview = function(lonlat, resolution)
{	return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAk6QAAJOkBUCTn+AAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANeSURBVHic7ZpPiE1RHMc/780MBhkik79JSUlIUbOxI+wkI2yRhYSUlJLNpJF/xcpiJBmZGBZsNM1CkmhKITGkGbH0/BuPmXnP4rxbb/TOn3fvOffeec6nfqvb/b7f93fveeec37ng8Xg8Ho/nf6Uu4d+fDswFssCvhHOJhaXAMeApMAQUyyIPPAdOAiuTStAVy4EHjDWsix5gdRLJ2mY34ulWYz6IEeA4kIk9awtkgTOEM/5vdAKT4k0/Ou3YMR/ELcbRm9AKFLBbgCJwNE4TYZkJfMG++SIwDCyLz0o4bI17WdyJz0r1TAZ+oDcxCBwAFgIzEIuhvcBbg3sLwOK4DFXLFvQGniCGSSUagS4DjUPOHESkA3XiOWCORqMR6Nfo9DjI3QqPUSd+ylBnv0Zn0GrWFvmIOvGNhjqrNDp/EAutyFgRKUM2tgO+Gur81FxvAKYZaimxXYBvmuuLDHWWaK4X0RfJCNsF6NdcbzXU2a65PohYFKWOc+jn8PUajbWIXaBKp9NB7lZYh34OzwFbFfd/NtDYYSth27urLGIm0M31AL3APWAAmIooymaDnPIl/Vz4NN1yHrd7gcvxWQnHAuA3bsyPop8hUsE13BSgK04TUViBeFo2zedJ8S6wElexW4D2eNOPTjNi6WvD/DtEr8E6tk6GGoAmxFY2iFHE9NZiQf8gogiB9gTEH23izAZuE77vHyU+ANucO1QwD3hD/MbLowAcdm20EmkwXx4n3NodS9rMB2HabYpEWs0HcRqHp0fNwAvJD+eBTZr7p6BvmQVxUaEzEbiruNfJekH15L8jtrEm7JJolEcOmKXRqQOuKDQuY7HZY8s8iNfzkSLxIuI43FTrkkLnOlBfRW4VsWk+oAX5weknxFAxJQNckGgVgZuIRVoomoGXEmGTMa+iQ6K7M4SW7k24QYgiuDQPYinbhugiF4H3RGtzZYCzyIvQXfpNI1ybLyeLpf5+iTbkRbiP2EcocTHm4+YI8iI8RFHwWjAfsA95Q+YZFU6wasl8wB7kReijtNbIILa0vcg/PRlGfPQwHmlCviDqAzaA+OREtzqr1ejOIDorxlNEjTGUBV4nnUWCvAJxGDlA8q9j3DEArAn2zvXAfOwfl6eVAmJrPpJ0Ih6Px+PxeJLjLwPul3vj5d0eAAAAAElFTkSuQmCC";
};

/**
 * Return the tile image of the source.
 * @param {ol.Coordinate|undefined} lonlat The center of the preview.
 * @param {number} resolution of the preview.
 * @return {String} the preview url
 * @api
 */
ol.source.Tile.prototype.getPreview = function(lonlat, resolution)
{	if (!lonlat) lonlat = [21020, 6355964];
	if (!resolution) resolution = 150;
	
	var coord = this.getTileGrid().getTileCoordForCoordAndResolution(lonlat, resolution);
	var fn = this.getTileUrlFunction();
	return fn.call(this, coord, this.getProjection());
};


/**
 * Return the tile image of the source.
 * @param {ol.Coordinate|undefined} lonlat The center of the preview.
 * @param {number} resolution of the preview.
 * @return {String} the preview url
 * @api
 */
ol.source.TileWMS.prototype.getPreview = function(lonlat, resolution)
{	if (!lonlat) lonlat = [21020, 6355964];
	if (!resolution) resolution = 150;

/*	No way to acces tileUrlFunction...
	var fn = this.getTileUrlFunction();
	return fn.call(this, lonlat, this.getProjection());
*/
	// Use getfeature info instead
	var url = this.getGetFeatureInfoUrl(lonlat, resolution, this.getProjection() || 'EPSG:3857', {});
	url = url.replace(/getfeatureinfo/i,"GetMap");
	return url;
};


/**
 * Return a preview for the layer.
 * @param {ol.Coordinate|undefined} lonlat The center of the preview.
 * @param {number} resolution of the preview.
 * @return {Array<String>} list of preview url
 * @api
 */
ol.layer.Layer.prototype.getPreview = function(lonlat, resolution)
{	if (this.get("preview")) return [ this.get("preview") ];
	if (!resolution) resolution = 150;
	// Get middle resolution
	if (resolution < this.getMinResolution() || resolution > this.getMaxResolution()) 
	{	var rmin = this.getMinResolution(),
			rmax = this.getMaxResolution();
		if (rmax>100000) rmax = 156543;	// min zoom : world
		if (rmin<0.15) rmin = 0.15;	// max zoom 
		resolution = rmax;
		while (rmax>rmin) 
		{	rmin *= 2;
			rmax /= 2;
			resolution = rmin;
		}
	}
	var e = this.getExtent();
	if (!lonlat) lonlat = [21020, 6355964];	// Default lonlat
	if (e && !ol.extent.containsCoordinate(e,lonlat)) lonlat = [ (e[0]+e[2])/2, (e[1]+e[3])/2 ];

	if (this.getSource) return [ this.getSource().getPreview(lonlat, resolution) ];
	return [];
};

/**
 * Return a preview for the layer.
 * @param {ol.Coordinate|undefined} lonlat The center of the preview.
 * @param {number} resolution of the preview.
 * @return {Array<String>} list of preview url
 * @api
 */
ol.layer.Group.prototype.getPreview = function(lonlat, resolution)
{	if (this.get("preview")) return [ this.get("preview") ];
	var t = [];
	if (this.getLayers) 
	{	var l = this.getLayers().getArray();
		for (var i=0; i<l.length; i++) 
		{	t = t.concat(l[i].getPreview(lonlat, resolution));
		}
	}
	return t;
};

/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
	
*/

(function() {

/* Implementation */
function addFeature(f)
{	var h = this._hexgrid.coord2hex(this._geomFn(f));
	var id = h.toString();
	if (this._bin[id]) 
	{	this._bin[id].get('features').push(f);
	}
	else 
	{	var ex = new ol.Feature(new ol.geom.Polygon([this._hexgrid.getHexagon(h)]));
		ex.set('features',[f]);
		ex.set('center', new ol.geom.Point(ol.extent.getCenter(ex.getGeometry().getExtent())));
		this._bin[id] = ex;
		this._source.addFeature(ex);
	}
	f.on("change", modifyFeature, this);
};

// Get the hexagon of a feature
// @return {} the bin id, the index of the feature in the bin and a boolean if the feature has moved to an other bin
function getBin(f)
{	// Test if feature exists in the current hex
	var id = this._hexgrid.coord2hex(this._geomFn(f)).toString();
	if (this._bin[id])
	{	var index = this._bin[id].get('features').indexOf(f);
		if (index > -1) return { id:id, index:index };
	}
	// The feature has moved > check all bins
	for (id in this._bin)
	{	var index = this._bin[id].get('features').indexOf(f);
		if (index > -1) return { id:id, index:index, moved:true };
	}
	return false;
};

function removeFeature(f, bin)
{	var b = bin || getBin.call(this,f);
	if (b)
	{	var features = this._bin[b.id].get('features');
		features.splice(b.index, 1);
		if (!features.length)
		{	this._source.removeFeature(this._bin[b.id]);
			delete this._bin[b.id];
		}
	}
	else 
	{	console.log("[ERROR:HexBin] remove feature feature doesn't exists anymore.");
	}
	f.un("change", modifyFeature, this);
};

function modifyFeature(e)
{	var bin = getBin.call(this,e.target);
	if (bin && bin.moved)
	{	// remove from the bin
		removeFeature.call(this, e.target, bin);
		// insert in the new bin
		addFeature.call (this, e.target);
	}	
	this._source.changed();
};

// Clear all bins and generate a new one
function reset()
{	this._bin = {};
	this._source.clear();
	var features = this._origin.getFeatures();
	for (var i=0, f; f=features[i]; i++)
	{	addFeature.call (this,f);
	};
};

// Init the bin
function hexbinInit(source, options)
{	// The HexGrid
	this._hexgrid = new ol.HexGrid(options);
	this._bin = {};
	// Source and origin
	this._source = source;
	this._origin = options.source;
	// Geometry function to get a point
	this._geomFn = options.geometryFunction || ol.coordinate.getFeatureCenter || function(f) { return f.getGeometry().getFirstCoordinate(); };
	// Existing features
	reset.call(this);
	// Future features
	this._origin.on("addfeature", function(e){ addFeature.call(this, e.feature); }, this);
	this._origin.on("removefeature", function(e){ removeFeature.call(this, e.feature); }, this);
};

/** A source for hexagonal binning
* @constructor 
* @extends {ol.source.Vector}
* @param {} options ol.source.VectorOptions + ol.HexGridOptions
*	@param {ol.source.Vector} options.source Source 
*	@param {Number} options.size size of the exagon in map units, default 80000
*	@param {ol.coordinate} options.origin orgin of the grid, default [0,0]
*	@param {pointy|flat} options.layout grid layout, default pointy
*	@param {function|undefined} options.geometryFunction Function that takes an ol.Feature as argument and returns an ol.geom.Point as feature's center. 
*/
ol.source.HexBin = function(options)
{	options = options || {} ;
	ol.source.Vector.call (this, options);	
	hexbinInit.call(this, this, options);
};
ol.inherits (ol.source.HexBin, ol.source.Vector);

/**
* Get the orginal source 
* @return {ol.source.Vector} 
*/
ol.source.HexBin.prototype.getSource = function()
{	return this._origin;
};

/** An image source for hexagonal binning
* @constructor 
* @extends {ol.source.ImageVector}
* @param {} options ol.source.ImageVectorOptions + ol.HexGridOptions
*	@param {ol.source.Vector} options.source Source 
*	@param {Number} options.size size of the exagon in map units, default 80000
*	@param {ol.coordinate} options.origin orgin of the grid, default [0,0]
*	@param {pointy|flat} options.layout grid layout, default pointy
*	@param {function|undefined} options.geometryFunction Function that takes an ol.Feature as argument and returns an ol.geom.Point as feature's center. 
*/
ol.source.ImageHexBin = function(options)
{	options = options || {} ;
	var source = new ol.source.Vector();
	hexbinInit.call (this, source, options);
	options.source = source;
	// Create source
	ol.source.ImageVector.call (this, options);	
};
ol.inherits (ol.source.ImageHexBin, ol.source.ImageVector);

/**
* Get the orginal source 
* @return {ol.source.Vector} 
*/
ol.source.ImageHexBin.prototype.getOriginSource = function()
{	return this._origin;
};

})();
/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
	
	@classdesc
	ol.source.Mapillary is a source that load Mapillary's geotagged photos in a vector layer.
	
	@require jQuery
	
	Inherits from:
	<ol.source.Vector>
*/

/**
* @constructor ol.source.Mapillary
* @extends {ol.source.Vector}
* @param {olx.source.Mapillary=} options
*/
ol.source.Mapillary = function(opt_options)
{	var options = opt_options || {};
	var self = this; 

	options.loader = this._loaderFn;
	
	/** Max resolution to load features  */
	this._maxResolution = options.maxResolution || 100;
	
	/** Query limit */
	this._limit = options.limit || 100;
	
	/** Default attribution */
	if (!options.attributions) options.attributions = [ new ol.Attribution({ html:"&copy; <a href='https://www.mapillary.com/'>Mapillary</a>" }) ];

	// Bbox strategy : reload at each move
    if (!options.strategy) options.strategy = ol.loadingstrategy.bbox;

	// Init parent
	ol.source.Vector.call (this, options);	

	// Client ID
	// this.set("clientId", options.clientId);
};
ol.inherits (ol.source.Mapillary, ol.source.Vector);


/** Decode wiki attributes and choose to add feature to the layer
* @param {feature} the feature
* @param {attributes} wiki attributes
* @return {boolean} true: add the feature to the layer
* @API stable
*/
ol.source.Mapillary.prototype.readFeature = function (feature, attributes)
{	// Allways read feature (no filter)
	return true;
};


/** Loader function used to load features.
* @private
*/
ol.source.Mapillary.prototype._loaderFn = function(extent, resolution, projection) 
{	if (resolution > this._maxResolution) return;
	var self = this;
	var bbox = ol.proj.transformExtent(extent, projection, "EPSG:4326");
	// Commons API: for more info @see https://www.mapillary.com/developer
	var date = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
	var url = "https://a.mapillary.com/v2/search/im?client_id="
		+ this.get('clientId')
		+ "&max_lat=" + bbox[3]
		+ "&max_lon=" + bbox[2]
		+ "&min_lat=" + bbox[1]
		+ "&min_lon=" + bbox[0]
		+ "&limit="+(this._limit-1)
		+ "&start_time=" + date;
	// Ajax request to get the tile
	$.ajax(
	{	url: url,
		dataType: 'jsonp', 
		success: function(data) 
		{	console.log(data);
			/*
			var features = [];
			var att, pt, feature, lastfeature = null;
			if (data.query && data.query.pages) return;
			for ( var i in data.query.pages)
			{	att = data.query.pages[i];
				if (att.coordinates && att.coordinates.length ) 
				{	pt = [att.coordinates[0].lon, att.coordinates[0].lat];
				}
				else
				{	var meta = att.imageinfo[0].metadata;
					if (!meta)
					{	//console.log(att);
						continue;
					}
					pt = [];
					for (var k=0; k<meta.length; k++)
					{	if (meta[k].name=="GPSLongitude") pt[0] = meta[k].value;
						if (meta[k].name=="GPSLatitude") pt[1] = meta[k].value;
					}
					if (!pt.length) 
					{	//console.log(att);
						continue;
					}
				}
				feature = new ol.Feature(new ol.geom.Point(ol.proj.transform (pt,"EPSG:4326",projection)));
				att.imageinfo[0].title = att.title;
				if (self.readFeature(feature, att.imageinfo[0]))
				{	features.push(feature);
				}
			}
			self.addFeatures(features);
			*/
    }});
};

/** ol.layer.Vector.prototype.setRender3D
 * @extends {ol.layer.Vector}
 * @param {ol.render3D} 
 */
ol.layer.Vector.prototype.setRender3D = function (r)
{	r.setLayer(this);
}

/** 
 *	@classdesc
 *	ol.render3D 3D vector layer rendering
 *	@constructor
 *	@param {olx.render3DOption}
 *		- masResolution {number} max resolution to render 3D
 *		- defaultHeight {number} default height if none is return by a propertie
 *		- height {function|string|Number} a height function (return height giving a feature) or a popertie name for the height or a fixed value
 */
ol.render3D = function (options)
{	var options = options || {};
	
	this.maxResolution_ = options.maxResolution || 100
	this.defaultHeight_ = options.defaultHeight || 0;
	this.height_ = this.getHfn (options.height);
}

/** Calculate 3D at potcompose
*/
ol.render3D.prototype.onPostcompose_ = function(e)
{	var res = e.frameState.viewState.resolution;
	if (res > this.maxResolution_) return;
	this.res_ = res*400;

	if (this.animate_) 
	{	var elapsed = e.frameState.time - this.animate_;
		if (elapsed < this.animateDuration_)
		{	this.elapsedRatio_ = this.easing_(elapsed / this.animateDuration_);
			// tell OL3 to continue postcompose animation
			e.frameState.animate = true;
		}
		else
		{	this.animate_ = false;
			this.height_ = this.toHeight_
		}
	}

	var ratio = e.frameState.pixelRatio;
	var ctx = e.context;
	var m = this.matrix_ = e.frameState.coordinateToPixelTransform;
	// Old version (matrix)
	if (!m)
	{	m = e.frameState.coordinateToPixelMatrix,
		m[2] = m[4];
		m[3] = m[5];
		m[4] = m[12];
		m[5] = m[13];
	}
	this.center_ = [ctx.canvas.width/2/ratio, ctx.canvas.height/ratio];

	var f = this.layer_.getSource().getFeaturesInExtent(e.frameState.extent);
		
	ctx.save();
	ctx.scale(ratio,ratio);
	ctx.lineWidth = 1;
	ctx.strokeStyle = "red";
	ctx.fillStyle = "rgba(0,0,255,0.5)";
	var builds = [];
	for (var i=0; i<f.length; i++)
	{	builds.push (this.getFeature3D_ (f[i], this.getFeatureHeight(f[i])));
	}
	this.drawFeature3D_ (ctx, builds);
	ctx.restore();
}

/** Set layer to render 3D
*/
ol.render3D.prototype.setLayer = function(l)
{	if (this.layer_) this.layer_.un ('postcompose', this.onPostcompose_, this);
	this.layer_ = l;
	l.on ('postcompose', this.onPostcompose_, this);
}

/** Create a function that return height of a feature
*	@param {function|string|number} a height function or a popertie name or a fixed value
*	@return {function} function(f) return height of the feature f
*/
ol.render3D.prototype.getHfn= function(h)
{	switch (typeof(h))
	{	case 'function': return h;
		case 'string': 
			{	var dh = this.defaultHeight_;
				return (function(f) 
				{	return (Number(f.get(h)) || dh); 
				});
			}
		case 'number': return (function(f) { return h; });
		default: return (function(f) { return 10; });
	}
}

/** Animate rendering
*	@param {olx.render3D.animateOptions}
*		- height {string|function|number} an attribute name or a function returning height of a feature or a fixed value
*		- durtion {number} the duration of the animatioin ms, default 1000
*		- easing {ol.easing} an ol easing function
*	@api
*/
ol.render3D.prototype.animate = function(options)
{	options = options || {};
	this.toHeight_ = this.getHfn(options.height);
	this.animate_ = new Date().getTime();
	this.animateDuration_ = options.duration ||1000;
	this.easing_ = options.easing || ol.easing.easeOut;
	// Force redraw
	this.layer_.changed();
}

/** Check if animation is on
*	@return {bool}
*/
ol.render3D.prototype.animating = function()
{	if (this.animate_ && new Date().getTime() - this.animate_ > this.animateDuration_) 
	{	this.animate_ = false;
	}
	return !!this.animate_;
}

/** 
*/
ol.render3D.prototype.getFeatureHeight = function (f)
{	if (this.animate_)
	{	var h1 = this.height_(f);
		var h2 = this.toHeight_(f);
		return (h1*(1-this.elapsedRatio_)+this.elapsedRatio_*h2);
	}
	else return this.height_(f);
}

/**
*/
ol.render3D.prototype.hvector_ = function (pt, h)
{	p0 = [	pt[0]*this.matrix_[0] + pt[1]*this.matrix_[1] + this.matrix_[4],
			pt[0]*this.matrix_[2] + pt[1]*this.matrix_[3] + this.matrix_[5]
		];
	p1 = [	p0[0] + h/this.res_*(p0[0]-this.center_[0]),
			p0[1] + h/this.res_*(p0[1]-this.center_[1])
		];
	return {p0:p0, p1:p1};
}

/**
*/
ol.render3D.prototype.getFeature3D_ = function (f, h)
{	var c = f.getGeometry().getCoordinates();
	switch (f.getGeometry().getType())
	{	case "Polygon":
			c = [c];
		case "MultiPolygon":
			var build = [];
			for (var i=0; i<c.length; i++) 
			{	var p0, p1;
				for (var j=0; j<c[i].length; j++)
				{	var b = [];
					for (var k=0; k<c[i][j].length; k++)
					{	b.push( this.hvector_(c[i][j][k], h) );
					}
					build.push(b);
				}
			}
			return { type:"MultiPolygon", feature:f, geom:build };
		case "Point":
			return { type:"Point", feature:f, geom:this.hvector_(c,h) };
		default: return {};
	}
}

/**
*/
ol.render3D.prototype.drawFeature3D_ = function(ctx, build)
{	// Construct
	for (var i=0; i<build.length; i++) 
	{	
		switch (build[i].type)
		{	case "MultiPolygon":
				for (var j=0; j<build[i].geom.length; j++)
				{	var b = build[i].geom[j];
					for (var k=0; k < b.length; k++)
					{	ctx.beginPath();
						ctx.moveTo(b[k].p0[0], b[k].p0[1]);
						ctx.lineTo(b[k].p1[0], b[k].p1[1]);
						ctx.stroke();
					}
				}
				break;
			case "Point":
				{	var g = build[i].geom;
					ctx.beginPath();
					ctx.moveTo(g.p0[0], g.p0[1]);
					ctx.lineTo(g.p1[0], g.p1[1]);
					ctx.stroke();
					break;
				}
			default: break;
		}
	}
	// Roof
	for (var i=0; i<build.length; i++) 
	{	switch (build[i].type)
		{	case "MultiPolygon":
			{	ctx.beginPath();
				for (var j=0; j<build[i].geom.length; j++)
				{	var b = build[i].geom[j];
					if (j==0)
					{	ctx.moveTo(b[0].p1[0], b[0].p1[1]);
						for (var k=1; k < b.length; k++)
						{	ctx.lineTo(b[k].p1[0], b[k].p1[1]);
						}
					}
					else
					{	ctx.moveTo(b[0].p1[0], b[0].p1[1]);
						for (var k=b.length-2; k>=0; k--)
						{	ctx.lineTo(b[k].p1[0], b[k].p1[1]);
						}
					}
					ctx.closePath();
				}
				ctx.fill("evenodd");
				ctx.stroke();
				break;
			}
			case "Point":
			{	var b = build[i];
				var t = b.feature.get('label');
				var p = b.geom.p1;
				var f = ctx.fillStyle;
				ctx.fillStyle = ctx.strokeStyle;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.fillText ( t, p[0], p[1] );
				var m = ctx.measureText(t);
				var h = Number (ctx.font.match(/\d+(\.\d+)?/g).join([]));
				ctx.fillStyle = "rgba(255,255,255,0.5)";
				ctx.fillRect (p[0]-m.width/2 -5, p[1]-h -5, m.width +10, h +10)
				ctx.strokeRect (p[0]-m.width/2 -5, p[1]-h -5, m.width +10, h +10)
				ctx.fillStyle = f;
				//console.log(build[i].feature.getProperties())
			}
			default: break;
		}
	}
}

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
	
	@classdesc
	ol.source.WikiCommons is a source that load Wikimedia Commons content in a vector layer.
	
	@require jQuery
	
	Inherits from:
	<ol.source.Vector>
*/

/**
* @constructor ol.source.WikiCommons
* @extends {ol.source.Vector}
* @param {olx.source.WikiCommons=} options
*/
ol.source.WikiCommons = function(opt_options)
{	var options = opt_options || {};
	var self = this; 

	options.loader = this._loaderFn;
	
	/** Max resolution to load features  */
	this._maxResolution = options.maxResolution || 100;
	
	/** Result language */
	this._lang = options.lang || "fr";

	/** Query limit */
	this._limit = options.limit || 100;
	
	/** Default attribution */
	if (!options.attributions) options.attributions = [ new ol.Attribution({ html:"&copy; <a href='https://commons.wikimedia.org/'>Wikimedia Commons</a>" }) ];

	// Bbox strategy : reload at each move
    if (!options.strategy) options.strategy = ol.loadingstrategy.bbox;

	ol.source.Vector.call (this, options);	
};
ol.inherits (ol.source.WikiCommons, ol.source.Vector);


/** Decode wiki attributes and choose to add feature to the layer
* @param {feature} the feature
* @param {attributes} wiki attributes
* @return {boolean} true: add the feature to the layer
* @API stable
*/
ol.source.WikiCommons.prototype.readFeature = function (feature, attributes)
{	feature.set("descriptionurl", attributes.descriptionurl);
	feature.set("url", attributes.url);
	feature.set("title", attributes.title.replace(/^file:|.jpg$/ig,""));
	feature.set("thumbnail", attributes.url.replace(/^(.+wikipedia\/commons)\/([a-zA-Z0-9]\/[a-zA-Z0-9]{2})\/(.+)$/,"$1/thumb/$2/$3/200px-$3"));
	feature.set("user", attributes.user);
	if (attributes.extmetadata && attributes.extmetadata.LicenseShortName) feature.set("copy", attributes.extmetadata.LicenseShortName.value);
	return true;
};


/** Loader function used to load features.
* @private
*/
ol.source.WikiCommons.prototype._loaderFn = function(extent, resolution, projection) 
{	if (resolution > this._maxResolution) return;
	var self = this;
	var bbox = ol.proj.transformExtent(extent, projection, "EPSG:4326");
	// Commons API: for more info @see https://commons.wikimedia.org/wiki/Commons:API/MediaWiki
	var url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=coordinates|imageinfo"
		+ "&generator=geosearch&iiprop=timestamp|user|url|extmetadata|metadata|size&iiextmetadatafilter=LicenseShortName"
		+ "&ggsbbox=" + bbox[3] + "|" + bbox[0] + "|" + bbox[1] + "|" + bbox[2]
		+ "&ggslimit="+this._limit
		+ "&iilimit="+(this._limit-1)
		+ "&ggsnamespace=6";

	// Ajax request to get the tile
	$.ajax(
	{	url: url,
		dataType: 'jsonp', 
		success: function(data) 
		{	//console.log(data);
			var features = [];
			var att, pt, feature, lastfeature = null;
			if (!data.query || !data.query.pages) return;
			for ( var i in data.query.pages)
			{	att = data.query.pages[i];
				if (att.coordinates && att.coordinates.length ) 
				{	pt = [att.coordinates[0].lon, att.coordinates[0].lat];
				}
				else
				{	var meta = att.imageinfo[0].metadata;
					if (!meta)
					{	//console.log(att);
						continue;
					}
					pt = [];
					var found=0;
					for (var k=0; k<meta.length; k++)
					{	if (meta[k].name=="GPSLongitude") 
						{	pt[0] = meta[k].value;
							found++;
						}
						if (meta[k].name=="GPSLatitude") 
						{	pt[1] = meta[k].value;
							found++;
						}
					}
					if (found!=2) 
					{	//console.log(att);
						continue;
					}
				}
				feature = new ol.Feature(new ol.geom.Point(ol.proj.transform (pt,"EPSG:4326",projection)));
				att.imageinfo[0].title = att.title;
				if (self.readFeature(feature, att.imageinfo[0]))
				{	features.push(feature);
				}
			}
			self.addFeatures(features);
    }});
};

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * @classdesc
 *	The Magnify overlay add a "magnifying glass" effect to an OL3 map that displays 
 *	a portion of the map in a different zoom (and actually display different content).
 *
 * @constructor
 * @extends {ol.Overlay}
 * @param {olx.OverlayOptions} options Overlay options 
 * @api stable
 */
ol.Overlay.Magnify = function (options)
{	var self = this;
	
	var elt = $("<div>").addClass("ol-magnify");
	this.element = elt.get(0);

	ol.Overlay.call(this, 
		{	positioning: options.positioning || "center-center",
			element: this.element,
			stopEvent: false
		});

	// Create magnify map
	this.mgmap_ = new ol.Map(
	{	controls: new ol.Collection(),
		interactions: new ol.Collection(),
		target: options.target || this.element,
		view: new ol.View({ projection: options.projection }),
		layers: options.layers
	});
	this.mgview_ = this.mgmap_.getView();
	
	this.external_ = options.target?true:false;

	this.set("zoomOffset", options.zoomOffset||1);
	this.set("active", true);
	this.on("propertychange", this.setView_, this);
}
ol.inherits(ol.Overlay.Magnify, ol.Overlay);

/**
 * Set the map instance the overlay is associated with.
 * @param {ol.Map} map The map instance.
 */
ol.Overlay.Magnify.prototype.setMap = function(map)
{	if (this.getMap())
	{	$(this.getMap().getViewport()).off("mousemove", this.onMouseMove_);
		this.getMap().getView().un('propertychange', this.setView_, this);
	}

	ol.Overlay.prototype.setMap.call(this, map);
	var self = this;
	$(map.getViewport()).on("mousemove", {self:this}, this.onMouseMove_);
	map.getView().on('propertychange', this.setView_, this);

	this.setView_();
}

/** Get the magnifier map
*	@return {ol.Map}
*/
ol.Overlay.Magnify.prototype.getMagMap = function()
{	return this.mgmap_;
}

/** Magnify is active
*	@return {boolean}
*/
ol.Overlay.Magnify.prototype.getActive = function()
{	return this.get("active");
}

/** Activate or deactivate 
*	@param {boolean} active
*/
ol.Overlay.Magnify.prototype.setActive = function(active)
{	return this.set("active", active);
}

/** Mouse move
 * @private
 */
ol.Overlay.Magnify.prototype.onMouseMove_ = function(e)
{	var self = e.data.self;
	if (!self.get("active"))
	{	self.setPosition();
	}
	else
	{	var px = self.getMap().getEventCoordinate(e);
		if (!self.external_) self.setPosition(px);
		self.mgview_.setCenter(px);
		if ($("canvas", self.element).css("display")=="none") self.mgmap_.updateSize();
	}
}

/** View has changed
 * @private
 */
ol.Overlay.Magnify.prototype.setView_ = function(e)
{	if (!this.get("active"))
	{	this.setPosition();
		return;
	}
	
	if (!e) 
	{	// refresh all
		this.setView_({key:'rotation'});
		this.setView_({key:'resolution'});
		return;
	}

	// Set the view params
	switch (e.key)
	{	case 'rotation':
			this.mgview_.setRotation(this.getMap().getView().getRotation());
			break;
		case 'zoomOffset':
		case 'resolution':
		{	var z = Math.max(0,this.getMap().getView().getZoom()+Number(this.get("zoomOffset")));
			this.mgview_.setZoom(z);
			break;
		}
		default: break;
	}
}
/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * @classdesc
 * A popup element to be displayed over the map and attached to a single map
 * location. The popup are customized using CSS.
 *
 * @example
var popup = new ol.Overlay.Popup();
map.addOverlay(popup);
popup.show(coordinate, "Hello!");
popup.hide();
 *
 * @constructor
 * @extends {ol.Overlay}
 * @param {} options Extend Overlay options 
 *	@param {String} options.popupClass the a class of the overlay to style the popup.
 *	@param {bool} options.closeBox popup has a close box, default false.
 *	@param {function|undefined} options.onclose: callback function when popup is closed
 *	@param {function|undefined} options.onshow callback function when popup is shown
 *	@param {ol.OverlayPositioning | string | undefined} options.positionning 
 *		the 'auto' positionning let the popup choose its positioning to stay on the map.
 * @api stable
 */
ol.Overlay.Popup = function (options)
{	var self = this;
	var elt = $("<div>");
	options.element = elt.get(0);
	this.offsetBox = options.offsetBox;
	// Anchor div
	$("<div>").addClass("anchor").appendTo(elt);
	var d = $("<div>").addClass('ol-overlaycontainer-stopevent').appendTo(elt);
	// Content
	this.content = $("<div>").addClass("content").appendTo(d).get(0);
	// Closebox
	this.closeBox = options.closeBox;
	this.onclose = options.onclose;      
	this.onshow = options.onshow;      
	$("<button>").addClass("closeBox").addClass(options.closeBox?"hasclosebox":"")
				.attr('type', 'button')
				.prependTo(d)
				.click(function()
				{	self.hide();
				});
	// Stop event
	options.stopEvent = true;
	d.on("mousedown touchstart", function(e){ e.stopPropagation(); })

	ol.Overlay.call(this, options);
	this._elt = elt;
			
	// call setPositioning first in constructor so getClassPositioning is called only once
	this.setPositioning(options.positioning);
	this.setPopupClass(options.popupClass);
}
ol.inherits(ol.Overlay.Popup, ol.Overlay);

/**
 * Get CSS class of the popup according to its positioning.
 * @private
 */
ol.Overlay.Popup.prototype.getClassPositioning = function ()
{	var c = "";
	var pos = this.getPositioning();
	if (/bottom/.test(pos)) c += "ol-popup-bottom ";
	if (/top/.test(pos)) c += "ol-popup-top ";
	if (/left/.test(pos)) c += "ol-popup-left ";
	if (/right/.test(pos)) c += "ol-popup-right ";
	if (/^center/.test(pos)) c += "ol-popup-middle ";
	if (/center$/.test(pos)) c += "ol-popup-center ";
	return c;
}

/**
 * Set a close box to the popup.
 * @param {bool} b
 * @api stable
 */
ol.Overlay.Popup.prototype.setClosebox = function (b)
{	this.closeBox = b;
	if (b) this._elt.addClass("hasclosebox");
	else this._elt.removeClass("hasclosebox");
}

/**
 * Set the CSS class of the popup.
 * @param {string} c class name.
 * @api stable
 */
ol.Overlay.Popup.prototype.setPopupClass = function (c)
{	this._elt.removeClass()
		.addClass("ol-popup "+(c||"default")+" "+this.getClassPositioning()+(this.closeBox?" hasclosebox":""));
}

/**
 * Add a CSS class to the popup.
 * @param {string} c class name.
 * @api stable
 */
ol.Overlay.Popup.prototype.addPopupClass = function (c)
{	this._elt.addClass(c);
}

/**
 * Remove a CSS class to the popup.
 * @param {string} c class name.
 * @api stable
 */
ol.Overlay.Popup.prototype.removePopupClass = function (c)
{	this._elt.removeClass(c);
}

/**
 * Set positionning of the popup
 * @param {ol.OverlayPositioning | string | undefined} pos an ol.OverlayPositioning 
 * 		or 'auto' to let the popup choose the best position 
 * @api stable
 */
ol.Overlay.Popup.prototype.setPositioning = function (pos)
{	if (pos === undefined)
		return;
	if (/auto/.test(pos))
	{	this.autoPositioning = pos.split('-');
		if (this.autoPositioning.length==1) this.autoPositioning[1]="auto";
	}
	else this.autoPositioning = false;
	pos = pos.replace(/auto/g,"center");
	if (pos=="center") pos = "bottom-center";
	this.setPositioning_(pos);
}

/** @private
 * @param {ol.OverlayPositioning | string | undefined} pos  
 */
ol.Overlay.Popup.prototype.setPositioning_ = function (pos)
{	ol.Overlay.prototype.setPositioning.call(this, pos);
	this._elt.removeClass("ol-popup-top ol-popup-bottom ol-popup-left ol-popup-right ol-popup-center ol-popup-middle");
	this._elt.addClass(this.getClassPositioning());
}

/** Check if popup is visible
* @return {boolean}
*/
ol.Overlay.Popup.prototype.getVisible = function ()
{	return this._elt.hasClass("visible");
};

/**
 * Set the position and the content of the popup.
 * @param {ol.Coordinate|string} coordinate the coordinate of the popup or the HTML content.
 * @param {string|undefined} html the HTML content (undefined = previous content).
 * @example
var popup = new ol.Overlay.Popup();
// Show popup
popup.show([166000, 5992000], "Hello world!");
// Move popup at coord with the same info
popup.show([167000, 5990000]);
// set new info
popup.show("New informations");
 * @api stable
 */
ol.Overlay.Popup.prototype.show = function (coordinate, html)
{	if (!html && typeof(coordinate)=='string') 
	{	html = coordinate; 
		coordinate = null;
	}
	
	var self = this;
	var map = this.getMap();
	if (!map) return;
	
	if (html && html !== this.prevHTML) 
	{	// Prevent flickering effect
		this.prevHTML = html;
		$(this.content).html("").append(html);
		// Refresh when loaded (img)
		$("*", this.content).on('load',function()
		{	map.renderSync();
		})
	}

	if (coordinate) 
	{	// Auto positionning
		if (this.autoPositioning)
		{	var p = map.getPixelFromCoordinate(coordinate);
			var s = map.getSize();
			var pos=[];
			if (this.autoPositioning[0]=='auto')
			{	pos[0] = (p[1]<s[1]/3) ? "top" : "bottom";
			}
			else pos[0] = this.autoPositioning[0];
			pos[1] = (p[0]<2*s[0]/3) ? "left" : "right";
			this.setPositioning_(pos[0]+"-"+pos[1]);
			if (this.offsetBox)
			{	this.setOffset([this.offsetBox[pos[1]=="left"?2:0], this.offsetBox[pos[0]=="top"?3:1] ]);
			}
		}
		// Show
		this.setPosition(coordinate);
		// Set visible class (wait to compute the size/position first)
		this._elt.parent().show();
                if (typeof (this.onshow) == 'function') this.onshow();
		this._tout = setTimeout (function()
		{	self._elt.addClass("visible"); 
		}, 0);
	}
};

/**
 * Hide the popup
 * @api stable
 */
ol.Overlay.Popup.prototype.hide = function ()
{	if (this.getPosition() == undefined) return;
	if (typeof (this.onclose) == 'function') this.onclose();
	this.setPosition(undefined);
	if (this._tout) clearTimeout(this._tout);
	this._elt.removeClass("visible");
};
/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * @requires ol.style.Circle
 * @requires ol.structs.IHasChecksum
 */


/**
 * @classdesc
 * A marker style to use with font symbols.
 *
 * @constructor
 * @param {} options Options.
 *  @param {number} options.glyph the glyph name or a char to display as symbol. 
 * 		The name must be added using the {@link ol.style.FontSymbol.addDefs} function.
 *  @param {string} options.form 
 * 		none|circle|poi|bubble|marker|coma|shield|blazon|bookmark|hexagon|diamond|triangle|sign|ban|lozenge|square
 * 		a form that will enclose the glyph, default none
 *  @param {number} options.radius
 *  @param {number} options.rotation
 *  @param {number} options.rotateWithView
 *  @param {number} options.opacity
 *  @param {number} options.fontSize, default 1
 *  @param {boolean} options.gradient true to display a gradient on the symbol
 *  @param {ol.style.Fill} options.fill
 *  @param {ol.style.Stroke} options.stroke
 * @extends {ol.style.RegularShape}
 * @implements {ol.structs.IHasChecksum}
 * @api
 */
ol.style.FontSymbol = function(options) 
{	options = options || {};
	var strokeWidth = 0;
	if (options.stroke) strokeWidth = options.stroke.getWidth();
	ol.style.RegularShape.call (this,{ radius: options.radius, fill:options.fill, 
									rotation:options.rotation, rotateWithView: options.rotateWithView });
	
	if (typeof(options.opacity)=="number") this.setOpacity(options.opacity);
	this.color_ = options.color;
	this.fontSize_ = options.fontSize || 1;
	this.stroke_ = options.stroke;
	this.fill_ = options.fill;
	this.radius_ = options.radius -strokeWidth;
	this.form_ = options.form || "none";
	this.gradient_ = options.gradient;
	this.offset_ = [options.offsetX ? options.offsetX :0, options.offsetY ? options.offsetY :0];

	this.glyph_ = this.getGlyph(options.glyph) || "";

	this.renderMarker_();
};
ol.inherits(ol.style.FontSymbol, ol.style.RegularShape);

/** Cool stuff to get the image symbol for a style
*/
ol.style.Image.prototype.getImagePNG = function()
{	var canvas = this.getImage();
	if (canvas) 
	{	try { return canvas.toDataURL("image/png"); }
		catch(e) { return false; }
	}
	else return false;
}

/** 
 *	Font defs
 */
ol.style.FontSymbol.prototype.defs = { 'fonts':{}, 'glyphs':{} };

/** Static function : add new font defs 
 * @param {String|Object} font the font desciption
 * @param {} glyphs a key / value list of glyph definitions. 
 * 		Each key is the name of the glyph, 
 * 		the value is an object that code the font, the caracter code, 
 * 		the name and a search string for the glyph.
 */
 ol.style.FontSymbol.addDefs = function(font, glyphs)
 {	var thefont = font;
	if (typeof(font) == "string") thefont = {"font":font, "name":font, "copyright":"" };
	if (!thefont.font || typeof(thefont.font) != "string") 
	{	console.log("bad font def");
		return;
	}
	var fontname = thefont.font;
	ol.style.FontSymbol.prototype.defs.fonts[fontname] = thefont;
	for (var i in glyphs)
	{	var g = glyphs[i];
		if (typeof(g) == "string" && g.length==1) g = { char: g };
		ol.style.FontSymbol.prototype.defs.glyphs[i] =
			{	font: thefont.font,
				char: g.char || ""+String.fromCharCode(g.code) || "",
				theme: g.theme || thefont.name,
				name: g.name || i,
				search: g.search || ""
			};
	}
 };


/**
 * Clones the style. 
 * @return {ol.style.FontSymbol} 
 */
ol.style.FontSymbol.prototype.clone = function() 
{	var g = new ol.style.FontSymbol(
	{	glyph: "",
		color: this.color_,
		fontSize: this.fontSize_,
		stroke: this.stroke_,
		fill: this.fill_,
		radius: this.radius_ + (this.stroke_ ? this.stroke_.getWidth():0),
		form: this.form_,
		gradient: this.gradient_,
		offsetX: this.offset_[0],
		offsetY: this.offset_[1],
		opacity: this.getOpacity(),
		rotation: this.getRotation(),
		rotateWithView: this.getRotateWithView()
	});
	g.setScale(this.getScale());
	g.glyph_ = this.glyph_;
	g.renderMarker_();
	return g;
};

/**
 * Get the fill style for the symbol.
 * @return {ol.style.Fill} Fill style.
 * @api
 */
ol.style.FontSymbol.prototype.getFill = function() {
  return this.fill_;
};

/**
 * Get the stroke style for the symbol.
 * @return {ol.style.Stroke} Stroke style.
 * @api
 */
ol.style.FontSymbol.prototype.getStroke = function() {
  return this.stroke_;
};

/**
 * Get the glyph definition for the symbol.
 * @param {string|undefined} name a glyph name to get the definition, default return the glyph definition for the style.
 * @return {ol.style.Stroke} Stroke style.
 * @api
 */
ol.style.FontSymbol.prototype.getGlyph = function(name) 
{	if (name) return ol.style.FontSymbol.prototype.defs.glyphs[name] || { "font":"none","char":name.charAt(0),"theme":"none","name":"none", "search":""};
	else return this.glyph_;
};

/**
 * Get the glyph name.
 * @return {string} the name
 * @api
 */
ol.style.FontSymbol.prototype.getGlyphName = function() 
{	for (var i in ol.style.FontSymbol.prototype.defs.glyphs)
	{	if (ol.style.FontSymbol.prototype.defs.glyphs[i] === this.glyph_) return i;
	}
	return "";
};

/**
 * Get the stroke style for the symbol.
 * @return {ol.style.Stroke} Stroke style.
 * @api
 */
ol.style.FontSymbol.prototype.getFontInfo = function(glyph) 
{	return ol.style.FontSymbol.prototype.defs.fonts[glyph.font];
}

/** @private
 */
ol.style.FontSymbol.prototype.renderMarker_ = function(atlasManager) 
{
	var strokeStyle;
	var strokeWidth = 0;

	if (this.stroke_) 
	{	strokeStyle = ol.color.asString(this.stroke_.getColor());
		strokeWidth = this.stroke_.getWidth();
	}

	// no atlas manager is used, create a new canvas
	var canvas = this.getImage();
	//console.log(this.getImage().width+" / "+(2 * (this.radius_ + strokeWidth) + 1));

	/** @type {ol.style.FontSymbol.RenderOptions} */
	var renderOptions = {
		strokeStyle: strokeStyle,
		strokeWidth: strokeWidth,
		size: canvas.width,
	};

	// draw the circle on the canvas
	var context = (canvas.getContext('2d'));
	context.clearRect(0, 0, canvas.width, canvas.height);
	this.drawMarker_(renderOptions, context, 0, 0);

	// Set Anchor
	var a = this.getAnchor();
	a[0] = canvas.width / 2 - this.offset_[0];
	a[1] = canvas.width / 2 - this.offset_[1];

	//this.createMarkerHitDetectionCanvas_(renderOptions);
  
};


/**
 * @private
 * @param {ol.style.FontSymbol.RenderOptions} renderOptions
 * @param {CanvasRenderingContext2D} context
 */
ol.style.FontSymbol.prototype.drawPath_ = function(renderOptions, context) 
{
	var s = 2*this.radius_+renderOptions.strokeWidth+1;
	var w = renderOptions.strokeWidth/2;
	var c = renderOptions.size / 2;
	// Transfo to place the glyph at the right place
	var transfo = { fac:1, posX:renderOptions.size / 2, posY:renderOptions.size / 2 };
	context.lineJoin = 'round';
	context.beginPath();

	// Draw the path with the form
	switch (this.form_)
	{	case "none": transfo.fac=1;  break;
		case "circle":
		case "ban":
			context.arc ( c, c, s/2, 0, 2 * Math.PI, true);
			break;
		case "poi":
			context.arc ( c, c -0.4*this.radius_, 0.6*this.radius_, 0.15*Math.PI, 0.85*Math.PI, true);
			context.lineTo ( c-0.89*0.05*s, (0.95+0.45*0.05)*s+w);
			context.arc ( c, 0.95*s+w, 0.05*s, 0.85*Math.PI, 0.15*Math.PI, true);
			transfo = { fac:0.45, posX:c, posY:c -0.35*this.radius_ };
			break;
		case "bubble":
			context.arc ( c, c -0.2*this.radius_, 0.8*this.radius_, 0.4*Math.PI, 0.6*Math.PI, true);
			context.lineTo ( 0.5*s+w, s+w);
			transfo = { fac:0.7, posX:c, posY:c -0.2*this.radius_ };
			break;
		case "marker":
			context.arc ( c, c -0.2*this.radius_, 0.8*this.radius_, 0.25*Math.PI, 0.75*Math.PI, true);
			context.lineTo ( 0.5*s+w, s+w);
			transfo = { fac:0.7, posX: c, posY: c -0.2*this.radius_ };
			break;
		case "coma":
		/*
			context.arc( renderOptions.size / 2, renderOptions.size / 2 +0.2*this.radius_, 0.8*this.radius_, 0.5*Math.PI, 0, true);
			context.arc( renderOptions.size / 2, renderOptions.size / 2 -0.2*this.radius_, 0.8*this.radius_, 0, 0.5*Math.PI, true);
		*/
			context.moveTo ( c + 0.8*this.radius_, c -0.2*this.radius_);
			context.quadraticCurveTo ( 0.95*s+w, 0.75*s+w, 0.5*s+w, s+w);
			context.arc ( c, c -0.2*this.radius_, 0.8*this.radius_, 0.45*Math.PI, 0, false);
			transfo = { fac:0.7, posX: c, posY: c -0.2*this.radius_ };
			break;
		default:
		{	var pts;
			switch (this.form_)
			{	case "shield": 
					pts = [ 0.05,0, 0.95,0, 0.95,0.8, 0.5,1, 0.05,0.8, 0.05,0 ]; 
					transfo.posY = 0.45*s+w ;
					break;
				case "blazon": 
					pts = [ 0.1,0, 0.9,0, 0.9,0.8, 0.6,0.8, 0.5,1, 0.4,0.8, 0.1,0.8, 0.1,0 ]; 
					transfo.fac = 0.8;
					transfo.posY = 0.4*s+w ;
					break;
				case "bookmark": 
					pts = [ 0.05,0, 0.95,0, 0.95,1, 0.5,0.8, 0.05,1, 0.05,0 ]; 
					transfo.fac = 0.9;
					transfo.posY = 0.4*s+w ;
					break;
				case "hexagon": 
					pts = [ 0.05,0.2, 0.5,0, 0.95,0.2, 0.95,0.8, 0.5,1, 0.05,0.8, 0.05,0.2 ]; 
					transfo.fac = 0.9;
					transfo.posY = 0.5*s+w ;
					break;
				case "diamond": 
					pts = [ 0.25,0, 0.75,0, 1,0.2, 1,0.4, 0.5,1, 0,0.4, 0,0.2, 0.25,0 ]; 
					transfo.fac = 0.75 ;
					transfo.posY = 0.35*s+w ;
					break;
				case "triangle": 
					pts = [ 0,0, 1,0, 0.5,1, 0,0 ]; 
					transfo.fac = 0.6 ;
					transfo.posY = 0.3*s+w ;
					break;
				case "sign": 
					pts = [ 0.5,0.05, 1,0.95, 0,0.95, 0.5,0.05 ]; 
					transfo.fac = 0.7 ;
					transfo.posY = 0.65*s+w ;
					break;
				case "lozenge": 
					pts = [ 0.5,0, 1,0.5, 0.5,1, 0,0.5, 0.5,0 ]; 
					transfo.fac = 0.7;
					break;
				case "square": 
				default: 
					pts = [ 0,0, 1,0, 1,1, 0,1, 0,0 ]; break;
			}
			for (var i=0; i<pts.length; i+=2) context.lineTo ( pts[i]*s+w, pts[i+1]*s+w);
		}
	}

	context.closePath();
	return transfo;
}

/**
 * @private
 * @param {ol.style.FontSymbol.RenderOptions} renderOptions
 * @param {CanvasRenderingContext2D} context
 * @param {number} x The origin for the symbol (x).
 * @param {number} y The origin for the symbol (y).
 */
ol.style.FontSymbol.prototype.drawMarker_ = function(renderOptions, context, x, y) 
{	var fcolor = this.fill_ ? this.fill_.getColor() : "#000";
	var scolor = this.stroke_ ? this.stroke_.getColor() : "#000";
	if (this.form_ == "none" && this.stroke_ && this.fill_)
	{	scolor = this.fill_.getColor();
		fcolor = this.stroke_.getColor();
	}
	// reset transform
	context.setTransform(1, 0, 0, 1, 0, 0);

	// then move to (x, y)
	context.translate(x, y);

	var tr = this.drawPath_(renderOptions, context);

	if (this.fill_) 
	{	if (this.gradient_ && this.form_!="none")
		{	var grd = context.createLinearGradient(0,0,renderOptions.size/2,renderOptions.size);
			grd.addColorStop (1, ol.color.asString(fcolor));
			grd.addColorStop (0, ol.color.asString(scolor));
			context.fillStyle = grd;
		}
		else context.fillStyle = ol.color.asString(fcolor);
		context.fill();
	}
	if (this.stroke_ && renderOptions.strokeWidth) {
		context.strokeStyle = renderOptions.strokeStyle;
		context.lineWidth = renderOptions.strokeWidth;
		context.stroke();
	}

	// Draw the symbol
	if (this.glyph_.char)
	{	context.font = (2*tr.fac*(this.radius_)*this.fontSize_)+"px "+this.glyph_.font;
		context.strokeStyle = context.fillStyle;
		context.lineWidth = renderOptions.strokeWidth * (this.form_ == "none" ? 2:1);
		context.fillStyle = ol.color.asString(this.color_ || scolor);
		context.textAlign = "center";
		context.textBaseline = "middle";
		var t = this.glyph_.char;
		if (renderOptions.strokeWidth && scolor!="transparent") context.strokeText(t, tr.posX, tr.posY);
		context.fillText(t, tr.posX, tr.posY);
	}

	if (this.form_=="ban" && this.stroke_ && renderOptions.strokeWidth) 
	{	context.strokeStyle = renderOptions.strokeStyle;
		context.lineWidth = renderOptions.strokeWidth;
		var r = this.radius_ + renderOptions.strokeWidth;
		var d = this.radius_ * Math.cos(Math.PI/4);
		context.moveTo(r + d, r - d);
		context.lineTo(r - d, r + d);
		context.stroke();
	}
};

/**
 * @inheritDoc
 */
ol.style.FontSymbol.prototype.getChecksum = function() 
{
	var strokeChecksum = (this.stroke_!==null) ?
		this.stroke_.getChecksum() : '-';
	var fillChecksum = (this.fill_!==null) ?
		this.fill_.getChecksum() : '-';

	var recalculate = (this.checksums_===null) ||
		(strokeChecksum != this.checksums_[1] ||
		fillChecksum != this.checksums_[2] ||
		this.radius_ != this.checksums_[3] ||
		this.form_+"-"+this.glyphs_ != this.checksums_[4]);

	if (recalculate) {
		var checksum = 'c' + strokeChecksum + fillChecksum 
			+ ((this.radius_ !== void 0) ? this.radius_.toString() : '-')
			+ this.form_+"-"+this.glyphs_;
		this.checksums_ = [checksum, strokeChecksum, fillChecksum, this.radius_, this.form_+"-"+this.glyphs_];
	}

	return this.checksums_[0];
};

/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*
*  Add a chart style to display charts (pies or bars) on a map 
*/
/**
 * @requires ol.style.Circle
 * @requires ol.structs.IHasChecksum
 */
/**
 * @classdesc
 * Set chart style for vector features.
 *
 * @constructor
 * @param {} options
 *	@param {String} options.type Chart type: pie,pie3D, donut or bar
 *	@param {number} options.radius Chart radius/size, default 20
 *	@param {number} options.rotation Rotation in radians (positive rotation clockwise). Default is 0.
 *	@param {bool} options.snapToPixel use integral numbers of pixels, default true
 *	@param {ol.style.Stroke} options.stroke stroke style
 *	@param {String|Array<ol.color>} options.colors predefined color set "classic","dark","pale","pastel","neon" / array of color string, default classic
 *	@param {number} options.offsetX X offset in px
 *	@param {number} options.offsetY Y offset in px
 *	@param {number} options.animation step in an animation sequence [0,1]
 * @see [Statistic charts example](../../examples/map.style.chart.html)
 * @extends {ol.style.RegularShape}
 * @implements {ol.structs.IHasChecksum}
 * @api
 */
ol.style.Chart = function(opt_options) 
{	options = opt_options || {};
	var strokeWidth = 0;
	if (opt_options.stroke) strokeWidth = opt_options.stroke.getWidth();
	ol.style.RegularShape.call (this,
		{	radius: options.radius + strokeWidth, 
			fill: new ol.style.Fill({color: [0,0,0]}),
			rotation: options.rotation,
			snapToPixel: options.snapToPixel
		});
	if (options.scale) this.setScale(options.scale);

	this.stroke_ = options.stroke;
	this.radius_ = options.radius || 20;
	this.donutratio_ = options.donutRatio || 0.5;
	this.type_ = options.type;
	this.offset_ = [options.offsetX ? options.offsetX : 0, options.offsetY ? options.offsetY : 0];
	this.animation_ = (typeof(options.animation) == 'number') ? { animate:true, step:options.animation } : this.animation_ = { animate:false, step:1 };

	this.data_ = options.data;
	if (options.colors instanceof Array)
	{	this.colors_ = options.colors;
	}
	else 
	{	this.colors_ = ol.style.Chart.colors[options.colors];
		if(!this.colors_) this.colors_ = ol.style.Chart.colors.classic;
	}

	this.renderChart_();
};
ol.inherits(ol.style.Chart, ol.style.RegularShape);

/** Default color set: classic, dark, pale, pastel, neon
*/
ol.style.Chart.colors = 
{	"classic":	["#ffa500","blue","red","green","cyan","magenta","yellow","#0f0"],
	"dark":		["#960","#003","#900","#060","#099","#909","#990","#090"],
	"pale":		["#fd0","#369","#f64","#3b7","#880","#b5d","#666"],
	"pastel":	["#fb4","#79c","#f66","#7d7","#acc","#fdd","#ff9","#b9b"], 
	"neon":		["#ff0","#0ff","#0f0","#f0f","#f00","#00f"]
}

/**
 * Clones the style. 
 * @return {ol.style.Chart} 
 */
ol.style.Chart.prototype.clone = function() 
{	var s = new ol.style.Chart(
	{	type: this.type_,
		radius: this.radius_,
		rotation: this.getRotation(),
		scale: this.getScale(),
		data: this.getData(),
		snapToPixel: this.getSnapToPixel(),
		stroke: this.stroke_,
		colors: this.colors_,
		offsetX: this.offset_[0],
		offsetY: this.offset_[1],
		animation: this.animation_
	});
	s.setScale(this.getScale());
	s.setOpacity(this.getOpacity());
	return s;
};

/** Get data associatied with the chart
*/
ol.style.Chart.prototype.getData = function() 
{	return this.data_;
}
/** Set data associatied with the chart
*	@param {Array<number>}
*/
ol.style.Chart.prototype.setData = function(data) 
{	this.data_ = data;
	this.renderChart_();
}

/** Get symbol radius
*/
ol.style.Chart.prototype.getRadius = function() 
{	return this.radius_;
}
/** Set symbol radius
*	@param {number} symbol radius
*	@param {number} donut ratio
*/
ol.style.Chart.prototype.setRadius = function(radius, ratio) 
{	this.radius_ = radius;
	this.donuratio_ = ratio || this.donuratio_;
	this.renderChart_();
}

/** Set animation step 
*	@param {false|number} false to stop animation or the step of the animation [0,1]
*/
ol.style.Chart.prototype.setAnimation = function(step) 
{	if (step===false) 
	{	if (this.animation_.animate == false) return;
		this.animation_.animate = false;
	}
	else
	{	if (this.animation_.step == step) return;
		this.animation_.animate = true;
		this.animation_.step = step;
	}
	this.renderChart_();
}


/** @private
*/
ol.style.Chart.prototype.renderChart_ = function(atlasManager) 
{	var strokeStyle;
	var strokeWidth = 0;

	if (this.stroke_) 
	{	strokeStyle = ol.color.asString(this.stroke_.getColor());
		strokeWidth = this.stroke_.getWidth();
	}

	// no atlas manager is used, create a new canvas
	var canvas = this.getImage();

	// draw the circle on the canvas
	var context = (canvas.getContext('2d'));
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.lineJoin = 'round';

	var sum=0;
	for (var i=0; i<this.data_.length; i++)
		sum += this.data_[i];

	// reset transform
	context.setTransform(1, 0, 0, 1, 0, 0);

	// then move to (x, y)
	context.translate(0,0);

	var step = this.animation_.animate ? this.animation_.step : 1;
	//console.log(this.animation_.step)
	
	// Draw pie
	switch (this.type_)
	{	case "donut":
		case "pie3D":
		case "pie":
		{	var a, a0 = Math.PI * (step-1.5);
			var c = canvas.width/2;
			context.strokeStyle = strokeStyle;
			context.lineWidth = strokeWidth;
			context.save();
			if (this.type_=="pie3D") 
			{	context.translate(0, c*0.3);
				context.scale(1, 0.7);
				context.beginPath();
				context.fillStyle = "#369";
				context.arc ( c, c*1.4, this.radius_ *step, 0, 2*Math.PI);
				context.fill();
				context.stroke();
			}
			if (this.type_=="donut")
			{	context.save();
				context.beginPath();
				context.rect ( 0,0,2*c,2*c );
				context.arc ( c, c, this.radius_ *step *this.donutratio_, 0, 2*Math.PI);
				context.clip("evenodd");
			}
			for (var i=0; i<this.data_.length; i++)
			{	context.beginPath();
				context.moveTo(c,c);
				context.fillStyle = this.colors_[i%this.colors_.length];
				a = a0 + 2*Math.PI*this.data_[i]/sum *step;
				context.arc ( c, c, this.radius_ *step, a0, a);
				context.closePath();
				context.fill();
				context.stroke();
				a0 = a;
			}
			if (this.type_=="donut")
			{	context.restore();
				context.beginPath();
				context.strokeStyle = strokeStyle;
				context.lineWidth = strokeWidth;
				context.arc ( c, c, this.radius_ *step *this.donutratio_, Math.PI * (step-1.5), a0);
				context.stroke();
			}
			context.restore();
			break;
		}
		case "bar":
		default:
		{	var max=0;
			for (var i=0; i<this.data_.length; i++)
			{	if (max < this.data_[i]) max = this.data_[i];
			}
			var s = Math.min(5,2*this.radius_/this.data_.length);
			var c = canvas.width/2;
			var b = canvas.width - strokeWidth;
			var x, x0 = c - this.data_.length*s/2
			context.strokeStyle = strokeStyle;
			context.lineWidth = strokeWidth;
			for (var i=0; i<this.data_.length; i++)
			{	context.beginPath();
				context.fillStyle = this.colors_[i%this.colors_.length];
				x = x0 + s;
				var h = this.data_[i]/max*2*this.radius_ *step;
				context.rect ( x0, b-h, s, h);
				//console.log ( x0+", "+(b-this.data_[i]/max*2*this.radius_)+", "+x+", "+b);
				context.closePath();
				context.fill();
				context.stroke();
				x0 = x;
			}

		}
	}

	// Set Anchor
	var a = this.getAnchor();
	a[0] = c - this.offset_[0];
	a[1] = c - this.offset_[1];

};


/**
 * @inheritDoc
 */
ol.style.Chart.prototype.getChecksum = function() 
{
	var strokeChecksum = (this.stroke_!==null) ?
		this.stroke_.getChecksum() : '-';

	var recalculate = (this.checksums_===null) ||
		(strokeChecksum != this.checksums_[1] ||
		fillChecksum != this.checksums_[2] ||
		this.radius_ != this.checksums_[3] ||
		this.data_.join('|') != this.checksums_[4]);

	if (recalculate) {
		var checksum = 'c' + strokeChecksum + fillChecksum 
			+ ((this.radius_ !== void 0) ? this.radius_.toString() : '-')
			+ this.data_.join('|');
		this.checksums_ = [checksum, strokeChecksum, fillChecksum, this.radius_, this.data_.join('|')];
	}

	return this.checksums_[0];
};

/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
 * @classdesc
 * Fill style with named pattern
 *
 * @constructor
 * @param {olx.style.FillPatternOption=}  options
 *	@param {ol.style.Image|undefined} options.image an image pattern, image must be preloaded to draw on first call
 *	@param {number|undefined} options.opacity opacity with image pattern, default:1
 *	@param {olx.style.fillPattern} options.pattern pattern name (override by image option)
 *	@param {ol.color} options.color pattern color
 *	@param {ol.style.Fill} options.fill fill color (background)
 *	@param {number} options.offset pattern offset for hash/dot/circle/cross pattern
 *	@param {number} options.size line size for hash/dot/circle/cross pattern
 *	@param {number} options.spacing spacing for hash/dot/circle/cross pattern
 *	@param {number|bool} options.angle angle for hash pattern / true for 45deg dot/circle/cross
 *	@param {number} options.scale pattern scale 
 * @extends {ol.style.Fill}
 * @implements {ol.structs.IHasChecksum}
 * @api
 */
ol.style.FillPattern = function(options) 
{	if (!options) options = {};

	var pattern;

	var canvas = this.canvas_ = document.createElement('canvas');
	var scale = Number(options.scale)>0 ? Number(options.scale) : 1;
	var ratio = scale*ol.has.DEVICE_PIXEL_RATIO || ol.has.DEVICE_PIXEL_RATIO;

	var ctx = canvas.getContext('2d');

	if (options.image)
	{	options.image.load();
		
		var img = options.image.getImage();
		if (img.width)
		{	canvas.width = Math.round(img.width *ratio);
			canvas.height = Math.round(img.height *ratio);
			ctx.globalAlpha = typeof(options.opacity) == 'number' ? options.opacity:1;
			ctx.drawImage(img, 0,0, img.width, img.height, 0, 0, canvas.width, canvas.height);
			pattern = ctx.createPattern(canvas, 'repeat');
		}
		else 
		{	var self = this;
			pattern = [0,0,0,0];
			img.onload = function ()
			{	canvas.width = Math.round(img.width *ratio);
				canvas.height = Math.round(img.height *ratio);
				ctx.globalAlpha = typeof(options.opacity) == 'number' ? options.opacity:1;
				ctx.drawImage(img, 0,0, img.width, img.height, 0, 0, canvas.width, canvas.height);
				pattern = ctx.createPattern(canvas, 'repeat');
				self.setColor(pattern);
			}
		}
	}
	else
	{	var pat = this.getPattern_(options);
		canvas.width = Math.round(pat.width *ratio);
		canvas.height = Math.round(pat.height *ratio);
		ctx.beginPath();
		if (options.fill) 
		{	ctx.fillStyle = ol.color.asString(options.fill.getColor());
			ctx.fillRect(0,0, canvas.width, canvas.height);
		}
		ctx.scale(ratio,ratio);
		ctx.lineCap = "round";
		ctx.lineWidth = pat.stroke || 1;

		ctx.fillStyle = ol.color.asString(options.color||"#000");
		ctx.strokeStyle = ol.color.asString(options.color||"#000");
		if (pat.circles) for (var i=0; i<pat.circles.length; i++)
		{	var ci = pat.circles[i]; 
			ctx.beginPath();
			ctx.arc(ci[0], ci[1], ci[2], 0,2*Math.PI);
			if (pat.fill) ctx.fill();
			if (pat.stroke) ctx.stroke();
		}

		if (!pat.repeat) pat.repeat=[[0,0]];

		if (pat.char)
		{	ctx.font = pat.font || (pat.width)+"px Arial";
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			if (pat.angle) 
			{	ctx.fillText(pat.char, pat.width/4, pat.height/4);
				ctx.fillText(pat.char, 5*pat.width/4, 5*pat.height/4);
				ctx.fillText(pat.char, pat.width/4, 5*pat.height/4);
				ctx.fillText(pat.char, 5*pat.width/4, pat.height/4);

				ctx.fillText(pat.char, 3*pat.width/4, 3*pat.height/4);
				ctx.fillText(pat.char, -pat.width/4, -pat.height/4);
				ctx.fillText(pat.char, 3*pat.width/4, -pat.height/4);
				ctx.fillText(pat.char, -pat.width/4, 3*pat.height/4);
			}
			else ctx.fillText(pat.char, pat.width/2, pat.height/2);
		}

		if (pat.lines) for (var i=0; i<pat.lines.length; i++) for (var r=0; r<pat.repeat.length; r++)
		{	var li = pat.lines[i];
			ctx.beginPath();
			ctx.moveTo(li[0]+pat.repeat[r][0],li[1]+pat.repeat[r][1]);
			for (var k=2; k<li.length; k+=2)
			{	ctx.lineTo(li[k]+pat.repeat[r][0],li[k+1]+pat.repeat[r][1]);
			}
			if (pat.fill) ctx.fill();
			if (pat.stroke) ctx.stroke();
			ctx.save()
			ctx.strokeStyle = 'red';
			ctx.strokeWidth = 0.1;
			//ctx.strokeRect(0,0,canvas.width,canvas.height);
			ctx.restore()
		}
		pattern = ctx.createPattern(canvas, 'repeat');
		if (options.offset)
		{	var offset = options.offset;
			if (typeof(offset) == "number") offset = [offset,offset];
			if (offset instanceof Array) 
			{	var dx = Math.round((offset[0]*ratio));
				var dy = Math.round((offset[1]*ratio));
				// New pattern
				ctx.scale(1/ratio,1/ratio)
				ctx.clearRect(0,0,canvas.width,canvas.height);
				ctx.translate(dx,dy);
				ctx.fillStyle = pattern;
				ctx.fillRect(-dx, -dy, canvas.width,canvas.height);
				pattern = ctx.createPattern(canvas, 'repeat');
			}
		}
	}
	
	ol.style.Fill.call (this, { color: pattern });

};
ol.inherits(ol.style.FillPattern, ol.style.Fill);


/**
 * Clones the style. 
 * @return {ol.style.FillPattern} 
 */
ol.style.FillPattern.prototype.clone = function() 
{	var s = ol.style.Fill.prototype.clone.call(this);
	s.canvas_ = this.canvas_;
	return s;
};

/** Get canvas used as pattern
*	@return {canvas}
*/
ol.style.FillPattern.prototype.getImage = function()
{	return this.canvas_;
}

/** Get pattern
*	@param {olx.style.FillPatternOption}
*/
ol.style.FillPattern.prototype.getPattern_ = function(options)
{	var pat = ol.style.FillPattern.prototype.patterns[options.pattern] 
		|| ol.style.FillPattern.prototype.patterns.dot;
	var d = Math.round(options.spacing)||10;
	var d2 = Math.round(d/2)+0.5;
	switch (options.pattern)
	{	case 'dot':
		case 'circle':
		{	var size = options.size===0 ? 0 : options.size/2 || 2;
			if (!options.angle)
			{	pat.width = pat.height = d;
				pat.circles = [[ d/2, d/2, size ]]
				if (options.pattern=='circle')
				{	pat.circles = pat.circles.concat([
						[ d/2+d, d/2, size ],
						[ d/2-d, d/2, size ],
						[ d/2, d/2+d, size ],
						[ d/2, d/2-d, size ],
						[ d/2+d, d/2+d, size ],
						[ d/2+d, d/2-d, size ],
						[ d/2-d, d/2+d, size ],
						[ d/2-d, d/2-d, size ] ])
				};
			}
			else
			{	d = pat.width = pat.height = Math.round(d*1.4);
				pat.circles = [[ d/4, d/4, size ], [ 3*d/4, 3*d/4, size ]];
				if (options.pattern=='circle')
				{	pat.circles = pat.circles.concat([
						[ d/4+d, d/4, size ],
						[ d/4, d/4+d, size ],
						[ 3*d/4-d, 3*d/4, size ],
						[ 3*d/4, 3*d/4-d, size ],
						[ d/4+d, d/4+d, size ], 
						[ 3*d/4-d, 3*d/4-d, size ] ]);
				}
			}
			break;
		}
		case 'tile':
		case 'square':
		{	var size = options.size===0 ? 0 : options.size/2 || 2;
			if (!options.angle)
			{	pat.width = pat.height = d;
				pat.lines = [[ d/2-size, d/2-size, d/2+size, d/2-size, d/2+size, d/2+size, d/2-size,d/2+size, d/2-size, d/2-size ]]
			}
			else
			{	pat.width = pat.height = d;
				//size *= Math.sqrt(2);
				pat.lines = [[ d/2-size,d/2, d/2,d/2-size, d/2+size,d/2, d/2,d/2+size, d/2-size,d/2 ]]
			}
			if (options.pattern=='square') pat.repeat = [[0,0], [0,d], [d,0], [0,-d], [-d,0], [-d,-d], [d,d], [-d,d], [d,-d] ]
			break;
		}
		case 'cross':
		{	// Limit angle to 0 | 45
			if (options.angle) options.angle = 45;
		}
		case 'hatch':
		{	var a = Math.round(((options.angle||0)-90)%360);
			if (a>180) a -= 360;
			a *= Math.PI/180;
			var cos = Math.cos(a);
			var sin = Math.sin(a);
			if (Math.abs(sin)<0.0001)
			{	pat.width = pat.height = d;	
				pat.lines = [ [ 0,0.5, d, 0.5 ] ];
				pat.repeat = [ [0,0], [0,d] ];
			}
			else  if (Math.abs(cos)<0.0001)
			{	pat.width = pat.height = d;	
				pat.lines = [ [ 0.5,0, 0.5, d] ];
				pat.repeat = [ [0,0], [d,0] ];
				if (options.pattern=='cross') 
				{	pat.lines.push ([ 0,0.5, d, 0.5 ]);
					pat.repeat.push([0,d]);
				}
			}
			else
			{	var w = pat.width = Math.round(Math.abs(d/sin)) || 1;
				var h = pat.height = Math.round(Math.abs(d/cos)) || 1;
				if (options.pattern=='cross')
				{	pat.lines = [ [-w,-h, 2*w,2*h], [2*w,-h, -w,2*h] ];
					pat.repeat = [ [0,0] ];
				}
				else if (cos*sin>0) 
				{	pat.lines = [ [-w,-h, 2*w,2*h] ];
					pat.repeat = [ [0,0], [w,0], [0,h] ];
				}
				else 
				{	pat.lines = [ [2*w,-h, -w,2*h] ];
					pat.repeat = [ [0,0], [-w,0], [0,h] ];
				}
				
			}
			pat.stroke = options.size===0 ? 0 : options.size||4;
		}
		default: break;
	}
	return pat
}

/** Static fuction to add char patterns
*	@param {title} 
*	@param {olx.fillpattern.Option}
*		- size {integer} default 10
*		- width {integer} default 10
*		- height {integer} default 10
*		- circles {Array<circles>}
*		- lines: {Array<pointlist>}
*		- stroke {integer}
*		- fill {bool}
*		- char {char}
*		- font {string} default "10px Arial"
*/
ol.style.FillPattern.addPattern = function (title, options)
{	if (!options) options={};
	ol.style.FillPattern.prototype.patterns[title || options.char] =
	{	width: options.width || options.size || 10,
		height: options.height || options.size || 10,
		font: options.font,
		char: options.char,
		circles: options.circles,
		lines: options.lines,
		repeat: options.repeat,
		stroke: options.stroke,
		angle: options.angle,
		fill: options.fill
	}
}

/** Patterns definitions
	Examples : http://seig.ensg.ign.fr/fichchap.php?NOFICHE=FP31&NOCHEM=CHEMS009&NOLISTE=1&N=8
*/
ol.style.FillPattern.prototype.patterns =
{
	"hatch":
	{	width:5,
		height:5,
		lines:[[0,2.5,5,2.5]],
		stroke:1
	},
	"cross":
	{	width:7,
		height:7,
		lines:[[0,3,10,3],[3,0,3,10]],
		stroke:1
	},
	"dot":
	{	width:8,
		height:8,
		circles:[[5,5,2]],
		stroke:false,
		fill:true,
	},
	"circle":
	{	width:10,
		height:10,
		circles:[[5,5,2]],
		stroke:1,
		fill:false,
	},
	"square":
	{	width:10,
		height:10,
		lines:[[3,3, 3,8, 8,8, 8,3, 3,3]],
		stroke:1,
		fill:false,
	},
	"tile":
	{	width:10,
		height:10,
		lines:[[3,3, 3,8, 8,8, 8,3, 3,3]],
		fill:true,
	},
	"woven":
	{	width: 12,
		height: 12,
		lines: [[ 3,3, 9,9 ],[0,12, 3,9], [9,3, 12,0], [-1,1,1,-1], [13,11,11,13]],
		stroke: 1
	},
	"crosses":
	{	width: 8,
		height: 8,
		lines: [[ 2,2, 6,6 ],[2,6,6,2]],
		stroke: 1
	},
	"caps":
	{	width: 8,
		height: 8,
		lines: [[ 2,6, 4,2, 6,6 ]],
		stroke: 1
	},
	"nylon":
	{	width: 20,
		height: 20,
//		lines: [[ 0,5, 0,0, 5,0 ],[ 5,10, 10,10, 10,5 ], [ 10,15, 10,20, 15,20 ],[ 15,10, 20,10, 20,15 ]],
//		repeat: [[0,0], [20,0], [0,20], [-20,0], [0,-20], [-20,-20]],
		lines: [[ 1,6, 1,1, 6,1 ],[ 6,11, 11,11, 11,6 ], [ 11,16, 11,21, 16,21 ],[ 16,11, 21,11, 21,16 ]],
		repeat: [[0,0], [-20,0], [0,-20] ],
		stroke: 1
	},
	"hexagon":
	{	width: 20,
		height: 12,
		lines: [[ 0,10, 4,4, 10,4, 14,10, 10,16, 4,16, 0,10 ]],
		stroke:1,
		repeat:[[0,0],[10,6],[10,-6],[-10,-6]]
	},
	"cemetry":
	{	width:15,
		height:19,
		lines:[[0,3.5,7,3.5],[3.5,0,3.5,10],
			//[7,12.5,14,12.5],[10.5,9,10.5,19]
			],
		stroke:1,
		repeat:[[0,0],[7,9]]
	},
	"sand":
	{	width:20,
		height:20,
		circles:[[1,2,1],[9,3,1],[2,16,1],
				[7,8,1],[6,14,1],[4,19,1],
				[14,2,1],[12,10,1],[14,18,1],
				[18,8,1],[18,14,1]],
		fill:1
	},
	"conglomerate":
	{	width:30,
		height:20,
		circles:[[2,4,1],[17,3,1],[26,18,1],[12,17,1],[5,17,2],[28,11,2]],
		lines:[[7,5, 6,7, 9,9, 11,8, 11,6, 9,5, 7,5], 
			[16,10, 15,13, 16,14, 19,15, 21,13, 22,9, 20,8, 19,8, 16,10], 
			[24,6, 26,7, 27,5, 26,4, 24,4, 24,6]],
		stroke:1
	},
	"gravel":
	{	width:15,
		height:10,
		circles:[[4,2,1],[5,9,1],[1,7,1]],//[9,9,1],,[15,2,1]],
		lines:[[7,5, 6,6, 7,7, 8,7, 9,7, 10,5, 9,4, 7,5], [11,2, 14,4, 14,1, 12,1, 11,2]],
		stroke:1
	},
	"brick":
	{	width:18,
		height:16,
		lines:[	[0,1,18,1],[0,10,18,10], [6,1,6,10],[12,10,12,18],[12,0,12,1]],
		stroke:1
	},
	"dolomite":
	{	width:20,
		height:16,
		lines:[[0,1,20,1],[0,9,20,9],[1,9,6,1],[11,9,14,16],[14,0,14.4,1]],
		stroke:1
	},
	"coal":
	{	width:20,
		height:16,
		lines:[[1,5, 7,1, 7,7], [11,10, 12,5, 18,9], [5,10, 2,15, 9,15,], [15,16, 15,13, 20,16], [15,0, 15,2, 20,0]],
		fill:1
	},
	"breccia":
	{	width:20,
		height:16,
		lines:[[1,5, 7,1, 7,7, 1,5], [11,10, 12,5, 18,9, 11,10], [5,10, 2,15, 9,15, 5,10], [15,16, 15,13, 22,18], [15,0, 15,2, 20,0] ],
		stroke:1,
	},
	"clay":
	{	width:20,
		height:20,
		lines:[[0,0, 3,11, 0,20], [11,0, 10,3, 13,13, 11,20], [0,0, 10,3, 20,0], [0,12, 3,11, 13,13, 20,12]],
		stroke:1
	},
	"flooded":
	{	width:15,
		height:10,
		lines:[	[0,1,10,1],[0,6,5,6], [10,6,15,6]],
		stroke:1
	},
	"chaos":
	{	width:40,
		height:40,
		lines:[[40,2, 40,0, 38,0, 40,2], 
			[4,0, 3,2, 2,5, 0,0, 0,3, 2,7, 5,6, 7,7, 8,10, 9,12, 9,13, 9,14, 8,14, 6,15, 2,15, 0,20, 0,22, 2,20, 5,19, 
				8,15, 10,14, 11,12.25, 10,12, 10,10, 12,9, 13,7, 12,6, 13,4, 16,7, 17,4, 20,0, 18,0, 15,3, 14,2, 14,0,
				12,1, 11,0, 10,1, 11,4, 10,7, 9,8, 8,5, 6,4, 5,3, 5,1, 5,0, 4,0],
			[7,1, 7,3, 8,3, 8,2, 7,1], [4,3, 5,5, 4,5, 4,3], [34,5, 33,7, 38,10, 38,8, 36,5, 34,5], 
			[ 27,0, 23,2, 21,8, 30,0, 27,0], 
			[25,8, 26,12, 26,16, 22.71875,15.375, 20,13, 18,15, 17,18, 13,22, 17,21, 19,22, 21,20, 19,18, 22,17, 30,25, 
			26,26, 24,28, 21.75,33.34375, 20,36, 18,40, 20,40, 24,37, 25,32, 27,31, 26,38, 27,37, 30,32, 32,35, 36,37, 
			38,40, 38,39, 40,40, 37,36, 34,32, 37,31, 36,29, 33,27, 34,24, 39,21, 40,21, 40,16, 37,20, 31,22, 32,25, 
			27,20, 29,15, 30,20, 32,20, 34,18, 33,12, 31,11, 29,14, 26,9, 25,8], [39,24, 37,26, 40,28, 39,24], 
			[13,15, 9,19, 14,18, 13,15], [18,23, 14,27, 16,27, 17,25, 20,26, 18,23], 
			[6,24, 2,26, 1,28, 2,30, 5,28, 12,30, 16,32, 18,30, 15,30, 12,28, 9,25, 7,27, 6,24], 
			[29,27, 32,28, 33,31, 30,29, 27,28, 29,27], 
			[5,35, 1,33, 3,36, 13,38, 15,35, 10,36, 5,35]],
		fill:1,
	},
	"grass":
	{	width:27,
		height:22,
		lines: [[0,10.5,13,10.5], [2.5,10,1.5,7], [4.5,10, 4.5,5, 3.5,4 ], [7,10, 7.5,6, 8.5,3], [10,10,11,6]],
		repeat: [[0,0],[14,10]],
		stroke:1
	},
	"swamp":
	{	width:24,
		height:23,
		lines:[ [0,10.5,9.5,10.5], [2.5,10,2.5,7], [4.5,10,4.5,4], [6.5,10,6.5,6], [3,12.5,7,12.5] ],
		repeat: [[0,0],[14,10]],
		stroke:1
	},
	"wave":
	{	width:10,
		height:8,
		lines:[ [0,0, 5,4, 10,0] ],
		stroke:1
	},
	"vine":
	{	width:13,
		height:13,
		lines:[[3,0,3,6],[9,7,9,13]],
		stroke:1.0
	},
	"forest":
	{	width:55,
		height:30,
		circles:[[7,7,3.5],[20,20,1.5],[42,22,3.5],[35,5,1.5]],
		stroke:1
	},
	"scrub":
	{	width:26,
		height:20,
		lines:[ [1,4, 4,8, 6,4] ],
		circles:[[20,13,1.5]],
		stroke:1,
	},
	"tree":
	{	width:30,
		height:30,
		lines:[[7.78,10.61,4.95,10.61,4.95,7.78,3.54,7.78,2.12,6.36,0.71,6.36,0,4.24,0.71,2.12,4.24,0,7.78,0.71,9.19,3.54,7.78,4.95,7.07,7.07,4.95,7.78]],
		repeat: [[3,1],[18,16]],
		stroke:1
	},
	"pine":
	{	width:30,
		height:30,
		lines:[[5.66,11.31,2.83,11.31,2.83,8.49,0,8.49,2.83,0,5.66,8.49,2.83,8.49]],
		repeat:[[3,1],[18,16]],
		stroke:1
	},
	"pines":
	{	width:22,
		height:20,
		lines:[[1,4,3.5,1,6,4],[1,8,3.5,5,6,8],[3.5,1,3.5,11],[12,14.5,14.5,14,17,14.5],[12,18,17,18],[14.5,12,14.5,18]],
		repeat: [[2,1]],
		stroke:1
	},
	"rock":
	{	width:20,
		height:20,
		lines:[	[1,0,1,9],[4,0,4,9],[7,0,7,9], 
				[10,1,19,1],[10,4,19,4],[10,7,19,7],
				[0,11,9,11],[0,14,9,14],[0,17,9,17], 
				[12,10,12,19],[15,10,15,19],[18,10,18,19] ],
		repeat:[[0.5,0.5]],
		stroke:1
	},
	"rocks":
	{	width:20,
		height:20,
		lines:[	[5,0, 3,0, 5,4, 4,6, 0,3, 0,5, 3,6, 5,9, 3.75,10, 2.5,10, 0,9, 0,10, 4,11, 5,14, 4,15, 0,13,
			0,13, 0,13, 0,14, 0,14, 5,16, 5,18, 3,19, 0,19, -0.25,19.9375, 5,20, 10,19, 10,20, 11,20, 12,19,
			14,20, 15,20, 17,19, 20,20, 20,19, 19,16, 20,15, 20,11, 20,10, 19,8, 20,5, 20,0, 19,0, 20,2, 19,4,
			17,4, 16,3, 15,0, 14,0, 15,4, 11,5, 10,4, 11,0, 10,0, 9,4, 6,5, 5,0,],
			[18,5, 19,6, 18,10, 16,10, 14,9, 16,5, 18,5], 
			[5,6, 9,5, 10,6, 10,9, 6,10, 5,6], 
			[14,5, 14,8, 13,9, 12,9, 11,7, 12,5, 14,5], 
			[ 5,11, 8,10, 9,11, 10,14, 6,15, 6,15, 5,11], 
			[13,10, 14,11, 15,14, 15,14, 15,14, 11,15, 10,11, 11,10, 13,10], 
			[15,12, 16,11, 19,11, 19,15, 16,14, 16,14, 15,12], 
			[6,16, 9,15, 10,18, 5,19, 6,16], 
			[10,16, 14,16, 14,18, 13,19, 11,18, 10,16], 
			[15,15, 18,16, 18,18, 16,19, 15,18, 15,15]],
		stroke:1
	}
}


/**
 * /
ol.style.FillPattern.prototype.getChecksum = function() 
{
	var strokeChecksum = (this.stroke_!==null) ?
		this.stroke_.getChecksum() : '-';
	var fillChecksum = (this.fill_!==null) ?
		this.fill_.getChecksum() : '-';

	var recalculate = (this.checksums_===null) ||
		(strokeChecksum != this.checksums_[1] ||
		fillChecksum != this.checksums_[2] ||
		this.radius_ != this.checksums_[3] ||
		this.form_+"-"+this.glyphs_ != this.checksums_[4]);

	if (recalculate) {
		var checksum = 'c' + strokeChecksum + fillChecksum 
			+ ((this.radius_ !== void 0) ? this.radius_.toString() : '-')
			+ this.form_+"-"+this.glyphs_;
		this.checksums_ = [checksum, strokeChecksum, fillChecksum, this.radius_, this.form_+"-"+this.glyphs_];
	}

	return this.checksums_[0];
};
/**/
/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*
*  Photo style for vector features
*/
/**
 * @requires ol.style.RegularShape
 * @requires ol.structs.IHasChecksum
 */
/**
 * @classdesc
 * Set Photo style for vector features.
 *
 * @constructor
 * @param {} options
 *  @param { default | square | round | anchored | folio } options.kind
 *  @param {boolean} options.crop crop within square, default is false
 *  @param {Number} options.radius symbol size
 *  @param {boolean} options.shadow drop a shadow
 *  @param {ol.style.Stroke} options.stroke
 *  @param {String} options.src image src
 *  @param {String} options.crossOrigin The crossOrigin attribute for loaded images. Note that you must provide a crossOrigin value if you want to access pixel data with the Canvas renderer.
 *  @param {Number} options.offsetX Horizontal offset in pixels. Default is 0.
 *  @param {Number} options.offsetY Vertical offset in pixels. Default is 0.
 *  @param {function} options.onload callback when image is loaded (to redraw the layer)
 * @extends {ol.style.RegularShape}
 * @implements {ol.structs.IHasChecksum}
 * @api
 */
ol.style.Photo = function(options) 
{	options = options || {};
	this.sanchor_ = options.kind=="anchored" ? 8:0;
	this.shadow_ = Number(options.shadow) || 0;
	if (!options.stroke) 
	{	options.stroke = new ol.style.Stroke({ width: 0, color: "#000"})
	}
	var strokeWidth = options.stroke.getWidth();
	if (strokeWidth<0) strokeWidth = 0;
	if (options.kind=='folio') strokeWidth += 6;
	options.stroke.setWidth(strokeWidth);
	ol.style.RegularShape.call (this, 
	{	radius: options.radius + strokeWidth + this.sanchor_/2 + this.shadow_/2, 
		points:0
	//	fill:new ol.style.Fill({color:"red"}) // No fill to create a hit detection Image
	});
	// Hack to get the hit detection Image (no API exported)
	if (!this.hitDetectionCanvas_)
	{	var img = this.getImage();
		for (var i in this)
		{	if (this[i] && this[i].getContext && this[i]!==img)
			{	this.hitDetectionCanvas_ = this[i];
				break;
			}
		}
	}
	
	this.stroke_ = options.stroke;
	this.fill_ = options.fill;
	this.crop_ = options.crop;
	this.crossOrigin_ = options.crossOrigin;
	this.kind_ = options.kind || "default";
	
	this.radius_ = options.radius;
	this.src_ = options.src;

	this.offset_ = [options.offsetX ? options.offsetX :0, options.offsetY ? options.offsetY :0];
	
	this.onload_ = options.onload;

	if (typeof(options.opacity)=='number') this.setOpacity(options.opacity);
	if (typeof(options.rotation)=='number') this.setRotation(options.rotation);
	this.renderPhoto_();
};
ol.inherits(ol.style.Photo, ol.style.RegularShape);


/**
 * Clones the style. 
 * @return {ol.style.Photo} 
 */
ol.style.Photo.prototype.clone = function() 
{	return new ol.style.Photo(
	{	stroke: this.stroke_,
		fill: this.fill_,
		shadow: this.shadow_,
		crop: this.crop_,
		crossOrigin: this.crossOrigin_,
		kind: this.kind_,
		radius: this.radius_,
		src: this.src_,
		offsetX: this.offset_[0],
		offsetY: this.offset_[1],
		opacity: this.getOpacity(),
		rotation: this.getRotation()
	});
};

/**
 * Draws a rounded rectangle using the current state of the canvas. 
 * Draw a rectangle if the radius is null.
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate 
 * @param {Number} width The width of the rectangle 
 * @param {Number} height The height of the rectangle
 * @param {Number} radius The corner radius.
 */
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) 
{	if (!r) this.rect(x,y,w,h);
	else
	{	if (w < 2 * r) r = w / 2;
		if (h < 2 * r) r = h / 2;
		this.beginPath();
		this.moveTo(x+r, y);
		this.arcTo(x+w, y, x+w, y+h, r);
		this.arcTo(x+w, y+h, x, y+h, r);
		this.arcTo(x, y+h, x, y, r);
		this.arcTo(x, y, x+w, y, r);
		this.closePath();
	}
	return this;
}


/**
 * Draw the form without the image
 * @private
 */
ol.style.Photo.prototype.drawBack_ = function(context, color, strokeWidth) 
{	var canvas = context.canvas;
	context.beginPath();
    context.fillStyle = color;
	context.clearRect(0, 0, canvas.width, canvas.height);
	switch (this.kind_)
	{	case 'square':
			context.rect(0,0,canvas.width-this.shadow_, canvas.height-this.shadow_);
			break;
		case 'circle':
			context.arc(this.radius_+strokeWidth, this.radius_+strokeWidth, this.radius_+strokeWidth, 0, 2 * Math.PI, false);
			break;
		case 'folio':
			offset = 6;
			strokeWidth -= offset;
			context.strokeStyle = 'rgba(0,0,0,0.5)';
			var w = canvas.width-this.shadow_-2*offset;
			var a = Math.atan(6/w);
			context.save();
			context.rotate(-a);
			context.translate(-6,2);
			context.beginPath();
			context.rect(offset,offset,w,w);
			context.stroke();
			context.fill();
			context.restore();
			context.save();
			context.translate(6,-1);
			context.rotate(a);
			context.beginPath();
			context.rect(offset,offset,w,w);
			context.stroke();
			context.fill();
			context.restore();
			context.beginPath();
			context.rect(offset,offset,w,w);
			context.stroke();
			break;
		case 'anchored':
			context.roundRect(this.sanchor_/2,0,canvas.width-this.sanchor_-this.shadow_, canvas.height-this.sanchor_-this.shadow_, strokeWidth);
			context.moveTo(canvas.width/2-this.sanchor_-this.shadow_/2,canvas.height-this.sanchor_-this.shadow_);
			context.lineTo(canvas.width/2+this.sanchor_-this.shadow_/2,canvas.height-this.sanchor_-this.shadow_);
			context.lineTo(canvas.width/2-this.shadow_/2,canvas.height-this.shadow_);break;
		default: /* roundrect */
			context.roundRect(0,0,canvas.width-this.shadow_, canvas.height-this.shadow_, strokeWidth);
			break;
	}
	context.closePath();
}


/**
 * @private
 */
ol.style.Photo.prototype.renderPhoto_ = function() 
{
	var strokeStyle;
	var strokeWidth = 0;
	if (this.stroke_) 
	{	strokeStyle = ol.color.asString(this.stroke_.getColor());
		strokeWidth = this.stroke_.getWidth();
	}
	var canvas = this.getImage();

	// Draw hitdetection image
	var context = this.hitDetectionCanvas_.getContext('2d');
	this.drawBack_(context,"#000",strokeWidth);
    context.fill();

	// Draw the image
	var context = (canvas.getContext('2d'));
	this.drawBack_(context,strokeStyle,strokeWidth);
	
	// Draw a shadow
	if (this.shadow_)
	{	context.shadowColor = 'rgba(0,0,0,0.5)';
		context.shadowBlur = this.shadow_/2;
		context.shadowOffsetX = this.shadow_/2;
		context.shadowOffsetY = this.shadow_/2;
	}
    context.fill();
	context.shadowColor = 'transparent';
    
	var self = this;
	var img = this.img_ = new Image();
	if (this.crossOrigin_) img.crossOrigin = this.crossOrigin_;
	img.src = this.src_;
	
	// Draw image
	if (img.width) self.drawImage_(img);
	else img.onload = function()
	{	self.drawImage_(img);
		// Force change (?!)
		// self.setScale(1);
		if (self.onload_) self.onload_();
	};
	
	// Set anchor
	var a = this.getAnchor();
	a[0] = (canvas.width - this.shadow_)/2;
	a[1] = (canvas.height - this.shadow_)/2;
	if (this.sanchor_)
	{	a[1] = canvas.height - this.shadow_;
	}
}

/**
 * Draw an timage when loaded
 * @private
 */
ol.style.Photo.prototype.drawImage_ = function(img) 
{	var canvas = this.getImage();
	// Remove the circle on the canvas
	var context = (canvas.getContext('2d'));

	var strokeWidth = 0;
	if (this.stroke_) strokeWidth = this.stroke_.getWidth();
	var size = 2*this.radius_;

	context.save();
	if (this.kind_=='circle')
	{	context.beginPath();
		context.arc(this.radius_+strokeWidth, this.radius_+strokeWidth, this.radius_, 0, 2 * Math.PI, false);
		context.clip();
	}
	var s, x, y, w, h, sx, sy, sw, sh;
	// Crop the image to a square vignette
	if (this.crop_) 
	{	s = Math.min (img.width/size, img.height/size);
		sw = sh = s*size;
		sx = (img.width-sw)/2;
		sy = (img.height-sh)/2;

		x = y = 0;
		w = h = size+1;
	}
	// Fit the image to the size
	else 
	{	s = Math.min (size/img.width, size/img.height);
		sx = sy = 0;
		sw = img.width;
		sh = img.height;

		w = s*sw;
		h = s*sh;
		x = (size-w)/2;
		y = (size-h)/2;
	}
	x += strokeWidth + this.sanchor_/2;
	y += strokeWidth;

	context.drawImage(img, sx, sy, sw, sh, x, y, w, h);
	context.restore();

	// Draw a circle to avoid aliasing on clip
	if (this.kind_=='circle' && strokeWidth)
	{	context.beginPath();
		context.strokeStyle = ol.color.asString(this.stroke_.getColor());
		context.lineWidth = strokeWidth/4;
		context.arc(this.radius_+strokeWidth, this.radius_+strokeWidth, this.radius_, 0, 2 * Math.PI, false);
		context.stroke();
	}
}


/**
 * @inheritDoc
 */
ol.style.Photo.prototype.getChecksum = function() 
{
	var strokeChecksum = (this.stroke_!==null) ?
		this.stroke_.getChecksum() : '-';
	var fillChecksum = (this.fill_!==null) ?
		this.fill_.getChecksum() : '-';

	var recalculate = (this.checksums_===null) ||
		(strokeChecksum != this.checksums_[1] ||
		fillChecksum != this.checksums_[2] ||
		this.radius_ != this.checksums_[3]);

	if (recalculate) {
		var checksum = 'c' + strokeChecksum + fillChecksum 
			+ ((this.radius_ !== void 0) ? this.radius_.toString() : '-');
		this.checksums_ = [checksum, strokeChecksum, fillChecksum, this.radius_];
	}

	return this.checksums_[0];
};

/** Add a setTextPath style to draw text along linestrings
@toto letterpadding/spacing, wordpadding/spacing
*/
(function()
{
/** Internal drawing function called on postcompose
* @param {ol.eventPoscompose} e postcompose event
*/
function drawTextPath (e)
{	// Prent drawing at large resolution
	if (e.frameState.viewState.resolution > this.textPathMaxResolution_) return;
	
	var extent = e.frameState.extent;
	var c2p = e.frameState.coordinateToPixelTransform;

	// Get pixel path with coordinates
	function getPath(c, readable)
	{	var path1 = [];
		for (var k=0; k<c.length; k++) 
		{	path1.push(c2p[0]*c[k][0]+c2p[1]*c[k][1]+c2p[4]);
			path1.push(c2p[2]*c[k][0]+c2p[3]*c[k][1]+c2p[5]);
		}
		// Revert line ?
		if (readable && path1[0]>path1[path1.length-2])
		{	var path2 = [];
			for (var k=path1.length-2; k>=0; k-=2)
			{	path2.push(path1[k]);
				path2.push(path1[k+1]);
			}
			return path2;
		}
		else return path1;
	}

	var ctx = e.context;
	ctx.save();
	ctx.scale(e.frameState.pixelRatio,e.frameState.pixelRatio);

	var features = this.getSource().getFeaturesInExtent(extent);
	for (var i=0, f; f=features[i]; i++)
	{	{	var style = this.textPathStyle_(f,e.frameState.viewState.resolution);
			for (var s,j=0; s=style[j]; j++)
			{	
				var g = s.getGeometry() || f.getGeometry();
				var c;
				switch (g.getType())
				{	case "LineString": c = g.getCoordinates(); break;
					case "MultiLineString": c = g.getLineString(0).getCoordinates(); break;
					default: continue;
				}

				var st = s.getText();
				var path = getPath(c, st.getRotateWithView() );
				
				ctx.font = st.getFont();
				ctx.textBaseline = st.getTextBaseline();
				ctx.textAlign = st.getTextAlign();
				ctx.lineWidth = st.getStroke() ? (st.getStroke().getWidth()||0) : 0;
				ctx.strokeStyle = st.getStroke() ? (st.getStroke().getColor()||"#fff") : "#fff";
				ctx.fillStyle = st.getFill() ? st.getFill().getColor()||"#000" : "#000";
				// New params
				ctx.textJustify = st.getTextAlign()=="justify";
				ctx.textOverflow = st.getTextOverflow ? st.getTextOverflow():"";
				ctx.minWidth = st.getMinWidth ? st.getMinWidth():0;
				// Draw textpath
				ctx.textPath(st.getText()||f.get("name"), path);
			}
		}
	}

	ctx.restore();
}

/** Set the style for features. 
*	This can be a single style object, an array of styles, or a function that takes a feature and resolution and 
*	returns an array of styles. If it is undefined the default style is used. 
*	If it is null the layer has no style (a null style). 
*	See ol.style for information on the default style.
*	@param {ol.style.Style|Array.<ol.style.Style>|ol.StyleFunction} style
*	@param {Number} maxResolution to display text, default: 0
*/
ol.layer.Vector.prototype.setTextPathStyle = function(style, maxResolution)
{
	// Remove existing style
	if (style===null)
	{	if (this.textPath_) this.unByKey(this.textPath_);
		this.textPath_ = null;
		this.changed();
		return;
	}
	// New postcompose
	if (!this.textPath_)
	{	this.textPath_ = this.on('postcompose', drawTextPath, this);
	}
	// Set textPathStyle
	if (style===undefined)
	{	style = [ new ol.style.Style({ text: new ol.style.Text()}) ];
	}
	if (typeof(style) == "function") this.textPathStyle_ = style;
	else this.textPathStyle_ = function() { return style; };
	this.textPathMaxResolution_ = Number(maxResolution) || Number.MAX_VALUE;

	// Force redraw
	this.changed();
}


/** Add new properties to ol.style.Text
* to use with ol.layer.Vector.prototype.setTextPathStyle
* @constructor
* @param {} options
*	@param {visible|ellipsis|string} textOverflow
*	@param {number} minWidth minimum width (px) to draw text, default 0
*/
ol.style.TextPath = function(options)
{	if (!options) options={};
	ol.style.Text.call (this, options);
	this.textOverflow_ = typeof(options.textOverflow)!="undefined" ?  options.textOverflow : "visible";
	this.minWidth_ = options.minWidth || 0;
}
ol.inherits(ol.style.TextPath, ol.style.Text);

ol.style.TextPath.prototype.getTextOverflow = function() 
{	return this.textOverflow_; 
};

ol.style.TextPath.prototype.getMinWidth = function() 
{	return this.minWidth_; 
};

/**/

})();


/** CanvasRenderingContext2D: draw text along path
* @param {string} text
* @param {Array<Number>} path
*/
CanvasRenderingContext2D.prototype.textPath = function (text, path)
{
	var ctx = this;

	function dist2D(x1,y1,x2,y2)
	{	var dx = x2-x1;
		var dy = y2-y1;
		return Math.sqrt(dx*dx+dy*dy);
	}
  
	var di, dpos=0;
	var pos=2;
	function getPoint(path, dl)
	{	if (!di || dpos+di<dl)
		{ for (; pos<path.length; )
			{	di = dist2D(path[pos-2],path[pos-1],path[pos],path[pos+1]);
				if (dpos+di>dl) break;
				pos += 2;
				if (pos>=path.length) break;
				dpos += di;
			}
		}
   
		var x, y, a, dt = dl-dpos;
		if (pos>=path.length) 
		{	pos = path.length-2;
		}

		if (!dt) 
		{	x = path[pos-2];
			y = path[pos-1];
			a = Math.atan2(path[pos+1]-path[pos-1], path[pos]-path[pos-2]);
		}
		else
		{	x = path[pos-2]+ (path[pos]-path[pos-2])*dt/di;
			y = path[pos-1]+(path[pos+1]-path[pos-1])*dt/di;
			a = Math.atan2(path[pos+1]-path[pos-1], path[pos]-path[pos-2]);
		}
		return [x,y,a];
	}

	var letterPadding = ctx.measureText(" ").width *0.25;
  
	var start = 0;

	var d = 0;
	for (var i=2; i<path.length; i+=2)
	{	d += dist2D(path[i-2],path[i-1],path[i],path[i+1])
	}
	if (d < ctx.minWidth) return;
	var nbspace = text.split(" ").length -1;

	// Remove char for overflow
	if (ctx.textOverflow != "visible")
	{	if (d < ctx.measureText(text).width + (text.length-1 + nbspace) * letterPadding)
		{	var overflow = (ctx.textOverflow=="ellipsis") ? '\u2026' : ctx.textOverflow;
			do
			{	nbspace = text.split(" ").length -1;
				text = text.slice(0,text.length-1);
			} while (text && d < ctx.measureText(text+overflow).width + (text.length + overflow.length-1 + nbspace) * letterPadding)
			text += overflow;
		}
	}

	switch (ctx.textJustify || ctx.textAlign)
	{	case true: // justify
		case "center":
		case "end":
		case "right":
		{	// Text align
			if (ctx.textJustify) 
			{	start = 0;
				letterPadding = (d - ctx.measureText(text).width) / (text.length-1 + nbspace);
			}
			else
			{	start = d - ctx.measureText(text).width - (text.length + nbspace) * letterPadding;
				if (ctx.textAlign == "center") start /= 2;
			}
			break;
		}
		default: break;
	}
  
	for (var t=0; t<text.length; t++)
	{	var letter = text[t];
		var wl = ctx.measureText(letter).width;
    
		var p = getPoint(path, start+wl/2);

		ctx.save();
		ctx.textAlign = "center";
		ctx.translate(p[0], p[1]);
		ctx.rotate(p[2]);
		if (ctx.lineWidth) ctx.strokeText(letter,0,0);
		ctx.fillText(letter,0,0);
		ctx.restore();
		start += wl+letterPadding*(letter==" "?2:1);
	}
  
};
/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*
*  Shadow image style for point vector features
*/
/**
 * @requires ol.style.Circle
 * @requires ol.structs.IHasChecksum
 */


/**
 * @classdesc
 * Set Shadow style for point vector features.
 *
 * @constructor
 * @param {olx.style.PhotoSymbolOptions=} opt_options Options.
 * @extends {ol.style.RegularShape}
 * @implements {ol.structs.IHasChecksum}
 * @api
 */
ol.style.Shadow = function(opt_options) 
{	options = opt_options || {};
	if (!options.fill) options.fill = new ol.style.Fill({ color: "rgba(0,0,0,0.5)" });
	ol.style.RegularShape.call (this,{ radius: options.radius, fill: options.fill });

	this.fill_ = options.fill;
	this.radius_ = options.radius;
	this.blur_ = options.blur===0 ? 0 : options.blur || options.radius/3;
	this.offset_ = [options.offsetX ? options.offsetX : 0, options.offsetY ? options.offsetY : 0];

	this.renderShadow_();
};
ol.inherits(ol.style.Shadow, ol.style.RegularShape);

/**
 * Clones the style. 
 * @return {ol.style.Shadow} 
 */
ol.style.Shadow.prototype.clone = function() 
{	var s = new ol.style.Shadow(
	{	fill: this.fill_,
		radius: this.radius_,
		blur: this.blur_,
		offsetX: this.offset_[0],
		offsetY: this.offset_[1]
	});
	s.setScale(this.getScale());
	s.setOpacity(this.getOpacity());
	return s;
};

/**
 * @private
 */
ol.style.Shadow.prototype.renderShadow_ = function() 
{	
	var radius = this.radius_;
	
	var canvas = this.getImage();
	var s = [canvas.width, canvas.height];
	s[1] = radius;
	// Remove the circle on the canvas
	var context = (canvas.getContext('2d'));

	context.beginPath();
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	context.scale(1,0.5);
	context.arc(radius, -radius, radius-this.blur_, 0, 2 * Math.PI, false);
    context.fillStyle = '#000';

	context.shadowColor = this.fill_.getColor();
	context.shadowBlur = 0.7*this.blur_;
	context.shadowOffsetX = 0;
	context.shadowOffsetY = radius;

	context.closePath();
    context.fill();

	context.shadowColor = 'transparent';
    
	// Set anchor
	var a = this.getAnchor();
	a[0] = canvas.width /2 -this.offset_[0];
	a[1] = canvas.height/5 -this.offset_[1];
}


/**
 * @inheritDoc
 */
ol.style.Shadow.prototype.getChecksum = function() 
{
	var strokeChecksum = (this.stroke_!==null) ?
		this.stroke_.getChecksum() : '-';
	var fillChecksum = (this.fill_!==null) ?
		this.fill_.getChecksum() : '-';

	var recalculate = (this.checksums_===null) ||
		(strokeChecksum != this.checksums_[1] ||
		fillChecksum != this.checksums_[2] ||
		this.radius_ != this.checksums_[3] ||
		this.form_+"-"+this.glyphs_ != this.checksums_[4]);

	if (recalculate) {
		var checksum = 'c' + strokeChecksum + fillChecksum 
			+ ((this.radius_ !== void 0) ? this.radius_.toString() : '-')
			+ this.form_+"-"+this.glyphs_;
		this.checksums_ = [checksum, strokeChecksum, fillChecksum, this.radius_, this.form_+"-"+this.glyphs_];
	}

	return this.checksums_[0];
};

/** Create a cardinal spline version of this geometry. 
*	Original https://github.com/epistemex/cardinal-spline-js
*	@see https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Cardinal_spline
*
* @param {} options
*	- tension {Number} a [0,1] number / can be interpreted as the "length" of the tangent, default 0.5
*	- resolution {Number} size of segment to split
*	- pointsPerSeg {Interger} number of points per segment to add if no resolution is provided, default add 10 points per segment
*/

/** Cache cspline calculation
*/
ol.geom.Geometry.prototype.cspline = function(options)
{	// Calculate cspline
	if (this.calcCSpline_)
	{	if (this.csplineGeometryRevision != this.getRevision() 
			|| this.csplineOption != JSON.stringify(options))
		{	this.csplineGeometry_ = this.calcCSpline_(options)
			this.csplineGeometryRevision = this.getRevision();
			this.csplineOption = JSON.stringify(options);
		}
		return this.csplineGeometry_;
	}
	// Default do nothing
	else
	{	return this;
	}
}

ol.geom.GeometryCollection.prototype.calcCSpline_ = function(options)
{	var g=[], g0=this.getGeometries();
	for (var i=0; i<g0.length; i++)
	{	g.push(g0[i].cspline());
	}
	return new ol.geom.GeometryCollection(g);
}

ol.geom.MultiLineString.prototype.calcCSpline_ = function(options)
{	var g=[], g0=this.getLineStrings();
	for (var i=0; i<g0.length; i++)
	{	g.push(g0[i].cspline().getCoordinates());
	}
	return new ol.geom.MultiLineString(g);
}

ol.geom.Polygon.prototype.calcCSpline_ = function(options)
{	var g=[], g0=this.getCoordinates();
	for (var i=0; i<g0.length; i++)
	{	g.push((new ol.geom.LineString(g0[i])).cspline().getCoordinates());
	}
	return new ol.geom.Polygon(g);
}

ol.geom.MultiPolygon.prototype.calcCSpline_ = function(options)
{	var g=[], g0=this.getPolygons();
	for (var i=0; i<g0.length; i++)
	{	g.push(g0[i].cspline().getCoordinates());
	}
	return new ol.geom.MultiPolygon(g);
}

/**
*/
ol.geom.LineString.prototype.calcCSpline_ = function(options)
 {	if (!options) options={};
	var line = this.getCoordinates();
	var tension = typeof options.tension === "number" ? options.tension : 0.5;
	var resolution = options.resolution || (this.getLength() / line.length / (options.pointsPerSeg || 10));

	var pts, res = [],			// clone array
		x, y,					// our x,y coords
		t1x, t2x, t1y, t2y,		// tension vectors
		c1, c2, c3, c4,			// cardinal points
		st, t, i;				// steps based on num. of segments

	// clone array so we don't change the original
	//
	pts = line.slice(0);

	// The algorithm require a previous and next point to the actual point array.
	// Check if we will draw closed or open curve.
	// If closed, copy end points to beginning and first points to end
	// If open, duplicate first points to befinning, end points to end
	if (line.length>2 && line[0][0]==line[line.length-1][0] && line[0][1]==line[line.length-1][1]) 
	{	pts.unshift(line[line.length-2]);
		pts.push(line[1]);
	}
	else 
	{	pts.unshift(line[0]);
		pts.push(line[line.length-1]);
	}

	// ok, lets start..
	function dist2d(x1, y1, x2, y2)
	{	var dx = x2-x1;
		var dy = y2-y1;
		return Math.sqrt(dx*dx+dy*dy);
	}

	// 1. loop goes through point array
	// 2. loop goes through each segment between the 2 pts + 1e point before and after
	for (i=1; i < (pts.length - 2); i++) 
	{	var d1 = dist2d (pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]);
		var numOfSegments = Math.round(d1/resolution);
		
		var d=1;
		if (options.normalize)
		{	var d1 = dist2d (pts[i+1][0], pts[i+1][1], pts[i-1][0], pts[i-1][1]);
			var d2 = dist2d (pts[i+2][0], pts[i+2][1], pts[i][0], pts[i][1]);
			if (d1<d2) d = d1/d2;
			else d = d2/d1;
		}

		// calc tension vectors
		t1x = (pts[i+1][0] - pts[i-1][0]) * tension *d;
		t2x = (pts[i+2][0] - pts[i][0]) * tension *d;

		t1y = (pts[i+1][1] - pts[i-1][1]) * tension *d;
		t2y = (pts[i+2][1] - pts[i][1]) * tension *d;

		for (t=0; t <= numOfSegments; t++) 
		{	// calc step
			st = t / numOfSegments;

			// calc cardinals
			c1 =   2 * Math.pow(st, 3) 	- 3 * Math.pow(st, 2) + 1; 
			c2 = -(2 * Math.pow(st, 3)) + 3 * Math.pow(st, 2); 
			c3 = 	   Math.pow(st, 3)	- 2 * Math.pow(st, 2) + st; 
			c4 = 	   Math.pow(st, 3)	- 	  Math.pow(st, 2);

			// calc x and y cords with common control vectors
			x = c1 * pts[i][0]	+ c2 * pts[i+1][0] + c3 * t1x + c4 * t2x;
			y = c1 * pts[i][1]	+ c2 * pts[i+1][1] + c3 * t1y + c4 * t2y;

			//store points in array
			res.push([x,y]);
		}
	}

	return new ol.geom.LineString(res);
}

/** Convert a list of image file or a list of image into geojson 
* reading location in the EXIF tags
* @constructor
* @param {Array<Image|File>} img the array to process
* @param {} options
*	- camera {boolean} true to get camera info
*	- date {boolean} true to get photo date
*	- image {boolean} true to get image info
*	- loading {function} a callback function that take the number of image to process
*	- onLoad {function} callback function that takes a geojson when loaded
* @require Exif-JS [https://github.com/exif-js/exif-js] 
*/
var exif2geojson;

(function(){

// Get fractionnal number
function getNumber(n) { return n.numerator / n.denominator; }

// Convert to DMS
function getDMS(l)
{	if (l) return getNumber(l[0]) + getNumber(l[1]) /60 + getNumber(l[2]) /3600;
	else return null;
}

// Constructor
exif2geojson = function (img, options)
{	options = options || {};
	if (typeof(options.loading) != "function") options.loading = function(){};
	if (typeof(options.onLoad) != "function") options.onLoad = function(json){ console.log(json); };
	//
	var json = 
	{	"type": "FeatureCollection",
		"features": []
	};

	var nb = img.length;
	for (var i=0, f; f=img[i]; i++)
	{	EXIF.getData(f, function() 
		{	// console.log(this);
			if (this.exifdata.GPSLongitudeRef) 
			{	// json feature
				fjs = 
				{	"type": "Feature",
					"properties": {},
					"geometry": 
					{	"type": "Point",
						"coordinates": []
					}
				};
				json.features.push (fjs)
				fjs.geometry.coordinates = 
				[	(this.exifdata.GPSLongitudeRef=='E'? 1: -1) * getDMS(this.exifdata.GPSLongitude),
					(this.exifdata.GPSLatitudeRef=='N'? 1: -1) * getDMS(this.exifdata.GPSLatitude)
				];
				if (this.exifdata.GPSAltitude) fjs.geometry.coordinates.push (getNumber(this.exifdata.GPSAltitude));
				fjs.properties.url = this.src || this.name;
				if (this.exifdata.ImageDescription) fjs.properties.description = this.exifdata.ImageDescription;
				if (options.date && this.exifdata.DateTime) fjs.properties.date = this.exifdata.DateTime;
				// Camera info
				if (options.camera)
				{	if (this.exifdata.Make) fjs.properties.make = this.exifdata.Make;
					if (this.exifdata.Model) fjs.properties.model = this.exifdata.Model.replace(new RegExp(String.fromCharCode(0),'g'),"");
				}
				// Image info
				if (options.image)
				{	fjs.properties.size = this.size;
					fjs.properties.type = this.type;
					if (this.exifdata.ImageHeight) fjs.properties.height = this.exifdata.ImageHeight;
					if (this.exifdata.ImageWidth) fjs.properties.width = this.exifdata.ImageWidth;
				}
			}
			nb--;
			options.loading(nb)
			if (!nb) options.onLoad(json);
		});
	}
}

})();
/*	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/**
* Hexagonal grids
* @classdesc ol.HexGrid is a class to compute hexagonal grids 
* @see http://www.redblobgames.com/grids/hexagons
*
* @constructor ol.HexGrid
* @extends {ol.Object}
* @param {olx.HexGrid=} options
*	@param {Number} options.size size of the exagon in map units, default 80000
*	@param {ol.coordinate} options.origin orgin of the grid, default [0,0]
*	@param {pointy|flat} options.layout grid layout, default pointy
*/
ol.HexGrid = function (options)
{	options = options || {};
	
	ol.Object.call (this, options);

	// Options
	this.size_ = options.size||80000;
	this.origin_ = options.origin || [0,0];
	this.layout_ = this.layout[options.layout] || this.layout.pointy;

};
ol.inherits (ol.HexGrid, ol.Object);

/** Layout
*/
ol.HexGrid.prototype.layout =
{	pointy: 
	[	Math.sqrt(3), Math.sqrt(3)/2, 0, 3/2, 
		Math.sqrt(3)/3, -1/3, 0, 2/3, 
		// corners
		Math.cos(Math.PI / 180 * (60 * 0 + 30)), Math.sin(Math.PI / 180 * (60 * 0 + 30)), 
		Math.cos(Math.PI / 180 * (60 * 1 + 30)), Math.sin(Math.PI / 180 * (60 * 1 + 30)), 
		Math.cos(Math.PI / 180 * (60 * 2 + 30)), Math.sin(Math.PI / 180 * (60 * 2 + 30)), 
		Math.cos(Math.PI / 180 * (60 * 3 + 30)), Math.sin(Math.PI / 180 * (60 * 3 + 30)), 
		Math.cos(Math.PI / 180 * (60 * 4 + 30)), Math.sin(Math.PI / 180 * (60 * 4 + 30)), 
		Math.cos(Math.PI / 180 * (60 * 5 + 30)), Math.sin(Math.PI / 180 * (60 * 5 + 30))
	],
	flat: 
	[	3/2, 0, Math.sqrt(3)/2, Math.sqrt(3), 2/3, 
		0, -1/3, Math.sqrt(3) / 3, 
		// corners
		Math.cos(Math.PI / 180 * (60 * 0)), Math.sin(Math.PI / 180 * (60 * 0)), 
		Math.cos(Math.PI / 180 * (60 * 1)), Math.sin(Math.PI / 180 * (60 * 1)), 
		Math.cos(Math.PI / 180 * (60 * 2)), Math.sin(Math.PI / 180 * (60 * 2)), 
		Math.cos(Math.PI / 180 * (60 * 3)), Math.sin(Math.PI / 180 * (60 * 3)), 
		Math.cos(Math.PI / 180 * (60 * 4)), Math.sin(Math.PI / 180 * (60 * 4)), 
		Math.cos(Math.PI / 180 * (60 * 5)), Math.sin(Math.PI / 180 * (60 * 5))
	]
};

/** Set layout
* @param {pointy | flat | undefined} layout name, default pointy
*/
ol.HexGrid.prototype.setLayout = function (layout)
{	this.layout_ = this.layout[layout] || this.layout.pointy;
	this.changed();
}

/** Get layout
* @return {pointy | flat} layout name
*/
ol.HexGrid.prototype.getLayout = function ()
{	return (this.layout_[9]!=0 ? 'pointy' : 'flat');
}

/** Set hexagon origin
* @param {ol.coordinate} coord origin
*/
ol.HexGrid.prototype.setOrigin = function (coord)
{	this.origin_ = coord;
	this.changed();
}

/** Get hexagon origin
* @return {ol.coordinate} coord origin
*/
ol.HexGrid.prototype.getOrigin = function (coord)
{	return this.origin_;
}

/** Set hexagon size
* @param {Number} hexagon size
*/
ol.HexGrid.prototype.setSize = function (s)
{	this.size_ = s || 80000;
	this.changed();
}

/** Get hexagon size
* @return {Number} hexagon size
*/
ol.HexGrid.prototype.getSize = function (s)
{	return this.size_;
}

/** Convert cube to axial coords
* @param {ol.coordinate} c cube coordinate
* @return {ol.coordinate} axial coordinate
*/
ol.HexGrid.prototype.cube2hex = function (c)
{	return [c[0], c[2]];
};

/** Convert axial to cube coords
* @param {ol.coordinate} h axial coordinate
* @return {ol.coordinate} cube coordinate
*/
ol.HexGrid.prototype.hex2cube = function(h)
{	return [h[0], -h[0]-h[1], h[1]];
};

/** Convert offset to axial coords
* @param {ol.coordinate} h axial coordinate
* @return {ol.coordinate} offset coordinate
*/
ol.HexGrid.prototype.hex2offset = function (h)
{	if (this.layout_[9]) return [ h[0] + (h[1] - (h[1]&1)) / 2, h[1] ];
	else return [ h[0], h[1] + (h[0] + (h[0]&1)) / 2 ];
}

/** Convert axial to offset coords
* @param {ol.coordinate} o offset coordinate
* @return {ol.coordinate} axial coordinate
*/
ol.HexGrid.prototype.offset2hex = function(o)
{	if (this.layout_[9]) return [ q = o[0] - (o[1] - (o[1]&1)) / 2,  r = o[1] ];
	else return [ o[0], o[1] - (o[0] + (o[0]&1)) / 2 ];
}

/** Convert offset to cube coords
* @param {ol.coordinate} c cube coordinate
* @return {ol.coordinate} offset coordinate
* /
ol.HexGrid.prototype.cube2offset = function(c)
{	return hex2offset(cube2hex(c));
};

/** Convert cube to offset coords
* @param {ol.coordinate} o offset coordinate
* @return {ol.coordinate} cube coordinate
* /
ol.HexGrid.prototype.offset2cube = function (o)
{	return hex2cube(offset2Hex(o));
};

/** Round cube coords
* @param {ol.coordinate} h cube coordinate
* @return {ol.coordinate} rounded cube coordinate
*/
ol.HexGrid.prototype.cube_round = function(h)
{	var rx = Math.round(h[0])
	var ry = Math.round(h[1])
	var rz = Math.round(h[2])

	var x_diff = Math.abs(rx - h[0])
	var y_diff = Math.abs(ry - h[1])
	var z_diff = Math.abs(rz - h[2])

	if (x_diff > y_diff && x_diff > z_diff) rx = -ry-rz
	else if (y_diff > z_diff) ry = -rx-rz
	else rz = -rx-ry

	return [rx, ry, rz];
};

/** Round axial coords
* @param {ol.coordinate} h axial coordinate
* @return {ol.coordinate} rounded axial coordinate
*/
ol.HexGrid.prototype.hex_round = function(h)
{	return this.cube2hex( this.cube_round( this.hex2cube(h )) );
};

/** Get hexagon corners
*/
ol.HexGrid.prototype.hex_corner = function(center, size, i)
{	return [ center[0] + size * this.layout_[8+(2*(i%6))], center[1] + size * this.layout_[9+(2*(i%6))]];
};

/** Get hexagon coordinates at a coordinate
* @param {ol.coord} coord
* @return {Arrary<ol.coord>}
*/
ol.HexGrid.prototype.getHexagonAtCoord = function (coord)
{	returhn (this.getHexagon(this.coord2hex(coord)));
};

/** Get hexagon coordinates at hex
* @param {ol.coord} hex
* @return {Arrary<ol.coord>}
*/
ol.HexGrid.prototype.getHexagon = function (hex)
{	var p = [];
	var c = this.hex2coord(hex);
	for (var i=0; i<=7; i++)
	{	p.push(this.hex_corner(c, this.size_, i, this.layout_[8]));
	}
	return p;
};

/** Convert hex to coord
* @param {ol.hex} hex 
* @return {ol.coord} 
*/
ol.HexGrid.prototype.hex2coord = function (hex)
{	return [
		this.origin_[0] + this.size_ * (this.layout_[0] * hex[0] + this.layout_[1] * hex[1]), 
		this.origin_[1] + this.size_ * (this.layout_[2] * hex[0] + this.layout_[3] * hex[1])
	];
};

/** Convert coord to hex
* @param {ol.coord} coord 
* @return {ol.hex} 
*/
ol.HexGrid.prototype.coord2hex = function (coord)
{	var c = [ (coord[0]-this.origin_[0]) / this.size_, (coord[1]-this.origin_[1]) / this.size_ ];
	var q = this.layout_[4] * c[0] + this.layout_[5] * c[1];
	var r = this.layout_[6] * c[0] + this.layout_[7] * c[1];
	return this.hex_round([q, r]);
};

/** Calculate distance between to hexagon (number of cube)
* @param {ol.coordinate} a first cube coord
* @param {ol.coordinate} a second cube coord
* @return {Number} distance
*/
ol.HexGrid.prototype.cube_distance = function (a, b)
{	//return ( (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 2 );
	return ( Math.max (Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) );
};

(function(){
/** Line interpolation
*/
function lerp(a, b, t)
{	// for floats
    return a + (b - a) * t;
};
function cube_lerp(a, b, t)
{	// for hexes
    return [ 
		lerp (a[0]+1e-6, b[0], t), 
		lerp (a[1]+1e-6, b[1], t),
		lerp (a[2]+1e-6, b[2], t)
	];
};

/** Calculate line between to hexagon 
* @param {ol.coordinate} a first cube coord
* @param {ol.coordinate} b second cube coord
* @return {Array<ol.coordinate>} array of cube coordinates
*/
ol.HexGrid.prototype.cube_line = function (a, b)
{	var d = this.cube_distance(a, b);
	if (!d) return [a];
    var results = []
    for (var i=0; i<=d; i++) 
	{	results.push ( this.cube_round ( cube_lerp(a, b, i/d) ) );
	}
    return results;
};
})();


ol.HexGrid.prototype.neighbors = 
{	'cube':	[ [+1, -1,  0], [+1,  0, -1], [0, +1, -1], [-1, +1,  0], [-1,  0, +1], [0, -1, +1] ],
	'hex':	[ [+1, 0], [+1,  -1], [0, -1], [-1, 0], [-1, +1], [0, +1] ]
};

/** Get the neighbors for an hexagon
* @param {ol.coordinate} h axial coord
* @param {Number} direction 
* @return { ol.coordinate | Array<ol.coordinates> } neighbor || array of neighbors
*/
ol.HexGrid.prototype.hex_neighbors = function (h, d)
{	if (d!==undefined)
	{	return [ h[0] + this.neighbors.hex[d%6][0], h[1]  + this.neighbors.hex[d%6][1] ];
	}
	else
	{	var n = [];
		for (d=0; d<6; d++)
		{	n.push ([ h[0] + this.neighbors.hex[d][0], h[1]  + this.neighbors.hex[d][1] ]);
		}
		return n;
	}
};

/** Get the neighbors for an hexagon
* @param {ol.coordinate} c cube coord
* @param {Number} direction 
* @return { ol.coordinate | Array<ol.coordinates> } neighbor || array of neighbors
*/
ol.HexGrid.prototype.cube_neighbors = function (c, d)
{	if (d!==undefined)
	{	return [ c[0] + this.neighbors.cube[d%6][0], c[1]  + this.neighbors.cube[d%6][1], c[2]  + this.neighbors.cube[d%6][2] ];
	}
	else
	{	var n = [];
		for (d=0; d<6; d++)
		{	n.push ([ c[0] + this.neighbors.cube[d][0], c[1]  + this.neighbors.cube[d][1], c[2]  + this.neighbors.cube[d][2] ]);
		}
		for (d=0; d<6; d++) n[d] = this.cube2hex(n[d])
		return n;
	}
};

/** jQuery plugin to export the map 
*
* Export PDF :
* @uses jspdf
* by gingerik
* https://github.com/gingerik/ol3/blob/gh-pages/examples/export-pdf.html
* http://gingerik.github.io/ol3/examples/export-pdf.html
*
* @param: {ol.Map} map to export
* @param: {Object=} {format, quality, dpi} 
*		format {String}: png/jpeg/webp, default find the extension in the download attribut
*		quality {Number}: between 0 and 1 indicating image quality if the requested type is jpeg or webp
*		dpi {Number}: resolution of the map
*/
$.fn.exportMap = function(map, options)
{	if (!options) options={};

	function saveCanvas(input, canvas, ext)
	{	if (ext=='pdf')
		{	var data = canvas.toDataURL('image/jpeg');
			var size, w, h, orient, format = 'a4';
			var margin = Number($(input).data('margin'))||0;
			// Calculate size
			if (canvas.width > canvas.height)
			{	orient = 'landscape';
				size = [297,210];
			}
			else
			{	orient = 'portrait';
				size = [210,297];
			}
			var sc = Math.min ((size[0]-2*margin)/canvas.width,(size[1]-2*margin)/canvas.height);
			w = sc * canvas.width;
			h = sc * canvas.height;
			// Center
			var mx = (size[0] - w)/2;
			var my = (size[1] - h)/2;
			// Export!
			var pdf = new jsPDF(orient, "mm", format);
			pdf.addImage(data, 'JPEG', mx, my, w, h);
			// pdf.save('map.pdf');
			input.href = pdf.output('datauristring');
		}
		else input.href = canvas.toDataURL('image/'+(options.format||ext), options.quality);
	}

	if (!this.each) return;

	return this.each(function()
	{	// Force download on HTML5
		if ('download' in this)
		{	var self = this;
			$(this).on('click',function()
			{	// Get extension in the download
				var ext = $(this).attr("download").split('.').pop();
				if (ext=='jpg') ext = 'jpeg';
				// Try to change resolution
				if (options.dpi)
				{	map.once('precompose', function(event) 
					{	var canvas = event.context.canvas;
						var scaleFactor = options.dpi / 96;
						canvas.width = Math.ceil(canvas.width * scaleFactor);
						canvas.height = Math.ceil(canvas.height * scaleFactor);
						event.context.scale(scaleFactor, scaleFactor);
					});
				}
				var label = $(this).text();
				// Draw a white background before draw (transparent background)
				if (ext!='png')
				{	map.once('precompose', function(e)
					{	e.context.fillStyle = "white";
						e.context.fillRect(0,0,e.context.canvas.width,e.context.canvas.height);
					})
				}
				// Copy the map
				map.once('postcompose', function(event) 
				{	saveCanvas (self, event.context.canvas, ext);
					// Redraw map (if dpi change)
					setTimeout(function(){ map.renderSync() }, 500);
				});
				map.renderSync();
			});
		}
		else 
		{	//$(this).hide();
			$(this).on('click',function(){ alert ("Export functions are not supported by your browser...");});
		}
	});
};

/*
	Copyright (c) 2017 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (http://www.cecill.info/).
	
	ol.coordinate.convexHull compute a convex hull using Andrew's Monotone Chain Algorithm.
	
	@see https://en.wikipedia.org/wiki/Convex_hull_algorithms
*/

(function(){

/* Tests if a point is left or right of line (a,b).
* @param {ol.coordinate} a point on the line
* @param {ol.coordinate} b point on the line
* @param {ol.coordinate} 0
* @return {bool} true if (a,b,o) turns clockwise
*/
function clockwise (a, b, o) 
{	return ( (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]) <= 0 )
}

/** Compute a convex hull using Andrew's Monotone Chain Algorithm
* @param {Array<ol.geom.Point>} points an array of 2D points 
* @return {Array<ol.geom.Point>} the convex hull vertices
*/
ol.coordinate.convexHull = function (points) 
{	// Sort by increasing x and then y coordinate
	points.sort(function(a, b) 
	{	return a[0] == b[0] ? a[1] - b[1] : a[0] - b[0];
	});

    // Compute the lower hull 
	var lower = [];
	for (var i = 0; i < points.length; i++) 
	{	while (lower.length >= 2 && clockwise (lower[lower.length - 2], lower[lower.length - 1], points[i]) ) 
		{	lower.pop();
		}
		lower.push(points[i]);
	}

    // Compute the upper hull 
	var upper = [];
	for (var i = points.length - 1; i >= 0; i--) 
	{	while (upper.length >= 2 && clockwise (upper[upper.length - 2], upper[upper.length - 1], points[i]) ) 
		{	upper.pop();
		}
		upper.push(points[i]);
	}

	upper.pop();
	lower.pop();
	return lower.concat(upper);
}

/* Get coordinates of a geometry */
function getCoordinates(geom)
{	var h = [];
	switch (geom.getType())
	{	case "Point":
			h.push(geom.getCoordinates());
			break;
		case "LineString":
		case "LinearRing":
		case "MultiPoint":
			 h = geom.getCoordinates();
			break;
		case "MultiLineString":
			var p = geom.getLineStrings();
			for (var i=0; i<p.length; i++) h.concat(getCoordinates(p[i]));
			break;
		case "Polygon":
			h = getCoordinates(geom.getLinearRing(0));
			break;
		case "MultiPolygon":
			var p = geom.getPolygons();
			for (var i=0; i<p.length; i++) h.concat(getCoordinates(p[i]));
			break;
		case "GeometryCollection":
			var p = geom.getGeometries();
			for (var i=0; i<p.length; i++) h.concat(getCoordinates(p[i]));
			break;
		default:break;
	}
	return h;
}

/** Compute a convex hull on a geometry using Andrew's Monotone Chain Algorithm
* @return {Array<ol.geom.Point>} the convex hull vertices
*/
ol.geom.Geometry.prototype.convexHull = function()
{	return ol.coordinate.convexHull( getCoordinates(this) );
};


})();
/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).

	Usefull function to handle geometric operations
*/


/** Distance beetween 2 points
*	Usefull geometric functions
* @param {ol.coordinate} p1 first point
* @param {ol.coordinate} p2 second point
* @return {number} distance
*/
ol.coordinate.dist2d = function(p1, p2)
{	var dx = p1[0]-p2[0];
	var dy = p1[1]-p2[1];
	return Math.sqrt(dx*dx+dy*dy);
}
/** 2 points are equal
*	Usefull geometric functions
* @param {ol.coordinate} p1 first point
* @param {ol.coordinate} p2 second point
* @return {boolean}
*/
ol.coordinate.equal = function(p1, p2)
{	return (p1[0]==p2[0] && p1[1]==p2[1]);
}

/** Get center coordinate of a feature
* @param {ol.Feature} f
* @return {ol.coordinate} the center
*/
ol.coordinate.getFeatureCenter = function(f)
{	return ol.coordinate.getGeomCenter (f.getGeometry());
};

/** Get center coordinate of a geometry
* @param {ol.Feature} geom
* @return {ol.coordinate} the center
*/
ol.coordinate.getGeomCenter = function(geom)
{	switch (geom.getType())
	{	case 'Point': 
			return geom.getCoordinates();
		case "MultiPolygon":
			geom = geom.getPolygon(0);
		case "Polygon":
			return geom.getInteriorPoint().getCoordinates();
		default:
			return geom.getClosestPoint(ol.extent.getCenter(geom.getExtent()));
	};
};

/** Split a lineString by a point or a list of points
*	NB: points must be on the line, use getClosestPoint() to get one
* @param {ol.Coordinate | Array<ol.Coordinate>} pt points to split the line
* @param {Number} tol distance tolerance for 2 points to be equal
*/
ol.geom.LineString.prototype.splitAt = function(pt, tol)
{	if (!pt) return [this];
	if (!tol) tol = 1e-10;
	// Test if list of points
	if (pt.length && pt[0].length)
	{	var result = [this];
		for (var i=0; i<pt.length; i++)
		{	var r = [];
			for (var k=0; k<result.length; k++)
			{	var ri = result[k].splitAt(pt[i], tol);
				r = r.concat(ri);
			}
			result = r;
		}
		return result;
	}
	// Nothing to do
	if (ol.coordinate.equal(pt,this.getFirstCoordinate())
	 || ol.coordinate.equal(pt,this.getLastCoordinate())) 
	{	return [this];
	}
	// Get 
	var c0 = this.getCoordinates();
	var ci=[c0[0]], p0, p1;
	var c = [];
	for (var i=0; i<c0.length-1; i++)
	{	// Filter equal points
		if (ol.coordinate.equal(c0[i],c0[i+1])) continue;
		// Extremity found  
		if (ol.coordinate.equal(pt,c0[i+1]))
		{	ci.push(c0[i+1]);
			c.push(new ol.geom.LineString(ci));
			ci = [];
		}
		// Test alignement
		else if (!ol.coordinate.equal(pt,c0[i]))
		{	var d1, d2;
			if (c0[i][0] == c0[i+1][0])
			{	d1 = d2 = (c0[i][1]-pt[1]) / (c0[i][1]-c0[i+1][1]);
			}
			else if (c0[i][1] == c0[i+1][1])
			{	d1 = d2 = (c0[i][0]-pt[0]) / (c0[i][0]-c0[i+1][0]);
			}
			else
			{	d1 = (c0[i][0]-pt[0]) / (c0[i][0]-c0[i+1][0]);
				d2 = (c0[i][1]-pt[1]) / (c0[i][1]-c0[i+1][1]);
			}
			if (Math.abs(d1-d2)<tol && 0<=d1 && d1<=1)
			{	ci.push(pt);
				c.push (new ol.geom.LineString(ci));
				ci = [pt];
			}
		}
		ci.push(c0[i+1]);
	}
	if (ci.length>1) c.push (new ol.geom.LineString(ci));
	if (c.length) return c;
	else return [this];
}

/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Pulse a point on postcompose
*	@param {ol.coordinates} point to pulse
*	@param {ol.pulse.options} pulse options param
*		- projection {ol.projection||String} projection of coords
*		- duration {Number} animation duration in ms, default 2000
*		- easing {ol.easing} easing function, default ol.easing.upAndDown
*		- width {Number} line width, default 2
*		- color {ol.color} line color, default red
*/
ol.Map.prototype.animExtent = function(extent, options)
{	var listenerKey;
	options = options || {};

	// Change to map's projection
	if (options.projection)
	{	extent = ol.proj.transformExtent (extent, options.projection, this.getView().getProjection());
	}
	
	// options
	var start = new Date().getTime();
	var duration = options.duration || 1000;
	var easing = options.easing || ol.easing.upAndDown;
	var width = options.lineWidth || 2;
	var color = options.color || 'red';

	// Animate function
	function animate(event) 
	{	var frameState = event.frameState;
		var ratio = frameState.pixelRatio;
		var elapsed = frameState.time - start;
		if (elapsed > duration) ol.Observable.unByKey(listenerKey);
		else
		{	var elapsedRatio = elapsed / duration;
			var p0 = this.getPixelFromCoordinate([extent[0],extent[1]]);
			var p1 = this.getPixelFromCoordinate([extent[2],extent[3]]);

			var context = event.context;
			context.save();
			context.scale(ratio,ratio);
			context.beginPath();
			var e = easing(elapsedRatio)
			context.globalAlpha = easing(1 - elapsedRatio);
			context.lineWidth = width;
			context.strokeStyle = color;
			context.rect(p0[0], p0[1], p1[0]-p0[0], p1[1]-p0[1]);
			context.stroke();
			context.restore();
			// tell OL3 to continue postcompose animation
			frameState.animate = true;
		}
	}

	// Launch animation
	listenerKey = this.on('postcompose', animate, this);
	this.renderSync();
}


/*	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** Ordering function for ol.layer.Vector renderOrder parameter
*	ol.ordering.fn (options)
*	It will return an ordering function (f0,f1)
*	@namespace
*/
ol.ordering = {}

/** y-Ordering
*	@return ordering function (f0,f1)
*/
ol.ordering.yOrdering = function(options)
{	return function(f0,f1)
	{	return f0.getGeometry().getExtent()[1] < f1.getGeometry().getExtent()[1] ;
	};
}

/** Order with a feature attribute
*	@param option
*		attribute: ordering attribute, default zIndex
*		equalFn: ordering function for equal values
*	@return ordering function (f0,f1)
*/
ol.ordering.zIndex = function(options)
{	if (!options) options = {};
	var attr = options.attribute || 'zIndex';
	if (option.equalFn)
	{	return function(f0,f1)
		{	if (f0.get(attr) == f1.get(attr)) return option.equalFn(f0,f1);
			return f0.get(attr) < f1.get(attr);
		};
	}
	else
	{	return function(f0,f1)
		{	return f0.get(attr) < f1.get(attr);
		};
	}
}
/** WSynchro object to synchronize windows
*	- windows: array of windows to synchro (
*	- source: the window source (undefined if first window)
*/
if (!window.WSynchro) WSynchro = { windows: [] };

/** Open a new window to synchronize
*	@param {url|undefined} url to open, default current window url
*	@param {specs|undefined|null} specs (as for window.open), undefined to open in a new window, null to open in a new tab, default new window
*/
WSynchro.open = function (href, specs)
{	var w = window.open (href || window.location.href, "_blank", typeof(specs)=="undefined"? "location=1,menubar=1,toolbar=1,scrollbars=1" : specs);
	if (!w.WSynchro) w.WSynchro = { windows: [ window ], source:window };
	else
	{	w.WSynchro.windows = [ window ];
		w.WSynchro.source = window;
	}
	this.windows.push(w);
}

/**	Trigger function 
*	@param {synchronize} 
*	@param {function} synchronize function
*/
WSynchro.on = function (e, syncFn)
{	if (!this.syncFn_) this.syncFn_ = [];
	if (e==='synchronize') this.syncFn_.push(syncFn);
}

/**	Synchronize windows
*	@param {Object|undefined} if undefined stop synchro (when the window is synchronize)
*/
WSynchro.synchronize = function(params)
{	this.synchronize_ (params);
}

/**	Synchronize windows: 
*	@param {Array} array of arguments to use with fn
*	@param {} internal syncrho time to avoid stnchro loops
*	@private
*/
WSynchro.synchronize_ = function(args, sync)
{	// Stop condition 
	if (!sync) 
	{	if (this.synchronizing) sync = this.sync;
		else this.sync = sync = (new Date()).getTime();
		this.synchronizing = false;
	}
	else 
	{	// Don't synchronize twice
		if (sync == this.sync) return;
		this.sync = sync;
		this.synchronizing = true;
		try
		{	if (WSynchro.syncFn_)
			{	args.type = "synchronize";
				for (var i=0; i<WSynchro.syncFn_.length; i++) 
				{	WSynchro.syncFn_[i].apply (null, [args]);
				}
			}
		} catch(e) {};
	}
	if (args) for (var i=0; i<this.windows.length; i++)
	{	try
		{	this.windows[i].WSynchro.synchronize_(args, sync); 
		} catch(e) {};
	}
}
