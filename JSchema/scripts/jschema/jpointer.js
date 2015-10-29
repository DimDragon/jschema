Dragon.module(function () {
	function escape(str) {
		return str.replace(/~/g, '~0').replace(/\//g, '~1');
	}

	function unescape(str) {
		return str.replace(/~1/g, '/').replace(/~0/g, '~');
	}

	function escapeFragment(str) {
		return encodeURIComponent(escape(str));
	}

	function unescapeFragment(str) {
		return decodeURIComponent(unescape(str));
	}

	function encode(path) {
		if (path && !Array.isArray(path)) {
			throw new TypeError('Invalid type: path must be an array of segments.');
		}

		if (path.length === 0) {
			return '';
		}

		return '/' + path.map(escape).join('/');
	}

	function decode(ptr) {
		if (typeof ptr !== 'string') {
			throw new TypeError('Invalid type: JSON Pointer must be a string.');
		}

		if (ptr === '') {
			return [];
		}

		if (ptr[0] !== '/') {
			throw new Error('Invalid JSON Pointer. Non-empty pointer must begin with `/`: ' + ptr);
		}

		return ptr.substring(1).split('/').map(unescape);
	}

	function encodeFragment(path) {
		if (path && !Array.isArray(path)) {
			throw new TypeError('Invalid type: path must be an array of segments.');
		}

		if (path.length === 0) {
			return '#';
		}

		return '#/' + path.map(escapeFragment).join('/');
	}

	function decodeFragment(ptr) {
		if (typeof ptr !== 'string') {
			throw new TypeError('Invalid type: JSON Pointer must be a string.');
		}

		if (ptr.length === 0 || ptr[0] !== '#') {
			throw new Error('Invalid JSON Pointer. Fragment idetifiers must begin with a hash: ' + ptr);
		}

		if (ptr.length === 1) {
			return [];
		}

		if (ptr[1] !== '/') {
			throw new Error('Invalid JSON Pointer. Missing `/` after hash: ' + ptr);
		}

		return ptr.substring(2).split('/').map(unescapeFragment);
	}

	function decodePath(ptr) {
		return ptr[0] === '#' ? decodeFragment(ptr) : decode(ptr);
	}

	function getIndex(obj, token) {
		var index = token === '-' ? obj.length : parseInt(token, 10);

		// NOTE: From ES6 consider Number.isNan()
		if (isNaN(index)) {
			throw new Error('Invalid pointer reference: ' + token);
		}

		return index;
	}

	function get(jobj, ptr) {
		var obj = jobj || {},
			parts = decodePath(ptr),
			part;

		while (parts.length) {
			part = parts.shift();

			if (Array.isArray(obj)) {
				obj = obj[getIndex(obj, part)];
			} else {
				if (!obj.hasOwnProperty(part)) {
					throw new Error('Invalid pointer reference: ' + ptr);
				}

				obj = obj[part];
			}
		}

		return obj;
	}

	function set(jobj, ptr, val) {
		var obj = jobj,
			parts = decodePath(ptr),
			part,
			next = parts[0];

		if (!next) {
			throw new Error('Set pointer is referencing base object');
		}

		while (parts.length > 1) {
			part = parts.shift();
			next = parts[0];

			if (Array.isArray(obj)) {
				obj = obj[getIndex(obj, part)];
			} else {
				if (!obj.hasOwnProperty(part)) {
					obj[part] = next.match(/^\d+$/) ? [] : {};
				}

				obj = obj[part];
			}
		}

		if (Array.isArray(obj)) {
			next = getIndex(obj, next);
		}

		obj[next] = val;
	}

	function isComplex(val) {
		return Dragon.isType(val, 'Object') || Array.isArray(val);
	}

	function each(obj, fn) {
		if (Array.isArray(obj)) {
			obj.forEach(fn);
		} else {
			Object.keys(obj).forEach(function (key) {
				fn(obj[key], key);
			});
		}
	}

	function iterate(obj, fn, descend) {
		var parts = [];

		descend = descend || isComplex;

		(function next(target) {
			each(target, function (val, key) {
				parts.push(String(key));

				if (descend(val)) {
					next(val);
				} else {
					fn(val, encode(parts));
				}

				parts.pop();
			});
		}(obj));
	}

	return {
		encode: encode,
		decode: decode,
		encodeFragment: encodeFragment,
		decodeFragment: decodeFragment,
		get: get,
		set: set,
		iterate: iterate,
		_namespace: 'Dragon.JPointer'
	}
});