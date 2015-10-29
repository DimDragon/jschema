Dragon.module(['dragon/components', 'dragon/event', 'dragon/classlist', 'dragon/dom', 'dragon/binding', 'dragon/components/select.html'], function (WC, Event, Class, Dom, Binding, doc) {

	function convertStaticOptions(control) {
		var options = control.querySelectorAll('ctrl-option');

		for (var i = 0, count = options.length; i < count; i++)
			control.ctrl.select.appendChild(converOption(control, options[i]));
	}

	function converOption(control, el) {
		var option = document.createElement('option');

		if (el.hasAttribute('value'))
			option.setAttribute('value', el.getAttribute('value'));

		if (el.hasAttribute('selected'))
			option.setAttribute('selected', el.getAttribute('selected'));

		if (control.multilanguage || control.hasAttribute('multilanguage')) {
			option.innerHTML = WC.text(el.innerHTML);
		} else {
			option.innerHTML = el.innerHTML;
		}

		return option;
	}

	function invalidateText(control) {
		if (control.selectedIndex < 0)
			control.ctrl.text.innerHTML = '';
		else
			control.ctrl.text.innerHTML = control.ctrl.select.options[control.selectedIndex].innerHTML;
	}

	function renderItems(control) {
		var template = control.querySelector('template');

		control.ctrl.select.innerHTML = '';

		// allow data bound control to also use static options
		convertStaticOptions(control);

		for (var i = 0, count = control.dataSource.length; i < count; i++) {
			control.ctrl.select.appendChild(createOption(template, control, control.dataSource[i]));
		}

		invalidateText(control);
	}

	function createOption(template, control, data) {
		if (template) {
			var clone = template.content.cloneNode(true);

			Binding.resolve(clone, data);

			return converOption(control, clone.querySelector('ctrl-option'));
		}

		var option = document.createElement('option');

		if (control.valueMember)
			option.setAttribute('value', getField(data, control.valueMember));

		if (control.displayMember)
			option.innerHTML = getField(data, control.displayMember);
		else
			option.innerHTML = data;

		if (control.multilanguage)
			option.innerHTML = WC.text(option.innerHTML);

		return option;
	}

	function getField(data, ident) {
		var parts = ident.split("."),
            val = data;

		if (typeof val != 'undefined' && !(val == null)) {
			for (var i = 0, count = parts.length; i < count; i++)
				val = val[parts[i]];
		}

		return val;
	}

	function setBind(el, source, displayMember, valueMember) {
		el.valueMember = valueMember;
		el.displayMember = displayMember;
		el.dataSource = source;

		if (el.ctrl.initValue) {
			el.value = el.ctrl.initValue;
		}

		Event.raise(el, 'bind');
	}

	return WC.register('ctrl-select', {
		template: doc.querySelector('template'),

		lifecycle: {
			created: function () {
				this.ctrl.text = this.shadowRoot.querySelector('.ctrl-text');
				this.ctrl.select = this.shadowRoot.querySelector('select');

				convertStaticOptions(this);

				invalidateText(this);

				// [DD] This can be rewritten to listen directly on host tag?
				Event.add(this.ctrl.select, 'change', function (evt) {
					var select = Dom.shadowHost(evt.target);

					invalidateText(select);

					evt.stopImmediatePropagation();

					Event.raise(select, 'change', {});
				});
			}
		},
		name: {
			attribute: {}
		},

		selectedIndex: {
			get: function () {
				return this.ctrl.select.selectedIndex;
			},
			set: function (value) {
				this.ctrl.select.selectedIndex = value;

				invalidateText(this);
			}
		},

		//selected: {
		//	attribute: {},
		//	get: function () {
		//		return this.ctrl.select.value;
		//	},
		//	set: function (value) {
		//		if (this.dataSource) {
		//			this.ctrl.select.value = value;
		//			invalidateText(this);
		//		} else {
		//			this.ctrl.initValue = value;
		//		}
		//	}
		//},

		value: {
			attribute: {},
			get: function () {
				return this.ctrl.select.value;
			},
			set: function (value) {
				if (this.dataSource || (this.ctrl.select.options.length > 0 && !this.bind)) {
					this.ctrl.select.value = value;
					invalidateText(this);
				} else {
					this.ctrl.initValue = value;
				}
			}
		},

		disabled: {
			attribute: { boolean: true, 'select': 'select' },
			set: function () {
				if (this.disabled)
					Class.add(this, 'disabled');
				else
					Class.remove(this, 'disabled');
			}
		},

		displayMember: {
			get: function () {
				return this.ctrl.displayMember;
			},
			set: function (value) {
				this.ctrl.displayMember = value;
			}
		},

		valueMember: {
			get: function () {
				return this.ctrl.valueMemeber;
			},
			set: function (value) {
				this.ctrl.valueMemeber = value;
			}
		},

		dataSource: {
			get: function () {
				return this.ctrl.dataSource;
			},
			set: function (value) {
				this.ctrl.dataSource = value;

				renderItems(this);
			}
		},

		selectedItem: {
			get: function () {
				return this.dataSource[this.selectedIndex];
			}
		},

		bind: {
			attribute: {},
			set: function (value) {
				var el = this,
					opt = Dragon.getOptions(value);

				if (!opt || (!opt.source && !opt.api))
					return;

				if (Array.isArray(opt.source)) {
					setBind(el, opt.source, opt.display, opt.value);
				} else {
					Dragon.xhr({
						url: opt.source,
						api: opt.api
					}).then(function (res) {
						setBind(el, res, opt.display, opt.value);
					});
				}
			}
		},

		checkValidity: function () {
			var first = this.ctrl.select.querySelector('option'),
				isValid = !this.hasAttribute('required') || (this.ctrl.select.selectedIndex != -1 && this.ctrl.select.selectedIndex != 0) || this.ctrl.select.value != '';
			//first && (first.value === '' || first.textContext === '');

			this.validity.valueMissing = !isValid;

			return isValid;
		},

		multilanguage: {
			attribute: { boolean: true }
		}
	});
});
