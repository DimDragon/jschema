/* Options:
cssClass, -- control wrapper css class
buttonCssClass, -- browse button css class
maxSize,
multiple: allow multiple file upload
extensions,
preview: -- preview options 
text, -- text shown initially - when no files are selected
type: 'small' - add small thumbnails with option to specify icon class for non image files, 
'titles' - show titles only, 
'large'- pictures with possible size restrictions 
Default is titles view similar to standard element input type="file".
*/

// TODO - waiting for event retargeting to make final changes ot this control
Dragon.module(['dragon/components', 'dragon/dom', 'dragon/classlist', 'dragon/event', 'dragon/components/file.html', 'dragon/components/img-button'], function (WC, Dom, Class, Event, doc) {
 
    // NOTE: probably make this method of Components which also handles template polyfill
    var DEFAULT_PREVIEW_CLASS = 'no-preview', // change to text preview only
		SMALLPREVIEW_CLASS = 'small-preview',
		SINGLELINE_CLASS = 'singleline',
        LOADING_CLASS = 'loading',
        IMAGE_TYPE = /image.*/,
        MAX_FILE_SIZE = (5242880) * 4, // 5MB 
        MAX_IMG_WIDTH = 50,
        MAX_IMG_HEIGHT = 50,
        DEFAULT_VIEW = 'titles',
		idCounter = 0,
         //get templates - the form has several templates so select them by id to load them only when necessary
        template = doc.querySelector('#fileUpload'), //main template
        defaultElement = template.content.querySelector('li'),
        imgElement = doc.querySelector('#imagePreview').content.cloneNode(true),
        iconElement = doc.querySelector('#iconPreview').content.cloneNode(true),
        titleElement = doc.querySelector('#titlePreview').content.cloneNode(true),
        aMultiples,
        btnSubmit = template.content.querySelector('#btnSubmit'); //TODO - change name to be more meaningful outside the calculateSize function

    function calculateSize(files) {
        var nBytes = 0,
        	nFiles = files.length;

        for (var i = 0; i < nFiles; i++) {
            nBytes += Object.keys(files[i].content).length;
        }

        var sOutput = nBytes + ' bytes';
        // optional code for multiples approximation
        for (var aMultiples = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'], nMultiple = 0, nApprox = nBytes / 1024; nApprox > 1; nApprox /= 1024, nMultiple++) {
            sOutput = nApprox.toFixed(3) + ' ' + aMultiples[nMultiple] + ' (' + nBytes + ' bytes)';
        }
        // end of optional code
        return { 'filesCount': nFiles, 'size': sOutput };
    };

    function errorHandler(evt) {
        switch (evt.target.error.code) {
            case evt.target.error.NOT_FOUND_ERR:
                Error('File Not Found!');
                break;
            case evt.target.error.NOT_READABLE_ERR:
                Error('File is not readable');
                break;
            case evt.target.error.ABORT_ERR:
                Error('File read abort');
                break; // noop
            default:
                Error('An error occurred reading this file.');
        };
    }

    // Increase the progress bar length.
    function styleProgress(progress, percentLoaded) {
        var styleElem = progress.firstChild;

        styleElem.style.width = percentLoaded + '%';
        styleElem.setAttribute('title', percentLoaded + '%');
        styleElem.setAttribute('alt', percentLoaded + '%');

        if (percentLoaded == 100) {
            setTimeout(function () { Class.remove(progress, LOADING_CLASS); }, 1000);
        }

    }

    function handleFileSelect(elem, itemElement, file) {
        var progress = itemElement.querySelector('.progress'),
            percent = progress.querySelector('.percent'),
            item = itemElement.querySelector(".file-item"),
            isImage = file.type.match(IMAGE_TYPE) != null,
            supportsFileAPI = !!(window.File && window.FileReader && window.FileList && window.Blob),
            showProgress = /*isImage && */elem.previewType != DEFAULT_VIEW && !file.content && supportsFileAPI,
            reader;

        // If display view shows only file names DEFAULT_VIEW 
        // or file is not an image the files are not loaded in memory - hense no progress can be shown.
        // Show complete progress (100%) instead.
        if (!showProgress) {
            Class.add(progress, LOADING_CLASS);
            styleProgress(progress, 100);

            if (file.content /*&& isImage*/) {
                if (elem.previewType != DEFAULT_VIEW) {
                    item.src = file.content;
                    validateImage(elem, item);
                }                
            }
            return;
        }

      //  if (supportsFileAPI && file.content === undefined) {
            // Reset progress indicator on new file selection - 0%.
            styleProgress(progress, 0);

            reader = new FileReader();
            reader.onerror = errorHandler;
            reader.onprogress = function (e) {
                if (e.lengthComputable) {
                    var percentLoaded = Math.round((e.loaded / e.total) * 100);
                    if (percentLoaded < 100) {
                        styleProgress(progress, percentLoaded);
                    }
                }
            };
            reader.onabort = function (e) {
                console.log('File read cancelled');
            };
            reader.onloadstart = function (e) {
                Class.add(progress, LOADING_CLASS);
            };

            reader.onload = (function (rItem) {
                return function (evt) {
                    var data = evt.target.result;

                    if (elem.previewType != DEFAULT_VIEW) {
                        rItem.onload = function (evt) {
                            validateImage(elem, evt.target);
                        };

                        rItem.src = data;
                    }
                    elem.ctrl.blobFiles[file.name] = {
                        type: file.type,
                        content: data.split(',')[1],
                        size : file.size
                    };
                    styleProgress(progress, 100);
                };
            })(item);

            reader.readAsDataURL(file);
       // }
    }

    function readFile(file) {
    	return new Promise(function (resolve, reject) {
    		reader = new FileReader();
    		reader.onload = function (evt) {
    			file.content = evt.target.result.split(',')[1];
    			resolve({ 'key': file.name, 'result': file });
    		};

    		reader.onerror = reject;
    		reader.readAsDataURL(file);
    	});
    };

    function deselectItem(elem, evt) {
        Event.cancel(evt);

        var item = Dom.parent(evt.target, '.file-preview'),
           filename = evt.target.dataset.filename,
           count;

        delete elem.ctrl.blobFiles[filename];
        count = Object.keys(elem.ctrl.blobFiles).length;

        if (count === 0) {
            elem.appendChild(defaultElement.cloneNode(true)); //show default content
        }

        if (count === 1) {
            Class.add(elem, SINGLELINE_CLASS);
        }

        elem.removeChild(item);
    };

    function addItemPreview(elem, file) {
        var preview = elem.shadowRoot.querySelector('.preview'),
            itemFragment = (!elem.previewType || elem.previewType === 'titles'
                                ? titleElement
                                : (file.type.match(IMAGE_TYPE) ? imgElement : iconElement)
                            ).cloneNode(true),
        // img holding image/thumbnail or span(iconPreview)
            item = !elem.previewType || elem.previewType === 'titles'
                        ? null
                        : Dom.find(itemFragment, ".file-item")[0],
            closeButton = Dom.find(itemFragment, "button")[0],
            ctrlTitle = Dom.find(itemFragment, ".file-title")[0],
            defaultItem = elem.ctrl.list.querySelector(".default"),
            singleView = Object.keys(elem.ctrl.blobFiles).length === 1;

        if (defaultItem !== null) {
            elem.ctrl.list.removeChild(defaultItem);
        }

        if (singleView) {
            //var defaultItem = elem.ctrl.list.querySelector(".default");

            //elem.ctrl.list.removeChild(defaultItem);
            Class.add(elem, SINGLELINE_CLASS);
        }
        else {
            Class.remove(elem, SINGLELINE_CLASS);
        }

        if (elem.previewType && elem.previewType !== 'titles') {
            if (file.type.match(IMAGE_TYPE)) {//image
            	Class.add(itemFragment.querySelector('li'), 'hidden'); //hide image - we need to validate size and dimensions prior to showing image
                item.setAttribute('alt', file.name);
            }
            else {
                item.setAttribute('data-type', file.name.split('.')[1]);
                item.setAttribute('title', file.name);
            }
        }

        closeButton.setAttribute('data-filename', file.name);
        Event.add(closeButton, 'click', function (event) { deselectItem(elem, event); }, true); // place in template - it is not rendered untill needed anyway
        ctrlTitle.innerHTML = file.name;

        var itemElement = itemFragment.querySelector('li');
        elem.appendChild(itemElement);
        return itemElement;
    };

    function getExtension(filename) {
        var ext = filename.split(".");

        if (ext.length === 1 || (ext[0] === "" && ext.length === 2)) {
            ext = "";
        }
        return ext.pop();
    }

    function validateType(elem, file) {
		//TODO temporary fix uncomment later an make it work
        //var type = file.type || file.mimeType || getExtension(file);

        //if (elem.accept != '*' && !type.match(RegExp(elem.accept, 'i'))) {
        //    elem.ctrl.fileInput.setCustomValidity("File type is invalid, allowed extensions are: " + elem.accept);
        //    return false;
        //}
        return true;
    }

    function validateImage(elem, img) {
        var imgHolder = Dragon.Dom.parent(img, 'li');

        if (img.height > elem.maxHeight || img.width > elem.maxWidth) {
        	Class.add(imgHolder, 'hidden');
            elem.ctrl.fileInput.setCustomValidity('Maximum image dimensions are exceeded.');
            return false;
        }

        Class.remove(imgHolder, 'hidden');
        return true;
    }

    function validateFile(elem, file) {
        var hasFileSupport = window.File && window.FileReader && window.FileList && window.Blob,
            name = file.name,
            size = file.size;

        if (elem.ctrl.blobFiles[name]) {
            elem.ctrl.fileInput.setCustomValidity('The file is already uploaded.');
            return;
        }

        if (size > elem.maxSize) {
            elem.ctrl.fileInput.setCustomValidity('Maximum file size is exceeded.');
            return false;
        }

        if (!validateType(elem, file)) {
            return false;
        }

        return true;
    }

    function processFile(elem, file) {
        var itemElement;

        if (validateFile(elem, file)) {
            itemElement = addItemPreview(elem, file);
            handleFileSelect(elem, itemElement, file);
            elem.ctrl.blobFiles[file.name] = file;
        }
    };

    function clientUpload(elem, evt) {
        var fileInput = evt.target,
            files = elem.ctrl.fileInput.files; // TODO - does this need a change to object value property

        for (var i = 0, file; file = files[i]; i++) {
            processFile(elem, file);
        }
    };

    function frameUpload(elem, evt) {
        var filename = elem.ctrl.fileInput.value,
            form = document.forms[0],
            iframe = document.createElement('iframe'),
            IFRAME_ID = 'my_iframe',
            INPUT_NAME = elem.ctrl.fileInput.name,
            dynamicForm = false;

        if (!validateType(elem, filename)) {
            return false;
        }

        //form.setAttribute('target', "testfrm");
        //form.setAttribute('action', "http://192.168.0.105/DragonJS/api/fileupload/");
        //form.submit();
        //return true;

        if (!form) {

            // instead, in IE you must do
            //var form = document.createElement(”);
            var form = document.createElement("form");

            form.name = 'upload_form';
            form.method = 'GET';
            form.action = "";
            form.target = IFRAME_ID;
            dynamicForm = true;

            //For IE8 we need to set both.
            form.encoding = form.enctype = "multipart/form-data";
            //  }
            form.appendChild(elem.ctrl.fileInput);
            document.body.appendChild(form);
        }

        // Create the iframe...       
        iframe.id = IFRAME_ID;
        iframe.setAttribute('name', IFRAME_ID);
        iframe.setAttribute('width', '0');
        iframe.setAttribute('height', '0');
        iframe.setAttribute('border', '0');
        iframe.setAttribute('style', 'width: 0; height: 0; border: none;');
        //iframe.src = "javascript:document.write('<script>document.domain=\"" + "192.168.0.105\DragonJS" + "\";</script>')";

        document.body.appendChild(iframe);

        iframeId = document.querySelector('#' + IFRAME_ID);
        iframeId.name = IFRAME_ID;       

        // Add event...
        var eventHandler = function () {
            var content = '',
                json,
                file,
                itemElement;

            try { // try-catch block handles server errors that may occur 
                 // and result in response code != 200 which results in access denied error
                if (iframeId.detachEvent)
                    iframeId.detachEvent('onload', eventHandler);
                else
                    iframeId.removeEventListener('load', eventHandler, false);

                // Message from server...
                if (iframeId.contentDocument) {
                    content = iframeId.contentDocument.body.innerHTML;
                } else if (iframeId.contentWindow) {
                    content = iframeId.contentWindow.document.body.innerHTML;
                } else if (iframeId.document) {
                    content = iframeId.document.body.innerHTML;
                }

                if (content === '')
                    return;

                file = JSON.parse(content);

                if (file.error === null || file.error === '') {
                    itemElement = addItemPreview(elem, file);
                    handleFileSelect(elem, itemElement, file);
                    elem.ctrl.blobFiles[file.name] = file;

                    if (dynamicForm) {
                        elem.appendChild(document.querySelector('input[name="' + INPUT_NAME + '"]'));
                    }
                }
            }
            finally {
                // Delete the iframe...
                setTimeout('iframeId.parentNode.removeChild(iframeId)', 250);

                //clean properties
                form.setAttribute('target', '');
                form.setAttribute('action', location.href);
                form.setAttribute('enctype', 'multipart/form-data');
                form.setAttribute('encoding', '');
            }
        }

        if (iframeId.addEventListener) {
            iframeId.addEventListener('load', eventHandler, true);
        } else if (iframeId.attachEvent) {
            iframeId.attachEvent('onload', eventHandler);
        }

        // Set properties of form...
        form.setAttribute('target', IFRAME_ID);
        form.setAttribute('action', "http://192.168.0.105/DragonJS/api/fileupload/"); // Dragon.config.fileHandler);
        form.setAttribute('method', 'post');
        form.setAttribute('enctype', 'multipart/form-data');
        form.setAttribute('encoding', 'multipart/form-data');

        // Submit the form...
        form.submit();
    };

    function fileUpload(evt) {
        var elem = Dom.shadowHost(evt.target);
        // Check for the various File API support.
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            clientUpload(elem, evt); 
        } else {
            frameUpload(elem, evt); 
        }
    };

    function handleDragEnter(evt) {
        Event.cancel(evt);
    };

    function handleDragOver(evt) {
        Event.cancel(evt);
    };

    function handleDropOver(evt) {
        Event.cancel(evt);

        if (evt.dataTransfer.files) {
            var file,
                elem = Dom.parent(evt.target, ".ctrl-file"); 

            for (var i = 0; i < evt.dataTransfer.files.length; i++) {
                file = evt.dataTransfer.files[i];
                processFile(elem, file); 
            }
        }
    };

    return WC.register('ctrl-file', {
        template: template,
        lifecycle: {
            created: function () {
                this.ctrl.fileInput = this.shadowRoot.querySelector('input');
                this.ctrl.list = this.shadowRoot.querySelector('ul');
                this.ctrl.select = this.shadowRoot.querySelector('button');
                this.ctrl.fileInput.style.width = this.ctrl.select.offsetWidth + "px";
                this.ctrl.blobFiles = {};

				this.ctrl.fileInput.setAttribute('id', 'dragon_file_upload_' + (idCounter++));
				this.ctrl.fileInput.setAttribute('name', this.ctrl.fileInput.name);

                if (this.previewType == DEFAULT_VIEW) {
                    Class.add(this, DEFAULT_PREVIEW_CLASS);
                }

                Event.add(this.ctrl.fileInput, 'change', fileUpload, false);
                Event.add(this.ctrl.fileInput, 'dragenter', handleDragEnter, false); 
                Event.add(this, 'dragover', handleDragOver, false); 
                Event.add(this, 'drop', handleDropOver, false);

                //Event.add(btnSubmit, "submit", fileUpload);
            },
            enteredView: null,
            leftView: null,
            attributeChanged: function (name, oldValue, newValue) {
                var action = !oldValue ? 'added' : !newValue ? 'removed' : 'changed';
            }
        },
        //attributes
        value: {
            get: function () {
                return this.ctrl.fileInput.value;
            },
            set: function (val) {
                this.ctrl.fileInput.value = val;
				this.ctrl.blobFiles = {};
				var previewItems = this.ctrl.list.querySelectorAll('.file-preview');

				for (var i = 0; i < previewItems.length; i++) {
					this.ctrl.list.removeChild(previewItems[i]);
				}

				this.ctrl.list.appendChild(defaultElement.cloneNode(true));
            }
        },
        multiple: {
            attribute: { select: 'input' }
        },
        accept: {
            attribute: {}
        },
        maxWidth: {
            attribute: {},
            get: function () {
                return this.ctrl._maxWidth || MAX_IMG_WIDTH;
            },
            set: function (val) {
                this.ctrl._maxWidth = val;
            }
        },
        maxHeight: {
            attribute: {},
            get: function () {
                return this.ctrl._maxHeight || MAX_IMG_HEIGHT;
            },
            set: function (val) {
                this.ctrl._maxHeight = val;
            }
        },
        maxSize: {
            attribute: {},
            get: function () {
                return this.ctrl._maxSize || MAX_FILE_SIZE;
            },
            set: function (val) {
                this.ctrl._maxSize = val;
            }
        },
        previewType: {
            attribute: {},
            get: function () {
                return this.ctrl._previewType || DEFAULT_VIEW;
            },
            set: function (val) {       // change custom control class on set
                this.ctrl._previewType = val;

                if (val === 'small') {
                    Class.remove(this, DEFAULT_PREVIEW_CLASS);
                    Class.toggle(this, SMALLPREVIEW_CLASS);
                }
            }
        },
        getFiles: function () {
            var file,
                promises = [],
                errors = [],
                p;

            for (var key in this.ctrl.blobFiles) {
                file = this.ctrl.blobFiles[key];

               if(!file.content){
                    var tmp = readFile(file);
                    promises.push(tmp);
                    tmp.then(function (context) {
                        file = context.result;
                    }, function () {
                        errors.push(key);
                    });
	            } else
		            promises.push({'key': file.name, 'result': file});
            }
            return Promise.all(promises);
        },
        loadFiles: function (files) {
            var itemElement,
                file;

            for (var i = 0; i < files.length; i++) {
                file = files[i];
                this.ctrl.blobFiles[file.name] =  file;
                itemElement = addItemPreview(this, file);
                handleFileSelect(this, itemElement, file);
            }
        },
        name: {
        	attribute: {}
        },
        checkValidity: function () {
        	this.validity.valueMissing = this.hasAttribute('required') && !this.value;

        	return !this.validity.valueMissing;
        }
    });
});