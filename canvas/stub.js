//#module main
//#include "bin/Terminal.js"
//#include "bin/Core.js"

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

