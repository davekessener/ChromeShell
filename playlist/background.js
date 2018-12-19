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
	var logger = Logger.get('backend');

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

	var Set = (function () {
		function Set( ) {
			this._content = [];
		}

		Set.prototype.length = function () {
			return this._content.length;
		};

		Set.prototype.add = function (e) {
			var f = false;

			for(var i = 0 ; i < this._content.length ; ++i) {
				if((f = (this._content[i] == e))) {
					break;
				}
			}

			if (! f) {
				this._content.push(e);
			}
		};

		Set.prototype.remove = function (e) {
			var i = this._content.indexOf(e);

			if (i >= 0) {
				this._content.splice(i);
			}
		};

		Set.prototype.to_a = function () {
			return this._content.slice();
		};

		Set.prototype.forEach = function (f) {
			return this._content.forEach(f);
		};

		Set.prototype.some = function (f) {
			return this._content.some(f);
		};

		Set.prototype.every = function (f) {
			return this._content.every(f);
		};

		return Set;
	})();

	var Playlist = (function () {
		function Playlist( ) {
			this._pl = {};
		}

		Playlist.prototype.length = function () {
			var self = this;
			var l = 0;

			Object.keys(self._pl).forEach(function (id) {
				l += self._pl[id].length();
			});

			return l;
		};

		Playlist.prototype.add = function (id, vid) {
			var pl = this._pl[id];

			if (pl === undefined) {
				this._pl[id] = (pl = new Set());
			}

			pl.add(vid);
		};

		Playlist.prototype.queue = function () {
			var self = this;
			var q = new Set();

			Object.keys(self._pl).forEach(function (id) {
				self._pl[id].forEach(function (v) {
					q.add(v);
				});
			});

			return q.to_a();
		};

		Playlist.prototype.includes = function (e) {
			var self = this;

			return Object.keys(self._pl).some(function (id) {
				return self._pl[id].some(function (v) {
					return v == e;
				});
			});
		};

		return Playlist;
	})();

	var Player = (function () {
		function Player(id, cb) {
			var self = this;
	
			self._queue = [];
			self._playlist = new Playlist();
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
			this._playlist = new Playlist();
			this._current = undefined;
			this._history = new History();
			this.stop();

			logger.log('clearing playlist');
		};

		Player.prototype.add = function (pl, id) {
			this._playlist.add(pl, id);

			logger.log('adding %s [%s]', id, pl);
		};
	
		Player.prototype.setVideo = function (id) {
			this._player.loadVideoById(id);
			this.stop();
		};

		Player.prototype.shuffle = function () {
			this.reset();

			this._queue.shuffle();

			logger.log('shuffling');
		};

		Player.prototype.reset = function (soft) {
			var self = this;

			self._queue = self._playlist.queue();

			if (soft && self._current !== undefined) {
				while (self._queue.shift() !== self._current) {
					if (self._queue.length === 0) {
						self._current = undefined;
						break;
					}
				}
			}

			logger.log('resetting');
		};
	
		Player.prototype.play = function () {
			var self = this;

			if (self._loaded) {
				self._player.playVideo();
			} else if (self._playlist.length() !== 0) {
				if (self._current === undefined) {
					if (self._random) {
						self.shuffle();
					} else {
						self.reset();
					}

					self._current = self._queue.shift();
				}

				self._loaded = true;
				self._player.loadVideoById(self._current);
			}

			logger.log('playing %s', self._current);
		};
	
		Player.prototype.pause = function () {
			this._player.pauseVideo();

			logger.log('pausing');
		};
	
		Player.prototype.stop = function () {
			if (this._loaded) {
				this._loaded = false;
				this._player.stopVideo();
			}

			logger.log('stopped');
		};

		Player.prototype.next = function () {
			var running = this._loaded;

			logger.log('next');

			if (this._current !== undefined) {
				this.stop();

				this._history.push(this._current);
				this._current = undefined;
			}

			while (this._current === undefined) {
				if (this._queue.length > 0) {
					this._current = this._queue.shift();

					if (! this._playlist.includes(this._current)) {
						this._current = undefined;

						continue;
					}

					if (running) {
						this.play();
					}
				} else {
					onEOF(this);

					break;
				}
			}
		};

		Player.prototype.previous = function () {
			var running = this._loaded;

			logger.log('previous');

			if (this._current !== undefined) {
				this.stop();

				this._queue.unshift(this._current);
				this._current = undefined;
			}

			while (this._current == undefined) {
				if (this._history.length > 0) {
					this._current = this._history.pop();

					if (! this._playlist.includes(this._current)) {
						this._current = undefined;

						continue;
					}
					
					if (running) {
						this.play();
					}
				} else {
					break;
				}
			}
		};

		function onEOF(self) {
			if (self._repeat || self._random) {
				self.play();
			}
		}

		var STATES = {
			'-1' : 'UNSTARTED',
			 '0' : 'ENDED',
	   		 '1' : 'PLAYING',
	   		 '2' : 'PAUSED',
	   		 '3' : 'BUFFERING',
	   		 '5' : 'CUED'
		};
	
		function onStateChanged(self, e) {
			var state = "" + e.data;
			state = (STATES[state] || state);

			logger.log('STATE changed to %s', state);

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
				
				vids.forEach(function (v) {
					self._player.add(id, v);
				});

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

