/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.data.MemoryProxy
 * @extends Ext.data.DataProxy
 * An implementation of Ext.data.DataProxy that simply passes the data specified in its constructor
 * to the Reader when its load method is called.
 * @constructor
 * @param {Object} data The data object which the Reader uses to construct a block of Ext.data.Records.
 */
Ext.data.MemoryProxy = function(data){
    // Must define a dummy api with "read" action to satisfy DataProxy#doRequest and Ext.data.Api#prepare *before* calling super
    var api = {};
    api[Ext.data.Api.actions.read] = true;
    Ext.data.MemoryProxy.superclass.constructor.call(this, {
        api: api
    });
    this.data = data;
};

Ext.extend(Ext.data.MemoryProxy, Ext.data.DataProxy, {
    /**
     * @event loadexception
     * Fires if an exception occurs in the Proxy during data loading. Note that this event is also relayed
     * through {@link Ext.data.Store}, so you can listen for it directly on any Store instance.
     * @param {Object} this
     * @param {Object} arg The callback's arg object passed to the {@link #load} function
     * @param {Object} null This parameter does not apply and will always be null for MemoryProxy
     * @param {Error} e The JavaScript Error object caught if the configured Reader could not read the data
     */

       /**
     * MemoryProxy implementation of DataProxy#doRequest
     * @param {String} action
     * @param {Ext.data.Record/Ext.data.Record[]} rs If action is load, rs will be null
     * @param {Object} params An object containing properties which are to be used as HTTP parameters
     * for the request to the remote server.
     * @param {Ext.data.DataReader} reader The Reader object which converts the data
     * object into a block of Ext.data.Records.
     * @param {Function} callback The function into which to pass the block of Ext.data.Records.
     * The function must be passed <ul>
     * <li>The Record block object</li>
     * <li>The "arg" argument from the load function</li>
     * <li>A boolean success indicator</li>
     * </ul>
     * @param {Object} scope The scope (<code>this</code> reference) in which the callback function is executed. Defaults to the browser window.
     * @param {Object} arg An optional argument which is passed to the callback as its second parameter.
     */
    doRequest : function(action, rs, params, reader, callback, scope, arg) {
        // No implementation for CRUD in MemoryProxy.  Assumes all actions are 'load'
        params = params || {};
        var result;
        try {
            result = reader.readRecords(this.data);
        }catch(e){
            // @deprecated loadexception
            this.fireEvent("loadexception", this, null, arg, e);

            this.fireEvent('exception', this, 'response', action, arg, null, e);
            callback.call(scope, null, arg, false);
            return;
        }
        callback.call(scope, result, arg, true);
    }
});