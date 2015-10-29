Dragon.module(['dragon/components', 'dragon/classlist', 'dragon/dom', 'dragon/event', 'dragon/components/menu', 'dragon/components/menuitem', 'dragon/components/externallogin.html'], function (WC, Class, Dom, Event, Menu, MenuItem, doc) {

	function createMenuItem(ctrl, menu, type, select, icon) {
		var menuItem = document.createElement('li');

		Class.add(menuItem, 'ctrl-icon', 'icon-' + icon);

		menuItem._authority_type = type;

		menu.appendChild(menuItem);

		if (select)
			setSelected(menuItem, ctrl);
	}

	function setSelected(item, control) {
		control.ctrl.auth = control.ctrl.authority[item._authority_type];

		Class.add(control.ctrl.selected, 'icon-' + control.ctrl.auth.icon);

		var auth = control.ctrl.auth;

		// determine user status
		if (window[auth.namespace]) {
			auth.getStatus();
		} else {
			var asyncLoad = !auth.syncInit;

			// set global space init function to be called once script is loaded
			window[auth.asyncInit] = function () {
				auth.init(Dragon.config.basePath + 'dragon/components/redirect.html?');

				if (asyncLoad)
					auth.getStatus();
			};

			Dragon.loadScript(auth.script, asyncLoad).then(function () {
				if (!asyncLoad)
					auth.asyncInit();
			});
		}
	}

	function login(evt) {
		var arrow = Class.contains(evt.target, 'icon-arrow-down') ? evt.target : null,
            control = Dom.shadowHost(evt.target),
            auth;

		if (!arrow)
			arrow = Dom.parent(evt.target, 'icon-arrow-down');

		if (arrow) {
			Class.toggle(control.ctrl.menu, 'toggle');

			Class.toggle(control.ctrl.inner, 'toggle');

			Event.cancel(evt);
			return;
		}

		if (control.ctrl.menu.contains(evt.target)) {
			var item = evt.target;

			if (item.tagName.toLowerCase() != 'li')
				item = Dom.parent(evt.target, 'li');

			if (item)
				setSelected(item, control);
		}

		auth = control.ctrl.auth;

		// in case user is logged in, gather info if not execute login
		if (auth.isAuthenticated) {
			setUserInfo(auth, control);
		} else {
			auth.login().then(function () {
				auth.isAuthenticated = true;
				setUserInfo(auth, control);
			}, function (error) {
				throwError(error, control);
			});
		}
	}

	function setUserInfo(auth, control) {
		auth.getUserInfo().then(function (user) {
			auth.user = user || {};
			auth.user.auth = auth.name;

			Event.raise(control, 'login_success', auth.user);
		}, function (error) {
			throwError(error, control);
		});
	}

	function throwError(error, control) {
		Event.raise(control, 'login_error', error);
	}

	return WC.register('ctrl-externallogin', {
		template: doc.querySelector('template'),
		lifecycle: {
			created: function () {
				this.ctrl.authority = {
					facebook: {
						name: 'facebook',
						icon: 'facebook',
						namespace: 'FB',
						asyncInit: 'fbAsyncInit',
						script: '//connect.facebook.net/en_US/all.js',
						init: function (redirectUrl) {
							FB.init({
								appId: this.id,
								channelUrl: redirectUrl + this.namespace,
								status: false
							});
						},
						getStatus: function () {
							var that = this;
							FB.getLoginStatus(function (response) {
								that.isAuthenticated = (response.status === 'connected');
							}, true);
						},
						getUserInfo: function () {
							return new Promise(function (resolve, reject) {
								FB.api('/me', function (response) {
									if (response.error) {
										reject(response.error);
									} else {
										resolve(response);
									}
								});
							});
						},
						getUserProfile: function () {
						},
						login: function () {
							return new Promise(function (resolve, reject) {
								FB.login(function (response) {
									if (response.status === 'connected') {
										resolve(response);
									} else {
										reject(response.status);
									}
								});
							});
						}
					},
					google: {
						name: 'google',
						icon: 'googleplus',
						namespace: 'gapi',
						asyncInit: 'getGoogleStatus',
						scope: 'https://www.googleapis.com/auth/plus.me',
						script: 'https://apis.google.com/js/client.js?onload=getGoogleStatus',
						init: function () {
						},
						getStatus: function () {
							var that = this;
							gapi.auth.authorize({ client_id: that.id, immediate: true, scope: that.scope }, function (token) {
								that.isAuthenticated = !!token;
							});
						},
						getUserInfo: function () {
							return new Promise(function (resolve, reject) {
								gapi.client.load('oauth2', 'v2', function () {
									gapi.client.oauth2.userinfo.get().execute(function (user) {
										resolve(user);
									})
									// NOTE: how to catch exceptions here ?!
								});
							});
						},
						getUserProfile: function () {
						},
						login: function () {
							return new Promise(function (resolve, reject) {
								gapi.auth.authorize({ client_id: this.id, immediate: false, scope: this.scope }, function (token) {
									if (token) {
										resolve(token);
									} else {
										reject(token);
									}
								});
							});
						}
					},
					windows: {
						name: 'windows',
						icon: 'windows8',
						namespace: 'WL',
						asyncInit: 'wlAsyncInit',
						scope: 'wl.signin',
						script: '//js.live.net/v5.0/wl.js',
						init: function (redirectUrl) {
							WL.init({
								client_id: this.id,
								scope: this.scope,
								status: false,
								redirect_uri: redirectUrl + this.namespace
							});
						},
						getStatus: function () {
							var that = this;
							WL.getLoginStatus(function (response) {
								that.isAuthenticated = (response.status === 'connected');
							}, true);
						},
						getUserInfo: function () {
							return WL.api({
								path: 'me'
							});
						},
						getUserProfile: function () {
						},
						login: function () {
							return WL.login({
								scope: this.scope
							});
						}
					},
					linkedin: {
						name: 'linkedin',
						icon: 'linkedin',
						namespace: 'IN',
						asyncInit: 'inAsyncInit',
						syncInit: 'inSyncInit',
						//scope: '"r_basicprofile',
						script: '//platform.linkedin.com/in.js?async=true',
						init: function () {
							var that = this
							window[this.syncInit] = function () {
								that.getStatus();
							}

							IN.init({
								api_key: this.id,
								onLoad: this.syncInit,
								authorize: true
							});
						},
						getStatus: function () {
							this.isAuthenticated = IN.User.isAuthorized();
						},
						getUserInfo: function () {
							return new Promise(function (resolve, reject) {
								IN.API.Profile('me').result(function (user) {
									resolve(user.values[0]);
								}).error(function (error) {
									reject(error);
								});
							});
						},
						getUserProfile: function () {
						},
						login: function () {
							return new Promise(function (resolve, reject) {
								// NOTE: LinkedIn API doesn't have a way to notify for cancel/error from login popup!
								IN.User.authorize(function () {
									resolve();
								});
							});
						}
					}
				};

				this.ctrl.menu = this.shadowRoot.querySelector('ul');

				this.ctrl.selected = this.shadowRoot.querySelector('.ctrl-icon');

				this.ctrl.inner = this.shadowRoot.querySelector('.ctrl-inner');

				this.ctrl.text = this.shadowRoot.querySelector('.ctrl-text');

				Event.add(this.shadowRoot.querySelector('.ctrl-inner'), 'click', login);

				if (!this.getAttribute('authority'))
					this.style.display = 'none';
			}
		},
		text: {
			attribute: {},
			set: function (value) {
				this.ctrl.text.innerHTML = value;
			}
		},

		authority: {
			attribute: {},
			set: function () {
				var authorities = Dragon.getOptions(this.authority);

				Dom.empty(this.ctrl.menu);

				var keys = Object.keys(authorities);

				if (keys.length > 1) {
					this.appendChild(Dom.create('span', 'ctrl-icon  icon-arrow-down'));
				} else if (keys.length > 0)
					Class.add(this, 'single');
				else
					this.style.display = 'none';

				for (var i = 0, count = keys.length; i < count; i++) {
					var key = keys[i];

					if (!authorities.hasOwnProperty(key))
						continue;

					this.authority[key] = authorities[key];
					this.ctrl.authority[key].id = authorities[key];
					createMenuItem(this, this.ctrl.menu, key, i == 0, this.ctrl.authority[key].icon);
				}

				if (keys.length == 1)
					setSelected(this.ctrl.menu.querySelector('.ctrl-menuitem,ctrl-menuitem'), this);
			}
		}
	});
});

//TODO when FB fix their js try login ad put correct riderct url and redirect.html must be included into project!!!!!!!!!