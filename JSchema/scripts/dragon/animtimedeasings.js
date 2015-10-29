// NOTE: This module is basically the old code which needs improvement
// it is now used to invalidate shadow dom
Dragon.module(['dragon/enum', 'dragon/anim'], function (Enum, Anim) {
    var EasyFunctions = {
        //Easing equation function for a simple linear tweening, with no easing.
        'linear': 'linear',
        //Easing equation function for a quadratic (t^2) easing in: accelerating from zero velocity.
        'easeInQuad': 'easeInQuad',
        //Easing equation function for a quadratic (t^2) easing out: decelerating to zero velocity.
        'easeOutQuad': 'easeOutQuad',
        //Easing equation function for a quadratic (t^2) easing in/out : easeInQuad till halfway - easeOutQuad after that to the end of interval.
        'easeInOutQuad': 'easeInOutQuad',
        //Easing equation function for a quadratic (t^2) easing out/in : easeOutQuad till halfway - easeInQuad after that to the end of interval.
        'easeOutInQuad': 'easeOutInQuad',
        //Easing equation function for a cubic (t^3) easing in: accelerating from zero velocity.
        'easeInCubic': 'easeInCubic',
        //Easing equation function for a cubic (t^3) easing out: decelerating from zero velocity.
        'easeOutCubic': 'easeOutCubic',
        //Easing equation function for a cubic (t^3) easing in/out. Accelerating from zero velocity till halfway, decelerating after that.
        'easeInOutCubic': 'easeInOutCubic',
        //Easing equation function for a cubic (t^3) easing out/in. Decelerating to zero velocity till halfway, accelerating after that.
        'easeOutInCubic': 'easeOutInCubic',
        //Easing equation function for a quartic (t^4) easing in: accelerating from zero velocity.
        'easeInQuart': 'easeInQuart',
        //Easing equation function for a quartic (t^4) easing out: decelerating from zero velocity.
        'easeOutQuart': 'easeOutQuart',
        //Easing equation function for a quartic (t^4) easing in/out: Accelerating from zero velocity till halfway, decelerating after that.
        'easeInOutQuart': 'easeInOutQuart',
        //Easing equation function for a quartic (t^4) easing out/in: Decelerating to zero velocity till halfway, accelerating after that.
        'easeOutInQuart': 'easeOutInQuart',
        //Easing equation function for a quintic (t^5) easing in: accelerating from zero velocity.
        'easeInQuint': 'easeInQuint',
        //Easing equation function for a quintic (t^5) easing out: decelerating from zero velocity.
        'easeOutQuint': 'easeOutQuint',
        //Easing equation function for a quintic (t^5) easing in/out: acceleration until halfway, then deceleration.
        'easeInOutQuint': 'easeInOutQuint',
        //Easing equation function for a quintic (t^5) easing out/in: deceleration until halfway, then acceleration.
        'easeOutInQuint': 'easeOutInQuint',
        //Easing equation function for a sinusoidal (sin(t)) easing in: accelerating from zero velocity.
        'easeInSine': 'easeInSine',
        //Easing equation function for a sinusoidal (sin(t)) easing out: decelerating from zero velocity.
        'easeOutSine': 'easeOutSine',
        //Easing equation function for a sinusoidal (sin(t)) easing in/out: acceleration until halfway, then deceleration.
        'easeInOutSine': 'easeInOutSine',
        //Easing equation function for a sinusoidal (sin(t)) easing out/in: deceleration until halfway, then acceleration.
        'easeOutInSine': 'easeOutInSine',
        //Easing equation function for an exponential (2^t) easing in: accelerating from zero velocity.
        'easeInExpo': 'easeInExpo',
        //Easing equation function for an exponential (2^t) easing out: decelerating from zero velocity.
        'easeOutExpo': 'easeOutExpo',
        //Easing equation function for an exponential (2^t) easing in/out: acceleration until halfway, then deceleration.
        'easeInOutExpo': 'easeInOutExpo',
        //Easing equation function for an exponential (2^t) easing out/in: deceleration until halfway, then acceleration.
        'easeOutInExpo': 'easeOutInExpo',
        //Easing equation function for a circular (sqrt(1-t^2)) easing in: accelerating from zero velocity.
        'easeInCirc': 'easeInCirc',
        //Easing equation function for a circular (sqrt(1-t^2)) easing out: decelerating from zero velocity.
        'easeOutCirc': 'easeOutCirc',
        //Easing equation function for a circular (sqrt(1-t^2)) easing in/out: acceleration until halfway, then deceleration.
        'easeInOutCirc': 'easeInOutCirc',
        //Easing equation function for a circular (sqrt(1-t^2)) easing out/in: deceleration until halfway, then acceleration.
        'easeOutInCirc': 'easeOutInCirc',
        //Easing equation function for an elastic (exponentially decaying sine wave) easing in: accelerating from zero velocity.
        'easeInElastic': 'easeInElastic',
        //Easing equation function for an elastic (exponentially decaying sine wave) easing out: decelerating from zero velocity.
        'easeOutElastic': 'easeOutElastic',
        //Easing equation function for an elastic (exponentially decaying sine wave) easing in/out: acceleration until halfway, then deceleration.
        'easeInOutElastic': 'easeInOutElastic',
        //Easing equation function for an elastic (exponentially decaying sine wave) easing out/in: deceleration until halfway, then acceleration.
        'easeOutInElastic': 'easeOutInElastic',
        //Easing equation function for a back(bow) (overshooting cubic easing: (s+1)*t^3 - s*t^2) easing in: accelerating from zero velocity.
        'easeInBack': 'easeInBack',
        //Easing equation function for a back(bow) (overshooting cubic easing: (s+1)*t^3 - s*t^2) easing out: decelerating from zero velocity.
        'easeOutBack': 'easeOutBack',
        //Easing equation function for a back(bow) (overshooting cubic easing: (s+1)*t^3 - s*t^2) easing in/out: acceleration until halfway, then deceleration.
        'easeInOutBack': 'easeInOutBack',
        //Easing equation function for a back(bow) (overshooting cubic easing: (s+1)*t^3 - s*t^2) easing out/in: deceleration until halfway, then acceleration.
        'easeOutInBack': 'easeOutInBack',
        //Easing equation function for a bounce (exponentially decaying parabolic bounce) easing in: accelerating from zero velocity.
        'easeInBounce': 'easeInBounce',
        //Easing equation function for a bounce (exponentially decaying parabolic bounce) easing out: decelerating from zero velocity.
        'easeOutBounce': 'easeOutBounce',
        //Easing equation function for a bounce (exponentially decaying parabolic bounce) easing in/out: acceleration until halfway, then deceleration.
        'easeInOutBounce': 'easeInOutBounce',
        //Easing equation function for a bounce (exponentially decaying parabolic bounce) easing out/in: deceleration until halfway, then acceleration.
        'easeOutInBounce': 'easeOutInBounce'
    };


    /**
     * Easing equation function for a simple linear tweening, with no easing.
     *
     * @param t		Current time/phase (0-1).
     * @param b		Starting value.
     * @param c		Change needed in value.
     * @param d		Duartion time/phase.
     * @return		The new value/phase (0-1).
     */
    function linear(t, b, c, d) {
        //return t;
        if (t == d) return c;
        return b + t * ((c - b) / d);
    }

    /**
	* Easing equation function for a quadratic (t^2) easing in: accelerating from zero velocity.
	*
    * @param t		Current time/phase (0-1).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Duartion time/phase.
    * @return		The new value/phase (0-1).
	*/
    function easeInQuad(t, b, c, d) {
        return c * (t /= d) * t + b;
    }

    /**
    * Easing equation function for a quadratic (t^2) easing out: decelerating to zero velocity.
    *
    * @param t		Current time/phase (0-1).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Duartion time/phase.
    * @return		The new value/phase (0-1).
    */
    function easeOutQuad(t, b, c, d) {
        return -c * (t /= d) * (t - 2) + b;
    }

    /**
    * Easing equation function for a quadratic (t^2) easing in-out
    *
    * @param t		Current time/phase (0-1).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Duartion time/phase.
    * @return		The new value/phase (0-1).
    */
    function easeInOutQuad(t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t + b;
        return -c / 2 * ((--t) * (t - 2) - 1) + b;
    }

    /**
    * Easing equation function for a quadratic (t^2) easing in-out
    *
    * @param t		Current time/phase (0-1).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Duartion time/phase.
    * @return		The new value/phase (0-1).
    */
    function easeOutInQuad(t, b, c, d) {
        if (t < d / 2) return easeOutQuad(t * 2, b, c / 2, d);
        return easeInQuad((t * 2) - d, b + c / 2, c / 2, d);
    }

    /**
    * Easing equation function for a cubic (t^3) easing in: accelerating from zero velocity.
    *
    * @param t		Current time/phase (0-1).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Duartion time/phase.
    * @return		The new value/phase (0-1).
    */
    function easeInCubic(t, b, c, d) {
        return c * (t /= d) * t * t + b;
    }

    /**
    * Easing equation function for a cubic (t^3) easing out: decelerating from zero velocity.
    *
    * @param t		Current time/phase (0-1).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Duartion time/phase.
    * @return		The new value/phase (0-1).
    */
    function easeOutCubic(t, b, c, d) {
        return c * ((t = t / d - 1) * t * t + 1) + b;
    }

    /**
    * Easing equation function for a cubic (t^3) easing in-out.
    *
    * @param t		Current time/phase (0-1).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Duartion time/phase.
    * @return		The new value/phase (0-1).
    */
    function easeInOutCubic(t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
        return c / 2 * ((t -= 2) * t * t + 2) + b;
    }

    /**
    * Easing equation function for a cubic (t^3) easing out: decelerating from zero velocity.
    *
    * @param t		Current time/phase (0-1).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Duartion time/phase.
    * @return		The new value/phase (0-1).
    */
    function easeOutInCubic(t, b, c, d) {
        if (t < d / 2) return easeOutCubic(t * 2, b, c / 2, d);
        return easeInCubic((t * 2) - d, b + c / 2, c / 2, d);
    }

    /**
    * Easing equation function for a quartic (t^4) easing in: accelerating from zero velocity.
    *
    * @param t		Current time/phase (0-1).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Duartion time/phase.
    * @return		The new value/phase (0-1).
    */
    function easeInQuart(t, b, c, d) {
        return c * (t /= d) * t * t * t + b;
    }

    /**
    * Easing equation function for a quartic (t^4) easing out: decelerating from zero velocity.
    *
    * @param t		Current time/phase (0-1).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Duartion time/phase.
    * @return		The new value/phase (0-1).
    */
    function easeOutQuart(t, b, c, d) {
        return -c * ((t = t / d - 1) * t * t * t - 1) + b;
    }

    /**
    * Easing equation function for a quartic (t^4) easing in: accelerating from zero velocity.
    *
    * @param t		Current time/phase (0-1).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Duartion time/phase.
    * @return		The new value/phase (0-1).
    */
    function easeInOutQuart(t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
        return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
    }

    /**
    * Easing equation function for a quartic (t^4) easing out: decelerating from zero velocity.
    *
    * @param t		Current time/phase (0-1).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Duartion time/phase.
    * @return		The new value/phase (0-1).
    */
    function easeOutInQuart(t, b, c, d) {
        if (t < d / 2) return easeOutQuart(t * 2, b, c / 2, d);
        return easeInQuart((t * 2) - d, b + c / 2, c / 2, d);
    }

    /**
    * Easing equation function for a quintic (t^5) easing in: accelerating from zero velocity.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeInQuint(t, b, c, d) {
        return c * (t /= d) * t * t * t * t + b;
    }

    /**
    * Easing equation function for a quintic (t^5) easing out: decelerating from zero velocity.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeOutQuint(t, b, c, d) {
        return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
    }

    /**
        * Easing equation function for a quintic (t^5) easing in/out: acceleration until halfway, then deceleration.
        *
        * @param t		Current time (in frames or seconds).
        * @param b		Starting value.
        * @param c		Change needed in value.
        * @param d		Expected easing duration (in frames or seconds).
        * @return		The correct value.
        */
    function easeInOutQuint(t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
        return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
    }

    /**
    * Easing equation function for a quintic (t^5) easing out/in: deceleration until halfway, then acceleration.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeOutInQuint(t, b, c, d) {
        if (t < d / 2) return easeOutQuint(t * 2, b, c / 2, d);
        return easeInQuint((t * 2) - d, b + c / 2, c / 2, d);
    }

    /**
    * Easing equation function for a sinusoidal (sin(t)) easing in: accelerating from zero velocity.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeInSine(t, b, c, d) {
        return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
    }

    /**
    * Easing equation function for a sinusoidal (sin(t)) easing out: decelerating from zero velocity.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeOutSine(t, b, c, d) {
        return c * Math.sin(t / d * (Math.PI / 2)) + b;
    }

    /**
    * Easing equation function for a sinusoidal (sin(t)) easing in/out: acceleration until halfway, then deceleration.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeInOutSine(t, b, c, d) {
        return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
    }

    /**
    * Easing equation function for a sinusoidal (sin(t)) easing out/in: deceleration until halfway, then acceleration.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeOutInSine(t, b, c, d) {
        if (t < d / 2) return easeOutSine(t * 2, b, c / 2, d);
        return easeInSine((t * 2) - d, b + c / 2, c / 2, d);
    }

    /**
    * Easing equation function for an exponential (2^t) easing in: accelerating from zero velocity.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeInExpo(t, b, c, d) {
        return (t == 0) ? 0 : Math.pow(2, 10 * (t - 1)) - 1.001;
    }

    /**
    * Easing equation function for an exponential (2^t) easing out: decelerating from zero velocity.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeOutExpo(t, b, c, d) {
        return (t == 1) ? 1 : 1.001 * (-Math.pow(2, -10 * t) + 1);
    }

    /**
    * Easing equation function for an exponential (2^t) easing in - out
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeInOutExpo(t, b, c, d) {
        if (t == 0) return b;
        if (t == d) return b + c;
        if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b - c * 0.0005;
        return c / 2 * 1.0005 * (-Math.pow(2, -10 * --t) + 2) + b;
    }

    /**
    * Easing equation function for an exponential (2^t) easing out-in
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeOutInExpo(t, b, c, d) {
        if (t < d / 2) return easeOutExpo(t * 2, b, c / 2, d);
        return easeInExpo((t * 2) - d, b + c / 2, c / 2, d);
    }

    /**
    * Easing equation function for a circular (sqrt(1-t^2)) easing in: accelerating from zero velocity.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeInCirc(t, b, c, d) {
        return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
    }

    /**
    * Easing equation function for a circular (sqrt(1-t^2)) easing out: decelerating from zero velocity.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeOutCirc(t, b, c, d) {
        return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
    }

    /**
        * Easing equation function for a circular (sqrt(1-t^2)) easing in/out: acceleration until halfway, then deceleration.
        *
        * @param t		Current time (in frames or seconds).
        * @param b		Starting value.
        * @param c		Change needed in value.
        * @param d		Expected easing duration (in frames or seconds).
        * @return		The correct value.
        */
    function easeInOutCirc(t, b, c, d) {
        if ((t /= d / 2) < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
        return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
    }

    /**
    * Easing equation function for a circular (sqrt(1-t^2)) easing out/in: deceleration until halfway, then acceleration.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeOutInCirc(t, b, c, d) {
        if (t < d / 2) return easeOutCirc(t * 2, b, c / 2, d);
        return easeInCirc((t * 2) - d, b + c / 2, c / 2, d);
    }

    /**
    * Easing equation function for an elastic (exponentially decaying sine wave) easing in: accelerating from zero velocity.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @param params Object with properties "amplitude" and "period".
    * @return		The correct value.
    */
    function easeInElastic(t, b, c, d, params) {
        if (t == 0) return b;
        if ((t /= d) == 1) return b + c;
        var period = !params || isNaN(params.period) ? d * .3 : params.period;
        var s;
        var amplitude = !params || isNaN(params.amplitude) ? 0 : params.amplitude;
        if (!amplitude || amplitude < Math.abs(c)) {
            amplitude = c;
            s = period / 4;
        } else {
            s = period / (2 * Math.PI) * Math.asin(c / amplitude);
        }
        return -(amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / period)) + b;
    }

    /**
    * Easing equation function for an elastic (exponentially decaying sine wave) easing out: decelerating from zero velocity.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @param params Object with properties "amplitude" and "period".
    * @return		The correct value.
    */
    function easeOutElastic(t, b, c, d, params) {
        if (t == 0) return b;
        if ((t /= d) == 1) return b + c;
        var period = !params || isNaN(params.period) ? d * .3 : params.period;
        var s;
        var amplitude = !params || isNaN(params.amplitude) ? 0 : params.amplitude;
        if (!amplitude || amplitude < Math.abs(c)) {
            amplitude = c;
            s = period / 4;
        } else {
            s = period / (2 * Math.PI) * Math.asin(c / amplitude);
        }
        return (amplitude * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / period) + c + b);
    }

    /**
    * Easing equation function for an elastic (exponentially decaying sine wave) easing in/out: acceleration until halfway, then deceleration.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @param params Object with properties "amplitude" and "period".
    * @return		The correct value.
    */
    function easeInOutElastic(t, b, c, d, params) {
        if (t == 0) return b;
        if ((t /= d / 2) == 2) return b + c;
        var period = !params || isNaN(params.period) ? d * (.3 * 1.5) : params.period;
        var s;
        var amplitude = !params || isNaN(params.amplitude) ? 0 : params.amplitude;
        if (!amplitude || amplitude < Math.abs(c)) {
            amplitude = c;
            s = period / 4;
        } else {
            s = period / (2 * Math.PI) * Math.asin(c / amplitude);
        }
        if (t < 1) return -.5 * (amplitude * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / period)) + b;
        return amplitude * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / period) * .5 + c + b;
    }

    /**
    * Easing equation function for an elastic (exponentially decaying sine wave) easing out/in: deceleration until halfway, then acceleration.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @param params Object with properties "amplitude" and "period".
    * @return		The correct value.
    */
    function easeOutInElastic(t, b, c, d, params) {
        if (t < d / 2) return easeOutElastic(t * 2, b, c / 2, d, params);
        return easeInElastic((t * 2) - d, b + c / 2, c / 2, d, params);
    }

    /**
    * Easing equation function for a back (overshooting cubic easing: (s+1)*t^3 - s*t^2) easing in: accelerating from zero velocity.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @param params Object with property "overshoot". Overshoot ammount: higher s means greater overshoot (0 produces cubic easing with no overshoot, and the default value of 1.70158 produces an overshoot of 10 percent).
    * @return		The correct value.
    */
    function easeInBack(t, b, c, d, params) {
        var s = !params || isNaN(params.overshoot) ? 1.70158 : params.overshoot;
        return c * (t /= d) * t * ((s + 1) * t - s) + b;
    }

    /**
    * Easing equation function for a back (overshooting cubic easing: (s+1)*t^3 - s*t^2) easing out: decelerating from zero velocity.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @param params Object with property "overshoot". Overshoot ammount: higher s means greater overshoot (0 produces cubic easing with no overshoot, and the default value of 1.70158 produces an overshoot of 10 percent).
    * @return		The correct value.
    */
    function easeOutBack(t, b, c, d, params) {
        var s = !params || isNaN(params.overshoot) ? 1.70158 : params.overshoot;
        return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
    }

    /**
    * Easing equation function for a back (overshooting cubic easing: (s+1)*t^3 - s*t^2) easing in/out: acceleration until halfway, then deceleration.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @param params Object with property "overshoot". Overshoot ammount: higher s means greater overshoot (0 produces cubic easing with no overshoot, and the default value of 1.70158 produces an overshoot of 10 percent).
    * @return		The correct value.
    */
    function easeInOutBack(t, b, c, d, params) {
        var s = !params || isNaN(params.overshoot) ? 1.70158 : params.overshoot;
        if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
        return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
    }

    /**
    * Easing equation function for a back (overshooting cubic easing: (s+1)*t^3 - s*t^2) easing out/in: deceleration until halfway, then acceleration.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @param p_params.overshoot Overshoot ammount: higher s means greater overshoot (0 produces cubic easing with no overshoot, and the default value of 1.70158 produces an overshoot of 10 percent).
    * @return		The correct value.
    */
    function easeOutInBack(t, b, c, d, params) {
        if (t < d / 2) return easeOutBack(t * 2, b, c / 2, d, params);
        return easeInBack((t * 2) - d, b + c / 2, c / 2, d, params);
    }

    /**
    * Easing equation function for a bounce (exponentially decaying parabolic bounce) easing in: accelerating from zero velocity.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeInBounce(t, b, c, d) {
        return c - easeOutBounce(d - t, 0, c, d) + b;
    }

    /**
        * Easing equation function for a bounce (exponentially decaying parabolic bounce) easing out: decelerating from zero velocity.
        *
        * @param t		Current time (in frames or seconds).
        * @param b		Starting value.
        * @param c		Change needed in value.
        * @param d		Expected easing duration (in frames or seconds).
        * @return		The correct value.
        */
    function easeOutBounce(t, b, c, d) {
        if ((t /= d) < (1 / 2.75)) {
            return c * (7.5625 * t * t) + b;
        } else if (t < (2 / 2.75)) {
            return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
        } else if (t < (2.5 / 2.75)) {
            return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
        } else {
            return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
        }
    }

    /**
    * Easing equation function for a bounce (exponentially decaying parabolic bounce) easing in/out: acceleration until halfway, then deceleration.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeInOutBounce(t, b, c, d) {
        if (t < d / 2) return easeInBounce(t * 2, 0, c, d) * .5 + b;
        else return easeOutBounce(t * 2 - d, 0, c, d) * .5 + c * .5 + b;
    }

    /**
    * Easing equation function for a bounce (exponentially decaying parabolic bounce) easing out/in: deceleration until halfway, then acceleration.
    *
    * @param t		Current time (in frames or seconds).
    * @param b		Starting value.
    * @param c		Change needed in value.
    * @param d		Expected easing duration (in frames or seconds).
    * @return		The correct value.
    */
    function easeOutInBounce(t, b, c, d) {
        if (t < d / 2) return easeOutBounce(t * 2, b, c / 2, d);
        return easeInBounce((t * 2) - d, b + c / 2, c / 2, d);
    }

    function runEasyFunction(calledEasyFunction, timeFromBeginning, beginValue, endValue, duration, params) {
        ///<summary>
        ///		Run  specified easy function for specifed time
        ///</summary>
        ///<param name="calledEasyFunction" type="object">
        ///		Easing function to be executed. Must be one of EasyFunctions enum members.
        ///</param>
        ///<param name="timeFromBeginning" type="number">
        ///		Time from animation begin time.
        ///</param>        
        ///<param name="beginValue" type="object">
        ///	    Start value
        ///</param>        
        ///<param name="endValue" type="number">
        ///	    End value
        ///</param>   
        ///<param name="duration" type="number">
        ///		Animation duration
        ///</param> 
        ///<param name="params" type="object">
        ///		Addition parameters for some easing methods:
        ///     Elastic methods expect param object with "period" and "amplitude" properties
        ///     Back(Bow) methods expects param object with "overshoot" property
        ///</param>
        switch (calledEasyFunction) {
            case EasyFunctions.linear: {
                return linear(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInQuad: {
                return easeInQuad(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeOutQuad: {
                return easeOutQuad(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInOutQuad: {
                return easeInOutQuad(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeOutInQuad: {
                return easeOutInQuad(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInCubic: {
                return easeInCubic(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeOutCubic: {
                return easeOutCubic(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInOutCubic: {
                return easeInOutCubic(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeOutInCubic: {
                return easeOutInCubic(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInQuart: {
                return easeInQuart(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeOutQuart: {
                return easeOutQuart(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInOutQuart: {
                return easeInOutQuart(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeOutInQuart: {
                return easeOutInQuart(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInQuint: {
                return easeInQuint(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeOutQuint: {
                return easeOutQuint(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInOutQuint: {
                return easeInOutQuint(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeOutInQuint: {
                return easeOutInQuint(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInSine: {
                return easeInSine(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeOutSine: {
                return easeOutSine(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInOutSine: {
                return easeInOutSine(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeOutInSine: {
                return easeOutInSine(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInExpo: {
                return easeInExpo(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeOutExpo: {
                return easeOutExpo(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInOutExpo: {
                return easeInOutExpo(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeOutInExpo: {
                return easeOutInExpo(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInCirc: {
                return easeInCirc(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeOutCirc: {
                return easeOutCirc(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInOutCirc: {
                return easeInOutCirc(timeFromBeginning, beginValue, endValue, duration);
            }
            case EasyFunctions.easeInElastic: {
                return easeInElastic(timeFromBeginning, beginValue, endValue, duration, params);
            }
            case EasyFunctions.easeOutElastic: {
                return easeOutElastic(timeFromBeginning, beginValue, endValue, duration, params);
            }
            case EasyFunctions.easeInOutElastic: {
                return easeInOutElastic(timeFromBeginning, beginValue, endValue, duration, params);
            }
            case EasyFunctions.easeOutInElastic: {
                return easeOutInElastic(timeFromBeginning, beginValue, endValue, duration, params);
            }
            case EasyFunctions.easeInBack: {
                return easeInBack(timeFromBeginning, beginValue, endValue, duration, params);
            }
            case EasyFunctions.easeOutBack: {
                return easeOutBack(timeFromBeginning, beginValue, endValue, duration, params);
            }
            case EasyFunctions.easeInOutBack: {
                return easeInOutBack(timeFromBeginning, beginValue, endValue, duration, params);
            }
            case EasyFunctions.easeOutInBack: {
                return easeOutInBack(timeFromBeginning, beginValue, endValue, duration, params);
            }
            case EasyFunctions.easeInBounce: {
                return easeInBounce(timeFromBeginning, beginValue, endValue, duration, params);
            }
            case EasyFunctions.easeOutBounce: {
                return easeOutBounce(timeFromBeginning, beginValue, endValue, duration, params);
            }
            case EasyFunctions.easeInOutBounce: {
                return easeInOutBounce(timeFromBeginning, beginValue, endValue, duration, params);
            }
            case EasyFunctions.easeOutInBounce: {
                return easeOutInBounce(timeFromBeginning, beginValue, endValue, duration, params);
            }
            default: {
                return new Error('This easing method is not implemented!');
            }
        }
    }

    return {
        EasyFunctions: EasyFunctions,
        runEasyFunction: runEasyFunction,
        _namespace: 'Dragon.Anim.TimedEasings'
    };
});