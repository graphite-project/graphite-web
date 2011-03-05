/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
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
        var provider = id.id ? id : this.providers[id];
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
Ext.Direct.PROVIDERS = {};