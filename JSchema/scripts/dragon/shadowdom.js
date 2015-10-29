Dragon.module(['./dom', './shadowcss', './weakmap', './event'], function (Dom, ShadowCss, WM) {
	var elemProto = typeof HTMLElement !== "undefined" ? HTMLElement.prototype : Element.prototype,
		nativeShadow = testNativeShadow();

	var ShadowRoot = Dragon.inherit(typeof DocumentFragment !== "undefined" ? DocumentFragment : Element, function (host) {
		this.host = host;
		this.host.origQuerySelectorAll = this.host.querySelectorAll;
		this.host.origQuerySelector = this.host.querySelector;
		
		this._appendChild = this.host.appendChild;
		this._replaceChild = this.host.replaceChild;
		this._insertBefore = this.host.insertBefore;
		this._removeChild = this.host.removeChild;
			
		this.shadowFrag = null;
		this.insertionPoints = [];
		this.hostChildrenList = [];
		this.notDistributedChildren = document.createDocumentFragment();
	}, {
		appendChild: function (node) {
		    this.shadowFrag = node;

		    this._processFragmentInsertionPoints(this.shadowFrag, this.host);

			for (var i = 0, count = this.host.childNodes.length; i < count; i++) {
				this.hostChildrenList.push({ node: this.host.childNodes[i], insertion: null });

				shadows.set(this.host.childNodes[i], this);
			}
			
			this._distributeChildren();

			while (this.host.firstChild)
				this.notDistributedChildren.appendChild(this.host.firstChild);

			this._init();
		},

		querySelectorAll: function (selector) {
			return this.host.querySelectorAll(selector);
		},

		querySelector: function (selector) {
			return this.host.querySelector(selector);
		},

		_processInsertionPoints: function (node, parentNode) {
		    if( !isFragment (node) )
		        shadows.set (node, this);

		    if( node.tagName && node.tagName.toUpperCase () === 'CONTENT' )
		        this.insertionPoints.push(new InsertionNode(node, node.nextSibling, parentNode || node.parentNode));

		    for( var i = 0, count = node.childNodes.length; i < count; i++ )
		        this._processInsertionPoints (node.childNodes[i]);
		},

		_processFragmentInsertionPoints: function (node, parentNode) {
		    if( !isFragment (node) ) {
		        this._processInsertionPoints (node);
		        return;
		    }

            for (var i = 0, count = node.childNodes.length; i < count; i++)
		        this._processInsertionPoints(node.childNodes[i], parentNode);
		},

		_distributeChildren: function () {
			for (var i = 0, count = this.insertionPoints.length; i < count; i++) {
				var insertion = this.insertionPoints[i],
					childs,
					length;

				if (insertion.node.hasAttribute('select'))
					childs = this.host.querySelectorAll(insertion.node.getAttribute('select'));
				else
					childs = this.host.childNodes;

				length = childs.length;

				for (var index = 0; index < childs.length; index++) {
					if (childs[index].parentNode != this.host)
						continue;

					this._findChild(childs[index]).child.insertion = insertion;

					insertion.distibuteChild(childs[index]);

					if (length != childs.length)
						index--;
				}

				this.insertionPoints[i].render();
			}
		},

		_init: function () {
		    this.host.appendChild(this.shadowFrag);

		    this.host.appendChild = function (child) {
				if( !isFragment (child) )
					return this.shadowRoot._appendHostChild (child);

				//TODO optimize this
				for (var i = 0, count = child.childNodes.length; i < count; i++) {
					if( !child.childNodes[i] )
						continue;

					this.shadowRoot._appendHostChild(child.childNodes[i]);
					i--;
				}
				
				return child;
			};

			this.host.replaceChild = function (child, refChild) {
				if (!isFragment(child))
					return this.shadowRoot._replaceHostChild(child, refChild);

				//TODO optimize this
				if (child.childNodes.length != 0) {
					for( var i = 0, count = child.childNodes.length - 1; i < count; i++ ) {
						if (!child.childNodes[i] || child.childNodes.length == 1)
							continue;

						this.shadowRoot._insertBeforeHostChild(child.childNodes[i], refChild);
						i--;
					}

					this.shadowRoot._replaceHostChild (child.childNodes[child.childNodes.length - 1], refChild);
				}

				return refChild;
			};

			this.host.insertBefore = function (child, refChild) {
				if (!isFragment(child))
					return this.shadowRoot._insertBeforeHostChild(child, refChild);

				//TODO optimize this
				for( var i = 0, count = child.childNodes.length; i < count; i++ ) {
					if( !child.childNodes[i] )
						continue;

					this.shadowRoot._insertBeforeHostChild(child.childNodes[i], refChild);
					i--;
				}

				return child;
			};

			this.host.removeChild = function (child) {
				this.shadowRoot._removeHostChild(child);
			};

			this.host.querySelectorAll = function (selector) {
				return combineNodeLists(this.origQuerySelectorAll.call(this, selector), this.shadowRoot.notDistributedChildren.querySelectorAll(selector));
			};

			this.host.querySelector = function (selector) {
				var result = this.origQuerySelector.call(this, selector);

				if (result)
					return result;

				return this.shadowRoot.notDistributedChildren.querySelector(selector);
			};

			Object.defineProperty(this.host, 'firstChild', {
				get: function () {
					if (this.shadowRoot.hostChildrenList.length > 0)
						return this.shadowRoot.hostChildrenList[0];

					return this.shadowRoot.notDistributedChildren.firstChild;
				}
			});
		},

		_appendHostChild: function (child) {
			var insertion = this._findInsertion(child),
				obj = { node: child, insertion: null };

			this.hostChildrenList.push(obj);

			if (insertion) {
				insertion.appendDistributedChild(child);
				obj.insertion = insertion;
			} else
				this.notDistributedChildren.appendChild(child);

			shadows.set(child, this);

			return child;
		},

		_removeHostChild: function (child) {
			var obj = this._findChild(child),
				childInfo;

			if (!obj)
				throw new Error('Node was not found');

			childInfo = obj.child;

			if (!childInfo.insertion)
				this.notDistributedChildren.removeChild(child);
			else
				childInfo.insertion.removeDistributedChild(child);

			this.hostChildrenList.splice(obj.index, 1);

			shadows.delete(child);

			return child;
		},

		_replaceHostChild: function (child, refChild) {
			var insertion = this._findInsertion (child),
				obj = this._findChild (refChild),
				childInfo;

			if (!obj)
				throw new Error('Node was not found');

			childInfo = obj.child;

			this.hostChildrenList.splice(obj.index, 1, { node: child, insertion: insertion });

			shadows.delete(refChild);

			shadows.set(child, this);

			if (!insertion) {
				if (childInfo.insertion)
					childInfo.insertion.removeDistributedChild(refChild);

				if (this.notDistributedChildren.contains(refChild))
					this.notDistributedChildren.replaceChild(child, refChild);
				else
					this.notDistributedChildren.appendChild(child);
			} else {
				if (insertion == childInfo.insertion)
					insertion.replaceDistributedChild(child, refChild);
				else {

					if (childInfo.insertion)
						childInfo.insertion.removeDistributedChild(refChild);
					else
						this.notDistributedChildren.removeChild(refChild);

					var lastChild = this._findLastChildInInsertion(obj.index, insertion);

					if (lastChild)
						insertion.insertAfterDistributedChild(child, lastChild.node);
					else
						insertion.insertFirstDistributedChild(child);
				}
			}

			return refChild;
		},

		_insertBeforeHostChild: function (child, refChild) {
			var insertion = this._findInsertion(child),
				obj = this._findChild(refChild),
				childInfo;

			if (!obj)
				throw new Error('Node was not found');

			childInfo = obj.child;

			this.hostChildrenList.splice(obj.index, 0, { node: child, insertion: insertion });

			shadows.set(child, this);

			if (!insertion) {
				if (childInfo.insertion)
					childInfo.insertion.removeDistributedChild(childInfo.node);

				if (this.notDistributedChildren.contains(refChild))
					this.notDistributedChildren.insertBefore(child, refChild);
				else
					this.notDistributedChildren.appendChild(child);

				return child;
			}

			if (insertion == childInfo.insertion)
				insertion.insertBeforeDistributedChild(child, refChild);
			else {
				var lastChild = this._findLastChildInInsertion(obj.index, insertion);

				if (lastChild)
					insertion.insertAfterDistributedChild(child, lastChild.node);
				else
					insertion.insertFirstDistributedChild(child);
			}

			return child;
		},

		_findInsertion: function (child) {
			for (var i = 0, count = this.insertionPoints.length; i < count; i++) {
				var insertion = this.insertionPoints[i],
					match;

				if (insertion.node.hasAttribute('select'))
					match = Dom.matches(child, insertion.node.getAttribute('select'));
				else
					match = true;

				if (match)
					return insertion;
			}

			return null;
		},

		_findChild: function (node) {
			for (var i = 0, count = this.hostChildrenList.length; i < count; i++) {
				var child = this.hostChildrenList[i];

				if (child.node != node)
					continue;

				return { child: child, index: i };
			}

			return null;
		},

		_findLastChildInInsertion: function (index, insertion) {
			var res = null;

			for (var i = 0; i < index; i++) {
				var child = this.hostChildrenList[i];

				if (child.insertion != insertion)
					continue;

				res = child;
			}

			return res;
		}
	});

	var InsertionNode = Dragon.define(function (node, refNode, parentNode) {
		this.node = node;
		this.refNode = refNode;
		this.parentNode = parentNode;
		this.defaultContent = [];
		this.distributeChildren = [];

		while (node.firstChild) {
			this.defaultContent.push(node.firstChild);

			node.removeChild(node.firstChild);
		}
	}, {
		distibuteChild: function (node) {
			this.distributeChildren.push(node);
		},

		render: function () {
			var childs;

			if (this.distributeChildren.length == 0)
				childs = this.defaultContent;
			else
				childs = this.distributeChildren;

			for (var i = 0, count = childs.length; i < count; i++)
			    this.node.parentNode.insertBefore(childs[i], this.node);

			this.node.parentNode.removeChild(this.node);
		},

		appendDistributedChild: function (child) {
			if (this.distributeChildren.length == 0)
				this.clearDefaultContent();

			this.appendChild(child);

			this.distibuteChild(child);
		},

		removeDistributedChild: function (child) {
			var index = this.childIndex(child);

			if (index < 0)
				throw new Error('Node was not found in insertion');

			this.distributeChildren.splice(index, 1);
			this.execFunction(this.parentNode, 'removeChild', child);

			if (this.distributeChildren.length == 0) {
				var frag = document.createDocumentFragment();

				for (var i = 0, count = this.defaultContent.length; i < count; i++)
					frag.appendChild(this.defaultContent[i]);

				this.appendChild(frag);
			}
		},

		replaceDistributedChild: function (child, refChild) {
			var index = this.childIndex(refChild);

			if (index < 0)
				throw new Error('Node was not found in insertion');

			this.distributeChildren.splice(index, 1, child);

			this.execFunction(refChild.parentNode, 'replaceChild', child, refChild);
		},

		insertAfterDistributedChild: function (child, refChild) {
			var index = this.childIndex(refChild);

			if (index < 0)
				throw new Error('Node was not found in insertion');

			this.distributeChildren.splice(index + 1, 0, child);

			this.execFunction(refChild.parentNode, 'insertBefore', child, refChild.nextSibling);
		},

		insertFirstDistributedChild: function (child) {
			if (this.distributeChildren.length == 0)
				this.clearDefaultContent();

			if (this.distributeChildren.length == 0)
				this.appendChild(child);
			else
			    this.execFunction(this.parentNode, 'insertBefore', child, this.distributeChildren[0]);

			this.distributeChildren.splice(0, 0, child);
		},

		insertBeforeDistributedChild: function (child, refChild) {
			var index = this.childIndex(refChild);

			if (index < 0)
				return;

			this.distributeChildren.splice(index, 0, child);

			this.execFunction(this.parentNode, 'insertBefore', child, refChild);
		},

		childIndex: function (child) {
			for (var i = 0, count = this.distributeChildren.length; i < count; i++)
				if (this.distributeChildren[i] == child)
					return i;

			return -1;
		},

		appendChild: function (child) {
		    if( this.distributeChildren.length == 0 ) {
		        if( this.refNode )
		            this.execFunction(this.refNode.parentNode, 'insertBefore', child, this.refNode);
		        else
		            this.execFunction(this.parentNode, 'appendChild', child);

		    } else
		        this.execFunction(this.parentNode, 'insertBefore', child, this.distributeChildren[this.distributeChildren.length - 1].nextSibling);
		},

		execFunction: function (node, name) {
		    var args = Array.prototype.slice.call(arguments).splice(2);

		    if (node.shadowRoot && node.shadowRoot['_' + name])
		        node.shadowRoot['_' + name].apply(node, args);
		    else
		        node[name].apply(node, args);
		},

		clearDefaultContent: function () {
			for (var i = 0, count = this.defaultContent.length; i < count; i++) {
				var childNode = this.defaultContent[i];

				childNode.parentNode.removeChild(childNode);
			}
		}
	});

	function testNativeShadow() {
		if (Dragon.config.suppressNativeShadow)
			return null;

		var nativeCnstr = exists(elemProto, ['webkitCreateShadowRoot', 'mozCreateShadowRoot', 'createShadowRoot']),
			div,
			root,
			template,
			support;

		if (!nativeCnstr)
			return null;

		div = document.createElement('div');
		div.style.opacity = 0;
		div.style.height = 0;

		root = nativeCnstr.call(div);
		template = document.createElement('template');
		template.innerHTML = '<style>:host{ width: 50px; }</style><content></content>';

		root.appendChild(template.content.cloneNode(true));

		document.body.appendChild(div);

		support = div.clientWidth == 50;

		div.parentNode.removeChild(div);

		return support ? nativeCnstr : null;
	}

	function exists(prototype, propertyNames) {
		for (var i = 0; i < propertyNames.length; i++) {
			if (propertyNames[i] in prototype)
				return prototype[propertyNames[i]];
		}

		return null;
	}

	function combineNodeLists(lists) {
		var listsArr = Array.prototype.slice.call(arguments),
			res = [];

		for (var i = 0, count = listsArr.length; i < count; i++)
			for (var j = 0, length = listsArr[i].length; j < length; j++)
				res.push(listsArr[i][j]);

		return res;
	}

	function isFragment (node) {
		if (typeof DocumentFragment !== 'undefined')
			return node instanceof DocumentFragment;
		else
			return node instanceof Element;
	}





    ///
	///Event retargeting
	///
	var origAddEvent = Dragon.Event.add,
		origRemoveEvent = Dragon.Event.remove,
		origAddHandle = Dragon.Event.addHandle,
		origRemoveHandle = Dragon.Event.removeHandle,
		listenersMap = new WM (),
		shadows = new WM (),
		globalListeners = {},
		eventConstructors = new WM (),
		stoppedEvents = ['abort', 'error', 'select', 'change', 'load', 'reset', 'resize', 'scroll', 'selectstart'],
		EVENT_CAPTURING_PHASE = 1,
		EVENT_AT_TARGET = 2,
		EVENT_BUBBLING_PHASE = 3;

    if( !nativeShadow ) {
        Dragon.Event.add = function (el, type, fn, capture) {
            if (!el.addEventListener) { //no retargeting is needed for javascript objects
                origAddEvent.call(window, el, type, fn, capture);
                return;
            }

            addListener(el, type, {
                fn: fn,
                capture: capture
            });
        };

        Dragon.Event.remove = function (el, type, fn, capture) {
            if (!el.addEventListener) { //no retargeting is needed for javascript objects
                origRemoveEvent.call(window, el, type, fn, capture);
                return;
            }

            removeListener(el, type, {
                fn: fn,
                capture: capture
            });
        };

        Dragon.Event.addHandle = function (el, type, obj) {
            if (!el.addEventListener) { //no retargeting is needed for javascript objects
                origAddHandle.call(window, el, type, obj);
                return;
            }

            addListener(el, type, {
                handle: obj
            });
        };

        Dragon.Event.removeHandle = function (el, type, obj) {
            if (!el.addEventListener) { //no retargeting is needed for javascript objects
                origRemoveHandle.call(window, el, type, obj);
                return;
            }

            removeListener(el, type, {
                handle: obj
            });
        };
    }
  
	function addListener (el, type, obj) {
		var listeners = listenersMap.get (el);

		if( !listeners ) {
			listeners = {};
			listenersMap.set (el, listeners);
		}

		if( !listeners.hasOwnProperty(type) )
			listeners[type] = [];

		listeners[type].push(obj);

		if (!globalListeners.hasOwnProperty(type))
			globalListeners[type] = 1;
		else
			globalListeners[type]++;

		if (globalListeners[type] == 1)
			origAddEvent.call(window, document, type, dispatchEvent, true);
	}

	function removeListener (el, type, obj) {
		var listeners = listenersMap.get (el),
			found = false;

		if( !listeners )
			return;

		if (!listeners.hasOwnProperty(type))
			return;

		for (var i = 0, count = listeners[type].length; i < count; i++) {
			var listener = listeners[type][i];

			if( obj.handle !== listener.handle || obj.fn !== listener.fn || obj.capture !== listener.capture )
				continue;

			listeners[type].splice(i, 1);
			found = true;
			break;
		}

		if( !found )
			return;

		if( !globalListeners.hasOwnProperty (type) )
			return;
		else
			globalListeners[type]--;

		if( globalListeners[type] == 0 ) {
			origRemoveEvent.call(window, document, type, dispatchEvent, true);

			delete globalListeners[type];
		}
	}

	function dispatchEvent(event) {
		var origTarget = event.target,
			wrapper = getEventWrapper (event),
			eventPath = calculateEventPath(origTarget, event.type);

		wrapper._origTarget = event.target;

		if( !dispatchCapturing (wrapper, eventPath) )
			if (!dispatchAtTarget(wrapper))
				dispatchBubbling(wrapper, eventPath);

		return event.defaultPrevented;
	}

	function calculateEventPath (node, type) {
		var path = [], // 1
			current = node,// 2
			shadow,
			child;

		path.push (node); //3

		while( current ) { // 4
			shadow = shadows.get (current);
			child = shadow ? shadow._findChild (current) : null;

			if (child && child.child.insertion) { // 4.1 
				// we have only single insertion point in destination insertion points collection and it cannot be shadow insertion point
				current = shadow.host;

				path.push (current);
			} else { // 4.2
				if( current.parentNode && current.parentNode.shadowRoot && stoppedEvents.indexOf (type) >= 0 ) // 4.2.1 // 4.2.1.1
					break;

				current = current.parentNode; // 4.2.2.1  // 4.2.1.2

				if( current )
					path.push (current); // 4.2.2.2 // 4.2.1.3
			}
		}

		return path;
	}

	function dispatchCapturing (event, eventPath) {
		for (var i = eventPath.length - 1; i > 0; i--) {
			var listeners = getListeners(eventPath[i], event.type, EVENT_CAPTURING_PHASE);

			if (listeners.length == 0)
				continue;

			if( !modifyEvent (event, eventPath[i], EVENT_CAPTURING_PHASE) )
				continue;
			
			if( event._origTarget === event.currentTarget )
				continue;

			executeListeners(listeners, event);

			if (event._propagationStopped)
				break;
		}

		return event._propagationStopped;
	}

	function dispatchAtTarget(event) {
		
		var listeners = getListeners(event._origTarget, event.type, EVENT_AT_TARGET);

		if (listeners.length == 0)
			return false;

		if( !modifyEvent (event, event._origTarget, EVENT_AT_TARGET, event._origTarget) )
			return false;

		executeListeners(listeners, event);

		return event._propagationStopped;
	}

	function dispatchBubbling (event, eventPath) {
		if( event.bubbles === false )
			return;

		for (var i = 1; i < eventPath.length; i++) {
			var listeners = getListeners(eventPath[i], event.type, EVENT_BUBBLING_PHASE);

			if (listeners.length == 0)
				continue;

			if( !modifyEvent (event, eventPath[i], EVENT_BUBBLING_PHASE) )
				continue;

			executeListeners(listeners, event);

			if( event._propagationStopped )
				return;
		}
	}

	function retarget (currnetTarget, originalTarget) {
		//In our simple case with no nested shadow dom trees if target is part of light dom tree it never changes
		//when target is part of shadow dom at shadow host we change target to host
		var shadow = shadows.get (originalTarget);

		if( shadow ) {
			if( shadow._findChild (originalTarget) )
				return originalTarget;

			if (shadow.host.contains(currnetTarget) && shadow.host != currnetTarget)
				return originalTarget;

			return shadow.host;
		}

		return originalTarget;
	}

	function retargetRelated(currentTarget, relatedTarget, type) {
		var shadow = shadows.get(relatedTarget);

		if( !shadow )
			return relatedTarget;//Normal Events no need to change

		var relatedTargetPath = calculateEventPath (relatedTarget, type),
			node = currentTarget.parentNode;

		while( node ) {
			for( var i = 0, count = relatedTargetPath.length; i < count; i++ ) {
				if( node.contains (relatedTargetPath[i]) )
					return relatedTargetPath[i];
			}

			node = node.parentNode;
		}

		return null;
	}

	function modifyEvent(event, curentTarget, phase, traget) {
		event._currentTarget = curentTarget;
		event._target = traget || retarget(curentTarget, event._origTarget);
		event._eventPhase = phase;

		if( event.hasOwnProperty ('relatedTarget') ) {
			event._relatedTarget = retargetRelated (event.currentTarget, event.relatedTarget, event.type);

			if( event.relatedTarget == event.target )
				return false;
		}

		if( event.hasOwnProperty ('offsetX') && event.hasOwnProperty ('offsetY') ) {
			var rect = target.getBoundingClientRect ();

			//TODO here get position witout border and margin
			event.offsetX = rect.left;
			event.offsetY = rect.top;
		}

		return true;
	}

	function executeListeners(listeners, event) {
		for( var i = 0, count = listeners.length; i < count; i++ ) {
			var listener = listeners[i];

			try {
				if( listener.handle )
					listener.handle.handleEvent (event);
				else
					listener.fn.call (event.currentTarget, event);

				if( event.immediatePropagationStopped )
					return;

			} catch( exception ) {
				console.error (exception, exception.stack);
			}
		}
	}

	function getListeners (target, type, phase) {
		var listeners = listenersMap.get(target),
			res = [];

		if( !listeners || !listeners.hasOwnProperty (type) )
			return res;

		for( var i = 0, count = listeners[type].length; i < count; i++ ) {
			var listener = listeners[type][i];

			if( ( !listener.capture && phase === EVENT_CAPTURING_PHASE ) || ( listener.capture && phase === EVENT_BUBBLING_PHASE ) )
				continue;

			res.push (listener);
		}

		return res;
	}

	//
	//Event wrapping
	//
	var OriginalEvent = window.Event,
		supportsEventConstructors = false,
		relatedTargetProto = {
			get relatedTarget() {
				return this._relatedTarget || this._origEvent.relatedTarget;
			}
		},
		mouseEventProto = mixin({
			initMouseEvent: getInitFunction('initMouseEvent', 14)
		}, relatedTargetProto),

		focusEventProto = mixin({
			initFocusEvent: getInitFunction('initFocusEvent', 5)
		}, relatedTargetProto),
		EventInitDictionary = {
			"Event": {
				bubbles: false,
				cancelable: false
			},
			"CustomEvent": {
				bubbles: false,
				cancelable: false,
				detail: null
			},
			"UIEvent": {
				bubbles: false,
				cancelable: false,
				view: null,
				detail: 0
			},
			"MouseEvent": {
				bubbles: false,
				cancelable: false,
				view: null,
				detail: 0,
				screenX: 0,
				screenY: 0,
				clientX: 0,
				clientY: 0,
				ctrlKey: false,
				altKey: false,
				shiftKey: false,
				metaKey: false,
				button: 0,
				relatedTarget: null
			},
			"FocusEvent": {
				bubbles: false,
				cancelable: false,
				view: null,
				detail: 0,
				relatedTarget: null
			}
		};

	function Event(type, options) {
		if (type instanceof OriginalEvent)
			this._origEvent = type;
		else
			return constructEvent(OriginalEvent, 'Event', type, options);
	}

	Event.prototype = {
		get target() {
			return this._target || this._origEvent.target;
		},
		get currentTarget() {
			return this._currentTarget || this._origEvent.currentTarget;
		},
		get eventPhase() {
			return this._eventPhase || this._origEvent.eventPhase;
		},
		stopPropagation: function () {
			this._propagationStopped = true;

			return this._origEvent.stopPropagation();
		},
		stopImmediatePropagation: function () {
			this._immediatePropagationStopped = true;
			this._propagationStopped = this._immediatePropagationStopped;

			return this._origEvent.stopImmediatePropagation();
		}
	};

	try {
		new window.MouseEvent('click');

		supportsEventConstructors = true;
	} catch (ex) {
		supportsEventConstructors = false;
	}

	registerEventWrapper(OriginalEvent, Event, document.createEvent('Event'));

	var UIEvent = registerGenericEvent('UIEvent', Event),
		CustomEvent = registerGenericEvent('CustomEvent', Event),
		MouseEvent = registerGenericEvent('MouseEvent', UIEvent, mouseEventProto),
		FocusEvent = registerGenericEvent('FocusEvent', UIEvent, focusEventProto);

	function getEventWrapper(event) {
		return new ( getEventConstructor (event) ) (event);
	}

	function getEventConstructor (event) {
		var prototype = event.__proto__ || Object.getPrototypeOf (event),
			constructor = eventConstructors.get (prototype),
			baseConstructor;

		if( constructor )
			return constructor;

		baseConstructor = getEventConstructor (prototype);

		constructor = createEventConstructor (baseConstructor);

		registerConstructor(prototype, constructor, event);

		return constructor;
	}

	function createEventConstructor (base) {
		function Constructor (event) {
			base.call (this, event);
		}

		Constructor.prototype = Object.create (base.prototype);
		Constructor.prototype.constructor = Constructor;

		return Constructor;
	}

	function registerConstructor (prototype, constructor, instance) {
		var proto = constructor.prototype;

		eventConstructors.set (prototype, constructor);

		addStaticProperties(prototype, proto);

		if( instance )
			addInstanceProperties(proto, instance);
	}

	function addStaticProperties ( prototype, wrapperProto) {
		transferProperties(prototype, wrapperProto, true);
	}

	function addInstanceProperties (prototype, instance) {
		transferProperties(instance, prototype, false);
	}

	function transferProperties (source, target, allowMethod) {
		for( var name in source ) {
			if( !source.hasOwnProperty (name) || name in target )
				continue;

			tansferProperty (source, name, target, allowMethod);
		}
	}

	function tansferProperty (source, name, target, allowMethod) {
		var descriptor;

		try {
			descriptor = Object.getOwnPropertyDescriptor (source, name);
		} catch( e ) {
			// JSC and V8 both use data properties instead of accessors which can
			// cause getting the property desciptor to throw an exception.
			// https://bugs.webkit.org/show_bug.cgi?id=49739
			descriptor = {
				get : function () {
				},
				set : function (v) {
				},
				configurable : true,
				enumerable : true
			};
		}

		if( allowMethod && typeof descriptor.value === 'function' ) {
			target[name] = wrapMethod (name);
			return;
		}

		var getter = getGetter (name),
			setter;

		if( descriptor.writable || descriptor.set )
			setter = getSetter (name);

		Object.defineProperty (target, name, {
			get : getter,
			set : setter,
			configurable : descriptor.configurable,
			enumerable : descriptor.enumerable
		});
	}

	function wrapMethod (name) {
		return function () {
			return this._origEvent[name].apply(this._origEvent, arguments);
		};
	}

	function getGetter (name) {
		return function () {
			 return this._origEvent[name];
		};
	}

	function getSetter (name) {
		return function (v) { this._origEvent[name] = v; };
	}
	
	function registerGenericEvent (name, parnet, prototype) {
		var origEvent = window[name],
			GenericEvent = function (type, options) {
				if (type instanceof OriginalEvent)
					this._origEvent = type;
				else
					return constructEvent(origEvent, name, type, options);
			};

		GenericEvent.prototype = Object.create(parnet.prototype);

		if (prototype)
			mixin(GenericEvent.prototype, prototype);

		if (origEvent) {
			// IE does not support event constructors but FocusEvent can only be
			// created using new FocusEvent in Firefox.
			// https://bugzilla.mozilla.org/show_bug.cgi?id=882165
			if (origEvent.prototype['init' + name])
				registerEventWrapper(origEvent, GenericEvent, document.createEvent(name));
			else
				registerEventWrapper(origEvent, GenericEvent, new origEvent('temp'));
		}

		return GenericEvent;
	}

	function registerEventWrapper(nativeConstructor, wrapperConstructor, instance) {
		var nativePrototype = nativeConstructor.prototype;

		registerConstructor(nativePrototype, wrapperConstructor, instance);

		mixinStatics(wrapperConstructor, nativeConstructor);
	}

	function constructEvent(origEvent, name, type, options) {
		//if (supportsEventConstructors)
		//	return new OriginalEvent(type, options);

		var event = document.createEvent (name),
			defaultDict = EventInitDictionary[name],
			args = [type];

		for( var key in defaultDict ) {
			var v = options != null && key in options ? options[key] : defaultDict[key];

			args.push (v);
		}

		event['init' + name].apply (event, args);

		return event;
	}

	function getInitFunction (name, relatedTargetIndex) {
		return function () {
			this._origEvent[name].apply (this, arguments[relatedTargetIndex]);
		};
	}

	function mixinStatics (to, from) {
		var skip = {
			'arguments' : 'arguments',
			'caller' : 'caller',
			'length' : 'length',
			'name' : 'name',
			'prototype' : 'prototype',
			'toString' : 'toString'
		};

		for( var key in from ) {
			if( !from.hasOwnProperty (key) || skip.hasOwnProperty (key) )
				continue;

			Object.defineProperty (to, key, Object.getOwnPropertyDescriptor (from, key));
		}

		return to;
	}

	function mixin(to, from) {
		for (var key in from) {
			if (!from.hasOwnProperty(key))
				continue;

			Object.defineProperty(to, key, Object.getOwnPropertyDescriptor(from, key));
		}

		return to;
	}

	return {
		createShadowRoot: function (el) {
			var root;

			// we have native support
			if (nativeShadow)
				root = nativeShadow.call(el);
			else
				root = new ShadowRoot(el);

			//This will only affect real shadow dom
			root.applyAuthorStyles = true;
			root.host = root.host || el;

			Object.defineProperty(el, 'shadowRoot', {get: function () {return root;}});
			return root;
		},
		shadowCss: function (def) {
			var root = def.template.content,
				name = def.name;

			if( nativeShadow && name && !def.noshadow ) {
		        ShadowCss.processNative(root, name);
		        return;
		    };

			ShadowCss.process(root, name);
		}
	};
});
//TODO Add support for Anim.run
//TODO Add suport for IE8 addEventListener
//TODO fix supportsEventConstructors