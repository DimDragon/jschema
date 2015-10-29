// [DD] Input type number is supported on all browser within our stack
// we however implement this to provide unified UI and some additional features like dropdown selection
Dragon.module(['dragon/components', 'dragon/event', 'dragon/classlist', 'dragon/dom', 'dragon/gesture', 'dragon/components/number.html'], function (WC, Event, Class, Dom, Gesture, doc) {


	return WC.register('ctrl-number', {
		template: doc.querySelector('template'),
		lifecycle: {
			created: function () {
				var el = this;

				el.ctrl.number = el.querySelector('input');

				// willValidate is non-configurable!
				if (el.willValidate == undefined) {
					el.willValidate = el.ctrl.number.willValidate;
				}

				Gesture.enable(el);
				Event.add(el, 'tap', function (evt) {

				});
			}
		},
		required: {
			attribute: { select: 'input' }
		},
		name: {
			attribute: {}
		},
		min: {
			attribute: {select: 'input'}
		},
		max: {
			attribute: { select: 'input' }
		},
		step: {
			attribute: { select: 'input' }
		},
		value: {
			attribute: {},
			get: function () {
				return this.ctrl.number.value;
			},
			set: function (value) {
				this.ctrl.input.number = value;
			}
		},
		stepUp: function (n) {

		},
		stepDown: function (n) {

		},
		checkValidity: function () {
			return this.ctrl.number.checkValidity();
		}
	});
});
