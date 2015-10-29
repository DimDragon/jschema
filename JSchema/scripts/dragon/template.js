Dragon.module(function () {
    var isNative = 'content' in document.createElement('template');

    function upgrade(node) {
        //// this is already upgraded node
        //// NOTE: is this check really necessary?
        //if ('content' in node) {
        //	return;
        //}

        var frag = document.createDocumentFragment();

        while (node.firstChild) {
            frag.appendChild(node.firstChild);
        }

        node.content = frag;

        //var origClone = frag.cloneNode;
        //frag.cloneNode = function (full) {
        //	var clone = origClone(full);
        //	// resolve nested templates
        //	clone.conten = content;
        //	upgrade(clone);
        //	return clone;
        //}
        // NOTE: we can preserve double upgrade?
        // node.content = node.content || frag;
    }

    function upgradeSubtree(container) {
        var tmpls = container.querySelectorAll('template');

        for (var i = 0, count = tmpls.length; i < count; i++) {
            upgrade(tmpls[i]);
        }
    }

    function upgradeAll(container) {
        if (!isNative) {
            upgradeSubtree(container);

            if (container.tagName === 'TEMPLATE') {
                upgrade(container);
            }
        }
    }

    return {
        upgrade: upgradeAll,
        _namespace: "Dragon.Template"
    };
});


// var hasScopedCss = 'scoped' in document.createElement('style');

// Design goals
//  - controls are self contained
//  - controls use templated html rather then generated content
//  - controls must have some kind of JS initializer
//  - control should be available declaratively and also programically
//  - control can incorporate own css. Must use scoped attribute(FF only)
//  - control may have custom + some fixed events (created, rendered, removed, etc)
//  - control should be able to inherit another control and extend it
//  - use modlu load system as alternative of document imports


// Web Component sysntax

//<element extends="div" name="webframe">
//    <style>
//        .webframe{ border: 1px solid red;}
//    </style>

//    <script>
//        // control initialization goes here
//    </script>

//    <template>
//        <section class="webframe">
//            <header>
//                <h1>This is a WebFrame</h1>
//            </header>
//        </section>
//    </template>
//</element>

// Module current syntax

// (inside webframe.js)
//Dragon.module(['webframe.css', 'webframe.tmpl'], function () {
//    // control initialization goes here
//});

// or (where css is part of template)
//Dragon.module(['webframe.css', 'webframe.tmpl'], function () {
//    // control initialization goes here
//});

// probably template IDs also can be given opposed to *.tmpl file loading ?

