Dragon.module(['dragon/components'], function (WC) {
	return WC.register('ctrl-html', {
		src: {
			attribute: {},
			set: function (value) {
				this.innerHTML = value;
				this.removeAttribute('src');
			}
		}
    });
});