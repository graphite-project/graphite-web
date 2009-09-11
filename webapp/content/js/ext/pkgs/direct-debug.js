/*!
 * Ext JS Library 3.0.0
 * Copyright(c) 2006-2009 Ext JS, LLC
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
/**
 * @class Ext.data.DirectProxy
 * @extends Ext.data.DataProxy
 */
Ext.data.DirectProxy = function(config){
    Ext.apply(this, config);
    if(typeof this.paramOrder == 'string'){
        this.paramOrder = this.paramOrder.split(/[\s,|]/);
    }
    Ext.data.DirectProxy.superclass.constructor.call(this, config);
};

Ext.extend(Ext.data.DirectProxy, Ext.data.DataProxy, {
    /**
     * @cfg {Array/String} paramOrder Defaults to <tt>undefined</tt>. A list of params to be executed
     * server side.  Specify the params in the order in which they must be executed on the server-side
     * as either (1) an Array of String values, or (2) a String of params delimited by either whitespace,
     * comma, or pipe. For example,
     * any of the following would be acceptable:<pre><code>
paramOrder: ['param1','param2','param3']
paramOrder: 'param1 param2 param3'
paramOrder: 'param1,param2,param3'
paramOrder: 'param1|param2|param'
     </code></pre>
     */
    paramOrder: undefined,

    /**
     * @cfg {Boolean} paramsAsHash
     * Send parameters as a collection of named arguments (defaults to <tt>true</tt>). Providing a
     * <tt>{@link #paramOrder}</tt> nullifies this configuration.
     */
    paramsAsHash: true,

    /**
     * @cfg {Function} directFn
     * Function to call when executing a request.  directFn is a simple alternative to defining the api configuration-parameter
     * for Store's which will not implement a full CRUD api.
     */
    directFn : undefined,

    // protected
    doRequest : function(action, rs, params, reader, callback, scope, options) {
        var args = [];
        var directFn = this.api[action] || this.directFn;

        switch (action) {
            case Ext.data.Api.actions.create:
                args.push(params[reader.meta.root]);		// <-- create(Hash)
                break;
            case Ext.data.Api.actions.read:
                if(this.paramOrder){
                    for(var i = 0, len = this.paramOrder.length; i < len; i++){
                        args.push(params[this.paramOrder[i]]);
                    }
                }else if(this.paramsAsHash){
                    args.push(params);
                }
                break;
            case Ext.data.Api.actions.update:
                args.push(params[reader.meta.idProperty]);  // <-- save(Integer/Integer[], Hash/Hash[])
                args.push(params[reader.meta.root]);
                break;
            case Ext.data.Api.actions.destroy:
                args.push(params[reader.meta.root]);        // <-- destroy(Int/Int[])
                break;
        }

        var trans = {
            params : params || {},
            callback : callback,
            scope : scope,
            arg : options,
            reader: reader
        };

        args.push(this.createCallback(action, rs, trans), this);
        directFn.apply(window, args);
    },

    // private
    createCallback : function(action, rs, trans) {
        return function(result, res) {
            if (!res.status) {
                // @deprecated fire loadexception
                if (action === Ext.data.Api.actions.read) {
                    this.fireEvent("loadexception", this, trans, res, null);
                }
                this.fireEvent('exception', this, 'remote', action, trans, res, null);
                trans.callback.call(trans.scope, null, trans.arg, false);
                return;
            }
            if (action === Ext.data.Api.actions.read) {
                this.onRead(action, trans, result, res);
            } else {
                this.onWrite(action, trans, result, res, rs);
            }
        };
    },
    /**
     * Callback for read actions
     * @param {String} action [Ext.data.Api.actions.create|read|update|destroy]
     * @param {Object} trans The request transaction object
     * @param {Object} res The server response
     * @private
     */
    onRead : function(action, trans, result, res) {
        var records;
        try {
            records = trans.reader.readRecords(result);
        }
        catch (ex) {
            // @deprecated: Fire old loadexception for backwards-compat.
            this.fireEvent("loadexception", this, trans, res, ex);

            this.fireEvent('exception', this, 'response', action, trans, res, ex);
            trans.callback.call(trans.scope, null, trans.arg, false);
            return;
        }
        this.fireEvent("load", this, res, trans.arg);
        trans.callback.call(trans.scope, records, trans.arg, true);
    },
    /**
     * Callback for write actions
     * @param {String} action [Ext.data.Api.actions.create|read|update|destroy]
     * @param {Object} trans The request transaction object
     * @param {Object} res The server response
     * @private
     */
    onWrite : function(action, trans, result, res, rs) {
        this.fireEvent("write", this, action, result, res, rs, trans.arg);
        trans.callback.call(trans.scope, result, res, true);
    }
});

