/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.LoadMask
 * A simple utility class for generically masking elements while loading data.  If the {@link #store}
 * config option is specified, the masking will be automatically synchronized with the store's loading
 * process and the mask element will be cached for reuse.  For all other elements, this mask will replace the
 * element's Updater load indicator and will be destroyed after the initial load.
 * <p>Example usage:</p>
 *<pre><code>
// Basic mask:
var myMask = new Ext.LoadMask(Ext.getBody(), {msg:"Please wait..."});
myMask.show();
</code></pre>
 * @constructor
 * Create a new LoadMask
 * @param {Mixed} el The element or DOM node, or its id
 * @param {Object} config The config object
 */
Ext.LoadMask = function(el, config){
    this.el = Ext.get(el);
    Ext.apply(this, config);
    if(this.store){
        this.store.on({
            scope: this,
            beforeload: this.onBeforeLoad,
            load: this.onLoad,
            exception: this.onLoad
        });
        this.removeMask = Ext.value(this.removeMask, false);
    }else{
        var um = this.el.getUpdater();
        um.showLoadIndicator = false; // disable the default indicator
        um.on({
            scope: this,
            beforeupdate: this.onBeforeLoad,
            update: this.onLoad,
            failure: this.onLoad
        });
        this.removeMask = Ext.value(this.removeMask, true);
    }
};

Ext.LoadMask.prototype = {
    /**
     * @cfg {Ext.data.Store} store
     * Optional Store to which the mask is bound. The mask is displayed when a load request is issued, and
     * hidden on either load sucess, or load fail.
     */
    /**
     * @cfg {Boolean} removeMask
     * True to create a single-use mask that is automatically destroyed after loading (useful for page loads),
     * False to persist the mask element reference for multiple uses (e.g., for paged data widgets).  Defaults to false.
     */
    /**
     * @cfg {String} msg
     * The text to display in a centered loading message box (defaults to 'Loading...')
     */
    msg : 'Loading...',
    /**
     * @cfg {String} msgCls
     * The CSS class to apply to the loading message element (defaults to "x-mask-loading")
     */
    msgCls : 'x-mask-loading',

    /**
     * Read-only. True if the mask is currently disabled so that it will not be displayed (defaults to false)
     * @type Boolean
     */
    disabled: false,

    /**
     * Disables the mask to prevent it from being displayed
     */
    disable : function(){
       this.disabled = true;
    },

    /**
     * Enables the mask so that it can be displayed
     */
    enable : function(){
        this.disabled = false;
    },

    // private
    onLoad : function(){
        this.el.unmask(this.removeMask);
    },

    // private
    onBeforeLoad : function(){
        if(!this.disabled){
            this.el.mask(this.msg, this.msgCls);
        }
    },

    /**
     * Show this LoadMask over the configured Element.
     */
    show: function(){
        this.onBeforeLoad();
    },

    /**
     * Hide this LoadMask.
     */
    hide: function(){
        this.onLoad();
    },

    // private
    destroy : function(){
        if(this.store){
            this.store.un('beforeload', this.onBeforeLoad, this);
            this.store.un('load', this.onLoad, this);
            this.store.un('exception', this.onLoad, this);
        }else{
            var um = this.el.getUpdater();
            um.un('beforeupdate', this.onBeforeLoad, this);
            um.un('update', this.onLoad, this);
            um.un('failure', this.onLoad, this);
        }
    }
};