Dragon.module(function () {
	var CACHE_KEY = 'dragon_sec_',
		SEC_ATTR = 'permission',
		selector = '[' + SEC_ATTR + ']',
		secData;

	// set all permissons for current user
	// Note: [DD] Intentionally all resources and actions are case-insensitive
	function setPermissions(data) {
		var perm, res, action;

		secData = {};

		// convert to fast search structure
		for (var i = 0, count = data.length; i < count; i++) {
			perm = data[i],
			res = perm.resource.toLowerCase(),
			action = perm.action.toLowerCase();

			if (!secData[res]) {
				secData[res] = {};
			}

			secData[res][action] = true;
		}

		// process security attributes of whole document
		process(document.documentElement);
	}

	function checkAccess(res, action) {
		res = res.toLowerCase();

		return secData && secData[res] && secData[res][action.toLowerCase()];
	}

	function process(root) {
		var nodes = root.querySelectorAll(selector);

		if (root.nodeType != 11 && root.hasAttribute(SEC_ATTR)) {
			processNode(root);
		}

		for (var i = 0, count = nodes.length; i < count; i++) {
			processNode(nodes[i]);
		}
	}

	function processNode(node) {
		var sec = Dragon.getOptions(node.getAttribute(SEC_ATTR));

		checkPermission(node, sec.res, sec.action, sec.mode);
	}

	function checkPermission(el, res, action, mode) {
		if (!checkAccess(res, action)) {
			switch (mode) {
				case 'remove':
					if (el.parentNode) {
						el.parentNode.removeChild(el);
					}
					break;
				case 'hide':
					el.style.display = 'none';
					break;
				default:
					el.disabled = true;
			}
		}
	}

	return {
		checkAccess: checkAccess,
		checkPermission: checkPermission,
		setUserPermissions: setPermissions,
		process: process,
		_namespace: 'Dragon.Security'
	};
});