Dragon.module(['dragon/event', 'dragon/classlist'], function (Event, Class) {
	var nativeDnD = 'draggable' in document.createElement('span');

	// NOTE: dragend is supposed to not be mouse event so some browsers(FF) do not set client coordinates or page coordinates
	function setPos(el, evt) {
		//console.log('ScreenX: ' + evt.screenX + '   ScreenY: ' + evt.screenY);
		//console.log('Start screenX: ' + el.dragStartPosition.x + '   Start screenY: ' + el.dragStartPosition.y);
		//console.log('Move screenX: ' + el.dragMovePosition.x + '   Move screenY: ' + el.dragMovePosition.y);

		var pos = { x: evt.screenX, y: evt.screenY };
		// Safari reports wrong screen coordinates on dragend event
		// check for this discrepancy and use stored move coordinates
		if (el.dragMovePosition && (Math.abs(pos.x - el.dragMovePosition.x) > 10 || Math.abs(pos.y - el.dragMovePosition.y) > 10)) {
			pos = el.dragMovePosition;
		}

		el.style.left = (el.dragStartPosition.x + pos.x) + "px";
		el.style.top = (el.dragStartPosition.y + pos.y) + "px";
	}

	function activate(el, dragged) {
		///<signature>
		///<summary>
		///		Activate drag for given element
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element which you can start dragging
		///</param>
		///</signature>
		///<signature>
		///<summary>
		///		Activate drag for given element
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element which you can start dragging
		///</param>
		///<param name="dragged" type="HTMLElement">
		///		HTML element used as visual clue while dragging
		///</param>
		///</signature>
		el.draggable = true;

		if (dragged) {
			el.draggedElem = dragged;
		}

		Event.add(el, 'dragstart', dragStart);
		Event.add(el, 'drag', dragMove);
		Event.add(el, 'dragend', dragEnd);

		// IE9-10 needs this to activate DnD on any object
		if (el.dragDrop && !nativeDnD) {
			console.log('IE drag/drop fallback');
			Event.add(el, 'selectstart', function (evt) {
				this.dragDrop();
				Event.cancel(evt);
			});
		}
	}


	function dragStart(evt) {
		var dragged = this.draggedElem || this;

		//if (!target.getAttribute('draggable')) {
		//	evt.preventDefault();
		//}

		// store drag start position
		dragged.dragStartPosition = {
			x: dragged.offsetLeft - evt.screenX,
			y: dragged.offsetTop - evt.screenY
		};

		// at the moment support for different effects is not consistent
		evt.dataTransfer.effectAllowed = 'all';
		evt.dataTransfer.dropEffect = 'move';

		// needed for Firefox only!
		if ('mozItemCount' in evt.dataTransfer) {
			// Beware this can be consumed on drop!
			evt.dataTransfer.setData('text/html', dragged.innerHTML);
			// fix FF bug with boxShadow
			Class.add(dragged, 'no-shadow');
		}

		// set ghost image as drag operation clue
		if (evt.dataTransfer.setDragImage) {
			var rect = dragged.getBoundingClientRect();

			evt.dataTransfer.setDragImage(dragged, evt.clientX - rect.left, evt.clientY - rect.top);
		} else {
			//NOTE: in IE10 there is native ghost image which will also be shown
			var ghost = dragged.cloneNode(true);

			ghost.dragStartPosition = dragged.dragStartPosition;
			ghost.style.position = 'absolute';
			ghost.style.opacity = 0.33;
			document.body.appendChild(ghost);
			this.dragGhostImage = ghost;
		}
	}

	function dragMove(evt) {
		var dragged = this.draggedElem || this;

		if (this.dragGhostImage) {
			setPos(this.dragGhostImage, evt);
		} else if (evt.screenX || evt.screenY) {
			dragged.dragMovePosition = {
				x: evt.screenX,
				y: evt.screenY
			};
		}
	}

	function dragEnd(evt) {
		var dragged = this.draggedElem || this;

		setPos(dragged, evt);

		if (Class.contains(dragged, 'no-shadow'))
			Class.remove(dragged, 'no-shadow');

		if (this.dragGhostImage)
			document.body.removeChild(this.dragGhostImage);
		}

	function dropzone(el, opt) {
		///<signature>
		///<summary>
		///		Activate element as drop operation target
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element to be used as drop zone
		///</param>
		///</signature>
		///<signature>
		///<summary>
		///		Activate element as drop operation target
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element to be used as drop zone
		///</param>
		///<param name="opt" type="Object">
		///		Drop target options
		///</param>
		///</signature>
	}

	return {
		enable: activate,
		receive: dropzone
	};
});

//NOTE: we should consider handling declarative activation via 'draggable' attribute
