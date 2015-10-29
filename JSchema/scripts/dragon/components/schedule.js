Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/dom', 'dragon/event', 'dragon/datetime', 'dragon/dialog', 'dragon/window', 'dragon/gesture'], function (WC, Class, Dom, Event, DT, Popup, Win, GS) {
	var PRIMERY_COL_CLASS = 'table',
		HEADER_CELL_CLASS = 'hcol',
		BODY_ROW_CLASS = 'trow',
		BODY_CELL_CLASS = 'tcol',
		TABLE_SCH_CLASS = 'sch-inner',
		BODY_SCH_CLASS = 'sch-content',
		AVAIL_SCH_CLASS = 'availability',
		SCHOOL_SCH_CLASS = 'school',
		VACATION_CLASS = 'vacation',
		HOLIDAY_CLASS = 'holiday',
		ILLNESS_CLASS = 'illness',
		ENTRY_CLASS = 'schedule',
		OPENING_HOURS_CLASS = 'opening-hours-item',
		TOP_CLASS = 'top',
		BOTTOM_CLASS = 'bottom',
		OPENING_CLASS = 'opening-hours',
		BOX_CLASS = 'schedule-item',
		BOX_START_CLASS = 'continue-start',
		BOX_END_CLASS = 'continue-end',
		NON_PRESENT_CLASS = 'no-presence',
		TEXT_CLASS = 'ctrl-text',
		OPENING_HOURS_TABLE_NAME = 'openingHours',
		AVAILABILITY_TABLE_NAME = 'availability',
		SCHOOL_TABLE_NAME = 'schoolSchedule',
		VACATION_TABLE_NAME = 'vacation',
		HOLIDAY_TABLE_NAME = 'holiday',
		ILLNESS_TABLE_NAME = 'illness',
		ENTRIES_TABLE_NAME = 'entries',
		PREV_DAY_ENTRY = 'prevDayEntry',
		DAY_HOURS = 24,
		MIDNIGHT = 24 * 60,
		START_TIME_INT = 0,
		END_TIME_INT = START_TIME_INT + DAY_HOURS,
		dataSource,
		labelData,
		scheduleData,
		contractData,
		nodeData,
		fromDate,
		nodeID,
		currEmployee,
		currentContract,
		hoursInInterval = 1,
		timespan = 5,
		hourTimeInterval = 60 / timespan,
		coef = 100 / (DAY_HOURS * hourTimeInterval),
		dimension,
		entryFromBeforDay,
		selectedRow = null,
		selectedBox = null,
		tooltip = false,
		addEditTemplate,
		weekDaySource,
		resKey = {
			days: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
			daysShrt: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
			months: ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'],
			monthsShrt: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
		},
		scheduledTime = 0,
		nonPresentTime = 0,
		breaksTime = 0,
		entryPeriods = [],
		nonPresentPeriods = [],
		el,
		opt = { weekly: false };

	opt.readOnly = !!opt.readOnly;
	opt.hoursInInterval = opt.hoursInInterval || hoursInInterval;



	function scheduleTab(e) {
		var evt = e.detail.target ? e.detail : e,
			row = Dom.parent(evt.target, 't-row'),
			box = Dom.parent(evt.target, '.schedule-item');

		if (row) {
			var chs = row.parentNode.childNodes,
				ind = -1;

			for (var i = 0, el = chs[0]; el; el = chs[++i]) {
				if (row == el) {
					ind = i;
					break;
				}
			}

			rowSelectionSet.call(this, evt, ind);
		}

		if (box) {
			entryBoxSelectionSet.call(box, evt);
		}
	}

	function init(ctrl) {
		el = ctrl;
		//GS.enable(el);
		//Dragon.Event.add(el, 'tap', scheduleTab);
	}

	function setDataSource(ctrl, data) {
		el = ctrl;
		dataSource = data._model || data;
		labelData = dataSource.label;
		scheduleData = dataSource.schedule;
		contractData = dataSource.contracts;
		nodeData = dataSource.nodes;
		fromDate = el.ctrl.date;
		nodeID = el.ctrl.nodeID;
		tooltipHide();
		render();
	}

	function tabAttach() {
		var label = el.querySelector('ctrl-grid t-body'),
			schCont = el.querySelector('.sch-content');

		GS.enable(label);
		GS.enable(schCont);

		Dragon.Event.add(label, 'tap', scheduleTab);
		Dragon.Event.add(schCont, 'tap', scheduleTab);
	}

	function render() {
		entryFromBeforDay = null;
		scheduledTime = 0;
		nonPresentTime = 0;
		breaksTime = 0;
		entryPeriods = [];
		nonPresentPeriods = [];
		currEmployee = null;

		var fragment = document.createDocumentFragment(),
			tblLabel = lableTableCreate(),
			tblSchedule = scheduleTableCreate();
		//Dragon.Event.addGestures(tblLabel);
		fragment.appendChild(tblLabel);
		fragment.appendChild(tblSchedule);
		//el.innerHTML = '';
		Dom.empty(el);
		el.appendChild(fragment);
		visibilitySet();
		//new Dragon.Controls.Carousel(tblSchedule, { 'minWidth': '1050', 'viewMode': 'multiple' });
		clearSelection();
		tabAttach();
		Event.raise(el, 'schedule_rendered');
	}

	function lableTableCreate() {
		var /*cl = (function () {
			var cl = PRIMERY_COL_CLASS;
			switch (labelData.header.length) {
				case 1: cl += ' grid-one-col'; break;
				case 2: cl += ' grid-two-col'; break;
			}
			return cl;
		})(),*/
			table = Dom.create('ctrl-grid');
		table.appendChild(lableTableHeaderCreate());
		table.appendChild(lableTableBodyCreate());

		return table;
	}

	function lableTableHeaderCreate() {
		var row = Dom.create('h-row'),
			cell;

		if (labelData.header.cssClass)
			Class.add(row, labelData.header.cssClass);

		for (var i = 0, field = labelData.header.fields[0]; field; field = labelData.header.fields[++i]) {
			cell = Dom.create('h-cell', field.cssClass);

			if (labelData.header.trans) {
				WC.setText(cell, field.content);
			} else {
				cell.innerHTML = field.content;
			}

			row.appendChild(cell);
		}

		return row;
	}

	function lableTableBodyCreate() {
		var table = Dom.create('t-body'),
			source = dataSource[labelData.body.source],
			fields = labelData.body.fields,
			row,
			cssClass,
			cell,
			cnt
		i = 0;

		//for (var i = 0, item = source[0]; item; item = source[++i]) {
		for (var key in source) {
			if (!source.hasOwnProperty(key)) continue;

			var item = source[key];

			row = Dom.create('t-row', (el.weekly && item.NodeID != nodeID ? ' disabled' : ''));

			if (labelData.body.cssClass)
				Class.add(row, labelData.body.cssClass);

			for (var j = 0, l = fields.length, field = fields[j]; j < l; field = fields[++j]) {
				cell = Dom.create('t-cell', field.cssClass);
				cnt = field.content;

				cnt && (cnt = cnt.replace(/{{(\w+)(\|trans)?}}/g, function (match, key, trans) {
					return item[key] ?
						(!!trans ? WC.text(item[key]) : item[key]) :
						'';
				}));

				cell.innerHTML = cnt || '';
				/*
				if (cnt && labelData.body.trans)
					cell.setAttribute('data-res', cnt);
				else
					cell.innerHTML = cnt || '';
				*/
				row.appendChild(cell);
			}

			table.appendChild(row);
			//Dragon.Event.add(row, 'click', function (num) { return function (e) { rowSelectionSet.call(this, e, num) } } (i), true);
			Event.add(row, 'mouseenter', function (num) { return function (e) { rowHoverSet.call(this, e, num) } }(i), false);
			Event.add(row, 'mouseleave', function (num) { return function (e) { rowHoverRemove.call(this, e, num) } }(i), false);
			i++;
		}

		return table;
	}

	function scheduleTableCreate() {
		var table = Dom.create('div', TABLE_SCH_CLASS);
		table.appendChild(scheduleHeaderCreate());
		if (el.weekly)
			table.appendChild(scheduleWeeklyBodyCreate());
		else
			table.appendChild(scheduleBodyCreate());
		return table;
	}

	function scheduleHeaderCreate() {
		var ol = Dom.create('h-row'),
			timeLine = timeLineCreate();
		if (!el.weekly) {
			ol.appendChild(timeLine);
		} else {
			for (var d = 0; d < 7; d++) {
				var col = Dom.create('div', HEADER_CELL_CLASS),
					olDay = Dom.create('div', 'hours'),
					divDate = Dom.create('div', 'title'),
					liHour;

				divDate.innerHTML = DT.formatDate(fromDate + d, 'ddd d/MM');
				olDay.appendChild(timeLine.cloneNode(true));
				col.appendChild(divDate);
				col.appendChild(olDay);
				ol.appendChild(col);
			}
		}
		return ol;
	}

	function timeLineCreate() {
		var fragment = document.createDocumentFragment(),
			cell,
			createElement = !el.weekly ?
							function (text) {
								var cell = Dom.create('h-cell'),
									divTxt = Dom.create('div', 'num'),
									divOut = Dom.create('div', 'l1'),
									divIn = Dom.create('div', 'l2');
								divTxt.innerHTML = text;
								divOut.appendChild(divIn);
								cell.appendChild(divTxt);
								cell.appendChild(divOut);
								return cell;
							} :
							function (text) {
								var cell = Dom.create('h-cell'),
									divTxt = Dom.create('div', 'num');
									//divOut = Dom.create('div', 'l1');
								divTxt.innerHTML = text;
								cell.appendChild(divTxt);
								//cell.appendChild(divOut);
								return cell
							}
		formatText = !el.weekly ?
						function (i) { return DT.addCharBeforeStr(i, '0', 2); } :
						function (i) { return i; };
		for (var i = 0; i < 24; i += opt.hoursInInterval) {
			cell = createElement(formatText(i));
			fragment.appendChild(cell);
		}
		return fragment;
	}

	function scheduleWeeklyBodyCreate() {
		var ol = Dom.create('div', BODY_SCH_CLASS),
			top = {
				tables: [{ name: AVAILABILITY_TABLE_NAME, cssClass: AVAIL_SCH_CLASS },
						{ name: SCHOOL_TABLE_NAME, cssClass: SCHOOL_SCH_CLASS }],
				cssClass: TOP_CLASS
			},
			bottom = {
				tables: [{ name: VACATION_TABLE_NAME, cssClass: VACATION_CLASS },
						 { name: HOLIDAY_TABLE_NAME, cssClass: HOLIDAY_CLASS },
						 { name: ILLNESS_TABLE_NAME, cssClass: ILLNESS_CLASS }],
				cssClass: BOTTOM_CLASS
			},
			opening = {
				tables: [{ name: OPENING_HOURS_TABLE_NAME, cssClass: OPENING_HOURS_CLASS }],
				cssClass: OPENING_CLASS
			};
		for (var key = 0, employee = dataSource.employees[0]; employee; employee = dataSource.employees[++key]) {
			var row = Dom.create('t-row'),//Dom.create('li', BODY_ROW_CLASS + (employee.NodeID != nodeID ? ' disabled' : '')),
				olTop = null,
				olSch = null,
				olBottom = null,
				olOpen = null,
				olWeekDay = Dom.create('ol', 'weekdays'); //,
			//olRow = Dom.create('ol', 'tcol-wrap');
			//row.appendChild(olRow);
			currEmployee = employee;

			for (var i = 0; i < 7; i++) {
				//var dayCell = Dom.create('li', 'tcol');
				top.day = bottom.day = opening.day = i;
				olTop = scheduleRowCreate(top, olTop);
				olSch = entryRowCreate({ day: i, name: ENTRIES_TABLE_NAME, cssClass: BOX_CLASS }, olSch);
				olBottom = scheduleRowCreate(bottom, olBottom);
				olOpen = scheduleRowCreate(opening, olOpen);
				olWeekDay.appendChild(Dom.create('li', BODY_CELL_CLASS));
				//dayCell.appendChild(scheduleRowCreate(top));
				//dayCell.appendChild(entryRowCreate({ day: i, name: ENTRIES_TABLE_NAME, cssClass: BOX_CLASS }));
				//dayCell.appendChild(scheduleRowCreate(bottom));
				//olRow.appendChild(dayCell);
				entryFromBeforDay = null;
			}

			row.appendChild(olTop);
			row.appendChild(olSch);
			row.appendChild(olBottom);
			row.appendChild(olOpen);
			row.appendChild(olWeekDay);
			entryFromBeforDay = null;
			ol.appendChild(row);

			//Dragon.Event.add(row, 'click', function (num) { return function (e) { rowSelectionSet.call(this, e, num) } } (i), true);
			Event.add(row, 'mouseenter', function (num) { return function (e) { rowHoverSet.call(this, e, num) } }(key), false);
			Event.add(row, 'mouseleave', function (num) { return function (e) { rowHoverRemove.call(this, e, num) } }(key), false);
		}
		return ol;
	}

	var available = { dsProp: 'availability', entryClass: 'availability' },
		school = { dsProp: 'schoolSchedule', entryClass: 'school' },
		entry = { dsProp: 'entries', entryClass: 'schedule-item', creator: entryRowCreate },
		vacation = { dsProp: 'vacation', entryClass: 'vacation' },
		holiday = { dsProp: 'holiday', entryClass: 'holiday' },
		illness = { dsProp: 'illness', entryClass: 'illness' },
		opening = { dsProp: 'openingHours', entryClass: 'opening-hours-item' },
		rowTop = { tables: [available, school], cssClass: 'top' },
		rowMiddle = { tables: [entry], cssClass: 'schedule' },
		rowOpening = { tables: [opening], cssClass: 'opening-hours' },
		rowBottom = { tables: [vacation, holiday, illness], cssClass: 'bottom' },
		defCreator = scheduleRowCreate,
		scheduleRows = [rowTop, rowMiddle, rowBottom, rowOpening];

	function scheduleBodyCreate() {
		var ol = Dom.create('div', BODY_SCH_CLASS),
			top = {
				tables: [{ name: AVAILABILITY_TABLE_NAME, cssClass: AVAIL_SCH_CLASS },
						{ name: SCHOOL_TABLE_NAME, cssClass: SCHOOL_SCH_CLASS }],
				cssClass: TOP_CLASS
			},
			bottom = {
				tables: [{ name: VACATION_TABLE_NAME, cssClass: VACATION_CLASS },
						 { name: HOLIDAY_TABLE_NAME, cssClass: HOLIDAY_CLASS },
						 { name: ILLNESS_TABLE_NAME, cssClass: ILLNESS_CLASS }],
				cssClass: BOTTOM_CLASS
			},
			opening = {
				tables: [{ name: OPENING_HOURS_TABLE_NAME, cssClass: OPENING_HOURS_CLASS }],
				cssClass: OPENING_CLASS
			},
			origDataSource = scheduleData,
			i = 0;

		for (var key in dataSource[labelData.body.source]) {
			if (!dataSource[labelData.body.source].hasOwnProperty(key)) continue;

			//for (var i = 0; i < 7; i++) {
			var row = Dom.create('t-row'),
				day = isNaN(key) ? key : i;
			top.day = bottom.day = opening.day = day;
			//top.employee = bottom.employee = emp;
			//for (var j = 0, schRow = scheduleRows[0]; schRow; schRow = scheduleRows[++j]) {
			//	schRow.day = i;
			//	row.appendChild((schRow.creator ? schRow.creator(schRow) : defCreator(schRow)));
			//}
			row.appendChild(scheduleRowCreate(top));
			row.appendChild(entryRowCreate({ day: day, name: ENTRIES_TABLE_NAME, cssClass: BOX_CLASS }));
			row.appendChild(scheduleRowCreate(bottom));
			row.appendChild(scheduleRowCreate(opening));
			ol.appendChild(row);

			//Dragon.Event.add(row, 'click', function (num) { return function (e) { rowSelectionSet.call(this, e, num) } } (i), true);
			Event.add(row, 'mouseenter', function (num) { return function (e) { rowHoverSet.call(this, e, num) } }(i), false);
			Event.add(row, 'mouseleave', function (num) { return function (e) { rowHoverRemove.call(this, e, num) } }(i), false);
			i++;
		}

		if (entryFromBeforDay && el.allowTransferFromEndToStartWeek) {
			entryBoxAddToRow(entryFromBeforDay, 0, 0, ol);
		}

		entryFromBeforDay = null;

		return ol;
	}

	function scheduleRowCreate(obj, ol) {
		var ol = ol || Dom.create('ol', obj.cssClass);
		for (var i = 0, table = obj.tables[i]; table; table = obj.tables[++i]) {
			//console.log('scheduleRowCreate ' + table.name);
			ol.appendChild(createPeriodSpan(obj, table));
		}
		if (ol.hasChildNodes()) {
			Dragon.Class.add(ol, 'hbox');
		} else {
			ol.appendChild(document.createElement('li'));
		}
		return ol;
	}

	function entryRowGet(num) {
		var schTable = Dom.getElementsByClass(el, BODY_SCH_CLASS)[0],
			row = schTable.querySelectorAll('t-row')[num],
			entryRow = Dom.getElementsByClass(row, ENTRY_CLASS)[0];
		return entryRow;
	}

	function entryRowCreate(obj, ol) {
		var ol = ol || Dom.create('ol', ENTRY_CLASS),
			source = currEmployee ? scheduleData[currEmployee.key] : scheduleData,
			list = source[obj.day] ? source[obj.day][obj.name] :
			(source[obj.day] && source[obj.day][obj.name] ? source[obj.day][obj.name] : []);

		currentContract = contractGet(fromDate + (isNaN(obj.day) ? 0 : parseInt(obj.day)), obj.day);
		
		if (entryFromBeforDay) {
			list = list.concat([entryFromBeforDay]);
			entryFromBeforDay = null;
		}
		if (source[obj.day] && source[obj.day][PREV_DAY_ENTRY] && (!el.weekly || (el.weekly && obj.day == 0))) {
			ol.appendChild(entryBoxCreate(source[obj.day][PREV_DAY_ENTRY], obj.cssClass + ' ' + BOX_END_CLASS, obj.day, i, true));
		}
		for (var i = 0, box = list[i]; box; box = list[++i]) {
			ol.appendChild(entryBoxCreate(box, obj.cssClass, obj.day, i));
		}
		return ol;
	}

	function entryBoxRelated(data, day, ind) {
		var startTime = START_TIME_INT,
			endTime = data.endTime - MIDNIGHT;
		//{ startTime: START_TIME_INT, endTime: box.endTime - MIDNIGHT, data: { day: day, entry: i } }
		this.data = data;
		this.day = day;
		this.ind = ind;
		this.cl = BOX_CLASS;
		this.isPrevDayEntry = true;
		this.width = getUnits(endTime - startTime);
		this.left = getLeft(startTime, this.day);
		console.log(this.html.ctrl);
		return this.html;
	}

	entryBoxRelated.prototype = Object.create(entryBox.prototype, {
		cssClassStartEnd: {
			get: function () {
				return BOX_END_CLASS;
			}
		},
		html: {
			get: function () {
				var li = Dom.create('li', this.cssClass);

				Dragon.extend(li.style, { left: this.left + '%', width: this.width + '%' });

				li.appendChild(this.nonPresentHTML);

				li.ctrl = this;

				return li;
			}
		}
	});

	function entryBox(data, day, ind, cl) {
		var startTime = data.startTime,
			endTime = data.endTime,
			relatedEl;

		this.data = data;
		this.day = day;
		this.ind = ind;
		this.cl = cl;
		this.width = getUnits(endTime - startTime);
		this.left = getLeft(startTime, this.day);
		this.scheduledTime = (el.weekly && data.nodeID != nodeID) ? 0 : (data.endTime - data.startTime);
		this.breakTime = data.breakTime || 0
		//console.log(this.html.ctrl);
		return this.html;
	}

	entryBox.prototype = {
		get cssClass() {
			var arr = [this.cl],
				addClass = this.cssClassAddition,
				startEndClass = this.cssClassStartEnd;

			addClass && arr.push(addClass);
			startEndClass && arr.push(startEndClass);

			return arr.join(' ');
		},
		get cssClassAddition() {
			return this.data.nodeID && ((currentContract && this.data.nodeID != currentContract['node_id']) || (el.weekly && this.data.nodeID != nodeID)) ? 'sch-hired' :
			(this.data.department && (currentContract && this.data.department.departmentID != currentContract['department_id'] || (currEmployee && currEmployee.Department.DepartmentID != this.data.department.departmentID)) ?
			'sch-no-default' : null);
		},
		get cssClassStartEnd() {
			return (this.data.endTime > MIDNIGHT && !this.isPrevDayEntry && (!el.weekly || this.day == 6)) ?
				BOX_START_CLASS : null;
		},
		get html() {
			var li = Dom.create('li', this.cssClass);

			Dragon.extend(li.style, { left: this.left + '%', width: this.width + '%' });

			li.ctrl = this;

			(!el.weekly)
			li.appendChild(this.text);

			li.appendChild(this.nonPresentHTML);

			return li;
		},
		get nonPresentHTML() {
			var source = currEmployee ? scheduleData[currEmployee.key] : scheduleData,
				list,
				fragment = document.createDocumentFragment(),
				startTime = this.isPrevDayEntry ? START_TIME_INT : this.data.startTime,
				endTime = this.isPrevDayEntry ? this.data.endTime - MIDNIGHT : this.data.endTime,
				span,
				left,
				width,
				nonPresentPeriod = [];

			this.nonPresentTime = 0;

			if (dataSource.presenceCodes && this.data.HourCodeID && this.data.HourCodeID != -1) {
				if (dataSource.presenceCodes.indexOf(this.data.HourCodeID) == -1)
					nonPresentPeriod.push({ startTime: startTime, endTime: endTime });
			} else {
				list = source[this.day] ? source[this.day][VACATION_TABLE_NAME] : [];
				list = list.concat(source[this.day] ? source[this.day][ILLNESS_TABLE_NAME] : []);
				list = list.concat(source[this.day] ? source[this.day][HOLIDAY_TABLE_NAME] : []);
				for (var i = 0, entry = list[i]; entry; entry = list[++i]) {
					if (startTime >= entry.endTime || endTime <= entry.startTime) continue;
					if (!checkForIntersection(nonPresentPeriod, { startTime: Math.max(entry.startTime, startTime), endTime: Math.min(entry.endTime, endTime) }))
						nonPresentPeriod.push({
							startTime: Math.max(entry.startTime, startTime),
							endTime: el.weekly && this.day != 6 && entry.endTime - entry.startTime == MIDNIGHT ? endTime : Math.min(entry.endTime, endTime)
						});
				}
			}
			for (var i = 0, entry = nonPresentPeriod[i]; entry; entry = nonPresentPeriod[++i]) {
				span = Dom.create('span', NON_PRESENT_CLASS);
				left = (getUnits(entry.startTime - startTime) / this.width) * 100;
				width = (getUnits(entry.endTime - entry.startTime) / this.width) * 100;
				Dragon.extend(span.style, { left: left + '%', width: width + '%' });
				fragment.appendChild(span);
				this.nonPresentTime += this.isPrevDayEntry ? 0 : ((el.weekly && this.day == 6 ? endTime : entry.endTime) - entry.startTime);
			}
			return fragment;
		},
		get text() {
			var span = Dom.create('span', TEXT_CLASS);

			span.innerHTML = this.data.data ? '' : (createStringTimeInterval(this.data.startTime, this.data.endTime) + (this.data.department
										? ' (' + (this.data.nodeID != currentContract['node_id']
											? nodeData[this.data.nodeID].nodeCode
											: this.data.department.code) + ')'
										: ''));

			return span;
		}
	}

	function entryBoxCreate(box, cl, day, i, isPrevDayEntry) {
		if (box.li) return box.li;

		var additionClass = box.nodeID && ((box.nodeID != (currentContract ? currentContract['node_id'] : nodeID)) || (el.weekly && box.nodeID != nodeID)) ? ' sch-hired' :
				(box.department && (currentContract && box.department.departmentID != currentContract['department_id'] || (currEmployee && currEmployee.department.departmentID != box.department.departmentID)) ?
				' sch-no-default' : ''),
			li = Dom.create('li', cl + additionClass),
			startTime = isPrevDayEntry ? START_TIME_INT : box.startTime,
			endTime = isPrevDayEntry ? box.endTime - MIDNIGHT : box.endTime,
			left,
			width,
			relatedEl;
		left = getLeft(startTime, day);
		if (box.endTime > MIDNIGHT && !isPrevDayEntry && (!el.weekly || day == 6)) {
			width = getUnits(MIDNIGHT - box.startTime);
			scheduledTime += (el.weekly || el.daily) & box.nodeID != nodeID ? 0 : ((el.weekly || el.daily ? box.endTime : MIDNIGHT) - box.startTime);
			Dragon.Class.add(li, BOX_START_CLASS);
			if (!el.weekly && !el.daily) {
				var relBox = { startTime: START_TIME_INT, endTime: box.endTime - MIDNIGHT, data: { day: day, entry: i } };
				relatedEl = entryBoxCreate(relBox, cl + ' ' + BOX_END_CLASS + additionClass, /*day*/(day + 1) % 7, i);
				li.main = 1;
				relatedEl.related = li;
				entryFromBeforDay = { li: relatedEl };
			}
		} else {
			width = getUnits(endTime - startTime);
			scheduledTime += (isPrevDayEntry || ((el.weekly || el.daily) && box.nodeID != nodeID)) ? 0 : (box.endTime - box.startTime);
		}
		if (!el.weekly) {
			var span = Dom.create('span', TEXT_CLASS);
			span.innerHTML = box.data ? '' : (createStringTimeInterval(box.startTime, box.endTime) + (box.department
										? ' (' + (box.nodeID != (currentContract ? currentContract['node_id'] : nodeID)
											? nodeData[box.nodeID].nodeCode
											: box.department.code) + ')'
										: ''));
			li.appendChild(span);
		}
		box.nodeID == nodeID && entryPeriods.push({ startTime: startTime, endTime: endTime });
		breaksTime += isPrevDayEntry ? 0 : box.breakTime || 0;
		Dragon.extend(li.style, { left: left + '%', width: width + '%' });
		li.data = box.data || { day: day, isPrevDayEntry: isPrevDayEntry, entry: i };
		box.data = null;
		if (el.weekly && !li.data.employee) {
			li.data.employee = currEmployee.key;
		}
		li.related = relatedEl;
		li.appendChild(entryBoxNonPresentCreate(box, day, width, isPrevDayEntry));
		//Dragon.Event.add(li, 'mouseenter', tooltipShow, false);
		Event.add(li, 'mouseenter', entryBoxHoverSet, false);
		//Dragon.Event.add(li, 'mouseleave', tooltipHide, false);
		Event.add(li, 'mouseleave', entryBoxHoverRemove, false);

		//Dragon.Event.add(li, 'click', entryBoxSelectionSet, false);
		//Dragon.Event.add(li, 'dblclick', entryBoxEdit, false);
		return li;
	}

	function entryBoxAddToRow(box, day, ind, cnt) {
		cnt = cnt || el.querySelector('.' + BODY_SCH_CLASS);

		var row = cnt.querySelectorAll('t-row')[day],
			entryRow = Dom.getElementsByClass(row, ENTRY_CLASS)[0],
			beforeBox = ind != null ? Dom.getElementsByClass(entryRow, BOX_CLASS)[ind] : null;
		if (beforeBox) {
			entryRow.insertBefore(entryBoxCreate(box, BOX_CLASS, null, null), beforeBox);
		} else {
			entryRow.appendChild(entryBoxCreate(box, BOX_CLASS, null, null));
		}
	}

	function entryBoxSelectionSet(e) {
		if (selectedBox == this && !this.data.isPrevDayEntry && !opt.readOnly) {
			Event.raise(el, 'action', { action: 'scheduleEntrySelect' });
			Event.raise(selectedBox, 'action', { action: 'scheduleEntryEdit' });
			//entryBoxEdit.call(selectedBox);
		} else {
			selectedBox = this;
			Event.raise(el, 'action', { action: 'scheduleEntrySelect' });
			if (!(e.evtData && e.evtData.selectOnly))
				tooltipShow.call(selectedBox);
		}
		Dragon.Class.add(selectedBox, 'selected');
		if (selectedBox.related) {
			Dragon.Class.add(selectedBox.related, 'selected');
		}
	}

	function entryBoxSelectionRemove() {
		if (selectedBox != null) {
			Dragon.Class.remove(selectedBox, 'selected');
			if (selectedBox.related) {
				Dragon.Class.remove(selectedBox.related, 'selected');
			}
			selectedBox = null;
			Event.raise(el, 'action', { action: 'scheduleEntrySelect' });
		}
	}

	function entryBoxHoverSet() {
		Dragon.Class.add(this, 'hover');
		if (this.related) {
			Dragon.Class.add(this.related, 'hover');
		}
	}

	function entryBoxHoverRemove() {
		Dragon.Class.remove(this, 'hover');
		if (this.related) {
			Dragon.Class.remove(this.related, 'hover');
		}
	}

	function entryBoxGet(day, ind) {
		var row = entryRowGet(day),
			entryBox = Dom.getElementsByClass(row, BOX_CLASS)[ind];
		return entryBox;
	}

	function entryBoxEdit() {
		var editEl = this,
			day = this.data.day,
			data = scheduleData[day][ENTRIES_TABLE_NAME][this.data.entry],
			popupOpts = {
				modal: true,
				submit: function (obj) { return entryBoxSave(obj, editEl); },
				title: 'SCHEDULE ENTRY',
				positionOptions: 'center',
				buttons: [{
					action: 'save',
					icon: 'ficon-tick',
					id: 'btnOk',
					text: 'Ok'
				}, {
					action: 'cancel',
					icon: 'ficon-tick',
					id: 'btnCancel',
					text: 'Cancel'
				}],
				defaultButton: 0,
				cancelButton: 1,
				close: true
			},
			popup = Popup.showForm('fragments/scheduleEntryAddEditShort.htm', popupOpts);

		Promise.all([getWeekDays(), popup]).then(function (obj) {
			var weekDays = obj[0],
				select = obj[1].querySelector('ctrl-select'),
				view = obj[1].querySelector('ctrl-view');

			select.displayMember = 'text';
			select.valueMember = 'value';
			select.dataSource = weekDays;
			select.value = day;

			view.dataSource = data;

			/*
			if (!popup) return;
			popup.loaded.then(function () {
				attachEndTimePrefill(popup);
				Dragon.Event.raise(editEl, 'entry_edit', { entry: data, popup: popup })
			});
			*/
		});
	}

	function entryBoxAdd() {
		Dragon.Event.raise(editEl, 'add_entry', { entry: data });
		var popupOpts = {
			modal: true,
			submit: function (obj) { return entryBoxSave(obj, editEl); },
			title: 'SCHEDULE ENTRY',
			positionOptions: 'center',
			buttons: [{
				action: 'save',
				icon: 'ficon-tick',
				id: 'btnOk',
				text: 'Ok'
			}, {
				action: 'cancel',
				icon: 'ficon-tick',
				id: 'btnCancel',
				text: 'Cancel'
			}],
			defaultButton: 0,
			cancelButton: 1,
			close: true
		},
			popup = Popup.showForm('fragments/scheduleEntryAddEditShort.htm', popupOpts);

		Promise.all([getWeekDays(), popup]).then(function (obj) {
			var weekDays = obj[0],
				select = obj[1].querySelector('ctrl-select'),
				view = obj[1].querySelector('ctrl-view');

			select.displayMember = 'text';
			select.valueMember = 'value';
			select.dataSource = weekDays;

			if (selectedRow)
				select.value = selectedRow;

			/*
			if (!popup) return;
			popup.loaded.then(function () {
				attachEndTimePrefill(popup);
				Event.raise(el, 'entry_add', { day: selectedRow, popup: popup });
			});
			*/
		});
		/*
		Dragon.Promise.when([getWeekDays(),
			Dragon.ajax({
				accept: 'text/html',
				service: opt.editTemplate
			})])
		.then(function (obj) {
			var popupOpt = {
				action: function (obj) { return entryBoxSave(obj); },
				title: 'SCHEDULE ENTRY',
				ConfirmText: 'OK',
				CancelText: 'CANCEL'
			},
				addEditTemplate = Dom.parse(obj[1].value),
				popup;
			popup = Dragon.PopUp.openForm(addEditTemplate, popupOpt);
			if (!popup) return;
			popup.loaded.then(function () {
				attachEndTimePrefill(popup);
				Event.raise(el, 'entry_add', { day: selectedRow, popup: popup });
			});
			//popup.completed.then();
		});*/
	}

	function attachEndTimePrefill(popup) {
		var tbStart = Dom.getElementsByAttribute(popup.element, 'name', 'startTime')[0].ctrlWrapper.ctrl,
			tbEnd = Dom.getElementsByAttribute(popup.element, 'name', 'endTime')[0].ctrlWrapper.ctrl;
		if (tbStart && tbEnd) {
			Event.add(tbStart.origEl, 'change', function () {
				if (tbEnd.value() == 0) {
					tbEnd.setValue(tbStart.value());
				}
			}, false);
		}
	}

	function entryBoxDelete() {
		dataSourceEntryBoxDelete(this.data.day, this.data.entry);
		render();
	}

	function entryBoxSave(data, editEl) {
		var day = parseInt(data.weekday),
			box = data.entryBox;

		return new Promise(function (resolve, reject) {
			if (entryBoxValidate(box, day, editEl)) {
				if (editEl) {
					dataSourceEntryBoxDelete(editEl.data.day, editEl.data.entry);
				}
				var ind = dataSourceEntryBoxAdd(day, box),
					li;
				render();
				li = entryBoxGet(day, ind);
				clearSelection();
				//Dragon.Event.raise(li, 'click', { selectOnly: true });
				//Dragon.Event.raise(li, Dragon.Event.types.pointerDown, { selectOnly: true });
				resolve();
				//Event.raise(li, 'tap', { selectOnly: true });
			} else
				reject({ 'message': WC.text('ENTRY_OVERLAP_ERROR'), 'status': 0 });
		});
	}

	function entryBoxValidate(box, day, editEl) {

		if (el.daily) {
			return entryBoxValidateForDay(box, currEmployee.key, editEl);
		}

		var isValid = entryBoxValidateForDay(box, day, editEl);
		if (isValid && box.endTime > 1440 && (day != 6 || el.allowTransferFromEndToStartWeek)) {
			isValid = entryBoxValidateForDay({ startTime: 0, endTime: box.endTime - 1440 }, (day + 1) % 7, editEl);
		}
		if (isValid && (day != 0 || el.allowTransferFromEndToStartWeek)) {
			isValid = entryBoxValidateForDay({ startTime: box.startTime + MIDNIGHT, endTime: box.endTime + MIDNIGHT }, (day + 6) % 7, editEl);
		}
		return isValid;
	}

	function entryBoxValidateForDay(box, day, editEl) {
		var excInd = (editEl && editEl.data.day == day) ? editEl.data.entry : null,
			prevDayEntrie = !(editEl && editEl.data.isPrevDayEntry) ? scheduleData[day][PREV_DAY_ENTRY] : null,
			entries = scheduleData[day][ENTRIES_TABLE_NAME],
			isValid = true;

		if (prevDayEntrie && !(box.startTime >= prevDayEntrie.endTime - MIDNIGHT || box.endTime <= 0))
			return false;

		for (var i = 0, entry = entries[i]; entry; entry = entries[++i]) {
			if (excInd != null && excInd == i)
				continue;
			if (!(box.startTime >= entry.endTime || box.endTime <= entry.startTime)) {
				isValid = false;
				break;
			}
		}
		return isValid;
	}

	function entryBoxNonPresentCreate(box, day, boxWidth, isPrevDayEntry) {
		var source = currEmployee ? scheduleData[currEmployee.key] : scheduleData,
			list,
			fragment = document.createDocumentFragment(),
			startTime = isPrevDayEntry ? START_TIME_INT : box.startTime,
			endTime = isPrevDayEntry ? box.endTime - MIDNIGHT : box.endTime,
			span,
			left,
			width,
			nonPresentPeriod = [];
		if (dataSource.presenceCodes && box.hourCodeID && box.hourCodeID != -1) {
			if (dataSource.presenceCodes.indexOf(box.hourCodeID) == -1)
				nonPresentPeriod.push({ startTime: startTime, endTime: endTime });
		} else {
			list = source[day] ? source[day][VACATION_TABLE_NAME] : [];
			list = list.concat(source[day] ? source[day][ILLNESS_TABLE_NAME] : []);
			list = list.concat(source[day] ? source[day][HOLIDAY_TABLE_NAME] : []);
			for (var i = 0, entry = list[i]; entry; entry = list[++i]) {
				if (startTime >= entry.endTime || endTime <= entry.startTime) continue;
				if (!checkForIntersection(nonPresentPeriod, { startTime: Math.max(entry.startTime, startTime), endTime: Math.min(entry.endTime, endTime) }))
					nonPresentPeriod.push({
						startTime: Math.max(entry.startTime, startTime),
						endTime: el.weekly && day != 6 && entry.endTime - entry.startTime == MIDNIGHT ? endTime : Math.min(entry.endTime, endTime)
					});
			}
		}
		for (var i = 0, entry = nonPresentPeriod[i]; entry; entry = nonPresentPeriod[++i]) {
			span = Dom.create('span', NON_PRESENT_CLASS);
			left = (getUnits(entry.startTime - startTime) / boxWidth) * 100;
			width = (getUnits(entry.endTime - entry.startTime) / boxWidth) * 100;
			Dragon.extend(span.style, { left: left + '%', width: width + '%' });
			fragment.appendChild(span);
			nonPresentTime += isPrevDayEntry ? 0 : ((el.weekly && day == 6 ? endTime : entry.endTime) - entry.startTime);
			nonPresentPeriods.push({ startTime: entry.startTime, endTime: entry.endTime });
		}
		return fragment;
	}

	function checkForIntersection(cont, box) {
		for (var i = 0, entry = cont[i]; entry; entry = cont[++i]) {
			if (box.startTime > entry.endTime || box.endTime < entry.startTime) continue;
			entry.startTime = Math.min(box.startTime, entry.startTime);
			entry.endTime = Math.max(box.endTime, entry.endTime);
			return true;
		}
		return false;
	}

	function dataSourceEntryBoxAdd(day, box) {
		var key = el.daily ? currEmployee.key : day,
			entries = scheduleData[key][ENTRIES_TABLE_NAME],
			ind = 0;
		for (var i = 0, entry = entries[i]; entry; entry = entries[++i]) {
			if (box.startTime >= entry.endTime)
				ind = i + 1;
		}
		scheduleData[key][ENTRIES_TABLE_NAME].splice(ind, 0, box);
		return ind;
	}

	function dataSourceEntryBoxDelete(day, ind) {
		scheduleData[day][ENTRIES_TABLE_NAME].splice(ind, 1);
	}
	//not used
	function dataSourceSave() {
		if (!Dragon.Form.validate(document.forms[0])) return;
		var data = { data: scheduleData };
		if (el.ctrl.addDataToPostData)
			el.ctrl.addDataToPostData(data);
		Dragon.ajax({
			service: el.dataProvider.source,
			method: 'node/{nodeID}/employee/{employeeID}/date/{date}',
			verb: 'POST',
			data: JSON.stringify(data)
		}).then(function (obj) {
			if (el.ctrl.scheduleSaveResolve)
				el.ctrl.scheduleSaveResolve(obj.value);
		});
	}

	function createPeriodSpan(obj, table) {
		var fragment = document.createDocumentFragment(),
			source = currEmployee ? scheduleData[currEmployee.key] : scheduleData,
			list = source[obj.day] && source[obj.day][table.name] ? source[obj.day][table.name] : [];

		if (!Array.isArray(list)) {
			list = [{
				startTime: list.fromTime,
				endTime: list.toTime
			}];
		}

		for (var i = 0, box = list[i]; box; box = list[++i]) {
			fragment.appendChild(scheduleEntryCreate(box, obj.day, table.cssClass));

			if ((table.name == AVAILABILITY_TABLE_NAME || table.name == SCHOOL_TABLE_NAME) && (el.weekly && obj.day == 6 && box.endTime > MIDNIGHT)) {
				fragment.appendChild(scheduleEntryCreate({ startTime: 0, endTime: box.endTime - MIDNIGHT }, 0, table.cssClass));
			}
		}
		return fragment;
	}

	function scheduleEntryCreate(box, day, cssClass) {
		var li = Dom.create('li', cssClass),
				left = getLeft(box.startTime, day),
				width = getWidth(box, day);
		Dragon.extend(li.style, { left: left + '%', width: width + '%' });
		return width > 0 ? li : document.createDocumentFragment();
	}

	function tooltipShow(e) {
		var popup = Dom.create('ctrl-window'),
			ul = Dom.create('ul', 'ctrl-tooltip'),
			day = this.data.day,
			source = el.weekly ? scheduleData[this.data.employee] : scheduleData,
			data = this.data.isPrevDayEntry ?
				source[day][PREV_DAY_ENTRY] :
				source[day][ENTRIES_TABLE_NAME][this.data.entry],
			time = createStringTimeInterval(data.startTime, data.endTime) +
				' (' + createStringTimeSpan(data.startTime, data.endTime, data.breakTime) + ')';
		ul.appendChild(tooltipRowCreate('TIME', time));
		if (data.breakTime != null)
			ul.appendChild(tooltipRowCreate('BREAKS', DT.formatTime(data.breakTime)));
		if (data.nodeID != null && nodeData[data.nodeID])
			ul.appendChild(tooltipRowCreate('NODE', nodeData[data.nodeID].nodeName + ' (' + nodeData[data.nodeID].nodeCode + ')'));
		if (data.department != null)
			ul.appendChild(tooltipRowCreate('DEPARTMENT_SHORT', data.department.departmentName + ' (' + data.department.code + ')'));
		if (data.hourCodeID != null && data.hourCodeID != -1)
			ul.appendChild(tooltipRowCreate('CODE', data.hourCode));
		if (data.notes != null && data.notes != '')
			ul.appendChild(tooltipRowCreate('NOTES', data.notes));
		/*
		var popup = Dragon.PopUp.open(ul, {
			relative: this
		});
		popup.loaded.then(function () { tooltip = true; });
		popup.completed.then(function () { tooltip = false; });
		*/
		popup.appendChild(ul);
		document.body.appendChild(popup);
		Win.open(popup, {
			relEl: this,
			positionOptions: 'left below'
		});
	}

	function tooltipHide() {
		if (tooltip) {
			Win.close();
		}
	}

	function tooltipRowCreate(label, text) {
		var li = document.createElement('li'),
			span = document.createElement('span'),
			text = document.createTextNode(text);

		span.setAttribute('data-res', label);

		li.appendChild(span);
		li.appendChild(text);

		return li;
	}

	function createStringTimeInterval(from, to) {
		return DT.formatTime(from) +
			' - ' + DT.formatTime(to);
	}

	function createStringTimeSpan(from, to, breakTime) {
		return DT.formatTime(to - from - (breakTime || 0));
	}

	function getLeft(startTime, day) {
		return getUnits(startTime - START_TIME_INT) + (el.weekly ? dimension * DAY_HOURS * hourTimeInterval * day : 0);
	}

	function getWidth(box, day) {
		return getUnits((el.weekly && day < 6 ? box.endTime : Math.min(box.endTime, END_TIME_INT * 60)) - box.startTime);
	}

	function getUnits(time) {
		return Math.round(time / timespan) * dimension;
	}

	function rowSelectionSet(evt, num) {
		var row,
			target = Dom.parent(evt.target, '.schedule-item'),
			entryBox = selectedBox;
		clearSelection();
		if (target)
			selectedBox = entryBox;
		selectedRow = num;
		row = rowGetByNumber(selectedRow);
		Dragon.Class.add(row.lbRow, 'selected');
		Dragon.Class.add(row.schRow, 'selected');
		//attachClearSelection();

		if (el.weekly || el.daily) {
			currEmployee = dataSource.employees[Object.keys(dataSource.employees)[num]];
		}
	}

	function rowSelectionRemove() {
		if (selectedRow != null) {
			row = rowGetByNumber(selectedRow);
			Dragon.Class.remove(row.lbRow, 'selected');
			Dragon.Class.remove(row.schRow, 'selected');
			selectedRow = null;
		}
	}

	function rowHoverSet(e, num) {
		var row;
		row = rowGetByNumber(num);
		Dragon.Class.add(row.lbRow, 'hover');
		Dragon.Class.add(row.schRow, 'hover');
	}

	function rowHoverRemove(e, num) {
		var row;
		row = rowGetByNumber(num);
		Dragon.Class.remove(row.lbRow, 'hover');
		Dragon.Class.remove(row.schRow, 'hover');
	}

	function clearSelection() {
		rowSelectionRemove();
		entryBoxSelectionRemove();
		//detachClearSelection();
	}

	function rowGetByNumber(num) {
		var labelRow = el.querySelectorAll('ctrl-grid t-row')[num],
			scheduleRow = el.querySelectorAll('.' + BODY_SCH_CLASS + ' t-row')[num];
		return { lbRow: labelRow, schRow: scheduleRow };
	}

	function attachClearSelection() {
		Event.add(document, 'click', clearSelection, true);
	}

	function detachClearSelection() {
		Event.remove(document, 'click', clearSelection, true);
	}

	function editButtonClick() {
		if (selectedBox == null) return;
		entryBoxEdit.call(selectedBox);
	}

	function deleteButtonClick() {
		if (selectedBox == null) return;
		entryBoxDelete.call(selectedBox);
	}

	function employee() {
		return Dragon.UserData.get();
	}

	function contractGet(date, key) {
		if (!contractData) {
			var src = currEmployee ? currEmployee : (dataSource.employees ? dataSource.employees[key] : null);

			return src ?
			{
				department_id: src.department.departmentID,
				node_id: src.nodeID
			} :
			null;
		}

		for (var i = 0, contract = contractData[0]; contract; contract = contractData[++i]) {
			if (date >= contract['from_date'] && date <= contract['to_date'])
				return contract;
		}
		return null;
	}

	function getWeekDays() {
		var result;
		if (!weekDaySource) {
			return Dragon.xhr({
				//api: 'weekday/node/{nodeID}',
				api: 'weekday/' + nodeID,
				data: JSON.stringify({ nodeID: /*employee()['NodeID']*/ nodeID })
			}).then(function (obj) {
				weekDaySource = [];
				for (var k in obj) {
					if (!obj.hasOwnProperty(key)) continue;
					
					weekDaySource.push({ value: obj[k].value, text: obj[k].text/*Dragon.Globalization.getText(obj[k].text)*/ });
				}

				return weekDaySource;
			});
		}
		return weekDaySource;
	}

	function visibilitySettingsGet() {
		var userKey = 'manus_user_data__' + Dragon.User.id,
			stored = localStorage.getItem(userKey),
			userSettings = stored ? JSON.parse(stored) : {};

		return userSettings.scheduleVisibility || [];
	}

	function visibilitySettingsSet(scheduleVisibility) {
		var userKey = 'manus_user_data__' + Dragon.User.id,
			stored = localStorage.getItem(userKey),
			userSettings = stored ? JSON.parse(stored) : {};

		userSettings.scheduleVisibility = scheduleVisibility;

		localStorage.setItem(userKey, JSON.stringify(userSettings));
	}

	function visibilitySet() {
		var scheduleVisibility = visibilitySettingsGet(),
			visibilityEnum = getVisibilityEnum(),
			keys = Object.keys(visibilityEnum),
			entries;

		for (var key in keys) {
			if (!visibilityEnum.hasOwnProperty(keys[key]))
				continue;

			entries = el.querySelectorAll(visibilityEnum[keys[key]].selector);
			var value = scheduleVisibility.indexOf(parseInt(key)) == -1 ? '' : 'none';

			for (var j = 0, entry = entries[j]; entry; entry = entries[++j]) {
				entry.style.display = value;
			}
		}
	}

	function getVisibilityEnum() {
		return {
			available: {
				selector: '.' + AVAIL_SCH_CLASS
			},
			school: {
				selector: '.' + SCHOOL_SCH_CLASS
			},
			illness: {
				selector: '.' + ILLNESS_CLASS
			},
			vacation: {
				selector: '.' + VACATION_CLASS
			},
			holiday: {
				selector: '.' + HOLIDAY_CLASS
			}
		}
	}

	function showHideEntry(entryType) {
		var selector = '.',
			entries,
			userKey = 'manus_user_data__' + Dragon.User.id,
			scheduleVisibility = visibilitySettingsGet(),
			show;

		switch (entryType) {
			case 'school':
				selector += SCHOOL_SCH_CLASS;

				if (scheduleVisibility.indexOf(1) == -1) {
					show = true;
					scheduleVisibility.push(1);
				} else {
					show = false;
					scheduleVisibility.splice(scheduleVisibility.indexOf(1), 1);
				}

				break;
			case 'available':
				selector += AVAIL_SCH_CLASS;

				if (scheduleVisibility.indexOf(0) == -1) {
					show = true;
					scheduleVisibility.push(0);
				} else {
					show = false;
					scheduleVisibility.splice(scheduleVisibility.indexOf(0), 1);
				}

				break;
			case 'vacation':
				selector += VACATION_CLASS;
				break;
			case 'holiday':
				selector += HOLIDAY_CLASS;
				break;
			case 'illness':
				selector += ILLNESS_CLASS;
				break;
		}

		entries = el.querySelectorAll(selector);

		for (var i = 0, entry = entries[i]; entry; entry = entries[++i]) {
			entry.style.display = show ? 'none' : '';
		}

		visibilitySettingsSet(scheduleVisibility);

		return !show;
	}

	return WC.register('ctrl-schedule', {
		lifecycle: {
			created: function () {
				this.ctrl = {};
				this.weekly = !!this.weekly;
				this.allowTransferFromEndToStartWeek = !!this.allowTransferFromEndToStartWeek;
				dimension = this.weekly ? coef / 7 : coef;
				opt.hoursInInterval = this.weekly ? 6 : hoursInInterval;
				init(this);
			}
		},
		dataSource: {
			get: function () {
				return this.ctrl.dataSource;
			},
			set: function (value) {
				this.ctrl.dataSource = value;
				setDataSource(this, value);
			}
		},
		nodeData: {
			get: function () {
				return nodeData;
			}
		},
		date: {
			get: function () {
				return this.ctrl.date;
			},
			set: function (value) {
				this.ctrl.date = value;
			}
		},
		nodeID: {
			get: function () {
				return this.ctrl.nodeID;
			},
			set: function (value) {
				this.ctrl.nodeID = value;
			}
		},
		contracts: {
			get: function () {
				return contractData;
			}
		},
		scheduledTime: {
			get: function () {
				return scheduledTime - breaksTime;
			}
		},
		scheduledTimeWithoutBreaks: {
			get: function () {
				return scheduledTime - breaksTime;
			}
		},
		nonPresentTime: {
			get: function () {
				return nonPresentTime;
			}
		},
		breaks: {
			get: function () {
				return breaksTime;
			}
		},
		totals: {
			get: function () {
				return dataSource.totals;
			}
		},
		entryPeriods: {
			get: function () {
				return entryPeriods;
			}
		},
		nonPresentPeriods: {
			get: function () {
				return nonPresentPeriods;
			}
		},
		weekly: {
			attribute: { boolean: true }
		},
		daily: {
			attribute: { boolean: true }
		},
		allowTransferFromEndToStartWeek: {
			attribute: { boolean: true }
		},
		showHideEntry: showHideEntry,
		visibilitySet: visibilitySet,
		add: entryBoxAdd,
		entryBoxSave: entryBoxSave,
		'delete': deleteButtonClick,
		selected: {
			get: function () {
				return {
					selectedBox: selectedBox,
					data: selectedBox ? scheduleData[selectedBox.data.day][ENTRIES_TABLE_NAME][selectedBox.data.entry] : null
				};
			}
		},
		selectedRow: {
			get: function () {
				return selectedRow;
			}
		}
	});
});