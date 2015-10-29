// Disclaimer: our target are business/enterprise applications so we go only for SINGLE touch events!
Dragon.module(['dragon/event', 'dragon/classlist'], function (Event, Class) {
    var HOLD_THRESHOLD = 600,		// ms
		TAP_THRESHOLD = 200,		// ms
		DBL_TAP_THRESHOLD = 300, 	// ms
		MOVE_LIMIT = 20,			// pixels
		DIRECTION = {
		    LEFT: 1,
		    RIGHT: 2,
		    UP: 4,
		    DOWN: 8,
		    HORIZONTAL: 3,
		    VERTICAL: 12
		},
		nativePointerEvents = !!window.MSPointerEvent || !!window.PointerEvent,
		pointerDownEvt = nativePointerEvents ? 'pointerdown' : 'MSPointerDown',
		pointerUpEvt = nativePointerEvents ? 'pointerup' : 'MSPointerUp',
		pointerMoveEvt = nativePointerEvents ? 'pointermove' : 'MSPointerMove',
		pointerCancelEvt = nativePointerEvents ? 'pointercancel' : 'MSPointerCancel';

    nativePointerEvents = nativePointerEvents || window.navigator.msPointerEnabled;		// IE10 prefixes pointers
    var isMobile = false; //initiate as false
    //device detection
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
        || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4))) isMobile = true;

    function raiseEvent(target, type, detail) {
        if (!target || !type) {
            return;
        }

        var evt;

        if (type.indexOf("drag") == 0 || type.indexOf("drop") == 0) {
            detail.dataTransfer = {
                clearData: function (type) {
                    if (type) {
                        var index = this.dragDataTypes.indexOf(type);
                        this.dragDataTypes.splice(index, 1);
                        this.dragData.indexOf(type);
                        delete this.dragData[type];
                    } else {
                        this.dragData = {};
                        this.dragDataTypes = [];
                    }
                }.bind(target),
                setData: function (type, val) {
                    if (!this.dragData) {
                        this.dragData = {};
                    }
                    this.dragData[type] = val;
                    if (!this.dragDataTypes) {
                        this.dragDataTypes = [];
                    }
                    if (this.dragDataTypes.indexOf(type) == -1) {
                        this.dragDataTypes[this.dragDataTypes.length] = type;
                    }
                    return val;
                }.bind(target),
                setDragImage: function (element) {
                    this.dragGhostImage = element;

                }.bind(target),
                getData: function (type) {
                    if (this.dragData.hasOwnProperty(type)) {
                        return this.dragData[type];
                    } else {
                        return null;
                    }
                }.bind(target),
                dropEffect: "move",
                dragData: {},
                dragDataTypes: [],
                dragGhostImage: {}
            };
            detail.nonNative = true;

            if (type.indexOf("drop") == 0 && detail.target) {
                target.dragData = detail.target.dragData;
                target.dragDataTypes = detail.target.dragDataTypes;
            }
        }

        if (typeof window.CustomEvent === 'function') { // use contructor
            evt = new CustomEvent(type, {
                bubbles: true,
                cancelable: true,
                detail: detail
            });
        } else if (document.createEvent) { // use init fallback(old browser and IE9-10)
            evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(type, true, true, detail);
        }
        return target.dispatchEvent(evt);
    }

    function getPosition(evt) {
        var pos = {};

        if (evt.changedTouches) {
            // logerr(evt.target);
            pos.clientX = evt.changedTouches[0].clientX;
            pos.clientY = evt.changedTouches[0].clientY;
            pos.screenX = evt.changedTouches[0].screenX;
            pos.screenY = evt.changedTouches[0].screenY;
        } else {
            pos.clientX = evt.clientX;
            pos.clientY = evt.clientY;
            pos.screenX = evt.screenX;
            pos.screenY = evt.screenY;
        }
        pos.stamp = Date.now();
        return pos;
    }

    function checkProximity(pOne, pTwo) {
        return (Math.abs(pTwo.clientX - pOne.clientX) <= 10) && (Math.abs(pTwo.clientY - pOne.clientY) <= 10);
    }

    function Handler(el, opt) {
        var self = opt.self,
            dnd = opt.dnd,
            dndType = opt.dndType,
            elem,
            startPos,
            endPos,
            moved,
            lastTap = null,
            evtRoot = self ? el : document,
            lastMovePos,
            draging = false,
            dragingHadler,
            overobj,
            dragobj;


        if (dnd == true) {
            if (dndType == 'dropzone') {
                el.dropzone = true;
            } else {
                dndType = 'draggable';
                el.draggable = true;
            }
        }

        elem = typeof el === 'object' ? el : document.getElementById(el);


        this.initDrag = function (evt) {
            draging = true;
            endPos = startPos;
            dragobj = overobj = getTMEwP(startPos, 'draggable');// document.elementFromPoint(startPos.clientX, startPos.clientY);
            raiseEvent(elem, 'dragstart', this.getDetail(evt));

        }.bind(this);

        // handle gesture detection start
        this.start = function (evt) {
            if (evt.type.indexOf("touch") == 0) {
                if (dnd) {
                    // evt.preventDefault();
                }
            } else if (!self && !dnd) {
                evt.preventDefault();
            }


            // see disclaimer
            if ((evt.touches && evt.touches.length > 1) || evt.which > 1) {
                return;
            }

            draging = false;
            moved = false;

            if (nativePointerEvents) {
                evtRoot.addEventListener(pointerMoveEvt, this.move, true);
                evtRoot.addEventListener(pointerUpEvt, this.end, true);
                evtRoot.addEventListener(pointerCancelEvt, this.end, true);
            } else {
                evtRoot.addEventListener('touchmove', this.move, true);
                evtRoot.addEventListener('touchend', this.end, true);
                evtRoot.addEventListener('touchcancel', this.end, true);
                if (dnd != true) {
                    evtRoot.addEventListener('mousemove', this.move, true);
                    evtRoot.addEventListener('mouseup', this.end, true);
                }
            }

            startPos = getPosition(evt);
            lastMovePos = startPos;

            if (elem.draggable && evt.type === 'touchstart') {//
                dragingHadler = setTimeout(this.initDrag, 500, evt);
            }

        }.bind(this);

        // handle move events
        this.move = function (evt) {
            endPos = getPosition(evt);
            if (!checkProximity(endPos, startPos) || draging) {
                if (draging == true && dragobj) {
                    evt.preventDefault();
                    if (dragobj.dragGhostImage)
                        dragobj.dragGhostImage.style.display = 'none';
                    var curroverobj = getTMEwP(endPos, 'draggable') || getTMEwP(endPos, 'dropzone');// document.elementFromPoint(endPos.clientX, endPos.clientY),

                    detail = this.getDetail(evt);
                    if (dragobj.dragGhostImage)
                        dragobj.dragGhostImage.style.display = 'initial';
                    raiseEvent(elem, 'drag', detail);
                    if (curroverobj == overobj) {
                        raiseEvent(curroverobj, 'dragover', detail);
                    } else if (curroverobj) {
                        raiseEvent(curroverobj, 'dragenter', detail);
                        overobj = curroverobj;
                    }
                } else {

                    if (!draging) {
                        clearTimeout(dragingHadler);
                    }
                    moved = true;

                    raiseEvent(elem, 'tracking', {
                        clientX: endPos.clientX,
                        clientY: endPos.clientY,
                        distX: endPos.clientX - startPos.clientX,
                        distY: endPos.clientY - startPos.clientY,
                        delta: endPos.stamp - lastMovePos.stamp
                    });

                }
                lastMovePos = endPos;
            }
        }.bind(this);

        // determine final gesture
        this.end = function (evt) {
            if (evt.type.indexOf("touch") == 0) {
                if (!dnd) {
                    evt.preventDefault();
                }
            } else {
                evt.preventDefault();
            }

            endPos = getPosition(evt);
            //if (isMobile && nativePointerEvents && checkProximity(startPos, endPos) && (endPos.stamp - startPos.stamp>900)) {
            //    this.initDrag(evt);
            //    evtRoot.addEventListener(pointerMoveEvt, this.move, true);
            //    evtRoot.addEventListener(pointerUpEvt, this.end, true);
            //    evtRoot.addEventListener(pointerCancelEvt, this.end, true);
            //    return;
            //}


            var type,
            detail = this.getDetail(evt);
            elem.style.opacity = 1;

            // see disclaimer
            if (evt.touches && evt.touches.length > 0) {
                return;
            }

            if (!draging) {
                clearTimeout(dragingHadler);
            }

            // remove registered listeners
            if (nativePointerEvents) {
                evtRoot.removeEventListener(pointerMoveEvt, this.move, true);
                evtRoot.removeEventListener(pointerUpEvt, this.end, true);
                evtRoot.removeEventListener(pointerCancelEvt, this.end, true);
            } else {
                evtRoot.removeEventListener('touchmove', this.move, true);
                evtRoot.removeEventListener('touchend', this.end, true);
                evtRoot.removeEventListener('touchcancel', this.end, true);
                evtRoot.removeEventListener('mousemove', this.move, true);
                evtRoot.removeEventListener('mouseup', this.end, true);
            }

            if (draging) {
                var target = closestElement(evt.target, 'draggable');


                detail.target = target;
                if (target && target.dragGhostImage)
                    target.dragGhostImage.style.display = 'none';
                var curroverobj = getTMEwP(endPos, 'dropzone');// closestElement(document.elementFromPoint(endPos.clientX, endPos.clientY), 'dropzone');
                if (target && target.dragGhostImage)
                    target.dragGhostImage.style.display = 'initial';

                raiseEvent(curroverobj, 'drop', detail);
                raiseEvent(elem, 'dragend', detail);
                return;
            } else if (moved) {
                type = 'swipe'; //delta < DBL_TAP_THRESHOLD ? 'swipe' : 'track';
            } else if (detail.delta > HOLD_THRESHOLD) {
                type = 'hold';
            } else if (lastTap && checkProximity(endPos, lastTap) && (endPos.stamp - lastTap.stamp) < DBL_TAP_THRESHOLD) {
                lastTap = null;
                type = 'dbltap';
            } else {
                type = 'tap';
                // store lastTap in order to test for double tap
                lastTap = endPos;
            }
            raiseEvent(elem, type, detail);
        }.bind(this);


        this.getDetail = function (evt) {
            if (!endPos) {
                endPos = startPos
            }
            var delta = endPos.stamp - startPos.stamp,
                detail = {
                    clientX: endPos.clientX,
                    clientY: endPos.clientY,
                    screenX: endPos.screenX,
                    screenY: endPos.screenY,
                    delta: delta,
                    target: evt.target,
                    touched: !!evt.touches
                },
                distX = endPos.clientX - startPos.clientX,
                distY = endPos.clientY - startPos.clientY,
                dist = Math.sqrt(distX * distX + distY * distY);


            detail.distance = dist;
            detail.distanceX = distX;
            detail.distanceY = distY;
            detail.velocity = Math.abs(dist / delta) || 0;
            detail.velocityX = Math.abs(distX / delta) || 0;
            detail.velocityY = Math.abs(distY / delta) || 0;

            // calculate direction
            if (Math.abs(distX) > Math.abs(distY)) {
                detail.direction = distX > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT;
            } else {
                detail.direction = distY > 0 ? DIRECTION.UP : DIRECTION.DOWN;
            }

            return detail;

        }.bind(this);

        // register pointer events if there is support or touch + mouse
        addStartEvent(elem, this.start);
    }

    function add(el, opt) {
        var options = opt;
        if (typeof opt !== 'object') {
            options = {
                self: opt
            };
        }
        return el._gestureHandler = new Handler(el, options);
    }

    function startEvent(el, fn, verb) {
        var action = verb + 'EventListener';

        if (nativePointerEvents) {
            el[action](pointerDownEvt, fn, true);
        } else {
            el[action]('touchstart', fn, true);
            el[action]('mousedown', fn, true);
        }
    }

    function addStartEvent(el, fn) {
        startEvent(el, fn, 'add');
    }

    function removeStartEvent(el, fn) {
        startEvent(el, fn, 'remove');
    }

    function remove(el) {

        removeStartEvent(el, el._gestureHandler.start);
        el._gestureHandler = null;
    }

    //getTopMostElWithProp
    function getTMEwP(pos, property) {
        var el = document.elementFromPoint(pos.clientX, pos.clientY);
        return closestElement(el, property);
    }

    function closestElement(el, property) {

        if (el[property]) {
            return el;
        } else if (el == document) {
            return null;
        } else {
            return closestElement(el.parentNode, property);
        }
    }

    function setCustomEvtStraight(evt) {
        evt.nonNative = evt.detail.nonNative;
        evt.screenX = evt.detail.screenX;
        evt.screenY = evt.detail.screenY;
        evt.clientX = evt.detail.clientX;
        evt.clientY = evt.detail.clientY;
        evt.dataTransfer = evt.detail.dataTransfer;
    }

    function logerr(param, fl) {


        var dh = document.getElementById("martinerror");

        if (fl) {
            dh.innerHTML = '';
        }
        if (dh) {
            dh.innerHTML += param + "</br>";
        }
    }


    return {
        enable: add,
        disable: remove,
        addStartEvent: addStartEvent,
        removeStartEvent: removeStartEvent,
        logerr: logerr,
        setCustomEvtStraight: setCustomEvtStraight
    };

});

// TO DO:

// fix problem with FF on Surface (firing mouse events only)
// add optional parameter to restrict touch event direction/scope via touch-action
// move touch-action to program code
// do we need to separate tracking and swipe events further?
// (done) remove right click from tap gesture