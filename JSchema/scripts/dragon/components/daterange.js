Dragon.module(['dragon/components', 'dragon/components/daterange.html'], function (WC, doc) {
    console.log('date range loaded');

    // NOTE: probably make this method of Components which also handles template polyfill
    //var template = doc.querySelector('template');

    return WC.register('ctrl-daterange', {
        template: doc.querySelector('template'),
    	lifecycle: {
    		attributeChanged: function (name, oldValue, newValue) {
    			var action = !oldValue ? 'added' : !newValue ? 'removed' : 'changed';

    			console.log('Attribute [' + name + '] was ' + action + ' Old value: ' + oldValue + ' New value: ' + newValue);
    		}
    	},
		// fully custom attribute, with own getter/setter
    	from: {
    		attribute: {},
    		get: function () {
    			console.log('Getting from value');
    		},
    		set: function (val) {
    			console.log('Setting from value');
    		}
    	},
		// attribute bound to content element moved into shadow tree
    	value: {
    		attribute: { select: 'button' }
    	},
		// attribute bound to element existing only in shadow tree
    	href: {
    		attribute: { select: '.ctrl-link' }
    	},
		// common attribute, showing basic sync between property and attribute
    	max: {
    		attribute: {}
    	},
		// attribute name is different then property name
    	selectedIndex: {
    		attribute: {name: 'selected-index'}
    	},
		// own property not exposed as attribute
    	min: {
    		get: function () {
    			console.log('Getting min value');
    		},
    		set: function (val) {
    			console.log('Setting min value');
    		}
    	}
    });

    //// NOTE: we can use getters/setters in prototype since IE8 supports them on DOM objects!!!
    //var ctor = Dragon.define(null, {
    //    readyCallback: function () {
    //        var root = WC.createShadowRoot(this);

    //        root.appendChild(template.content.cloneNode(true));
    //    },
    //    insertedCallback: null,
    //    removedCallback: null

    //}, {
    //    // used to check host element and to create new elements
    //    tag: 'section'
    //    //NOTE: for the moment names are not exlusively used, but can be if we opt to create own element tags!
    //    //name: 'drg-button'
    //});

    //WC.register('DateRange', ctor);

    //return ctor;
});