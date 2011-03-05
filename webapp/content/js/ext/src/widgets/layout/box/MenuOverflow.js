/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.layout.boxOverflow.Menu
 * @extends Ext.layout.boxOverflow.None
 * Description
 */
Ext.layout.boxOverflow.Menu = Ext.extend(Ext.layout.boxOverflow.None, {
    /**
     * @cfg afterCls
     * @type String
     * CSS class added to the afterCt element. This is the element that holds any special items such as scrollers,
     * which must always be present at the rightmost edge of the Container
     */
    afterCls: 'x-strip-right',
    
    /**
     * @property noItemsMenuText
     * @type String
     * HTML fragment to render into the toolbar overflow menu if there are no items to display
     */
    noItemsMenuText : '<div class="x-toolbar-no-items">(None)</div>',
    
    constructor: function(layout) {
        Ext.layout.boxOverflow.Menu.superclass.constructor.apply(this, arguments);
        
        /**
         * @property menuItems
         * @type Array
         * Array of all items that are currently hidden and should go into the dropdown menu
         */
        this.menuItems = [];
    },
    
    /**
     * @private
     * Creates the beforeCt, innerCt and afterCt elements if they have not already been created
     * @param {Ext.Container} container The Container attached to this Layout instance
     * @param {Ext.Element} target The target Element
     */
    createInnerElements: function() {
        if (!this.afterCt) {
            this.afterCt  = this.layout.innerCt.insertSibling({cls: this.afterCls},  'before');
        }
    },
    
    /**
     * @private
     */
    clearOverflow: function(calculations, targetSize) {
        var newWidth = targetSize.width + (this.afterCt ? this.afterCt.getWidth() : 0),
            items    = this.menuItems;
        
        this.hideTrigger();
        
        for (var index = 0, length = items.length; index < length; index++) {
            items.pop().component.show();
        }
        
        return {
            targetSize: {
                height: targetSize.height,
                width : newWidth
            }
        };
    },
    
    /**
     * @private
     */
    showTrigger: function() {
        this.createMenu();
        this.menuTrigger.show();
    },
    
    /**
     * @private
     */
    hideTrigger: function() {
        if (this.menuTrigger != undefined) {
            this.menuTrigger.hide();
        }
    },
    
    /**
     * @private
     * Called before the overflow menu is shown. This constructs the menu's items, caching them for as long as it can.
     */
    beforeMenuShow: function(menu) {
        var items = this.menuItems,
            len   = items.length,
            item,
            prev;

        var needsSep = function(group, item){
            return group.isXType('buttongroup') && !(item instanceof Ext.Toolbar.Separator);
        };
        
        this.clearMenu();
        menu.removeAll();
        
        for (var i = 0; i < len; i++) {
            item = items[i].component;
            
            if (prev && (needsSep(item, prev) || needsSep(prev, item))) {
                menu.add('-');
            }
            
            this.addComponentToMenu(menu, item);
            prev = item;
        }

        // put something so the menu isn't empty if no compatible items found
        if (menu.items.length < 1) {
            menu.add(this.noItemsMenuText);
        }
    },
    
    /**
     * @private
     * Returns a menu config for a given component. This config is used to create a menu item
     * to be added to the expander menu
     * @param {Ext.Component} component The component to create the config for
     * @param {Boolean} hideOnClick Passed through to the menu item
     */
    createMenuConfig : function(component, hideOnClick){
        var config = Ext.apply({}, component.initialConfig),
            group  = component.toggleGroup;

        Ext.copyTo(config, component, [
            'iconCls', 'icon', 'itemId', 'disabled', 'handler', 'scope', 'menu'
        ]);

        Ext.apply(config, {
            text       : component.overflowText || component.text,
            hideOnClick: hideOnClick
        });

        if (group || component.enableToggle) {
            Ext.apply(config, {
                group  : group,
                checked: component.pressed,
                listeners: {
                    checkchange: function(item, checked){
                        component.toggle(checked);
                    }
                }
            });
        }

        delete config.ownerCt;
        delete config.xtype;
        delete config.id;

        return config;
    },

    /**
     * @private
     * Adds the given Toolbar item to the given menu. Buttons inside a buttongroup are added individually.
     * @param {Ext.menu.Menu} menu The menu to add to
     * @param {Ext.Component} component The component to add
     */
    addComponentToMenu : function(menu, component) {
        if (component instanceof Ext.Toolbar.Separator) {
            menu.add('-');

        } else if (Ext.isFunction(component.isXType)) {
            if (component.isXType('splitbutton')) {
                menu.add(this.createMenuConfig(component, true));

            } else if (component.isXType('button')) {
                menu.add(this.createMenuConfig(component, !component.menu));

            } else if (component.isXType('buttongroup')) {
                component.items.each(function(item){
                     this.addComponentToMenu(menu, item);
                }, this);
            }
        }
    },
    
    /**
     * @private
     * Deletes the sub-menu of each item in the expander menu. Submenus are created for items such as
     * splitbuttons and buttongroups, where the Toolbar item cannot be represented by a single menu item
     */
    clearMenu : function(){
        var menu = this.moreMenu;
        if (menu && menu.items) {
            menu.items.each(function(item){
                delete item.menu;
            });
        }
    },
    
    /**
     * @private
     * Creates the overflow trigger and menu used when enableOverflow is set to true and the items
     * in the layout are too wide to fit in the space available
     */
    createMenu: function() {
        if (!this.menuTrigger) {
            this.createInnerElements();
            
            /**
             * @private
             * @property menu
             * @type Ext.menu.Menu
             * The expand menu - holds items for every item that cannot be shown
             * because the container is currently not large enough.
             */
            this.menu = new Ext.menu.Menu({
                ownerCt : this.layout.container,
                listeners: {
                    scope: this,
                    beforeshow: this.beforeMenuShow
                }
            });

            /**
             * @private
             * @property menuTrigger
             * @type Ext.Button
             * The expand button which triggers the overflow menu to be shown
             */
            this.menuTrigger = new Ext.Button({
                iconCls : 'x-toolbar-more-icon',
                cls     : 'x-toolbar-more',
                menu    : this.menu,
                renderTo: this.afterCt
            });
        }
    },
    
    /**
     * @private
     */
    destroy: function() {
        Ext.destroy(this.menu, this.menuTrigger);
    }
});