/**
 * @class Ext.data.DirectStore
 * @extends Ext.data.Store
 * <p>Small helper class to create an {@link Ext.data.Store} configured with an
 * {@link Ext.data.DirectProxy} and {@link Ext.data.JsonReader} to make interacting
 * with an {@link Ext.Direct} Server-side {@link Ext.direct.Provider Provider} easier.
 * To create a different proxy/reader combination create a basic {@link Ext.data.Store}
 * configured as needed.</p>
 *
 * <p><b>*Note:</b> Although they are not listed, this class inherits all of the config options of:</p>
 * <div><ul class="mdetail-params">
 * <li><b>{@link Ext.data.Store Store}</b></li>
 * <div class="sub-desc"><ul class="mdetail-params">
 *
 * </ul></div>
 * <li><b>{@link Ext.data.JsonReader JsonReader}</b></li>
 * <div class="sub-desc"><ul class="mdetail-params">
 * <li><tt><b>{@link Ext.data.JsonReader#root root}</b></tt></li>
 * <li><tt><b>{@link Ext.data.JsonReader#idProperty idProperty}</b></tt></li>
 * <li><tt><b>{@link Ext.data.JsonReader#totalProperty totalProperty}</b></tt></li>
 * </ul></div>
 *
 * <li><b>{@link Ext.data.DirectProxy DirectProxy}</b></li>
 * <div class="sub-desc"><ul class="mdetail-params">
 * <li><tt><b>{@link Ext.data.DirectProxy#directFn directFn}</b></tt></li>
 * <li><tt><b>{@link Ext.data.DirectProxy#paramOrder paramOrder}</b></tt></li>
 * <li><tt><b>{@link Ext.data.DirectProxy#paramsAsHash paramsAsHash}</b></tt></li>
 * </ul></div>
 * </ul></div>
 *
 * @xtype directstore
 *
 * @constructor
 * @param {Object} config
 */
Ext.data.DirectStore = function(c){
    // each transaction upon a singe record will generatie a distinct Direct transaction since Direct queues them into one Ajax request.
    c.batchTransactions = false;

    Ext.data.DirectStore.superclass.constructor.call(this, Ext.apply(c, {
        proxy: (typeof(c.proxy) == 'undefined') ? new Ext.data.DirectProxy(Ext.copyTo({}, c, 'paramOrder,paramsAsHash,directFn,api')) : c.proxy,
        reader: (typeof(c.reader) == 'undefined' && typeof(c.fields) == 'object') ? new Ext.data.JsonReader(Ext.copyTo({}, c, 'totalProperty,root,idProperty'), c.fields) : c.reader
    }));
};
Ext.extend(Ext.data.DirectStore, Ext.data.Store, {});
Ext.reg('directstore', Ext.data.DirectStore);
/**
 * @class Ext.Direct
 * @extends Ext.util.Observable
 * <p><b><u>Overview</u></b></p>
 * 
 * <p>Ext.Direct aims to streamline communication between the client and server
 * by providing a single interface that reduces the amount of common code
 * typically required to validate data and handle returned data packets
 * (reading data, error conditions, etc).</p>
 *  
 * <p>The Ext.direct namespace includes several classes for a closer integration
 * with the server-side. The Ext.data namespace also includes classes for working
 * with Ext.data.Stores which are backed by data from an Ext.Direct method.</p>
 * 
 * <p><b><u>Specification</u></b></p>
 * 
 * <p>For additional information consult the 
 * <a href="http://extjs.com/products/extjs/direct.php">Ext.Direct Specification</a>.</p>
 *   
 * <p><b><u>Providers</u></b></p>
 * 
 * <p>Ext.Direct uses a provider architecture, where one or more providers are
 * used to transport data to and from the server. There are several providers
 * that exist in the core at the moment:</p><div class="mdetail-params"><ul>
 * 
 * <li>{@link Ext.direct.JsonProvider JsonProvider} for simple JSON operations</li>
 * <li>{@link Ext.direct.PollingProvider PollingProvider} for repeated requests</li>
 * <li>{@link Ext.direct.RemotingProvider RemotingProvider} exposes server side
 * on the client.</li>
 * </ul></div>
 * 
 * <p>A provider does not need to be invoked directly, providers are added via
 * {@link Ext.Direct}.{@link Ext.Direct#add add}.</p>
 * 
 * <p><b><u>Router</u></b></p>
 * 
 * <p>Ext.Direct utilizes a "router" on the server to direct requests from the client
 * to the appropriate server-side method. Because the Ext.Direct API is completely
 * platform-agnostic, you could completely swap out a Java based server solution
 * and replace it with one that uses C# without changing the client side JavaScript
 * at all.</p>
 * 
 * <p><b><u>Server side events</u></b></p>
 * 
 * <p>Custom events from the server may be handled by the client by adding
 * listeners, for example:</p>
 * <pre><code>
{"type":"event","name":"message","data":"Successfully polled at: 11:19:30 am"}

// add a handler for a 'message' event sent by the server 
Ext.Direct.on('message', function(e){
    out.append(String.format('&lt;p>&lt;i>{0}&lt;/i>&lt;/p>', e.data));
            out.el.scrollTo('t', 100000, true);
});
 * </code></pre>
 * @singleton
 */
