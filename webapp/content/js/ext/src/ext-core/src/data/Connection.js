/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
(function(){
    var BEFOREREQUEST = "beforerequest",
        REQUESTCOMPLETE = "requestcomplete",
        REQUESTEXCEPTION = "requestexception",
        UNDEFINED = undefined,
        LOAD = 'load',
        POST = 'POST',
        GET = 'GET',
        WINDOW = window;

    /**
     * @class Ext.data.Connection
     * @extends Ext.util.Observable
     * <p>The class encapsulates a connection to the page's originating domain, allowing requests to be made
     * either to a configured URL, or to a URL specified at request time.</p>
     * <p>Requests made by this class are asynchronous, and will return immediately. No data from
     * the server will be available to the statement immediately following the {@link #request} call.
     * To process returned data, use a
     * <a href="#request-option-success" ext:member="request-option-success" ext:cls="Ext.data.Connection">success callback</a>
     * in the request options object,
     * or an {@link #requestcomplete event listener}.</p>
     * <p><h3>File Uploads</h3><a href="#request-option-isUpload" ext:member="request-option-isUpload" ext:cls="Ext.data.Connection">File uploads</a> are not performed using normal "Ajax" techniques, that
     * is they are <b>not</b> performed using XMLHttpRequests. Instead the form is submitted in the standard
     * manner with the DOM <tt>&lt;form></tt> element temporarily modified to have its
     * <a href="http://www.w3.org/TR/REC-html40/present/frames.html#adef-target">target</a> set to refer
     * to a dynamically generated, hidden <tt>&lt;iframe></tt> which is inserted into the document
     * but removed after the return data has been gathered.</p>
     * <p>The server response is parsed by the browser to create the document for the IFRAME. If the
     * server is using JSON to send the return object, then the
     * <a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.17">Content-Type</a> header
     * must be set to "text/html" in order to tell the browser to insert the text unchanged into the document body.</p>
     * <p>Characters which are significant to an HTML parser must be sent as HTML entities, so encode
     * "&lt;" as "&amp;lt;", "&amp;" as "&amp;amp;" etc.</p>
     * <p>The response text is retrieved from the document, and a fake XMLHttpRequest object
     * is created containing a <tt>responseText</tt> property in order to conform to the
     * requirements of event handlers and callbacks.</p>
     * <p>Be aware that file upload packets are sent with the content type <a href="http://www.faqs.org/rfcs/rfc2388.html">multipart/form</a>
     * and some server technologies (notably JEE) may require some custom processing in order to
     * retrieve parameter names and parameter values from the packet content.</p>
     * <p>Also note that it's not possible to check the response code of the hidden iframe, so the success handler will ALWAYS fire.</p>
     * @constructor
     * @param {Object} config a configuration object.
     */
    Ext.data.Connection = function(config){
        Ext.apply(this, config);
        this.addEvents(
            /**
             * @event beforerequest
             * Fires before a network request is made to retrieve a data object.
             * @param {Connection} conn This Connection object.
             * @param {Object} options The options config object passed to the {@link #request} method.
             */
            BEFOREREQUEST,
            /**
             * @event requestcomplete
             * Fires if the request was successfully completed.
             * @param {Connection} conn This Connection object.
             * @param {Object} response The XHR object containing the response data.
             * See <a href="http://www.w3.org/TR/XMLHttpRequest/">The XMLHttpRequest Object</a>
             * for details.
             * @param {Object} options The options config object passed to the {@link #request} method.
             */
            REQUESTCOMPLETE,
            /**
             * @event requestexception
             * Fires if an error HTTP status was returned from the server.
             * See <a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html">HTTP Status Code Definitions</a>
             * for details of HTTP status codes.
             * @param {Connection} conn This Connection object.
             * @param {Object} response The XHR object containing the response data.
             * See <a href="http://www.w3.org/TR/XMLHttpRequest/">The XMLHttpRequest Object</a>
             * for details.
             * @param {Object} options The options config object passed to the {@link #request} method.
             */
            REQUESTEXCEPTION
        );
        Ext.data.Connection.superclass.constructor.call(this);
    };

    Ext.extend(Ext.data.Connection, Ext.util.Observable, {
        /**
         * @cfg {String} url (Optional) <p>The default URL to be used for requests to the server. Defaults to undefined.</p>
         * <p>The <code>url</code> config may be a function which <i>returns</i> the URL to use for the Ajax request. The scope
         * (<code><b>this</b></code> reference) of the function is the <code>scope</code> option passed to the {@link #request} method.</p>
         */
        /**
         * @cfg {Object} extraParams (Optional) An object containing properties which are used as
         * extra parameters to each request made by this object. (defaults to undefined)
         */
        /**
         * @cfg {Object} defaultHeaders (Optional) An object containing request headers which are added
         *  to each request made by this object. (defaults to undefined)
         */
        /**
         * @cfg {String} method (Optional) The default HTTP method to be used for requests.
         * (defaults to undefined; if not set, but {@link #request} params are present, POST will be used;
         * otherwise, GET will be used.)
         */
        /**
         * @cfg {Number} timeout (Optional) The timeout in milliseconds to be used for requests. (defaults to 30000)
         */
        timeout : 30000,
        /**
         * @cfg {Boolean} autoAbort (Optional) Whether this request should abort any pending requests. (defaults to false)
         * @type Boolean
         */
        autoAbort:false,

        /**
         * @cfg {Boolean} disableCaching (Optional) True to add a unique cache-buster param to GET requests. (defaults to true)
         * @type Boolean
         */
        disableCaching: true,

        /**
         * @cfg {String} disableCachingParam (Optional) Change the parameter which is sent went disabling caching
         * through a cache buster. Defaults to '_dc'
         * @type String
         */
        disableCachingParam: '_dc',

        /**
         * <p>Sends an HTTP request to a remote server.</p>
         * <p><b>Important:</b> Ajax server requests are asynchronous, and this call will
         * return before the response has been received. Process any returned data
         * in a callback function.</p>
         * <pre><code>
Ext.Ajax.request({
   url: 'ajax_demo/sample.json',
   success: function(response, opts) {
      var obj = Ext.decode(response.responseText);
      console.dir(obj);
   },
   failure: function(response, opts) {
      console.log('server-side failure with status code ' + response.status);
   }
});
         * </code></pre>
         * <p>To execute a callback function in the correct scope, use the <tt>scope</tt> option.</p>
         * @param {Object} options An object which may contain the following properties:<ul>
         * <li><b>url</b> : String/Function (Optional)<div class="sub-desc">The URL to
         * which to send the request, or a function to call which returns a URL string. The scope of the
         * function is specified by the <tt>scope</tt> option. Defaults to the configured
         * <tt>{@link #url}</tt>.</div></li>
         * <li><b>params</b> : Object/String/Function (Optional)<div class="sub-desc">
         * An object containing properties which are used as parameters to the
         * request, a url encoded string or a function to call to get either. The scope of the function
         * is specified by the <tt>scope</tt> option.</div></li>
         * <li><b>method</b> : String (Optional)<div class="sub-desc">The HTTP method to use
         * for the request. Defaults to the configured method, or if no method was configured,
         * "GET" if no parameters are being sent, and "POST" if parameters are being sent.  Note that
         * the method name is case-sensitive and should be all caps.</div></li>
         * <li><b>callback</b> : Function (Optional)<div class="sub-desc">The
         * function to be called upon receipt of the HTTP response. The callback is
         * called regardless of success or failure and is passed the following
         * parameters:<ul>
         * <li><b>options</b> : Object<div class="sub-desc">The parameter to the request call.</div></li>
         * <li><b>success</b> : Boolean<div class="sub-desc">True if the request succeeded.</div></li>
         * <li><b>response</b> : Object<div class="sub-desc">The XMLHttpRequest object containing the response data.
         * See <a href="http://www.w3.org/TR/XMLHttpRequest/">http://www.w3.org/TR/XMLHttpRequest/</a> for details about
         * accessing elements of the response.</div></li>
         * </ul></div></li>
         * <li><a id="request-option-success"></a><b>success</b> : Function (Optional)<div class="sub-desc">The function
         * to be called upon success of the request. The callback is passed the following
         * parameters:<ul>
         * <li><b>response</b> : Object<div class="sub-desc">The XMLHttpRequest object containing the response data.</div></li>
         * <li><b>options</b> : Object<div class="sub-desc">The parameter to the request call.</div></li>
         * </ul></div></li>
         * <li><b>failure</b> : Function (Optional)<div class="sub-desc">The function
         * to be called upon failure of the request. The callback is passed the
         * following parameters:<ul>
         * <li><b>response</b> : Object<div class="sub-desc">The XMLHttpRequest object containing the response data.</div></li>
         * <li><b>options</b> : Object<div class="sub-desc">The parameter to the request call.</div></li>
         * </ul></div></li>
         * <li><b>scope</b> : Object (Optional)<div class="sub-desc">The scope in
         * which to execute the callbacks: The "this" object for the callback function. If the <tt>url</tt>, or <tt>params</tt> options were
         * specified as functions from which to draw values, then this also serves as the scope for those function calls.
         * Defaults to the browser window.</div></li>
         * <li><b>timeout</b> : Number (Optional)<div class="sub-desc">The timeout in milliseconds to be used for this request. Defaults to 30 seconds.</div></li>
         * <li><b>form</b> : Element/HTMLElement/String (Optional)<div class="sub-desc">The <tt>&lt;form&gt;</tt>
         * Element or the id of the <tt>&lt;form&gt;</tt> to pull parameters from.</div></li>
         * <li><a id="request-option-isUpload"></a><b>isUpload</b> : Boolean (Optional)<div class="sub-desc"><b>Only meaningful when used
         * with the <tt>form</tt> option</b>.
         * <p>True if the form object is a file upload (will be set automatically if the form was
         * configured with <b><tt>enctype</tt></b> "multipart/form-data").</p>
         * <p>File uploads are not performed using normal "Ajax" techniques, that is they are <b>not</b>
         * performed using XMLHttpRequests. Instead the form is submitted in the standard manner with the
         * DOM <tt>&lt;form></tt> element temporarily modified to have its
         * <a href="http://www.w3.org/TR/REC-html40/present/frames.html#adef-target">target</a> set to refer
         * to a dynamically generated, hidden <tt>&lt;iframe></tt> which is inserted into the document
         * but removed after the return data has been gathered.</p>
         * <p>The server response is parsed by the browser to create the document for the IFRAME. If the
         * server is using JSON to send the return object, then the
         * <a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.17">Content-Type</a> header
         * must be set to "text/html" in order to tell the browser to insert the text unchanged into the document body.</p>
         * <p>The response text is retrieved from the document, and a fake XMLHttpRequest object
         * is created containing a <tt>responseText</tt> property in order to conform to the
         * requirements of event handlers and callbacks.</p>
         * <p>Be aware that file upload packets are sent with the content type <a href="http://www.faqs.org/rfcs/rfc2388.html">multipart/form</a>
         * and some server technologies (notably JEE) may require some custom processing in order to
         * retrieve parameter names and parameter values from the packet content.</p>
         * </div></li>
         * <li><b>headers</b> : Object (Optional)<div class="sub-desc">Request
         * headers to set for the request.</div></li>
         * <li><b>xmlData</b> : Object (Optional)<div class="sub-desc">XML document
         * to use for the post. Note: This will be used instead of params for the post
         * data. Any params will be appended to the URL.</div></li>
         * <li><b>jsonData</b> : Object/String (Optional)<div class="sub-desc">JSON
         * data to use as the post. Note: This will be used instead of params for the post
         * data. Any params will be appended to the URL.</div></li>
         * <li><b>disableCaching</b> : Boolean (Optional)<div class="sub-desc">True
         * to add a unique cache-buster param to GET requests.</div></li>
         * </ul></p>
         * <p>The options object may also contain any other property which might be needed to perform
         * postprocessing in a callback because it is passed to callback functions.</p>
         * @return {Number} transactionId The id of the server transaction. This may be used
         * to cancel the request.
         */
        request : function(o){
            var me = this;
            if(me.fireEvent(BEFOREREQUEST, me, o)){
                if (o.el) {
                    if(!Ext.isEmpty(o.indicatorText)){
                        me.indicatorText = '<div class="loading-indicator">'+o.indicatorText+"</div>";
                    }
                    if(me.indicatorText) {
                        Ext.getDom(o.el).innerHTML = me.indicatorText;
                    }
                    o.success = (Ext.isFunction(o.success) ? o.success : function(){}).createInterceptor(function(response) {
                        Ext.getDom(o.el).innerHTML = response.responseText;
                    });
                }

                var p = o.params,
                    url = o.url || me.url,
                    method,
                    cb = {success: me.handleResponse,
                          failure: me.handleFailure,
                          scope: me,
                          argument: {options: o},
                          timeout : Ext.num(o.timeout, me.timeout)
                    },
                    form,
                    serForm;


                if (Ext.isFunction(p)) {
                    p = p.call(o.scope||WINDOW, o);
                }

                p = Ext.urlEncode(me.extraParams, Ext.isObject(p) ? Ext.urlEncode(p) : p);

                if (Ext.isFunction(url)) {
                    url = url.call(o.scope || WINDOW, o);
                }

                if((form = Ext.getDom(o.form))){
                    url = url || form.action;
                     if(o.isUpload || (/multipart\/form-data/i.test(form.getAttribute("enctype")))) {
                         return me.doFormUpload.call(me, o, p, url);
                     }
                    serForm = Ext.lib.Ajax.serializeForm(form);
                    p = p ? (p + '&' + serForm) : serForm;
                }

                method = o.method || me.method || ((p || o.xmlData || o.jsonData) ? POST : GET);

                if(method === GET && (me.disableCaching && o.disableCaching !== false) || o.disableCaching === true){
                    var dcp = o.disableCachingParam || me.disableCachingParam;
                    url = Ext.urlAppend(url, dcp + '=' + (new Date().getTime()));
                }

                o.headers = Ext.apply(o.headers || {}, me.defaultHeaders || {});

                if(o.autoAbort === true || me.autoAbort) {
                    me.abort();
                }

                if((method == GET || o.xmlData || o.jsonData) && p){
                    url = Ext.urlAppend(url, p);
                    p = '';
                }
                return (me.transId = Ext.lib.Ajax.request(method, url, cb, p, o));
            }else{
                return o.callback ? o.callback.apply(o.scope, [o,UNDEFINED,UNDEFINED]) : null;
            }
        },

        /**
         * Determine whether this object has a request outstanding.
         * @param {Number} transactionId (Optional) defaults to the last transaction
         * @return {Boolean} True if there is an outstanding request.
         */
        isLoading : function(transId){
            return transId ? Ext.lib.Ajax.isCallInProgress(transId) : !! this.transId;
        },

        /**
         * Aborts any outstanding request.
         * @param {Number} transactionId (Optional) defaults to the last transaction
         */
        abort : function(transId){
            if(transId || this.isLoading()){
                Ext.lib.Ajax.abort(transId || this.transId);
            }
        },

        // private
        handleResponse : function(response){
            this.transId = false;
            var options = response.argument.options;
            response.argument = options ? options.argument : null;
            this.fireEvent(REQUESTCOMPLETE, this, response, options);
            if(options.success){
                options.success.call(options.scope, response, options);
            }
            if(options.callback){
                options.callback.call(options.scope, options, true, response);
            }
        },

        // private
        handleFailure : function(response, e){
            this.transId = false;
            var options = response.argument.options;
            response.argument = options ? options.argument : null;
            this.fireEvent(REQUESTEXCEPTION, this, response, options, e);
            if(options.failure){
                options.failure.call(options.scope, response, options);
            }
            if(options.callback){
                options.callback.call(options.scope, options, false, response);
            }
        },

        // private
        doFormUpload : function(o, ps, url){
            var id = Ext.id(),
                doc = document,
                frame = doc.createElement('iframe'),
                form = Ext.getDom(o.form),
                hiddens = [],
                hd,
                encoding = 'multipart/form-data',
                buf = {
                    target: form.target,
                    method: form.method,
                    encoding: form.encoding,
                    enctype: form.enctype,
                    action: form.action
                };

            /*
             * Originally this behaviour was modified for Opera 10 to apply the secure URL after
             * the frame had been added to the document. It seems this has since been corrected in
             * Opera so the behaviour has been reverted, the URL will be set before being added.
             */
            Ext.fly(frame).set({
                id: id,
                name: id,
                cls: 'x-hidden',
                src: Ext.SSL_SECURE_URL
            }); 

            doc.body.appendChild(frame);

            // This is required so that IE doesn't pop the response up in a new window.
            if(Ext.isIE){
               document.frames[id].name = id;
            }


            Ext.fly(form).set({
                target: id,
                method: POST,
                enctype: encoding,
                encoding: encoding,
                action: url || buf.action
            });

            // add dynamic params
            Ext.iterate(Ext.urlDecode(ps, false), function(k, v){
                hd = doc.createElement('input');
                Ext.fly(hd).set({
                    type: 'hidden',
                    value: v,
                    name: k
                });
                form.appendChild(hd);
                hiddens.push(hd);
            });

            function cb(){
                var me = this,
                    // bogus response object
                    r = {responseText : '',
                         responseXML : null,
                         argument : o.argument},
                    doc,
                    firstChild;

                try{
                    doc = frame.contentWindow.document || frame.contentDocument || WINDOW.frames[id].document;
                    if(doc){
                        if(doc.body){
                            if(/textarea/i.test((firstChild = doc.body.firstChild || {}).tagName)){ // json response wrapped in textarea
                                r.responseText = firstChild.value;
                            }else{
                                r.responseText = doc.body.innerHTML;
                            }
                        }
                        //in IE the document may still have a body even if returns XML.
                        r.responseXML = doc.XMLDocument || doc;
                    }
                }
                catch(e) {}

                Ext.EventManager.removeListener(frame, LOAD, cb, me);

                me.fireEvent(REQUESTCOMPLETE, me, r, o);

                function runCallback(fn, scope, args){
                    if(Ext.isFunction(fn)){
                        fn.apply(scope, args);
                    }
                }

                runCallback(o.success, o.scope, [r, o]);
                runCallback(o.callback, o.scope, [o, true, r]);

                if(!me.debugUploads){
                    setTimeout(function(){Ext.removeNode(frame);}, 100);
                }
            }

            Ext.EventManager.on(frame, LOAD, cb, this);
            form.submit();

            Ext.fly(form).set(buf);
            Ext.each(hiddens, function(h) {
                Ext.removeNode(h);
            });
        }
    });
})();

