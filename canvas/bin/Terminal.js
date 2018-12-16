//#include "bin/utils.js"
//#include "bin/Cursor.js"
//#include "bin/Screen.js"

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
		this._last = { drawn: false, x: 0, y: 0 };

		this._ctx.font = 'bold ' + size + 'px Monospace';
		this._ctx.textBaseline = 'top';

		this._ctx.fillStyle = 'black';
		this._ctx.fillRect(0, 0, canvas.width, canvas.height);

		setInterval(bind(this, update), this._period);
	}

	var kc = {
		START_TEXT: 2,
		END_TEXT: 3,
		END_OF_LINE: 12,
		CR: 13,
		LEFT: 17,
		RIGHT: 18,
		UP: 19,
		DOWN: 20,
		ESCAPE: 27
	};

	Terminal.KeyCodes = kc;

	Terminal.prototype.put = function (c, i) {
		if (c < 32) {
			if (c == 0) {
			} else if (c == kc.ESCAPE) {
				console.log('Initiated escape sequence. Not supported!');
			} else if (c == kc.LEFT) {
				this._cursor.move(-1, 0);
			} else if (c == kc.RIGHT) {
				this._cursor.move(1, 0);
			} else if (c == kc.UP) {
				this._cursor.move(0, -1);
			} else if (c == kc.DOWN) {
				this._cursor.move(0, 1);
			} else if (c == kc.START_TEXT) {
				this._cursor.x(0);
				this._cursor.y(0);
			} else if (c == kc.END_TEXT) {
				this._cursor.x(this._dim.width - 1);
				this._cursor.y(this._dim.height - 1);
			} else if (c == kc.CR) {
				this._cursor.x(0);
			} else if (c == kc.END_OF_LINE) {
				this._cursor.x(this._dim.width - 1);
			}
		} else {
			this._screen.set(this._cursor.x(), this._cursor.y(), c + (i ? 128 : 0));
			this._cursor.advance();
		}

		this._dirty = true;
	};

	Terminal.prototype.puts = function (s, h) {
		for(var i = 0 ; i < s.length ; i += 1) {
			this.put(s.charCodeAt(i), h);
		}
	};

	Terminal.prototype.cursor = function () { return this._cursor; };

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

	return Terminal;
})();

