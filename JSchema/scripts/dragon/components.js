Dragon.module(['./template', './domobserver', './shadowdom', './lang', './classlist', './dom', './event', './validation', './security', './sort', 'dragon/components.html'], function (Template, Observer, Shadow, Lang, CL, Dom, Evt, Validation, Security, Sort, doc) {
	var ready = false,
		registry = [],
		cssCommentRe = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//gim,
		cssUrlRe = /(url\()([^)]*)(\))/g,
		origCreateElement = document.createElement.bind(document),
        origCloneNode = typeof Node !== "undefined" ? Node.prototype.cloneNode : Element.prototype.cloneNode,
		head = document.querySelector('head'),
		componentsStyle = doc.querySelector('template').content.querySelector('style');

	// fix component css url paths
	componentsStyle.textContent = fixCssPaths(doc, componentsStyle);

	// insert components css as first in head
	head.insertBefore(componentsStyle, head.firstChild);

	function appendStyle(cDoc) {
		var style = cDoc.querySelector('template').content.querySelector('style'),
    		cssText = fixCssPaths(cDoc, style);

		componentsStyle.appendChild(document.createTextNode(cssText));
		style.parentNode.removeChild(style);
	}

	// fix relative paths to absolute before moving to main document
	function fixCssPaths(cDoc, stl) {
		// we are bundled so paths are already fixed
		if (cDoc.nodeType == 1) {
			return stl.textContent;
		}

		var cssText = stl.textContent.replace(cssCommentRe, ''),
			ref = cDoc.createElement('a');

		return cssText.replace(cssUrlRe, function (match, start, url, end) {
			var urlPath = url.replace(/["']/g, '');

			ref.href = urlPath;
			urlPath = ref.href;
			return start + '\'' + urlPath + '\'' + end;
		});
	}

	// polyfill setPrototypeOf if missing
	Object.setPrototypeOf = Object.setPrototypeOf || function (obj, proto) {
		if (Object.__proto__) {
			obj.__proto__ = proto;
		} else { // IE9-10
			var keys = Object.keys(proto),
                key,
                desc;

			for (var i = 0, count = keys.length; i < count; i++) {
				key = keys[i];
				desc = Object.getOwnPropertyDescriptor(proto, key);

				if (desc)
					Object.defineProperty(obj, key, desc);
				else
					obj[key] = proto[key];
			}
		}

		return obj;
	};

	Node.prototype.cloneNode = function (full) {
		var clone = origCloneNode.call(this, full);

		transferCloneInfo(this, clone);

		cloneComponentsInfo(this, clone);

		return clone;
	};

	function cloneComponentsInfo(orig, clone) {
		var origEl = getFirstElement(orig),
	        cloneEl = getFirstElement(clone);

		while (origEl) {
			transferCloneInfo(origEl, cloneEl);

			cloneComponentsInfo(origEl, cloneEl);

			origEl = getNextElement(origEl);
			cloneEl = getNextElement(cloneEl);
		}
	}

	function transferCloneInfo(orig, clone) {
		if (orig._componentReady && orig.ctrl) {
			clone._componentReady = orig._componentReady;
			clone.ctrl = JSON.parse(JSON.stringify(orig.ctrl));
		}
	}

	function register(name, properties, extend) {
		if (!isCustom(name)) {
			throw new Error('All custom tags must have ' - ' in their names!');
		}

		var definition = {
			name: name,
			attributes: {}
		};

		// resolve tag and prototype chain
		resolve(definition, extend);

		// is shaodw dow used for this component
		if (properties.noshadow) {
			definition.noshadow = true;
			delete properties.noshadow;
		}

		// store component template
		if (properties.template) {
			definition.template = properties.template;
			delete properties.template;

			Shadow.shadowCss(definition);
		}

		// add own proporties to prototype or override existing ones
		for (var prop in properties) {
			addProperty(definition, prop, properties[prop]);
		}

		// add constraint validation API
		if (properties.checkValidity) {
			Validation.addApi(definition.prototype);
		}

		// wrap methods to ensure attributes syncronization
		if (!isCustom(extend)) {
			wrapMethods(definition);
		}

		// setup constructor
		definition.cnst = function () {
			return upgrade(origCreateElement(definition.tag), definition);
		};

		definition.cnst.prototype = definition.prototype;
		definition.prototype.constructor = definition.cnst;
		// place in registry
		registry[name] = definition;

		// Once components are upgraded
		if (ready) {
			upgradeAll(document, definition);
		}

		return definition.cnst;
	}

	function isCustom(name) {
		return name && name.indexOf('-') > -1;
	}

	function resolve(def, ext) {
		var elemProto = typeof HTMLElement !== "undefined" ? HTMLElement.prototype : Element.prototype,
			defProto;

		if (isCustom(ext)) {
			var base = registry[ext];

			def.tag = isCustom(base.tag) ? def.name : base.tag;
			defProto = base.prototype;
		} else {
			def.tag = ext || def.name;
			defProto = ext ? Object.create(origCreateElement(ext).constructor).prototype : elemProto;
		}

		// mark as extension type component
		if (ext) {
			def.is = def.name;
		}

		// set prototype
		def.prototype = Object.create(defProto);
		// ensure lifecycle object is not null
		def.prototype.lifecycle = defProto.lifecycle || {};
	}

	function addProperty(def, prop, desc) {
		var descriptor = { enumerable: true },
			attr = desc.attribute,
			name = attr && attr.name ? attr.name.toLowerCase() : prop,
			isBool;

		// store all attributes for syncronization
		if (attr) {
			attr.key = prop;
			def.attributes[name] = attr;
		}

		if (desc.get) {
			descriptor.get = desc.get;
		} else if (attr) { // define getter if not present
			isBool = attr.boolean;
			descriptor.get = function () {
				var val = this.getAttribute(name);

				return isBool ? this.hasAttribute(name) && val !== 'false' : val;
			};
		}

		// make sure setter synronizes attribute and resets lifecycle
		if (desc.set) {
			if (attr) {
				var setter = descriptor.set = function (value) {
					this._skipSet = true;
					if (!this._inSync)
						modifyAttribute(this, attr, name, value);

					desc.set.call(this, value);

					delete this._skipSet;
				};

				attr.setter = setter;
			} else {
				descriptor.set = desc.set;
			}
		} else if (attr) {
			descriptor.set = function (value) {
				modifyAttribute(this, attr, name, value);
			};
		}

		if (!descriptor.set && !descriptor.get) {
			descriptor.value = desc;
			descriptor.writable = true;
		}

		// add property to component prototype
		Object.defineProperty(def.prototype, prop, descriptor);
	}

	function wrapMethods(def) {
		var origCreate = def.prototype.lifecycle.created,
    		origSetAttribute = def.prototype.setAttribute,
    		origRemoveAttribute = def.prototype.removeAttribute;

		// replace created callback in order to set all attribute bound properties
		def.prototype.lifecycle.created = function () {
			var keys = Object.keys(def.attributes),
				root,
				template;

			// attach shadow tree
			if (def.template) {
				root = def.noshadow ? this : Shadow.createShadowRoot(this);
				template = def.template.content.cloneNode(true);
				//upgradeAll(template);
				processNode(template);
				root.appendChild(template);
			}

			// execute original callback
			if (origCreate) {
				origCreate.call(this);
			}

			for (var i = 0, count = keys.length; i < count; i++) {
				var name = keys[i],
			        attr = def.attributes[name];

				if (this.hasAttribute(name)) {
					var val = this.getAttribute(name);

					// we skip non resolved attributes. Those will be picked up by binding resolver later
					if (!/{{.*}}/.test(val)) {
						this[attr.key] = val;
					}
				}
			}
		};

		def.prototype.setAttribute = function (name, value) {
			var attr = def.attributes[name.toLowerCase()],
		        oldValue = this.getAttribute(name);

			if (!this._inSync) {
				origSetAttribute.call(this, name, value);
			}

			if (attr) {
				if (attr.setter && !this._skipSet) {
					this._inSync = true;
					attr.setter.call(this, value);
				}
				syncAttribute(this, attr, name, value, 'setAttribute');
			}
			delete this._inSync;
			changeAttribute(this, name, oldValue, value || null);
		};

		def.prototype.removeAttribute = function (name) {
			var attr = def.attributes[name.toLowerCase()],
    			oldValue = this.getAttribute(name);

			if (!this._inSync) {
				origRemoveAttribute.call(this, name);
			}

			if (attr) {
				if (attr.setter && !this._skipSet) {
					this._inSync = true;
					attr.setter.call(this, attr.boolean ? false : undefined);
				}
				syncAttribute(this, attr, name, undefined, 'removeAttribute');
			}
			delete this._inSync;
			changeAttribute(this, name, oldValue, null);
		};
	}

	function changeAttribute(el, name, oldVal, newVal) {
		// notify about attribute change
		if (el.lifecycle.attributeChanged) {
			el.lifecycle.attributeChanged.call(el, name, oldVal, newVal);
		}
	}

	function modifyAttribute(el, attr, name, value) {
		var remove = attr.boolean && (value === false || value == 'false'),
            modifier = remove ? 'removeAttribute' : 'setAttribute';

		el[modifier](name, value);
	}

	function syncAttribute(el, attr, name, value, method) {
		// if ShadowDom is supported, we look into shadow tree
		var nodes = [];

		if (attr.select) {
			nodes = el.shadowRoot ? el.shadowRoot.querySelectorAll(attr.select) : el.querySelectorAll(attr.select);
		}

		for (var i = 0, count = nodes.length; i < count; i++) {
			nodes[i][method](name, value);
		}
	}

	function upgrade(el, definition) {
		var is = el.getAttribute('is');

		// this is extension type component
		if (definition.is && el.tagName.toLocaleLowerCase() != definition.name.toLocaleLowerCase()) {
			el.setAttribute('is', definition.is);
			// NOTE: Dancho fix this!
			CL.add(el, definition.name);
		}

		// since we can't use scoped css yet, add name as class to prevent colisions
		if (is) {
			CL.add(el, definition.name);
		}

		el.ctrl = definition.ctrl ? JSON.parse(JSON.stringify(definition.ctrl)) : {};

		// set prototype of upgraded element
		Object.setPrototypeOf(el, definition.prototype);

		// mark element as done
		el._componentReady = true;
		// ensure subtree is processed before we initiate lifecycle
		upgradeAll(el);

		// execute lifecycle callback
		if (el.lifecycle.created) {
			el.lifecycle.created.call(el);
		}

		// upgrade nodes inserted during creation
		upgradeAll(el);

		return el;
	}

	function disableTree(root, value) {
		var el = getFirstElement(root);

		while (el) {
			//console.log('Walking element: ' + el.outerHTML);
			if ('disabled' in el) {
				//console.log('Disable element: ' + el.outerHTML);
				el.disabled = value;
			}

			if (!el._componentReady && el.nodeType == Node.ELEMENT_NODE) {
				//disableTree(el.nodeName.toLowerCase() == 'template' ? el.content : el);
				disableTree(el, value);
			}

			el = getNextElement(el);
		}
	}

	function upgradeAll(container, component) {
		var el = getFirstElement(container);

		while (el) {
			if (upgradeElement(el, component) !== true) {
				upgradeAll(el, component);
			}

			el = getNextElement(el);
		}
	}

	function getFirstElement(node) {
		var el = node.firstElementChild;

		if (!el) {
			el = node.firstChild;

			while (el && el.nodeType !== Node.ELEMENT_NODE) {
				el = el.nextSibling;
			}
		}

		return el;
	}

	function getNextElement(node) {
		var el = node.nextElementSibling;

		if (!el) {
			el = node.nextSibling;

			while (el && el.nodeType !== Node.ELEMENT_NODE) {
				el = el.nextSibling;
			}
		}

		return el;
	}

	function upgradeElement(el, comp) {
		if (el._componentReady || el.nodeType !== Node.ELEMENT_NODE) {
			return false;
		}

		var is = el.getAttribute('is'),
            tagName = el.localName, // NOTE: probably should replace localName here since it is being deprecated?
            component = registry[is || tagName];

		if (!component || (comp && comp != component) || (is && component.is && component.tag != tagName)) {
			return false;
		}

		upgrade(el, component);
		return true;
	}

	function processNode(el) {
		// handle all translation attributes
		Lang.translate(el);
		// upgrade elements and its subtree
		upgradeElement(el);
		upgradeAll(el);
		// handle all security attributes
		Security.process(el);
		// handle all sorting attributes
		Sort.process(el);
	}

	function addedNode(el) {
		processNode(el);

		// if element is added to a form, ensure its form attributes support
		if (Dom.parent(el, 'form') || el.getAttribute('name') != null) {
			Validation.upgradeNode(el);
		}

		// if inserted under disabled node, make sure it is disabled too
		if (Dom.parent(el, '[disabled]')) {
			if ('disabled' in el) {
				el.disabled = true;
			}

			disableTree(el);
		}

		// execute lifecycle callback
		if (el._componentReady && el.lifecycle.enteredView) {
			el.lifecycle.enteredView.call(el);
		}
	}

	function removedNode(el) {
		// execute lifecycle callback
		if (el._componentReady && el.lifecycle.leftView) {
			el.lifecycle.leftView.call(el);
		}
	}

	document.createElement = function (tag, typeExtension) {
		var component = registry[typeExtension || tag];

		if (component) {
			return new component.cnst();
		}

		return origCreateElement(tag);
	};

	// this is main entry point for components upgrade
	Promise.all([Dragon._componentsLoaded, Lang._loaded]).then(function () {
		Lang.translate(document.documentElement);

		upgradeAll(document);

		//observe document for any mutations to catch dynamic inserted elements
		Observer.observe(document, addedNode, removedNode);

		// NOTE: here we may need to sync with observer polyfill
		Dragon.asap(function () {
			// static upgrade is done
			ready = true;
			// send out ready event
			Evt.raise(document, 'ComponentsReady');
		});
	});

	function setText(el, key, params) {
		Dom.empty(el);
		el.appendChild(Lang.textNode(key, params));
	}

	return {
		register: register,
		text: Lang.text,
		setText: setText,
		checkAccess: Security.checkAccess,
		checkPermission: Security.checkPermission,
		setUserPermissions: Security.setUserPermissions,
		disable: disableTree,
		appendStyle: appendStyle,
		_namespace: 'Dragon.Components'
	};
});

//TODO We must override cloneNode so custom element properties survive during cloning also if attribute binding with set and get is working!!!!!
//TODO started on clone node just need to transfer attributes from old to new prtotype
//TODO when element is added curently we only process child nodes we must also process container 
//TODO make components inheritance work -change wrap method to wrap only the last set/get Attribute and use chain for create/entered view/left view 
//TODO set definition.is property when extending custom elements