Ext.Direct = Ext.extend(Ext.util.Observable, {
    /**
     * Each event type implements a getData() method. The default event types are:
     * <div class="mdetail-params"><ul>
     * <li><b><tt>event</tt></b> : Ext.Direct.Event</li>
     * <li><b><tt>exception</tt></b> : Ext.Direct.ExceptionEvent</li>
     * <li><b><tt>rpc</tt></b> : Ext.Direct.RemotingEvent</li>
     * </ul></div>
     * @property eventTypes
     * @type Object
     */

    /**
     * Four types of possible exceptions which can occur:
     * <div class="mdetail-params"><ul>
     * <li><b><tt>Ext.Direct.exceptions.TRANSPORT</tt></b> : 'xhr'</li>
     * <li><b><tt>Ext.Direct.exceptions.PARSE</tt></b> : 'parse'</li>
     * <li><b><tt>Ext.Direct.exceptions.LOGIN</tt></b> : 'login'</li>
     * <li><b><tt>Ext.Direct.exceptions.SERVER</tt></b> : 'exception'</li>
     * </ul></div>
     * @property exceptions
     * @type Object
     */
    exceptions: {
        TRANSPORT: 'xhr',
        PARSE: 'parse',
        LOGIN: 'login',
        SERVER: 'exception'
    },
    
    // private
    constructor: function(){
        this.addEvents(
            /**
             * @event event
             * Fires after an event.
             * @param {event} e The {@link Ext.Direct#eventTypes Ext.Direct.Event type} that occurred.
             * @param {Ext.direct.Provider} provider The {@link Ext.direct.Provider Provider}.
             */
            'event',
            /**
             * @event exception
             * Fires after an event exception.
             * @param {event} e The {@link Ext.Direct#eventTypes Ext.Direct.Event type} that occurred.
             */
            'exception'
        );
        this.transactions = {};
        this.providers = {};
    },

    /**
     * Adds an Ext.Direct Provider and creates the proxy or stub methods to execute server-side methods.
     * If the provider is not already connected, it will auto-connect.
     * <pre><code>
var pollProv = new Ext.direct.PollingProvider({
    url: 'php/poll2.php'
}); 

Ext.Direct.addProvider(
    {
        "type":"remoting",       // create a {@link Ext.direct.RemotingProvider} 
        "url":"php\/router.php", // url to connect to the Ext.Direct server-side router.
        "actions":{              // each property within the actions object represents a Class 
            "TestAction":[       // array of methods within each server side Class   
            {
                "name":"doEcho", // name of method
                "len":1
            },{
                "name":"multiply",
                "len":1
            },{
                "name":"doForm",
                "formHandler":true, // handle form on server with Ext.Direct.Transaction 
                "len":1
            }]
        },
        "namespace":"myApplication",// namespace to create the Remoting Provider in
    },{
        type: 'polling', // create a {@link Ext.direct.PollingProvider} 
        url:  'php/poll.php'
    },
    pollProv // reference to previously created instance
);
     * </code></pre>
     * @param {Object/Array} provider Accepts either an Array of Provider descriptions (an instance
     * or config object for a Provider) or any number of Provider descriptions as arguments.  Each
     * Provider description instructs Ext.Direct how to create client-side stub methods.
     */
    addProvider : function(provider){        
        var a = arguments;
        if(a.length > 1){
            for(var i = 0, len = a.length; i < len; i++){
                this.addProvider(a[i]);
            }
            return;
        }
        
        // if provider has not already been instantiated
        if(!provider.events){
            provider = new Ext.Direct.PROVIDERS[provider.type](provider);
        }
        provider.id = provider.id || Ext.id();
        this.providers[provider.id] = provider;

        provider.on('data', this.onProviderData, this);
        provider.on('exception', this.onProviderException, this);


        if(!provider.isConnected()){
            provider.connect();
        }

        return provider;
    },

    /**
     * Retrieve a {@link Ext.direct.Provider provider} by the
     * <b><tt>{@link Ext.direct.Provider#id id}</tt></b> specified when the provider is
     * {@link #addProvider added}.
     * @param {String} id Unique identifier assigned to the provider when calling {@link #addProvider} 
     */
    getProvider : function(id){
        return this.providers[id];
    },

    removeProvider : function(id){
        var provider = id.id ? id : this.providers[id.id];
        provider.un('data', this.onProviderData, this);
        provider.un('exception', this.onProviderException, this);
        delete this.providers[provider.id];
        return provider;
    },

    addTransaction: function(t){
        this.transactions[t.tid] = t;
        return t;
    },

    removeTransaction: function(t){
        delete this.transactions[t.tid || t];
        return t;
    },

    getTransaction: function(tid){
        return this.transactions[tid.tid || tid];
    },

    onProviderData : function(provider, e){
        if(Ext.isArray(e)){
            for(var i = 0, len = e.length; i < len; i++){
                this.onProviderData(provider, e[i]);
            }
            return;
        }
        if(e.name && e.name != 'event' && e.name != 'exception'){
            this.fireEvent(e.name, e);
        }else if(e.type == 'exception'){
            this.fireEvent('exception', e);
        }
        this.fireEvent('event', e, provider);
    },

    createEvent : function(response, extraProps){
        return new Ext.Direct.eventTypes[response.type](Ext.apply(response, extraProps));
    }
});
// overwrite impl. with static instance
Ext.Direct = new Ext.Direct();

