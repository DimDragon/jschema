Dragon.module(['./event'], function (event) {
    var supportsCSSAnimation = Dragon.hasCssProps('AnimationName');

    function addCCRules() {
        var head = document.querySelector('head'),
            observerSheet = document.createElement("style"),
            styleText = [
                   '*{',
                   'animation-duration: 0.001s;',
                   '-o-animation-duration: 0.001s;',
                   '-ms-animation-duration: 0.001s;',
                   '-moz-animation-duration: 0.001s;',
                   '-webkit-animation-duration: 0.001s;',
                   'animation-name: nodeInserted;',
                   '-o-animation-name: nodeInserted;',
                   '-ms-animation-name: nodeInserted;',
                   '-moz-animation-name: nodeInserted;',
                   '-webkit-animation-name: nodeInserted;',
                   '}',
                   '@-webkit-keyframes nodeInserted {',
                   '	50% { opacity: 1; }',
                   '		}',
                   '@-moz-keyframes nodeInserted {',
                   '	50% { opacity: 1; }',
                   '		}',
                   '@-ms-keyframes nodeInserted {',
                   '	50% { opacity: 1; }',
                   '		}',
                   '@-o-keyframes nodeInserted {',
                   '	50% { opacity: 1; }',
                   '		}',
                   '@keyframes nodeInserted {',
                   '	50% { opacity: 1; }',
                   '		}'
            ];

        head.appendChild(observerSheet);

        observerSheet.setAttribute("type", "text/css");
        observerSheet.setAttribute('ObserverPolyfillCSS', '');

        if (observerSheet.styleSheet)
            observerSheet.styleSheet.cssText = styleText.join('\r\n'); // IE
        else
            observerSheet.appendChild(document.createTextNode(styleText.join('\r\n')));
    }

    return Dragon.define(function (process) {
        this._listener = function (evt) {
            if (evt.animationName && evt.animationName != "nodeInserted")
                return;

            var mutaion = { type: 'childList', addedNodes: [], removedNodes: [] };

            if (evt.animationName || evt.type === "DOMNodeInserted")
                mutaion.addedNodes.push(evt.target);

            if (evt.type === "DOMNodeRemoved")
                mutaion.removedNodes.push(evt.target);

            process([mutaion]);
        };
    }, {
        observe: function (target) {
            if (supportsCSSAnimation) {
                addCCRules();

                event.add(target, 'animationstart', this._listener); // standard + firefox
                event.add(target, 'MSAnimationStart', this._listener); //  IE
                event.add(target, 'webkitAnimationStart', this._listener); // Chrome + Safari
            } else {
                event.add(target, 'DOMNodeInserted', this._listener, true);
                event.add(target, 'DOMNodeRemoved', this._listener, true);
            }
        },
    });
});

//TODO Add support for IE 8 where CSSAnimation and mutaion events are not supported(PropertyChange)