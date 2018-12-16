(function ($) {
	function updateURL(url) {
		if (url.startsWith('https://www.youtube.com/playlist?list=')) {
			var id = url.slice(38);
			var i = id.indexOf('&');

			if (i >= 0) {
				id = id.slice(0, i);
			}

			return id;
		}
	}

	function getCurrentTabURL( ) {
		var cb;
		var p = new Promise(function (resolve, reject) {
			cb = resolve;
		});

		browser.tabs.query({currentWindow: true, active: true}).then(function (tabs) {
			var url = updateURL(tabs[0].url);

			if (url !== undefined) {
				cb(url);
			}
		});

		return p;
	}

	$(function () {
		var actions = ['play', 'pause', 'stop', 'next', 'previous'];
		var remote = new Dave.Proxy.Import(browser.runtime.connect(), actions.concat(['setPlaylist', 'shuffle', 'reset']));
		var player = new Dave.Player('#the-player');

		actions.forEach(function (a) {
			player['on_' + a] = function () {
				remote.proxy[a]();
			};
		});

		player.addToggleButton('shuffle', 'random', function (shuffled) {
			if (shuffled) {
				remote.proxy.shuffle();
			} else {
				remote.proxy.reset();
			}
		});

		getCurrentTabURL().then(function (url) {
			player.on_add = function () {
				player.enableAdd(false);
				remote.proxy.setPlaylist(url);
			};

			player.enableAdd(true);
		});
	});
})(jQuery);