Ext.Direct.TID = 1;
Ext.Direct.PROVIDERS = {};/**
 * @class Ext.Direct.Transaction
 * @extends Object
 * <p>Supporting Class for Ext.Direct (not intended to be used directly).</p>
 * @constructor
 * @param {Object} config
 */
Ext.Direct.Transaction = function(config){
    Ext.apply(this, config);
    this.tid = ++Ext.Direct.TID;
    this.retryCount = 0;
};
Ext.Direct.Transaction.prototype = {
    send: function(){
        this.provider.queueTransaction(this);
    },

    retry: function(){
        this.retryCount++;
        this.send();
    },

    getProvider: function(){
        return this.provider;
    }
};Ext.Direct.Event = function(config){
    Ext.apply(this, config);
}
Ext.Direct.Event.prototype = {
    status: true,
    getData: function(){
        return this.data;
    }
};

Ext.Direct.RemotingEvent = Ext.extend(Ext.Direct.Event, {
    type: 'rpc',
    getTransaction: function(){
        return this.transaction || Ext.Direct.getTransaction(this.tid);
    }
});

Ext.Direct.ExceptionEvent = Ext.extend(Ext.Direct.RemotingEvent, {
    status: false,
    type: 'exception'
});

Ext.Direct.eventTypes = {
    'rpc':  Ext.Direct.RemotingEvent,
    'event':  Ext.Direct.Event,
    'exception':  Ext.Direct.ExceptionEvent
};

/**
 * @class Ext.direct.Provider
 * @extends Ext.util.Observable
 * <p>Ext.direct.Provider is an abstract class meant to be extended.</p>
 * 
 * <p>For example ExtJs implements the following subclasses:</p>
 * <pre><code>
Provider
|
+---{@link Ext.direct.JsonProvider JsonProvider} 
    |
    +---{@link Ext.direct.PollingProvider PollingProvider}   
    |
    +---{@link Ext.direct.RemotingProvider RemotingProvider}   
 * </code></pre>
 * @abstract
 */
