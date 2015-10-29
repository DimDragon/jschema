Dragon.module(function () {
	var doc = document.documentElement,
        special = {
        	mouseenter: ('onmouseenter' in doc) ? false : 'mouseover',
        	mouseleave: ('onmouseleave' in doc) ? false : 'mouseout',
        	// NOTE: check if IE9-10 lie about suport of wheel event!
        	wheel: ('onwheel' in doc) ? false : ('onmousewheel' in doc) ? 'mousewheel' : 'DOMMouseScroll'
        },
        // used for event support checking in IE8
        tagMap = { select: 'input', change: 'input', submit: 'form', reset: 'form', error: 'img', load: 'img', abort: 'img' };

	// is this native event in IE8
	function isNative(event) {
		var eventName = 'on' + event,
            el = document.createElement(tagMap[event] || 'div');

		return (el[eventName] === null) || (eventName in window);
	}

	// used to raise custom event on non-DOM objects
	var JSEvent = Dragon.define(function JSEventConstructor(type, data, target) {
		this.detail = data;
		this.target = target;
		this.timeStamp = new Date();
		this.type = type;
	}, {
		_preventDefaultCalled: false,
		target: null,
		timeStamp: null,
		type: null,
		bubbles: false,
		cancelable: false,
		trusted: false,
		preventDefault: function () {
			this._preventDefaultCalled = true;
		},
		stopImmediatePropagation: function () {
			this._stopImmediatePropagationCalled = true;
		},
		stopPropagation: function () { }
	});

	function cancelEvent(evt) {
		///<summary>
		///		Stops propagation and prevents default for specified event
		///</summary>
		///<param name="evt" type="Event">
		///		Event to be canceled
		///</param>
		evt.stopPropagation();
		evt.preventDefault();
	}

	function addEvent(el, type, fn, capture) {
		///<summary>
		///		Registers the specified listener on dom element.
		///</summary>
		///<param name="el" type="HTMLElement">
		///		Element on which listener is added
		///</param>
		///<param name="type" type="String">
		///		A string representing the event type to listen for
		///</param>
		///<param name="fn" type="Function">
		///		Callback function invoked when event is triggered
		///</param>
		///<param name="capture" type="Boolean" optional="true">
		///		If true, indicates that the user wishes to initiate capture of bubbling events
		///</param>
		if (el.addEventListener) {
			// some old browsers throw exception if capture is undefined
			capture = capture || false;
			if (special[type]) {
				el['e' + type] = (type === 'wheel') ? function (event) {
					// provide support and normalization for DOM3 'wheel' event
					event.deltaMode = 1;//Lines
					event.deltaX = event.wheelDeltaX ? -event.wheelDeltaX / 40 : 0;
					event.deltaY = event.detail || -event.wheelDelta / 40;
					fn.call(el, event);
				} : function (event) {
					// provide support for 'mouseenter' and 'mouseleave' events
					if (!el.contains(event.relatedTarget) && el == event.target) {
						fn.call(el, event);
					}
				};
				el.addEventListener(special[type], el['e' + type], capture);
			} else {
				el.addEventListener(type, fn, capture);
			}
		} else if (el.attachEvent) {	// IE8 only
			var native = isNative(type) || special[type],
			    lstType = native ? 'on' + (special[type] || type) : 'ondataavailable',
		        execute = function () {
		        	var evt = window.event;

		        	evt.target = evt.srcElement;
		        	evt.relatedTarget = evt.toElement;
		        	evt.stopPropagation = function () { this.cancelBubble = true; };        //NOTE: test this
		        	evt.preventDefault = function () { this.returnValue = false; };         //NOTE: test this
		        	evt.defaultPrevented = !evt.returnValue;

		        	// normalize wheel event
		        	if (evt.wheelDelta) {
		        		evt.deltaY = -evt.wheelDelta / 40;
		        	}

		        	fn.call(el, evt);
		        };

			el['e' + type + fn] = native ? execute : function (event) {
				if (event.evtName == type) {
					execute();
				}
			};
			el.attachEvent(lstType, el['e' + type + fn]);
		} else {						// non DOM object
			el._evtListeners = el._evtListeners || {};

			var eventListeners = (el._evtListeners[type] = el._evtListeners[type] || []);

			for (var i = 0, count = eventListeners.length; i < count; i++) {
				// prevent same handler from being added twice
				if (eventListeners[i] === fn) {
					return;
				}
			}
			eventListeners.push(fn);
		}
	}

	function removeEvent(el, type, fn, capture) {
		///<summary>
		///		Removes already registered event listener on dom element
		///</summary>
		///<param name="el" type="HTMLElement">
		///		Element at which listener is removed
		///</param>
		///<param name="type" type="String">
		///		A string representing the event type to remove
		///</param>
		///<param name="fn" type="Function">
		///		Callback function to be removed from listeners list
		///</param>
		///<param name="capture" type="Boolean" optional="true">
		///		If true, indicates that the user wishes to initiate capture of bubbling events
		///</param>
		if (el.removeEventListener) {
			el.removeEventListener(type, fn, capture);
		} else if (el.detachEvent) {	// IE8 only
			el.detachEvent(isNative(type) || special[type] ? 'on' + special[type] || type : 'ondataavailable', el['e' + type + fn]);
			el['e' + type + fn] = null;
		} else {						// non DOM object
			if (el._evtListeners && el._evtListeners[type]) {
				var listeners = el._evtListeners[type];

				for (var i = 0, count = listeners.length; i < count; i++) {
					if (listeners[i] === fn) {
						listeners.splice(i, 1);
						if (listeners.length === 0) {
							delete el._evtListeners[type];
						}
						break;
					}
				}
			}
		}
	}

	function fireEvent(el, evType, evData) {
		///<summary>
		///		Trigger native dom event on specified element
		///</summary>
		///<param name="el" type="HTMLElement">
		///		Element for which event is triggered
		///</param>
		///<param name="evType" type="String">
		///		A string representing the event type to dispatch
		///</param>
		///<param name="evData" type="Object" optional="true">
		///		Property list object which will be set on event object
		///</param>
		///<returns type="Boolean">False if at least one of the event handlers which handled this event called Event.preventDefault()</returns>
		var evt;

		if (document.createEvent) {
			evt = document.createEvent('Event');
			evt.initEvent(evType, true, true);
		} else {	//IE8
			evt = document.createEventObject();
		}
		Dragon.extend(evt, evData);

		return el.dispatchEvent ? el.dispatchEvent(evt) : el.fireEvent('on' + evType, evt);
	}

	function raiseEvent(target, evType, evData) {
		///<summary>
		///		Trigger custom event on specified object
		///</summary>
		///<param name="target" type="Object">
		///		Dom element or any other object on which event will be raised
		///</param>
		///<param name="evType" type="String">
		///		A string representing the event type to dispatch
		///</param>
		///<param name="evData" type="Object" optional="true">
		///		Property list object which will be set on event object
		///</param>
		///<returns type="Boolean">False if at least one of the event handlers which handled this event called Event.preventDefault()</returns>
		var newEvt,
			newData = {
				bubbles: evData ? (evData.hasOwnProperty('bubbles') ? !!evData.bubbles : true) : true,
				cancelable: evData ? (evData.hasOwnProperty('cancelable') ? !!evData.cancelable : true) : true,
				detail: evData
			};

		// all browsers except IE8
		if (target.dispatchEvent) {
			if (typeof window.CustomEvent === 'function') {			// use contructor
				newEvt = new CustomEvent(evType, newData);
			} else if (document.createEvent) {						// use init fallback(old browser and IE9-10)
				newEvt = document.createEvent('CustomEvent');
				newEvt.initCustomEvent(evType, newData.bubbles, newData.cancelable, newData.detail);
			}
			return target.dispatchEvent(newEvt);
		} else if (target.fireEvent) {								// IE8 only
			newEvt = document.createEventObject();
			// NOTE: when original event is put in detail it HAS to be cloned in IE8!
			newEvt.detail = newData.detail;
			newEvt.evtName = evType;
			return target.fireEvent('ondataavailable', newEvt);
		} else {
			newEvt = new JSEvent(evType, newData.detail, target);

			if (target._evtListeners && target._evtListeners[evType]) {
				var listeners = target._evtListeners[evType];

				listeners = listeners.slice(0, listeners.length);
				for (var i = 0, count = listeners.length; i < count && !newEvt._stopImmediatePropagationCalled; i++) {
					listeners[i].call(target, newEvt);
				}

				return !newEvt._preventDefaultCalled;
			}
		}
		return false;
	}

	function addHandle(el, type, obj) {
		///<summary>
		///		Redirect specified event type into obj.handleEvent() method
		///</summary>
		///<param name="el" type="HTMLElement">
		///		Element for which event is redirected
		///</param>
		///<param name="type" type="String">
		///		A string representing the event type
		///</param>
		///<param name="obj" type="Object">
		///		Object for which handleEvent() will be called
		///</param>
		if (el.addEventListener) {
			el.addEventListener(type, obj, false);
		} else if (typeof obj == "object" && obj.handleEvent) {
			el['e' + type] = function () { obj.handleEvent.call(obj, window.event); };
			el.attachEvent('on' + type, el['e' + type]);
		}
	}

	function removeHandle(el, type, obj) {
		///<summary>
		///		Remove already registered object handler
		///</summary>
		///<param name="el" type="HTMLElement">
		///		Element for which event is redirection is removed
		///</param>
		///<param name="type" type="String">
		///		A string representing the event type
		///</param>
		///<param name="obj" type="Object">
		///		Object handler to be removed
		///</param>
		if (el.removeEventListener) {
			el.removeEventListener(type, obj, false);
		} else if (typeof obj == "object" && obj.handleEvent) {
			el.detachEvent('on' + type, el['e' + type]);
			el['e' + type] = null;
		}
	}

	return {
		add: addEvent,
		remove: removeEvent,
		addHandle: addHandle,
		removeHandle: removeHandle,
		cancel: cancelEvent,
		fire: fireEvent,
		raise: raiseEvent,
		_namespace: 'Dragon.Event'
	};
});

//IE8 events:
// *blur, *change, *click, contextmenu, copy, cut, *dblclick, *error, *focus, *focusin, *focusout, hashchange, 
// *keydown, *keypress, *keyup, load, *mousedown, *mouseenter, *mouseleave, *mousemove, *mouseout, *mouseover, *mouseup, *mousewheel,
// paste, *reset, *resize, *scroll, *select, *submit, unload

// Browser events: 
// error, resize, scroll

// UIEvents : ("UIEvent", "UIEvents" 	event.initUIEvent)
// activate, focusin, focusout

// Mouse events : ("MouseEvent", "MouseEvents" 	event.initMouseEvent)
// mousedown, mouseenter, mouseleave, mousemove, mouseout, mouseover, mouseup, mousewheel, click, dblclick

// Keyboard events: ("KeyboardEvent" (Gecko also supports "KeyEvents") 	event.initKeyEvent (Gecko-specific; the DOM 3 Events working draft uses initKeyboardEvent instead) )
// keydown, keypress, keyup

// Form events:
// reset, submit

// HTML element 
// blur, change(input), focus, select(input)

// Generic events
// contextmenu, copy, cut, hashchange, load, paste, unload