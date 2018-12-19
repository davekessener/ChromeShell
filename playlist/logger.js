window.Severity = {
	NONE: 0,
	INFO: 1,
	WARNING: 2,
	ERROR: 3,
	FATAL: 4
};

window.Logger = (function () {
	function Entry(msg, f, l, sev, lid, s) {
		this.message = msg;
		this.file = f;
		this.line = l;
		this.severity = sev;
		this.logger = lid;
		this._value = s;
	}

	Entry.prototype.toString = function () {
		return this._value;
	};

	function Logger(name, f) {
		this._name = name;
		this._out = (f || function (s) { console.log(s); });
		this._width = 50;
	}

	var severity = [ '-----', 'INFO', 'WARN', 'ERROR', 'FATAL' ];
	var logbook = [];

	Logger.prototype.log = function (sev, msg) {
		var s = Array.from(arguments).slice(1);
		var e = (new Error()).stack.split('\n')[1];
		var f = e.slice(e.lastIndexOf('/') + 1, e.lastIndexOf(':'));
		var l = +f.slice(f.lastIndexOf(':') + 1);

		f = f.slice(0, f.indexOf(':'));

		if (typeof sev === 'string') {
			s.unshift(sev);
			sev = Severity.NONE;
		}

		s = printf.apply(null, s);

		this._width = Math.min(Math.max(this._width, s.length), 200);

		var v = printf("[%5s] (%8s) %" + this._width + "s [%s: %d]", severity[sev], this._name, s, f, l);

		logbook.push(new Entry(s, f, l, sev, this._name, v));

		this._out(v);
	}

	var loggers = {};

	function aquire(name) {
		var l = loggers[name];

		if (l === undefined) {
			loggers[name] = (l = new Logger(name));
		}

		return l;
	}

	return {
		get: aquire,
		list: logbook,
		DEFAULT: aquire('default')
	};
})();

