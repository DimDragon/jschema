Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/event', 'dragon/dom', 'dragon/binding'], function (WC, CL, Event, Dom, Binding) {
	var ownChange = false;

	function itemChange(evt) {
		if (ownChange) {
			ownChange = false;
			return;
		}

		var comp = this,
			els = comp.querySelectorAll('[setvalue]'),
			setVal = [],
			elem,
			val;

		for (var i = 0, count = els.length; i < count; i++) {
			elem = els[i];

			if (elem.checked) {
				setVal.push(getValue(comp, elem));
			}
		}

		this.ctrl.setValue = setVal;

		// notify listeners
		ownChange = true;
		Event.raise(comp, 'change', {});
	}

	function getValue(ctrl, el) {
		var val = el.getAttribute('setvalue');

		switch (ctrl.valuetype) {
			case 'int': return parseInt(val);
			case 'float': return parseFloat(val);
			case 'boolean': return !!val;
			default: return val;
		}
	}

	return WC.register('ctrl-set', {
		lifecycle: {
			created: function () {
				Event.add(this, 'change', itemChange);
			}
		},
		name: {
			attribute: {}
		},
		valuetype: {
			attribute: {}
		},
		disabled: {
			attribute: {},
			set: function (value) {
				WC.disable(this, value);
			}
		},
		value: {
			attribute: {},
			get: function () {
				return this.ctrl.setValue;
			},
			set: function (value) {
				if (!value) {
					return;
				}

				var arr = JSON.parse(value),
					elem;

				if (!Array.isArray(arr)) {
					throw new Error('Set component value must be an array.');
				}

				// store value
				this.ctrl.setValue = arr;

				for (var i = 0, count = arr.length; i < count; i++) {
					elem = this.querySelector('[setvalue="' + arr[i] + '"]');

					if ('checked' in elem) {
						elem.checked = true;
					}
				}
			}
		}
	});
});