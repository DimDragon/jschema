Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/gesture', 'dragon/event', 'dragon/dom', 'dragon/components/groupbox.html'], function (WC, Class, Gesture, Event, Dom, doc) {
	return WC.register('ctrl-groupbox', {
		template: doc.querySelector('template'),
		lifecycle: {
			created: function () {
				this.ctrl.icon = this.shadowRoot.querySelector('.ctrl-icon');
				this.ctrl.text = this.shadowRoot.querySelector('.groupbox-text');
				this.ctrl.head = this.shadowRoot.querySelector('.groupbox-header');
				this.ctrl.checkbox = document.createElement('ctrl-checkbox');
			}
		},
		type: {
			attribute: {}
		},
		text: {
			attribute: {},
			set: function (value) {
				WC.setText(this.checkable ? this.ctrl.checkbox : this.ctrl.text, value);

				//if (this.checkable) {
				//	this.ctrl.checkbox.appendChild(WC.textNode(value));
				//} else {
				//	this.ctrl.text.innerHTML = WC.text(value);
				//}
			}
		},
		expandable: {
			attribute: { boolean: true },
			set: function(value) {
				if (!value)
					return;

				var box = this;

				Gesture.enable(box.ctrl.head, true);
				Event.add(box.ctrl.head, 'tap', function(evt) {
					Class.toggle(box, 'toggle');
					Event.raise(box, 'toggle', {visible: Class.contains(box, 'toggle')});
				});
			}
		},
		checkable : {
			attribute: { boolean: true },
			set: function(value) {
				if (!value)
					return;

				var box = this;

				this.ctrl.text.appendChild(this.ctrl.checkbox);
				Event.add(this.ctrl.checkbox, 'change', function(evt) {
					box.disabled = !box.checked;

					Event.raise(box, 'change');
				});
			}
		},

		checked: {
			attribute: { boolean: true },

			get: function() {
				return this.ctrl.checkbox.checked;
			},

			set: function (value) {
				this.ctrl.checkbox.checked = value;
			}
		},

		value: {
			get: function () {
				return this.checked;
			},
			set: function (value) {
				this.checked = value;
			}
		},

		disabled: {
			attribute: {},
			set: function (value) {
				WC.disable(this, value);

				this.ctrl.checkbox.disabled = false;
			}
		}
	});
});

