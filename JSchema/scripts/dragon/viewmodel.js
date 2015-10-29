Dragon.module(['./weakmap'], function (WM) {
    var wrappers = new WM (),
        modelParents = new WM(),
    	origIsArray;

    origIsArray = Array.isArray;

	Array.isArray = function(array) {
		return origIsArray.call(Array, array) || (array && array.length != undefined && !!array._model && !!array._callbacks && !!array.push && !!array.pop);
	};

    function get(object, parent, property) {
		//We do not wrap Date object because Date methods has internal checks for prototype
    	if (object === null || typeof object !== 'object' || object instanceof Date)
            return object;

        if (object._model) {
            modelParents.set(object, parent);
            object._property = property;

            return object;
        }

        var model = wrappers.get (object);

        if (model) {
            modelParents.set(model, parent);
            model._property = property;
         
            return model;
        }

        var cnst = function (obj) {
            Object.defineProperty (this, '_model', {
                configurable : false,
                enumerable : false,
                value : obj,
            });

            Object.defineProperty (this, '_callbacks', {
                configurable : false,
                enumerable : false,
                value : [],
            });

            this._property = '';

            this.toJSON = function () {
		        return this._model;
            };
        };

        cnst.prototype = Object.create(object.__proto__ || Object.getPrototypeOf(object));
        cnst.prototype.constructor = cnst;

        model = new cnst(object);
        modelParents.set(model, parent);

        Object.defineProperty(model, '_property', {
            configurable: false,
            enumerable: false,
            value: property,
        });

        wrappers.set (object, model);

        if (Array.isArray(object) && !object._model)
            wrapArray(object, model);
        else
            warpProperties(object, model);

        return model;
    }

    function wrapArray(proxyObj, model) {
        Object.defineProperty(model, 'length', {
            get: function () {
                return this._model.length;
            },
            set : function () {
                
            },
            configurable: true,
            enumerable: true
        });

        wrapAccessors(model, 0, model.length);

        model.pop = function () {
            var oldLength = this._model.length,
                oldArray =this._model.slice(0),
                item = Array.prototype.pop.apply(this._model);

            syncAccecssors(this, oldLength);

            arrayMutationRaise (model, this.length, oldArray, this, [], [wrapObject (item, null, null)]);

            return item;
        };

        model.push = function () {
            var items = Array.prototype.slice.call (arguments),
                oldLength = this._model.length,
                oldArray = this._model.slice (0),
                args = [];

            for( var i = 0, count = items.length; i < count; i++ ) {
                items[i] = wrapObject (items[i], this, getIndexProperty (oldLength + i));

                args.push (items[i]._model || items[i]);
            }

            Array.prototype.push.apply (this._model, args);

            syncAccecssors (this, oldLength);

            arrayMutationRaise (model, this.length - 1, oldArray, this, items, []);

            return this._model.length;
        };

        model.shift = function () {
            var oldLength = this._model.length,
                oldArray = this._model.slice (0),
                item = Array.prototype.shift.apply (this._model);

            syncAccecssors (this, oldLength);

            arrayMutationRaise(model, 0, oldArray, this, [], [wrapObject(item, null, null)] );

            return item;
        };

        model.unshift = function () {
            var oldLength = this._model.length,
                parent = modelParents.get(this),
                oldArray = this._model.slice(0),
                items = Array.prototype.slice.call(arguments),
                args = [];

            for (var i = 0, count = items.length; i < count; i++) {
                items[i] = wrapObject (items[i], this, getIndexProperty (oldLength + i));

                args.push(items[i]._model || items[i]);
            }

            Array.prototype.unshift.apply(this._model, args);

            syncAccecssors(this, oldLength);

            arrayMutationRaise(model, 0, oldArray, this, items, []);

            return this.length;
        };

        model.splice = function () {
            var args = Array.prototype.slice.call (arguments),
                items = [],
                deleted,
                oldArray = this._model.slice (0),
                addIndex = args[0] - ( args[1] || 0 ),
                oldLength = this._model.length;

            for( var i = 2, count = args.length; i < count; i++ ) {
                args[i] = args[i]._model || args[i];

                items.push (wrapObject (args[i], this, getIndexProperty (addIndex)));
            }

            deleted = Array.prototype.splice.apply (this._model, args);

            syncAccecssors (this, oldLength);

            for( i = 0, count = deleted.length; i < count; i++ )
                deleted[i] = wrapObject (deleted[i], null, null);

            arrayMutationRaise(model, args[0], oldArray, this, items, deleted);

            return deleted;
        };

		// add support for generic sorting
		model.sort = function (prop, descending) {
			var oldArray = this._model.slice(0),
				comp = function (a, b, pr) {
					var valA = a[pr],
						valB = b[pr];

					// compare strings as lowercase
					if (typeof valA === 'string') {
						valA = valA.toLowerCase();
						valB = valB.toLowerCase();
					}

					return (valA === valB) ? 0 : (valA > valB) ? 1 : -1;
				},
        		sortByProperty = function (property, desc) {
        			var dir = 1 - 2 * desc,
        				parts = property.split(','),
        				main = parts[0],
        				secondary = parts[1];

        			return function (x, y) {
        				var result = comp(x, y, main);

        				return result ? result * dir : (secondary ? comp(x, y, secondary) : 0);
        			};
        		};

			this._model.sort(sortByProperty(prop, descending));

			arrayMutationRaise(model, this.length, oldArray, this, [], []);
		}
    }

    function arrayMutationRaise (model, index, oldArray, newArray, added, removed) {
        callCallbacks (model, {
            mutation : 'update',
            propertyName : getPropertyPath (model, ''),
            value : newArray,
            oldValue : oldArray
        }, {
            mutation : 'splice',
            index : index,
            added : added,
            removed : removed
        });
    }

    function wrapAccessors(model, start, count) {
        for (var i = start; i < count; i++) {
            Object.defineProperty (model, i, {
                configurable : true,
                enumerable : true,
                get : wrappedArrayGet (i),
                set : wrappedArraySet (i)
            });
        }
    }

    function syncAccecssors(model, oldlength) {
        for (var i = oldlength - 1, count = model.length - 1; i > count; i--)
            delete model[i];

        wrapAccessors(model, oldlength, model.length, print);
    }

    function wrappedArrayGet (i) {
        return function () {
            return wrapObject(this._model[i], this, getIndexProperty(i));
        };
    }

    function wrappedArraySet (i) {
        return function (value) {
            var oldVal = this._model[i],
                oldArray = this._model.slice(0);

            this._model[i] = wrapObject (value, this, getIndexProperty (i));

            arrayMutationRaise (this, i, oldArray, this, [this[i]], [oldVal]);
        };
    }

    function getIndexProperty (index) {
        return '[' + index + ']';
    }

    function warpProperties (obj, wrapper) {
        for( var name in obj )
            wrapProperty (obj, wrapper, name);
    }

    function wrapProperty (obj, wrapper, name) {
        var descriptor;

        try {
            descriptor = Object.getOwnPropertyDescriptor(obj, name);
        } catch( e ) {
            // JSC and V8 both use data properties instead of accessors which can
            // cause getting the property desciptor to throw an exception.
            // https://bugs.webkit.org/show_bug.cgi?id=49739
            descriptor = {
                get : function () {
                },
                set : function (value) {
                },
                configurable : true,
                enumerable : true
            };
        }

        if( typeof descriptor.value === 'function' ) {
	        wrapper[name] = wrapFunction(obj, name);
            return;
        }

        wrapObject(descriptor.value, wrapper, name);

        var warpperDesc = {
            get: wrapGetter(name),
            configurable : descriptor.configurable,
            enumerable : descriptor.enumerable
        };

        if( descriptor.writable || descriptor.set )
            warpperDesc.set = wrapSetter(name);

        Object.defineProperty(wrapper, name, warpperDesc);
    }

    function wrapFunction(obj, name) {
        return function () {
            var args = Array.prototype.slice.call (arguments),
                result;

            for( var i = 0, count = args.length; i < count; i++ )
                args[i] = args[i]._model || args[i];

	        result = obj[name].apply(this, args);

            if (isThenable(result))
            	return result;

            return wrapObject(result, null, null);
        };
    }

    function isThenable(obj) {
    	return (isFunction(obj) || (typeof obj === "object" && obj !== null)) && isFunction(obj.then);
    }

    function isFunction(fn) {
    	return typeof fn === "function";
    }

    function wrapGetter (name) {
        return function () {
            var value = this._model[name];

            if( value === null || typeof value === 'undefined' )
                return value;

            return wrappers.get (value) || value;
        };
    }

    function wrapSetter (name) {
        return function (value) {
            var oldVal;

            if( this._model[name] === null || typeof this._model[name] === 'undefined' )
                oldVal = this._model[name];
            else
                oldVal = wrappers.get (this._model[name]) || this._model[name];

            value = wrapObject (value, this, name);

	        this._model[name] = (value ? value._model : null) || value;

            if( oldVal == value )
                return;

            if( oldVal && oldVal._model && value && value._model )
                value._callbacks = oldVal.__callbacks;

            callCallbacks (value && value._model ? value : this, {
                mutation : 'update',
                propertyName : getPropertyPath (this, name),
                value : value,
                oldValue : oldVal
            });
        };
    }

    function wrapObject(object, parent, property) {
        if (object !== null && typeof object === 'object') {
            if (parent && !parent._model)
                parent = wrappers.get(parent) || parent;

            return get(object, parent, property);
        }

        return object;
    }

    function getModel (object) {
        if (!object)
            return null;

        if (!object._model) {
            object = wrappers.get(object);

            if (!object)
                return null;
        }

        return object;
    }

    function observe (object, callback) {
        var model = getModel (object);

        if( !model )
            model = wrapObject(object, null, null);

        if( !model._model )
            return;

        object._callbacks.push (callback);
    }

    function callCallbacks (model, change, selfChange ) {
        var currModel = model;

        do {
            for( var i = 0, count = currModel._callbacks.length; i < count; i++ )
                currModel._callbacks[i] (currModel == model ? ( selfChange || change ) : change);

            currModel = modelParents.get (currModel);
        } while( currModel )
    }

    function extend (model, properties) {
        model = getModel(model);

        if (model && properties) {
        for( var name in properties ) {
        		if (model.hasOwnProperty(name))
                model[name] = properties[name];
		        else {
                model._model[name] = properties[name];
                var obj = {};
                obj[name] = properties[name];

                wrapProperty(obj, model, name);
            }

            callCallbacks(model, {
                mutation : 'add',
                propertyName : getPropertyPath(model, name),
                value : model[name],
                oldValue : null
            });
        }
    }

	    return model;
    }

    function getPropertyPath (model, name) {
        var propertyPath = model._property || '';

        if( name )
            propertyPath = propertyPath + ( propertyPath && name.indexOf('[') < 0 ? '.' : '' ) + name;

        while( model = modelParents.get (model) ) {
            if (!model._property)
                continue;

            propertyPath = model._property + ( propertyPath.length > 0 && propertyPath[0] != '[' ? '.' : '') + propertyPath;
        }

        return propertyPath;
    }

    return {
        get: function (obj) {
            return get(obj, null, null);

        },
        observe: observe,
        extend: extend
    };
});

//TODO override toString method of wrapped object so when displayed in console better string is generated!!!!!!!!!!!!