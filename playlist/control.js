if (typeof window.Dave === 'undefined') {
	window.Dave = {};
}

window.Dave.Player = (function ($) {
	function glyphicon(id) {
		return '<span class="glyphicon glyphicon-' + id + '"></span>';
	}

	function button(type, glyph) {
		return '<button class="btn btn-primary ' + type + '-button">' + glyphicon(glyph || type) + '</button>';
	}

	function Player(id) {
		var self = this;

		self._elem = $(id);
		self._values = {};

		self._elem.addClass('dave-player');

		self._buttons = {
			"previous"	: $(button('previous', 'step-backward')),
			"play"		: $(button('play')),
			"pause"		: $(button('pause')),
			"stop"		: $(button('stop')),
			"next"		: $(button('next', 'step-forward')),
			"add"		: $(button('add', 'plus'))
		};

		Object.keys(self._buttons).forEach(function (btn) {
			self._elem.append(self._buttons[btn]);
			self._buttons[btn].on('click', function () {
				var f = self['on_' + btn];

				if (f) {
					f();
				}
			});
		});

		self._buttons.pause.hide();
		self.enableAdd(false);
	}

	Player.prototype.enableAdd = function (v) {
		if (v) {
			this._buttons.add.prop('disabled', false);
		} else {
			this._buttons.add.prop('disabled', true);
		}
	};

	Player.prototype.addToggleButton = function (id, icon, f, d) {
		var self = this;
		var b = $(button(id, icon));

		self._values[id] = d;
		self._buttons[id] = b;
		self._elem.append(b);

		function toggle(x, y) {
			b.removeClass('btn-' + x);
			b.addClass('btn-' + y);
		}

		function enable( ) {
			toggle('default', 'primary');
		}

		function disable( ) {
			toggle('primary', 'default');
		}

		if (! d) {
			disable();
		}

		b.on('click', function () {
			if (self._values[id]) {
				disable();
				f(self._values[id] = false);
			} else {
				enable();
				f(self._values[id] = true);
			}
		});
	};

	return Player;
})(jQuery);

