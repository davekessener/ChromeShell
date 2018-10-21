function bind(self, f) {
	return function(a) { f.apply(self, arguments); };
};

var Cursor = (function ( ) {
	function Cursor(w, h, f, cb) {
		this._x = 0;
		this._y = 0;
		this._width = w;
		this._height = h;
		this._period = f;
		this._callback = cb;
		this._active = false;

		tick.call(this);
	}

	Cursor.prototype.advance = function ( ) {
		this._x += 1;

		if(this._x == this._width) {
			this._x = 0;
			this._y += 1;
		}

		if(this._y == this._height) {
			this._y = 0;
			
			if(this._callback) {
				this._callback();
			}
		}
	};

	Cursor.prototype.toggle = function ( ) {
		this._active = !this._active;
	};

	Cursor.prototype.x = function ( ) { return this._x; }
	Cursor.prototype.y = function ( ) { return this._y; }
	Cursor.prototype.active = function ( ) { return this._active; }

	function tick( ) {
		this.toggle();

		setTimeout(bind(this, tick), this._period);
	}

	return Cursor;
})();

var Screen = (function () {
	function Screen(w, h) {
		var l = w * h;
		var b = new ArrayBuffer(l * 2);

		this._width = w;
		this._height = h;
		this._buffer = [
			new Uint8ClampedArray(b, 0, l),
			new Uint8ClampedArray(b, l, l)
		];
		this._active = 0;
	}

	Screen.prototype.set = function (x, y, c) {
		this._buffer[this._active][x + y * this._width] = c;
	};

	Screen.prototype.get = function (x, y) {
		return this._buffer[this._active][x + y * this._width];
	};

	Screen.prototype.update = function (cb) {
		var a = this._buffer[this._active];

		this._active = (this._active + 1) % 2;

		var b = this._buffer[this._active];

		for(var y = 0 ; y < this._height ; y += 1) {
			for(var x = 0 ; x < this._width ; x += 1) {
				var i = x + y * this._width;

				if(a[i] != b[i]) {
					b[i] = a[i];

					if(cb) {
						cb(a[i], x, y);
					}
				}
			}
		}
	};

	return Screen;
})();

var Terminal = (function () {
	function Terminal(canvas, size, f) {
		this._ctx = canvas.getContext('2d');
		this._color = ['#00FF00', 'black'];
		this._period = 50;
		
		canvas.width  = window.innerWidth;
		canvas.height = window.innerHeight;

		this._charsize = {
			width:  Math.floor(size / 2 + 1),
			height: Math.floor(size * 5 / 4)
		};

		this._dim = {
			width:  Math.floor(canvas.width  / this._charsize.width ),
			height: Math.floor(canvas.height / this._charsize.height)
		};

		this._cursor = new Cursor(this._dim.width, this._dim.height, f, bind(this, this.scroll));
		this._screen = new Screen(this._dim.width, this._dim.height);
		this._last = { drawn: false, x: 0, y: 0 }

		this._ctx.font = 'bold ' + size + 'px Monospace';
		this._ctx.textBaseline = 'top';

		this._ctx.fillStyle = 'black';
		this._ctx.fillRect(0, 0, canvas.width, canvas.height);

		tick.call(this);
	}

	Terminal.prototype.put = function (c, i) {
		this._screen.set(this._cursor.x(), this._cursor.y(), c.charCodeAt(0) + (i ? 128 : 0));
		this._cursor.advance();
		this._dirty = true;
	};

	Terminal.prototype.puts = function (s, h) {
		for(var i = 0 ; i < s.length ; i += 1) {
			this.put(s[i], h);
		}
	};

	function update( ) {
		this._checkedCursor = !this._cursor.active();

		if(this._last.drawn) {
			if(!this._cursor.active() ||
				this._last.x != this._cursor.x() ||
				this._last.y != this._cursor.y())
			{
				renderAt.call(this, this._last.x, this._last.y);
			}
		}

		if(this._dirty) {
			this._screen.update(bind(this, renderChar));

			this.dirty_ = false;
		}

		if(!this._checkedCursor) {
			renderAt.call(this, this._cursor.x(), this._cursor.y());
		}

		this._last.drawn = this._cursor.active();
		this._last.x = this._cursor.x();
		this._last.y = this._cursor.y();
	}

	function render(c, i, x, y) {
		var cw = this._charsize.width, ch = this._charsize.height;

		this._ctx.fillStyle = this._color[i ? 0 : 1];
		this._ctx.fillRect(x * cw, y * ch, cw, ch);
		this._ctx.fillStyle = this._color[i ? 1 : 0];
		this._ctx.fillText(c[0], x * cw, y * ch);
	}

	function renderChar(c, x, y) {
		var s = String.fromCharCode(c % 128);
		var i = c >= 128;

		if(this._cursor.active() && x == this._cursor.x() && y == this._cursor.y()) {
			this._checkedCursor = true;
			i = !i;
		}

		render.call(this, s, i, x, y);
	}

	function renderAt(x, y) {
		renderChar.call(this, this._screen.get(x, y), x, y);
	}

	function tick( ) {
		update.call(this);

		setTimeout(bind(this, tick), this._period);
	}

	return Terminal;
})();

(function ($) {
	$(function () {
		var term = new Terminal(document.getElementById("terminal"), 16, 750);

		term.puts("Hello, World!");
	});
})(jQuery);

