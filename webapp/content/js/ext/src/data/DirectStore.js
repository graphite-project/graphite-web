/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
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
Ext.data.DirectStore = Ext.extend(Ext.data.Store, {
    constructor : function(config){
        // each transaction upon a singe record will generate a distinct Direct transaction since Direct queues them into one Ajax request.
        var c = Ext.apply({}, {
            batchTransactions: false
        }, config);
        Ext.data.DirectStore.superclass.constructor.call(this, Ext.apply(c, {
            proxy: Ext.isDefined(c.proxy) ? c.proxy : new Ext.data.DirectProxy(Ext.copyTo({}, c, 'paramOrder,paramsAsHash,directFn,api')),
            reader: (!Ext.isDefined(c.reader) && c.fields) ? new Ext.data.JsonReader(Ext.copyTo({}, c, 'totalProperty,root,idProperty'), c.fields) : c.reader
        }));
    }
});
Ext.reg('directstore', Ext.data.DirectStore);
