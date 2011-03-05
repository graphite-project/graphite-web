/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * Framework-wide error-handler.  Developers can override this method to provide
 * custom exception-handling.  Framework errors will often extend from the base
 * Ext.Error class.
 * @param {Object/Error} e The thrown exception object.
 */
Ext.handleError = function(e) {
    throw e;
};

/**
 * @class Ext.Error
 * @extends Error
 * <p>A base error class. Future implementations are intended to provide more
 * robust error handling throughout the framework (<b>in the debug build only</b>)
 * to check for common errors and problems. The messages issued by this class
 * will aid error checking. Error checks will be automatically removed in the
 * production build so that performance is not negatively impacted.</p>
 * <p>Some sample messages currently implemented:</p><pre>
"DataProxy attempted to execute an API-action but found an undefined
url / function. Please review your Proxy url/api-configuration."
 * </pre><pre>
"Could not locate your "root" property in your server response.
Please review your JsonReader config to ensure the config-property
"root" matches the property your server-response.  See the JsonReader
docs for additional assistance."
 * </pre>
 * <p>An example of the code used for generating error messages:</p><pre><code>
try {
    generateError({
        foo: 'bar'
    });
}
catch (e) {
    console.error(e);
}
function generateError(data) {
    throw new Ext.Error('foo-error', data);
}
 * </code></pre>
 * @param {String} message
 */
Ext.Error = function(message) {
    // Try to read the message from Ext.Error.lang
    this.message = (this.lang[message]) ? this.lang[message] : message;
};

Ext.Error.prototype = new Error();
Ext.apply(Ext.Error.prototype, {
    // protected.  Extensions place their error-strings here.
    lang: {},

    name: 'Ext.Error',
    /**
     * getName
     * @return {String}
     */
    getName : function() {
        return this.name;
    },
    /**
     * getMessage
     * @return {String}
     */
    getMessage : function() {
        return this.message;
    },
    /**
     * toJson
     * @return {String}
     */
    toJson : function() {
        return Ext.encode(this);
    }
});
