var Code = (function () {
	function View(c) {
		this._code = c;
		this._p = 0;
	}

	View.prototype.position = function () {
		return this._p;
	};

	View.prototype.remaining = function () {
		return this._code.length - this._p;
	};

	View.prototype.next = function () {
		if (this.remaining() === 0) {
			throw "ERR: Instruction buffer empty!"
		}

		return this._code[(this._p += 1) - 1];
	};

	View.prototype.next16 = function () {
		var v = this.next();
		return (v | (this.next() << 8));
	};

	View.prototype.next32 = function () {
		var v = this.next16();
		return (v | (this.next16() << 16));
	};

	function Code(v) {
		this._code = new Uint8Array(v);
	}

	Code.prototype.activate = function () {
		return new View(this._code);
	};

	return Code;
})();

