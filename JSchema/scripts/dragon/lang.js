Dragon.module(function () {
	var CACHE_KEY = 'manus_res_',
		RES_ATTR = 'data-res',
		selector = '[' + RES_ATTR + ']',
		langAtrbs = ['title', 'placeholder', 'text'],
		culture = document.documentElement.getAttribute('lang') || '',
		resItem = JSON.parse(localStorage.getItem(CACHE_KEY + culture)),
		resources = {},
		resHash,
		translatePath = '',
		path = Dragon.config.resPath;

	if (resItem) {
		resources = resItem.data;
		resHash = resItem.hash;
	}

	var loaded = new Promise(function (resolve, reject) {
		if (!Dragon.config.resPath) {
			resolve({});
			return;
		}

		Dragon.xhr({
			url: path + (culture ? culture + '/' + (resHash ? resHash + '/' : '') : '')
		}).then(function (res) {
			if (res != null) {
				resHash = res.hash;
				resources = res.data;

				// store new resources and hash in local storage
				localStorage.setItem(CACHE_KEY + culture, JSON.stringify(res));
			}

			resolve(resources);
		}).catch(reject);
	});

	function translateNode(elem) {
		if (elem._translated)
			return;

		var key = elem.getAttribute(RES_ATTR);

		if (key) {
			var textNode = getTextNode(key);

			if (elem.firstChild) {
				elem.insertBefore(textNode, elem.firstChild);
			} else {
				elem.appendChild(textNode);
			}
		} else if (elem.textContent) {
			elem.textContent = getText(elem.textContent);
		}

		// process multilanguage attributes
		for (var j = 0, aCount = langAtrbs.length; j < aCount; j++) {
			key = langAtrbs[j];
			if (elem.hasAttribute(key)) {
				elem.setAttribute(key, getText(elem.getAttribute(key)));
			}
		}

		elem._translated = true;
	}

	// replace all translation attributes
	function translate(el) {
		var nodes = el.querySelectorAll(selector);

		if (Dragon.User && Dragon.User.translateMode) {
			translatePath = Dragon.User.mcsUrl.replace('service','central') + 'translate/manual/' + culture + '/';
		}

		if (el.nodeType != 11 && el.hasAttribute(RES_ATTR)) {
			translateNode(el);
		}

		for (var i = 0, count = nodes.length; i < count; i++) {
			translateNode(nodes[i]);
		}
	}

	function getTextNode(key, params) {
		var txt = getText(key, params);

		if (translatePath) {
			var link = document.createElement('a');

			link.href = translatePath + key + '/';
			link.target = 'MCS';
			link.textContent = txt;

			return link;
		}

		return document.createTextNode(txt);
	}

	// return translated text
	function getText(key, params) {
		var txt = key,
			found = true;

		if (resources) {
			txt = resources[key.toUpperCase()];
			found = !!txt;
			txt = txt || key;
		}

		if (txt && params) {
			txt = txt.replace(/{(\d+)}/g, function(match, index) {
				return params[index];
			});
		}

		if (!found && resources && Dragon.config.logResources) {
			Dragon.xhr({
				api: 'culture/log/',
				verb: 'POST',
				data: {resKey: key}
			});
		}

		return txt;
	}

	//// return translated text
	//function _getText(key, params) {
	//	var txt = resources ? resources[key.toUpperCase()] : '';

	//	if (txt && params) {
	//		txt = txt.replace(/{(\d+)}/g, function (match, index) {
	//			return params[index];
	//		});
	//	}

	//	if (!txt && resources) {
	//		if (Dragon.config.logResources)
	//			Dragon.xhr({
	//				api: 'culture/log/',
	//				verb: 'POST',
	//				data: { resKey: key }
	//			});
	//	}

	//	return txt || key;
	//}

	function setResources(res) {
		resources = res;
	}

	return {
		text: getText,
		textNode: getTextNode,
		translate: translate,
		setResources : setResources,
		_loaded: loaded,
		_namespace: 'Dragon.Lang'
	};
});