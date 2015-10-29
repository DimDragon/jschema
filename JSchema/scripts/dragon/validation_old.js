Dragon.module(['./event', './dom', './classlist', './domobserver'], function (Event, Dom, CL, Obs) {
	var ignoredTypes = /^(submit|image|button|reset|hidden)$/i,
			matchTypes = /^(date|week|month|time)$/i,
			placeholderTypes = /^(text|search|url|tel|email|password)$/i,
			useOwn = true,
			isPlaceholderSupport = 'placeholder' in document.createElement('input'),
			isRequiredSupport = 'required' in document.createElement('input'),
			isFormAttributeSupport = checkFormAttributeSupport();

	//function fireDefaultButton(evt) {
	//	var keyNum = evt.keyCode;
	//	if (keyNum == 13 || keyNum == 10) {
	//		var target = evt.target;
	//		if (!target || (target.tagName.toLowerCase() != "textarea")) {
	//			//Dragon.Event.raise(this, 'submit');
	//			//this.submit();
	//			var btn = Dragon.Dom.find(this, '[type=\'submit\']')[0];
	//			if (btn)
	//				btn.click();
	//		}
	//	}
	//	return true;
	//}

	function showError(e) {
		var detail = (e._origEvent || e).detail,
			els = detail.invalidElements;
		els[0].element.focus();
		//console.log(els[0].id + " " + els[0].message);
	}

	function preventErrorBubble(e) {
		Event.cancel(e);
	}

	function init(cnt) {
		var cnt = cnt || document,
			forms = cnt.getElementsByTagName('form');
		for (var i = 0, form = forms[i]; form; form = forms[++i]) {
			initForm(form);
		}
	}

	var currentValue, isInvalid;

	function initForm(form) {
		if (!form.hasAttribute('novalidate')) {
			// catch change of any element to activate inline validation
			Event.add(form, "change", function (evt) {
				var el = evt.target;

				var isValid = el.checkValidity();

				if (isValid) {
					CL.remove(el, 'invalid');
					if (!CL.contains(el, 'isValid')) {
						CL.add(el, 'isValid');
					}
				} else {
					CL.remove(el, 'isValid');
					if (!CL.contains(el, 'invalid')) {
						CL.add(el, 'invalid');
					}

					// [DD] here we can provide hint what is wrong using validationMessage
				}
			}, false);
			// inline validation while typing
			Event.add(form, "keyup", inlineValidate, false);
			// catch validation event
			Event.add(form, "on_validate", showError, false);

			// init all form child elements
			upgradeElement(form);

			// init associated form elements
			if (form.id) {
				initElements(document.documentElement.querySelectorAll('[form="' + form.id + '"]'));
			}
		}
	}

	function inlineValidate(evt) {
		var el = evt.target,
			isValid;

		if (el.willValidate && CL.contains(el, 'invalid')) {
			isValid = el.checkValidity();

			if (isValid) {
				CL.remove(el, 'invalid');
				CL.add(el, 'isValid');
			}
		}
	}

	function upgradeElement(root) {
		initElements(root.getElementsByTagName('*'));
	}

	function initElements(elems) {
		for (var i = 0, count = elems.length; i < count; i++) {
			initElement(elems[i]);
		}
	}

	function initElement(el) {
		var type = el.getAttribute('type');

		// polyfill placeholder is absent (IE9)
		if (el.getAttribute('placeholder') != null && !isPlaceholderSupport && placeholderTypes.test(type)) {
			createPlaceholderDiv(el);
		}

		// make sure number types returns back old value in case of invalid entry
		if (type === 'number') {
			Event.add(el, 'focus', function () {			// [DD] double-check this!!!
				this.oldValue = this.value && !isNaN(this.value) ? this.value : '';
			}, false);
		}

		// add our own css class for required fields
		if (el.hasAttribute('required')) {
			CL.add(el, 'required');
		}

		// [DD] we should fire same event in our polyfill
		// so this probably should be attached to all fields
		if (nativeValidation && el.willValidate) {
			Event.add(el, 'invalid', validateElem, false);

			// check for missing constraints support
			addMissingAttributes(el);

			// add also inline validation
		}

		if (!nativeValidation) {
			Dragon.extend(el, {
				willValidate: true,
				validity: {},
				validationMessage: "",
				checkValidity: function () {
					return true;
				}
			});
		}


		//// wire up validation
		//if (willValidate(el)) {
		//	Event.add(el, 'invalid', preventErrorBubble, false);
		//	if (el.hasAttribute('required') && !isRequiredSupport) {
		//		CL.add(el, 'required');
		//	}
		//}
	}


	function addMissingAttributes(el) {
		var origCheckValidity = el.checkValidity.bind(el),
			attr,
			constraint,
			validators = [],
			keys = Object.keys(constraints);

		for (var i = 0, count = keys.length; i < count; i++) {
			attr = keys[i];
			constraint = constraints[attr];

			if (!unsupportedAttributes[attr] && Dom.matches(el, constraint.applicable)) {
				validators.push(constraint.validate.bind(el));
			}
		}

		// generate new checkValidity
		el.checkValidity = function () {
			var isValid = origCheckValidity();

			for (var j = 0, vCount = validators.length; j < vCount; j++) {
				isValid = isValid && validators[j]();
			}

			return isValid;
		}
	}


	function willValidate(el) {
		if (el.willValidate)
			return el.willValidate;
		var tagName = el.tagName.toLowerCase(),
			isInput = tagName === 'input';
		if (tagName === 'select' || tagName === 'textarea' || isInput) {
			if (isInput) {
				var type = el.type,
					excludeType = /^(hidden|button|reset|submit|image)$/i;
				if (excludeType.test(type))
					return false;
			}
			var isReadOnly = el.readOnly || !!el.getAttribute('readonly'),
				isDisabled = el.disabled || !!el.getAttribute('disabled');
			if (isReadOnly || isDisabled)
				return false;
			return true;
		}
		return false;
	}


	function validateElem(evt) {
		evt.preventDefault();

		console.log('Validate field: ');
		console.log(this);
	}

	function initField(form) {
		var type,
			inptsCnt = 0;
		for (var i = 0, el = form[i]; el; el = form[++i]) {
			type = el.getAttribute('type');
			if (type === 'number')
				Dragon.Event.add(el, 'focus', function () { this.oldValue = this.value && !isNaN(this.value) ? this.value : ''; }, false);
			if (el.getAttribute('placeholder') != null && !isPlaceholderSupport && placeholderTypes.test(type)) {
				i += createPlaceholderDiv(el);
			}
			if (willValidate(el)) {
				Dragon.Event.add(el, 'invalid', preventErrorBubble, false);
				if (el.hasAttribute('required') && !isRequiredSupport) {
					Dragon.Class.add(el, 'required');
				}
			}
			if (!ignoredTypes.test(type))
				inptsCnt++;
		}



		//if (inptsCnt === 1 && Dragon.Dom.find(form, '[type=\'submit\']').length === 0) {
		//	var inp = document.createElement('input');
		//	inp.setAttribute('type', 'text');
		//	Dragon.Class.add(inp, 'hidden-element');
		//	inp.setAttribute('hidden', 'true');
		//	form.appendChild(inp);
		//}
	}

	function createPlaceholderDiv(el) {
		var exclude = /^(id|name|type|placeholder|required|autofocus)$/i;
		if (el.getAttribute('type') == 'password') {
			var elem = document.createElement('input');
			elem.setAttribute('type', 'text');
			elem.value = Dragon.Globalization.getText(el.getAttribute('placeholder'));
			for (var i = 0, l = el.attributes.length; i < l; i++) {
				var attr = el.attributes[i];
				if (!exclude.test(attr.nodeName)) {
					elem.setAttribute(attr.nodeName, attr.nodeValue);
				}
			}
			Dragon.Class.add(elem, 'placeholder');
			if (el.hasAttribute('required') && !isRequiredSupport) {
				Dragon.Class.add(elem, 'required');
			}
			el.parentNode.insertBefore(elem, el);
			Dragon.Event.add(elem, 'focus', (function (el) {
				return function () {
					Dragon.extend(this, { display: 'none' });
					Dragon.extend(el, { display: 'block' });
					el.focus();
				};
			})(el), false);
			Dragon.Event.add(el, 'blur', (function (elem) {
				return function () {
					if (this.value === '') {
						Dragon.extend(this, { display: 'none' });
						Dragon.extend(elem, { display: 'block' });
					}
				};
			})(elem), false);
			Dragon.extend(el, { display: 'none' });
			return 1;
		} else {
			if (el.value === '' && el != document.activeElement) {
				Dragon.Class.add(el, 'placeholder');
				el.value = Dragon.Globalization.getText(el.getAttribute('placeholder'));
			}
			Dragon.Event.add(el, 'focus', function () {
				if (Dragon.Class.contains(this, 'placeholder')) {
					Dragon.Class.remove(this, 'placeholder');
					this.value = '';
				}
			}, false);
			Dragon.Event.add(el, 'blur', function () {
				if (this.value == '') {
					Dragon.Class.add(this, 'placeholder');
					this.value = Dragon.Globalization.getText(this.getAttribute('placeholder'));
				}
			}, false);
		}
		return 0;
	}

	//function submitAjax(e, addData) {
	//	Dragon.Event.cancel(e);
	//	var target = this != window ? this : e.target,
	//	postData = createPostData(target),
	//	success = target.id + target.method,
	//	error = target.id + "error";
	//	for (var k in addData) {
	//		postData[k] = addData[k];
	//	}
	//	//console.log(postData);
	//	//console.log(target);
	//	Dragon.ajax({
	//		verb: target.method,
	//		service: target.action,
	//		data: JSON.stringify(postData),//postData
	//		success: window[success],
	//		error: window[error]
	//	});
	//}

	//function createPostData(form) {
	//	var postData = {};
	//	for (var i = 0, l = form.length; i < l; i++) {
	//		var el = form[i];
	//		if (el.name === '')
	//			continue;
	//		switch (el.tagName.toLowerCase()) {
	//			case 'input':
	//				{
	//					var type = el.type,
	//						orgType = el.orgType;
	//					if ((type == "text" && !orgType) || type == "password" || type == "number" || type == "range" ||
	//						type == "email" || type == "url" || type == "tel" ||
	//						((type == "checkbox" || type == "radio") && el.checked)) {
	//						postData[el.name] = el.value;
	//					} else if (orgType) {
	//						postData[el.name] = el.ctrlWrapper.ctrl.value();
	//						/*
	//						switch (orgType) {
	//							case 'date': {
	//								var val = el.ctrlWrapper.ctrl.value();
	//								postData[el.name] = val != '' ? Dragon.Data.formatDate(val, 'yyyy-MM-dd') : '';
	//							} break;
	//							default: {
	//								postData[el.name] = el.ctrlWrapper.ctrl.value();
	//							} break;
	//						}
	//						*/
	//					}
	//				} break;
	//			case 'select':
	//				{
	//					postData[el.name] = el.value; //el.options[el.selectedIndex].value;
	//				} break;
	//			case 'textarea':
	//				{
	//					postData[el.name] = el.value;
	//				} break;
	//		}
	//	}
	//	return postData;
	//}

	function encode(p) {
		return encodeURIComponent ? encodeURIComponent(p) : escape(p);
	}

	var getFormElement = (function () {
		if (isFormAttributeSupport) {
			return function (form) {
				return form;
			}
		} else {
			return function (form) {
				var formId = form.id,
					frmEls = Dragon.Dom.find(document, '[form=\'' + formId + '\']'),
					els = [],
					el,
					attrForm;
				for (var i = 0, l = form.length; i < l; i++) {
					el = form[i];
					attrForm = (el.getAttribute('form') && el.getAttribute('form').nodeType && el.getAttribute('form').nodeType == 1) ?
										el.getAttribute('form').id : el.getAttribute('form');
					if (!(attrForm != null && attrForm.indexOf(formId) === -1)) {
						els.push(el);
					}
				}
				for (var i = 0, l = frmEls.length; i < l; i++) {
					el = frmEls[i];
					if (els.indexOf(el) === -1) {
						els.push(el);
					}
				}
				return els;
			}
		}
	})();

	function willValidate(el) {
		if (el.willValidate)
			return el.willValidate;
		var tagName = el.tagName.toLowerCase(),
			isInput = tagName === 'input';
		if (tagName === 'select' || tagName === 'textarea' || isInput) {
			if (isInput) {
				var type = el.type,
					excludeType = /^(hidden|button|reset|submit|image)$/i;
				if (excludeType.test(type))
					return false;
			}
			var isReadOnly = el.readOnly || !!el.getAttribute('readonly'),
				isDisabled = el.disabled || !!el.getAttribute('disabled');
			if (isReadOnly || isDisabled)
				return false;
			return true;
		}
		return false;
	}

	function validateField(el) {
		var tagName = el.tagName.toLowerCase();
		if (!willValidate(el))
			return true;
		if (!el.validity)
			extendWithValidity(el);
		if (!el.setCustomValidity)
			el.setCustomValidity = setCustomValidity;
		switch (tagName) {
			case 'input':
				{
					return validateInput(el);
				} break;
			case 'select':
				{
					return validateSelect(el);
				} break;
			case 'textarea':
				{
					return validateTextarea(el);
				} break;
		}
		return true;
	}

	function validateForm(e) {
		if (!validate(this)) {
			Dragon.Event.cancel(e);
			//e.stopImmediatePropagation();
		}
	};

	function validate(form) {
		try {
			var isValid = true,
			els = getFormElement(form),
			invalidElements = [],
			radio = [];
			//console.log("validate form: \"" + form.id + "\"");
			for (i = 0; i < els.length; i++) {
				var el = els[i],
					tagName = el.tagName.toLowerCase();
				if (!willValidate(el))
					continue;
				switch (tagName) {
					case 'input':
						{
							if (el.type === 'radio' && !addRadioGroupToValidate(radio, el))
								continue;
							if (!el.validity)
								extendWithValidity(el);
							if (!el.setCustomValidity)
								el.setCustomValidity = setCustomValidity;
							if (!validateInput(el)) {
								invalidElements.push({ element: el, message: el.errorMessage });
								isValid = false;
							}
						} break;
					case 'select':
						{
							if (!el.validity)
								extendWithValidity(el);
							if (!el.setCustomValidity)
								el.setCustomValidity = setCustomValidity;
							if (!validateSelect(el)) {
								invalidElements.push({ element: el, message: el.errorMessage });
								isValid = false;
							}
						} break;
					case 'textarea':
						{
							if (!el.validity)
								extendWithValidity(el);
							if (!el.setCustomValidity)
								el.setCustomValidity = setCustomValidity;
							if (!validateTextarea(el)) {
								invalidElements.push({ element: el, message: el.errorMessage });
								isValid = false;
							}
						} break;
				}
			}
			//console.log("form \"" + form.id + "\" is isValid: " + isValid);
		} catch (w) {
			//console.log(w);
		}
		if (!isValid) {
			Dragon.Event.raise(form, 'on_validate', { 'invalidElements': invalidElements });
		}
		return isValid;
	}

	function checkInputTypeSupport(el) {
		var type = el.orgType || el.getAttribute('type'),
			inp = document.createElement('input');
		inp.setAttribute('type', type);
		return inp.type === type || (el.orgType && el.orgType == el.getAttribute('type'));
	}

	function checkAttributeSupport(el) {
		var attr,
			excludeAttr = /^(class|placeholder|readonly|data-\w+)$/i;
		for (var i = 0, l = el.attributes.length; i < l; i++) {
			attr = el.attributes[i];
			if (!excludeAttr.test(attr.name))
				if (!(attr.name in el))
					return false;
		}
		return true;
	}

	// [DD] Only IE doesn't support form attribute
	function checkFormAttributeSupport() {
		var inp = document.createElement('input'),
			isSupport;
		try {
			inp.setAttribute('form', document.forms[0].id);
		} catch (e) {
			return false;
		}
		document.body.appendChild(inp);
		isSupport = !(inp.form == null);
		document.body.removeChild(inp);
		return isSupport;
	}

	function validateSelect(el) {
		var isValid = true,
			errMsg = getDataError(el);
		el.errorMessage = '';
		el.setCustomValidity('');
		if (!checkAttributeSupport(el)) {
			var hasValue = (function () {
				var hasValue = false;
				for (var i = 0, opt = el.options[i]; opt; opt = el.options[++i]) {
					if (opt.selected) hasValue = !!opt.value && hasValue;
				}
				return hasValue;
			})(),
				isRequired = el.hasAttribute('required');
			isValid = !(isRequired && !hasValue);
			if (!isValid) {
				el.errorMessage = errMsg || getErrorMessage('valueMissing');
			}
		} else {
			if (!el.validity.isValid) {
				isValid = false;
				el.errorMessage = errMsg || el.validationMessage;
			}
		}
		if (isValid && el.customValidators) {
			for (var i = 0, l = el.customValidators.length; i < l; i++) {
				if (!el.customValidators[i].action.call(el)) {
					isValid = false;
					el.errorMessage += (el.errorMessage !== '' ? '\n' : '') + el.customValidators[i].message;
					break;
				}
			}
		}
		el.setCustomValidity(el.errorMessage);
		setValidationClass(el, isValid);
		//console.log("name: \"" + (el.name || "none") + "\" tag: \"select\" value: \"" + el.options[el.selectedIndex].value + "\" is isValid: " + isValid);
		return isValid;
	}

	function validateTextarea(el) {
		var isValid = true,
			errMsg = getDataError(el);
		el.errorMessage = '';
		el.setCustomValidity('');
		if (!checkAttributeSupport(el)) {
			var value = inputGetValue(el),
				hasValue = value.trim() != '',
				isRequired = el.hasAttribute('required');
			isValid = !(isRequired && !hasValue);
			if (!isValid) {
				el.errorMessage = errMsg || getErrorMessage('valueMissing');
			}
		} else {
			if (!el.validity.isValid) {
				isValid = false;
				el.errorMessage = errMsg || el.validationMessage;
			}
		}
		if (isValid && el.customValidators) {
			for (var i = 0, l = el.customValidators.length; i < l; i++) {
				if (!el.customValidators[i].action.call(el)) {
					isValid = false;
					el.errorMessage += (el.errorMessage !== '' ? '\n' : '') + el.customValidators[i].message;
					break;
				}
			}
		}
		el.setCustomValidity(el.errorMessage);
		setValidationClass(el, isValid);
		//console.log("name: \"" + (el.name || "none") + "\" tag: \"textarea\" value: \"" + el.value + "\" is isValid: " + isValid);
		return isValid;
	}

	function validateInput(el) {
		var isValid = true,
			type = el.orgType || el.getAttribute('type');
		el.errorMessage = '';
		el.setCustomValidity('');
		if (!checkInputTypeSupport(el) || !checkAttributeSupport(el) || !el.checkValidity) {
			switch (type) {
				case 'text': isValid = validateInputText(el); break;
				case 'password': isValid = validateInputPassword(el); break;
				case 'number': case 'range': isValid = validateInputNumber(el); break;
				case 'date': case 'month': case 'week': case 'time': isValid = validateInputDate(el, type); break;
				case 'email': isValid = validateInputEmail(el); break;
				case 'url': isValid = validateInputUrl(el); break;
				case 'checkbox': isValid = validateInputCheckBox(el); break;
				case 'radio': isValid = validateInputRadio(el); break;
				case 'file': isValid = validateInputFile(el); break;
			}
		} else {
			if (!el.validity.isValid) {
				isValid = false;
				el.errorMessage = getDataError(el) || el.validationMessage;
			}
		}
		if (isValid && el.customValidators) {
			for (var i = 0, l = el.customValidators.length; i < l; i++) {
				if (!el.customValidators[i].action.call(el)) {
					isValid = false;
					el.errorMessage += (el.errorMessage !== '' ? '\n' : '') + el.customValidators[i].message;
					break;
				}
			}
		}
		if (type === 'radio') {
			var radio = getRadioButtons(el);
			for (var j = 0, l = radio.length; j < l; j++) {
				radio[j].setCustomValidity(el.errorMessage);
				setValidationClass(el, isValid);
			}
		} else {
			el.setCustomValidity(el.errorMessage);
			setValidationClass(el, isValid);
			//console.log("name: \"" + (el.name || "none") + "\" type: \"" + type + "\" value: \"" + inputGetValue(el) + "\" is isValid: " + isValid);
		}
		return isValid;
	}

	function inputGetValue(el) {
		var hasPlaceholder = el.getAttribute('placeholder') != undefined;
		return (hasPlaceholder && !isPlaceholderSupport && el.getAttribute('placeholder') === el.value) ?
			'' : el.value;
	}

	function validateInputText(el) {
		var isValid = true,
			value = inputGetValue(el), //el.value,
			hasValue = value.trim() != '',
			isRequired = el.hasAttribute('required'),
			pattern = el.getAttribute("pattern"),
			errMsg = getDataError(el);
		isValid = !(isRequired && !hasValue);
		if (!isValid) {
			el.errorMessage = errMsg || getErrorMessage('valueMissing');
			return false;
		}
		if (hasValue && pattern != null) {
			isValid = new RegExp(pattern).test(value);
			if (!isValid) {
				el.errorMessage = errMsg || getErrorMessage('patternMismatch');
				return false;
			}
		}
		return isValid;
	}

	function validateInputPassword(el) {
		var isValid = true,
			value = el.value,
			hasValue = value != '',
			isRequired = el.hasAttribute('required');
		errMsg = el.getAttribute('data-error') != null ? el.getAttribute('data-error') : undefined;
		isValid = !(isRequired && !hasValue);
		if (!isValid)
			el.errorMessage = errMsg || getErrorMessage('valueMissing');
		return isValid;
	}

	function validateInputEmail(el) {
		var isValid = true,
			value = el.value,
			hasValue = value != '',
			isRequired = el.hasAttribute('required');
		errMsg = el.getAttribute('data-error') != null ? el.getAttribute('data-error') : undefined;
		isValid = !(isRequired && !hasValue);
		if (!isValid) {
			el.errorMessage = errMsg ? errMsg : getErrorMessage('valueMissing');
			return false;
		}
		if (hasValue) {
			isValid = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i.test(value);
			if (!isValid) {
				el.errorMessage = errMsg || getErrorMessage('typeMismatch');
				return false;
			}
		}
		return isValid;
	}

	function validateInputUrl(el) {
		var isValid = true,
			value = el.value,
			hasValue = value != '',
			isRequired = el.hasAttribute('required');
		errMsg = el.getAttribute('data-error') != null ? el.getAttribute('data-error') : undefined;
		isValid = !(isRequired && !hasValue);
		if (!isValid) {
			el.errorMessage = errMsg ? errMsg : getErrorMessage('valueMissing');
			return false;
		}
		if (hasValue) {
			isValid = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(value);
			if (!isValid) {
				el.errorMessage = errMsg || getErrorMessage('typeMismatch');
				return false;
			}
		}
		return isValid;
	}

	function validateInputNumber(el) {
		var isValid = true,
			value = inputGetValue(el), //el.value,
			hasValue = value != '',
			isRequired = el.hasAttribute('required'),
			min = el.getAttribute('min'),
			max = el.getAttribute('max'),
			step = el.getAttribute('step') || '1',
			errMsg = el.getAttribute('data-error') != null ? el.getAttribute('data-error') : undefined;
		if (isNaN(value)) {
			value = el.oldValue && !isNaN(el.oldValue) ? el.oldValue : '';
			el.value = value;
			hasValue = value != '';
		}
		isValid = !(isRequired && !hasValue);
		if (!isValid || !hasValue) {
			el.errorMessage = !isValid ? (errMsg || getErrorMessage('valueMissing')) : '';
			return isValid;
		}
		//if (isNaN(value)) {
		//if (el.oldValue) {
		//	el.value = el.oldValue;
		//} else {
		//	el.errorMessage = errMsg ? errMsg : 'This is not a number.';
		//}
		//return false;
		//}
		if (isValid && min && !isNaN(min)) {
			isValid = parseFloat(value) >= parseFloat(min);
			if (!isValid) {
				el.errorMessage = getErrorMessage('rangeUnderflow');
				return false;
			}
		}
		if (isValid && max && !isNaN(max)) {
			isValid = parseFloat(value) <= parseFloat(max);
			if (!isValid) {
				el.errorMessage = getErrorMessage('rangeOverflow');
				return false;
			}
		}
		if (isValid && step && !isNaN(step)) {
			min = min || '0';
			var difference = (value - min).toFixed(Math.max(getNumberFractionPart(value), getNumberFractionPart(min))),
				pow = Math.max(getNumberFractionPart(difference), getNumberFractionPart(step)),
				factor = Math.pow(10, pow);
			isValid = Math.round(difference * factor) % Math.round(step * factor) == 0;
			if (!isValid) {
				el.errorMessage = getErrorMessage('stepMismatch');
				return false;
			}
		}
		return isValid;
	}

	function getNumberFractionPart(num) {
		var str = typeof num === 'string' ? num : num + '',
			reg = /\d+\.(\d+)/,
			arr = str.match(reg);
		return arr ? arr[1].length : 0;
	}

	function validateInputCheckBox(el) {
		var isValid = true,
			isRequired = el.hasAttribute('required');
		isChecked = el.checked,
			errMsg = el.getAttribute('data-error') != null ? el.getAttribute('data-error') : undefined;
		isValid = !(isRequired && !isChecked);
		if (!isValid)
			el.errorMessage = errMsg || getErrorMessage('valueMissing');
		return isValid;
	}

	function validateInputDate(el, type) {
		var isValid = true,
			value = inputGetValue(el),
			hasValue = value !== '',
			isRequired = el.hasAttribute('required'),
			valueToDate,
			errMsg = el.getAttribute('data-error') != null ? el.getAttribute('data-error') : undefined;
		isValid = !(isRequired && !hasValue);
		if (!isValid || !hasValue) {
			el.errorMessage = !isValid ? (errMsg || getErrorMessage('valueMissing')) : '';
			return isValid;
		}
		try {
			valueToDate = Dragon.Data.parseDate(value, type);
			isValid = !isNaN(Date.parse(valueToDate));
		} catch (ex) {
			isValid = false;
		} finally {
			if (!isValid) {
				el.errorMessage = getErrorMessage('typeMismatch');
				return false;
			}
		}
		var min = el.getAttribute('min') ? Dragon.Data.rfcToDate(el.getAttribute('min'), type) : undefined,
			max = el.getAttribute('max') ? Dragon.Data.rfcToDate(el.getAttribute('max'), type) : undefined;
		if (isValid && min && !isNaN(Date.parse(min))) {
			isValid = Date.parse(valueToDate) >= Date.parse(min);
			if (!isValid) {
				el.errorMessage = getErrorMessage('rangeUnderflow');
				return false;
			}
		}
		if (isValid && max && !isNaN(Date.parse(max))) {
			isValid = Date.parse(valueToDate) <= Date.parse(max);
			if (!isValid) {
				el.errorMessage = getErrorMessage('rangeOverflow');
				return false;
			}
		}
		return isValid;
	}

	var getRadioButtons = (function () {
		if (isFormAttributeSupport) {
			return function (el) {
				var radio = el.form[el.name];
				return radio.length ? radio : [radio];
			}
		} else {
			return function (el) {
				var formId = el.getAttribute('form') || el.form.id,
					form = document.forms[formId],
					els = Dragon.Dom.find(document, '[form=\'' + formId + '\']'),
					radio = [];
				if (form[el.name]) {
					if (form[el.name].length) {
						for (var i = 0, l = form[el.name].length; i < l; i++) {
							var el = form[el.name][i],
							attrForm = (el.getAttribute('form') && el.getAttribute('form').nodeType && el.getAttribute('form').nodeType == 1) ?
										el.getAttribute('form').id : el.getAttribute('form');
							if (!(attrForm != null && attrForm.indexOf(formId) === -1)) {
								radio.push(el);
							}
						}
					} else {
						radio.push(form[el.name]);
					}
				}
				for (var i = 0, l = els.length; i < l; i++) {
					el = els[i];
					if (el.type === 'radio' && radio.indexOf(el) === -1) {
						radio.push(el);
					}
				}
				return radio;
			}
		}
	})();

	function validateInputRadio(el) {
		var isValid = true,
			isRequired = false,
			isChecked = false,
			radio = getRadioButtons(el),
			name = radio[0].name,
			errMsg;
		for (var i = 0, l = radio.length; i < l; i++) {
			isChecked = isChecked || radio[i].checked;
			isRequired = isRequired || !!(radio[i].getAttribute('required')); //radio[i].getAttribute('required') != null;
			errMsg = radio.getAttribute('data-error') != null ? radio.getAttribute('data-error') : errMsg;
			if (!radio[i].validity)
				extendWithValidity(radio[i]);
			if (!radio[i].setCustomValidity)
				radio[i].setCustomValidity = setCustomValidity;
		}
		isValid = !(isRequired && !isChecked);
		if (!isValid) {
			el.errorMessage = errMsg || getErrorMessage('valueMissing');
		}
		return isValid;
	}

	function validateInputFile(el) {
		var isValid = true,
			hasValue = el.value != '',
			isRequired = el.hasAttribute('required'),
			errMsg = el.getAttribute('data-error') != null ? el.getAttribute('data-error') : undefined;
		isValid = !(isRequired && !hasValue);
		if (!isValid) {
			el.errorMessage = errMsg || getErrorMessage('valueMissing');
			return false;
		}
		return isValid;
	}

	function addRadioGroupToValidate(arr, el) {
		var name = el.getAttribute('name');
		if (arr.indexOf(name) === -1) {
			arr.push(name);
			return true;
		}
		return false;
	}

	function extendWithValidity(el) {
		el.validity = {
			customError: undefined,
			patternMismatch: undefined,
			rangeOverflow: undefined,
			rangeUnderflow: undefined,
			stepMismatch: undefined,
			tooLong: undefined,
			typeMismatch: undefined,
			isValid: undefined,
			valueMissing: undefined
		}
	}

	function getErrorMessage(error) {
		switch (error) {
			case 'valueMissing': return 'The element has a required attribute, but no value.';
			case 'typeMismatch': return 'The value type is invalid.';
			case 'patternMismatch': return 'The element has a pattern attribute, but no match it.';
			case 'rangeUnderflow': return 'The value is less than the specified min.';
			case 'rangeOverflow': return 'The value is greater than the specified max.';
			case 'stepMismatch': return 'The value does not fit the rules determined by step.';
			default: return '';
		}
	}

	function getDataError(el) {
		return el.getAttribute('data-error');
	}

	//function getErrorMessage(el) {
	//	if (el.validity.valueMissing)
	//		return 'The element has a required attribute, but no value.';
	//	if (el.validity.typeMismatch)
	//		return 'The value type is invalid.';
	//	if (el.validity.patternMismatch)
	//		return 'The element has a pattern attribute, but no match it.';
	//	if (el.validity.rangeUnderflow)
	//		return 'The value is less than the specified min.';
	//	if (el.validity.rangeOverflow)
	//		return 'The value is greater than the specified max.';
	//	if (el.validity.stepMismatch)
	//		return 'The value does not fit the rules determined by step.';
	//	return '';
	//}

	function setCustomValidity(msg) {
		if (!this.tagName && this.length) {
			this[0].validationMessage = msg;
			for (var i = 0, l = this.length; i < l; i++) {
				setValidity(this[i]);
			}
		} else {
			this.validationMessage = msg;
			setValidity(this);
		}
		function setValidity(el) {
			var isValid = msg == '';
			el.validity.isValid = isValid;
			//setValidationClass(el, isValid);
		}
	}

	function setValidationClass(el, isValid) {
		var removeClass = isValid ? 'invalid' : 'isValid',
			addClass = isValid ? 'isValid' : 'invalid';
		el = el.ctrlWrapper ? el.ctrlWrapper : el;
		Dragon.Class.remove(el, removeClass);
		if (!Dragon.Class.contains(el, addClass)) {
			Dragon.Class.add(el, addClass);
		}
	}

	function addCustomValidate(el, func, msg) {
		if (el.customValidators === undefined)
			el.customValidators = [];
		el.customValidators.push({ "action": func, "message": Dragon.Globalization.getText(msg) });
	}

	function setValidation(el, errMsg) {
		errMsg = !!errMsg ? Dragon.Globalization.getText(errMsg) : errMsg;
		el.setCustomValidity(errMsg);
		setValidationClass(el, !errMsg);
	}

	function validationSupport() {
		var form = document.createElement('form');
		if (!('checkValidity' in form) || !('addEventListener' in form)) {
			return false;
		}
		var //body = document.body,
		//html = document.documentElement,
		//bodyFaked = false,
			invaildFired = false,
			input;

		// Prevent form from being submitted
		form.addEventListener('submit', function (e) {
			//Opera does not validate form, if submit is prevented
			if (!window.opera) {
				e.preventDefault();
			}
			e.stopPropagation();
		}, false);

		// Calling form.submit() doesn't trigger interactive validation,
		// use a submit button instead
		//older opera browsers need a name attribute
		form.innerHTML = '<input name="modTest" required><button></button>';

		// FF4 doesn't trigger "invalid" event if form is not in the DOM tree
		// Chrome throws error if invalid input is not visible when submitting
		form.style.position = 'absolute';
		form.style.top = '-99999em';

		// We might in <head> in which case we need to create body manually
		//            if (!body) {
		//                bodyFaked = true;
		//                body = document.createElement('body');
		//                //avoid crashing IE8, if background image is used
		//                body.style.background = "";
		//                html.appendChild(body);
		//            }

		document.body.appendChild(form);

		input = form.getElementsByTagName('input')[0];

		// Record whether "invalid" event is fired
		input.addEventListener('invalid', function (e) {
			invaildFired = true;
			e.preventDefault();
			e.stopPropagation();
		}, false);

		// Submit form by clicking submit button
		form.getElementsByTagName('button')[0].click();

		// Don't forget to clean up onclick="clk()"
		document.body.removeChild(form);
		//bodyFaked && html.removeChild(body);

		return invaildFired;
	}

	return {
		addCustomValidate: addCustomValidate,
		checkInputTypeSupport: checkInputTypeSupport,
		init: init,
		initForm: initForm,
		//submitAjax: submitAjax,
		validate: validate,
		validateDOMElement: validateField,
		setValidation: setValidation,
		//createPostData: createPostData,
		upgradeElement: upgradeElement,
		has: validationSupport(),
		_namespace: "Dragon.Validation"
	}
});