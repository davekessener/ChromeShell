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