/**
 * @class Ext.Ajax
 * @extends Ext.data.Connection
 * <p>The global Ajax request class that provides a simple way to make Ajax requests
 * with maximum flexibility.</p>
 * <p>Since Ext.Ajax is a singleton, you can set common properties/events for it once
 * and override them at the request function level only if necessary.</p>
 * <p>Common <b>Properties</b> you may want to set are:<div class="mdetail-params"><ul>
 * <li><b><tt>{@link #method}</tt></b><p class="sub-desc"></p></li>
 * <li><b><tt>{@link #extraParams}</tt></b><p class="sub-desc"></p></li>
 * <li><b><tt>{@link #url}</tt></b><p class="sub-desc"></p></li>
 * </ul></div>
 * <pre><code>
// Default headers to pass in every request
Ext.Ajax.defaultHeaders = {
    'Powered-By': 'Ext'
};
 * </code></pre>
 * </p>
 * <p>Common <b>Events</b> you may want to set are:<div class="mdetail-params"><ul>
 * <li><b><tt>{@link Ext.data.Connection#beforerequest beforerequest}</tt></b><p class="sub-desc"></p></li>
 * <li><b><tt>{@link Ext.data.Connection#requestcomplete requestcomplete}</tt></b><p class="sub-desc"></p></li>
 * <li><b><tt>{@link Ext.data.Connection#requestexception requestexception}</tt></b><p class="sub-desc"></p></li>
 * </ul></div>
 * <pre><code>
// Example: show a spinner during all Ajax requests
Ext.Ajax.on('beforerequest', this.showSpinner, this);
Ext.Ajax.on('requestcomplete', this.hideSpinner, this);
Ext.Ajax.on('requestexception', this.hideSpinner, this);
 * </code></pre>
 * </p>
 * <p>An example request:</p>
 * <pre><code>
// Basic request
Ext.Ajax.{@link Ext.data.Connection#request request}({
   url: 'foo.php',
   success: someFn,
   failure: otherFn,
   headers: {
       'my-header': 'foo'
   },
   params: { foo: 'bar' }
});

// Simple ajax form submission
Ext.Ajax.{@link Ext.data.Connection#request request}({
    form: 'some-form',
    params: 'foo=bar'
});
 * </code></pre>
 * </p>
 * @singleton
 */
