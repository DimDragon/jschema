// NOTE: we are not creating a polyfill here, we just expose what we need internally!
Dragon.module(['./observer'], function (Observer) {
	var observerCtor = window.MutationObserver || window.WebKitMutationObserver || Observer,
		observer,
		addedNode, removedNode;

	function processNodes(nodes, fn) {
		var node;

		for (var i = 0, count = nodes.length; i < count; i++) {
			node = nodes[i];
			// process only element nodes
			if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() !== 'script') {
				fn(node);
			}
		}
	}

	function process(mutations) {
		var mutation;

		for (var i = 0, count = mutations.length; i < count; i++) {
			mutation = mutations[i];
			if (mutation.type == 'childList') {
				processNodes(mutation.addedNodes, addedNode);
				processNodes(mutation.removedNodes, removedNode);
			}
		}
	}

	observer = new observerCtor(process);

	return {
		observe: function (target, onAdd, onRemove) {
			addedNode = onAdd;
			removedNode = onRemove;

			observer.observe(target, { childList: true, subtree: true });
		}
	};
});