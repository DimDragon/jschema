Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/dom', 'dragon/event', 'dragon/components/radio.html'], function (WC, Class, Dom, Event, doc) {
	var idCounter = 0;

	function focus(evt) {
		var radio = Dom.shadowHost(evt.target);
		
		Class.toggle(radio, 'focus');
	}

	function change(evt) {
		var radio = Dom.shadowHost(evt.target);

		radio.checked = !radio.checked;

		evt.stopImmediatePropagation();

		Event.raise(radio, 'change', {});
	}

	return WC.register('ctrl-radio', {
		template: doc.querySelector('template'),

		lifecycle: {
			created: function () {
				var label = this.shadowRoot.querySelector('label'),
	                ctrlID = 'ctrl-radio-' + (++idCounter),
	                input = this.shadowRoot.querySelector('input');

				this.ctrl.input = input;

				label.setAttribute('for', ctrlID);
				input.setAttribute('id', ctrlID);

				Event.add(input, 'change', change);
				Event.add(input, 'focus', focus);
				Event.add(input, 'blur', focus);
			}
		},

		disabled: {
			attribute: { boolean: true, 'select': 'input' }
		},

		checked: {
			attribute: { boolean: true },
			set: function () {
				if (this.checked)
					Class.add(this, 'checked');
				else
					Class.remove(this, 'checked');

				if (!this.name || !this.checked)
					return;

				var ctrls = document.querySelectorAll('ctrl-radio[name="' + this.name + '"]');

				for (var i = 0, count = ctrls.length; i < count; i++) {
					var radio = ctrls[i];

					if (radio == this || !radio.ctrl)
						continue;

					radio.ctrl.input.checked = false;
					radio.checked = false;
					Class.remove(radio, 'focus');
					}
			}
		},

		value: {
			attribute : {}
		},

		name: {
			attribute: {}
		},

		checkValidity: function () {
			this.validity.valueMissing = this.hasAttribute('required') && !this.value;

			return !this.validity.valueMissing;
		}
	});
});

//TODO native shadow does not corretly implement label-for what to do ??????