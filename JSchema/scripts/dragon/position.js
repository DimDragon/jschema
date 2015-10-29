Dragon.module(['dragon/dom', 'dragon/enum'], function (Dom, Enum) {

	//used internaly predifined values of options
	var HorisontalAlign = new Enum({ 'leftOut': 'leftOut', 'left': 'left', 'center': 'center', 'right': 'right', 'rightOut': 'rightOut' }),
		VerticalAlign = new Enum({ 'above': 'above', 'top': 'top', 'center': 'center', 'bottom': 'bottom', 'below': 'below' }),
		ColisionResolve = new Enum({ 'visible': 'visible', 'none': 'none', smart: 'smart' });

	// if we ever consider iframes must also look at element.ownerDocument !!!
	function getClientRect() {
		///<summary>
		///		Get Client Rect
		///</summary>
		///<returns type="object">Returns top,left,height and width of client</returns>
		return {
			top: document.documentElement.clientTop || document.body.clientTop || 0,
			left: document.documentElement.clientLeft || document.body.clientLeft || 0,
			height: document.documentElement.clientHeight || document.body.clientHeight || 0,
			width: document.documentElement.clientWidth || document.body.clientWidth || 0
		};
	}

	// get left and top scroll of current document
	function getPageScroll() {
		///<summary>
		///		Get left and top scroll of current document
		///</summary>
		///<returns type="object">Returns left and top scroll of current document</returns>        
		return {
			left: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
			top: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop
		};
	}

	// gets element absolute position within document
	// probably not suitable when el == document.body, but will probably not be used this way
	function getPosition(el) {
		///<summary>
		///		Gets element absolute position within document
		///</summary>
		///<param name="el" type="HTMLElement">
		///		Element to get position
		///</param>
		///<returns type="object">Returns element absolute position within document(left and top values)</returns>      
		var clRect = getClientRect(),
        elRect = el.getBoundingClientRect(),
        scroll = getPageScroll();
		return { top: elRect.top + scroll.top - clRect.top, left: elRect.left + scroll.left - clRect.left };
	}

	function isNumber(value) {
		return (value - 0) == value && (value + '').replace(/^\s+|\s+$/g, "").length > 0;
	}

	function getPercentageValue(value, percent) {
		return value * percent / 100;
	}

	function getPositioningOptions(options) {
		var opt = options ? options.split(/\s*[\s,]\s*/) : [],
		    str,
		    result = {
		    	hAlign: 'center', //digit or fixed string
		    	hAlignDimention: 'fixed', //px,% or "fixed"
		    	vAlign: 'center',  //digit or fixed string
		    	vAlignDimention: 'fixed', //px,% or "fixed"
		    	resolve: 'none'
		    };

		if (opt[0]) { //horiontal element
			str = opt[0];
			if (str.search('px') > 0 || isNumber(str)) { //horizontal align in px
				if (isNumber(str))
					result.hAlign = str;
				else
					result.hAlign = str.substring(0, str.search('px'));

				result.hAlignDimention = 'px';
			} else {
				if (str.search('%') > 0) {
					result.hAlign = str.substring(0, str.search('%'));
					result.result.hAlignDimention = '%';
				} else {
					result.hAlign = str; //expected one of fixed values leftout,left,center,right,rightout
					result.hAlignDimention = 'fixed';
				}
			}
		}

		//get vertical align
		if (opt[1]) {
			str = opt[1];
			if (str.search('px') > 0 || isNumber(str)) { //vertical align in px
				if (isNumber(str))
					result.vAlign = str;
				else
					result.vAlign = str.substring(0, str.search('px'));

				result.vAlignDimention = 'px';
			} else {
				if (str.search('%') > 0) {
					result.vAlign = str.substring(0, str.search('%'));
					result.vAlignDimention = '%';
				} else {
					result.vAlign = str; //expected one of fixed values leftout,left,center,right,rightout
					result.vAlignDimention = 'fixed';
				}
			}
		}

		if (opt[2]) //collision resolve definition
			result.resolve = opt[2]; //can be 'none' and 'visible'

		return result;
	}

	function setPosObj(posOptions, pos, posRel, relRect, el, rel) {
		//set left
		if (posOptions.hAlignDimention == 'fixed') {
			switch (posOptions.hAlign) {
				case HorisontalAlign.leftOut:
					pos.left = pos.left - el.offsetWidth;
					break;
				case HorisontalAlign.left:
					pos.left = pos.left;
					//pos.left = Math.max(pos.left + Math.min(posRel.right - el.offsetWidth, 0), 0);
					break;
				case HorisontalAlign.center:
					pos.left = pos.left + (relRect.width - el.offsetWidth) / 2;
					break;
				case HorisontalAlign.right:
					pos.left = Math.max(pos.left + relRect.width - el.offsetWidth, 0);
					break;
				case HorisontalAlign.rightOut:
					pos.left = pos.left + relRect.width;
					break;
			}
		} else {
			if (posOptions.hAlignDimention == 'px')
				pos.left = pos.left + Number(posOptions.hAlign);
			else //% is relative to size of the relative object
				pos.left = pos.left + Number(getPercentageValue(relRect.width, posOptions.hAlign));
		}

		//set top
		if (posOptions.vAlignDimention == 'fixed') {
			switch (posOptions.vAlign) {
				case VerticalAlign.above:
					pos.top = pos.top - el.offsetHeight;
					break;
				case VerticalAlign.top:
					//pos.top = pos.top; //Math.max(pos.top, 0 + scroll.top);
					break;
				case VerticalAlign.center:
					pos.top += rel.offsetHeight / 2 - el.offsetHeight / 2;
					break;
				case VerticalAlign.bottom:
					pos.top += rel.offsetHeight - el.offsetHeight;
					break;
				case VerticalAlign.below:
					pos.top += rel.offsetHeight;
					break;
			}
		} else {
			if (posOptions.vAlignDimention == 'px')
				pos.top = pos.top + Number(vAlign);
			else //% is relative to size of the relative object
				pos.top = pos.top + Number(getPercentageValue(relRect.height, vAlign));
		}
	}

	function resolveVisible(cRect, scroll, pos, el) {
		var isHigherThan = false,
			isWiderThan = false;
		//check position of element agains boundaries of the screen
		//1.if element is bigger than visible area

		//1.1.Element is highter than window
		if (cRect.height < el.offsetHeight) {
			pos.top = scroll.top;
			isHigherThan = true;
		}

		//1.2.Element is wider than window
		if (cRect.width < el.offsetWidth) {
			pos.left = scroll.left;
			isWiderThan = true;
		}

		if (!isHigherThan) {
			//2.if not entire element is visible and is bellow of visible area
			if ((cRect.top + cRect.height + scroll.top) < (pos.top + el.offsetHeight)) {
				pos.top = cRect.top + cRect.height - el.offsetHeight;
			}

			//3.if not entire element is visible and is above of visible area
			if (scroll.top + cRect.top > pos.top) {
				pos.top = scroll.top + rel.offsetHeight / 2 - el.offsetHeight / 2;
			}
		}
		if (!isWiderThan) {
			//4.if not entire element is visible and is left of visible area
			if (pos.left < scroll.left + cRect.left) {
				pos.left = scroll.left + cRect.left;
			}
			//5.if not entire element is visible and is right of visible area
			if ((pos.left + el.scrollWidth) > (scroll.left + cRect.left + cRect.width)) {
				pos.left = scroll.left + cRect.left + cRect.width - el.offsetWidth;
			}
		}
	}

	function resolveSamrt(cRect, scroll, pos, el, relRect, posOptions) {
		if (posOptions.vAlign == 'below' && (cRect.top + cRect.height < pos.top + el.offsetHeight)) {
			if (pos.top - el.offsetHeight >= cRect.top)
				pos.top = relRect.top - el.offsetHeight;
			else
				pos.top = cRect.height / 2 - el.offsetHeight / 2;
		}

		if (posOptions.vAlign == 'above' && (pos.top < cRect.top)) {
			if (cRect.top + cRect.height >= pos.top + el.offsetHeight)
				pos.top = relRect.bottom;
			else
				pos.top = cRect.height / 2 - el.offsetHeight / 2;
		}

		if (posOptions.hAlign == 'left' && (pos.left + el.offsetWidth > cRect.left + cRect.width)) {
			if (relRect.left + relRect.width - el.offsetWidth >= cRect.left)
				pos.left = relRect.right - el.offsetWidth;
			else
				pos.left = relRect.left - (relRect.left + el.offsetWidth - cRect.left - cRect.width);

		}

		if (posOptions.hAlign == 'rigth' && (pos.left < cRect.left)) {
			if (relRect.left + el.offsetWidth <= cRect.left + cRect.width)
				pos.left = relRect.left;
			else
				pos.left = relRect.left - (relRect.left + el.offsetWidth - cRect.left - cRect.width);

		}
	}

	function setPosition(el, rel, options) {
		///<summary>
		///		Set position of element to relative element or event.
		///</summary>
		///<param name="el" type="HTMLElement">
		///		Element to be positioned
		///</param>
		///<param name="relOrEvt" type="HTMLElement">
		///		Relative element
		///</param>        
		///<param name="options" type="String">
		///		Set position options
		///
		///     Options definition is:
		///        1.Horizontal align with possible predifined values for it: leftout,left,center,right,rightout.
		///        1.a) Also is implemented usage with pixels ex: (145, 145px)
		///        - Negative values are shown in left out of relative element(0 is left value of relative element)
		///        - Values bigger than width of relative element will be shown in right out of relative element
		///        1.b) Also is implemented usage with percentage ex: (45%, -45%)(percent is part of relative element)
		///        - Negative values are shown in left out of relative element(-1% is selected element started just before relative one) 
		///        - Values bigger than 100% will be shown in right out of relative element
		///        
		///        2.Vertical align with possible predifined values for it: above,top,center,bottom,below.
		///        2.a) Also is implemented usage with pixels ex: (145, 145px)
		///        - Negative values are shown in above of relative element(0 is top value of relative element)
		///        - Values bigger than height of relative element will be shown below of relative element
		///        2.b) Also is implemented usage with percentage ex: (45%, -45%)(percent is part of relative element)
		///        - Negative values are shown in above of relative element(-1% is selected element started just before relative one) 
		///        - Values bigger than 100% will be shown in below of relative element
		///        
		///        3.Collision detection will have 2 options:
		///        3.a) none : no collision check - element will not be moved after initial positioning
		///        3.b) visible : element will be visible. 
		///        - If it is below of the visible area will be scroll up.
		///        - If it is above of the visible area will be scroll down.
		///        - If it is left of the visible area will be scroll right.
		///        - If it is right of the visible area will be scroll left.
		///
		///        NB!!! Those options are with fixed position so:
		///        case '75%' ->correct (75% center none)
		///        case '75% 75%' ->correct (75% 75% none)
		///        case '75% 75% visible' ->correct
		///
		///        but 
		///        case '75% visible' -> not correct
		///        case 'visible' -> not correct
		///</param>   
		var posOptions = getPositioningOptions(options),
			scroll = getPageScroll(),
			relParent = el.parentNode;

		while (relParent && relParent != document.documentElement) {
			var parPosition = window.getComputedStyle(relParent).getPropertyValue('position');

			if (parPosition == 'relative')
				break;

			relParent = relParent.parentNode;
		}

		if (!rel)
			rel = relParent;

		var pos = getPosition(rel),
			cRect = getClientRect(),
			relRect = rel.getBoundingClientRect(),
			posRel = {
				above: pos.top - cRect.top,
				below: scroll.top + cRect.height - pos.top - rel.offsetHeight,
				right: scroll.left + cRect.width - pos.left
			};


		setPosObj(posOptions, pos, posRel, relRect, el, rel);

		//check for collisions
		switch (posOptions.resolve) {
			case ColisionResolve.visible:
				resolveVisible(cRect, scroll, pos, el);
				break;
			case ColisionResolve.smart:
				resolveSamrt(cRect, scroll, pos, el, relRect, posOptions);
				break;
			default: //none - do nothing
				break;
		}

		Dragon.extend(el.style, { position: "absolute", top: pos.top + "px", left: pos.left + "px" });
	}


	return {
		getClientRect: getClientRect,
		getPageScroll: getPageScroll,
		getPosition: getPosition,
		setPosition: setPosition,
		_namespace: 'Dragon.Position'
	};
});