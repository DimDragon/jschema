Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/dom', 'dragon/event', 'dragon/gesture', 'dragon/components/button.html'], function (WC, CL, Dom, Event, Gesture, doc) {
	return WC.register('ctrl-button', {
		template: doc.querySelector('template'),
		lifecycle: {
			created: function () {
				this.ctrl.icon = this.shadowRoot.querySelector('.ctrl-icon');

				Gesture.enable(this, true);
				Event.add(this, 'tap', function (e) {
					var type = 'action',
						detail = { action: this.action };

					if (this.path) {
						type = 'follow';
						detail.path = this.path;
					}

					if (Event.raise(this, type, detail)) {
						// in case touch event tap, click was prevented so ensure it
						if (e.detail.touched && this.type == 'submit') {
							this.click();
						}
					}
				});
			},
			attributeChanged: function (name, oldValue, newValue) {
				if (name == 'icon') {
					if (oldValue) {
						CL.remove(this.ctrl.icon, oldValue);
					}

					if (newValue) {
						CL.add(this.ctrl.icon, newValue);
					}
				}
			}
		},
		permission: {
			set: function (value) {
				if (value.res && value.action) {
					WC.checkPermission(this, value.res, value.action, value.mode);
				}
			}
		},
		icon: {
			attribute: {}
		},
		action: {
			attribute: {}
		},
		path: {
			attribute: {}
		},
		image: {
			attribute: { boolean: true }
		},
		text: {
			set: function (value) {
				if (value) {
					WC.setText(this, value);
				}
			}
		},
		// required due to Firefox prototype integrity check
		willValidate: false
	}, 'button');
});
