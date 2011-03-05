/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
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
            });
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
});