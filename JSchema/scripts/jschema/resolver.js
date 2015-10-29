Dragon.module(["dragon/jpointer"], function (JPtr) {
	var doc = document.implementation.createHTMLDocument('basic'),
		baseTag = doc.head.appendChild(doc.createElement('base')),
		loaded = {},
		raw = {},
		resolved = {};

	function toAbsolute(url, baseUrl) {
		// check if already absolute
		if (/^https?:\/\//.test(url)) {
			return url;
		}

		var parser = doc.createElement('a'),
			absUrl;

		baseTag.href = baseUrl || Dragon.config.basePath.replace('scripts/', 'schema#');
		parser.href = url;
		absUrl = parser.href;

		return absUrl;
	}

	function loadSchema(path, isRaw) {
		// schema is already loaded
		if (path in loaded) {
			return loaded[path];
		}

		return loaded[path] = Dragon.xhr({ url: path });
	}

	// load and return referenced schema
	function load(jref, baseRef) {
		return new Promise(function (resolve, reject) {
			var parts = jref.split('#'),
				schemaUrl = toAbsolute(parts[0], baseRef),
				ptr = '#' + (parts[1] || '');

			//console.log('Load: ' + schemaUrl + ptr + ' Base: ' + baseRef);

			loadSchema(schemaUrl).then(function (schema) {
				var sch = JPtr.get(schema, ptr);

				//NOTE: this is not optimal since we will store many 'non-raw' objects during dereferencing!
				if (!raw[schemaUrl]) {
					raw[schemaUrl] = JSON.stringify(sch, undefined, 4);
				}

				resolve(sch);
			}).catch(reject);
		});
	}

	function getRaw(jref) {
		return raw[jref.split('#')[0]];
	}

	// in case we find resolved parent, use it
	function isResolved(url) {
	    var keys = Object.keys(resolved),
			key,
			ptr;

	    for (var i = 0, count = keys.length; i < count; i++) {
	        key = keys[i];
	        if (url.indexOf(key.split('#')[0]) == 0) {
	            ptr = url.replace(key.split('#')[0], '');
	           
	            if (ptr === '' || ptr.indexOf('/#') == 0 || ptr.indexOf('#') == 0 ) {
	                return JPtr.get(resolved[key], ptr);
	            }
	        } else if (key.indexOf(url) == 0) {		//partial resolution, must be reloaded!
	            delete resolved[key];
	            delete loaded[key.split('#')[0]];
	        }
	    }

	    return false;
	}

	// dereference the whole schema
	function deref(jref, baseRef) {
		var schemaUrl,
			references = {},
			ready;

		if (typeof jref === 'object') {
			schemaUrl = toAbsolute('directinput');
			loaded[schemaUrl] = Promise.resolve(jref);
			delete resolved[schemaUrl];
		} else {
			schemaUrl = toAbsolute(jref, baseRef);

			// check if schema or parent schema is already loaded
			try {
				ready = isResolved(schemaUrl);
			}
			catch (err) {
				return Promise.reject(err);
			}
			// NOTE: consider removing try..catch here

			if (ready) {
				return Promise.resolve(ready);
			}
		}

		function findRefs(schema, ref) {
			var defs = [];

			JPtr.iterate(schema, function (val, ptr) {
				//if (/\$(ref|schema)/.test(ptr) && !ptr.match(/properties\/\$schema/)) {
				if (/\$ref/.test(ptr)) {
					//console.log('found reference: ', ptr, val);

					var pointer = ptr.replace(/\/\$ref/, ''),
						id = toAbsolute(val, ref),
						node = references[id];
					
					// new reference not yet under resolution
					if (!node) {
					    //console.log("Ref resolve: ", node);

						node = references[id] = { refs: {}, schema: isResolved(id) };

						if (!node.schema) {
							defs.push(new Promise(function (resolve, reject) {
								load(id).then(function (sch) {
									references[id].schema = sch;
									findRefs(sch, id).then(resolve, reject);
								}, reject);
							}));
						}
					}

					node.refs[ref + pointer] = { schema: schema, ptr: pointer };
				}
			});

			return Promise.all(defs);
		}

		// only ensure first level shalow object clone
		function shalowClone(obj) {
			var clone = {},
				key,
				keys = Object.keys(obj);

			for (var i = 0, count = keys.length; i < count; i++) {
				key = keys[i];
				clone[key] = obj[key];
			}

			return clone;
		}

		function replaceRef(sourceSch, sourcePtr, targetSch) {
			var desc = JPtr.get(sourceSch, sourcePtr).description;

			// keep original description
			if (desc) {
				targetSch = shalowClone(targetSch);
				targetSch.description = desc;

				//JPtr.set(sourceSch, sourcePtr + '/description', desc);
			}

			JPtr.set(sourceSch, sourcePtr, targetSch);
		}

		return new Promise(function (resolve, reject) {
			load(schemaUrl).then(function (sch) {
				references[schemaUrl] = { refs: {}, schema: sch };
				findRefs(sch, schemaUrl).then(function () {
					//console.log('Finished wait');
					//console.log(references);

					// replace all found references with loaded schema
					for (url in references) {
						var node = references[url],
							keys = Object.keys(node.refs),
							ref;

						for (var i = 0, count = keys.length; i < count; i++) {
							ref = node.refs[keys[i]];
							//JPtr.set(ref.schema, ref.ptr, node.schema);
							replaceRef(ref.schema, ref.ptr, node.schema);
						}
					}

					resolve(resolved[schemaUrl] = sch);
				}, reject);
			}).catch(reject);
		});
	}

	return {
		load: load,
		raw: getRaw,
		dereference: deref
	};
});