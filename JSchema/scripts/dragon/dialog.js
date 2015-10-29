Dragon.module(['./dom', './classlist', './event', './window', './enum', './anim', './components', './gesture', './dnd', 'dragon/uitools', 'dragon/dialog.html'], function (Dom, Class, Event, Window, Enum, Anim, WC, Gesture, DnD, UITools, doc) {
	var MessageIcon = new Enum({
		error: 'error',
		warning: 'warning',
		info: 'info'
	}),
	DialogButtons = new Enum({
		SaveCancel: [{ text: 'Save', icon: 'ficon-tick', type: 'submit', action: 'save', 'class': 'highlight' }, { text: 'Cancel', icon: 'ficon-close', action: 'cancel' }],
		OkCancel: [{ text: 'Ok', icon: 'ficon-tick', type: 'submit', action: 'ok', 'class': 'highlight' }, { text: 'Cancel', icon: 'ficon-close', action: 'cancel' }],
		Ok: [{ text: 'Ok', icon: 'ficon-tick', action: 'ok', 'class': 'highlight' }],
		YesNo: [{ text: 'Yes', icon: 'ficon-tick', type: 'submit', action: 'yes', 'class': 'highlight' }, { text: 'No', icon: 'ficon-close', action: 'no' }],
		YesNoCancel: [{ text: 'Yes', icon: 'ficon-tick', type: 'submit', action: 'yes', 'class': 'highlight' }, { text: 'No', icon: 'ficon-close', type: 'submit', action: 'no' }, { text: 'Cancel', icon: 'ficon-close', action: 'cancel' }]
	}),
	popupTemplate = doc.querySelector('template');

	// append css to components css
	WC.appendStyle(doc);

	function close() {
		Window.closeModal();
	}

	function createButton(opt) {
		var btn,
			key,
			keys,
			attr;

		// allow support for custom buttons
		if (opt.btnType) {
			btn = document.createElement(opt.btnType);
			delete opt.btnType;
		} else {
			btn = document.createElement('button', 'ctrl-button');
			btn.setAttribute('type', 'button');
		}

		keys = Object.keys(opt);
		for (var i = 0, count = keys.length; i < count; i++) {
			key = keys[i];
			attr = opt[key];

			if (key === 'text') {
				btn[key] = attr;
			} else if (key === 'class') {
				Class.add(btn, attr);
			} else {
				btn.setAttribute(key, attr);
			}
		}

		return btn;
	}

	function createButtons(wnd, opt) {
		var foot = Dom.create('div', 'button-wrap'),
			btns = [],
			setSecurity = !!opt.permission,
			btnOptions, btnPermission,
            button;

		for (var i = 0, count = opt.buttons.length; i < count; i++) {
			btnOptions = opt.buttons[i];

			// permission is set when button is child of wrap
			btnPermission = btnOptions.permission;
			if (btnPermission) {
				delete btnOptions.permission;
			}

			button = createButton(btnOptions);

			foot.appendChild(button);

			if (opt.defaultButton == i) {
				button.setAttribute('type', 'submit' +
					'');
			}

			if (opt.cancelButton == i || button.action == 'cancel') {
				Event.add(button, 'action', close);
			} else {
				btns.push(button);
			}

			// first submit buttons receives form permission
			if (setSecurity && Dom.matches(button, '[type=submit]') && !btnPermission) {
				btnPermission = opt.permission;
			}

			if (btnPermission) {
				button.permission = btnPermission;
				setSecurity = false;
			}
		}

		if (opt.buttons.length > 0) {
			wnd.appendChild(foot);
		}

		return btns;
	}

	function disableButtons() {
		var btns = this || [];

		for (var i = 0, count = btns.length; i < count; i++) {
			btns[i].disabled = true;
		}
	}

	function loadFragment(el) {
		return new Promise(function (resolve, reject) {
			if (typeof el === 'string' || el instanceof String) {
				Dragon.xhr({
					url: el,
					responseType: 'document'
				}).then(function (doc) {
					var tmpl = doc.querySelector('template');

					if (!tmpl) {
						throw new Error("Missing template content.");
					}

					resolve(tmpl.content.cloneNode(true));
				}).catch(reject);
			} else {
				resolve(el);
			}
		});
	}

	function openWindow(wnd, opt, form) {
		var activeBtns;

		if (opt.buttons) {
			activeBtns = createButtons(form || wnd, opt);
		}

		wnd.disableButtons = disableButtons.bind(activeBtns);

		Window.open(wnd, opt);
	}

	function createWindow(opt, loader) {
		var wnd = Dom.create('ctrl-popup', opt.cssClass);

		wnd.appendChild(popupTemplate.content.cloneNode(true));

		var form = wnd.querySelector('form'),
			xclose = wnd.querySelector('.icon-close'),

			subtitle = wnd.querySelector('.ctrl-subtitle');

		// by default popup forms are centered/modal
		opt.modal = true;
		opt.positionOptions = opt.positionOptions || 'center';

		// if no buttons are provided we render by default Save/Cancel
		if (!opt.buttons) {
			opt.buttons = DialogButtons.SaveCancel;
		}

		if (opt.form) {
			form.name = opt.form;
		}

		if (opt.title) {
			WC.setText(wnd.querySelector('.ctrl-title'), opt.title);
		}

		if (opt.subtitle) {
			WC.setText(subtitle.querySelector('h4'), opt.subtitle);
		} else {
			subtitle.parentNode.removeChild(subtitle);
		}

		if (opt.actions) {
			//wnd._actions
			Event.add(wnd, 'action', function(evt) {
				executeAction(wnd,opt, evt.detail.action);
			});
		}

		if (opt.close === false) {
			xclose.parentNode.removeChild(xclose);
		} else {
			Gesture.enable(xclose, true);
			Event.add(xclose, 'tap', close);
		}

		if(loader)
			UITools.beginLoad(form, opt.loadingText);

		openWindow(wnd, opt, form);

		Dragon.Event.add(wnd, 'window_closing', function() {
			executeAction(wnd, opt, 'close');
		});

		// make popup draggable by the header
		DnD.enable(wnd.querySelector('header'), wnd);

		// if there is no action but source consider endpoints same
		if (!opt.action && !opt.submit && opt.source) {
			opt.action = opt.source;
		}

		// proceed with form setup
		if (opt.action) {
			form.action = opt.action;

			if (opt.verb) {
				form.verb = opt.verb;
			}

			// close form when successful
			Event.add(form, 'formsubmit', close);
		}

		// submit function MUST return promise in order to allow rejection!
		// in case user defined own submit function it takes precedence over action submit
		if (opt.submit) {
			var fsubmit = opt.submit.bind(wnd);

			Event.add(form, 'formvalidated', function(evt) {
				// stop default submission
				evt.preventDefault();

				fsubmit(evt.detail.formData).then(close, form.setError.bind(form));
			});
		}

		if (opt.error) {
			Event.add(form, 'formerror', opt.error);
		}

		// make sure load method is bound to wnd
		if (opt.load) {
			opt.load = opt.load.bind(wnd);
		}

		return wnd;
	}

	function executeAction(wnd, opt, action) {
		if (!opt.actions)
			return;

		var fn = opt.actions[action];

		if (fn && Dragon.isType(fn, 'Function'))
			fn.call(wnd);
	}

	function openForm(el, opt) {
		return new Promise(function (resolve, reject) {
			Dragon.use('dragon/components/button', 'dragon/components/form').then(function () {
				var wnd = createWindow(opt, true),
					contentTag = wnd.querySelector('.ctrl-popup-content'),
					form = wnd.querySelector('form');

				function setDataSource(data) {
					if (data) {
						form.dataSource = data;
					}

					//wait for mutation observer to upgrade elements
					//				Dragon.async(function () {
					//position again after content is loadded
					wnd.reposition();
					UITools.endLoad(form);
					resolve(wnd);
					//				});
				}

				function fail(err) {
					// visualize error
					form.setError(err);

					// remove any unbound content
					Dom.empty(contentTag);

					// disable all active buttons
					wnd.disableButtons();

					UITools.endLoad(form);
					reject(err);
				}

				// load content and prepare bindings
				loadFragment(el).then(function (content) {
					contentTag.appendChild(content);

					Dragon.async(function () {
						wnd.reposition();

						// make sure we have focus on first element
						form.focusFirst();

						if (opt.source) {
							Event.add(form, 'formload', function (evt) {
								// stop default data binding
								evt.preventDefault();

								if (opt.load) {
									opt.load(evt.detail.result).then(function (data) {
										setDataSource(data);
									}).catch(fail);
								} else {
									// we are inside event handler so promises are all resolved
									try {
										setDataSource(evt.detail.result);
									} catch (err) {
										fail(err);
									}
								}
							});

							Event.add(form, 'formerror', fail);

							form.src = opt.source;
						} else if (opt.load) {
							opt.load().then(function (data) {
								setDataSource(data);
							}).catch(fail);
						} else {
							setDataSource(opt.dataSource);
						}
					});
				}).catch(fail);
			});
		});
	}

	// has no loading animation
	function openDialog(el, opt) {
		return new Promise(function(resolve, reject) {
			var wnd = Dom.create('ctrl-window', opt.cssClass);

			loadFragment(el).then(function(content) {
				wnd.appendChild(content);
				openWindow(wnd, opt);
				resolve(wnd);
			}).catch(reject);
		});
	}

	// has no loading animation
	function showMessage(title, text, buttons, icon, params) {
		var msgContent = Dom.create('div', 'msg'),
			buttonsList = Array.isArray(buttons);

		WC.setText(msgContent, text, params);

		if (icon)
			msgContent.appendChild(Dom.create('span', 'ctrl-icon icon-' + icon));

		if (!buttonsList && DialogButtons.hasOwnProperty(buttons))
			buttons = DialogButtons[buttons];

		var wnd = createWindow({
				title: title,
				cssClass: 'message',
				defaultButton: buttonsList ? null : 0,
				cancelButton: buttonsList ? null : (buttons ? buttons.length - 1 : 0),
				positionOptions : 'center,center,visible',
				buttons: buttons,
			}),
			contentTag = wnd.querySelector('.ctrl-popup-content');

		contentTag.appendChild(msgContent);

		Event.add(wnd, 'action', function (evt) {
			evt.preventDefault();
			evt.stopPropagation();

			setResult(evt.detail.action);

			Dragon.Event.remove(wnd, 'window_closing', msg_close);
			wnd.close();
		}, true);

		Dragon.Event.add(wnd, 'window_closing', msg_close);

		function msg_close() {
			setResult('cancel');
		}
		function setResult(action) {
			if (wnd._onresult)
				wnd._onresult.call(wnd, action);

			Dragon.Event.raise(wnd, 'message_result', {action: action});
		}

		wnd.onresult = function(fn) {
			wnd._onresult = fn;
		};

		return wnd;
	}

	function showError(text, params) {
		return showMessage('Error Message', text, DialogButtons.Ok, MessageIcon.error, params);
	}

	function showWarning(text, params) {
		return showMessage('Warning Message', text, DialogButtons.Ok, MessageIcon.warning, params);
	}

	function showConfirm(text, params) {
		return showMessage('Confirmation Message', text, DialogButtons.YesNo, MessageIcon.warning, params);
	}

	function showLegend(source) {
		var legendTemplate = doc.querySelector('[name="legend"]').content.cloneNode(true);

		openForm(legendTemplate, {
			title: 'LEGEND',
			cssClass: 'legend',
			source: source,
			buttons: DialogButtons.Ok,
			cancelButton: 0
		});
	}

	return {
		showDialog: openDialog,
		showForm: openForm,
		showMessage: showMessage,
		showError: showError,
		showWarning: showWarning,
		showConfirmation: showConfirm,
		showLegend: showLegend,
		close: close,
		MessageIcon: MessageIcon,
		DialogButtons: DialogButtons
	};
});
//TODO think if it is possible to make mobile size popups without adding modal-window class on html element