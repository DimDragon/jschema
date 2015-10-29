Dragon.module(['./dom', './classlist', './position', './event', './gesture'], function (Dom, Class, Position, Event, Gesture) {
    var START_INDEX = 900,
        overlay = null,
        last = null;

    function setOverlayIndex(hWnd) {
        overlay.style.zIndex = hWnd.zIndex - 1;
    }

    function mobileWindow () {
        return window.matchMedia && window.matchMedia ('only screen and (max-width: 480px)').matches;
    }

    function open (wnd, opt) {
        var hWnd = {
            zIndex: last ? last.zIndex + 2 : START_INDEX,
            modal: opt.modal,
            prev: last,
            wnd: wnd,
			//defaultButton: null,
			container: opt.container,
			relEl: opt.relEl,
			positionOptions: opt.positionOptions
        };

        last = hWnd;

        // allow window to be focusable programically
        wnd.tabIndex = -1;
        // make sure element is absolutely positioned so it doesn't change dom layout
        wnd.style.position = 'absolute';
        wnd.style.zIndex = hWnd.zIndex;

        if (hWnd.container) {
        	hWnd.container.appendChild(wnd);
        } else {
        	document.body.appendChild(wnd);
        }

        Position.setPosition (wnd, opt.relEl || document.body, opt.positionOptions);

        if (mobileWindow()) {
        	scrollTo(0, 0);
        }

		if (hWnd.modal && !hWnd.container) {
            if( !overlay ) {
                overlay = Dom.create ('div', 'ctrl-overlay');
                document.body.appendChild (overlay);
            }

            setOverlayIndex (hWnd);
        }

        if( last.prev == null ) {
            Event.add (document, 'keyup', cancelPopup, true);
            Gesture.addStartEvent(document, deactivate);
        }

        wnd.reposition = function () {
        	Position.setPosition(hWnd.wnd, hWnd.relEl || document.body, hWnd.positionOptions);
        };

	    wnd.close = function () {
	    	var next = findHandle(hWnd.wnd, true);

		    if (next)
			    next.prev = hWnd.prev;

		    close(hWnd);
	    };

        return hWnd;
    }

    function cancelPopup(evt) {
        if( evt.keyCode == 27 ) //Esc
        {
            Event.cancel (evt);
            close(last);
        }
    }

    function deactivate(evt) {
    	while (last && evt.which <= 1 && !last.modal && last.element !== evt.target && !last.wnd.contains(evt.target)) {
    		close(last);
    	}
    }

    function close (hWnd) {
    	if (hWnd == null || hWnd._closed)
            return;

        if (!Event.raise(hWnd.wnd, 'window_closing', { related: hWnd.relEl })) {
        	return;
        }

	    hWnd._closed = true;

        if (hWnd.container) {
        	hWnd.container.removeChild(hWnd.wnd);
        } else {
        	document.body.removeChild(hWnd.wnd);
        }

        if( hWnd.prev == null ) {
            Event.remove (document, 'keyup', cancelPopup, true);
            Gesture.removeStartEvent(document, deactivate);
        }

        if (hWnd === last) {
        	last = hWnd.prev;
        }

		if (hWnd.modal && !hWnd.container) {
            var modal = findModalHandle ();

            if (modal) {
            	setOverlayIndex(modal);
            } else {
            	document.body.removeChild(overlay);
            	overlay = null;
            }
        }
    }

    function findHandle (wnd, next) {
        var hWnd = last;

    	if (!next) {
    		while (hWnd && hWnd.wnd != wnd)
            hWnd = hWnd.prev;
    	} else {
    		if (hWnd.wnd == wnd)
    			return null;

    		while (hWnd) {
    			if (hWnd.prev && hWnd.prev.wnd == wnd)
    				return hWnd;

    			hWnd = hWnd.prev;
    		}
    	}

        return hWnd;
    }

    function findModalHandle () {
        var handle = last;

        while( handle && !handle.modal )
            handle = handle.prev;

        return handle;
    }

    return {
    	open: open,
		close: close,
        closeModal: function () {
            close (last);
        },
        getHandle: findHandle,
        _mobileWindow: mobileWindow
    };
});
