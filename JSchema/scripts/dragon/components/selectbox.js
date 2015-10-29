Dragon.module(['dragon/components', 'dragon/event', 'dragon/classlist', 'dragon/position', 'dragon/dom', 'dragon/components/select', 'dragon/components/selectbox.html'], function (WC, Event, Class, Position, Dom, Select, doc) {

    function click (e) {
        var selectbox = Dom.shadowHost(e.target);

        if( !selectbox || selectbox.disabled )
            return;

        if( selectbox.querySelector ('.ctrl-dropdown') )
            close ();
        else
            open ();


        function open () {
            var filter = selectbox.ctrl.filter.content.cloneNode (true).querySelector ('.ctrl-dropdown'),
                select = filter.querySelector('ctrl-select'),
                tbFilter = filter.querySelector('input'),
                relEl = selectbox.shadowRoot.querySelector('.ctrl-btn');

            selectbox.appendChild (filter);

            Position.setPosition(filter, relEl, 'center,below');

            if( !selectbox.ctrl.mouseHide ) {
                selectbox.ctrl.mouseHide = function (evt) {
                    if( selectbox.contains (evt.target) )
                        return;

                    close ();
                };

                selectbox.ctrl.escClose = function (evt) {
                    if( evt.keyCode != 27 ) //Esc
                        return;

                    Dragon.Event.cancel (evt);

                    close ();
                };
            }
 
            Event.add(document, 'keyup', selectbox.ctrl.escClose, true);
            Event.add(document, 'click', selectbox.ctrl.mouseHide, true);
            Event.add(tbFilter, 'keyup', filterItems);
            Event.add(tbFilter, 'change', filterItems);

            Dragon.async(function () { //wait for mutation observer to upgrade elements
                select.displayMember = selectbox.displayMember;
                select.valueMember = selectbox.valueMember;
                select.dataSource = selectbox.dataSource;
                select.selectedIndex = selectbox.selectedIndex;

                Event.add(select, 'change', change);
            });
        }

        function close() {
            var filter = selectbox.querySelector('.ctrl-dropdown');

            selectbox.removeChild (filter);

            Event.remove(document, 'keyup', selectbox.ctrl.escClose, true);
            Event.remove(document, 'click', selectbox.ctrl.mouseHide, true);
            
            delete selectbox.ctrl.mouseHide;
            delete selectbox.ctrl.escClose;
        }
    }

    function filterItems (e) {
        var selectbox = Dom.shadowHost(e.target),
            select = selectbox.querySelector ('ctrl-select'),
            value = select.value;

        if( e.target.value == '' )
            select.dataSource = selectbox.dataSource;
        else
            select.dataSource = getFilteredData (selectbox, e.target.value);


        select.value = value;

        if( select.selectedIndex < 0 )
            select.selectedIndex = 0;

        selectbox.value = select.value;
    }

    function getFilteredData (selectbox, filter) {
        var data = [];

        for( var i = 0, count = selectbox.dataSource.length; i < count; i++ ) {
            var item = selectbox.dataSource[i];

            if( item[selectbox.displayMember].indexOf (filter) < 0 )
                continue;

            data.push (item);
        }

        return data;
    }

    function change (e) {
        var selectbox = Dom.shadowHost(e.target);

        selectbox.value = e.target.value;
    }

    function setValue (selectbox) {
        if( selectbox.selectedIndex < 0 )
            selectbox.ctrl.tbValue.value = '';
        else {
            var item = selectbox.selectedItem;

            if( item )
                selectbox.ctrl.tbValue.value = item[selectbox.displayMember];
            else
                selectbox.ctrl.tbValue = '';
        }
    }

    function fillSelect(selectbox) {
        var ctrlOptions = selectbox.querySelectorAll('ctrl-option'),
            ctrlOption,
            options = [],
            selectedIndex = -1;

        for (var i = 0, count = ctrlOptions.length; i < count; i++) {
            ctrlOption = ctrlOptions[i];

            options.push({
                value: ctrlOption.getAttribute('value') !== null ? ctrlOption.getAttribute('value') : ctrlOption.innerHTML,
                text: ctrlOption.innerHTML
            });

            if (ctrlOption.hasAttribute('selected'))
                selectedIndex = i;

            ctrlOption.parentNode.removeChild (ctrlOption);
        }

        if (options.length == 0)
            return;

        selectbox.displayMember = 'text';
        selectbox.valueMember = 'value';
        selectbox.dataSource = options;
        selectbox.selectedIndex = selectedIndex;
    }

    return WC.register('ctrl-selectbox', {
        template: doc.querySelector('template'),
        lifecycle: {
            created: function () {
                this.ctrl.filter = doc.querySelector ('#filter');
                this.ctrl.tbValue = this.shadowRoot.querySelector('.ctrl-btn input');
                this.selectedIndex = -1;

                fillSelect(this);

                setValue (this, this.value);

                Event.add(this.shadowRoot.querySelector('.ctrl-btn'), 'click', click);
            }
        },

        dataSource: {
            get : function () {
                return this.ctrl.dataSource;
            },
            set : function (value) {
                this.ctrl.dataSource = value;
            }
        },

        displayMember: {
            get: function () {
                return this.ctrl.displayMember;
            },
            set: function (value) {
                this.ctrl.displayMember = value;
            }
        },

        valueMember: {
            get: function () {
                return this.ctrl.valueMember;
            },
            set: function (value) {
                this.ctrl.valueMember = value;
            }
        },

        disabled: {
            attribute: { boolean: true },
            set: function () {
                if (this.disabled)
                    Class.add(this, 'disabled');
                else
                    Class.remove(this, 'disabled');
            }
        },

        selectedIndex: {
            get : function () {
                return this.ctrl.selectedIndex;
            },
            set: function (value) {
                if (!this.dataSource || value > this.dataSource.length || value < 0)
                    this.ctrl.selectedIndex = -1;
                else
                    this.ctrl.selectedIndex = value;

                setValue (this, this.value);
            }
        },

        value: {
            get: function () {
                if (this.ctrl.selectedIndex < 0 || !this.dataSource)
                    return null;

                return this.dataSource[this.ctrl.selectedIndex][this.valueMember];
            },
            set: function (value) {
                if(!this.dataSource)
                    return;

                for( var i = 0, count = this.dataSource.length; i < count; i++ ) {
                    var item = this.dataSource[i];

                    if( item[this.valueMember] != value )
                        continue;


                    this.ctrl.selectedIndex = i;
                    setValue (this, this.value);

                    return;
                }

                this.ctrl.selectedIndex = -1;
                setValue(this, this.value);
            }
        },

        selectedItem : {
            get: function () {
                return this.dataSource[this.selectedIndex];
            }
        }
    });
});