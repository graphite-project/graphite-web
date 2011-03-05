/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.KeyNav
 * <p>Provides a convenient wrapper for normalized keyboard navigation.  KeyNav allows you to bind
 * navigation keys to function calls that will get called when the keys are pressed, providing an easy
 * way to implement custom navigation schemes for any UI component.</p>
 * <p>The following are all of the possible keys that can be implemented: enter, left, right, up, down, tab, esc,
 * pageUp, pageDown, del, home, end.  Usage:</p>
 <pre><code>
var nav = new Ext.KeyNav("my-element", {
    "left" : function(e){
        this.moveLeft(e.ctrlKey);
    },
    "right" : function(e){
        this.moveRight(e.ctrlKey);
    },
    "enter" : function(e){
        this.save();
    },
    scope : this
});
</code></pre>
 * @constructor
 * @param {Mixed} el The element to bind to
 * @param {Object} config The config
 */
Ext.KeyNav = function(el, config){
    this.el = Ext.get(el);
    Ext.apply(this, config);
    if(!this.disabled){
        this.disabled = true;
        this.enable();
    }
};

Ext.KeyNav.prototype = {
    /**
     * @cfg {Boolean} disabled
     * True to disable this KeyNav instance (defaults to false)
     */
    disabled : false,
    /**
     * @cfg {String} defaultEventAction
     * The method to call on the {@link Ext.EventObject} after this KeyNav intercepts a key.  Valid values are
     * {@link Ext.EventObject#stopEvent}, {@link Ext.EventObject#preventDefault} and
     * {@link Ext.EventObject#stopPropagation} (defaults to 'stopEvent')
     */
    defaultEventAction: "stopEvent",
    /**
     * @cfg {Boolean} forceKeyDown
     * Handle the keydown event instead of keypress (defaults to false).  KeyNav automatically does this for IE since
     * IE does not propagate special keys on keypress, but setting this to true will force other browsers to also
     * handle keydown instead of keypress.
     */
    forceKeyDown : false,

    // private
    relay : function(e){
        var k = e.getKey(),
            h = this.keyToHandler[k];
        if(h && this[h]){
            if(this.doRelay(e, this[h], h) !== true){
                e[this.defaultEventAction]();
            }
        }
    },

    // private
    doRelay : function(e, h, hname){
        return h.call(this.scope || this, e, hname);
    },

    // possible handlers
    enter : false,
    left : false,
    right : false,
    up : false,
    down : false,
    tab : false,
    esc : false,
    pageUp : false,
    pageDown : false,
    del : false,
    home : false,
    end : false,

    // quick lookup hash
    keyToHandler : {
        37 : "left",
        39 : "right",
        38 : "up",
        40 : "down",
        33 : "pageUp",
        34 : "pageDown",
        46 : "del",
        36 : "home",
        35 : "end",
        13 : "enter",
        27 : "esc",
        9  : "tab"
    },
    
    stopKeyUp: function(e) {
        var k = e.getKey();

        if (k >= 37 && k <= 40) {
            // *** bugfix - safari 2.x fires 2 keyup events on cursor keys
            // *** (note: this bugfix sacrifices the "keyup" event originating from keyNav elements in Safari 2)
            e.stopEvent();
        }
    },
    
    /**
     * Destroy this KeyNav (this is the same as calling disable).
     */
    destroy: function(){
        this.disable();    
    },

	/**
	 * Enable this KeyNav
	 */
	enable: function() {
        if (this.disabled) {
            if (Ext.isSafari2) {
                // call stopKeyUp() on "keyup" event
                this.el.on('keyup', this.stopKeyUp, this);
            }

            this.el.on(this.isKeydown()? 'keydown' : 'keypress', this.relay, this);
            this.disabled = false;
        }
    },

	/**
	 * Disable this KeyNav
	 */
	disable: function() {
        if (!this.disabled) {
            if (Ext.isSafari2) {
                // remove "keyup" event handler
                this.el.un('keyup', this.stopKeyUp, this);
            }

            this.el.un(this.isKeydown()? 'keydown' : 'keypress', this.relay, this);
            this.disabled = true;
        }
    },
    
    /**
     * Convenience function for setting disabled/enabled by boolean.
     * @param {Boolean} disabled
     */
    setDisabled : function(disabled){
        this[disabled ? "disable" : "enable"]();
    },
    
    // private
    isKeydown: function(){
        return this.forceKeyDown || Ext.EventManager.useKeydown;
    }
};
