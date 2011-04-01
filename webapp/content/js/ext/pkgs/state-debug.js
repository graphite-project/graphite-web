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
/**
 * @class Ext.state.Manager
 * This is the global state manager. By default all components that are "state aware" check this class
 * for state information if you don't pass them a custom state provider. In order for this class
 * to be useful, it must be initialized with a provider when your application initializes. Example usage:
 <pre><code>
// in your initialization function
init : function(){
   Ext.state.Manager.setProvider(new Ext.state.CookieProvider());
   var win = new Window(...);
   win.restoreState();
}
 </code></pre>
 * @singleton
 */
Ext.state.Manager = function(){
    var provider = new Ext.state.Provider();

    return {
        /**
         * Configures the default state provider for your application
         * @param {Provider} stateProvider The state provider to set
         */
        setProvider : function(stateProvider){
            provider = stateProvider;
        },

        /**
         * Returns the current value for a key
         * @param {String} name The key name
         * @param {Mixed} defaultValue The default value to return if the key lookup does not match
         * @return {Mixed} The state data
         */
        get : function(key, defaultValue){
            return provider.get(key, defaultValue);
        },

        /**
         * Sets the value for a key
         * @param {String} name The key name
         * @param {Mixed} value The state data
         */
         set : function(key, value){
            provider.set(key, value);
        },

        /**
         * Clears a value from the state
         * @param {String} name The key name
         */
        clear : function(key){
            provider.clear(key);
        },

        /**
         * Gets the currently configured state provider
         * @return {Provider} The state provider
         */
        getProvider : function(){
            return provider;
        }
    };
}();
/**
 * @class Ext.state.CookieProvider
 * @extends Ext.state.Provider
 * The default Provider implementation which saves state via cookies.
 * <br />Usage:
 <pre><code>
   var cp = new Ext.state.CookieProvider({
       path: "/cgi-bin/",
       expires: new Date(new Date().getTime()+(1000*60*60*24*30)), //30 days
       domain: "extjs.com"
   });
   Ext.state.Manager.setProvider(cp);
 </code></pre>
 * @cfg {String} path The path for which the cookie is active (defaults to root '/' which makes it active for all pages in the site)
 * @cfg {Date} expires The cookie expiration date (defaults to 7 days from now)
 * @cfg {String} domain The domain to save the cookie for.  Note that you cannot specify a different domain than
 * your page is on, but you can specify a sub-domain, or simply the domain itself like 'extjs.com' to include
 * all sub-domains if you need to access cookies across different sub-domains (defaults to null which uses the same
 * domain the page is running on including the 'www' like 'www.extjs.com')
 * @cfg {Boolean} secure True if the site is using SSL (defaults to false)
 * @constructor
 * Create a new CookieProvider
 * @param {Object} config The configuration object
 */
Ext.state.CookieProvider = Ext.extend(Ext.state.Provider, {
    
    constructor : function(config){
        Ext.state.CookieProvider.superclass.constructor.call(this);
        this.path = "/";
        this.expires = new Date(new Date().getTime()+(1000*60*60*24*7)); //7 days
        this.domain = null;
        this.secure = false;
        Ext.apply(this, config);
        this.state = this.readCookies();
    },
    
    // private
    set : function(name, value){
        if(typeof value == "undefined" || value === null){
            this.clear(name);
            return;
        }
        this.setCookie(name, value);
        Ext.state.CookieProvider.superclass.set.call(this, name, value);
    },

    // private
    clear : function(name){
        this.clearCookie(name);
        Ext.state.CookieProvider.superclass.clear.call(this, name);
    },

    // private
    readCookies : function(){
        var cookies = {},
            c = document.cookie + ";",
            re = /\s?(.*?)=(.*?);/g,
    	    matches,
            name,
            value;
    	while((matches = re.exec(c)) != null){
            name = matches[1];
            value = matches[2];
            if(name && name.substring(0,3) == "ys-"){
                cookies[name.substr(3)] = this.decodeValue(value);
            }
        }
        return cookies;
    },

    // private
    setCookie : function(name, value){
        document.cookie = "ys-"+ name + "=" + this.encodeValue(value) +
           ((this.expires == null) ? "" : ("; expires=" + this.expires.toGMTString())) +
           ((this.path == null) ? "" : ("; path=" + this.path)) +
           ((this.domain == null) ? "" : ("; domain=" + this.domain)) +
           ((this.secure == true) ? "; secure" : "");
    },

    // private
    clearCookie : function(name){
        document.cookie = "ys-" + name + "=null; expires=Thu, 01-Jan-70 00:00:01 GMT" +
           ((this.path == null) ? "" : ("; path=" + this.path)) +
           ((this.domain == null) ? "" : ("; domain=" + this.domain)) +
           ((this.secure == true) ? "; secure" : "");
    }
});