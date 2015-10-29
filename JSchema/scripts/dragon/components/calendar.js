Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/event', 'dragon/datetime', 'dragon/gesture', 'dragon/dom', 'dragon/dialog', 'dragon/binding', 'dragon/components/button', 'dragon/components/calendar.html'], function (WC, Class, Event, DateTime, Gesture, Dom, Dialog, Binding, Button, doc) {
	var INPUT_TYPES = {
		date: "date",
		week: "week",
		month: "month",
		time: "time"
	},
		VALUE_TYPES = {
			number: 'number',
			date: 'date'
		},
		UI_TYPES = {
			flat: 'flat',
			touch: 'touch'
		},
		ZOOM_MODE = {
			none: 'none',
			month: 'month',
			decade: "decade"
		},
		TEXTS = translate(),
		touch = ('ontouchstart' in window) || !!window.navigator.msMaxTouchPoints,
		startWeek = Dragon.config.startWeek || 0,
		firstWeek = Dragon.config.firstWeek || 2,
		spinStep = 30;

	WC.appendStyle(doc);

	function translate() {
		var res = {
			today: "TODAY",
			ok: "SELECT",
			cancel: "CANCEL",
			months: ["JANUARY_FULL", "FEBRUARY_FULL", "MART_FULL", "APRIL_FULL", "MAY_FULL", "JUNE_FULL", "JULY_FULL", "AUGUST_FULL", "SEPTEMBER_FULL", "OCTOBER_FULL", "NOVEMBER_FULL", "DECEMBER_FULL"],
			monthShort: ["JANUARY", "FEBRUARY", "MART", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"],
			weekdays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
			weekdaysShort: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
			day: "DAY",
			week: "WEEK",
			month: "MONTH",
			year: "YEAR",
			date: "DATE",
			time: "TIME",
			hour: "HOUR",
			minutes: "MINUTES",
			ampm: "AM/PM"
		};

		for (var k in res) {
			if (res[k] instanceof Array) {
				for (var i = 0, item = res[k][i]; item; item = res[k][++i]) {
					res[k][i] = WC.text(item);
				}
			} else {
				res[k] = WC.text(res[k]);
			}
		}
		return res;
	}

	function invalidateText(calendar) {
		var date = calendar.ctrl.date;

		if (calendar.nullable && !date) {
			calendar.ctrl.input.value = '';
			return;
		}


		if (calendar.type == INPUT_TYPES.time) {
			calendar.ctrl.input.value = DateTime.formatTime(date, calendar.format);
			return;
		}

		if (calendar.type == INPUT_TYPES.week) {
			calendar.ctrl.input.value = padNumber(getWeekNumber(date)) + '-' + date.getFullYear();
			return;
		}

		if (calendar.type == INPUT_TYPES.month) {
			calendar.ctrl.input.value = (date.getMonth() + 1) + '-' + date.getFullYear();
			return;
		}

		calendar.ctrl.input.value = DateTime.formatDate(date, calendar.format);
	}

	function validateDate(calendar, oldVal) {
		invalidateText(calendar);

		if (calendar.nullable && !calendar.ctrl.date)
			return;

		if (calendar.ctrl.minDate && calendar.ctrl.date < calendar.ctrl.minDate) {
			calendar.ctrl.date = oldVal || calendar.ctrl.minDate;
			invalidateText(calendar);
		}

		if (calendar.ctrl.maxDate && calendar.ctrl.date > calendar.ctrl.maxDate) {
			calendar.ctrl.date = oldVal || calendar.ctrl.maxDate;
			invalidateText(calendar);
		}
	}

	function tap(evt) {
		var calendar = Dom.parent(evt.target, 'ctrl-calendar,.ctrl-calendar');

		if (!calendar)
			return;

		if (calendar.ctrl.uitype == UI_TYPES.flat && (calendar.type == INPUT_TYPES.date || calendar.type == INPUT_TYPES.time) && evt.target.tagName.toLocaleLowerCase() == 'input') {
			evt.target.focus();
			return;
		} else {
			if (calendar == document.activeElement || calendar.ctrl.input == document.activeElement)
				calendar.ctrl.input.blur();
		}

		if (Event.raise(calendar, 'before_open'))
			open(calendar);
	}

	function open(calendar) {
		if (calendar.disabled)
			return;

		if (calendar.ctrl.uitype == UI_TYPES.flat)
			calendar.ctrl.zoomMode = ZOOM_MODE.none;

		calendar.ctrl.displayDate = null;

		var section = createCalendar(calendar).querySelector('section');
		section._calendar = calendar;
		calendar._section = section;

		section.setAttribute('type', calendar.type);

		Class.add(section, 'ctrl-calendar-window');

		Dialog.showDialog(section, {
			relEl: calendar.ctrl.input,
			positionOptions: 'center,below,visible'
		});
	}

	function createFlatCalendar(calendar) {
		var main = doc.querySelector('#flat').content.cloneNode(true),
			date = calendar.ctrl.date;

		if (calendar.nullable && !date)
			date = new Date();

		createFlatHeader(main, calendar);

		createFlatContent(main, date, (calendar.type == INPUT_TYPES.month && calendar.ctrl.zoomMode == ZOOM_MODE.none) || calendar.ctrl.zoomMode == ZOOM_MODE.month,
			calendar.ctrl.zoomMode == ZOOM_MODE.decade, calendar.type == INPUT_TYPES.week);

		createFlatFooter(main, calendar);

		Event.add(main.querySelector('.inner'), 'click', process, false);

		return main;
	}

	function createFlatHeader(main, calendar) {
		var title = main.querySelector('header .title');

		title.appendChild(document.createTextNode(getFlatTittle(calendar)));

		Event.add(main.querySelector('header .icon-arrow-left'), 'click', slideStart);
		Event.add(main.querySelector('header .icon-arrow-right'), 'click', slideStart);
		Event.add(title, 'click', zoomIn, false);
	}

	function getFlatTittle(calendar) {
		var date = calendar.ctrl.date,
			currentDate;

		if (calendar.nullable && !date)
			date = new Date();

		currentDate = calendar.ctrl.displayDate || new Date(date);

		if ((calendar.type == INPUT_TYPES.month && calendar.ctrl.zoomMode == ZOOM_MODE.none) || calendar.ctrl.zoomMode == ZOOM_MODE.month)
			return currentDate.getFullYear();
		else if (calendar.ctrl.zoomMode == ZOOM_MODE.decade) {
			var yStart = ((currentDate.getFullYear() / 10) | 0) * 10;
			return yStart + " - " + (yStart + 9);
		} else
			return TEXTS.months[currentDate.getMonth()] + ' ' + currentDate.getFullYear();
	}

	function createFlatContent(main, date, month, yearPeriod, week) {
		var selM = date.getMonth(),
			selY = date.getFullYear(),
			content = main.querySelector('section'),
			data;

		if (month || yearPeriod)
			data = getFlatMonthData(selY, selM, month);
		else
			data = getFlatData(selY, selM, date, week);

		Binding.resolve(content, data);
	}

	function createFlatFooter(main, calendar) {
		var today = new Date(),
			date = calendar.ctrl.date;

		if (calendar.nullable && !date)
			date = new Date();

		var text = TEXTS.today + ', ',
			link = main.querySelector('footer a');

		if (calendar.type == INPUT_TYPES.week)
			text += TEXTS.week + ' ' + getCalendarWeek(today, date);
		else if (calendar.type == INPUT_TYPES.date)
			text += today.getDate() + ' ';

		text += TEXTS.months[today.getMonth()] + ' ' + today.getFullYear();

		link.innerHTML = text;

		Event.add(link, 'click', setToday);
	}

	function getFlatMonthData(selY, selM, month) {
		var yTen = getYearTen(selY) - 1,
			sm = month ? selM : selY - yTen,
			data = [
			{ items: [], week: false },
			{ items: [], week: false },
			{ items: [], week: false }],
			row = (sm / 4) | 0,
			col = (sm % 4) | 0;

		for (var i = 0; i < 12; i++)
			data[Math.floor(i / 4)].items.push({
				text: month ? TEXTS.monthShort[i] : yTen + i,
				selected: Math.floor(i / 4) == row && (i % 4) == col,
				'class': 'middle'
			});

		return data;
	}

	function getFlatData(selY, selM, date, week) {
		var start = getWeekDate(new Date(selY, selM, 1)),
			offset = dayDiff(date, start),
			row = 1 + (offset / 7) | 0,
			col = week ? -1 : 1 + (offset % 7) | 0,
			data = [
				{ week: true, items: [] },
				{ week: false, items: [] },
				{ week: false, items: [] },
				{ week: false, items: [] },
				{ week: false, items: [] },
				{ week: false, items: [] },
				{ week: false, items: [] }
			];

		setWeekHeader(data[0]);

		for (var i = 1; i < data.length; i++) {
			setWeekRow(data[i], start, date, row == i ? col : -1);

			if (col < 0 && row == i)
				data[i].selected = true;
		}

		return data;
	}

	function setWeekHeader(obj) {
		obj.items[0] = { week: true, text: TEXTS.week, 'class': 'small' };

		for (var i = 1; i <= 7; i++)
			obj.items[i] = { text: TEXTS.weekdaysShort[(startWeek + i - 1) % 7], 'class': 'small' };
	}

	function setWeekRow(obj, start, date, col) {
		obj.items[0] = { text: getCalendarWeek(start, date), week: true, 'class': 'small' };

		for (var i = 1; i <= 7; i++) {
			obj.items[i] = { text: start.getDate(), inactive: date.getMonth() != start.getMonth(), selected: i == col, 'class': 'small' };
			start.setDate(start.getDate() + 1);
		}
	}

	function createTouchCalendar(calendar) {
		var main = doc.querySelector('#touch').content.cloneNode(true);

		createTouchHeader(calendar, main);

		createTouchContent(calendar, main);

		createTouchFooter(calendar, main);

		Event.add(main.querySelector('section'), 'slot_changed', slotChanged, false);

		return main;
	}

	function createTouchHeader(calendar, main) {
		var title = main.querySelector('header .title');

		title.appendChild(document.createTextNode(getTouchTittle(calendar)));
	}

	function getTouchTittle(calendar) {
		var date = calendar.ctrl.displayDate || calendar.ctrl.date,
			text = '',
			separator = "-";

		if (calendar.nullable && !date)
			date = new Date();

		//TODO do we use format option here
		switch (calendar.type) {
			case "date":
				text = TEXTS.weekdaysShort[getWeekday(date)] + ', ' + padNumber(date.getDate()) + ' ' + TEXTS.monthShort[date.getMonth()] + ' ' + date.getFullYear();
				break;
			case "week":
				text = TEXTS.week + ': ' + padNumber(getWeekNumber(date)) + separator + date.getFullYear();
				break;
			case "month":
				text = TEXTS.month + ': ' + padNumber(date.getMonth() + 1) + separator + date.getFullYear();
				break;
			case "time":
				text = DateTime.formatTime(date);
				break;
			case "datetime":
				text = padNumber(date.getDate()) + separator + padNumber(date.getMonth() + 1) + separator + date.getFullYear() + ' ' + padNumber(date.getHours()) + separator +
					padNumber(date.getMinutes());
		}

		return text;
	}

	function createTouchContent(calendar, main) {
		var date = calendar.ctrl.date,
			content = main.querySelector('div.inner');

		var minYear = calendar.ctrl.minDate ? calendar.ctrl.minDate.getFullYear() : date.getFullYear() - 100,
			maxYear = calendar.ctrl.maxDate ? calendar.ctrl.maxDate.getFullYear() : date.getFullYear() + 100;

		if (calendar.nullable && !date)
			date = new Date();

		calendar.slots = [];

		switch (calendar.type) {
			case INPUT_TYPES.date:
				calendar.ctrl.slots.push(new SpinWheel(0, { title: TEXTS.day, value: date.getDate(), min: 1, max: 31 }));
				calendar.ctrl.slots.push(new SpinWheel(1, { title: TEXTS.month, value: date.getMonth() + 1, min: 1, max: 12, data: TEXTS.monthShort }));
				calendar.ctrl.slots.push(new SpinWheel(2, { title: TEXTS.year, value: date.getFullYear(), min: minYear, max: maxYear }));
				date = alignDate(calendar, alignMonth(calendar, date.getMonth(), date.getFullYear(), 1), date.getFullYear(), date.getDate());
				break;
			case INPUT_TYPES.week:
				calendar.ctrl.slots.push(new SpinWheel(0, { title: TEXTS.week, value: getWeekNumber(date), min: 1, max: getYearWeeks(date.getFullYear()) }));
				calendar.ctrl.slots.push(new SpinWheel(1, { title: TEXTS.year, value: date.getFullYear(), min: minYear, max: maxYear }));
				date = alignWeek(calendar, date.getFullYear(), getWeekNumber(date), 0);
				break;
			case INPUT_TYPES.month:
				calendar.ctrl.slots.push(new SpinWheel(0, { title: TEXTS.month, value: date.getMonth() + 1, min: 1, max: 12, data: TEXTS.monthShort }));
				calendar.ctrl.slots.push(new SpinWheel(1, { title: TEXTS.year, value: date.getFullYear(), min: minYear, max: maxYear }));
				alignMonth(calendar, date.getMonth(), date.getFullYear(), 0);
				break;
			case INPUT_TYPES.time:
				var step = calendar.granularity ? (calendar.granularity * 1) : 15,
					twelveHourFormat = Dragon.config.timePattern && Dragon.config.timePattern.indexOf('t') >= 0,
					minHour = twelveHourFormat ? 1 : 0,
					maxHour = twelveHourFormat ? 12 : 23,
					valHour = date.getHours();
				valHour = twelveHourFormat && valHour > 12 ? valHour - 12 : twelveHourFormat && valHour === 0 ? 12 : valHour;
				date.setMinutes(Math.round(date.getMinutes() / step) * step % 60);

				calendar.ctrl.slots.push(new SpinWheel(0, { title: TEXTS.hour, value: valHour, min: minHour, max: maxHour }));
				calendar.ctrl.slots.push(new SpinWheel(1, { title: TEXTS.minutes, value: date.getMinutes() / step, min: 0, max: 59, step: step }));

				if (twelveHourFormat) {
					var ampm = (date.getHours() / 12) < 1 ? 0 : 1;
					calendar.ctrl.slots.push(new SpinWheel(2, { title: TEXTS.ampm, value: ampm + 1, min: 1, max: 2, data: ["AM", "PM"] }));
				}
				break;
		}

		for (var i = 0, count = calendar.ctrl.slots.length; i < count; i++)
			content.appendChild(calendar.ctrl.slots[i].slot);
	}

	function createTouchFooter(calendar, main) {
		var buttons = main.querySelectorAll('.group-btn ctrl-button'),
			btnSelect = buttons[0],
			btnClose = buttons[1];

		Event.add(btnSelect, 'tap', function () {
			valueChanged(calendar, calendar.ctrl.displayDate || calendar.ctrl.date);
		});

		Event.add(btnClose, 'tap', function () {
			Dialog.close();
		});
	}

	function alignMonth(calendar, month, year, index) {
		var minDate = calendar.ctrl.minDate,
			maxDate = calendar.ctrl.maxDate;

		if (!minDate && !maxDate)
			return month;

		var minMonth = (minDate && (year == minDate.getFullYear())) ? minDate.getMonth() : 0,
		maxMonth = (maxDate && (year == maxDate.getFullYear())) ? maxDate.getMonth() : 11;

		calendar.ctrl.slots[index].setMin(minMonth + 1);
		calendar.ctrl.slots[index].setMax(maxMonth + 1);

		return Math.max(Math.min(month, maxMonth), minMonth);
	}

	function alignDate(calendar, month, year, date) {
		var maxDays = getMonthDays(month, year),
			newDay = date,
			minDate = calendar.ctrl.minDate,
			maxDate = calendar.ctrl.maxDate;

		if (!minDate && !maxDate) {
			calendar.ctrl.slots[0].setMax(maxDays);
			newDay = Math.min(maxDays, date);
		} else { // in case any limit is set align date to it
			var minDay = (minDate && (year == minDate.getFullYear()) && (month == minDate.getMonth())) ? minDate.getDate() : 1,
				maxDay = (maxDate && (year == maxDate.getFullYear()) && (month == maxDate.getMonth())) ? maxDate.getDate() : maxDays;
			calendar.ctrl.slots[0].setMin(minDay);
			calendar.ctrl.slots[0].setMax(maxDay);
			newDay = Math.max(Math.min(date, maxDay), minDay);
		}

		return new Date(year, month, newDay);
	}

	function alignWeek(calendar, year, week, index) {
		var minDate = calendar.ctrl.minDate,
			maxDate = calendar.ctrl.maxDate,
			minWeek = (minDate && (year == minDate.getFullYear())) ? getWeekNumber(minDate) : 1,
			maxWeek = (maxDate && (year == maxDate.getFullYear())) ? getWeekNumber(maxDate) : getYearWeeks(year);

		calendar.ctrl.slots[index].setMin(minWeek);
		calendar.ctrl.slots[index].setMax(maxWeek);

		return getWeekStartDate(year, Math.max(Math.min(week, maxWeek), minWeek));
	}

	function createCalendar(calendar) {
		var tmp;

		if (calendar.ctrl.uitype != UI_TYPES.touch && calendar.type != INPUT_TYPES.time)
			tmp = createFlatCalendar(calendar);
		else
			tmp = createTouchCalendar(calendar);

		return tmp;
	}

	function textboxFocus(evt) {
		var calendar = Dom.parent(evt.target, 'ctrl-calendar,.ctrl-calendar');

		if (!calendar)
			return;

		if (calendar.ctrl.uitype != UI_TYPES.flat || (calendar.type != INPUT_TYPES.time && calendar.type != INPUT_TYPES.date)) {
			evt.target.blur();
			return;
		}

		calendar.ctrl.oldValue = evt.target.value;
	}

	function textboxChange(evt) {
		var calendar = Dom.parent(evt.target, 'ctrl-calendar,.ctrl-calendar'),
	        oldVal;

		if (!calendar)
			return;

		evt.preventDefault();
		evt.stopImmediatePropagation();

		if (calendar.type == INPUT_TYPES.date && calendar.ctrl.oldValue)
			oldVal = DateTime.parseDate(calendar.ctrl.oldValue, calendar.format);
		else
			oldVal = DateTime.parseTime(calendar.ctrl.oldValue, calendar.format);

		try {
			if (calendar.nullable && !evt.target.value)
				calendar.ctrl.date = null;
			else if (calendar.type == INPUT_TYPES.date)
				calendar.ctrl.date = DateTime.parseDate(evt.target.value, calendar.format);
			else
				calendar.ctrl.date = DateTime.parseTime(evt.target.value, calendar.format);
		} catch (e) {
			if (oldVal)
				calendar.ctrl.date = oldVal;
		}

		validateDate(calendar, oldVal);

		Event.raise(calendar, 'change');
	}

	function zoomIn(evt) {
		var calendar = getCalendar(evt);

		if (!calendar)
			return;

		evt.preventDefault();

		if (calendar.ctrl.zoomMode == ZOOM_MODE.decade)
			return;

		if (calendar.ctrl.zoomMode == ZOOM_MODE.month || (calendar.ctrl.zoomMode == ZOOM_MODE.none && calendar.type == INPUT_TYPES.month))
			calendar.ctrl.zoomMode = ZOOM_MODE.decade;

		if (calendar.ctrl.zoomMode == ZOOM_MODE.none)
			calendar.ctrl.zoomMode = ZOOM_MODE.month;

		zoom(calendar);
	}

	function zoomOut(calendar, cell) {
		var date = calendar.ctrl.displayDate || new Date(calendar.ctrl.date.getTime());

		if (calendar.ctrl.zoomMode == ZOOM_MODE.month) {
			calendar.ctrl.displayDate = new Date(date.getFullYear(), getMonth(cell.firstElementChild.innerHTML), 1);
			calendar.ctrl.zoomMode = ZOOM_MODE.none;
		}

		if (calendar.ctrl.zoomMode == ZOOM_MODE.decade) {
			calendar.ctrl.displayDate = new Date(parseInt(cell.firstElementChild.innerHTML), date.getMonth(), 1);

			if (calendar.type == INPUT_TYPES.month)
				calendar.ctrl.zoomMode = ZOOM_MODE.none;
			else
				calendar.ctrl.zoomMode = ZOOM_MODE.month;
		}

		zoom(calendar);
	}

	function zoom(calendar) {
		var content = calendar._section.querySelector('.inner'),
			newContent,
			date = calendar.ctrl.displayDate || new Date(calendar.ctrl.date.getTime()),
			main = doc.querySelector('#flat').content.cloneNode(true),
			title = calendar._section.querySelector('header .title');

		Class.add(content, 'zoom');

		title.innerHTML = getFlatTittle(calendar);

		createFlatContent(main, date, (calendar.type == INPUT_TYPES.month && calendar.ctrl.zoomMode == ZOOM_MODE.none) || calendar.ctrl.zoomMode == ZOOM_MODE.month,
			calendar.ctrl.zoomMode == ZOOM_MODE.decade, calendar.type == INPUT_TYPES.week);

		newContent = main.querySelector('.inner');
		Event.add(newContent, 'click', process, false);

		content.parentNode.replaceChild(newContent, content);

		setTimeout(function () { Class.remove(content, 'zoom'); }, 50);
	}

	function slideStart(evt) {
		var direction = Class.contains(evt.target, 'icon-arrow-left') ? "left" : "right",
			section = Dom.parent(evt.target, 'section'),
			inner = section.querySelector('.inner'),
			title = section.querySelector('header .title'),
			contentWidth,
			main = doc.querySelector('#flat').content.cloneNode(true),
			newContent,
			calendar = getCalendar(evt);

		if (!calendar)
			return;

		if (inner.animID) {
			Dragon.Anim.stop(inner.animID);
			slideEnd(inner, direction);
		}

		contentWidth = inner.getBoundingClientRect().width;

		var offset = direction == "right" ? 1 : -1,
			mrg = -contentWidth * (1 - offset) / 2,
			selM = 0,
			date = calendar.ctrl.displayDate || new Date(calendar.ctrl.date.getTime()),
			selY = date.getFullYear();

		if ((calendar.type == INPUT_TYPES.date || calendar.type == INPUT_TYPES.week)
			&& calendar.ctrl.zoomMode == ZOOM_MODE.none)
			selM = date.getMonth() + offset;

		if ((calendar.type == INPUT_TYPES.month && calendar.ctrl.zoomMode == ZOOM_MODE.none)
			|| calendar.ctrl.zoomMode == ZOOM_MODE.month)
			selY += offset;

		if (calendar.ctrl.zoomMode == ZOOM_MODE.decade)
			selY = (((selY / 10) | 0) + offset) * 10;

		calendar.ctrl.displayDate = new Date(selY, selM, 1);

		title.innerHTML = getFlatTittle(calendar);

		createFlatContent(main, calendar.ctrl.displayDate, (calendar.type == INPUT_TYPES.month && calendar.ctrl.zoomMode == ZOOM_MODE.none) || calendar.ctrl.zoomMode == ZOOM_MODE.month,
			calendar.ctrl.zoomMode == ZOOM_MODE.decade, calendar.type == INPUT_TYPES.week);

		newContent = main.querySelector('section .inner ul');

		if (direction == "right")
			inner.appendChild(newContent);
		else
			inner.insertBefore(newContent, inner.firstElementChild);

		inner.style.width = contentWidth * 2 + 'px';
		newContent.style.width = contentWidth + 'px';
		inner.querySelector('ul').style.width = contentWidth + 'px';
		inner.animID = Dragon.Anim.run(function (delta) {
			inner.style.marginLeft = mrg + Math.max(-delta * offset * 1.2, -contentWidth) + 'px';

			if (delta >= 250) {
				slideEnd(inner, direction);
				return false;
			}

			return true;
		});
	}

	function slideEnd(inner, direction) {
		inner.removeAttribute("style");
		inner.removeChild((direction == "right") ? inner.firstElementChild : inner.lastElementChild);
		inner.animID = null;
	}

	function process(evt) {
		evt.stopImmediatePropagation();
		evt.preventDefault();

		var cell = Dom.parent(evt.target, '.cell'),
			calendar = getCalendar(evt);

		if (!cell || !calendar)
			return;

		if (calendar.ctrl.zoomMode == ZOOM_MODE.none) {
			changeValue(cell, calendar);
			return;
		}

		zoomOut(calendar, cell);
	}

	function changeValue(cell, calendar) {
		var anchor = cell.firstElementChild.tagName.toLowerCase() != 'a' ? null : cell.firstElementChild,
			week = Class.contains(cell, 'week'),
			currentDate = calendar.ctrl.displayDate,
			date;

		if (!currentDate) {
			if (calendar.nullable && !calendar.ctrl.date)
				currentDate = new Date();
			else
				currentDate = new Date(calendar.ctrl.date.getTime());
		}

		if (!anchor)
			return;

		var str = anchor.innerHTML,
			num,
			offset = 0;

		if (calendar.type == INPUT_TYPES.month)
			date = new Date(currentDate.getFullYear(), getMonth(str), 1);

		if (calendar.type == INPUT_TYPES.week && week) {
			num = parseInt(str);

			date = getWeekStartDate(currentDate.getFullYear(), num);
		}

		if (!week && (calendar.type == INPUT_TYPES.week || calendar.type == INPUT_TYPES.date)) {
			num = parseInt(str);

			if (Class.contains(cell, 'inactive'))
				offset = num < 15 ? 1 : -1;

			date = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, num);

			if (calendar.type == INPUT_TYPES.week)
				date = getWeekDate(date);
		}

		if (date)
			valueChanged(calendar, date);
	}

	function setToday(evt) {
		evt.stopImmediatePropagation();
		evt.preventDefault();

		var date = new Date(),
			calendar = getCalendar(evt);

		if (!calendar)
			return;

		if (calendar.type == INPUT_TYPES.week)
			date = getWeekDate(date);

		if (calendar.type == INPUT_TYPES.month)
			date = new Date(date.getFullYear(), date.getMonth(), 1);

		valueChanged(calendar, date);
	}

	function valueChanged(calendar, date) {
		var oldVal = calendar.ctrl.date;
		calendar.ctrl.date = date;

		validateDate(calendar, oldVal);

		Dialog.close();

		Event.raise(calendar, 'change');
	}

	function getMonth(str) {
		var index = 0;

		while (TEXTS.monthShort[index] != str)
			index++;

		return index;
	}

	function slotChanged(evt) {
		var calendar = getCalendar(evt),
			title,
			date,
			slotIndex = evt.detail.index,
			value = evt.detail.selected;

		if (!calendar)
			return;

		title = calendar._section.querySelector('header .title');
		date = calendar.ctrl.displayDate;

		Dragon.Class.add(title, "switch");

		if (!date)
			date = new Date(calendar.ctrl.date.getTime());

		if (calendar.type == INPUT_TYPES.date) {
			switch (slotIndex) {
				case 0:
					date.setDate(value);
					break;
				case 1:
					date = alignDate(calendar, value - 1, date.getFullYear(), date.getDate());
					break;
				case 2:
					date = alignDate(calendar, alignMonth(calendar, date.getMonth(), value, 1), value, date.getDate());
					break;
			}
		} else if (calendar.type == INPUT_TYPES.week) {
			switch (slotIndex) {
				case 0:
					date = getWeekStartDate(date.getFullYear(), value);
					break;
				case 1:
					date = alignWeek(calendar, value, getWeekNumber(date), 0);
					break;
			}
		} else if (calendar.type == INPUT_TYPES.time) {
			switch (slotIndex) {
				case 0:
					var twelveHourFormat = Dragon.config.timePattern && Dragon.config.timePattern.indexOf('t') >= 0,
						setVal = twelveHourFormat === 12 ? (Math.floor(date.getHours() / 12) * 12 + value % 12) % 24 : value;

					date.setHours(setVal);
					break;
				case 1:
					date.setMinutes(value);
					break;
				case 2:
					date.setHours((date.getHours() + (evt.evtData.selected == 0 ? -1 : 1) * 12) % 24);
					break;
			}
		} else if (calendar.type == INPUT_TYPES.month) {
			switch (slotIndex) {
				case 0:
					date = new Date(date.getFullYear(), alignMonth(calendar, value - 1, date.getFullYear(), 0), 1);
					break;
				case 1:
					date = new Date(value, alignMonth(calendar, date.getMonth(), value), 1);
					break;
			}
		}

		setTimeout(function () {
			calendar.ctrl.displayDate = date;
			title.innerHTML = getTouchTittle(calendar);
		}, 200);
		setTimeout(function () { Class.remove(title, "switch"); }, 400);
	}

	// SpinWheel touch friendly interface
	// settings = { title: text, value: initial value, min: minimum value, max: maximum value, data: resource initializer }
	function SpinWheel(ind, stgs) {
		var index = ind,
			settings = stgs,
			step = settings.step || 1,
			maxOffset = toOffset(settings.min),
			minOffset = toOffset(Math.floor(settings.max / step)),
			spinOffset = maxOffset,
			accelerate = 0.005,
			hasData = stgs.data,
			padString = '00';

		this.setMax = function (max) {
			changeLimit(0, max);
		};

		this.setMin = function (min) {
			changeLimit(1, min);
		};

		function getOffset(delta) {
			return Math.max(minOffset, Math.min(maxOffset, spinOffset + delta));
		}

		function parseOffset(offset) {
			return (-offset / spinStep + 2 + settings.min) * step;
		}

		function toOffset(val) {
			return (settings.min + 2 - val) * spinStep;
		}

		function changeLimit(isMin, limit) {
			var items = mover.getElementsByTagName("li"),
				current = (isMin) ? parseOffset(maxOffset) : parseOffset(minOffset),
				changed = Math.abs(current - limit),
				start = Math.min(current, limit) - isMin;

			for (var i = 0; i < changed; i++)
				Class.toggle(items[start + i], 'slot-invalid');

			if (isMin) {
				maxOffset = toOffset(limit);
				if (spinOffset > maxOffset)
					setOffset(maxOffset);
			} else {
				minOffset = toOffset(limit);
				if (spinOffset < minOffset)
					setOffset(minOffset);
			}
		}

		function setOffset(val, notify) {
			mover.style.top = val + "px";

			if (notify && (spinOffset != val))
				Event.raise(mover, 'slot_changed', { index: index, selected: parseOffset(val) });

			spinOffset = val;
		}

		this.slot = doc.querySelector('#slot').content.cloneNode(true);

		var mover = this.slot.querySelector('ul'),
			div = this.slot.querySelector('div');

		this.slot.querySelector('.slot-title').innerHTML = settings.title;

		for (var i = settings.min; i <= settings.max; i += step)
			mover.appendChild(Dom.create('li', '', hasData ? settings.data[i - 1] : (padString.substring(0, padString.length - i.toString().length) + i)));

		setOffset(toOffset(settings.value)); // RECHECK this !!!

		Gesture.enable(div);

		Event.add(div, 'tracking', function (evt) {
			if (!Class.contains(mover, 'stop-anim'))
				Class.add(mover, 'stop-anim');

			mover.style.top = getOffset(evt.detail.distY) + "px";
		});

		Event.add(div, 'swipe', function (evt) {
			Class.remove(mover, 'stop-anim');

			var delta = evt.detail.distanceY,
				speed = delta / evt.detail.delta,
				acc = (speed < 0) ? accelerate : -accelerate,
				elapsed = Math.abs(speed / accelerate),
				distance = speed * elapsed + acc * elapsed * elapsed / 2 + delta;

			setOffset(Math.round(getOffset(distance) / spinStep) * spinStep, true);
		});

		Event.add(div, 'wheel', function (evt) {
			Event.cancel(evt);
			var delta;

			if (evt.deltaMode == 0)
				delta = evt.deltaY / 40;
			else
				delta = evt.deltaY;

			delta = Math.round(delta) * -1;

			setOffset(getOffset(delta * spinStep), true);
		});

		Event.add(div, 'tap', function (evt) {
			Event.cancel(evt);

			var text = evt.detail.target.textContent,
				value;

			if (evt.detail.target.tagName.toLowerCase() != 'li')
				return;

			if (hasData)
				value = settings.data.indexOf(text) + 1;
			else
				value = Math.floor((text * 1) / step);

			setOffset(toOffset(value), true);
		});
	}

	//Util Methods for working with dates
	function getWeekday(date) {
		return (date.getDay() + 6) % 7;
	}

	function padNumber(num) {
		return (num < 10) ? ("0" + num) : num;
	}

	function dayDiff(d1, d2) {
		if (d1.setHours)
			d1.setHours(0);

		if (d1.setMinutes)
			d1.setMinutes(0);

		if (d2.setHours)
			d2.setHours(0);

		if (d2.setMinutes)
			d2.setMinutes(0);

		return Math.round((d1 - d2) / 86400000);
	}

	function getWeekNumber(date) {
		return Math.ceil((dayDiff(date, getYearStart(date.getFullYear())) + 1) / 7);
	}

	function getWeekDate(date) {
		return new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() - startWeek + 6) % 7));
	}

	function getYearStart(year) {
		var firstJan = new Date(year, 0, 1),
			yearSt = getWeekDate(firstJan);

		if (((firstWeek == 1) && (dayDiff(firstJan, yearSt) > 0)) || ((firstWeek == 2) && (dayDiff(firstJan, yearSt) > 3))) {
			yearSt.setDate(yearSt.getDate() + 7);
		}

		return yearSt;
	}

	function getYearTen(year) {
		return ((year / 10) | 0) * 10;
	}

	function getCalendarWeek(date, currentDate) {
		return Math.ceil((dayDiff(date, getYearStart(getCalendarYear(date, currentDate))) + 1) / 7);
	}

	function getCalendarYear(date, currentDate) {
		switch (firstWeek) {
			case 0:
				return Math.max(currentDate.getFullYear(), date.getFullYear());
			case 1:
				return date.getFullYear();
			case 2:
				var year = date.getFullYear();
				if (year < currentDate.getFullYear()) {
					var ny = new Date(year, date.getMonth(), date.getDate() + 3);
					return ny.getFullYear();
				}
				return year;
		}
	}

	function getYearWeeks(year) {
		var date = getYearStart(year + 1);
		date.setDate(date.getDate() - (date.getFullYear() == year + 1 ? 7 : 0));

		return getWeekNumber(date);
	}

	function getMonthDays(month, year) {
		return new Date(year, month + 1, 0).getDate();
	}

	function getWeekStartDate(year, week) {
		var ys = getYearStart(year);
		ys.setDate(ys.getDate() + (week - 1) * 7);
		return ys;
	}

	function convertValue(calendar, value) {
		if (calendar.ctrl.valueType == VALUE_TYPES.number) {
			if (calendar.type == INPUT_TYPES.time)
				return DateTime.intTimeToDate(value * 1);
			else
				return DateTime.intToDate(value * 1);
		} else {
			if (value.getMonth)
				return value;
			else
				return new Date(value);
		}
	}

	function getCalendar(evt) {
		var section = Dom.parent(evt.target, 'section.ctrl-calendar-window');

		if (!section || !section._calendar)
			return null;

		return section._calendar;
	}

	return WC.register('ctrl-calendar', {
		lifecycle: {
			created: function () {
				this.appendChild(doc.querySelector('template[control]').content.cloneNode(true));

				this.ctrl.input = this.querySelector('input');
				this.ctrl.span = this.querySelector('span');
				this.ctrl.slots = [];
				this.ctrl.uitype = touch ? UI_TYPES.touch : UI_TYPES.flat;
				this.ctrl.valueType = VALUE_TYPES.date;

				if (!this.nullable)
					this.ctrl.date = new Date();

				this.ctrl.zoomMode = ZOOM_MODE.none;

				if (!this.type)
					this.type = INPUT_TYPES.date;

				Class.add(this, INPUT_TYPES.date);

				validateDate(this);

				Event.add(this.ctrl.input, 'change', textboxChange);

				Event.add(this.ctrl.input, 'focus', textboxFocus);

				Gesture.enable(this.ctrl.input, true);
				Event.add(this.ctrl.input, 'tap', tap);

				Gesture.enable(this.ctrl.span, true);
				Event.add(this.ctrl.span, 'tap', tap);
			}
		},
		type: {
			attribute: {},
			set: function (value) {
				if (!INPUT_TYPES.hasOwnProperty(value))
					throw new Error('Unsupported calendar type!');

				invalidateText(this);
			}
		},
		min: {
			attribute: {},
			set: function (value) {
				this.ctrl.minDate = convertValue(this, value);

				validateDate(this);
			}
		},
		max: {
			attribute: {},
			set: function (value) {
				this.ctrl.maxDate = convertValue(this, value);

				validateDate(this);
			}
		},
		uitype: {
			attribute: {},
			set: function (value) {
				this.ctrl.uitype = value;
			},
		},
		disabled: {
			//Temp Fix for IE 11 because disableTree method in components does not work
			attribute: { boolean: true, select: 'input,span' },
			set: function (value) {
				if (value)
					Class.add(this, 'disabled');
				else
					Class.remove(this, 'disabled');
			}
		},
		valuetype: {
			attribute: {},
			set: function (value) {
				if (!VALUE_TYPES.hasOwnProperty(value))
					throw new Error('Unsupported calendar value type!');

				this.ctrl.valueType = value;
			}
		},
		value: {
			attribute: {},
			get: function () {
				if (this.nullable && !this.ctrl.date)
					return null;

				if (this.ctrl.valueType == VALUE_TYPES.number) {
					if (this.type == INPUT_TYPES.time)
						return DateTime.dateToIntTime(this.ctrl.date);
					else
						return DateTime.dateToInt(this.ctrl.date);
				}

				return this.ctrl.date;
			},
			set: function(value) {
				if (this.nullable && !value)
					this.ctrl.date = null;
				else
					this.ctrl.date = convertValue(this, value);

				validateDate(this);
			}
		},
		format: {
			attribute: {}
		},
		//TODO currently used only for minutes may be make it general to work with days, hours???
		granularity: {
			attribute: {}
		},
		name: {
			attribute: {}
		},
		checkValidity: function () {
			this.validity.valueMissing = this.hasAttribute('required') && this.value == undefined;

			// [DD] @Dancho: add here min/max/step constraint checks. Add also step attribute

			this.validity.rangeUnderflow = false; // min constraint

			this.validity.rangeOverflow = false; // max constraint

			this.validity.stepMismatch = false;

			return !this.validity.valueMissing && !this.validity.rangeUnderflow && !this.validity.rangeOverflow && !this.validity.stepMismatch && !this.validity.customError;
		},
		nullable: {
			attribute: { boolean: true }
		}
	});
});

//TODO conver c# code from TimeValidator.FormatTimeString so time can be entered incomplete like in the fat client
//TODO also does rouding becomes part of the calendar control or is it writen as custom code in the manus web
