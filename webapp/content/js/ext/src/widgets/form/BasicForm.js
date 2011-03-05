/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.form.BasicForm
 * @extends Ext.util.Observable
 * <p>Encapsulates the DOM &lt;form> element at the heart of the {@link Ext.form.FormPanel FormPanel} class, and provides
 * input field management, validation, submission, and form loading services.</p>
 * <p>By default, Ext Forms are submitted through Ajax, using an instance of {@link Ext.form.Action.Submit}.
 * To enable normal browser submission of an Ext Form, use the {@link #standardSubmit} config option.</p>
 * <p><b><u>File Uploads</u></b></p>
 * <p>{@link #fileUpload File uploads} are not performed using Ajax submission, that
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
 * @constructor
 * @param {Mixed} el The form element or its id
 * @param {Object} config Configuration options
 */
Ext.form.BasicForm = Ext.extend(Ext.util.Observable, {

    constructor: function(el, config){
        Ext.apply(this, config);
        if(Ext.isString(this.paramOrder)){
            this.paramOrder = this.paramOrder.split(/[\s,|]/);
        }
        /**
         * A {@link Ext.util.MixedCollection MixedCollection} containing all the Ext.form.Fields in this form.
         * @type MixedCollection
         * @property items
         */
        this.items = new Ext.util.MixedCollection(false, function(o){
            return o.getItemId();
        });
        this.addEvents(
            /**
             * @event beforeaction
             * Fires before any action is performed. Return false to cancel the action.
             * @param {Form} this
             * @param {Action} action The {@link Ext.form.Action} to be performed
             */
            'beforeaction',
            /**
             * @event actionfailed
             * Fires when an action fails.
             * @param {Form} this
             * @param {Action} action The {@link Ext.form.Action} that failed
             */
            'actionfailed',
            /**
             * @event actioncomplete
             * Fires when an action is completed.
             * @param {Form} this
             * @param {Action} action The {@link Ext.form.Action} that completed
             */
            'actioncomplete'
        );

        if(el){
            this.initEl(el);
        }
        Ext.form.BasicForm.superclass.constructor.call(this);
    },

    /**
     * @cfg {String} method
     * The request method to use (GET or POST) for form actions if one isn't supplied in the action options.
     */
    /**
     * @cfg {DataReader} reader
     * An Ext.data.DataReader (e.g. {@link Ext.data.XmlReader}) to be used to read
     * data when executing 'load' actions. This is optional as there is built-in
     * support for processing JSON.  For additional information on using an XMLReader
     * see the example provided in examples/form/xml-form.html.
     */
    /**
     * @cfg {DataReader} errorReader
     * <p>An Ext.data.DataReader (e.g. {@link Ext.data.XmlReader}) to be used to
     * read field error messages returned from 'submit' actions. This is optional
     * as there is built-in support for processing JSON.</p>
     * <p>The Records which provide messages for the invalid Fields must use the
     * Field name (or id) as the Record ID, and must contain a field called 'msg'
     * which contains the error message.</p>
     * <p>The errorReader does not have to be a full-blown implementation of a
     * DataReader. It simply needs to implement a <tt>read(xhr)</tt> function
     * which returns an Array of Records in an object with the following
     * structure:</p><pre><code>
{
    records: recordArray
}
</code></pre>
     */
    /**
     * @cfg {String} url
     * The URL to use for form actions if one isn't supplied in the
     * <code>{@link #doAction doAction} options</code>.
     */
    /**
     * @cfg {Boolean} fileUpload
     * Set to true if this form is a file upload.
     * <p>File uploads are not performed using normal 'Ajax' techniques, that is they are <b>not</b>
     * performed using XMLHttpRequests. Instead the form is submitted in the standard manner with the
     * DOM <tt>&lt;form></tt> element temporarily modified to have its
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
     */
    /**
     * @cfg {Object} baseParams
     * <p>Parameters to pass with all requests. e.g. baseParams: {id: '123', foo: 'bar'}.</p>
     * <p>Parameters are encoded as standard HTTP parameters using {@link Ext#urlEncode}.</p>
     */
    /**
     * @cfg {Number} timeout Timeout for form actions in seconds (default is 30 seconds).
     */
    timeout: 30,

    /**
     * @cfg {Object} api (Optional) If specified load and submit actions will be handled
     * with {@link Ext.form.Action.DirectLoad} and {@link Ext.form.Action.DirectSubmit}.
     * Methods which have been imported by Ext.Direct can be specified here to load and submit
     * forms.
     * Such as the following:<pre><code>
api: {
    load: App.ss.MyProfile.load,
    submit: App.ss.MyProfile.submit
}
</code></pre>
     * <p>Load actions can use <code>{@link #paramOrder}</code> or <code>{@link #paramsAsHash}</code>
     * to customize how the load method is invoked.
     * Submit actions will always use a standard form submit. The formHandler configuration must
     * be set on the associated server-side method which has been imported by Ext.Direct</p>
     */

    /**
     * @cfg {Array/String} paramOrder <p>A list of params to be executed server side.
     * Defaults to <tt>undefined</tt>. Only used for the <code>{@link #api}</code>
     * <code>load</code> configuration.</p>
     * <br><p>Specify the params in the order in which they must be executed on the
     * server-side as either (1) an Array of String values, or (2) a String of params
     * delimited by either whitespace, comma, or pipe. For example,
     * any of the following would be acceptable:</p><pre><code>
paramOrder: ['param1','param2','param3']
paramOrder: 'param1 param2 param3'
paramOrder: 'param1,param2,param3'
paramOrder: 'param1|param2|param'
     </code></pre>
     */
    paramOrder: undefined,

    /**
     * @cfg {Boolean} paramsAsHash Only used for the <code>{@link #api}</code>
     * <code>load</code> configuration. Send parameters as a collection of named
     * arguments (defaults to <tt>false</tt>). Providing a
     * <tt>{@link #paramOrder}</tt> nullifies this configuration.
     */
    paramsAsHash: false,

    /**
     * @cfg {String} waitTitle
     * The default title to show for the waiting message box (defaults to <tt>'Please Wait...'</tt>)
     */
    waitTitle: 'Please Wait...',

    // private
    activeAction : null,

    /**
     * @cfg {Boolean} trackResetOnLoad If set to <tt>true</tt>, {@link #reset}() resets to the last loaded
     * or {@link #setValues}() data instead of when the form was first created.  Defaults to <tt>false</tt>.
     */
    trackResetOnLoad : false,

    /**
     * @cfg {Boolean} standardSubmit
     * <p>If set to <tt>true</tt>, standard HTML form submits are used instead
     * of XHR (Ajax) style form submissions. Defaults to <tt>false</tt>.</p>
     * <br><p><b>Note:</b> When using <code>standardSubmit</code>, the
     * <code>options</code> to <code>{@link #submit}</code> are ignored because
     * Ext's Ajax infrastracture is bypassed. To pass extra parameters (e.g.
     * <code>baseParams</code> and <code>params</code>), utilize hidden fields
     * to submit extra data, for example:</p>
     * <pre><code>
new Ext.FormPanel({
    standardSubmit: true,
    baseParams: {
        foo: 'bar'
    },
    {@link url}: 'myProcess.php',
    items: [{
        xtype: 'textfield',
        name: 'userName'
    }],
    buttons: [{
        text: 'Save',
        handler: function(){
            var fp = this.ownerCt.ownerCt,
                form = fp.getForm();
            if (form.isValid()) {
                // check if there are baseParams and if
                // hiddent items have been added already
                if (fp.baseParams && !fp.paramsAdded) {
                    // add hidden items for all baseParams
                    for (i in fp.baseParams) {
                        fp.add({
                            xtype: 'hidden',
                            name: i,
                            value: fp.baseParams[i]
                        });
                    }
                    fp.doLayout();
                    // set a custom flag to prevent re-adding
                    fp.paramsAdded = true;
                }
                form.{@link #submit}();
            }
        }
    }]
});
     * </code></pre>
     */
    /**
     * By default wait messages are displayed with Ext.MessageBox.wait. You can target a specific
     * element by passing it or its id or mask the form itself by passing in true.
     * @type Mixed
     * @property waitMsgTarget
     */

    // private
    initEl : function(el){
        this.el = Ext.get(el);
        this.id = this.el.id || Ext.id();
        if(!this.standardSubmit){
            this.el.on('submit', this.onSubmit, this);
        }
        this.el.addClass('x-form');
    },

    /**
     * Get the HTML form Element
     * @return Ext.Element
     */
    getEl: function(){
        return this.el;
    },

    // private
    onSubmit : function(e){
        e.stopEvent();
    },

    /**
     * Destroys this object.
     * @private
     * @param {Boolean} bound true if the object is bound to a form panel. If this is the case
     * the FormPanel will take care of destroying certain things, so we're just doubling up.
     */
    destroy: function(bound){
        if(bound !== true){
            this.items.each(function(f){
                Ext.destroy(f);
            });
            Ext.destroy(this.el);
        }
        this.items.clear();
        this.purgeListeners();
    },

    /**
     * Returns true if client-side validation on the form is successful.
     * @return Boolean
     */
    isValid : function(){
        var valid = true;
        this.items.each(function(f){
           if(!f.validate()){
               valid = false;
           }
        });
        return valid;
    },

    /**
     * <p>Returns true if any fields in this form have changed from their original values.</p>
     * <p>Note that if this BasicForm was configured with {@link #trackResetOnLoad} then the
     * Fields' <i>original values</i> are updated when the values are loaded by {@link #setValues}
     * or {@link #loadRecord}.</p>
     * @return Boolean
     */
    isDirty : function(){
        var dirty = false;
        this.items.each(function(f){
           if(f.isDirty()){
               dirty = true;
               return false;
           }
        });
        return dirty;
    },

    /**
     * Performs a predefined action ({@link Ext.form.Action.Submit} or
     * {@link Ext.form.Action.Load}) or a custom extension of {@link Ext.form.Action}
     * to perform application-specific processing.
     * @param {String/Object} actionName The name of the predefined action type,
     * or instance of {@link Ext.form.Action} to perform.
     * @param {Object} options (optional) The options to pass to the {@link Ext.form.Action}.
     * All of the config options listed below are supported by both the
     * {@link Ext.form.Action.Submit submit} and {@link Ext.form.Action.Load load}
     * actions unless otherwise noted (custom actions could also accept
     * other config options):<ul>
     *
     * <li><b>url</b> : String<div class="sub-desc">The url for the action (defaults
     * to the form's {@link #url}.)</div></li>
     *
     * <li><b>method</b> : String<div class="sub-desc">The form method to use (defaults
     * to the form's method, or POST if not defined)</div></li>
     *
     * <li><b>params</b> : String/Object<div class="sub-desc"><p>The params to pass
     * (defaults to the form's baseParams, or none if not defined)</p>
     * <p>Parameters are encoded as standard HTTP parameters using {@link Ext#urlEncode}.</p></div></li>
     *
     * <li><b>headers</b> : Object<div class="sub-desc">Request headers to set for the action
     * (defaults to the form's default headers)</div></li>
     *
     * <li><b>success</b> : Function<div class="sub-desc">The callback that will
     * be invoked after a successful response (see top of
     * {@link Ext.form.Action.Submit submit} and {@link Ext.form.Action.Load load}
     * for a description of what constitutes a successful response).
     * The function is passed the following parameters:<ul>
     * <li><tt>form</tt> : Ext.form.BasicForm<div class="sub-desc">The form that requested the action</div></li>
     * <li><tt>action</tt> : The {@link Ext.form.Action Action} object which performed the operation.
     * <div class="sub-desc">The action object contains these properties of interest:<ul>
     * <li><tt>{@link Ext.form.Action#response response}</tt></li>
     * <li><tt>{@link Ext.form.Action#result result}</tt> : interrogate for custom postprocessing</li>
     * <li><tt>{@link Ext.form.Action#type type}</tt></li>
     * </ul></div></li></ul></div></li>
     *
     * <li><b>failure</b> : Function<div class="sub-desc">The callback that will be invoked after a
     * failed transaction attempt. The function is passed the following parameters:<ul>
     * <li><tt>form</tt> : The {@link Ext.form.BasicForm} that requested the action.</li>
     * <li><tt>action</tt> : The {@link Ext.form.Action Action} object which performed the operation.
     * <div class="sub-desc">The action object contains these properties of interest:<ul>
     * <li><tt>{@link Ext.form.Action#failureType failureType}</tt></li>
     * <li><tt>{@link Ext.form.Action#response response}</tt></li>
     * <li><tt>{@link Ext.form.Action#result result}</tt> : interrogate for custom postprocessing</li>
     * <li><tt>{@link Ext.form.Action#type type}</tt></li>
     * </ul></div></li></ul></div></li>
     *
     * <li><b>scope</b> : Object<div class="sub-desc">The scope in which to call the
     * callback functions (The <tt>this</tt> reference for the callback functions).</div></li>
     *
     * <li><b>clientValidation</b> : Boolean<div class="sub-desc">Submit Action only.
     * Determines whether a Form's fields are validated in a final call to
     * {@link Ext.form.BasicForm#isValid isValid} prior to submission. Set to <tt>false</tt>
     * to prevent this. If undefined, pre-submission field validation is performed.</div></li></ul>
     *
     * @return {BasicForm} this
     */
    doAction : function(action, options){
        if(Ext.isString(action)){
            action = new Ext.form.Action.ACTION_TYPES[action](this, options);
        }
        if(this.fireEvent('beforeaction', this, action) !== false){
            this.beforeAction(action);
            action.run.defer(100, action);
        }
        return this;
    },

    /**
     * Shortcut to {@link #doAction do} a {@link Ext.form.Action.Submit submit action}.
     * @param {Object} options The options to pass to the action (see {@link #doAction} for details).<br>
     * <p><b>Note:</b> this is ignored when using the {@link #standardSubmit} option.</p>
     * <p>The following code:</p><pre><code>
myFormPanel.getForm().submit({
    clientValidation: true,
    url: 'updateConsignment.php',
    params: {
        newStatus: 'delivered'
    },
    success: function(form, action) {
       Ext.Msg.alert('Success', action.result.msg);
    },
    failure: function(form, action) {
        switch (action.failureType) {
            case Ext.form.Action.CLIENT_INVALID:
                Ext.Msg.alert('Failure', 'Form fields may not be submitted with invalid values');
                break;
            case Ext.form.Action.CONNECT_FAILURE:
                Ext.Msg.alert('Failure', 'Ajax communication failed');
                break;
            case Ext.form.Action.SERVER_INVALID:
               Ext.Msg.alert('Failure', action.result.msg);
       }
    }
});
</code></pre>
     * would process the following server response for a successful submission:<pre><code>
{
    "success":true, // note this is Boolean, not string
    "msg":"Consignment updated"
}
</code></pre>
     * and the following server response for a failed submission:<pre><code>
{
    "success":false, // note this is Boolean, not string
    "msg":"You do not have permission to perform this operation"
}
</code></pre>
     * @return {BasicForm} this
     */
    submit : function(options){
        options = options || {};
        if(this.standardSubmit){
            var v = options.clientValidation === false || this.isValid();
            if(v){
                var el = this.el.dom;
                if(this.url && Ext.isEmpty(el.action)){
                    el.action = this.url;
                }
                el.submit();
            }
            return v;
        }
        var submitAction = String.format('{0}submit', this.api ? 'direct' : '');
        this.doAction(submitAction, options);
        return this;
    },

    /**
     * Shortcut to {@link #doAction do} a {@link Ext.form.Action.Load load action}.
     * @param {Object} options The options to pass to the action (see {@link #doAction} for details)
     * @return {BasicForm} this
     */
    load : function(options){
        var loadAction = String.format('{0}load', this.api ? 'direct' : '');
        this.doAction(loadAction, options);
        return this;
    },

    /**
     * Persists the values in this form into the passed {@link Ext.data.Record} object in a beginEdit/endEdit block.
     * @param {Record} record The record to edit
     * @return {BasicForm} this
     */
    updateRecord : function(record){
        record.beginEdit();
        var fs = record.fields,
            field,
            value;
        fs.each(function(f){
            field = this.findField(f.name);
            if(field){
                value = field.getValue();
                if (typeof value != undefined && value.getGroupValue) {
                    value = value.getGroupValue();
                } else if ( field.eachItem ) {
                    value = [];
                    field.eachItem(function(item){
                        value.push(item.getValue());
                    });
                }
                record.set(f.name, value);
            }
        }, this);
        record.endEdit();
        return this;
    },

    /**
     * Loads an {@link Ext.data.Record} into this form by calling {@link #setValues} with the
     * {@link Ext.data.Record#data record data}.
     * See also {@link #trackResetOnLoad}.
     * @param {Record} record The record to load
     * @return {BasicForm} this
     */
    loadRecord : function(record){
        this.setValues(record.data);
        return this;
    },

    // private
    beforeAction : function(action){
        // Call HtmlEditor's syncValue before actions
        this.items.each(function(f){
            if(f.isFormField && f.syncValue){
                f.syncValue();
            }
        });
        var o = action.options;
        if(o.waitMsg){
            if(this.waitMsgTarget === true){
                this.el.mask(o.waitMsg, 'x-mask-loading');
            }else if(this.waitMsgTarget){
                this.waitMsgTarget = Ext.get(this.waitMsgTarget);
                this.waitMsgTarget.mask(o.waitMsg, 'x-mask-loading');
            }else{
                Ext.MessageBox.wait(o.waitMsg, o.waitTitle || this.waitTitle);
            }
        }
    },

    // private
    afterAction : function(action, success){
        this.activeAction = null;
        var o = action.options;
        if(o.waitMsg){
            if(this.waitMsgTarget === true){
                this.el.unmask();
            }else if(this.waitMsgTarget){
                this.waitMsgTarget.unmask();
            }else{
                Ext.MessageBox.updateProgress(1);
                Ext.MessageBox.hide();
            }
        }
        if(success){
            if(o.reset){
                this.reset();
            }
            Ext.callback(o.success, o.scope, [this, action]);
            this.fireEvent('actioncomplete', this, action);
        }else{
            Ext.callback(o.failure, o.scope, [this, action]);
            this.fireEvent('actionfailed', this, action);
        }
    },

    /**
     * Find a {@link Ext.form.Field} in this form.
     * @param {String} id The value to search for (specify either a {@link Ext.Component#id id},
     * {@link Ext.grid.Column#dataIndex dataIndex}, {@link Ext.form.Field#getName name or hiddenName}).
     * @return Field
     */
    findField : function(id) {
        var field = this.items.get(id);

        if (!Ext.isObject(field)) {
            //searches for the field corresponding to the given id. Used recursively for composite fields
            var findMatchingField = function(f) {
                if (f.isFormField) {
                    if (f.dataIndex == id || f.id == id || f.getName() == id) {
                        field = f;
                        return false;
                    } else if (f.isComposite) {
                        return f.items.each(findMatchingField);
                    } else if (f instanceof Ext.form.CheckboxGroup && f.rendered) {
                        return f.eachItem(findMatchingField);
                    }
                }
            };

            this.items.each(findMatchingField);
        }
        return field || null;
    },


    /**
     * Mark fields in this form invalid in bulk.
     * @param {Array/Object} errors Either an array in the form [{id:'fieldId', msg:'The message'},...] or an object hash of {id: msg, id2: msg2}
     * @return {BasicForm} this
     */
    markInvalid : function(errors){
        if (Ext.isArray(errors)) {
            for(var i = 0, len = errors.length; i < len; i++){
                var fieldError = errors[i];
                var f = this.findField(fieldError.id);
                if(f){
                    f.markInvalid(fieldError.msg);
                }
            }
        } else {
            var field, id;
            for(id in errors){
                if(!Ext.isFunction(errors[id]) && (field = this.findField(id))){
                    field.markInvalid(errors[id]);
                }
            }
        }

        return this;
    },

    /**
     * Set values for fields in this form in bulk.
     * @param {Array/Object} values Either an array in the form:<pre><code>
[{id:'clientName', value:'Fred. Olsen Lines'},
 {id:'portOfLoading', value:'FXT'},
 {id:'portOfDischarge', value:'OSL'} ]</code></pre>
     * or an object hash of the form:<pre><code>
{
    clientName: 'Fred. Olsen Lines',
    portOfLoading: 'FXT',
    portOfDischarge: 'OSL'
}</code></pre>
     * @return {BasicForm} this
     */
    setValues : function(values){
        if(Ext.isArray(values)){ // array of objects
            for(var i = 0, len = values.length; i < len; i++){
                var v = values[i];
                var f = this.findField(v.id);
                if(f){
                    f.setValue(v.value);
                    if(this.trackResetOnLoad){
                        f.originalValue = f.getValue();
                    }
                }
            }
        }else{ // object hash
            var field, id;
            for(id in values){
                if(!Ext.isFunction(values[id]) && (field = this.findField(id))){
                    field.setValue(values[id]);
                    if(this.trackResetOnLoad){
                        field.originalValue = field.getValue();
                    }
                }
            }
        }
        return this;
    },

    /**
     * <p>Returns the fields in this form as an object with key/value pairs as they would be submitted using a standard form submit.
     * If multiple fields exist with the same name they are returned as an array.</p>
     * <p><b>Note:</b> The values are collected from all enabled HTML input elements within the form, <u>not</u> from
     * the Ext Field objects. This means that all returned values are Strings (or Arrays of Strings) and that the
     * value can potentially be the emptyText of a field.</p>
     * @param {Boolean} asString (optional) Pass true to return the values as a string. (defaults to false, returning an Object)
     * @return {String/Object}
     */
    getValues : function(asString){
        var fs = Ext.lib.Ajax.serializeForm(this.el.dom);
        if(asString === true){
            return fs;
        }
        return Ext.urlDecode(fs);
    },

    /**
     * Retrieves the fields in the form as a set of key/value pairs, using the {@link Ext.form.Field#getValue getValue()} method.
     * If multiple fields exist with the same name they are returned as an array.
     * @param {Boolean} dirtyOnly (optional) True to return only fields that are dirty.
     * @return {Object} The values in the form
     */
    getFieldValues : function(dirtyOnly){
        var o = {},
            n,
            key,
            val;
        this.items.each(function(f) {
            if (!f.disabled && (dirtyOnly !== true || f.isDirty())) {
                n = f.getName();
                key = o[n];
                val = f.getValue();

                if(Ext.isDefined(key)){
                    if(Ext.isArray(key)){
                        o[n].push(val);
                    }else{
                        o[n] = [key, val];
                    }
                }else{
                    o[n] = val;
                }
            }
        });
        return o;
    },

    /**
     * Clears all invalid messages in this form.
     * @return {BasicForm} this
     */
    clearInvalid : function(){
        this.items.each(function(f){
           f.clearInvalid();
        });
        return this;
    },

    /**
     * Resets this form.
     * @return {BasicForm} this
     */
    reset : function(){
        this.items.each(function(f){
            f.reset();
        });
        return this;
    },

    /**
     * Add Ext.form Components to this form's Collection. This does not result in rendering of
     * the passed Component, it just enables the form to validate Fields, and distribute values to
     * Fields.
     * <p><b>You will not usually call this function. In order to be rendered, a Field must be added
     * to a {@link Ext.Container Container}, usually an {@link Ext.form.FormPanel FormPanel}.
     * The FormPanel to which the field is added takes care of adding the Field to the BasicForm's
     * collection.</b></p>
     * @param {Field} field1
     * @param {Field} field2 (optional)
     * @param {Field} etc (optional)
     * @return {BasicForm} this
     */
    add : function(){
        this.items.addAll(Array.prototype.slice.call(arguments, 0));
        return this;
    },

    /**
     * Removes a field from the items collection (does NOT remove its markup).
     * @param {Field} field
     * @return {BasicForm} this
     */
    remove : function(field){
        this.items.remove(field);
        return this;
    },

    /**
     * Removes all fields from the collection that have been destroyed.
     */
    cleanDestroyed : function() {
        this.items.filterBy(function(o) { return !!o.isDestroyed; }).each(this.remove, this);
    },

    /**
     * Iterates through the {@link Ext.form.Field Field}s which have been {@link #add add}ed to this BasicForm,
     * checks them for an id attribute, and calls {@link Ext.form.Field#applyToMarkup} on the existing dom element with that id.
     * @return {BasicForm} this
     */
    render : function(){
        this.items.each(function(f){
            if(f.isFormField && !f.rendered && document.getElementById(f.id)){ // if the element exists
                f.applyToMarkup(f.id);
            }
        });
        return this;
    },

    /**
     * Calls {@link Ext#apply} for all fields in this form with the passed object.
     * @param {Object} values
     * @return {BasicForm} this
     */
    applyToFields : function(o){
        this.items.each(function(f){
           Ext.apply(f, o);
        });
        return this;
    },

    /**
     * Calls {@link Ext#applyIf} for all field in this form with the passed object.
     * @param {Object} values
     * @return {BasicForm} this
     */
    applyIfToFields : function(o){
        this.items.each(function(f){
           Ext.applyIf(f, o);
        });
        return this;
    },

    callFieldMethod : function(fnName, args){
        args = args || [];
        this.items.each(function(f){
            if(Ext.isFunction(f[fnName])){
                f[fnName].apply(f, args);
            }
        });
        return this;
    }
});

// back compat
Ext.BasicForm = Ext.form.BasicForm;