Ext.direct.Provider = Ext.extend(Ext.util.Observable, {    
    /**
     * @cfg {String} id
     * The unique id of the provider (defaults to an {@link Ext#id auto-assigned id}).
     * You should assign an id if you need to be able to access the provider later and you do
     * not have an object reference available, for example:
     * <pre><code>
Ext.Direct.addProvider(
    {
        type: 'polling',
        url:  'php/poll.php',
        id:   'poll-provider'
    }
);
     
var p = {@link Ext.Direct Ext.Direct}.{@link Ext.Direct#getProvider getProvider}('poll-provider');
p.disconnect();
     * </code></pre>
     */
        
    /**
     * @cfg {Number} priority
     * Priority of the request. Lower is higher priority, <tt>0</tt> means "duplex" (always on).
     * All Providers default to <tt>1</tt> except for PollingProvider which defaults to <tt>3</tt>.
     */    
    priority: 1,

    /**
     * @cfg {String} type
     * <b>Required</b>, <tt>undefined</tt> by default.  The <tt>type</tt> of provider specified
     * to {@link Ext.Direct Ext.Direct}.{@link Ext.Direct#addProvider addProvider} to create a
     * new Provider. Acceptable values by default are:<div class="mdetail-params"><ul>
     * <li><b><tt>polling</tt></b> : {@link Ext.direct.PollingProvider PollingProvider}</li>
     * <li><b><tt>remoting</tt></b> : {@link Ext.direct.RemotingProvider RemotingProvider}</li>
     * </ul></div>
     */    
 
    // private
    constructor : function(config){
        Ext.apply(this, config);
        this.addEvents(
            /**
             * @event connect
             * Fires when the Provider connects to the server-side
             * @param {Ext.direct.Provider} provider The {@link Ext.direct.Provider Provider}.
             */            
            'connect',
            /**
             * @event disconnect
             * Fires when the Provider disconnects from the server-side
             * @param {Ext.direct.Provider} provider The {@link Ext.direct.Provider Provider}.
             */            
            'disconnect',
            /**
             * @event data
             * Fires when the Provider receives data from the server-side
             * @param {Ext.direct.Provider} provider The {@link Ext.direct.Provider Provider}.
             * @param {event} e The {@link Ext.Direct#eventTypes Ext.Direct.Event type} that occurred.
             */            
            'data',
            /**
             * @event exception
             * Fires when the Provider receives an exception from the server-side
             */                        
            'exception'
        );
        Ext.direct.Provider.superclass.constructor.call(this, config);
    },

    /**
     * Returns whether or not the server-side is currently connected.
     * Abstract method for subclasses to implement.
     */
    isConnected: function(){
        return false;
    },

    /**
     * Abstract methods for subclasses to implement.
     */
    connect: Ext.emptyFn,
    
    /**
     * Abstract methods for subclasses to implement.
     */
    disconnect: Ext.emptyFn
});
/**
 * @class Ext.direct.JsonProvider
 * @extends Ext.direct.Provider
 */
Ext.direct.JsonProvider = Ext.extend(Ext.direct.Provider, {
    parseResponse: function(xhr){
        if(!Ext.isEmpty(xhr.responseText)){
            if(typeof xhr.responseText == 'object'){
                return xhr.responseText;
            }
            return Ext.decode(xhr.responseText);
        }
        return null;
    },

    getEvents: function(xhr){
        var data = null;
        try{
            data = this.parseResponse(xhr);
        }catch(e){
            var event = new Ext.Direct.ExceptionEvent({
                data: e,
                xhr: xhr,
                code: Ext.Direct.exceptions.PARSE,
                message: 'Error parsing json response: \n\n ' + data
            })
            return [event];
        }
        var events = [];
        if(Ext.isArray(data)){
            for(var i = 0, len = data.length; i < len; i++){
                events.push(Ext.Direct.createEvent(data[i]));
            }
        }else{
            events.push(Ext.Direct.createEvent(data));
        }
        return events;
    }
});/**
 * @class Ext.direct.PollingProvider
 * @extends Ext.direct.JsonProvider
 *
 * <p>Provides for repetitive polling of the server at distinct {@link #interval intervals}.
 * The initial request for data originates from the client, and then is responded to by the
 * server.</p>
 * 
 * <p>All configurations for the PollingProvider should be generated by the server-side
 * API portion of the Ext.Direct stack.</p>
 *
 * <p>An instance of PollingProvider may be created directly via the new keyword or by simply
 * specifying <tt>type = 'polling'</tt>.  For example:</p>
 * <pre><code>
var pollA = new Ext.direct.PollingProvider({
    type:'polling',
    url: 'php/pollA.php',
});
Ext.Direct.addProvider(pollA);
pollA.disconnect();

Ext.Direct.addProvider(
    {
        type:'polling',
        url: 'php/pollB.php',
        id: 'pollB-provider'
    }
);
var pollB = Ext.Direct.getProvider('pollB-provider');
 * </code></pre>
 */
