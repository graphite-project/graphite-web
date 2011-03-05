/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.CycleButton
 * @extends Ext.SplitButton
 * A specialized SplitButton that contains a menu of {@link Ext.menu.CheckItem} elements.  The button automatically
 * cycles through each menu item on click, raising the button's {@link #change} event (or calling the button's
 * {@link #changeHandler} function, if supplied) for the active menu item. Clicking on the arrow section of the
 * button displays the dropdown menu just like a normal SplitButton.  Example usage:
 * <pre><code>
var btn = new Ext.CycleButton({
    showText: true,
    prependText: 'View as ',
    items: [{
        text:'text only',
        iconCls:'view-text',
        checked:true
    },{
        text:'HTML',
        iconCls:'view-html'
    }],
    changeHandler:function(btn, item){
        Ext.Msg.alert('Change View', item.text);
    }
});
</code></pre>
 * @constructor
 * Create a new split button
 * @param {Object} config The config object
 * @xtype cycle
 */
Ext.CycleButton = Ext.extend(Ext.SplitButton, {
    /**
     * @cfg {Array} items An array of {@link Ext.menu.CheckItem} <b>config</b> objects to be used when creating the
     * button's menu items (e.g., {text:'Foo', iconCls:'foo-icon'})
     */
    /**
     * @cfg {Boolean} showText True to display the active item's text as the button text (defaults to false)
     */
    /**
     * @cfg {String} prependText A static string to prepend before the active item's text when displayed as the
     * button's text (only applies when showText = true, defaults to '')
     */
    /**
     * @cfg {Function} changeHandler A callback function that will be invoked each time the active menu
     * item in the button's menu has changed.  If this callback is not supplied, the SplitButton will instead
     * fire the {@link #change} event on active item change.  The changeHandler function will be called with the
     * following argument list: (SplitButton this, Ext.menu.CheckItem item)
     */
    /**
     * @cfg {String} forceIcon A css class which sets an image to be used as the static icon for this button.  This
     * icon will always be displayed regardless of which item is selected in the dropdown list.  This overrides the 
     * default behavior of changing the button's icon to match the selected item's icon on change.
     */
    /**
     * @property menu
     * @type Menu
     * The {@link Ext.menu.Menu Menu} object used to display the {@link Ext.menu.CheckItem CheckItems} representing the available choices.
     */

    // private
    getItemText : function(item){
        if(item && this.showText === true){
            var text = '';
            if(this.prependText){
                text += this.prependText;
            }
            text += item.text;
            return text;
        }
        return undefined;
    },

    /**
     * Sets the button's active menu item.
     * @param {Ext.menu.CheckItem} item The item to activate
     * @param {Boolean} suppressEvent True to prevent the button's change event from firing (defaults to false)
     */
    setActiveItem : function(item, suppressEvent){
        if(!Ext.isObject(item)){
            item = this.menu.getComponent(item);
        }
        if(item){
            if(!this.rendered){
                this.text = this.getItemText(item);
                this.iconCls = item.iconCls;
            }else{
                var t = this.getItemText(item);
                if(t){
                    this.setText(t);
                }
                this.setIconClass(item.iconCls);
            }
            this.activeItem = item;
            if(!item.checked){
                item.setChecked(true, false);
            }
            if(this.forceIcon){
                this.setIconClass(this.forceIcon);
            }
            if(!suppressEvent){
                this.fireEvent('change', this, item);
            }
        }
    },

    /**
     * Gets the currently active menu item.
     * @return {Ext.menu.CheckItem} The active item
     */
    getActiveItem : function(){
        return this.activeItem;
    },

    // private
    initComponent : function(){
        this.addEvents(
            /**
             * @event change
             * Fires after the button's active menu item has changed.  Note that if a {@link #changeHandler} function
             * is set on this CycleButton, it will be called instead on active item change and this change event will
             * not be fired.
             * @param {Ext.CycleButton} this
             * @param {Ext.menu.CheckItem} item The menu item that was selected
             */
            "change"
        );

        if(this.changeHandler){
            this.on('change', this.changeHandler, this.scope||this);
            delete this.changeHandler;
        }

        this.itemCount = this.items.length;

        this.menu = {cls:'x-cycle-menu', items:[]};
        var checked = 0;
        Ext.each(this.items, function(item, i){
            Ext.apply(item, {
                group: item.group || this.id,
                itemIndex: i,
                checkHandler: this.checkHandler,
                scope: this,
                checked: item.checked || false
            });
            this.menu.items.push(item);
            if(item.checked){
                checked = i;
            }
        }, this);
        Ext.CycleButton.superclass.initComponent.call(this);
        this.on('click', this.toggleSelected, this);
        this.setActiveItem(checked, true);
    },

    // private
    checkHandler : function(item, pressed){
        if(pressed){
            this.setActiveItem(item);
        }
    },

    /**
     * This is normally called internally on button click, but can be called externally to advance the button's
     * active item programmatically to the next one in the menu.  If the current item is the last one in the menu
     * the active item will be set to the first item in the menu.
     */
    toggleSelected : function(){
        var m = this.menu;
        m.render();
        // layout if we haven't before so the items are active
        if(!m.hasLayout){
            m.doLayout();
        }
        
        var nextIdx, checkItem;
        for (var i = 1; i < this.itemCount; i++) {
            nextIdx = (this.activeItem.itemIndex + i) % this.itemCount;
            // check the potential item
            checkItem = m.items.itemAt(nextIdx);
            // if its not disabled then check it.
            if (!checkItem.disabled) {
                checkItem.setChecked(true);
                break;
            }
        }
    }
});
Ext.reg('cycle', Ext.CycleButton);