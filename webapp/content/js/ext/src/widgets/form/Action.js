/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.form.Action
 * <p>The subclasses of this class provide actions to perform upon {@link Ext.form.BasicForm Form}s.</p>
 * <p>Instances of this class are only created by a {@link Ext.form.BasicForm Form} when
 * the Form needs to perform an action such as submit or load. The Configuration options
 * listed for this class are set through the Form's action methods: {@link Ext.form.BasicForm#submit submit},
 * {@link Ext.form.BasicForm#load load} and {@link Ext.form.BasicForm#doAction doAction}</p>
 * <p>The instance of Action which performed the action is passed to the success
 * and failure callbacks of the Form's action methods ({@link Ext.form.BasicForm#submit submit},
 * {@link Ext.form.BasicForm#load load} and {@link Ext.form.BasicForm#doAction doAction}),
 * and to the {@link Ext.form.BasicForm#actioncomplete actioncomplete} and
 * {@link Ext.form.BasicForm#actionfailed actionfailed} event handlers.</p>
 */
Ext.form.Action = function(form, options){
    this.form = form;
    this.options = options || {};
};

/**
 * Failure type returned when client side validation of the Form fails
 * thus aborting a submit action. Client side validation is performed unless
 * {@link #clientValidation} is explicitly set to <tt>false</tt>.
 * @type {String}
 * @static
 */
Ext.form.Action.CLIENT_INVALID = 'client';
/**
 * <p>Failure type returned when server side processing fails and the {@link #result}'s
 * <tt style="font-weight:bold">success</tt> property is set to <tt>false</tt>.</p>
 * <p>In the case of a form submission, field-specific error messages may be returned in the
 * {@link #result}'s <tt style="font-weight:bold">errors</tt> property.</p>
 * @type {String}
 * @static
 */
Ext.form.Action.SERVER_INVALID = 'server';
/**
 * Failure type returned when a communication error happens when attempting
 * to send a request to the remote server. The {@link #response} may be examined to
 * provide further information.
 * @type {String}
 * @static
 */
Ext.form.Action.CONNECT_FAILURE = 'connect';
/**
 * Failure type returned when the response's <tt style="font-weight:bold">success</tt>
 * property is set to <tt>false</tt>, or no field values are returned in the response's
 * <tt style="font-weight:bold">data</tt> property.
 * @type {String}
 * @static
 */
Ext.form.Action.LOAD_FAILURE = 'load';

Ext.form.Action.prototype = {
/**
 * @cfg {String} url The URL that the Action is to invoke.
 */
/**
 * @cfg {Boolean} reset When set to <tt><b>true</b></tt>, causes the Form to be
 * {@link Ext.form.BasicForm.reset reset} on Action success. If specified, this happens
 * <b>before</b> the {@link #success} callback is called and before the Form's
 * {@link Ext.form.BasicForm.actioncomplete actioncomplete} event fires.
 */
/**
 * @cfg {String} method The HTTP method to use to access the requested URL. Defaults to the
 * {@link Ext.form.BasicForm}'s method, or if that is not specified, the underlying DOM form's method.
 */
/**
 * @cfg {Mixed} params <p>Extra parameter values to pass. These are added to the Form's
 * {@link Ext.form.BasicForm#baseParams} and passed to the specified URL along with the Form's
 * input fields.</p>
 * <p>Parameters are encoded as standard HTTP parameters using {@link Ext#urlEncode}.</p>
 */
/**
 * @cfg {Number} timeout The number of seconds to wait for a server response before
 * failing with the {@link #failureType} as {@link #Action.CONNECT_FAILURE}. If not specified,
 * defaults to the configured <tt>{@link Ext.form.BasicForm#timeout timeout}</tt> of the
 * {@link Ext.form.BasicForm form}.
 */
/**
 * @cfg {Function} success The function to call when a valid success return packet is recieved.
 * The function is passed the following parameters:<ul class="mdetail-params">
 * <li><b>form</b> : Ext.form.BasicForm<div class="sub-desc">The form that requested the action</div></li>
 * <li><b>action</b> : Ext.form.Action<div class="sub-desc">The Action class. The {@link #result}
 * property of this object may be examined to perform custom postprocessing.</div></li>
 * </ul>
 */
/**
 * @cfg {Function} failure The function to call when a failure packet was recieved, or when an
 * error ocurred in the Ajax communication.
 * The function is passed the following parameters:<ul class="mdetail-params">
 * <li><b>form</b> : Ext.form.BasicForm<div class="sub-desc">The form that requested the action</div></li>
 * <li><b>action</b> : Ext.form.Action<div class="sub-desc">The Action class. If an Ajax
 * error ocurred, the failure type will be in {@link #failureType}. The {@link #result}
 * property of this object may be examined to perform custom postprocessing.</div></li>
 * </ul>
 */
/**
 * @cfg {Object} scope The scope in which to call the callback functions (The <tt>this</tt> reference
 * for the callback functions).
 */
/**
 * @cfg {String} waitMsg The message to be displayed by a call to {@link Ext.MessageBox#wait}
 * during the time the action is being processed.
 */
/**
 * @cfg {String} waitTitle The title to be displayed by a call to {@link Ext.MessageBox#wait}
 * during the time the action is being processed.
 */

/**
 * @cfg {Boolean} submitEmptyText If set to <tt>true</tt>, the emptyText value will be sent with the form
 * when it is submitted.  Defaults to <tt>true</tt>.
 */

/**
 * The type of action this Action instance performs.
 * Currently only "submit" and "load" are supported.
 * @type {String}
 */
    type : 'default',
/**
 * The type of failure detected will be one of these: {@link #CLIENT_INVALID},
 * {@link #SERVER_INVALID}, {@link #CONNECT_FAILURE}, or {@link #LOAD_FAILURE}.  Usage:
 * <pre><code>
var fp = new Ext.form.FormPanel({
...
buttons: [{
    text: 'Save',
    formBind: true,
    handler: function(){
        if(fp.getForm().isValid()){
            fp.getForm().submit({
                url: 'form-submit.php',
                waitMsg: 'Submitting your data...',
                success: function(form, action){
                    // server responded with success = true
                    var result = action.{@link #result};
                },
                failure: function(form, action){
                    if (action.{@link #failureType} === Ext.form.Action.{@link #CONNECT_FAILURE}) {
                        Ext.Msg.alert('Error',
                            'Status:'+action.{@link #response}.status+': '+
                            action.{@link #response}.statusText);
                    }
                    if (action.failureType === Ext.form.Action.{@link #SERVER_INVALID}){
                        // server responded with success = false
                        Ext.Msg.alert('Invalid', action.{@link #result}.errormsg);
                    }
                }
            });
        }
    }
},{
    text: 'Reset',
    handler: function(){
        fp.getForm().reset();
    }
}]
 * </code></pre>
 * @property failureType
 * @type {String}
 */
 /**
 * The XMLHttpRequest object used to perform the action.
 * @property response
 * @type {Object}
 */
 /**
 * The decoded response object containing a boolean <tt style="font-weight:bold">success</tt> property and
 * other, action-specific properties.
 * @property result
 * @type {Object}
 */

    // interface method
    run : function(options){

    },

    // interface method
    success : function(response){

    },

    // interface method
    handleResponse : function(response){

    },

    // default connection failure
    failure : function(response){
        this.response = response;
        this.failureType = Ext.form.Action.CONNECT_FAILURE;
        this.form.afterAction(this, false);
    },

    // private
    // shared code among all Actions to validate that there was a response
    // with either responseText or responseXml
    processResponse : function(response){
        this.response = response;
        if(!response.responseText && !response.responseXML){
            return true;
        }
        this.result = this.handleResponse(response);
        return this.result;
    },

    // utility functions used internally
    getUrl : function(appendParams){
        var url = this.options.url || this.form.url || this.form.el.dom.action;
        if(appendParams){
            var p = this.getParams();
            if(p){
                url = Ext.urlAppend(url, p);
            }
        }
        return url;
    },

    // private
    getMethod : function(){
        return (this.options.method || this.form.method || this.form.el.dom.method || 'POST').toUpperCase();
    },

    // private
    getParams : function(){
        var bp = this.form.baseParams;
        var p = this.options.params;
        if(p){
            if(typeof p == "object"){
                p = Ext.urlEncode(Ext.applyIf(p, bp));
            }else if(typeof p == 'string' && bp){
                p += '&' + Ext.urlEncode(bp);
            }
        }else if(bp){
            p = Ext.urlEncode(bp);
        }
        return p;
    },

    // private
    createCallback : function(opts){
        var opts = opts || {};
        return {
            success: this.success,
            failure: this.failure,
            scope: this,
            timeout: (opts.timeout*1000) || (this.form.timeout*1000),
            upload: this.form.fileUpload ? this.success : undefined
        };
    }
};

/**
 * @class Ext.form.Action.Submit
 * @extends Ext.form.Action
 * <p>A class which handles submission of data from {@link Ext.form.BasicForm Form}s
 * and processes the returned response.</p>
 * <p>Instances of this class are only created by a {@link Ext.form.BasicForm Form} when
 * {@link Ext.form.BasicForm#submit submit}ting.</p>
 * <p><u><b>Response Packet Criteria</b></u></p>
 * <p>A response packet may contain:
 * <div class="mdetail-params"><ul>
 * <li><b><code>success</code></b> property : Boolean
 * <div class="sub-desc">The <code>success</code> property is required.</div></li>
 * <li><b><code>errors</code></b> property : Object
 * <div class="sub-desc"><div class="sub-desc">The <code>errors</code> property,
 * which is optional, contains error messages for invalid fields.</div></li>
 * </ul></div>
 * <p><u><b>JSON Packets</b></u></p>
 * <p>By default, response packets are assumed to be JSON, so a typical response
 * packet may look like this:</p><pre><code>
{
    success: false,
    errors: {
        clientCode: "Client not found",
        portOfLoading: "This field must not be null"
    }
}</code></pre>
 * <p>Other data may be placed into the response for processing by the {@link Ext.form.BasicForm}'s callback
 * or event handler methods. The object decoded from this JSON is available in the
 * {@link Ext.form.Action#result result} property.</p>
 * <p>Alternatively, if an {@link #errorReader} is specified as an {@link Ext.data.XmlReader XmlReader}:</p><pre><code>
    errorReader: new Ext.data.XmlReader({
            record : 'field',
            success: '@success'
        }, [
            'id', 'msg'
        ]
    )
</code></pre>
 * <p>then the results may be sent back in XML format:</p><pre><code>
&lt;?xml version="1.0" encoding="UTF-8"?&gt;
&lt;message success="false"&gt;
&lt;errors&gt;
    &lt;field&gt;
        &lt;id&gt;clientCode&lt;/id&gt;
        &lt;msg&gt;&lt;![CDATA[Code not found. &lt;br /&gt;&lt;i&gt;This is a test validation message from the server &lt;/i&gt;]]&gt;&lt;/msg&gt;
    &lt;/field&gt;
    &lt;field&gt;
        &lt;id&gt;portOfLoading&lt;/id&gt;
        &lt;msg&gt;&lt;![CDATA[Port not found. &lt;br /&gt;&lt;i&gt;This is a test validation message from the server &lt;/i&gt;]]&gt;&lt;/msg&gt;
    &lt;/field&gt;
&lt;/errors&gt;
&lt;/message&gt;
</code></pre>
 * <p>Other elements may be placed into the response XML for processing by the {@link Ext.form.BasicForm}'s callback
 * or event handler methods. The XML document is available in the {@link #errorReader}'s {@link Ext.data.XmlReader#xmlData xmlData} property.</p>
 */
Ext.form.Action.Submit = function(form, options){
    Ext.form.Action.Submit.superclass.constructor.call(this, form, options);
};

Ext.extend(Ext.form.Action.Submit, Ext.form.Action, {
    /**
     * @cfg {Ext.data.DataReader} errorReader <p><b>Optional. JSON is interpreted with
     * no need for an errorReader.</b></p>
     * <p>A Reader which reads a single record from the returned data. The DataReader's
     * <b>success</b> property specifies how submission success is determined. The Record's
     * data provides the error messages to apply to any invalid form Fields.</p>
     */
    /**
     * @cfg {boolean} clientValidation Determines whether a Form's fields are validated
     * in a final call to {@link Ext.form.BasicForm#isValid isValid} prior to submission.
     * Pass <tt>false</tt> in the Form's submit options to prevent this. If not defined, pre-submission field validation
     * is performed.
     */
    type : 'submit',

    // private
    run : function(){
        var o = this.options,
            method = this.getMethod(),
            isGet = method == 'GET';
        if(o.clientValidation === false || this.form.isValid()){
            if (o.submitEmptyText === false) {
                var fields = this.form.items,
                    emptyFields = [],
                    setupEmptyFields = function(f){
                        if (f.el.getValue() == f.emptyText) {
                            emptyFields.push(f);
                            f.el.dom.value = "";
                        }
                        if(f.isComposite && f.rendered){
                            f.items.each(setupEmptyFields);
                        }
                    };
                    
                fields.each(setupEmptyFields);
            }
            Ext.Ajax.request(Ext.apply(this.createCallback(o), {
                form:this.form.el.dom,
                url:this.getUrl(isGet),
                method: method,
                headers: o.headers,
                params:!isGet ? this.getParams() : null,
                isUpload: this.form.fileUpload
            }));
            if (o.submitEmptyText === false) {
                Ext.each(emptyFields, function(f) {
                    if (f.applyEmptyText) {
                        f.applyEmptyText();
                    }
                });
            }
        }else if (o.clientValidation !== false){ // client validation failed
            this.failureType = Ext.form.Action.CLIENT_INVALID;
            this.form.afterAction(this, false);
        }
    },

    // private
    success : function(response){
        var result = this.processResponse(response);
        if(result === true || result.success){
            this.form.afterAction(this, true);
            return;
        }
        if(result.errors){
            this.form.markInvalid(result.errors);
        }
        this.failureType = Ext.form.Action.SERVER_INVALID;
        this.form.afterAction(this, false);
    },

    // private
    handleResponse : function(response){
        if(this.form.errorReader){
            var rs = this.form.errorReader.read(response);
            var errors = [];
            if(rs.records){
                for(var i = 0, len = rs.records.length; i < len; i++) {
                    var r = rs.records[i];
                    errors[i] = r.data;
                }
            }
            if(errors.length < 1){
                errors = null;
            }
            return {
                success : rs.success,
                errors : errors
            };
        }
        return Ext.decode(response.responseText);
    }
});


/**
 * @class Ext.form.Action.Load
 * @extends Ext.form.Action
 * <p>A class which handles loading of data from a server into the Fields of an {@link Ext.form.BasicForm}.</p>
 * <p>Instances of this class are only created by a {@link Ext.form.BasicForm Form} when
 * {@link Ext.form.BasicForm#load load}ing.</p>
 * <p><u><b>Response Packet Criteria</b></u></p>
 * <p>A response packet <b>must</b> contain:
 * <div class="mdetail-params"><ul>
 * <li><b><code>success</code></b> property : Boolean</li>
 * <li><b><code>data</code></b> property : Object</li>
 * <div class="sub-desc">The <code>data</code> property contains the values of Fields to load.
 * The individual value object for each Field is passed to the Field's
 * {@link Ext.form.Field#setValue setValue} method.</div></li>
 * </ul></div>
 * <p><u><b>JSON Packets</b></u></p>
 * <p>By default, response packets are assumed to be JSON, so for the following form load call:<pre><code>
var myFormPanel = new Ext.form.FormPanel({
    title: 'Client and routing info',
    items: [{
        fieldLabel: 'Client',
        name: 'clientName'
    }, {
        fieldLabel: 'Port of loading',
        name: 'portOfLoading'
    }, {
        fieldLabel: 'Port of discharge',
        name: 'portOfDischarge'
    }]
});
myFormPanel.{@link Ext.form.FormPanel#getForm getForm}().{@link Ext.form.BasicForm#load load}({
    url: '/getRoutingInfo.php',
    params: {
        consignmentRef: myConsignmentRef
    },
    failure: function(form, action) {
        Ext.Msg.alert("Load failed", action.result.errorMessage);
    }
});
</code></pre>
 * a <b>success response</b> packet may look like this:</p><pre><code>
{
    success: true,
    data: {
        clientName: "Fred. Olsen Lines",
        portOfLoading: "FXT",
        portOfDischarge: "OSL"
    }
}</code></pre>
 * while a <b>failure response</b> packet may look like this:</p><pre><code>
{
    success: false,
    errorMessage: "Consignment reference not found"
}</code></pre>
 * <p>Other data may be placed into the response for processing the {@link Ext.form.BasicForm Form}'s
 * callback or event handler methods. The object decoded from this JSON is available in the
 * {@link Ext.form.Action#result result} property.</p>
 */
Ext.form.Action.Load = function(form, options){
    Ext.form.Action.Load.superclass.constructor.call(this, form, options);
    this.reader = this.form.reader;
};

Ext.extend(Ext.form.Action.Load, Ext.form.Action, {
    // private
    type : 'load',

    // private
    run : function(){
        Ext.Ajax.request(Ext.apply(
                this.createCallback(this.options), {
                    method:this.getMethod(),
                    url:this.getUrl(false),
                    headers: this.options.headers,
                    params:this.getParams()
        }));
    },

    // private
    success : function(response){
        var result = this.processResponse(response);
        if(result === true || !result.success || !result.data){
            this.failureType = Ext.form.Action.LOAD_FAILURE;
            this.form.afterAction(this, false);
            return;
        }
        this.form.clearInvalid();
        this.form.setValues(result.data);
        this.form.afterAction(this, true);
    },

    // private
    handleResponse : function(response){
        if(this.form.reader){
            var rs = this.form.reader.read(response);
            var data = rs.records && rs.records[0] ? rs.records[0].data : null;
            return {
                success : rs.success,
                data : data
            };
        }
        return Ext.decode(response.responseText);
    }
});



/**
 * @class Ext.form.Action.DirectLoad
 * @extends Ext.form.Action.Load
 * <p>Provides Ext.direct support for loading form data.</p>
 * <p>This example illustrates usage of Ext.Direct to <b>load</b> a form through Ext.Direct.</p>
 * <pre><code>
var myFormPanel = new Ext.form.FormPanel({
    // configs for FormPanel
    title: 'Basic Information',
    renderTo: document.body,
    width: 300, height: 160,
    padding: 10,

    // configs apply to child items
    defaults: {anchor: '100%'},
    defaultType: 'textfield',
    items: [{
        fieldLabel: 'Name',
        name: 'name'
    },{
        fieldLabel: 'Email',
        name: 'email'
    },{
        fieldLabel: 'Company',
        name: 'company'
    }],

    // configs for BasicForm
    api: {
        // The server-side method to call for load() requests
        load: Profile.getBasicInfo,
        // The server-side must mark the submit handler as a 'formHandler'
        submit: Profile.updateBasicInfo
    },
    // specify the order for the passed params
    paramOrder: ['uid', 'foo']
});

// load the form
myFormPanel.getForm().load({
    // pass 2 arguments to server side getBasicInfo method (len=2)
    params: {
        foo: 'bar',
        uid: 34
    }
});
 * </code></pre>
 * The data packet sent to the server will resemble something like:
 * <pre><code>
[
    {
        "action":"Profile","method":"getBasicInfo","type":"rpc","tid":2,
        "data":[34,"bar"] // note the order of the params
    }
]
 * </code></pre>
 * The form will process a data packet returned by the server that is similar
 * to the following format:
 * <pre><code>
[
    {
        "action":"Profile","method":"getBasicInfo","type":"rpc","tid":2,
        "result":{
            "success":true,
            "data":{
                "name":"Fred Flintstone",
                "company":"Slate Rock and Gravel",
                "email":"fred.flintstone@slaterg.com"
            }
        }
    }
]
 * </code></pre>
 */
Ext.form.Action.DirectLoad = Ext.extend(Ext.form.Action.Load, {
    constructor: function(form, opts) {
        Ext.form.Action.DirectLoad.superclass.constructor.call(this, form, opts);
    },
    type : 'directload',

    run : function(){
        var args = this.getParams();
        args.push(this.success, this);
        this.form.api.load.apply(window, args);
    },

    getParams : function() {
        var buf = [], o = {};
        var bp = this.form.baseParams;
        var p = this.options.params;
        Ext.apply(o, p, bp);
        var paramOrder = this.form.paramOrder;
        if(paramOrder){
            for(var i = 0, len = paramOrder.length; i < len; i++){
                buf.push(o[paramOrder[i]]);
            }
        }else if(this.form.paramsAsHash){
            buf.push(o);
        }
        return buf;
    },
    // Direct actions have already been processed and therefore
    // we can directly set the result; Direct Actions do not have
    // a this.response property.
    processResponse : function(result) {
        this.result = result;
        return result;
    },

    success : function(response, trans){
        if(trans.type == Ext.Direct.exceptions.SERVER){
            response = {};
        }
        Ext.form.Action.DirectLoad.superclass.success.call(this, response);
    }
});

/**
 * @class Ext.form.Action.DirectSubmit
 * @extends Ext.form.Action.Submit
 * <p>Provides Ext.direct support for submitting form data.</p>
 * <p>This example illustrates usage of Ext.Direct to <b>submit</b> a form through Ext.Direct.</p>
 * <pre><code>
var myFormPanel = new Ext.form.FormPanel({
    // configs for FormPanel
    title: 'Basic Information',
    renderTo: document.body,
    width: 300, height: 160,
    padding: 10,
    buttons:[{
        text: 'Submit',
        handler: function(){
            myFormPanel.getForm().submit({
                params: {
                    foo: 'bar',
                    uid: 34
                }
            });
        }
    }],

    // configs apply to child items
    defaults: {anchor: '100%'},
    defaultType: 'textfield',
    items: [{
        fieldLabel: 'Name',
        name: 'name'
    },{
        fieldLabel: 'Email',
        name: 'email'
    },{
        fieldLabel: 'Company',
        name: 'company'
    }],

    // configs for BasicForm
    api: {
        // The server-side method to call for load() requests
        load: Profile.getBasicInfo,
        // The server-side must mark the submit handler as a 'formHandler'
        submit: Profile.updateBasicInfo
    },
    // specify the order for the passed params
    paramOrder: ['uid', 'foo']
});
 * </code></pre>
 * The data packet sent to the server will resemble something like:
 * <pre><code>
{
    "action":"Profile","method":"updateBasicInfo","type":"rpc","tid":"6",
    "result":{
        "success":true,
        "id":{
            "extAction":"Profile","extMethod":"updateBasicInfo",
            "extType":"rpc","extTID":"6","extUpload":"false",
            "name":"Aaron Conran","email":"aaron@extjs.com","company":"Ext JS, LLC"
        }
    }
}
 * </code></pre>
 * The form will process a data packet returned by the server that is similar
 * to the following:
 * <pre><code>
// sample success packet (batched requests)
[
    {
        "action":"Profile","method":"updateBasicInfo","type":"rpc","tid":3,
        "result":{
            "success":true
        }
    }
]

// sample failure packet (one request)
{
        "action":"Profile","method":"updateBasicInfo","type":"rpc","tid":"6",
        "result":{
            "errors":{
                "email":"already taken"
            },
            "success":false,
            "foo":"bar"
        }
}
 * </code></pre>
 * Also see the discussion in {@link Ext.form.Action.DirectLoad}.
 */
Ext.form.Action.DirectSubmit = Ext.extend(Ext.form.Action.Submit, {
    constructor : function(form, opts) {
        Ext.form.Action.DirectSubmit.superclass.constructor.call(this, form, opts);
    },
    type : 'directsubmit',
    // override of Submit
    run : function(){
        var o = this.options;
        if(o.clientValidation === false || this.form.isValid()){
            // tag on any additional params to be posted in the
            // form scope
            this.success.params = this.getParams();
            this.form.api.submit(this.form.el.dom, this.success, this);
        }else if (o.clientValidation !== false){ // client validation failed
            this.failureType = Ext.form.Action.CLIENT_INVALID;
            this.form.afterAction(this, false);
        }
    },

    getParams : function() {
        var o = {};
        var bp = this.form.baseParams;
        var p = this.options.params;
        Ext.apply(o, p, bp);
        return o;
    },
    // Direct actions have already been processed and therefore
    // we can directly set the result; Direct Actions do not have
    // a this.response property.
    processResponse : function(result) {
        this.result = result;
        return result;
    },

    success : function(response, trans){
        if(trans.type == Ext.Direct.exceptions.SERVER){
            response = {};
        }
        Ext.form.Action.DirectSubmit.superclass.success.call(this, response);
    }
});

Ext.form.Action.ACTION_TYPES = {
    'load' : Ext.form.Action.Load,
    'submit' : Ext.form.Action.Submit,
    'directload' : Ext.form.Action.DirectLoad,
    'directsubmit' : Ext.form.Action.DirectSubmit
};
