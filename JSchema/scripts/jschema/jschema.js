Dragon.module(['dragon/classlist', 'dragon/dom', './resolver', './validator', './renderer', 'dragon/components', 'jschema/jschema.html'], function (CL, Dom, Resolver, Validator, Renderer, WC, doc) {
    var meta = Resolver.dereference("http://jschema.com/schema/v4#"),//Dragon.config.basePath.replace('scripts/lib/', 'schema/v4#')),
		cssCommentRe = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//gim,
		cssUrlRe = /(url\()([^)]*)(\))/g,
		head = document.querySelector('head'),
        refStyle = head.querySelector('style[shadowcss]') || head.querySelector('style[componentscss]'),
		componentsStyle = doc.querySelector('template').content.querySelector('style'),
		loaderTemplate = doc.querySelector('#loader');

    var jsonSchema;

    function getSchema() {
        return jsonSchema;
    }
	// fix component css url paths
	componentsStyle.textContent = fixCssPaths(doc, componentsStyle);

	// insert jschema css as first in head
	head.insertBefore(componentsStyle, refStyle.nextElementSibling || head.firstChild);

	// fix relative paths to absolute before moving to main document
	function fixCssPaths(cDoc, stl) {
		var cssText = stl.textContent.replace(cssCommentRe, ''),
			ref = cDoc.createElement('a');

		return cssText.replace(cssUrlRe, function (match, start, url, end) {
			var urlPath = url.replace(/["']/g, '');

			ref.href = urlPath;
			urlPath = ref.href;
			return start + '\'' + urlPath + '\'' + end;
		});
	}

	function deref(jref, baseRef) {
		return new Promise(function (resolve, reject) {
			meta.then(function () {
				Resolver.dereference(jref, baseRef).then(resolve, reject);
			}).catch(reject);
		});
	}

	function validate(schema, instance) {
		return new Promise(function (resolve, reject) {
			deref(schema["$schema"] || 'http://jschema.com/schema/v4#').then(function (core) {
			    // check schema syntax
				var result = Validator.validate(core, schema);

				if (result === true && instance !== undefined) {
					result = Validator.validate(schema, instance);
				}
				if (result === true) {
					resolve(schema);
				} else {
					reject(result);
				}
			}).catch(reject);
		});
	}

	function process(jref) {
		return new Promise(function (resolve, reject) {
			deref(jref).then(function (sch) {
				resolve(Renderer.process(sch));
			}).catch(reject);
		});
	}

	/* Helper Routines */
	function beginLoad(el) {
		if (el && !CL.contains(el, 'ctrl-loading')) {
			var loader = loaderTemplate.content.cloneNode(true);

			CL.add(el, 'ctrl-loading');

			if (el.firstChild) {
				el.insertBefore(loader, el.firstChild);
			} else {
				el.appendChild(loader);
			}
		}
	}

	function endLoad(el) {
		if (el) {
			var loader = el.querySelector('.ctrl-loader');

			if (loader) {
				loader.parentNode.removeChild(loader);
				CL.remove(el, 'ctrl-loading');
			}
		}
	}

	function insertFragment(frag, el) {
		el.appendChild(frag);
		endLoad(el);

		return frag;
	}

	function renderError(err, el) {
		var frag = document.createDocumentFragment(),
			errTag = Dom.create('div', 'sch-error'),
			msg = err.detail ? err.detail.message : err.message,
			code = err.detail ? err.detail.code : err.code;

		errTag.appendChild(Dom.create('span', 'error-code', code));
		errTag.appendChild(Dom.create('span', 'error-text', msg));
		frag.appendChild(errTag);

		if (el) {
			el.appendChild(frag);
			endLoad(el);
		}

		return frag;
	}

	function renderJson(json) {
	    var pre = Dom.create('pre');

	    return new Promise(function (resolve, reject) {
	        var promise = (typeof json == 'string') ?
	            Dragon.xhr({ url: json }) :
	            Promise.resolve(json);

	        promise.then(function (data) {
	            pre.innerHTML = Renderer.syntaxHighlight(data);
	            resolve(pre);
	        }, reject);
	    });
	}

    return {
        load: Resolver.load,
        raw: Resolver.raw,
        resolve: deref,
        validate: validate,
        render: Renderer.render,
		renderErrors: Renderer.renderErrors,
        process: process,
        renderJson: renderJson,
        beginLoad: beginLoad,
        endLoad: endLoad,
        syntaxHighlight: Renderer.syntaxHighlight,
        errorsHighlight: Renderer.errorsHighlight,
        getSchema: getSchema,
		_namespace: 'Dragon.JSchema'
	};
});
