function bind(self, f) {
	return function(a) { f.apply(self, arguments); };
};

