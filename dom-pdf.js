
function dompdf(root, opts) {
	const OPEN = "<<";
	const CLOSE = ">>";

	//Size in pt of various paper formats
	const FORMATS = {
		"a0": [2383.94, 3370.39],
		"a1": [1683.78, 2383.94],
		"a2": [1190.55, 1683.78],
		"a3": [841.89, 1190.55],
		"a4": [595.28, 841.89],
		"a5": [419.53, 595.28],
		"a6": [297.64, 419.53],
		"a7": [209.76, 297.64],
		"a8": [147.40, 209.76],
		"a9": [104.88, 147.40],
		"a10": [73.70, 104.88],
		"b0": [2834.65, 4008.19],
		"b1": [2004.09, 2834.65],
		"b2": [1417.32, 2004.09],
		"b3": [1000.63, 1417.32],
		"b4": [708.66, 1000.63],
		"b5": [498.90, 708.66],
		"b6": [354.33, 498.90],
		"b7": [249.45, 354.33],
		"b8": [175.75, 249.45],
		"b9": [124.72, 175.75],
		"b10": [87.87, 124.72],
		"c0": [2599.37, 3676.54],
		"c1": [1836.85, 2599.37],
		"c2": [1298.27, 1836.85],
		"c3": [918.43, 1298.27],
		"c4": [649.13, 918.43],
		"c5": [459.21, 649.13],
		"c6": [323.15, 459.21],
		"c7": [229.61, 323.15],
		"c8": [161.57, 229.61],
		"c9": [113.39, 161.57],
		"c10": [79.37, 113.39],
		"dl": [311.81, 623.62],
		"letter": [612, 792],
		"government-letter": [576, 756],
		"legal": [612, 1008],
		"junior-legal": [576, 360],
		"ledger": [1224, 792],
		"tabloid": [792, 1224],
		"credit-card": [153, 243]
	};

	//allowed fonts names
	const FONTS = [
		"Arial",
		"ArialBold",
		"ArialOblique",
		"ArialBoldOblique",
		"Courier",
		"CourierBold",
		"CourierOblique",
		"CourierBoldOblique",
		"Helvetica",
		"HelveticaBold",
		"HelveticaOblique",
		"HelveticaBoldOblique",
		"TimesNewRoman",
		"TimesNewRomanBold",
		"TimesNewRomanItalic",
		"TimesNewRomanBoldItalic"
	];

	opts = opts || {}; //user config
	opts.pageFormat = opts.pageFormat || "a4";
	opts.fontSize = opts.fontSize || 12;

	var contents = []; //data
	var offsets = []; //objects offsets
	var pages = []; //page container
	var stream = []; //page contents
	var images = []; //images id
	var sources = []; //images src
	var length = 0; //contents size
	var objects = 0; //id secuence

	//common image canvas container
	var canvas = document.createElement("canvas");
	var ctx = canvas.getContext("2d"); //always 2d

	function _fd(n, d) { return Number(Math.round(n + "e" + d) + "e-" + d); };
	function _f2(n) { return _fd(n, 2); };
	function _f3(n) { return _fd(n, 3); };

	function _rpad(v, l) { while (v.length < l) v += "0"; return v; };
	function _lpad(v, l) { while (v.length < l) v = "0" + v; return v; };
	function _ucfirst(s) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); };
	function _titleCase(s) { return s.split(/\s+/).map(_ucfirst).join(" "); };
	function _isset(val) { return (typeof val != "undefined") && (val != null); };
	function _boolval(val) { return val && (val != "false") && (val != "0"); };
	function _bool(elem, name) { return _boolval($(elem).attr(name)); };
	function _fAttr(elem, name) { return parseFloat($(elem).attr(name)); };
	function _f2Attr(elem, name) { return _f2(_fAttr(elem, name)); };
	function _fStyle(elem, name) { return parseFloat($(elem).css(name)); };
	function _f2Style(elem, name) { return _f2(_fStyle(elem, name)); };
	function _nvl(val, def) { return _isset(val) ? val : def; };
	function _index(i) { return (i > -1) ? i : 0; };

	//id types for pdf reference format
	function _ref(id) { return id + " 0 R"; };
	//join "content" into the array container
	function _put(str) { contents.push(str); };
	function _putArray(data) { data.forEach(_put); };
	//+1 for "\n" that will be used to join "content"
	function _out(str) { length += str.length + 1; _put(str); };
	function _outArray(data) { data.forEach(_out); };

	//parse and render functions helper
	function _open(id) { _out(id + " 0 obj"); };
	function _close() { _out("endobj"); };
	function _object(data) { _out(OPEN); _outArray(data); _out(CLOSE); };
	function _named(name, data) { _out(name); _object(data); };
	function _element(id) { offsets.push(length); _open(id); };
	function _pdf(id, data) { _element(id); _object(data); _close(); return id; };
	function _stream(data) { _out("stream"); _outArray(data.filter(_isset)); _out("endstream"); };
	function _streaming(id, data, out) { _element(id); _object(data); _stream(out || stream); _close(); return id; };
	function _size(arr) { return arr.reduce(function(c, e) { return c + e.length; }, 0); };
	function _offset(page, elem, height) {
		if (elem.nodeType == 3) return null; //#text node?
		var offset = $(elem).offset(); //position relative to the document
		var box = elem.getBoundingClientRect(); //position relative to the viewport
		offset.width = elem.width || elem.clientWidth || box.width;
		offset.height = height || box.height; //calc element height
		offset.top = page.bottom - offset.top; //relative to bottom page
		offset.left -= page.left; //offset left is relative to page left
		offset.bottom = offset.top - offset.height; //bottom relative to page
		offset.right = offset.left + offset.width; //right offset element
		return offset;
	};

	function _f2Coords(x, y) { return _f2(x) + " " + _f2(y); };
	function _f2Elem(o) { return _f2Coords(o.left, o.bottom); };
	function _f2Size(o) { return _f2Coords(o.width, o.height); };
	function _f2Matrix(a, b, x, y) { return _f2Coords(a, b) + " " + _f2Coords(x, y); };
	function _line(a, b, x, y) { return _f2Coords(a, b) + " m " + _f2Coords(x, y) + " l"; };
	function _lineTop(e) { return _line(e.left, e.top - 2, e.right, e.top - 2); };
	function _lineLeft(e) { return _line(e.left, e.top, e.left, e.bottom); };
	function _lineBottom(e) { return _line(e.left, e.bottom, e.right, e.bottom); };
	function _lineRight(e) { return _line(e.right, e.top, e.right, e.bottom); };
	function _rect(x, y, w, h) { return _f2Coords(x, y) + " " + _f2Coords(w, h) + " re"; };
	function _rectElem(e) { return _rect(e.left, e.bottom, e.width, e.height); };
	function _hasColor(c) { return (c != "transparent") && (c != "rgba(0, 0, 0, 0)") && (c != "rgb(0, 0, 0)"); };
	function _color(r, g, b) { return _f2(r / 255) + " " + _f2(g / 255) + " " + _f2(b / 255) + " rg"; };
	function _arrColor(rgb) { return rgb && _color(+rgb[0], +rgb[1], +rgb[2]); };
	function _rgbColor(rgb) { return _arrColor(rgb.split(/\D+/).slice(1)); };
	function _pdfColor(color) { return _hasColor(color) && _rgbColor(color); };
	function _cssColor(elem, css) { return _pdfColor($(elem).css(css)); };
	function _gray(g) { return _f2(g / 255) + " g"; };

	function _style(elem, offset) {
		var color = $(elem).css("background-color"); //1.- bg color
		_hasColor(color) && stream.push(_rgbColor(color), _rectElem(offset), "f");
		var bg = $(elem).css("background-image");
		if (bg && (bg != "none")) {
			var img = new Image();
			img.src = bg.match(/url\(["|']?([^"']*)["|']?\)/)[1];
			_img(null, img, offset);
		}
		var border = _fStyle(elem, "border");
		color = (_cssColor(elem, "border-color") || _gray(0)).toUpperCase();
		if (elem.nodeName == "HR")
			stream.push(_f2(border) + " w", color.toLowerCase(), _rectElem(offset), "f");
		else
			border && stream.push(_f2(border) + " w", color, _rectElem(offset), "S");
		var aux = border ? 0 : _fStyle(elem, "border-top");
		aux && stream.push(_f2(aux) + " w", color, _lineTop(offset), "S");
		aux = border ? 0 : _fStyle(elem, "border-left");
		aux && stream.push(_f2(aux) + " w", color, _lineLeft(offset), "S");
		aux = border ? 0 : _fStyle(elem, "border-bottom");
		aux && stream.push(_f2(aux) + " w", color, _lineBottom(offset), "S");
		aux = border ? 0 : _fStyle(elem, "border-right");
		aux && stream.push(_f2(aux) + " w", color, _lineRight(offset), "S");
		return elem;
	};

	function _text(page, elem, text) {
		var owner = (elem.nodeType == 3) ? elem.parentNode : elem;
		var size = _fStyle(owner, "font-size") || opts.fontSize;
		var fonts = $(owner).css("font-family").split().map(function(font) {
			var css = ($(owner).css("font-weight") == "bold") ? "Bold" : "";
			css += ($(owner).css("font-style") != "normal") ? _ucfirst($(owner).css("font-style")) : "";
			return font.replace(/\W+/g, "") + css;
		});
		var fRef = _index(FONTS.findIndex(f => (fonts.indexOf(f) > -1)));
		var pdfColor = _cssColor(owner, "color") || _gray(0);
		var decoration = $(owner).css("text-decoration") + " ";
		decoration += $(owner.parentNode).css("text-decoration");

		text = (text || elem.data).trim() + " ";
		text = text.replace(/:([\w\.]+);/g, (txt, key) => (page[key] || txt));
		var child1 = $("<div><span>" + text.replace(/\s+/g, "</span> <span>") + "</span></div>");
		owner.replaceChild(child1[0], elem);
		var lines = {}; //rows container by top position
		$("span", child1).each(function() {
			var top = this.offsetTop; //calc top distance
			lines[top] = (lines[top] ? lines[top] + " " : "") + this.innerText;
		});
		var rows = Object.keys(lines).map(k => lines[k].trim()).filter(r => r);
		var child2 = $("<div>" + rows.map(row => "<span>" + row + "</span>").join(" ") + "</div>");
		owner.replaceChild(child2[0], child1[0]);
		$("span", child2).each(function(i, e) {
			var offset = _offset(page, e, size);
			stream.push("BT", "/f" + fRef, size + " Tf", pdfColor, _f2Elem(offset) + " Td", "(" + rows[i] + ") Tj", "ET");
			(decoration.indexOf("overline") > -1) && stream.push("1 w", _lineTop(offset), "S");
			(decoration.indexOf("underline") > -1) && (offset.bottom--) && stream.push("1 w", _lineBottom(offset), "S");
			(decoration.indexOf("line-through") > -1) && (offset.bottom += 5) && stream.push("1 w", _lineBottom(offset), "S");
		});
		$(child2).replaceWith(text);
		return text;
	};

	function _img(page, elem, offset) {
		var i = sources.indexOf(elem.src);
		if (i > -1) //img ya insertada en el fichero
			return stream.push("q", _f2Matrix(elem.width, 0, 0, elem.height) + " " + _f2Elem(offset) + " cm",
								"/i" + i + " Do", "Q");

		canvas.width = elem.width; //set the image width to the canvas
		canvas.height = elem.height; //set the image height to the canvas
		ctx.drawImage(elem, 0, 0); //copy the image contents to the canvas

		try {
			//change non-opaque pixels to white (deafult black)
			var imgData = ctx.getImageData(0, 0, elem.width, elem.height);
			var data = imgData.data;
			for (i = 0; i < data.length; i += 4) {
				if (data[i + 3] < 255) { //transparent pixel
					data[i] = 255 - data[i];
					data[i + 1] = 255 - data[i + 1];
					data[i + 2] = 255 - data[i + 2];
					data[i + 3] = 255 - data[i + 3];
				}
			}
			ctx.putImageData(imgData, 0, 0);
			var jpgBin = atob(canvas.toDataURL("image/jpeg").replace(/^data:image\/([\w]+);base64,/, ""));
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		} catch(e) {
			return _text(page, elem, e.toString());
		}

		i = sources.length;
		sources.push(elem.src);
		images.push(++objects);
		stream.push("q", _f2Matrix(elem.width, 0, 0, elem.height) + " " + _f2Elem(offset) + " cm",
					"/i" + i + " Do", "Q");

		return _streaming(objects, [
			"/Type /XObject", "/Subtype /Image",
			"/ColorSpace /DeviceRGB", //"/Colors 3",
			"/BitsPerComponent 8", "/Filter /DCTDecode",
			"/Width " + elem.width,
			"/Height " + elem.height,
			"/Length " + jpgBin.length
		], [jpgBin]);
	};

	function _svg(page, elem, offset) {
		var img = new Image();
		var xml = (new XMLSerializer()).serializeToString(elem);
		img.src = "data:image/svg+xml;base64," + btoa(xml);
		return _img(page, img, offset);
	};

	function _each(node, fn) {
		var i = 0;
		function _it(node) {
			var child = node.firstChild;
			while (child) {
				var aux = child.nextSibling;
				if (fn(child, i++) && _it(child))
					child = child.nextSibling || aux;
				else
					return false;
			}
			return node;
		}
		return _it(node) || node;
	};

	return {
		parse: function() {
			root.childNodes.forEach(function(elem) { (elem.nodeType != 1) && $(elem).remove(); });
			_each(root, e => (((e.nodeType == 1) && (e.style.display != "none") && (e.style.visibility != "hidden"))
								|| (e.nodeType == 3) || $(e).remove())); //filter visible elements and texts objects
			root.childNodes.forEach(function(page) {
				pages.push(page); //page to write in output
				//calc de format page and recalcule lengths
				var classes = page.className.split(/\s+/);
				var i = $(page).hasClass("landscape") ? 1 : 0;
				var dim = Object.keys(FORMATS).find(n => (classes.indexOf(n) > -1));
				dim = FORMATS[dim] || FORMATS[opts.pageFormat]; //default = a4
				//set page dimensions
				page.width = dim[i++];
				page.height = dim[i % 2];
				//update html and css page view
				var w = page.width - _fStyle(page, "paddingLeft") - _fStyle(page, "paddingRight");
				w -= _fStyle(page, "borderLeftWidth") - _fStyle(page, "borderRightWidth");
				var h = page.height - _fStyle(page, "paddingTop") - _fStyle(page, "paddingBottom");
				h -= _fStyle(page, "borderTopWidth") - _fStyle(page, "borderBottomWidth");
				$(page).css("width", w).css("maxWidth", w).css("height", h).css("maxHeight", h);
				var offset = $(page).offset(); //page position relative to document
				page.left = offset.left; //set the relative offset left page
				page.bottom = offset.top + page.height; //offset bottom page
				//page.right = offset.left + page.width; //offset right page

				var elements = [];
				w = _fStyle(page, "paddingBottom");
				_each(page, function(e, i) {
					offset = _offset(page, e);
					if ((e.nodeType == 3) || (offset.bottom >= w) || (offset.height > h) || ($(e).css("position") == "absolute"))
						return e;
					if (elements.length)
						return $(e).remove();
					var newPage = root.insertBefore(page.cloneNode(true), page.nextSibling);
					_each(newPage, (e, j) => ((j < i) && ((e.nodeType == 3) || (e.clientHeight > h) || elements.push(e))));
					elements.forEach(e => (($(e).css("position") == "absolute") || $(e).closest("thead").length || $(e).remove()));
					return $(e).remove();
				});
			});
			return this;
		},

		render: function() {
			var date = new Date(); //timestamp
			var idRoot = ++objects; //root id = 1
			var idInfo = ++objects; //id for info element
			var idPages = ++objects; //id for pages element
			var idResource = ++objects; //id for resource element

			//put PDF header, body and footer contents
			_out("%PDF-" + (root.getAttribute("pdf") || "1.5"));
			_out("%ÐÔÅØ" /*+ Math.random().toString(36).substr(2, 4)*/);
			_pdf(idInfo, [
				"/Title (" + ($(root).attr("title") || "DOM-PDF") + ")",
				"/Producer (" + ($(root).attr("producer") || "") + ")",
				"/CreationDate (D:" + date.getFullYear() + date.getMonth() + date.getDate()
									+ date.getHours() + date.getMinutes() + date.getSeconds() + ")"
			]);

			var _arrPagesIds = pages.map(function(page, i) {
				page.number = i + 1;
				page.total = pages.length;
				_each(page, function(e) {
					var offset = _offset(page, e); //recalcule final offset
					(e.nodeType == 3) ? _text(page, e) //text object doesn't have offset
						: (e.nodeName == "IMG") ? _img(page, _style(e, offset), offset)
						: (e.nodeName == "svg") ? _svg(page, _style(e, offset), offset)
						: _style(e, offset); //DOM element style
					return true;
				});

				var aux = _size(stream) + stream.length - 1; //calc. stream length
				var idContents = _streaming(++objects, ["/Length " + aux]); //put stream
				stream.splice(0, stream.length - 1); //clear page stream and free memory

				return _pdf(++objects, [
					"/Type /Page",
					"/Parent " + _ref(idPages),
					"/Resources " + _ref(idResource),
					"/MediaBox [0 0 " + _f2Size(page) + "]",
					"/Contents " + _ref(idContents)
				]);
			});

			_pdf(idPages, [
				"/Type /Pages",
				"/MediaBox [0 0 " + FORMATS[opts.pageFormat].join(" ") + "]",
				"/Kids [" + _arrPagesIds.map(_ref).join(" ")  + "]",
				"/Count " + pages.length
			]);

			var fonts = FONTS.map(function(family) {
				return _pdf(++objects, [
					"/Type /Font",
					"/Subtype /Type1",
					"/BaseFont /" + family,
					"/Encoding /WinAnsiEncoding"
				]);
			});

			_pdf(idRoot, ["/Type /Catalog", "/Pages " + _ref(idPages), "/PageLayout /OneColumn"]);
			_element(idResource); _out(OPEN); //resource element
			_out("/ProcSet [/PDF /Text /ImageB /ImageC /ImageI]");
			_named("/Font", fonts.map((id, i) => ("/f" + i + " " + _ref(id))));
			_named("/XObject", images.map((id, i) => ("/i" + i + " " + _ref(id))));
			_out(CLOSE);
			_close();

			//add the footer elements into pdf document structure
			_put("xref"); _put("0 " + (++objects), "0000000000 65535 f");
			offsets.forEach(i => _put(_lpad(i.toString(), 10) + " 00000 n"));
			_putArray([
				"trailer", OPEN,
				"/Size " + objects,
				"/Root " + _ref(idRoot),
				"/Info " + _ref(idInfo),
				CLOSE, "startxref", length, "%%EOF"
			]);
			return this;
		},

		fetch: function(type) {
			var output = contents.join("\n");
			var b64Head = "data:application/pdf;base64,";
			type = (type || "datauristring").toLowerCase();
			if ((type == "datauri") || (type == "dataurl") || (type == "newwindow"))
				return document.location.href = b64Head + btoa(output);
			if ((type == "datauristring") || (type == "dataurlstring") || (type == "base64"))
				return b64Head + btoa(output);
			return output;
		}
	};
};
