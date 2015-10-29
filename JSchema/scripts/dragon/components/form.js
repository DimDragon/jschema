Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/event', 'dragon/dom', 'dragon/binding', 'dragon/validation', 'dragon/uitools'], function (WC, CL, Event, Dom, Binding, Validation, UITools) {
	var modeExp = /^(all|single|summary)$/;

	function process(evt) {
		var form = this,
			data = form.formData,
			action = form.ctrl.submitAction;

		// stop default form submission
		evt.preventDefault();

		// clear already shown errors
		UITools.hideError(form);

		// if we reached here, means native browser validation have passed
		// now we need to execute our own validation loop to ensure legacy browsers and lib components are checked
		// in case form is isValid, allow cancelation of default submit
		if (!Validation.validate(form) || !Event.raise(form, 'formvalidated', { action: action, formData: data })) {
			return;
		}

		//in case of 'Enter' submission, we use action of first submit button
		if (!action) {
			var firstSubmit = form.querySelector('button[type="submit"]') || document.querySelector('button[type="submit"[form="' + form.id + '"]');

			if (firstSubmit) {
				action = firstSubmit.action;
			}
		}

		// allow formData alteration within 'formvalidated' event
		data = form.formData;

		if (form.action) {
			UITools.beginLoad(form, form.loadingText);
			Dragon.xhr({
				url: form.action,
				verb: form.verb || 'POST',
				data: data
			}).then(function (res) {
				UITools.endLoad(form);
				Event.raise(form, 'formsubmit', { action: form.action, formData: data, result: res });
			}).catch(function (err) {
				UITools.endLoad(form);
				// automatically inject error content unless event is prevented
				if (Event.raise(form, 'formerror', { action: form.action, error: err })) {
					UITools.showError(form, err);
				}
			});
		}
	}

	function storeSubmitter(evt) {
		this.ctrl.submitAction = evt.detail.action;
	}

	// [DD] This doesn't cover outside elements with form attribute
	function getData(form) {
		var els = form.querySelectorAll('[name]'),
			data = {},
			elem;

		for (var i = 0, count = els.length; i < count; i++) {
			elem = els[i];

			if ('value' in elem) {
				data[elem.name] = elem.value;
			}
		}

		return data;
	}

	function focusFirst() {
		var form = this,
			els = form.querySelectorAll('[name]'),
			elem;

		for (var i = 0, count = els.length; i < count; i++) {
			elem = els[i];

			if ('value' in elem && !elem.disabled && elem.type != 'hidden') {
				elem.focus();
				return elem;
			}
		}

		els = form.querySelectorAll('button[type=submit]');
		for (var i = 0, count = els.length; i < count; i++) {
			elem = els[i];

			if (!elem.disabled) {
				elem.focus();
				return elem;
			}
		}

		return null;
	}

	return WC.register('ctrl-form', {
		lifecycle: {
			created: function () {
				Event.add(this, 'action', storeSubmitter);
				Event.add(this, 'submit', process);

				Validation.initForm(this);
			}
		},
		src: {
			attribute: {},
			set: function () {
				var form = this;

				Dragon.xhr({ url: form.src }).then(function (res) {
					// automatically bind data source unless event is prevented
					if (Event.raise(form, 'formload', { source: form.src, result: res })) {
						form.dataSource = res;
					}
				}).catch(function (err) {
					// automatically inject error content unless event is prevented
					if (Event.raise(form, 'formerror', { source: form.src, error: err })) {
						UITools.showError(form, err);
					}
				});
			}
		},
		dataSource: {
			get: function () {
				return this.ctrl.dataSource;
			},
			set: function (value) {
				this.ctrl.dataSource = Binding.resolve(this, value);
			}
		},
		verb: {
			attribute: {}
		},
		formData: {
			get: function () {
				return this.ctrl.formData || this.ctrl.dataSource || getData(this);
			},
			set: function (value) {
				this.ctrl.formData = value;
			}
		},
		errormode: {
			attribute: {},
			get: function () {
				return this.ctrl.mode || 'single';
			},
			set: function (value) {
				if (modeExp.test(value)) {
					this.ctrl.mode = value;
				}
			}
		},
		loadingText: {
			attribute: {}
		},
		setError: function (error) {
			UITools.showError(this, error);
		},
		focusFirst: focusFirst,
		checkValidity: function () {
			return Validation.validate(this);
		}
	}, 'form');
});