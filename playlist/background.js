Array.prototype.shuffle = function () {
	var i, j, v;
	for(i = this.length - 1 ; i > 0 ; --i) {
		j = Math.floor(Math.random() * (i + 1));
		v = this[i];
		this[i] = this[j];
		this[j] = v;
	}
};

Array.prototype.remove = function (e) {
	return this.splice(this.indexOf(e), 1)[0];
};

(function ($) {
	var History = (function () {
		function History(n) {
			this._size = (n || 100);
			this._buf = [];

			this.length = 0;
		}

		History.prototype.push = function (e) {
			this._buf.push(e);

			update(this);
		};

		History.prototype.pop = function () {
			if (this._buf.length > 0) {
				var e = this._buf.pop();

				update(this);

				return e;
			}
		};

		function update(self) {
			while (self._buf.length > self._size) {
				self._buf.shift();
			}

			self.length = self._buf.length;
		}

		return History;
	})();

	var Player = (function () {
		function Player(id, cb) {
			var self = this;
	
			self._queue = [];
			self._playlist = [];
			self._history = new History();
			self._titles = {};
			self._random = false;
			self._repeat = false;
			self._loaded = false;

			cb = (cb || (e => {}));
			self._player = new YT.Player(id, {
				width : 640,
				height : 390,
				events : {
					'onReady' : e => cb(e),
					'onStateChange' : e => onStateChanged(self, e)
				}
			});
		}

		Player.prototype.clear = function (id) {
			this._queue = [];
			this._playlist = [];
			this._current = undefined;
			this._history = new History();
			this.stop();
		};

		Player.prototype.add = function (id) {
			this._playlist.push(id);
		};
	
		Player.prototype.setVideo = function (id) {
			this._player.loadVideoById(id);
			this.stop();
		};

		Player.prototype.shuffle = function () {
			this.reset();

			this._queue.shuffle();
		};

		Player.prototype.reset = function (soft) {
			this._queue = Object.keys(this._playlist).map(e => +(e));

			if (soft && this._current !== undefined) {
				while (this._queue.shift() !== this._current) {
					if (this._queue.length === 0) {
						throw "SHOULD NEVER HAPPEN!";
					}
				}
			}
		};
	
		Player.prototype.play = function () {
			if (this._loaded) {
				this._player.playVideo();
			} else if (this._playlist.length !== 0) {
				if (this._current === undefined) {
					if (this._random) {
						this.shuffle();
					} else {
						this.reset();
					}

					this._current = this._queue.shift();
				}

				var id = this._playlist[this._current];

				this._loaded = true;
				this._player.loadVideoById(id);
			}
		};
	
		Player.prototype.pause = function () {
			this._player.pauseVideo();
		};
	
		Player.prototype.stop = function () {
			if (this._loaded) {
				this._loaded = false;
				this._player.stopVideo();
			}
		};

		Player.prototype.next = function () {
			var running = this._loaded;

			if (this._current !== undefined) {
				this.stop();

				this._history.push(this._current);
				this._current = undefined;
			}

			if (this._queue.length > 0) {
				this._current = this._queue.shift();

				if (running) {
					this.play();
				}
			} else {
				onEOF(this);
			}
		};

		Player.prototype.previous = function () {
			var running = this._loaded;

			if (this._current !== undefined) {
				this.stop();

				this._queue.unshift(this._current);
				this._current = undefined;
			}

			if (this._history.length > 0) {
				this._current = this._history.pop();
				
				if (running) {
					this.play();
				}
			}
		};

		function onEOF(self) {
			if (self._repeat) {
				self.play();
			}
		}
	
		function onStateChanged(self, e) {
			if (e.data == YT.PlayerState.ENDED) {
				self.next();
			} else if (e.data == YT.PlayerState.PLAYING) {
				var v = self._player.getVideoData();

				self._titles[v.video_id] = v.title;
			}
		}
	
		return Player;
	})();

	function retrievePlaylist(id, f) {
		function parseContent(txt) {
			var tmp = txt;
			var list = [];
			var vids = [];

			while (true) {
				var i = tmp.indexOf('/watch?');
				var v = {};

				if (i == -1) {
					break;
				}

				tmp = tmp.slice(i + 7);
				tmp.slice(0, tmp.indexOf('"')).split('\\u0026').forEach(function (e) {
					e = e.split('=');
					v[e[0]] = e[1];
				});

				if (v.list === id && v.index) {
					list[+(v.index)] = v;
				}
			}

			list.forEach(function (v) {
				if (v) {
					vids.push(v.v);
				}
			});

			return [vids];
		}

		var xhttp = new XMLHttpRequest();
		var url = 'https://www.youtube.com/playlist?list=' + id;

		xhttp.onreadystatechange = function () {
			if (this.readyState == 4 && this.status == 200) {
				f.apply(window, parseContent(xhttp.responseText));
			}
		};
		xhttp.open('GET', url);
		xhttp.send();
	}

	var Server = (function () {
		var actions = {};

		function Server( ) {
			var self = this;

			self._player = new Player('player');
			self._clients = [];

			browser.runtime.onConnect.addListener(function (p) {
				var client = new Dave.Proxy.Export(p, self, actions);

				self._clients.push(client);

				p.onDisconnect.addListener(function () {
					self._clients.remove(client);
				});
			});
		}

		['play', 'pause', 'stop', 'previous', 'next', 'shuffle', 'reset'].forEach(function (a) {
			actions[a] = function () {
				this._player[a]();
			};
		});

		actions.setPlaylist = function (id) {
			var self = this;

			retrievePlaylist(id, function (vids) {
				self._player.clear();
				vids.forEach(function (v) { self._player.add(v); });
				self._player.play();
			});
		};

		Object.keys(actions).forEach(function (id) {
			Server.prototype[id] = actions[id];
		});

		return Server;
	})();

	window.onYouTubeIframeAPIReady = function () {
		window.yt_server = new Server();
	};
})(jQuery);

