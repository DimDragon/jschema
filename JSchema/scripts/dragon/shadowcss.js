Dragon.module(function () {
	var head = document.querySelector('head'),
        shadowSheet = document.createElement("style");

	shadowSheet.setAttribute('shadowcss', '');
	
    var hostMediaColonRe = /(:^|})(\s*@media.*{)([^}]*})/gim,
		selectorColonRe = /(?:^|,)([^,:]*)(\s*:\s*host)*(?:\s*\(([^,]*)\))?([^,]*)?/gim,
		cssCommentRe = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//gim,
        nativeHostDuplicateRe = /(^|})(\s*:\s*host\s*)(\{[^}]*)/gim,
        normalRules = /(?:^|})([^{]*)(\{[^}]*)/gim,
		mediaInnerRulesRe = /^([^{}]*){([^}]*)}/,
		keyFrameRulesRes = /(:^|})(\s*@.*keyframe.*{)([^}]*})/gim,
        contentSelector = /::content/g,
        shadowSelector = /::shadow/g,
		pseudoClasses= {
		    ':link': '\:link',
		    ':visited': '\:visited',
		    ':active': '\:active',
		    ':hover': '\:hover',
		    ':focus': '\:focus',
		};

	
    function shadowToCssText (cssText, name) {
        var rules = [],
            result = '';
        
        cssText = transformMediaRules(cssText, name, rules);

		cssText = skipRules(cssText, rules);

        transformRules(cssText, name, rules);

        for (var i = 0, count = rules.length; i < count; i++)
            result += rules[i].rule + '\n';

        return result;
    }

    function transformRules (cssText, name, rules) {
        cssText.replace(normalRules, function (match, selector, ruleText, offset) {
            var text;

            ruleText = ruleText + '}\r\n';

        	//media rules are processed differently
            if (selector.indexOf('@media') >= 0 )
                return match;

        	//::content rules are not used int polyfilled css they are used only in native support shadow dom so we remove ::content and process the rule
            selector = selector.replace(contentSelector, '');

        	//no polyfill is needed for ::shadow rules they are only used  with native shadow dom  so we remove ::shadow and process the rule
            selector = selector.replace(shadowSelector, '');

			
            if( selector.match(/\s*:\s*host/gim) )
                text = prefixColonHostRule(name, selector, ruleText);
            else
                text = prefixSelector(selector, tagName(name)) + ' , ' + prefixSelector(selector, className(name)) + ruleText;

            insertRuleInPlace(rules, {
                index: offset,
                rule: text
            });

            return match;
        });
    }

	function skipRules(cssText, rules) {
		var result = cssText,
			match = keyFrameRulesRes.exec(result);

		while (match) {
			var bracket = match[1],
				selector = match[2],
				offset = match.index;

			var start = offset + selector.length + 1,
				end = findClose(result, start) + 1,
				closeBracket = result.indexOf('}', end),
				completeRule = result.substring(start, closeBracket),
					text = selector.replace('}', '') + completeRule + '}';

			insertRuleInPlace(rules, {
				index: offset,
				rule: text
			});

			result = result.substring(0, offset + bracket.length) + result.substring(offset + text.length + 1);

			match = keyFrameRulesRes.exec(result);
			match = keyFrameRulesRes.exec(result);
		}

		return result;
	}

    function transformMediaRules(cssText, name, rules) {
		var result = cssText,
    		removedRules = [];

        cssText.replace(hostMediaColonRe, function (match, bracket, mediaSelector, rule, offset) {
            var start = offset + mediaSelector.length + bracket.length,
                end = findClose(cssText, start) + 1,
                completeRule = cssText.substring(start, end),
                closeBracket = cssText.indexOf('}', end),
                tmp = shadowToCssText(completeRule, name);

            insertRuleInPlace(rules, {
                index : offset,
                rule : mediaSelector + tmp + '}'
            });

			removedRules.push(cssText.substring(offset + bracket.length, closeBracket + 1));

            return match;
        });

		removedRules.forEach(function (item) {
			result = result.replace(item, '');
		});

        return result;
    }

    function prefixColonHostRule (name, selectorText, ruleText) {
        var prefixedSelectors = '',
            selectors = selectorText.split (',');

        for( var i = 0, count = selectors.length; i < count; i++ ) {
            var selector = selectors[i],
                prefixed = prefixColonHostSelector(selector, name),
                separator = i == 0 ? '' : ',';

            if( prefixed != selector )
                prefixedSelectors += separator + prefixed;
            else
                prefixedSelectors += separator + name + selector;
        }

        return prefixedSelectors + ruleText;
    }

    function prefixColonHostSelector (selector, name) {
        return selector.replace (selectorColonRe, function (match, prefix, hostRule, parentMatch, sufix) {
            return prefixHostSelector(tagName(name), prefix, hostRule, parentMatch, sufix, true) + ' , ' + prefixHostSelector(className(name), prefix, hostRule, parentMatch, sufix);
        });
    }

    function prefixHostSelector (name, prefix, hostRule, parentMatch, sufix, tagRule) {
        var selectorText = '',
            hostClass = false,
            pseudoClass;

        if( hostRule ) {
            if (sufix)
                sufix = sufix.replace(contentSelector, '');

            if (prefix)
                selectorText += ' ' + prefix;

            if (parentMatch) {
                pseudoClass = matchPseudoClasses(parentMatch);

                if( pseudoClass )
                    selectorText += name.replace(/^\s+/g, '') + parentMatch;
                else {
                    hostClass = parentMatch.indexOf (':host') >= 0;

                    parentMatch = parentMatch.replace (':host', '').replace (' ', '');

                    if( hostClass ) {
                        if( tagRule )
                            selectorText += name.replace (/\s+$/g, '') + parentMatch + ' ';
                        else
                            selectorText += ' ' + parentMatch + name.replace (/^\s+/g, '');
                    } else
                        selectorText += parentMatch + name;
                }
            } else
                selectorText += name;

            if( sufix )
                selectorText += sufix;
        }
        return selectorText;
    }

    function matchPseudoClasses (str) {
        for( var key in pseudoClasses ) {
            if( str.match (new RegExp ('\s*' + pseudoClasses[key] + '\s*')) )
                return key;
        }

        return null;
    }

    function prefixSelector(selector, name) {
		var r = [],
			parts = selector.split(',');

		for (var i = 0, count = parts.length; i < count; i++)
			r.push(name + ' ' + parts[i].trim());

		return r.join(', ');
	}

	function stylesToCssText(styles) {
		var cssText = '';

		for (var i = 0, count = styles.length; i < count; i++)
			cssText += styles[i].textContent + '\n\n';

		cssText = cssText.replace(cssCommentRe, '');

		return cssText;
	}

	function findClose(text, index) {
		var str = text.substring(index),
			match = str.match(mediaInnerRulesRe),
			end = index;

		while (match) {
			str = str.replace(match[0], '');
			end += match[0].length;
			match = str.match(mediaInnerRulesRe);
		};

		return end;
	}

    function insertRuleInPlace (rules, rule) {
        for( var i = 0, count = rules.length; i < count; i++ ) {
            var r = rules[i];

            if( r.index < rule.index )
                continue;

            rules.splice(i, 0, rule);
        }

        if( i == rules.length )
            rules.push(rule);
    }

    function className(name) {
	    return ' .' + name;
	}

    function tagName(name) {
        return '  ' + name;
    }

    function processNative (cssText, name) {
        return cssText.replace (nativeHostDuplicateRe, function (match, prefix, host, rule) {
            return prefix + ':host(' + className (name) + '),\r\n' + ':host(' + tagName (name) + ')\r\n' + rule;
        });
    }

    return {
		process: function (root, name) {
		    var styles = root.querySelectorAll ('style'),
		        cssText;

		    if( styles.length == 0 )
		        return;

		    cssText = stylesToCssText (styles);

		    if( name )
		        cssText = shadowToCssText (cssText, name);

		    for( var i = 0, count = styles.length; i < count; i++ )
		        styles[i].parentNode.removeChild (styles[i]);

		    if (cssText) {
		        shadowSheet.appendChild(document.createTextNode(cssText));

		        if (!shadowSheet.parentNode)
		        	head.insertBefore(shadowSheet, head.querySelector('style[componentscss]').nextSibling);
		    }
		    
		},
        processNative : function (root, name) {
            var styles = root.querySelectorAll ('style');

            if( styles.length == 0 )
                return;

            for( var i = 0, count = styles.length; i < count; i++ )
                styles[i].textContent = processNative (styles[i].textContent, name);
        },
		_processStyle: function (style, name) //used in QA
        {
            return shadowToCssText (stylesToCssText ([style]), name);
        }
    };
});