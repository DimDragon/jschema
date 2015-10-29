Dragon.module(['./dom', '../Tests/QA/unit-testing-styles.css'], function (Dom) {
	var cfg = {};
	var now = (function () {
		return window.performance && window.performance.now ?
			function () { return performance.now() } :
			function () { return Date.now() };
	})();
	var Suite = Dragon.define(function SuiteCnst(name) {
		this.name = name;
		this.tests = [];
	}, {
		add: function (name, test) {
			var testSomething = { name: name };
			testSomething.methods = [];
			if (test.setup) {
				testSomething.setup = test.setup;
			}
			if (test.teardown) {
				testSomething.teardown = test.teardown;
			}
			for (var method in test) {
				if (method != 'setup' && method != 'teardown')
					testSomething.methods.push({ test: testSomething, name: method, exec: test[method] });
			}
			this.tests.push(testSomething);
		},
		setup: function (fn) {
			this._setUp = fn;
		},
		teardown: function (fn) {
			this._tearDown = fn;
		},
		run: function () {
			var suiteCntx = {},
				prom = makePromise(this._setUp, suiteCntx);
			suiteGenerateHTML.call(this);
			this.runTime = now();
			prom.then((function (suite) {
				return function () {
					return executeTestProm.call(suite, suiteCntx);
				}
			})(this)).then((function (suite) {
				return function () {
					if (this._tearDown)
						this._tearDown.call(suiteCntx);
				}
			})(this))
			.then(showResult(this), showResult(this));
		}
	});

	function showResult(obj) {
		return function () {
			end = now(),
			passed = 0;
			obj.runTime = end - obj.runTime;
			if (obj instanceof Suite) {
				for (var i = 0, test = obj.tests[0]; test; test = obj.tests[++i]) {
					passed += test[false] == 0 ? 1 : 0;
				}
				obj.dom.footer.innerHTML = generateSummaryText(obj.runTime, obj.tests.length, passed);
			} else {
				obj.dom.footer.innerHTML = generateSummaryText(obj.runTime, obj.methods.length, obj[true]);
			}			
			//document.body.appendChild(generateHTML(test));
		}
	}

	function makePromise(obj, cntx) {
		try {
			obj = obj != undefined ?
			(typeof obj === 'function' ? (cntx ? obj.call(cntx) : obj()) : obj) :
			{};
		} catch (ex) {
			ex.result = false;
			Promise.reject(ex);
		}
		return Promise.resolve(obj);
	}

	function executeTestProm(suiteCntx) {
		var chain = Promise.resolve({}),
			beforeMethod;
		for (var i = 0, test = this.tests[i]; test; test = this.tests[++i]) {
			(function (suite, currTest, cntx) {
				testGenerateHTML.call(currTest, suite);
				currTest[true] = 0;
				currTest[false] = 0;
				currTest.runTime = now();

				chain = chain.then(function () {
					return makePromise(currTest.setup, cntx);
				});

				for (var j = 0, method = currTest.methods[j]; method; method = currTest.methods[++j]) {
					(function (method) {
						chain = chain.then(function () {
							assertGenerateHTML.call(method);
							var methodProm = makePromise(method.exec, cntx);
							methodProm.then(assertSetResult(method), assertSetResult(method));
							return methodProm;
						}, function () {
							assertGenerateHTML.call(method);
							var methodProm = makePromise(method.exec, cntx);
							methodProm.then(assertSetResult(method), assertSetResult(method));
							return methodProm;
						});
					})(method);
				}

				chain = chain.then(function () {
					return makePromise(currTest.teardown, cntx).then(showResult(currTest));
				}, function () {
					return makePromise(currTest.teardown, cntx).then(showResult(currTest));
				});
			})(this, test, { suiteCntx: suiteCntx });
		}
		return chain;
	}

	function suiteGenerateHTML() {
		if (!this.dom) {
			var section = Dragon.Dom.create('section', 'utp'),
    		headSuite = Dragon.Dom.create('header', 'utp-header'),
    		h2 = Dragon.Dom.create('h2', 'utp-title', this.name),
    		headSystemInfo = Dragon.Dom.create('header', 'utp-system-info', navigator.userAgent),
			df = document.createDocumentFragment(),
    		footer = Dragon.Dom.create('footer', 'utp-footer'),
			passed = 0;
			headSuite.appendChild(h2);
			section.appendChild(headSuite);
			section.appendChild(headSystemInfo);
			section.appendChild(footer);
			this.dom = {
				outer: section,
				footer: footer
			}
			document.body.appendChild(section);
		}
	}

	function testGenerateHTML(suite) {
		if (!this.dom) {
			var article = Dragon.Dom.create('article', 'utp-content'),
    		head = Dragon.Dom.create('header'),
    		h3 = Dragon.Dom.create('h3', null, this.name),
    		ol = Dragon.Dom.create('ol', 'utp-list test-actions'),
    		footer = Dragon.Dom.create('footer');
			head.appendChild(h3);
			article.appendChild(head);
			article.appendChild(ol);
			article.appendChild(footer);
			this.dom = {
				outer: article,
				content: ol,
				footer: footer
			}
			suite.dom.outer.insertBefore(article, suite.dom.footer);
		}
	}

	function assertGenerateHTML() {
		if (!this.dom) {
			var li = Dragon.Dom.create('li');
			this.test.dom.content.appendChild(li);
			this.dom = {
				outer: li
			}
		}
	}

	function assertShowResult() {
		Dragon.Class.add(this.dom.outer, this.result ? 'utp-passed' : 'utp-wrong');
		this.dom.outer.innerHTML = this.name + ': ' + (this.result ? 'Ok' : this.message);
	}

	function assertSetResult(method) {
		return function (detail) {
			if (typeof detail == 'boolean') {
				method.result = detail;
			} else {
				method.result = detail.result;
				method.message = detail.message;
			}
			method.test[method.result]++;
			assertShowResult.call(method);
		}
	}

    function generateHTML(suite) {
    	var section = Dragon.Dom.create('section', 'utp'),
    		headSuite = Dragon.Dom.create('header', 'utp-header'),
    		h2 = Dragon.Dom.create('h2', 'utp-title', suite.name),
    		headSystemInfo = Dragon.Dom.create('header', 'utp-system-info', navigator.userAgent),
			df = document.createDocumentFragment(),
    		footer = Dragon.Dom.create('footer', 'utp-footer'),
			passed = 0;
    	headSuite.appendChild(h2);
    	section.appendChild(headSuite);
    	section.appendChild(headSystemInfo);
    	for (var i = 0, test = suite.tests[0]; test; test = suite.tests[++i]) {
    		section.appendChild(generateArticle(test));
    		passed += test[false] == 0 ? 1 : 0;
    	}
    	footer.innerHTML = generateSummaryText(suite.runTime, suite.tests.length, passed);
    	section.appendChild(footer);
    	return section;
    }

    function generateArticle(test) {
    	var article = Dragon.Dom.create('article', 'utp-content'),
    		head = Dragon.Dom.create('header'),
    		h3 = Dragon.Dom.create('h3', null, test.name),
    		ol = Dragon.Dom.create('ol', 'utp-list test-actions'),
    		footer = Dragon.Dom.create('footer');
    	head.appendChild(h3);
    	article.appendChild(head);
    	article.appendChild(ol);
    	article.appendChild(footer);
    	for (var i = 0, method = test.methods[0]; method; method = test.methods[++i]) {
    		var li = Dragon.Dom.create('li', method.result ? 'utp-passed' : 'utp-wrong');
    		li.innerHTML = method.result ? 'Ok' : method.message;
    		ol.appendChild(li);
    	}
    	footer.innerHTML = generateSummaryText(0, test.methods.length, test[true]);
    	return article;
    }

    function generateSummaryText(runTime, testCount, passed) {
    	return [
				'Test completed in ',
				runTime,
				' miliseconds.<br/>',
				testCount,
				' tests of ',
				passed,
				' passed, ',
				(testCount - passed),
				' failed.'
    	].join("");
    }

    function resolve(act, exp, getResult, msg) {
    	return new Promise(function (resolve, reject) {
    		makePromise(act).then(function (result) {
    			resolve({
    				result: getResult(result, exp),
    				message: msg
    			});
    		}, function (result) {
    			resolve({
    				result: getResult(result, exp),
    				message: msg
    			});
    		});
    	});
    }

    function objectType(obj) {
		if (typeof obj === "undefined") {
			return "undefined";
			// consider: typeof null === object
		}
		if (obj === null) {
			return "null";
		}

		var type = toString.call(obj).match(/^\[object\s(.*)\]$/)[1] || "";

		switch (type) {
			case "Number":
				if (isNaN(obj)) {
					return "nan";
				}
				return "number";
			case "String":
			case "Boolean":
			case "Array":
			case "Date":
			case "RegExp":
			case "Function":
				return type.toLowerCase();
		}
		if (typeof obj === "object") {
			return "object";
		}
		return undefined;
    }

    var equiv = (function () {

    	// Call the o related callback with the given arguments.
    	function bindCallbacks(o, callbacks, args) {
    		var prop = objectType(o);
    		if (prop) {
    			if (objectType(callbacks[prop]) === "function") {
    				return callbacks[prop].apply(callbacks, args);
    			} else {
    				return callbacks[prop]; // or undefined
    			}
    		}
    	}

    	// the real equiv function
    	var innerEquiv,
			// stack to decide between skip/abort functions
			callers = [],
			// stack to avoiding loops from circular referencing
			parents = [],

			getProto = Object.getPrototypeOf || function (obj) {
				return obj.__proto__;
			},
			callbacks = (function () {

				// for string, boolean, number and null
				function useStrictEquality(b, a) {
					if (b instanceof a.constructor || a instanceof b.constructor) {
						// to catch short annotaion VS 'new' annotation of a
						// declaration
						// e.g. var i = 1;
						// var j = new Number(1);
						return a == b;
					} else {
						return a === b;
					}
				}

				return {
					"string": useStrictEquality,
					"boolean": useStrictEquality,
					"number": useStrictEquality,
					"null": useStrictEquality,
					"undefined": useStrictEquality,

					"nan": function (b) {
						return isNaN(b);
					},

					"date": function (b, a) {
						return objectType(b) === "date" && a.valueOf() === b.valueOf();
					},

					"regexp": function (b, a) {
						return objectType(b) === "regexp" &&
							// the regex itself
							a.source === b.source &&
							// and its modifers
							a.global === b.global &&
							// (gmi) ...
							a.ignoreCase === b.ignoreCase &&
							a.multiline === b.multiline;
					},

					// - skip when the property is a method of an instance (OOP)
					// - abort otherwise,
					// initial === would have catch identical references anyway
					"function": function () {
						var caller = callers[callers.length - 1];
						return caller !== Object && typeof caller !== "undefined";
					},

					"array": function (b, a) {
						var i, j, len, loop;

						// b could be an object literal here
						if (objectType(b) !== "array") {
							return false;
						}

						len = a.length;
						if (len !== b.length) {
							// safe and faster
							return false;
						}

						// track reference to avoid circular references
						parents.push(a);
						for (i = 0; i < len; i++) {
							loop = false;
							for (j = 0; j < parents.length; j++) {
								if (parents[j] === a[i]) {
									loop = true;// dont rewalk array
								}
							}
							if (!loop && !innerEquiv(a[i], b[i])) {
								parents.pop();
								return false;
							}
						}
						parents.pop();
						return true;
					},

					"object": function (b, a) {
						var i, j, loop,
							// Default to true
							eq = true,
							aProperties = [],
							bProperties = [];

						// comparing constructors is more strict than using
						// instanceof
						if (a.constructor !== b.constructor) {
							// Allow objects with no prototype to be equivalent to
							// objects with Object as their constructor.
							if (!((getProto(a) === null && getProto(b) === Object.prototype) ||
								(getProto(b) === null && getProto(a) === Object.prototype))) {
								return false;
							}
						}

						// stack constructor before traversing properties
						callers.push(a.constructor);
						// track reference to avoid circular references
						parents.push(a);

						for (i in a) { // be strict: don't ensures hasOwnProperty
							// and go deep
							loop = false;
							for (j = 0; j < parents.length; j++) {
								if (parents[j] === a[i]) {
									// don't go down the same path twice
									loop = true;
								}
							}
							aProperties.push(i); // collect a's properties

							if (!loop && !innerEquiv(a[i], b[i])) {
								eq = false;
								break;
							}
						}

						callers.pop(); // unstack, we are done
						parents.pop();

						for (i in b) {
							bProperties.push(i); // collect b's properties
						}

						// Ensures identical properties name
						return eq && innerEquiv(aProperties.sort(), bProperties.sort());
					}
				};
			}());

    	innerEquiv = function () { // can take multiple arguments
    		var args = [].slice.apply(arguments);
    		if (args.length < 2) {
    			return true; // end transition
    		}

    		return (function (a, b) {
    			if (a === b) {
    				return true; // catch the most you can
    			} else if (a === null || b === null || typeof a === "undefined" ||
						typeof b === "undefined" ||
						objectType(a) !== objectType(b)) {
    				return false; // don't lose time with error prone cases
    			} else {
    				return bindCallbacks(a, callbacks, [b, a]);
    			}

    			// apply transition with (1..n) arguments
    		}(args[0], args[1]) && arguments.callee.apply(this, args.splice(1, args.length - 1)));
    	};

    	return innerEquiv;
    }());

    return {
    	createSuite: function (name, opt) {
    		var suite = new Suite(name);
    		opt = opt || {};
    		if (opt.setup) {
    			suite.setup(opt.setup);
    		}

    		return suite;
    	},
    	ok: function (res, message) {
    		return resolve(res, null, function (a) { return a }, message);
    	},
    	fail: function (func, message) {
    		// must result in error thrown, so if error is thorn test passes!
    		var result = false;
    		try {
    			func();
    		} catch (ex) {
    			result = true;
    		}
    		var comp = (function (result) { return function () { return result } })(result);
    		return resolve(result, null, function (a) { return a }, message);
    	},
    	equal: function (actual, expected, message) {
    		//return resolve( actual == expected, actual, expected, message);
    		return resolve(actual, expected, function (a, b) { return a == b }, message);
    	},
    	nonEqual: function (actual, expected, message) {
    		var comp = function (a, b) { return a != b };
    		//return resolve(actual != expected, actual, expected, message);
    		return resolve(actual, expected, comp, message);
    	},
    	strictEqual: function (actual, expected, message) {
    		var comp = function (a, b) { return a === b };
    		//return resolve(actual === expected, actual, expected, message);
    		return resolve(actual, expected, comp, message);
    	},
    	strictNonEqual: function (actual, expected, message) {
    		var comp = function (a, b) { return a !== b };
    		//return resolve(actual !== expected, actual, expected, message);
    		return resolve(actual, expected, comp, message);
    	},
    	deepEqual: function (actual, expected, message) {
    		return resolve(actual, expected, equiv, message);
    	},
    	//fire: function (evType, 
    	config: cfg
    }
});