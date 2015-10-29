Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/dom', 'dragon/event', 'dragon/components/menu', 'dragon/components/link'], function (WC, Class, Dom, Event, Menu, Link) {
	return WC.register('menu-item', {
		lifecycle: {
			created: function () {
				var icon = this.querySelector('.icon-arrow-right, .icon-arrow-down');

				this.ctrl.link = Dom.create('ctrl-link');

				Dragon.Event.add(this.ctrl.link, 'action', function (evt) {
					evt.preventDefault();
					evt.stopImmediatePropagation();
				}, true);

				this.insertBefore(this.ctrl.link, icon);
			},
			attributeChanged: function (name, oldValue, newValue) {
				if (name == 'selected') {
					Event.raise(this, 'item_selected', { oldValue: oldValue, newValue: newValue });
				}
			}
		},
		disabled: {
			attribute: {},
			set: function (value) {
				WC.disable(this, value);
			}
		},
		menu: {
			get: function () {
				return Dom.parent(this, '.ctrl-menu,ctrl-menu');
			}
		},
		icon: {
			attribute: {},
			set: function (value) {
				var cl = 'ctrl-icon ' + value;

				if (!this.ctrl.icon) {
					var link = this.ctrl.link,
						icon = Dom.create('span', cl);

					if (link.firstChild) {
						link.insertBefore(icon, link.firstChild);
					} else {
						link.appendChild(icon);
					}

					this.ctrl.icon = icon;
				} else {
					this.ctrl.icon.className = cl;
				}
			}
		},
		text: {
			attribute: {},
			get: function () {
				return this.ctrl.text.textContent;
			},
			set: function (value) {
				if (!this.ctrl.text) {
					this.ctrl.text = Dom.create('span', 'ctrl-text');
					this.ctrl.link.appendChild(this.ctrl.text);
				}

				WC.setText(this.ctrl.text, value);
			}
		},
		href: {
			attribute: {},
			get: function () {
				return this.ctrl.link.href;
			},
			set: function (value) {
				this.ctrl.link.href = value;
			}
		},
		path: {
			attribute: {},
			get: function () {
				return this.ctrl.link.path;
			},
			set: function (value) {
				this.ctrl.link.path = value;
			}
		},
		action: {
			attribute: {}
		}
	});
});