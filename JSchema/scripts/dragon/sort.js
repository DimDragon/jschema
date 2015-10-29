Dragon.module(['./classlist', './event', './jpointer', './gesture'], function (CL, Evt, JPtr, Gesture) {
	var SORT_ATTR = 'sortby',
		selector = '[' + SORT_ATTR + ']';

	function process(root) {
		var nodes = root.querySelectorAll(selector);

		if (root.nodeType != 11 && root.hasAttribute(SORT_ATTR)) {
			processNode(root);
		}

		for (var i = 0, count = nodes.length; i < count; i++) {
			processNode(nodes[i]);
		}
	}

	function processNode(node) {
		var sortby = node.getAttribute(SORT_ATTR);

		activate(node, sortby);
	}

	function getDataNode(el) {
		var dataNode = el;

		while (!('dataSource' in dataNode) && dataNode.parentNode) {
			dataNode = dataNode.parentNode;
		}

		return dataNode != el ? dataNode : null;
	}

	function activate(node, sortBy) {
		var dataNode = getDataNode(node);

		if (dataNode) {
			// style element as sorting trigger
			CL.add(node, 'sort-root');
			// store info needed to perform sorting
			node._sortInfo = {
				by: sortBy,
				target: dataNode,
				state: 0
			};
			// tap/click activates sort
			Gesture.enable(node, true);
			Evt.add(node, 'tap', sortData);
		}
	}

	function sortData(evt) {
		var el = evt.target,
			info = el._sortInfo,
			desc = info.state < 0,
			parts = JPtr.decode(info.by),
			prop = parts.pop();

		// nothing to sort by
		if (!prop) {
			return;
		}

		JPtr.get(info.target.dataSource, JPtr.encode(parts)).sort(prop, desc);

		el._sortInfo.state = desc ? 1 : -1;

		// change UI to reflect sort order
		var old = el.parentNode.querySelector('.sort-asc,.sort-desc');
		if (old) {
			CL.remove(old, CL.contains(old, 'sort-asc') ? 'sort-asc' : 'sort-desc');

			if (old != el) {
				old._sortInfo.state = 0;
			}
		}

		CL.add(el, desc ? 'sort-desc' : 'sort-asc');
	}

	return {
		activate: activate,
		process: process,
		_namespace: 'Dragon.Sort'
	};
});