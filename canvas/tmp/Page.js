var Page = (function () {
	function Page(n) {
		this._size = n;
		this._buf = new ArrayBuffer(n);

		this.u8 = new Uint8Array(this._buf);
		this.i32 = new Int32Array(this._buf);
		this.f32 = new Float32Array(this._buf);
	}

	return Page;
})();

