/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.menu.Item
 * @extends Ext.menu.BaseItem
 * A base class for all menu items that require menu-related functionality (like sub-menus) and are not static
 * display items.  Item extends the base functionality of {@link Ext.menu.BaseItem} by adding menu-specific
 * activation and click handling.
 * @constructor
 * Creates a new Item
 * @param {Object} config Configuration options
 * @xtype menuitem
 */
Ext.menu.Item = Ext.extend(Ext.menu.BaseItem, {
    /**
     * @property menu
     * @type Ext.menu.Menu
     * The submenu associated with this Item if one was configured.
     */
    /**
     * @cfg {Mixed} menu (optional) Either an instance of {@link Ext.menu.Menu} or the config object for an
     * {@link Ext.menu.Menu} which acts as the submenu when this item is activated.
     */
    /**
     * @cfg {String} icon The path to an icon to display in this item (defaults to Ext.BLANK_IMAGE_URL).  If
     * icon is specified {@link #iconCls} should not be.
     */
    /**
     * @cfg {String} iconCls A CSS class that specifies a background image that will be used as the icon for
     * this item (defaults to '').  If iconCls is specified {@link #icon} should not be.
     */
    /**
     * @cfg {String} text The text to display in this item (defaults to '').
     */
    /**
     * @cfg {String} href The href attribute to use for the underlying anchor link (defaults to '#').
     */
    /**
     * @cfg {String} hrefTarget The target attribute to use for the underlying anchor link (defaults to '').
     */
    /**
     * @cfg {String} itemCls The default CSS class to use for menu items (defaults to 'x-menu-item')
     */
    itemCls : 'x-menu-item',
    /**
     * @cfg {Boolean} canActivate True if this item can be visually activated (defaults to true)
     */
    canActivate : true,
    /**
     * @cfg {Number} showDelay Length of time in milliseconds to wait before showing this item (defaults to 200)
     */
    showDelay: 200,
    
    /**
     * @cfg {String} altText The altText to use for the icon, if it exists. Defaults to <tt>''</tt>.
     */
    altText: '',
    
    // doc'd in BaseItem
    hideDelay: 200,

    // private
    ctype: 'Ext.menu.Item',

    initComponent : function(){
        Ext.menu.Item.superclass.initComponent.call(this);
        if(this.menu){
            this.menu = Ext.menu.MenuMgr.get(this.menu);
            this.menu.ownerCt = this;
        }
    },

    // private
    onRender : function(container, position){
        if (!this.itemTpl) {
            this.itemTpl = Ext.menu.Item.prototype.itemTpl = new Ext.XTemplate(
                '<a id="{id}" class="{cls}" hidefocus="true" unselectable="on" href="{href}"',
                    '<tpl if="hrefTarget">',
                        ' target="{hrefTarget}"',
                    '</tpl>',
                 '>',
                     '<img alt="{altText}" src="{icon}" class="x-menu-item-icon {iconCls}"/>',
                     '<span class="x-menu-item-text">{text}</span>',
                 '</a>'
             );
        }
        var a = this.getTemplateArgs();
        this.el = position ? this.itemTpl.insertBefore(position, a, true) : this.itemTpl.append(container, a, true);
        this.iconEl = this.el.child('img.x-menu-item-icon');
        this.textEl = this.el.child('.x-menu-item-text');
        if(!this.href) { // if no link defined, prevent the default anchor event
            this.mon(this.el, 'click', Ext.emptyFn, null, { preventDefault: true });
        }
        Ext.menu.Item.superclass.onRender.call(this, container, position);
    },

    getTemplateArgs: function() {
        return {
            id: this.id,
            cls: this.itemCls + (this.menu ?  ' x-menu-item-arrow' : '') + (this.cls ?  ' ' + this.cls : ''),
            href: this.href || '#',
            hrefTarget: this.hrefTarget,
            icon: this.icon || Ext.BLANK_IMAGE_URL,
            iconCls: this.iconCls || '',
            text: this.itemText||this.text||'&#160;',
            altText: this.altText || ''
        };
    },

    /**
     * Sets the text to display in this menu item
     * @param {String} text The text to display
     */
    setText : function(text){
        this.text = text||'&#160;';
        if(this.rendered){
            this.textEl.update(this.text);
            this.parentMenu.layout.doAutoSize();
        }
    },

    /**
     * Sets the CSS class to apply to the item's icon element
     * @param {String} cls The CSS class to apply
     */
    setIconClass : function(cls){
        var oldCls = this.iconCls;
        this.iconCls = cls;
        if(this.rendered){
            this.iconEl.replaceClass(oldCls, this.iconCls);
        }
    },

    //private
    beforeDestroy: function(){
        if (this.menu){
            delete this.menu.ownerCt;
            this.menu.destroy();
        }
        Ext.menu.Item.superclass.beforeDestroy.call(this);
    },

    // private
    handleClick : function(e){
        if(!this.href){ // if no link defined, stop the event automatically
            e.stopEvent();
        }
        Ext.menu.Item.superclass.handleClick.apply(this, arguments);
    },

    // private
    activate : function(autoExpand){
        if(Ext.menu.Item.superclass.activate.apply(this, arguments)){
            this.focus();
            if(autoExpand){
                this.expandMenu();
            }
        }
        return true;
    },

    // private
    shouldDeactivate : function(e){
        if(Ext.menu.Item.superclass.shouldDeactivate.call(this, e)){
            if(this.menu && this.menu.isVisible()){
                return !this.menu.getEl().getRegion().contains(e.getPoint());
            }
            return true;
        }
        return false;
    },

    // private
    deactivate : function(){
        Ext.menu.Item.superclass.deactivate.apply(this, arguments);
        this.hideMenu();
    },

    // private
    expandMenu : function(autoActivate){
        if(!this.disabled && this.menu){
            clearTimeout(this.hideTimer);
            delete this.hideTimer;
            if(!this.menu.isVisible() && !this.showTimer){
                this.showTimer = this.deferExpand.defer(this.showDelay, this, [autoActivate]);
            }else if (this.menu.isVisible() && autoActivate){
                this.menu.tryActivate(0, 1);
            }
        }
    },

    // private
    deferExpand : function(autoActivate){
        delete this.showTimer;
        this.menu.show(this.container, this.parentMenu.subMenuAlign || 'tl-tr?', this.parentMenu);
        if(autoActivate){
            this.menu.tryActivate(0, 1);
        }
    },

    // private
    hideMenu : function(){
        clearTimeout(this.showTimer);
        delete this.showTimer;
        if(!this.hideTimer && this.menu && this.menu.isVisible()){
            this.hideTimer = this.deferHide.defer(this.hideDelay, this);
        }
    },

    // private
    deferHide : function(){
        delete this.hideTimer;
        if(this.menu.over){
            this.parentMenu.setActiveItem(this, false);
        }else{
            this.menu.hide();
        }
    }
});
Ext.reg('menuitem', Ext.menu.Item);