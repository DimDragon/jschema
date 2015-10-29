(function (dragon) {
	var // holds resolved and in process of loading modules
		registry = {},
    // used for IE9 only, to hold active scripts
		scripts = { count: 0 },
		anonArgs,
    // promise being waited by all modules
		preload,
		dotsRe = /(\.)(\.?)(?:$|\/([^\.\/]+.*)?)/g,
    // get file path where dragon.js is loaded from
		scrs = document.getElementsByTagName('script'),
		loaded = scrs[scrs.length - 1],
		basePath = loaded.src.substring(0, loaded.src.indexOf('dragon')),
		//basePath = loaded.src.replace(/\/dragon\.js$/, '/'),
		base = document.querySelector('base'),
		appPath = addSlash(base ? base.href : basePath),
    // head object used to inject css or js references
		head = document.head || document.getElementsByTagName('head')[0],
    // used for property testing
		vendorPrefs = 'Webkit Moz O ms'.split(' '),
    // element for testing various props
		tElem = document.createElement('div'),
    // default configuration
		cfg = {
			basePath: basePath,
			preload: ['dragon/enum', 'dragon/classlist', 'dragon/event', 'dragon/dom'],
			appPath: basePath,
			pathMap: {},
			appPath: appPath,
			apiPath: appPath + 'api/',
			tokenKey: 'oauth_webapi_key',
			version: "1.1"
		},
		responseType = {
			document: 'document',
			json: 'json',
			arraybuffer: 'arraybuffer',
			blob: 'blob',
			text: 'text'
		},
    // check if template tag is supported
		nativeTemplate = 'content' in document.createElement('template'),
		nativeTemplateCloneNode = nativeTemplate,
    // helper method to extend objects
		createProperties = function (obj, props) {
			/// <summary>
			///		Add or replace properties for a given object
			/// </summary>
			/// <param name="obj" type="Object">
			///		Object to mutate
			/// </param>
			/// <param name="props" type="Object">
			///		The set of property descriptiors
			/// </param>
			if (!props) {
				return obj;
			}

			var keys = Object.keys(props),
				key,
				enumerable,
				properties,
				prop;

			for (var i = 0, count = keys.length; i < count; i++) {
				key = keys[i];
				prop = props[key];
				enumerable = key.charCodeAt(0) !== /*_*/95;

				if (prop && typeof prop === 'object') {
					if (prop.value !== undefined || typeof prop.get === 'function' || typeof prop.set === 'function') {
						if (prop.enumerable === undefined) {
							prop.enumerable = enumerable;
						}
						properties = properties || {};
						properties[key] = prop;
						continue;
					}
				}

				if (!enumerable) {
					properties = properties || {};
					properties[key] = { value: prop, enumerable: enumerable, configurable: true, writable: true }
					continue;
				}

				obj[key] = prop;
			}

			if (properties) {
				Object.defineProperties(obj, properties);
			}

			return obj;
		};

	function isType(obj, type) {
		/// <summary>
		///		Check if object is of given type
		/// </summary>
		/// <param name="obj" type="Object">
		///		Object instance to be tested
		/// </param>
		/// <param name="type" type="String">
		///		String representation of type
		/// </param>
		/// <returns type="Boolean">
		///		True is object is of given type
		/// </returns>
		return Object.prototype.toString.call(obj).indexOf('[object ' + type) == 0;
	}

	// check if elem supports given css property
	// NOTE: probably can make this all arround checker for css and dom properties
	function hasCssProps(props) {
		var stl = tElem.style,
			tests,
			prop;

		props = Array.prototype.slice.call(arguments);
		for (var i = 0, pCount = props.length; i < pCount; i++) {
			prop = props[i];
			tests = (vendorPrefs.join(prop + ' ') + prop + ' ' + prop.charAt(0).toLowerCase() + prop.slice(1)).split(' ');

			for (var j = 0, count = tests.length; j < count; j++) {
				if (stl[tests[j]] !== undefined) {
					return true;
				}
			}
		}

		return false;
	}

	// wrap given string in quotes
	function quoteNames(str) {
		return str.replace(/(\w+)\s*:/g, function (match, prop) {
			return match.replace(prop, '"' + prop + '"');
		});
	}

	function getOptions(attr) {
		/// <summary>
		///		Converts options attribute into JSON object
		/// </summary>
		/// <param name="attr" type="String">
		///		Options attribute value
		/// </param>
		/// <returns type="Object">
		///		Options object
		/// </returns>
		var result = '',
            start,
            end,
            searched = 0;

		//TODO not sure if this is right
		attr = attr.replace(/'/g, '"');

		while ((start = attr.indexOf('"', searched)) != -1 && (end = attr.indexOf('"', start + 1)) != -1) {
			if (searched < start) {
				result += quoteNames(attr.substring(searched, start));
			}

			result += attr.substring(start, end + 1);

			searched = end + 1;
		}

		if (searched < attr.length) {
			result += quoteNames(attr.substring(searched));
		}

		if (!result.match(/^{.*}$/)) {
			result = '{' + result + '}';
		}

		// NOTE: Must add here some error in case parisng fails?
		return JSON.parse(result);
	}

	function createScript(url) {
		var scr = document.createElement("script");

		// NOTE: consider removing type here by HTML5 specification
		scr.type = "text/javascript";
		scr.src = url;
		return scr;
	}

	// add trailing slash if not present
	function addSlash(path) {
		return (path.charAt(path.length - 1) != '/') ? path + '/' : path;
	}

	function joinPath(path, file) {
		return removeEndSlash(path) + '/' + file;
	}

	function removeEndSlash(path) {
		return path && path.charAt(path.length - 1) == '/' ? path.substr(0, path.length - 1) : path;
	}

	// set config values and some enchancements
	(function () {
		var CONFIG_ATTR = 'data-config',
            userCfgAttr = loaded.getAttribute(CONFIG_ATTR),
            userCfg;

		// turns dashed string into camelcase notation
		function camelCase(str) {
			return str.replace(/\-([a-z])/ig, function (match, start) {
				return start.toUpperCase();
			});
		}

		// NOTE: REVISIT THIS !!!
		// add support for dataset property where missing
		if (!tElem.dataset) {
			var allowEnum = !!tElem.addEventListener; // IE8 does not allow setting enumerable to true

			function prepare() {
				var dataset = allowEnum ? {} : document.createElement('div'), 	// IE8 only allow get/set on DOM objects
					self = this,
					attrs = self.attributes,
					attr,
					match,
					getter = function () {
						return this;
					},
					setter = function (name, val) {
						return (typeof val !== 'undefined') ? this.setAttribute(name, val) : this.removeAttribute(name);
					};

				for (var i = 0, count = attrs.length; i < count; i++) {
					attr = attrs[i];
					match = attr.name.match(/^data-(.+)/);
					if (match) {
						Object.defineProperty(dataset, camelCase(match[1]), {
							enumerable: this.enumerable,
							get: getter.bind(attr.value || ''),
							set: setter.bind(self, attr.name)
						});
					}
				}

				return dataset;
			}

			Object.defineProperty(Element.prototype, 'dataset', { enumerable: allowEnum, get: prepare });
		}

		if (!Array.prototype.find) {
			Array.prototype.find = function (predicate) {
				if (this == null) {
					throw new TypeError('Array.prototype.find called on null or undefined');
				}
				
				if (typeof predicate !== 'function') {
					throw new TypeError('predicate must be a function');
				}

				var list = Object(this),
					length = list.length >>> 0,
					thisArg = arguments[1],
					value;

				for (var i = 0; i < length; i++) {
					value = list[i];
					if (predicate.call(thisArg, value, i, list)) {
						return value;
					}
				}

				return undefined;
			};
		}

		// merges two arrays without duplication
		function merge(arr1, arr2) {
			var hash = {};

			return arr1.concat(arr2).filter(function (val) {
				return hash[val] ? 0 : hash[val] = 1;
			});
		}

		// process user config
		if (userCfgAttr) {
			userCfg = getOptions(userCfgAttr);
			loaded.removeAttribute(CONFIG_ATTR);

			// make sure path end with a slash
			if (userCfg.basePath) {
				userCfg.basePath = addSlash(userCfg.basePath);
			}

			// setup defaults relative to appPath
			if (userCfg.appPath) {
				userCfg.appPath = addSlash(userCfg.appPath);
				userCfg.apiPath = addSlash(userCfg.apiPath || userCfg.appPath + 'api');
				userCfg.fileHandler = addSlash(userCfg.fileHandler || userCfg.apiPath + 'fileupload');
			}

			// all lib components added
			var libcomps = userCfg.libComponents || [];

			userCfg.components = userCfg.components || [];
			for (var i = 0, count = libcomps.length; i < count; i++) {
				userCfg.components.push('dragon/components/' + libcomps[i]);
			}

			// ensure default preloads
			userCfg.preload = merge(cfg.preload, userCfg.preload || []);

			initPathMap(userCfg);

			createProperties(cfg, userCfg);
		}
	})();

	// prepare quick lookup for pathMap
	function initPathMap(cfg) {
		var pathMap = cfg.pathMap || {},
            newMap = {},
		    pathList = [],
		    keys = Object.keys(pathMap),
			key,
            id,
			path;

		// normalizes path info
		for (var i = 0, count = keys.length; i < count; i++) {
			key = keys[i];
			path = pathMap[key];

			// ignore non string properties of pathMap
			if (!isType(path, 'String')) {
				if (path.hasOwnProperty && path.hasOwnProperty('path') && path.hasOwnProperty('specificity') && path.hasOwnProperty('id')) {
					newMap[key] = pathMap[key];

					pathList.push(pathMap[key].id);
				}

				continue;
			}

			id = removeEndSlash(key);
			if (id) {
				newMap[id] = { path: removeEndSlash(path), specificity: id.split('/').length, id: id };
				pathList.push(id);
			}
		}

		// adds the path matching regexp onto the cfg
		cfg.pathRx = new RegExp('^(' +
            pathList.sort(function (a, b) { return newMap[b].specificity - newMap[a].specificity; })
                .join('|')
                .replace(/\/|\./g, '\\$&') +
                ')(?=\\/|$)'
        );
		cfg.pathMap = newMap;
	}

	//reprocess pathMap
	function resolvePathMap() {
		initPathMap(Dragon.config);
	}

	// check if string ends with requested suffix
	function endsWith(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}

	function isFunction(fn) {
		return typeof fn === "function";
	}

	function isScript(src) {
		return src.indexOf('.js') >= 0;
	}

	function isStyle(src) {
		return endsWith(src, '.css');
	}

	function isFragment(src) {
		return endsWith(src, '.htm') || endsWith(src, '.html');
	}

	// check if path is absolute
	// NOTE: must catch case where it starts with '//'
	function isAbsolute(path) {
		var parts = path.split('/');
		return /http:|https:|ftp:/.test(parts[0]);
	}

	// resolve given path against basePath
	function fullPath(path) {
		return isAbsolute(path) ? path : cfg.basePath + path;
	}

	function resolvePath(path) {
		var pathMap = cfg.pathMap,
            result = path;

		if (!isAbsolute(path)) {
			result = path.replace(cfg.pathRx, function (match) {
				return pathMap[match] ? pathMap[match].path : '';
			});
		}

		return fullPath(result);
	}

	// NOTE: verify this for relative scripts!!!
	function resolveModule(def) {
		def.url = cfg.bundles && Dragon.config.bundles[def.source] ? Dragon.config.bundles[def.source] : resolvePath(def.source) + '.js';
	}

	// resolve all dots relative to parent id
	function toAbsId(id, base) {
		var relCount = 1,
            baseParts,
            resId = id;

		// relative when starts with ./ or ../
		if (id.charAt(0) != '.') {
			return id;
		}

		//remove dots while counting how many doubledots are removed
		resId = resId.replace(dotsRe, function (match, dot, dDot, rest) {
			if (dDot) {
				relCount++;
			}
			return rest || '';
		});

		// wrongly named module
		if (resId == '') {
			throw new Error('Incorrect module name: ' + id);
		}

		// remove that many parts from base id and then join them together
		baseParts = base.split('/');
		baseParts.splice(Math.max(baseParts.length - relCount, 0), relCount);
		return baseParts.concat(resId).join('/').toLowerCase();
	}

	function parseHTML(html) {
		///<summary>
		///		Parse html string into DOM
		///</summary>
		///<param name="html" type="String">
		///		HTML string to be parsed
		///</param>
		///<returns type="HTMLDocumentFragment">Can be used for DOM node operations</returns>
		var frag = document.createDocumentFragment(),
			div = document.createElement('div'),
			requireTable = html.match(/^<(tbody|tr|td|th|col|colgroup|thead|tfoot)[\s\/>]/i),
			str = requireTable ? '<table>' + html + '</table>' : html,
			container;

		div.innerHTML = str;
		container = requireTable ? div.getElementsByTagName(requireTable[1])[0].parentNode : div;

		while (container.firstChild) {
			frag.appendChild(container.firstChild);
		}

		return frag;
	}

	function upgradeTemplate(node) {
		var frag = document.createDocumentFragment();

		while (node.firstChild) {
			frag.appendChild(node.firstChild);
		}

		node.content = frag;
	}

	//very stupid code to check if nested template content is transferred during clone(Safari problem)
	//check later if safari fixed this bug and remove code
	if (nativeTemplateCloneNode) {
		(function () {
			var template = document.createElement('template'),
				nestedTemplate = document.createElement('template'),
				clone;

			template.content.appendChild(document.createElement('div'));

			nestedTemplate.content.appendChild(document.createElement('div'));

			template.content.appendChild(nestedTemplate);

			clone = template.content.cloneNode(true);

			if (clone.querySelector('template').content.childNodes.length == 0)
				nativeTemplateCloneNode = false;
		})();
	}

	if (!nativeTemplateCloneNode) {
		Node.prototype._origClone = Node.prototype.cloneNode;

		//safari fix
		if (nativeTemplate)
			Node.prototype.cloneNode = function (full) {
				var cloneElem = this._origClone(full);

				if (this.content)
					cloneElem.content = this.content.cloneNode(full);

				var oldTemplates = this.querySelectorAll('template'),
					newTemplates = cloneElem.querySelectorAll('template');

				for (var i = 0, count = oldTemplates.length; i < count; i++) {
					for (var j = 0, length = oldTemplates[i].content.childNodes.length; j < length; j++) {
						var elem,
							child = oldTemplates[i].content.childNodes[j];

						if (child.nodeType != 3)
							elem = child.cloneNode(true);
						else
							elem = document.createTextNode(child.textContent);

						newTemplates[i].content.appendChild(elem);
					}
				}

				return cloneElem;
			};
		else
			Node.prototype.cloneNode = function (full) {
				var clone = this._origClone(full);

				if (this.content) {
					clone.content = this.content.cloneNode(full);
				}

				var oldTemplates = this.querySelectorAll('template'),
					newTemplates = clone.querySelectorAll('template');

				for (var i = 0, count = oldTemplates.length; i < count; i++) {
					newTemplates[i].content = oldTemplates[i].content.cloneNode(true);
				}

				return clone;
			};
	}

	function upgradeTemplates(container) {
		if (!nativeTemplate) {
			var tmpls = container.querySelectorAll('template');

			for (var i = 0, count = tmpls.length; i < count; i++) {
				upgradeTemplate(tmpls[i]);
			}

			//upgradeSubtree(container);

			//if (container.tagName.toUpperCase() === 'TEMPLATE') {
			//    upgrade(container);
			//}
		}
	}

	// our custom error to have code and detail
	var Err = inheritClass(Error, function Err(message, code, detail) {
		this.message = message || '';
		this.code = code || 0;
		this.detail = detail;
	}, {
		name: 'CustomError'
	});

	//In all browsers that support responseType, the default value of responseType is an empty string 
	//(just like it says in the spec: http://www.w3.org/TR/XMLHttpRequest/#the-responsetype-attribute ),
	//in browsers that don't support responseType the value of the attribute is undefined.
	var hasResponseType = typeof new XMLHttpRequest().responseType === 'string',
        defaultHeaders = {
        	'document': { 'Accept': 'text/html' },
        	'json': { 'Accept': 'application/json' },
        	'arraybuffer': { 'Accept-Charset': 'x-user-defined' },
        	'blob': { 'Accept': 'text/plain' },
        	'all': { 'Accept': '*/*' }
        };

	// [DD] Used only in XHR for security token header. Can probably be revised!
	function absUrl(url) {
		var parser = document.createElement('a'),
			absUrl;

		parser.href = url;
		absUrl = parser.href;

		return absUrl;
	}

	function xhr(opt) {
		///<summary>
		///		Method for making asyncronious XHR
		///</summary>
		///<param name="opt" type="Object">
		///		Options needed to make XHR call
		///		<list>
		///			<item name="url" type="String">request path</item>
		///			<item name="api" type="String">request path for WebApi method</item>
		///			<item name="verb" type="String" default="GET">HTTP verb to use</item>
		///			<item name="accept" type="String" default="*/*">allowed MIME types</item>
		///			<item name="contentType" type="String" default="application/json; charset=utf-8">content MIME type</item>
		///			<item name="nocache" type="Boolean" default="false">allow to prevent chaching of request</item>
		///			<item name="headers" type="Object">key-value object with http headers to set</item>
		///			<item name="data" type="Object">custom data to be sent with request</item>
		///			<item name="responseType" type="String">Set desired response type.</item>
		///			<item name="username" type="String">Optional. Credentials username</item>
		///			<item name="password" type="String">Optional. Credentials password</item>
		///			<item name="withCredentials" type="Boolean" default="false">allow cookies and authorization headers to be sent with the request</item>
		///		</list>
		///</param>
		///<returns type="Promise">When successful original options object with added 'value' property</returns>
		opt.headers = opt.headers || {};

		// WebApi urls are given priority
		if (opt.api) {
			opt.url = Dragon.config.apiPath + opt.api;
		}

		// we consider ALL api calls to be protected by OAuth token
		if (absUrl(opt.url).indexOf(Dragon.config.apiPath) >= 0) {
			var token = localStorage.getItem(Dragon.config.tokenKey);

			if (token) {
				opt.headers.Authorization = 'Bearer ' + token;
			}
		}

		// make sure JSON objects are stringified
		if (opt.data && typeof opt.data === 'object') {
			opt.data = JSON.stringify(opt.data);
		}

		// NOTE: when empty response is returned it should not be parsed!!!
		return new PromiseES6(function (resolve, reject) {
			var xhr = new XMLHttpRequest(),
                isResponseSupported = false,
                requestResponseType = opt.responseType || responseType.json;

			xhr.onload = function () {
				var contentType = xhr.getResponseHeader("Content-Type"),
                    isHTML = contentType == 'text/html',
                    doc,
					response;

				if (isResponseSupported) {
					if (xhr.response != 'undefined' && xhr.response != null) {
						if (xhr.responseType == responseType.document && isHTML) {
							upgradeTemplates(xhr.response);
						}
					}
					response = xhr.response;
				} else {
					switch (requestResponseType) {
						case responseType.document:
							if (contentType == 'text/xml' && xhr.responseXML) {
								resolve(xhr.responseXML);
							} else if (isHTML && xhr.responseText) {
								doc = document.implementation.createHTMLDocument("");
								doc.body.appendChild(parseHTML(xhr.responseText));

								upgradeTemplates(doc);
								response = doc;
							}
							break;
						case responseType.json:
							response = xhr.responseText ? JSON.parse(xhr.responseText) : {};
							break;
							//  NYI         
						case responseType.arraybuffer:
						case responseType.blob:
						default:
							response = xhr.responseText;
					}
				}

				if (xhr.status >= 200 && xhr.status < 400) {
					if (requestResponseType == responseType.document && !response.baseURI) {
						var baseTag = response.head.appendChild(response.createElement('base'));

						baseTag.href = opt.url;
					}
					resolve(response);
				} else {
					reject(new Err(xhr.statusText, xhr.status, response));
				}
				/*
				if (xhr.status >= 200 && xhr.status < 300) {
					var contentType = xhr.getResponseHeader("Content-Type"),
                        isHTML = contentType == 'text/html',
                        doc;

					if (isResponseSupported) {
						if (xhr.response != 'undefined' && xhr.response != null) {
							if (xhr.responseType == responseType.document && isHTML) {
								upgradeTemplates(xhr.response);
							}
						}
						resolve(xhr.response);
					} else {
						switch (requestResponseType) {
							case responseType.document:
								if (contentType == 'text/xml' && xhr.responseXML) {
									resolve(xhr.responseXML);
								} else if (isHTML && xhr.responseText) {
									doc = document.implementation.createHTMLDocument("");
									doc.body.appendChild(parseHTML(xhr.responseText));

									upgradeTemplates(doc);
									resolve(doc);
								}
								break;
							case responseType.json:
								resolve(xhr.responseText ? JSON.parse(xhr.responseText) : {});
								break;
								//  NYI         
							case responseType.arraybuffer:
							case responseType.blob:
							default:
								resolve(xhr.responseText);
						}
					}
				} else {
					reject(new Err(xhr.statusText, xhr.status, xhr.response));
				}*/
			};

			xhr.onerror = function (err) {
				reject(new Err("Network Error", 500));
			};

			xhr.open(opt.verb || 'GET', opt.url, true, opt.username, opt.password);

			// NOTE: this seems bit obsolete now that we have responseType, however there is no clear way to state you wish for XML response ?!
			if (opt.accept) {
				xhr.setRequestHeader('Accept', opt.accept);
			}

			// use json type as default for POST and PUT requests
			if (opt.verb === 'POST' || opt.verb === 'PUT') {
				xhr.setRequestHeader('Content-Type', opt.contentType || 'application/json');
			}

			// prevent caching
			if (opt.nocache) {
				xhr.setRequestHeader('Cache-Control', 'no-cache');
			}

			// sent credentials with request
			if (opt.withCredentials) {
			//	xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
				xhr.withCredentials = true;
			}

			//setting responseType to a specific type and if it got the new value means browsers supports it:
			if (hasResponseType) {
				try {
					xhr.responseType = requestResponseType;
				} catch (e) {
					xhr.responseType = '';
				}
				isResponseSupported = xhr.responseType === requestResponseType;
			}

			// in case response type is not supported, set default accept headers
			if (!isResponseSupported) {
				Dragon.extend(opt.headers, defaultHeaders[requestResponseType]);
			} else if (!opt.accept && requestResponseType === responseType.json) {
				Dragon.extend(opt.headers, defaultHeaders["json"]);
			}

			// set rest of provided headers
			Object.keys(opt.headers).forEach(function (key) {
				xhr.setRequestHeader(key, opt.headers[key]);
			});

			xhr.send(opt.data);
		});
	}

	//NOTE: will have to improve here to detect onload/onerror
	//This will be quite a challenge since onload and especially onerror is not well supported
	function loadStyle(url) {
		var stl = document.createElement('link');

		stl.type = "text/css";
		stl.rel = "stylesheet";
		stl.href = url;

		head.appendChild(stl);

		return PromiseES6.resolve(stl);
	}

	function loadScript(url, async) {
		///<summary>
		///		Allows defered script loading and chaining
		///</summary>
		///<param name="url" type="String">
		///		URL for script resource to load
		///</param>
		///<param name="async" type="Boolean" optional="true">
		///		Script can be loaded asyncroniously not waiting on any other script to load
		///</param>
		///<returns type="Promise">Contains script element which was loaded</returns>
		return new PromiseES6(function (resolve, reject) {
			deferScript(url, async, resolve, reject);
		});
	}

	function deferScript(url, async, success, error, id) {
		var scrpt = createScript(url);

		function process() {
			scrpt.onload = scrpt.onerror = null;
			success(scrpt);
		}

		scrpt.async = !!async;

		if (scrpt.readyState && !window.indexedDB) {  //IE9
			scrpt.onreadystatechange = function () {
				if (scrpt.readyState == "loaded" || scrpt.readyState == "complete") {
					scrpt.onreadystatechange = null;

					if (id) {	// used internally by module loader
						delete scripts[id];
						scripts.count--;
					}
					process();
				}
			};

			// hold reference to script to later lookup
			if (id) {	// used internally by module loader
				scripts[id] = scrpt;
				scripts.count++;
			}
		} else {
			scrpt.onload = process;
		}

		scrpt.onerror = function () {
			error(new Err('Failed to load script: ' + url));
		}

		document.body.appendChild(scrpt);
	}

	function loadDocument(url) {
		return xhr({
			url: url,
			responseType: responseType.document
		});
	}

	function loadModule(module, parent) {
		var absId = parent.toAbs(module),
            def;

		if (absId in registry) {
			def = registry[absId];
		} else {
			def = createDef(absId, null, parent.wait); //createResDef(absId, parent.wait);
			// set def.url to fully resolved module path
			resolveModule(def);
			registry[absId] = def;

			deferScript(def.url, !parent.wait, function () {
				var args = anonArgs;

				anonArgs = null;

				if (def.delayed !== false) {
					if (!args || args.ex) {
						def.reject(new Err(((args && args.ex) || 'define() missing or duplicated: ' + def.url)));
					} else {
						defineResource(def, args);
					}
				}
			}, def.reject, def.source);
		}

		return def;
	}

	function createDef(source, dependent, waitfor, resolver) {
		var def = {
			source: source || '',
			deps: dependent || [],
			wait: waitfor
		};

		def.toAbs = function (id) {
			return toAbsId(id, def.source || cfg.basePath);
		};

		def.promise = new PromiseES6(function (resolve, reject) {
			def.reject = reject;

			function create(deps) {
				try {
					return createNamespace(def.factory.apply(null, deps));
				} catch (ex) {
					def.reject(ex);
				}
			}

			def.resolve = resolver ? resolve : function (deps) {
				PromiseES6.all(this.wait || preload).then(function () {
					resolve((registry[def.source] = create(deps)));
				});
			};
		});

		def.then = def.promise.then.bind(def.promise);
		def.catch = def.promise.catch.bind(def.promise);

		return def;
	}

	function defineResource(def, args) {
		def.deps = args.deps;
		def.factory = args.factory;
		getDeps(def);
	}

	// possible signatures:
	// object [Configuration], array [ModuleNames or ScriptUrls]
	// array [ModuleNames or ScriptUrls] // NOTE: basicaly replaces AddScript!
	// function [code to be executed deffered]
	// returns promise
	function require() {
		///<signature>
		///<summary>
		///		Returned promise is resolved when all requested resources are loaded
		///</summary>
		///<param name="resources" type="Array" elementType="String">
		///		List of module, script file, css file or html template to be loaded
		///</param>
		///<returns type="Promise">Resolved when all resources are loaded. Returns all resource objects</returns>
		///</signature>
		///<signature>
		///<summary>
		///		Returned promise is resolved when all requested resources are loaded
		///</summary>
		///<param name="resource1" type="String" parameterArray="true">
		///		Module, script file, css file or html template to be loaded
		///</param>
		///<param name="resource2" type="String" optional="true">
		///		Module, script file, css file or html template to be loaded
		///</param>
		///<param name="..." type="String" optional="true">
		///		Module, script file, css file or html template to be loaded
		///</param>
		///<returns type="Promise">Resolved when all resources are loaded. Returns all resource objects</returns>
		///</signature>
		///<signature>
		///<summary>
		///		Returned promise is resolved when all requested resources are loaded
		///</summary>
		///<param name="config" type="Object">
		///		Configuration object which allow base configuration override
		///</param>
		///<param name="resources" type="Array" elementType="String">
		///		List of module, script file, css file or html template to be loaded
		///</param>
		///<returns type="Promise">Resolved when all resources are loaded. Returns all resource objects</returns>
		///</signature>
		///<signature>
		///<summary>
		///		Returned promise is resolved when all requested resources are loaded
		///</summary>
		///<param name="config" type="Object">
		///		Configuration object which allow base configuration override
		///</param>
		///<param name="resource1" type="String" parameterArray="true">
		///		Module, script file, css file or html template to be loaded
		///</param>
		///<param name="resource2" type="String" optional="true">
		///		Module, script file, css file or html template to be loaded
		///</param>
		///<param name="..." type="String" optional="true">
		///		Module, script file, css file or html template to be loaded
		///</param>
		///<returns type="Promise">Resolved when all resources are loaded. Returns all resource objects</returns>
		///</signature>
		var config = {},
			sources = Array.prototype.slice.call(arguments);

		// empty usage allows deffered script execution
		if (sources.length == 0) {
			return preload;
		}

		// we have configuration object supplied
		if (isType(sources[0], 'Object')) {
			config = sources.shift();
		}

		if (Array.isArray(sources[0])) {
			sources = sources[0];
		}

		return resolveDeps(sources);
	}

	function resolveDeps(sources, waitFor) {
		var result = createDef(null, sources, waitFor, true);

		// since 'all' returns array with results we expand it as objects list
		result.then = function (res, rej) {
			return this.promise.then(function (deps) {
				res.apply(null, deps);
			}, rej);
		};

		PromiseES6.all(waitFor || preload).then(function () {
			getDeps(result);
		});

		return result;
	}

	function resolveSignature(args) {
		var len = args.length,
            factory = args[len - 1],
            mod,
            deps;

		if (isType(factory, 'String')) {
			var namespace = args[0];

			if (len != 2 || !isType(namespace, 'String')) {
				throw new Err('Incorrect signature when using module as first class object');
			}

			return {
				ns: namespace,
				modId: factory
			}
		} else if (len == 3) {
			mod = args[0];
			deps = args[1];
		} else if (len == 2) {
			if (isType(args[0], 'Array')) {
				deps = args[0];
			} else {
				mod = args[0];
			}
		}

		return {
			modId: mod,
			deps: deps || [],
			// wrap static objects in function
			factory: isFunction(factory) ? factory : function () { return factory; }
		};
	}

	function getDeps(parent) {
		var sources = parent.deps,
            source,
            prom,
            promises = [];

		if (sources.length == 0) {
			//console.log('Resolve module: ' + parent.source + ' Deps: ' + sources);
			parent.resolve([]);
		} else {
			for (var i = 0, count = sources.length; i < count; i++) {
				source = sources[i];

				if (isScript(source)) {
					prom = loadScript(resolvePath(source));
				} else if (isStyle(source)) {
					prom = loadStyle(resolvePath(source));
				} else if (isFragment(source)) {
					prom = loadDocument(resolvePath(source));
				} else {		// resolve this as module name (add .js at the end)
					prom = loadModule(source, parent);
				}

				promises.push(prom);
			}

			PromiseES6.all(promises).then(function (deps) {
				//console.log('Resolve module: ' + parent.source + ' Deps: ' + sources);
				parent.resolve(deps);
			}, function (err) {
				// NOTE: should we reject here ?!
				console.log(err);
			});
		}

		return parent;
	}

	// possible signatures:
	// (string [ModuleName], array [Dependencies], object|function [Factory])
	// (array [Dependencies], object|function [Factory])						//NOTE: only one such anonymous define per file!
	// (string [ModuleName], object|function [Factory])
	// (object|function [Factory])												//NOTE: only one such anonymous define per file!
	function defineModule() {
		var args = resolveSignature(arguments),
			id = args.modId,
    		def;

		// anonymous module(can only be resolved by our loader)
		if (!id) {
			if (anonArgs) {
				anonArgs = { ex: 'Multiple anonymous definitions is same script' };
			} else if (scripts.count) {
				// for IE9 loop active scripts to find executing one(marked as 'interactive')
				for (var name in scripts) {
					if (scripts[name].readyState == 'interactive') {
						id = name;
						break;
					}
				}
			}
		}

		// named module or IE 'named - anonymous'
		if (id) {
			// id = resolvePath(id);
			// module is already required as dependancy
			if (id in registry) {
				def = registry[id];

				//if (!Promise.is(def.promise)) {
				//if (!(def instanceof PromiseES6)) {
				if (!(def.promise instanceof PromiseES6)) {
					throw new Err('Duplicate module definion: ' + id);
				}
			} else {
				def = createDef(id); //createResDef(id);
				registry[id] = def;
			}
			def.delayed = false;
			defineResource(def, args);
		} else {
			anonArgs = args;
		}
	}

	// create namespace with value of given object
	function createNamespace(module) {
		if (module && module._namespace) {
			var ns = window,
				parts = module._namespace.split('.'),
				count = parts.length - 1,
				nsName;

			for (var i = 0; i < count; i++) {
				nsName = parts[i];
				ns = ns[nsName] = ns[nsName] || {};
			}

			// hide namespace property
			Object.defineProperty(module, '_namespace', { value: module._namespace, enumerable: false, configurable: false, writable: false });

			ns[parts[count]] = module;

			// NOTE: can this be removed?
			if (window.intellisense) {
				window.intellisense.annotate(module, {});
			}
		}
		return module;
	}

	function defineClass(cnst, props, staticProps) {
		/// <summary>
		///		Defines a class using the given constructor and the specified instance members.
		/// </summary>
		/// <param name="cnst" type="Function">
		///		A constructor function that is used to instantiate this class.
		/// </param>
		/// <param name="props" type="Object" optional="true">
		///		The set of instance fields, properties, and methods made available on the class.
		/// </param>
		/// <param name="staticProps"  type="Object" optional="true">
		///		The set of static fields, properties, and methods made available on the class.
		/// </param>
		/// <returns type="Function">
		///		The newly-defined class.
		/// </returns>
		cnst = cnst || function () { };
		createProperties(cnst.prototype, props);
		createProperties(cnst, staticProps);
		return cnst;
	}

	function inheritClass(base, cnst, props, staticProps) {
		/// <summary>
		///		Defines a class using base prototype, given constructor and the specified instance members.
		/// </summary>
		/// <param name="base" type="Function">
		///		A constructor function which prototype will be used as base prototype
		/// </param>
		/// <param name="cnst" type="Function">
		///		A constructor function that is used to instantiate this class.
		/// </param>
		/// <param name="props" type="Object" optional="true">
		///		The set of instance fields, properties, and methods made available on the class.
		/// </param>
		/// <param name="staticProps"  type="Object" optional="true">
		///		The set of static fields, properties, and methods made available on the class.
		/// </param>
		/// <returns type="Function">
		///		The newly-defined class.
		/// </returns>
		cnst = cnst || function () { };
		cnst.prototype = Object.create(base.prototype);
		cnst.prototype.constructor = cnst;
		createProperties(cnst.prototype, props);
		createProperties(cnst, staticProps);
		return cnst;
	}

	var nativePromise = window.Promise && "resolve" in window.Promise && "reject" in window.Promise && "all" in window.Promise;

	// used to redirect promise resolvers once promise is settled
	function done() { }

	function isThenable(obj) {
		return (isFunction(obj) || (typeof obj === "object" && obj !== null)) && isFunction(obj.then);
	}

	// ES6 compliant promise implementation
	// reject objects must be instances of Error
	var PromiseES6 = defineClass(function PromiseES6Cnstr(executor) {
		if (!isFunction(executor)) {
			throw new TypeError('Promise constructor requires executor function');
		}
		// prepare listeners queue
		this._listeners = [];
		// fire executor
		try {
			executor(this._resolve.bind(this), this._reject.bind(this));
		} catch (exp) {
			this._reject(exp);
		}
	}, {
		_listeners: null,
		_result: null,
		_then: function (onResolve, onReject) {
			var promise = new PromiseES6(function () { });

			// register listeners
			this._listeners.push({ promise: promise, resolve: onResolve, reject: onReject });
			// always return a promise, so that operations can be chained
			return promise;
		},
		_notify: function (state) {
			var listener,
				promise,
				handler,
				result;

			// execute all registered listeners
			for (var i = 0, count = this._listeners.length; i < count; i++) {
				listener = this._listeners[i];
				promise = listener.promise;
				handler = listener[state];

				try {
					result = isFunction(handler) ? handler(this._result) : this._result;

					if (promise === result) {
						throw new TypeError("A promise callback cannot return that same promise");
					}

					// to ensure promise chaining, check if returned object is thenable
					if (isThenable(result)) {
						result.then(promise._resolve.bind(promise), promise._reject.bind(promise));
					} else {
						promise._complete(state, result);
					}
					// in case of exception in handler, reject promises down the chain
				} catch (exp) {
					promise._reject(exp);
				}
			}
			// free listeners object, to allow for new subscriptions
			this._listeners = [];
		},
		// NOTE: ES6 spec says task must be enqueued, but is not clear on micro or macro queue ?!
		_complete: function (state, val) {
			//var orgThen = this._then.bind(this);

			// replace then so it returns resolved promise
			this._then = function newThen(onResolve, onReject) {
				var promise = new PromiseES6(function () { });

				async(function (st, result, handler) {
					try {
						if (isFunction(handler[st])) {
							result = handler[st](result);
						}

						if (isThenable(result)) {
							result.then(promise._resolve.bind(promise), promise._reject.bind(promise));
						} else {
							promise._complete(st, result);
						}
					} catch (err) {
						promise._reject(err);
					}

					//promise._complete(st, result);
				}, state, this._result, { resolve: onResolve, reject: onReject });

				return promise;

				//var promise = orgThen(onResolve, onReject);

				//async(this._notify.bind(this), state);
				//return promise;
			};
			// replace complete so that promise can only be settled once!
			this._complete = done;
			// set result
			this._result = val;
			// notify all listeners
			async(this._notify.bind(this), state);
		},
		_resolve: function (val) {
			this._complete('resolve', val);
		},
		_reject: function (err) {
			this._complete('reject', err);
		},
		then: function (onResolve, onReject) {
			///<signature>
			///<summary>
			///		Observe completion of asyncornious operation
			///</summary>
			///<param name="onResolve" type="Function">
			///		Will be executed in case of succesful completion on observed operation
			///</param>
			///<returns type="Promise">Allows chaining of observed operations</returns>
			///</signature>
			///<signature>
			///<summary>
			///		Observe completion of asyncornious operation
			///</summary>
			///<param name="onResolve" type="Function">
			///		Will be executed in case of succesful completion on observed operation
			///</param>
			///<param name="onReject" type="Function">
			///		Will be executed in case of error during observed operation
			///</param>
			///<returns type="Promise">Allows chaining of observed operations</returns>
			///</signature>
			return this._then(onResolve, onReject);
		},
		'catch': function (onReject) {
			///<summary>
			///		Capture rejection within promise chain
			///</summary>
			///<param name="onReject" type="Function">
			///		Will be executed in case of rejection
			///</param>
			///<returns type="Promise">Allows chaining of monitoring operations</returns>
			return this._then(null, onReject);
		}
	}, {
		resolve: function (value) {
			///<summary>
			///		Creates directly resolved promise
			///</summary>
			///<param name="value" type="Object">
			///		Will be given as parameter to resolve handler
			///</param>
			///<returns type="Promise">Resolved promise</returns>

			// NOTE: check for thenable ???
			return new PromiseES6(function (resolve) {
				resolve(value);
			});
		},
		reject: function (error) {
			///<summary>
			///		Creates directly rejected promise
			///</summary>
			///<param name="error" type="Error">
			///		Will be given as parameter to rejected handler
			///</param>
			///<returns type="Promise">Rejected promise</returns>
			return new PromiseES6(function (resolve, reject) {
				reject(error);
			});
		},
		// old 'when'
		all: function (promises) {
			///<signature>
			///<summary>
			///		Returned promise is resolved when all promises/values in the list are resolved
			///</summary>
			///<param name="promises" type="Array" elementType="Object">
			///		Promises to observe. Non-promise objects are automatically wrapped into promises
			///</param>
			///<returns type="Promise">Resolved when all promises are resolved</returns>
			///</signature>
			///<signature>
			///<summary>
			///		Returned promise is resolved when all promises/values in the list are resolved
			///</summary>
			///<param name="promise1" type="Object" parameterArray="true">
			///		Non-promise objects are automatically wrapped into promises
			///</param>
			///<param name="promise2" type="Object" optional="true">
			///		Non-promise objects are automatically wrapped into promises
			///</param>
			///<param name="..." type="Object" optional="true">
			///		Non-promise objects are automatically wrapped into promises
			///</param>
			///<returns type="Promise">Resolved when all promises are resolved</returns>
			///</signature>

			// make sure we also accept iterated parameters
			promises = iterator(arguments);

			return new PromiseES6(function (resolve, reject) {
				var results = [], 			// returned results set
                    resolved = 0, 			// number of resolved promises
                    count; 					// promises count

				count = promises.length;

				// nothing to observe, directly resolve result promise
				if (count === 0) {
					resolve(results);
				} else {
					promises.forEach(function (promise, ind) {
						var index = ind,
                            promise = isThenable(promise) ? promise : PromiseES6.resolve(promise);

						promise.then(function (val) {
							results[index] = val;
							if (++resolved === count) {
								resolve(results);
							}
						}, reject);
					});
				}
			});
		},
		race: function (promises) {
			///<signature>
			///<summary>
			///		Returned promise is resolved when one of the promises in the list is resolved
			///</summary>
			///<param name="promises" type="Array" elementType="Object">
			///		Promises to observe. Non-promise objects are automatically wrapped into promises
			///</param>
			///<returns type="Promise">Resolved when all promises are resolved</returns>
			///</signature>
			///<signature>
			///<summary>
			///		Returned promise is resolved when all promises/values in the list are resolved
			///</summary>
			///<param name="promise1" type="Object" parameterArray="true">
			///		Non-promise objects are automatically wrapped into promises
			///</param>
			///<param name="promise2" type="Object" optional="true">
			///		Non-promise objects are automatically wrapped into promises
			///</param>
			///<param name="..." type="Object" optional="true">
			///		Non-promise objects are automatically wrapped into promises
			///</param>
			///<returns type="Promise">Resolved when of promises is resolved</returns>
			///</signature>

			// make sure we also accept iterated parameters
			promises = iterator(arguments);

			return new PromiseES6(function (resolve, reject) {
				var promise;

				for (var i = 0, count = promises.length; i < count; i++) {
					promise = promises[i];

					if (isThenable(promise)) {
						promise.then(resolve, reject);
					} else {
						resolve(promise);
					}
				}
			});
		}
	});

	if (!nativePromise) {
		window.Promise = PromiseES6;
	}

	// flexbox module testing
	// BoxDirection checks for old Flexbox spec and FlexAlign for new one
	if (!hasCssProps('BoxDirection', 'FlexBasis', 'FlexAlign')) {
		document.documentElement.className += ' noflex';
		loadStyle('dragon/css/noflex.css');
	}

	// turn DomContentLoaded into Promise
	var domReady = new PromiseES6(function (resolve) {
		document.addEventListener('DOMContentLoaded', resolve, false);
	});

	// wait for components to load in order to allow processing
	dragon._componentsLoaded = new PromiseES6(function (resolve, reject) {
		preload = cfg.bundleModules ? new Promise(function (resolve, reject) {
			domReady.then(function () {
				Promise.all([loadDocument(cfg.bundleTemplates), loadScript(cfg.bundleModules)]).then(function (res) {
					Dragon.config.templates = res[0];
					resolve();
				}, reject);
			});
		}) : resolveDeps(cfg.preload, domReady);

		preload.then(function () {
			var compLinks = document.querySelectorAll('link[rel=component]'),
                components = cfg.components || [];

			upgradeTemplates(document);

			for (var i = 0, count = compLinks.length; i < count; i++) {
				components.push(compLinks[i].getAttribute('href'));
			}

			// we have no real roots so use registry as starting point
			if (cfg.bundleModules) {
				var keys = Object.keys(registry),
					key;

				for (var i = 0, count = keys.length; i < count; i++) {
					key = keys[i];
					// [DD] this check seems bit artificial
					if (key.indexOf('components') >= 0) {
						components.push(key);
					}
				}
			}

			resolveDeps(components, true).then(resolve, reject);
		}, reject);
	});

	// used for flushing task queues
	function flush(queue) {
		while (queue.length) {
			queue.shift()();
		}
	}

	var nextMicro = (function () {
		var observer = window.MutationObserver || window.WebKitMutationObserver;

		if (observer) { // we can use MutationObserver
			var toggle = 1,
                microQueue = [],
                watched = document.createTextNode('');

			new observer(function () {
				flush(microQueue);
			}).observe(watched, { characterData: true });

			return function nextMicro(fn) {
				toggle = -toggle;
				watched.data = toggle;
				microQueue.push(fn);
			};
		}

		// IE and some old mobile
		return function nextMicro(fn) {
			setTimeout(fn, 0);
		};
	})();

	var nextMacro = (function () {
		var MSG_PREFIX = 'next-macro', macroQueue = [];

		if (window.setImmediate) {      // IE10+
			return function nextMacro(fn) {
				return setImmediate(fn);
			};
		}

		function macroFlush() {
			var tasks = macroQueue;

			// free the queue to further tasks
			macroQueue = [];

			while (tasks.length) {
				tasks.shift()();
			}
		}

		// use postMessage
		window.addEventListener('message', function (evt) {
			if ((evt.source === window || evt.source === null) && evt.data === MSG_PREFIX) {
				var tasks = macroQueue;

				evt.stopPropagation();

				macroFlush();

				//flush(macroQueue);
			}
		}, true);

		return function nextMacro(fn) {
			macroQueue.push(fn);
			if (macroQueue.length == 1) {
				window.postMessage(MSG_PREFIX, '*');
			}
		};
	})();

	// function to invoke, where 'this' is bind to context
	function wrap(fn, args) {
		return function () {
			(this[fn] || fn).apply(this, args);
		}.bind(this);
	}

	function iterator(args, index) {
		var index = index || 0,
            result = args[index];

		return Array.isArray(result) ? result : Array.prototype.slice.call(args, index);
	}

	function asap(fn) {
		nextMicro(wrap(fn, iterator(arguments, 1)));
	}

	function async(fn) {
		nextMacro(wrap(fn, iterator(arguments, 1)));
	}

	Dragon.viewModels = {};

	function VM() {
		defineModule.apply(this, arguments);
	}

	function loadVM(url) {
		return new Promise(function (resolve, reject) {
			require('router' + url).then(function (vm) {
				Dragon.viewModels[url] = vm;
				resolve(vm);
			});
		});
	}

	function loadView(url) {
		return loadDocument(resolvePath('router' + url) + '.html');
	}

	// expose public API
	createProperties(dragon, {
		define: defineClass,
		inherit: inheritClass,
		// extend object with additional properties
		extend: createProperties,
		// tries to mimic Harmony modules
		module: defineModule,
		viewModel: VM,
		loadViewModel: loadVM,
		loadView: loadView,
		// tries to mimic Harmony import
		use: require,
		// mainstay for making remote calls
		xhr: xhr,
		// NOTE: how to handle intellisense here?
		config: cfg,
		// deferred script loader
		loadScript: loadScript,
		// yield execution until next microtask
		asap: asap,
		// yield execution until next macro queue event
		async: async,
		// some general purpose methods
		isType: isType,
		// parse for specific 'json-like' string attribute
		getOptions: getOptions,
		// check for specific css property support
		hasCssProps: hasCssProps,
		// our custom error class
		Error: Err,
		resolvePathMap: resolvePathMap,
		isFragment: isFragment,
	});
})(window.Dragon = window.Dragon || {});

// NOTES(Draganov) :
// - check if waitFor can be removed along with Promise.all usage
// - can we change preload in a way that in direct code namespaces are already resolved

/* Evolution notes:

- classlist API is supported on all browsers in our list
- dom module, some methods should be deprecated
	- getElementsByClassName (supported on all browsers)
	- find (use querySelector instead)
	- getDataAttribute/dataset (obsolete, supported in all browsers)
	- append (is this really needed?)
	- parseHTML (should not be used anyway)
	- text (obsolete, supported by all browsers)
	- shadowHost (use parent routine instead)

- event
	- should remove support for IE8-9
	- addHandle/removeHandle (obsolete, use addEventListener)

- should consider some ES6/ES7 constructs
	- fetch



*/