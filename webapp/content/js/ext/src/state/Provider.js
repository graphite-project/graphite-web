/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.state.Provider
 * Abstract base class for state provider implementations. This class provides methods
 * for encoding and decoding <b>typed</b> variables including dates and defines the
 * Provider interface.
 */
Ext.state.Provider = Ext.extend(Ext.util.Observable, {
    
    constructor : function(){
        /**
         * @event statechange
         * Fires when a state change occurs.
         * @param {Provider} this This state provider
         * @param {String} key The state key which was changed
         * @param {String} value The encoded value for the state
         */
        this.addEvents("statechange");
        this.state = {};
        Ext.state.Provider.superclass.constructor.call(this);
    },
    
    /**
     * Returns the current value for a key
     * @param {String} name The key name
     * @param {Mixed} defaultValue A default value to return if the key's value is not found
     * @return {Mixed} The state data
     */
    get : function(name, defaultValue){
        return typeof this.state[name] == "undefined" ?
            defaultValue : this.state[name];
    },

    /**
     * Clears a value from the state
     * @param {String} name The key name
     */
    clear : function(name){
        delete this.state[name];
        this.fireEvent("statechange", this, name, null);
    },

    /**
     * Sets the value for a key
     * @param {String} name The key name
     * @param {Mixed} value The value to set
     */
    set : function(name, value){
        this.state[name] = value;
        this.fireEvent("statechange", this, name, value);
    },

    /**
     * Decodes a string previously encoded with {@link #encodeValue}.
     * @param {String} value The value to decode
     * @return {Mixed} The decoded value
     */
    decodeValue : function(cookie){
        /**
         * a -> Array
         * n -> Number
         * d -> Date
         * b -> Boolean
         * s -> String
         * o -> Object
         * -> Empty (null)
         */
        var re = /^(a|n|d|b|s|o|e)\:(.*)$/,
            matches = re.exec(unescape(cookie)),
            all,
            type,
            v,
            kv;
        if(!matches || !matches[1]){
            return; // non state cookie
        }
        type = matches[1];
        v = matches[2];
        switch(type){
            case 'e':
                return null;
            case 'n':
                return parseFloat(v);
            case 'd':
                return new Date(Date.parse(v));
            case 'b':
                return (v == '1');
            case 'a':
                all = [];
                if(v != ''){
                    Ext.each(v.split('^'), function(val){
                        all.push(this.decodeValue(val));
                    }, this);
                }
                return all;
           case 'o':
                all = {};
                if(v != ''){
                    Ext.each(v.split('^'), function(val){
                        kv = val.split('=');
                        all[kv[0]] = this.decodeValue(kv[1]);
                    }, this);
                }
                return all;
           default:
                return v;
        }
    },

    /**
     * Encodes a value including type information.  Decode with {@link #decodeValue}.
     * @param {Mixed} value The value to encode
     * @return {String} The encoded value
     */
    encodeValue : function(v){
        var enc,
            flat = '',
            i = 0,
            len,
            key;
        if(v == null){
            return 'e:1';    
        }else if(typeof v == 'number'){
            enc = 'n:' + v;
        }else if(typeof v == 'boolean'){
            enc = 'b:' + (v ? '1' : '0');
        }else if(Ext.isDate(v)){
            enc = 'd:' + v.toGMTString();
        }else if(Ext.isArray(v)){
            for(len = v.length; i < len; i++){
                flat += this.encodeValue(v[i]);
                if(i != len - 1){
                    flat += '^';
                }
            }
            enc = 'a:' + flat;
        }else if(typeof v == 'object'){
            for(key in v){
                if(typeof v[key] != 'function' && v[key] !== undefined){
                    flat += key + '=' + this.encodeValue(v[key]) + '^';
                }
            }
            enc = 'o:' + flat.substring(0, flat.length-1);
        }else{
            enc = 's:' + v;
        }
        return escape(enc);
    }
});
