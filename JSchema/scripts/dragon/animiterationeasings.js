// NOTE: This module is basically the old code which needs improvement
// it is now used to invalidate shadow dom
Dragon.module(['dragon/enum'], function (Enum) {

    var EasyFunctions = {
        //Easing equation function for a simple linear tweening, with no easing.
        'linear': 'linear',
        //Easing equation function for a quadratic (t^2) easing in: accelerating from zero velocity.
        'easeInQuad': 'easeInQuad',
        //Easing equation function for a quadratic (t^2) easing out: decelerating to zero velocity.
        'easeOutQuad': 'easeOutQuad',
        //Easing equation function for a quadratic (t^2) easing in/out : easeInQuad till halfway - easeOutQuad after that to the end of interval.
        'easeInOutQuad': 'easeInOutQuad',
        //Easing equation function for a cubic (t^3) easing in: accelerating from zero velocity.
        'easeInCubic': 'easeInCubic',
        //Easing equation function for a cubic (t^3) easing out: decelerating from zero velocity.
        'easeOutCubic': 'easeOutCubic',
        //Easing equation function for a cubic (t^3) easing in/out. Accelerating from zero velocity till halfway, decelerating after that.
        'easeInOutCubic': 'easeInOutCubic',
        //Easing equation function for a quartic (t^4) easing in: accelerating from zero velocity.
        'easeInQuart': 'easeInQuart',
        //Easing equation function for a quartic (t^4) easing out: decelerating from zero velocity.
        'easeOutQuart': 'easeOutQuart',
        //Easing equation function for a quartic (t^4) easing in/out: Accelerating from zero velocity till halfway, decelerating after that.
        'easeInOutQuart': 'easeInOutQuart',
        //Easing equation function for a quintic (t^5) easing in: accelerating from zero velocity.
        'easeInQuint': 'easeInQuint',
        //Easing equation function for a quintic (t^5) easing out: decelerating from zero velocity.
        'easeOutQuint': 'easeOutQuint',
        //Easing equation function for a quintic (t^5) easing in/out: acceleration until halfway, then deceleration.
        'easeInOutQuint': 'easeInOutQuint',
        //Easing equation function for a sinusoidal (sin(t)) easing in: accelerating from zero velocity.
        'easeInSine': 'easeInSine',
        //Easing equation function for a sinusoidal (sin(t)) easing out: decelerating from zero velocity.
        'easeOutSine': 'easeOutSine',
        //Easing equation function for a sinusoidal (sin(t)) easing in/out: acceleration until halfway, then deceleration.
        'easeInOutSine': 'easeInOutSine',
        //Easing equation function for an exponential (2^t) easing in: accelerating from zero velocity.
        'easeInExpo': 'easeInExpo',
        //Easing equation function for an exponential (2^t) easing out: decelerating from zero velocity.
        'easeOutExpo': 'easeOutExpo',
        //Easing equation function for an exponential (2^t) easing in/out: acceleration until halfway, then deceleration.
        'easeInOutExpo': 'easeInOutExpo',
        //Easing equation function for a circular (sqrt(1-t^2)) easing in: accelerating from zero velocity.
        'easeInCirc': 'easeInCirc',
        //Easing equation function for a circular (sqrt(1-t^2)) easing out: decelerating from zero velocity.
        'easeOutCirc': 'easeOutCirc',
        //Easing equation function for a circular (sqrt(1-t^2)) easing in/out: acceleration until halfway, then deceleration.
        'easeInOutCirc': 'easeInOutCirc'
    };

    function linear(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * currentIteration / totalIterations + startValue;
    }

    function easeInQuad(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * (currentIteration /= totalIterations) * currentIteration + startValue;
    }

    function easeOutQuad(currentIteration, startValue, changeInValue, totalIterations) {
        return -changeInValue * (currentIteration /= totalIterations) * (currentIteration - 2) + startValue;
    }

    function easeInOutQuad(currentIteration, startValue, changeInValue, totalIterations) {
        if ((currentIteration /= totalIterations / 2) < 1) {
            return changeInValue / 2 * currentIteration * currentIteration + startValue;
        }
        return -changeInValue / 2 * ((--currentIteration) * (currentIteration - 2) - 1) + startValue;
    }

    function easeInCubic(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * Math.pow(currentIteration / totalIterations, 3) + startValue;
    }

    function easeOutCubic(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * (Math.pow(currentIteration / totalIterations - 1, 3) + 1) + startValue;
    }

    function easeInOutCubic(currentIteration, startValue, changeInValue, totalIterations) {
        if ((currentIteration /= totalIterations / 2) < 1) {
            return changeInValue / 2 * Math.pow(currentIteration, 3) + startValue;
        }
        return changeInValue / 2 * (Math.pow(currentIteration - 2, 3) + 2) + startValue;
    }

    function easeInQuart(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * Math.pow(currentIteration / totalIterations, 4) + startValue;
    }

    function easeOutQuart(currentIteration, startValue, changeInValue, totalIterations) {
        return -changeInValue * (Math.pow(currentIteration / totalIterations - 1, 4) - 1) + startValue;
    }

    function easeInOutQuart(currentIteration, startValue, changeInValue, totalIterations) {
        if ((currentIteration /= totalIterations / 2) < 1) {
            return changeInValue / 2 * Math.pow(currentIteration, 4) + startValue;
        }
        return -changeInValue / 2 * (Math.pow(currentIteration - 2, 4) - 2) + startValue;
    }

    function easeInQuint(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * Math.pow(currentIteration / totalIterations, 5) + startValue;
    }

    function easeOutQuint(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * (Math.pow(currentIteration / totalIterations - 1, 5) + 1) + startValue;
    }

    function easeInOutQuint(currentIteration, startValue, changeInValue, totalIterations) {
        if ((currentIteration /= totalIterations / 2) < 1) {
            return changeInValue / 2 * Math.pow(currentIteration, 5) + startValue;
        }
        return changeInValue / 2 * (Math.pow(currentIteration - 2, 5) + 2) + startValue;
    }

    function easeInSine(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * (1 - Math.cos(currentIteration / totalIterations * (Math.PI / 2))) + startValue;
    }

    function easeOutSine(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * Math.sin(currentIteration / totalIterations * (Math.PI / 2)) + startValue;
    }

    function easeInOutSine(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue / 2 * (1 - Math.cos(Math.PI * currentIteration / totalIterations)) + startValue;
    }

    function easeInExpo(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * Math.pow(2, 10 * (currentIteration / totalIterations - 1)) + startValue;
    }

    function easeOutExpo(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * (-Math.pow(2, -10 * currentIteration / totalIterations) + 1) + startValue;
    }

    function easeInOutExpo(currentIteration, startValue, changeInValue, totalIterations) {
        if ((currentIteration /= totalIterations / 2) < 1) {
            return changeInValue / 2 * Math.pow(2, 10 * (currentIteration - 1)) + startValue;
        }
        return changeInValue / 2 * (-Math.pow(2, -10 * --currentIteration) + 2) + startValue;
    }

    function easeInCirc(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * (1 - Math.sqrt(1 - (currentIteration /= totalIterations) * currentIteration)) + startValue;
    }

    function easeOutCirc(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue * Math.sqrt(1 - (currentIteration = currentIteration / totalIterations - 1) * currentIteration) + startValue;
    }

    function easeInOutCirc(currentIteration, startValue, changeInValue, totalIterations) {
        if ((currentIteration /= totalIterations / 2) < 1) {
            return changeInValue / 2 * (1 - Math.sqrt(1 - currentIteration * currentIteration)) + startValue;
        }
        return changeInValue / 2 * (Math.sqrt(1 - (currentIteration -= 2) * currentIteration) + 1) + startValue;
    }

    function runEasyFunction(calledEasyFunction, currentIteration, beginValue, endValue, maxIterations) {
        ///<summary>
        ///		Run  specified easy function for specifed iteration
        ///</summary>
        ///<param name="calledEasyFunction" type="object">
        ///		Easing function to be executed. Must be one of EasyFunctions enum members.
        ///</param>
        ///<param name="currentIteration" type="number">
        ///		Number of iteration loop that will be showed from animation next.
        ///</param>        
        ///<param name="beginValue" type="number">
        ///	    Start value for iterations
        ///</param>        
        ///<param name="endValue" type="number">
        ///	    End value for iterations
        ///</param>   
        ///<param name="maxIterations" type="number">
        ///		Number of iterations necessary to finish animation
        ///</param> 
        switch (calledEasyFunction) {
            case EasyFunctions.linear: {
                return linear(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInQuad: {
                return easeInQuad(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeOutQuad: {
                return easeOutQuad(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInOutQuad: {
                return easeInOutQuad(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInCubic: {
                return easeInCubic(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeOutCubic: {
                return easeOutCubic(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInOutCubic: {
                return easeInOutCubic(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInQuart: {
                return easeInQuart(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeOutQuart: {
                return easeOutQuart(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInOutQuart: {
                return easeInOutQuart(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInQuint: {
                return easeInQuint(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeOutQuint: {
                return easeOutQuint(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInOutQuint: {
                return easeInOutQuint(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInSine: {
                return easeInSine(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeOutSine: {
                return easeOutSine(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInOutSine: {
                return easeInOutSine(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInExpo: {
                return easeInExpo(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeOutExpo: {
                return easeOutExpo(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInOutExpo: {
                return easeInOutExpo(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInCirc: {
                return easeInCirc(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeOutCirc: {
                return easeOutCirc(currentIteration, beginValue, endValue, maxIterations);
            }
            case EasyFunctions.easeInOutCirc: {
                return easeInOutCirc(currentIteration, beginValue, endValue, maxIterations);
            }
            default: {
                return new Error('This easing method is not implemented!');
            }
        }
    }

    return {
        EasyFunctions : EasyFunctions,
        runEasyFunction: runEasyFunction,
        _namespace: 'Dragon.Anim.IterationEasings'
    };
});