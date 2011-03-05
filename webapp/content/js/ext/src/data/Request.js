/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.data.Request
 * A simple Request class used internally to the data package to provide more generalized remote-requests
 * to a DataProxy.
 * TODO Not yet implemented.  Implement in Ext.data.Store#execute
 */
Ext.data.Request = function(params) {
    Ext.apply(this, params);
};
Ext.data.Request.prototype = {
    /**
     * @cfg {String} action
     */
    action : undefined,
    /**
     * @cfg {Ext.data.Record[]/Ext.data.Record} rs The Store recordset associated with the request.
     */
    rs : undefined,
    /**
     * @cfg {Object} params HTTP request params
     */
    params: undefined,
    /**
     * @cfg {Function} callback The function to call when request is complete
     */
    callback : Ext.emptyFn,
    /**
     * @cfg {Object} scope The scope of the callback funtion
     */
    scope : undefined,
    /**
     * @cfg {Ext.data.DataReader} reader The DataReader instance which will parse the received response
     */
    reader : undefined
};
