Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/event', 'dragon/gesture', 'dragon/components/img-select.html'], function (WC, Class, Event, Gesture, doc) {
	var DATA_PREFIX = 'data:image/png;base64,',
		TOGGLE_CLASS = 'toggle',
		actions = {
			change: function () {
				var ctrl = this,
					inpFile = inputFileCreate();

				Dragon.Event.add(inpFile, 'change', readFile, false);
				inpFile.click();

				function readFile(evt) {
					var file,
						target = this != window ? this : evt.target || evt.srcElement;
					if (target.files.length == 0)
						return;
					file = target.files[0];
					var reader = new FileReader();
					reader.onload = (function (inpFile) {
						return function (e) {
							ctrl.value = e.target.result.replace(/data:image\/\w+;base64,/, '');

							Event.raise(ctrl, 'change');

							inpFile.parentNode.removeChild(inpFile);
						};
					})(this);
					reader.readAsDataURL(file);
				}
			},
			clear: function () {
				this.value = null;
				if (this.defsrc) {
					this.src = this.defsrc;
				}
			}
		};

	function resizeImg(src) {
		var ctrlImg = this.shadowRoot.querySelector('img'),
			imgHolder = this.shadowRoot.querySelector('.holder'),
			img = document.createElement('img'),
			coef;

		img.onload = function () {
			coef = Math.max(imgHolder.clientWidth / img.width, imgHolder.clientHeight / img.height);

			ctrlImg.height = img.height * coef;
			ctrlImg.width = img.width * coef;
		}

		img.src = src;
	}

	function inputFileCreate() {
		var inpFile = document.createElement('input');

		inpFile.type = 'file';
		inpFile.name = 'inpFile';
		inpFile.id = 'inpFile';
		inpFile.style.display = 'none';

		document.forms[0].appendChild(inpFile);

		return inpFile;
	}

	function toggle(evt) {
		evt.stopPropagation();
		console.log('toggle');
		showhide(this);
	}

	function autoClose(evt) {
		var target = evt.target,
			imgSel = this;
		console.log('autoClose');
		if (!imgSel.contains(target) && target != imgSel && Class.contains(imgSel, TOGGLE_CLASS)) {
			showhide(imgSel);
		}
	}

	function showhide(imgSel) {
		var action = Class.contains(imgSel, TOGGLE_CLASS) ? 'remove' : 'add';

		Class[action](imgSel, TOGGLE_CLASS);

		Gesture[action + 'StartEvent'](document, imgSel.ctrl.autoclose);
	}

	function actionCall(evt) {
		actions[evt.detail.action].call(this);
	}

	function attachToggleAndAction(el) {
		Gesture.enable(el);
		Event.add(el, 'tap', toggle);
		console.log('attachToggleAndAction');
		Event.add(el, 'action', actionCall);
	}

	function detachToggleAndAction(el) {
		Class.remove(el, TOGGLE_CLASS);
		console.log(el);
		Gesture['removeStartEvent'](document, el.ctrl.autoclose);

		Gesture.disable(el);
		Event.remove(el, 'tap', toggle);

		Event.remove(el, 'action', actionCall);
	}

	return WC.register('ctrl-img-select', {
		template: doc.querySelector('template'),
		lifecycle: {
			created: function () {
				/*
				Gesture.enable(this);
				Event.add(this, 'tap', toggle);

				Event.add(this, 'action', function (evt) {
					actions[evt.detail.action].call(this);
				});
				*/
				attachToggleAndAction(this);

				this.ctrl.autoclose = autoClose.bind(this);
			}
		},
		name: {
			attribute: {}
		},
		width: {
			attribute: { select: 'img' }
		},
		height: {
			attribute: { select: 'img' }
		},
		src: {
			attribute: { select: 'img' }
		},
		defsrc: {
			attribute: {},
			set: function (value) {
				if (!this.src && !this.ctrl.rawValue && !this.hasAttribute('value')) {
					this.src = value;
				}
			}
		},
		disabled: {
			attribute: { boolean: true },
			set: function (value) {
				detachToggleAndAction(this);
				if (!value)
					attachToggleAndAction(this);
			}
		},
		value: {
			attribute: {},
			get: function () {
				if (this.ctrl.rawValue) {
					return this.ctrl.rawValue;
				} else {
					return this.src != this.defsrc ? this.src : null;
				}
			},
			set: function (value) {
				this.ctrl.rawValue = value;

				if (value == null) {
					if (this.defsrc) {
						this.src = this.defsrc;
						resizeImg.call(this, this.defsrc);
					}
				} else {
					this.src = DATA_PREFIX + value;
					resizeImg.call(this, DATA_PREFIX + value);
				}

				this.removeAttribute('value');
			}
		}
	});
});