Ext.direct.PollingProvider = Ext.extend(Ext.direct.JsonProvider, {
    /**
     * @cfg {Number} priority
     * Priority of the request (defaults to <tt>3</tt>). See {@link Ext.direct.Provider#priority}.
     */
    // override default priority
    priority: 3,
    
    /**
     * @cfg {Number} interval
     * How often to poll the server-side in milliseconds (defaults to <tt>3000</tt> - every
     * 3 seconds).
     */
    interval: 3000,

    /**
     * @cfg {Object} baseParams An object containing properties which are to be sent as parameters
     * on every polling request
     */
    
    /**
     * @cfg {String/Function} url
     * The url which the PollingProvider should contact with each request. This can also be
     * an imported Ext.Direct method which will accept the baseParams as its only argument.
     */

    // private
    constructor : function(config){
        Ext.direct.PollingProvider.superclass.constructor.call(this, config);
        this.addEvents(
            /**
             * @event beforepoll
             * Fired immediately before a poll takes place, an event handler can return false
             * in order to cancel the poll.
             * @param {Ext.direct.PollingProvider}
             */
            'beforepoll',            
            /**
             * @event poll
             * This event has not yet been implemented.
             * @param {Ext.direct.PollingProvider}
             */
            'poll'
        );
    },

    // inherited
    isConnected: function(){
        return !!this.pollTask;
    },

    /**
     * Connect to the server-side and begin the polling process. To handle each
     * response subscribe to the data event.
     */
    connect: function(){
        if(this.url && !this.pollTask){
            this.pollTask = Ext.TaskMgr.start({
                run: function(){
                    if(this.fireEvent('beforepoll', this) !== false){
                        if(typeof this.url == 'function'){
                            this.url(this.baseParams);
                        }else{
                            Ext.Ajax.request({
                                url: this.url,
                                callback: this.onData,
                                scope: this,
                                params: this.baseParams
                            });
                        }
                    }
                },
                interval: this.interval,
                scope: this
            });
            this.fireEvent('connect', this);
        }else if(!this.url){
            throw 'Error initializing PollingProvider, no url configured.';
        }
    },

    /**
     * Disconnect from the server-side and stop the polling process. The disconnect
     * event will be fired on a successful disconnect.
     */
    disconnect: function(){
        if(this.pollTask){
            Ext.TaskMgr.stop(this.pollTask);
            delete this.pollTask;
            this.fireEvent('disconnect', this);
        }
    },

    // private
    onData: function(opt, success, xhr){
        if(success){
            var events = this.getEvents(xhr);
            for(var i = 0, len = events.length; i < len; i++){
                var e = events[i];
                this.fireEvent('data', this, e);
            }
        }else{
            var e = new Ext.Direct.ExceptionEvent({
                data: e,
                code: Ext.Direct.exceptions.TRANSPORT,
                message: 'Unable to connect to the server.',
                xhr: xhr
            });
            this.fireEvent('data', this, e);
        }
    }
});

Ext.Direct.PROVIDERS['polling'] = Ext.direct.PollingProvider;/**
 * @class Ext.direct.RemotingProvider
 * @extends Ext.direct.JsonProvider
 * 
 * <p>The {@link Ext.direct.RemotingProvider RemotingProvider} exposes access to
 * server side methods on the client (a remote procedure call (RPC) type of
 * connection where the client can initiate a procedure on the server).</p>
 * 
 * <p>This allows for code to be organized in a fashion that is maintainable,
 * while providing a clear path between client and server, something that is
 * not always apparent when using URLs.</p>
 * 
 * <p>To accomplish this the server-side needs to describe what classes and methods
 * are available on the client-side. This configuration will typically be
 * outputted by the server-side Ext.Direct stack when the API description is built.</p>
 */
