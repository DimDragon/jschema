// NOTE: This module is basically the old code which needs improvement
// it is now used to invalidate shadow dom
Dragon.module(function () {
    var lastTime = 0,
        animQueue = {},
        vendors = ['ms', 'moz', 'webkit', 'o'];

    for( var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x ) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    // polyfill for IE8-9
    if( !window.requestAnimationFrame )
        window.requestAnimationFrame = function (callback) {
            var currTime = new Date ().getTime (),
                timeToCall = Math.max (0, 16 - ( currTime - lastTime )),
                id = window.setTimeout (function () { callback (currTime + timeToCall); }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    // polyfill for IE8-9
    if( !window.cancelAnimationFrame )
        window.cancelAnimationFrame = function (id) {
            clearTimeout (id);
        };

    function run(fn) {
    	var animID = new Date().getTime();

    	function step(timestamp) {
    		if (animQueue.hasOwnProperty(animID) && !animQueue[animID])
    			animQueue[animID] = timestamp - 1;

    		if (!animQueue[animID])
    			return;

    		if (fn(timestamp - animQueue[animID]) === false)
    			delete animQueue[animID];
    		else
    			requestAnimationFrame(step);
    	}

    	if (animQueue.hasOwnProperty(animID))
    		return undefined;

    	animQueue[animID] = null;
    	requestAnimationFrame(step);

    	return animID;
    }

	// TODO(DD): How to syncronize animations

    function animStop (animID) {
        cancelAnimationFrame (animQueue[animID]);
        delete animQueue[animID];
    }

    return {
        run: run,
        stop : animStop,
        queue : requestAnimationFrame,
        _namespace : 'Dragon.Anim'
    };
});