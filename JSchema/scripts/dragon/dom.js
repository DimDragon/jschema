Dragon.module(function () {
	var vendors = ['ms', 'moz', 'webkit', 'o'],
	    matches = Element.prototype.matches,
	    disconnectedMatch;

	for (var i = 0, count = vendors.length; i < count && !matches; i++) {
		matches = Element.prototype[vendors[i] + 'MatchesSelector'];
	}

	disconnectedMatch = matches.call(document.createElement("div"), "div");

	function match(el, selector) {
		///<summary>
		///		Returns true if element matches selector
		///</summary>
		///<param name="el" type="HTMLElement">
		///		Element to be checked
		///</param>
		///<param name="selector" type="String">
		///		CSS style selector. NOTE: IE8 only supports CSS2 selectors
		///</param>
		///<returns type="Boolen">Returns true if selector is positively matched</returns>
		/*
    	if (typeof DocumentFragment !== 'undefined') {
            if( el instanceof DocumentFragment )
                return false;
        } else if( el instanceof Element )
            return false;
		*/
		if ((el instanceof DocumentFragment) || !(el instanceof Element))
			return false;

		if (matches && (disconnectedMatch || document.body.contains(el)))
			return matches.call(el, selector);

		// IE9 disconnected fallback
		var holder = el.parentNode,
            added = false,
            found = false,
            elems;

		if (!holder) {
			holder = document.createElement('div');
			holder.appendChild(el);
			added = true;
		}

		elems = holder.querySelectorAll(selector);

		for (var i = 0, count = elems.length; i < count; i++) {
			if (elems[i] === el)
				found = true;
		}

		if (added)
			holder.removeChild(el);

		return found;
	}

    function getElementsByClass(el, cl) {
		///<summary>
		///		Returns a set of elements which have the given class name
		///</summary>
		///<param name="el" type="HTMLElement">
		///		Element and its descendants will be searched
		///</param>
		///<param name="cl" type="String">
		///		Class name to search for
		///</param>
		///<returns type="HTMLCollection">Live collection of all found elements</returns>
		if (el.getElementsByClassName) {
			return el.getElementsByClassName(cl);
		} else {
			var elems = [],
                target = el || document,
				classRE = new RegExp('(\\s|^)' + cl + '(\\s|$)'),
				tags = target.getElementsByTagName("*");

			for (var i = 0, count = tags.length; i < count; i++) {
				if (classRE.test(tags[i].className)) {
					elems.push(tags[i]);
				}
			}
			return elems;
		}
	}

	function find(el, selector) {
		///<summary>
		///		Returns list of all elements descended from the element on which it is invoked that match the specified group of CSS selectors.
		///</summary>
		///<param name="selector" type="String">
		///		Group of selectors to match on
		///</param>
		///<returns type="NodeList">Non-live NodeList of all found elements</returns>
		return el.querySelectorAll(selector);
	}

	function findParent(el, selector) {
		///<summary>
		///		Return element itself or first element in parents chain which matches selector
		///</summary>
		///<param name="el" type="HTMLElement">
		///		Element used as origin for the search
		///</param>
		///<param name="selector" type="String">
		///		CSS style selector. NOTE: IE8 only supports CSS2 selectors
		///</param>
		///<returns type="HTMLElement">Returns first matching element or null if none found</returns>
		var target = el;

		while (target && !match(target, selector)) {
			// make sure we penetrate shadow dom
			target = (target === document.documentElement) ? null :
				(target.nodeType == 11 && target.host) ? target.host : target.parentNode;
		}
		return target;
	}

	// Note: [DD] This method is incorrect since dataset uses camelCase syntax!
	//function getDataAttribute(el, attr) {
	//	///<summary>
	//	///		Returns value of given data attribute
	//	///</summary>
	//	///<param name="el" type="HTMLElement">
	//	///		Element which attribute is read
	//	///</param>
	//	///<param name="atrr" type="String">
	//	///		Attribute name(without 'data-' prefix)
	//	///</param>
	//	///<returns type="String">Attribute value</returns>
	//	return el.dataset ? el.dataset[attr] : el.getAttribute('data-' + attr);
	//}

	// DEPRECATED
	function getDataAttribute(el, attr) {
		return el.dataset[attr];
	}

	function create(tag, cl, txt) {
		///<summary>
		///		Create HTML element
		///</summary>
		///<param name="tag" type="String">
		///		tagName of element
		///</param>
		///<param name="cl" type="String" optional="true">
		///		className of element
		///</param>
		///<param name="text" type="String" optional="true">
		///		text content of element
		///</param>
		///<returns type="HTMLElement">Newly created element</returns>
		var el = document.createElement(tag);

		if (cl) {
			if (el.className)
			el.className += ' ' + cl;
			else
				el.className = cl;
		}

		if (txt != undefined) {
			el.appendChild(document.createTextNode(txt));
		}

		return el;
	}

	function createLink(ref, cl, txt) {
		///<summary>
		///		Create HTML link element
		///</summary>
		///<param name="ref" type="String">
		///		link url
		///</param>
		///<param name="cl" type="String" optional="true">
		///		className of element
		///</param>
		///<param name="text" type="String" optional="true">
		///		text content of element
		///</param>
		///<returns type="HTMLElement">Newly created link element</returns>
		var lnk = create('a', cl, txt);

		lnk.href = ref;
		return lnk;
	}

	function append(el, children) {
		///<signature>
		///<summary>
		///		Add child elements to a HTML element
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element to host child elements
		///</param>
		///<param name="children" type="Array" elemType="HTMLElement">
		///		Araay of child elements to be added
		///</param>
		///</signature>
		///<signature>
		///<summary>
		///		Add child elements to a HTML element
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element to host child elements
		///</param>
		///<param name="child1" type="HTMLElement" parameterArray="true">
		///		Element to be added
		///</param>
		///<param name="child2" type="HTMLElement" optional="true">
		///		Element to be added
		///</param>
		///<param name="..." type="HTMLElement" optional="true">
		///		Element to be added
		///</param>
		///</signature>
		var fragment = document.createDocumentFragment();

		if (!Array.isArray(children)) {
			children = Array.prototype.slice.call(arguments, 1);
		}

		for (var i = 0, count = children.length; i < count; i++) {
			fragment.appendChild(children[i]);
		}

		el.appendChild(fragment);
	}

	// NOTE: select tag is broken in IE8-9. Do not insert options with this method!
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
			container,
			j;

		// fix IE8 dynamic inserted HTML5 elements
		if (window.htmlfive) {
			var tempFrag = document.createDocumentFragment();

			htmlfive(tempFrag);
			tempFrag.appendChild(div);
		}

		div.innerHTML = str;
		container = requireTable ? div.getElementsByTagName(requireTable[1])[0].parentNode : div;

		j = container.childNodes.length;
		while (j--) {
			frag.appendChild(container.firstChild);
		}

		return frag;
	}

	function empty(el) {
		///<summary>
		///		Remove all descendant DOM nodes of element
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element to be left with no content
		///</param>
		var child;

		while ((child = el.srFirstChild || el.firstChild)) {
			el.removeChild(child);
		}
	}

	// [DD] Obsolete since IE9 already has textContent
	function text(el, txt) {
		///<signature>
		///<summary>
		///		Gets the text content of a node and its descendents
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element which text to get
		///</param>
		///<returns type="String">Text content of node and its descendents</returns>
		///</signature>
		///<signature>
		///<summary>
		///		Sets the text content of a node clearing old content in the process
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element which text to set
		///</param>
		///<param name="txt" type="String">
		///		Text to set
		///</param>
		///<returns type="String">Text content of node</returns>
		///</signature>
		var prop = 'textContent' in el ? 'textContent' : 'innerText';

		return txt ? el[prop] = txt : el[prop];
	}

	function shadowHost(el) {
	    ///<summary>
	    ///		Return element itself or first element in parents chain which is shadowdom host element
	    ///</summary>
	    ///<param name="el" type="HTMLElement">
	    ///		Element used as origin for the search
	    ///</param>
	    ///<returns type="HTMLElement">Returns first element which is shadowdom host or null if none found</returns>
	    var target = el;

		while (target && !(((target.host && (!target.tagName || target.tagName.toLowerCase() != 'a')) || target.shadowRoot) && target.contains(el)))
	        target = target.parentNode;

	    return target ? (target.host || target) : null;
	}

    return {
		getElementsByClass: getElementsByClass,
		getDataAttribute: getDataAttribute,
		find: find,
		matches: match,
		parent: findParent,
		create: create,
		createLink: createLink,
		append: append,
		empty: empty,
		parse: parseHTML,
		text: text,
		shadowHost: shadowHost,
		_namespace : 'Dragon.Dom'
	};
});