Ext.direct.RemotingProvider = Ext.extend(Ext.direct.JsonProvider, {       
    /**
     * @cfg {Object} actions
     * Object literal defining the server side actions and methods. For example, if
     * the Provider is configured with:
     * <pre><code>
"actions":{ // each property within the 'actions' object represents a server side Class 
    "TestAction":[ // array of methods within each server side Class to be   
    {              // stubbed out on client
        "name":"doEcho", 
        "len":1            
    },{
        "name":"multiply",// name of method
        "len":2           // The number of parameters that will be used to create an
                          // array of data to send to the server side function.
                          // Ensure the server sends back a Number, not a String. 
    },{
        "name":"doForm",
        "formHandler":true, // direct the client to use specialized form handling method 
        "len":1
    }]
}
     * </code></pre>
     * <p>Note that a Store is not required, a server method can be called at any time.
     * In the following example a <b>client side</b> handler is used to call the
     * server side method "multiply" in the server-side "TestAction" Class:</p>
     * <pre><code>
TestAction.multiply(
    2, 4, // pass two arguments to server, so specify len=2
    // callback function after the server is called
    // result: the result returned by the server
    //      e: Ext.Direct.RemotingEvent object
    function(result, e){
        var t = e.getTransaction();
        var action = t.action; // server side Class called
        var method = t.method; // server side method called
        if(e.status){
            var answer = Ext.encode(result); // 8
    
        }else{
            var msg = e.message; // failure message
        }
    }
);
     * </code></pre>
     * In the example above, the server side "multiply" function will be passed two
     * arguments (2 and 4).  The "multiply" method should return the value 8 which will be
     * available as the <tt>result</tt> in the example above. 
     */
    
    /**
     * @cfg {String/Object} namespace
     * Namespace for the Remoting Provider (defaults to the browser global scope of <i>window</i>).
     * Explicitly specify the namespace Object, or specify a String to have a
     * {@link Ext#namespace namespace created} implicitly.
     */
    
    /**
     * @cfg {String} url
     * <b>Required<b>. The url to connect to the {@link Ext.Direct} server-side router. 
     */
    
    /**
     * @cfg {String} enableUrlEncode
     * Specify which param will hold the arguments for the method.
     * Defaults to <tt>'data'</tt>.
     */
    
    /**
     * @cfg {Number/Boolean} enableBuffer
     * <p><tt>true</tt> or <tt>false</tt> to enable or disable combining of method
     * calls. If a number is specified this is the amount of time in milliseconds
     * to wait before sending a batched request (defaults to <tt>10</tt>).</p>
     * <br><p>Calls which are received within the specified timeframe will be
     * concatenated together and sent in a single request, optimizing the
     * application by reducing the amount of round trips that have to be made
     * to the server.</p>
     */
    enableBuffer: 10,
    
    /**
     * @cfg {Number} maxRetries
     * Number of times to re-attempt delivery on failure of a call.
     */
    maxRetries: 1,

    constructor : function(config){
        Ext.direct.RemotingProvider.superclass.constructor.call(this, config);
        this.addEvents(
            /**
             * @event beforecall
             * Fires immediately before the client-side sends off the RPC call.
             * By returning false from an event handler you can prevent the call from
             * executing.
             * @param {Ext.direct.RemotingProvider} provider
             * @param {Ext.Direct.Transaction} transaction
             */            
            'beforecall',
            /**
             * @event call
             * Fires immediately after the request to the server-side is sent. This does
             * NOT fire after the response has come back from the call.
             * @param {Ext.direct.RemotingProvider} provider
             * @param {Ext.Direct.Transaction} transaction
             */            
            'call'
        );
        this.namespace = (typeof this.namespace === 'string') ? Ext.ns(this.namespace) : this.namespace || window;
        this.transactions = {};
        this.callBuffer = [];
    },

    // private
    initAPI : function(){
        var o = this.actions;
        for(var c in o){
            var cls = this.namespace[c] || (this.namespace[c] = {});
            var ms = o[c];
            for(var i = 0, len = ms.length; i < len; i++){
                var m = ms[i];
                cls[m.name] = this.createMethod(c, m);
            }
        }
    },

    // inherited
    isConnected: function(){
        return !!this.connected;
    },

    connect: function(){
        if(this.url){
            this.initAPI();
            this.connected = true;
            this.fireEvent('connect', this);
        }else if(!this.url){
            throw 'Error initializing RemotingProvider, no url configured.';
        }
    },

    disconnect: function(){
        if(this.connected){
            this.connected = false;
            this.fireEvent('disconnect', this);
        }
    },

    onData: function(opt, success, xhr){
        if(success){
            var events = this.getEvents(xhr);
            for(var i = 0, len = events.length; i < len; i++){
                var e = events[i];
                var t = this.getTransaction(e);
                this.fireEvent('data', this, e);
                if(t){
                    this.doCallback(t, e, true);
                    Ext.Direct.removeTransaction(t);
                }
            }
        }else{
            var ts = [].concat(opt.ts);
            for(var i = 0, len = ts.length; i < len; i++){
                var t = this.getTransaction(ts[i]);
                if(t && t.retryCount < this.maxRetries){
                    t.retry();
                }else{
                    var e = new Ext.Direct.ExceptionEvent({
                        data: e,
                        transaction: t,
                        code: Ext.Direct.exceptions.TRANSPORT,
                        message: 'Unable to connect to the server.',
                        xhr: xhr
                    });
                    this.fireEvent('data', this, e);
                    if(t){
                        this.doCallback(t, e, false);
                        Ext.Direct.removeTransaction(t);
                    }
                }
            }
        }
    },

    getCallData: function(t){
        return {
            action: t.action,
            method: t.method,
            data: t.data,
            type: 'rpc',
            tid: t.tid
        };
    },

    doSend : function(data){
        var o = {
            url: this.url,
            callback: this.onData,
            scope: this,
            ts: data
        };

        // send only needed data
        var callData;
        if(Ext.isArray(data)){
            callData = [];
            for(var i = 0, len = data.length; i < len; i++){
                callData.push(this.getCallData(data[i]));
            }
        }else{
            callData = this.getCallData(data);
        }

        if(this.enableUrlEncode){
            var params = {};
            params[typeof this.enableUrlEncode == 'string' ? this.enableUrlEncode : 'data'] = Ext.encode(callData);
            o.params = params;
        }else{
            o.jsonData = callData;
        }
        Ext.Ajax.request(o);
    },

    combineAndSend : function(){
        var len = this.callBuffer.length;
        if(len > 0){
            this.doSend(len == 1 ? this.callBuffer[0] : this.callBuffer);
            this.callBuffer = [];
        }
    },

    queueTransaction: function(t){
        if(t.form){
            this.processForm(t);
            return;
        }
        this.callBuffer.push(t);
        if(this.enableBuffer){
            if(!this.callTask){
                this.callTask = new Ext.util.DelayedTask(this.combineAndSend, this);
            }
            this.callTask.delay(typeof this.enableBuffer == 'number' ? this.enableBuffer : 10);
        }else{
            this.combineAndSend();
        }
    },

    doCall : function(c, m, args){
        var data = null, hs = args[m.len], scope = args[m.len+1];

        if(m.len !== 0){
            data = args.slice(0, m.len);
        }

        var t = new Ext.Direct.Transaction({
            provider: this,
            args: args,
            action: c,
            method: m.name,
            data: data,
            cb: scope && Ext.isFunction(hs) ? hs.createDelegate(scope) : hs
        });

        if(this.fireEvent('beforecall', this, t) !== false){
            Ext.Direct.addTransaction(t);
            this.queueTransaction(t);
            this.fireEvent('call', this, t);
        }
    },

    doForm : function(c, m, form, callback, scope){
        var t = new Ext.Direct.Transaction({
            provider: this,
            action: c,
            method: m.name,
            args:[form, callback, scope],
            cb: scope && Ext.isFunction(callback) ? callback.createDelegate(scope) : callback,
            isForm: true
        });

        if(this.fireEvent('beforecall', this, t) !== false){
            Ext.Direct.addTransaction(t);
            var isUpload = String(form.getAttribute("enctype")).toLowerCase() == 'multipart/form-data',
                params = {
                    extTID: t.tid,
                    extAction: c,
                    extMethod: m.name,
                    extType: 'rpc',
                    extUpload: String(isUpload)
                };
            
            // change made from typeof callback check to callback.params
            // to support addl param passing in DirectSubmit EAC 6/2
            Ext.apply(t, {
                form: Ext.getDom(form),
                isUpload: isUpload,
                params: callback && Ext.isObject(callback.params) ? Ext.apply(params, callback.params) : params
            });
            this.fireEvent('call', this, t);
            this.processForm(t);
        }
    },
    
    processForm: function(t){
        Ext.Ajax.request({
            url: this.url,
            params: t.params,
            callback: this.onData,
            scope: this,
            form: t.form,
            isUpload: t.isUpload,
            ts: t
        });
    },

    createMethod : function(c, m){
        var f;
        if(!m.formHandler){
            f = function(){
                this.doCall(c, m, Array.prototype.slice.call(arguments, 0));
            }.createDelegate(this);
        }else{
            f = function(form, callback, scope){
                this.doForm(c, m, form, callback, scope);
            }.createDelegate(this);
        }
        f.directCfg = {
            action: c,
            method: m
        };
        return f;
    },

    getTransaction: function(opt){
        return opt && opt.tid ? Ext.Direct.getTransaction(opt.tid) : null;
    },

    doCallback: function(t, e){
        var fn = e.status ? 'success' : 'failure';
        if(t && t.cb){
            var hs = t.cb;
            var result = e.result || e.data;
            if(Ext.isFunction(hs)){
                hs(result, e);
            } else{
                Ext.callback(hs[fn], hs.scope, [result, e]);
                Ext.callback(hs.callback, hs.scope, [result, e]);
            }
        }
    }
});
Ext.Direct.PROVIDERS['remoting'] = Ext.direct.RemotingProvider;