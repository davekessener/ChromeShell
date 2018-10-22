/***
#include bin/utils.js
***/

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