Ext.layout.boxOverflow.menu = Ext.layout.boxOverflow.Menu;


/**
 * @class Ext.layout.boxOverflow.HorizontalMenu
 * @extends Ext.layout.boxOverflow.Menu
 * Description
 */
Ext.layout.boxOverflow.HorizontalMenu = Ext.extend(Ext.layout.boxOverflow.Menu, {
    
    constructor: function() {
        Ext.layout.boxOverflow.HorizontalMenu.superclass.constructor.apply(this, arguments);
        
        var me = this,
            layout = me.layout,
            origFunction = layout.calculateChildBoxes;
        
        layout.calculateChildBoxes = function(visibleItems, targetSize) {
            var calcs = origFunction.apply(layout, arguments),
                meta  = calcs.meta,
                items = me.menuItems;
            
            //calculate the width of the items currently hidden solely because there is not enough space
            //to display them
            var hiddenWidth = 0;
            for (var index = 0, length = items.length; index < length; index++) {
                hiddenWidth += items[index].width;
            }
            
            meta.minimumWidth += hiddenWidth;
            meta.tooNarrow = meta.minimumWidth > targetSize.width;
            
            return calcs;
        };        
    },
    
    handleOverflow: function(calculations, targetSize) {
        this.showTrigger();
        
        var newWidth    = targetSize.width - this.afterCt.getWidth(),
            boxes       = calculations.boxes,
            usedWidth   = 0,
            recalculate = false;
        
        //calculate the width of all visible items and any spare width
        for (var index = 0, length = boxes.length; index < length; index++) {
            usedWidth += boxes[index].width;
        }
        
        var spareWidth = newWidth - usedWidth,
            showCount  = 0;
        
        //see if we can re-show any of the hidden components
        for (var index = 0, length = this.menuItems.length; index < length; index++) {
            var hidden = this.menuItems[index],
                comp   = hidden.component,
                width  = hidden.width;
            
            if (width < spareWidth) {
                comp.show();
                
                spareWidth -= width;
                showCount ++;
                recalculate = true;
            } else {
                break;
            }
        }
                
        if (recalculate) {
            this.menuItems = this.menuItems.slice(showCount);
        } else {
            for (var i = boxes.length - 1; i >= 0; i--) {
                var item  = boxes[i].component,
                    right = boxes[i].left + boxes[i].width;

                if (right >= newWidth) {
                    this.menuItems.unshift({
                        component: item,
                        width    : boxes[i].width
                    });

                    item.hide();
                } else {
                    break;
                }
            }
        }
        
        if (this.menuItems.length == 0) {
            this.hideTrigger();
        }
        
        return {
            targetSize: {
                height: targetSize.height,
                width : newWidth
            },
            recalculate: recalculate
        };
    }
});

Ext.layout.boxOverflow.menu.hbox = Ext.layout.boxOverflow.HorizontalMenu;