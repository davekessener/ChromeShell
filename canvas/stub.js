/*** main
#include bin/Terminal.js
***/

(function ($) {
	$(function () {
		var term = new Terminal(document.getElementById("terminal"), 16, 750);

		term.puts("Hello, World!");
	});
})(jQuery);

