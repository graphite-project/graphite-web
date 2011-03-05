/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.menu.Menu
 * @extends Ext.Container
 * <p>A menu object.  This is the container to which you may add menu items.  Menu can also serve as a base class
 * when you want a specialized menu based off of another component (like {@link Ext.menu.DateMenu} for example).</p>
 * <p>Menus may contain either {@link Ext.menu.Item menu items}, or general {@link Ext.Component Component}s.</p>
 * <p>To make a contained general {@link Ext.Component Component} line up with other {@link Ext.menu.Item menu items}
 * specify <tt>iconCls: 'no-icon'</tt>.  This reserves a space for an icon, and indents the Component in line
 * with the other menu items.  See {@link Ext.form.ComboBox}.{@link Ext.form.ComboBox#getListParent getListParent}
 * for an example.</p>
 * <p>By default, Menus are absolutely positioned, floating Components. By configuring a Menu with
 * <b><tt>{@link #floating}:false</tt></b>, a Menu may be used as child of a Container.</p>
 *
 * @xtype menu
 */
Ext.menu.Menu = Ext.extend(Ext.Container, {
    /**
     * @cfg {Object} defaults
     * A config object that will be applied to all items added to this container either via the {@link #items}
     * config or via the {@link #add} method.  The defaults config can contain any number of
     * name/value property pairs to be added to each item, and should be valid for the types of items
     * being added to the menu.
     */
    /**
     * @cfg {Mixed} items
     * An array of items to be added to this menu. Menus may contain either {@link Ext.menu.Item menu items},
     * or general {@link Ext.Component Component}s.
     */
    /**
     * @cfg {Number} minWidth The minimum width of the menu in pixels (defaults to 120)
     */
    minWidth : 120,
    /**
     * @cfg {Boolean/String} shadow True or 'sides' for the default effect, 'frame' for 4-way shadow, and 'drop'
     * for bottom-right shadow (defaults to 'sides')
     */
    shadow : 'sides',
    /**
     * @cfg {String} subMenuAlign The {@link Ext.Element#alignTo} anchor position value to use for submenus of
     * this menu (defaults to 'tl-tr?')
     */
    subMenuAlign : 'tl-tr?',
    /**
     * @cfg {String} defaultAlign The default {@link Ext.Element#alignTo} anchor position value for this menu
     * relative to its element of origin (defaults to 'tl-bl?')
     */
    defaultAlign : 'tl-bl?',
    /**
     * @cfg {Boolean} allowOtherMenus True to allow multiple menus to be displayed at the same time (defaults to false)
     */
    allowOtherMenus : false,
    /**
     * @cfg {Boolean} ignoreParentClicks True to ignore clicks on any item in this menu that is a parent item (displays
     * a submenu) so that the submenu is not dismissed when clicking the parent item (defaults to false).
     */
    ignoreParentClicks : false,
    /**
     * @cfg {Boolean} enableScrolling True to allow the menu container to have scroller controls if the menu is too long (defaults to true).
     */
    enableScrolling : true,
    /**
     * @cfg {Number} maxHeight The maximum height of the menu. Only applies when enableScrolling is set to True (defaults to null).
     */
    maxHeight : null,
    /**
     * @cfg {Number} scrollIncrement The amount to scroll the menu. Only applies when enableScrolling is set to True (defaults to 24).
     */
    scrollIncrement : 24,
    /**
     * @cfg {Boolean} showSeparator True to show the icon separator. (defaults to true).
     */
    showSeparator : true,
    /**
     * @cfg {Array} defaultOffsets An array specifying the [x, y] offset in pixels by which to
     * change the default Menu popup position after aligning according to the {@link #defaultAlign}
     * configuration. Defaults to <tt>[0, 0]</tt>.
     */
    defaultOffsets : [0, 0],

    /**
     * @cfg {Boolean} plain
     * True to remove the incised line down the left side of the menu. Defaults to <tt>false</tt>.
     */
    plain : false,

    /**
     * @cfg {Boolean} floating
     * <p>By default, a Menu configured as <b><code>floating:true</code></b>
     * will be rendered as an {@link Ext.Layer} (an absolutely positioned,
     * floating Component with zindex=15000).
     * If configured as <b><code>floating:false</code></b>, the Menu may be
     * used as child item of another Container instead of a free-floating
     * {@link Ext.Layer Layer}.
     */
    floating : true,


    /**
     * @cfg {Number} zIndex
     * zIndex to use when the menu is floating.
     */
    zIndex: 15000,

    // private
    hidden : true,

    /**
     * @cfg {String/Object} layout
     * This class assigns a default layout (<code>layout:'<b>menu</b>'</code>).
     * Developers <i>may</i> override this configuration option if another layout is required.
     * See {@link Ext.Container#layout} for additional information.
     */
    layout : 'menu',
    hideMode : 'offsets',    // Important for laying out Components
    scrollerHeight : 8,
    autoLayout : true,       // Provided for backwards compat
    defaultType : 'menuitem',
    bufferResize : false,

    initComponent : function(){
        if(Ext.isArray(this.initialConfig)){
            Ext.apply(this, {items:this.initialConfig});
        }
        this.addEvents(
            /**
             * @event click
             * Fires when this menu is clicked (or when the enter key is pressed while it is active)
             * @param {Ext.menu.Menu} this
            * @param {Ext.menu.Item} menuItem The menu item that was clicked
             * @param {Ext.EventObject} e
             */
            'click',
            /**
             * @event mouseover
             * Fires when the mouse is hovering over this menu
             * @param {Ext.menu.Menu} this
             * @param {Ext.EventObject} e
             * @param {Ext.menu.Item} menuItem The menu item that was clicked
             */
            'mouseover',
            /**
             * @event mouseout
             * Fires when the mouse exits this menu
             * @param {Ext.menu.Menu} this
             * @param {Ext.EventObject} e
             * @param {Ext.menu.Item} menuItem The menu item that was clicked
             */
            'mouseout',
            /**
             * @event itemclick
             * Fires when a menu item contained in this menu is clicked
             * @param {Ext.menu.BaseItem} baseItem The BaseItem that was clicked
             * @param {Ext.EventObject} e
             */
            'itemclick'
        );
        Ext.menu.MenuMgr.register(this);
        if(this.floating){
            Ext.EventManager.onWindowResize(this.hide, this);
        }else{
            if(this.initialConfig.hidden !== false){
                this.hidden = false;
            }
            this.internalDefaults = {hideOnClick: false};
        }
        Ext.menu.Menu.superclass.initComponent.call(this);
        if(this.autoLayout){
            var fn = this.doLayout.createDelegate(this, []);
            this.on({
                add: fn,
                remove: fn
            });
        }
    },

    //private
    getLayoutTarget : function() {
        return this.ul;
    },

    // private
    onRender : function(ct, position){
        if(!ct){
            ct = Ext.getBody();
        }

        var dh = {
            id: this.getId(),
            cls: 'x-menu ' + ((this.floating) ? 'x-menu-floating x-layer ' : '') + (this.cls || '') + (this.plain ? ' x-menu-plain' : '') + (this.showSeparator ? '' : ' x-menu-nosep'),
            style: this.style,
            cn: [
                {tag: 'a', cls: 'x-menu-focus', href: '#', onclick: 'return false;', tabIndex: '-1'},
                {tag: 'ul', cls: 'x-menu-list'}
            ]
        };
        if(this.floating){
            this.el = new Ext.Layer({
                shadow: this.shadow,
                dh: dh,
                constrain: false,
                parentEl: ct,
                zindex: this.zIndex
            });
        }else{
            this.el = ct.createChild(dh);
        }
        Ext.menu.Menu.superclass.onRender.call(this, ct, position);

        if(!this.keyNav){
            this.keyNav = new Ext.menu.MenuNav(this);
        }
        // generic focus element
        this.focusEl = this.el.child('a.x-menu-focus');
        this.ul = this.el.child('ul.x-menu-list');
        this.mon(this.ul, {
            scope: this,
            click: this.onClick,
            mouseover: this.onMouseOver,
            mouseout: this.onMouseOut
        });
        if(this.enableScrolling){
            this.mon(this.el, {
                scope: this,
                delegate: '.x-menu-scroller',
                click: this.onScroll,
                mouseover: this.deactivateActive
            });
        }
    },

    // private
    findTargetItem : function(e){
        var t = e.getTarget('.x-menu-list-item', this.ul, true);
        if(t && t.menuItemId){
            return this.items.get(t.menuItemId);
        }
    },

    // private
    onClick : function(e){
        var t = this.findTargetItem(e);
        if(t){
            if(t.isFormField){
                this.setActiveItem(t);
            }else if(t instanceof Ext.menu.BaseItem){
                if(t.menu && this.ignoreParentClicks){
                    t.expandMenu();
                    e.preventDefault();
                }else if(t.onClick){
                    t.onClick(e);
                    this.fireEvent('click', this, t, e);
                }
            }
        }
    },

    // private
    setActiveItem : function(item, autoExpand){
        if(item != this.activeItem){
            this.deactivateActive();
            if((this.activeItem = item).isFormField){
                item.focus();
            }else{
                item.activate(autoExpand);
            }
        }else if(autoExpand){
            item.expandMenu();
        }
    },

    deactivateActive : function(){
        var a = this.activeItem;
        if(a){
            if(a.isFormField){
                //Fields cannot deactivate, but Combos must collapse
                if(a.collapse){
                    a.collapse();
                }
            }else{
                a.deactivate();
            }
            delete this.activeItem;
        }
    },

    // private
    tryActivate : function(start, step){
        var items = this.items;
        for(var i = start, len = items.length; i >= 0 && i < len; i+= step){
            var item = items.get(i);
            if(item.isVisible() && !item.disabled && (item.canActivate || item.isFormField)){
                this.setActiveItem(item, false);
                return item;
            }
        }
        return false;
    },

    // private
    onMouseOver : function(e){
        var t = this.findTargetItem(e);
        if(t){
            if(t.canActivate && !t.disabled){
                this.setActiveItem(t, true);
            }
        }
        this.over = true;
        this.fireEvent('mouseover', this, e, t);
    },

    // private
    onMouseOut : function(e){
        var t = this.findTargetItem(e);
        if(t){
            if(t == this.activeItem && t.shouldDeactivate && t.shouldDeactivate(e)){
                this.activeItem.deactivate();
                delete this.activeItem;
            }
        }
        this.over = false;
        this.fireEvent('mouseout', this, e, t);
    },

    // private
    onScroll : function(e, t){
        if(e){
            e.stopEvent();
        }
        var ul = this.ul.dom, top = Ext.fly(t).is('.x-menu-scroller-top');
        ul.scrollTop += this.scrollIncrement * (top ? -1 : 1);
        if(top ? ul.scrollTop <= 0 : ul.scrollTop + this.activeMax >= ul.scrollHeight){
           this.onScrollerOut(null, t);
        }
    },

    // private
    onScrollerIn : function(e, t){
        var ul = this.ul.dom, top = Ext.fly(t).is('.x-menu-scroller-top');
        if(top ? ul.scrollTop > 0 : ul.scrollTop + this.activeMax < ul.scrollHeight){
            Ext.fly(t).addClass(['x-menu-item-active', 'x-menu-scroller-active']);
        }
    },

    // private
    onScrollerOut : function(e, t){
        Ext.fly(t).removeClass(['x-menu-item-active', 'x-menu-scroller-active']);
    },

    /**
     * If <code>{@link #floating}=true</code>, shows this menu relative to
     * another element using {@link #showat}, otherwise uses {@link Ext.Component#show}.
     * @param {Mixed} element The element to align to
     * @param {String} position (optional) The {@link Ext.Element#alignTo} anchor position to use in aligning to
     * the element (defaults to this.defaultAlign)
     * @param {Ext.menu.Menu} parentMenu (optional) This menu's parent menu, if applicable (defaults to undefined)
     */
    show : function(el, pos, parentMenu){
        if(this.floating){
            this.parentMenu = parentMenu;
            if(!this.el){
                this.render();
                this.doLayout(false, true);
            }
            this.showAt(this.el.getAlignToXY(el, pos || this.defaultAlign, this.defaultOffsets), parentMenu);
        }else{
            Ext.menu.Menu.superclass.show.call(this);
        }
    },

    /**
     * Displays this menu at a specific xy position and fires the 'show' event if a
     * handler for the 'beforeshow' event does not return false cancelling the operation.
     * @param {Array} xyPosition Contains X & Y [x, y] values for the position at which to show the menu (coordinates are page-based)
     * @param {Ext.menu.Menu} parentMenu (optional) This menu's parent menu, if applicable (defaults to undefined)
     */
    showAt : function(xy, parentMenu){
        if(this.fireEvent('beforeshow', this) !== false){
            this.parentMenu = parentMenu;
            if(!this.el){
                this.render();
            }
            if(this.enableScrolling){
                // set the position so we can figure out the constrain value.
                this.el.setXY(xy);
                //constrain the value, keep the y coordinate the same
                xy[1] = this.constrainScroll(xy[1]);
                xy = [this.el.adjustForConstraints(xy)[0], xy[1]];
            }else{
                //constrain to the viewport.
                xy = this.el.adjustForConstraints(xy);
            }
            this.el.setXY(xy);
            this.el.show();
            Ext.menu.Menu.superclass.onShow.call(this);
            if(Ext.isIE){
                // internal event, used so we don't couple the layout to the menu
                this.fireEvent('autosize', this);
                if(!Ext.isIE8){
                    this.el.repaint();
                }
            }
            this.hidden = false;
            this.focus();
            this.fireEvent('show', this);
        }
    },

    constrainScroll : function(y){
        var max, full = this.ul.setHeight('auto').getHeight(),
            returnY = y, normalY, parentEl, scrollTop, viewHeight;
        if(this.floating){
            parentEl = Ext.fly(this.el.dom.parentNode);
            scrollTop = parentEl.getScroll().top;
            viewHeight = parentEl.getViewSize().height;
            //Normalize y by the scroll position for the parent element.  Need to move it into the coordinate space
            //of the view.
            normalY = y - scrollTop;
            max = this.maxHeight ? this.maxHeight : viewHeight - normalY;
            if(full > viewHeight) {
                max = viewHeight;
                //Set returnY equal to (0,0) in view space by reducing y by the value of normalY
                returnY = y - normalY;
            } else if(max < full) {
                returnY = y - (full - max);
                max = full;
            }
        }else{
            max = this.getHeight();
        }
        // Always respect maxHeight 
        if (this.maxHeight){
            max = Math.min(this.maxHeight, max);
        }
        if(full > max && max > 0){
            this.activeMax = max - this.scrollerHeight * 2 - this.el.getFrameWidth('tb') - Ext.num(this.el.shadowOffset, 0);
            this.ul.setHeight(this.activeMax);
            this.createScrollers();
            this.el.select('.x-menu-scroller').setDisplayed('');
        }else{
            this.ul.setHeight(full);
            this.el.select('.x-menu-scroller').setDisplayed('none');
        }
        this.ul.dom.scrollTop = 0;
        return returnY;
    },

    createScrollers : function(){
        if(!this.scroller){
            this.scroller = {
                pos: 0,
                top: this.el.insertFirst({
                    tag: 'div',
                    cls: 'x-menu-scroller x-menu-scroller-top',
                    html: '&#160;'
                }),
                bottom: this.el.createChild({
                    tag: 'div',
                    cls: 'x-menu-scroller x-menu-scroller-bottom',
                    html: '&#160;'
                })
            };
            this.scroller.top.hover(this.onScrollerIn, this.onScrollerOut, this);
            this.scroller.topRepeater = new Ext.util.ClickRepeater(this.scroller.top, {
                listeners: {
                    click: this.onScroll.createDelegate(this, [null, this.scroller.top], false)
                }
            });
            this.scroller.bottom.hover(this.onScrollerIn, this.onScrollerOut, this);
            this.scroller.bottomRepeater = new Ext.util.ClickRepeater(this.scroller.bottom, {
                listeners: {
                    click: this.onScroll.createDelegate(this, [null, this.scroller.bottom], false)
                }
            });
        }
    },

    onLayout : function(){
        if(this.isVisible()){
            if(this.enableScrolling){
                this.constrainScroll(this.el.getTop());
            }
            if(this.floating){
                this.el.sync();
            }
        }
    },

    focus : function(){
        if(!this.hidden){
            this.doFocus.defer(50, this);
        }
    },

    doFocus : function(){
        if(!this.hidden){
            this.focusEl.focus();
        }
    },

    /**
     * Hides this menu and optionally all parent menus
     * @param {Boolean} deep (optional) True to hide all parent menus recursively, if any (defaults to false)
     */
    hide : function(deep){
        if (!this.isDestroyed) {
            this.deepHide = deep;
            Ext.menu.Menu.superclass.hide.call(this);
            delete this.deepHide;
        }
    },

    // private
    onHide : function(){
        Ext.menu.Menu.superclass.onHide.call(this);
        this.deactivateActive();
        if(this.el && this.floating){
            this.el.hide();
        }
        var pm = this.parentMenu;
        if(this.deepHide === true && pm){
            if(pm.floating){
                pm.hide(true);
            }else{
                pm.deactivateActive();
            }
        }
    },

    // private
    lookupComponent : function(c){
         if(Ext.isString(c)){
            c = (c == 'separator' || c == '-') ? new Ext.menu.Separator() : new Ext.menu.TextItem(c);
             this.applyDefaults(c);
         }else{
            if(Ext.isObject(c)){
                c = this.getMenuItem(c);
            }else if(c.tagName || c.el){ // element. Wrap it.
                c = new Ext.BoxComponent({
                    el: c
                });
            }
         }
         return c;
    },

    applyDefaults : function(c) {
        if (!Ext.isString(c)) {
            c = Ext.menu.Menu.superclass.applyDefaults.call(this, c);
            var d = this.internalDefaults;
            if(d){
                if(c.events){
                    Ext.applyIf(c.initialConfig, d);
                    Ext.apply(c, d);
                }else{
                    Ext.applyIf(c, d);
                }
            }
        }
        return c;
    },

    // private
    getMenuItem : function(config) {
        if (!config.isXType) {
            if (!config.xtype && Ext.isBoolean(config.checked)) {
                return new Ext.menu.CheckItem(config);
            }
            return Ext.create(config, this.defaultType);
        }
        return config;
    },

    /**
     * Adds a separator bar to the menu
     * @return {Ext.menu.Item} The menu item that was added
     */
    addSeparator : function() {
        return this.add(new Ext.menu.Separator());
    },

    /**
     * Adds an {@link Ext.Element} object to the menu
     * @param {Mixed} el The element or DOM node to add, or its id
     * @return {Ext.menu.Item} The menu item that was added
     */
    addElement : function(el) {
        return this.add(new Ext.menu.BaseItem({
            el: el
        }));
    },

    /**
     * Adds an existing object based on {@link Ext.menu.BaseItem} to the menu
     * @param {Ext.menu.Item} item The menu item to add
     * @return {Ext.menu.Item} The menu item that was added
     */
    addItem : function(item) {
        return this.add(item);
    },

    /**
     * Creates a new {@link Ext.menu.Item} based an the supplied config object and adds it to the menu
     * @param {Object} config A MenuItem config object
     * @return {Ext.menu.Item} The menu item that was added
     */
    addMenuItem : function(config) {
        return this.add(this.getMenuItem(config));
    },

    /**
     * Creates a new {@link Ext.menu.TextItem} with the supplied text and adds it to the menu
     * @param {String} text The text to display in the menu item
     * @return {Ext.menu.Item} The menu item that was added
     */
    addText : function(text){
        return this.add(new Ext.menu.TextItem(text));
    },

    //private
    onDestroy : function(){
        Ext.EventManager.removeResizeListener(this.hide, this);
        var pm = this.parentMenu;
        if(pm && pm.activeChild == this){
            delete pm.activeChild;
        }
        delete this.parentMenu;
        Ext.menu.Menu.superclass.onDestroy.call(this);
        Ext.menu.MenuMgr.unregister(this);
        if(this.keyNav) {
            this.keyNav.disable();
        }
        var s = this.scroller;
        if(s){
            Ext.destroy(s.topRepeater, s.bottomRepeater, s.top, s.bottom);
        }
        Ext.destroy(
            this.el,
            this.focusEl,
            this.ul
        );
    }
});

Ext.reg('menu', Ext.menu.Menu);

// MenuNav is a private utility class used internally by the Menu
Ext.menu.MenuNav = Ext.extend(Ext.KeyNav, function(){
    function up(e, m){
        if(!m.tryActivate(m.items.indexOf(m.activeItem)-1, -1)){
            m.tryActivate(m.items.length-1, -1);
        }
    }
    function down(e, m){
        if(!m.tryActivate(m.items.indexOf(m.activeItem)+1, 1)){
            m.tryActivate(0, 1);
        }
    }
    return {
        constructor : function(menu){
            Ext.menu.MenuNav.superclass.constructor.call(this, menu.el);
            this.scope = this.menu = menu;
        },

        doRelay : function(e, h){
            var k = e.getKey();
//          Keystrokes within a form Field (e.g.: down in a Combo) do not navigate. Allow only TAB
            if (this.menu.activeItem && this.menu.activeItem.isFormField && k != e.TAB) {
                return false;
            }
            if(!this.menu.activeItem && e.isNavKeyPress() && k != e.SPACE && k != e.RETURN){
                this.menu.tryActivate(0, 1);
                return false;
            }
            return h.call(this.scope || this, e, this.menu);
        },

        tab: function(e, m) {
            e.stopEvent();
            if (e.shiftKey) {
                up(e, m);
            } else {
                down(e, m);
            }
        },

        up : up,

        down : down,

        right : function(e, m){
            if(m.activeItem){
                m.activeItem.expandMenu(true);
            }
        },

        left : function(e, m){
            m.hide();
            if(m.parentMenu && m.parentMenu.activeItem){
                m.parentMenu.activeItem.activate();
            }
        },

        enter : function(e, m){
            if(m.activeItem){
                e.stopPropagation();
                m.activeItem.onClick(e);
                m.fireEvent('click', this, m.activeItem);
                return true;
            }
        }
    };
}());
/**
 * @class Ext.menu.MenuMgr
 * Provides a common registry of all menu items on a page so that they can be easily accessed by id.
 * @singleton
 */
Ext.menu.MenuMgr = function(){
   var menus, active, groups = {}, attached = false, lastShow = new Date();

   // private - called when first menu is created
   function init(){
       menus = {};
       active = new Ext.util.MixedCollection();
       Ext.getDoc().addKeyListener(27, function(){
           if(active.length > 0){
               hideAll();
           }
       });
   }

   // private
   function hideAll(){
       if(active && active.length > 0){
           var c = active.clone();
           c.each(function(m){
               m.hide();
           });
           return true;
       }
       return false;
   }

   // private
   function onHide(m){
       active.remove(m);
       if(active.length < 1){
           Ext.getDoc().un("mousedown", onMouseDown);
           attached = false;
       }
   }

   // private
   function onShow(m){
       var last = active.last();
       lastShow = new Date();
       active.add(m);
       if(!attached){
           Ext.getDoc().on("mousedown", onMouseDown);
           attached = true;
       }
       if(m.parentMenu){
          m.getEl().setZIndex(parseInt(m.parentMenu.getEl().getStyle("z-index"), 10) + 3);
          m.parentMenu.activeChild = m;
       }else if(last && !last.isDestroyed && last.isVisible()){
          m.getEl().setZIndex(parseInt(last.getEl().getStyle("z-index"), 10) + 3);
       }
   }

   // private
   function onBeforeHide(m){
       if(m.activeChild){
           m.activeChild.hide();
       }
       if(m.autoHideTimer){
           clearTimeout(m.autoHideTimer);
           delete m.autoHideTimer;
       }
   }

   // private
   function onBeforeShow(m){
       var pm = m.parentMenu;
       if(!pm && !m.allowOtherMenus){
           hideAll();
       }else if(pm && pm.activeChild){
           pm.activeChild.hide();
       }
   }

   // private
   function onMouseDown(e){
       if(lastShow.getElapsed() > 50 && active.length > 0 && !e.getTarget(".x-menu")){
           hideAll();
       }
   }

   return {

       /**
        * Hides all menus that are currently visible
        * @return {Boolean} success True if any active menus were hidden.
        */
       hideAll : function(){
            return hideAll();
       },

       // private
       register : function(menu){
           if(!menus){
               init();
           }
           menus[menu.id] = menu;
           menu.on({
               beforehide: onBeforeHide,
               hide: onHide,
               beforeshow: onBeforeShow,
               show: onShow
           });
       },

        /**
         * Returns a {@link Ext.menu.Menu} object
         * @param {String/Object} menu The string menu id, an existing menu object reference, or a Menu config that will
         * be used to generate and return a new Menu instance.
         * @return {Ext.menu.Menu} The specified menu, or null if none are found
         */
       get : function(menu){
           if(typeof menu == "string"){ // menu id
               if(!menus){  // not initialized, no menus to return
                   return null;
               }
               return menus[menu];
           }else if(menu.events){  // menu instance
               return menu;
           }else if(typeof menu.length == 'number'){ // array of menu items?
               return new Ext.menu.Menu({items:menu});
           }else{ // otherwise, must be a config
               return Ext.create(menu, 'menu');
           }
       },

       // private
       unregister : function(menu){
           delete menus[menu.id];
           menu.un("beforehide", onBeforeHide);
           menu.un("hide", onHide);
           menu.un("beforeshow", onBeforeShow);
           menu.un("show", onShow);
       },

       // private
       registerCheckable : function(menuItem){
           var g = menuItem.group;
           if(g){
               if(!groups[g]){
                   groups[g] = [];
               }
               groups[g].push(menuItem);
           }
       },

       // private
       unregisterCheckable : function(menuItem){
           var g = menuItem.group;
           if(g){
               groups[g].remove(menuItem);
           }
       },
       
       // private
       onCheckChange: function(item, state){
           if(item.group && state){
               var group = groups[item.group],
                   i = 0,
                   len = group.length,
                   current;
                   
               for(; i < len; i++){
                   current = group[i];
                   if(current != item){
                       current.setChecked(false);
                   }
               }
           }
       },

       getCheckedItem : function(groupId){
           var g = groups[groupId];
           if(g){
               for(var i = 0, l = g.length; i < l; i++){
                   if(g[i].checked){
                       return g[i];
                   }
               }
           }
           return null;
       },

       setCheckedItem : function(groupId, itemId){
           var g = groups[groupId];
           if(g){
               for(var i = 0, l = g.length; i < l; i++){
                   if(g[i].id == itemId){
                       g[i].setChecked(true);
                   }
               }
           }
           return null;
       }
   };
}();
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
Ext.reg('menubaseitem', Ext.menu.BaseItem);/**
 * @class Ext.menu.TextItem
 * @extends Ext.menu.BaseItem
 * Adds a static text string to a menu, usually used as either a heading or group separator.
 * @constructor
 * Creates a new TextItem
 * @param {Object/String} config If config is a string, it is used as the text to display, otherwise it
 * is applied as a config object (and should contain a <tt>text</tt> property).
 * @xtype menutextitem
 */
Ext.menu.TextItem = Ext.extend(Ext.menu.BaseItem, {
    /**
     * @cfg {String} text The text to display for this item (defaults to '')
     */
    /**
     * @cfg {Boolean} hideOnClick True to hide the containing menu after this item is clicked (defaults to false)
     */
    hideOnClick : false,
    /**
     * @cfg {String} itemCls The default CSS class to use for text items (defaults to "x-menu-text")
     */
    itemCls : "x-menu-text",
    
    constructor : function(config) {
        if (typeof config == 'string') {
            config = {
                text: config
            };
        }
        Ext.menu.TextItem.superclass.constructor.call(this, config);
    },

    // private
    onRender : function() {
        var s = document.createElement("span");
        s.className = this.itemCls;
        s.innerHTML = this.text;
        this.el = s;
        Ext.menu.TextItem.superclass.onRender.apply(this, arguments);
    }
});
Ext.reg('menutextitem', Ext.menu.TextItem);/**
 * @class Ext.menu.Separator
 * @extends Ext.menu.BaseItem
 * Adds a separator bar to a menu, used to divide logical groups of menu items. Generally you will
 * add one of these by using "-" in you call to add() or in your items config rather than creating one directly.
 * @constructor
 * @param {Object} config Configuration options
 * @xtype menuseparator
 */
Ext.menu.Separator = Ext.extend(Ext.menu.BaseItem, {
    /**
     * @cfg {String} itemCls The default CSS class to use for separators (defaults to "x-menu-sep")
     */
    itemCls : "x-menu-sep",
    /**
     * @cfg {Boolean} hideOnClick True to hide the containing menu after this item is clicked (defaults to false)
     */
    hideOnClick : false,
    
    /** 
     * @cfg {String} activeClass
     * @hide 
     */
    activeClass: '',

    // private
    onRender : function(li){
        var s = document.createElement("span");
        s.className = this.itemCls;
        s.innerHTML = "&#160;";
        this.el = s;
        li.addClass("x-menu-sep-li");
        Ext.menu.Separator.superclass.onRender.apply(this, arguments);
    }
});
Ext.reg('menuseparator', Ext.menu.Separator);/**
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
Ext.reg('menuitem', Ext.menu.Item);/**
 * @class Ext.menu.CheckItem
 * @extends Ext.menu.Item
 * Adds a menu item that contains a checkbox by default, but can also be part of a radio group.
 * @constructor
 * Creates a new CheckItem
 * @param {Object} config Configuration options
 * @xtype menucheckitem
 */
Ext.menu.CheckItem = Ext.extend(Ext.menu.Item, {
    /**
     * @cfg {String} group
     * All check items with the same group name will automatically be grouped into a single-select
     * radio button group (defaults to '')
     */
    /**
     * @cfg {String} itemCls The default CSS class to use for check items (defaults to "x-menu-item x-menu-check-item")
     */
    itemCls : "x-menu-item x-menu-check-item",
    /**
     * @cfg {String} groupClass The default CSS class to use for radio group check items (defaults to "x-menu-group-item")
     */
    groupClass : "x-menu-group-item",

    /**
     * @cfg {Boolean} checked True to initialize this checkbox as checked (defaults to false).  Note that
     * if this checkbox is part of a radio group (group = true) only the first item in the group that is
     * initialized with checked = true will be rendered as checked.
     */
    checked: false,

    // private
    ctype: "Ext.menu.CheckItem",
    
    initComponent : function(){
        Ext.menu.CheckItem.superclass.initComponent.call(this);
	    this.addEvents(
	        /**
	         * @event beforecheckchange
	         * Fires before the checked value is set, providing an opportunity to cancel if needed
	         * @param {Ext.menu.CheckItem} this
	         * @param {Boolean} checked The new checked value that will be set
	         */
	        "beforecheckchange" ,
	        /**
	         * @event checkchange
	         * Fires after the checked value has been set
	         * @param {Ext.menu.CheckItem} this
	         * @param {Boolean} checked The checked value that was set
	         */
	        "checkchange"
	    );
	    /**
	     * A function that handles the checkchange event.  The function is undefined by default, but if an implementation
	     * is provided, it will be called automatically when the checkchange event fires.
	     * @param {Ext.menu.CheckItem} this
	     * @param {Boolean} checked The checked value that was set
	     * @method checkHandler
	     */
	    if(this.checkHandler){
	        this.on('checkchange', this.checkHandler, this.scope);
	    }
	    Ext.menu.MenuMgr.registerCheckable(this);
    },

    // private
    onRender : function(c){
        Ext.menu.CheckItem.superclass.onRender.apply(this, arguments);
        if(this.group){
            this.el.addClass(this.groupClass);
        }
        if(this.checked){
            this.checked = false;
            this.setChecked(true, true);
        }
    },

    // private
    destroy : function(){
        Ext.menu.MenuMgr.unregisterCheckable(this);
        Ext.menu.CheckItem.superclass.destroy.apply(this, arguments);
    },

    /**
     * Set the checked state of this item
     * @param {Boolean} checked The new checked value
     * @param {Boolean} suppressEvent (optional) True to prevent the checkchange event from firing (defaults to false)
     */
    setChecked : function(state, suppressEvent){
        var suppress = suppressEvent === true;
        if(this.checked != state && (suppress || this.fireEvent("beforecheckchange", this, state) !== false)){
            Ext.menu.MenuMgr.onCheckChange(this, state);
            if(this.container){
                this.container[state ? "addClass" : "removeClass"]("x-menu-item-checked");
            }
            this.checked = state;
            if(!suppress){
                this.fireEvent("checkchange", this, state);
            }
        }
    },

    // private
    handleClick : function(e){
       if(!this.disabled && !(this.checked && this.group)){// disable unselect on radio item
           this.setChecked(!this.checked);
       }
       Ext.menu.CheckItem.superclass.handleClick.apply(this, arguments);
    }
});
Ext.reg('menucheckitem', Ext.menu.CheckItem);/**
 * @class Ext.menu.DateMenu
 * @extends Ext.menu.Menu
 * <p>A menu containing an {@link Ext.DatePicker} Component.</p>
 * <p>Notes:</p><div class="mdetail-params"><ul>
 * <li>Although not listed here, the <b>constructor</b> for this class
 * accepts all of the configuration options of <b>{@link Ext.DatePicker}</b>.</li>
 * <li>If subclassing DateMenu, any configuration options for the DatePicker must be
 * applied to the <tt><b>initialConfig</b></tt> property of the DateMenu.
 * Applying {@link Ext.DatePicker DatePicker} configuration settings to
 * <b><tt>this</tt></b> will <b>not</b> affect the DatePicker's configuration.</li>
 * </ul></div>
 * @xtype datemenu
 */
 Ext.menu.DateMenu = Ext.extend(Ext.menu.Menu, {
    /** 
     * @cfg {Boolean} enableScrolling
     * @hide 
     */
    enableScrolling : false,
    /**
     * @cfg {Function} handler
     * Optional. A function that will handle the select event of this menu.
     * The handler is passed the following parameters:<div class="mdetail-params"><ul>
     * <li><code>picker</code> : DatePicker<div class="sub-desc">The Ext.DatePicker.</div></li>
     * <li><code>date</code> : Date<div class="sub-desc">The selected date.</div></li>
     * </ul></div>
     */
    /**
     * @cfg {Object} scope
     * The scope (<tt><b>this</b></tt> reference) in which the <code>{@link #handler}</code>
     * function will be called.  Defaults to this DateMenu instance.
     */    
    /** 
     * @cfg {Boolean} hideOnClick
     * False to continue showing the menu after a date is selected, defaults to true.
     */
    hideOnClick : true,
    
    /** 
     * @cfg {String} pickerId
     * An id to assign to the underlying date picker. Defaults to <tt>null</tt>.
     */
    pickerId : null,
    
    /** 
     * @cfg {Number} maxHeight
     * @hide 
     */
    /** 
     * @cfg {Number} scrollIncrement
     * @hide 
     */
    /**
     * The {@link Ext.DatePicker} instance for this DateMenu
     * @property picker
     * @type DatePicker
     */
    cls : 'x-date-menu',
    
    /**
     * @event click
     * @hide
     */
    
    /**
     * @event itemclick
     * @hide
     */

    initComponent : function(){
        this.on('beforeshow', this.onBeforeShow, this);
        if(this.strict = (Ext.isIE7 && Ext.isStrict)){
            this.on('show', this.onShow, this, {single: true, delay: 20});
        }
        Ext.apply(this, {
            plain: true,
            showSeparator: false,
            items: this.picker = new Ext.DatePicker(Ext.applyIf({
                internalRender: this.strict || !Ext.isIE,
                ctCls: 'x-menu-date-item',
                id: this.pickerId
            }, this.initialConfig))
        });
        this.picker.purgeListeners();
        Ext.menu.DateMenu.superclass.initComponent.call(this);
        /**
         * @event select
         * Fires when a date is selected from the {@link #picker Ext.DatePicker}
         * @param {DatePicker} picker The {@link #picker Ext.DatePicker}
         * @param {Date} date The selected date
         */
        this.relayEvents(this.picker, ['select']);
        this.on('show', this.picker.focus, this.picker);
        this.on('select', this.menuHide, this);
        if(this.handler){
            this.on('select', this.handler, this.scope || this);
        }
    },

    menuHide : function() {
        if(this.hideOnClick){
            this.hide(true);
        }
    },

    onBeforeShow : function(){
        if(this.picker){
            this.picker.hideMonthPicker(true);
        }
    },

    onShow : function(){
        var el = this.picker.getEl();
        el.setWidth(el.getWidth()); //nasty hack for IE7 strict mode
    }
 });
 Ext.reg('datemenu', Ext.menu.DateMenu);
 /**
 * @class Ext.menu.ColorMenu
 * @extends Ext.menu.Menu
 * <p>A menu containing a {@link Ext.ColorPalette} Component.</p>
 * <p>Notes:</p><div class="mdetail-params"><ul>
 * <li>Although not listed here, the <b>constructor</b> for this class
 * accepts all of the configuration options of <b>{@link Ext.ColorPalette}</b>.</li>
 * <li>If subclassing ColorMenu, any configuration options for the ColorPalette must be
 * applied to the <tt><b>initialConfig</b></tt> property of the ColorMenu.
 * Applying {@link Ext.ColorPalette ColorPalette} configuration settings to
 * <b><tt>this</tt></b> will <b>not</b> affect the ColorPalette's configuration.</li>
 * </ul></div> * 
 * @xtype colormenu
 */
 Ext.menu.ColorMenu = Ext.extend(Ext.menu.Menu, {
    /** 
     * @cfg {Boolean} enableScrolling
     * @hide 
     */
    enableScrolling : false,
    /**
     * @cfg {Function} handler
     * Optional. A function that will handle the select event of this menu.
     * The handler is passed the following parameters:<div class="mdetail-params"><ul>
     * <li><code>palette</code> : ColorPalette<div class="sub-desc">The {@link #palette Ext.ColorPalette}.</div></li>
     * <li><code>color</code> : String<div class="sub-desc">The 6-digit color hex code (without the # symbol).</div></li>
     * </ul></div>
     */
    /**
     * @cfg {Object} scope
     * The scope (<tt><b>this</b></tt> reference) in which the <code>{@link #handler}</code>
     * function will be called.  Defaults to this ColorMenu instance.
     */    
    
    /** 
     * @cfg {Boolean} hideOnClick
     * False to continue showing the menu after a color is selected, defaults to true.
     */
    hideOnClick : true,
    
    cls : 'x-color-menu',
    
    /** 
     * @cfg {String} paletteId
     * An id to assign to the underlying color palette. Defaults to <tt>null</tt>.
     */
    paletteId : null,
    
    /** 
     * @cfg {Number} maxHeight
     * @hide 
     */
    /** 
     * @cfg {Number} scrollIncrement
     * @hide 
     */
    /**
     * @property palette
     * @type ColorPalette
     * The {@link Ext.ColorPalette} instance for this ColorMenu
     */
    
    
    /**
     * @event click
     * @hide
     */
    
    /**
     * @event itemclick
     * @hide
     */
    
    initComponent : function(){
        Ext.apply(this, {
            plain: true,
            showSeparator: false,
            items: this.palette = new Ext.ColorPalette(Ext.applyIf({
                id: this.paletteId
            }, this.initialConfig))
        });
        this.palette.purgeListeners();
        Ext.menu.ColorMenu.superclass.initComponent.call(this);
        /**
         * @event select
         * Fires when a color is selected from the {@link #palette Ext.ColorPalette}
         * @param {Ext.ColorPalette} palette The {@link #palette Ext.ColorPalette}
	     * @param {String} color The 6-digit color hex code (without the # symbol)
         */
        this.relayEvents(this.palette, ['select']);
        this.on('select', this.menuHide, this);
        if(this.handler){
            this.on('select', this.handler, this.scope || this);
        }
    },

    menuHide : function(){
        if(this.hideOnClick){
            this.hide(true);
        }
    }
});
Ext.reg('colormenu', Ext.menu.ColorMenu);
