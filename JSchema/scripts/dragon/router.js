Dragon.module(['./event', './viewmodel', './dom', './binding', './lang', './uitools'], function (Event, VM, Dom, Binding, Lang, UITools) {
	var routeMap,
		Route,
		domainPath = window.location.host,
		basePath = '',
		physicalPath,
		dynamicSegmentsPath = '',
		dynamicSegments = {},
		base = document.querySelector('base'),
		hasHistory = !!(history && history.pushState),
		hasState = hasHistory && history.state !== undefined,
		stateKey = '__dragon_history__',
		title,
		pageNotFound,
		lastState = null;

	if (base)
		domainPath = base.href;

	if (document.title)
		title = document.title;

	Route = Dragon.define(function (name, props, resource) {
		this.name = name;
		this._routes = {};
		this._outlet = null;
		this.isResource = resource;

		Dragon.extend(this, props);

		if (!this.hasOwnProperty('loader'))
			this.loader = this.viewModel && this.view;

		this.path = this.path || '/' + this.name;

		if (!resource) {
			if (!this.hasOwnProperty('view'))
				this.view = this.name;

			if (!this.hasOwnProperty('viewModel'))
				this.viewModel = this.name;

			if (!this.hasOwnProperty('content'))
				this.content = '';
		}
	}, {
		route: function (name, options, fn) {
			internalRegister.call(this, name, options, fn, false);
		},

		resource: function (name, options, fn) {
			internalRegister.call(this, name, options, fn, true);
		},

		showError: function (err, empty) {
			if (!this._outlet)
				return;

			if (this.processError)
				err = this.processError(err);

			if (empty)
				Dom.empty(this._outlet);

			UITools.showError(this._outlet, err);
		},

		hideError: function () {
			if (!this._outlet)
				return;

			UITools.hideError(this._outlet);
		},

		path: {
			get: function () {
				return this._path;
			},
			set: function (value) {
				if (this._path == value)
					return;

				this._path = value;
				this.regex = '^(' + escapeRegExt(this._path) + ')';
				this.dynamicSegments = [];

				var match;

				while ((match = this.regex.match(new RegExp('/{([^}]*)}')))) {
					this.regex = this.regex.replace(match[0], '/([^/]*)');

					this.dynamicSegments.push(match[1]);
				}
			}
		}
	});

	function internalRegister(name, options, fn, resource) {
		if (options instanceof Function) {
			fn = options;
			options = {};
		}

		this._routes[name] = new Route(name, options, resource);

		if (fn)
			fn.call(this._routes[name]);
	}

	function resolveUrl() {
		var path = getPathFromUrl();

		follow(path);
	}

	function getPathFromUrl() {
		var path;

		if (hasHistory) {
			var startPath = fullPath().toLowerCase(),
				index = window.location.href.toLowerCase().indexOf(startPath) + startPath.length;

			path = window.location.href.substring(index);
		} else
			path = window.location.href.substring(window.location.href.indexOf('#')).replace('#', '');

		return path;
	}

	function getRoutes(path, namePath, retNameOnly, matchAnyRoute) {
		var routes = [{ routes: routeMap._routes, index: 0, path: path }],
			states = [],
			current,
			match;


		while ((current = routes[routes.length - 1])) {
			match = getNextRoute(current, namePath);

			if (match) {
				states.push({
					route: retNameOnly ? match.route.name : match.route,
					dynamicSegments: match.dynamicSegments,
					url: match.url,
					redirect: match.route.redirect,
					title: match.route.title
				});

				if (match.path == '' && (Object.keys(match.route._routes).length == 0 || matchAnyRoute))
					return states;

				routes.push({ routes: match.route._routes, index: 0, path: match.path });
			} else {
				routes.pop();
				states.pop();
			}
		}

		return null;
	}

	function getNextRoute(obj, namePath) {
		if (!obj.routes)
			return null;

		var keys = Object.keys(obj.routes),
			match;

		for (var i = obj.index, count = keys.length; i < count; i++) {
			var key = keys[i],
				r = obj.routes[key];

			match = matchRoute(r, obj.path, namePath);

			if (!match)
				continue;

			obj.index = ++i;
			return match;
		}

		return null;
	}

	function matchRoute(route, path, namePath) {
		var match,
			segments = {};

		if (namePath)
			match = path.match('(^/' + escapeRegExt(route.name) + ')');
		else
			match = path.match(route.regex);

		if (!match)
			return null;

		if (!namePath) {
			for (var i = 0, count = route.dynamicSegments.length; i < count; i++)
				segments[route.dynamicSegments[i]] = match[i + 2];
		}

		return {
			route: route,
			dynamicSegments: segments,
			path: path.substring(match[1].length),
			url: match[0]
		};
	}

	function getRoute(route) {
		var routes = getRoutes(route, true, false, true);

		if (!routes)
			return null;

		return routes[routes.length - 1].route;
	}

	function extend(route, props) {
		if (Array.isArray(route)) {
			for (var i = 0, count = route.length; i < count; i++)
				extendInner(route[i], props);
		} else
			extendInner(route, props);
	}

	function extendInner(route, props) {
		var r = getRoute(route);

		if (!r)
			return;

		Dragon.extend(r, props);
	}

	function init() {
		var startPath = fullPath();

		if (!hasHistory && !location.hash)
			location.hash = startPath;

		Dragon.config.pathMap.router = fullPath() + physicalPath;
		Dragon.resolvePathMap();

		if (hasHistory)
			window.onpopstate = function (event) {
				stateChange(event);
			};
		else
			Event.add(window, "hashchange", stateChange);

		Event.add(document, 'action', function (e) {
			if (!e.detail || !e.detail.action || e.detail.action != 'follow')
				return;

			e.stopImmediatePropagation();
			e.preventDefault();
			Dragon.Router.follow(e.detail.path);
		}, true);

		resolveUrl();
	}

	function follow(path) {
		if (path && path[0] == '#')
			path = getPathFromUrl() + path.substring(1);

		var states = getRoutes(path, false, true);

		if (!states) {
			goToPageNotFound();
			return;
		}

		if (states.length > 0 && states[states.length - 1].redirect) {
			Promise.resolve(states[states.length - 1].redirect()).then(function (val) {
				states = getRoutes(val, false, true);

				if (!states) {
					goToPageNotFound();
					return;
				}

					followState(val, states);
			});
		} else
			followState(path, states);
	}

	function followState(path, states) {
		var stateObj = {
			fullPath: fullPath() + path,
			title: getTitle(states),
			path: path,
			listStates: states
		};

		if (hasHistory) {
			if (lastState && hasStateChange(stateObj, lastState))
				history.pushState(JSON.stringify(lastState), null, lastState.fullPath);

			history.replaceState(JSON.stringify(stateObj), null, stateObj.fullPath);
		} else
			location.hash = path;

		if (!hasState) {
			var stateMap = stateStore();
			stateMap[location.href] = stateObj;
			stateStore(stateMap);
		}

		if (hasHistory)
			stateChange();
	}

	function hasStateChange(first, second) {
		if ((first ? first.length : -1) != (second ? second.length : -1))
			return true;

		for (var i = 0, count = first.length - 1; i < count; i++) {
			if (JSON.stringify(first.listStates[i]) != JSON.stringify(second.listStates[i]))
				return true;
		}

		return first.listStates[first.listStates.length - 1].route != second.listStates[second.listStates.length - 1].route;
	}

	function getTitle(states) {
		var arr = [title];

		for (var i = 0, cout = states.length; i < cout; i++) {
			if (states[i].title)
				arr.push(Lang.text(states[i].title));
		}

		return arr.join(' ');
	}

	function stateChange() {
		var stateObj = getState();

		document.title = stateObj.title;

		if (!Dragon.Event.raise(document, 'stateChange', { path: stateObj.path, title: stateObj.title.replace(title, '').trim() }))
			return;

		if (!stateObj || JSON.stringify(lastState) == JSON.stringify(stateObj))
			return;

		activateRoutes(stateObj).then(function () {
			lastState = stateObj;
		});
	}

	function stateStore(state) {
		return state ? window.sessionStorage.setItem(stateKey, JSON.stringify(state)) :
			JSON.parse(window.sessionStorage.getItem(stateKey)) || {};
	}

	function getState() {
		return hasState ? JSON.parse(history.state) : stateStore()[location.href];
	}

	function escapeRegExt(str) {
		return str.replace(/[-[\]()*+?.,\\^$|#\s]/g, "\\$&");
	}

	function activateRoutes(stateObj, force) {
		var index = 0,
			namePath = '',
			same = true,
			urlPath = '';

		return activateRoute({
			vm: null,
			outlet: null,
			route: routeMap
		});

		function activateRoute(ctx) {
			return new Promise(function (resolve, reject) {
				var currentState = stateObj.listStates[index],
					currentLastState = lastState && !force ? lastState.listStates[index] : null,
					route;

				if (!currentState) {
					resolve();
					return;
				}

				//TODO this code must be done again part with caching is not entirely correct
				route = ctx.route._routes[currentState.route];

				route.hideError();

				if (route.isResource)
					namePath += '/' + (route.name == 'index' ? '' : route.name);

				urlPath += currentState.url;

				index++;

				//TODO this code here is not entirely correct fix it later!!!!!!!!!!!
				//TODO when error occurs may be we should skip caching
				if (currentLastState && currentState.route == currentLastState.route
					&& JSON.stringify(currentState.dynamicSegments) == JSON.stringify(currentLastState.dynamicSegments) && same) {
					var vm;

					getRouteVM(route, namePath, ctx.vm, false).then(function (viewModel) { //View model should already be loaded and ready to use!
						vm = viewModel;

						activateRoute({
							vm: vm,
							outlet: routeOutlet(route, ctx ? ctx.outlet : null),
							route: route
						}).then(resolve, function (err) {
							route.showError(err, true);
							reject(err);
						});
					});
				} else {
					same = false;

					executeRoute(route, namePath, urlPath, ctx).then(function (res) {
						activateRoute(res).then(resolve);
					}).catch(function (err) {
						route.showError(err, true);
						reject(err);
					});
				}
			});
		}

	}

	function executeRoute(route, namePath, urlPath, ctx) {
		var vm;

		return new Promise(function (resolve, reject) {
			getRouteVM(route, namePath, ctx.vm, true).then(function (rvm) {
				vm = rvm;

				route._outlet = routeOutlet(route, ctx ? ctx.outlet : null);

				if (route.loader)
					UITools.beginLoad(route._outlet);

				return loadModules(route);
			}).then(function () {
				return execFn(route, route.beforeLoad, []);
			}).then(function () {
				return execFn(route, route.load, []);
			}).then(function (data) {
				return execFn(route, route.afterLoad, [data], data) || data;
			}).then(function (json) {
				vm = combineVm(vm, json, route.viewModel ? (namePath + '/' + route.viewModel) : '');
				return getRouteView(route, namePath);
			}).then(function (view) {
				return renderRoute(route, vm, route._outlet, view, urlPath);
			}).then(function () {
				UITools.endLoad(route._outlet);

				resolve({
					vm: vm,
					outlet: route._outlet,
					route: route
				});
			}).catch(function (err) {
				UITools.endLoad(route._outlet);

				reject(err);
			});
		});
	}

	function loadModules(route) {
		if (!route.modules || route.modules._loaded)
			return Promise.resolve();

		var keys = Object.keys(route.modules),
			arr = [];

		keys.forEach(function (key) {
			arr.push(route.modules[key]);
		});

		return Dragon.use(arr).then(function () {
			var modules = Array.prototype.slice.call(arguments);

			for (var i = 0, count = modules.length; i < count; i++)
				route.modules[keys[i]] = modules[i];

			route.modules._loaded = true;
		});
	}

	function combineVm(vm, json, vmPath) {
		var m = VM.get(json),
			model = VM.extend(m, vm);

		if (vmPath)
			Dragon.viewModels[vmPath] = model;

		return model;
	}

	function getRouteVM(route, namePath, parent, ignoreCache) {
		return (route.getVM || getVM).call(route, namePath, parent, ignoreCache);
	}

	function getVM(namePath, parent, ignoreCache) {
		var viewModel = this.viewModel;

		return new Promise(function (resolve, reject) {
			var vmPath = namePath;

			if (viewModel)
				vmPath += '/' + viewModel;

			if (typeof viewModel === 'undefined')
				resolve(parent);
			else if (viewModel == null)
				resolve(null);
			else if (Dragon.viewModels.hasOwnProperty(vmPath) && !ignoreCache)
				resolve(Dragon.viewModels[vmPath]);
			else {
				Dragon.loadViewModel(vmPath).then(function (vm) {
					resolve(vm);
				});
			}
		});
	}

	function getRouteView(route, namePath) {
		if (!route.view)
			return Promise.resolve();

		return (route.getView || getView).call(route, namePath);
	}

	function getView(namePath) {
		return Dragon.loadView(namePath + '/' + this.view);
	}

	function execFn(route, fn, params, value) {
		if (!fn)
			return value;
		else
			return fn.apply(route, params);
	}

	function renderRoute(route, vm, outlet, content, urlPath) {
		return new Promise(function (resolve, reject) {
			try {
				var tmpl = content ? content.querySelector('template').content.cloneNode(true) : null;

				if (!route.getView && !route.view) {
					resolve();
					return;
				}

				emptyContent(outlet);

				outlet.model = vm;

				if (tmpl)
					outlet.appendChild(tmpl);

				Dragon.async(function () {
					try {
						if (route.init)
							route.init.call(route, vm, outlet);
						else
							Binding.resolve(outlet, vm);

						Dragon.async(function () {
							expandLinks(outlet, urlPath);

							if (route.complete)
								route.complete.call(route, vm, outlet);

				if (vm && vm.hasOwnProperty('actions') && !outlet._listenerAttached) {
					outlet._listenerAttached = true;

					Event.add(outlet, 'action', function (e) {
									if (!this.model || !this.model.actions)
							return;

						if (this.model.actions[e.detail.action]) {
							e.stopImmediatePropagation();
							e.preventDefault();

							this.model.actions[e.detail.action].call(this.model, this);
						}
					});
				}

							resolve();
						});
					} catch (e) {
						reject(e);
					}
				});
			} catch (err) {
				reject(err);
			}
		});
	}

	function emptyContent(outlet) {
		while (outlet.lastChild) {
			if (UITools.isLoader(outlet.lastChild))
				return;

			outlet.removeChild(outlet.lastChild);
		}
	}

	function routeOutlet(route, parent) {
		return (route.findOutlet || findOutlet).call(route, route.outlet || '', parent);
	}

	function expandLinks(view, urlPath) {
		var links = view.querySelectorAll('ctrl-link, .ctrl-link');

		for (var i = 0, count = links.length; i < count; i++)
			links[i].expand(urlPath);
	}

	function findOutlet(outlet, parent) {
		parent = parent || document.body;

		var selector = 'view[outlet="' + outlet + '"]',
			view = parent.querySelector(selector);

		if (view)
			return view;

		while ((parent = parent.parentNode)) {
			view = parent.querySelector(selector);

			if (view)
				break;
		}

		return view;
	}

	function getDyanmicSegments(path) {
		var states = getRoutes(path, false, true);

		if (!states)
			return;

		dynamicSegments = {};

		for (var i = 0, count = states.length; i < count; i++)
			Dragon.extend(dynamicSegments, states[i].dynamicSegments);
	}

	function changeDyanmicSegments(obj) {
		var path = getPathFromUrl(),
			states = getRoutes(path),
			url = '';

		if (!states)
			return;

		for (var i = 0, count = states.length; i < count; i++) {
			var state = states[i];

			url += state.route.path.replace(/{([^}]*)}/g, function (match, segment) {
				if (obj.hasOwnProperty(segment))
					return obj[segment];

				return state.dynamicSegments[segment];
			});
		}

		follow(url);
	}

	function setDynamicSegments(route, segements) {
		var path = getPathFromUrl(),
			routes = getRoutes(path, false, false, true),
			routeNames = route.split('/'),
			url = '',
			lastRoute,
			match,
			offset = 2;

		for (var i = 0, count = routeNames.length; i < count; i++) {
			if (routeNames[i] != '')
				continue;

			routeNames.splice(i, 1);
			i--;
		}

		if (routes.length != routeNames.length)
			return;

		for (i = 0, count = routeNames.length; i < count; i++) {
			if (routes[i].route.name != routeNames[i])
				return;

			if (i == count - 1) {
				lastRoute = routes[i];
				continue;
			}

			url += routes[i].url;
		}

		match = lastRoute.url.match(lastRoute.route.regex);

		for (i = offset, count = match.length; i < count; i++)
			if (segements.hasOwnProperty(lastRoute.route.dynamicSegments[i - offset]))
				lastRoute.url = lastRoute.url.replace('/' + match[i], '/' + segements[lastRoute.route.dynamicSegments[i - offset]]);

		url += lastRoute.url;

		follow(url);
	}

	function fullPath() {
		var path = domainPath + basePath;

		if (path[path.length - 1] == '/')
			path = path.substring(0, path.length - 1);

		return path;
	}

	function back() {
		if (hasHistory) {
			history.back();
			return;
		}

		var state = getState(),
			hash = '';

		for (var i = 0, count = state.length; i < count; i++)
			hash += state.url;

		location.hash = hash;
	}

	function goToPageNotFound() {
		if (!pageNotFound)
			return;

		window.location.href = domainPath + basePath + pageNotFound;
	}

	function reload() {
		var path = getPathFromUrl(),
			state = getRoutes(path, false, true);

		activateRoutes({
			listStates: state
		}, true);
	}

	routeMap = new Route('routeMape');
	routeMap.route('index', { path: '/', view: 'index', viewModel: 'index', regex: '(/$)' });

	return Dragon.extend({
		route: function (name, options, fn) {
			routeMap.route(name, options, fn);
		},
		resource: function (name, options, fn) {
			routeMap.resource(name, options, fn);
		},
		extend: extend,
		follow: follow,
		getRoute: getRoute,
		setDynamicSegments: setDynamicSegments,
		combineVm: combineVm,
		renderRoute: renderRoute,
		back: back,
		init: init,
		reload: reload,
		_namespace: 'Dragon.Router'
	}, {
		basePath: {
			get: function () {
				return basePath;
			},
			set: function (path) {
				basePath = path;
			}
		},
		physicalPath: {
			get: function () {
				return physicalPath;
			},
			set: function (path) {
				physicalPath = path;
			}
		},
		dynamicSegments: {
			set: function (value) {
				changeDyanmicSegments(value);
			},
			get: function () {
				var path = getPathFromUrl();

				if (path != dynamicSegmentsPath) {
					dynamicSegmentsPath = path;
					getDyanmicSegments(dynamicSegmentsPath);
				}

				return dynamicSegments;
			}
		},
		title: {
			get: function () {
				return title;
			},
			set: function (value) {
				title = value;
			}
		},
		pageNotFound: {
			get: function () {
				return pageNotFound;
			},
			set: function (value) {
				pageNotFound = value;
			}
		}
	});
});

//TODO FIX IE9 where using hash instead of history!!!




//Dragon.module(['./route', 'dragon/event'], function (Route, Evt) {
//    var hasHistory = !!(history && history.pushState),
//        hasState = hasHistory && history.state !== undefined,
//        stateKey = '__dragon_history__',
//        routeMap = {},
//        root = window.location.host;

//    // Prototype for route objects

//    var route = {
//        name: 'posts', //required
//        // path is URL to reach that route
//        // if not provided the path is same as route name!
//        path: '/posts',
//        // This is the name of view which will be rendered for that route
//        // if not provided name is same as full route name + '.html'
//        // basically it must load the name.html file and take the template from it
//        // NOTE: I think we should only take first template and ignore others if present ( 1 view = 1 template )
//        view: 'posts',
//        // This is the name of viewmodel responsible to handle the view
//        // name is given as string in syntax we use for our module references
//        // if not provided name is same as full route name
//        viewmodel: 'posts',
//        // called before load handler, can return promise
//        beforeLoad: function () { },
//        // return model to be used, can return promise
//        load: function (params) { },
//        // called after load handler, can return promise
//        afterLoad: function () { },
//        // called to place generated view into DOM
//        renderView: function () { }
//    };

//    // Prototype for viewmodel object
//    // NOTE: since this should implement observable pattern, this is best as separate module
//    // NOTE: viewmodel objects should be stored in some global repository, so they can be reachable from everywhere
//    // constructor or static create method should accept model object as parameter (see model.js)
//    var viewmodel = {
//        // internal property which holds the model
//        _model: null,
//        // list of actions, this viewmodel is build to handle
//        fullname: 'fenth',
//        actions: {
//            addPost: function () { },
//            editPost: function () { },
//            deletePost: function () { }
//        }
//        // any other public properties defined on viewmodel are available for data binding
//        // this allows extension of model with computed/conditional/logical properties
//    }

//    //Dragon.viewmodel.register ('xxx', Dragon.extend(Dragon.validationMessage.pre) {});

//    var viewmodelEmpl = {
//        // internal property which holds the model
//        _model : null,
//        // list of actions, this viewmodel is build to handle
//        fullname : 'fenth',
//        actions : {
//            addPost : function () {},
//            editPost : function () {},
//            deletePost : function () {}
//        }
//        // any other public properties defined on viewmodel are available for data binding
//        // this allows extension of model with computed/conditional/logical properties
//    };


//    //view.model = { };



///* history state handling */

//    function stateStore(state) {
//        return state ? sessionStorage.setItem(stateKey, JSON.stringify(state)) :
//            JSON.parse(sessionStorage.getItem(stateKey)) || {};
//    }

//    function getState() {
//        return hasState ? history.state : stateStore()[location.href];
//    }

//    // execute on every virtual path change
//    function stateChange() {
//        var state = getState(),
//            path = location.pathname,
//            parts = path.split('/');

//        // traverse routeMap and execute routes in order
//        console.log(parts);
//    }


//    // if no path is specified it is considered same as route name
//    // if no mv(modelview) is specified 
//    function registerRoute(name, route) {
//        route = route || {};
//        route.name = name;

//        routeMap[name] = new Route(route);
//    }

//    function routerInit(cfg) {
//        if (cfg.basePath) {
//            root += cfg.basepath;
//        }

//    	// fire initial state change
//		// NOTE: probably not good here since we need paths defined first!
//        stateChange();

//        Dragon.Event.add(window, hasHistory ? "popstate" : "hashchange", stateChange);
//    }

//	// return Route object by given route path
//    function getRoute(path) {
//    	return null;
//    }

//    // Route activation livetime

//    //  - resolve viewmodel path
//    //  - if viewmodel.js file is already loaded continue if not wait for load to finish and continue
//    // NOTE: we can use full route path, we can use view or viewmodel names/paths as which .js file to load
//    //  - check for vm.beforeLoad handler, if one is present execute
//    //  - if return result from beforeLoad is promise, wait for it to finish and then continue
//    //  - check for vm.load handler, if one is present execute
//    //  - if path has dynamic segments those are provived as 'params' to load handler
//    // NOTE: queryParams ???
//    //  - if return result from load is promise, wait for it to finish and then continue
//    //  - assigned return object from load handler to vm.model, making it observable
//    function activate(route) {
//		// if redirect is specified, do nothing just activate target route
//    	if (route.redirect) {
//    		activate(getRoute(route.redirect));
//    		return;
//    	}

//        // must resolve path to view/route/viewmodel implementation
//        // this js file must be loaded only once so we should marked it somehow
//    	if (!route._loaded) {
//    	    Dragon.loadScript('scriptname').then(function () {
//    	        route._loaded = true;
//                // continue
//    	    });
//    	}

//    }

//    return {
//        init: routerInit,
//        add: registerRoute,
//        _namespace: 'Dragon.Router'
//    };
//});

// IDEAS

// router maintains routes in a tree structure
// every route has a 'name' and 'path'
// path allows dynamic sections via {param} notation
// from givem url router should be able to trivialy contruct route name path like: root.route1.route2
// 'index' will be used as 'special name' to annotate '/' path
// upon router initialization initial index is created
// router will operate relative to domain unless supplied by basePath (relative value)
// by default router will try to render name.html view into 'first' content holder available
// router should also allow not direct render but handler execution
// question: how ro keep rendering for subviews when we define nested routes via handler?
// create ctrl-link control to render route paths and mark active path


// after route is found his job is to :

// load appropriate template
// find controller to be used for that route
// find model provided by controller
// associate model with template
// find where to render the template


// view gets property 'model'
// model can ONLY be assigned programically, so not present as attribute
// if model value is undefined this means inheritance so model value of parent view is used
// model value can be:
//  - ViewModel object
//  - null
//  - undefined (use value from parent)

// additionally to help binding for nested views we can implelemnt also 'modelScope' property and 'modelscope' attribute in order to shorten bindings