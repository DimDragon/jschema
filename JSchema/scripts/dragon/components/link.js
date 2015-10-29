Dragon.module(['dragon/components', 'dragon/event', 'dragon/dom', 'dragon/gesture'], function (WC, Event, Dom, Gesture) {

    return WC.register('ctrl-link', {
        lifecycle: {
            created : function () {
				Gesture.enable(this, true);
				Event.add(this, 'tap', function (evt) {
					var link = this,
						detail = { action: link.action },
			            href = link.getAttribute('href');

					// [DD] do we need to prevent tap for nested links ?
					// evt.stopPropagation(); 

					// used by router
					if (link.path) {
						detail = { action: 'follow', path: link.ctrl.path || link.path }
					}

					// in case event is not prevented, change location
					if (!Event.raise(link, 'action', detail) && href) {
		            	window.location.href = href;
					}
                });
            }
        },
        path: {
            attribute: {},
        },
		action: {
			attribute: {},
		},
        expand : function (path) {
            if (!this.path || this.path.indexOf('/') == 0)
            	return;

	        if (!this.ctrl.path)
		        this.ctrl.path = this.path;

	        this.ctrl.path = (path + this.ctrl.path).replace('//', '/');
        }
    }, 'a');
});

//TODO should we inherit a tag or should we implement on our own css hooks like link,visited,hover,active 