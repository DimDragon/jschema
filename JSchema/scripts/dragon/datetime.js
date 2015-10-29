Dragon.module(['dragon/lang'], function (Lang) {
	var res = {
		days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
		daysShrt: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
		months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
		monthsShrt: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	},
			dateDiff = 25567, //difference in days between 1900-01-01 AND 1970-01-01
			millSecPerDay = 86400000;

	function formatDate(val, format) {
		var date = typeof val !== "object" ? new Date(val) : val;

		if (!(val instanceof Date)) {
			switch (typeof val) {
				case 'string':
					date = new Date(val);
					break;
				case 'number':
					date = intToDate(val);
					break;
			}
		}

		return formatDateInner(date, format || Dragon.config.datePattern || 'dd/MM/yyyy');
	}

	function formatTime(val, format) {
		var date = typeof val !== "object" ? new Date(val) : val;

		if (!(val instanceof Date)) {
			switch (typeof val) {
				case 'number':
					date = intTimeToDate(val);
					break;
			}
		}

		return formatDateInner(date, format || Dragon.config.timePattern || 'HH:mm');
	}

	function formatDateInner(date, pattern) {
		var strDate = "";

		for (var i = 0; i < pattern.length; i++) {
			switch (pattern.charAt(i)) {
				case "d":
					{
						var n = loop(pattern, "d", i, 4);
						i += n - 1;
						switch (n) {
							case 1: case 2:
								{
									strDate += addCharBeforeStr(date.getDate(), "0", n);
								} break;
							case 3:
								{
									strDate += res.daysShrt[date.getDay()];
								} break;
							case 4:
								{
									strDate += res.days[date.getDay()];
								} break;
						}
					} break;
				case "M":
					{
						var n = loop(pattern, "M", i, 4);
						i += n - 1;
						switch (n) {
							case 1: case 2:
								{
									strDate += addCharBeforeStr(date.getMonth() + 1, "0", n);
								} break;
							case 3:
								{
									strDate += res.monthsShrt[date.getMonth()];
								} break;
							case 4:
								{
									strDate += res.months[date.getMonth()];
								} break;
						}
					} break;
				case "y":
					{
						var n = loop(pattern, "y", i, 4);
						i += n - 1;
						switch (n) {
							case 2:
								{
									strDate += date.getFullYear().toString().substr(2, 2);
								} break;
							case 4:
								{
									strDate += date.getFullYear();
								} break;
							default:
								{
									strDate += addCharBeforeStr("y", "y", n);
								} break;
						}
					} break;
				case 'w':
					{
						var n = loop(pattern, 'w', i, 2);
						i += n - 1;
						switch (n) {
							case 2:
								{
									strDate += addCharBeforeStr(getWeekNumber(date), "0", 2);
								} break;
							default:
								{
									strDate += addCharBeforeStr('w', 'w', n);
								} break;
						}
					} break;
				case "h":
					{
						var n = loop(pattern, "h", i, 2),
						h = date.getHours();
						i += n - 1;
						if (h == 0) {
							h = 12;
						} else if (h > 12) {
							h -= 12;
						}
						strDate += addCharBeforeStr(h, "0", n);
					} break;
				case "H":
					{
						var n = loop(pattern, "H", i, 2);
						i += n - 1;
						strDate += addCharBeforeStr(date.getHours(), "0", n);
					} break;
				case "m":
					{
						var n = loop(pattern, "m", i, 2);
						i += n - 1;
						strDate += addCharBeforeStr(date.getMinutes(), "0", n);
					} break;
				case "s":
					{
						var n = loop(pattern, "s", i, 3);
						i += n - 1;
						switch (n) {
							case 1: case 2:
								{
									strDate += addCharBeforeStr(date.getSeconds(), "0", n);
								} break;
							case 3:
								{
									strDate += addCharBeforeStr(date.getMilliseconds(), "0", 3);
								} break;
						}
					} break;
				case "t":
					{
						var n = loop(pattern, "t", i, 2),
						h = date.getHours();
						i += n - 1;
						switch (n) {
							case 1:
								{
									strDate += h / 12 < 1 ? "A" : "P";
								} break;
							case 2:
								{
									strDate += h / 12 < 1 ? "AM" : "PM";
								} break;
						}
					} break;
				default:
					{
						strDate += pattern.charAt(i);
					} break;
			}
		}
		return strDate;
	}

	function parseDate(val, format) {
		return parseDateInner(val, format || Dragon.config.datePattern || 'dd/MM/yyyy');
	}

	function parseTime(val, format) {
		return parseDateInner(val, format || Dragon.config.timePattern || 'HH:mm');
	}

	function parseDateInner(val, pattern) {
		var regAndPrts = getRegAndPrtsDate(pattern),
			formatParts = regAndPrts.parts,
			regStr = regAndPrts.regex,
			valParts = val.match(new RegExp(regStr)),
			y, m, d, w, h, min, s, ms;

		if (!valParts) throw 'Incorrect date format!';
		for (var i in formatParts) {
			switch (formatParts[i]) {
				case 'd': case 'dd':
					{
						d = parseInt(valParts[parseInt(i) + 1], 10);
					} break;
				case 'M': case 'MM':
					{
						m = parseInt(valParts[parseInt(i) + 1], 10);
					} break;
				case 'MMM':
					{
						m = indexOf(res.monthsShrt, valParts[parseInt(i) + 1]) + 1;
					} break;
				case 'MMMM':
					{
						m = indexOf(res.months, valParts[parseInt(i) + 1]) + 1;
					} break;
				case 'yy':
					{
						var td = new Date(valParts[parseInt(i) + 1], 0), cd = new Date();
						if (td < cd.setFullYear(cd.getFullYear() - 50)) {
							td.setFullYear(td.getFullYear() + 100);
						}
						y = td.getFullYear();
					} break;
				case 'yyyy':
					{
						y = valParts[parseInt(i) + 1];
					} break;
				case 'ww':
					{
						w = valParts[parseInt(i) + 1];
					} break;
				case 'h': case 'hh': case 'H': case 'HH':
					{
						h = parseInt(valParts[parseInt(i) + 1], 10);
					} break;
				case 'm': case 'mm':
					{
						min = valParts[parseInt(i) + 1];
					} break;
				case 's': case 'ss':
					{
						s = valParts[parseInt(i) + 1];
					} break;
				case 'sss':
					{
						ms = valParts[parseInt(i) + 1];
					} break;
				case 't':
					{
						if (valParts[parseInt(i) + 1] == 'A' && h == 12) {
							h = 0;
						} else if (valParts[parseInt(i) + 1] == 'P' && h < 12) {
							h += 12;
						}
					} break;
				case 'tt':
					{
						if (valParts[parseInt(i) + 1] == 'AM' && h == 12) {
							h = 0;
						} else if (valParts[parseInt(i) + 1] == 'PM' && h < 12) {
							h += 12;
						}
					} break;
				default:
					{
						//throw "Incorrect date format!";
					} break;
			}
		}
		if (y && w) {
			var date = getWeekStartDate(y, w);
			m = date.getMonth() + 1;
			d = date.getDate();
		}
		return new Date(y !== undefined ? y : 0, m !== undefined ? m - 1 : 0, d !== undefined ? d : 1,
			h !== undefined ? h : 0, min !== undefined ? min : 0, s !== undefined ? s : 0, ms !== undefined ? ms : 0);
	}

	function getRegAndPrtsDate(format) {
		var regStr = '^', char,
			formatParts = [],
			strLength = format.length,
			pos = 0,
			charCount = 0;
		while (pos < strLength) {
			char = format.charAt(pos);
			switch (char) {
				case 'd':
					{
						charCount = loop(format, 'd', pos, 4);
						switch (charCount) {
							case 1:
								{
									regStr += '(\\d{1,2})';
									formatParts.push('d');
								} break;
							case 2:
								{
									regStr += '(\\d{2})';
									formatParts.push('dd');
								} break;
							case 3:
								{
									regStr += '(' + res.daysShrt.join('|') + ')';
									formatParts.push('ddd');
								} break;
							case 4:
								{
									regStr += '(' + res.days.join('|') + ')';
									formatParts.push('dddd');
								} break;
						}
					} break;
				case 'M':
					{
						charCount = loop(format, 'M', pos, 4);
						switch (charCount) {
							case 1:
								{
									regStr += '(\\d{1,2})';
									formatParts.push('M');
								} break;
							case 2:
								{
									regStr += '(\\d{2})';
									formatParts.push('MM');
								} break;
							case 3:
								{
									regStr += '(' + res.monthsShrt.join('|') + ')';
									formatParts.push('MMM');
								} break;
							case 4:
								{
									regStr += '(' + res.months.join('|') + ')';
									formatParts.push('MMMM');
								} break;
						}
					} break;
				case 'y':
					{
						charCount = loop(format, 'y', pos, 4);
						switch (charCount) {
							case 2: case 4:
								{
									regStr += '(\\d{' + charCount + '})';
									formatParts.push(addCharBeforeStr('y', 'y', charCount));
								} break;
							default:
								{
									regStr += '(' + addCharBeforeStr('y', 'y', charCount) + ')';
									formatParts.push(addCharBeforeStr('y', 'y', charCount));
								} break;
						}
					} break;
				case 'w':
					{
						charCount = loop(format, 'w', pos, 4);
						switch (charCount) {
							case 2:
								{
									regStr += '(\\d{2})';
									formatParts.push('ww');
								} break;
							default:
								{
									regStr += '(' + addCharBeforeStr('w', 'w', charCount) + ')';
									formatParts.push(addCharBeforeStr('w', 'w', charCount));
								} break;
						}
					} break;
				case 'h': case 'H': case 'm':
					{
						charCount = loop(format, char, pos, 2);
						switch (charCount) {
							case 1:
								{
									regStr += '(\\d{1,2})';
									formatParts.push(addCharBeforeStr(char, char, charCount));
								} break;
							case 2:
								{
									regStr += '(\\d{2})';
									formatParts.push(addCharBeforeStr(char, char, charCount));
								} break;
						}
					} break;
				case 's':
					{
						charCount = loop(format, char, pos, 3);
						switch (charCount) {
							case 1:
								{
									regStr += '(\\d{1,2})';
									formatParts.push(addCharBeforeStr(char, char, charCount));
								} break;
							case 2: case 3:
								{
									regStr += '(\\d{' + charCount + '})';
									formatParts.push(addCharBeforeStr(char, char, charCount));
								} break;
						}
					} break;
				case 't':
					{
						charCount = loop(format, char, pos, 2);
						switch (charCount) {
							case 1:
								{
									regStr += '(A|P)';
									formatParts.push('t');
								} break;
							case 2:
								{
									regStr += '(AM|PM)';
									formatParts.push('tt');
								} break;
						}
					} break;
				default:
					{
						charCount = 1;
						regStr += '(' + char + ')';
						formatParts.push(char);
					} break;
			}
			pos += charCount;
		}
		return {
			regex: regStr + '$',
			parts: formatParts
		}
	}

	function timeToDate(val) {
		if (val === undefined || val === null || val === "") return val;
		var prts = val.split(":"),
			prtsms = prts.length == 3 ? prts[2].split(".") : [],
			h = prts[0], m = prts[1], s = prtsms.length == 1 ? prtsms[0] : 0,
			ms = prtsms.length == 2 ? prtsms[1] : 0;
		return new Date(0, 0, 0, h, m, s, ms);
	}

	function rfcToDate(val, type) {
		var d = splitDatePart(null),
			t = splitTimePart(null);
		/*
		switch (type) {
			case "date": case "month":
				{
					d = splitDatePart(val);
				} break;
			case "week":
				{
					d = splitWeekPart(val);
				} break;
			case "time":
				{
					t = splitTimePart(val);
				} break;
			case "datetime":
				{
					var prts = val.split('T'),
					d = splitDatePart(prts[0]),
					t = splitTimePart(prts[1]);

				} break;
		}
		*/
		if (val.match(/(\d{4})-(\d{2})(?:-(\d{2}))?T(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:.(\d{3})(?:\d{0,4}))?(?:Z|(\+|\-)(\d{2}):(\d{2}))?/)) {
			var prts = val.split('T'),
				d = splitDatePart(prts[0]),
				t = splitTimePart(prts[1]);
		} else if (val.match(/^(\d{4})-W(\d{2})$/)) {
			d = splitWeekPart(val);
		} else if (val.match(/(\d{4})-(\d{2})(?:-(\d{2}))?/)) {
			d = splitDatePart(val);
		} else if (val.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:.(\d{3})(?:\d{0,4}))?(?:Z|(\+|\-)(\d{2}):(\d{2}))?/)) {
			t = splitTimePart(val);
		}

		return new Date(d.y, d.m, d.d, t.h, t.m, t.s, t.ms);
	}

	function splitDatePart(val) {
		if (val === undefined || val === null || val === "")
			return { y: 0, m: 0, d: 1 };

		var reg = /(\d{4})-(\d{2})(?:-(\d{2}))?/,
			prts = val.match(reg);

		if (!prts) throw 'Incorrect date format!';

		return {
			y: prts[1],
			m: parseInt(prts[2], 10) - 1,
			d: prts[3] || 1
		}
	}

	function splitWeekPart(val) {
		if (val === undefined || val === null || val === "")
			return { y: 0, m: 0, d: 1 };

		var reg = /^(\d{4})-W(\d{2})$/,
			prts = val.match(reg),
			date;

		if (!prts) throw 'Incorrect week format!';

		date = getWeekStartDate(prts[1], prts[2]);

		return {
			y: date.getFullYear(),
			m: date.getMonth(),
			d: date.getDate()
		}
	}

	function splitTimePart(val) {
		if (val === undefined || val === null || val === "")
			return { h: 0, m: 0, s: 0, ms: 0 };

		var reg = /(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:.(\d{3})(?:\d{0,4}))?(?:Z|(\+|\-)(\d{2}):(\d{2}))?/,
			prts = val.match(reg);

		if (!prts) throw 'Incorrect time format!';

		return {
			h: prts[1],
			m: prts[2],
			s: prts[3] || 0,
			ms: prts[4] || 0,
			tz: prts[5] ? (60 * (prts[5] + prts[6]) + 1 * (prts[5] + prts[7])) : 0
		}
	}

	function loop(str, ch, from, maxLength) {
		var n = 0;
		while (from < str.length && str.charAt(from) == ch && n + 1 < maxLength + 1) {
			n++;
			from++;
		}
		return n;
	}

	function addCharBeforeStr(s, c, l) {
		s = "" + s;
		while (s.length < l)
			s = c + s;
		return s;
	}

	function addCharAfterStr(s, c, l) {
		s = "" + s;
		while (s.length < l)
			s = s + c;
		return s;
	}

	function indexOf(arr, val) {
		if (arr.indexOf)
			return arr.indexOf(val);
		for (var i = 0, l = arr.length; i < l; i++) {
			if (arr[i] == val)
				return i;
		}
		return -1;
	}

	function trim(str) {
		return str.replace(/^\s+|\s+$/, '');
	}

	function dayDiff(d1, d2) {
		return Math.round((d1 - d2) / 86400000);
	}

	function getWeekDate(date) {
		var startWeek = 0;
		return new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() - startWeek + 6) % 7));
	}

	function getYearStart(year) {
		var firstWeek = 2;
		firstJan = new Date(year, 0, 1),
			yearSt = getWeekDate(firstJan);
		if (((firstWeek == 1) && (dayDiff(firstJan, yearSt) > 0)) || ((firstWeek == 2) && (dayDiff(firstJan, yearSt) > 3))) {
			yearSt.setDate(yearSt.getDate() + 7);
		}
		return yearSt;
	}

	function getWeekNumber(date) {
		return Math.ceil((dayDiff(date, getYearStart(date.getFullYear())) + 1) / 7);
	}

	function getWeekStartDate(year, week) {
		var ys = getYearStart(year);
		ys.setDate(ys.getDate() + (week - 1) * 7);
		return ys;
	}

	function intToDate(date) {
		return new Date((date - dateDiff) * millSecPerDay);
	}

	function dateToInt(date) {
		var dateInMillSec = Date.parse(date) - date.getTimezoneOffset() * 60000;
		return Math.floor(dateInMillSec / millSecPerDay) + dateDiff;
	}

	function dateToIntTime(date) {
		var dateInMillSec = Date.parse(date) - date.getTimezoneOffset() * 60000 + dateDiff * millSecPerDay;
		return Math.floor((dateInMillSec % millSecPerDay) / 60000);
	}

	function intTimeToDate(int) {
		return new Date(0, 0, 1, int / 60, int % 60);
	}

	function getWeekDay(date, shrt) {
		var dayOfWeek = date.getDay();

		if (shrt)
			return Lang.text(res.daysShrt[dayOfWeek]);
		else
			return Lang.text(res.days[dayOfWeek]);
	}
	
	return {
		addCharBeforeStr: addCharBeforeStr,
		parseDate: parseDate,
		parseTime: parseTime,
		rfcToDate: rfcToDate,
		formatDate: formatDate,
		intToDate: intToDate,
		dateToInt: dateToInt,
		dateToIntTime: dateToIntTime,
		intTimeToDate: intTimeToDate,
		formatTime: formatTime,
		getWeekNumber: getWeekNumber,
		getWeekStartDate: getWeekStartDate,
		getWeekDay: getWeekDay,
		_namespace: 'Dragon.Datetime'
	};
});