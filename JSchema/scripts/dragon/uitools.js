Dragon.module(['./classlist', './dom', './components', 'dragon/uitools.html'], function (CL, Dom, WC, doc) {
	var loaderTemplate = doc.querySelector('#loader');
		
	function beginLoad(el, text) {
		if (CL.contains(el, 'ctrl-loading'))
			return;

		var loader = loaderTemplate.content.cloneNode(true);

		if (text) {
			loader.querySelector('.ctrl-text').textContent = WC.text(text);
		}

		CL.add(el, 'ctrl-loading');

		if (el.firstChild) {
			el.insertBefore(loader, el.firstChild);
		} else {
			el.appendChild(loader);
		}
	}

	function endLoad(el) {
		var loader = el.querySelector('.ctrl-loader');

		if (loader) {
			loader.parentNode.removeChild(loader);
			CL.remove(el, 'ctrl-loading');
		}
	}

	function isLoader(el) {
		return el.nodeType === Node.ELEMENT_NODE && CL.contains(el, 'ctrl-loader');
	}

	function createError(err) {
		var errNode = Dom.create('p', 'error-text');

		WC.setText(errNode, err);
		return errNode;
	}

	// [DD] This method should be improved for more detailed error structure
	function showError(el, error) {
		var errTag = Dom.create('div', 'msg error');

		// this is used in case of error summary
		if (Array.isArray(error)) {
			for (var i = 0, count = error.length; i < count; i++) {
				errTag.appendChild(createError(error[i]));
			}
		} else {
			var msg = error.detail ? error.detail.message : error.message,
				code = error.detail ? error.detail.code : error.code,
				holder = createError(msg);

			holder.appendChild(Dom.create('span', 'error-code', '(' + code + ')'));

			errTag.appendChild(holder);
		}

		el.insertBefore(errTag, el.firstChild);
	}

	function findErrorTag(el) {
		for (var i = 0, count = el.childNodes.length; i < count; i++) {
			var child = el.childNodes[i];

			if (child.nodeType !== Node.ELEMENT_NODE || !CL.contains(child, 'error'))
				continue;

			return el.childNodes[i];
		}

		return null;
	}

	function hideError(el) {
		var errTag = findErrorTag(el);

		if (errTag)
			el.removeChild(errTag);
	}

	function hasErrors(el) {
		return !!findErrorTag(el);
	}

	return {
		beginLoad: beginLoad,
		endLoad: endLoad,
		isLoader: isLoader,
		showError: showError,
		hideError: hideError,
		hasErrors: hasErrors
	};
});