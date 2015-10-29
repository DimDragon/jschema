Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/gesture', 'dragon/event', 'dragon/components/toggle.html'], function (WC, Class, Gesture, Event, doc) {
    var idCounter = 0;

    function focus(evt) {
        var checkbox = Dom.shadowHost(evt.target);

        Class.toggle(checkbox, 'focus');
    }

    //function change(evt) {
    //	var checkbox = Dom.shadowHost(evt.target);

    //	checkbox.checked = !checkbox.checked;

    //	evt.stopImmediatePropagation();

    //	Event.raise(checkbox, 'change', {});
    //}

    function flip(evt) {
        var dir = evt.detail.direction,
			active = this.checked;

        evt.stopPropagation();

        if (dir == undefined || (dir == 1 && active) || (dir == 2 && !active)) {
            this.checked = !active;
            Event.raise(this, 'change');
        }
    }

    return WC.register('ctrl-toggle', {
        template: doc.querySelector('template'),
        lifecycle: {
            created: function () {
                var label = this.shadowRoot.querySelector('label'),
					input = this.shadowRoot.querySelector('input'),
					area = this.shadowRoot.querySelector('.toggle-area'),
	                ctrlID = 'ctrl-toggle-' + (++idCounter);

                label.setAttribute('for', ctrlID);
                input.setAttribute('id', ctrlID);

                this.ctrl.statusText = this.shadowRoot.querySelector('.toggle-state');
                this.ctrl.area = area;
                WC.setText(this.ctrl.statusText, 'Off');

                Gesture.enable(area);
                Event.add(area, 'tap', flip.bind(this));
                Event.add(area, 'swipe', flip.bind(this));

                //Event.add(input, 'change', change);
                //Event.add(input, 'focus', focus);
                //Event.add(input, 'blur', focus);
            }
        },
        name: {
            attribute: {}
        },

        disabled: {
            attribute: { boolean: true, select: 'input' },
        },

        checked: {
            attribute: { boolean: true, select: 'input' },
            set: function () {
                if (this.checked) {
                	Class.add(this, 'checked');
                	WC.setText(this.ctrl.statusText, 'On');
                } else {
                    Class.remove(this, 'checked');
                    WC.setText(this.ctrl.statusText, 'Off');
                }
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

        checkValidity: function () {
            this.validity.valueMissing = this.hasAttribute('required') && !this.value;

            return !this.validity.valueMissing;
        }
    });
});
