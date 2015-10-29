Dragon.module(['dragon/datetime', 'dragon/viewmodel', 'dragon/event', './weakmap', './validation', './jpointer'], function (Datetime, VM, Event, WM, Validation, JPtr) {
	var lexicalAnalysis = new LexicalAnalysis(),
		semanticAnalysis = new SemanticAnalysis(),
		wm = new WM(),
		vmObservers = new WM(),
		wmRepeatItems = new WM(),
		TEXT_NODE = 3,
		CONDITIONAL_TYPE = 'condition',
		CONDITIONAL_ATTRIBUTE = "?",
		ACTION_TYPE = {
			bind: 'bind',
			rebind: 'rebind',
		},
		formatters = {
			'Number': {
				toSource: function (value, format) {
					var numberFormat = getNumberFormatInfo(format);

					return value.replace(numberFormat.numberGroupSeparator, '').replace(numberFormat.numberSeparator, '.') * 1;
				},
				toTarget: function (value, format) {
					if ((typeof value).toLowerCase() != 'number')
						throw new Error('Formating is suported only for numbers!');

					var numberFormat = getNumberFormatInfo(format),
						result = value.toFixed(numberFormat.numberDecimalDigits).replace('.', numberFormat.numberSeparator),
						separatorIndex = numberFormat.numberSeparator ? result.indexOf(numberFormat.numberSeparator) : -1,
						part = result.substring(0, separatorIndex > 0 ? separatorIndex : result.length);

					if (part.length < numberFormat.numberDigits)
						part = Array(1 + numberFormat.numberDigits - part.length).join('0') + part;

					if (numberFormat.numberGroupSize > 0) {
						for (var i = numberFormat.numberGroupSize; i < part.length; i += numberFormat.numberGroupSize)
							part = [part.slice(0, i), numberFormat.numberGroupSeparator, part.slice(i)].join('');
					}

					return part + (separatorIndex > 0 ? result.substring(separatorIndex) : '');
				}
			},
			'Date': {
				toSource: function (value, format) {
					return Datetime.parseDate(value, format);
				},
				toTarget: function (value, format) {
					return Datetime.formatDate(getDate(value), format);
				}
			},
			'LocalDate': {
				toSource: function(value, format) {
					return Datetime.parseDate(value, format);
				},
				toTarget: function(value, format) {
					var date = getDate(value);
					date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
					return Datetime.formatDate(date, format);
				}
			},
			'Time': {
				toSource: function (value, format) {
					return Datetime.parseTime(value, format);
				},
				toTarget: function (value, format) {
					return Datetime.formatTime(getTime(value), format);
				}
			},
			'Weekday': {
				toTarget: function (value, format) {
					return Datetime.getWeekDay(getDate(value), format);
				}
			},
			'add': function (name, formatter) {
				formatters[name] = formatter;
			}
		};


	function bind(node, action) {
		if (action.type == ACTION_TYPE.bind)
			setNodeBindings(node);

		if (!node._bindings)
			return;

		if (node._bindings.repeat != null)
			bindRepeat(node, action);
		else
			bindNode(node, action);
	}

	function setNodeBindings(node) {
		if (node._bindings)
			return;

		node._bindings = {
			attrBindings: [],
			childs: [],
			repeat: null
		};

		// only templates can serve as repeated content
		if (isTemplate(node))
			node._bindings.repeat = node.getAttribute('repeat');

		setAttributeBindings(node);
	}

	function setAttributeBindings(node) {
		var attributes = [];

		if (node.attributes)
			attributes = node.attributes;

		if (node.nodeType == TEXT_NODE)
			attributes = [{ name: "textContent", value: node.textContent }];

		for (var i = 0, count = attributes.length; i < count; i++) {
			var attr = attributes[i],
				val = attr.value.trim(),
				obj = lexicalAnalysis(val); // lexical analysis will find all binding tokens

			if (attr.name == 'datasource') {
				node._bindings.attrBindings.push({
					attribute: attr.name,
					tokens: [],
					properties: [val]
				});

				continue;
			}

			if (obj.tokens.length == 0)
				continue;

			node._bindings.attrBindings.push({
				attribute: attr.name == 'data-src' ? 'src' : attr.name,
				tokens: obj.tokens,
				properties: obj.properties
			});
		}

		// special case about our own data-src attribute
		if (node.removeAttribute)
			node.removeAttribute('data-src');
	}

	function isTemplate(el) {
		return el.nodeName.toLowerCase() == 'template';
	}

	function bindNode(node, action) {
		if (wmRepeatItems.get(node) && action.type != ACTION_TYPE.rebind)
			return;

		// set all attributes to their bound value
		//root attributes are from outher scope
		if (action.root != node) {
			for (var i = 0, count = node._bindings.attrBindings.length; i < count; i++)
				bindAttribute(node, node._bindings.attrBindings[i], action);
		}
		
		if (node.parentNode && checkNodeConditionalAttribute(node)) {
			node.parentNode.removeChild(node);
			return;
		}
		
		//we use dataSource property of controls as scope
		if (('dataSource' in node || (node.tagName && node.tagName.toLowerCase() == 'view')) && action.root != node)
			return;

		// go thorugh all element children to resolve bindings
		for (i = 0; i < node.childNodes.length; i++) {
			var child = node.childNodes[i];

			if (!child)
				continue;

			bind(node.childNodes[i], action);
		}
	}

	function bindAttribute (node, attrBinding, action) {
		//? attribute is evaluated only once
		if (attrBinding.attribute == CONDITIONAL_ATTRIBUTE && attrBinding.evaluated)
			return;

		if (setAttribute(node, attrBinding, action))
			return;

		if (action.type == ACTION_TYPE.bind && !action.suppressDoubleWayBinding)
			bindAttributeDoubleWay(node, attrBinding, action.data);

		if (attrBinding.attribute == CONDITIONAL_ATTRIBUTE)
			attrBinding.evaluated = true;
	}

	function setAttribute(node, attrBinding, action) {
		if (action.type == ACTION_TYPE.rebind
			&& !attrBinding.properties.some(function (item) { return item.indexOf(action.property) == 0;}))
			return false;

		if (attrBinding.attribute == 'datasource') {
			node['dataSource'] = getProperty(action.data, attrBinding.properties[0]);
			return false;
		}

		var obj = semanticAnalysis(attrBinding.tokens, action.data);

		if (obj.type == CONDITIONAL_TYPE && !obj.condition) {
			if (attrBinding.attribute == 'textContent')
				node[attrBinding.attribute] = '';
			else
				node.removeAttribute(attrBinding.attribute);
			
			return true;
		}

		if (attrBinding.attribute == 'textContent' || (attrBinding.attribute == 'value' && (node.tagName.toLocaleLowerCase() == 'input' || node.tagName.toLocaleLowerCase() == 'textarea'))) {
			node[attrBinding.attribute] = obj.value;

			if (attrBinding.attribute == 'value')
				node.removeAttribute(attrBinding.attribute);
		} else if (attrBinding.attribute == CONDITIONAL_ATTRIBUTE)
			node.attributes[CONDITIONAL_ATTRIBUTE].value = obj.value;
		else
			node.setAttribute(attrBinding.attribute, obj.value);
	}

	function bindRepeat (node, action) {
		if (action.type == ACTION_TYPE.bind) {
			bindRepeatInternal(node, action);
			return;
		} else {
			if (action.property == node._bindings.repeat)
				bindRepeatInternal(node, { type: ACTION_TYPE.bind, data: action.data, root: action.root, suppressDoubleWayBinding: action.suppressDoubleWayBinding });
			else if (action.property.indexOf(node._bindings.repeat) == 0)
				rebindRepeatItem(node, action);
		}
	}

	function bindRepeatInternal(node, action) {
		var array = getProperty(action.data, node._bindings.repeat);

		if (!array || !Array.isArray(array))
			throw new Error('Incorrect repeat data property!');

		if (!node.parentNode)
			return;

		var frag = document.createDocumentFragment(),
			clone;

		clearRepeatedItems(node.parentNode, node);

		for (var i = 0, count = array.length; i < count; i++) {
			clone = node.content.cloneNode(true);

			transferBindings(node.content, clone);

			bind(clone, {
				type: action.type,
				data: array[i],
				root: action.root,
				property: action.property,
				suppressDoubleWayBinding: action.suppressDoubleWayBinding
			});

			markReapeaterGenerate(clone, node, i);

			if (!checkNodeConditionalAttribute(clone))
				frag.appendChild(clone);
		}

		node.parentNode.insertBefore(frag, node.nextSibling);
	}

	function rebindRepeatItem (node, action) {
		var path = action.property.substring(node._bindings.repeat.length + 1),
			index = path.substring(0, path.indexOf('.')),
			data =getProperty(action.data, node._bindings.repeat),
			nodes;

		path = path.substring(index.length + 1);

		nodes = findRepeatedItem(node.parentNode, node, index);

		for (var i = 0, count = nodes.length; i < count; i++)
			bindNode(nodes[i], { type: ACTION_TYPE.rebind, data: data[index], property: path, suppressDoubleWayBinding: action.suppressDoubleWayBinding });
	}

	function clearRepeatedItems (parent, repeat) {
		for (var i = 0; i < parent.childNodes.length; i++) {
			var child = parent.childNodes[i],
				_repeat = wmRepeatItems.get(child);

			if (!child || !_repeat || repeat != _repeat)
				continue;

			parent.removeChild(child);
			i--;
		}
	}

	function markReapeaterGenerate(node,repeat, index) {
		for (var i = 0, count = node.childNodes.length; i < count; i++) {
			wmRepeatItems.set(node.childNodes[i], repeat);
			node.childNodes[i]._repeaterIndex = index;
		}
	}

	function findRepeatedItem (parent, repeat, index) {
		var nodes = [];

		for (var i = 0, count = parent.childNodes.length; i < count; i++) {
			var child = parent.childNodes[i],
				_repeat = wmRepeatItems.get(child);

			if (!_repeat || repeat != _repeat || child._repeaterIndex != index)
				continue;

			nodes.push(child);
		}

		return nodes;
	}

	function transferBindings(frag, clone) {
		transferNodeBindings(frag, clone);

		for (var i = 0, count = frag.childNodes.length; i < count; i++) {
			var fragChild = frag.childNodes[i],
				cloneChild = clone.childNodes[i];

			transferNodeBindings(fragChild, cloneChild);

			if (fragChild.childNodes.length > 0)
				transferBindings(fragChild, cloneChild);
		}
	}

	function transferNodeBindings(node, clone) {
		if (!node._bindings)
			setNodeBindings(node);

		clone._bindings = node._bindings;

		for (var i = 0, count = node._bindings.attrBindings.length; i < count; i++)
			node._bindings.attrBindings[i].evaluated = false;
	}

	function checkNodeConditionalAttribute(node) {
		var value = node.hasAttribute ? node.getAttribute(CONDITIONAL_ATTRIBUTE) : '';

		return node.hasAttribute && node.hasAttribute(CONDITIONAL_ATTRIBUTE) && (!value || value.toLocaleLowerCase() === 'false');
	}

	function bindAttributeDoubleWay(node, attrBinding, data) {
		var attrName = attrBinding.attribute.toLocaleLowerCase();

		if (attrName != "value" && attrName != "checked")
			return;

		var field, formatter;

		for (var i = 0; i < attrBinding.tokens[0].length; i++) {
			var token = attrBinding.tokens[0][i];

			if (i == 0 && token.type == 'ident' && !token.global) {
				field = token.fn();
				continue;
			}

			if (token.type == 'formater' && !formatter) {
				formatter = token;
				continue;
			}

			if (token.type == 'keyWord' && token.subType == 'Null')
				continue;

			return;
		}

		wm.set(node, {
			field: toPointer(field),
			formatter: formatter,
			data: data
		});
	}

	function toPointer(path) {
		return (path ? '/' : '') + path.replace(/\./g, '/');
	}

	//Adjusted to use JPointer and allow 'global' objects
	function getProperty(obj, prop) {
		var parts = prop.split('#');

		try {
			// global object binding
			if (parts.length == 2) {
				obj = JPtr.get(window, toPointer(parts[0]));
				return JPtr.get(obj, toPointer(parts[1]));
			}

			return JPtr.get(obj, toPointer(parts[0]));
		} catch (exp) {
			return undefined;//In JS if you try to get not existing property you get undefined but Jpointer trows exception
		}
	}

	function LexicalAnalysis() {
		var TokenTypes = {
			'string': 'string',
			'number': 'number',
			'ident': 'ident',
			'openBracket': 'openBracket',
			'closeBracket': 'closeBracket',
			'keyWord': 'keyWord',
			'formater': 'formater'
		},
			KeyWords = {
				'null': { type: 'operator', fn: function () { return null; } },
				'true': { type: 'operator', fn: function () { return true; } },
				'false': { type: 'operator', fn: function () { return false; } },
				'undefined': { type: 'operator', fn: function () { return undefined; } },
				'+': { type: 'operator', fn: function (a, b) { return a() + b(); } },
				'-': { type: 'operator', fn: function (a, b) { return a() - b(); } },
				'*': { type: 'operator', fn: function (a, b) { return a() * b(); } },
				'/': { type: 'operator', fn: function (a, b) { return a() / b(); } },
				'%': { type: 'operator', fn: function (a, b) { return a() % b(); } },
				'^': { type: 'operator', fn: function (a, b) { return a() ^ b(); } },
				'==': { type: 'operator', fn: function (a, b) { return a() == b(); } },
				'!=': { type: 'operator', fn: function (a, b) { return a() != b(); } },
				'<=': { type: 'operator', fn: function (a, b) { return a() <= b(); } },
				'>=': { type: 'operator', fn: function (a, b) { return a() >= b(); } },
				'<': { type: 'operator', fn: function (a, b) { return a() < b(); } },
				'>': { type: 'operator', fn: function (a, b) { return a() > b(); } },
				'&&': { type: 'operator', fn: function (a, b) { return a() && b(); } },
				'||': { type: 'operator', fn: function (a, b) { return a() || b(); } },
				'&': { type: 'operator', fn: function (a, b) { return a() & b(); } },
				'!': { type: 'operator', fn: function (a) { return !a(); } },
				'?=': { type: 'operator', fn: function () { } },
				'if': { type: 'operator', fn: function () { } },
				'else': { type: 'operator', fn: function () { } },
				'Null': {
					type: 'function',
					fn: function (left, right) {
						var val = left();

						return typeof val == 'undefined' || val == null ? right.toString() : val;
					}
				}
			};

		function analyze (text) {
			var tokens = [],
				properties = [],
				index = 0;

			text.replace(/{{([^{}]+)}}/g, function (match, g1, offset, string) {
				if (index < offset) {
					tokens.push(string.substring(index, offset));
				}

				var array = tokenize(g1);

				tokens.push(array);

				array.forEach(function (token) {
					if (token.type === TokenTypes.ident && !token.global)
						properties.push(token.fn());
				});

				index = offset + match.length;
			});

			if (tokens.length > 0 && index < text.length)
				tokens.push(text.slice(index));

			return {
				tokens: tokens,
				properties: properties
			};
		}

		function htmlUnescape(str) {
			return str.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
		}

		function tokenize(expression) {
			var tokens = [],
				bracketsCount = 0;

			while (expression.length != 0) {
				expression = expression.trim();

				if (match(/^"([^"]*)"|^'([^']*)'/, readString))
					continue;

				// [DD] improved regex a bit, old one: /(^[+-]?\d+\.?\d*)|(^[+-]?\.?\d+)/
				if (match(/^-?\d*\.?\d+/, readNumber))
					continue;

				if (matchFormatters())
					continue;

				if (matchKeyWords())
					continue;

				// [DD] Identifiers can start with number and I also added support for # as part of identifiers, old one: /^([_a-zA-Z]+[_a-zA-Z0-9]*)(\.[_a-zA-Z]+[_a-zA-Z0-9]*)*/   /^\w+(\.\w+)*#?\w+(\.\w+)*/
				if (match(/(^\w+(\.\w+)*#?\w+(\.\w+)*)/, readIdent))
					continue;

				if (match(/^\(/, readOpenBracket))
					continue;

				if (match(/^\)/, readCloseBracket))
					continue;

				if (match(/^;/, function () {
				}))//; has no meaning it is just divider
					continue;

				throw new Error("Unexpected symbol" + expression.charAt(0));
			}

			if (bracketsCount != 0)
				throw new Error("Not matching count of open and close brackets");

			return tokens;

			function match(regEx, fn, data) {
				var matches = expression.match(regEx);

				if (!matches)
					return false;

				fn({ matches: matches, tokens: tokens, bracketsCount: bracketsCount, data: data });

				expression = expression.substring(matches[0].length);

				return true;
			}

			function matchKeyWords() {
				for (var key in KeyWords) {
					var isFunction = KeyWords[key].type == 'function',
						text = key.replace(/([[().{*+$^\\|?])/g, '\\$1');

					if (isFunction)
						text = "\\|(" + text + ')\\((.*?)\\)';

					if (match(new RegExp('^' + text, 'i'), readKeyWord, { type: key, isFunction: isFunction }))
						return true;
				}

				return false;
			}

			function matchFormatters() {
				for (var key in formatters) {
					var matches = expression.match(new RegExp('^' + "\\|(" + key + ')\\((.*?)\\)', 'i'));

					if (!matches)
						continue;

					tokens.push({
						type: TokenTypes.formater,
						name: key,
						parameters: matches[2]
					});

					expression = expression.substring(matches[0].length);

					return true;
				}

				return false;
			}
		}

		function readString(obj) {
			obj.tokens.push({
				type: TokenTypes.string,
				fn: function () { return htmlUnescape(obj.matches[1] ? obj.matches[1] : obj.matches[2]); }
			});
		}

		function readNumber(obj) {
			obj.tokens.push({
				type: TokenTypes.number,
				fn: function () { return 1 * obj.matches[0]; }
			});
		}

		function readKeyWord(obj) {
			if (obj.data.isFunction) {
				var index = obj.tokens.length;

				if (obj.matches[1] == 'Null') {
					while (KeyWords[obj.tokens[index - 1].subType].type == 'function')
						index--;
				}

				obj.tokens.splice(index, 0, {
					type: TokenTypes.keyWord,
					subType: obj.data.type,
					parameters: obj.matches[2],
					fn: KeyWords[obj.matches[1]].fn
				});
			} else
				obj.tokens.push({
					type: TokenTypes.keyWord,
					subType: obj.data.type,
					fn: KeyWords[obj.matches[0]].fn
				});
		}

		function readIdent(obj) {
			var prop = obj.matches[0];

			obj.tokens.push({
				type: TokenTypes.ident,
				fn: function () {
					return prop;
				},
				global: prop.indexOf('#') > 0
			});
		}

		function readOpenBracket(obj) {
			obj.tokens.push({
				type: TokenTypes.openBracket
			});

			obj.bracketsCount++;
		}

		function readCloseBracket(obj) {
			obj.tokens.push({
				type: TokenTypes.closeBracket
			});

			obj.bracketsCount--;
		}

		return analyze;
	}

	function SemanticAnalysis() {
		var tokens, index, data, tokenRes;

		function parse(pTokens, pData) {
			tokens = pTokens;
			index = 0;
			data = pData,
			tokenRes = {
				type: "value",
				value: ''
			};

			orderByPriority();

			tokenRes.value = conditionalExpression()();

			//Draganov made me do it
			if (tokenRes.value == null || tokenRes.value == undefined)
				tokenRes.value = '';

			if (index < tokens.length - 1)
				throw new Error('Unexpected Token:' + tokens[index]);

			return tokenRes;
		}

		function conditionalExpression() {
			var conditional = expectToken([{ 'subType': '?=', 'type': 'keyWord' }]);

			if (!conditional)
				return ifExpression();

			if (!expectToken([{ 'type': 'openBracket' }]))
				throw new Error('Missing ( after conditional operator');

			tokenRes.type = CONDITIONAL_TYPE;
			tokenRes.condition = bitwiseAND()();

			if (!expectToken([{ 'type': 'closeBracket' }]))
				throw new Error('Missing ) after conditional operator');

			if (currentToken())
				return nullFunction();
			else
				return function () {
					return '';
				};
		}

		function ifExpression() {
			var tokenIf = expectToken([{ 'subType': 'if', 'type': 'keyWord' }]);

			if (!tokenIf)
				return nullFunction();

			var openBraket = expectToken([{ 'type': 'openBracket' }]);

			if (!openBraket)
				throw new Error('Missing ( after if operator');

			var logicalFn = bitwiseAND(),
				closeBraket = expectToken([{ 'type': 'closeBracket' }]);

			if (!closeBraket)
				throw new Error('Missing ) after if operator');

			var trueFn = nullFunction(),
				tokenElse = expectToken([{ 'subType': 'else', 'type': 'keyWord' }]),
				falseFn = tokenElse ? nullFunction() : null;

			if (logicalFn())
				return trueFn;
			else
				return tokenElse ? falseFn : function () { return ''; };
		}

		function nullFunction() {
			var left = bitwiseAND(),
				token = expectToken([{ 'subType': 'Null', 'type': 'keyWord' }]),
				val;

			if (!token)
				return formatFunction(left);

			val = left();

			if (val == null || val == undefined) {
				while (expectToken([{ 'type': 'formater' }])) {
					index++;
				}

				return binaryFn(left, token.fn, token.parameters);
			} else
				return formatFunction(left);
		}

		function formatFunction(left) {
			var token = expectToken([{ 'type': 'formater' }]);

			if (!left)
				left = bitwiseAND();

			if (!token)
				return left;

			return binaryFn(left(), formatters[token.name].toTarget, token.parameters);
		}

		function bitwiseAND() {
			return executeTokens([{ 'subType': '&', 'type': 'keyWord' }], logicalOR, logicalOR, true);
		}

		function logicalOR() {
			return executeTokens([{ 'subType': '||', 'type': 'keyWord' }], logicalAND, logicalOR, true);
		}

		function logicalAND() {
			return executeTokens([{ 'subType': '&&', 'type': 'keyWord' }], equality, logicalAND, false);
		}

		function equality() {
			return executeTokens([{ 'subType': '==', 'type': 'keyWord' }, { 'subType': '!=', 'type': 'keyWord' }], relational, equality, false);
		}

		function relational() {
			return executeTokens([{ 'subType': '<', 'type': 'keyWord' }, { 'subType': '>', 'type': 'keyWord' }, { 'subType': '<=', 'type': 'keyWord' }, { 'subType': '>=', 'type': 'keyWord' }], multiplicative, relational, false);
		}

		function multiplicative() {
			return executeTokens([{ 'subType': '*', 'type': 'keyWord' }, { 'subType': '/', 'type': 'keyWord' }, { 'subType': '%', 'type': 'keyWord' }], additive, additive, true);
		}

		function additive() {
			return executeTokens([{ 'subType': '+', 'type': 'keyWord' }, { 'subType': '-', 'type': 'keyWord' }], unary, unary, true);
		}

		function unary() {
			var token;
			if (expectToken([{ 'subType': '+', 'type': 'keyWord' }]))
				return primary();
			else if ((token = expectToken([{ 'subType': '-', 'type': 'keyWord' }])))
				return binaryFn(zeroFn, token.fn, unary());
			else if ((token = expectToken([{ 'subType': '!', 'type': 'keyWord' }])))
				return unaryFn(token.fn, unary());
			else
				return primary();

		}

		function primary() {
			var result;

			if (expectToken([{ 'type': 'openBracket' }])) {
				result = conditionalExpression();

				if (!expectToken([{ 'type': 'closeBracket' }]))
					throw new Error('missing ) token');
			}
			else {
				var token = currentToken();
				index++;

				if (!token.fn)
					throw new Error('not a primary expression', token);

				if (token.type == 'ident')
					result = function () {
						return getField(token.fn());
					};
				else
					result = token.fn;
			}

			return result;
		}

		function expectToken(checkTokens) {

			for (var i = 0; i < checkTokens.length; i++) {

				var token = checkToken(checkTokens[i].type, checkTokens[i].subType);

				if (!token)
					continue;

				var res = currentToken();
				index++;
				return res;
			}

			return false;
		}

		function checkToken(type, subType) {
			if (index > tokens.length - 1)
				return false;

			var token = currentToken();

			if ((!subType || (token.hasOwnProperty('subType') && token.subType.toLowerCase() === subType.toLowerCase()))
				&& (!type || token.type.toLowerCase() === type.toLowerCase()))
				return token;

			return false;
		}

		function binaryFn(left, fn, right) {
			return function () {
				return fn(left, right);
			};
		}

		function unaryFn(fn, right) {
			return function () {
				return fn(right);
			};
		}

		function zeroFn() {
			return function () {
				return 0;
			};
		}

		function currentToken() {
			return tokens[index];
		}

		function getField(path) {
			return getProperty(data, path);
		}

		function executeTokens(pTokens, initialFn, continueFn, multiple) {
			var left = initialFn(),
				token,
				first = true;

			while ((token = expectToken(pTokens)) && (first || multiple)) {
				left = binaryFn(left, token.fn, token.parameters ? token.parameters : continueFn());
				first = false;
			}

			return left;
		}

		function process(pTokens, pData) {
			var result = {
				type: "value",
				value: ''
			}, obj;

			for (var i = 0, count = pTokens.length; i < count; i++) {
				if (typeof pTokens[i] == 'object') {
					obj = parse(pTokens[i], pData);

					if (obj.type == CONDITIONAL_TYPE)
						return obj;

					if (typeof obj.value === 'string')
						result.value += obj.value;
					else
						result.value += JSON.stringify(obj.value);
				}
				else
					result.value += pTokens[i];
			}

			return result;
		}

		function orderByPriority() {
			for (var i = 0; i < tokens.length; i++) {
				var token = tokens[i],
					j;

				if (token.type.toLowerCase() != 'keyword' || token.subType != 'Null' || i == 0 || tokens[i - 1].type.toLocaleLowerCase() != 'formater')
					continue;

				j = i - 1;
				while (j >= 0 && tokens[j].type.toLowerCase() == 'formater')
					j--;

				tokens.splice(i, 1);
				tokens.splice(j + 1, 0, token);
			}
		}

		return process;
	}

	function getDate(value) {
		var type = (typeof value).toString().toLowerCase();

		if (typeof value == 'undefined' || value == null)
			return null;

		if (type == 'number')
			return Datetime.intToDate(value);
		else if (type == 'string')
			return Datetime.rfcToDate(value);

		return value;
	}

	function getTime(value) {
		var type = (typeof value).toString().toLowerCase();

		if (typeof value == 'undefined' || value == null)
			return null;

		if (type == 'number')
			return Datetime.intTimeToDate(value);
		else if (type == 'string')
			return Datetime.rfcToDate(value);

		return value;
	}

	function getNumberFormatInfo(format) {
		var nfi = Dragon.config.numberFormat || {},
			info = {
				numberSeparator: nfi.separator || '.',
				numberDigits: 0,
				numberGroupSeparator: nfi.groupSeparator || '',
				numberDecimalDigits: nfi.decimalDigits || 2,
				numberGroupSize: nfi.groupSize || 3
		};

		var matches;

		if (format) {
			matches = format.match(/((\d+)([^\d$]))?((\d+)([^\d$]))?(\d+)$/);

			if (matches) {
				if (matches[1] && matches[4]) {
					info.numberGroupSize = matches[2].length;
					info.numberGroupSeparator = matches[3];
				} else {
					info.numberGroupSize = 0;
					info.numberGroupSeparator = '';
				}

				if (matches[1] || matches[4]) {
					info.numberDigits = matches[4] ? matches[5].length : matches[2].length;
					info.numberSeparator = matches[4] ? matches[6] : matches[3];
				} else {
					info.numberDigits = 0;
					info.numberDecimalDigits = 0;
					info.numberSeparator = '';
				}

				if (matches[7]) {
					if (matches[1] || matches[4])
						info.numberDecimalDigits = matches[7].length;
					else
						info.numberDigits = matches[7].length;
				}
			}
		}

		return info;
	}

	return Dragon.extend({
		resolve: function (node, data, suppressDoubleWayBinding) {
			// in case not view model, turn into observable object
			if (data && !data._model && !suppressDoubleWayBinding)
				data = VM.get(data);

			bind(node, {
				type: ACTION_TYPE.bind,
				data: data,
				root: node,
				suppressDoubleWayBinding: suppressDoubleWayBinding
			});

			if (!data || suppressDoubleWayBinding) //check if data is VM
				return data;

			// check if node is already under observation
			var observedData = vmObservers.get(node);

			// observe data object for any change
			if (observedData != data) {
				VM.observe(data, function (obj) {
					var property = '';

					if (obj.mutation == 'update')
						property = obj.propertyName.replace(/\[(\d+)\]/, function (match, digit) {
							return '.' + digit;
						});
					
					bind(node, {
						type: ACTION_TYPE.rebind,
						data: data,
						root: node,
						property: property,
						suppressDoubleWayBinding: suppressDoubleWayBinding
					});
				});

				// set node as observed
				vmObservers.set(node, data);
			}

			// if node was not observed we are done
			// monitor any change from input element to ensure two-way binding
			if (!observedData)
				Event.add(node, 'change', function (evt) {
					// get bound data for changed element
					var nodeData = wm.get(evt.target);

					// in case not bound there is no one to notify since we have no data change to observed model
					if (!nodeData || evt.target.validity && !evt.target.validity.isValid)
						return;

					var formatter = nodeData.formatter ? formatters[nodeData.formatter.name] : null,
						value = evt.target.value;

					if (formatter && formatter.toSource)
						value = formatter.toSource(value, nodeData.formatter.parameters);

					JPtr.set(nodeData.data, nodeData.field, value);
				}, true);

			return data;
		},

		_namespace: 'Dragon.Binding'
	}, {
		Formatters: {
			get: function () {
				return formatters;
		},
			set: function (value) {
				formatters = value;
			}
		}
	});
});