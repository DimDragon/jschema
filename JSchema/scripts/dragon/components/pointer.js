Dragon.module(['dragon/components', 'dragon/dom', 'dragon/classlist', 'dragon/event', 'dragon/components/pointer.html'], function (WC, Dom, Class, Event, doc) {
    var events = [
        // base events
        'click',
        'pointerdown',
        'pointerup',
        'pointermove',
        'pointerover',
        'pointerout',
        'pointerenter',
        'pointerleave'
    ],
    template = doc.querySelector('#pointer'),
    output,
    capture,
    enterleave;
    

    function appendOutput(inString) {
        var it = output.textContent;
        output.textContent = inString + '\n' + it;
    }

    return WC.register('ctrl-pointer', {
        template: template,
        lifecycle: {
            created: function () {

                output = this.shadowRoot.querySelector("#output");
                capture = this.shadowRoot.querySelector("#capture");
                enterleave = this.shadowRoot.querySelector("#enterleave");

                events.forEach(function (en) {
                    capture.addEventListener(en, function (inEvent) {
                        appendOutput(inEvent.type + ' [pointerId: ' + inEvent.pointerId + ']');
                    });
                });
                enterleave.addEventListener('pointerenter', function (e) {
                    appendOutput('enterleave entered');
                });
                enterleave.addEventListener('pointerleave', function (e) {
                    appendOutput('enterleave left');
                });
            },
            enteredView: null,
            leftView: null,
            attributeChanged: function (name, oldValue, newValue) {
                var action = !oldValue ? 'added' : !newValue ? 'removed' : 'changed';
            }           
        },
        output: function (inString) {
            return appendOutput(inString);
        }
    });
});