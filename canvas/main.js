// JS Module main


// BEGIN stub.js


// BEGIN bin/Terminal.js


// BEGIN bin/utils.js

function bind(self, f) {
	var a = Array.from(arguments).slice(2);
	return function () { return f.apply(self, a.concat(Array.from(arguments))); };
}

function clamp(v, min, max) {
	return Math.min(Math.max(min, v), max);
}

function hex(v, w) {
	return v.toString(16).padStart(w * 2, '0');
}

if (!Array.prototype.last) {
	Array.prototype.last = function () {
		return this[this.length - 1];
	};
}


// END bin/utils.js


// BEGIN bin/Cursor.js


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


// END bin/Cursor.js


// BEGIN bin/Screen.js

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


// END bin/Screen.js


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


// END bin/Terminal.js


// BEGIN bin/Core.js


// BEGIN bin/Stack.js


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

	Buf.prototype.empty = function () { return this._idx == 0; };
	Buf.prototype.full = function () { return this._idx >= this._cap; };

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


// END bin/Stack.js


// BEGIN bin/Memory.js

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


// END bin/Memory.js


// BEGIN bin/Instructions.js

var Instructions = (function () {
	function doCall(a) {
		this._calls.push(this._local.create(this._mem.position()));
		this._mem.jump(a);
	}

	function doReturn( ) {
		this._mem.jump(this._calls.pop().release());
	}

	return [
		function halt( ) {
			this._running = false;

			return ("halt");
		},
	
		function drop( ) {
			this._stack.i32.pop();
	
			return ("drop");
		},
	
		function fun( ) {
			var n = this._mem.next();
	
			this._cur = this._calls.last().allocate(n);
	
			return ("fun (" + n + ")");
		},
	
		function call( ) {
			var a = this._mem.next16();
	
			doCall.call(this, a);
	
			return ("call $" + hex(a, 2));
		},
	
		function c_call( ) {
			var a = this._mem.next16();
			var c = this._stack.i32.pop();
	
			if (c !== 0) {
				doCall.call(this, a);
			}
	
			return ("call? $" + hex(a, 2) + " [" + (c === 0 ? 'N' : 'Y') + "]");
		},
	
		function ret( ) {
			doReturn.call(this);

			return ("ret");
		},
	
		function jmp( ) {
			var a = this._mem.next16();
	
			this._mem.jump(a);
	
			return ("jmp $" + hex(a, 2));
		},
	
		function c_jmp( ) {
			var a = this._mem.next16();
			var c = this._stack.i32.pop();
	
			if (c !== 0) {
				this._mem.jump(a);
			}
	
			return ("jmp? $" + hex(a, 2) + " [" + (c === 0 ? 'N' : 'Y') + "]");
		},
	
		function i32_eq( ) {
			var a = this._stack.i32.pop();
			var b = this._stack.i32.pop();
	
			this._stack.i32.push(a === b ? 1 : 0);
	
			return ("i32.eq [0x" + hex(a,4) + " == 0x" + hex(b,4) + "]");
		},
	
		function i32_ne( ) {
			var a = this._stack.i32.pop();
			var b = this._stack.i32.pop();
	
			this._stack.i32.push(a !== b ? 1 : 0);
	
			return ("i32.ne [0x" + hex(a,4) + " != 0x" + hex(b,4) + "]");
		},
	
		function i32_lt( ) {
			var a = this._stack.i32.pop();
			var b = this._stack.i32.pop();
	
			this._stack.i32.push(a < b ? 1 : 0);
	
			return ("i32.lt [0x" + hex(a,4) + " < 0x" + hex(b,4) + "]");
		},
	
		function i32_lte( ) {
			var a = this._stack.i32.pop();
			var b = this._stack.i32.pop();
	
			this._stack.i32.push(a <= b ? 1 : 0);
	
			return ("i32.lte [0x" + hex(a,4) + " <= 0x" + hex(b,4) + "]");
		},
	
		function i32_gt( ) {
			var a = this._stack.i32.pop();
			var b = this._stack.i32.pop();
	
			this._stack.i32.push(a > b ? 1 : 0);
	
			return ("i32.gt [0x" + hex(a,4) + " > 0x" + hex(b,4) + "]");
		},
	
		function i32_gte( ) {
			var a = this._stack.i32.pop();
			var b = this._stack.i32.pop();
	
			this._stack.i32.push(a >= b ? 1 : 0);
	
			return ("i32.gte [0x" + hex(a,4) + " >= 0x" + hex(b,4) + "]");
		},
	
		function i32_and( ) {
			var a = this._stack.i32.pop();
			var b = this._stack.i32.pop();
	
			this._stack.i32.push(a & b);
	
			return ("i32.and [0x" + hex(a,4) + " & 0x" + hex(b,4) + "]");
		},
	
		function i32_or( ) {
			var a = this._stack.i32.pop();
			var b = this._stack.i32.pop();
	
			this._stack.i32.push(a | b);
	
			return ("i32.or [0x" + hex(a,4) + " | 0x" + hex(b,4) + "]");
		},
	
		function i32_xor( ) {
			var a = this._stack.i32.pop();
			var b = this._stack.i32.pop();
	
			this._stack.i32.push(a ^ b);
	
			return ("i32.xor [0x" + hex(a,4) + " ^ 0x" + hex(b,4) + "]");
		},
	
		function i32_not( ) {
			var a = this._stack.i32.pop();
	
			this._stack.i32.push(~a);
	
			return ("i32.not [~0x" + hex(a,4) + "]");
		},
	
		function loc_i32_store( ) {
			var i = this._mem.next();
			var v = this._stack.i32.pop();
	
			this._cur.i32.store(i, v);
	
			return ("local.i32.store " + i + " [0x" + hex(v, 4) + "]");
		},
	
		function loc_i32_load( ) {
			var i = this._mem.next();
			var v = this._cur.i32.load(i);
	
			this._stack.i32.push(v);
	
			return ("local.i32.load " + i + " [0x" + hex(v, 4) + "]");
		},
	
		function i32_const( ) {
			var v = this._mem.next32();
	
			this._stack.i32.push(v);
	
			return ("i32.push 0x" + hex(v,4) + " (" + v + ")");
		},
	
		function i32_dup( ) {
			var v = this._stack.i32.pop();
	
			this._stack.i32.push(v);
			this._stack.i32.push(v);
	
			return ("i32.dup [0x" + hex(v,4) + " (" + v + ")]");
		},
	
		function i32_add( ) {
			var a = this._stack.i32.pop();
			var b = this._stack.i32.pop();
	
			this._stack.i32.push(a + b);
	
			return ("i32.add [0x" + hex(a,4) + " + 0x" + hex(b,4) + "]");
		},
	
		function i32_mul( ) {
			var a = this._stack.i32.pop();
			var b = this._stack.i32.pop();
	
			this._stack.i32.push(a * b);
	
			return ("i32.mul [0x" + hex(a,4) + " * 0x" + hex(b,4) + "]");
		},
	
		function i32_inc( ) {
			var v = this._stack.i32.pop();
	
			this._stack.i32.push(v + 1);
	
			return ("i32.inc [0x" + hex(v,4) + " (" + v + ")]");
		},
	
		function i32_dec( ) {
			var v = this._stack.i32.pop();
	
			this._stack.i32.push(v - 1);
	
			return ("i32.dec [0x" + hex(v,4) + " (" + v + ")]");
		}
	];
})();


