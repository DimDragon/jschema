Dragon.module(["dragon/jpointer", "dragon/classlist", "dragon/event", "dragon/dom", "dragon/gesture"], function (JPtr, CL, Evt, Dom, Gesture) {
    var sch,
		schMap = {},
		loadIndex = 1,
		draft = {},
		create = Dom.create,
		commonProps = ["description", "default", "oneOf", "anyOf", "not", "enum", "dependencies", "enumNames"],
		valProps = {
		    "number": ['minimum', 'exclusiveMinimum', 'maximum', 'exclusiveMaximum', 'multipleOf'],
		    "string": ['minLength', 'maxLength', 'pattern', 'media'],//'format',
		    "array": ['minItems', 'maxItems', 'uniqueItems'],
		    "object": ['minProperties', 'maxProperties'],
		    "boolean": [],
		    "null": []
		},
		allProps = ["id", "$schema", "title", "additionalItems", "items", "required", "additionalProperties",
			"definitions", "properties", "patternProperties", "type", "allOf", "links", "baseUri", "origin", "_processed"].concat(commonProps),
		complexProps = {
		    "number": valProps["number"].concat(commonProps),
		    "string": valProps["string"].concat(commonProps),
		    "array": valProps["array"].concat(commonProps).concat(["items", "additionalItems"]),
		    "object": valProps["object"].concat(commonProps).concat(["properties", "patternProperties", "additionalProperties"]),
		    "boolean": commonProps,
		    "null": commonProps
		};

    // fill allProps
    for (key in valProps) {
        allProps = allProps.concat(valProps[key]);
    }

    valProps["integer"] = valProps["number"];
    complexProps["integer"] = complexProps["number"];

    // populate lookup object for subschema
    for (var i = 0, count = allProps.length; i < count; i++) {
        draft[allProps[i]] = true;
    }

    // find greatest common divider
    function gcd(a, b) {
        if (!b) {
            return a;
        }

        return gcd(b, a % b);
    }

    // convert single value to array if needed
    function toArray(obj) {
        return Array.isArray(obj) ? obj : obj === undefined ? [] : [obj];
    }

    // check if schema can be expanded to show extra info
    function isExpandable(schema) {
        var types = toArray(schema.type);

        // if there is no type check commonProps
        if (types.length == 0) {
            types.push('null');
        }

        for (var i = 0, typeCount = types.length; i < typeCount; i++) {
            var type = types[i],
				test = complexProps[type];

            for (var i = 0, count = test.length; i < count; i++) {
                if (schema.hasOwnProperty(test[i])) {
                    if (test[i] == "enum" && schema.enum.length == 1) {
                        return false;
                    }
                    return true;
                }
            }
        }
        return false;
    }

    function toggleMeta(el, cl) {
        var elem = el.querySelector('.sch-body');

        if (elem && elem.firstChild && CL.contains(elem.firstChild, 'sch-meta')) {
            CL.toggle(elem.firstChild, 'toggle');
        }
    }

    function render(schema, container) {
        var schTag = createSchemaUi(schema);

        schMap[loadIndex] = schema;
        schTag.setAttribute('schema', loadIndex);
        loadIndex++;

        // initially show schema expanded
        expandSchema(schTag);
        CL.add(schTag, 'toggle');

        Gesture.enable(schTag, true);
        schTag.addEventListener('tap', function (evt) {
            var target = evt.detail.target,
				elem;

            if (CL.contains(target, 'icon-meta')) {
                toggleMeta(target.parentNode.parentNode);
                return;
            }

            target = Dom.parent(target, '.sch-link');

            if (target && CL.contains(target.parentNode, 'expand')) {
                // close other open branch
                var opened = container.querySelectorAll('.toggle');

                for (var i = 0, count = opened.length; i < count; i++) {
                    elem = opened[i];
                    if (!elem.contains(target)) {
                        if (elem.tagName != 'ASIDE') {
                            CL.toggle(elem, 'toggle');
                        }
                    }
                }

                target = target.parentNode;

                CL.toggle(target, 'toggle');

                // toggle meta
                toggleMeta(target, 'meta-fade');

                // if schema was not yet expanded, do it
                if (!target._expanded) {
                    expandSchema(target);
                }
            }
        });

        // insert into container
        container.appendChild(schTag);
    }

    function createItem(tag, ptr, item, index) {
        var li = create(tag, item.cl);

        if (item.key) {
            if (Dragon.isType(item.val, 'Object')) {
                li.appendChild(createSchemaUi(item.val, ptr + JPtr.encode([item.key]), item.key));
            } else {
                CL.add(li, 'sch-meta-item');
                li.appendChild(create('label', null, item.key));
                li.appendChild(create('span', null, String(item.val)));
            }
        } else if (Dragon.isType(item, 'Object')) {
            li.appendChild(createSchemaUi(item, index !== undefined ? ptr + '/' + index : ptr));
        } else {
            CL.add(li, 'sch-meta-item');
            li.appendChild(create('label', null, String(item)));
        }
        return li;
    }

    // generate schema inner content
    function expandSchema(schTag, itemCnt, itemMeta, schOrigin) {
        var basePtr = schTag._ptr,
			holder = schOrigin || Dom.parent(schTag, '[schema]'),
			schema = JPtr.get(schMap[holder.getAttribute('schema')], basePtr),
			content = itemCnt || create('div', 'sch-body'),
			meta = itemMeta ? create('section', 'sch-meta-items') : create('aside', 'sch-meta toggle'), //  meta-fade'),
			types = toArray(schema.type),
			items, item,
			keys, key;

        function createList(items, ptr, container, cl, name) {
            if (items !== undefined) {
                var list = create('ul', cl),
					wrap;

                if (name) {
                    wrap = create('div', 'sch-group');
                    wrap.appendChild(create('h4', null, name));
                    wrap.appendChild(list); //Meta Add list
                }

                if (Array.isArray(items)) {
                    // sort items by key
                    items.sort(function (a, b) {
                        return a.key === b.key ? 0 : a.key > b.key ? 1 : -1;
                    });

                    for (var i = 0, count = items.length; i < count; i++) {
                    	list.appendChild(createItem('li', basePtr + ptr, items[i], i));
                    }
                } else {
                    list.appendChild(createItem('li', basePtr + ptr, items));
                }

                if (list.hasChildNodes()) {
                    container.appendChild(wrap || list);
                }
            }
        }

        function createPropList(prop, target, fn, name) {
            var obj = schema[prop],
				items = [];

            if (obj) {
                keys = Object.keys(obj);

                for (var i = 0, count = keys.length; i < count; i++) {
                    key = keys[i];
                    item = { key: key, val: obj[key] };

                    items.push(fn ? fn(item) : item);
                }

                createList(items, '/' + prop, target, null, name);
            }
        }

        if (schema.description) {
            meta.appendChild(create('h4', 'sch-group-title', schema.description));// Meta Description
        }

        // type(s) restrictions
        for (var i = 0, typeCount = types.length; i < typeCount; i++) {
            var type = types[i];

            // validation meta
            keys = valProps[type];
            items = [];

            for (var j = 0, count = keys.length; j < count; j++) {
                key = keys[j];
                if (schema.hasOwnProperty(key)) {
                    items.push({ key: key, val: schema[key] });
                }
            }

            // default
            if (schema.hasOwnProperty('default')) {
                items.push({ key: 'default', val: schema.default });
            }

            createList(items, '', meta, null, type);

            // properties/dependencies/additionalProperties
            if (type === 'object') {
                // properties
                createPropList('properties', content, function (item) {
                    item.cl = schema.required && schema.required.indexOf(item.key) != -1 ? 'required' : null;
                    return item;
                });

                // patternProperties
                createPropList('patternProperties', content, null, 'patternProperties');

                // additionalProperties
                if (schema.hasOwnProperty('additionalProperties')) {
                    createList(schema.additionalProperties, '/additionalProperties', content, null, 'additionalProperties');
                }

                // dependencies
                createPropList('dependencies', content, function (item) {
                    if (Array.isArray(item.val)) {
                        item.val = item.val.join(' | ');
                    }
                    return item;
                }, 'dependencies');


            } else if (type === 'array') {
                // items
                if (schema.items) {
                    if (Array.isArray(schema.items) || itemCnt) {
                        createList(schema.items, '/items', content, 'sch-items', itemCnt ? '' : 'items');
                    } else {
                        expandSchema(createSchemaUi(schema.items, basePtr + '/items'), content, meta, holder || schTag);
                    }
                }

                // additionalItems
                if (schema.hasOwnProperty('additionalItems')) {
                    createList(schema.additionalItems, '/additionalItems', content, null, 'additionalItems');
                }
            }
        }

        // anyOf|oneOf|not
        createList(schema.anyOf, '/anyOf', content, null, 'anyOf');
        createList(schema.oneOf, '/oneOf', content, null, 'oneOf');
        if (schema.not) {
            createList(schema.not, '/not', content, null, 'not');
        }

        // NOTE: make sure object enums are handled correctly
        if (schema.hasOwnProperty('enumNames')) {
            items = [];

            for (var i = 0, count = schema.enum.length; i < count; i++) {
                items.push({ key: schema.enum[i], val: schema.enumNames[i] });
            }
        } else {
            items = schema.enum;
        }

        createList(items, '/enum', content, 'sch-enum');

        // all unknown properties remaining are considered subschema
        items = [];
        keys = Object.keys(schema);
        for (var i = 0, count = keys.length; i < count; i++) {
            key = keys[i];
            if (!draft[key]) {
                items.push({ key: key, val: schema[key] });
            }
        }
        createList(items, '', content, null, 'subschema');

        // add links to header
        var schHeader = schTag.querySelector('.sch-link');

        // append meta in case there is data
        if (meta.hasChildNodes()) {
            if (itemMeta) {
                itemMeta.appendChild(meta);
            } else if (content) {
                content.insertBefore(meta, content.firstElementChild);
            }
            var metaIcon = create('span', 'icon-meta');
            schHeader.appendChild(metaIcon);	//NOTE: verify this for array

            //Gesture.enable(meta, true);
            //meta.addEventListener('tap', function (evt) {
            //    CL.toggle(meta);
            //});
            //Gesture.enable(metaIcon, true);
            //metaIcon.addEventListener('tap', function (evt) {
            //    CL.toggle(meta);
            //});


        }

        schTag.appendChild(content);

        schTag._expanded = true;
    }

    function getMultiType(schArray) {
        var types = [],
			sch,
			type;

        for (var i = 0, count = schArray.length; i < count; i++) {
            sch = schArray[i];
            type = sch.enum ? 'enum' : sch.type;

            if (type && types.indexOf(type) == -1) {
                types.push(type);
            }
        }
        return types.join(' | ');
    }

    // determine schema type
    function getType(schema) {
        if (schema.enum) {
            return schema.enum.length == 1 ? schema.enum[0] : 'enum';
        } else if (schema.type) {
            return Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type + (schema.format ? " (" + schema.format + ")" : "");
        } else if (schema.oneOf) {
            return getMultiType(schema.oneOf);
        } else if (schema.anyOf) {
            return getMultiType(schema.anyOf);
        }

        return Object.keys(schema).length ? 'n/a' : '{}';
    }

    function preprocess(schema) {
    	var allOf = schema.allOf || [],
    		addon;

    	for (var i = 0, count = allOf.length; i < count; i++) {
    		addon = allOf[i];

    		if (!addon.title) {
    			addon.title = 'allOf' + i;
			}

            mergeSchema(schema, preprocess(addon));
        }

        return schema;
    }

    // NOTE: what to do when first param is NOT json schema?
    function createSchemaUi(schema, ptr, prop) {
        var tag = create('section', 'sch'),
			head = create('header', 'sch-link'),
			typeTag = create('span', 'sch-type flex-item'),
			type;

        tag._ptr = ptr || '';

        preprocess(schema);

        if (prop) {
            var lbl = create('label', null, prop);

            head.appendChild(lbl);
        }
      
        typeTag.appendChild(create('code', null, getType(schema)));
  
        // determine schema title
        if (schema.type === 'array' && schema.items && !Array.isArray(schema.items)) {
            // NOTE: probably improve that!
            typeTag.appendChild(create('span', 'sch-title ', '[ ' + getType(schema.items) + ' ' + (schema.items.title || '') + ' ]'));

        } else if (schema.title) {
            typeTag.appendChild(create('span', 'sch-title flex-item', '{ ' + schema.title + ' }'));
        }

        head.appendChild(typeTag);
        if (!ptr) {
            head.appendChild(create('span', 'remark', 'Marks required field'));
        }
        // mark as expandable
        if (isExpandable(schema)) {
            CL.add(tag, 'expand');
            var span = Dom.create('span', 'sch-expand-icon');
            if (head.firstElementChild) {
                head.insertBefore(span, head.firstElementChild);
            } else {
                head.appendChild(span);
            }
        }
        tag.appendChild(head);

        return tag;
    }

    // merges two arrays without duplication
    function combine(arr1, arr2) {
        var hash = {};

        return arr1.concat(arr2).filter(function (val) {
            return hash[val] ? 0 : hash[val] = 1;
        });
    }

    function setProp(target, source, props, origin) {
        if (!Array.isArray(props)) {
            props = [props];
        }

        for (var i = 0, count = props.length; i < count; i++) {
            var prop = props[i],
				tVal = target[prop],
				sVal = source[prop],
				result = tVal;

            if (tVal === undefined || sVal === undefined) {
                result = tVal || sVal;
            } else if (Array.isArray(tVal) || Array.isArray(sVal)) {
                result = combine(tVal, sVal);
            } else if (Dragon.isType(tVal, 'Object') && Dragon.isType(sVal, 'Object')) {
                result = tVal;		///*(tVal.type == 'object' && sVal.type == 'object') ? undefined : */mergeSchema(tVal, sVal);
            } else if (/^min/.test(prop)) {
                result = Math.max(tVal, sVal);
            } else if (/^max/.test(prop)) {
                result = Math.min(tVal, sVal);
            } else if (/^exclusive/.test(prop)) {
                result = undefined;
            } else if (/^multipleOf/.test(prop)) {
                result = tVal * sVal / gcd(tVal, sVal);
            } else if (tVal !== sVal) {
                throw new Error('Incompatible property inside allOf schema: ' + prop);
            }

            if (origin) {
                result.origin = origin;
            }

            if (result != undefined) {
                target[prop] = result;
            }
        }
    }

    function setPropObject(target, source, prop, origin) {
        var tVal = target[prop] || {},
			sVal = source[prop] || {},
			keys = Object.keys(sVal);

        for (var i = 0, count = keys.length; i < count; i++) {
            setProp(tVal, sVal, keys[i], origin);
        }

        if (Object.keys(tVal).length) {
            target[prop] = tVal;
        }
    }


    // NOTE: must ensure in depth resolution of allOf!!!
    function mergeSchema(schema, addon) {
        // NOTE: enum merge is incorrect here from validation purpose!!!

        setProp(schema, addon, ['type', 'default', 'enum', 'required', 'anyOf', 'oneOf', 'not']);

        var types = toArray(schema.type);

        // exclusiveMinimum
        if (schema.exclusiveMinimum) {
            if (!addon.exclusiveMinimum && addon.minimum > schema.minimum) {
                schema.exclusiveMinimum = false;
            }
        } else if (addon.exclusiveMinimum) {
            schema.exclusiveMinimum = !schema.hasOwnProperty('minimum') || schema.minimum <= addon.minimum;
        }

        // exclusiveMaximum
        if (schema.exclusiveMaximum) {
            if (!addon.exclusiveMaximum && addon.maximum < schema.maximum) {
                schema.exclusiveMaximum = false;
            }
        } else if (addon.exclusiveMaximum) {
            schema.exclusiveMaximum = !schema.hasOwnProperty('maximum') || schema.maximum >= addon.maximum;
        }

        // validation properties
        for (var i = 0, count = types.length; i < count; i++) {
            setProp(schema, addon, valProps[types[i]]);
        }

        // additionalProperties
        if ((schema.additionalProperties === false || addon.additionalProperties === false) && schema.properties && addon.properties) {
            throw new Error('Incompatible types of additionalProperties inside allOf schema');
        }
        setProp(schema, addon, 'additionalProperties');

        // patternProperties
        setPropObject(schema, addon, 'patternProperties');

        // properties
        setPropObject(schema, addon, 'properties', addon.title);

        // dependancies
        setPropObject(schema, addon, 'dependancies');

        return schema;
    }

    function createError(error, showAll) {
    	var item = create('li', 'err'),
			rowTag = create('div', 'err-wrap'),
    		pathTag = create('div', 'err-path', error.detail ? error.detail.at : ''),
    		msgTag = create('div', 'err-message', error.message);

    	rowTag.appendChild(msgTag);
    	rowTag.appendChild(pathTag);
    	item.appendChild(rowTag);

    	if (error.inner) {
    		item.appendChild(createErrorList(error.inner, showAll));
    		CL.add(item, 'expand');

    		Gesture.enable(item, true);
    		Evt.add(item, 'tap', function () {
    			CL.toggle(item, 'toggle');
    		});
    	}

    	return item;
    }

    function createErrorList(errors, showAll) {
    	var list = create('ol', 'err-list');

    	if (!Array.isArray(errors)) {
    		errors = [errors];
		}

    	for (var i = 0, count = showAll ? errors.length : 1; i < count; i++) {
    		list.appendChild(createError(errors[i], showAll));
    	}

    	return list;
    }

	//Highlight JSON
    function syntaxHighlight(json) {
    	if (!json)
    		return;

    	if (typeof json != 'string') {
    		json = JSON.stringify(json, undefined, 4);
    	}

    	json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    	return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    		var cls = 'number';
    		if (/^"/.test(match)) {
    			if (/:$/.test(match)) {
    				cls = 'key';
    			} else {
    				cls = 'string';
    			}
    		} else if (/true|false/.test(match)) {
    			cls = 'boolean';
    		} else if (/null/.test(match)) {
    			cls = 'null';
    		}
    		return '<span class="' + cls + '" ptr=' + match + '>' + match + '</span>';
    	});
    }

	// [DD] optimize code here!
    function errorsHighlight(errList, hightlightAllErrors, container) {
    	var errToShow = hightlightAllErrors ? errList.length || 0 : 1,
			start = 0,
			difference = 1,
			fakeJson = {
				a: {
					b: {
					}
				}
			},
			jD = JSON.stringify(fakeJson, undefined, 4),
			jDhl = syntaxHighlight(jD),
			tags,
			temp;

    	temp = container.innerHTML;
    	container.innerHTML = jDhl;
    	tags = container.querySelectorAll('.key');
    	if (tags.length == 2) {
    		difference = tags[1].offsetLeft - tags[0].offsetLeft;
    		start = tags[0].offsetLeft - difference;
    	}
    	container.innerHTML = temp;


    	tags = container.querySelectorAll('[ptr]');
    	for (var k = 0; k < tags.length; k++) {
    		CL.remove(tags[k], 'invalid');
    	}


    	for (var j = 0; j < errToShow; j++) {
    		var err = errList[j];
    		if (err && err.detail && err.detail.at) {
    			var arr = err.detail.at.split("/");
    			if (arr.length > 1) {
    				arr.reverse();
    				arr.pop();
    				arr.reverse();
    				var offset = arr.length;
    				var ptr = arr[arr.length - 1];
    				tags = container.querySelectorAll('[ptr="' + ptr + '"]');
    				for (var k = 0; k < tags.length; k++) {
    					var tagOffset = tags[k].offsetLeft;
    					if (Math.round((tagOffset - start) / difference) == offset) {
    						CL.add(tags[k], 'invalid');
    					}
    				}
    			}
    		}
    	}
    }

    return {
    	render: render,
    	renderErrors: createErrorList,
    	syntaxHighlight: syntaxHighlight,
    	errorsHighlight: errorsHighlight,
        process: preprocess
    };
});
