/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.dd.StatusProxy
 * A specialized drag proxy that supports a drop status icon, {@link Ext.Layer} styles and auto-repair.  This is the
 * default drag proxy used by all Ext.dd components.
 * @constructor
 * @param {Object} config
 */
Ext.dd.StatusProxy = function(config){
    Ext.apply(this, config);
    this.id = this.id || Ext.id();
    this.el = new Ext.Layer({
        dh: {
            id: this.id, tag: "div", cls: "x-dd-drag-proxy "+this.dropNotAllowed, children: [
                {tag: "div", cls: "x-dd-drop-icon"},
                {tag: "div", cls: "x-dd-drag-ghost"}
            ]
        }, 
        shadow: !config || config.shadow !== false
    });
    this.ghost = Ext.get(this.el.dom.childNodes[1]);
    this.dropStatus = this.dropNotAllowed;
};

Ext.dd.StatusProxy.prototype = {
    /**
     * @cfg {String} dropAllowed
     * The CSS class to apply to the status element when drop is allowed (defaults to "x-dd-drop-ok").
     */
    dropAllowed : "x-dd-drop-ok",
    /**
     * @cfg {String} dropNotAllowed
     * The CSS class to apply to the status element when drop is not allowed (defaults to "x-dd-drop-nodrop").
     */
    dropNotAllowed : "x-dd-drop-nodrop",

    /**
     * Updates the proxy's visual element to indicate the status of whether or not drop is allowed
     * over the current target element.
     * @param {String} cssClass The css class for the new drop status indicator image
     */
    setStatus : function(cssClass){
        cssClass = cssClass || this.dropNotAllowed;
        if(this.dropStatus != cssClass){
            this.el.replaceClass(this.dropStatus, cssClass);
            this.dropStatus = cssClass;
        }
    },

    /**
     * Resets the status indicator to the default dropNotAllowed value
     * @param {Boolean} clearGhost True to also remove all content from the ghost, false to preserve it
     */
    reset : function(clearGhost){
        this.el.dom.className = "x-dd-drag-proxy " + this.dropNotAllowed;
        this.dropStatus = this.dropNotAllowed;
        if(clearGhost){
            this.ghost.update("");
        }
    },

    /**
     * Updates the contents of the ghost element
     * @param {String/HTMLElement} html The html that will replace the current innerHTML of the ghost element, or a
     * DOM node to append as the child of the ghost element (in which case the innerHTML will be cleared first).
     */
    update : function(html){
        if(typeof html == "string"){
            this.ghost.update(html);
        }else{
            this.ghost.update("");
            html.style.margin = "0";
            this.ghost.dom.appendChild(html);
        }
        var el = this.ghost.dom.firstChild; 
        if(el){
            Ext.fly(el).setStyle('float', 'none');
        }
    },

    /**
     * Returns the underlying proxy {@link Ext.Layer}
     * @return {Ext.Layer} el
    */
    getEl : function(){
        return this.el;
    },

    /**
     * Returns the ghost element
     * @return {Ext.Element} el
     */
    getGhost : function(){
        return this.ghost;
    },

    /**
     * Hides the proxy
     * @param {Boolean} clear True to reset the status and clear the ghost contents, false to preserve them
     */
    hide : function(clear){
        this.el.hide();
        if(clear){
            this.reset(true);
        }
    },

    /**
     * Stops the repair animation if it's currently running
     */
    stop : function(){
        if(this.anim && this.anim.isAnimated && this.anim.isAnimated()){
            this.anim.stop();
        }
    },

    /**
     * Displays this proxy
     */
    show : function(){
        this.el.show();
    },

    /**
     * Force the Layer to sync its shadow and shim positions to the element
     */
    sync : function(){
        this.el.sync();
    },

    /**
     * Causes the proxy to return to its position of origin via an animation.  Should be called after an
     * invalid drop operation by the item being dragged.
     * @param {Array} xy The XY position of the element ([x, y])
     * @param {Function} callback The function to call after the repair is complete.
     * @param {Object} scope The scope (<code>this</code> reference) in which the callback function is executed. Defaults to the browser window.
     */
    repair : function(xy, callback, scope){
        this.callback = callback;
        this.scope = scope;
        if(xy && this.animRepair !== false){
            this.el.addClass("x-dd-drag-repair");
            this.el.hideUnders(true);
            this.anim = this.el.shift({
                duration: this.repairDuration || .5,
                easing: 'easeOut',
                xy: xy,
                stopFx: true,
                callback: this.afterRepair,
                scope: this
            });
        }else{
            this.afterRepair();
        }
    },

    // private
    afterRepair : function(){
        this.hide(true);
        if(typeof this.callback == "function"){
            this.callback.call(this.scope || this);
        }
        this.callback = null;
        this.scope = null;
    },
    
    destroy: function(){
        Ext.destroy(this.ghost, this.el);    
    }
};