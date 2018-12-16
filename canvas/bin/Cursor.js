//#include "bin/utils.js"

var Cursor = (function ( ) {
	function Cursor(w, h, f, cb) {
		this._x = 0;
		this._y = 0;
		this._width = w;
		this._height = h;
		this._period = f;
		this._callback = cb;
		this._active = true;

		setInterval(bind(this, this.toggle), this._period);
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

	Cursor.prototype.move = function (dx, dy) {
		this.x(this._x + dx);
		this.y(this._y + dy);
	};

	Cursor.prototype.x = function (x)
	{
		var o = this._x;

		if (x !== undefined) {
			this._x = clamp(Math.floor(x), 0, this._width - 1);
		}

		return o;
	};

	Cursor.prototype.y = function (y)
	{
		var o = this._y;

		if (y !== undefined) {
			this._y = clamp(Math.floor(y), 0, this._height - 1);
		}

		return o;
	};

	Cursor.prototype.active = function ( ) { return this._active; };

	return Cursor;
})();

