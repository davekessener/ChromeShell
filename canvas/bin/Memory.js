var Memory = {};

Memory.Block = (function () {
	function Block(n) {
		this._cap = n;
		this._mem = new Uint8Array(new ArrayBuffer(n));
		this._p = 0;
		this._running = true;
	}

	Block.prototype.position = function () {
		return this._p;
	};

	Block.prototype.next = function () {
		var v = this._mem[this._p];
		this._p = (this._p + 1) % this._cap;
		return v;
	};

	Block.prototype.jump = function (p) {
		this._p = (this._cap + p) % this._cap;
	};

	Block.prototype.next16 = function () {
		var v = 0;

		v |= (this.next() << 0);
		v |= (this.next() << 8);

		return v;
	};

	Block.prototype.next32 = function () {
		var v = 0;

		v |= (this.next16() <<  0);
		v |= (this.next16() << 16);

		return v;
	};

	return Block;
})();

Memory.Local = (function () {
	function View(b, o, l) {
		this.i32 = new Int32Array(b, o * 4, l);
		this.f32 = new Float32Array(b, o * 4, l);
		this.u8  = new Uint8Array(b, o * 4, l * 4);

		this._views = [this.i32, this.f32, this.u8];
	}

	View.i32 = 0;
	View.f32 = 1;
	View.u8 = 2;

	View.prototype.view = function (b) {
		return this._views[b];
	};

// # --------------------------------------------------------------------------

	function Buf(n) {
		this._cap = n;
		this._buf = new ArrayBuffer(n * 4);
		this._idx = 0;
	}

	Buf.prototype.remaining = function () {
		return this._cap - this._idx;
	};

	Buf.prototype.lease = function (n) {
		this._idx += n;
		return new View(this._buf, this._idx - n, n);
	};

	Buf.prototype.release = function (n) {
		this._idx -= n;
	};

// # --------------------------------------------------------------------------

	function Part(v) {
		this._buf = v;

		this.i32 = { store: bind(this, store, View.i32), load: bind(this, load, View.i32) };
		this.f32 = { store: bind(this, store, View.f32), load: bind(this, load, View.f32) };
		this.u8  = { store: bind(this, store, View.u8 ), load: bind(this, load, View.u8 ) };
	}

	function store(b, i, v) {
		this._buf.view(b)[i] = v;
	}

	function load(b, i) {
		return this._buf.view(b)[i];
	}

// # --------------------------------------------------------------------------

	function Empty(r, m) {
		this._ret = r;
		this._mem = m;
	}

	Empty.prototype.allocate = function (n) {
		return (this._buf = this._mem.allocate(n));
	};

	Empty.prototype.release = function () {
		if (this._buf !== undefined) {
			this._buf.release();
		}

		return this._ret;
	};

// # --------------------------------------------------------------------------

	function Local(n) {
		this._size = (n || 1024);
		this._buf = [];
		this._idx = 0;
	}

	function deallocate(i, n) {
		var b = this._buf[i];

		b.release(n);

		if (i == this._idx - 1) {
			this._idx = i;
		}
	}

	Local.prototype.create = function (r) {
		return new Empty(r, this);
	};

	Local.prototype.allocate = function (n) {
		var b = this._buf[this._idx];

		if (b === undefined) {
			this._buf.push(b = new Buf(this._size));
		}

		if (b.remaining() < n) {
			this._idx += 1;
			return this.allocate(n);
		}

		var p = new Part(b.lease(n));

		p.release = bind(this, function (i, nn) {
			deallocate.call(this, i, nn);
		}, this._idx, n);

		return p;
	};

	return Local;
})();

