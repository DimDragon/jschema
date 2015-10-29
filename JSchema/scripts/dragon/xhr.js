Dragon.module(['dragon/dom', 'dragon/enum'], function (Dom, Enum) {

    var responseType = {
        document: 'document',
        json: 'json',
        arraybuffer: 'arraybuffer',
        blob: 'blob',
        text: 'text'
    };

    //In all browsers that support responseType, the default value of responseType is an empty string 
    //(just like it says in the spec: http://www.w3.org/TR/XMLHttpRequest/#the-responsetype-attribute ),
    //in browsers that don't support responseType the value of the attribute is undefined.
    var hasResponseType = typeof new XMLHttpRequest().responseType === 'string';

    function xhr(opt) {
        ///<summary>
        ///		Method for making asyncronious XHR
        ///</summary>
        ///<param name="options" type="Object">
        ///		Options needed to make XHR call
        ///		<list>
        ///			<item name="url" type="String">request path</item>
        ///			<item name="cors" type="Boolean" default="false">allow cross-origin requests</item>
        ///			<item name="verb" type="String" default="GET">HTTP verb to use</item>
        ///			<item name="accept" type="String" default="applicaton/json">allowed MIME types</item>
        ///			<item name="contentType" type="String" default="application/json; charset=utf-8">content MIME type</item>
        ///			<item name="nocache" type="Boolean" default="false">allow to prevent chaching of request</item>
        ///			<item name="headers" type="Object">key-value object with http headers to set</item>
        ///			<item name="data" type="Object">custom data to be sent with request</item>
        ///			<item name="responseType" type="String">Set response type. Not fully supported yet!</item>
        ///			<item name="username" type="String">Optional. Credentials username</item>
        ///			<item name="password" type="String">Optional. Credentials password</item>
        ///		</list>
        ///</param>
        ///<returns type="Dragon.Promise">When successful original options object with added 'value' property</returns>
        var def = new Dragon.Defer(),
            xhr;

        if (window.XMLHttpRequest) { // code for IE7+, Firefox, Chrome, Opera, Safari
            xhr = new XMLHttpRequest();
        } else if (window.ActiveXObject) { // code for IE6, IE5
            try {
                xhr = new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                try {
                    xhr = new ActiveXObject("Microsoft.XMLHTTP");
                } catch (e) {
                }
            }
        }

        if (!xhr)
            return false;

        xhr.onreadystatechange = function () {
            try {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        if (hasResponseType && isResponseTypeSupported) {
                            if (xhr.response != 'undefined' && xhr.response != null) {
                                def.resolve(xhr.response);
                            } else {
                                def.reject({
                                    message: 'Response is empty or undefined. ResponseType problem.',
                                    status: xhr.status
                                });
                            }

                        } else {
                            switch (opt.responseType) {
                                case responseType.document:
                                    var contentType = xhr.getResponseHeader("Content-Type");
                                    if (contentType == 'text/xml' && xhr.responseXML) {
                                        def.resolve(xhr.responseXML);
                                    }
                                    else if (contentType == 'text/html' && xhr.responseText) {
                                        try {
                                            var doc = document.implementation.createHTMLDocument("");
                                            doc.body.appendChild(parseHTML(xhr.responseText));
                                            def.resolve(doc);
                                        } catch (ex) {
                                            var htmldoc = new ActiveXObject("htmlfile");
                                            htmldoc.write(xhr.responseText);
                                            htmldoc.close();
                                            def.resolve(htmldoc);
                                        }
                                    }
                                    break;
                                case responseType.json:
                                    def.resolve(JSON.parse(xhr.responseText));
                                    break;
                                //  NYI        
                                //  case ResponseType.arraybuffer:    
                                //      break;    
                                //  case ResponseType.blob:    
                                //      break;    
                                default:
                                    //Todo Text
                                    def.resolve(xhr.responseText);
                            }
                        }
                    } else {
                        def.reject({
                            message: xhr.responseText,
                            status: xhr.status
                        });
                    }
                } else {
                    // allows us to handle progress
                    def.progress(xhr);
                }
            }
            catch (ex) {
                def.reject({
                    message: ex.description,
                    status: xhr.status
                });
            }

        };

        // process routing params
        if (opt.data && typeof opt.data === 'object') {
            opt.url = opt.url.replace(/{(.+?)}/g, function (match, param) {
                return data[param];
            });

            opt.data = JSON.stringify(opt.data);
        }

        xhr.open(opt.verb || 'GET', opt.url, true, opt.username, opt.password);

        // set various headers
        //xhr.setRequestHeader('Accept', opt.accept || appJson);
        //xhr.setRequestHeader('Content-Type', opt.contentType || (appJson + '; charset=utf-8'));

        // prevent caching
        if (opt.nocache) {
            xhr.setRequestHeader('Cache-Control', 'no-cache');
        }

        // NOTE: here we can add some comparison between url and local domain and remove global setting
        if (opt.cors || Dragon.config.allowCors) {
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.withCredentials = true;
        }

        // set rest of provided headers
        Object.keys(opt.headers || {}).forEach(function (key) {
            xhr.setRequestHeader(key, opt.headers[key]);
        });


        var isResponseTypeSupported = false,
            requestResponseType = responseType.json;

        //in the specification responseType for xml and html is "document", we work with the two sub types for the cases responseType is not supported
        if (opt.responseType) {
            requestResponseType = opt.responseType;
        } else {
            opt.responseType = responseType.json;
        }

        //setting responseType to a specific type and  if it got the new value means browsers supports it:
        if (hasResponseType) {
            try {
                xhr.responseType = requestResponseType;
            } catch (e) {
                xhr.responseType = '';
            }
            isResponseTypeSupported = xhr.responseType === requestResponseType;
        }


        if (!hasResponseType || !isResponseTypeSupported) {
            switch (opt.responseType) {
                case responseType.document:
                    xhr.setRequestHeader('Accept', "text/html");
                    xhr.setRequestHeader('Content-Type', "text/html");
                    break;
                //                case responseType.html:  
                //                    xhr.setRequestHeader('Accept', "text/html");  
                //                    xhr.setRequestHeader('Content-Type', "text/html");  
                //                    break;  
                case responseType.json:
                    xhr.setRequestHeader('Accept', 'application/json');
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    break;
                case responseType.arraybuffer:
                    xhr.setRequestHeader('Accept-Charset', 'x-user-defined');
                    xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
                    break;
                case responseType.blob:
                default:
                    xhr.setRequestHeader('Accept', "text/plain");
                    xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
                    break;
            }


        }
        xhr.send(opt.data);
        return def.promise;
    }

    return {
        ajax: xhr,
        _namespace: 'Dragon.ajax'
    };

});

//function parseXMl(data) {
//    var xml, tmp;
//    if (!data || typeof data !== "string") {
//        return null;
//    }
//    try {
//        if (window.DOMParser) { // Standard
//            tmp = new DOMParser();
//            xml = tmp.parseFromString(data, "text/xml");
//        } else { // IE
//            xml = new ActiveXObject("Microsoft.XMLDOM");
//            xml.async = "false";
//            xml.loadXML(data);
//        }
//    } catch (e) {
//        xml = undefined;
//    }

//    if (!xml || !xml.documentElement || xml.getElementsByTagName("parsererror").length)
//        throw new Error("Invalid XML: " + data);

//    return xml;
//}