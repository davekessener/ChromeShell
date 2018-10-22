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

