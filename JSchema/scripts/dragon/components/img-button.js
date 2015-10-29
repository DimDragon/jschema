Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/components/img-button.html'], function (WC, CL, doc) {
	return WC.register('ctrl-img-button', {
		template: doc.querySelector('template'),
		lifecycle: {
			created: function () {
				this.ctrl.icon = this.shadowRoot.querySelector('.ctrl-icon');
			}
		},
		icon: {
			attribute: [],
			set: function (value) {
				var oldVal = this.getAttribute('icon');

				this.setAttribute('icon', value);

				CL.remove(this.ctrl.icon, oldVal);
				CL.add(this.ctrl.icon, value);
			}
		},
		// Note: [DD] This has no effect since property is non-configurable

		//disabled: {
		//	attribute: { boolean: true, 'select': 'button' },
		//	set: function () {
		//		if (this.disabled)
		//			CL.add(this, 'disabled');
		//		else
		//			CL.remove(this, 'disabled');
		//	}
		//},
		tooltip: {
			attribute: {},
			get: function () {
				return this.shadowRoot.querySelector('span.ctrl-icon').getAttribute('title');
			},
			set: function (value) {
				this.shadowRoot.querySelector('span.ctrl-icon').setAttribute('title', value);
			}
		},
		// required due to Firefox prototype integrity check
		willValidate: false
	}, 'button');
});