// END bin/Instructions.js


var Core = (function () {
	function Core( ) {
		this._stack = new Stack();
		this._mem = new Memory.Block(0x10000);
		this._local = new Memory.Local();
		this._calls = [];
		this._running = true;
	}

	var ins = Instructions;

	Core.Instructions = {};
	for(var i = 0 ; i < ins.length ; ++i) {
		Core.Instructions[ins[i].name] = i;
	}

	Core.prototype.running = function () { return this._running; };

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


// END bin/Core.js


(function ($) {
	$(function () {
		var term = new Terminal(document.getElementById("terminal"), 16, 750);
		var core = new Core();

		term.puts("Hello, World!");

		var _ = Core.Instructions;

/*
	(defun $factorial
		((i32 $n))  -- $n == 0
		()
		(-- i32
		:start -- $0000
			(fun 1)
			(i32.dup)
			(loc.i32.store $n)
		:loop  -- $0005
			(loc.i32.load $n)
			(i32.dec)
			(i32.dup)
			(i32.dup)
			(i32.const #1)
			(i32.eq)
			(jmp? :done)
			(loc.i32.store $n)
			(i32.mul)
			(jmp :loop)
		:done  -- $0013
			(drop)
			(ret)
			   -- $0015
		)
	)
*/

		core.write(0, [
			_.i32_const,     0x05, 0x00, 0x00, 0x00,
			_.call,          0x09, 0x00,
			_.halt,

			// start -- $0009
			_.fun,           0x01, 
			_.i32_dup,
			_.loc_i32_store, 0x00,
			// loop  -- $000E
			_.loc_i32_load,  0x00,
			_.i32_dec,
			_.i32_dup,
			_.i32_dup,
			_.i32_const,     0x01, 0x00, 0x00, 0x00,
			_.i32_eq,
			_.c_jmp,         0x22, 0x00,
			_.loc_i32_store, 0x00,
			_.i32_mul,
			_.jmp,           0x0E, 0x00,
			// done  -- $0022
			_.drop,
			_.drop,
			_.ret,
			_.halt
		]);

		for(var i = 0 ; i < 5000 && core.running() ; i += 1) {
			core.tick();
		}

		console.log("" + core._stack.i32.pop());

		setInterval(function () {
			term.put(Terminal.KeyCodes.LEFT);
		}, 1000);
	});
})(jQuery);


// END stub.js

