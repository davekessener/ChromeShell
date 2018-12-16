if (typeof window.Dave === 'undefined') {
	window.Dave = {};
}

window.Dave.Proxy = (function ($) {
	function InProxy(c, a) {
		var self = this;

		self._proxy = {};
		self._connection = c;
		self._idx = 0;
		self._pending = {};

		c.onMessage.addListener(function (msg) {
			if (msg.answer !== undefined) {
				var p = self._pending[msg.id];
				
				self._pending[msg.id] = undefined;
				
				p(msg.answer);
			}
		});

		a.forEach(function (m) {
			self._proxy[m] = function () {
				var id = self._idx;
				var p = new Promise(function (resolve, reject) {
					self._pending[id] = resolve;
				});

				self._idx++;

				self._connection.postMessage({
					"action" : m,
					"args" : Array.from(arguments),
					"id" : id
				});

				return p;
			};
		});

		self.proxy = self._proxy;
	}

	function OutProxy(c, o, a) {
		c.onMessage.addListener(function (msg) {
			var r = a[msg.action].apply(o, msg.args);

			c.postMessage({"answer" : r, "id" : msg.id});
		});
	}

	return {"Import" : InProxy, "Export" : OutProxy};
})(jQuery);

