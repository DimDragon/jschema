Dragon.module(['./event', './dom', './classlist', './window', './lang'], function (Event, Dom, CL, Window, Lang) {
	// [DD] Goals and principles
	/*
		We do not offer constraint validation for any of date types (date|datetime|datetime-local|time|week|month)
		those types require certian UI and without it their use is pointless
		since UI among browsers is very different or non-existent we expect ctrl-calendar to be used
		ctrl-calendar should comply on 100% with constraint validation API and provide support for all attributes
		All our input controls MUST provide constraint validation API + attribute check:
			ctrl-select: required
			ctrl-checkbox: required (checked must be true) NOTE: careful with constraint API since this one is actually an <input>!
			ctrl-number: required, min, max, step
			ctrl-toggle: required (checked must be true)
			ctrl-calendar: required, min, max, step
			ctrl-file: required
		Apart from our own controls, validation will polyfill constrints where not supported:
			required: text, checkbox, radio, tel, url, email, search, textarea, select, password, file, number
			pattern: text, search, tel, url, email
			min: number
			max: number
			step: number
			maxLength: textarea, text, search, tel, url, email, password
		Regular expression validation will be performed on missing input types:
			url
			tel
			email
			number
		Types color and range similar to date types require dedicated UI, so we will add those as components
	
		Module will first check which types are not supported and which attributes support is missing
		Depending on support of Form Validation API we will add missing properties and methods
	
		Important: we only enchance elements contained within or associated with our ctrl-form!
	
		We rely that all elements are enchanced so we proceed as validation API is operational
	
		since styling and css pseudo classes are inconsistent we introduce our own classes:
			invalid - replaces :invalid, but placed only after field have been interacted with
			isValid - replaces :isValid, but placed only after field have been interacted with
			required - replaces :required
	
		css styling replace is done by validation module for ALL elements with willValidate === true			
	*/

	// nativeValidation = 'noValidate' in document.createElement('form'),

	var testInput = document.createElement('input'),
		validationTags = /^(input|select|textarea)$/,
		nonSubmittable = 'button, input[type=button], input[type=submit], input[type=reset]',
		//constraintAttrs = '[required], [pattern], [maxLeanght], [min], [max], [step], input[type=email], input[type=url], input[type=tel]',
		errorDelimiter = '|-|',
		keys, key,
		inProgress = false,
		unsupportedTypes = {
			url: false,
			tel: false,
			email: false,
			search: false,
			number: false
		},
		constraintErrors = [
			{ type: 'valueMissing', text: 'This is a required field' },
			{ type: 'typeMismatch', text: 'The value type is invalid' },
			{ type: 'patternMismatch', text: 'Field is not matching required pattern: {0}', attr: 'title' },
			{ type: 'rangeUnderflow', text: 'Value must tbe great or equal then {0}', attr: 'min' },
			{ type: 'rangeOverflow', text: 'Value must tbe less or equal then {0}', attr: 'max' },
			{ type: 'stepMismatch', text: 'Value is not matching step: {0}', attr: 'step' },
			{ type: 'tooLong', text: 'Value length is bigger then {0}', attr: 'maxlength' }
		],
		constraints = {
			// applies for: input|select|textarea (inputs without: hidden, image, or a button type (submit, reset, or button).
			required: {
				applicable: 'select, textarea, input[type=text], input[type=search], input[type=tel], input[type=url], input[type=email], input[type=radio], input[type=checkbox], input[type=password], input[type=file], input[type=number]',
				validate: function (el, val) {
					var tag = el.nodeName.toLowerCase(),
						type = el.getAttribute('type'),
						isValid;

					if (tag == 'select') {
						var first = el.querySelector('option');
						isValid = first && (first.value === '' || first.textContext === '');
					} else if (type === "checkbox" || type === "radio") {
						isValid = el.checked;
					} else {
						isValid = val !== "";
					}

					return el.validity.valueMissing = !isValid;
				}
			},
			// input of type:  text, search, tel, url, email
			pattern: {
				applicable: 'input[type=text], input[type=search], input[type=tel], input[type=url], input[type=email]',
				validate: function (el, val) {
					var re = new RegExp(val);

					return el.validity.patternMismatch = !re.test(el.value);
				}
			},
			// textarea, input of type: text, email, search, password, tel, url
			maxlength: {
				applicable: 'textarea, input[type=text], input[type=search], input[type=tel], input[type=url], input[type=email], input[type=password]',
				validate: function (el, val) {
					return el.validity.tooLong = el.value.length > val;
				}
			},
			email: /[-0-9a-zA-Z.+_]+@[-0-9a-zA-Z.+_]+\.[a-zA-Z]{2,4}/,
			url: /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i,
			tel: /^[0-9\s(-)]*$/
		};

	// check for unsupported types
	keys = Object.keys(unsupportedTypes);
	for (var i = 0, count = keys.length; i < count; i++) {
		key = keys[i];
		testInput.setAttribute("type", key);
		unsupportedTypes[key] = testInput.type === "text";
	}

	function initForm(form) {
		// we take care of form validation so we disable build-in one
		form.noValidate = true;
		// catch change of any element to activate inline validation
		Event.add(form, "change", setValidationState, false);
		// inline validation while typing
		Event.add(form, "keyup", inlineValidate, false);
		// init form child elements and associated elements
		upgradeNode(form);
	}

	function upgradeNode(root) {
		var elements = getElements(root);

		for (var i = 0, count = elements.length; i < count; i++) {
			initElement(elements[i]);
		}
	}

	//function hasConstraints(el) {
	//	return Dom.matches(el, constraintAttrs) || el._customValidators;
	//}

	function setState(el, valid) {
		var removeClass = valid ? 'invalid' : 'isValid',
			addClass = valid ? 'isValid' : 'invalid';

		CL.remove(el, removeClass);
		if (!CL.contains(el, addClass)) {
			CL.add(el, addClass);
		}
	}

	// set our own css classes upon value change
	function setValidationState(evt) {
		var el = evt.target;

		// [DD] Here we set 'isValid' also on elements with no constraints. Is this correct?
		if (el.willValidate /*&& hasConstraints(el)*/) {
			setState(el, el.checkValidity());
		}
	}

	// when state changes from invalid to isValid we want to notify user immediately
	function inlineValidate(evt) {
		var el = evt.target,
			hasValid = CL.contains(el, 'isValid'),
			hasInvalid = CL.contains(el, 'invalid'),
			isValid;

		if (el.willValidate && (hasValid || hasInvalid)) {
			isValid = el.checkValidity();

			if (isValid && hasInvalid || !isValid && hasValid) {
				setState(el, isValid);

				if (isValid) {
					closeBubble(el);
				}
			}
		}
	}

	// will be used as custom validator when number is not supported
	function checkInputType() {
		var el = this,
			type = el.getAttribute('type');

		if (type == 'number') {
			var min = el.getAttribute('min'),
				max = el.getAttribute('max'),
				step = el.getAttribute('step'),
				val = Number(el.value),
				errors = [];

			if (val == Number.NaN) {
				errors.push('typeMismatch');
			}

			if (min != null && min > val) {
				errors.push('rangeUnderflow');
			}

			if (max != null && max < val) {
				errors.push('rangeOverflow');
			}

			if (step != null && step != 'any' && (val % parseInt(step) != 0)) {
				errors.push('stepMismatch');
			}

			if (errors.length > 0) {
				return errors.join(errorDelimiter)
			}
		} else if (!constraints[type].test(this.value)) {
			return 'typeMismatch';
		}

		return '';
	}

	function checkAttribute(el, attr) {
		var constraint = constraints[attr];

		if (el.hasAttribute(attr) && Dom.macthes(el, constraint.applicable)) {
			constraint.validate(el, el.getAttribute(attr));
		}
	}

	function replaceCheckValidity(el) {
		var origCheckValidity = el.checkValidity.bind(el),
			origSetCustomValidity = el.setCustomValidity.bind(el);

		// generate new checkValidity
		el.checkValidity = function () {
			var el = this;

			// execute custom validators
			if (el._customValidators) {
				var errors = [],
					error;

				for (var i = 0, count = el._customValidators.length; i < count; i++) {
					error = el._customValidators[i].call(el);
					if (error) {
						errors.push(error);
					}
				}

				el.setCustomValidity(errors.join(errorDelimiter));
			}

			if (el.validity.noNative) {
				// set validity
				el.validity.isValid = origCheckValidity();
				//raise invalid event
				if (!el.validity.isValid) {
					Event.raise(el, 'invalid');
				}

				return el.validity.isValid;
			}

			return origCheckValidity();
		};

		el.setCustomValidity = function (msg) {
			origSetCustomValidity(msg);

			setState(this, this.validity.isValid);
		};

		// prevent default error bubble and show ours
		Event.add(el, 'invalid', validateElem, false);
	}

	// Used when native constraint API is not present
	function defaultCheckValidity() {
		var el = this;

		checkAttribute(el, 'required');
		checkAttribute(el, 'pattern');
		checkAttribute(el, 'maxlength');

		return el.validity.valueMissing && el.validity.patternMismatch && el.validity.tooLong;
	}

	function registerValidator(validator) {
		if (this._customValidators) {
			this._customValidators.push(validator);
		} else {
			this._customValidators = [validator];
		}
	}

	function initElement(el) {
		var type = el.getAttribute('type'),
			tag = el.nodeName.toLowerCase();

		// add our own css class for required fields
		if (el.hasAttribute('required')) {
			CL.add(el, 'required');
		}

		// extend with custom validator
		el.addValidator = registerValidator.bind(el);

		// browser supports constraint validation
		if (el.willValidate) {
			// in case of input, check if type is supported
			if (tag == 'input' && unsupportedTypes[type]) {
				// we need to add custom validator for this type
				el.addValidator(checkInputType);
			}
			// replace checkValidity to include support for our custom validators
			replaceCheckValidity(el);
		} else if (validationTags.test(tag)) {
			// native validation not available
			addConstraintApi(el);
			// replace checkValidity to include support for our custom validators
			replaceCheckValidity(el);
		}
	}

	function addConstraintApi(obj) {
		Dragon.extend(obj, {
			// Firefox denies 'willValidate' getter on anything else then HTMLInputElement
			willValidate: {
				get: function () {
					return !this.disabled && !this.readonly;
				}
			},
			validity: {
				noNative: true,
				customError: false,
				badInput: false,
				patternMismatch: false,
				rangeOverflow: false,
				rangeUnderflow: false,
				stepMismatch: false,
				tooLong: false,
				typeMismatch: false,
				valueMissing: false,
				isValid: true
			},
			validationMessage: '',
			setCustomValidity: function (msg) {
				this.validity.customError = !!msg,
				this.validity.isValid = !this.validity.customError;
				this.validationMessage = msg;
			}
		});

		// in case generic element use our default checkValidity
		if (!obj.checkValidity) {
			obj.checkValidity = defaultCheckValidity.bind(obj);
		}
	}

	// in order to provide translation, we can not use validationMessage directly
	function getErrorMessages(el) {
		var errors = [],
			error,
			param,
			text;

		for (var i = 0, count = constraintErrors.length; i < count; i++) {
			error = constraintErrors[i];

			if (el.validity[error.type]) {
				param = error.attr ? el.getAttribute(error.attr) : null;
				text = Lang.text(error.type, param);

				// there is no translation. Use default message
				if (text == error.type) {
					text = error.text.replace(/{(\d+)}/, param);
				}

				errors.push(text);
			}
		}

		if (el.validity.customError) {
			el.validationMessage.split(errorDelimiter).forEach(function (err) {
				errors.push(Lang.text(err));
			});
		}

		return errors;
	}

	function setBubbleContent(bubble, el) {
		var errors = getErrorMessages(el);

		for (var i = 0, count = errors.length; i < count; i++) {
			bubble.appendChild(Dom.create('li', 'error-text', errors[i]));
		}
	}

	// since checkValidty better set validationMessage we may use it instead of getErrorMessage?
	function showBubble(el) {
		// partial check if element is visible on form
		if (el.style.visibility == 'hidden' || el.offsetParent == null || el.offsetHeight == 0 || el.offsetWidth == 0) {
			return;
		}

		if (el._bubbleHwnd) {
			Dom.empty(el._bubbleHwnd.wnd);
			setBubbleContent(el._bubbleHwnd.wnd, el);
		} else {
			var bubble = Dom.create('ol', 'ctrl-bubble');

			setBubbleContent(bubble, el);
			el._bubbleHwnd = Window.open(bubble, {
				relEl: el,
				positionOptions: 'left,below'
			});

			Event.add(bubble, 'window_closing', function (evt) {
				evt.detail.related._bubbleHwnd = null;
			}, false);
		}
	}

	function closeBubble(el) {
		if (el._bubbleHwnd) {
			Window.close(el._bubbleHwnd);
			el._bubbleHwnd = null;
		}
	}

	function validateElem(evt) {
		// prevent default error bubbles
		evt.preventDefault();

		// while form is validating we leave error visualization to it
		if (!inProgress) {
			showBubble(evt.target);
		}
	}

	// get all possible submittable elementsfrom root
	function getElements(root) {
		var elems = [],
			list,
			el;

		// add all associated form elements which sit outside form
		if (root.nodeName.toLowerCase() == 'form' && root.id) {
			list = document.querySelectorAll('[form="' + root.id + '"]');

			for (var i = 0, count = list.length; i < count; i++) {
				el = list[i];
				if (!root.contains(el)) {
					elems.push(el);
				}
			}
		}

		// add all form elements which are not buttons
		list = root.getElementsByTagName('*');
		for (var i = 0, count = list.length; i < count; i++) {
			el = list[i];
			if (!Dom.matches(el, nonSubmittable)) {
				elems.push(el);
			}
		}

		return elems;
	}

	function validate(frm) {
		var form = frm,
			mode = form.errormode,
			elements = getElements(form),
			el,
			errors = [],
			placeBubble = true,
			isValid = true;

		// temporally supress error bubbles
		inProgress = true;

		// loop through form elements first
		for (var i = 0, count = elements.length; i < count; i++) {
			el = elements[i];

			if (el.willValidate && !el.checkValidity()) {
				isValid = false;
				// set 'invalid' class
				setState(el, false);

				// in summary mode to gather all errors and set them as one form error
				if (mode == 'summary') {
					// [DD] since checkValidty better set validationMessage we may use it instead of getErrorMessage?
					Array.prototype.push.apply(errors, getErrorMessages(el));
				} else if (placeBubble) {
					showBubble(el);

					// if we only want first error shown we suppress bubbles
					if (mode == 'single') {
						placeBubble = false;
						el.focus();
					}
				}
			}
		}

		if (!isValid && mode == 'summary') {
			form.setError(errors);
		} else {
			Event.add(document.documentElement, 'wheel', hideAllBubbles, true);
		}

		// restore error bubbles
		inProgress = false;

		return isValid;
	}

	function hideAllBubbles() {
		var bubbles = document.querySelectorAll('ol.ctrl-bubble'),
			bubble;

		for (var i = 0, count = bubbles.length; i < count; i++) {
			bubble = bubbles[i];
			closeBubble(Window.getHandle(bubble).relEl);
		}

		Event.remove(document.documentElement, 'wheel', hideAllBubbles, true);
	}

	return {
		addApi: addConstraintApi,
		initForm: initForm,
		validate: validate,
		upgradeNode: upgradeNode,
		_namespace: "Dragon.Validation"
	}
});