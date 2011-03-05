/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
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
