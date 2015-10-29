Dragon.module (['dragon/event'], function (Event) {
    var ModelList = Dragon.inherit (Array, function () {

        var args = Array.prototype.slice.call(arguments);

        if( args.length == 1 && Dragon.isType (args[0], 'Array') )
            this.push.apply(this, args[0]);
        else
            this.push.apply(this, args);

        this._pop = this.pop;
        this._push = this.push;
        this._shift = this.shift;
        this._unshift = this.unshift;
        this._reverse = this.reverse;
        this._sort = this.sort;
        this._splice = this.splice;

        this.pop = function () {
            var item = this._pop ();

            if( typeof item != 'undefined' )
                Event.raise(this, 'deleted', { index: this.length - 1, items: [item] });

            return item;
        };

        this.push = function () {
            var items = Array.prototype.slice.call(arguments);

            this._push.apply(this, items);

            Event.raise(this, 'added', { index: this.length - items.length, items: items });

            return this.length;
        };

        this.shift = function () {
            var item = this._shift();

            if (typeof item != 'undefined')
                Event.raise(this, 'deleted', { index: 0, items: [item] });

            return item;
        };

        this.unshift = function () {
            var items = Array.prototype.slice.call(arguments);

            this._unshift.apply(this, items);

            Event.raise(this, 'added', { index: 0, items: items });

            return this.length;
        };

        this.splice = function () {
            var args = Array.prototype.slice.call (arguments),
                items = args.slice (2),
                deleted = this._splice.apply(this, args),
                index = args[0];

            if( index > this.length )
                index = this.length;
            else if( index < 0 )
                index = this.length - index;

            if (deleted.length > 0)
                Event.raise(this, 'deleted', { index: index, items: deleted });

            if( items.length > 0 )
                Event.raise (this, 'added', { index : index, items : items });

            return deleted;
        };

        this.sort = function (compareFunction) {
            this._sort (compareFunction);

            Event.raise (this, 'orderChanged');

            return this;
        };

        this.reverse = function () {
            this._reverse();

            Event.raise(this, 'orderChanged');
        };
    });

    return {
        ModelList: ModelList
    };
});


// Dragon.ModelView
//Dragon.module(function () {
//    function create(obj) {
//        // must maintain week reference to wrapped object

//        return viewmodel;
//    }

//    function observe(obj, fn) {
//        // in case obj is not a viewmodel, then wrap it first
//    }

//    return {
//        create: create,
//        observe: observe,
//        _namespace: 'Dragon.ModelView'
//    }
//});

// Library considerations:

// - models should be used internally to expose data binding for our library components
// - we should expose 2 properties either: 'model' + 'modelScope' OR 'dataSrc' + 'dataScope'
//      - model property can NOT be set declaratively and will be set inside ViewModel in most cases or directly via page script
//      - modelScope allows shorter values in template bindings. Basically scope is appended before any binding, for example scope = 'education', then binding {{school}} will resolve to using value 'education.school' from assigned model
// - components to be included are:
//      - ctrl-select
//      - ctrl-view
//      - ctrl-grid
//      - ctrl-menu
//      - ctrl-????
//  - inputs and selects by default create 2-way binding where all the rest create 1-way binding where changes to model are reflected to DOM only
//  - can we extend Model further with some calculated/custom properties? For example:
//      var model = Model.create( {firstName: 'Hristo', lastName: 'Stoichkov', age: 45 } );
//      Dragon.extend(model, { fullName: { get: function() { return this.firstName + ', ' + this.lastName; } } });

// ViewModel key concepts

// - provide link between Model and View
// - provide place for making data binding
// - provide place where we can modify Model or extend it with some calculated properties to be used in binding
// - provide actions support, handlers for all actions exposed from the View
// - provide place for additional validation of Model data
// - provide place to hook UnitTesting and QA routines

// - Router is responsible to load and execute ViewModel so that View is bind to ViewModel.model (default)




// Sample PostsViewModel

// NOTE: not good, skip this!!!
//var viewModel = {
//    init: function () {
//        Dragon.xhr({

//        }).then(function (posts) {
//            this.model = posts;
//        });
//    },
//    actions: {
//        addPost: function () { },
//        editPost: function () { },
//        removePost: function () { }
//    }

//}