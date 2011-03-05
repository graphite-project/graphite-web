/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.Toolbar
 * @extends Ext.Container
 * <p>Basic Toolbar class. Although the <tt>{@link Ext.Container#defaultType defaultType}</tt> for Toolbar
 * is <tt>{@link Ext.Button button}</tt>, Toolbar elements (child items for the Toolbar container) may
 * be virtually any type of Component. Toolbar elements can be created explicitly via their constructors,
 * or implicitly via their xtypes, and can be <tt>{@link #add}</tt>ed dynamically.</p>
 * <p>Some items have shortcut strings for creation:</p>
 * <pre>
<u>Shortcut</u>  <u>xtype</u>          <u>Class</u>                  <u>Description</u>
'->'      'tbfill'       {@link Ext.Toolbar.Fill}       begin using the right-justified button container
'-'       'tbseparator'  {@link Ext.Toolbar.Separator}  add a vertical separator bar between toolbar items
' '       'tbspacer'     {@link Ext.Toolbar.Spacer}     add horiztonal space between elements
 * </pre>
 *
 * Example usage of various elements:
 * <pre><code>
var tb = new Ext.Toolbar({
    renderTo: document.body,
    width: 600,
    height: 100,
    items: [
        {
            // xtype: 'button', // default for Toolbars, same as 'tbbutton'
            text: 'Button'
        },
        {
            xtype: 'splitbutton', // same as 'tbsplitbutton'
            text: 'Split Button'
        },
        // begin using the right-justified button container
        '->', // same as {xtype: 'tbfill'}, // Ext.Toolbar.Fill
        {
            xtype: 'textfield',
            name: 'field1',
            emptyText: 'enter search term'
        },
        // add a vertical separator bar between toolbar items
        '-', // same as {xtype: 'tbseparator'} to create Ext.Toolbar.Separator
        'text 1', // same as {xtype: 'tbtext', text: 'text1'} to create Ext.Toolbar.TextItem
        {xtype: 'tbspacer'},// same as ' ' to create Ext.Toolbar.Spacer
        'text 2',
        {xtype: 'tbspacer', width: 50}, // add a 50px space
        'text 3'
    ]
});
 * </code></pre>
 * Example adding a ComboBox within a menu of a button:
 * <pre><code>
// ComboBox creation
var combo = new Ext.form.ComboBox({
    store: new Ext.data.ArrayStore({
        autoDestroy: true,
        fields: ['initials', 'fullname'],
        data : [
            ['FF', 'Fred Flintstone'],
            ['BR', 'Barney Rubble']
        ]
    }),
    displayField: 'fullname',
    typeAhead: true,
    mode: 'local',
    forceSelection: true,
    triggerAction: 'all',
    emptyText: 'Select a name...',
    selectOnFocus: true,
    width: 135,
    getListParent: function() {
        return this.el.up('.x-menu');
    },
    iconCls: 'no-icon' //use iconCls if placing within menu to shift to right side of menu
});

// put ComboBox in a Menu
var menu = new Ext.menu.Menu({
    id: 'mainMenu',
    items: [
        combo // A Field in a Menu
    ]
});

// add a Button with the menu
tb.add({
        text:'Button w/ Menu',
        menu: menu  // assign menu by instance
    });
tb.doLayout();
 * </code></pre>
 * @constructor
 * Creates a new Toolbar
 * @param {Object/Array} config A config object or an array of buttons to <tt>{@link #add}</tt>
 * @xtype toolbar
 */
Ext.Toolbar = function(config){
    if(Ext.isArray(config)){
        config = {items: config, layout: 'toolbar'};
    } else {
        config = Ext.apply({
            layout: 'toolbar'
        }, config);
        if(config.buttons) {
            config.items = config.buttons;
        }
    }
    Ext.Toolbar.superclass.constructor.call(this, config);
};

(function(){

var T = Ext.Toolbar;

Ext.extend(T, Ext.Container, {

    defaultType: 'button',

    /**
     * @cfg {String/Object} layout
     * This class assigns a default layout (<code>layout:'<b>toolbar</b>'</code>).
     * Developers <i>may</i> override this configuration option if another layout
     * is required (the constructor must be passed a configuration object in this
     * case instead of an array).
     * See {@link Ext.Container#layout} for additional information.
     */

    enableOverflow : false,

    /**
     * @cfg {Boolean} enableOverflow
     * Defaults to false. Configure <tt>true</tt> to make the toolbar provide a button
     * which activates a dropdown Menu to show items which overflow the Toolbar's width.
     */
    /**
     * @cfg {String} buttonAlign
     * <p>The default position at which to align child items. Defaults to <code>"left"</code></p>
     * <p>May be specified as <code>"center"</code> to cause items added before a Fill (A <code>"->"</code>) item
     * to be centered in the Toolbar. Items added after a Fill are still right-aligned.</p>
     * <p>Specify as <code>"right"</code> to right align all child items.</p>
     */

    trackMenus : true,
    internalDefaults: {removeMode: 'container', hideParent: true},
    toolbarCls: 'x-toolbar',

    initComponent : function(){
        T.superclass.initComponent.call(this);

        /**
         * @event overflowchange
         * Fires after the overflow state has changed.
         * @param {Object} c The Container
         * @param {Boolean} lastOverflow overflow state
         */
        this.addEvents('overflowchange');
    },

    // private
    onRender : function(ct, position){
        if(!this.el){
            if(!this.autoCreate){
                this.autoCreate = {
                    cls: this.toolbarCls + ' x-small-editor'
                };
            }
            this.el = ct.createChild(Ext.apply({ id: this.id },this.autoCreate), position);
            Ext.Toolbar.superclass.onRender.apply(this, arguments);
        }
    },

    /**
     * <p>Adds element(s) to the toolbar -- this function takes a variable number of
     * arguments of mixed type and adds them to the toolbar.</p>
     * <br><p><b>Note</b>: See the notes within {@link Ext.Container#add}.</p>
     * @param {Mixed} arg1 The following types of arguments are all valid:<br />
     * <ul>
     * <li>{@link Ext.Button} config: A valid button config object (equivalent to {@link #addButton})</li>
     * <li>HtmlElement: Any standard HTML element (equivalent to {@link #addElement})</li>
     * <li>Field: Any form field (equivalent to {@link #addField})</li>
     * <li>Item: Any subclass of {@link Ext.Toolbar.Item} (equivalent to {@link #addItem})</li>
     * <li>String: Any generic string (gets wrapped in a {@link Ext.Toolbar.TextItem}, equivalent to {@link #addText}).
     * Note that there are a few special strings that are treated differently as explained next.</li>
     * <li>'-': Creates a separator element (equivalent to {@link #addSeparator})</li>
     * <li>' ': Creates a spacer element (equivalent to {@link #addSpacer})</li>
     * <li>'->': Creates a fill element (equivalent to {@link #addFill})</li>
     * </ul>
     * @param {Mixed} arg2
     * @param {Mixed} etc.
     * @method add
     */

    // private
    lookupComponent : function(c){
        if(Ext.isString(c)){
            if(c == '-'){
                c = new T.Separator();
            }else if(c == ' '){
                c = new T.Spacer();
            }else if(c == '->'){
                c = new T.Fill();
            }else{
                c = new T.TextItem(c);
            }
            this.applyDefaults(c);
        }else{
            if(c.isFormField || c.render){ // some kind of form field, some kind of Toolbar.Item
                c = this.createComponent(c);
            }else if(c.tag){ // DomHelper spec
                c = new T.Item({autoEl: c});
            }else if(c.tagName){ // element
                c = new T.Item({el:c});
            }else if(Ext.isObject(c)){ // must be button config?
                c = c.xtype ? this.createComponent(c) : this.constructButton(c);
            }
        }
        return c;
    },

    // private
    applyDefaults : function(c){
        if(!Ext.isString(c)){
            c = Ext.Toolbar.superclass.applyDefaults.call(this, c);
            var d = this.internalDefaults;
            if(c.events){
                Ext.applyIf(c.initialConfig, d);
                Ext.apply(c, d);
            }else{
                Ext.applyIf(c, d);
            }
        }
        return c;
    },

    /**
     * Adds a separator
     * <br><p><b>Note</b>: See the notes within {@link Ext.Container#add}.</p>
     * @return {Ext.Toolbar.Item} The separator {@link Ext.Toolbar.Item item}
     */
    addSeparator : function(){
        return this.add(new T.Separator());
    },

    /**
     * Adds a spacer element
     * <br><p><b>Note</b>: See the notes within {@link Ext.Container#add}.</p>
     * @return {Ext.Toolbar.Spacer} The spacer item
     */
    addSpacer : function(){
        return this.add(new T.Spacer());
    },

    /**
     * Forces subsequent additions into the float:right toolbar
     * <br><p><b>Note</b>: See the notes within {@link Ext.Container#add}.</p>
     */
    addFill : function(){
        this.add(new T.Fill());
    },

    /**
     * Adds any standard HTML element to the toolbar
     * <br><p><b>Note</b>: See the notes within {@link Ext.Container#add}.</p>
     * @param {Mixed} el The element or id of the element to add
     * @return {Ext.Toolbar.Item} The element's item
     */
    addElement : function(el){
        return this.addItem(new T.Item({el:el}));
    },

    /**
     * Adds any Toolbar.Item or subclass
     * <br><p><b>Note</b>: See the notes within {@link Ext.Container#add}.</p>
     * @param {Ext.Toolbar.Item} item
     * @return {Ext.Toolbar.Item} The item
     */
    addItem : function(item){
        return this.add.apply(this, arguments);
    },

    /**
     * Adds a button (or buttons). See {@link Ext.Button} for more info on the config.
     * <br><p><b>Note</b>: See the notes within {@link Ext.Container#add}.</p>
     * @param {Object/Array} config A button config or array of configs
     * @return {Ext.Button/Array}
     */
    addButton : function(config){
        if(Ext.isArray(config)){
            var buttons = [];
            for(var i = 0, len = config.length; i < len; i++) {
                buttons.push(this.addButton(config[i]));
            }
            return buttons;
        }
        return this.add(this.constructButton(config));
    },

    /**
     * Adds text to the toolbar
     * <br><p><b>Note</b>: See the notes within {@link Ext.Container#add}.</p>
     * @param {String} text The text to add
     * @return {Ext.Toolbar.Item} The element's item
     */
    addText : function(text){
        return this.addItem(new T.TextItem(text));
    },

    /**
     * Adds a new element to the toolbar from the passed {@link Ext.DomHelper} config
     * <br><p><b>Note</b>: See the notes within {@link Ext.Container#add}.</p>
     * @param {Object} config
     * @return {Ext.Toolbar.Item} The element's item
     */
    addDom : function(config){
        return this.add(new T.Item({autoEl: config}));
    },

    /**
     * Adds a dynamically rendered Ext.form field (TextField, ComboBox, etc). Note: the field should not have
     * been rendered yet. For a field that has already been rendered, use {@link #addElement}.
     * <br><p><b>Note</b>: See the notes within {@link Ext.Container#add}.</p>
     * @param {Ext.form.Field} field
     * @return {Ext.Toolbar.Item}
     */
    addField : function(field){
        return this.add(field);
    },

    /**
     * Inserts any {@link Ext.Toolbar.Item}/{@link Ext.Button} at the specified index.
     * <br><p><b>Note</b>: See the notes within {@link Ext.Container#add}.</p>
     * @param {Number} index The index where the item is to be inserted
     * @param {Object/Ext.Toolbar.Item/Ext.Button/Array} item The button, or button config object to be
     * inserted, or an array of buttons/configs.
     * @return {Ext.Button/Item}
     */
    insertButton : function(index, item){
        if(Ext.isArray(item)){
            var buttons = [];
            for(var i = 0, len = item.length; i < len; i++) {
               buttons.push(this.insertButton(index + i, item[i]));
            }
            return buttons;
        }
        return Ext.Toolbar.superclass.insert.call(this, index, item);
    },

    // private
    trackMenu : function(item, remove){
        if(this.trackMenus && item.menu){
            var method = remove ? 'mun' : 'mon';
            this[method](item, 'menutriggerover', this.onButtonTriggerOver, this);
            this[method](item, 'menushow', this.onButtonMenuShow, this);
            this[method](item, 'menuhide', this.onButtonMenuHide, this);
        }
    },

    // private
    constructButton : function(item){
        var b = item.events ? item : this.createComponent(item, item.split ? 'splitbutton' : this.defaultType);
        return b;
    },

    // private
    onAdd : function(c){
        Ext.Toolbar.superclass.onAdd.call(this);
        this.trackMenu(c);
        if(this.disabled){
            c.disable();
        }
    },

    // private
    onRemove : function(c){
        Ext.Toolbar.superclass.onRemove.call(this);
        if (c == this.activeMenuBtn) {
            delete this.activeMenuBtn;
        }
        this.trackMenu(c, true);
    },

    // private
    onDisable : function(){
        this.items.each(function(item){
             if(item.disable){
                 item.disable();
             }
        });
    },

    // private
    onEnable : function(){
        this.items.each(function(item){
             if(item.enable){
                 item.enable();
             }
        });
    },

    // private
    onButtonTriggerOver : function(btn){
        if(this.activeMenuBtn && this.activeMenuBtn != btn){
            this.activeMenuBtn.hideMenu();
            btn.showMenu();
            this.activeMenuBtn = btn;
        }
    },

    // private
    onButtonMenuShow : function(btn){
        this.activeMenuBtn = btn;
    },

    // private
    onButtonMenuHide : function(btn){
        delete this.activeMenuBtn;
    }
});
Ext.reg('toolbar', Ext.Toolbar);

/**
 * @class Ext.Toolbar.Item
 * @extends Ext.BoxComponent
 * The base class that other non-interacting Toolbar Item classes should extend in order to
 * get some basic common toolbar item functionality.
 * @constructor
 * Creates a new Item
 * @param {HTMLElement} el
 * @xtype tbitem
 */
T.Item = Ext.extend(Ext.BoxComponent, {
    hideParent: true, //  Hiding a Toolbar.Item hides its containing TD
    enable:Ext.emptyFn,
    disable:Ext.emptyFn,
    focus:Ext.emptyFn
    /**
     * @cfg {String} overflowText Text to be used for the menu if the item is overflowed.
     */
});
Ext.reg('tbitem', T.Item);

/**
 * @class Ext.Toolbar.Separator
 * @extends Ext.Toolbar.Item
 * A simple class that adds a vertical separator bar between toolbar items
 * (css class:<tt>'xtb-sep'</tt>). Example usage:
 * <pre><code>
new Ext.Panel({
    tbar : [
        'Item 1',
        {xtype: 'tbseparator'}, // or '-'
        'Item 2'
    ]
});
</code></pre>
 * @constructor
 * Creates a new Separator
 * @xtype tbseparator
 */
T.Separator = Ext.extend(T.Item, {
    onRender : function(ct, position){
        this.el = ct.createChild({tag:'span', cls:'xtb-sep'}, position);
    }
});
Ext.reg('tbseparator', T.Separator);

/**
 * @class Ext.Toolbar.Spacer
 * @extends Ext.Toolbar.Item
 * A simple element that adds extra horizontal space between items in a toolbar.
 * By default a 2px wide space is added via css specification:<pre><code>
.x-toolbar .xtb-spacer {
    width:2px;
}
 * </code></pre>
 * <p>Example usage:</p>
 * <pre><code>
new Ext.Panel({
    tbar : [
        'Item 1',
        {xtype: 'tbspacer'}, // or ' '
        'Item 2',
        // space width is also configurable via javascript
        {xtype: 'tbspacer', width: 50}, // add a 50px space
        'Item 3'
    ]
});
</code></pre>
 * @constructor
 * Creates a new Spacer
 * @xtype tbspacer
 */
T.Spacer = Ext.extend(T.Item, {
    /**
     * @cfg {Number} width
     * The width of the spacer in pixels (defaults to 2px via css style <tt>.x-toolbar .xtb-spacer</tt>).
     */

    onRender : function(ct, position){
        this.el = ct.createChild({tag:'div', cls:'xtb-spacer', style: this.width?'width:'+this.width+'px':''}, position);
    }
});
Ext.reg('tbspacer', T.Spacer);

/**
 * @class Ext.Toolbar.Fill
 * @extends Ext.Toolbar.Spacer
 * A non-rendering placeholder item which instructs the Toolbar's Layout to begin using
 * the right-justified button container.
 * <pre><code>
new Ext.Panel({
    tbar : [
        'Item 1',
        {xtype: 'tbfill'}, // or '->'
        'Item 2'
    ]
});
</code></pre>
 * @constructor
 * Creates a new Fill
 * @xtype tbfill
 */
T.Fill = Ext.extend(T.Item, {
    // private
    render : Ext.emptyFn,
    isFill : true
});
Ext.reg('tbfill', T.Fill);

/**
 * @class Ext.Toolbar.TextItem
 * @extends Ext.Toolbar.Item
 * A simple class that renders text directly into a toolbar
 * (with css class:<tt>'xtb-text'</tt>). Example usage:
 * <pre><code>
new Ext.Panel({
    tbar : [
        {xtype: 'tbtext', text: 'Item 1'} // or simply 'Item 1'
    ]
});
</code></pre>
 * @constructor
 * Creates a new TextItem
 * @param {String/Object} text A text string, or a config object containing a <tt>text</tt> property
 * @xtype tbtext
 */
T.TextItem = Ext.extend(T.Item, {
    /**
     * @cfg {String} text The text to be used as innerHTML (html tags are accepted)
     */

    constructor: function(config){
        T.TextItem.superclass.constructor.call(this, Ext.isString(config) ? {text: config} : config);
    },

    // private
    onRender : function(ct, position) {
        this.autoEl = {cls: 'xtb-text', html: this.text || ''};
        T.TextItem.superclass.onRender.call(this, ct, position);
    },

    /**
     * Updates this item's text, setting the text to be used as innerHTML.
     * @param {String} t The text to display (html accepted).
     */
    setText : function(t) {
        if(this.rendered){
            this.el.update(t);
        }else{
            this.text = t;
        }
    }
});
Ext.reg('tbtext', T.TextItem);

// backwards compat
T.Button = Ext.extend(Ext.Button, {});
T.SplitButton = Ext.extend(Ext.SplitButton, {});
Ext.reg('tbbutton', T.Button);
Ext.reg('tbsplit', T.SplitButton);

})();
/**
 * @class Ext.ButtonGroup
 * @extends Ext.Panel
 * Container for a group of buttons. Example usage:
 * <pre><code>
var p = new Ext.Panel({
    title: 'Panel with Button Group',
    width: 300,
    height:200,
    renderTo: document.body,
    html: 'whatever',
    tbar: [{
        xtype: 'buttongroup',
        {@link #columns}: 3,
        title: 'Clipboard',
        items: [{
            text: 'Paste',
            scale: 'large',
            rowspan: 3, iconCls: 'add',
            iconAlign: 'top',
            cls: 'x-btn-as-arrow'
        },{
            xtype:'splitbutton',
            text: 'Menu Button',
            scale: 'large',
            rowspan: 3,
            iconCls: 'add',
            iconAlign: 'top',
            arrowAlign:'bottom',
            menu: [{text: 'Menu Item 1'}]
        },{
            xtype:'splitbutton', text: 'Cut', iconCls: 'add16', menu: [{text: 'Cut Menu Item'}]
        },{
            text: 'Copy', iconCls: 'add16'
        },{
            text: 'Format', iconCls: 'add16'
        }]
    }]
});
 * </code></pre>
 * @constructor
 * Create a new ButtonGroup.
 * @param {Object} config The config object
 * @xtype buttongroup
 */
Ext.ButtonGroup = Ext.extend(Ext.Panel, {
    /**
     * @cfg {Number} columns The <tt>columns</tt> configuration property passed to the
     * {@link #layout configured layout manager}. See {@link Ext.layout.TableLayout#columns}.
     */
    /**
     * @cfg {String} baseCls  Defaults to <tt>'x-btn-group'</tt>.  See {@link Ext.Panel#baseCls}.
     */
    baseCls: 'x-btn-group',
    /**
     * @cfg {String} layout  Defaults to <tt>'table'</tt>.  See {@link Ext.Container#layout}.
     */
    layout:'table',
    defaultType: 'button',
    /**
     * @cfg {Boolean} frame  Defaults to <tt>true</tt>.  See {@link Ext.Panel#frame}.
     */
    frame: true,
    internalDefaults: {removeMode: 'container', hideParent: true},

    initComponent : function(){
        this.layoutConfig = this.layoutConfig || {};
        Ext.applyIf(this.layoutConfig, {
            columns : this.columns
        });
        if(!this.title){
            this.addClass('x-btn-group-notitle');
        }
        this.on('afterlayout', this.onAfterLayout, this);
        Ext.ButtonGroup.superclass.initComponent.call(this);
    },

    applyDefaults : function(c){
        c = Ext.ButtonGroup.superclass.applyDefaults.call(this, c);
        var d = this.internalDefaults;
        if(c.events){
            Ext.applyIf(c.initialConfig, d);
            Ext.apply(c, d);
        }else{
            Ext.applyIf(c, d);
        }
        return c;
    },

    onAfterLayout : function(){
        var bodyWidth = this.body.getFrameWidth('lr') + this.body.dom.firstChild.offsetWidth;
        this.body.setWidth(bodyWidth);
        this.el.setWidth(bodyWidth + this.getFrameWidth());
    }
    /**
     * @cfg {Array} tools  @hide
     */
});

Ext.reg('buttongroup', Ext.ButtonGroup);
/**
 * @class Ext.PagingToolbar
 * @extends Ext.Toolbar
 * <p>As the amount of records increases, the time required for the browser to render
 * them increases. Paging is used to reduce the amount of data exchanged with the client.
 * Note: if there are more records/rows than can be viewed in the available screen area, vertical
 * scrollbars will be added.</p>
 * <p>Paging is typically handled on the server side (see exception below). The client sends
 * parameters to the server side, which the server needs to interpret and then respond with the
 * approprate data.</p>
 * <p><b>Ext.PagingToolbar</b> is a specialized toolbar that is bound to a {@link Ext.data.Store}
 * and provides automatic paging control. This Component {@link Ext.data.Store#load load}s blocks
 * of data into the <tt>{@link #store}</tt> by passing {@link Ext.data.Store#paramNames paramNames} used for
 * paging criteria.</p>
 * <p>PagingToolbar is typically used as one of the Grid's toolbars:</p>
 * <pre><code>
Ext.QuickTips.init(); // to display button quicktips

var myStore = new Ext.data.Store({
    reader: new Ext.data.JsonReader({
        {@link Ext.data.JsonReader#totalProperty totalProperty}: 'results', 
        ...
    }),
    ...
});

var myPageSize = 25;  // server script should only send back 25 items at a time

var grid = new Ext.grid.GridPanel({
    ...
    store: myStore,
    bbar: new Ext.PagingToolbar({
        {@link #store}: myStore,       // grid and PagingToolbar using same store
        {@link #displayInfo}: true,
        {@link #pageSize}: myPageSize,
        {@link #prependButtons}: true,
        items: [
            'text 1'
        ]
    })
});
 * </code></pre>
 *
 * <p>To use paging, pass the paging requirements to the server when the store is first loaded.</p>
 * <pre><code>
store.load({
    params: {
        // specify params for the first page load if using paging
        start: 0,          
        limit: myPageSize,
        // other params
        foo:   'bar'
    }
});
 * </code></pre>
 * 
 * <p>If using {@link Ext.data.Store#autoLoad store's autoLoad} configuration:</p>
 * <pre><code>
var myStore = new Ext.data.Store({
    {@link Ext.data.Store#autoLoad autoLoad}: {params:{start: 0, limit: 25}},
    ...
});
 * </code></pre>
 * 
 * <p>The packet sent back from the server would have this form:</p>
 * <pre><code>
{
    "success": true,
    "results": 2000, 
    "rows": [ // <b>*Note:</b> this must be an Array 
        { "id":  1, "name": "Bill", "occupation": "Gardener" },
        { "id":  2, "name":  "Ben", "occupation": "Horticulturalist" },
        ...
        { "id": 25, "name":  "Sue", "occupation": "Botanist" }
    ]
}
 * </code></pre>
 * <p><u>Paging with Local Data</u></p>
 * <p>Paging can also be accomplished with local data using extensions:</p>
 * <div class="mdetail-params"><ul>
 * <li><a href="http://extjs.com/forum/showthread.php?t=71532">Ext.ux.data.PagingStore</a></li>
 * <li>Paging Memory Proxy (examples/ux/PagingMemoryProxy.js)</li>
 * </ul></div>
 * @constructor Create a new PagingToolbar
 * @param {Object} config The config object
 * @xtype paging
 */
(function() {

var T = Ext.Toolbar;

Ext.PagingToolbar = Ext.extend(Ext.Toolbar, {
    /**
     * @cfg {Ext.data.Store} store
     * The {@link Ext.data.Store} the paging toolbar should use as its data source (required).
     */
    /**
     * @cfg {Boolean} displayInfo
     * <tt>true</tt> to display the displayMsg (defaults to <tt>false</tt>)
     */
    /**
     * @cfg {Number} pageSize
     * The number of records to display per page (defaults to <tt>20</tt>)
     */
    pageSize : 20,
    /**
     * @cfg {Boolean} prependButtons
     * <tt>true</tt> to insert any configured <tt>items</tt> <i>before</i> the paging buttons.
     * Defaults to <tt>false</tt>.
     */
    /**
     * @cfg {String} displayMsg
     * The paging status message to display (defaults to <tt>'Displaying {0} - {1} of {2}'</tt>).
     * Note that this string is formatted using the braced numbers <tt>{0}-{2}</tt> as tokens
     * that are replaced by the values for start, end and total respectively. These tokens should
     * be preserved when overriding this string if showing those values is desired.
     */
    displayMsg : 'Displaying {0} - {1} of {2}',
    /**
     * @cfg {String} emptyMsg
     * The message to display when no records are found (defaults to 'No data to display')
     */
    emptyMsg : 'No data to display',
    /**
     * @cfg {String} beforePageText
     * The text displayed before the input item (defaults to <tt>'Page'</tt>).
     */
    beforePageText : 'Page',
    /**
     * @cfg {String} afterPageText
     * Customizable piece of the default paging text (defaults to <tt>'of {0}'</tt>). Note that
     * this string is formatted using <tt>{0}</tt> as a token that is replaced by the number of
     * total pages. This token should be preserved when overriding this string if showing the
     * total page count is desired.
     */
    afterPageText : 'of {0}',
    /**
     * @cfg {String} firstText
     * The quicktip text displayed for the first page button (defaults to <tt>'First Page'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    firstText : 'First Page',
    /**
     * @cfg {String} prevText
     * The quicktip text displayed for the previous page button (defaults to <tt>'Previous Page'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    prevText : 'Previous Page',
    /**
     * @cfg {String} nextText
     * The quicktip text displayed for the next page button (defaults to <tt>'Next Page'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    nextText : 'Next Page',
    /**
     * @cfg {String} lastText
     * The quicktip text displayed for the last page button (defaults to <tt>'Last Page'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    lastText : 'Last Page',
    /**
     * @cfg {String} refreshText
     * The quicktip text displayed for the Refresh button (defaults to <tt>'Refresh'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    refreshText : 'Refresh',

    /**
     * <p><b>Deprecated</b>. <code>paramNames</code> should be set in the <b>data store</b>
     * (see {@link Ext.data.Store#paramNames}).</p>
     * <br><p>Object mapping of parameter names used for load calls, initially set to:</p>
     * <pre>{start: 'start', limit: 'limit'}</pre>
     * @type Object
     * @property paramNames
     * @deprecated
     */

    /**
     * The number of records to display per page.  See also <tt>{@link #cursor}</tt>.
     * @type Number
     * @property pageSize
     */

    /**
     * Indicator for the record position.  This property might be used to get the active page
     * number for example:<pre><code>
     * // t is reference to the paging toolbar instance
     * var activePage = Math.ceil((t.cursor + t.pageSize) / t.pageSize);
     * </code></pre>
     * @type Number
     * @property cursor
     */

    initComponent : function(){
        var pagingItems = [this.first = new T.Button({
            tooltip: this.firstText,
            overflowText: this.firstText,
            iconCls: 'x-tbar-page-first',
            disabled: true,
            handler: this.moveFirst,
            scope: this
        }), this.prev = new T.Button({
            tooltip: this.prevText,
            overflowText: this.prevText,
            iconCls: 'x-tbar-page-prev',
            disabled: true,
            handler: this.movePrevious,
            scope: this
        }), '-', this.beforePageText,
        this.inputItem = new Ext.form.NumberField({
            cls: 'x-tbar-page-number',
            allowDecimals: false,
            allowNegative: false,
            enableKeyEvents: true,
            selectOnFocus: true,
            submitValue: false,
            listeners: {
                scope: this,
                keydown: this.onPagingKeyDown,
                blur: this.onPagingBlur
            }
        }), this.afterTextItem = new T.TextItem({
            text: String.format(this.afterPageText, 1)
        }), '-', this.next = new T.Button({
            tooltip: this.nextText,
            overflowText: this.nextText,
            iconCls: 'x-tbar-page-next',
            disabled: true,
            handler: this.moveNext,
            scope: this
        }), this.last = new T.Button({
            tooltip: this.lastText,
            overflowText: this.lastText,
            iconCls: 'x-tbar-page-last',
            disabled: true,
            handler: this.moveLast,
            scope: this
        }), '-', this.refresh = new T.Button({
            tooltip: this.refreshText,
            overflowText: this.refreshText,
            iconCls: 'x-tbar-loading',
            handler: this.doRefresh,
            scope: this
        })];


        var userItems = this.items || this.buttons || [];
        if (this.prependButtons) {
            this.items = userItems.concat(pagingItems);
        }else{
            this.items = pagingItems.concat(userItems);
        }
        delete this.buttons;
        if(this.displayInfo){
            this.items.push('->');
            this.items.push(this.displayItem = new T.TextItem({}));
        }
        Ext.PagingToolbar.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event change
             * Fires after the active page has been changed.
             * @param {Ext.PagingToolbar} this
             * @param {Object} pageData An object that has these properties:<ul>
             * <li><code>total</code> : Number <div class="sub-desc">The total number of records in the dataset as
             * returned by the server</div></li>
             * <li><code>activePage</code> : Number <div class="sub-desc">The current page number</div></li>
             * <li><code>pages</code> : Number <div class="sub-desc">The total number of pages (calculated from
             * the total number of records in the dataset as returned by the server and the current {@link #pageSize})</div></li>
             * </ul>
             */
            'change',
            /**
             * @event beforechange
             * Fires just before the active page is changed.
             * Return false to prevent the active page from being changed.
             * @param {Ext.PagingToolbar} this
             * @param {Object} params An object hash of the parameters which the PagingToolbar will send when
             * loading the required page. This will contain:<ul>
             * <li><code>start</code> : Number <div class="sub-desc">The starting row number for the next page of records to
             * be retrieved from the server</div></li>
             * <li><code>limit</code> : Number <div class="sub-desc">The number of records to be retrieved from the server</div></li>
             * </ul>
             * <p>(note: the names of the <b>start</b> and <b>limit</b> properties are determined
             * by the store's {@link Ext.data.Store#paramNames paramNames} property.)</p>
             * <p>Parameters may be added as required in the event handler.</p>
             */
            'beforechange'
        );
        this.on('afterlayout', this.onFirstLayout, this, {single: true});
        this.cursor = 0;
        this.bindStore(this.store, true);
    },

    // private
    onFirstLayout : function(){
        if(this.dsLoaded){
            this.onLoad.apply(this, this.dsLoaded);
        }
    },

    // private
    updateInfo : function(){
        if(this.displayItem){
            var count = this.store.getCount();
            var msg = count == 0 ?
                this.emptyMsg :
                String.format(
                    this.displayMsg,
                    this.cursor+1, this.cursor+count, this.store.getTotalCount()
                );
            this.displayItem.setText(msg);
        }
    },

    // private
    onLoad : function(store, r, o){
        if(!this.rendered){
            this.dsLoaded = [store, r, o];
            return;
        }
        var p = this.getParams();
        this.cursor = (o.params && o.params[p.start]) ? o.params[p.start] : 0;
        var d = this.getPageData(), ap = d.activePage, ps = d.pages;

        this.afterTextItem.setText(String.format(this.afterPageText, d.pages));
        this.inputItem.setValue(ap);
        this.first.setDisabled(ap == 1);
        this.prev.setDisabled(ap == 1);
        this.next.setDisabled(ap == ps);
        this.last.setDisabled(ap == ps);
        this.refresh.enable();
        this.updateInfo();
        this.fireEvent('change', this, d);
    },

    // private
    getPageData : function(){
        var total = this.store.getTotalCount();
        return {
            total : total,
            activePage : Math.ceil((this.cursor+this.pageSize)/this.pageSize),
            pages :  total < this.pageSize ? 1 : Math.ceil(total/this.pageSize)
        };
    },

    /**
     * Change the active page
     * @param {Integer} page The page to display
     */
    changePage : function(page){
        this.doLoad(((page-1) * this.pageSize).constrain(0, this.store.getTotalCount()));
    },

    // private
    onLoadError : function(){
        if(!this.rendered){
            return;
        }
        this.refresh.enable();
    },

    // private
    readPage : function(d){
        var v = this.inputItem.getValue(), pageNum;
        if (!v || isNaN(pageNum = parseInt(v, 10))) {
            this.inputItem.setValue(d.activePage);
            return false;
        }
        return pageNum;
    },

    onPagingFocus : function(){
        this.inputItem.select();
    },

    //private
    onPagingBlur : function(e){
        this.inputItem.setValue(this.getPageData().activePage);
    },

    // private
    onPagingKeyDown : function(field, e){
        var k = e.getKey(), d = this.getPageData(), pageNum;
        if (k == e.RETURN) {
            e.stopEvent();
            pageNum = this.readPage(d);
            if(pageNum !== false){
                pageNum = Math.min(Math.max(1, pageNum), d.pages) - 1;
                this.doLoad(pageNum * this.pageSize);
            }
        }else if (k == e.HOME || k == e.END){
            e.stopEvent();
            pageNum = k == e.HOME ? 1 : d.pages;
            field.setValue(pageNum);
        }else if (k == e.UP || k == e.PAGEUP || k == e.DOWN || k == e.PAGEDOWN){
            e.stopEvent();
            if((pageNum = this.readPage(d))){
                var increment = e.shiftKey ? 10 : 1;
                if(k == e.DOWN || k == e.PAGEDOWN){
                    increment *= -1;
                }
                pageNum += increment;
                if(pageNum >= 1 & pageNum <= d.pages){
                    field.setValue(pageNum);
                }
            }
        }
    },

    // private
    getParams : function(){
        //retain backwards compat, allow params on the toolbar itself, if they exist.
        return this.paramNames || this.store.paramNames;
    },

    // private
    beforeLoad : function(){
        if(this.rendered && this.refresh){
            this.refresh.disable();
        }
    },

    // private
    doLoad : function(start){
        var o = {}, pn = this.getParams();
        o[pn.start] = start;
        o[pn.limit] = this.pageSize;
        if(this.fireEvent('beforechange', this, o) !== false){
            this.store.load({params:o});
        }
    },

    /**
     * Move to the first page, has the same effect as clicking the 'first' button.
     */
    moveFirst : function(){
        this.doLoad(0);
    },

    /**
     * Move to the previous page, has the same effect as clicking the 'previous' button.
     */
    movePrevious : function(){
        this.doLoad(Math.max(0, this.cursor-this.pageSize));
    },

    /**
     * Move to the next page, has the same effect as clicking the 'next' button.
     */
    moveNext : function(){
        this.doLoad(this.cursor+this.pageSize);
    },

    /**
     * Move to the last page, has the same effect as clicking the 'last' button.
     */
    moveLast : function(){
        var total = this.store.getTotalCount(),
            extra = total % this.pageSize;

        this.doLoad(extra ? (total - extra) : total - this.pageSize);
    },

    /**
     * Refresh the current page, has the same effect as clicking the 'refresh' button.
     */
    doRefresh : function(){
        this.doLoad(this.cursor);
    },

    /**
     * Binds the paging toolbar to the specified {@link Ext.data.Store}
     * @param {Store} store The store to bind to this toolbar
     * @param {Boolean} initial (Optional) true to not remove listeners
     */
    bindStore : function(store, initial){
        var doLoad;
        if(!initial && this.store){
            if(store !== this.store && this.store.autoDestroy){
                this.store.destroy();
            }else{
                this.store.un('beforeload', this.beforeLoad, this);
                this.store.un('load', this.onLoad, this);
                this.store.un('exception', this.onLoadError, this);
            }
            if(!store){
                this.store = null;
            }
        }
        if(store){
            store = Ext.StoreMgr.lookup(store);
            store.on({
                scope: this,
                beforeload: this.beforeLoad,
                load: this.onLoad,
                exception: this.onLoadError
            });
            doLoad = true;
        }
        this.store = store;
        if(doLoad){
            this.onLoad(store, null, {});
        }
    },

    /**
     * Unbinds the paging toolbar from the specified {@link Ext.data.Store} <b>(deprecated)</b>
     * @param {Ext.data.Store} store The data store to unbind
     */
    unbind : function(store){
        this.bindStore(null);
    },

    /**
     * Binds the paging toolbar to the specified {@link Ext.data.Store} <b>(deprecated)</b>
     * @param {Ext.data.Store} store The data store to bind
     */
    bind : function(store){
        this.bindStore(store);
    },

    // private
    onDestroy : function(){
        this.bindStore(null);
        Ext.PagingToolbar.superclass.onDestroy.call(this);
    }
});

})();
Ext.reg('paging', Ext.PagingToolbar);