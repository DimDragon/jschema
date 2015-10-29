Dragon.module(function () {
	///<summary>
	///		Class list functions for easy css class changes
	///</summary>
	var hasCL = ('classList' in document.documentElement);	function add(el, cl) {
		///<signature>
		///<summary>
		///		Add a class to an element's list of classes
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element which class list is manipulated
		///</param>
		///<param name="cl" type="String">
		///		Class being added. Space not allowed in class name
		///</param>
		///</signature>
		///<signature>
		///<summary>
		///		Add list of classes to an element's list of classes
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element which class list is manipulated
		///</param>
		///<param name="cl1" type="String" parameterArray="true">
		///		Class being added. Space not allowed in class name
		///</param>
		///<param name="cl2" type="String" optional="true">
		///		Class being added. Space not allowed in class name
		///</param>
		///<param name="..." type="String" optional="true">
		///		Class being added. Space not allowed in class name
		///</param>
		///</signature>
		cl = Array.prototype.slice.call(arguments, 1);

		for (var i = 0, count = cl.length; i < count; i++) {
			if (hasCL) {
				el.classList.add(cl[i]);
			} else {
				el.className += ' ' + cl[i];
			}
		}
	}

	function remove(el, cl) {
		///<signature>
		///<summary>
		///		Remove a class from an element's list of classes
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element which class list is manipulated
		///</param>
		///<param name="cl" type="String">
		///		Class being removed. Space not allowed in class name
		///</param>
		///</signature>
		///<signature>
		///<summary>
		///		Remove list of classes from an element's list of classes
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element which class list is manipulated
		///</param>
		///<param name="cl1" type="String" parameterArray="true">
		///		Class being removed. Space not allowed in class name
		///</param>
		///<param name="cl2" type="String" optional="true">
		///		Class being removed. Space not allowed in class name
		///</param>
		///<param name="..." type="String" optional="true">
		///		Class being removed. Space not allowed in class name
		///</param>
		///</signature>
		cl = Array.prototype.slice.call(arguments, 1);

		for (var i = 0, count = cl.length; i < count; i++) {
			if (hasCL) {
				el.classList.remove(cl[i]);
			} else {
				var rex = new RegExp('(\\s|^)' + cl[i]);
				el.className = el.className.replace(rex, '');
			}
		}
	}

	function contains(el, cl) {
		///<summary>
		///		Check if an element's list of classes contains a specific class
		///</summary>
		///<param name="el" type="HTMLElement">
		///		HTML element which class list is checked
		///</param>
		///<param name="cl" type="String">
		///		Class name we search for
		///</param>
		///<returns type="Boolean">True if class name is found</returns>
		if (hasCL) {
			return el.classList.contains(cl);
		}

		var rex = new RegExp('(\\s|^)' + cl + '(\\s|$)');
		return el.className.match(rex);
	}

	return {
		add: add,
		remove: remove,
		contains: contains,
		toggle: function (el, cl) {
			///<summary>
			///		Toggle the existence of a class in an element's list of classes
			///</summary>
			///<param name="el" type="HTMLElement">
			///		HTML element which class list is manipulated
			///</param>
			///<param name="cl" type="String">
			///		Class name to toggle
			///</param>
			if (hasCL) {
				el.classList.toggle(cl);
			} else {
				if (contains(el, cl)) {
					remove(el, cl);
				} else {
					add(el, cl);
				}
			}
		},
		item: function (el, index) {
			///<summary>
			///		Check if an element's list of classes contains a specific class
			///</summary>
			///<param name="el" type="HTMLElement">
			///		HTML element which class list is checked
			///</param>
			///<param name="index" type="Number">
			///		Class name index in the list
			///</param>
			///<returns type="String">Class name at specified index</returns>
			if (hasCL) {
				return el.classList.item(index);
			}

			var classes = el.className.split(' ');
			return index < classes.length ? classes[index] : null;
		},
        _namespace: 'Dragon.Class'
		//NOTE: consider adding length
	}
});