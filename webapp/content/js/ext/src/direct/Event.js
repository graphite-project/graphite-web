/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.Direct.Event = function(config){
    Ext.apply(this, config);
};

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