Ext.Ajax = new Ext.data.Connection({
    /**
     * @cfg {String} url @hide
     */
    /**
     * @cfg {Object} extraParams @hide
     */
    /**
     * @cfg {Object} defaultHeaders @hide
     */
    /**
     * @cfg {String} method (Optional) @hide
     */
    /**
     * @cfg {Number} timeout (Optional) @hide
     */
    /**
     * @cfg {Boolean} autoAbort (Optional) @hide
     */

    /**
     * @cfg {Boolean} disableCaching (Optional) @hide
     */

    /**
     * @property  disableCaching
     * True to add a unique cache-buster param to GET requests. (defaults to true)
     * @type Boolean
     */
    /**
     * @property  url
     * The default URL to be used for requests to the server. (defaults to undefined)
     * If the server receives all requests through one URL, setting this once is easier than
     * entering it on every request.
     * @type String
     */
    /**
     * @property  extraParams
     * An object containing properties which are used as extra parameters to each request made
     * by this object (defaults to undefined). Session information and other data that you need
     * to pass with each request are commonly put here.
     * @type Object
     */
    /**
     * @property  defaultHeaders
     * An object containing request headers which are added to each request made by this object
     * (defaults to undefined).
     * @type Object
     */
    /**
     * @property  method
     * The default HTTP method to be used for requests. Note that this is case-sensitive and
     * should be all caps (defaults to undefined; if not set but params are present will use
     * <tt>"POST"</tt>, otherwise will use <tt>"GET"</tt>.)
     * @type String
     */
    /**
     * @property  timeout
     * The timeout in milliseconds to be used for requests. (defaults to 30000)
     * @type Number
     */

    /**
     * @property  autoAbort
     * Whether a new request should abort any pending requests. (defaults to false)
     * @type Boolean
     */
    autoAbort : false,

    /**
     * Serialize the passed form into a url encoded string
     * @param {String/HTMLElement} form
     * @return {String}
     */
    serializeForm : function(form){
        return Ext.lib.Ajax.serializeForm(form);
    }
});
