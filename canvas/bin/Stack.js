/***
#include bin/utils.js
***/

var Stack = (function () {
	function Buf(n) {
		this._cap = n;
		this._buf = new ArrayBuffer(n * 4);
		this._idx = 0;

		this._views = [new Int32Array(this._buf), new Float32Array(this._buf)];
	}

	Buf.i32 = 0;
	Buf.f32 = 1;

	Buf.prototype.push = function (v, b) {
//		console.log("PUSH (" + this._idx + "): 0x" + hex(v, 4) + " [" + v + "]");

		this._views[b][this._idx] = v;
		this._idx += 1;
	};

	Buf.prototype.pop = function (b) {
//		console.log("POP (" + this._idx + "): 0x" + hex(this._views[b][this._idx - 1], 4) + " [" + this._views[b][this._idx - 1] + "]");

		this._idx -= 1;
		return this._views[b][this._idx];
	};

	Buf.prototype.empty = function () { return this._idx == 0; }
	Buf.prototype.full = function () { return this._idx >= this._cap; }

	function Stack (n) {
		this._cap = (n || 1024);
		this._buf = [];
		this._idx = 0;
		
		this.i32 = { push: bind(this, push, Buf.i32), pop: bind(this, pop, Buf.i32) };
		this.f32 = { push: bind(this, push, Buf.f32), pop: bind(this, pop, Buf.f32) };
	}

	function push(t, v) {
		var b = this._buf[this._idx];

		if (b === undefined) {
			this._buf.push(b = new Buf(this._cap));
		}

		b.push(v, t);

		if (b.full()) {
			this._idx += 1;
		}
	}

	function pop(t) {
		var b = this._buf[this._idx];

		if (b === undefined) {
			console.log("ERR: trying to pop empty stack!");
		}

		if (b.empty()) {
			b = this._buf[this._idx -= 1];
		}

		return b.pop(t);
	}

	return Stack;
})();

