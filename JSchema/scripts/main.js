Dragon.use('jschema/jschema', 'dragon/classlist', 'dragon/dom', 'dragon/gesture', 'dragon/event').then(function (JSch, CL, Dom, Gesture, Evt) {
    var create = Dom.create,
        schTag = document.getElementById('schema'),
        errTag = document.getElementById('errorList'),
        instance = document.getElementById('instance'),
        instanceBg = document.getElementById('instanceBG'),
        formWrap = document.querySelector('.form-wrap'),
        schemaContent = document.querySelector('.schema-content'),

        about = document.querySelector('.about'),
        //btnTag = document.getElementById('process'),
        wrapTag = document.querySelector('.sch-wrap'),
        rawTag = document.querySelector('.sch-raw'),
        urlTag = document.querySelector('.sch-entry input'),
        codeTag = document.querySelector('.sch-entry textarea'),
        tabInter = document.querySelector('.interactive.schema'),
        tabRaw = document.querySelector('.raw.schema'),
        tabObjInter = document.querySelector('.interactive.obj'),
        tabObjRaw = document.querySelector('.raw.obj'),
        tabBar = document.querySelector('.tabbar'),
        settingBtn = document.querySelector('.setting-btn'),
        settingBar = document.querySelector('.setting-bar'),

        state = 'schema',
        processing = false,
        jsonData,
        jsonDataHl,
        data;

    //var schemaTab = document.querySelector('[data-action="schema"]');
    //var validateTab = document.querySelector('[data-action="instance"]');

 
    //Evt.add(schemaTab, 'tap', function () {
    //    show();
    //}, false);


    var actions = {
        schema: function () {
            activate(schTag, schemaContent, wrapTag);
            hide(formWrap, about, rawTag, instanceBg, instance);

            if (errTag.innerHTML != '') {
                activate(errTag);
            } else {
                hide(errTag);
            }
        },
        instance: function () {
            activate(schTag, formWrap, schemaContent, wrapTag, instanceBg, instance);
            hide(about, rawTag);
            if (errTag.innerHTML != '') {
                activate(errTag);
            } else {
                hide(errTag);
            }
        },
        about: function () {
            hide(schTag, formWrap, schemaContent, errTag, instanceBg, instance);
            activate(about);
        },
        inputurl: function () {
            hide(codeTag);
            activate(urlTag);
        },
        inputcode: function () {
            hide(urlTag);

            // in case we have url set, show raw schema code
            if (urlTag.value) {
                codeTag.value = JSch.raw(urlTag.value);
            }

            activate(codeTag);
        },
        interactive: function () {
        	switchTab(tabInter, tabRaw);
        	activate(wrapTag);
        	hide(rawTag);
        },
        raw: function () {
            var cnt = create("pre", "popup-cnt");

        	switchTab(tabRaw, tabInter);

        	cnt.innerHTML = JSch.syntaxHighlight(isHidden(codeTag) ? JSch.raw(urlTag.value) : JSON.parse(codeTag.value));

        	Dom.empty(rawTag);
            rawTag.appendChild(cnt);
            activate(rawTag);
            hide(wrapTag);
        },
        write: function() {
        	activate(instance);
        	switchTab(tabObjInter, tabObjRaw);
        },
        preview: function () {
        	hide(instance);
        	switchTab(tabObjRaw, tabObjInter);
        }
    }

    Gesture.enable(settingBtn, true);
    settingBtn.addEventListener('tap', function () {
    	CL.toggle(settingBar, 'hidden');
    }, false);

    instance.addEventListener('scroll', function () {
        instanceBg.scrollTop = instance.scrollTop;
    });

    function switchTab(newTab, oldTab) {
    	CL.remove(oldTab, 'active');
    	CL.add(newTab, 'active');
    }

    function hide() {
        elems = Array.prototype.slice.call(arguments, 0);

        for (var i = 0, count = elems.length; i < count; i++) {
            if (!isHidden(elems[i])) {
                CL.add(elems[i], 'hidden');
            }
        }
    }

    function activate() {
        elems = Array.prototype.slice.call(arguments, 0);

        for (var i = 0, count = elems.length; i < count; i++) {
            CL.remove(elems[i], 'hidden');
        }
    }

    function isHidden(el) {
        return CL.contains(el, 'hidden');// || el.offsetHeight <= 0; //CL.contains(el, 'hidden');
    }

    function enableTab(area) {
        area.onkeydown = function (evt) {
            if (evt.keyCode === 9) {
                var val = this.value,
					start = this.selectionStart,
					end = this.selectionEnd;

                this.value = val.substring(0, start) + '\t' + val.substring(end);
                this.selectionStart = this.selectionEnd = start + 1;

                // prevent the focus lose
                return false;
            }
        };
    }

    enableTab(codeTag);
    enableTab(instance);

    function cloneSchema(sch) {
		// primitive value
    	if (sch !== Object(sch)) {
    		return sch;
    	}

    	var	cloned = sch._cloned != undefined,
			cache = sch._cloned,
			result;

    	if (cloned && typeof cache == "function") {
    		return cache();
    	}

    	Object.defineProperty(sch, '_cloned', {
    		value: function () {
    			return result;
    		},
    		configurable: true,
    		enumerable: false
    	});

    	if (Array.isArray(sch)) {
    		result = [];
    		for (var i = 0, count = sch.length; i < count; i++) {
    			result[i] = cloneSchema(sch[i]);
    		}
    	} else {
    		var keys = Object.keys(sch),
				key;

    		result = {};

    		for (var i = 0, count = keys.length; i < count; i++) {
    			key = keys[i];
    			result[key] = cloneSchema(sch[key]);
    		}

    		if (cloned) {
    			result._cloned = cloneSchema(cache);
    		}
    	}

    	if (cloned) {
    		sch._cloned = cache;
    	} else {
    		delete sch._cloned;
    	}

    	return result;
    }

    function showErrors(errors, el, showAll) {
    	JSch.endLoad(schTag);

    	Dom.empty(errTag);
    	errTag.appendChild(JSch.renderErrors(errors, showAll));
    	activate(errTag);
    	JSch.errorsHighlight(errors, showAll, el);
    }

    function process(evt, url) {
    	actions.interactive();

        hide(errTag);
        Dom.empty(errTag);

        Dom.empty(schTag);
        hide(tabBar);

        var schema,
            showAllErrors = true,
            errCountTag = document.getElementById("showOneError");

        if (errCountTag) {
            showAllErrors = !errCountTag.checked;
        }
        changeState(isHidden(instance) ? 'schema' : 'instance');

    	//CL.add(schTag, 'loading');
        JSch.beginLoad(schTag);

        CL.remove(schTag, 'hidden');

        if (url) {		// coming from hash change
            schema = url;
            urlTag.value = url;
            changeState('inputurl');
        } else if (isHidden(codeTag)) {
            var schemaUrl = window.location.hash.split('schema=')[1];

            schema = urlTag.value;
            if (schema !== schemaUrl) {
                processing = true;
                window.location.hash = 'schema=' + schema;
            }
        } else {
            try {
                schema = JSON.parse(codeTag.value);
            } catch (errs) {
            	showErrors(errs, errTag, showAllErrors);
                return;
            }
        }

        JSch.resolve(schema).then(JSch.validate).then(function (sch) {
            activate(tabBar);
            JSch.render(cloneSchema(sch), schTag);

            if (!isHidden(instance)) {		// instance validation
                CL.remove(instance, 'sch-isValid');
                data = JSON.parse(instance.value);
                jsonData = JSON.stringify(data, undefined, 4);
                jsonDataHl = JSch.syntaxHighlight(jsonData);
                instance.value = jsonData;
                instanceBg.innerHTML = jsonDataHl;
            	//instance.value(json);

                return JSch.validate(sch, data);
            }

            return true;
        }).then(function (valid) {
            if (valid) {
                CL.add(instance, 'sch-isValid');
            }

            JSch.endLoad(schTag);
        }).catch(function (errs) {
        	if (isHidden(instance)) {
        		Dom.empty(schTag);
        	}

        	showErrors(errs, instanceBg, showAllErrors);
        });
    }

    function triggerAction(evt) {
        var action = this.getAttribute('data-action'),
			selected = this.parentNode.querySelector(".selected");

        if (selected) {
            CL.toggle(selected, 'selected');
            CL.toggle(this, 'selected');
        }

        if (action !== state) {
            state = action;
            actions[action]();
        }
    }

    function changeState(st) {
        triggerAction.call(document.querySelector("[data-action='" + st + "']"));
    }

    // activate actions
    var actionItems = document.querySelectorAll("[data-action]"),
		item;

    for (var i = 0, count = actionItems.length; i < count; i++) {
        item = actionItems[i];
        Gesture.enable(item, true);
        item.addEventListener('tap', triggerAction, false);
    }


    function show() {
        if (processing) {
            processing = false;
        } else {
            var schemaUrl = window.location.hash.split('schema=')[1];

            if (schemaUrl) {
                //urlTag.value = schemaUrl;
                process(null, schemaUrl);
            } else {
                changeState('about');
            }
        }
    }

    document.addEventListener("submit", function (evt) {
        evt.preventDefault();
        process();
    });

    show();
    window.onhashchange = show;
});