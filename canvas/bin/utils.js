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

