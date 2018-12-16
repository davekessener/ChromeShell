var Memory = (function () {
	function get(i) {
		if (i < 0 || i >= this._count * this._pagesize) {
			throw "ERR: out of bounds! " + i;
		}

		var b = this._buf[i /= this._pagesize];

		if (b === undefined) {
			this._buf[i] = (b = new Page(this._pagesize));
		}

		return b;
	}

	function adjust(i, f) {
		return this._p - (i + 1) * f;
	}

	function write(m, f, i, v) {
		var b = get(i = adjust(i, f));

		b[m][i % this._pagesize] = v;
	}

	function read(m, i) {
		var b = get(i = adjust(i, f));

		return b[m][i % this._pagesize];
	}

	function Memory(s, n) {
		this._pagesize = s;
		this._count = (n || 1);
		this._buf = [];
		this._p = 0;

		this.u8  = { set: bind(this, write,  'u8', 1), get: bind(this, read,  'u8', 1) };
		this.i32 = { set: bind(this, write, 'i32', 4), get: bind(this, read, 'i32', 4) };
		this.f32 = { set: bind(this, write, 'f32', 4), get: bind(this, read, 'f32', 4) };
	}

	Memory.prototype.reserve = function (n) {
		this._p += n;
	}

	Memory.prototype.release = function (n) {
		this._p -= n;
	}

	return Memory;
})();

