Dragon.module(['dragon/components', 'dragon/event', 'dragon/dom', 'dragon/lang', './form', './link', './checkbox', './button', './img-button', 'dragon/components/login.html'], function (WC, Event, Dom, Lang, Form, Link, Checkbox, Button, ImgButton, doc) {
	var template = doc.querySelector('template'),
	tmpLogin = doc.querySelector('#login'),
	tmpForgottenPass = doc.querySelector('#forgottenPassword');

	function getReturnUrl() {
		var match = RegExp('[?&]returnUrl=([^&]*)').exec(window.location.search);

		return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
	}

	function redirect(url, ctrl) {
		url = url || ctrl.defaultUrl;

		if (url) {
			window.location.href = url;
		}
	}

	function cleanup(ctrl) {
		var form = ctrl.querySelector('form');

		if (form) {
			ctrl.removeChild(form);
		}
	}

	function showLogin(ctrl) {
		var content = tmpLogin.content.cloneNode(true),
			formTag = content.querySelector('form'),
			codeTag = content.querySelector('[id="tbxNodeCode"]'),
			passTag = content.querySelector('ctrl-link[action="changepass"]');

		// clean up content
		cleanup(ctrl);

		if (!ctrl.useNodeCode && codeTag) {
			codeTag.parentNode.parentNode.removeChild(codeTag.parentNode);
		}

		if (!ctrl.passwordEndpoint && passTag) {
			passTag.parentNode.parentNode.removeChild(passTag.parentNode);
		}

		if (ctrl.loginEndpoint) {
			formTag.action = ctrl.loginEndpoint + location.search;
		}

		Lang.translate(content);

		ctrl.appendChild(content);
	}

	function changePass(evt) {
		if (evt.detail.action == 'changepass') {
			var content = tmpForgottenPass.content.cloneNode(true),
				formTag = content.querySelector('form');

			cleanup(this);

			if (this.passwordEndpoint) {
				formTag.action = this.passwordEndpoint;
			}

			this.appendChild(content);
		} else if (evt.detail.action == 'cancel') {
			showLogin(this);
		}
	}

	function afterLogin(evt) {
		var ctrl = this,
			action = evt.detail.action;

		// successful login
		if (action.indexOf(ctrl.loginEndpoint) >= 0) {
			var data = evt.detail.formData,
				returnUrl = evt.detail.result.returnUrl || getReturnUrl();

			// in case OAuth is used, grab and store authorization token
			if (ctrl.tokenEndpoint) {
				Dragon.xhr({
					url: ctrl.tokenEndpoint,
					verb: "POST",
					contentType: "application/x-www-form-urlencoded",
					data: "client_id=" + ctrl.clientID + "&grant_type=password&username=" + data.username + "&password=" + data.password
				}).then(function (result) {
					localStorage.setItem(Dragon.config.tokenKey, result.access_token);
					redirect(returnUrl, ctrl);
				});
			} else {
				redirect(returnUrl, ctrl);
			}
			// new password request was sent
		} else if (action.indexOf(ctrl.passwordEndpoint) >= 0) {
			showLogin(ctrl);
		}
	}

	return WC.register('ctrl-login', {
		template: template,
		lifecycle: {
			created: function () {
				var ctrl = this,
					img = ctrl.shadowRoot.querySelector('img');

				if (ctrl.imageSrc) {
					img.src = ctrl.imageSrc;
				}

				showLogin(ctrl);

				// handle login/change pass action
				Event.add(ctrl, 'formsubmit', afterLogin);

				// switch to change password
				Event.add(ctrl, 'action', changePass);

				//if (!ctrl.externalLogin)
				//	btnExtLogin.parentNode.removeChild(btnExtLogin);
				//else {
				//	Dragon.Event.add(btnExtLogin, 'login_success', function (evt) {
				//		console.log("User loggin: " + evt.evtData.id);

				//		if (ctrl.externalLogin)
				//			ctrl.externalLogin();

				//		Dragon.ajax({
				//			service: 'api/login/' + evt.evtData.auth + '/' + evt.evtData.id
				//		}).then(function (userData) {
				//			lgnsucc(userData);
				//		}, function (err) {
				//			var obj = JSON.parse(err.message);

				//			if (obj.code === '7')//not connected expected exception
				//			{
				//				btnLogin.textContent = 'CONNECT';
				//				document.forms[0].action = 'api/login/' + evt.evtData.auth + '/' + evt.evtData.id;
				//			} else {
				//				document.forms[0].action = 'api/login';
				//				btnLogin.textContent = 'LOGIN';
				//			}

				//			showMsg(obj.message, 'error');
				//		});
				//	});
				//}
			}
		},
		externalLogin: {
			attribute: {}
		},
		useNodeCode: {
			attribute: { boolean: true }
		},
		loginEndpoint: {
			attribute: {}
		},
		tokenEndpoint: {
			attribute: {}
		},
		passwordEndpoint: {
			attribute: {}
		},
		defaultUrl: {
			attribute: {}
		},
		clientID: {
			attribute: {}
		},
		imageSrc: {
			attribute: {}
		},
		loadingText: {
			attribute: {},
			set: function (value) {
				var form = this.querySelector('ctrl-form,form[is="ctrl-form"]');

				if (!form)
					return;

				form.setAttribute('loadingtext', value);
			}
		}
	});
});

// make return url coming from server or use search string
