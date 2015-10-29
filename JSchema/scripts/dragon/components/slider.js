Dragon.module(['dragon/components', 'dragon/event', 'dragon/classlist', 'dragon/dom', 'dragon/binding', 'dragon/gesture', 'dragon/components/slider.html'], function (WC, Event, Class, Dom, Binding, Gesture, doc) {
	var template = doc.querySelector('template');

	function declarativeInit(slider) {
		var items = slider.querySelectorAll('a, img'),
			item,
			source = [];

		for (var i = 0, count = items.length; i < count; i++) {
			item = items[i];

			if (item.href) {
				source.push(item.href);
			} else if (item.src) {
				source.push(item.src);
			}
		}

		slider.dataSource = source;
	}

	function renderItems(slider) {
		var items = slider.ctrl.dataSource,
			count = items.length,
			item,
			inner = slider.ctrl.inner,
			pages = slider.ctrl.pages;

		function setSize(el) {
			el.style.width = inner.clientWidth + 'px';
			el.style.height = inner.clientHeight + 'px';
		}

		function createPage(url) {
			var page = Dom.create('div', 'slider-item');

			setSize(page);

			Dragon.xhr({
				url: url,
				responseType: 'document'
			}).then(function (doc) {
				var tmpl = doc.querySelector('template'),
					cnt;

				if (!tmpl) {
					throw new Error("Missing template content.");
				}

				page.appendChild(tmpl.content.cloneNode(true));
			});

			return page;
		}

		function createImg(url) {

		}

		pages.style.width = inner.clientWidth * count + 'px';

		for (var i = 0; i < count; i++) {
			item = items[i];

			pages.appendChild(Dragon.isFragment(item) ? createPage(item) : createImg(item));
		}

		generatePager(slider.ctrl.pager, count);
		// initial selected item
		selectItem(slider, 0);
	}

	function selectItem(slider, index) {
		// remove surrent selection
		var selected = slider.ctrl.pager.querySelector('.selected');

		if (selected) {
			Class.remove(selected, 'selected');
		}
		// set selection
		Class.add(slider.ctrl.pager.querySelectorAll('.slider-bullet')[index], 'selected');

		//remove class from before selected item
		if (slider.ctrl.selectedIndex != undefined)
			Class.remove(slider.ctrl.pages.querySelectorAll('.slider-item')[slider.ctrl.selectedIndex], 'current');

		// set selected index
		slider.ctrl.selectedIndex = index;

		//add selected class on current item
		Class.add(slider.ctrl.pages.querySelectorAll('.slider-item')[index], 'current');

		// scroll to active page
		slider.ctrl.pages.style.marginLeft = -slider.ctrl.inner.clientWidth * index + 'px';
	}

	function generatePager(pager, count) {
		for (var i = 0; i < count; i++) {
			var bullet = Dom.create('li', 'slider-bullet');

			bullet.setAttribute('data-index', i);
			pager.appendChild(bullet);
		}
	}

	function resizePage(slider) {
		var inner = slider.ctrl.inner,
			pages = slider.ctrl.pages.querySelectorAll('.slider-item');

		for (var i = 0, page = pages[i]; page; page = pages[++i]) {
			page.style.width = inner.clientWidth + 'px';
			page.style.height = inner.clientHeight + 'px';
		}

		slider.ctrl.pages.style.width = inner.clientWidth * slider.ctrl.dataSource.length + 'px';
		slider.ctrl.pages.style.marginLeft = -slider.ctrl.inner.clientWidth * slider.ctrl.selectedIndex + 'px';
	}

	return WC.register('ctrl-slider', {
		lifecycle: {
			created: function () {
				var slider = this,
        			content = template.content.cloneNode(true);

				slider.appendChild(content);

				slider.ctrl.pages = slider.querySelector('.slider-pages');
				slider.ctrl.pager = slider.querySelector('.slider-pager');
				slider.ctrl.inner = slider.querySelector('.slider-inner');

				declarativeInit(slider);

				Gesture.enable(slider.ctrl.pager);
				Event.add(slider.ctrl.pager, 'tap', function (evt) {
					var target = evt.detail.target;

					if (Class.contains(target, 'slider-bullet')) {
						selectItem(slider, parseInt(target.getAttribute('data-index'), 10));
					}
				});

				Gesture.enable(slider.ctrl.inner);
				Event.add(slider.ctrl.inner, 'swipe', function (evt) {
					var index = slider.ctrl.selectedIndex;
					// left
					if (evt.detail.direction == 1 && index < slider.ctrl.dataSource.length - 1) {
						selectItem(slider, index + 1)
					} else if (evt.detail.direction == 2 && index > 0) {
						selectItem(slider, index - 1)
					}
				});

				Event.add(window, 'orientationchange', function () {
					resizePage(slider);
				});
			}
		},
		name: {
			attribute: {}
		},

		selectedIndex: {
			get: function () {
				return this.ctrl.selectedIndex;
			},
			set: function (value) {
				this.ctrl.selectedIndex = value;

				// move to item
			}
		},

		dataSource: {
			get: function () {
				return this.ctrl.dataSource;
			},
			set: function (value) {
				if (!Array.isArray(value)) {
					throw new Error('Slider data source must be an array!');
				}

				this.ctrl.dataSource = value;

				renderItems(this);
			}
		}
	});
});
