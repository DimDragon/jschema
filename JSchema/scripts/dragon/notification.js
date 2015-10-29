Dragon.module(function () {

	//SSE
	//https://github.com/remy/polyfills/blob/master/EventSource.js
	//https://github.com/Yaffle/EventSource/blob/master/eventsource.js
	//https://github.com/rwaldron/jquery.eventsource/blob/master/jquery.eventsource.js

	//WebNotifications
	//https://github.com/alexgibson/notify.js
	//https://gist.github.com/Asmod4n/6030828
	//https://github.com/kbjr/Notifications/blob/master/notification.js

	// TODO: Notification object (rather than methods); 
	//		 Separate SSE;
	//		 Server-side SSE (https://github.com/erizet/ServerSentEvent4Net/blob/master/ServerSentEvent4Net/ServerSentEvent.cs)

	function init(title, options) {

		this.title = typeof title === 'string' ? title : null;

		this.options = {
			icon: '',
			body: '',
			tag: '',
			notifyShow: null,
			notifyClose: null,
			notifyClick: null,
			notifyError: null,
			permissionGranted: null,
			permissionDenied: null
		};

		this.permission = null;

		if (!this.isSupported()) {
			return;
		}

		if (!this.title) {
			throw new Error('init(): first arg (title) must be a string.');
		}

		//User defined options for notification content
		if (typeof options === 'object') {

			for (var i in options) {
				if (options.hasOwnProperty(i)) {
					this.options[i] = options[i];
				}
			}

			//callback when notification is displayed
			if (typeof this.options.notifyShow === 'function') {
				this.onShowCallback = this.options.notifyShow;
			}

			//callback when notification is closed
			if (typeof this.options.notifyClose === 'function') {
				this.onCloseCallback = this.options.notifyClose;
			}

			//callback when notification is clicked
			if (typeof this.options.notifyClick === 'function') {
				this.onClickCallback = this.options.notifyClick;
			}

			//callback when notification throws error
			if (typeof this.options.notifyError === 'function') {
				this.onErrorCallback = this.options.notifyError;
			}

			//callback user grants permission for notification
			if (typeof this.options.permissionGranted === 'function') {
				this.onPermissionGrantedCallback = this.options.permissionGranted;
			}

			//callback user denies permission for notification
			if (typeof this.options.permissionDenied === 'function') {
				this.onPermissionDeniedCallback = this.options.permissionDenied;
			}
		}
	}

	function isSupported() {
		if ('Notification' in window) {
			return true;
		}
		return false;
	}

	function needPermission() {
		if ('Notification' in window && Notification.permission === 'granted') {
			return false;
		}
		return true;
	}

	function requestPermission() {
		var that = this;
		window.Notification.requestPermission(function (perm) {
			that.permission = perm;
			switch (that.permission) {
				case 'granted':
					that.onPermissionGranted();
					break;
				case 'denied':
					that.onPermissionDenied();
					break;
			}
		});
	}

	function showNotification() {
		if (!this.isSupported()) {
			return;
		}

		this.myNotify = new Notification(this.title, {
			'body': this.options.body,
			'tag': this.options.tag,
			'icon': this.options.icon
		});

		this.myNotify.addEventListener('show', this, false);
		this.myNotify.addEventListener('error', this, false);
		this.myNotify.addEventListener('close', this, false);
		this.myNotify.addEventListener('click', this, false);
	}

	function addHandle(e) {
		switch (e.type) {
			case 'show':
				this.onShowNotification(e);
				break;
			case 'close':
				this.onCloseNotification(e);
				break;
			case 'click':
				this.onClickNotification(e);
				break;
			case 'error':
				this.onErrorNotification(e);
				break;
		}
	}

	function removeHandlers() {
		this.myNotify.removeEventListener('show', this, false);
		this.myNotify.removeEventListener('error', this, false);
		this.myNotify.removeEventListener('close', this, false);
		this.myNotify.removeEventListener('click', this, false);
	}

	function onShowNotification(e) {
		if (this.onShowCallback) {
			this.onShowCallback(e);
		}
	}

	function onCloseNotification() {
		if (this.onCloseCallback) {
			this.onCloseCallback();
		}
		this.removeHandlers();
	}

	function onClickNotification() {
		if (this.onClickCallback) {
			this.onClickCallback();
		}
	}

	function onErrorNotification() {
		if (this.onErrorCallback) {
			this.onErrorCallback();
		}
		this.removeHandlers();
	}

	function onPermissionGranted() {
		if (this.onPermissionGrantedCallback) {
			this.onPermissionGrantedCallback();
		}
	}

	function onPermissionDenied() {
		if (this.onPermissionDeniedCallback) {
			this.onPermissionDeniedCallback();
		}
	}

	return {
		init: init,
		isSupported: isSupported,
		needPermission: needPermission,
		requestPermission: requestPermission,
		show: showNotification,
		addHandle: addHandle,
		removeHandlers: removeHandlers,
		_namespace: "Dragon.Notification"
	}
});