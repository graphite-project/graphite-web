/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.menu.BaseItem
 * @extends Ext.Component
 * The base class for all items that render into menus.  BaseItem provides default rendering, activated state
 * management and base configuration options shared by all menu components.
 * @constructor
 * Creates a new BaseItem
 * @param {Object} config Configuration options
 * @xtype menubaseitem
 */
Ext.menu.BaseItem = Ext.extend(Ext.Component, {
    /**
     * @property parentMenu
     * @type Ext.menu.Menu
     * The parent Menu of this Item.
     */
    /**
     * @cfg {Function} handler
     * A function that will handle the click event of this menu item (optional).
     * The handler is passed the following parameters:<div class="mdetail-params"><ul>
     * <li><code>b</code> : Item<div class="sub-desc">This menu Item.</div></li>
     * <li><code>e</code> : EventObject<div class="sub-desc">The click event.</div></li>
     * </ul></div>
     */
    /**
     * @cfg {Object} scope
     * The scope (<tt><b>this</b></tt> reference) in which the handler function will be called.
     */
    /**
     * @cfg {Boolean} canActivate True if this item can be visually activated (defaults to false)
     */
    canActivate : false,
    /**
     * @cfg {String} activeClass The CSS class to use when the item becomes activated (defaults to "x-menu-item-active")
     */
    activeClass : "x-menu-item-active",
    /**
     * @cfg {Boolean} hideOnClick True to hide the containing menu after this item is clicked (defaults to true)
     */
    hideOnClick : true,
    /**
     * @cfg {Number} clickHideDelay Length of time in milliseconds to wait before hiding after a click (defaults to 1)
     */
    clickHideDelay : 1,

    // private
    ctype : "Ext.menu.BaseItem",

    // private
    actionMode : "container",

    initComponent : function(){
        Ext.menu.BaseItem.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event click
             * Fires when this item is clicked
             * @param {Ext.menu.BaseItem} this
             * @param {Ext.EventObject} e
             */
            'click',
            /**
             * @event activate
             * Fires when this item is activated
             * @param {Ext.menu.BaseItem} this
             */
            'activate',
            /**
             * @event deactivate
             * Fires when this item is deactivated
             * @param {Ext.menu.BaseItem} this
             */
            'deactivate'
        );
        if(this.handler){
            this.on("click", this.handler, this.scope);
        }
    },

    // private
    onRender : function(container, position){
        Ext.menu.BaseItem.superclass.onRender.apply(this, arguments);
        if(this.ownerCt && this.ownerCt instanceof Ext.menu.Menu){
            this.parentMenu = this.ownerCt;
        }else{
            this.container.addClass('x-menu-list-item');
            this.mon(this.el, {
                scope: this,
                click: this.onClick,
                mouseenter: this.activate,
                mouseleave: this.deactivate
            });
        }
    },

    /**
     * Sets the function that will handle click events for this item (equivalent to passing in the {@link #handler}
     * config property).  If an existing handler is already registered, it will be unregistered for you.
     * @param {Function} handler The function that should be called on click
     * @param {Object} scope The scope (<code>this</code> reference) in which the handler function is executed. Defaults to this menu item.
     */
    setHandler : function(handler, scope){
        if(this.handler){
            this.un("click", this.handler, this.scope);
        }
        this.on("click", this.handler = handler, this.scope = scope);
    },

    // private
    onClick : function(e){
        if(!this.disabled && this.fireEvent("click", this, e) !== false
                && (this.parentMenu && this.parentMenu.fireEvent("itemclick", this, e) !== false)){
            this.handleClick(e);
        }else{
            e.stopEvent();
        }
    },

    // private
    activate : function(){
        if(this.disabled){
            return false;
        }
        var li = this.container;
        li.addClass(this.activeClass);
        this.region = li.getRegion().adjust(2, 2, -2, -2);
        this.fireEvent("activate", this);
        return true;
    },

    // private
    deactivate : function(){
        this.container.removeClass(this.activeClass);
        this.fireEvent("deactivate", this);
    },

    // private
    shouldDeactivate : function(e){
        return !this.region || !this.region.contains(e.getPoint());
    },

    // private
    handleClick : function(e){
        var pm = this.parentMenu;
        if(this.hideOnClick){
            if(pm.floating){
                pm.hide.defer(this.clickHideDelay, pm, [true]);
            }else{
                pm.deactivateActive();
            }
        }
    },

    // private. Do nothing
    expandMenu : Ext.emptyFn,

    // private. Do nothing
    hideMenu : Ext.emptyFn
});
Ext.reg('menubaseitem', Ext.menu.BaseItem);