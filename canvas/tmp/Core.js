var Core = (function () {
	var INS = Instructions;

	function Core(name, l, funs, io, l, g) {
		this._name = name;
		this._priv = l;
		this._funs = funs;
		this._io = io;
		this._local = l;
		this._global = new Page(g);
		this._stack = new Stack();
		this._exec = [];
		this._running = true;
		
		this._exec.push(funs[0].activate(this));
	}

	Core.prototype.running = function () {
		return this._running;
	};

	Core.prototype.tick = function () {
		if (this._running) {
			var c = this._exec.last();
			var a = c._code.position();
			var i = c._code.next();

			if (i >= INS.length) {
				throw ("ERR: invalid op " + i + " @$" + hex(a,2) + " in " + this._name + "!");
			} else {
				var ins = INS[i];

				if (this._priv < ins._priv) {
					throw ("ERR: insufficient priv for " + ins.name() + " in " + this._name + "!");
				} else {
					var r = ins.call(this, c);

					console.log("[" + this._name.padStart(4,' ') + "] @$" + hex(a,2) + ": " + r);
				}
			}

			if (c._code.remaining() == 0) {
				this._exec.pop();

				if (this._exec.length == 0) {
					this._running = false;
				}
			}
		}
	};

	return Core;
})();

