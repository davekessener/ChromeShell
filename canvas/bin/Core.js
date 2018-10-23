/***
#include bin/Stack.js
#include bin/Memory.js
#include bin/Instructions.js
***/

var Core = (function () {
	function Core( ) {
		this._stack = new Stack();
		this._mem = new Memory.Block(0x10000);
		this._local = new Memory.Local();
		this._calls = [];
		this._running = true;
	}

	var ins = Instructions;

	Core.Instructions = {}
	for(var i = 0 ; i < ins.length ; ++i) {
		Core.Instructions[ins[i].name] = i;
	}

	Core.prototype.running = function () { return this._running; }

	Core.prototype.tick = function () {
		if (this._running) {
			var a = this._mem.position();
			var i = this._mem.next();

			if(i >= ins.length) {
				console.log("ERR: Invalid instruction @$" + hex(a,2) + ": " + i);
				this._running = false;
			} else {
				var r = ins[i].call(this);

				console.log("@$" + hex(a,2) + " (" + ("" + i).padStart(2,' ') + "): " + r);
			}
		}
	};

	Core.prototype.write = function (a, b, o, l) {
		if (o === undefined) { o = 0; }
		if (l === undefined) { l = b.length; }

		for (var i = 0 ; i < l ; i += 1) {
			this._mem._mem[(a + i) % this._mem._cap] = b[o + i];
		}
	};

	return Core;
})();

