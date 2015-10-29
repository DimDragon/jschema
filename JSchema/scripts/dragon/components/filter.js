Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/dom', 'dragon/event', 'dragon/router', 'dragon/components/filter.html'], function (WC, Class, Dom, Event, Router, doc) {

	function nodeTraverse(node) {
		for (var i = 0, count = node.childNodes.length; i < count; i++) {
			var child = node.childNodes[i];

			if (child.nodeType != 3 && child.hasAttribute('name') && 'value' in child)
				Event.add(child, 'change', changeDynamicSegment);

			if (child.childNodes.length > 0)
				nodeTraverse(child);
		}
	}

	function changeDynamicSegment() {
		var ctrl = Dom.shadowHost(this),
			name = this.getAttribute('name'),
			obj = {};

		if (!ctrl || !ctrl.route || !name)
			return;

		obj[name] = this.value;

		Router.setDynamicSegments(ctrl.route, obj);
	}

	return WC.register('ctrl-filter', {
		template: doc.querySelector('template'),
		lifecycle: {
			created: function() {
				nodeTraverse(this);
			}
		},
		route : {
				attribute: {},
			}
	});
});