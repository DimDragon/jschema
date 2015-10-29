Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/dom', 'dragon/event', 'dragon/components/checkbox.html'], function (WC, Class, Dom, Event, doc) {
	var idCounter = 0;

    function focus(evt) {
        var checkbox = Dom.shadowHost(evt.target);
        //var checkbox = Dom.parent(evt.target, '.ctrl-checkbox,ctrl-checkbox');

        Class.toggle(checkbox, 'focus');
    }

    function change (evt) {
        var checkbox = Dom.shadowHost(evt.target);

        checkbox.checked = !checkbox.checked;

        evt.stopImmediatePropagation ();

        Event.raise(checkbox, 'change', {});
    }

    return WC.register('ctrl-checkbox', {
    	template: doc.querySelector('template'),

    	lifecycle: {
    		created: function () {
    			var label = this.shadowRoot.querySelector('label'),
	                ctrlID = 'ctrl-checkbox-' + (++idCounter),
	                input = this.shadowRoot.querySelector('input');

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
    		attribute: { boolean: true, 'select': 'input' },
    		set: function () {
    			if (this.checked)
    				Class.add(this, 'checked');
    			else
    				Class.remove(this, 'checked');
    		}
    	},

    	value: {
    		get: function() {
    			return this.checked;
    		},
    		set: function (value) {
    			this.checked = value;
    		}
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