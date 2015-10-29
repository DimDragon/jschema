Dragon.module(['dragon/components', 'dragon/event', 'dragon/classlist', 'dragon/dom', 'dragon/binding', 'dragon/gesture', 'dragon/components/menu.html'], function (WC, Event, Class, Dom, Binding, Gesture, doc) {
	var MENU_TYPE_DROPLINE = 'dropline',
        MENU_TYPE_DROPLIST = 'droplist',
        MENU_TYPE_DROPSLIDE = 'dropslide',
		SELECTED_CLASS = 'current',
        SELECTED_PARENT_CLASS = 'current-parent',
		HOVER_CLASS = 'hover',
		TOGGLE_CLASS = 'toggle',
		closing = false;

	//Convert css as it is done when shadow dom is used!!
	//Shadow.shadowCss(doc.querySelector('template[name="style"]').content, 'ctrl-menu', true);

	function renderItems(menu, data) {
		if (!menu.ctrl.menuItem)
			return;

		var renderQueue = [],
            currentQueueIndex = 0,
            newLevels,
            current;

		if (menu.type == MENU_TYPE_DROPLIST || menu.type == MENU_TYPE_DROPSLIDE) {
			var groupMenu = menu.querySelector('.group-menu');

			if (groupMenu)
				groupMenu.parentNode.removeChild(groupMenu);
		}
		else
		clearChilds(menu, '.menu-item,menu-item');

		renderQueue.push({ parent: menu, level: 0, items: data });

		while (currentQueueIndex < renderQueue.length) {
			current = renderQueue[currentQueueIndex];

			newLevels = renderLevel(current.parent, menu.ctrl.menuItem, current.level, current.items, menu.type);

			renderQueue = renderQueue.concat(newLevels);

			currentQueueIndex++;
		}
	}

	function renderLevel(parent, template, lvl, items, type) {
		var dataItem,
            domItem,
			childItems,
            newLevels = [],
			templateFrag,
            fragment = document.createDocumentFragment(),
            div;


		if (( type == MENU_TYPE_DROPLIST || type == MENU_TYPE_DROPSLIDE )&& lvl == 0) {
			div = Dom.create('div', 'group-menu');

			fragment.appendChild(div);
			fragment = div;
		}

		for (var i = 0, count = items.length; i < count; i++) {
			dataItem = items[i];

			templateFrag = document.createDocumentFragment();
			templateFrag.appendChild(template.cloneNode(true));

			Binding.resolve(templateFrag, dataItem);

			domItem = templateFrag.cloneNode(true).childNodes[0];
			Class.add(domItem, 'level-' + lvl + '-item');

			// programmed hover behavior
			Event.add(domItem, 'mouseenter', hover, false);
			Event.add(domItem, 'mouseleave', hover, false);

			fragment.appendChild(domItem);

			childItems = dataItem.Items || dataItem.items;

			if (childItems && childItems.length > 0) {
				newLevels.push({ parent: domItem, level: lvl + 1, items: childItems });

				if (type == MENU_TYPE_DROPLINE) {
					domItem.appendChild(Dom.create('span', 'ctrl-icon icon-arrow-down'));
				} else if (type == MENU_TYPE_DROPLIST || type == MENU_TYPE_DROPSLIDE) {
					domItem.appendChild(Dom.create('span', 'ctrl-icon icon-arrow-right'));
				}
			}
			else {
				var menu = findSubMenu(domItem);

				menu.parentNode.removeChild(menu);
			}
		}

		if (lvl == 0) {
			parent.appendChild(fragment);
		} else {
			var submenu = findSubMenu(parent);

			Class.add(submenu, 'level-' + lvl);
			submenu.appendChild(fragment);
		}

		return newLevels;
	}

	function findSubMenu(node) {
		var menu = node.querySelector('sub-menu');

		if (!menu || menu.parentNode != node) {
			menu = document.createElement('sub-menu');
			node.appendChild(menu);
		}

		return menu;
	}

	// [DD] What is purpose of this method?!
	function clearChilds(node, cl) {
		for (var i = 0, count = node.childNodes.length; i < count; i++) {
			var child = node.childNodes[i];

			if (!child.className || !Class.contains(child, cl))
				continue;

			node.removeChild(child);
		}

		return null;
	}

	function getMenuItem(target) {
		return Dom.parent(target, '.menu-item,menu-item');
	}

	function toggleItem(item) {
		while (item) {
			Class.toggle(item, HOVER_CLASS);
			item = getMenuItem(item.parentNode);
		}
	}

	function hover(evt) {
		if (!closing) {
			Class.toggle(this, HOVER_CLASS);
		}
	}

	function activate(evt) {
		if (evt.target != this) {
			return;
		}

		var menu = this,
			target = evt.detail.target,
			item = getMenuItem(target),
			submenu = Dom.parent(target, 'sub-menu');

		// user pressed on menu-item
		if (item && (!submenu || !item.contains(submenu))) {
			// in case menu item is a group
			if (item.querySelector('sub-menu')) {
				forward(menu, item);
			} else {
				select(menu, item);
			}
			//} else if (Dom.parent(target, '.icon-menu')) {	// show/hide menu itself
			//	Class.toggle(menu, TOGGLE_CLASS);
		} else if (Dom.parent(target, '.ctrl-menuheader')) {	// header brings back to previous level
			back(menu);
		}
	}

	// clear current selection classes
	function clearSelection(menu) {
		var parent = menu.querySelector('.' + SELECTED_PARENT_CLASS),
			selected = menu.querySelector('.' + SELECTED_CLASS);

		if (parent) {
			Class.remove(parent, SELECTED_PARENT_CLASS);
		}

		if (selected) {
			Class.remove(selected, SELECTED_CLASS);
		}
	}

	function selectItemInner(item) {
		var parent = getMenuItem(item.parentNode);

		if (parent) {
			Class.add(parent, SELECTED_PARENT_CLASS);
		}

		Class.add(item, SELECTED_CLASS);
	}

	function selectItem(menu, item) {
		if (!item.href && !item.path)
			return;

		clearSelection(menu);
		selectItemInner(item);
		}

	function select(menu, item) {
		if (menu.selection)
			selectItem(menu, item);

		// [DD] This part should be completely revised if we want hover operated menu!

		//// close hovered menu for non mobile version
		//if (menu.querySelector('.' + HOVER_CLASS)) {
		//	closing = true;
		//	toggleItem(item);
		//	setTimeout(function () { closing = false; }, 600);
		//} else

		if (menu.type != MENU_TYPE_DROPLINE) {
			showhide(menu);
			//Class.toggle(menu, TOGGLE_CLASS);
		}

		// signal selection change
		if (Event.raise(menu, 'selection_change', { selected: item, action: item.action })) {
			// if not prevented tries to load action links as modules
			if (!item.href && !item.path && item.action) {
				Dragon.use(item.action).then(function (module) {
					module.action();
				}, function (err) {
					throw new Error('Action module not found: ' + item.action);
				});
			}
		}
	}

	function forward(menu, item) {
		// for dropline type we simply expand item
		if (menu.ctrl.type == MENU_TYPE_DROPLINE) {
			Class.toggle(item, TOGGLE_CLASS);
			return;
		}

		var backArrow,
            holder,
            breadcrumb;

		holder = menu.ctrl.breadcrumbs.querySelector('ol');
		backArrow = menu.querySelector('.ctrl-icon.icon-arrow-left');

		if (!holder) {
			holder = document.createElement('ol');

			Dom.empty(menu.ctrl.breadcrumbs);
			menu.ctrl.breadcrumbs.appendChild(holder);
		}

		breadcrumb = document.createElement('li');
		breadcrumb.appendChild(Dom.create('span', holder.querySelectorAll('li').length == 0 && item.icon
			? 'ctrl-icon ' + item.icon : 'ctrl-icon icon-arrow-right'));

		if (item.text) {
			breadcrumb.appendChild(Dom.create('span', 'ctrl-text', item.text));
		}

		holder.appendChild(breadcrumb);
		menu.ctrl.breadcrumbItems.push(item);

		Class.add(item, TOGGLE_CLASS);
		Class.remove(backArrow, 'hidden');
	}

	function back(menu) {
		// this is main menu item, there is no back
		if (menu.ctrl.breadcrumbItems.length == 0) {
			showhide(menu);
			return;
		}

		var arrow = menu.querySelector('.ctrl-icon.icon-arrow-left'),
            holder,
			items,
            item;

		holder = menu.ctrl.breadcrumbs.querySelector('ol');
		items = holder.querySelectorAll('li');

		if (items.length > 0) {
			holder.removeChild(items[items.length - 1]);
		}

		if (items.length == 1) {
			WC.setText(menu.ctrl.breadcrumbs, menu.headertext);
			Class.add(arrow, 'hidden');
		}

		if ((item = menu.ctrl.breadcrumbItems.pop())) {
			Class.remove(item, TOGGLE_CLASS);
		}
	}

	function autoClose(evt) {
		var target = evt.target,
			menu = this;

		if (!menu.contains(target) && target != menu && Class.contains(menu, TOGGLE_CLASS)) {
			showhide(menu);
			//Class.remove(this, TOGGLE_CLASS);
			//Event.remove(document, 'mousedown', menu.ctrl.autoclose, true);
		}
	}

	function showhide(menu) {
		var action = Class.contains(menu, TOGGLE_CLASS) ? 'remove' : 'add',
			opened;

		Class[action](menu, TOGGLE_CLASS);

		if (menu.autoclose) {
			Gesture[action + 'StartEvent'](document, menu.ctrl.autoclose);
		}

		Event.raise(menu, 'toggle', { visible: action == 'add' });

		if (menu.ctrl.breadcrumbs) {
			WC.setText(menu.ctrl.breadcrumbs, menu.headertext);

			if (action == 'remove' && menu.ctrl.type != MENU_TYPE_DROPLINE) {
				opened = menu.querySelector('.group-menu .' + TOGGLE_CLASS);
				menu.ctrl.breadcrumbItems = [];

				if (opened) {
					Class.remove(opened, TOGGLE_CLASS);
				}
			}
		}

		//if (action != 'remove' || menu.ctrl.type == MENU_TYPE_DROPLINE) {
		//	return;
		//}

		//// clear breadcrumb items
		//if (menu.ctrl.breadcrumbs) {
		//	opened = menu.querySelector('.group-menu .' + TOGGLE_CLASS);

		//	WC.setText(menu.ctrl.breadcrumbs, menu.headertext);
		//	menu.ctrl.breadcrumbItems = [];

		//	if (opened) {
		//		Class.remove(opened, TOGGLE_CLASS);
		//	}
		//}
	}

	function toggleMenu(evt) {
		evt.stopPropagation();

		showhide(this);
	}

	return WC.register('ctrl-menu', {
		template: doc.querySelector('template'),
		noshadow: true,
		lifecycle: {
			created: function () {
				Gesture.enable(this, true);
				//Event.add(this, 'mouseover', hover, false);
				//Event.add(this, 'mouseout', hover, false);
				Event.add(this, 'tap', activate, true);

				// handle menu items selected attribute change
				Event.add(this, 'item_selected', function (evt) {
					clearSelection(this);

					if (evt.detail.newValue)
						selectItem(this, evt.target);
				});

				this.ctrl.autoclose = autoClose.bind(this);
			}
		},
		dataSource: {
			get: function () {
				return this.ctrl.dataSource;
			},
			set: function (value) {
				this.ctrl.dataSource = value;

				if (!this.ctrl.menuItem) {
					var template = this.querySelector('template');

					if (template) {
						this.ctrl.menuItem = template.content.querySelector('menu-item, [is="menu-item"]');

						template.parentNode.removeChild(template);
					}
				}

				renderItems(this, value);
			}
		},
		headertext: {
			attribute: {},
			get: function () {
				return this.ctrl.htext;
			},
			set: function (value) {
				this.ctrl.htext = value;

				if ((this.type != MENU_TYPE_DROPLIST && this.type != MENU_TYPE_DROPSLIDE) || !this.ctrl.breadcrumbs)
					return;

				WC.setText(this.ctrl.breadcrumbs, this.ctrl.htext);
			}
		},
		type: {
			attribute: {},
			set: function () {
				if (this.type == MENU_TYPE_DROPLIST || this.type == MENU_TYPE_DROPSLIDE) {
					this.insertBefore(doc.querySelector('template[name="menuheader"]').content.cloneNode(true), this.childNodes[0]);
					this.ctrl.breadcrumbs = this.querySelector('.breadcrumbs');
					//WC.setText(this.ctrl.breadcrumbs, this.headertext);
					this.ctrl.breadcrumbItems = [];
				}

				Class.add(this, this.type);
			}
		},
		// if active will place classes for current selected item
		selection: {
			attribute: { boolean: true }
		},
		// if active will close open menu if you click outside
		autoclose: {
			attribute: { boolean: true }
		},
		activator: {
			attribute: {},
			set: function (value) {
				var actTag = document.getElementById(value);

				if (actTag) {
					Gesture.enable(actTag, true);
					Event.add(actTag, 'tap', toggleMenu.bind(this), false);
				}
			}
		},
		select: function (menuItem) {
			selectItem(this, menuItem);
		},
		toggle: function () {
			showhide(this);
		}
	});
});