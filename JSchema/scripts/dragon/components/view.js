Dragon.module(['dragon/components', 'dragon/binding', 'dragon/event'], function (WC, Binding, Event) {
	function setContent(view, tmpl, fn) {
		view.innerHTML = "";

		if (tmpl) {
			view.appendChild(tmpl.content.cloneNode(true));

			// allow inserted content to be upgraded
			Dragon.async(function () {
				if (fn)
					fn(view);

				Event.raise(view, 'view_loaded');
			});
		}
	}

	return WC.register('ctrl-view', {
		src: {
			attribute: {},
			set: function () {
				var el = this;

				el.ctrl.promise = Dragon.xhr({
					url: el.src,
					responseType: 'document'
				});

				el.ctrl.promise.then(function (doc) {
					setContent(el, doc.querySelector('template'));

					delete el.ctrl.promise;
				}, function (err) {
					Event.raise(el, 'view_error', err);
					delete el.ctrl.promise;
				});
			}
		},

		dataSource: {
			get: function () {
				return this.ctrl.dataSource;
			},
			set: function (value) {
				var el = this;

				if (this.ctrl.promise)
					this.ctrl.promise.then(function () {
						el.ctrl.dataSource = Binding.resolve(el, value, el.suppressDoubleWayBinding);
					});
				else
					el.ctrl.dataSource = Binding.resolve(el, value, el.suppressDoubleWayBinding);
			}
		},

		selector: {
			attribute: {},
			set: function (value) {
				setContent(this, document.querySelector(value), function (view) {
					if (view.ctrl.dataSource) {
						Binding.resolve(view, view.ctrl.dataSource);
					}
				});
			}
		},
		disabled: {
			attribute: {},
			set: function (value) {
				WC.disable(this, value);
			}
		},
		suppressDoubleWayBinding: {
			attribute: { boolean: true }
		}
	});
});