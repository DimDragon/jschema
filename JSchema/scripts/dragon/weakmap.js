// adaptaion of Polymer's - SideTable
// NOTE: must return/use native WeakMap where possible (FF has issue storing Node object into WeakMap!)
Dragon.module(function () {
    var counter = Date.now() % 1e9;

    return Dragon.define(function () {
        this.name = '_wm' + (Math.random() * 1e9 >>> 0) + (counter++ + '_');
    }, {
        set: function (key, value) {
            var entry = key[this.name];

            if (entry && entry[0] === key) {
                entry[1] = value;
            } else {
                Object.defineProperty(key, this.name, { value: [key, value], writable: true });
            }
        },
        get: function (key) {
            var entry;

            return (entry = key[this.name]) && entry[0] === key ? entry[1] : undefined;
        },
        'delete': function (key) {
            this.set(key, undefined);
        },
        _namespace: 'Dragon.Weakmap'
    });
});