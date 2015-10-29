Dragon.module(['dragon/jpointer', 'dragon/weakmap'], function (JPtr, WM) {
	var commonProps = ["enum", "type", "allOf", "anyOf", "oneOf", "not"],
		typeProps = {
			"number": ["multipleOf", "maximum", "minimum"],
			"string": ["maxLength", "minLength", "pattern", "format"],
			"object": ["maxProperties", "minProperties", "required", "dependencies", "properties", "patternProperties", "additionalProperties"],
			"array": ["maxItems", "minItems", "uniqueItems", "items"],
			"boolean": [],
			"null": []
		};

	for (key in typeProps) {
		typeProps[key] = commonProps.concat(typeProps[key]);
	}
	typeProps["integer"] = typeProps["number"];

	function isInteger(val) {
		return typeof val === "number" && val !== Infinity && val !== -Infinity && val > -9007199254740992 && val < 9007199254740992 && Math.floor(val) === val;
	};

	// return JSON schema primitive type
	function getType(obj) {
		var type = typeof obj;

		if (obj === null) {
			return "null";
		} else if (Array.isArray(obj)) {
			return "array";
		} else if (isInteger(obj)) {
			return "integer";
		}
		return type;
	}

	// wrapper for all schema validation errors
	var SchemaError = Dragon.inherit(Error, function SchemaErrorCnstr(message, pointer, inner) {
		this.message = message || '';
		this.detail = { at: pointer || '/' };

		if (inner) {
			//this.detail.innerMessage = inner.message;
			//if (inner.detail)
			//	this.detail.innerPath = inner.detail.at;
			this.inner = inner;
		}
	}, {
		name: 'SchemaError'
	});

	// validation routines
	var validators = {
		"enum": function (val, sVal, ptr, addError) {
			if (sVal.indexOf(val) < 0) {
				addError("Invalid enumeration value: " + val, ptr);
			}
		},
		"type": function (val, sVal, ptr, addError) {
			var primitive = getType(val),
				types = Array.isArray(sVal) ? sVal : [sVal],
				type;

			for (var i = 0, count = types.length; i < count; i++) {
				type = types[i];
				if (primitive === type || (primitive === 'integer' && type === 'number')) {
					return;
				}
			}

			addError("Invalid instance type: " + primitive + ". Expected: " + types.join('|'), ptr);
		},
		"allOf": function (val, sVal, ptr, addError) {
			for (var i = 0, count = sVal.length; i < count; i++) {
				var errs = validateInstance(sVal[i], val, ptr, true);

				if (errs) {
					addError("Instance failed to validate against 'allOf' schema at index " + i, ptr, errs);
				}
			}
		},
		"anyOf": function (val, sVal, ptr, addError) {
			var allErrors = [],
				errs;

			for (var i = 0, count = sVal.length; i < count; i++) {
				errs = validateInstance(sVal[i], val, ptr, true)

				if (errs) {
					Array.prototype.push.apply(allErrors, errs);
				} else {
					return;
				}
			}

			addError("Instance failed to validate against 'anyOf' schema", ptr, allErrors);
		},
		"oneOf": function (val, sVal, ptr, addError) {
			var matches = 0;
			for (var i = 0, count = sVal.length; i < count; i++) {
				if (!validateInstance(sVal[i], val, ptr, true)) {
					matches++;
				}
			}

			if (matches != 1) {
				addError("Instance failed to validate against 'oneOf' schema", ptr);
			}
		},
		"not": function (val, sVal, ptr, addError) {
			if (!validateInstance(sVal, val, ptr, true)) {
				addError("Instance is isValid against 'not' schema", ptr);
			}
		},
		"multipleOf": function (val, sVal, ptr, addError) {
			if (!isInteger(val / sVal)) {
				addError("Instance is not multiple of: " + sVal, ptr);
			}
		},
		"maximum": function (val, sVal, ptr, addError) {
			if (val > sVal || (this.exclusiveMaximum && val == sVal)) {
				addError("Instance value exceeds maximum of: " + sVal, ptr);
			}
		},
		"minimum": function (val, sVal, ptr, addError) {
			if (val < sVal || (this.exclusiveMinimum && val == sVal)) {
				addError("Instance value falls below minimum of: " + sVal, ptr);
			}
		},
		"maxLength": function (val, sVal, ptr, addError) {
			if (val.length > sVal) {
				addError("Instance exceeds maximum length of: " + sVal, ptr);
			}
		},
		"minLength": function (val, sVal, ptr, addError) {
			if (val.length < sVal) {
				addError("Instance falls below minimum length of: " + sVal, ptr);
			}
		},
		"pattern": function (val, sVal, ptr, addError) {
			if (!val.match(sVal)) {
				addError("Instance do not match pattern of: " + sVal, ptr);
			}
		},
		"format": function (val, sVal, ptr, addError) {
			if (!formatters[sVal](val)) {
				addError("Instance do not match format: " + sVal, ptr);
			}
		},
		"maxItems": function (val, sVal, ptr, addError) {
			if (val.length > sVal) {
				addError("Instance item count exceeds maximum of: " + sVal, ptr);
			}
		},
		"minItems": function (val, sVal, ptr, addError) {
			if (val.length < sVal) {
				addError("Instance item count falls below minimum of: " + sVal, ptr);
			}
		},
		"uniqueItems": function (val, sVal, ptr, addError) {
			var passed = [],
				item;

			if (sVal) {
				for (var i = 0, count = val.length; i < count; i++) {
					item = val[i];

					if (passed.indexOf(item) !== -1) {
						addError("Instance array has some non-unique items", ptr);
					}
					passed.push(item);
				}
			}
		},
		"items": function (val, sVal, ptr, addError) {
			var result,
				iCount = -1,
				extra = null;

			if (Array.isArray(sVal)) {
				iCount = sVal.length,
				extra = typeof this.additionalItems === 'object' ? this.additionalItems : {};

				// check if additional items are allowed
				if (this.additionalItems === false && val.length > iCount) {
					addError("Instance array has additional items, which are not allowed", ptr);
					return;
				}
			}

			for (var i = 0, count = val.length; i < count; i++) {
				addError(validateInstance(i < iCount ? sVal[i] : extra || sVal, val[i], ptr + '/' + i));
			}
		},
		"maxProperties": function (val, sVal, ptr, addError) {
			if (Object.keys(val).length > sVal) {
				addError("Instance properties count exceeds maximum of: " + sVal, ptr);
			}
		},
		"minProperties": function (val, sVal, ptr, addError) {
			if (Object.keys(val).length < sVal) {
				addError("Instance properties count falls below minimum of: " + sVal, ptr);
			}
		},
		"required": function (val, sVal, ptr, addError) {
			for (var i = 0, count = sVal.length; i < count; i++) {
				var prop = sVal[i];

				if (!val.hasOwnProperty(prop)) {
					addError("Missing required property: " + prop, ptr);
				}
			}
		},
		"dependencies": function (val, sVal, ptr, addError) {
			var keys = Object.keys(sVal),
				key,
				dep;

			for (var i = 0, count = keys.length; i < count; i++) {
				key = keys[i];
				dep = sVal[key];

				if (val.hasOwnProperty(key)) {
					if (Array.isArray(dep)) {			// property dependency
						for (var j = 0, jCount = dep.length; j < jCount; j++) {
							if (!val.hasOwnProperty(dep[j])) {
								addError("Missing dependent property '" + dep[j] + "' for: " + key, ptr);
							}
						}
					} else {							// schema dependency
						var errs = validateInstance(dep, val, ptr, true);

						if (errs) {			
							addError("Failed schema dependency for: " + key, ptr, errs);
						}
					}
				}
			}
		},
		"properties": function (val, sVal, ptr, addError) {
			var keys = Object.keys(val),
				patProps = this.patternProperties || {},
				addProps = this.additionalProperties !== undefined ? this.additionalProperties : {},
				patterns = Object.keys(patProps),
				pattern;

			for (var i = 0, count = keys.length; i < count; i++) {
				var key = keys[i],
					unknown = true,
					pointer = ptr + JPtr.encode([key]);

				// check properties
				if (sVal.hasOwnProperty(key)) {
					unknown = false;
					addError(validateInstance(sVal[key], val[key], pointer));
				}

				// check patternProperties
				for (var j = 0, pCount = patterns.length; j < pCount; j++) {
					pattern = patterns[j];

					if (key.match(pattern)) {
						unknown = false;
						addError(validateInstance(patProps[pattern], val[key], pointer));
					}
				}

				if (unknown) {
					if (addProps === false) {
						addError("Additional property not allowed: " + key, pointer);
					} else if (typeof addProps === 'object') {
						addError(validateInstance(addProps, val[key], pointer, true));
					}
				}
			}
		},
		"patternProperties": function (val, sVal, ptr, addError) {
			if (this.properties) {
				return;
			}

			validators.properties.call(this, val, {}, ptr, addError);
		},
		"additionalProperties": function (val, sVal, ptr, addError) {
			if (this.properties || this.patternProperties) {
				return;
			}

			validators.properties.call(this, val, {}, ptr, addError);
		}
	}

	var formatters = {
		// ISO 8601 (YYYY-MM-DD)
		"date": function (val) {
			return /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))?)?$/.test(val);
		},
		// ISO 8601 (hh:mm:ss)
		"time": function (val) {
			return /^((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\5[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?$/.test(val);
		},
		// ISO 8601 (YYYY-MM-DDThh:mm:ssZ)
		"date-time": function (val) {
			return /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/.test(val);
		},
		// RFC 4122 (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
		"uuid": function (val) {
			return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(val);
		},
		// milliseconds from 1970-01-01T00:00:00
		"utc-millisec": function (val) {
			return isInteger(val);
		},
		"regex": function (val) {
			return new RegExp(val);
		},
		// RFC 5322
		"email": function (val) {
			return /[-0-9a-zA-Z.+_]+@[-0-9a-zA-Z.+_]+\.[a-zA-Z]{2,4}/.test(val);
		},
		// RFC 1034, section 3.1
		"hostname": function (val) {
			return true;
		},
		// RFC 2673, section 3.2
		"ipv4": function (val) {
			return /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(val);
		},
		// RFC 2373, section 2.2
		"ipv6": function (val) {
			return /(?:(?:(?:[0-9A-Fa-f]{1,4}:){6}|::(?:[0-9A-Fa-f]{1,4}:){5}|(?:[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,1}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){3}|(?:(?:[0-9A-Fa-f]{1,4}:){0,2}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){2}|(?:(?:[0-9A-Fa-f]{1,4}:){0,3}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}:|(?:(?:[0-9A-Fa-f]{1,4}:){0,4}[0-9A-Fa-f]{1,4})?::)(?:[0-9A-Fa-f]{1,4}:[0-9A-Fa-f]{1,4}|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(?:(?:[0-9A-Fa-f]{1,4}:){0,5}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,6}[0-9A-Fa-f]{1,4})?::)/.test(val);
		},
		// RFC 3986
		"uri": function (val) {
			//return /[A-Za-z][A-Za-z0-9+\-.]*:(?://(?:(?:[A-Za-z0-9\-._~!$&'()*+,;=:]|%[0-9A-Fa-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9A-Fa-f]{1,4}:){6}|::(?:[0-9A-Fa-f]{1,4}:){5}|(?:[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,1}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){3}|(?:(?:[0-9A-Fa-f]{1,4}:){0,2}[0-9A-Fa-f]{1,4})?::(?:[0-9A-Fa-f]{1,4}:){2}|(?:(?:[0-9A-Fa-f]{1,4}:){0,3}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}:|(?:(?:[0-9A-Fa-f]{1,4}:){0,4}[0-9A-Fa-f]{1,4})?::)(?:[0-9A-Fa-f]{1,4}:[0-9A-Fa-f]{1,4}|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(?:(?:[0-9A-Fa-f]{1,4}:){0,5}[0-9A-Fa-f]{1,4})?::[0-9A-Fa-f]{1,4}|(?:(?:[0-9A-Fa-f]{1,4}:){0,6}[0-9A-Fa-f]{1,4})?::)|[Vv][0-9A-Fa-f]+\.[A-Za-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[A-Za-z0-9\-._~!$&'()*+,;=]|%[0-9A-Fa-f]{2})*)(?::[0-9]*)?(?:/(?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*|/(?:(?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:/(?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*)?|(?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})+(?:/(?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*|)(?:\?(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?(?:\#(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-Fa-f]{2})*)?/.test(val);
			return true;
		},
		"json-pointer": function (val) {
			return /^(\/[a-zA-Z0-9~%^|\/\\" ]*)?$/.test(val);
		}
	}

	var ValidationCache = (function () {
		var validated = [],
			validatedSchema = [];

		return {
			has: function (schema, obj) {
				var objIndex = validated.indexOf(obj),
					cached;

				if (objIndex != -1) {
					cached = validatedSchema[objIndex];

					if (cached.indexOf(schema) == -1) {
						cached.push(schema);
						return false
					}

					return true;
				}

				validated.push(obj);
				validatedSchema.push([schema]);
				return false;
			},
			clear: function () {
				validated = [],
				validatedSchema = [];
			}
		}
	})();

	function validateInstance(schema, obj, ptr, discard) {
		var type = getType(obj),
			props = type ? typeProps[type] : commonProps,
            prop,
			errList = [];

		// register error during validation process
		function addError(message, pointer, inner) {
			if (Array.isArray(message)) {
				Array.prototype.push.apply(errList, message);
			} else if (message) {
				errList.push(new SchemaError(message, pointer, inner));
			}
		}

		if (type == 'object' && ValidationCache.has(schema, obj)) {
			return null;
		}

		ptr = ptr || '';

		//// intergated $schema keyword validation
		//if (schema.$schema && !validateInstance(schema.$schema, schema)) {
		//	return false;
		//}

		for (var i = 0, count = props.length; i < count; i++) {
			prop = props[i];

			if (schema.hasOwnProperty(prop)) {
				validators[prop].call(schema, obj, schema[prop], ptr, addError);

				// discard mode stops at first error
				if (discard && errList.length > 0) {
					break;
				}
			}
		}

		// no errors were added so validation is successful
		return errList.length > 0 ? errList : null;
	}

	function validate(schema, obj, ptr) {
		errList = [];
		ValidationCache.clear();

		return validateInstance(schema, obj, ptr) || true;
	}

	return {
		validate: validate,
		formatters: formatters
	};
});