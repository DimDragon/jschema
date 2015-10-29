Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/event', 'dragon/dom', 'dragon/binding'], function (WC, CL, Event, Dom, Binding) {
	function render(list) {
		var items = list.ctrl.dataSource,
			itemTemplate = list.ctrl.itemTemplate,
			frag = document.createDocumentFragment();

		Dom.empty(list);

		for (var i = 0, count = items.length; i < count; i++) {
			var listItem = itemTemplate.cloneNode(true);

			listItem.querySelector(list.items)._dataItem = Binding.resolve(listItem, items[i]);
			frag.appendChild(listItem);
		}

		list.appendChild(frag);
	}

	function addPlaceholder(list) {

	}

	function activateItem(item) {
		item.draggable = true;

		Event.add(item, 'dragstart', function (evt) {
			var listitem = this,
				rect = this.getBoundingClientRect(),
				dt = evt.dataTransfer;

			dt.effectAllowed = 'all';
			//dt.dropEffect = 'move';
			dt.setData('text/html', this.outerHTML);
			dt.setDragImage(listitem, evt.clientX - rect.left, evt.clientY - rect.top);

			Dragon.async(function () {
				CL.add(listitem, 'dragged');
			});
		
			listitem.parentNode.ctrl.dragged = listitem;
		});

		Event.add(item, 'dragenter', function (evt) {
			var el = this,
				list = el.parentNode,
				drag = list.ctrl.placeholder || list.ctrl.dragged;

			//console.log('drag enter: ' + evt.target.textContent);
			evt.preventDefault();
			evt.dataTransfer.dropEffect = 'move';

			if (el.compareDocumentPosition(drag) & Node.DOCUMENT_POSITION_FOLLOWING) {
				//console.log('Entered: ' + this.textContent);
				el.parentNode.insertBefore(drag, el);
			} else if (el != drag) {
				//console.log('Entered: ' + el.textContent + ' Dragged: ' + drag.textContent);
				el.parentNode.insertBefore(drag, el.nextSibling);
			}
		});

		Event.add(item, 'dragover', function (evt) {
			evt.preventDefault();
			//evt.dataTransfer.dropEffect = 'copy';
		});

		Event.add(item, 'dragend', function (evt) {
			CL.remove(this, 'dragged');

			// remove current drag selection
			//list.ctrl.dragged = null;
		});
	}

	function customize(list) {
		var items = list.querySelectorAll(list.items),
			item;

		if (!items) {
			return;
		}

		Event.add(list, 'dragenter', function (evt) {
			var lst = this;

			//console.log('at dragenter', lst.id, lst.ctrl.placeholder, lst.ctrl.dragged);

			if (!lst.ctrl.placeholder && !lst.ctrl.dragged) {
				var ph = Dom.create('li', 'sort-placeholder'),
					phWrap = Dom.create('div', 'dash-wrap');

				phWrap.appendChild(Dom.create('span', 'ficon ficon-circle-plus'));
				ph.appendChild(phWrap);
				lst.appendChild(ph);
				//list.ctrl.dragged = ph;
				lst.ctrl.placeholder = ph;
				console.log('created placeholder');

				Event.add(ph, 'dragenter', function (evt) {
					evt.preventDefault();
					evt.dataTransfer.dropEffect = 'copy';
				});

				Event.add(ph, 'dragover', function (evt) {
					evt.preventDefault();
					evt.dataTransfer.dropEffect = 'copy';
				});

			    Event.add(ph, 'drop', function(evt) {
			        var tmp = document.createElement('div'),
			            lst = this.parentNode,
			            linked = lst._targetList || lst.ctrl.sourceList;

			        // some browser consider this as mouse event and will also result in a click
			        evt.preventDefault();

			        lst.ctrl.placeholder = null;

			        if (linked) {
			            lst.replaceChild(linked.ctrl.dragged, this);
			            linked.ctrl.dragged = null;
			        }

			        //tmp.innerHTML = evt.dataTransfer.getData('text/html');
			        //activateItem(lst, tmp.firstChild);
			        //lst.replaceChild(tmp.firstChild, this);

			        //console.log('Dropped: ' + )
			    });
			}
		}, true);

		Event.add(list, 'dragend', function (evt) {
			var operation = evt.dataTransfer.dropEffect,
				linked = this._targetList || this.ctrl.sourceList;
				//tList = this._targetList,
				//sList = this.ctrl.sourceList;

			if (linked && operation != 'copy') {
				if (linked.ctrl.placeholder) {
					linked.removeChild(linked.ctrl.placeholder);
					linked.ctrl.placeholder = null;
				}
			}

			//console.log('clear dragged', this.ctrl.dragged);
			this.ctrl.dragged = null;
			

			// operation from source list to target list(addition)
			//if (tList) {
			//	if (operation == 'copy') {
			//		this.removeChild(this.ctrl.dragged);
			//	} else if (tList.ctrl.placeholder) {
			//		tList.removeChild(tList.ctrl.placeholder);
			//		tList.ctrl.placeholder = null;
			//	}
			//} else if (sList) {
			//	// oparation from target list to source list(deletion)
			//	if (operation == 'copy') {
			//		this.removeChild(this.ctrl.dragged);
			//	} else {
			//		sList.removeChild(sList.ctrl.placeholder);
			//		sList.ctrl.placeholder = null;
			//	}
			//}


			//console.log('end drag operation: ' + evt.dataTransfer.dropEffect);
			//if (this.ctrl.placeholder) {
			//	this.removeChild(this.ctrl.placeholder);
			//	this.ctrl.placeholder = null;
			//}
		});

		for (var i = 0, count = items.length; i < count; i++) {
			activateItem(items[i]);
		}
	}

	return WC.register('ctrl-sortlist', {
		lifecycle: {
			created: function () {
				var itemTmpl = this.querySelector('template');

				if (itemTmpl) {
					this.ctrl.itemTemplate = itemTmpl.content;
				} else {
					throw new Error('Missing item template for sortlist');
				}

				this.removeChild(itemTmpl);
			}
		},
		items: {
			attribute: {},
			get: function () {
				return this.ctrl.items || 'li';
			},
			set: function (value) {
				this.ctrl.items = value;
			}
		},
		src: {
			attribute: {},
			get: function () {
				return this.ctrl.source;
			},
			set: function (value) {
				var list = this;

				list.ctrl.source = value;

				Dragon.xhr({
					url: value
				}).then(function (res) {
					list.dataSource = res;
				}).catch(function (err) {
					throw new Error('Invalid source: ' + err);
				});
			}
		},
		dataSource: {
			get: function () {
				return this.ctrl.dataSource;
			},
			set: function (value) {
				if (!Array.isArray(value)) {
					throw new Error('Data source of sorlist must be an array');
				}

				this.ctrl.dataSource = value;

				render(this);
			}
		},
		value: {
			get: function () {
				var items = this.querySelectorAll(this.items),
					arr = [];

				for (var i = 0, count = items.length; i < count; i++) {
					arr.push(items[i]._dataItem);
				}

				return arr;
			}
		},
		enabled: {
			attribute: { boolean: true },
			set: function (value) {
				if (value) {
					customize(this);
				}
			}
		},
		linked: {
			attribute: {},
			set: function (value) {
				var linkList = document.getElementById(value);

				if (linkList && (linkList.nodeName.toUpperCase() == 'CTRL-SORTLIST' || linkList.getAttribute('is') == 'ctrl-sortlist')) {
					this.ctrl.sourceList = linkList;
					linkList._targetList = this;  // [DD] Do we need this link?
				} else {
					throw new Error('Incorrect value for linked list');
				}
			}
		}
	});
});

// src: used to load and save
// editable: switch edit mode on/off
// dataSource