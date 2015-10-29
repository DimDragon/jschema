// define sealed enumeration onject
Dragon.module(function () {
    return Dragon.define(function EnumContructor(props) {
        Dragon.extend(this, props);
        // in case freeze is available make enum immutable
        if (Object.freeze) {
            Object.freeze(this);
        }
    }, null, {
        _namespace: 'Dragon.Enum'
    });
});