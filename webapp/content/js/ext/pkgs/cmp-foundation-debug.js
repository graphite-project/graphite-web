/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.ComponentMgr
 * <p>Provides a registry of all Components (instances of {@link Ext.Component} or any subclass
 * thereof) on a page so that they can be easily accessed by {@link Ext.Component component}
 * {@link Ext.Component#id id} (see {@link #get}, or the convenience method {@link Ext#getCmp Ext.getCmp}).</p>
 * <p>This object also provides a registry of available Component <i>classes</i>
 * indexed by a mnemonic code known as the Component's {@link Ext.Component#xtype xtype}.
 * The <code>{@link Ext.Component#xtype xtype}</code> provides a way to avoid instantiating child Components
 * when creating a full, nested config object for a complete Ext page.</p>
 * <p>A child Component may be specified simply as a <i>config object</i>
 * as long as the correct <code>{@link Ext.Component#xtype xtype}</code> is specified so that if and when the Component
 * needs rendering, the correct type can be looked up for lazy instantiation.</p>
 * <p>For a list of all available <code>{@link Ext.Component#xtype xtypes}</code>, see {@link Ext.Component}.</p>
 * @singleton
 */
Ext.ComponentMgr = function(){
    var all = new Ext.util.MixedCollection();
    var types = {};
    var ptypes = {};

    return {
        /**
         * Registers a component.
         * @param {Ext.Component} c The component
         */
        register : function(c){
            all.add(c);
        },

        /**
         * Unregisters a component.
         * @param {Ext.Component} c The component
         */
        unregister : function(c){
            all.remove(c);
        },

        /**
         * Returns a component by {@link Ext.Component#id id}.
         * For additional details see {@link Ext.util.MixedCollection#get}.
         * @param {String} id The component {@link Ext.Component#id id}
         * @return Ext.Component The Component, <code>undefined</code> if not found, or <code>null</code> if a
         * Class was found.
         */
        get : function(id){
            return all.get(id);
        },

        /**
         * Registers a function that will be called when a Component with the specified id is added to ComponentMgr. This will happen on instantiation.
         * @param {String} id The component {@link Ext.Component#id id}
         * @param {Function} fn The callback function
         * @param {Object} scope The scope (<code>this</code> reference) in which the callback is executed. Defaults to the Component.
         */
        onAvailable : function(id, fn, scope){
            all.on("add", function(index, o){
                if(o.id == id){
                    fn.call(scope || o, o);
                    all.un("add", fn, scope);
                }
            });
        },

        /**
         * The MixedCollection used internally for the component cache. An example usage may be subscribing to
         * events on the MixedCollection to monitor addition or removal.  Read-only.
         * @type {MixedCollection}
         */
        all : all,
        
        /**
         * The xtypes that have been registered with the component manager.
         * @type {Object}
         */
        types : types,
        
        /**
         * The ptypes that have been registered with the component manager.
         * @type {Object}
         */
        ptypes: ptypes,
        
        /**
         * Checks if a Component type is registered.
         * @param {Ext.Component} xtype The mnemonic string by which the Component class may be looked up
         * @return {Boolean} Whether the type is registered.
         */
        isRegistered : function(xtype){
            return types[xtype] !== undefined;    
        },
        
        /**
         * Checks if a Plugin type is registered.
         * @param {Ext.Component} ptype The mnemonic string by which the Plugin class may be looked up
         * @return {Boolean} Whether the type is registered.
         */
        isPluginRegistered : function(ptype){
            return ptypes[ptype] !== undefined;    
        },        

        /**
         * <p>Registers a new Component constructor, keyed by a new
         * {@link Ext.Component#xtype}.</p>
         * <p>Use this method (or its alias {@link Ext#reg Ext.reg}) to register new
         * subclasses of {@link Ext.Component} so that lazy instantiation may be used when specifying
         * child Components.
         * see {@link Ext.Container#items}</p>
         * @param {String} xtype The mnemonic string by which the Component class may be looked up.
         * @param {Constructor} cls The new Component class.
         */
        registerType : function(xtype, cls){
            types[xtype] = cls;
            cls.xtype = xtype;
        },

        /**
         * Creates a new Component from the specified config object using the
         * config object's {@link Ext.component#xtype xtype} to determine the class to instantiate.
         * @param {Object} config A configuration object for the Component you wish to create.
         * @param {Constructor} defaultType The constructor to provide the default Component type if
         * the config object does not contain a <code>xtype</code>. (Optional if the config contains a <code>xtype</code>).
         * @return {Ext.Component} The newly instantiated Component.
         */
        create : function(config, defaultType){
            return config.render ? config : new types[config.xtype || defaultType](config);
        },

        /**
         * <p>Registers a new Plugin constructor, keyed by a new
         * {@link Ext.Component#ptype}.</p>
         * <p>Use this method (or its alias {@link Ext#preg Ext.preg}) to register new
         * plugins for {@link Ext.Component}s so that lazy instantiation may be used when specifying
         * Plugins.</p>
         * @param {String} ptype The mnemonic string by which the Plugin class may be looked up.
         * @param {Constructor} cls The new Plugin class.
         */
        registerPlugin : function(ptype, cls){
            ptypes[ptype] = cls;
            cls.ptype = ptype;
        },

        /**
         * Creates a new Plugin from the specified config object using the
         * config object's {@link Ext.component#ptype ptype} to determine the class to instantiate.
         * @param {Object} config A configuration object for the Plugin you wish to create.
         * @param {Constructor} defaultType The constructor to provide the default Plugin type if
         * the config object does not contain a <code>ptype</code>. (Optional if the config contains a <code>ptype</code>).
         * @return {Ext.Component} The newly instantiated Plugin.
         */
        createPlugin : function(config, defaultType){
            var PluginCls = ptypes[config.ptype || defaultType];
            if (PluginCls.init) {
                return PluginCls;                
            } else {
                return new PluginCls(config);
            }            
        }
    };
}();

/**
 * Shorthand for {@link Ext.ComponentMgr#registerType}
 * @param {String} xtype The {@link Ext.component#xtype mnemonic string} by which the Component class
 * may be looked up.
 * @param {Constructor} cls The new Component class.
 * @member Ext
 * @method reg
 */
Ext.reg = Ext.ComponentMgr.registerType; // this will be called a lot internally, shorthand to keep the bytes down
/**
 * Shorthand for {@link Ext.ComponentMgr#registerPlugin}
 * @param {String} ptype The {@link Ext.component#ptype mnemonic string} by which the Plugin class
 * may be looked up.
 * @param {Constructor} cls The new Plugin class.
 * @member Ext
 * @method preg
 */
Ext.preg = Ext.ComponentMgr.registerPlugin;
/**
 * Shorthand for {@link Ext.ComponentMgr#create}
 * Creates a new Component from the specified config object using the
 * config object's {@link Ext.component#xtype xtype} to determine the class to instantiate.
 * @param {Object} config A configuration object for the Component you wish to create.
 * @param {Constructor} defaultType The constructor to provide the default Component type if
 * the config object does not contain a <code>xtype</code>. (Optional if the config contains a <code>xtype</code>).
 * @return {Ext.Component} The newly instantiated Component.
 * @member Ext
 * @method create
 */
Ext.create = Ext.ComponentMgr.create;/**
 * @class Ext.Component
 * @extends Ext.util.Observable
 * <p>Base class for all Ext components.  All subclasses of Component may participate in the automated
 * Ext component lifecycle of creation, rendering and destruction which is provided by the {@link Ext.Container Container} class.
 * Components may be added to a Container through the {@link Ext.Container#items items} config option at the time the Container is created,
 * or they may be added dynamically via the {@link Ext.Container#add add} method.</p>
 * <p>The Component base class has built-in support for basic hide/show and enable/disable behavior.</p>
 * <p>All Components are registered with the {@link Ext.ComponentMgr} on construction so that they can be referenced at any time via
 * {@link Ext#getCmp}, passing the {@link #id}.</p>
 * <p>All user-developed visual widgets that are required to participate in automated lifecycle and size management should subclass Component (or
 * {@link Ext.BoxComponent} if managed box model handling is required, ie height and width management).</p>
 * <p>See the <a href="http://extjs.com/learn/Tutorial:Creating_new_UI_controls">Creating new UI controls</a> tutorial for details on how
 * and to either extend or augment ExtJs base classes to create custom Components.</p>
 * <p>Every component has a specific xtype, which is its Ext-specific type name, along with methods for checking the
 * xtype like {@link #getXType} and {@link #isXType}. This is the list of all valid xtypes:</p>
 * <pre>
xtype            Class
-------------    ------------------
box              {@link Ext.BoxComponent}
button           {@link Ext.Button}
buttongroup      {@link Ext.ButtonGroup}
colorpalette     {@link Ext.ColorPalette}
component        {@link Ext.Component}
container        {@link Ext.Container}
cycle            {@link Ext.CycleButton}
dataview         {@link Ext.DataView}
datepicker       {@link Ext.DatePicker}
editor           {@link Ext.Editor}
editorgrid       {@link Ext.grid.EditorGridPanel}
flash            {@link Ext.FlashComponent}
grid             {@link Ext.grid.GridPanel}
listview         {@link Ext.ListView}
multislider      {@link Ext.slider.MultiSlider}
panel            {@link Ext.Panel}
progress         {@link Ext.ProgressBar}
propertygrid     {@link Ext.grid.PropertyGrid}
slider           {@link Ext.slider.SingleSlider}
spacer           {@link Ext.Spacer}
splitbutton      {@link Ext.SplitButton}
tabpanel         {@link Ext.TabPanel}
treepanel        {@link Ext.tree.TreePanel}
viewport         {@link Ext.ViewPort}
window           {@link Ext.Window}

Toolbar components
---------------------------------------
paging           {@link Ext.PagingToolbar}
toolbar          {@link Ext.Toolbar}
tbbutton         {@link Ext.Toolbar.Button}        (deprecated; use button)
tbfill           {@link Ext.Toolbar.Fill}
tbitem           {@link Ext.Toolbar.Item}
tbseparator      {@link Ext.Toolbar.Separator}
tbspacer         {@link Ext.Toolbar.Spacer}
tbsplit          {@link Ext.Toolbar.SplitButton}   (deprecated; use splitbutton)
tbtext           {@link Ext.Toolbar.TextItem}

Menu components
---------------------------------------
menu             {@link Ext.menu.Menu}
colormenu        {@link Ext.menu.ColorMenu}
datemenu         {@link Ext.menu.DateMenu}
menubaseitem     {@link Ext.menu.BaseItem}
menucheckitem    {@link Ext.menu.CheckItem}
menuitem         {@link Ext.menu.Item}
menuseparator    {@link Ext.menu.Separator}
menutextitem     {@link Ext.menu.TextItem}

Form components
---------------------------------------
form             {@link Ext.form.FormPanel}
checkbox         {@link Ext.form.Checkbox}
checkboxgroup    {@link Ext.form.CheckboxGroup}
combo            {@link Ext.form.ComboBox}
compositefield   {@link Ext.form.CompositeField}
datefield        {@link Ext.form.DateField}
displayfield     {@link Ext.form.DisplayField}
field            {@link Ext.form.Field}
fieldset         {@link Ext.form.FieldSet}
hidden           {@link Ext.form.Hidden}
htmleditor       {@link Ext.form.HtmlEditor}
label            {@link Ext.form.Label}
numberfield      {@link Ext.form.NumberField}
radio            {@link Ext.form.Radio}
radiogroup       {@link Ext.form.RadioGroup}
textarea         {@link Ext.form.TextArea}
textfield        {@link Ext.form.TextField}
timefield        {@link Ext.form.TimeField}
trigger          {@link Ext.form.TriggerField}

Chart components
---------------------------------------
chart            {@link Ext.chart.Chart}
barchart         {@link Ext.chart.BarChart}
cartesianchart   {@link Ext.chart.CartesianChart}
columnchart      {@link Ext.chart.ColumnChart}
linechart        {@link Ext.chart.LineChart}
piechart         {@link Ext.chart.PieChart}

Store xtypes
---------------------------------------
arraystore       {@link Ext.data.ArrayStore}
directstore      {@link Ext.data.DirectStore}
groupingstore    {@link Ext.data.GroupingStore}
jsonstore        {@link Ext.data.JsonStore}
simplestore      {@link Ext.data.SimpleStore}      (deprecated; use arraystore)
store            {@link Ext.data.Store}
xmlstore         {@link Ext.data.XmlStore}
</pre>
 * @constructor
 * @param {Ext.Element/String/Object} config The configuration options may be specified as either:
 * <div class="mdetail-params"><ul>
 * <li><b>an element</b> :
 * <p class="sub-desc">it is set as the internal element and its id used as the component id</p></li>
 * <li><b>a string</b> :
 * <p class="sub-desc">it is assumed to be the id of an existing element and is used as the component id</p></li>
 * <li><b>anything else</b> :
 * <p class="sub-desc">it is assumed to be a standard config object and is applied to the component</p></li>
 * </ul></div>
 */
Ext.Component = function(config){
    config = config || {};
    if(config.initialConfig){
        if(config.isAction){           // actions
            this.baseAction = config;
        }
        config = config.initialConfig; // component cloning / action set up
    }else if(config.tagName || config.dom || Ext.isString(config)){ // element object
        config = {applyTo: config, id: config.id || config};
    }

    /**
     * This Component's initial configuration specification. Read-only.
     * @type Object
     * @property initialConfig
     */
    this.initialConfig = config;

    Ext.apply(this, config);
    this.addEvents(
        /**
         * @event added
         * Fires when a component is added to an Ext.Container
         * @param {Ext.Component} this
         * @param {Ext.Container} ownerCt Container which holds the component
         * @param {number} index Position at which the component was added
         */
        'added',
        /**
         * @event disable
         * Fires after the component is disabled.
         * @param {Ext.Component} this
         */
        'disable',
        /**
         * @event enable
         * Fires after the component is enabled.
         * @param {Ext.Component} this
         */
        'enable',
        /**
         * @event beforeshow
         * Fires before the component is shown by calling the {@link #show} method.
         * Return false from an event handler to stop the show.
         * @param {Ext.Component} this
         */
        'beforeshow',
        /**
         * @event show
         * Fires after the component is shown when calling the {@link #show} method.
         * @param {Ext.Component} this
         */
        'show',
        /**
         * @event beforehide
         * Fires before the component is hidden by calling the {@link #hide} method.
         * Return false from an event handler to stop the hide.
         * @param {Ext.Component} this
         */
        'beforehide',
        /**
         * @event hide
         * Fires after the component is hidden.
         * Fires after the component is hidden when calling the {@link #hide} method.
         * @param {Ext.Component} this
         */
        'hide',
        /**
         * @event removed
         * Fires when a component is removed from an Ext.Container
         * @param {Ext.Component} this
         * @param {Ext.Container} ownerCt Container which holds the component
         */
        'removed',
        /**
         * @event beforerender
         * Fires before the component is {@link #rendered}. Return false from an
         * event handler to stop the {@link #render}.
         * @param {Ext.Component} this
         */
        'beforerender',
        /**
         * @event render
         * Fires after the component markup is {@link #rendered}.
         * @param {Ext.Component} this
         */
        'render',
        /**
         * @event afterrender
         * <p>Fires after the component rendering is finished.</p>
         * <p>The afterrender event is fired after this Component has been {@link #rendered}, been postprocesed
         * by any afterRender method defined for the Component, and, if {@link #stateful}, after state
         * has been restored.</p>
         * @param {Ext.Component} this
         */
        'afterrender',
        /**
         * @event beforedestroy
         * Fires before the component is {@link #destroy}ed. Return false from an event handler to stop the {@link #destroy}.
         * @param {Ext.Component} this
         */
        'beforedestroy',
        /**
         * @event destroy
         * Fires after the component is {@link #destroy}ed.
         * @param {Ext.Component} this
         */
        'destroy',
        /**
         * @event beforestaterestore
         * Fires before the state of the component is restored. Return false from an event handler to stop the restore.
         * @param {Ext.Component} this
         * @param {Object} state The hash of state values returned from the StateProvider. If this
         * event is not vetoed, then the state object is passed to <b><tt>applyState</tt></b>. By default,
         * that simply copies property values into this Component. The method maybe overriden to
         * provide custom state restoration.
         */
        'beforestaterestore',
        /**
         * @event staterestore
         * Fires after the state of the component is restored.
         * @param {Ext.Component} this
         * @param {Object} state The hash of state values returned from the StateProvider. This is passed
         * to <b><tt>applyState</tt></b>. By default, that simply copies property values into this
         * Component. The method maybe overriden to provide custom state restoration.
         */
        'staterestore',
        /**
         * @event beforestatesave
         * Fires before the state of the component is saved to the configured state provider. Return false to stop the save.
         * @param {Ext.Component} this
         * @param {Object} state The hash of state values. This is determined by calling
         * <b><tt>getState()</tt></b> on the Component. This method must be provided by the
         * developer to return whetever representation of state is required, by default, Ext.Component
         * has a null implementation.
         */
        'beforestatesave',
        /**
         * @event statesave
         * Fires after the state of the component is saved to the configured state provider.
         * @param {Ext.Component} this
         * @param {Object} state The hash of state values. This is determined by calling
         * <b><tt>getState()</tt></b> on the Component. This method must be provided by the
         * developer to return whetever representation of state is required, by default, Ext.Component
         * has a null implementation.
         */
        'statesave'
    );
    this.getId();
    Ext.ComponentMgr.register(this);
    Ext.Component.superclass.constructor.call(this);

    if(this.baseAction){
        this.baseAction.addComponent(this);
    }

    this.initComponent();

    if(this.plugins){
        if(Ext.isArray(this.plugins)){
            for(var i = 0, len = this.plugins.length; i < len; i++){
                this.plugins[i] = this.initPlugin(this.plugins[i]);
            }
        }else{
            this.plugins = this.initPlugin(this.plugins);
        }
    }

    if(this.stateful !== false){
        this.initState();
    }

    if(this.applyTo){
        this.applyToMarkup(this.applyTo);
        delete this.applyTo;
    }else if(this.renderTo){
        this.render(this.renderTo);
        delete this.renderTo;
    }
};

// private
Ext.Component.AUTO_ID = 1000;

Ext.extend(Ext.Component, Ext.util.Observable, {
    // Configs below are used for all Components when rendered by FormLayout.
    /**
     * @cfg {String} fieldLabel <p>The label text to display next to this Component (defaults to '').</p>
     * <br><p><b>Note</b>: this config is only used when this Component is rendered by a Container which
     * has been configured to use the <b>{@link Ext.layout.FormLayout FormLayout}</b> layout manager (e.g.
     * {@link Ext.form.FormPanel} or specifying <tt>layout:'form'</tt>).</p><br>
     * <p>Also see <tt>{@link #hideLabel}</tt> and
     * {@link Ext.layout.FormLayout}.{@link Ext.layout.FormLayout#fieldTpl fieldTpl}.</p>
     * Example use:<pre><code>
new Ext.FormPanel({
    height: 100,
    renderTo: Ext.getBody(),
    items: [{
        xtype: 'textfield',
        fieldLabel: 'Name'
    }]
});
</code></pre>
     */
    /**
     * @cfg {String} labelStyle <p>A CSS style specification string to apply directly to this field's
     * label.  Defaults to the container's labelStyle value if set (e.g.,
     * <tt>{@link Ext.layout.FormLayout#labelStyle}</tt> , or '').</p>
     * <br><p><b>Note</b>: see the note for <code>{@link #clearCls}</code>.</p><br>
     * <p>Also see <code>{@link #hideLabel}</code> and
     * <code>{@link Ext.layout.FormLayout}.{@link Ext.layout.FormLayout#fieldTpl fieldTpl}.</code></p>
     * Example use:<pre><code>
new Ext.FormPanel({
    height: 100,
    renderTo: Ext.getBody(),
    items: [{
        xtype: 'textfield',
        fieldLabel: 'Name',
        labelStyle: 'font-weight:bold;'
    }]
});
</code></pre>
     */
    /**
     * @cfg {String} labelSeparator <p>The separator to display after the text of each
     * <tt>{@link #fieldLabel}</tt>.  This property may be configured at various levels.
     * The order of precedence is:
     * <div class="mdetail-params"><ul>
     * <li>field / component level</li>
     * <li>container level</li>
     * <li>{@link Ext.layout.FormLayout#labelSeparator layout level} (defaults to colon <tt>':'</tt>)</li>
     * </ul></div>
     * To display no separator for this field's label specify empty string ''.</p>
     * <br><p><b>Note</b>: see the note for <tt>{@link #clearCls}</tt>.</p><br>
     * <p>Also see <tt>{@link #hideLabel}</tt> and
     * {@link Ext.layout.FormLayout}.{@link Ext.layout.FormLayout#fieldTpl fieldTpl}.</p>
     * Example use:<pre><code>
new Ext.FormPanel({
    height: 100,
    renderTo: Ext.getBody(),
    layoutConfig: {
        labelSeparator: '~'   // layout config has lowest priority (defaults to ':')
    },
    {@link Ext.layout.FormLayout#labelSeparator labelSeparator}: '>>',     // config at container level
    items: [{
        xtype: 'textfield',
        fieldLabel: 'Field 1',
        labelSeparator: '...' // field/component level config supersedes others
    },{
        xtype: 'textfield',
        fieldLabel: 'Field 2' // labelSeparator will be '='
    }]
});
</code></pre>
     */
    /**
     * @cfg {Boolean} hideLabel <p><tt>true</tt> to completely hide the label element
     * ({@link #fieldLabel label} and {@link #labelSeparator separator}). Defaults to <tt>false</tt>.
     * By default, even if you do not specify a <tt>{@link #fieldLabel}</tt> the space will still be
     * reserved so that the field will line up with other fields that do have labels.
     * Setting this to <tt>true</tt> will cause the field to not reserve that space.</p>
     * <br><p><b>Note</b>: see the note for <tt>{@link #clearCls}</tt>.</p><br>
     * Example use:<pre><code>
new Ext.FormPanel({
    height: 100,
    renderTo: Ext.getBody(),
    items: [{
        xtype: 'textfield'
        hideLabel: true
    }]
});
</code></pre>
     */
    /**
     * @cfg {String} clearCls <p>The CSS class used to to apply to the special clearing div rendered
     * directly after each form field wrapper to provide field clearing (defaults to
     * <tt>'x-form-clear-left'</tt>).</p>
     * <br><p><b>Note</b>: this config is only used when this Component is rendered by a Container
     * which has been configured to use the <b>{@link Ext.layout.FormLayout FormLayout}</b> layout
     * manager (e.g. {@link Ext.form.FormPanel} or specifying <tt>layout:'form'</tt>) and either a
     * <tt>{@link #fieldLabel}</tt> is specified or <tt>isFormField=true</tt> is specified.</p><br>
     * <p>See {@link Ext.layout.FormLayout}.{@link Ext.layout.FormLayout#fieldTpl fieldTpl} also.</p>
     */
    /**
     * @cfg {String} itemCls
     * <p><b>Note</b>: this config is only used when this Component is rendered by a Container which
     * has been configured to use the <b>{@link Ext.layout.FormLayout FormLayout}</b> layout manager (e.g.
     * {@link Ext.form.FormPanel} or specifying <tt>layout:'form'</tt>).</p><br>
     * <p>An additional CSS class to apply to the div wrapping the form item
     * element of this field.  If supplied, <tt>itemCls</tt> at the <b>field</b> level will override
     * the default <tt>itemCls</tt> supplied at the <b>container</b> level. The value specified for
     * <tt>itemCls</tt> will be added to the default class (<tt>'x-form-item'</tt>).</p>
     * <p>Since it is applied to the item wrapper (see
     * {@link Ext.layout.FormLayout}.{@link Ext.layout.FormLayout#fieldTpl fieldTpl}), it allows
     * you to write standard CSS rules that can apply to the field, the label (if specified), or
     * any other element within the markup for the field.</p>
     * <br><p><b>Note</b>: see the note for <tt>{@link #fieldLabel}</tt>.</p><br>
     * Example use:<pre><code>
// Apply a style to the field&#39;s label:
&lt;style>
    .required .x-form-item-label {font-weight:bold;color:red;}
&lt;/style>

new Ext.FormPanel({
    height: 100,
    renderTo: Ext.getBody(),
    items: [{
        xtype: 'textfield',
        fieldLabel: 'Name',
        itemCls: 'required' //this label will be styled
    },{
        xtype: 'textfield',
        fieldLabel: 'Favorite Color'
    }]
});
</code></pre>
     */

    /**
     * @cfg {String} id
     * <p>The <b>unique</b> id of this component (defaults to an {@link #getId auto-assigned id}).
     * You should assign an id if you need to be able to access the component later and you do
     * not have an object reference available (e.g., using {@link Ext}.{@link Ext#getCmp getCmp}).</p>
     * <p>Note that this id will also be used as the element id for the containing HTML element
     * that is rendered to the page for this component. This allows you to write id-based CSS
     * rules to style the specific instance of this component uniquely, and also to select
     * sub-elements using this component's id as the parent.</p>
     * <p><b>Note</b>: to avoid complications imposed by a unique <tt>id</tt> also see
     * <code>{@link #itemId}</code> and <code>{@link #ref}</code>.</p>
     * <p><b>Note</b>: to access the container of an item see <code>{@link #ownerCt}</code>.</p>
     */
    /**
     * @cfg {String} itemId
     * <p>An <tt>itemId</tt> can be used as an alternative way to get a reference to a component
     * when no object reference is available.  Instead of using an <code>{@link #id}</code> with
     * {@link Ext}.{@link Ext#getCmp getCmp}, use <code>itemId</code> with
     * {@link Ext.Container}.{@link Ext.Container#getComponent getComponent} which will retrieve
     * <code>itemId</code>'s or <tt>{@link #id}</tt>'s. Since <code>itemId</code>'s are an index to the
     * container's internal MixedCollection, the <code>itemId</code> is scoped locally to the container --
     * avoiding potential conflicts with {@link Ext.ComponentMgr} which requires a <b>unique</b>
     * <code>{@link #id}</code>.</p>
     * <pre><code>
var c = new Ext.Panel({ //
    {@link Ext.BoxComponent#height height}: 300,
    {@link #renderTo}: document.body,
    {@link Ext.Container#layout layout}: 'auto',
    {@link Ext.Container#items items}: [
        {
            itemId: 'p1',
            {@link Ext.Panel#title title}: 'Panel 1',
            {@link Ext.BoxComponent#height height}: 150
        },
        {
            itemId: 'p2',
            {@link Ext.Panel#title title}: 'Panel 2',
            {@link Ext.BoxComponent#height height}: 150
        }
    ]
})
p1 = c.{@link Ext.Container#getComponent getComponent}('p1'); // not the same as {@link Ext#getCmp Ext.getCmp()}
p2 = p1.{@link #ownerCt}.{@link Ext.Container#getComponent getComponent}('p2'); // reference via a sibling
     * </code></pre>
     * <p>Also see <tt>{@link #id}</tt> and <code>{@link #ref}</code>.</p>
     * <p><b>Note</b>: to access the container of an item see <tt>{@link #ownerCt}</tt>.</p>
     */
    /**
     * @cfg {String} xtype
     * The registered <tt>xtype</tt> to create. This config option is not used when passing
     * a config object into a constructor. This config option is used only when
     * lazy instantiation is being used, and a child item of a Container is being
     * specified not as a fully instantiated Component, but as a <i>Component config
     * object</i>. The <tt>xtype</tt> will be looked up at render time up to determine what
     * type of child Component to create.<br><br>
     * The predefined xtypes are listed {@link Ext.Component here}.
     * <br><br>
     * If you subclass Components to create your own Components, you may register
     * them using {@link Ext.ComponentMgr#registerType} in order to be able to
     * take advantage of lazy instantiation and rendering.
     */
    /**
     * @cfg {String} ptype
     * The registered <tt>ptype</tt> to create. This config option is not used when passing
     * a config object into a constructor. This config option is used only when
     * lazy instantiation is being used, and a Plugin is being
     * specified not as a fully instantiated Component, but as a <i>Component config
     * object</i>. The <tt>ptype</tt> will be looked up at render time up to determine what
     * type of Plugin to create.<br><br>
     * If you create your own Plugins, you may register them using
     * {@link Ext.ComponentMgr#registerPlugin} in order to be able to
     * take advantage of lazy instantiation and rendering.
     */
    /**
     * @cfg {String} cls
     * An optional extra CSS class that will be added to this component's Element (defaults to '').  This can be
     * useful for adding customized styles to the component or any of its children using standard CSS rules.
     */
    /**
     * @cfg {String} overCls
     * An optional extra CSS class that will be added to this component's Element when the mouse moves
     * over the Element, and removed when the mouse moves out. (defaults to '').  This can be
     * useful for adding customized 'active' or 'hover' styles to the component or any of its children using standard CSS rules.
     */
    /**
     * @cfg {String} style
     * A custom style specification to be applied to this component's Element.  Should be a valid argument to
     * {@link Ext.Element#applyStyles}.
     * <pre><code>
new Ext.Panel({
    title: 'Some Title',
    renderTo: Ext.getBody(),
    width: 400, height: 300,
    layout: 'form',
    items: [{
        xtype: 'textarea',
        style: {
            width: '95%',
            marginBottom: '10px'
        }
    },
        new Ext.Button({
            text: 'Send',
            minWidth: '100',
            style: {
                marginBottom: '10px'
            }
        })
    ]
});
     * </code></pre>
     */
    /**
     * @cfg {String} ctCls
     * <p>An optional extra CSS class that will be added to this component's container. This can be useful for
     * adding customized styles to the container or any of its children using standard CSS rules.  See
     * {@link Ext.layout.ContainerLayout}.{@link Ext.layout.ContainerLayout#extraCls extraCls} also.</p>
     * <p><b>Note</b>: <tt>ctCls</tt> defaults to <tt>''</tt> except for the following class
     * which assigns a value by default:
     * <div class="mdetail-params"><ul>
     * <li>{@link Ext.layout.Box Box Layout} : <tt>'x-box-layout-ct'</tt></li>
     * </ul></div>
     * To configure the above Class with an extra CSS class append to the default.  For example,
     * for BoxLayout (Hbox and Vbox):<pre><code>
     * ctCls: 'x-box-layout-ct custom-class'
     * </code></pre>
     * </p>
     */
    /**
     * @cfg {Boolean} disabled
     * Render this component disabled (default is false).
     */
    disabled : false,
    /**
     * @cfg {Boolean} hidden
     * Render this component hidden (default is false). If <tt>true</tt>, the
     * {@link #hide} method will be called internally.
     */
    hidden : false,
    /**
     * @cfg {Object/Array} plugins
     * An object or array of objects that will provide custom functionality for this component.  The only
     * requirement for a valid plugin is that it contain an init method that accepts a reference of type Ext.Component.
     * When a component is created, if any plugins are available, the component will call the init method on each
     * plugin, passing a reference to itself.  Each plugin can then call methods or respond to events on the
     * component as needed to provide its functionality.
     */
    /**
     * @cfg {Mixed} applyTo
     * <p>Specify the id of the element, a DOM element or an existing Element corresponding to a DIV
     * that is already present in the document that specifies some structural markup for this
     * component.</p><div><ul>
     * <li><b>Description</b> : <ul>
     * <div class="sub-desc">When <tt>applyTo</tt> is used, constituent parts of the component can also be specified
     * by id or CSS class name within the main element, and the component being created may attempt
     * to create its subcomponents from that markup if applicable.</div>
     * </ul></li>
     * <li><b>Notes</b> : <ul>
     * <div class="sub-desc">When using this config, a call to render() is not required.</div>
     * <div class="sub-desc">If applyTo is specified, any value passed for {@link #renderTo} will be ignored and the target
     * element's parent node will automatically be used as the component's container.</div>
     * </ul></li>
     * </ul></div>
     */
    /**
     * @cfg {Mixed} renderTo
     * <p>Specify the id of the element, a DOM element or an existing Element that this component
     * will be rendered into.</p><div><ul>
     * <li><b>Notes</b> : <ul>
     * <div class="sub-desc">Do <u>not</u> use this option if the Component is to be a child item of
     * a {@link Ext.Container Container}. It is the responsibility of the
     * {@link Ext.Container Container}'s {@link Ext.Container#layout layout manager}
     * to render and manage its child items.</div>
     * <div class="sub-desc">When using this config, a call to render() is not required.</div>
     * </ul></li>
     * </ul></div>
     * <p>See <tt>{@link #render}</tt> also.</p>
     */
    /**
     * @cfg {Boolean} stateful
     * <p>A flag which causes the Component to attempt to restore the state of
     * internal properties from a saved state on startup. The component must have
     * either a <code>{@link #stateId}</code> or <code>{@link #id}</code> assigned
     * for state to be managed. Auto-generated ids are not guaranteed to be stable
     * across page loads and cannot be relied upon to save and restore the same
     * state for a component.<p>
     * <p>For state saving to work, the state manager's provider must have been
     * set to an implementation of {@link Ext.state.Provider} which overrides the
     * {@link Ext.state.Provider#set set} and {@link Ext.state.Provider#get get}
     * methods to save and recall name/value pairs. A built-in implementation,
     * {@link Ext.state.CookieProvider} is available.</p>
     * <p>To set the state provider for the current page:</p>
     * <pre><code>
Ext.state.Manager.setProvider(new Ext.state.CookieProvider({
    expires: new Date(new Date().getTime()+(1000*60*60*24*7)), //7 days from now
}));
     * </code></pre>
     * <p>A stateful Component attempts to save state when one of the events
     * listed in the <code>{@link #stateEvents}</code> configuration fires.</p>
     * <p>To save state, a stateful Component first serializes its state by
     * calling <b><code>getState</code></b>. By default, this function does
     * nothing. The developer must provide an implementation which returns an
     * object hash which represents the Component's restorable state.</p>
     * <p>The value yielded by getState is passed to {@link Ext.state.Manager#set}
     * which uses the configured {@link Ext.state.Provider} to save the object
     * keyed by the Component's <code>{@link stateId}</code>, or, if that is not
     * specified, its <code>{@link #id}</code>.</p>
     * <p>During construction, a stateful Component attempts to <i>restore</i>
     * its state by calling {@link Ext.state.Manager#get} passing the
     * <code>{@link #stateId}</code>, or, if that is not specified, the
     * <code>{@link #id}</code>.</p>
     * <p>The resulting object is passed to <b><code>applyState</code></b>.
     * The default implementation of <code>applyState</code> simply copies
     * properties into the object, but a developer may override this to support
     * more behaviour.</p>
     * <p>You can perform extra processing on state save and restore by attaching
     * handlers to the {@link #beforestaterestore}, {@link #staterestore},
     * {@link #beforestatesave} and {@link #statesave} events.</p>
     */
    /**
     * @cfg {String} stateId
     * The unique id for this component to use for state management purposes
     * (defaults to the component id if one was set, otherwise null if the
     * component is using a generated id).
     * <p>See <code>{@link #stateful}</code> for an explanation of saving and
     * restoring Component state.</p>
     */
    /**
     * @cfg {Array} stateEvents
     * <p>An array of events that, when fired, should trigger this component to
     * save its state (defaults to none). <code>stateEvents</code> may be any type
     * of event supported by this component, including browser or custom events
     * (e.g., <tt>['click', 'customerchange']</tt>).</p>
     * <p>See <code>{@link #stateful}</code> for an explanation of saving and
     * restoring Component state.</p>
     */
    /**
     * @cfg {Mixed} autoEl
     * <p>A tag name or {@link Ext.DomHelper DomHelper} spec used to create the {@link #getEl Element} which will
     * encapsulate this Component.</p>
     * <p>You do not normally need to specify this. For the base classes {@link Ext.Component}, {@link Ext.BoxComponent},
     * and {@link Ext.Container}, this defaults to <b><tt>'div'</tt></b>. The more complex Ext classes use a more complex
     * DOM structure created by their own onRender methods.</p>
     * <p>This is intended to allow the developer to create application-specific utility Components encapsulated by
     * different DOM elements. Example usage:</p><pre><code>
{
    xtype: 'box',
    autoEl: {
        tag: 'img',
        src: 'http://www.example.com/example.jpg'
    }
}, {
    xtype: 'box',
    autoEl: {
        tag: 'blockquote',
        html: 'autoEl is cool!'
    }
}, {
    xtype: 'container',
    autoEl: 'ul',
    cls: 'ux-unordered-list',
    items: {
        xtype: 'box',
        autoEl: 'li',
        html: 'First list item'
    }
}
</code></pre>
     */
    autoEl : 'div',

    /**
     * @cfg {String} disabledClass
     * CSS class added to the component when it is disabled (defaults to 'x-item-disabled').
     */
    disabledClass : 'x-item-disabled',
    /**
     * @cfg {Boolean} allowDomMove
     * Whether the component can move the Dom node when rendering (defaults to true).
     */
    allowDomMove : true,
    /**
     * @cfg {Boolean} autoShow
     * True if the component should check for hidden classes (e.g. 'x-hidden' or 'x-hide-display') and remove
     * them on render (defaults to false).
     */
    autoShow : false,
    /**
     * @cfg {String} hideMode
     * <p>How this component should be hidden. Supported values are <tt>'visibility'</tt>
     * (css visibility), <tt>'offsets'</tt> (negative offset position) and <tt>'display'</tt>
     * (css display).</p>
     * <br><p><b>Note</b>: the default of <tt>'display'</tt> is generally preferred
     * since items are automatically laid out when they are first shown (no sizing
     * is done while hidden).</p>
     */
    hideMode : 'display',
    /**
     * @cfg {Boolean} hideParent
     * True to hide and show the component's container when hide/show is called on the component, false to hide
     * and show the component itself (defaults to false).  For example, this can be used as a shortcut for a hide
     * button on a window by setting hide:true on the button when adding it to its parent container.
     */
    hideParent : false,
    /**
     * <p>The {@link Ext.Element} which encapsulates this Component. Read-only.</p>
     * <p>This will <i>usually</i> be a &lt;DIV> element created by the class's onRender method, but
     * that may be overridden using the <code>{@link #autoEl}</code> config.</p>
     * <br><p><b>Note</b>: this element will not be available until this Component has been rendered.</p><br>
     * <p>To add listeners for <b>DOM events</b> to this Component (as opposed to listeners
     * for this Component's own Observable events), see the {@link Ext.util.Observable#listeners listeners}
     * config for a suggestion, or use a render listener directly:</p><pre><code>
new Ext.Panel({
    title: 'The Clickable Panel',
    listeners: {
        render: function(p) {
            // Append the Panel to the click handler&#39;s argument list.
            p.getEl().on('click', handlePanelClick.createDelegate(null, [p], true));
        },
        single: true  // Remove the listener after first invocation
    }
});
</code></pre>
     * <p>See also <tt>{@link #getEl getEl}</p>
     * @type Ext.Element
     * @property el
     */
    /**
     * This Component's owner {@link Ext.Container Container} (defaults to undefined, and is set automatically when
     * this Component is added to a Container).  Read-only.
     * <p><b>Note</b>: to access items within the Container see <tt>{@link #itemId}</tt>.</p>
     * @type Ext.Container
     * @property ownerCt
     */
    /**
     * True if this component is hidden. Read-only.
     * @type Boolean
     * @property hidden
     */
    /**
     * True if this component is disabled. Read-only.
     * @type Boolean
     * @property disabled
     */
    /**
     * True if this component has been rendered. Read-only.
     * @type Boolean
     * @property rendered
     */
    rendered : false,

    /**
     * @cfg {String} contentEl
     * <p>Optional. Specify an existing HTML element, or the <code>id</code> of an existing HTML element to use as the content
     * for this component.</p>
     * <ul>
     * <li><b>Description</b> :
     * <div class="sub-desc">This config option is used to take an existing HTML element and place it in the layout element
     * of a new component (it simply moves the specified DOM element <i>after the Component is rendered</i> to use as the content.</div></li>
     * <li><b>Notes</b> :
     * <div class="sub-desc">The specified HTML element is appended to the layout element of the component <i>after any configured
     * {@link #html HTML} has been inserted</i>, and so the document will not contain this element at the time the {@link #render} event is fired.</div>
     * <div class="sub-desc">The specified HTML element used will not participate in any <code><b>{@link Ext.Container#layout layout}</b></code>
     * scheme that the Component may use. It is just HTML. Layouts operate on child <code><b>{@link Ext.Container#items items}</b></code>.</div>
     * <div class="sub-desc">Add either the <code>x-hidden</code> or the <code>x-hide-display</code> CSS class to
     * prevent a brief flicker of the content before it is rendered to the panel.</div></li>
     * </ul>
     */
    /**
     * @cfg {String/Object} html
     * An HTML fragment, or a {@link Ext.DomHelper DomHelper} specification to use as the layout element
     * content (defaults to ''). The HTML content is added after the component is rendered,
     * so the document will not contain this HTML at the time the {@link #render} event is fired.
     * This content is inserted into the body <i>before</i> any configured {@link #contentEl} is appended.
     */

    /**
     * @cfg {Mixed} tpl
     * An <bold>{@link Ext.Template}</bold>, <bold>{@link Ext.XTemplate}</bold>
     * or an array of strings to form an Ext.XTemplate.
     * Used in conjunction with the <code>{@link #data}</code> and
     * <code>{@link #tplWriteMode}</code> configurations.
     */

    /**
     * @cfg {String} tplWriteMode The Ext.(X)Template method to use when
     * updating the content area of the Component. Defaults to <tt>'overwrite'</tt>
     * (see <code>{@link Ext.XTemplate#overwrite}</code>).
     */
    tplWriteMode : 'overwrite',

    /**
     * @cfg {Mixed} data
     * The initial set of data to apply to the <code>{@link #tpl}</code> to
     * update the content area of the Component.
     */
    
    /**
     * @cfg {Array} bubbleEvents
     * <p>An array of events that, when fired, should be bubbled to any parent container.
     * See {@link Ext.util.Observable#enableBubble}.
     * Defaults to <tt>[]</tt>.
     */
    bubbleEvents: [],


    // private
    ctype : 'Ext.Component',

    // private
    actionMode : 'el',

    // private
    getActionEl : function(){
        return this[this.actionMode];
    },

    initPlugin : function(p){
        if(p.ptype && !Ext.isFunction(p.init)){
            p = Ext.ComponentMgr.createPlugin(p);
        }else if(Ext.isString(p)){
            p = Ext.ComponentMgr.createPlugin({
                ptype: p
            });
        }
        p.init(this);
        return p;
    },

    /* // protected
     * Function to be implemented by Component subclasses to be part of standard component initialization flow (it is empty by default).
     * <pre><code>
// Traditional constructor:
Ext.Foo = function(config){
    // call superclass constructor:
    Ext.Foo.superclass.constructor.call(this, config);

    this.addEvents({
        // add events
    });
};
Ext.extend(Ext.Foo, Ext.Bar, {
   // class body
}

// initComponent replaces the constructor:
Ext.Foo = Ext.extend(Ext.Bar, {
    initComponent : function(){
        // call superclass initComponent
        Ext.Container.superclass.initComponent.call(this);

        this.addEvents({
            // add events
        });
    }
}
</code></pre>
     */
    initComponent : function(){
        /*
         * this is double processing, however it allows people to be able to do
         * Ext.apply(this, {
         *     listeners: {
         *         //here
         *     }
         * });
         * MyClass.superclass.initComponent.call(this);
         */
        if(this.listeners){
            this.on(this.listeners);
            delete this.listeners;
        }
        this.enableBubble(this.bubbleEvents);
    },

    /**
     * <p>Render this Component into the passed HTML element.</p>
     * <p><b>If you are using a {@link Ext.Container Container} object to house this Component, then
     * do not use the render method.</b></p>
     * <p>A Container's child Components are rendered by that Container's
     * {@link Ext.Container#layout layout} manager when the Container is first rendered.</p>
     * <p>Certain layout managers allow dynamic addition of child components. Those that do
     * include {@link Ext.layout.CardLayout}, {@link Ext.layout.AnchorLayout},
     * {@link Ext.layout.FormLayout}, {@link Ext.layout.TableLayout}.</p>
     * <p>If the Container is already rendered when a new child Component is added, you may need to call
     * the Container's {@link Ext.Container#doLayout doLayout} to refresh the view which causes any
     * unrendered child Components to be rendered. This is required so that you can add multiple
     * child components if needed while only refreshing the layout once.</p>
     * <p>When creating complex UIs, it is important to remember that sizing and positioning
     * of child items is the responsibility of the Container's {@link Ext.Container#layout layout} manager.
     * If you expect child items to be sized in response to user interactions, you must
     * configure the Container with a layout manager which creates and manages the type of layout you
     * have in mind.</p>
     * <p><b>Omitting the Container's {@link Ext.Container#layout layout} config means that a basic
     * layout manager is used which does nothing but render child components sequentially into the
     * Container. No sizing or positioning will be performed in this situation.</b></p>
     * @param {Element/HTMLElement/String} container (optional) The element this Component should be
     * rendered into. If it is being created from existing markup, this should be omitted.
     * @param {String/Number} position (optional) The element ID or DOM node index within the container <b>before</b>
     * which this component will be inserted (defaults to appending to the end of the container)
     */
    render : function(container, position){
        if(!this.rendered && this.fireEvent('beforerender', this) !== false){
            if(!container && this.el){
                this.el = Ext.get(this.el);
                container = this.el.dom.parentNode;
                this.allowDomMove = false;
            }
            this.container = Ext.get(container);
            if(this.ctCls){
                this.container.addClass(this.ctCls);
            }
            this.rendered = true;
            if(position !== undefined){
                if(Ext.isNumber(position)){
                    position = this.container.dom.childNodes[position];
                }else{
                    position = Ext.getDom(position);
                }
            }
            this.onRender(this.container, position || null);
            if(this.autoShow){
                this.el.removeClass(['x-hidden','x-hide-' + this.hideMode]);
            }
            if(this.cls){
                this.el.addClass(this.cls);
                delete this.cls;
            }
            if(this.style){
                this.el.applyStyles(this.style);
                delete this.style;
            }
            if(this.overCls){
                this.el.addClassOnOver(this.overCls);
            }
            this.fireEvent('render', this);


            // Populate content of the component with html, contentEl or
            // a tpl.
            var contentTarget = this.getContentTarget();
            if (this.html){
                contentTarget.update(Ext.DomHelper.markup(this.html));
                delete this.html;
            }
            if (this.contentEl){
                var ce = Ext.getDom(this.contentEl);
                Ext.fly(ce).removeClass(['x-hidden', 'x-hide-display']);
                contentTarget.appendChild(ce);
            }
            if (this.tpl) {
                if (!this.tpl.compile) {
                    this.tpl = new Ext.XTemplate(this.tpl);
                }
                if (this.data) {
                    this.tpl[this.tplWriteMode](contentTarget, this.data);
                    delete this.data;
                }
            }
            this.afterRender(this.container);


            if(this.hidden){
                // call this so we don't fire initial hide events.
                this.doHide();
            }
            if(this.disabled){
                // pass silent so the event doesn't fire the first time.
                this.disable(true);
            }

            if(this.stateful !== false){
                this.initStateEvents();
            }
            this.fireEvent('afterrender', this);
        }
        return this;
    },


    /**
     * Update the content area of a component.
     * @param {Mixed} htmlOrData
     * If this component has been configured with a template via the tpl config
     * then it will use this argument as data to populate the template.
     * If this component was not configured with a template, the components
     * content area will be updated via Ext.Element update
     * @param {Boolean} loadScripts
     * (optional) Only legitimate when using the html configuration. Defaults to false
     * @param {Function} callback
     * (optional) Only legitimate when using the html configuration. Callback to execute when scripts have finished loading
     */
    update: function(htmlOrData, loadScripts, cb) {
        var contentTarget = this.getContentTarget();
        if (this.tpl && typeof htmlOrData !== "string") {
            this.tpl[this.tplWriteMode](contentTarget, htmlOrData || {});
        } else {
            var html = Ext.isObject(htmlOrData) ? Ext.DomHelper.markup(htmlOrData) : htmlOrData;
            contentTarget.update(html, loadScripts, cb);
        }
    },


    /**
     * @private
     * Method to manage awareness of when components are added to their
     * respective Container, firing an added event.
     * References are established at add time rather than at render time.
     * @param {Ext.Container} container Container which holds the component
     * @param {number} pos Position at which the component was added
     */
    onAdded : function(container, pos) {
        this.ownerCt = container;
        this.initRef();
        this.fireEvent('added', this, container, pos);
    },

    /**
     * @private
     * Method to manage awareness of when components are removed from their
     * respective Container, firing an removed event. References are properly
     * cleaned up after removing a component from its owning container.
     */
    onRemoved : function() {
        this.removeRef();
        this.fireEvent('removed', this, this.ownerCt);
        delete this.ownerCt;
    },

    /**
     * @private
     * Method to establish a reference to a component.
     */
    initRef : function() {
        /**
         * @cfg {String} ref
         * <p>A path specification, relative to the Component's <code>{@link #ownerCt}</code>
         * specifying into which ancestor Container to place a named reference to this Component.</p>
         * <p>The ancestor axis can be traversed by using '/' characters in the path.
         * For example, to put a reference to a Toolbar Button into <i>the Panel which owns the Toolbar</i>:</p><pre><code>
var myGrid = new Ext.grid.EditorGridPanel({
    title: 'My EditorGridPanel',
    store: myStore,
    colModel: myColModel,
    tbar: [{
        text: 'Save',
        handler: saveChanges,
        disabled: true,
        ref: '../saveButton'
    }],
    listeners: {
        afteredit: function() {
//          The button reference is in the GridPanel
            myGrid.saveButton.enable();
        }
    }
});
</code></pre>
         * <p>In the code above, if the <code>ref</code> had been <code>'saveButton'</code>
         * the reference would have been placed into the Toolbar. Each '/' in the <code>ref</code>
         * moves up one level from the Component's <code>{@link #ownerCt}</code>.</p>
         * <p>Also see the <code>{@link #added}</code> and <code>{@link #removed}</code> events.</p>
         */
        if(this.ref && !this.refOwner){
            var levels = this.ref.split('/'),
                last = levels.length,
                i = 0,
                t = this;

            while(t && i < last){
                t = t.ownerCt;
                ++i;
            }
            if(t){
                t[this.refName = levels[--i]] = this;
                /**
                 * @type Ext.Container
                 * @property refOwner
                 * The ancestor Container into which the {@link #ref} reference was inserted if this Component
                 * is a child of a Container, and has been configured with a <code>ref</code>.
                 */
                this.refOwner = t;
            }
        }
    },

    removeRef : function() {
        if (this.refOwner && this.refName) {
            delete this.refOwner[this.refName];
            delete this.refOwner;
        }
    },

    // private
    initState : function(){
        if(Ext.state.Manager){
            var id = this.getStateId();
            if(id){
                var state = Ext.state.Manager.get(id);
                if(state){
                    if(this.fireEvent('beforestaterestore', this, state) !== false){
                        this.applyState(Ext.apply({}, state));
                        this.fireEvent('staterestore', this, state);
                    }
                }
            }
        }
    },

    // private
    getStateId : function(){
        return this.stateId || ((/^(ext-comp-|ext-gen)/).test(String(this.id)) ? null : this.id);
    },

    // private
    initStateEvents : function(){
        if(this.stateEvents){
            for(var i = 0, e; e = this.stateEvents[i]; i++){
                this.on(e, this.saveState, this, {delay:100});
            }
        }
    },

    // private
    applyState : function(state){
        if(state){
            Ext.apply(this, state);
        }
    },

    // private
    getState : function(){
        return null;
    },

    // private
    saveState : function(){
        if(Ext.state.Manager && this.stateful !== false){
            var id = this.getStateId();
            if(id){
                var state = this.getState();
                if(this.fireEvent('beforestatesave', this, state) !== false){
                    Ext.state.Manager.set(id, state);
                    this.fireEvent('statesave', this, state);
                }
            }
        }
    },

    /**
     * Apply this component to existing markup that is valid. With this function, no call to render() is required.
     * @param {String/HTMLElement} el
     */
    applyToMarkup : function(el){
        this.allowDomMove = false;
        this.el = Ext.get(el);
        this.render(this.el.dom.parentNode);
    },

    /**
     * Adds a CSS class to the component's underlying element.
     * @param {string} cls The CSS class name to add
     * @return {Ext.Component} this
     */
    addClass : function(cls){
        if(this.el){
            this.el.addClass(cls);
        }else{
            this.cls = this.cls ? this.cls + ' ' + cls : cls;
        }
        return this;
    },

    /**
     * Removes a CSS class from the component's underlying element.
     * @param {string} cls The CSS class name to remove
     * @return {Ext.Component} this
     */
    removeClass : function(cls){
        if(this.el){
            this.el.removeClass(cls);
        }else if(this.cls){
            this.cls = this.cls.split(' ').remove(cls).join(' ');
        }
        return this;
    },

    // private
    // default function is not really useful
    onRender : function(ct, position){
        if(!this.el && this.autoEl){
            if(Ext.isString(this.autoEl)){
                this.el = document.createElement(this.autoEl);
            }else{
                var div = document.createElement('div');
                Ext.DomHelper.overwrite(div, this.autoEl);
                this.el = div.firstChild;
            }
            if (!this.el.id) {
                this.el.id = this.getId();
            }
        }
        if(this.el){
            this.el = Ext.get(this.el);
            if(this.allowDomMove !== false){
                ct.dom.insertBefore(this.el.dom, position);
                if (div) {
                    Ext.removeNode(div);
                    div = null;
                }
            }
        }
    },

    // private
    getAutoCreate : function(){
        var cfg = Ext.isObject(this.autoCreate) ?
                      this.autoCreate : Ext.apply({}, this.defaultAutoCreate);
        if(this.id && !cfg.id){
            cfg.id = this.id;
        }
        return cfg;
    },

    // private
    afterRender : Ext.emptyFn,

    /**
     * Destroys this component by purging any event listeners, removing the component's element from the DOM,
     * removing the component from its {@link Ext.Container} (if applicable) and unregistering it from
     * {@link Ext.ComponentMgr}.  Destruction is generally handled automatically by the framework and this method
     * should usually not need to be called directly.
     *
     */
    destroy : function(){
        if(!this.isDestroyed){
            if(this.fireEvent('beforedestroy', this) !== false){
                this.destroying = true;
                this.beforeDestroy();
                if(this.ownerCt && this.ownerCt.remove){
                    this.ownerCt.remove(this, false);
                }
                if(this.rendered){
                    this.el.remove();
                    if(this.actionMode == 'container' || this.removeMode == 'container'){
                        this.container.remove();
                    }
                }
                // Stop any buffered tasks
                if(this.focusTask && this.focusTask.cancel){
                    this.focusTask.cancel();
                }
                this.onDestroy();
                Ext.ComponentMgr.unregister(this);
                this.fireEvent('destroy', this);
                this.purgeListeners();
                this.destroying = false;
                this.isDestroyed = true;
            }
        }
    },

    deleteMembers : function(){
        var args = arguments;
        for(var i = 0, len = args.length; i < len; ++i){
            delete this[args[i]];
        }
    },

    // private
    beforeDestroy : Ext.emptyFn,

    // private
    onDestroy  : Ext.emptyFn,

    /**
     * <p>Returns the {@link Ext.Element} which encapsulates this Component.</p>
     * <p>This will <i>usually</i> be a &lt;DIV> element created by the class's onRender method, but
     * that may be overridden using the {@link #autoEl} config.</p>
     * <br><p><b>Note</b>: this element will not be available until this Component has been rendered.</p><br>
     * <p>To add listeners for <b>DOM events</b> to this Component (as opposed to listeners
     * for this Component's own Observable events), see the {@link #listeners} config for a suggestion,
     * or use a render listener directly:</p><pre><code>
new Ext.Panel({
    title: 'The Clickable Panel',
    listeners: {
        render: function(p) {
            // Append the Panel to the click handler&#39;s argument list.
            p.getEl().on('click', handlePanelClick.createDelegate(null, [p], true));
        },
        single: true  // Remove the listener after first invocation
    }
});
</code></pre>
     * @return {Ext.Element} The Element which encapsulates this Component.
     */
    getEl : function(){
        return this.el;
    },

    // private
    getContentTarget : function(){
        return this.el;
    },

    /**
     * Returns the <code>id</code> of this component or automatically generates and
     * returns an <code>id</code> if an <code>id</code> is not defined yet:<pre><code>
     * 'ext-comp-' + (++Ext.Component.AUTO_ID)
     * </code></pre>
     * @return {String} id
     */
    getId : function(){
        return this.id || (this.id = 'ext-comp-' + (++Ext.Component.AUTO_ID));
    },

    /**
     * Returns the <code>{@link #itemId}</code> of this component.  If an
     * <code>{@link #itemId}</code> was not assigned through configuration the
     * <code>id</code> is returned using <code>{@link #getId}</code>.
     * @return {String}
     */
    getItemId : function(){
        return this.itemId || this.getId();
    },

    /**
     * Try to focus this component.
     * @param {Boolean} selectText (optional) If applicable, true to also select the text in this component
     * @param {Boolean/Number} delay (optional) Delay the focus this number of milliseconds (true for 10 milliseconds)
     * @return {Ext.Component} this
     */
    focus : function(selectText, delay){
        if(delay){
            this.focusTask = new Ext.util.DelayedTask(this.focus, this, [selectText, false]);
            this.focusTask.delay(Ext.isNumber(delay) ? delay : 10);
            return this;
        }
        if(this.rendered && !this.isDestroyed){
            this.el.focus();
            if(selectText === true){
                this.el.dom.select();
            }
        }
        return this;
    },

    // private
    blur : function(){
        if(this.rendered){
            this.el.blur();
        }
        return this;
    },

    /**
     * Disable this component and fire the 'disable' event.
     * @return {Ext.Component} this
     */
    disable : function(/* private */ silent){
        if(this.rendered){
            this.onDisable();
        }
        this.disabled = true;
        if(silent !== true){
            this.fireEvent('disable', this);
        }
        return this;
    },

    // private
    onDisable : function(){
        this.getActionEl().addClass(this.disabledClass);
        this.el.dom.disabled = true;
    },

    /**
     * Enable this component and fire the 'enable' event.
     * @return {Ext.Component} this
     */
    enable : function(){
        if(this.rendered){
            this.onEnable();
        }
        this.disabled = false;
        this.fireEvent('enable', this);
        return this;
    },

    // private
    onEnable : function(){
        this.getActionEl().removeClass(this.disabledClass);
        this.el.dom.disabled = false;
    },

    /**
     * Convenience function for setting disabled/enabled by boolean.
     * @param {Boolean} disabled
     * @return {Ext.Component} this
     */
    setDisabled : function(disabled){
        return this[disabled ? 'disable' : 'enable']();
    },

    /**
     * Show this component.  Listen to the '{@link #beforeshow}' event and return
     * <tt>false</tt> to cancel showing the component.  Fires the '{@link #show}'
     * event after showing the component.
     * @return {Ext.Component} this
     */
    show : function(){
        if(this.fireEvent('beforeshow', this) !== false){
            this.hidden = false;
            if(this.autoRender){
                this.render(Ext.isBoolean(this.autoRender) ? Ext.getBody() : this.autoRender);
            }
            if(this.rendered){
                this.onShow();
            }
            this.fireEvent('show', this);
        }
        return this;
    },

    // private
    onShow : function(){
        this.getVisibilityEl().removeClass('x-hide-' + this.hideMode);
    },

    /**
     * Hide this component.  Listen to the '{@link #beforehide}' event and return
     * <tt>false</tt> to cancel hiding the component.  Fires the '{@link #hide}'
     * event after hiding the component. Note this method is called internally if
     * the component is configured to be <code>{@link #hidden}</code>.
     * @return {Ext.Component} this
     */
    hide : function(){
        if(this.fireEvent('beforehide', this) !== false){
            this.doHide();
            this.fireEvent('hide', this);
        }
        return this;
    },

    // private
    doHide: function(){
        this.hidden = true;
        if(this.rendered){
            this.onHide();
        }
    },

    // private
    onHide : function(){
        this.getVisibilityEl().addClass('x-hide-' + this.hideMode);
    },

    // private
    getVisibilityEl : function(){
        return this.hideParent ? this.container : this.getActionEl();
    },

    /**
     * Convenience function to hide or show this component by boolean.
     * @param {Boolean} visible True to show, false to hide
     * @return {Ext.Component} this
     */
    setVisible : function(visible){
        return this[visible ? 'show' : 'hide']();
    },

    /**
     * Returns true if this component is visible.
     * @return {Boolean} True if this component is visible, false otherwise.
     */
    isVisible : function(){
        return this.rendered && this.getVisibilityEl().isVisible();
    },

    /**
     * Clone the current component using the original config values passed into this instance by default.
     * @param {Object} overrides A new config containing any properties to override in the cloned version.
     * An id property can be passed on this object, otherwise one will be generated to avoid duplicates.
     * @return {Ext.Component} clone The cloned copy of this component
     */
    cloneConfig : function(overrides){
        overrides = overrides || {};
        var id = overrides.id || Ext.id();
        var cfg = Ext.applyIf(overrides, this.initialConfig);
        cfg.id = id; // prevent dup id
        return new this.constructor(cfg);
    },

    /**
     * Gets the xtype for this component as registered with {@link Ext.ComponentMgr}. For a list of all
     * available xtypes, see the {@link Ext.Component} header. Example usage:
     * <pre><code>
var t = new Ext.form.TextField();
alert(t.getXType());  // alerts 'textfield'
</code></pre>
     * @return {String} The xtype
     */
    getXType : function(){
        return this.constructor.xtype;
    },

    /**
     * <p>Tests whether or not this Component is of a specific xtype. This can test whether this Component is descended
     * from the xtype (default) or whether it is directly of the xtype specified (shallow = true).</p>
     * <p><b>If using your own subclasses, be aware that a Component must register its own xtype
     * to participate in determination of inherited xtypes.</b></p>
     * <p>For a list of all available xtypes, see the {@link Ext.Component} header.</p>
     * <p>Example usage:</p>
     * <pre><code>
var t = new Ext.form.TextField();
var isText = t.isXType('textfield');        // true
var isBoxSubclass = t.isXType('box');       // true, descended from BoxComponent
var isBoxInstance = t.isXType('box', true); // false, not a direct BoxComponent instance
</code></pre>
     * @param {String/Ext.Component/Class} xtype The xtype to check for this Component. Note that the the component can either be an instance
     * or a component class:
     * <pre><code>
var c = new Ext.Component();
console.log(c.isXType(c));
console.log(c.isXType(Ext.Component)); 
</code></pre>
     * @param {Boolean} shallow (optional) False to check whether this Component is descended from the xtype (this is
     * the default), or true to check whether this Component is directly of the specified xtype.
     * @return {Boolean} True if this component descends from the specified xtype, false otherwise.
     */
    isXType : function(xtype, shallow){
        //assume a string by default
        if (Ext.isFunction(xtype)){
            xtype = xtype.xtype; //handle being passed the class, e.g. Ext.Component
        }else if (Ext.isObject(xtype)){
            xtype = xtype.constructor.xtype; //handle being passed an instance
        }

        return !shallow ? ('/' + this.getXTypes() + '/').indexOf('/' + xtype + '/') != -1 : this.constructor.xtype == xtype;
    },

    /**
     * <p>Returns this Component's xtype hierarchy as a slash-delimited string. For a list of all
     * available xtypes, see the {@link Ext.Component} header.</p>
     * <p><b>If using your own subclasses, be aware that a Component must register its own xtype
     * to participate in determination of inherited xtypes.</b></p>
     * <p>Example usage:</p>
     * <pre><code>
var t = new Ext.form.TextField();
alert(t.getXTypes());  // alerts 'component/box/field/textfield'
</code></pre>
     * @return {String} The xtype hierarchy string
     */
    getXTypes : function(){
        var tc = this.constructor;
        if(!tc.xtypes){
            var c = [], sc = this;
            while(sc && sc.constructor.xtype){
                c.unshift(sc.constructor.xtype);
                sc = sc.constructor.superclass;
            }
            tc.xtypeChain = c;
            tc.xtypes = c.join('/');
        }
        return tc.xtypes;
    },

    /**
     * Find a container above this component at any level by a custom function. If the passed function returns
     * true, the container will be returned.
     * @param {Function} fn The custom function to call with the arguments (container, this component).
     * @return {Ext.Container} The first Container for which the custom function returns true
     */
    findParentBy : function(fn) {
        for (var p = this.ownerCt; (p != null) && !fn(p, this); p = p.ownerCt);
        return p || null;
    },

    /**
     * Find a container above this component at any level by xtype or class
     * @param {String/Ext.Component/Class} xtype The xtype to check for this Component. Note that the the component can either be an instance
     * or a component class:
     * @param {Boolean} shallow (optional) False to check whether this Component is descended from the xtype (this is
     * the default), or true to check whether this Component is directly of the specified xtype.
     * @return {Ext.Container} The first Container which matches the given xtype or class
     */
    findParentByType : function(xtype, shallow){
        return this.findParentBy(function(c){
            return c.isXType(xtype, shallow);
        });
    },
    
    /**
     * Bubbles up the component/container heirarchy, calling the specified function with each component. The scope (<i>this</i>) of
     * function call will be the scope provided or the current component. The arguments to the function
     * will be the args provided or the current component. If the function returns false at any point,
     * the bubble is stopped.
     * @param {Function} fn The function to call
     * @param {Object} scope (optional) The scope of the function (defaults to current node)
     * @param {Array} args (optional) The args to call the function with (default to passing the current component)
     * @return {Ext.Component} this
     */
    bubble : function(fn, scope, args){
        var p = this;
        while(p){
            if(fn.apply(scope || p, args || [p]) === false){
                break;
            }
            p = p.ownerCt;
        }
        return this;
    },

    // protected
    getPositionEl : function(){
        return this.positionEl || this.el;
    },

    // private
    purgeListeners : function(){
        Ext.Component.superclass.purgeListeners.call(this);
        if(this.mons){
            this.on('beforedestroy', this.clearMons, this, {single: true});
        }
    },

    // private
    clearMons : function(){
        Ext.each(this.mons, function(m){
            m.item.un(m.ename, m.fn, m.scope);
        }, this);
        this.mons = [];
    },

    // private
    createMons: function(){
        if(!this.mons){
            this.mons = [];
            this.on('beforedestroy', this.clearMons, this, {single: true});
        }
    },

    /**
     * <p>Adds listeners to any Observable object (or Elements) which are automatically removed when this Component
     * is destroyed. Usage:</p><code><pre>
myGridPanel.mon(myGridPanel.getSelectionModel(), 'selectionchange', handleSelectionChange, null, {buffer: 50});
</pre></code>
     * <p>or:</p><code><pre>
myGridPanel.mon(myGridPanel.getSelectionModel(), {
    selectionchange: handleSelectionChange,
    buffer: 50
});
</pre></code>
     * @param {Observable|Element} item The item to which to add a listener/listeners.
     * @param {Object|String} ename The event name, or an object containing event name properties.
     * @param {Function} fn Optional. If the <code>ename</code> parameter was an event name, this
     * is the handler function.
     * @param {Object} scope Optional. If the <code>ename</code> parameter was an event name, this
     * is the scope (<code>this</code> reference) in which the handler function is executed.
     * @param {Object} opt Optional. If the <code>ename</code> parameter was an event name, this
     * is the {@link Ext.util.Observable#addListener addListener} options.
     */
    mon : function(item, ename, fn, scope, opt){
        this.createMons();
        if(Ext.isObject(ename)){
            var propRe = /^(?:scope|delay|buffer|single|stopEvent|preventDefault|stopPropagation|normalized|args|delegate)$/;

            var o = ename;
            for(var e in o){
                if(propRe.test(e)){
                    continue;
                }
                if(Ext.isFunction(o[e])){
                    // shared options
                    this.mons.push({
                        item: item, ename: e, fn: o[e], scope: o.scope
                    });
                    item.on(e, o[e], o.scope, o);
                }else{
                    // individual options
                    this.mons.push({
                        item: item, ename: e, fn: o[e], scope: o.scope
                    });
                    item.on(e, o[e]);
                }
            }
            return;
        }

        this.mons.push({
            item: item, ename: ename, fn: fn, scope: scope
        });
        item.on(ename, fn, scope, opt);
    },

    /**
     * Removes listeners that were added by the {@link #mon} method.
     * @param {Observable|Element} item The item from which to remove a listener/listeners.
     * @param {Object|String} ename The event name, or an object containing event name properties.
     * @param {Function} fn Optional. If the <code>ename</code> parameter was an event name, this
     * is the handler function.
     * @param {Object} scope Optional. If the <code>ename</code> parameter was an event name, this
     * is the scope (<code>this</code> reference) in which the handler function is executed.
     */
    mun : function(item, ename, fn, scope){
        var found, mon;
        this.createMons();
        for(var i = 0, len = this.mons.length; i < len; ++i){
            mon = this.mons[i];
            if(item === mon.item && ename == mon.ename && fn === mon.fn && scope === mon.scope){
                this.mons.splice(i, 1);
                item.un(ename, fn, scope);
                found = true;
                break;
            }
        }
        return found;
    },

    /**
     * Returns the next component in the owning container
     * @return Ext.Component
     */
    nextSibling : function(){
        if(this.ownerCt){
            var index = this.ownerCt.items.indexOf(this);
            if(index != -1 && index+1 < this.ownerCt.items.getCount()){
                return this.ownerCt.items.itemAt(index+1);
            }
        }
        return null;
    },

    /**
     * Returns the previous component in the owning container
     * @return Ext.Component
     */
    previousSibling : function(){
        if(this.ownerCt){
            var index = this.ownerCt.items.indexOf(this);
            if(index > 0){
                return this.ownerCt.items.itemAt(index-1);
            }
        }
        return null;
    },

    /**
     * Provides the link for Observable's fireEvent method to bubble up the ownership hierarchy.
     * @return {Ext.Container} the Container which owns this Component.
     */
    getBubbleTarget : function(){
        return this.ownerCt;
    }
});

Ext.reg('component', Ext.Component);
/**
 * @class Ext.Action
 * <p>An Action is a piece of reusable functionality that can be abstracted out of any particular component so that it
 * can be usefully shared among multiple components.  Actions let you share handlers, configuration options and UI
 * updates across any components that support the Action interface (primarily {@link Ext.Toolbar}, {@link Ext.Button}
 * and {@link Ext.menu.Menu} components).</p>
 * <p>Aside from supporting the config object interface, any component that needs to use Actions must also support
 * the following method list, as these will be called as needed by the Action class: setText(string), setIconCls(string),
 * setDisabled(boolean), setVisible(boolean) and setHandler(function).</p>
 * Example usage:<br>
 * <pre><code>
// Define the shared action.  Each component below will have the same
// display text and icon, and will display the same message on click.
var action = new Ext.Action({
    {@link #text}: 'Do something',
    {@link #handler}: function(){
        Ext.Msg.alert('Click', 'You did something.');
    },
    {@link #iconCls}: 'do-something',
    {@link #itemId}: 'myAction'
});

var panel = new Ext.Panel({
    title: 'Actions',
    width: 500,
    height: 300,
    tbar: [
        // Add the action directly to a toolbar as a menu button
        action,
        {
            text: 'Action Menu',
            // Add the action to a menu as a text item
            menu: [action]
        }
    ],
    items: [
        // Add the action to the panel body as a standard button
        new Ext.Button(action)
    ],
    renderTo: Ext.getBody()
});

// Change the text for all components using the action
action.setText('Something else');

// Reference an action through a container using the itemId
var btn = panel.getComponent('myAction');
var aRef = btn.baseAction;
aRef.setText('New text');
</code></pre>
 * @constructor
 * @param {Object} config The configuration options
 */
Ext.Action = Ext.extend(Object, {
    /**
     * @cfg {String} text The text to set for all components using this action (defaults to '').
     */
    /**
     * @cfg {String} iconCls
     * The CSS class selector that specifies a background image to be used as the header icon for
     * all components using this action (defaults to '').
     * <p>An example of specifying a custom icon class would be something like:
     * </p><pre><code>
// specify the property in the config for the class:
     ...
     iconCls: 'do-something'

// css class that specifies background image to be used as the icon image:
.do-something { background-image: url(../images/my-icon.gif) 0 6px no-repeat !important; }
</code></pre>
     */
    /**
     * @cfg {Boolean} disabled True to disable all components using this action, false to enable them (defaults to false).
     */
    /**
     * @cfg {Boolean} hidden True to hide all components using this action, false to show them (defaults to false).
     */
    /**
     * @cfg {Function} handler The function that will be invoked by each component tied to this action
     * when the component's primary event is triggered (defaults to undefined).
     */
    /**
     * @cfg {String} itemId
     * See {@link Ext.Component}.{@link Ext.Component#itemId itemId}.
     */
    /**
     * @cfg {Object} scope The scope (<tt><b>this</b></tt> reference) in which the
     * <code>{@link #handler}</code> is executed. Defaults to this Button.
     */

    constructor : function(config){
        this.initialConfig = config;
        this.itemId = config.itemId = (config.itemId || config.id || Ext.id());
        this.items = [];
    },
    
    // private
    isAction : true,

    /**
     * Sets the text to be displayed by all components using this action.
     * @param {String} text The text to display
     */
    setText : function(text){
        this.initialConfig.text = text;
        this.callEach('setText', [text]);
    },

    /**
     * Gets the text currently displayed by all components using this action.
     */
    getText : function(){
        return this.initialConfig.text;
    },

    /**
     * Sets the icon CSS class for all components using this action.  The class should supply
     * a background image that will be used as the icon image.
     * @param {String} cls The CSS class supplying the icon image
     */
    setIconClass : function(cls){
        this.initialConfig.iconCls = cls;
        this.callEach('setIconClass', [cls]);
    },

    /**
     * Gets the icon CSS class currently used by all components using this action.
     */
    getIconClass : function(){
        return this.initialConfig.iconCls;
    },

    /**
     * Sets the disabled state of all components using this action.  Shortcut method
     * for {@link #enable} and {@link #disable}.
     * @param {Boolean} disabled True to disable the component, false to enable it
     */
    setDisabled : function(v){
        this.initialConfig.disabled = v;
        this.callEach('setDisabled', [v]);
    },

    /**
     * Enables all components using this action.
     */
    enable : function(){
        this.setDisabled(false);
    },

    /**
     * Disables all components using this action.
     */
    disable : function(){
        this.setDisabled(true);
    },

    /**
     * Returns true if the components using this action are currently disabled, else returns false.  
     */
    isDisabled : function(){
        return this.initialConfig.disabled;
    },

    /**
     * Sets the hidden state of all components using this action.  Shortcut method
     * for <code>{@link #hide}</code> and <code>{@link #show}</code>.
     * @param {Boolean} hidden True to hide the component, false to show it
     */
    setHidden : function(v){
        this.initialConfig.hidden = v;
        this.callEach('setVisible', [!v]);
    },

    /**
     * Shows all components using this action.
     */
    show : function(){
        this.setHidden(false);
    },

    /**
     * Hides all components using this action.
     */
    hide : function(){
        this.setHidden(true);
    },

    /**
     * Returns true if the components using this action are currently hidden, else returns false.  
     */
    isHidden : function(){
        return this.initialConfig.hidden;
    },

    /**
     * Sets the function that will be called by each Component using this action when its primary event is triggered.
     * @param {Function} fn The function that will be invoked by the action's components.  The function
     * will be called with no arguments.
     * @param {Object} scope The scope (<code>this</code> reference) in which the function is executed. Defaults to the Component firing the event.
     */
    setHandler : function(fn, scope){
        this.initialConfig.handler = fn;
        this.initialConfig.scope = scope;
        this.callEach('setHandler', [fn, scope]);
    },

    /**
     * Executes the specified function once for each Component currently tied to this action.  The function passed
     * in should accept a single argument that will be an object that supports the basic Action config/method interface.
     * @param {Function} fn The function to execute for each component
     * @param {Object} scope The scope (<code>this</code> reference) in which the function is executed.  Defaults to the Component.
     */
    each : function(fn, scope){
        Ext.each(this.items, fn, scope);
    },

    // private
    callEach : function(fnName, args){
        var cs = this.items;
        for(var i = 0, len = cs.length; i < len; i++){
            cs[i][fnName].apply(cs[i], args);
        }
    },

    // private
    addComponent : function(comp){
        this.items.push(comp);
        comp.on('destroy', this.removeComponent, this);
    },

    // private
    removeComponent : function(comp){
        this.items.remove(comp);
    },

    /**
     * Executes this action manually using the handler function specified in the original config object
     * or the handler function set with <code>{@link #setHandler}</code>.  Any arguments passed to this
     * function will be passed on to the handler function.
     * @param {Mixed} arg1 (optional) Variable number of arguments passed to the handler function
     * @param {Mixed} arg2 (optional)
     * @param {Mixed} etc... (optional)
     */
    execute : function(){
        this.initialConfig.handler.apply(this.initialConfig.scope || window, arguments);
    }
});
/**
 * @class Ext.Layer
 * @extends Ext.Element
 * An extended {@link Ext.Element} object that supports a shadow and shim, constrain to viewport and
 * automatic maintaining of shadow/shim positions.
 * @cfg {Boolean} shim False to disable the iframe shim in browsers which need one (defaults to true)
 * @cfg {String/Boolean} shadow True to automatically create an {@link Ext.Shadow}, or a string indicating the
 * shadow's display {@link Ext.Shadow#mode}. False to disable the shadow. (defaults to false)
 * @cfg {Object} dh DomHelper object config to create element with (defaults to {tag: 'div', cls: 'x-layer'}).
 * @cfg {Boolean} constrain False to disable constrain to viewport (defaults to true)
 * @cfg {String} cls CSS class to add to the element
 * @cfg {Number} zindex Starting z-index (defaults to 11000)
 * @cfg {Number} shadowOffset Number of pixels to offset the shadow (defaults to 4)
 * @cfg {Boolean} useDisplay
 * Defaults to use css offsets to hide the Layer. Specify <tt>true</tt>
 * to use css style <tt>'display:none;'</tt> to hide the Layer.
 * @constructor
 * @param {Object} config An object with config options.
 * @param {String/HTMLElement} existingEl (optional) Uses an existing DOM element. If the element is not found it creates it.
 */
(function(){
Ext.Layer = function(config, existingEl){
    config = config || {};
    var dh = Ext.DomHelper,
        cp = config.parentEl, pel = cp ? Ext.getDom(cp) : document.body;
        
    if (existingEl) {
        this.dom = Ext.getDom(existingEl);
    }
    if(!this.dom){
        var o = config.dh || {tag: 'div', cls: 'x-layer'};
        this.dom = dh.append(pel, o);
    }
    if(config.cls){
        this.addClass(config.cls);
    }
    this.constrain = config.constrain !== false;
    this.setVisibilityMode(Ext.Element.VISIBILITY);
    if(config.id){
        this.id = this.dom.id = config.id;
    }else{
        this.id = Ext.id(this.dom);
    }
    this.zindex = config.zindex || this.getZIndex();
    this.position('absolute', this.zindex);
    if(config.shadow){
        this.shadowOffset = config.shadowOffset || 4;
        this.shadow = new Ext.Shadow({
            offset : this.shadowOffset,
            mode : config.shadow
        });
    }else{
        this.shadowOffset = 0;
    }
    this.useShim = config.shim !== false && Ext.useShims;
    this.useDisplay = config.useDisplay;
    this.hide();
};

var supr = Ext.Element.prototype;

// shims are shared among layer to keep from having 100 iframes
var shims = [];

Ext.extend(Ext.Layer, Ext.Element, {

    getZIndex : function(){
        return this.zindex || parseInt((this.getShim() || this).getStyle('z-index'), 10) || 11000;
    },

    getShim : function(){
        if(!this.useShim){
            return null;
        }
        if(this.shim){
            return this.shim;
        }
        var shim = shims.shift();
        if(!shim){
            shim = this.createShim();
            shim.enableDisplayMode('block');
            shim.dom.style.display = 'none';
            shim.dom.style.visibility = 'visible';
        }
        var pn = this.dom.parentNode;
        if(shim.dom.parentNode != pn){
            pn.insertBefore(shim.dom, this.dom);
        }
        shim.setStyle('z-index', this.getZIndex()-2);
        this.shim = shim;
        return shim;
    },

    hideShim : function(){
        if(this.shim){
            this.shim.setDisplayed(false);
            shims.push(this.shim);
            delete this.shim;
        }
    },

    disableShadow : function(){
        if(this.shadow){
            this.shadowDisabled = true;
            this.shadow.hide();
            this.lastShadowOffset = this.shadowOffset;
            this.shadowOffset = 0;
        }
    },

    enableShadow : function(show){
        if(this.shadow){
            this.shadowDisabled = false;
            this.shadowOffset = this.lastShadowOffset;
            delete this.lastShadowOffset;
            if(show){
                this.sync(true);
            }
        }
    },

    // private
    // this code can execute repeatedly in milliseconds (i.e. during a drag) so
    // code size was sacrificed for effeciency (e.g. no getBox/setBox, no XY calls)
    sync : function(doShow){
        var shadow = this.shadow;
        if(!this.updating && this.isVisible() && (shadow || this.useShim)){
            var shim = this.getShim(),
                w = this.getWidth(),
                h = this.getHeight(),
                l = this.getLeft(true),
                t = this.getTop(true);

            if(shadow && !this.shadowDisabled){
                if(doShow && !shadow.isVisible()){
                    shadow.show(this);
                }else{
                    shadow.realign(l, t, w, h);
                }
                if(shim){
                    if(doShow){
                       shim.show();
                    }
                    // fit the shim behind the shadow, so it is shimmed too
                    var shadowAdj = shadow.el.getXY(), shimStyle = shim.dom.style,
                        shadowSize = shadow.el.getSize();
                    shimStyle.left = (shadowAdj[0])+'px';
                    shimStyle.top = (shadowAdj[1])+'px';
                    shimStyle.width = (shadowSize.width)+'px';
                    shimStyle.height = (shadowSize.height)+'px';
                }
            }else if(shim){
                if(doShow){
                   shim.show();
                }
                shim.setSize(w, h);
                shim.setLeftTop(l, t);
            }
        }
    },

    // private
    destroy : function(){
        this.hideShim();
        if(this.shadow){
            this.shadow.hide();
        }
        this.removeAllListeners();
        Ext.removeNode(this.dom);
        delete this.dom;
    },

    remove : function(){
        this.destroy();
    },

    // private
    beginUpdate : function(){
        this.updating = true;
    },

    // private
    endUpdate : function(){
        this.updating = false;
        this.sync(true);
    },

    // private
    hideUnders : function(negOffset){
        if(this.shadow){
            this.shadow.hide();
        }
        this.hideShim();
    },

    // private
    constrainXY : function(){
        if(this.constrain){
            var vw = Ext.lib.Dom.getViewWidth(),
                vh = Ext.lib.Dom.getViewHeight();
            var s = Ext.getDoc().getScroll();

            var xy = this.getXY();
            var x = xy[0], y = xy[1];
            var so = this.shadowOffset;
            var w = this.dom.offsetWidth+so, h = this.dom.offsetHeight+so;
            // only move it if it needs it
            var moved = false;
            // first validate right/bottom
            if((x + w) > vw+s.left){
                x = vw - w - so;
                moved = true;
            }
            if((y + h) > vh+s.top){
                y = vh - h - so;
                moved = true;
            }
            // then make sure top/left isn't negative
            if(x < s.left){
                x = s.left;
                moved = true;
            }
            if(y < s.top){
                y = s.top;
                moved = true;
            }
            if(moved){
                if(this.avoidY){
                    var ay = this.avoidY;
                    if(y <= ay && (y+h) >= ay){
                        y = ay-h-5;
                    }
                }
                xy = [x, y];
                this.storeXY(xy);
                supr.setXY.call(this, xy);
                this.sync();
            }
        }
        return this;
    },
    
    getConstrainOffset : function(){
        return this.shadowOffset;    
    },

    isVisible : function(){
        return this.visible;
    },

    // private
    showAction : function(){
        this.visible = true; // track visibility to prevent getStyle calls
        if(this.useDisplay === true){
            this.setDisplayed('');
        }else if(this.lastXY){
            supr.setXY.call(this, this.lastXY);
        }else if(this.lastLT){
            supr.setLeftTop.call(this, this.lastLT[0], this.lastLT[1]);
        }
    },

    // private
    hideAction : function(){
        this.visible = false;
        if(this.useDisplay === true){
            this.setDisplayed(false);
        }else{
            this.setLeftTop(-10000,-10000);
        }
    },

    // overridden Element method
    setVisible : function(v, a, d, c, e){
        if(v){
            this.showAction();
        }
        if(a && v){
            var cb = function(){
                this.sync(true);
                if(c){
                    c();
                }
            }.createDelegate(this);
            supr.setVisible.call(this, true, true, d, cb, e);
        }else{
            if(!v){
                this.hideUnders(true);
            }
            var cb = c;
            if(a){
                cb = function(){
                    this.hideAction();
                    if(c){
                        c();
                    }
                }.createDelegate(this);
            }
            supr.setVisible.call(this, v, a, d, cb, e);
            if(v){
                this.sync(true);
            }else if(!a){
                this.hideAction();
            }
        }
        return this;
    },

    storeXY : function(xy){
        delete this.lastLT;
        this.lastXY = xy;
    },

    storeLeftTop : function(left, top){
        delete this.lastXY;
        this.lastLT = [left, top];
    },

    // private
    beforeFx : function(){
        this.beforeAction();
        return Ext.Layer.superclass.beforeFx.apply(this, arguments);
    },

    // private
    afterFx : function(){
        Ext.Layer.superclass.afterFx.apply(this, arguments);
        this.sync(this.isVisible());
    },

    // private
    beforeAction : function(){
        if(!this.updating && this.shadow){
            this.shadow.hide();
        }
    },

    // overridden Element method
    setLeft : function(left){
        this.storeLeftTop(left, this.getTop(true));
        supr.setLeft.apply(this, arguments);
        this.sync();
        return this;
    },

    setTop : function(top){
        this.storeLeftTop(this.getLeft(true), top);
        supr.setTop.apply(this, arguments);
        this.sync();
        return this;
    },

    setLeftTop : function(left, top){
        this.storeLeftTop(left, top);
        supr.setLeftTop.apply(this, arguments);
        this.sync();
        return this;
    },

    setXY : function(xy, a, d, c, e){
        this.fixDisplay();
        this.beforeAction();
        this.storeXY(xy);
        var cb = this.createCB(c);
        supr.setXY.call(this, xy, a, d, cb, e);
        if(!a){
            cb();
        }
        return this;
    },

    // private
    createCB : function(c){
        var el = this;
        return function(){
            el.constrainXY();
            el.sync(true);
            if(c){
                c();
            }
        };
    },

    // overridden Element method
    setX : function(x, a, d, c, e){
        this.setXY([x, this.getY()], a, d, c, e);
        return this;
    },

    // overridden Element method
    setY : function(y, a, d, c, e){
        this.setXY([this.getX(), y], a, d, c, e);
        return this;
    },

    // overridden Element method
    setSize : function(w, h, a, d, c, e){
        this.beforeAction();
        var cb = this.createCB(c);
        supr.setSize.call(this, w, h, a, d, cb, e);
        if(!a){
            cb();
        }
        return this;
    },

    // overridden Element method
    setWidth : function(w, a, d, c, e){
        this.beforeAction();
        var cb = this.createCB(c);
        supr.setWidth.call(this, w, a, d, cb, e);
        if(!a){
            cb();
        }
        return this;
    },

    // overridden Element method
    setHeight : function(h, a, d, c, e){
        this.beforeAction();
        var cb = this.createCB(c);
        supr.setHeight.call(this, h, a, d, cb, e);
        if(!a){
            cb();
        }
        return this;
    },

    // overridden Element method
    setBounds : function(x, y, w, h, a, d, c, e){
        this.beforeAction();
        var cb = this.createCB(c);
        if(!a){
            this.storeXY([x, y]);
            supr.setXY.call(this, [x, y]);
            supr.setSize.call(this, w, h, a, d, cb, e);
            cb();
        }else{
            supr.setBounds.call(this, x, y, w, h, a, d, cb, e);
        }
        return this;
    },

    /**
     * Sets the z-index of this layer and adjusts any shadow and shim z-indexes. The layer z-index is automatically
     * incremented by two more than the value passed in so that it always shows above any shadow or shim (the shadow
     * element, if any, will be assigned z-index + 1, and the shim element, if any, will be assigned the unmodified z-index).
     * @param {Number} zindex The new z-index to set
     * @return {this} The Layer
     */
    setZIndex : function(zindex){
        this.zindex = zindex;
        this.setStyle('z-index', zindex + 2);
        if(this.shadow){
            this.shadow.setZIndex(zindex + 1);
        }
        if(this.shim){
            this.shim.setStyle('z-index', zindex);
        }
        return this;
    }
});
})();
/**
 * @class Ext.Shadow
 * Simple class that can provide a shadow effect for any element.  Note that the element MUST be absolutely positioned,
 * and the shadow does not provide any shimming.  This should be used only in simple cases -- for more advanced
 * functionality that can also provide the same shadow effect, see the {@link Ext.Layer} class.
 * @constructor
 * Create a new Shadow
 * @param {Object} config The config object
 */
Ext.Shadow = function(config) {
    Ext.apply(this, config);
    if (typeof this.mode != "string") {
        this.mode = this.defaultMode;
    }
    var o = this.offset,
        a = {
            h: 0
        },
        rad = Math.floor(this.offset / 2);
    switch (this.mode.toLowerCase()) {
        // all this hideous nonsense calculates the various offsets for shadows
        case "drop":
            a.w = 0;
            a.l = a.t = o;
            a.t -= 1;
            if (Ext.isIE) {
                a.l -= this.offset + rad;
                a.t -= this.offset + rad;
                a.w -= rad;
                a.h -= rad;
                a.t += 1;
            }
        break;
        case "sides":
            a.w = (o * 2);
            a.l = -o;
            a.t = o - 1;
            if (Ext.isIE) {
                a.l -= (this.offset - rad);
                a.t -= this.offset + rad;
                a.l += 1;
                a.w -= (this.offset - rad) * 2;
                a.w -= rad + 1;
                a.h -= 1;
            }
        break;
        case "frame":
            a.w = a.h = (o * 2);
            a.l = a.t = -o;
            a.t += 1;
            a.h -= 2;
            if (Ext.isIE) {
                a.l -= (this.offset - rad);
                a.t -= (this.offset - rad);
                a.l += 1;
                a.w -= (this.offset + rad + 1);
                a.h -= (this.offset + rad);
                a.h += 1;
            }
        break;
    };

    this.adjusts = a;
};

Ext.Shadow.prototype = {
    /**
     * @cfg {String} mode
     * The shadow display mode.  Supports the following options:<div class="mdetail-params"><ul>
     * <li><b><tt>sides</tt></b> : Shadow displays on both sides and bottom only</li>
     * <li><b><tt>frame</tt></b> : Shadow displays equally on all four sides</li>
     * <li><b><tt>drop</tt></b> : Traditional bottom-right drop shadow</li>
     * </ul></div>
     */
    /**
     * @cfg {String} offset
     * The number of pixels to offset the shadow from the element (defaults to <tt>4</tt>)
     */
    offset: 4,

    // private
    defaultMode: "drop",

    /**
     * Displays the shadow under the target element
     * @param {Mixed} targetEl The id or element under which the shadow should display
     */
    show: function(target) {
        target = Ext.get(target);
        if (!this.el) {
            this.el = Ext.Shadow.Pool.pull();
            if (this.el.dom.nextSibling != target.dom) {
                this.el.insertBefore(target);
            }
        }
        this.el.setStyle("z-index", this.zIndex || parseInt(target.getStyle("z-index"), 10) - 1);
        if (Ext.isIE) {
            this.el.dom.style.filter = "progid:DXImageTransform.Microsoft.alpha(opacity=50) progid:DXImageTransform.Microsoft.Blur(pixelradius=" + (this.offset) + ")";
        }
        this.realign(
        target.getLeft(true),
        target.getTop(true),
        target.getWidth(),
        target.getHeight()
        );
        this.el.dom.style.display = "block";
    },

    /**
     * Returns true if the shadow is visible, else false
     */
    isVisible: function() {
        return this.el ? true: false;
    },

    /**
     * Direct alignment when values are already available. Show must be called at least once before
     * calling this method to ensure it is initialized.
     * @param {Number} left The target element left position
     * @param {Number} top The target element top position
     * @param {Number} width The target element width
     * @param {Number} height The target element height
     */
    realign: function(l, t, w, h) {
        if (!this.el) {
            return;
        }
        var a = this.adjusts,
            d = this.el.dom,
            s = d.style,
            iea = 0,
            sw = (w + a.w),
            sh = (h + a.h),
            sws = sw + "px",
            shs = sh + "px",
            cn,
            sww;
        s.left = (l + a.l) + "px";
        s.top = (t + a.t) + "px";
        if (s.width != sws || s.height != shs) {
            s.width = sws;
            s.height = shs;
            if (!Ext.isIE) {
                cn = d.childNodes;
                sww = Math.max(0, (sw - 12)) + "px";
                cn[0].childNodes[1].style.width = sww;
                cn[1].childNodes[1].style.width = sww;
                cn[2].childNodes[1].style.width = sww;
                cn[1].style.height = Math.max(0, (sh - 12)) + "px";
            }
        }
    },

    /**
     * Hides this shadow
     */
    hide: function() {
        if (this.el) {
            this.el.dom.style.display = "none";
            Ext.Shadow.Pool.push(this.el);
            delete this.el;
        }
    },

    /**
     * Adjust the z-index of this shadow
     * @param {Number} zindex The new z-index
     */
    setZIndex: function(z) {
        this.zIndex = z;
        if (this.el) {
            this.el.setStyle("z-index", z);
        }
    }
};

// Private utility class that manages the internal Shadow cache
Ext.Shadow.Pool = function() {
    var p = [],
        markup = Ext.isIE ?
            '<div class="x-ie-shadow"></div>':
            '<div class="x-shadow"><div class="xst"><div class="xstl"></div><div class="xstc"></div><div class="xstr"></div></div><div class="xsc"><div class="xsml"></div><div class="xsmc"></div><div class="xsmr"></div></div><div class="xsb"><div class="xsbl"></div><div class="xsbc"></div><div class="xsbr"></div></div></div>';
    return {
        pull: function() {
            var sh = p.shift();
            if (!sh) {
                sh = Ext.get(Ext.DomHelper.insertHtml("beforeBegin", document.body.firstChild, markup));
                sh.autoBoxAdjust = false;
            }
            return sh;
        },

        push: function(sh) {
            p.push(sh);
        }
    };
}();/**
 * @class Ext.BoxComponent
 * @extends Ext.Component
 * <p>Base class for any {@link Ext.Component Component} that is to be sized as a box, using width and height.</p>
 * <p>BoxComponent provides automatic box model adjustments for sizing and positioning and will work correctly
 * within the Component rendering model.</p>
 * <p>A BoxComponent may be created as a custom Component which encapsulates any HTML element, either a pre-existing
 * element, or one that is created to your specifications at render time. Usually, to participate in layouts,
 * a Component will need to be a <b>Box</b>Component in order to have its width and height managed.</p>
 * <p>To use a pre-existing element as a BoxComponent, configure it so that you preset the <b>el</b> property to the
 * element to reference:<pre><code>
var pageHeader = new Ext.BoxComponent({
    el: 'my-header-div'
});</code></pre>
 * This may then be {@link Ext.Container#add added} to a {@link Ext.Container Container} as a child item.</p>
 * <p>To create a BoxComponent based around a HTML element to be created at render time, use the
 * {@link Ext.Component#autoEl autoEl} config option which takes the form of a
 * {@link Ext.DomHelper DomHelper} specification:<pre><code>
var myImage = new Ext.BoxComponent({
    autoEl: {
        tag: 'img',
        src: '/images/my-image.jpg'
    }
});</code></pre></p>
 * @constructor
 * @param {Ext.Element/String/Object} config The configuration options.
 * @xtype box
 */
Ext.BoxComponent = Ext.extend(Ext.Component, {

    // Configs below are used for all Components when rendered by BoxLayout.
    /**
     * @cfg {Number} flex
     * <p><b>Note</b>: this config is only used when this Component is rendered
     * by a Container which has been configured to use a <b>{@link Ext.layout.BoxLayout BoxLayout}.</b>
     * Each child Component with a <code>flex</code> property will be flexed either vertically (by a VBoxLayout)
     * or horizontally (by an HBoxLayout) according to the item's <b>relative</b> <code>flex</code> value
     * compared to the sum of all Components with <code>flex</flex> value specified. Any child items that have
     * either a <code>flex = 0</code> or <code>flex = undefined</code> will not be 'flexed' (the initial size will not be changed).
     */
    // Configs below are used for all Components when rendered by AnchorLayout.
    /**
     * @cfg {String} anchor <p><b>Note</b>: this config is only used when this Component is rendered
     * by a Container which has been configured to use an <b>{@link Ext.layout.AnchorLayout AnchorLayout} (or subclass thereof).</b>
     * based layout manager, for example:<div class="mdetail-params"><ul>
     * <li>{@link Ext.form.FormPanel}</li>
     * <li>specifying <code>layout: 'anchor' // or 'form', or 'absolute'</code></li>
     * </ul></div></p>
     * <p>See {@link Ext.layout.AnchorLayout}.{@link Ext.layout.AnchorLayout#anchor anchor} also.</p>
     */
    // tabTip config is used when a BoxComponent is a child of a TabPanel
    /**
     * @cfg {String} tabTip
     * <p><b>Note</b>: this config is only used when this BoxComponent is a child item of a TabPanel.</p>
     * A string to be used as innerHTML (html tags are accepted) to show in a tooltip when mousing over
     * the associated tab selector element. {@link Ext.QuickTips}.init()
     * must be called in order for the tips to render.
     */
    // Configs below are used for all Components when rendered by BorderLayout.
    /**
     * @cfg {String} region <p><b>Note</b>: this config is only used when this BoxComponent is rendered
     * by a Container which has been configured to use the <b>{@link Ext.layout.BorderLayout BorderLayout}</b>
     * layout manager (e.g. specifying <tt>layout:'border'</tt>).</p><br>
     * <p>See {@link Ext.layout.BorderLayout} also.</p>
     */
    // margins config is used when a BoxComponent is rendered by BorderLayout or BoxLayout.
    /**
     * @cfg {Object} margins <p><b>Note</b>: this config is only used when this BoxComponent is rendered
     * by a Container which has been configured to use the <b>{@link Ext.layout.BorderLayout BorderLayout}</b>
     * or one of the two <b>{@link Ext.layout.BoxLayout BoxLayout} subclasses.</b></p>
     * <p>An object containing margins to apply to this BoxComponent in the
     * format:</p><pre><code>
{
    top: (top margin),
    right: (right margin),
    bottom: (bottom margin),
    left: (left margin)
}</code></pre>
     * <p>May also be a string containing space-separated, numeric margin values. The order of the
     * sides associated with each value matches the way CSS processes margin values:</p>
     * <p><div class="mdetail-params"><ul>
     * <li>If there is only one value, it applies to all sides.</li>
     * <li>If there are two values, the top and bottom borders are set to the first value and the
     * right and left are set to the second.</li>
     * <li>If there are three values, the top is set to the first value, the left and right are set
     * to the second, and the bottom is set to the third.</li>
     * <li>If there are four values, they apply to the top, right, bottom, and left, respectively.</li>
     * </ul></div></p>
     * <p>Defaults to:</p><pre><code>
     * {top:0, right:0, bottom:0, left:0}
     * </code></pre>
     */
    /**
     * @cfg {Number} x
     * The local x (left) coordinate for this component if contained within a positioning container.
     */
    /**
     * @cfg {Number} y
     * The local y (top) coordinate for this component if contained within a positioning container.
     */
    /**
     * @cfg {Number} pageX
     * The page level x coordinate for this component if contained within a positioning container.
     */
    /**
     * @cfg {Number} pageY
     * The page level y coordinate for this component if contained within a positioning container.
     */
    /**
     * @cfg {Number} height
     * The height of this component in pixels (defaults to auto).
     * <b>Note</b> to express this dimension as a percentage or offset see {@link Ext.Component#anchor}.
     */
    /**
     * @cfg {Number} width
     * The width of this component in pixels (defaults to auto).
     * <b>Note</b> to express this dimension as a percentage or offset see {@link Ext.Component#anchor}.
     */
    /**
     * @cfg {Number} boxMinHeight
     * <p>The minimum value in pixels which this BoxComponent will set its height to.</p>
     * <p><b>Warning:</b> This will override any size management applied by layout managers.</p>
     */
    /**
     * @cfg {Number} boxMinWidth
     * <p>The minimum value in pixels which this BoxComponent will set its width to.</p>
     * <p><b>Warning:</b> This will override any size management applied by layout managers.</p>
     */
    /**
     * @cfg {Number} boxMaxHeight
     * <p>The maximum value in pixels which this BoxComponent will set its height to.</p>
     * <p><b>Warning:</b> This will override any size management applied by layout managers.</p>
     */
    /**
     * @cfg {Number} boxMaxWidth
     * <p>The maximum value in pixels which this BoxComponent will set its width to.</p>
     * <p><b>Warning:</b> This will override any size management applied by layout managers.</p>
     */
    /**
     * @cfg {Boolean} autoHeight
     * <p>True to use height:'auto', false to use fixed height (or allow it to be managed by its parent
     * Container's {@link Ext.Container#layout layout manager}. Defaults to false.</p>
     * <p><b>Note</b>: Although many components inherit this config option, not all will
     * function as expected with a height of 'auto'. Setting autoHeight:true means that the
     * browser will manage height based on the element's contents, and that Ext will not manage it at all.</p>
     * <p>If the <i>browser</i> is managing the height, be aware that resizes performed by the browser in response
     * to changes within the structure of the Component cannot be detected. Therefore changes to the height might
     * result in elements needing to be synchronized with the new height. Example:</p><pre><code>
var w = new Ext.Window({
    title: 'Window',
    width: 600,
    autoHeight: true,
    items: {
        title: 'Collapse Me',
        height: 400,
        collapsible: true,
        border: false,
        listeners: {
            beforecollapse: function() {
                w.el.shadow.hide();
            },
            beforeexpand: function() {
                w.el.shadow.hide();
            },
            collapse: function() {
                w.syncShadow();
            },
            expand: function() {
                w.syncShadow();
            }
        }
    }
}).show();
</code></pre>
     */
    /**
     * @cfg {Boolean} autoWidth
     * <p>True to use width:'auto', false to use fixed width (or allow it to be managed by its parent
     * Container's {@link Ext.Container#layout layout manager}. Defaults to false.</p>
     * <p><b>Note</b>: Although many components  inherit this config option, not all will
     * function as expected with a width of 'auto'. Setting autoWidth:true means that the
     * browser will manage width based on the element's contents, and that Ext will not manage it at all.</p>
     * <p>If the <i>browser</i> is managing the width, be aware that resizes performed by the browser in response
     * to changes within the structure of the Component cannot be detected. Therefore changes to the width might
     * result in elements needing to be synchronized with the new width. For example, where the target element is:</p><pre><code>
&lt;div id='grid-container' style='margin-left:25%;width:50%'>&lt;/div>
</code></pre>
     * A Panel rendered into that target element must listen for browser window resize in order to relay its
      * child items when the browser changes its width:<pre><code>
var myPanel = new Ext.Panel({
    renderTo: 'grid-container',
    monitorResize: true, // relay on browser resize
    title: 'Panel',
    height: 400,
    autoWidth: true,
    layout: 'hbox',
    layoutConfig: {
        align: 'stretch'
    },
    defaults: {
        flex: 1
    },
    items: [{
        title: 'Box 1',
    }, {
        title: 'Box 2'
    }, {
        title: 'Box 3'
    }],
});
</code></pre>
     */
    /**
     * @cfg {Boolean} autoScroll
     * <code>true</code> to use overflow:'auto' on the components layout element and show scroll bars automatically when
     * necessary, <code>false</code> to clip any overflowing content (defaults to <code>false</code>).
     */

    /* // private internal config
     * {Boolean} deferHeight
     * True to defer height calculations to an external component, false to allow this component to set its own
     * height (defaults to false).
     */

    // private
    initComponent : function(){
        Ext.BoxComponent.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event resize
             * Fires after the component is resized.
             * @param {Ext.Component} this
             * @param {Number} adjWidth The box-adjusted width that was set
             * @param {Number} adjHeight The box-adjusted height that was set
             * @param {Number} rawWidth The width that was originally specified
             * @param {Number} rawHeight The height that was originally specified
             */
            'resize',
            /**
             * @event move
             * Fires after the component is moved.
             * @param {Ext.Component} this
             * @param {Number} x The new x position
             * @param {Number} y The new y position
             */
            'move'
        );
    },

    // private, set in afterRender to signify that the component has been rendered
    boxReady : false,
    // private, used to defer height settings to subclasses
    deferHeight: false,

    /**
     * Sets the width and height of this BoxComponent. This method fires the {@link #resize} event. This method can accept
     * either width and height as separate arguments, or you can pass a size object like <code>{width:10, height:20}</code>.
     * @param {Mixed} width The new width to set. This may be one of:<div class="mdetail-params"><ul>
     * <li>A Number specifying the new width in the {@link #getEl Element}'s {@link Ext.Element#defaultUnit}s (by default, pixels).</li>
     * <li>A String used to set the CSS width style.</li>
     * <li>A size object in the format <code>{width: widthValue, height: heightValue}</code>.</li>
     * <li><code>undefined</code> to leave the width unchanged.</li>
     * </ul></div>
     * @param {Mixed} height The new height to set (not required if a size object is passed as the first arg).
     * This may be one of:<div class="mdetail-params"><ul>
     * <li>A Number specifying the new height in the {@link #getEl Element}'s {@link Ext.Element#defaultUnit}s (by default, pixels).</li>
     * <li>A String used to set the CSS height style. Animation may <b>not</b> be used.</li>
     * <li><code>undefined</code> to leave the height unchanged.</li>
     * </ul></div>
     * @return {Ext.BoxComponent} this
     */
    setSize : function(w, h){

        // support for standard size objects
        if(typeof w == 'object'){
            h = w.height;
            w = w.width;
        }
        if (Ext.isDefined(w) && Ext.isDefined(this.boxMinWidth) && (w < this.boxMinWidth)) {
            w = this.boxMinWidth;
        }
        if (Ext.isDefined(h) && Ext.isDefined(this.boxMinHeight) && (h < this.boxMinHeight)) {
            h = this.boxMinHeight;
        }
        if (Ext.isDefined(w) && Ext.isDefined(this.boxMaxWidth) && (w > this.boxMaxWidth)) {
            w = this.boxMaxWidth;
        }
        if (Ext.isDefined(h) && Ext.isDefined(this.boxMaxHeight) && (h > this.boxMaxHeight)) {
            h = this.boxMaxHeight;
        }
        // not rendered
        if(!this.boxReady){
            this.width  = w;
            this.height = h;
            return this;
        }

        // prevent recalcs when not needed
        if(this.cacheSizes !== false && this.lastSize && this.lastSize.width == w && this.lastSize.height == h){
            return this;
        }
        this.lastSize = {width: w, height: h};
        var adj = this.adjustSize(w, h),
            aw = adj.width,
            ah = adj.height,
            rz;
        if(aw !== undefined || ah !== undefined){ // this code is nasty but performs better with floaters
            rz = this.getResizeEl();
            if(!this.deferHeight && aw !== undefined && ah !== undefined){
                rz.setSize(aw, ah);
            }else if(!this.deferHeight && ah !== undefined){
                rz.setHeight(ah);
            }else if(aw !== undefined){
                rz.setWidth(aw);
            }
            this.onResize(aw, ah, w, h);
            this.fireEvent('resize', this, aw, ah, w, h);
        }
        return this;
    },

    /**
     * Sets the width of the component.  This method fires the {@link #resize} event.
     * @param {Mixed} width The new width to set. This may be one of:<div class="mdetail-params"><ul>
     * <li>A Number specifying the new width in the {@link #getEl Element}'s {@link Ext.Element#defaultUnit defaultUnit}s (by default, pixels).</li>
     * <li>A String used to set the CSS width style.</li>
     * </ul></div>
     * @return {Ext.BoxComponent} this
     */
    setWidth : function(width){
        return this.setSize(width);
    },

    /**
     * Sets the height of the component.  This method fires the {@link #resize} event.
     * @param {Mixed} height The new height to set. This may be one of:<div class="mdetail-params"><ul>
     * <li>A Number specifying the new height in the {@link #getEl Element}'s {@link Ext.Element#defaultUnit defaultUnit}s (by default, pixels).</li>
     * <li>A String used to set the CSS height style.</li>
     * <li><i>undefined</i> to leave the height unchanged.</li>
     * </ul></div>
     * @return {Ext.BoxComponent} this
     */
    setHeight : function(height){
        return this.setSize(undefined, height);
    },

    /**
     * Gets the current size of the component's underlying element.
     * @return {Object} An object containing the element's size {width: (element width), height: (element height)}
     */
    getSize : function(){
        return this.getResizeEl().getSize();
    },

    /**
     * Gets the current width of the component's underlying element.
     * @return {Number}
     */
    getWidth : function(){
        return this.getResizeEl().getWidth();
    },

    /**
     * Gets the current height of the component's underlying element.
     * @return {Number}
     */
    getHeight : function(){
        return this.getResizeEl().getHeight();
    },

    /**
     * Gets the current size of the component's underlying element, including space taken by its margins.
     * @return {Object} An object containing the element's size {width: (element width + left/right margins), height: (element height + top/bottom margins)}
     */
    getOuterSize : function(){
        var el = this.getResizeEl();
        return {width: el.getWidth() + el.getMargins('lr'),
                height: el.getHeight() + el.getMargins('tb')};
    },

    /**
     * Gets the current XY position of the component's underlying element.
     * @param {Boolean} local (optional) If true the element's left and top are returned instead of page XY (defaults to false)
     * @return {Array} The XY position of the element (e.g., [100, 200])
     */
    getPosition : function(local){
        var el = this.getPositionEl();
        if(local === true){
            return [el.getLeft(true), el.getTop(true)];
        }
        return this.xy || el.getXY();
    },

    /**
     * Gets the current box measurements of the component's underlying element.
     * @param {Boolean} local (optional) If true the element's left and top are returned instead of page XY (defaults to false)
     * @return {Object} box An object in the format {x, y, width, height}
     */
    getBox : function(local){
        var pos = this.getPosition(local);
        var s = this.getSize();
        s.x = pos[0];
        s.y = pos[1];
        return s;
    },

    /**
     * Sets the current box measurements of the component's underlying element.
     * @param {Object} box An object in the format {x, y, width, height}
     * @return {Ext.BoxComponent} this
     */
    updateBox : function(box){
        this.setSize(box.width, box.height);
        this.setPagePosition(box.x, box.y);
        return this;
    },

    /**
     * <p>Returns the outermost Element of this Component which defines the Components overall size.</p>
     * <p><i>Usually</i> this will return the same Element as <code>{@link #getEl}</code>,
     * but in some cases, a Component may have some more wrapping Elements around its main
     * active Element.</p>
     * <p>An example is a ComboBox. It is encased in a <i>wrapping</i> Element which
     * contains both the <code>&lt;input></code> Element (which is what would be returned
     * by its <code>{@link #getEl}</code> method, <i>and</i> the trigger button Element.
     * This Element is returned as the <code>resizeEl</code>.
     * @return {Ext.Element} The Element which is to be resized by size managing layouts.
     */
    getResizeEl : function(){
        return this.resizeEl || this.el;
    },

    /**
     * Sets the overflow on the content element of the component.
     * @param {Boolean} scroll True to allow the Component to auto scroll.
     * @return {Ext.BoxComponent} this
     */
    setAutoScroll : function(scroll){
        if(this.rendered){
            this.getContentTarget().setOverflow(scroll ? 'auto' : '');
        }
        this.autoScroll = scroll;
        return this;
    },

    /**
     * Sets the left and top of the component.  To set the page XY position instead, use {@link #setPagePosition}.
     * This method fires the {@link #move} event.
     * @param {Number} left The new left
     * @param {Number} top The new top
     * @return {Ext.BoxComponent} this
     */
    setPosition : function(x, y){
        if(x && typeof x[1] == 'number'){
            y = x[1];
            x = x[0];
        }
        this.x = x;
        this.y = y;
        if(!this.boxReady){
            return this;
        }
        var adj = this.adjustPosition(x, y);
        var ax = adj.x, ay = adj.y;

        var el = this.getPositionEl();
        if(ax !== undefined || ay !== undefined){
            if(ax !== undefined && ay !== undefined){
                el.setLeftTop(ax, ay);
            }else if(ax !== undefined){
                el.setLeft(ax);
            }else if(ay !== undefined){
                el.setTop(ay);
            }
            this.onPosition(ax, ay);
            this.fireEvent('move', this, ax, ay);
        }
        return this;
    },

    /**
     * Sets the page XY position of the component.  To set the left and top instead, use {@link #setPosition}.
     * This method fires the {@link #move} event.
     * @param {Number} x The new x position
     * @param {Number} y The new y position
     * @return {Ext.BoxComponent} this
     */
    setPagePosition : function(x, y){
        if(x && typeof x[1] == 'number'){
            y = x[1];
            x = x[0];
        }
        this.pageX = x;
        this.pageY = y;
        if(!this.boxReady){
            return;
        }
        if(x === undefined || y === undefined){ // cannot translate undefined points
            return;
        }
        var p = this.getPositionEl().translatePoints(x, y);
        this.setPosition(p.left, p.top);
        return this;
    },

    // private
    afterRender : function(){
        Ext.BoxComponent.superclass.afterRender.call(this);
        if(this.resizeEl){
            this.resizeEl = Ext.get(this.resizeEl);
        }
        if(this.positionEl){
            this.positionEl = Ext.get(this.positionEl);
        }
        this.boxReady = true;
        Ext.isDefined(this.autoScroll) && this.setAutoScroll(this.autoScroll);
        this.setSize(this.width, this.height);
        if(this.x || this.y){
            this.setPosition(this.x, this.y);
        }else if(this.pageX || this.pageY){
            this.setPagePosition(this.pageX, this.pageY);
        }
    },

    /**
     * Force the component's size to recalculate based on the underlying element's current height and width.
     * @return {Ext.BoxComponent} this
     */
    syncSize : function(){
        delete this.lastSize;
        this.setSize(this.autoWidth ? undefined : this.getResizeEl().getWidth(), this.autoHeight ? undefined : this.getResizeEl().getHeight());
        return this;
    },

    /* // protected
     * Called after the component is resized, this method is empty by default but can be implemented by any
     * subclass that needs to perform custom logic after a resize occurs.
     * @param {Number} adjWidth The box-adjusted width that was set
     * @param {Number} adjHeight The box-adjusted height that was set
     * @param {Number} rawWidth The width that was originally specified
     * @param {Number} rawHeight The height that was originally specified
     */
    onResize : function(adjWidth, adjHeight, rawWidth, rawHeight){
    },

    /* // protected
     * Called after the component is moved, this method is empty by default but can be implemented by any
     * subclass that needs to perform custom logic after a move occurs.
     * @param {Number} x The new x position
     * @param {Number} y The new y position
     */
    onPosition : function(x, y){

    },

    // private
    adjustSize : function(w, h){
        if(this.autoWidth){
            w = 'auto';
        }
        if(this.autoHeight){
            h = 'auto';
        }
        return {width : w, height: h};
    },

    // private
    adjustPosition : function(x, y){
        return {x : x, y: y};
    }
});
Ext.reg('box', Ext.BoxComponent);


/**
 * @class Ext.Spacer
 * @extends Ext.BoxComponent
 * <p>Used to provide a sizable space in a layout.</p>
 * @constructor
 * @param {Object} config
 */
Ext.Spacer = Ext.extend(Ext.BoxComponent, {
    autoEl:'div'
});
Ext.reg('spacer', Ext.Spacer);/**
 * @class Ext.SplitBar
 * @extends Ext.util.Observable
 * Creates draggable splitter bar functionality from two elements (element to be dragged and element to be resized).
 * <br><br>
 * Usage:
 * <pre><code>
var split = new Ext.SplitBar("elementToDrag", "elementToSize",
                   Ext.SplitBar.HORIZONTAL, Ext.SplitBar.LEFT);
split.setAdapter(new Ext.SplitBar.AbsoluteLayoutAdapter("container"));
split.minSize = 100;
split.maxSize = 600;
split.animate = true;
split.on('moved', splitterMoved);
</code></pre>
 * @constructor
 * Create a new SplitBar
 * @param {Mixed} dragElement The element to be dragged and act as the SplitBar.
 * @param {Mixed} resizingElement The element to be resized based on where the SplitBar element is dragged
 * @param {Number} orientation (optional) Either Ext.SplitBar.HORIZONTAL or Ext.SplitBar.VERTICAL. (Defaults to HORIZONTAL)
 * @param {Number} placement (optional) Either Ext.SplitBar.LEFT or Ext.SplitBar.RIGHT for horizontal or
                        Ext.SplitBar.TOP or Ext.SplitBar.BOTTOM for vertical. (By default, this is determined automatically by the initial
                        position of the SplitBar).
 */
Ext.SplitBar = function(dragElement, resizingElement, orientation, placement, existingProxy){

    /** @private */
    this.el = Ext.get(dragElement, true);
    this.el.dom.unselectable = "on";
    /** @private */
    this.resizingEl = Ext.get(resizingElement, true);

    /**
     * @private
     * The orientation of the split. Either Ext.SplitBar.HORIZONTAL or Ext.SplitBar.VERTICAL. (Defaults to HORIZONTAL)
     * Note: If this is changed after creating the SplitBar, the placement property must be manually updated
     * @type Number
     */
    this.orientation = orientation || Ext.SplitBar.HORIZONTAL;

    /**
     * The increment, in pixels by which to move this SplitBar. When <i>undefined</i>, the SplitBar moves smoothly.
     * @type Number
     * @property tickSize
     */
    /**
     * The minimum size of the resizing element. (Defaults to 0)
     * @type Number
     */
    this.minSize = 0;

    /**
     * The maximum size of the resizing element. (Defaults to 2000)
     * @type Number
     */
    this.maxSize = 2000;

    /**
     * Whether to animate the transition to the new size
     * @type Boolean
     */
    this.animate = false;

    /**
     * Whether to create a transparent shim that overlays the page when dragging, enables dragging across iframes.
     * @type Boolean
     */
    this.useShim = false;

    /** @private */
    this.shim = null;

    if(!existingProxy){
        /** @private */
        this.proxy = Ext.SplitBar.createProxy(this.orientation);
    }else{
        this.proxy = Ext.get(existingProxy).dom;
    }
    /** @private */
    this.dd = new Ext.dd.DDProxy(this.el.dom.id, "XSplitBars", {dragElId : this.proxy.id});

    /** @private */
    this.dd.b4StartDrag = this.onStartProxyDrag.createDelegate(this);

    /** @private */
    this.dd.endDrag = this.onEndProxyDrag.createDelegate(this);

    /** @private */
    this.dragSpecs = {};

    /**
     * @private The adapter to use to positon and resize elements
     */
    this.adapter = new Ext.SplitBar.BasicLayoutAdapter();
    this.adapter.init(this);

    if(this.orientation == Ext.SplitBar.HORIZONTAL){
        /** @private */
        this.placement = placement || (this.el.getX() > this.resizingEl.getX() ? Ext.SplitBar.LEFT : Ext.SplitBar.RIGHT);
        this.el.addClass("x-splitbar-h");
    }else{
        /** @private */
        this.placement = placement || (this.el.getY() > this.resizingEl.getY() ? Ext.SplitBar.TOP : Ext.SplitBar.BOTTOM);
        this.el.addClass("x-splitbar-v");
    }

    this.addEvents(
        /**
         * @event resize
         * Fires when the splitter is moved (alias for {@link #moved})
         * @param {Ext.SplitBar} this
         * @param {Number} newSize the new width or height
         */
        "resize",
        /**
         * @event moved
         * Fires when the splitter is moved
         * @param {Ext.SplitBar} this
         * @param {Number} newSize the new width or height
         */
        "moved",
        /**
         * @event beforeresize
         * Fires before the splitter is dragged
         * @param {Ext.SplitBar} this
         */
        "beforeresize",

        "beforeapply"
    );

    Ext.SplitBar.superclass.constructor.call(this);
};

Ext.extend(Ext.SplitBar, Ext.util.Observable, {
    onStartProxyDrag : function(x, y){
        this.fireEvent("beforeresize", this);
        this.overlay =  Ext.DomHelper.append(document.body,  {cls: "x-drag-overlay", html: "&#160;"}, true);
        this.overlay.unselectable();
        this.overlay.setSize(Ext.lib.Dom.getViewWidth(true), Ext.lib.Dom.getViewHeight(true));
        this.overlay.show();
        Ext.get(this.proxy).setDisplayed("block");
        var size = this.adapter.getElementSize(this);
        this.activeMinSize = this.getMinimumSize();
        this.activeMaxSize = this.getMaximumSize();
        var c1 = size - this.activeMinSize;
        var c2 = Math.max(this.activeMaxSize - size, 0);
        if(this.orientation == Ext.SplitBar.HORIZONTAL){
            this.dd.resetConstraints();
            this.dd.setXConstraint(
                this.placement == Ext.SplitBar.LEFT ? c1 : c2,
                this.placement == Ext.SplitBar.LEFT ? c2 : c1,
                this.tickSize
            );
            this.dd.setYConstraint(0, 0);
        }else{
            this.dd.resetConstraints();
            this.dd.setXConstraint(0, 0);
            this.dd.setYConstraint(
                this.placement == Ext.SplitBar.TOP ? c1 : c2,
                this.placement == Ext.SplitBar.TOP ? c2 : c1,
                this.tickSize
            );
         }
        this.dragSpecs.startSize = size;
        this.dragSpecs.startPoint = [x, y];
        Ext.dd.DDProxy.prototype.b4StartDrag.call(this.dd, x, y);
    },

    /**
     * @private Called after the drag operation by the DDProxy
     */
    onEndProxyDrag : function(e){
        Ext.get(this.proxy).setDisplayed(false);
        var endPoint = Ext.lib.Event.getXY(e);
        if(this.overlay){
            Ext.destroy(this.overlay);
            delete this.overlay;
        }
        var newSize;
        if(this.orientation == Ext.SplitBar.HORIZONTAL){
            newSize = this.dragSpecs.startSize +
                (this.placement == Ext.SplitBar.LEFT ?
                    endPoint[0] - this.dragSpecs.startPoint[0] :
                    this.dragSpecs.startPoint[0] - endPoint[0]
                );
        }else{
            newSize = this.dragSpecs.startSize +
                (this.placement == Ext.SplitBar.TOP ?
                    endPoint[1] - this.dragSpecs.startPoint[1] :
                    this.dragSpecs.startPoint[1] - endPoint[1]
                );
        }
        newSize = Math.min(Math.max(newSize, this.activeMinSize), this.activeMaxSize);
        if(newSize != this.dragSpecs.startSize){
            if(this.fireEvent('beforeapply', this, newSize) !== false){
                this.adapter.setElementSize(this, newSize);
                this.fireEvent("moved", this, newSize);
                this.fireEvent("resize", this, newSize);
            }
        }
    },

    /**
     * Get the adapter this SplitBar uses
     * @return The adapter object
     */
    getAdapter : function(){
        return this.adapter;
    },

    /**
     * Set the adapter this SplitBar uses
     * @param {Object} adapter A SplitBar adapter object
     */
    setAdapter : function(adapter){
        this.adapter = adapter;
        this.adapter.init(this);
    },

    /**
     * Gets the minimum size for the resizing element
     * @return {Number} The minimum size
     */
    getMinimumSize : function(){
        return this.minSize;
    },

    /**
     * Sets the minimum size for the resizing element
     * @param {Number} minSize The minimum size
     */
    setMinimumSize : function(minSize){
        this.minSize = minSize;
    },

    /**
     * Gets the maximum size for the resizing element
     * @return {Number} The maximum size
     */
    getMaximumSize : function(){
        return this.maxSize;
    },

    /**
     * Sets the maximum size for the resizing element
     * @param {Number} maxSize The maximum size
     */
    setMaximumSize : function(maxSize){
        this.maxSize = maxSize;
    },

    /**
     * Sets the initialize size for the resizing element
     * @param {Number} size The initial size
     */
    setCurrentSize : function(size){
        var oldAnimate = this.animate;
        this.animate = false;
        this.adapter.setElementSize(this, size);
        this.animate = oldAnimate;
    },

    /**
     * Destroy this splitbar.
     * @param {Boolean} removeEl True to remove the element
     */
    destroy : function(removeEl){
        Ext.destroy(this.shim, Ext.get(this.proxy));
        this.dd.unreg();
        if(removeEl){
            this.el.remove();
        }
        this.purgeListeners();
    }
});

/**
 * @private static Create our own proxy element element. So it will be the same same size on all browsers, we won't use borders. Instead we use a background color.
 */
Ext.SplitBar.createProxy = function(dir){
    var proxy = new Ext.Element(document.createElement("div"));
    document.body.appendChild(proxy.dom);
    proxy.unselectable();
    var cls = 'x-splitbar-proxy';
    proxy.addClass(cls + ' ' + (dir == Ext.SplitBar.HORIZONTAL ? cls +'-h' : cls + '-v'));
    return proxy.dom;
};

/**
 * @class Ext.SplitBar.BasicLayoutAdapter
 * Default Adapter. It assumes the splitter and resizing element are not positioned
 * elements and only gets/sets the width of the element. Generally used for table based layouts.
 */
Ext.SplitBar.BasicLayoutAdapter = function(){
};

Ext.SplitBar.BasicLayoutAdapter.prototype = {
    // do nothing for now
    init : function(s){

    },
    /**
     * Called before drag operations to get the current size of the resizing element.
     * @param {Ext.SplitBar} s The SplitBar using this adapter
     */
     getElementSize : function(s){
        if(s.orientation == Ext.SplitBar.HORIZONTAL){
            return s.resizingEl.getWidth();
        }else{
            return s.resizingEl.getHeight();
        }
    },

    /**
     * Called after drag operations to set the size of the resizing element.
     * @param {Ext.SplitBar} s The SplitBar using this adapter
     * @param {Number} newSize The new size to set
     * @param {Function} onComplete A function to be invoked when resizing is complete
     */
    setElementSize : function(s, newSize, onComplete){
        if(s.orientation == Ext.SplitBar.HORIZONTAL){
            if(!s.animate){
                s.resizingEl.setWidth(newSize);
                if(onComplete){
                    onComplete(s, newSize);
                }
            }else{
                s.resizingEl.setWidth(newSize, true, .1, onComplete, 'easeOut');
            }
        }else{

            if(!s.animate){
                s.resizingEl.setHeight(newSize);
                if(onComplete){
                    onComplete(s, newSize);
                }
            }else{
                s.resizingEl.setHeight(newSize, true, .1, onComplete, 'easeOut');
            }
        }
    }
};

/**
 *@class Ext.SplitBar.AbsoluteLayoutAdapter
 * @extends Ext.SplitBar.BasicLayoutAdapter
 * Adapter that  moves the splitter element to align with the resized sizing element.
 * Used with an absolute positioned SplitBar.
 * @param {Mixed} container The container that wraps around the absolute positioned content. If it's
 * document.body, make sure you assign an id to the body element.
 */
Ext.SplitBar.AbsoluteLayoutAdapter = function(container){
    this.basic = new Ext.SplitBar.BasicLayoutAdapter();
    this.container = Ext.get(container);
};

Ext.SplitBar.AbsoluteLayoutAdapter.prototype = {
    init : function(s){
        this.basic.init(s);
    },

    getElementSize : function(s){
        return this.basic.getElementSize(s);
    },

    setElementSize : function(s, newSize, onComplete){
        this.basic.setElementSize(s, newSize, this.moveSplitter.createDelegate(this, [s]));
    },

    moveSplitter : function(s){
        var yes = Ext.SplitBar;
        switch(s.placement){
            case yes.LEFT:
                s.el.setX(s.resizingEl.getRight());
                break;
            case yes.RIGHT:
                s.el.setStyle("right", (this.container.getWidth() - s.resizingEl.getLeft()) + "px");
                break;
            case yes.TOP:
                s.el.setY(s.resizingEl.getBottom());
                break;
            case yes.BOTTOM:
                s.el.setY(s.resizingEl.getTop() - s.el.getHeight());
                break;
        }
    }
};

/**
 * Orientation constant - Create a vertical SplitBar
 * @static
 * @type Number
 */
Ext.SplitBar.VERTICAL = 1;

/**
 * Orientation constant - Create a horizontal SplitBar
 * @static
 * @type Number
 */
Ext.SplitBar.HORIZONTAL = 2;

/**
 * Placement constant - The resizing element is to the left of the splitter element
 * @static
 * @type Number
 */
Ext.SplitBar.LEFT = 1;

/**
 * Placement constant - The resizing element is to the right of the splitter element
 * @static
 * @type Number
 */
Ext.SplitBar.RIGHT = 2;

/**
 * Placement constant - The resizing element is positioned above the splitter element
 * @static
 * @type Number
 */
Ext.SplitBar.TOP = 3;

/**
 * Placement constant - The resizing element is positioned under splitter element
 * @static
 * @type Number
 */
Ext.SplitBar.BOTTOM = 4;
/**
 * @class Ext.Container
 * @extends Ext.BoxComponent
 * <p>Base class for any {@link Ext.BoxComponent} that may contain other Components. Containers handle the
 * basic behavior of containing items, namely adding, inserting and removing items.</p>
 *
 * <p>The most commonly used Container classes are {@link Ext.Panel}, {@link Ext.Window} and {@link Ext.TabPanel}.
 * If you do not need the capabilities offered by the aforementioned classes you can create a lightweight
 * Container to be encapsulated by an HTML element to your specifications by using the
 * <code><b>{@link Ext.Component#autoEl autoEl}</b></code> config option. This is a useful technique when creating
 * embedded {@link Ext.layout.ColumnLayout column} layouts inside {@link Ext.form.FormPanel FormPanels}
 * for example.</p>
 *
 * <p>The code below illustrates both how to explicitly create a Container, and how to implicitly
 * create one using the <b><code>'container'</code></b> xtype:<pre><code>
// explicitly create a Container
var embeddedColumns = new Ext.Container({
    autoEl: 'div',  // This is the default
    layout: 'column',
    defaults: {
        // implicitly create Container by specifying xtype
        xtype: 'container',
        autoEl: 'div', // This is the default.
        layout: 'form',
        columnWidth: 0.5,
        style: {
            padding: '10px'
        }
    },
//  The two items below will be Ext.Containers, each encapsulated by a &lt;DIV> element.
    items: [{
        items: {
            xtype: 'datefield',
            name: 'startDate',
            fieldLabel: 'Start date'
        }
    }, {
        items: {
            xtype: 'datefield',
            name: 'endDate',
            fieldLabel: 'End date'
        }
    }]
});</code></pre></p>
 *
 * <p><u><b>Layout</b></u></p>
 * <p>Container classes delegate the rendering of child Components to a layout
 * manager class which must be configured into the Container using the
 * <code><b>{@link #layout}</b></code> configuration property.</p>
 * <p>When either specifying child <code>{@link #items}</code> of a Container,
 * or dynamically {@link #add adding} Components to a Container, remember to
 * consider how you wish the Container to arrange those child elements, and
 * whether those child elements need to be sized using one of Ext's built-in
 * <b><code>{@link #layout}</code></b> schemes. By default, Containers use the
 * {@link Ext.layout.ContainerLayout ContainerLayout} scheme which only
 * renders child components, appending them one after the other inside the
 * Container, and <b>does not apply any sizing</b> at all.</p>
 * <p>A common mistake is when a developer neglects to specify a
 * <b><code>{@link #layout}</code></b> (e.g. widgets like GridPanels or
 * TreePanels are added to Containers for which no <code><b>{@link #layout}</b></code>
 * has been specified). If a Container is left to use the default
 * {@link Ext.layout.ContainerLayout ContainerLayout} scheme, none of its
 * child components will be resized, or changed in any way when the Container
 * is resized.</p>
 * <p>Certain layout managers allow dynamic addition of child components.
 * Those that do include {@link Ext.layout.CardLayout},
 * {@link Ext.layout.AnchorLayout}, {@link Ext.layout.FormLayout}, and
 * {@link Ext.layout.TableLayout}. For example:<pre><code>
//  Create the GridPanel.
var myNewGrid = new Ext.grid.GridPanel({
    store: myStore,
    columns: myColumnModel,
    title: 'Results', // the title becomes the title of the tab
});

myTabPanel.add(myNewGrid); // {@link Ext.TabPanel} implicitly uses {@link Ext.layout.CardLayout CardLayout}
myTabPanel.{@link Ext.TabPanel#setActiveTab setActiveTab}(myNewGrid);
 * </code></pre></p>
 * <p>The example above adds a newly created GridPanel to a TabPanel. Note that
 * a TabPanel uses {@link Ext.layout.CardLayout} as its layout manager which
 * means all its child items are sized to {@link Ext.layout.FitLayout fit}
 * exactly into its client area.
 * <p><b><u>Overnesting is a common problem</u></b>.
 * An example of overnesting occurs when a GridPanel is added to a TabPanel
 * by wrapping the GridPanel <i>inside</i> a wrapping Panel (that has no
 * <code><b>{@link #layout}</b></code> specified) and then add that wrapping Panel
 * to the TabPanel. The point to realize is that a GridPanel <b>is</b> a
 * Component which can be added directly to a Container. If the wrapping Panel
 * has no <code><b>{@link #layout}</b></code> configuration, then the overnested
 * GridPanel will not be sized as expected.<p>
 *
 * <p><u><b>Adding via remote configuration</b></u></p>
 *
 * <p>A server side script can be used to add Components which are generated dynamically on the server.
 * An example of adding a GridPanel to a TabPanel where the GridPanel is generated by the server
 * based on certain parameters:
 * </p><pre><code>
// execute an Ajax request to invoke server side script:
Ext.Ajax.request({
    url: 'gen-invoice-grid.php',
    // send additional parameters to instruct server script
    params: {
        startDate: Ext.getCmp('start-date').getValue(),
        endDate: Ext.getCmp('end-date').getValue()
    },
    // process the response object to add it to the TabPanel:
    success: function(xhr) {
        var newComponent = eval(xhr.responseText); // see discussion below
        myTabPanel.add(newComponent); // add the component to the TabPanel
        myTabPanel.setActiveTab(newComponent);
    },
    failure: function() {
        Ext.Msg.alert("Grid create failed", "Server communication failure");
    }
});
</code></pre>
 * <p>The server script needs to return an executable Javascript statement which, when processed
 * using <code>eval()</code>, will return either a config object with an {@link Ext.Component#xtype xtype},
 * or an instantiated Component. The server might return this for example:</p><pre><code>
(function() {
    function formatDate(value){
        return value ? value.dateFormat('M d, Y') : '';
    };

    var store = new Ext.data.Store({
        url: 'get-invoice-data.php',
        baseParams: {
            startDate: '01/01/2008',
            endDate: '01/31/2008'
        },
        reader: new Ext.data.JsonReader({
            record: 'transaction',
            idProperty: 'id',
            totalRecords: 'total'
        }, [
           'customer',
           'invNo',
           {name: 'date', type: 'date', dateFormat: 'm/d/Y'},
           {name: 'value', type: 'float'}
        ])
    });

    var grid = new Ext.grid.GridPanel({
        title: 'Invoice Report',
        bbar: new Ext.PagingToolbar(store),
        store: store,
        columns: [
            {header: "Customer", width: 250, dataIndex: 'customer', sortable: true},
            {header: "Invoice Number", width: 120, dataIndex: 'invNo', sortable: true},
            {header: "Invoice Date", width: 100, dataIndex: 'date', renderer: formatDate, sortable: true},
            {header: "Value", width: 120, dataIndex: 'value', renderer: 'usMoney', sortable: true}
        ],
    });
    store.load();
    return grid;  // return instantiated component
})();
</code></pre>
 * <p>When the above code fragment is passed through the <code>eval</code> function in the success handler
 * of the Ajax request, the code is executed by the Javascript processor, and the anonymous function
 * runs, and returns the instantiated grid component.</p>
 * <p>Note: since the code above is <i>generated</i> by a server script, the <code>baseParams</code> for
 * the Store, the metadata to allow generation of the Record layout, and the ColumnModel
 * can all be generated into the code since these are all known on the server.</p>
 *
 * @xtype container
 */
Ext.Container = Ext.extend(Ext.BoxComponent, {
    /**
     * @cfg {Boolean} monitorResize
     * True to automatically monitor window resize events to handle anything that is sensitive to the current size
     * of the viewport.  This value is typically managed by the chosen <code>{@link #layout}</code> and should not need
     * to be set manually.
     */
    /**
     * @cfg {String/Object} layout
     * <p><b>*Important</b>: In order for child items to be correctly sized and
     * positioned, typically a layout manager <b>must</b> be specified through
     * the <code>layout</code> configuration option.</p>
     * <br><p>The sizing and positioning of child {@link items} is the responsibility of
     * the Container's layout manager which creates and manages the type of layout
     * you have in mind.  For example:</p><pre><code>
new Ext.Window({
    width:300, height: 300,
    layout: 'fit', // explicitly set layout manager: override the default (layout:'auto')
    items: [{
        title: 'Panel inside a Window'
    }]
}).show();
     * </code></pre>
     * <p>If the {@link #layout} configuration is not explicitly specified for
     * a general purpose container (e.g. Container or Panel) the
     * {@link Ext.layout.ContainerLayout default layout manager} will be used
     * which does nothing but render child components sequentially into the
     * Container (no sizing or positioning will be performed in this situation).
     * Some container classes implicitly specify a default layout
     * (e.g. FormPanel specifies <code>layout:'form'</code>). Other specific
     * purpose classes internally specify/manage their internal layout (e.g.
     * GridPanel, TabPanel, TreePanel, Toolbar, Menu, etc.).</p>
     * <br><p><b><code>layout</code></b> may be specified as either as an Object or
     * as a String:</p><div><ul class="mdetail-params">
     *
     * <li><u>Specify as an Object</u></li>
     * <div><ul class="mdetail-params">
     * <li>Example usage:</li>
<pre><code>
layout: {
    type: 'vbox',
    padding: '5',
    align: 'left'
}
</code></pre>
     *
     * <li><code><b>type</b></code></li>
     * <br/><p>The layout type to be used for this container.  If not specified,
     * a default {@link Ext.layout.ContainerLayout} will be created and used.</p>
     * <br/><p>Valid layout <code>type</code> values are:</p>
     * <div class="sub-desc"><ul class="mdetail-params">
     * <li><code><b>{@link Ext.layout.AbsoluteLayout absolute}</b></code></li>
     * <li><code><b>{@link Ext.layout.AccordionLayout accordion}</b></code></li>
     * <li><code><b>{@link Ext.layout.AnchorLayout anchor}</b></code></li>
     * <li><code><b>{@link Ext.layout.ContainerLayout auto}</b></code> &nbsp;&nbsp;&nbsp; <b>Default</b></li>
     * <li><code><b>{@link Ext.layout.BorderLayout border}</b></code></li>
     * <li><code><b>{@link Ext.layout.CardLayout card}</b></code></li>
     * <li><code><b>{@link Ext.layout.ColumnLayout column}</b></code></li>
     * <li><code><b>{@link Ext.layout.FitLayout fit}</b></code></li>
     * <li><code><b>{@link Ext.layout.FormLayout form}</b></code></li>
     * <li><code><b>{@link Ext.layout.HBoxLayout hbox}</b></code></li>
     * <li><code><b>{@link Ext.layout.MenuLayout menu}</b></code></li>
     * <li><code><b>{@link Ext.layout.TableLayout table}</b></code></li>
     * <li><code><b>{@link Ext.layout.ToolbarLayout toolbar}</b></code></li>
     * <li><code><b>{@link Ext.layout.VBoxLayout vbox}</b></code></li>
     * </ul></div>
     *
     * <li>Layout specific configuration properties</li>
     * <br/><p>Additional layout specific configuration properties may also be
     * specified. For complete details regarding the valid config options for
     * each layout type, see the layout class corresponding to the <code>type</code>
     * specified.</p>
     *
     * </ul></div>
     *
     * <li><u>Specify as a String</u></li>
     * <div><ul class="mdetail-params">
     * <li>Example usage:</li>
<pre><code>
layout: 'vbox',
layoutConfig: {
    padding: '5',
    align: 'left'
}
</code></pre>
     * <li><code><b>layout</b></code></li>
     * <br/><p>The layout <code>type</code> to be used for this container (see list
     * of valid layout type values above).</p><br/>
     * <li><code><b>{@link #layoutConfig}</b></code></li>
     * <br/><p>Additional layout specific configuration properties. For complete
     * details regarding the valid config options for each layout type, see the
     * layout class corresponding to the <code>layout</code> specified.</p>
     * </ul></div></ul></div>
     */
    /**
     * @cfg {Object} layoutConfig
     * This is a config object containing properties specific to the chosen
     * <b><code>{@link #layout}</code></b> if <b><code>{@link #layout}</code></b>
     * has been specified as a <i>string</i>.</p>
     */
    /**
     * @cfg {Boolean/Number} bufferResize
     * When set to true (50 milliseconds) or a number of milliseconds, the layout assigned for this container will buffer
     * the frequency it calculates and does a re-layout of components. This is useful for heavy containers or containers
     * with a large quantity of sub-components for which frequent layout calls would be expensive. Defaults to <code>50</code>.
     */
    bufferResize: 50,

    /**
     * @cfg {String/Number} activeItem
     * A string component id or the numeric index of the component that should be initially activated within the
     * container's layout on render.  For example, activeItem: 'item-1' or activeItem: 0 (index 0 = the first
     * item in the container's collection).  activeItem only applies to layout styles that can display
     * items one at a time (like {@link Ext.layout.AccordionLayout}, {@link Ext.layout.CardLayout} and
     * {@link Ext.layout.FitLayout}).  Related to {@link Ext.layout.ContainerLayout#activeItem}.
     */
    /**
     * @cfg {Object/Array} items
     * <pre><b>** IMPORTANT</b>: be sure to <b>{@link #layout specify a <code>layout</code>} if needed ! **</b></pre>
     * <p>A single item, or an array of child Components to be added to this container,
     * for example:</p>
     * <pre><code>
// specifying a single item
items: {...},
layout: 'fit',    // specify a layout!

// specifying multiple items
items: [{...}, {...}],
layout: 'anchor', // specify a layout!
     * </code></pre>
     * <p>Each item may be:</p>
     * <div><ul class="mdetail-params">
     * <li>any type of object based on {@link Ext.Component}</li>
     * <li>a fully instanciated object or</li>
     * <li>an object literal that:</li>
     * <div><ul class="mdetail-params">
     * <li>has a specified <code>{@link Ext.Component#xtype xtype}</code></li>
     * <li>the {@link Ext.Component#xtype} specified is associated with the Component
     * desired and should be chosen from one of the available xtypes as listed
     * in {@link Ext.Component}.</li>
     * <li>If an <code>{@link Ext.Component#xtype xtype}</code> is not explicitly
     * specified, the {@link #defaultType} for that Container is used.</li>
     * <li>will be "lazily instanciated", avoiding the overhead of constructing a fully
     * instanciated Component object</li>
     * </ul></div></ul></div>
     * <p><b>Notes</b>:</p>
     * <div><ul class="mdetail-params">
     * <li>Ext uses lazy rendering. Child Components will only be rendered
     * should it become necessary. Items are automatically laid out when they are first
     * shown (no sizing is done while hidden), or in response to a {@link #doLayout} call.</li>
     * <li>Do not specify <code>{@link Ext.Panel#contentEl contentEl}</code>/
     * <code>{@link Ext.Panel#html html}</code> with <code>items</code>.</li>
     * </ul></div>
     */
    /**
     * @cfg {Object|Function} defaults
     * <p>This option is a means of applying default settings to all added items whether added through the {@link #items}
     * config or via the {@link #add} or {@link #insert} methods.</p>
     * <p>If an added item is a config object, and <b>not</b> an instantiated Component, then the default properties are
     * unconditionally applied. If the added item <b>is</b> an instantiated Component, then the default properties are
     * applied conditionally so as not to override existing properties in the item.</p>
     * <p>If the defaults option is specified as a function, then the function will be called using this Container as the
     * scope (<code>this</code> reference) and passing the added item as the first parameter. Any resulting object
     * from that call is then applied to the item as default properties.</p>
     * <p>For example, to automatically apply padding to the body of each of a set of
     * contained {@link Ext.Panel} items, you could pass: <code>defaults: {bodyStyle:'padding:15px'}</code>.</p>
     * <p>Usage:</p><pre><code>
defaults: {               // defaults are applied to items, not the container
    autoScroll:true
},
items: [
    {
        xtype: 'panel',   // defaults <b>do not</b> have precedence over
        id: 'panel1',     // options in config objects, so the defaults
        autoScroll: false // will not be applied here, panel1 will be autoScroll:false
    },
    new Ext.Panel({       // defaults <b>do</b> have precedence over options
        id: 'panel2',     // options in components, so the defaults
        autoScroll: false // will be applied here, panel2 will be autoScroll:true.
    })
]
     * </code></pre>
     */


    /** @cfg {Boolean} autoDestroy
     * If true the container will automatically destroy any contained component that is removed from it, else
     * destruction must be handled manually (defaults to true).
     */
    autoDestroy : true,

    /** @cfg {Boolean} forceLayout
     * If true the container will force a layout initially even if hidden or collapsed. This option
     * is useful for forcing forms to render in collapsed or hidden containers. (defaults to false).
     */
    forceLayout: false,

    /** @cfg {Boolean} hideBorders
     * True to hide the borders of each contained component, false to defer to the component's existing
     * border settings (defaults to false).
     */
    /** @cfg {String} defaultType
     * <p>The default {@link Ext.Component xtype} of child Components to create in this Container when
     * a child item is specified as a raw configuration object, rather than as an instantiated Component.</p>
     * <p>Defaults to <code>'panel'</code>, except {@link Ext.menu.Menu} which defaults to <code>'menuitem'</code>,
     * and {@link Ext.Toolbar} and {@link Ext.ButtonGroup} which default to <code>'button'</code>.</p>
     */
    defaultType : 'panel',

    /** @cfg {String} resizeEvent
     * The event to listen to for resizing in layouts. Defaults to <code>'resize'</code>.
     */
    resizeEvent: 'resize',

    /**
     * @cfg {Array} bubbleEvents
     * <p>An array of events that, when fired, should be bubbled to any parent container.
     * See {@link Ext.util.Observable#enableBubble}.
     * Defaults to <code>['add', 'remove']</code>.
     */
    bubbleEvents: ['add', 'remove'],

    // private
    initComponent : function(){
        Ext.Container.superclass.initComponent.call(this);

        this.addEvents(
            /**
             * @event afterlayout
             * Fires when the components in this container are arranged by the associated layout manager.
             * @param {Ext.Container} this
             * @param {ContainerLayout} layout The ContainerLayout implementation for this container
             */
            'afterlayout',
            /**
             * @event beforeadd
             * Fires before any {@link Ext.Component} is added or inserted into the container.
             * A handler can return false to cancel the add.
             * @param {Ext.Container} this
             * @param {Ext.Component} component The component being added
             * @param {Number} index The index at which the component will be added to the container's items collection
             */
            'beforeadd',
            /**
             * @event beforeremove
             * Fires before any {@link Ext.Component} is removed from the container.  A handler can return
             * false to cancel the remove.
             * @param {Ext.Container} this
             * @param {Ext.Component} component The component being removed
             */
            'beforeremove',
            /**
             * @event add
             * @bubbles
             * Fires after any {@link Ext.Component} is added or inserted into the container.
             * @param {Ext.Container} this
             * @param {Ext.Component} component The component that was added
             * @param {Number} index The index at which the component was added to the container's items collection
             */
            'add',
            /**
             * @event remove
             * @bubbles
             * Fires after any {@link Ext.Component} is removed from the container.
             * @param {Ext.Container} this
             * @param {Ext.Component} component The component that was removed
             */
            'remove'
        );

        /**
         * The collection of components in this container as a {@link Ext.util.MixedCollection}
         * @type MixedCollection
         * @property items
         */
        var items = this.items;
        if(items){
            delete this.items;
            this.add(items);
        }
    },

    // private
    initItems : function(){
        if(!this.items){
            this.items = new Ext.util.MixedCollection(false, this.getComponentId);
            this.getLayout(); // initialize the layout
        }
    },

    // private
    setLayout : function(layout){
        if(this.layout && this.layout != layout){
            this.layout.setContainer(null);
        }
        this.layout = layout;
        this.initItems();
        layout.setContainer(this);
    },

    afterRender: function(){
        // Render this Container, this should be done before setLayout is called which
        // will hook onResize
        Ext.Container.superclass.afterRender.call(this);
        if(!this.layout){
            this.layout = 'auto';
        }
        if(Ext.isObject(this.layout) && !this.layout.layout){
            this.layoutConfig = this.layout;
            this.layout = this.layoutConfig.type;
        }
        if(Ext.isString(this.layout)){
            this.layout = new Ext.Container.LAYOUTS[this.layout.toLowerCase()](this.layoutConfig);
        }
        this.setLayout(this.layout);

        // If a CardLayout, the active item set
        if(this.activeItem !== undefined && this.layout.setActiveItem){
            var item = this.activeItem;
            delete this.activeItem;
            this.layout.setActiveItem(item);
        }

        // If we have no ownerCt, render and size all children
        if(!this.ownerCt){
            this.doLayout(false, true);
        }

        // This is a manually configured flag set by users in conjunction with renderTo.
        // Not to be confused with the flag by the same name used in Layouts.
        if(this.monitorResize === true){
            Ext.EventManager.onWindowResize(this.doLayout, this, [false]);
        }
    },

    /**
     * <p>Returns the Element to be used to contain the child Components of this Container.</p>
     * <p>An implementation is provided which returns the Container's {@link #getEl Element}, but
     * if there is a more complex structure to a Container, this may be overridden to return
     * the element into which the {@link #layout layout} renders child Components.</p>
     * @return {Ext.Element} The Element to render child Components into.
     */
    getLayoutTarget : function(){
        return this.el;
    },

    // private - used as the key lookup function for the items collection
    getComponentId : function(comp){
        return comp.getItemId();
    },

    /**
     * <p>Adds {@link Ext.Component Component}(s) to this Container.</p>
     * <br><p><b>Description</b></u> :
     * <div><ul class="mdetail-params">
     * <li>Fires the {@link #beforeadd} event before adding</li>
     * <li>The Container's {@link #defaults default config values} will be applied
     * accordingly (see <code>{@link #defaults}</code> for details).</li>
     * <li>Fires the {@link #add} event after the component has been added.</li>
     * </ul></div>
     * <br><p><b>Notes</b></u> :
     * <div><ul class="mdetail-params">
     * <li>If the Container is <i>already rendered</i> when <code>add</code>
     * is called, you may need to call {@link #doLayout} to refresh the view which causes
     * any unrendered child Components to be rendered. This is required so that you can
     * <code>add</code> multiple child components if needed while only refreshing the layout
     * once. For example:<pre><code>
var tb = new {@link Ext.Toolbar}();
tb.render(document.body);  // toolbar is rendered
tb.add({text:'Button 1'}); // add multiple items ({@link #defaultType} for {@link Ext.Toolbar Toolbar} is 'button')
tb.add({text:'Button 2'});
tb.{@link #doLayout}();             // refresh the layout
     * </code></pre></li>
     * <li><i>Warning:</i> Containers directly managed by the BorderLayout layout manager
     * may not be removed or added.  See the Notes for {@link Ext.layout.BorderLayout BorderLayout}
     * for more details.</li>
     * </ul></div>
     * @param {...Object/Array} component
     * <p>Either one or more Components to add or an Array of Components to add.  See
     * <code>{@link #items}</code> for additional information.</p>
     * @return {Ext.Component/Array} The Components that were added.
     */
    add : function(comp){
        this.initItems();
        var args = arguments.length > 1;
        if(args || Ext.isArray(comp)){
            var result = [];
            Ext.each(args ? arguments : comp, function(c){
                result.push(this.add(c));
            }, this);
            return result;
        }
        var c = this.lookupComponent(this.applyDefaults(comp));
        var index = this.items.length;
        if(this.fireEvent('beforeadd', this, c, index) !== false && this.onBeforeAdd(c) !== false){
            this.items.add(c);
            // *onAdded
            c.onAdded(this, index);
            this.onAdd(c);
            this.fireEvent('add', this, c, index);
        }
        return c;
    },

    onAdd : function(c){
        // Empty template method
    },

    // private
    onAdded : function(container, pos) {
        //overridden here so we can cascade down, not worth creating a template method.
        this.ownerCt = container;
        this.initRef();
        //initialize references for child items
        this.cascade(function(c){
            c.initRef();
        });
        this.fireEvent('added', this, container, pos);
    },

    /**
     * Inserts a Component into this Container at a specified index. Fires the
     * {@link #beforeadd} event before inserting, then fires the {@link #add} event after the
     * Component has been inserted.
     * @param {Number} index The index at which the Component will be inserted
     * into the Container's items collection
     * @param {Ext.Component} component The child Component to insert.<br><br>
     * Ext uses lazy rendering, and will only render the inserted Component should
     * it become necessary.<br><br>
     * A Component config object may be passed in order to avoid the overhead of
     * constructing a real Component object if lazy rendering might mean that the
     * inserted Component will not be rendered immediately. To take advantage of
     * this 'lazy instantiation', set the {@link Ext.Component#xtype} config
     * property to the registered type of the Component wanted.<br><br>
     * For a list of all available xtypes, see {@link Ext.Component}.
     * @return {Ext.Component} component The Component (or config object) that was
     * inserted with the Container's default config values applied.
     */
    insert : function(index, comp) {
        var args   = arguments,
            length = args.length,
            result = [],
            i, c;
        
        this.initItems();
        
        if (length > 2) {
            for (i = length - 1; i >= 1; --i) {
                result.push(this.insert(index, args[i]));
            }
            return result;
        }
        
        c = this.lookupComponent(this.applyDefaults(comp));
        index = Math.min(index, this.items.length);
        
        if (this.fireEvent('beforeadd', this, c, index) !== false && this.onBeforeAdd(c) !== false) {
            if (c.ownerCt == this) {
                this.items.remove(c);
            }
            this.items.insert(index, c);
            c.onAdded(this, index);
            this.onAdd(c);
            this.fireEvent('add', this, c, index);
        }
        
        return c;
    },

    // private
    applyDefaults : function(c){
        var d = this.defaults;
        if(d){
            if(Ext.isFunction(d)){
                d = d.call(this, c);
            }
            if(Ext.isString(c)){
                c = Ext.ComponentMgr.get(c);
                Ext.apply(c, d);
            }else if(!c.events){
                Ext.applyIf(c.isAction ? c.initialConfig : c, d);
            }else{
                Ext.apply(c, d);
            }
        }
        return c;
    },

    // private
    onBeforeAdd : function(item){
        if(item.ownerCt){
            item.ownerCt.remove(item, false);
        }
        if(this.hideBorders === true){
            item.border = (item.border === true);
        }
    },

    /**
     * Removes a component from this container.  Fires the {@link #beforeremove} event before removing, then fires
     * the {@link #remove} event after the component has been removed.
     * @param {Component/String} component The component reference or id to remove.
     * @param {Boolean} autoDestroy (optional) True to automatically invoke the removed Component's {@link Ext.Component#destroy} function.
     * Defaults to the value of this Container's {@link #autoDestroy} config.
     * @return {Ext.Component} component The Component that was removed.
     */
    remove : function(comp, autoDestroy){
        this.initItems();
        var c = this.getComponent(comp);
        if(c && this.fireEvent('beforeremove', this, c) !== false){
            this.doRemove(c, autoDestroy);
            this.fireEvent('remove', this, c);
        }
        return c;
    },

    onRemove: function(c){
        // Empty template method
    },

    // private
    doRemove: function(c, autoDestroy){
        var l = this.layout,
            hasLayout = l && this.rendered;

        if(hasLayout){
            l.onRemove(c);
        }
        this.items.remove(c);
        c.onRemoved();
        this.onRemove(c);
        if(autoDestroy === true || (autoDestroy !== false && this.autoDestroy)){
            c.destroy();
        }
        if(hasLayout){
            l.afterRemove(c);
        }
    },

    /**
     * Removes all components from this container.
     * @param {Boolean} autoDestroy (optional) True to automatically invoke the removed Component's {@link Ext.Component#destroy} function.
     * Defaults to the value of this Container's {@link #autoDestroy} config.
     * @return {Array} Array of the destroyed components
     */
    removeAll: function(autoDestroy){
        this.initItems();
        var item, rem = [], items = [];
        this.items.each(function(i){
            rem.push(i);
        });
        for (var i = 0, len = rem.length; i < len; ++i){
            item = rem[i];
            this.remove(item, autoDestroy);
            if(item.ownerCt !== this){
                items.push(item);
            }
        }
        return items;
    },

    /**
     * Examines this container's <code>{@link #items}</code> <b>property</b>
     * and gets a direct child component of this container.
     * @param {String/Number} comp This parameter may be any of the following:
     * <div><ul class="mdetail-params">
     * <li>a <b><code>String</code></b> : representing the <code>{@link Ext.Component#itemId itemId}</code>
     * or <code>{@link Ext.Component#id id}</code> of the child component </li>
     * <li>a <b><code>Number</code></b> : representing the position of the child component
     * within the <code>{@link #items}</code> <b>property</b></li>
     * </ul></div>
     * <p>For additional information see {@link Ext.util.MixedCollection#get}.
     * @return Ext.Component The component (if found).
     */
    getComponent : function(comp){
        if(Ext.isObject(comp)){
            comp = comp.getItemId();
        }
        return this.items.get(comp);
    },

    // private
    lookupComponent : function(comp){
        if(Ext.isString(comp)){
            return Ext.ComponentMgr.get(comp);
        }else if(!comp.events){
            return this.createComponent(comp);
        }
        return comp;
    },

    // private
    createComponent : function(config, defaultType){
        if (config.render) {
            return config;
        }
        // add in ownerCt at creation time but then immediately
        // remove so that onBeforeAdd can handle it
        var c = Ext.create(Ext.apply({
            ownerCt: this
        }, config), defaultType || this.defaultType);
        delete c.initialConfig.ownerCt;
        delete c.ownerCt;
        return c;
    },

    /**
     * @private
     * We can only lay out if there is a view area in which to layout.
     * display:none on the layout target, *or any of its parent elements* will mean it has no view area.
     */
    canLayout : function() {
        var el = this.getVisibilityEl();
        return el && el.dom && !el.isStyle("display", "none");
    },

    /**
     * Force this container's layout to be recalculated. A call to this function is required after adding a new component
     * to an already rendered container, or possibly after changing sizing/position properties of child components.
     * @param {Boolean} shallow (optional) True to only calc the layout of this component, and let child components auto
     * calc layouts as required (defaults to false, which calls doLayout recursively for each subcontainer)
     * @param {Boolean} force (optional) True to force a layout to occur, even if the item is hidden.
     * @return {Ext.Container} this
     */

    doLayout : function(shallow, force){
        var rendered = this.rendered,
            forceLayout = force || this.forceLayout;

        if(this.collapsed || !this.canLayout()){
            this.deferLayout = this.deferLayout || !shallow;
            if(!forceLayout){
                return;
            }
            shallow = shallow && !this.deferLayout;
        } else {
            delete this.deferLayout;
        }
        if(rendered && this.layout){
            this.layout.layout();
        }
        if(shallow !== true && this.items){
            var cs = this.items.items;
            for(var i = 0, len = cs.length; i < len; i++){
                var c = cs[i];
                if(c.doLayout){
                    c.doLayout(false, forceLayout);
                }
            }
        }
        if(rendered){
            this.onLayout(shallow, forceLayout);
        }
        // Initial layout completed
        this.hasLayout = true;
        delete this.forceLayout;
    },

    onLayout : Ext.emptyFn,

    // private
    shouldBufferLayout: function(){
        /*
         * Returns true if the container should buffer a layout.
         * This is true only if the container has previously been laid out
         * and has a parent container that is pending a layout.
         */
        var hl = this.hasLayout;
        if(this.ownerCt){
            // Only ever buffer if we've laid out the first time and we have one pending.
            return hl ? !this.hasLayoutPending() : false;
        }
        // Never buffer initial layout
        return hl;
    },

    // private
    hasLayoutPending: function(){
        // Traverse hierarchy to see if any parent container has a pending layout.
        var pending = false;
        this.ownerCt.bubble(function(c){
            if(c.layoutPending){
                pending = true;
                return false;
            }
        });
        return pending;
    },

    onShow : function(){
        // removes css classes that were added to hide
        Ext.Container.superclass.onShow.call(this);
        // If we were sized during the time we were hidden, layout.
        if(Ext.isDefined(this.deferLayout)){
            delete this.deferLayout;
            this.doLayout(true);
        }
    },

    /**
     * Returns the layout currently in use by the container.  If the container does not currently have a layout
     * set, a default {@link Ext.layout.ContainerLayout} will be created and set as the container's layout.
     * @return {ContainerLayout} layout The container's layout
     */
    getLayout : function(){
        if(!this.layout){
            var layout = new Ext.layout.AutoLayout(this.layoutConfig);
            this.setLayout(layout);
        }
        return this.layout;
    },

    // private
    beforeDestroy : function(){
        var c;
        if(this.items){
            while(c = this.items.first()){
                this.doRemove(c, true);
            }
        }
        if(this.monitorResize){
            Ext.EventManager.removeResizeListener(this.doLayout, this);
        }
        Ext.destroy(this.layout);
        Ext.Container.superclass.beforeDestroy.call(this);
    },

    /**
     * Cascades down the component/container heirarchy from this component (called first), calling the specified function with
     * each component. The scope (<i>this</i>) of
     * function call will be the scope provided or the current component. The arguments to the function
     * will be the args provided or the current component. If the function returns false at any point,
     * the cascade is stopped on that branch.
     * @param {Function} fn The function to call
     * @param {Object} scope (optional) The scope of the function (defaults to current component)
     * @param {Array} args (optional) The args to call the function with (defaults to passing the current component)
     * @return {Ext.Container} this
     */
    cascade : function(fn, scope, args){
        if(fn.apply(scope || this, args || [this]) !== false){
            if(this.items){
                var cs = this.items.items;
                for(var i = 0, len = cs.length; i < len; i++){
                    if(cs[i].cascade){
                        cs[i].cascade(fn, scope, args);
                    }else{
                        fn.apply(scope || cs[i], args || [cs[i]]);
                    }
                }
            }
        }
        return this;
    },

    /**
     * Find a component under this container at any level by id
     * @param {String} id
     * @deprecated Fairly useless method, since you can just use Ext.getCmp. Should be removed for 4.0
     * If you need to test if an id belongs to a container, you can use getCmp and findParent*.
     * @return Ext.Component
     */
    findById : function(id){
        var m = null, 
            ct = this;
        this.cascade(function(c){
            if(ct != c && c.id === id){
                m = c;
                return false;
            }
        });
        return m;
    },

    /**
     * Find a component under this container at any level by xtype or class
     * @param {String/Class} xtype The xtype string for a component, or the class of the component directly
     * @param {Boolean} shallow (optional) False to check whether this Component is descended from the xtype (this is
     * the default), or true to check whether this Component is directly of the specified xtype.
     * @return {Array} Array of Ext.Components
     */
    findByType : function(xtype, shallow){
        return this.findBy(function(c){
            return c.isXType(xtype, shallow);
        });
    },

    /**
     * Find a component under this container at any level by property
     * @param {String} prop
     * @param {String} value
     * @return {Array} Array of Ext.Components
     */
    find : function(prop, value){
        return this.findBy(function(c){
            return c[prop] === value;
        });
    },

    /**
     * Find a component under this container at any level by a custom function. If the passed function returns
     * true, the component will be included in the results. The passed function is called with the arguments (component, this container).
     * @param {Function} fn The function to call
     * @param {Object} scope (optional)
     * @return {Array} Array of Ext.Components
     */
    findBy : function(fn, scope){
        var m = [], ct = this;
        this.cascade(function(c){
            if(ct != c && fn.call(scope || c, c, ct) === true){
                m.push(c);
            }
        });
        return m;
    },

    /**
     * Get a component contained by this container (alias for items.get(key))
     * @param {String/Number} key The index or id of the component
     * @deprecated Should be removed in 4.0, since getComponent does the same thing.
     * @return {Ext.Component} Ext.Component
     */
    get : function(key){
        return this.getComponent(key);
    }
});

Ext.Container.LAYOUTS = {};
Ext.reg('container', Ext.Container);
/**
 * @class Ext.layout.ContainerLayout
 * <p>This class is intended to be extended or created via the <tt><b>{@link Ext.Container#layout layout}</b></tt>
 * configuration property.  See <tt><b>{@link Ext.Container#layout}</b></tt> for additional details.</p>
 */
Ext.layout.ContainerLayout = Ext.extend(Object, {
    /**
     * @cfg {String} extraCls
     * <p>An optional extra CSS class that will be added to the container. This can be useful for adding
     * customized styles to the container or any of its children using standard CSS rules. See
     * {@link Ext.Component}.{@link Ext.Component#ctCls ctCls} also.</p>
     * <p><b>Note</b>: <tt>extraCls</tt> defaults to <tt>''</tt> except for the following classes
     * which assign a value by default:
     * <div class="mdetail-params"><ul>
     * <li>{@link Ext.layout.AbsoluteLayout Absolute Layout} : <tt>'x-abs-layout-item'</tt></li>
     * <li>{@link Ext.layout.Box Box Layout} : <tt>'x-box-item'</tt></li>
     * <li>{@link Ext.layout.ColumnLayout Column Layout} : <tt>'x-column'</tt></li>
     * </ul></div>
     * To configure the above Classes with an extra CSS class append to the default.  For example,
     * for ColumnLayout:<pre><code>
     * extraCls: 'x-column custom-class'
     * </code></pre>
     * </p>
     */
    /**
     * @cfg {Boolean} renderHidden
     * True to hide each contained item on render (defaults to false).
     */

    /**
     * A reference to the {@link Ext.Component} that is active.  For example, <pre><code>
     * if(myPanel.layout.activeItem.id == 'item-1') { ... }
     * </code></pre>
     * <tt>activeItem</tt> only applies to layout styles that can display items one at a time
     * (like {@link Ext.layout.AccordionLayout}, {@link Ext.layout.CardLayout}
     * and {@link Ext.layout.FitLayout}).  Read-only.  Related to {@link Ext.Container#activeItem}.
     * @type {Ext.Component}
     * @property activeItem
     */

    // private
    monitorResize:false,
    // private
    activeItem : null,

    constructor : function(config){
        this.id = Ext.id(null, 'ext-layout-');
        Ext.apply(this, config);
    },

    type: 'container',

    /* Workaround for how IE measures autoWidth elements.  It prefers bottom-up measurements
      whereas other browser prefer top-down.  We will hide all target child elements before we measure and
      put them back to get an accurate measurement.
    */
    IEMeasureHack : function(target, viewFlag) {
        var tChildren = target.dom.childNodes, tLen = tChildren.length, c, d = [], e, i, ret;
        for (i = 0 ; i < tLen ; i++) {
            c = tChildren[i];
            e = Ext.get(c);
            if (e) {
                d[i] = e.getStyle('display');
                e.setStyle({display: 'none'});
            }
        }
        ret = target ? target.getViewSize(viewFlag) : {};
        for (i = 0 ; i < tLen ; i++) {
            c = tChildren[i];
            e = Ext.get(c);
            if (e) {
                e.setStyle({display: d[i]});
            }
        }
        return ret;
    },

    // Placeholder for the derived layouts
    getLayoutTargetSize : Ext.EmptyFn,

    // private
    layout : function(){
        var ct = this.container, target = ct.getLayoutTarget();
        if(!(this.hasLayout || Ext.isEmpty(this.targetCls))){
            target.addClass(this.targetCls);
        }
        this.onLayout(ct, target);
        ct.fireEvent('afterlayout', ct, this);
    },

    // private
    onLayout : function(ct, target){
        this.renderAll(ct, target);
    },

    // private
    isValidParent : function(c, target){
        return target && c.getPositionEl().dom.parentNode == (target.dom || target);
    },

    // private
    renderAll : function(ct, target){
        var items = ct.items.items, i, c, len = items.length;
        for(i = 0; i < len; i++) {
            c = items[i];
            if(c && (!c.rendered || !this.isValidParent(c, target))){
                this.renderItem(c, i, target);
            }
        }
    },

    /**
     * @private
     * Renders the given Component into the target Element. If the Component is already rendered,
     * it is moved to the provided target instead.
     * @param {Ext.Component} c The Component to render
     * @param {Number} position The position within the target to render the item to
     * @param {Ext.Element} target The target Element
     */
    renderItem : function(c, position, target){
        if (c) {
            if (!c.rendered) {
                c.render(target, position);
                this.configureItem(c);
            } else if (!this.isValidParent(c, target)) {
                if (Ext.isNumber(position)) {
                    position = target.dom.childNodes[position];
                }
                
                target.dom.insertBefore(c.getPositionEl().dom, position || null);
                c.container = target;
                this.configureItem(c);
            }
        }
    },

    // private.
    // Get all rendered items to lay out.
    getRenderedItems: function(ct){
        var t = ct.getLayoutTarget(), cti = ct.items.items, len = cti.length, i, c, items = [];
        for (i = 0; i < len; i++) {
            if((c = cti[i]).rendered && this.isValidParent(c, t) && c.shouldLayout !== false){
                items.push(c);
            }
        };
        return items;
    },

    /**
     * @private
     * Applies extraCls and hides the item if renderHidden is true
     */
    configureItem: function(c){
        if (this.extraCls) {
            var t = c.getPositionEl ? c.getPositionEl() : c;
            t.addClass(this.extraCls);
        }
        
        // If we are forcing a layout, do so *before* we hide so elements have height/width
        if (c.doLayout && this.forceLayout) {
            c.doLayout();
        }
        if (this.renderHidden && c != this.activeItem) {
            c.hide();
        }
    },

    onRemove: function(c){
        if(this.activeItem == c){
            delete this.activeItem;
        }
        if(c.rendered && this.extraCls){
            var t = c.getPositionEl ? c.getPositionEl() : c;
            t.removeClass(this.extraCls);
        }
    },

    afterRemove: function(c){
        if(c.removeRestore){
            c.removeMode = 'container';
            delete c.removeRestore;
        }
    },

    // private
    onResize: function(){
        var ct = this.container,
            b;
        if(ct.collapsed){
            return;
        }
        if(b = ct.bufferResize && ct.shouldBufferLayout()){
            if(!this.resizeTask){
                this.resizeTask = new Ext.util.DelayedTask(this.runLayout, this);
                this.resizeBuffer = Ext.isNumber(b) ? b : 50;
            }
            ct.layoutPending = true;
            this.resizeTask.delay(this.resizeBuffer);
        }else{
            this.runLayout();
        }
    },

    runLayout: function(){
        var ct = this.container;
        this.layout();
        ct.onLayout();
        delete ct.layoutPending;
    },

    // private
    setContainer : function(ct){
        /**
         * This monitorResize flag will be renamed soon as to avoid confusion
         * with the Container version which hooks onWindowResize to doLayout
         *
         * monitorResize flag in this context attaches the resize event between
         * a container and it's layout
         */
        if(this.monitorResize && ct != this.container){
            var old = this.container;
            if(old){
                old.un(old.resizeEvent, this.onResize, this);
            }
            if(ct){
                ct.on(ct.resizeEvent, this.onResize, this);
            }
        }
        this.container = ct;
    },

    /**
     * Parses a number or string representing margin sizes into an object. Supports CSS-style margin declarations
     * (e.g. 10, "10", "10 10", "10 10 10" and "10 10 10 10" are all valid options and would return the same result)
     * @param {Number|String} v The encoded margins
     * @return {Object} An object with margin sizes for top, right, bottom and left
     */
    parseMargins : function(v){
        if (Ext.isNumber(v)) {
            v = v.toString();
        }
        var ms  = v.split(' '),
            len = ms.length;
            
        if (len == 1) {
            ms[1] = ms[2] = ms[3] = ms[0];
        } else if(len == 2) {
            ms[2] = ms[0];
            ms[3] = ms[1];
        } else if(len == 3) {
            ms[3] = ms[1];
        }
        
        return {
            top   :parseInt(ms[0], 10) || 0,
            right :parseInt(ms[1], 10) || 0,
            bottom:parseInt(ms[2], 10) || 0,
            left  :parseInt(ms[3], 10) || 0
        };
    },

    /**
     * The {@link Ext.Template Ext.Template} used by Field rendering layout classes (such as
     * {@link Ext.layout.FormLayout}) to create the DOM structure of a fully wrapped,
     * labeled and styled form Field. A default Template is supplied, but this may be
     * overriden to create custom field structures. The template processes values returned from
     * {@link Ext.layout.FormLayout#getTemplateArgs}.
     * @property fieldTpl
     * @type Ext.Template
     */
    fieldTpl: (function() {
        var t = new Ext.Template(
            '<div class="x-form-item {itemCls}" tabIndex="-1">',
                '<label for="{id}" style="{labelStyle}" class="x-form-item-label">{label}{labelSeparator}</label>',
                '<div class="x-form-element" id="x-form-el-{id}" style="{elementStyle}">',
                '</div><div class="{clearCls}"></div>',
            '</div>'
        );
        t.disableFormats = true;
        return t.compile();
    })(),

    /*
     * Destroys this layout. This is a template method that is empty by default, but should be implemented
     * by subclasses that require explicit destruction to purge event handlers or remove DOM nodes.
     * @protected
     */
    destroy : function(){
        // Stop any buffered layout tasks
        if(this.resizeTask && this.resizeTask.cancel){
            this.resizeTask.cancel();
        }
        if(this.container) {
            this.container.un(this.container.resizeEvent, this.onResize, this);
        }
        if(!Ext.isEmpty(this.targetCls)){
            var target = this.container.getLayoutTarget();
            if(target){
                target.removeClass(this.targetCls);
            }
        }
    }
});/**
 * @class Ext.layout.AutoLayout
 * <p>The AutoLayout is the default layout manager delegated by {@link Ext.Container} to
 * render any child Components when no <tt>{@link Ext.Container#layout layout}</tt> is configured into
 * a {@link Ext.Container Container}.</tt>.  AutoLayout provides only a passthrough of any layout calls
 * to any child containers.</p>
 */
Ext.layout.AutoLayout = Ext.extend(Ext.layout.ContainerLayout, {
    type: 'auto',

    monitorResize: true,

    onLayout : function(ct, target){
        Ext.layout.AutoLayout.superclass.onLayout.call(this, ct, target);
        var cs = this.getRenderedItems(ct), len = cs.length, i, c;
        for(i = 0; i < len; i++){
            c = cs[i];
            if (c.doLayout){
                // Shallow layout children
                c.doLayout(true);
            }
        }
    }
});

Ext.Container.LAYOUTS['auto'] = Ext.layout.AutoLayout;
/**
 * @class Ext.layout.FitLayout
 * @extends Ext.layout.ContainerLayout
 * <p>This is a base class for layouts that contain <b>a single item</b> that automatically expands to fill the layout's
 * container.  This class is intended to be extended or created via the <tt>layout:'fit'</tt> {@link Ext.Container#layout}
 * config, and should generally not need to be created directly via the new keyword.</p>
 * <p>FitLayout does not have any direct config options (other than inherited ones).  To fit a panel to a container
 * using FitLayout, simply set layout:'fit' on the container and add a single panel to it.  If the container has
 * multiple panels, only the first one will be displayed.  Example usage:</p>
 * <pre><code>
var p = new Ext.Panel({
    title: 'Fit Layout',
    layout:'fit',
    items: {
        title: 'Inner Panel',
        html: '&lt;p&gt;This is the inner panel content&lt;/p&gt;',
        border: false
    }
});
</code></pre>
 */
Ext.layout.FitLayout = Ext.extend(Ext.layout.ContainerLayout, {
    // private
    monitorResize:true,

    type: 'fit',

    getLayoutTargetSize : function() {
        var target = this.container.getLayoutTarget();
        if (!target) {
            return {};
        }
        // Style Sized (scrollbars not included)
        return target.getStyleSize();
    },

    // private
    onLayout : function(ct, target){
        Ext.layout.FitLayout.superclass.onLayout.call(this, ct, target);
        if(!ct.collapsed){
            this.setItemSize(this.activeItem || ct.items.itemAt(0), this.getLayoutTargetSize());
        }
    },

    // private
    setItemSize : function(item, size){
        if(item && size.height > 0){ // display none?
            item.setSize(size);
        }
    }
});
Ext.Container.LAYOUTS['fit'] = Ext.layout.FitLayout;/**
 * @class Ext.layout.CardLayout
 * @extends Ext.layout.FitLayout
 * <p>This layout manages multiple child Components, each fitted to the Container, where only a single child Component can be
 * visible at any given time.  This layout style is most commonly used for wizards, tab implementations, etc.
 * This class is intended to be extended or created via the layout:'card' {@link Ext.Container#layout} config,
 * and should generally not need to be created directly via the new keyword.</p>
 * <p>The CardLayout's focal method is {@link #setActiveItem}.  Since only one panel is displayed at a time,
 * the only way to move from one Component to the next is by calling setActiveItem, passing the id or index of
 * the next panel to display.  The layout itself does not provide a user interface for handling this navigation,
 * so that functionality must be provided by the developer.</p>
 * <p>In the following example, a simplistic wizard setup is demonstrated.  A button bar is added
 * to the footer of the containing panel to provide navigation buttons.  The buttons will be handled by a
 * common navigation routine -- for this example, the implementation of that routine has been ommitted since
 * it can be any type of custom logic.  Note that other uses of a CardLayout (like a tab control) would require a
 * completely different implementation.  For serious implementations, a better approach would be to extend
 * CardLayout to provide the custom functionality needed.  Example usage:</p>
 * <pre><code>
var navHandler = function(direction){
    // This routine could contain business logic required to manage the navigation steps.
    // It would call setActiveItem as needed, manage navigation button state, handle any
    // branching logic that might be required, handle alternate actions like cancellation
    // or finalization, etc.  A complete wizard implementation could get pretty
    // sophisticated depending on the complexity required, and should probably be
    // done as a subclass of CardLayout in a real-world implementation.
};

var card = new Ext.Panel({
    title: 'Example Wizard',
    layout:'card',
    activeItem: 0, // make sure the active item is set on the container config!
    bodyStyle: 'padding:15px',
    defaults: {
        // applied to each contained panel
        border:false
    },
    // just an example of one possible navigation scheme, using buttons
    bbar: [
        {
            id: 'move-prev',
            text: 'Back',
            handler: navHandler.createDelegate(this, [-1]),
            disabled: true
        },
        '->', // greedy spacer so that the buttons are aligned to each side
        {
            id: 'move-next',
            text: 'Next',
            handler: navHandler.createDelegate(this, [1])
        }
    ],
    // the panels (or "cards") within the layout
    items: [{
        id: 'card-0',
        html: '&lt;h1&gt;Welcome to the Wizard!&lt;/h1&gt;&lt;p&gt;Step 1 of 3&lt;/p&gt;'
    },{
        id: 'card-1',
        html: '&lt;p&gt;Step 2 of 3&lt;/p&gt;'
    },{
        id: 'card-2',
        html: '&lt;h1&gt;Congratulations!&lt;/h1&gt;&lt;p&gt;Step 3 of 3 - Complete&lt;/p&gt;'
    }]
});
</code></pre>
 */
Ext.layout.CardLayout = Ext.extend(Ext.layout.FitLayout, {
    /**
     * @cfg {Boolean} deferredRender
     * True to render each contained item at the time it becomes active, false to render all contained items
     * as soon as the layout is rendered (defaults to false).  If there is a significant amount of content or
     * a lot of heavy controls being rendered into panels that are not displayed by default, setting this to
     * true might improve performance.
     */
    deferredRender : false,

    /**
     * @cfg {Boolean} layoutOnCardChange
     * True to force a layout of the active item when the active card is changed. Defaults to false.
     */
    layoutOnCardChange : false,

    /**
     * @cfg {Boolean} renderHidden @hide
     */
    // private
    renderHidden : true,

    type: 'card',

    /**
     * Sets the active (visible) item in the layout.
     * @param {String/Number} item The string component id or numeric index of the item to activate
     */
    setActiveItem : function(item){
        var ai = this.activeItem,
            ct = this.container;
        item = ct.getComponent(item);

        // Is this a valid, different card?
        if(item && ai != item){

            // Changing cards, hide the current one
            if(ai){
                ai.hide();
                if (ai.hidden !== true) {
                    return false;
                }
                ai.fireEvent('deactivate', ai);
            }

            var layout = item.doLayout && (this.layoutOnCardChange || !item.rendered);

            // Change activeItem reference
            this.activeItem = item;

            // The container is about to get a recursive layout, remove any deferLayout reference
            // because it will trigger a redundant layout.
            delete item.deferLayout;

            // Show the new component
            item.show();

            this.layout();

            if(layout){
                item.doLayout();
            }
            item.fireEvent('activate', item);
        }
    },

    // private
    renderAll : function(ct, target){
        if(this.deferredRender){
            this.renderItem(this.activeItem, undefined, target);
        }else{
            Ext.layout.CardLayout.superclass.renderAll.call(this, ct, target);
        }
    }
});
Ext.Container.LAYOUTS['card'] = Ext.layout.CardLayout;
/**
 * @class Ext.layout.AnchorLayout
 * @extends Ext.layout.ContainerLayout
 * <p>This is a layout that enables anchoring of contained elements relative to the container's dimensions.
 * If the container is resized, all anchored items are automatically rerendered according to their
 * <b><tt>{@link #anchor}</tt></b> rules.</p>
 * <p>This class is intended to be extended or created via the layout:'anchor' {@link Ext.Container#layout}
 * config, and should generally not need to be created directly via the new keyword.</p>
 * <p>AnchorLayout does not have any direct config options (other than inherited ones). By default,
 * AnchorLayout will calculate anchor measurements based on the size of the container itself. However, the
 * container using the AnchorLayout can supply an anchoring-specific config property of <b>anchorSize</b>.
 * If anchorSize is specifed, the layout will use it as a virtual container for the purposes of calculating
 * anchor measurements based on it instead, allowing the container to be sized independently of the anchoring
 * logic if necessary.  For example:</p>
 * <pre><code>
var viewport = new Ext.Viewport({
    layout:'anchor',
    anchorSize: {width:800, height:600},
    items:[{
        title:'Item 1',
        html:'Content 1',
        width:800,
        anchor:'right 20%'
    },{
        title:'Item 2',
        html:'Content 2',
        width:300,
        anchor:'50% 30%'
    },{
        title:'Item 3',
        html:'Content 3',
        width:600,
        anchor:'-100 50%'
    }]
});
 * </code></pre>
 */
Ext.layout.AnchorLayout = Ext.extend(Ext.layout.ContainerLayout, {
    /**
     * @cfg {String} anchor
     * <p>This configuation option is to be applied to <b>child <tt>items</tt></b> of a container managed by
     * this layout (ie. configured with <tt>layout:'anchor'</tt>).</p><br/>
     *
     * <p>This value is what tells the layout how an item should be anchored to the container. <tt>items</tt>
     * added to an AnchorLayout accept an anchoring-specific config property of <b>anchor</b> which is a string
     * containing two values: the horizontal anchor value and the vertical anchor value (for example, '100% 50%').
     * The following types of anchor values are supported:<div class="mdetail-params"><ul>
     *
     * <li><b>Percentage</b> : Any value between 1 and 100, expressed as a percentage.<div class="sub-desc">
     * The first anchor is the percentage width that the item should take up within the container, and the
     * second is the percentage height.  For example:<pre><code>
// two values specified
anchor: '100% 50%' // render item complete width of the container and
                   // 1/2 height of the container
// one value specified
anchor: '100%'     // the width value; the height will default to auto
     * </code></pre></div></li>
     *
     * <li><b>Offsets</b> : Any positive or negative integer value.<div class="sub-desc">
     * This is a raw adjustment where the first anchor is the offset from the right edge of the container,
     * and the second is the offset from the bottom edge. For example:<pre><code>
// two values specified
anchor: '-50 -100' // render item the complete width of the container
                   // minus 50 pixels and
                   // the complete height minus 100 pixels.
// one value specified
anchor: '-50'      // anchor value is assumed to be the right offset value
                   // bottom offset will default to 0
     * </code></pre></div></li>
     *
     * <li><b>Sides</b> : Valid values are <tt>'right'</tt> (or <tt>'r'</tt>) and <tt>'bottom'</tt>
     * (or <tt>'b'</tt>).<div class="sub-desc">
     * Either the container must have a fixed size or an anchorSize config value defined at render time in
     * order for these to have any effect.</div></li>
     *
     * <li><b>Mixed</b> : <div class="sub-desc">
     * Anchor values can also be mixed as needed.  For example, to render the width offset from the container
     * right edge by 50 pixels and 75% of the container's height use:
     * <pre><code>
anchor: '-50 75%'
     * </code></pre></div></li>
     *
     *
     * </ul></div>
     */

    // private
    monitorResize : true,

    type : 'anchor',

    /**
     * @cfg {String} defaultAnchor
     *
     * default anchor for all child container items applied if no anchor or specific width is set on the child item.  Defaults to '100%'.
     *
     */
    defaultAnchor : '100%',

    parseAnchorRE : /^(r|right|b|bottom)$/i,


    getLayoutTargetSize : function() {
        var target = this.container.getLayoutTarget(), ret = {};
        if (target) {
            ret = target.getViewSize();

            // IE in strict mode will return a width of 0 on the 1st pass of getViewSize.
            // Use getStyleSize to verify the 0 width, the adjustment pass will then work properly
            // with getViewSize
            if (Ext.isIE && Ext.isStrict && ret.width == 0){
                ret =  target.getStyleSize();
            }
            ret.width -= target.getPadding('lr');
            ret.height -= target.getPadding('tb');
        }
        return ret;
    },

    // private
    onLayout : function(container, target) {
        Ext.layout.AnchorLayout.superclass.onLayout.call(this, container, target);

        var size = this.getLayoutTargetSize(),
            containerWidth = size.width,
            containerHeight = size.height,
            overflow = target.getStyle('overflow'),
            components = this.getRenderedItems(container),
            len = components.length,
            boxes = [],
            box,
            anchorWidth,
            anchorHeight,
            component,
            anchorSpec,
            calcWidth,
            calcHeight,
            anchorsArray,
            totalHeight = 0,
            i,
            el;

        if(containerWidth < 20 && containerHeight < 20){
            return;
        }

        // find the container anchoring size
        if(container.anchorSize) {
            if(typeof container.anchorSize == 'number') {
                anchorWidth = container.anchorSize;
            } else {
                anchorWidth = container.anchorSize.width;
                anchorHeight = container.anchorSize.height;
            }
        } else {
            anchorWidth = container.initialConfig.width;
            anchorHeight = container.initialConfig.height;
        }

        for(i = 0; i < len; i++) {
            component = components[i];
            el = component.getPositionEl();

            // If a child container item has no anchor and no specific width, set the child to the default anchor size
            if (!component.anchor && component.items && !Ext.isNumber(component.width) && !(Ext.isIE6 && Ext.isStrict)){
                component.anchor = this.defaultAnchor;
            }

            if(component.anchor) {
                anchorSpec = component.anchorSpec;
                // cache all anchor values
                if(!anchorSpec){
                    anchorsArray = component.anchor.split(' ');
                    component.anchorSpec = anchorSpec = {
                        right: this.parseAnchor(anchorsArray[0], component.initialConfig.width, anchorWidth),
                        bottom: this.parseAnchor(anchorsArray[1], component.initialConfig.height, anchorHeight)
                    };
                }
                calcWidth = anchorSpec.right ? this.adjustWidthAnchor(anchorSpec.right(containerWidth) - el.getMargins('lr'), component) : undefined;
                calcHeight = anchorSpec.bottom ? this.adjustHeightAnchor(anchorSpec.bottom(containerHeight) - el.getMargins('tb'), component) : undefined;

                if(calcWidth || calcHeight) {
                    boxes.push({
                        component: component,
                        width: calcWidth || undefined,
                        height: calcHeight || undefined
                    });
                }
            }
        }
        for (i = 0, len = boxes.length; i < len; i++) {
            box = boxes[i];
            box.component.setSize(box.width, box.height);
        }

        if (overflow && overflow != 'hidden' && !this.adjustmentPass) {
            var newTargetSize = this.getLayoutTargetSize();
            if (newTargetSize.width != size.width || newTargetSize.height != size.height){
                this.adjustmentPass = true;
                this.onLayout(container, target);
            }
        }

        delete this.adjustmentPass;
    },

    // private
    parseAnchor : function(a, start, cstart) {
        if (a && a != 'none') {
            var last;
            // standard anchor
            if (this.parseAnchorRE.test(a)) {
                var diff = cstart - start;
                return function(v){
                    if(v !== last){
                        last = v;
                        return v - diff;
                    }
                };
            // percentage
            } else if(a.indexOf('%') != -1) {
                var ratio = parseFloat(a.replace('%', ''))*.01;
                return function(v){
                    if(v !== last){
                        last = v;
                        return Math.floor(v*ratio);
                    }
                };
            // simple offset adjustment
            } else {
                a = parseInt(a, 10);
                if (!isNaN(a)) {
                    return function(v) {
                        if (v !== last) {
                            last = v;
                            return v + a;
                        }
                    };
                }
            }
        }
        return false;
    },

    // private
    adjustWidthAnchor : function(value, comp){
        return value;
    },

    // private
    adjustHeightAnchor : function(value, comp){
        return value;
    }

    /**
     * @property activeItem
     * @hide
     */
});
Ext.Container.LAYOUTS['anchor'] = Ext.layout.AnchorLayout;
/**
 * @class Ext.layout.ColumnLayout
 * @extends Ext.layout.ContainerLayout
 * <p>This is the layout style of choice for creating structural layouts in a multi-column format where the width of
 * each column can be specified as a percentage or fixed width, but the height is allowed to vary based on the content.
 * This class is intended to be extended or created via the layout:'column' {@link Ext.Container#layout} config,
 * and should generally not need to be created directly via the new keyword.</p>
 * <p>ColumnLayout does not have any direct config options (other than inherited ones), but it does support a
 * specific config property of <b><tt>columnWidth</tt></b> that can be included in the config of any panel added to it.  The
 * layout will use the columnWidth (if present) or width of each panel during layout to determine how to size each panel.
 * If width or columnWidth is not specified for a given panel, its width will default to the panel's width (or auto).</p>
 * <p>The width property is always evaluated as pixels, and must be a number greater than or equal to 1.
 * The columnWidth property is always evaluated as a percentage, and must be a decimal value greater than 0 and
 * less than 1 (e.g., .25).</p>
 * <p>The basic rules for specifying column widths are pretty simple.  The logic makes two passes through the
 * set of contained panels.  During the first layout pass, all panels that either have a fixed width or none
 * specified (auto) are skipped, but their widths are subtracted from the overall container width.  During the second
 * pass, all panels with columnWidths are assigned pixel widths in proportion to their percentages based on
 * the total <b>remaining</b> container width.  In other words, percentage width panels are designed to fill the space
 * left over by all the fixed-width and/or auto-width panels.  Because of this, while you can specify any number of columns
 * with different percentages, the columnWidths must always add up to 1 (or 100%) when added together, otherwise your
 * layout may not render as expected.  Example usage:</p>
 * <pre><code>
// All columns are percentages -- they must add up to 1
var p = new Ext.Panel({
    title: 'Column Layout - Percentage Only',
    layout:'column',
    items: [{
        title: 'Column 1',
        columnWidth: .25
    },{
        title: 'Column 2',
        columnWidth: .6
    },{
        title: 'Column 3',
        columnWidth: .15
    }]
});

// Mix of width and columnWidth -- all columnWidth values must add up
// to 1. The first column will take up exactly 120px, and the last two
// columns will fill the remaining container width.
var p = new Ext.Panel({
    title: 'Column Layout - Mixed',
    layout:'column',
    items: [{
        title: 'Column 1',
        width: 120
    },{
        title: 'Column 2',
        columnWidth: .8
    },{
        title: 'Column 3',
        columnWidth: .2
    }]
});
</code></pre>
 */
Ext.layout.ColumnLayout = Ext.extend(Ext.layout.ContainerLayout, {
    // private
    monitorResize:true,

    type: 'column',

    extraCls: 'x-column',

    scrollOffset : 0,

    // private

    targetCls: 'x-column-layout-ct',

    isValidParent : function(c, target){
        return this.innerCt && c.getPositionEl().dom.parentNode == this.innerCt.dom;
    },

    getLayoutTargetSize : function() {
        var target = this.container.getLayoutTarget(), ret;
        if (target) {
            ret = target.getViewSize();

            // IE in strict mode will return a width of 0 on the 1st pass of getViewSize.
            // Use getStyleSize to verify the 0 width, the adjustment pass will then work properly
            // with getViewSize
            if (Ext.isIE && Ext.isStrict && ret.width == 0){
                ret =  target.getStyleSize();
            }

            ret.width -= target.getPadding('lr');
            ret.height -= target.getPadding('tb');
        }
        return ret;
    },

    renderAll : function(ct, target) {
        if(!this.innerCt){
            // the innerCt prevents wrapping and shuffling while
            // the container is resizing
            this.innerCt = target.createChild({cls:'x-column-inner'});
            this.innerCt.createChild({cls:'x-clear'});
        }
        Ext.layout.ColumnLayout.superclass.renderAll.call(this, ct, this.innerCt);
    },

    // private
    onLayout : function(ct, target){
        var cs = ct.items.items,
            len = cs.length,
            c,
            i,
            m,
            margins = [];

        this.renderAll(ct, target);

        var size = this.getLayoutTargetSize();

        if(size.width < 1 && size.height < 1){ // display none?
            return;
        }

        var w = size.width - this.scrollOffset,
            h = size.height,
            pw = w;

        this.innerCt.setWidth(w);

        // some columns can be percentages while others are fixed
        // so we need to make 2 passes

        for(i = 0; i < len; i++){
            c = cs[i];
            m = c.getPositionEl().getMargins('lr');
            margins[i] = m;
            if(!c.columnWidth){
                pw -= (c.getWidth() + m);
            }
        }

        pw = pw < 0 ? 0 : pw;

        for(i = 0; i < len; i++){
            c = cs[i];
            m = margins[i];
            if(c.columnWidth){
                c.setSize(Math.floor(c.columnWidth * pw) - m);
            }
        }

        // Browsers differ as to when they account for scrollbars.  We need to re-measure to see if the scrollbar
        // spaces were accounted for properly.  If not, re-layout.
        if (Ext.isIE) {
            if (i = target.getStyle('overflow') && i != 'hidden' && !this.adjustmentPass) {
                var ts = this.getLayoutTargetSize();
                if (ts.width != size.width){
                    this.adjustmentPass = true;
                    this.onLayout(ct, target);
                }
            }
        }
        delete this.adjustmentPass;
    }

    /**
     * @property activeItem
     * @hide
     */
});

Ext.Container.LAYOUTS['column'] = Ext.layout.ColumnLayout;
/**
 * @class Ext.layout.BorderLayout
 * @extends Ext.layout.ContainerLayout
 * <p>This is a multi-pane, application-oriented UI layout style that supports multiple
 * nested panels, automatic {@link Ext.layout.BorderLayout.Region#split split} bars between
 * {@link Ext.layout.BorderLayout.Region#BorderLayout.Region regions} and built-in
 * {@link Ext.layout.BorderLayout.Region#collapsible expanding and collapsing} of regions.</p>
 * <p>This class is intended to be extended or created via the <tt>layout:'border'</tt>
 * {@link Ext.Container#layout} config, and should generally not need to be created directly
 * via the new keyword.</p>
 * <p>BorderLayout does not have any direct config options (other than inherited ones).
 * All configuration options available for customizing the BorderLayout are at the
 * {@link Ext.layout.BorderLayout.Region} and {@link Ext.layout.BorderLayout.SplitRegion}
 * levels.</p>
 * <p>Example usage:</p>
 * <pre><code>
var myBorderPanel = new Ext.Panel({
    {@link Ext.Component#renderTo renderTo}: document.body,
    {@link Ext.BoxComponent#width width}: 700,
    {@link Ext.BoxComponent#height height}: 500,
    {@link Ext.Panel#title title}: 'Border Layout',
    {@link Ext.Container#layout layout}: 'border',
    {@link Ext.Container#items items}: [{
        {@link Ext.Panel#title title}: 'South Region is resizable',
        {@link Ext.layout.BorderLayout.Region#BorderLayout.Region region}: 'south',     // position for region
        {@link Ext.BoxComponent#height height}: 100,
        {@link Ext.layout.BorderLayout.Region#split split}: true,         // enable resizing
        {@link Ext.SplitBar#minSize minSize}: 75,         // defaults to {@link Ext.layout.BorderLayout.Region#minHeight 50}
        {@link Ext.SplitBar#maxSize maxSize}: 150,
        {@link Ext.layout.BorderLayout.Region#margins margins}: '0 5 5 5'
    },{
        // xtype: 'panel' implied by default
        {@link Ext.Panel#title title}: 'West Region is collapsible',
        {@link Ext.layout.BorderLayout.Region#BorderLayout.Region region}:'west',
        {@link Ext.layout.BorderLayout.Region#margins margins}: '5 0 0 5',
        {@link Ext.BoxComponent#width width}: 200,
        {@link Ext.layout.BorderLayout.Region#collapsible collapsible}: true,   // make collapsible
        {@link Ext.layout.BorderLayout.Region#cmargins cmargins}: '5 5 0 5', // adjust top margin when collapsed
        {@link Ext.Component#id id}: 'west-region-container',
        {@link Ext.Container#layout layout}: 'fit',
        {@link Ext.Panel#unstyled unstyled}: true
    },{
        {@link Ext.Panel#title title}: 'Center Region',
        {@link Ext.layout.BorderLayout.Region#BorderLayout.Region region}: 'center',     // center region is required, no width/height specified
        {@link Ext.Component#xtype xtype}: 'container',
        {@link Ext.Container#layout layout}: 'fit',
        {@link Ext.layout.BorderLayout.Region#margins margins}: '5 5 0 0'
    }]
});
</code></pre>
 * <p><b><u>Notes</u></b>:</p><div class="mdetail-params"><ul>
 * <li>Any container using the BorderLayout <b>must</b> have a child item with <tt>region:'center'</tt>.
 * The child item in the center region will always be resized to fill the remaining space not used by
 * the other regions in the layout.</li>
 * <li>Any child items with a region of <tt>west</tt> or <tt>east</tt> must have <tt>width</tt> defined
 * (an integer representing the number of pixels that the region should take up).</li>
 * <li>Any child items with a region of <tt>north</tt> or <tt>south</tt> must have <tt>height</tt> defined.</li>
 * <li>The regions of a BorderLayout are <b>fixed at render time</b> and thereafter, its child Components may not be removed or added</b>.  To add/remove
 * Components within a BorderLayout, have them wrapped by an additional Container which is directly
 * managed by the BorderLayout.  If the region is to be collapsible, the Container used directly
 * by the BorderLayout manager should be a Panel.  In the following example a Container (an Ext.Panel)
 * is added to the west region:
 * <div style="margin-left:16px"><pre><code>
wrc = {@link Ext#getCmp Ext.getCmp}('west-region-container');
wrc.{@link Ext.Panel#removeAll removeAll}();
wrc.{@link Ext.Container#add add}({
    title: 'Added Panel',
    html: 'Some content'
});
wrc.{@link Ext.Container#doLayout doLayout}();
 * </code></pre></div>
 * </li>
 * <li> To reference a {@link Ext.layout.BorderLayout.Region Region}:
 * <div style="margin-left:16px"><pre><code>
wr = myBorderPanel.layout.west;
 * </code></pre></div>
 * </li>
 * </ul></div>
 */
Ext.layout.BorderLayout = Ext.extend(Ext.layout.ContainerLayout, {
    // private
    monitorResize:true,
    // private
    rendered : false,

    type: 'border',

    targetCls: 'x-border-layout-ct',

    getLayoutTargetSize : function() {
        var target = this.container.getLayoutTarget();
        return target ? target.getViewSize() : {};
    },

    // private
    onLayout : function(ct, target){
        var collapsed, i, c, pos, items = ct.items.items, len = items.length;
        if(!this.rendered){
            collapsed = [];
            for(i = 0; i < len; i++) {
                c = items[i];
                pos = c.region;
                if(c.collapsed){
                    collapsed.push(c);
                }
                c.collapsed = false;
                if(!c.rendered){
                    c.render(target, i);
                    c.getPositionEl().addClass('x-border-panel');
                }
                this[pos] = pos != 'center' && c.split ?
                    new Ext.layout.BorderLayout.SplitRegion(this, c.initialConfig, pos) :
                    new Ext.layout.BorderLayout.Region(this, c.initialConfig, pos);
                this[pos].render(target, c);
            }
            this.rendered = true;
        }

        var size = this.getLayoutTargetSize();
        if(size.width < 20 || size.height < 20){ // display none?
            if(collapsed){
                this.restoreCollapsed = collapsed;
            }
            return;
        }else if(this.restoreCollapsed){
            collapsed = this.restoreCollapsed;
            delete this.restoreCollapsed;
        }

        var w = size.width, h = size.height,
            centerW = w, centerH = h, centerY = 0, centerX = 0,
            n = this.north, s = this.south, west = this.west, e = this.east, c = this.center,
            b, m, totalWidth, totalHeight;
        if(!c && Ext.layout.BorderLayout.WARN !== false){
            throw 'No center region defined in BorderLayout ' + ct.id;
        }

        if(n && n.isVisible()){
            b = n.getSize();
            m = n.getMargins();
            b.width = w - (m.left+m.right);
            b.x = m.left;
            b.y = m.top;
            centerY = b.height + b.y + m.bottom;
            centerH -= centerY;
            n.applyLayout(b);
        }
        if(s && s.isVisible()){
            b = s.getSize();
            m = s.getMargins();
            b.width = w - (m.left+m.right);
            b.x = m.left;
            totalHeight = (b.height + m.top + m.bottom);
            b.y = h - totalHeight + m.top;
            centerH -= totalHeight;
            s.applyLayout(b);
        }
        if(west && west.isVisible()){
            b = west.getSize();
            m = west.getMargins();
            b.height = centerH - (m.top+m.bottom);
            b.x = m.left;
            b.y = centerY + m.top;
            totalWidth = (b.width + m.left + m.right);
            centerX += totalWidth;
            centerW -= totalWidth;
            west.applyLayout(b);
        }
        if(e && e.isVisible()){
            b = e.getSize();
            m = e.getMargins();
            b.height = centerH - (m.top+m.bottom);
            totalWidth = (b.width + m.left + m.right);
            b.x = w - totalWidth + m.left;
            b.y = centerY + m.top;
            centerW -= totalWidth;
            e.applyLayout(b);
        }
        if(c){
            m = c.getMargins();
            var centerBox = {
                x: centerX + m.left,
                y: centerY + m.top,
                width: centerW - (m.left+m.right),
                height: centerH - (m.top+m.bottom)
            };
            c.applyLayout(centerBox);
        }
        if(collapsed){
            for(i = 0, len = collapsed.length; i < len; i++){
                collapsed[i].collapse(false);
            }
        }
        if(Ext.isIE && Ext.isStrict){ // workaround IE strict repainting issue
            target.repaint();
        }
        // Putting a border layout into an overflowed container is NOT correct and will make a second layout pass necessary.
        if (i = target.getStyle('overflow') && i != 'hidden' && !this.adjustmentPass) {
            var ts = this.getLayoutTargetSize();
            if (ts.width != size.width || ts.height != size.height){
                this.adjustmentPass = true;
                this.onLayout(ct, target);
            }
        }
        delete this.adjustmentPass;
    },

    destroy: function() {
        var r = ['north', 'south', 'east', 'west'], i, region;
        for (i = 0; i < r.length; i++) {
            region = this[r[i]];
            if(region){
                if(region.destroy){
                    region.destroy();
                }else if (region.split){
                    region.split.destroy(true);
                }
            }
        }
        Ext.layout.BorderLayout.superclass.destroy.call(this);
    }

    /**
     * @property activeItem
     * @hide
     */
});

/**
 * @class Ext.layout.BorderLayout.Region
 * <p>This is a region of a {@link Ext.layout.BorderLayout BorderLayout} that acts as a subcontainer
 * within the layout.  Each region has its own {@link Ext.layout.ContainerLayout layout} that is
 * independent of other regions and the containing BorderLayout, and can be any of the
 * {@link Ext.layout.ContainerLayout valid Ext layout types}.</p>
 * <p>Region size is managed automatically and cannot be changed by the user -- for
 * {@link #split resizable regions}, see {@link Ext.layout.BorderLayout.SplitRegion}.</p>
 * @constructor
 * Create a new Region.
 * @param {Layout} layout The {@link Ext.layout.BorderLayout BorderLayout} instance that is managing this Region.
 * @param {Object} config The configuration options
 * @param {String} position The region position.  Valid values are: <tt>north</tt>, <tt>south</tt>,
 * <tt>east</tt>, <tt>west</tt> and <tt>center</tt>.  Every {@link Ext.layout.BorderLayout BorderLayout}
 * <b>must have a center region</b> for the primary content -- all other regions are optional.
 */
Ext.layout.BorderLayout.Region = function(layout, config, pos){
    Ext.apply(this, config);
    this.layout = layout;
    this.position = pos;
    this.state = {};
    if(typeof this.margins == 'string'){
        this.margins = this.layout.parseMargins(this.margins);
    }
    this.margins = Ext.applyIf(this.margins || {}, this.defaultMargins);
    if(this.collapsible){
        if(typeof this.cmargins == 'string'){
            this.cmargins = this.layout.parseMargins(this.cmargins);
        }
        if(this.collapseMode == 'mini' && !this.cmargins){
            this.cmargins = {left:0,top:0,right:0,bottom:0};
        }else{
            this.cmargins = Ext.applyIf(this.cmargins || {},
                pos == 'north' || pos == 'south' ? this.defaultNSCMargins : this.defaultEWCMargins);
        }
    }
};

Ext.layout.BorderLayout.Region.prototype = {
    /**
     * @cfg {Boolean} animFloat
     * When a collapsed region's bar is clicked, the region's panel will be displayed as a floated
     * panel that will close again once the user mouses out of that panel (or clicks out if
     * <tt>{@link #autoHide} = false</tt>).  Setting <tt>{@link #animFloat} = false</tt> will
     * prevent the open and close of these floated panels from being animated (defaults to <tt>true</tt>).
     */
    /**
     * @cfg {Boolean} autoHide
     * When a collapsed region's bar is clicked, the region's panel will be displayed as a floated
     * panel.  If <tt>autoHide = true</tt>, the panel will automatically hide after the user mouses
     * out of the panel.  If <tt>autoHide = false</tt>, the panel will continue to display until the
     * user clicks outside of the panel (defaults to <tt>true</tt>).
     */
    /**
     * @cfg {String} collapseMode
     * <tt>collapseMode</tt> supports two configuration values:<div class="mdetail-params"><ul>
     * <li><b><tt>undefined</tt></b> (default)<div class="sub-desc">By default, {@link #collapsible}
     * regions are collapsed by clicking the expand/collapse tool button that renders into the region's
     * title bar.</div></li>
     * <li><b><tt>'mini'</tt></b><div class="sub-desc">Optionally, when <tt>collapseMode</tt> is set to
     * <tt>'mini'</tt> the region's split bar will also display a small collapse button in the center of
     * the bar. In <tt>'mini'</tt> mode the region will collapse to a thinner bar than in normal mode.
     * </div></li>
     * </ul></div></p>
     * <p><b>Note</b>: if a collapsible region does not have a title bar, then set <tt>collapseMode =
     * 'mini'</tt> and <tt>{@link #split} = true</tt> in order for the region to be {@link #collapsible}
     * by the user as the expand/collapse tool button (that would go in the title bar) will not be rendered.</p>
     * <p>See also <tt>{@link #cmargins}</tt>.</p>
     */
    /**
     * @cfg {Object} margins
     * An object containing margins to apply to the region when in the expanded state in the
     * format:<pre><code>
{
    top: (top margin),
    right: (right margin),
    bottom: (bottom margin),
    left: (left margin)
}</code></pre>
     * <p>May also be a string containing space-separated, numeric margin values. The order of the
     * sides associated with each value matches the way CSS processes margin values:</p>
     * <p><div class="mdetail-params"><ul>
     * <li>If there is only one value, it applies to all sides.</li>
     * <li>If there are two values, the top and bottom borders are set to the first value and the
     * right and left are set to the second.</li>
     * <li>If there are three values, the top is set to the first value, the left and right are set
     * to the second, and the bottom is set to the third.</li>
     * <li>If there are four values, they apply to the top, right, bottom, and left, respectively.</li>
     * </ul></div></p>
     * <p>Defaults to:</p><pre><code>
     * {top:0, right:0, bottom:0, left:0}
     * </code></pre>
     */
    /**
     * @cfg {Object} cmargins
     * An object containing margins to apply to the region when in the collapsed state in the
     * format:<pre><code>
{
    top: (top margin),
    right: (right margin),
    bottom: (bottom margin),
    left: (left margin)
}</code></pre>
     * <p>May also be a string containing space-separated, numeric margin values. The order of the
     * sides associated with each value matches the way CSS processes margin values.</p>
     * <p><ul>
     * <li>If there is only one value, it applies to all sides.</li>
     * <li>If there are two values, the top and bottom borders are set to the first value and the
     * right and left are set to the second.</li>
     * <li>If there are three values, the top is set to the first value, the left and right are set
     * to the second, and the bottom is set to the third.</li>
     * <li>If there are four values, they apply to the top, right, bottom, and left, respectively.</li>
     * </ul></p>
     */
    /**
     * @cfg {Boolean} collapsible
     * <p><tt>true</tt> to allow the user to collapse this region (defaults to <tt>false</tt>).  If
     * <tt>true</tt>, an expand/collapse tool button will automatically be rendered into the title
     * bar of the region, otherwise the button will not be shown.</p>
     * <p><b>Note</b>: that a title bar is required to display the collapse/expand toggle button -- if
     * no <tt>title</tt> is specified for the region's panel, the region will only be collapsible if
     * <tt>{@link #collapseMode} = 'mini'</tt> and <tt>{@link #split} = true</tt>.
     */
    collapsible : false,
    /**
     * @cfg {Boolean} split
     * <p><tt>true</tt> to create a {@link Ext.layout.BorderLayout.SplitRegion SplitRegion} and
     * display a 5px wide {@link Ext.SplitBar} between this region and its neighbor, allowing the user to
     * resize the regions dynamically.  Defaults to <tt>false</tt> creating a
     * {@link Ext.layout.BorderLayout.Region Region}.</p><br>
     * <p><b>Notes</b>:</p><div class="mdetail-params"><ul>
     * <li>this configuration option is ignored if <tt>region='center'</tt></li>
     * <li>when <tt>split == true</tt>, it is common to specify a
     * <tt>{@link Ext.SplitBar#minSize minSize}</tt> and <tt>{@link Ext.SplitBar#maxSize maxSize}</tt>
     * for the {@link Ext.BoxComponent BoxComponent} representing the region. These are not native
     * configs of {@link Ext.BoxComponent BoxComponent}, and are used only by this class.</li>
     * <li>if <tt>{@link #collapseMode} = 'mini'</tt> requires <tt>split = true</tt> to reserve space
     * for the collapse tool</tt></li>
     * </ul></div>
     */
    split:false,
    /**
     * @cfg {Boolean} floatable
     * <tt>true</tt> to allow clicking a collapsed region's bar to display the region's panel floated
     * above the layout, <tt>false</tt> to force the user to fully expand a collapsed region by
     * clicking the expand button to see it again (defaults to <tt>true</tt>).
     */
    floatable: true,
    /**
     * @cfg {Number} minWidth
     * <p>The minimum allowable width in pixels for this region (defaults to <tt>50</tt>).
     * <tt>maxWidth</tt> may also be specified.</p><br>
     * <p><b>Note</b>: setting the <tt>{@link Ext.SplitBar#minSize minSize}</tt> /
     * <tt>{@link Ext.SplitBar#maxSize maxSize}</tt> supersedes any specified
     * <tt>minWidth</tt> / <tt>maxWidth</tt>.</p>
     */
    minWidth:50,
    /**
     * @cfg {Number} minHeight
     * The minimum allowable height in pixels for this region (defaults to <tt>50</tt>)
     * <tt>maxHeight</tt> may also be specified.</p><br>
     * <p><b>Note</b>: setting the <tt>{@link Ext.SplitBar#minSize minSize}</tt> /
     * <tt>{@link Ext.SplitBar#maxSize maxSize}</tt> supersedes any specified
     * <tt>minHeight</tt> / <tt>maxHeight</tt>.</p>
     */
    minHeight:50,

    // private
    defaultMargins : {left:0,top:0,right:0,bottom:0},
    // private
    defaultNSCMargins : {left:5,top:5,right:5,bottom:5},
    // private
    defaultEWCMargins : {left:5,top:0,right:5,bottom:0},
    floatingZIndex: 100,

    /**
     * True if this region is collapsed. Read-only.
     * @type Boolean
     * @property
     */
    isCollapsed : false,

    /**
     * This region's panel.  Read-only.
     * @type Ext.Panel
     * @property panel
     */
    /**
     * This region's layout.  Read-only.
     * @type Layout
     * @property layout
     */
    /**
     * This region's layout position (north, south, east, west or center).  Read-only.
     * @type String
     * @property position
     */

    // private
    render : function(ct, p){
        this.panel = p;
        p.el.enableDisplayMode();
        this.targetEl = ct;
        this.el = p.el;

        var gs = p.getState, ps = this.position;
        p.getState = function(){
            return Ext.apply(gs.call(p) || {}, this.state);
        }.createDelegate(this);

        if(ps != 'center'){
            p.allowQueuedExpand = false;
            p.on({
                beforecollapse: this.beforeCollapse,
                collapse: this.onCollapse,
                beforeexpand: this.beforeExpand,
                expand: this.onExpand,
                hide: this.onHide,
                show: this.onShow,
                scope: this
            });
            if(this.collapsible || this.floatable){
                p.collapseEl = 'el';
                p.slideAnchor = this.getSlideAnchor();
            }
            if(p.tools && p.tools.toggle){
                p.tools.toggle.addClass('x-tool-collapse-'+ps);
                p.tools.toggle.addClassOnOver('x-tool-collapse-'+ps+'-over');
            }
        }
    },

    // private
    getCollapsedEl : function(){
        if(!this.collapsedEl){
            if(!this.toolTemplate){
                var tt = new Ext.Template(
                     '<div class="x-tool x-tool-{id}">&#160;</div>'
                );
                tt.disableFormats = true;
                tt.compile();
                Ext.layout.BorderLayout.Region.prototype.toolTemplate = tt;
            }
            this.collapsedEl = this.targetEl.createChild({
                cls: "x-layout-collapsed x-layout-collapsed-"+this.position,
                id: this.panel.id + '-xcollapsed'
            });
            this.collapsedEl.enableDisplayMode('block');

            if(this.collapseMode == 'mini'){
                this.collapsedEl.addClass('x-layout-cmini-'+this.position);
                this.miniCollapsedEl = this.collapsedEl.createChild({
                    cls: "x-layout-mini x-layout-mini-"+this.position, html: "&#160;"
                });
                this.miniCollapsedEl.addClassOnOver('x-layout-mini-over');
                this.collapsedEl.addClassOnOver("x-layout-collapsed-over");
                this.collapsedEl.on('click', this.onExpandClick, this, {stopEvent:true});
            }else {
                if(this.collapsible !== false && !this.hideCollapseTool) {
                    var t = this.expandToolEl = this.toolTemplate.append(
                            this.collapsedEl.dom,
                            {id:'expand-'+this.position}, true);
                    t.addClassOnOver('x-tool-expand-'+this.position+'-over');
                    t.on('click', this.onExpandClick, this, {stopEvent:true});
                }
                if(this.floatable !== false || this.titleCollapse){
                   this.collapsedEl.addClassOnOver("x-layout-collapsed-over");
                   this.collapsedEl.on("click", this[this.floatable ? 'collapseClick' : 'onExpandClick'], this);
                }
            }
        }
        return this.collapsedEl;
    },

    // private
    onExpandClick : function(e){
        if(this.isSlid){
            this.panel.expand(false);
        }else{
            this.panel.expand();
        }
    },

    // private
    onCollapseClick : function(e){
        this.panel.collapse();
    },

    // private
    beforeCollapse : function(p, animate){
        this.lastAnim = animate;
        if(this.splitEl){
            this.splitEl.hide();
        }
        this.getCollapsedEl().show();
        var el = this.panel.getEl();
        this.originalZIndex = el.getStyle('z-index');
        el.setStyle('z-index', 100);
        this.isCollapsed = true;
        this.layout.layout();
    },

    // private
    onCollapse : function(animate){
        this.panel.el.setStyle('z-index', 1);
        if(this.lastAnim === false || this.panel.animCollapse === false){
            this.getCollapsedEl().dom.style.visibility = 'visible';
        }else{
            this.getCollapsedEl().slideIn(this.panel.slideAnchor, {duration:.2});
        }
        this.state.collapsed = true;
        this.panel.saveState();
    },

    // private
    beforeExpand : function(animate){
        if(this.isSlid){
            this.afterSlideIn();
        }
        var c = this.getCollapsedEl();
        this.el.show();
        if(this.position == 'east' || this.position == 'west'){
            this.panel.setSize(undefined, c.getHeight());
        }else{
            this.panel.setSize(c.getWidth(), undefined);
        }
        c.hide();
        c.dom.style.visibility = 'hidden';
        this.panel.el.setStyle('z-index', this.floatingZIndex);
    },

    // private
    onExpand : function(){
        this.isCollapsed = false;
        if(this.splitEl){
            this.splitEl.show();
        }
        this.layout.layout();
        this.panel.el.setStyle('z-index', this.originalZIndex);
        this.state.collapsed = false;
        this.panel.saveState();
    },

    // private
    collapseClick : function(e){
        if(this.isSlid){
           e.stopPropagation();
           this.slideIn();
        }else{
           e.stopPropagation();
           this.slideOut();
        }
    },

    // private
    onHide : function(){
        if(this.isCollapsed){
            this.getCollapsedEl().hide();
        }else if(this.splitEl){
            this.splitEl.hide();
        }
    },

    // private
    onShow : function(){
        if(this.isCollapsed){
            this.getCollapsedEl().show();
        }else if(this.splitEl){
            this.splitEl.show();
        }
    },

    /**
     * True if this region is currently visible, else false.
     * @return {Boolean}
     */
    isVisible : function(){
        return !this.panel.hidden;
    },

    /**
     * Returns the current margins for this region.  If the region is collapsed, the
     * {@link #cmargins} (collapsed margins) value will be returned, otherwise the
     * {@link #margins} value will be returned.
     * @return {Object} An object containing the element's margins: <tt>{left: (left
     * margin), top: (top margin), right: (right margin), bottom: (bottom margin)}</tt>
     */
    getMargins : function(){
        return this.isCollapsed && this.cmargins ? this.cmargins : this.margins;
    },

    /**
     * Returns the current size of this region.  If the region is collapsed, the size of the
     * collapsedEl will be returned, otherwise the size of the region's panel will be returned.
     * @return {Object} An object containing the element's size: <tt>{width: (element width),
     * height: (element height)}</tt>
     */
    getSize : function(){
        return this.isCollapsed ? this.getCollapsedEl().getSize() : this.panel.getSize();
    },

    /**
     * Sets the specified panel as the container element for this region.
     * @param {Ext.Panel} panel The new panel
     */
    setPanel : function(panel){
        this.panel = panel;
    },

    /**
     * Returns the minimum allowable width for this region.
     * @return {Number} The minimum width
     */
    getMinWidth: function(){
        return this.minWidth;
    },

    /**
     * Returns the minimum allowable height for this region.
     * @return {Number} The minimum height
     */
    getMinHeight: function(){
        return this.minHeight;
    },

    // private
    applyLayoutCollapsed : function(box){
        var ce = this.getCollapsedEl();
        ce.setLeftTop(box.x, box.y);
        ce.setSize(box.width, box.height);
    },

    // private
    applyLayout : function(box){
        if(this.isCollapsed){
            this.applyLayoutCollapsed(box);
        }else{
            this.panel.setPosition(box.x, box.y);
            this.panel.setSize(box.width, box.height);
        }
    },

    // private
    beforeSlide: function(){
        this.panel.beforeEffect();
    },

    // private
    afterSlide : function(){
        this.panel.afterEffect();
    },

    // private
    initAutoHide : function(){
        if(this.autoHide !== false){
            if(!this.autoHideHd){
                this.autoHideSlideTask = new Ext.util.DelayedTask(this.slideIn, this);
                this.autoHideHd = {
                    "mouseout": function(e){
                        if(!e.within(this.el, true)){
                            this.autoHideSlideTask.delay(500);
                        }
                    },
                    "mouseover" : function(e){
                        this.autoHideSlideTask.cancel();
                    },
                    scope : this
                };
            }
            this.el.on(this.autoHideHd);
            this.collapsedEl.on(this.autoHideHd);
        }
    },

    // private
    clearAutoHide : function(){
        if(this.autoHide !== false){
            this.el.un("mouseout", this.autoHideHd.mouseout);
            this.el.un("mouseover", this.autoHideHd.mouseover);
            this.collapsedEl.un("mouseout", this.autoHideHd.mouseout);
            this.collapsedEl.un("mouseover", this.autoHideHd.mouseover);
        }
    },

    // private
    clearMonitor : function(){
        Ext.getDoc().un("click", this.slideInIf, this);
    },

    /**
     * If this Region is {@link #floatable}, this method slides this Region into full visibility <i>over the top
     * of the center Region</i> where it floats until either {@link #slideIn} is called, or other regions of the layout
     * are clicked, or the mouse exits the Region.
     */
    slideOut : function(){
        if(this.isSlid || this.el.hasActiveFx()){
            return;
        }
        this.isSlid = true;
        var ts = this.panel.tools, dh, pc;
        if(ts && ts.toggle){
            ts.toggle.hide();
        }
        this.el.show();

        // Temporarily clear the collapsed flag so we can onResize the panel on the slide
        pc = this.panel.collapsed;
        this.panel.collapsed = false;

        if(this.position == 'east' || this.position == 'west'){
            // Temporarily clear the deferHeight flag so we can size the height on the slide
            dh = this.panel.deferHeight;
            this.panel.deferHeight = false;

            this.panel.setSize(undefined, this.collapsedEl.getHeight());

            // Put the deferHeight flag back after setSize
            this.panel.deferHeight = dh;
        }else{
            this.panel.setSize(this.collapsedEl.getWidth(), undefined);
        }

        // Put the collapsed flag back after onResize
        this.panel.collapsed = pc;

        this.restoreLT = [this.el.dom.style.left, this.el.dom.style.top];
        this.el.alignTo(this.collapsedEl, this.getCollapseAnchor());
        this.el.setStyle("z-index", this.floatingZIndex+2);
        this.panel.el.replaceClass('x-panel-collapsed', 'x-panel-floating');
        if(this.animFloat !== false){
            this.beforeSlide();
            this.el.slideIn(this.getSlideAnchor(), {
                callback: function(){
                    this.afterSlide();
                    this.initAutoHide();
                    Ext.getDoc().on("click", this.slideInIf, this);
                },
                scope: this,
                block: true
            });
        }else{
            this.initAutoHide();
             Ext.getDoc().on("click", this.slideInIf, this);
        }
    },

    // private
    afterSlideIn : function(){
        this.clearAutoHide();
        this.isSlid = false;
        this.clearMonitor();
        this.el.setStyle("z-index", "");
        this.panel.el.replaceClass('x-panel-floating', 'x-panel-collapsed');
        this.el.dom.style.left = this.restoreLT[0];
        this.el.dom.style.top = this.restoreLT[1];

        var ts = this.panel.tools;
        if(ts && ts.toggle){
            ts.toggle.show();
        }
    },

    /**
     * If this Region is {@link #floatable}, and this Region has been slid into floating visibility, then this method slides
     * this region back into its collapsed state.
     */
    slideIn : function(cb){
        if(!this.isSlid || this.el.hasActiveFx()){
            Ext.callback(cb);
            return;
        }
        this.isSlid = false;
        if(this.animFloat !== false){
            this.beforeSlide();
            this.el.slideOut(this.getSlideAnchor(), {
                callback: function(){
                    this.el.hide();
                    this.afterSlide();
                    this.afterSlideIn();
                    Ext.callback(cb);
                },
                scope: this,
                block: true
            });
        }else{
            this.el.hide();
            this.afterSlideIn();
        }
    },

    // private
    slideInIf : function(e){
        if(!e.within(this.el)){
            this.slideIn();
        }
    },

    // private
    anchors : {
        "west" : "left",
        "east" : "right",
        "north" : "top",
        "south" : "bottom"
    },

    // private
    sanchors : {
        "west" : "l",
        "east" : "r",
        "north" : "t",
        "south" : "b"
    },

    // private
    canchors : {
        "west" : "tl-tr",
        "east" : "tr-tl",
        "north" : "tl-bl",
        "south" : "bl-tl"
    },

    // private
    getAnchor : function(){
        return this.anchors[this.position];
    },

    // private
    getCollapseAnchor : function(){
        return this.canchors[this.position];
    },

    // private
    getSlideAnchor : function(){
        return this.sanchors[this.position];
    },

    // private
    getAlignAdj : function(){
        var cm = this.cmargins;
        switch(this.position){
            case "west":
                return [0, 0];
            break;
            case "east":
                return [0, 0];
            break;
            case "north":
                return [0, 0];
            break;
            case "south":
                return [0, 0];
            break;
        }
    },

    // private
    getExpandAdj : function(){
        var c = this.collapsedEl, cm = this.cmargins;
        switch(this.position){
            case "west":
                return [-(cm.right+c.getWidth()+cm.left), 0];
            break;
            case "east":
                return [cm.right+c.getWidth()+cm.left, 0];
            break;
            case "north":
                return [0, -(cm.top+cm.bottom+c.getHeight())];
            break;
            case "south":
                return [0, cm.top+cm.bottom+c.getHeight()];
            break;
        }
    },

    destroy : function(){
        if (this.autoHideSlideTask && this.autoHideSlideTask.cancel){
            this.autoHideSlideTask.cancel();
        }
        Ext.destroyMembers(this, 'miniCollapsedEl', 'collapsedEl', 'expandToolEl');
    }
};

/**
 * @class Ext.layout.BorderLayout.SplitRegion
 * @extends Ext.layout.BorderLayout.Region
 * <p>This is a specialized type of {@link Ext.layout.BorderLayout.Region BorderLayout region} that
 * has a built-in {@link Ext.SplitBar} for user resizing of regions.  The movement of the split bar
 * is configurable to move either {@link #tickSize smooth or incrementally}.</p>
 * @constructor
 * Create a new SplitRegion.
 * @param {Layout} layout The {@link Ext.layout.BorderLayout BorderLayout} instance that is managing this Region.
 * @param {Object} config The configuration options
 * @param {String} position The region position.  Valid values are: north, south, east, west and center.  Every
 * BorderLayout must have a center region for the primary content -- all other regions are optional.
 */
Ext.layout.BorderLayout.SplitRegion = function(layout, config, pos){
    Ext.layout.BorderLayout.SplitRegion.superclass.constructor.call(this, layout, config, pos);
    // prevent switch
    this.applyLayout = this.applyFns[pos];
};

Ext.extend(Ext.layout.BorderLayout.SplitRegion, Ext.layout.BorderLayout.Region, {
    /**
     * @cfg {Number} tickSize
     * The increment, in pixels by which to move this Region's {@link Ext.SplitBar SplitBar}.
     * By default, the {@link Ext.SplitBar SplitBar} moves smoothly.
     */
    /**
     * @cfg {String} splitTip
     * The tooltip to display when the user hovers over a
     * {@link Ext.layout.BorderLayout.Region#collapsible non-collapsible} region's split bar
     * (defaults to <tt>"Drag to resize."</tt>).  Only applies if
     * <tt>{@link #useSplitTips} = true</tt>.
     */
    splitTip : "Drag to resize.",
    /**
     * @cfg {String} collapsibleSplitTip
     * The tooltip to display when the user hovers over a
     * {@link Ext.layout.BorderLayout.Region#collapsible collapsible} region's split bar
     * (defaults to "Drag to resize. Double click to hide."). Only applies if
     * <tt>{@link #useSplitTips} = true</tt>.
     */
    collapsibleSplitTip : "Drag to resize. Double click to hide.",
    /**
     * @cfg {Boolean} useSplitTips
     * <tt>true</tt> to display a tooltip when the user hovers over a region's split bar
     * (defaults to <tt>false</tt>).  The tooltip text will be the value of either
     * <tt>{@link #splitTip}</tt> or <tt>{@link #collapsibleSplitTip}</tt> as appropriate.
     */
    useSplitTips : false,

    // private
    splitSettings : {
        north : {
            orientation: Ext.SplitBar.VERTICAL,
            placement: Ext.SplitBar.TOP,
            maxFn : 'getVMaxSize',
            minProp: 'minHeight',
            maxProp: 'maxHeight'
        },
        south : {
            orientation: Ext.SplitBar.VERTICAL,
            placement: Ext.SplitBar.BOTTOM,
            maxFn : 'getVMaxSize',
            minProp: 'minHeight',
            maxProp: 'maxHeight'
        },
        east : {
            orientation: Ext.SplitBar.HORIZONTAL,
            placement: Ext.SplitBar.RIGHT,
            maxFn : 'getHMaxSize',
            minProp: 'minWidth',
            maxProp: 'maxWidth'
        },
        west : {
            orientation: Ext.SplitBar.HORIZONTAL,
            placement: Ext.SplitBar.LEFT,
            maxFn : 'getHMaxSize',
            minProp: 'minWidth',
            maxProp: 'maxWidth'
        }
    },

    // private
    applyFns : {
        west : function(box){
            if(this.isCollapsed){
                return this.applyLayoutCollapsed(box);
            }
            var sd = this.splitEl.dom, s = sd.style;
            this.panel.setPosition(box.x, box.y);
            var sw = sd.offsetWidth;
            s.left = (box.x+box.width-sw)+'px';
            s.top = (box.y)+'px';
            s.height = Math.max(0, box.height)+'px';
            this.panel.setSize(box.width-sw, box.height);
        },
        east : function(box){
            if(this.isCollapsed){
                return this.applyLayoutCollapsed(box);
            }
            var sd = this.splitEl.dom, s = sd.style;
            var sw = sd.offsetWidth;
            this.panel.setPosition(box.x+sw, box.y);
            s.left = (box.x)+'px';
            s.top = (box.y)+'px';
            s.height = Math.max(0, box.height)+'px';
            this.panel.setSize(box.width-sw, box.height);
        },
        north : function(box){
            if(this.isCollapsed){
                return this.applyLayoutCollapsed(box);
            }
            var sd = this.splitEl.dom, s = sd.style;
            var sh = sd.offsetHeight;
            this.panel.setPosition(box.x, box.y);
            s.left = (box.x)+'px';
            s.top = (box.y+box.height-sh)+'px';
            s.width = Math.max(0, box.width)+'px';
            this.panel.setSize(box.width, box.height-sh);
        },
        south : function(box){
            if(this.isCollapsed){
                return this.applyLayoutCollapsed(box);
            }
            var sd = this.splitEl.dom, s = sd.style;
            var sh = sd.offsetHeight;
            this.panel.setPosition(box.x, box.y+sh);
            s.left = (box.x)+'px';
            s.top = (box.y)+'px';
            s.width = Math.max(0, box.width)+'px';
            this.panel.setSize(box.width, box.height-sh);
        }
    },

    // private
    render : function(ct, p){
        Ext.layout.BorderLayout.SplitRegion.superclass.render.call(this, ct, p);

        var ps = this.position;

        this.splitEl = ct.createChild({
            cls: "x-layout-split x-layout-split-"+ps, html: "&#160;",
            id: this.panel.id + '-xsplit'
        });

        if(this.collapseMode == 'mini'){
            this.miniSplitEl = this.splitEl.createChild({
                cls: "x-layout-mini x-layout-mini-"+ps, html: "&#160;"
            });
            this.miniSplitEl.addClassOnOver('x-layout-mini-over');
            this.miniSplitEl.on('click', this.onCollapseClick, this, {stopEvent:true});
        }

        var s = this.splitSettings[ps];

        this.split = new Ext.SplitBar(this.splitEl.dom, p.el, s.orientation);
        this.split.tickSize = this.tickSize;
        this.split.placement = s.placement;
        this.split.getMaximumSize = this[s.maxFn].createDelegate(this);
        this.split.minSize = this.minSize || this[s.minProp];
        this.split.on("beforeapply", this.onSplitMove, this);
        this.split.useShim = this.useShim === true;
        this.maxSize = this.maxSize || this[s.maxProp];

        if(p.hidden){
            this.splitEl.hide();
        }

        if(this.useSplitTips){
            this.splitEl.dom.title = this.collapsible ? this.collapsibleSplitTip : this.splitTip;
        }
        if(this.collapsible){
            this.splitEl.on("dblclick", this.onCollapseClick,  this);
        }
    },

    //docs inherit from superclass
    getSize : function(){
        if(this.isCollapsed){
            return this.collapsedEl.getSize();
        }
        var s = this.panel.getSize();
        if(this.position == 'north' || this.position == 'south'){
            s.height += this.splitEl.dom.offsetHeight;
        }else{
            s.width += this.splitEl.dom.offsetWidth;
        }
        return s;
    },

    // private
    getHMaxSize : function(){
         var cmax = this.maxSize || 10000;
         var center = this.layout.center;
         return Math.min(cmax, (this.el.getWidth()+center.el.getWidth())-center.getMinWidth());
    },

    // private
    getVMaxSize : function(){
        var cmax = this.maxSize || 10000;
        var center = this.layout.center;
        return Math.min(cmax, (this.el.getHeight()+center.el.getHeight())-center.getMinHeight());
    },

    // private
    onSplitMove : function(split, newSize){
        var s = this.panel.getSize();
        this.lastSplitSize = newSize;
        if(this.position == 'north' || this.position == 'south'){
            this.panel.setSize(s.width, newSize);
            this.state.height = newSize;
        }else{
            this.panel.setSize(newSize, s.height);
            this.state.width = newSize;
        }
        this.layout.layout();
        this.panel.saveState();
        return false;
    },

    /**
     * Returns a reference to the split bar in use by this region.
     * @return {Ext.SplitBar} The split bar
     */
    getSplitBar : function(){
        return this.split;
    },

    // inherit docs
    destroy : function() {
        Ext.destroy(this.miniSplitEl, this.split, this.splitEl);
        Ext.layout.BorderLayout.SplitRegion.superclass.destroy.call(this);
    }
});

Ext.Container.LAYOUTS['border'] = Ext.layout.BorderLayout;
/**
 * @class Ext.layout.FormLayout
 * @extends Ext.layout.AnchorLayout
 * <p>This layout manager is specifically designed for rendering and managing child Components of
 * {@link Ext.form.FormPanel forms}. It is responsible for rendering the labels of
 * {@link Ext.form.Field Field}s.</p>
 *
 * <p>This layout manager is used when a Container is configured with the <tt>layout:'form'</tt>
 * {@link Ext.Container#layout layout} config option, and should generally not need to be created directly
 * via the new keyword. See <tt><b>{@link Ext.Container#layout}</b></tt> for additional details.</p>
 *
 * <p>In an application, it will usually be preferrable to use a {@link Ext.form.FormPanel FormPanel}
 * (which is configured with FormLayout as its layout class by default) since it also provides built-in
 * functionality for {@link Ext.form.BasicForm#doAction loading, validating and submitting} the form.</p>
 *
 * <p>A {@link Ext.Container Container} <i>using</i> the FormLayout layout manager (e.g.
 * {@link Ext.form.FormPanel} or specifying <tt>layout:'form'</tt>) can also accept the following
 * layout-specific config properties:<div class="mdetail-params"><ul>
 * <li><b><tt>{@link Ext.form.FormPanel#hideLabels hideLabels}</tt></b></li>
 * <li><b><tt>{@link Ext.form.FormPanel#labelAlign labelAlign}</tt></b></li>
 * <li><b><tt>{@link Ext.form.FormPanel#labelPad labelPad}</tt></b></li>
 * <li><b><tt>{@link Ext.form.FormPanel#labelSeparator labelSeparator}</tt></b></li>
 * <li><b><tt>{@link Ext.form.FormPanel#labelWidth labelWidth}</tt></b></li>
 * </ul></div></p>
 *
 * <p>Any Component (including Fields) managed by FormLayout accepts the following as a config option:
 * <div class="mdetail-params"><ul>
 * <li><b><tt>{@link Ext.Component#anchor anchor}</tt></b></li>
 * </ul></div></p>
 *
 * <p>Any Component managed by FormLayout may be rendered as a form field (with an associated label) by
 * configuring it with a non-null <b><tt>{@link Ext.Component#fieldLabel fieldLabel}</tt></b>. Components configured
 * in this way may be configured with the following options which affect the way the FormLayout renders them:
 * <div class="mdetail-params"><ul>
 * <li><b><tt>{@link Ext.Component#clearCls clearCls}</tt></b></li>
 * <li><b><tt>{@link Ext.Component#fieldLabel fieldLabel}</tt></b></li>
 * <li><b><tt>{@link Ext.Component#hideLabel hideLabel}</tt></b></li>
 * <li><b><tt>{@link Ext.Component#itemCls itemCls}</tt></b></li>
 * <li><b><tt>{@link Ext.Component#labelSeparator labelSeparator}</tt></b></li>
 * <li><b><tt>{@link Ext.Component#labelStyle labelStyle}</tt></b></li>
 * </ul></div></p>
 *
 * <p>Example usage:</p>
 * <pre><code>
// Required if showing validation messages
Ext.QuickTips.init();

// While you can create a basic Panel with layout:'form', practically
// you should usually use a FormPanel to also get its form functionality
// since it already creates a FormLayout internally.
var form = new Ext.form.FormPanel({
    title: 'Form Layout',
    bodyStyle: 'padding:15px',
    width: 350,
    defaultType: 'textfield',
    defaults: {
        // applied to each contained item
        width: 230,
        msgTarget: 'side'
    },
    items: [{
            fieldLabel: 'First Name',
            name: 'first',
            allowBlank: false,
            {@link Ext.Component#labelSeparator labelSeparator}: ':' // override labelSeparator layout config
        },{
            fieldLabel: 'Last Name',
            name: 'last'
        },{
            fieldLabel: 'Email',
            name: 'email',
            vtype:'email'
        }, {
            xtype: 'textarea',
            hideLabel: true,     // override hideLabels layout config
            name: 'msg',
            anchor: '100% -53'
        }
    ],
    buttons: [
        {text: 'Save'},
        {text: 'Cancel'}
    ],
    layoutConfig: {
        {@link #labelSeparator}: '~' // superseded by assignment below
    },
    // config options applicable to container when layout='form':
    hideLabels: false,
    labelAlign: 'left',   // or 'right' or 'top'
    {@link Ext.form.FormPanel#labelSeparator labelSeparator}: '>>', // takes precedence over layoutConfig value
    labelWidth: 65,       // defaults to 100
    labelPad: 8           // defaults to 5, must specify labelWidth to be honored
});
</code></pre>
 */
Ext.layout.FormLayout = Ext.extend(Ext.layout.AnchorLayout, {

    /**
     * @cfg {String} labelSeparator
     * See {@link Ext.form.FormPanel}.{@link Ext.form.FormPanel#labelSeparator labelSeparator}.  Configuration
     * of this property at the <b>container</b> level takes precedence.
     */
    labelSeparator : ':',

    /**
     * Read only. The CSS style specification string added to field labels in this layout if not
     * otherwise {@link Ext.Component#labelStyle specified by each contained field}.
     * @type String
     * @property labelStyle
     */

    /**
     * @cfg {Boolean} trackLabels
     * True to show/hide the field label when the field is hidden. Defaults to <tt>true</tt>.
     */
    trackLabels: true,

    type: 'form',

    onRemove: function(c){
        Ext.layout.FormLayout.superclass.onRemove.call(this, c);
        if(this.trackLabels){
            c.un('show', this.onFieldShow, this);
            c.un('hide', this.onFieldHide, this);
        }
        // check for itemCt, since we may be removing a fieldset or something similar
        var el = c.getPositionEl(),
            ct = c.getItemCt && c.getItemCt();
        if (c.rendered && ct) {
            if (el && el.dom) {
                el.insertAfter(ct);
            }
            Ext.destroy(ct);
            Ext.destroyMembers(c, 'label', 'itemCt');
            if (c.customItemCt) {
                Ext.destroyMembers(c, 'getItemCt', 'customItemCt');
            }
        }
    },

    // private
    setContainer : function(ct){
        Ext.layout.FormLayout.superclass.setContainer.call(this, ct);
        if(ct.labelAlign){
            ct.addClass('x-form-label-'+ct.labelAlign);
        }

        if(ct.hideLabels){
            Ext.apply(this, {
                labelStyle: 'display:none',
                elementStyle: 'padding-left:0;',
                labelAdjust: 0
            });
        }else{
            this.labelSeparator = Ext.isDefined(ct.labelSeparator) ? ct.labelSeparator : this.labelSeparator;
            ct.labelWidth = ct.labelWidth || 100;
            if(Ext.isNumber(ct.labelWidth)){
                var pad = Ext.isNumber(ct.labelPad) ? ct.labelPad : 5;
                Ext.apply(this, {
                    labelAdjust: ct.labelWidth + pad,
                    labelStyle: 'width:' + ct.labelWidth + 'px;',
                    elementStyle: 'padding-left:' + (ct.labelWidth + pad) + 'px'
                });
            }
            if(ct.labelAlign == 'top'){
                Ext.apply(this, {
                    labelStyle: 'width:auto;',
                    labelAdjust: 0,
                    elementStyle: 'padding-left:0;'
                });
            }
        }
    },

    // private
    isHide: function(c){
        return c.hideLabel || this.container.hideLabels;
    },

    onFieldShow: function(c){
        c.getItemCt().removeClass('x-hide-' + c.hideMode);

        // Composite fields will need to layout after the container is made visible
        if (c.isComposite) {
            c.doLayout();
        }
    },

    onFieldHide: function(c){
        c.getItemCt().addClass('x-hide-' + c.hideMode);
    },

    //private
    getLabelStyle: function(s){
        var ls = '', items = [this.labelStyle, s];
        for (var i = 0, len = items.length; i < len; ++i){
            if (items[i]){
                ls += items[i];
                if (ls.substr(-1, 1) != ';'){
                    ls += ';';
                }
            }
        }
        return ls;
    },

    /**
     * @cfg {Ext.Template} fieldTpl
     * A {@link Ext.Template#compile compile}d {@link Ext.Template} for rendering
     * the fully wrapped, labeled and styled form Field. Defaults to:</p><pre><code>
new Ext.Template(
    &#39;&lt;div class="x-form-item {itemCls}" tabIndex="-1">&#39;,
        &#39;&lt;&#108;abel for="{id}" style="{labelStyle}" class="x-form-item-&#108;abel">{&#108;abel}{labelSeparator}&lt;/&#108;abel>&#39;,
        &#39;&lt;div class="x-form-element" id="x-form-el-{id}" style="{elementStyle}">&#39;,
        &#39;&lt;/div>&lt;div class="{clearCls}">&lt;/div>&#39;,
    '&lt;/div>'
);
</code></pre>
     * <p>This may be specified to produce a different DOM structure when rendering form Fields.</p>
     * <p>A description of the properties within the template follows:</p><div class="mdetail-params"><ul>
     * <li><b><tt>itemCls</tt></b> : String<div class="sub-desc">The CSS class applied to the outermost div wrapper
     * that contains this field label and field element (the default class is <tt>'x-form-item'</tt> and <tt>itemCls</tt>
     * will be added to that). If supplied, <tt>itemCls</tt> at the field level will override the default <tt>itemCls</tt>
     * supplied at the container level.</div></li>
     * <li><b><tt>id</tt></b> : String<div class="sub-desc">The id of the Field</div></li>
     * <li><b><tt>{@link #labelStyle}</tt></b> : String<div class="sub-desc">
     * A CSS style specification string to add to the field label for this field (defaults to <tt>''</tt> or the
     * {@link #labelStyle layout's value for <tt>labelStyle</tt>}).</div></li>
     * <li><b><tt>label</tt></b> : String<div class="sub-desc">The text to display as the label for this
     * field (defaults to <tt>''</tt>)</div></li>
     * <li><b><tt>{@link #labelSeparator}</tt></b> : String<div class="sub-desc">The separator to display after
     * the text of the label for this field (defaults to a colon <tt>':'</tt> or the
     * {@link #labelSeparator layout's value for labelSeparator}). To hide the separator use empty string ''.</div></li>
     * <li><b><tt>elementStyle</tt></b> : String<div class="sub-desc">The styles text for the input element's wrapper.</div></li>
     * <li><b><tt>clearCls</tt></b> : String<div class="sub-desc">The CSS class to apply to the special clearing div
     * rendered directly after each form field wrapper (defaults to <tt>'x-form-clear-left'</tt>)</div></li>
     * </ul></div>
     * <p>Also see <tt>{@link #getTemplateArgs}</tt></p>
     */

    /**
     * @private
     *
     */
    renderItem : function(c, position, target){
        if(c && (c.isFormField || c.fieldLabel) && c.inputType != 'hidden'){
            var args = this.getTemplateArgs(c);
            if(Ext.isNumber(position)){
                position = target.dom.childNodes[position] || null;
            }
            if(position){
                c.itemCt = this.fieldTpl.insertBefore(position, args, true);
            }else{
                c.itemCt = this.fieldTpl.append(target, args, true);
            }
            if(!c.getItemCt){
                // Non form fields don't have getItemCt, apply it here
                // This will get cleaned up in onRemove
                Ext.apply(c, {
                    getItemCt: function(){
                        return c.itemCt;
                    },
                    customItemCt: true
                });
            }
            c.label = c.getItemCt().child('label.x-form-item-label');
            if(!c.rendered){
                c.render('x-form-el-' + c.id);
            }else if(!this.isValidParent(c, target)){
                Ext.fly('x-form-el-' + c.id).appendChild(c.getPositionEl());
            }
            if(this.trackLabels){
                if(c.hidden){
                    this.onFieldHide(c);
                }
                c.on({
                    scope: this,
                    show: this.onFieldShow,
                    hide: this.onFieldHide
                });
            }
            this.configureItem(c);
        }else {
            Ext.layout.FormLayout.superclass.renderItem.apply(this, arguments);
        }
    },

    /**
     * <p>Provides template arguments for rendering the fully wrapped, labeled and styled form Field.</p>
     * <p>This method returns an object hash containing properties used by the layout's {@link #fieldTpl}
     * to create a correctly wrapped, labeled and styled form Field. This may be overriden to
     * create custom layouts. The properties which must be returned are:</p><div class="mdetail-params"><ul>
     * <li><b><tt>itemCls</tt></b> : String<div class="sub-desc">The CSS class applied to the outermost div wrapper
     * that contains this field label and field element (the default class is <tt>'x-form-item'</tt> and <tt>itemCls</tt>
     * will be added to that). If supplied, <tt>itemCls</tt> at the field level will override the default <tt>itemCls</tt>
     * supplied at the container level.</div></li>
     * <li><b><tt>id</tt></b> : String<div class="sub-desc">The id of the Field</div></li>
     * <li><b><tt>{@link #labelStyle}</tt></b> : String<div class="sub-desc">
     * A CSS style specification string to add to the field label for this field (defaults to <tt>''</tt> or the
     * {@link #labelStyle layout's value for <tt>labelStyle</tt>}).</div></li>
     * <li><b><tt>label</tt></b> : String<div class="sub-desc">The text to display as the label for this
     * field (defaults to the field's configured fieldLabel property)</div></li>
     * <li><b><tt>{@link #labelSeparator}</tt></b> : String<div class="sub-desc">The separator to display after
     * the text of the label for this field (defaults to a colon <tt>':'</tt> or the
     * {@link #labelSeparator layout's value for labelSeparator}). To hide the separator use empty string ''.</div></li>
     * <li><b><tt>elementStyle</tt></b> : String<div class="sub-desc">The styles text for the input element's wrapper.</div></li>
     * <li><b><tt>clearCls</tt></b> : String<div class="sub-desc">The CSS class to apply to the special clearing div
     * rendered directly after each form field wrapper (defaults to <tt>'x-form-clear-left'</tt>)</div></li>
     * </ul></div>
     * @param (Ext.form.Field} field The {@link Ext.form.Field Field} being rendered.
     * @return {Object} An object hash containing the properties required to render the Field.
     */
    getTemplateArgs: function(field) {
        var noLabelSep = !field.fieldLabel || field.hideLabel;

        return {
            id            : field.id,
            label         : field.fieldLabel,
            itemCls       : (field.itemCls || this.container.itemCls || '') + (field.hideLabel ? ' x-hide-label' : ''),
            clearCls      : field.clearCls || 'x-form-clear-left',
            labelStyle    : this.getLabelStyle(field.labelStyle),
            elementStyle  : this.elementStyle || '',
            labelSeparator: noLabelSep ? '' : (Ext.isDefined(field.labelSeparator) ? field.labelSeparator : this.labelSeparator)
        };
    },

    // private
    adjustWidthAnchor: function(value, c){
        if(c.label && !this.isHide(c) && (this.container.labelAlign != 'top')){
            var adjust = Ext.isIE6 || (Ext.isIE && !Ext.isStrict);
            return value - this.labelAdjust + (adjust ? -3 : 0);
        }
        return value;
    },

    adjustHeightAnchor : function(value, c){
        if(c.label && !this.isHide(c) && (this.container.labelAlign == 'top')){
            return value - c.label.getHeight();
        }
        return value;
    },

    // private
    isValidParent : function(c, target){
        return target && this.container.getEl().contains(c.getPositionEl());
    }

    /**
     * @property activeItem
     * @hide
     */
});

Ext.Container.LAYOUTS['form'] = Ext.layout.FormLayout;
/**
 * @class Ext.layout.AccordionLayout
 * @extends Ext.layout.FitLayout
 * <p>This is a layout that manages multiple Panels in an expandable accordion style such that only
 * <b>one Panel can be expanded at any given time</b>. Each Panel has built-in support for expanding and collapsing.</p>
 * <p>Note: Only Ext.Panels <b>and all subclasses of Ext.Panel</b> may be used in an accordion layout Container.</p>
 * <p>This class is intended to be extended or created via the <tt><b>{@link Ext.Container#layout layout}</b></tt>
 * configuration property.  See <tt><b>{@link Ext.Container#layout}</b></tt> for additional details.</p>
 * <p>Example usage:</p>
 * <pre><code>
var accordion = new Ext.Panel({
    title: 'Accordion Layout',
    layout:'accordion',
    defaults: {
        // applied to each contained panel
        bodyStyle: 'padding:15px'
    },
    layoutConfig: {
        // layout-specific configs go here
        titleCollapse: false,
        animate: true,
        activeOnTop: true
    },
    items: [{
        title: 'Panel 1',
        html: '&lt;p&gt;Panel content!&lt;/p&gt;'
    },{
        title: 'Panel 2',
        html: '&lt;p&gt;Panel content!&lt;/p&gt;'
    },{
        title: 'Panel 3',
        html: '&lt;p&gt;Panel content!&lt;/p&gt;'
    }]
});
</code></pre>
 */
Ext.layout.AccordionLayout = Ext.extend(Ext.layout.FitLayout, {
    /**
     * @cfg {Boolean} fill
     * True to adjust the active item's height to fill the available space in the container, false to use the
     * item's current height, or auto height if not explicitly set (defaults to true).
     */
    fill : true,
    /**
     * @cfg {Boolean} autoWidth
     * True to set each contained item's width to 'auto', false to use the item's current width (defaults to true).
     * Note that some components, in particular the {@link Ext.grid.GridPanel grid}, will not function properly within
     * layouts if they have auto width, so in such cases this config should be set to false.
     */
    autoWidth : true,
    /**
     * @cfg {Boolean} titleCollapse
     * True to allow expand/collapse of each contained panel by clicking anywhere on the title bar, false to allow
     * expand/collapse only when the toggle tool button is clicked (defaults to true).  When set to false,
     * {@link #hideCollapseTool} should be false also.
     */
    titleCollapse : true,
    /**
     * @cfg {Boolean} hideCollapseTool
     * True to hide the contained panels' collapse/expand toggle buttons, false to display them (defaults to false).
     * When set to true, {@link #titleCollapse} should be true also.
     */
    hideCollapseTool : false,
    /**
     * @cfg {Boolean} collapseFirst
     * True to make sure the collapse/expand toggle button always renders first (to the left of) any other tools
     * in the contained panels' title bars, false to render it last (defaults to false).
     */
    collapseFirst : false,
    /**
     * @cfg {Boolean} animate
     * True to slide the contained panels open and closed during expand/collapse using animation, false to open and
     * close directly with no animation (defaults to false).  Note: to defer to the specific config setting of each
     * contained panel for this property, set this to undefined at the layout level.
     */
    animate : false,
    /**
     * @cfg {Boolean} sequence
     * <b>Experimental</b>. If animate is set to true, this will result in each animation running in sequence.
     */
    sequence : false,
    /**
     * @cfg {Boolean} activeOnTop
     * True to swap the position of each panel as it is expanded so that it becomes the first item in the container,
     * false to keep the panels in the rendered order. <b>This is NOT compatible with "animate:true"</b> (defaults to false).
     */
    activeOnTop : false,

    type: 'accordion',

    renderItem : function(c){
        if(this.animate === false){
            c.animCollapse = false;
        }
        c.collapsible = true;
        if(this.autoWidth){
            c.autoWidth = true;
        }
        if(this.titleCollapse){
            c.titleCollapse = true;
        }
        if(this.hideCollapseTool){
            c.hideCollapseTool = true;
        }
        if(this.collapseFirst !== undefined){
            c.collapseFirst = this.collapseFirst;
        }
        if(!this.activeItem && !c.collapsed){
            this.setActiveItem(c, true);
        }else if(this.activeItem && this.activeItem != c){
            c.collapsed = true;
        }
        Ext.layout.AccordionLayout.superclass.renderItem.apply(this, arguments);
        c.header.addClass('x-accordion-hd');
        c.on('beforeexpand', this.beforeExpand, this);
    },

    onRemove: function(c){
        Ext.layout.AccordionLayout.superclass.onRemove.call(this, c);
        if(c.rendered){
            c.header.removeClass('x-accordion-hd');
        }
        c.un('beforeexpand', this.beforeExpand, this);
    },

    // private
    beforeExpand : function(p, anim){
        var ai = this.activeItem;
        if(ai){
            if(this.sequence){
                delete this.activeItem;
                if (!ai.collapsed){
                    ai.collapse({callback:function(){
                        p.expand(anim || true);
                    }, scope: this});
                    return false;
                }
            }else{
                ai.collapse(this.animate);
            }
        }
        this.setActive(p);
        if(this.activeOnTop){
            p.el.dom.parentNode.insertBefore(p.el.dom, p.el.dom.parentNode.firstChild);
        }
        // Items have been hidden an possibly rearranged, we need to get the container size again.
        this.layout();
    },

    // private
    setItemSize : function(item, size){
        if(this.fill && item){
            var hh = 0, i, ct = this.getRenderedItems(this.container), len = ct.length, p;
            // Add up all the header heights
            for (i = 0; i < len; i++) {
                if((p = ct[i]) != item && !p.hidden){
                    hh += p.header.getHeight();
                }
            };
            // Subtract the header heights from the container size
            size.height -= hh;
            // Call setSize on the container to set the correct height.  For Panels, deferedHeight
            // will simply store this size for when the expansion is done.
            item.setSize(size);
        }
    },

    /**
     * Sets the active (expanded) item in the layout.
     * @param {String/Number} item The string component id or numeric index of the item to activate
     */
    setActiveItem : function(item){
        this.setActive(item, true);
    },

    // private
    setActive : function(item, expand){
        var ai = this.activeItem;
        item = this.container.getComponent(item);
        if(ai != item){
            if(item.rendered && item.collapsed && expand){
                item.expand();
            }else{
                if(ai){
                   ai.fireEvent('deactivate', ai);
                }
                this.activeItem = item;
                item.fireEvent('activate', item);
            }
        }
    }
});
Ext.Container.LAYOUTS.accordion = Ext.layout.AccordionLayout;

//backwards compat
Ext.layout.Accordion = Ext.layout.AccordionLayout;/**
 * @class Ext.layout.TableLayout
 * @extends Ext.layout.ContainerLayout
 * <p>This layout allows you to easily render content into an HTML table.  The total number of columns can be
 * specified, and rowspan and colspan can be used to create complex layouts within the table.
 * This class is intended to be extended or created via the layout:'table' {@link Ext.Container#layout} config,
 * and should generally not need to be created directly via the new keyword.</p>
 * <p>Note that when creating a layout via config, the layout-specific config properties must be passed in via
 * the {@link Ext.Container#layoutConfig} object which will then be applied internally to the layout.  In the
 * case of TableLayout, the only valid layout config property is {@link #columns}.  However, the items added to a
 * TableLayout can supply the following table-specific config properties:</p>
 * <ul>
 * <li><b>rowspan</b> Applied to the table cell containing the item.</li>
 * <li><b>colspan</b> Applied to the table cell containing the item.</li>
 * <li><b>cellId</b> An id applied to the table cell containing the item.</li>
 * <li><b>cellCls</b> A CSS class name added to the table cell containing the item.</li>
 * </ul>
 * <p>The basic concept of building up a TableLayout is conceptually very similar to building up a standard
 * HTML table.  You simply add each panel (or "cell") that you want to include along with any span attributes
 * specified as the special config properties of rowspan and colspan which work exactly like their HTML counterparts.
 * Rather than explicitly creating and nesting rows and columns as you would in HTML, you simply specify the
 * total column count in the layoutConfig and start adding panels in their natural order from left to right,
 * top to bottom.  The layout will automatically figure out, based on the column count, rowspans and colspans,
 * how to position each panel within the table.  Just like with HTML tables, your rowspans and colspans must add
 * up correctly in your overall layout or you'll end up with missing and/or extra cells!  Example usage:</p>
 * <pre><code>
// This code will generate a layout table that is 3 columns by 2 rows
// with some spanning included.  The basic layout will be:
// +--------+-----------------+
// |   A    |   B             |
// |        |--------+--------|
// |        |   C    |   D    |
// +--------+--------+--------+
var table = new Ext.Panel({
    title: 'Table Layout',
    layout:'table',
    defaults: {
        // applied to each contained panel
        bodyStyle:'padding:20px'
    },
    layoutConfig: {
        // The total column count must be specified here
        columns: 3
    },
    items: [{
        html: '&lt;p&gt;Cell A content&lt;/p&gt;',
        rowspan: 2
    },{
        html: '&lt;p&gt;Cell B content&lt;/p&gt;',
        colspan: 2
    },{
        html: '&lt;p&gt;Cell C content&lt;/p&gt;',
        cellCls: 'highlight'
    },{
        html: '&lt;p&gt;Cell D content&lt;/p&gt;'
    }]
});
</code></pre>
 */
Ext.layout.TableLayout = Ext.extend(Ext.layout.ContainerLayout, {
    /**
     * @cfg {Number} columns
     * The total number of columns to create in the table for this layout.  If not specified, all Components added to
     * this layout will be rendered into a single row using one column per Component.
     */

    // private
    monitorResize:false,

    type: 'table',

    targetCls: 'x-table-layout-ct',

    /**
     * @cfg {Object} tableAttrs
     * <p>An object containing properties which are added to the {@link Ext.DomHelper DomHelper} specification
     * used to create the layout's <tt>&lt;table&gt;</tt> element. Example:</p><pre><code>
{
    xtype: 'panel',
    layout: 'table',
    layoutConfig: {
        tableAttrs: {
            style: {
                width: '100%'
            }
        },
        columns: 3
    }
}</code></pre>
     */
    tableAttrs:null,

    // private
    setContainer : function(ct){
        Ext.layout.TableLayout.superclass.setContainer.call(this, ct);

        this.currentRow = 0;
        this.currentColumn = 0;
        this.cells = [];
    },
    
    // private
    onLayout : function(ct, target){
        var cs = ct.items.items, len = cs.length, c, i;

        if(!this.table){
            target.addClass('x-table-layout-ct');

            this.table = target.createChild(
                Ext.apply({tag:'table', cls:'x-table-layout', cellspacing: 0, cn: {tag: 'tbody'}}, this.tableAttrs), null, true);
        }
        this.renderAll(ct, target);
    },

    // private
    getRow : function(index){
        var row = this.table.tBodies[0].childNodes[index];
        if(!row){
            row = document.createElement('tr');
            this.table.tBodies[0].appendChild(row);
        }
        return row;
    },

    // private
    getNextCell : function(c){
        var cell = this.getNextNonSpan(this.currentColumn, this.currentRow);
        var curCol = this.currentColumn = cell[0], curRow = this.currentRow = cell[1];
        for(var rowIndex = curRow; rowIndex < curRow + (c.rowspan || 1); rowIndex++){
            if(!this.cells[rowIndex]){
                this.cells[rowIndex] = [];
            }
            for(var colIndex = curCol; colIndex < curCol + (c.colspan || 1); colIndex++){
                this.cells[rowIndex][colIndex] = true;
            }
        }
        var td = document.createElement('td');
        if(c.cellId){
            td.id = c.cellId;
        }
        var cls = 'x-table-layout-cell';
        if(c.cellCls){
            cls += ' ' + c.cellCls;
        }
        td.className = cls;
        if(c.colspan){
            td.colSpan = c.colspan;
        }
        if(c.rowspan){
            td.rowSpan = c.rowspan;
        }
        this.getRow(curRow).appendChild(td);
        return td;
    },

    // private
    getNextNonSpan: function(colIndex, rowIndex){
        var cols = this.columns;
        while((cols && colIndex >= cols) || (this.cells[rowIndex] && this.cells[rowIndex][colIndex])) {
            if(cols && colIndex >= cols){
                rowIndex++;
                colIndex = 0;
            }else{
                colIndex++;
            }
        }
        return [colIndex, rowIndex];
    },

    // private
    renderItem : function(c, position, target){
        // Ensure we have our inner table to get cells to render into.
        if(!this.table){
            this.table = target.createChild(
                Ext.apply({tag:'table', cls:'x-table-layout', cellspacing: 0, cn: {tag: 'tbody'}}, this.tableAttrs), null, true);
        }
        if(c && !c.rendered){
            c.render(this.getNextCell(c));
            this.configureItem(c);
        }else if(c && !this.isValidParent(c, target)){
            var container = this.getNextCell(c);
            container.insertBefore(c.getPositionEl().dom, null);
            c.container = Ext.get(container);
            this.configureItem(c);
        }
    },

    // private
    isValidParent : function(c, target){
        return c.getPositionEl().up('table', 5).dom.parentNode === (target.dom || target);
    },
    
    destroy: function(){
        delete this.table;
        Ext.layout.TableLayout.superclass.destroy.call(this);
    }

    /**
     * @property activeItem
     * @hide
     */
});

Ext.Container.LAYOUTS['table'] = Ext.layout.TableLayout;/**
 * @class Ext.layout.AbsoluteLayout
 * @extends Ext.layout.AnchorLayout
 * <p>This is a layout that inherits the anchoring of <b>{@link Ext.layout.AnchorLayout}</b> and adds the
 * ability for x/y positioning using the standard x and y component config options.</p>
 * <p>This class is intended to be extended or created via the <tt><b>{@link Ext.Container#layout layout}</b></tt>
 * configuration property.  See <tt><b>{@link Ext.Container#layout}</b></tt> for additional details.</p>
 * <p>Example usage:</p>
 * <pre><code>
var form = new Ext.form.FormPanel({
    title: 'Absolute Layout',
    layout:'absolute',
    layoutConfig: {
        // layout-specific configs go here
        extraCls: 'x-abs-layout-item',
    },
    baseCls: 'x-plain',
    url:'save-form.php',
    defaultType: 'textfield',
    items: [{
        x: 0,
        y: 5,
        xtype:'label',
        text: 'Send To:'
    },{
        x: 60,
        y: 0,
        name: 'to',
        anchor:'100%'  // anchor width by percentage
    },{
        x: 0,
        y: 35,
        xtype:'label',
        text: 'Subject:'
    },{
        x: 60,
        y: 30,
        name: 'subject',
        anchor: '100%'  // anchor width by percentage
    },{
        x:0,
        y: 60,
        xtype: 'textarea',
        name: 'msg',
        anchor: '100% 100%'  // anchor width and height
    }]
});
</code></pre>
 */
Ext.layout.AbsoluteLayout = Ext.extend(Ext.layout.AnchorLayout, {

    extraCls: 'x-abs-layout-item',

    type: 'absolute',

    onLayout : function(ct, target){
        target.position();
        this.paddingLeft = target.getPadding('l');
        this.paddingTop = target.getPadding('t');
        Ext.layout.AbsoluteLayout.superclass.onLayout.call(this, ct, target);
    },

    // private
    adjustWidthAnchor : function(value, comp){
        return value ? value - comp.getPosition(true)[0] + this.paddingLeft : value;
    },

    // private
    adjustHeightAnchor : function(value, comp){
        return  value ? value - comp.getPosition(true)[1] + this.paddingTop : value;
    }
    /**
     * @property activeItem
     * @hide
     */
});
Ext.Container.LAYOUTS['absolute'] = Ext.layout.AbsoluteLayout;
/**
 * @class Ext.layout.BoxLayout
 * @extends Ext.layout.ContainerLayout
 * <p>Base Class for HBoxLayout and VBoxLayout Classes. Generally it should not need to be used directly.</p>
 */
Ext.layout.BoxLayout = Ext.extend(Ext.layout.ContainerLayout, {
    /**
     * @cfg {Object} defaultMargins
     * <p>If the individual contained items do not have a <tt>margins</tt>
     * property specified, the default margins from this property will be
     * applied to each item.</p>
     * <br><p>This property may be specified as an object containing margins
     * to apply in the format:</p><pre><code>
{
    top: (top margin),
    right: (right margin),
    bottom: (bottom margin),
    left: (left margin)
}</code></pre>
     * <p>This property may also be specified as a string containing
     * space-separated, numeric margin values. The order of the sides associated
     * with each value matches the way CSS processes margin values:</p>
     * <div class="mdetail-params"><ul>
     * <li>If there is only one value, it applies to all sides.</li>
     * <li>If there are two values, the top and bottom borders are set to the
     * first value and the right and left are set to the second.</li>
     * <li>If there are three values, the top is set to the first value, the left
     * and right are set to the second, and the bottom is set to the third.</li>
     * <li>If there are four values, they apply to the top, right, bottom, and
     * left, respectively.</li>
     * </ul></div>
     * <p>Defaults to:</p><pre><code>
     * {top:0, right:0, bottom:0, left:0}
     * </code></pre>
     */
    defaultMargins : {left:0,top:0,right:0,bottom:0},
    /**
     * @cfg {String} padding
     * <p>Sets the padding to be applied to all child items managed by this layout.</p>
     * <p>This property must be specified as a string containing
     * space-separated, numeric padding values. The order of the sides associated
     * with each value matches the way CSS processes padding values:</p>
     * <div class="mdetail-params"><ul>
     * <li>If there is only one value, it applies to all sides.</li>
     * <li>If there are two values, the top and bottom borders are set to the
     * first value and the right and left are set to the second.</li>
     * <li>If there are three values, the top is set to the first value, the left
     * and right are set to the second, and the bottom is set to the third.</li>
     * <li>If there are four values, they apply to the top, right, bottom, and
     * left, respectively.</li>
     * </ul></div>
     * <p>Defaults to: <code>"0"</code></p>
     */
    padding : '0',
    // documented in subclasses
    pack : 'start',

    // private
    monitorResize : true,
    type: 'box',
    scrollOffset : 0,
    extraCls : 'x-box-item',
    targetCls : 'x-box-layout-ct',
    innerCls : 'x-box-inner',

    constructor : function(config){
        Ext.layout.BoxLayout.superclass.constructor.call(this, config);

        if (Ext.isString(this.defaultMargins)) {
            this.defaultMargins = this.parseMargins(this.defaultMargins);
        }
        
        var handler = this.overflowHandler;
        
        if (typeof handler == 'string') {
            handler = {
                type: handler
            };
        }
        
        var handlerType = 'none';
        if (handler && handler.type != undefined) {
            handlerType = handler.type;
        }
        
        var constructor = Ext.layout.boxOverflow[handlerType];
        if (constructor[this.type]) {
            constructor = constructor[this.type];
        }
        
        this.overflowHandler = new constructor(this, handler);
    },

    /**
     * @private
     * Runs the child box calculations and caches them in childBoxCache. Subclasses can used these cached values
     * when laying out
     */
    onLayout: function(container, target) {
        Ext.layout.BoxLayout.superclass.onLayout.call(this, container, target);

        var tSize = this.getLayoutTargetSize(),
            items = this.getVisibleItems(container),
            calcs = this.calculateChildBoxes(items, tSize),
            boxes = calcs.boxes,
            meta  = calcs.meta;
        
        //invoke the overflow handler, if one is configured
        if (tSize.width > 0) {
            var handler = this.overflowHandler,
                method  = meta.tooNarrow ? 'handleOverflow' : 'clearOverflow';
            
            var results = handler[method](calcs, tSize);
            
            if (results) {
                if (results.targetSize) {
                    tSize = results.targetSize;
                }
                
                if (results.recalculate) {
                    items = this.getVisibleItems(container);
                    calcs = this.calculateChildBoxes(items, tSize);
                    boxes = calcs.boxes;
                }
            }
        }
        
        /**
         * @private
         * @property layoutTargetLastSize
         * @type Object
         * Private cache of the last measured size of the layout target. This should never be used except by
         * BoxLayout subclasses during their onLayout run.
         */
        this.layoutTargetLastSize = tSize;
        
        /**
         * @private
         * @property childBoxCache
         * @type Array
         * Array of the last calculated height, width, top and left positions of each visible rendered component
         * within the Box layout.
         */
        this.childBoxCache = calcs;
        
        this.updateInnerCtSize(tSize, calcs);
        this.updateChildBoxes(boxes);

        // Putting a box layout into an overflowed container is NOT correct and will make a second layout pass necessary.
        this.handleTargetOverflow(tSize, container, target);
    },

    /**
     * Resizes and repositions each child component
     * @param {Array} boxes The box measurements
     */
    updateChildBoxes: function(boxes) {
        for (var i = 0, length = boxes.length; i < length; i++) {
            var box  = boxes[i],
                comp = box.component;
            
            if (box.dirtySize) {
                comp.setSize(box.width, box.height);
            }
            // Don't set positions to NaN
            if (isNaN(box.left) || isNaN(box.top)) {
                continue;
            }
            
            comp.setPosition(box.left, box.top);
        }
    },

    /**
     * @private
     * Called by onRender just before the child components are sized and positioned. This resizes the innerCt
     * to make sure all child items fit within it. We call this before sizing the children because if our child
     * items are larger than the previous innerCt size the browser will insert scrollbars and then remove them
     * again immediately afterwards, giving a performance hit.
     * Subclasses should provide an implementation.
     * @param {Object} currentSize The current height and width of the innerCt
     * @param {Array} calculations The new box calculations of all items to be laid out
     */
    updateInnerCtSize: function(tSize, calcs) {
        var align   = this.align,
            padding = this.padding,
            width   = tSize.width,
            height  = tSize.height;
        
        if (this.type == 'hbox') {
            var innerCtWidth  = width,
                innerCtHeight = calcs.meta.maxHeight + padding.top + padding.bottom;

            if (align == 'stretch') {
                innerCtHeight = height;
            } else if (align == 'middle') {
                innerCtHeight = Math.max(height, innerCtHeight);
            }
        } else {
            var innerCtHeight = height,
                innerCtWidth  = calcs.meta.maxWidth + padding.left + padding.right;

            if (align == 'stretch') {
                innerCtWidth = width;
            } else if (align == 'center') {
                innerCtWidth = Math.max(width, innerCtWidth);
            }
        }

        this.innerCt.setSize(innerCtWidth || undefined, innerCtHeight || undefined);
    },

    /**
     * @private
     * This should be called after onLayout of any BoxLayout subclass. If the target's overflow is not set to 'hidden',
     * we need to lay out a second time because the scrollbars may have modified the height and width of the layout
     * target. Having a Box layout inside such a target is therefore not recommended.
     * @param {Object} previousTargetSize The size and height of the layout target before we just laid out
     * @param {Ext.Container} container The container
     * @param {Ext.Element} target The target element
     */
    handleTargetOverflow: function(previousTargetSize, container, target) {
        var overflow = target.getStyle('overflow');

        if (overflow && overflow != 'hidden' &&!this.adjustmentPass) {
            var newTargetSize = this.getLayoutTargetSize();
            if (newTargetSize.width != previousTargetSize.width || newTargetSize.height != previousTargetSize.height){
                this.adjustmentPass = true;
                this.onLayout(container, target);
            }
        }

        delete this.adjustmentPass;
    },

    // private
    isValidParent : function(c, target) {
        return this.innerCt && c.getPositionEl().dom.parentNode == this.innerCt.dom;
    },

    /**
     * @private
     * Returns all items that are both rendered and visible
     * @return {Array} All matching items
     */
    getVisibleItems: function(ct) {
        var ct  = ct || this.container,
            t   = ct.getLayoutTarget(),
            cti = ct.items.items,
            len = cti.length,

            i, c, items = [];

        for (i = 0; i < len; i++) {
            if((c = cti[i]).rendered && this.isValidParent(c, t) && c.hidden !== true  && c.collapsed !== true && c.shouldLayout !== false){
                items.push(c);
            }
        }

        return items;
    },

    // private
    renderAll : function(ct, target) {
        if (!this.innerCt) {
            // the innerCt prevents wrapping and shuffling while the container is resizing
            this.innerCt = target.createChild({cls:this.innerCls});
            this.padding = this.parseMargins(this.padding);
        }
        Ext.layout.BoxLayout.superclass.renderAll.call(this, ct, this.innerCt);
    },

    getLayoutTargetSize : function() {
        var target = this.container.getLayoutTarget(), ret;
        
        if (target) {
            ret = target.getViewSize();

            // IE in strict mode will return a width of 0 on the 1st pass of getViewSize.
            // Use getStyleSize to verify the 0 width, the adjustment pass will then work properly
            // with getViewSize
            if (Ext.isIE && Ext.isStrict && ret.width == 0){
                ret =  target.getStyleSize();
            }

            ret.width  -= target.getPadding('lr');
            ret.height -= target.getPadding('tb');
        }
        
        return ret;
    },

    // private
    renderItem : function(c) {
        if(Ext.isString(c.margins)){
            c.margins = this.parseMargins(c.margins);
        }else if(!c.margins){
            c.margins = this.defaultMargins;
        }
        Ext.layout.BoxLayout.superclass.renderItem.apply(this, arguments);
    },
    
    /**
     * @private
     */
    destroy: function() {
        Ext.destroy(this.overflowHandler);
        
        Ext.layout.BoxLayout.superclass.destroy.apply(this, arguments);
    }
});



Ext.ns('Ext.layout.boxOverflow');

/**
 * @class Ext.layout.boxOverflow.None
 * @extends Object
 * Base class for Box Layout overflow handlers. These specialized classes are invoked when a Box Layout
 * (either an HBox or a VBox) has child items that are either too wide (for HBox) or too tall (for VBox)
 * for its container.
 */

Ext.layout.boxOverflow.None = Ext.extend(Object, {
    constructor: function(layout, config) {
        this.layout = layout;
        
        Ext.apply(this, config || {});
    },
    
    handleOverflow: Ext.emptyFn,
    
    clearOverflow: Ext.emptyFn
});


Ext.layout.boxOverflow.none = Ext.layout.boxOverflow.None;
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

Ext.layout.boxOverflow.menu.hbox = Ext.layout.boxOverflow.HorizontalMenu;/**
 * @class Ext.layout.boxOverflow.Scroller
 * @extends Ext.layout.boxOverflow.None
 * Description
 */
Ext.layout.boxOverflow.Scroller = Ext.extend(Ext.layout.boxOverflow.None, {
    /**
     * @cfg animateScroll
     * @type Boolean
     * True to animate the scrolling of items within the layout (defaults to true, ignored if enableScroll is false)
     */
    animateScroll: true,
    
    /**
     * @cfg scrollIncrement
     * @type Number
     * The number of pixels to scroll by on scroller click (defaults to 100)
     */
    scrollIncrement: 100,
    
    /**
     * @cfg wheelIncrement
     * @type Number
     * The number of pixels to increment on mouse wheel scrolling (defaults to <tt>3</tt>).
     */
    wheelIncrement: 3,
    
    /**
     * @cfg scrollRepeatInterval
     * @type Number
     * Number of milliseconds between each scroll while a scroller button is held down (defaults to 400)
     */
    scrollRepeatInterval: 400,
    
    /**
     * @cfg scrollDuration
     * @type Number
     * Number of seconds that each scroll animation lasts (defaults to 0.4)
     */
    scrollDuration: 0.4,
    
    /**
     * @cfg beforeCls
     * @type String
     * CSS class added to the beforeCt element. This is the element that holds any special items such as scrollers,
     * which must always be present at the leftmost edge of the Container
     */
    beforeCls: 'x-strip-left',
    
    /**
     * @cfg afterCls
     * @type String
     * CSS class added to the afterCt element. This is the element that holds any special items such as scrollers,
     * which must always be present at the rightmost edge of the Container
     */
    afterCls: 'x-strip-right',
    
    /**
     * @cfg scrollerCls
     * @type String
     * CSS class added to both scroller elements if enableScroll is used
     */
    scrollerCls: 'x-strip-scroller',
    
    /**
     * @cfg beforeScrollerCls
     * @type String
     * CSS class added to the left scroller element if enableScroll is used
     */
    beforeScrollerCls: 'x-strip-scroller-left',
    
    /**
     * @cfg afterScrollerCls
     * @type String
     * CSS class added to the right scroller element if enableScroll is used
     */
    afterScrollerCls: 'x-strip-scroller-right',
    
    /**
     * @private
     * Sets up an listener to scroll on the layout's innerCt mousewheel event
     */
    createWheelListener: function() {
        this.layout.innerCt.on({
            scope     : this,
            mousewheel: function(e) {
                e.stopEvent();

                this.scrollBy(e.getWheelDelta() * this.wheelIncrement * -1, false);
            }
        });
    },
    
    /**
     * @private
     * Most of the heavy lifting is done in the subclasses
     */
    handleOverflow: function(calculations, targetSize) {
        this.createInnerElements();
        this.showScrollers();
    },
    
    /**
     * @private
     */
    clearOverflow: function() {
        this.hideScrollers();
    },
    
    /**
     * @private
     * Shows the scroller elements in the beforeCt and afterCt. Creates the scrollers first if they are not already
     * present. 
     */
    showScrollers: function() {
        this.createScrollers();
        
        this.beforeScroller.show();
        this.afterScroller.show();
        
        this.updateScrollButtons();
    },
    
    /**
     * @private
     * Hides the scroller elements in the beforeCt and afterCt
     */
    hideScrollers: function() {
        if (this.beforeScroller != undefined) {
            this.beforeScroller.hide();
            this.afterScroller.hide();          
        }
    },
    
    /**
     * @private
     * Creates the clickable scroller elements and places them into the beforeCt and afterCt
     */
    createScrollers: function() {
        if (!this.beforeScroller && !this.afterScroller) {
            var before = this.beforeCt.createChild({
                cls: String.format("{0} {1} ", this.scrollerCls, this.beforeScrollerCls)
            });
            
            var after = this.afterCt.createChild({
                cls: String.format("{0} {1}", this.scrollerCls, this.afterScrollerCls)
            });
            
            before.addClassOnOver(this.beforeScrollerCls + '-hover');
            after.addClassOnOver(this.afterScrollerCls + '-hover');
            
            before.setVisibilityMode(Ext.Element.DISPLAY);
            after.setVisibilityMode(Ext.Element.DISPLAY);
            
            this.beforeRepeater = new Ext.util.ClickRepeater(before, {
                interval: this.scrollRepeatInterval,
                handler : this.scrollLeft,
                scope   : this
            });
            
            this.afterRepeater = new Ext.util.ClickRepeater(after, {
                interval: this.scrollRepeatInterval,
                handler : this.scrollRight,
                scope   : this
            });
            
            /**
             * @property beforeScroller
             * @type Ext.Element
             * The left scroller element. Only created when needed.
             */
            this.beforeScroller = before;
            
            /**
             * @property afterScroller
             * @type Ext.Element
             * The left scroller element. Only created when needed.
             */
            this.afterScroller = after;
        }
    },
    
    /**
     * @private
     */
    destroy: function() {
        Ext.destroy(this.beforeScroller, this.afterScroller, this.beforeRepeater, this.afterRepeater, this.beforeCt, this.afterCt);
    },
    
    /**
     * @private
     * Scrolls left or right by the number of pixels specified
     * @param {Number} delta Number of pixels to scroll to the right by. Use a negative number to scroll left
     */
    scrollBy: function(delta, animate) {
        this.scrollTo(this.getScrollPosition() + delta, animate);
    },
    
    /**
     * @private
     * Normalizes an item reference, string id or numerical index into a reference to the item
     * @param {Ext.Component|String|Number} item The item reference, id or index
     * @return {Ext.Component} The item
     */
    getItem: function(item) {
        if (Ext.isString(item)) {
            item = Ext.getCmp(item);
        } else if (Ext.isNumber(item)) {
            item = this.items[item];
        }
        
        return item;
    },
    
    /**
     * @private
     * @return {Object} Object passed to scrollTo when scrolling
     */
    getScrollAnim: function() {
        return {
            duration: this.scrollDuration, 
            callback: this.updateScrollButtons, 
            scope   : this
        };
    },
    
    /**
     * @private
     * Enables or disables each scroller button based on the current scroll position
     */
    updateScrollButtons: function() {
        if (this.beforeScroller == undefined || this.afterScroller == undefined) {
            return;
        }
        
        var beforeMeth = this.atExtremeBefore()  ? 'addClass' : 'removeClass',
            afterMeth  = this.atExtremeAfter() ? 'addClass' : 'removeClass',
            beforeCls  = this.beforeScrollerCls + '-disabled',
            afterCls   = this.afterScrollerCls  + '-disabled';
        
        this.beforeScroller[beforeMeth](beforeCls);
        this.afterScroller[afterMeth](afterCls);
        this.scrolling = false;
    },
    
    /**
     * @private
     * Returns true if the innerCt scroll is already at its left-most point
     * @return {Boolean} True if already at furthest left point
     */
    atExtremeBefore: function() {
        return this.getScrollPosition() === 0;
    },
    
    /**
     * @private
     * Scrolls to the left by the configured amount
     */
    scrollLeft: function(animate) {
        this.scrollBy(-this.scrollIncrement, animate);
    },
    
    /**
     * @private
     * Scrolls to the right by the configured amount
     */
    scrollRight: function(animate) {
        this.scrollBy(this.scrollIncrement, animate);
    },
    
    /**
     * Scrolls to the given component.
     * @param {String|Number|Ext.Component} item The item to scroll to. Can be a numerical index, component id 
     * or a reference to the component itself.
     * @param {Boolean} animate True to animate the scrolling
     */
    scrollToItem: function(item, animate) {
        item = this.getItem(item);
        
        if (item != undefined) {
            var visibility = this.getItemVisibility(item);
            
            if (!visibility.fullyVisible) {
                var box  = item.getBox(true, true),
                    newX = box.x;
                    
                if (visibility.hiddenRight) {
                    newX -= (this.layout.innerCt.getWidth() - box.width);
                }
                
                this.scrollTo(newX, animate);
            }
        }
    },
    
    /**
     * @private
     * For a given item in the container, return an object with information on whether the item is visible
     * with the current innerCt scroll value.
     * @param {Ext.Component} item The item
     * @return {Object} Values for fullyVisible, hiddenLeft and hiddenRight
     */
    getItemVisibility: function(item) {
        var box         = this.getItem(item).getBox(true, true),
            itemLeft    = box.x,
            itemRight   = box.x + box.width,
            scrollLeft  = this.getScrollPosition(),
            scrollRight = this.layout.innerCt.getWidth() + scrollLeft;
        
        return {
            hiddenLeft  : itemLeft < scrollLeft,
            hiddenRight : itemRight > scrollRight,
            fullyVisible: itemLeft > scrollLeft && itemRight < scrollRight
        };
    }
});

Ext.layout.boxOverflow.scroller = Ext.layout.boxOverflow.Scroller;


/**
 * @class Ext.layout.boxOverflow.VerticalScroller
 * @extends Ext.layout.boxOverflow.Scroller
 * Description
 */
Ext.layout.boxOverflow.VerticalScroller = Ext.extend(Ext.layout.boxOverflow.Scroller, {
    scrollIncrement: 75,
    wheelIncrement : 2,
    
    handleOverflow: function(calculations, targetSize) {
        Ext.layout.boxOverflow.VerticalScroller.superclass.handleOverflow.apply(this, arguments);
        
        return {
            targetSize: {
                height: targetSize.height - (this.beforeCt.getHeight() + this.afterCt.getHeight()),
                width : targetSize.width
            }
        };
    },
    
    /**
     * @private
     * Creates the beforeCt and afterCt elements if they have not already been created
     */
    createInnerElements: function() {
        var target = this.layout.innerCt;
        
        //normal items will be rendered to the innerCt. beforeCt and afterCt allow for fixed positioning of
        //special items such as scrollers or dropdown menu triggers
        if (!this.beforeCt) {
            this.beforeCt = target.insertSibling({cls: this.beforeCls}, 'before');
            this.afterCt  = target.insertSibling({cls: this.afterCls},  'after');

            this.createWheelListener();
        }
    },
    
    /**
     * @private
     * Scrolls to the given position. Performs bounds checking.
     * @param {Number} position The position to scroll to. This is constrained.
     * @param {Boolean} animate True to animate. If undefined, falls back to value of this.animateScroll
     */
    scrollTo: function(position, animate) {
        var oldPosition = this.getScrollPosition(),
            newPosition = position.constrain(0, this.getMaxScrollBottom());
        
        if (newPosition != oldPosition && !this.scrolling) {
            if (animate == undefined) {
                animate = this.animateScroll;
            }
            
            this.layout.innerCt.scrollTo('top', newPosition, animate ? this.getScrollAnim() : false);
            
            if (animate) {
                this.scrolling = true;
            } else {
                this.scrolling = false;
                this.updateScrollButtons();
            }
        }
    },
    
    /**
     * Returns the current scroll position of the innerCt element
     * @return {Number} The current scroll position
     */
    getScrollPosition: function(){
        return parseInt(this.layout.innerCt.dom.scrollTop, 10) || 0;
    },
    
    /**
     * @private
     * Returns the maximum value we can scrollTo
     * @return {Number} The max scroll value
     */
    getMaxScrollBottom: function() {
        return this.layout.innerCt.dom.scrollHeight - this.layout.innerCt.getHeight();
    },
    
    /**
     * @private
     * Returns true if the innerCt scroll is already at its right-most point
     * @return {Boolean} True if already at furthest right point
     */
    atExtremeAfter: function() {
        return this.getScrollPosition() >= this.getMaxScrollBottom();
    }
});

Ext.layout.boxOverflow.scroller.vbox = Ext.layout.boxOverflow.VerticalScroller;


/**
 * @class Ext.layout.boxOverflow.HorizontalScroller
 * @extends Ext.layout.boxOverflow.Scroller
 * Description
 */
Ext.layout.boxOverflow.HorizontalScroller = Ext.extend(Ext.layout.boxOverflow.Scroller, {
    handleOverflow: function(calculations, targetSize) {
        Ext.layout.boxOverflow.HorizontalScroller.superclass.handleOverflow.apply(this, arguments);
        
        return {
            targetSize: {
                height: targetSize.height,
                width : targetSize.width - (this.beforeCt.getWidth() + this.afterCt.getWidth())
            }
        };
    },
    
    /**
     * @private
     * Creates the beforeCt and afterCt elements if they have not already been created
     */
    createInnerElements: function() {
        var target = this.layout.innerCt;
        
        //normal items will be rendered to the innerCt. beforeCt and afterCt allow for fixed positioning of
        //special items such as scrollers or dropdown menu triggers
        if (!this.beforeCt) {
            this.afterCt  = target.insertSibling({cls: this.afterCls},  'before');
            this.beforeCt = target.insertSibling({cls: this.beforeCls}, 'before');
            
            this.createWheelListener();
        }
    },
    
    /**
     * @private
     * Scrolls to the given position. Performs bounds checking.
     * @param {Number} position The position to scroll to. This is constrained.
     * @param {Boolean} animate True to animate. If undefined, falls back to value of this.animateScroll
     */
    scrollTo: function(position, animate) {
        var oldPosition = this.getScrollPosition(),
            newPosition = position.constrain(0, this.getMaxScrollRight());
        
        if (newPosition != oldPosition && !this.scrolling) {
            if (animate == undefined) {
                animate = this.animateScroll;
            }
            
            this.layout.innerCt.scrollTo('left', newPosition, animate ? this.getScrollAnim() : false);
            
            if (animate) {
                this.scrolling = true;
            } else {
                this.scrolling = false;
                this.updateScrollButtons();
            }
        }
    },
    
    /**
     * Returns the current scroll position of the innerCt element
     * @return {Number} The current scroll position
     */
    getScrollPosition: function(){
        return parseInt(this.layout.innerCt.dom.scrollLeft, 10) || 0;
    },
    
    /**
     * @private
     * Returns the maximum value we can scrollTo
     * @return {Number} The max scroll value
     */
    getMaxScrollRight: function() {
        return this.layout.innerCt.dom.scrollWidth - this.layout.innerCt.getWidth();
    },
    
    /**
     * @private
     * Returns true if the innerCt scroll is already at its right-most point
     * @return {Boolean} True if already at furthest right point
     */
    atExtremeAfter: function() {
        return this.getScrollPosition() >= this.getMaxScrollRight();
    }
});

Ext.layout.boxOverflow.scroller.hbox = Ext.layout.boxOverflow.HorizontalScroller;/**
 * @class Ext.layout.HBoxLayout
 * @extends Ext.layout.BoxLayout
 * <p>A layout that arranges items horizontally across a Container. This layout optionally divides available horizontal
 * space between child items containing a numeric <code>flex</code> configuration.</p>
 * This layout may also be used to set the heights of child items by configuring it with the {@link #align} option.
 */
Ext.layout.HBoxLayout = Ext.extend(Ext.layout.BoxLayout, {
    /**
     * @cfg {String} align
     * Controls how the child items of the container are aligned. Acceptable configuration values for this
     * property are:
     * <div class="mdetail-params"><ul>
     * <li><b><tt>top</tt></b> : <b>Default</b><div class="sub-desc">child items are aligned vertically
     * at the <b>top</b> of the container</div></li>
     * <li><b><tt>middle</tt></b> : <div class="sub-desc">child items are aligned vertically in the
     * <b>middle</b> of the container</div></li>
     * <li><b><tt>stretch</tt></b> : <div class="sub-desc">child items are stretched vertically to fill
     * the height of the container</div></li>
     * <li><b><tt>stretchmax</tt></b> : <div class="sub-desc">child items are stretched vertically to
     * the height of the largest item.</div></li>
     */
    align: 'top', // top, middle, stretch, strechmax

    type : 'hbox',

    /**
     * @cfg {String} pack
     * Controls how the child items of the container are packed together. Acceptable configuration values
     * for this property are:
     * <div class="mdetail-params"><ul>
     * <li><b><tt>start</tt></b> : <b>Default</b><div class="sub-desc">child items are packed together at
     * <b>left</b> side of container</div></li>
     * <li><b><tt>center</tt></b> : <div class="sub-desc">child items are packed together at
     * <b>mid-width</b> of container</div></li>
     * <li><b><tt>end</tt></b> : <div class="sub-desc">child items are packed together at <b>right</b>
     * side of container</div></li>
     * </ul></div>
     */
    /**
     * @cfg {Number} flex
     * This configuation option is to be applied to <b>child <tt>items</tt></b> of the container managed
     * by this layout. Each child item with a <tt>flex</tt> property will be flexed <b>horizontally</b>
     * according to each item's <b>relative</b> <tt>flex</tt> value compared to the sum of all items with
     * a <tt>flex</tt> value specified.  Any child items that have either a <tt>flex = 0</tt> or
     * <tt>flex = undefined</tt> will not be 'flexed' (the initial size will not be changed).
     */

    /**
     * @private
     * Calculates the size and positioning of each item in the HBox. This iterates over all of the rendered,
     * visible items and returns a height, width, top and left for each, as well as a reference to each. Also
     * returns meta data such as maxHeight which are useful when resizing layout wrappers such as this.innerCt.
     * @param {Array} visibleItems The array of all rendered, visible items to be calculated for
     * @param {Object} targetSize Object containing target size and height
     * @return {Object} Object containing box measurements for each child, plus meta data
     */
    calculateChildBoxes: function(visibleItems, targetSize) {
        var visibleCount = visibleItems.length,

            padding      = this.padding,
            topOffset    = padding.top,
            leftOffset   = padding.left,
            paddingVert  = topOffset  + padding.bottom,
            paddingHoriz = leftOffset + padding.right,

            width        = targetSize.width - this.scrollOffset,
            height       = targetSize.height,
            availHeight  = Math.max(0, height - paddingVert),

            isStart      = this.pack == 'start',
            isCenter     = this.pack == 'center',
            isEnd        = this.pack == 'end',

            nonFlexWidth = 0,
            maxHeight    = 0,
            totalFlex    = 0,
            desiredWidth = 0,
            minimumWidth = 0,

            //used to cache the calculated size and position values for each child item
            boxes        = [],

            //used in the for loops below, just declared here for brevity
            child, childWidth, childHeight, childSize, childMargins, canLayout, i, calcs, flexedWidth, 
            horizMargins, vertMargins, stretchHeight;

        //gather the total flex of all flexed items and the width taken up by fixed width items
        for (i = 0; i < visibleCount; i++) {
            child       = visibleItems[i];
            childHeight = child.height;
            childWidth  = child.width;
            canLayout   = !child.hasLayout && typeof child.doLayout == 'function';

            // Static width (numeric) requires no calcs
            if (typeof childWidth != 'number') {

                // flex and not 'auto' width
                if (child.flex && !childWidth) {
                    totalFlex += child.flex;

                // Not flexed or 'auto' width or undefined width
                } else {
                    //Render and layout sub-containers without a flex or width defined, as otherwise we
                    //don't know how wide the sub-container should be and cannot calculate flexed widths
                    if (!childWidth && canLayout) {
                        child.doLayout();
                    }

                    childSize   = child.getSize();
                    childWidth  = childSize.width;
                    childHeight = childSize.height;
                }
            }

            childMargins = child.margins;
            horizMargins = childMargins.left + childMargins.right;

            nonFlexWidth += horizMargins + (childWidth || 0);
            desiredWidth += horizMargins + (child.flex ? child.minWidth || 0 : childWidth);
            minimumWidth += horizMargins + (child.minWidth || childWidth || 0);

            // Max height for align - force layout of non-laid out subcontainers without a numeric height
            if (typeof childHeight != 'number') {
                if (canLayout) {
                    child.doLayout();
                }
                childHeight = child.getHeight();
            }

            maxHeight = Math.max(maxHeight, childHeight + childMargins.top + childMargins.bottom);

            //cache the size of each child component. Don't set height or width to 0, keep undefined instead
            boxes.push({
                component: child,
                height   : childHeight || undefined,
                width    : childWidth  || undefined
            });
        }
                
        var shortfall = desiredWidth - width,
            tooNarrow = minimumWidth > width;
            
        //the width available to the flexed items
        var availableWidth = Math.max(0, width - nonFlexWidth - paddingHoriz);
        
        if (tooNarrow) {
            for (i = 0; i < visibleCount; i++) {
                boxes[i].width = visibleItems[i].minWidth || visibleItems[i].width || boxes[i].width;
            }
        } else {
            //all flexed items should be sized to their minimum width, other items should be shrunk down until
            //the shortfall has been accounted for
            if (shortfall > 0) {
                var minWidths = [];
                
                /**
                 * When we have a shortfall but are not tooNarrow, we need to shrink the width of each non-flexed item.
                 * Flexed items are immediately reduced to their minWidth and anything already at minWidth is ignored.
                 * The remaining items are collected into the minWidths array, which is later used to distribute the shortfall.
                 */
                for (var index = 0, length = visibleCount; index < length; index++) {
                    var item     = visibleItems[index],
                        minWidth = item.minWidth || 0;

                    //shrink each non-flex tab by an equal amount to make them all fit. Flexed items are all
                    //shrunk to their minWidth because they're flexible and should be the first to lose width
                    if (item.flex) {
                        boxes[index].width = minWidth;
                    } else {
                        minWidths.push({
                            minWidth : minWidth,
                            available: boxes[index].width - minWidth,
                            index    : index
                        });
                    }
                }
                
                //sort by descending amount of width remaining before minWidth is reached
                minWidths.sort(function(a, b) {
                    return a.available > b.available ? 1 : -1;
                });
                
                /*
                 * Distribute the shortfall (difference between total desired with of all items and actual width available)
                 * between the non-flexed items. We try to distribute the shortfall evenly, but apply it to items with the
                 * smallest difference between their width and minWidth first, so that if reducing the width by the average
                 * amount would make that item less than its minWidth, we carry the remainder over to the next item.
                 */
                for (var i = 0, length = minWidths.length; i < length; i++) {
                    var itemIndex = minWidths[i].index;
                    
                    if (itemIndex == undefined) {
                        continue;
                    }
                        
                    var item      = visibleItems[itemIndex],
                        box       = boxes[itemIndex],
                        oldWidth  = box.width,
                        minWidth  = item.minWidth,
                        newWidth  = Math.max(minWidth, oldWidth - Math.ceil(shortfall / (length - i))),
                        reduction = oldWidth - newWidth;
                    
                    boxes[itemIndex].width = newWidth;
                    shortfall -= reduction;                    
                }
            } else {
                //temporary variables used in the flex width calculations below
                var remainingWidth = availableWidth,
                    remainingFlex  = totalFlex;

                //calculate the widths of each flexed item
                for (i = 0; i < visibleCount; i++) {
                    child = visibleItems[i];
                    calcs = boxes[i];

                    childMargins = child.margins;
                    vertMargins  = childMargins.top + childMargins.bottom;

                    if (isStart && child.flex && !child.width) {
                        flexedWidth     = Math.ceil((child.flex / remainingFlex) * remainingWidth);
                        remainingWidth -= flexedWidth;
                        remainingFlex  -= child.flex;

                        calcs.width = flexedWidth;
                        calcs.dirtySize = true;
                    }
                }
            }
        }
        
        if (isCenter) {
            leftOffset += availableWidth / 2;
        } else if (isEnd) {
            leftOffset += availableWidth;
        }
        
        //finally, calculate the left and top position of each item
        for (i = 0; i < visibleCount; i++) {
            child = visibleItems[i];
            calcs = boxes[i];
            
            childMargins = child.margins;
            leftOffset  += childMargins.left;
            vertMargins  = childMargins.top + childMargins.bottom;
            
            calcs.left = leftOffset;
            calcs.top  = topOffset + childMargins.top;

            switch (this.align) {
                case 'stretch':
                    stretchHeight = availHeight - vertMargins;
                    calcs.height  = stretchHeight.constrain(child.minHeight || 0, child.maxHeight || 1000000);
                    calcs.dirtySize = true;
                    break;
                case 'stretchmax':
                    stretchHeight = maxHeight - vertMargins;
                    calcs.height  = stretchHeight.constrain(child.minHeight || 0, child.maxHeight || 1000000);
                    calcs.dirtySize = true;
                    break;
                case 'middle':
                    var diff = availHeight - calcs.height - vertMargins;
                    if (diff > 0) {
                        calcs.top = topOffset + vertMargins + (diff / 2);
                    }
            }
            
            leftOffset += calcs.width + childMargins.right;
        }

        return {
            boxes: boxes,
            meta : {
                maxHeight   : maxHeight,
                nonFlexWidth: nonFlexWidth,
                desiredWidth: desiredWidth,
                minimumWidth: minimumWidth,
                shortfall   : desiredWidth - width,
                tooNarrow   : tooNarrow
            }
        };
    }
});

Ext.Container.LAYOUTS.hbox = Ext.layout.HBoxLayout;/**
 * @class Ext.layout.VBoxLayout
 * @extends Ext.layout.BoxLayout
 * <p>A layout that arranges items vertically down a Container. This layout optionally divides available vertical
 * space between child items containing a numeric <code>flex</code> configuration.</p>
 * This layout may also be used to set the widths of child items by configuring it with the {@link #align} option.
 */
Ext.layout.VBoxLayout = Ext.extend(Ext.layout.BoxLayout, {
    /**
     * @cfg {String} align
     * Controls how the child items of the container are aligned. Acceptable configuration values for this
     * property are:
     * <div class="mdetail-params"><ul>
     * <li><b><tt>left</tt></b> : <b>Default</b><div class="sub-desc">child items are aligned horizontally
     * at the <b>left</b> side of the container</div></li>
     * <li><b><tt>center</tt></b> : <div class="sub-desc">child items are aligned horizontally at the
     * <b>mid-width</b> of the container</div></li>
     * <li><b><tt>stretch</tt></b> : <div class="sub-desc">child items are stretched horizontally to fill
     * the width of the container</div></li>
     * <li><b><tt>stretchmax</tt></b> : <div class="sub-desc">child items are stretched horizontally to
     * the size of the largest item.</div></li>
     * </ul></div>
     */
    align : 'left', // left, center, stretch, strechmax
    type: 'vbox',

    /**
     * @cfg {String} pack
     * Controls how the child items of the container are packed together. Acceptable configuration values
     * for this property are:
     * <div class="mdetail-params"><ul>
     * <li><b><tt>start</tt></b> : <b>Default</b><div class="sub-desc">child items are packed together at
     * <b>top</b> side of container</div></li>
     * <li><b><tt>center</tt></b> : <div class="sub-desc">child items are packed together at
     * <b>mid-height</b> of container</div></li>
     * <li><b><tt>end</tt></b> : <div class="sub-desc">child items are packed together at <b>bottom</b>
     * side of container</div></li>
     * </ul></div>
     */

    /**
     * @cfg {Number} flex
     * This configuation option is to be applied to <b>child <tt>items</tt></b> of the container managed
     * by this layout. Each child item with a <tt>flex</tt> property will be flexed <b>vertically</b>
     * according to each item's <b>relative</b> <tt>flex</tt> value compared to the sum of all items with
     * a <tt>flex</tt> value specified.  Any child items that have either a <tt>flex = 0</tt> or
     * <tt>flex = undefined</tt> will not be 'flexed' (the initial size will not be changed).
     */

    /**
     * @private
     * Calculates the size and positioning of each item in the VBox. This iterates over all of the rendered,
     * visible items and returns a height, width, top and left for each, as well as a reference to each. Also
     * returns meta data such as maxHeight which are useful when resizing layout wrappers such as this.innerCt.
     * @param {Array} visibleItems The array of all rendered, visible items to be calculated for
     * @param {Object} targetSize Object containing target size and height
     * @return {Object} Object containing box measurements for each child, plus meta data
     */
    calculateChildBoxes: function(visibleItems, targetSize) {
        var visibleCount = visibleItems.length,

            padding      = this.padding,
            topOffset    = padding.top,
            leftOffset   = padding.left,
            paddingVert  = topOffset  + padding.bottom,
            paddingHoriz = leftOffset + padding.right,

            width        = targetSize.width - this.scrollOffset,
            height       = targetSize.height,
            availWidth   = Math.max(0, width - paddingHoriz),

            isStart      = this.pack == 'start',
            isCenter     = this.pack == 'center',
            isEnd        = this.pack == 'end',

            nonFlexHeight= 0,
            maxWidth     = 0,
            totalFlex    = 0,
            desiredHeight= 0,
            minimumHeight= 0,

            //used to cache the calculated size and position values for each child item
            boxes        = [],
            
            //used in the for loops below, just declared here for brevity
            child, childWidth, childHeight, childSize, childMargins, canLayout, i, calcs, flexedWidth, 
            horizMargins, vertMargins, stretchWidth;

        //gather the total flex of all flexed items and the width taken up by fixed width items
        for (i = 0; i < visibleCount; i++) {
            child = visibleItems[i];
            childHeight = child.height;
            childWidth  = child.width;
            canLayout   = !child.hasLayout && typeof child.doLayout == 'function';

            // Static height (numeric) requires no calcs
            if (typeof childHeight != 'number') {

                // flex and not 'auto' height
                if (child.flex && !childHeight) {
                    totalFlex += child.flex;

                // Not flexed or 'auto' height or undefined height
                } else {
                    //Render and layout sub-containers without a flex or width defined, as otherwise we
                    //don't know how wide the sub-container should be and cannot calculate flexed widths
                    if (!childHeight && canLayout) {
                        child.doLayout();
                    }

                    childSize = child.getSize();
                    childWidth = childSize.width;
                    childHeight = childSize.height;
                }
            }
            
            childMargins = child.margins;
            vertMargins  = childMargins.top + childMargins.bottom;

            nonFlexHeight += vertMargins + (childHeight || 0);
            desiredHeight += vertMargins + (child.flex ? child.minHeight || 0 : childHeight);
            minimumHeight += vertMargins + (child.minHeight || childHeight || 0);

            // Max width for align - force layout of non-layed out subcontainers without a numeric width
            if (typeof childWidth != 'number') {
                if (canLayout) {
                    child.doLayout();
                }
                childWidth = child.getWidth();
            }

            maxWidth = Math.max(maxWidth, childWidth + childMargins.left + childMargins.right);

            //cache the size of each child component
            boxes.push({
                component: child,
                height   : childHeight || undefined,
                width    : childWidth || undefined
            });
        }
                
        var shortfall = desiredHeight - height,
            tooNarrow = minimumHeight > height;

        //the height available to the flexed items
        var availableHeight = Math.max(0, (height - nonFlexHeight - paddingVert));
        
        if (tooNarrow) {
            for (i = 0, length = visibleCount; i < length; i++) {
                boxes[i].height = visibleItems[i].minHeight || visibleItems[i].height || boxes[i].height;
            }
        } else {
            //all flexed items should be sized to their minimum width, other items should be shrunk down until
            //the shortfall has been accounted for
            if (shortfall > 0) {
                var minHeights = [];

                /**
                 * When we have a shortfall but are not tooNarrow, we need to shrink the height of each non-flexed item.
                 * Flexed items are immediately reduced to their minHeight and anything already at minHeight is ignored.
                 * The remaining items are collected into the minHeights array, which is later used to distribute the shortfall.
                 */
                for (var index = 0, length = visibleCount; index < length; index++) {
                    var item      = visibleItems[index],
                        minHeight = item.minHeight || 0;

                    //shrink each non-flex tab by an equal amount to make them all fit. Flexed items are all
                    //shrunk to their minHeight because they're flexible and should be the first to lose height
                    if (item.flex) {
                        boxes[index].height = minHeight;
                    } else {
                        minHeights.push({
                            minHeight: minHeight, 
                            available: boxes[index].height - minHeight,
                            index    : index
                        });
                    }
                }

                //sort by descending minHeight value
                minHeights.sort(function(a, b) {
                    return a.available > b.available ? 1 : -1;
                });

                /*
                 * Distribute the shortfall (difference between total desired with of all items and actual height available)
                 * between the non-flexed items. We try to distribute the shortfall evenly, but apply it to items with the
                 * smallest difference between their height and minHeight first, so that if reducing the height by the average
                 * amount would make that item less than its minHeight, we carry the remainder over to the next item.
                 */
                for (var i = 0, length = minHeights.length; i < length; i++) {
                    var itemIndex = minHeights[i].index;

                    if (itemIndex == undefined) {
                        continue;
                    }

                    var item      = visibleItems[itemIndex],
                        box       = boxes[itemIndex],
                        oldHeight  = box.height,
                        minHeight  = item.minHeight,
                        newHeight  = Math.max(minHeight, oldHeight - Math.ceil(shortfall / (length - i))),
                        reduction = oldHeight - newHeight;

                    boxes[itemIndex].height = newHeight;
                    shortfall -= reduction;
                }
            } else {
                //temporary variables used in the flex height calculations below
                var remainingHeight = availableHeight,
                    remainingFlex   = totalFlex;
                
                //calculate the height of each flexed item
                for (i = 0; i < visibleCount; i++) {
                    child = visibleItems[i];
                    calcs = boxes[i];

                    childMargins = child.margins;
                    horizMargins = childMargins.left + childMargins.right;

                    if (isStart && child.flex && !child.height) {
                        flexedHeight     = Math.ceil((child.flex / remainingFlex) * remainingHeight);
                        remainingHeight -= flexedHeight;
                        remainingFlex   -= child.flex;

                        calcs.height = flexedHeight;
                        calcs.dirtySize = true;
                    }
                }
            }
        }

        if (isCenter) {
            topOffset += availableHeight / 2;
        } else if (isEnd) {
            topOffset += availableHeight;
        }

        //finally, calculate the left and top position of each item
        for (i = 0; i < visibleCount; i++) {
            child = visibleItems[i];
            calcs = boxes[i];

            childMargins = child.margins;
            topOffset   += childMargins.top;
            horizMargins = childMargins.left + childMargins.right;
            

            calcs.left = leftOffset + childMargins.left;
            calcs.top  = topOffset;
            
            switch (this.align) {
                case 'stretch':
                    stretchWidth = availWidth - horizMargins;
                    calcs.width  = stretchWidth.constrain(child.minWidth || 0, child.maxWidth || 1000000);
                    calcs.dirtySize = true;
                    break;
                case 'stretchmax':
                    stretchWidth = maxWidth - horizMargins;
                    calcs.width  = stretchWidth.constrain(child.minWidth || 0, child.maxWidth || 1000000);
                    calcs.dirtySize = true;
                    break;
                case 'center':
                    var diff = availWidth - calcs.width - horizMargins;
                    if (diff > 0) {
                        calcs.left = leftOffset + horizMargins + (diff / 2);
                    }
            }

            topOffset += calcs.height + childMargins.bottom;
        }
        
        return {
            boxes: boxes,
            meta : {
                maxWidth     : maxWidth,
                nonFlexHeight: nonFlexHeight,
                desiredHeight: desiredHeight,
                minimumHeight: minimumHeight,
                shortfall    : desiredHeight - height,
                tooNarrow    : tooNarrow
            }
        };
    }
});

Ext.Container.LAYOUTS.vbox = Ext.layout.VBoxLayout;
/**
 * @class Ext.layout.ToolbarLayout
 * @extends Ext.layout.ContainerLayout
 * Layout manager used by Ext.Toolbar. This is highly specialised for use by Toolbars and would not
 * usually be used by any other class.
 */
Ext.layout.ToolbarLayout = Ext.extend(Ext.layout.ContainerLayout, {
    monitorResize : true,

    type: 'toolbar',

    /**
     * @property triggerWidth
     * @type Number
     * The width allocated for the menu trigger at the extreme right end of the Toolbar
     */
    triggerWidth: 18,

    /**
     * @property noItemsMenuText
     * @type String
     * HTML fragment to render into the toolbar overflow menu if there are no items to display
     */
    noItemsMenuText : '<div class="x-toolbar-no-items">(None)</div>',

    /**
     * @private
     * @property lastOverflow
     * @type Boolean
     * Used internally to record whether the last layout caused an overflow or not
     */
    lastOverflow: false,

    /**
     * @private
     * @property tableHTML
     * @type String
     * String used to build the HTML injected to support the Toolbar's layout. The align property is
     * injected into this string inside the td.x-toolbar-left element during onLayout.
     */
    tableHTML: [
        '<table cellspacing="0" class="x-toolbar-ct">',
            '<tbody>',
                '<tr>',
                    '<td class="x-toolbar-left" align="{0}">',
                        '<table cellspacing="0">',
                            '<tbody>',
                                '<tr class="x-toolbar-left-row"></tr>',
                            '</tbody>',
                        '</table>',
                    '</td>',
                    '<td class="x-toolbar-right" align="right">',
                        '<table cellspacing="0" class="x-toolbar-right-ct">',
                            '<tbody>',
                                '<tr>',
                                    '<td>',
                                        '<table cellspacing="0">',
                                            '<tbody>',
                                                '<tr class="x-toolbar-right-row"></tr>',
                                            '</tbody>',
                                        '</table>',
                                    '</td>',
                                    '<td>',
                                        '<table cellspacing="0">',
                                            '<tbody>',
                                                '<tr class="x-toolbar-extras-row"></tr>',
                                            '</tbody>',
                                        '</table>',
                                    '</td>',
                                '</tr>',
                            '</tbody>',
                        '</table>',
                    '</td>',
                '</tr>',
            '</tbody>',
        '</table>'
    ].join(""),

    /**
     * @private
     * Create the wrapping Toolbar HTML and render/move all the items into the correct places
     */
    onLayout : function(ct, target) {
        //render the Toolbar <table> HTML if it's not already present
        if (!this.leftTr) {
            var align = ct.buttonAlign == 'center' ? 'center' : 'left';

            target.addClass('x-toolbar-layout-ct');
            target.insertHtml('beforeEnd', String.format(this.tableHTML, align));

            this.leftTr   = target.child('tr.x-toolbar-left-row', true);
            this.rightTr  = target.child('tr.x-toolbar-right-row', true);
            this.extrasTr = target.child('tr.x-toolbar-extras-row', true);

            if (this.hiddenItem == undefined) {
                /**
                 * @property hiddenItems
                 * @type Array
                 * Holds all items that are currently hidden due to there not being enough space to render them
                 * These items will appear on the expand menu.
                 */
                this.hiddenItems = [];
            }
        }

        var side     = ct.buttonAlign == 'right' ? this.rightTr : this.leftTr,
            items    = ct.items.items,
            position = 0;

        //render each item if not already rendered, place it into the correct (left or right) target
        for (var i = 0, len = items.length, c; i < len; i++, position++) {
            c = items[i];

            if (c.isFill) {
                side   = this.rightTr;
                position = -1;
            } else if (!c.rendered) {
                c.render(this.insertCell(c, side, position));
                this.configureItem(c);
            } else {
                if (!c.xtbHidden && !this.isValidParent(c, side.childNodes[position])) {
                    var td = this.insertCell(c, side, position);
                    td.appendChild(c.getPositionEl().dom);
                    c.container = Ext.get(td);
                }
            }
        }

        //strip extra empty cells
        this.cleanup(this.leftTr);
        this.cleanup(this.rightTr);
        this.cleanup(this.extrasTr);
        this.fitToSize(target);
    },

    /**
     * @private
     * Removes any empty nodes from the given element
     * @param {Ext.Element} el The element to clean up
     */
    cleanup : function(el) {
        var cn = el.childNodes, i, c;

        for (i = cn.length-1; i >= 0 && (c = cn[i]); i--) {
            if (!c.firstChild) {
                el.removeChild(c);
            }
        }
    },

    /**
     * @private
     * Inserts the given Toolbar item into the given element
     * @param {Ext.Component} c The component to add
     * @param {Ext.Element} target The target to add the component to
     * @param {Number} position The position to add the component at
     */
    insertCell : function(c, target, position) {
        var td = document.createElement('td');
        td.className = 'x-toolbar-cell';

        target.insertBefore(td, target.childNodes[position] || null);

        return td;
    },

    /**
     * @private
     * Hides an item because it will not fit in the available width. The item will be unhidden again
     * if the Toolbar is resized to be large enough to show it
     * @param {Ext.Component} item The item to hide
     */
    hideItem : function(item) {
        this.hiddenItems.push(item);

        item.xtbHidden = true;
        item.xtbWidth = item.getPositionEl().dom.parentNode.offsetWidth;
        item.hide();
    },

    /**
     * @private
     * Unhides an item that was previously hidden due to there not being enough space left on the Toolbar
     * @param {Ext.Component} item The item to show
     */
    unhideItem : function(item) {
        item.show();
        item.xtbHidden = false;
        this.hiddenItems.remove(item);
    },

    /**
     * @private
     * Returns the width of the given toolbar item. If the item is currently hidden because there
     * is not enough room to render it, its previous width is returned
     * @param {Ext.Component} c The component to measure
     * @return {Number} The width of the item
     */
    getItemWidth : function(c) {
        return c.hidden ? (c.xtbWidth || 0) : c.getPositionEl().dom.parentNode.offsetWidth;
    },

    /**
     * @private
     * Called at the end of onLayout. At this point the Toolbar has already been resized, so we need
     * to fit the items into the available width. We add up the width required by all of the items in
     * the toolbar - if we don't have enough space we hide the extra items and render the expand menu
     * trigger.
     * @param {Ext.Element} target The Element the Toolbar is currently laid out within
     */
    fitToSize : function(target) {
        if (this.container.enableOverflow === false) {
            return;
        }

        var width       = target.dom.clientWidth,
            tableWidth  = target.dom.firstChild.offsetWidth,
            clipWidth   = width - this.triggerWidth,
            lastWidth   = this.lastWidth || 0,

            hiddenItems = this.hiddenItems,
            hasHiddens  = hiddenItems.length != 0,
            isLarger    = width >= lastWidth;

        this.lastWidth  = width;

        if (tableWidth > width || (hasHiddens && isLarger)) {
            var items     = this.container.items.items,
                len       = items.length,
                loopWidth = 0,
                item;

            for (var i = 0; i < len; i++) {
                item = items[i];

                if (!item.isFill) {
                    loopWidth += this.getItemWidth(item);
                    if (loopWidth > clipWidth) {
                        if (!(item.hidden || item.xtbHidden)) {
                            this.hideItem(item);
                        }
                    } else if (item.xtbHidden) {
                        this.unhideItem(item);
                    }
                }
            }
        }

        //test for number of hidden items again here because they may have changed above
        hasHiddens = hiddenItems.length != 0;

        if (hasHiddens) {
            this.initMore();

            if (!this.lastOverflow) {
                this.container.fireEvent('overflowchange', this.container, true);
                this.lastOverflow = true;
            }
        } else if (this.more) {
            this.clearMenu();
            this.more.destroy();
            delete this.more;

            if (this.lastOverflow) {
                this.container.fireEvent('overflowchange', this.container, false);
                this.lastOverflow = false;
            }
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
     * Called before the expand menu is shown, this rebuilds the menu since it was last shown because
     * it is possible that the items hidden due to space limitations on the Toolbar have changed since.
     * @param {Ext.menu.Menu} m The menu
     */
    beforeMoreShow : function(menu) {
        var items = this.container.items.items,
            len   = items.length,
            item,
            prev;

        var needsSep = function(group, item){
            return group.isXType('buttongroup') && !(item instanceof Ext.Toolbar.Separator);
        };

        this.clearMenu();
        menu.removeAll();
        for (var i = 0; i < len; i++) {
            item = items[i];
            if (item.xtbHidden) {
                if (prev && (needsSep(item, prev) || needsSep(prev, item))) {
                    menu.add('-');
                }
                this.addComponentToMenu(menu, item);
                prev = item;
            }
        }

        // put something so the menu isn't empty if no compatible items found
        if (menu.items.length < 1) {
            menu.add(this.noItemsMenuText);
        }
    },

    /**
     * @private
     * Creates the expand trigger and menu, adding them to the <tr> at the extreme right of the
     * Toolbar table
     */
    initMore : function(){
        if (!this.more) {
            /**
             * @private
             * @property moreMenu
             * @type Ext.menu.Menu
             * The expand menu - holds items for every Toolbar item that cannot be shown
             * because the Toolbar is currently not wide enough.
             */
            this.moreMenu = new Ext.menu.Menu({
                ownerCt : this.container,
                listeners: {
                    beforeshow: this.beforeMoreShow,
                    scope: this
                }
            });

            /**
             * @private
             * @property more
             * @type Ext.Button
             * The expand button which triggers the overflow menu to be shown
             */
            this.more = new Ext.Button({
                iconCls: 'x-toolbar-more-icon',
                cls    : 'x-toolbar-more',
                menu   : this.moreMenu,
                ownerCt: this.container
            });

            var td = this.insertCell(this.more, this.extrasTr, 100);
            this.more.render(td);
        }
    },

    destroy : function(){
        Ext.destroy(this.more, this.moreMenu);
        delete this.leftTr;
        delete this.rightTr;
        delete this.extrasTr;
        Ext.layout.ToolbarLayout.superclass.destroy.call(this);
    }
});

Ext.Container.LAYOUTS.toolbar = Ext.layout.ToolbarLayout;
/**
 * @class Ext.layout.MenuLayout
 * @extends Ext.layout.ContainerLayout
 * <p>Layout manager used by {@link Ext.menu.Menu}. Generally this class should not need to be used directly.</p>
 */
 Ext.layout.MenuLayout = Ext.extend(Ext.layout.ContainerLayout, {
    monitorResize : true,

    type: 'menu',

    setContainer : function(ct){
        this.monitorResize = !ct.floating;
        // This event is only fired by the menu in IE, used so we don't couple
        // the menu with the layout.
        ct.on('autosize', this.doAutoSize, this);
        Ext.layout.MenuLayout.superclass.setContainer.call(this, ct);
    },

    renderItem : function(c, position, target){
        if (!this.itemTpl) {
            this.itemTpl = Ext.layout.MenuLayout.prototype.itemTpl = new Ext.XTemplate(
                '<li id="{itemId}" class="{itemCls}">',
                    '<tpl if="needsIcon">',
                        '<img alt="{altText}" src="{icon}" class="{iconCls}"/>',
                    '</tpl>',
                '</li>'
            );
        }

        if(c && !c.rendered){
            if(Ext.isNumber(position)){
                position = target.dom.childNodes[position];
            }
            var a = this.getItemArgs(c);

//          The Component's positionEl is the <li> it is rendered into
            c.render(c.positionEl = position ?
                this.itemTpl.insertBefore(position, a, true) :
                this.itemTpl.append(target, a, true));

//          Link the containing <li> to the item.
            c.positionEl.menuItemId = c.getItemId();

//          If rendering a regular Component, and it needs an icon,
//          move the Component rightwards.
            if (!a.isMenuItem && a.needsIcon) {
                c.positionEl.addClass('x-menu-list-item-indent');
            }
            this.configureItem(c);
        }else if(c && !this.isValidParent(c, target)){
            if(Ext.isNumber(position)){
                position = target.dom.childNodes[position];
            }
            target.dom.insertBefore(c.getActionEl().dom, position || null);
        }
    },

    getItemArgs : function(c) {
        var isMenuItem = c instanceof Ext.menu.Item,
            canHaveIcon = !(isMenuItem || c instanceof Ext.menu.Separator);

        return {
            isMenuItem: isMenuItem,
            needsIcon: canHaveIcon && (c.icon || c.iconCls),
            icon: c.icon || Ext.BLANK_IMAGE_URL,
            iconCls: 'x-menu-item-icon ' + (c.iconCls || ''),
            itemId: 'x-menu-el-' + c.id,
            itemCls: 'x-menu-list-item ',
            altText: c.altText || ''
        };
    },

    //  Valid if the Component is in a <li> which is part of our target <ul>
    isValidParent : function(c, target) {
        return c.el.up('li.x-menu-list-item', 5).dom.parentNode === (target.dom || target);
    },

    onLayout : function(ct, target){
        Ext.layout.MenuLayout.superclass.onLayout.call(this, ct, target);
        this.doAutoSize();
    },

    doAutoSize : function(){
        var ct = this.container, w = ct.width;
        if(ct.floating){
            if(w){
                ct.setWidth(w);
            }else if(Ext.isIE){
                ct.setWidth(Ext.isStrict && (Ext.isIE7 || Ext.isIE8) ? 'auto' : ct.minWidth);
                var el = ct.getEl(), t = el.dom.offsetWidth; // force recalc
                ct.setWidth(ct.getLayoutTarget().getWidth() + el.getFrameWidth('lr'));
            }
        }
    }
});
Ext.Container.LAYOUTS['menu'] = Ext.layout.MenuLayout;
/**
 * @class Ext.Viewport
 * @extends Ext.Container
 * <p>A specialized container representing the viewable application area (the browser viewport).</p>
 * <p>The Viewport renders itself to the document body, and automatically sizes itself to the size of
 * the browser viewport and manages window resizing. There may only be one Viewport created
 * in a page. Inner layouts are available by virtue of the fact that all {@link Ext.Panel Panel}s
 * added to the Viewport, either through its {@link #items}, or through the items, or the {@link #add}
 * method of any of its child Panels may themselves have a layout.</p>
 * <p>The Viewport does not provide scrolling, so child Panels within the Viewport should provide
 * for scrolling if needed using the {@link #autoScroll} config.</p>
 * <p>An example showing a classic application border layout:</p><pre><code>
new Ext.Viewport({
    layout: 'border',
    items: [{
        region: 'north',
        html: '&lt;h1 class="x-panel-header">Page Title&lt;/h1>',
        autoHeight: true,
        border: false,
        margins: '0 0 5 0'
    }, {
        region: 'west',
        collapsible: true,
        title: 'Navigation',
        width: 200
        // the west region might typically utilize a {@link Ext.tree.TreePanel TreePanel} or a Panel with {@link Ext.layout.AccordionLayout Accordion layout}
    }, {
        region: 'south',
        title: 'Title for Panel',
        collapsible: true,
        html: 'Information goes here',
        split: true,
        height: 100,
        minHeight: 100
    }, {
        region: 'east',
        title: 'Title for the Grid Panel',
        collapsible: true,
        split: true,
        width: 200,
        xtype: 'grid',
        // remaining grid configuration not shown ...
        // notice that the GridPanel is added directly as the region
        // it is not "overnested" inside another Panel
    }, {
        region: 'center',
        xtype: 'tabpanel', // TabPanel itself has no title
        items: {
            title: 'Default Tab',
            html: 'The first tab\'s content. Others may be added dynamically'
        }
    }]
});
</code></pre>
 * @constructor
 * Create a new Viewport
 * @param {Object} config The config object
 * @xtype viewport
 */
Ext.Viewport = Ext.extend(Ext.Container, {
    /*
     * Privatize config options which, if used, would interfere with the
     * correct operation of the Viewport as the sole manager of the
     * layout of the document body.
     */
    /**
     * @cfg {Mixed} applyTo @hide
     */
    /**
     * @cfg {Boolean} allowDomMove @hide
     */
    /**
     * @cfg {Boolean} hideParent @hide
     */
    /**
     * @cfg {Mixed} renderTo @hide
     */
    /**
     * @cfg {Boolean} hideParent @hide
     */
    /**
     * @cfg {Number} height @hide
     */
    /**
     * @cfg {Number} width @hide
     */
    /**
     * @cfg {Boolean} autoHeight @hide
     */
    /**
     * @cfg {Boolean} autoWidth @hide
     */
    /**
     * @cfg {Boolean} deferHeight @hide
     */
    /**
     * @cfg {Boolean} monitorResize @hide
     */

    initComponent : function() {
        Ext.Viewport.superclass.initComponent.call(this);
        document.getElementsByTagName('html')[0].className += ' x-viewport';
        this.el = Ext.getBody();
        this.el.setHeight = Ext.emptyFn;
        this.el.setWidth = Ext.emptyFn;
        this.el.setSize = Ext.emptyFn;
        this.el.dom.scroll = 'no';
        this.allowDomMove = false;
        this.autoWidth = true;
        this.autoHeight = true;
        Ext.EventManager.onWindowResize(this.fireResize, this);
        this.renderTo = this.el;
    },

    fireResize : function(w, h){
        this.fireEvent('resize', this, w, h, w, h);
    }
});
Ext.reg('viewport', Ext.Viewport);
/**
 * @class Ext.Panel
 * @extends Ext.Container
 * <p>Panel is a container that has specific functionality and structural components that make
 * it the perfect building block for application-oriented user interfaces.</p>
 * <p>Panels are, by virtue of their inheritance from {@link Ext.Container}, capable
 * of being configured with a {@link Ext.Container#layout layout}, and containing child Components.</p>
 * <p>When either specifying child {@link Ext.Component#items items} of a Panel, or dynamically {@link Ext.Container#add adding} Components
 * to a Panel, remember to consider how you wish the Panel to arrange those child elements, and whether
 * those child elements need to be sized using one of Ext's built-in <code><b>{@link Ext.Container#layout layout}</b></code> schemes. By
 * default, Panels use the {@link Ext.layout.ContainerLayout ContainerLayout} scheme. This simply renders
 * child components, appending them one after the other inside the Container, and <b>does not apply any sizing</b>
 * at all.</p>
 * <p>A Panel may also contain {@link #bbar bottom} and {@link #tbar top} toolbars, along with separate
 * {@link #header}, {@link #footer} and {@link #body} sections (see {@link #frame} for additional
 * information).</p>
 * <p>Panel also provides built-in {@link #collapsible expandable and collapsible behavior}, along with
 * a variety of {@link #tools prebuilt tool buttons} that can be wired up to provide other customized
 * behavior.  Panels can be easily dropped into any {@link Ext.Container Container} or layout, and the
 * layout and rendering pipeline is {@link Ext.Container#add completely managed by the framework}.</p>
 * @constructor
 * @param {Object} config The config object
 * @xtype panel
 */
Ext.Panel = Ext.extend(Ext.Container, {
    /**
     * The Panel's header {@link Ext.Element Element}. Read-only.
     * <p>This Element is used to house the {@link #title} and {@link #tools}</p>
     * <br><p><b>Note</b>: see the Note for <code>{@link Ext.Component#el el}</code> also.</p>
     * @type Ext.Element
     * @property header
     */
    /**
     * The Panel's body {@link Ext.Element Element} which may be used to contain HTML content.
     * The content may be specified in the {@link #html} config, or it may be loaded using the
     * {@link autoLoad} config, or through the Panel's {@link #getUpdater Updater}. Read-only.
     * <p>If this is used to load visible HTML elements in either way, then
     * the Panel may not be used as a Layout for hosting nested Panels.</p>
     * <p>If this Panel is intended to be used as the host of a Layout (See {@link #layout}
     * then the body Element must not be loaded or changed - it is under the control
     * of the Panel's Layout.
     * <br><p><b>Note</b>: see the Note for <code>{@link Ext.Component#el el}</code> also.</p>
     * @type Ext.Element
     * @property body
     */
    /**
     * The Panel's bwrap {@link Ext.Element Element} used to contain other Panel elements
     * (tbar, body, bbar, footer). See {@link #bodyCfg}. Read-only.
     * @type Ext.Element
     * @property bwrap
     */
    /**
     * True if this panel is collapsed. Read-only.
     * @type Boolean
     * @property collapsed
     */
    /**
     * @cfg {Object} bodyCfg
     * <p>A {@link Ext.DomHelper DomHelper} element specification object may be specified for any
     * Panel Element.</p>
     * <p>By default, the Default element in the table below will be used for the html markup to
     * create a child element with the commensurate Default class name (<code>baseCls</code> will be
     * replaced by <code>{@link #baseCls}</code>):</p>
     * <pre>
     * Panel      Default  Default             Custom      Additional       Additional
     * Element    element  class               element     class            style
     * ========   ==========================   =========   ==============   ===========
     * {@link #header}     div      {@link #baseCls}+'-header'   {@link #headerCfg}   headerCssClass   headerStyle
     * {@link #bwrap}      div      {@link #baseCls}+'-bwrap'     {@link #bwrapCfg}    bwrapCssClass    bwrapStyle
     * + tbar     div      {@link #baseCls}+'-tbar'       {@link #tbarCfg}     tbarCssClass     tbarStyle
     * + {@link #body}     div      {@link #baseCls}+'-body'       {@link #bodyCfg}     {@link #bodyCssClass}     {@link #bodyStyle}
     * + bbar     div      {@link #baseCls}+'-bbar'       {@link #bbarCfg}     bbarCssClass     bbarStyle
     * + {@link #footer}   div      {@link #baseCls}+'-footer'   {@link #footerCfg}   footerCssClass   footerStyle
     * </pre>
     * <p>Configuring a Custom element may be used, for example, to force the {@link #body} Element
     * to use a different form of markup than is created by default. An example of this might be
     * to {@link Ext.Element#createChild create a child} Panel containing a custom content, such as
     * a header, or forcing centering of all Panel content by having the body be a &lt;center&gt;
     * element:</p>
     * <pre><code>
new Ext.Panel({
    title: 'Message Title',
    renderTo: Ext.getBody(),
    width: 200, height: 130,
    <b>bodyCfg</b>: {
        tag: 'center',
        cls: 'x-panel-body',  // Default class not applied if Custom element specified
        html: 'Message'
    },
    footerCfg: {
        tag: 'h2',
        cls: 'x-panel-footer',        // same as the Default class
        html: 'footer html'
    },
    footerCssClass: 'custom-footer', // additional css class, see {@link Ext.element#addClass addClass}
    footerStyle:    'background-color:red' // see {@link #bodyStyle}
});
     * </code></pre>
     * <p>The example above also explicitly creates a <code>{@link #footer}</code> with custom markup and
     * styling applied.</p>
     */
    /**
     * @cfg {Object} headerCfg
     * <p>A {@link Ext.DomHelper DomHelper} element specification object specifying the element structure
     * of this Panel's {@link #header} Element.  See <code>{@link #bodyCfg}</code> also.</p>
     */
    /**
     * @cfg {Object} bwrapCfg
     * <p>A {@link Ext.DomHelper DomHelper} element specification object specifying the element structure
     * of this Panel's {@link #bwrap} Element.  See <code>{@link #bodyCfg}</code> also.</p>
     */
    /**
     * @cfg {Object} tbarCfg
     * <p>A {@link Ext.DomHelper DomHelper} element specification object specifying the element structure
     * of this Panel's {@link #tbar} Element.  See <code>{@link #bodyCfg}</code> also.</p>
     */
    /**
     * @cfg {Object} bbarCfg
     * <p>A {@link Ext.DomHelper DomHelper} element specification object specifying the element structure
     * of this Panel's {@link #bbar} Element.  See <code>{@link #bodyCfg}</code> also.</p>
     */
    /**
     * @cfg {Object} footerCfg
     * <p>A {@link Ext.DomHelper DomHelper} element specification object specifying the element structure
     * of this Panel's {@link #footer} Element.  See <code>{@link #bodyCfg}</code> also.</p>
     */
    /**
     * @cfg {Boolean} closable
     * Panels themselves do not directly support being closed, but some Panel subclasses do (like
     * {@link Ext.Window}) or a Panel Class within an {@link Ext.TabPanel}.  Specify <code>true</code>
     * to enable closing in such situations. Defaults to <code>false</code>.
     */
    /**
     * The Panel's footer {@link Ext.Element Element}. Read-only.
     * <p>This Element is used to house the Panel's <code>{@link #buttons}</code> or <code>{@link #fbar}</code>.</p>
     * <br><p><b>Note</b>: see the Note for <code>{@link Ext.Component#el el}</code> also.</p>
     * @type Ext.Element
     * @property footer
     */
    /**
     * @cfg {Mixed} applyTo
     * <p>The id of the node, a DOM node or an existing Element corresponding to a DIV that is already present in
     * the document that specifies some panel-specific structural markup.  When <code>applyTo</code> is used,
     * constituent parts of the panel can be specified by CSS class name within the main element, and the panel
     * will automatically create those components from that markup. Any required components not specified in the
     * markup will be autogenerated if necessary.</p>
     * <p>The following class names are supported (baseCls will be replaced by {@link #baseCls}):</p>
     * <ul><li>baseCls + '-header'</li>
     * <li>baseCls + '-header-text'</li>
     * <li>baseCls + '-bwrap'</li>
     * <li>baseCls + '-tbar'</li>
     * <li>baseCls + '-body'</li>
     * <li>baseCls + '-bbar'</li>
     * <li>baseCls + '-footer'</li></ul>
     * <p>Using this config, a call to render() is not required.  If applyTo is specified, any value passed for
     * {@link #renderTo} will be ignored and the target element's parent node will automatically be used as the
     * panel's container.</p>
     */
    /**
     * @cfg {Object/Array} tbar
     * <p>The top toolbar of the panel. This can be a {@link Ext.Toolbar} object, a toolbar config, or an array of
     * buttons/button configs to be added to the toolbar.  Note that this is not available as a property after render.
     * To access the top toolbar after render, use {@link #getTopToolbar}.</p>
     * <p><b>Note:</b> Although a Toolbar may contain Field components, these will <b>not</b> be updated by a load
     * of an ancestor FormPanel. A Panel's toolbars are not part of the standard Container->Component hierarchy, and
     * so are not scanned to collect form items. However, the values <b>will</b> be submitted because form
     * submission parameters are collected from the DOM tree.</p>
     */
    /**
     * @cfg {Object/Array} bbar
     * <p>The bottom toolbar of the panel. This can be a {@link Ext.Toolbar} object, a toolbar config, or an array of
     * buttons/button configs to be added to the toolbar.  Note that this is not available as a property after render.
     * To access the bottom toolbar after render, use {@link #getBottomToolbar}.</p>
     * <p><b>Note:</b> Although a Toolbar may contain Field components, these will <b>not</b> be updated by a load
     * of an ancestor FormPanel. A Panel's toolbars are not part of the standard Container->Component hierarchy, and
     * so are not scanned to collect form items. However, the values <b>will</b> be submitted because form
     * submission parameters are collected from the DOM tree.</p>
     */
    /** @cfg {Object/Array} fbar
     * <p>A {@link Ext.Toolbar Toolbar} object, a Toolbar config, or an array of
     * {@link Ext.Button Button}s/{@link Ext.Button Button} configs, describing a {@link Ext.Toolbar Toolbar} to be rendered into this Panel's footer element.</p>
     * <p>After render, the <code>fbar</code> property will be an {@link Ext.Toolbar Toolbar} instance.</p>
     * <p>If <code>{@link #buttons}</code> are specified, they will supersede the <code>fbar</code> configuration property.</p>
     * The Panel's <code>{@link #buttonAlign}</code> configuration affects the layout of these items, for example:
     * <pre><code>
var w = new Ext.Window({
    height: 250,
    width: 500,
    bbar: new Ext.Toolbar({
        items: [{
            text: 'bbar Left'
        },'->',{
            text: 'bbar Right'
        }]
    }),
    {@link #buttonAlign}: 'left', // anything but 'center' or 'right' and you can use '-', and '->'
                                  // to control the alignment of fbar items
    fbar: [{
        text: 'fbar Left'
    },'->',{
        text: 'fbar Right'
    }]
}).show();
     * </code></pre>
     * <p><b>Note:</b> Although a Toolbar may contain Field components, these will <b>not</b> be updated by a load
     * of an ancestor FormPanel. A Panel's toolbars are not part of the standard Container->Component hierarchy, and
     * so are not scanned to collect form items. However, the values <b>will</b> be submitted because form
     * submission parameters are collected from the DOM tree.</p>
     */
    /**
     * @cfg {Boolean} header
     * <code>true</code> to create the Panel's header element explicitly, <code>false</code> to skip creating
     * it.  If a <code>{@link #title}</code> is set the header will be created automatically, otherwise it will not.
     * If a <code>{@link #title}</code> is set but <code>header</code> is explicitly set to <code>false</code>, the header
     * will not be rendered.
     */
    /**
     * @cfg {Boolean} footer
     * <code>true</code> to create the footer element explicitly, false to skip creating it. The footer
     * will be created automatically if <code>{@link #buttons}</code> or a <code>{@link #fbar}</code> have
     * been configured.  See <code>{@link #bodyCfg}</code> for an example.
     */
    /**
     * @cfg {String} title
     * The title text to be used as innerHTML (html tags are accepted) to display in the panel
     * <code>{@link #header}</code> (defaults to ''). When a <code>title</code> is specified the
     * <code>{@link #header}</code> element will automatically be created and displayed unless
     * {@link #header} is explicitly set to <code>false</code>.  If you do not want to specify a
     * <code>title</code> at config time, but you may want one later, you must either specify a non-empty
     * <code>title</code> (a blank space ' ' will do) or <code>header:true</code> so that the container
     * element will get created.
     */
    /**
     * @cfg {Array} buttons
     * <code>buttons</code> will be used as <code>{@link Ext.Container#items items}</code> for the toolbar in
     * the footer (<code>{@link #fbar}</code>). Typically the value of this configuration property will be
     * an array of {@link Ext.Button}s or {@link Ext.Button} configuration objects.
     * If an item is configured with <code>minWidth</code> or the Panel is configured with <code>minButtonWidth</code>,
     * that width will be applied to the item.
     */
    /**
     * @cfg {Object/String/Function} autoLoad
     * A valid url spec according to the Updater {@link Ext.Updater#update} method.
     * If autoLoad is not null, the panel will attempt to load its contents
     * immediately upon render.<p>
     * The URL will become the default URL for this panel's {@link #body} element,
     * so it may be {@link Ext.Element#refresh refresh}ed at any time.</p>
     */
    /**
     * @cfg {Boolean} frame
     * <code>false</code> by default to render with plain 1px square borders. <code>true</code> to render with
     * 9 elements, complete with custom rounded corners (also see {@link Ext.Element#boxWrap}).
     * <p>The template generated for each condition is depicted below:</p><pre><code>
     *
// frame = false
&lt;div id="developer-specified-id-goes-here" class="x-panel">

    &lt;div class="x-panel-header">&lt;span class="x-panel-header-text">Title: (frame:false)&lt;/span>&lt;/div>

    &lt;div class="x-panel-bwrap">
        &lt;div class="x-panel-body">&lt;p>html value goes here&lt;/p>&lt;/div>
    &lt;/div>
&lt;/div>

// frame = true (create 9 elements)
&lt;div id="developer-specified-id-goes-here" class="x-panel">
    &lt;div class="x-panel-tl">&lt;div class="x-panel-tr">&lt;div class="x-panel-tc">
        &lt;div class="x-panel-header">&lt;span class="x-panel-header-text">Title: (frame:true)&lt;/span>&lt;/div>
    &lt;/div>&lt;/div>&lt;/div>

    &lt;div class="x-panel-bwrap">
        &lt;div class="x-panel-ml">&lt;div class="x-panel-mr">&lt;div class="x-panel-mc">
            &lt;div class="x-panel-body">&lt;p>html value goes here&lt;/p>&lt;/div>
        &lt;/div>&lt;/div>&lt;/div>

        &lt;div class="x-panel-bl">&lt;div class="x-panel-br">&lt;div class="x-panel-bc"/>
        &lt;/div>&lt;/div>&lt;/div>
&lt;/div>
     * </code></pre>
     */
    /**
     * @cfg {Boolean} border
     * True to display the borders of the panel's body element, false to hide them (defaults to true).  By default,
     * the border is a 2px wide inset border, but this can be further altered by setting {@link #bodyBorder} to false.
     */
    /**
     * @cfg {Boolean} bodyBorder
     * True to display an interior border on the body element of the panel, false to hide it (defaults to true).
     * This only applies when {@link #border} == true.  If border == true and bodyBorder == false, the border will display
     * as a 1px wide inset border, giving the entire body element an inset appearance.
     */
    /**
     * @cfg {String/Object/Function} bodyCssClass
     * Additional css class selector to be applied to the {@link #body} element in the format expected by
     * {@link Ext.Element#addClass} (defaults to null). See {@link #bodyCfg}.
     */
    /**
     * @cfg {String/Object/Function} bodyStyle
     * Custom CSS styles to be applied to the {@link #body} element in the format expected by
     * {@link Ext.Element#applyStyles} (defaults to null). See {@link #bodyCfg}.
     */
    /**
     * @cfg {String} iconCls
     * The CSS class selector that specifies a background image to be used as the header icon (defaults to '').
     * <p>An example of specifying a custom icon class would be something like:
     * </p><pre><code>
// specify the property in the config for the class:
     ...
     iconCls: 'my-icon'

// css class that specifies background image to be used as the icon image:
.my-icon { background-image: url(../images/my-icon.gif) 0 6px no-repeat !important; }
</code></pre>
     */
    /**
     * @cfg {Boolean} collapsible
     * True to make the panel collapsible and have the expand/collapse toggle button automatically rendered into
     * the header tool button area, false to keep the panel statically sized with no button (defaults to false).
     */
    /**
     * @cfg {Array} tools
     * An array of tool button configs to be added to the header tool area. When rendered, each tool is
     * stored as an {@link Ext.Element Element} referenced by a public property called <code><b></b>tools.<i>&lt;tool-type&gt;</i></code>
     * <p>Each tool config may contain the following properties:
     * <div class="mdetail-params"><ul>
     * <li><b>id</b> : String<div class="sub-desc"><b>Required.</b> The type
     * of tool to create. By default, this assigns a CSS class of the form <code>x-tool-<i>&lt;tool-type&gt;</i></code> to the
     * resulting tool Element. Ext provides CSS rules, and an icon sprite containing images for the tool types listed below.
     * The developer may implement custom tools by supplying alternate CSS rules and background images:
     * <ul>
     * <div class="x-tool x-tool-toggle" style="float:left; margin-right:5;"> </div><div><code> toggle</code> (Created by default when {@link #collapsible} is <code>true</code>)</div>
     * <div class="x-tool x-tool-close" style="float:left; margin-right:5;"> </div><div><code> close</code></div>
     * <div class="x-tool x-tool-minimize" style="float:left; margin-right:5;"> </div><div><code> minimize</code></div>
     * <div class="x-tool x-tool-maximize" style="float:left; margin-right:5;"> </div><div><code> maximize</code></div>
     * <div class="x-tool x-tool-restore" style="float:left; margin-right:5;"> </div><div><code> restore</code></div>
     * <div class="x-tool x-tool-gear" style="float:left; margin-right:5;"> </div><div><code> gear</code></div>
     * <div class="x-tool x-tool-pin" style="float:left; margin-right:5;"> </div><div><code> pin</code></div>
     * <div class="x-tool x-tool-unpin" style="float:left; margin-right:5;"> </div><div><code> unpin</code></div>
     * <div class="x-tool x-tool-right" style="float:left; margin-right:5;"> </div><div><code> right</code></div>
     * <div class="x-tool x-tool-left" style="float:left; margin-right:5;"> </div><div><code> left</code></div>
     * <div class="x-tool x-tool-up" style="float:left; margin-right:5;"> </div><div><code> up</code></div>
     * <div class="x-tool x-tool-down" style="float:left; margin-right:5;"> </div><div><code> down</code></div>
     * <div class="x-tool x-tool-refresh" style="float:left; margin-right:5;"> </div><div><code> refresh</code></div>
     * <div class="x-tool x-tool-minus" style="float:left; margin-right:5;"> </div><div><code> minus</code></div>
     * <div class="x-tool x-tool-plus" style="float:left; margin-right:5;"> </div><div><code> plus</code></div>
     * <div class="x-tool x-tool-help" style="float:left; margin-right:5;"> </div><div><code> help</code></div>
     * <div class="x-tool x-tool-search" style="float:left; margin-right:5;"> </div><div><code> search</code></div>
     * <div class="x-tool x-tool-save" style="float:left; margin-right:5;"> </div><div><code> save</code></div>
     * <div class="x-tool x-tool-print" style="float:left; margin-right:5;"> </div><div><code> print</code></div>
     * </ul></div></li>
     * <li><b>handler</b> : Function<div class="sub-desc"><b>Required.</b> The function to
     * call when clicked. Arguments passed are:<ul>
     * <li><b>event</b> : Ext.EventObject<div class="sub-desc">The click event.</div></li>
     * <li><b>toolEl</b> : Ext.Element<div class="sub-desc">The tool Element.</div></li>
     * <li><b>panel</b> : Ext.Panel<div class="sub-desc">The host Panel</div></li>
     * <li><b>tc</b> : Object<div class="sub-desc">The tool configuration object</div></li>
     * </ul></div></li>
     * <li><b>stopEvent</b> : Boolean<div class="sub-desc">Defaults to true. Specify as false to allow click event to propagate.</div></li>
     * <li><b>scope</b> : Object<div class="sub-desc">The scope in which to call the handler.</div></li>
     * <li><b>qtip</b> : String/Object<div class="sub-desc">A tip string, or
     * a config argument to {@link Ext.QuickTip#register}</div></li>
     * <li><b>hidden</b> : Boolean<div class="sub-desc">True to initially render hidden.</div></li>
     * <li><b>on</b> : Object<div class="sub-desc">A listener config object specifiying
     * event listeners in the format of an argument to {@link #addListener}</div></li>
     * </ul></div>
     * <p>Note that, apart from the toggle tool which is provided when a panel is collapsible, these
     * tools only provide the visual button. Any required functionality must be provided by adding
     * handlers that implement the necessary behavior.</p>
     * <p>Example usage:</p>
     * <pre><code>
tools:[{
    id:'refresh',
    qtip: 'Refresh form Data',
    // hidden:true,
    handler: function(event, toolEl, panel){
        // refresh logic
    }
},
{
    id:'help',
    qtip: 'Get Help',
    handler: function(event, toolEl, panel){
        // whatever
    }
}]
</code></pre>
     * <p>For the custom id of <code>'help'</code> define two relevant css classes with a link to
     * a 15x15 image:</p>
     * <pre><code>
.x-tool-help {background-image: url(images/help.png);}
.x-tool-help-over {background-image: url(images/help_over.png);}
// if using an image sprite:
.x-tool-help {background-image: url(images/help.png) no-repeat 0 0;}
.x-tool-help-over {background-position:-15px 0;}
</code></pre>
     */
    /**
     * @cfg {Ext.Template/Ext.XTemplate} toolTemplate
     * <p>A Template used to create {@link #tools} in the {@link #header} Element. Defaults to:</p><pre><code>
new Ext.Template('&lt;div class="x-tool x-tool-{id}">&amp;#160;&lt;/div>')</code></pre>
     * <p>This may may be overridden to provide a custom DOM structure for tools based upon a more
     * complex XTemplate. The template's data is a single tool configuration object (Not the entire Array)
     * as specified in {@link #tools}.  In the following example an &lt;a> tag is used to provide a
     * visual indication when hovering over the tool:</p><pre><code>
var win = new Ext.Window({
    tools: [{
        id: 'download',
        href: '/MyPdfDoc.pdf'
    }],
    toolTemplate: new Ext.XTemplate(
        '&lt;tpl if="id==\'download\'">',
            '&lt;a class="x-tool x-tool-pdf" href="{href}">&lt;/a>',
        '&lt;/tpl>',
        '&lt;tpl if="id!=\'download\'">',
            '&lt;div class="x-tool x-tool-{id}">&amp;#160;&lt;/div>',
        '&lt;/tpl>'
    ),
    width:500,
    height:300,
    closeAction:'hide'
});</code></pre>
     * <p>Note that the CSS class 'x-tool-pdf' should have an associated style rule which provides an
     * appropriate background image, something like:</p>
    <pre><code>
    a.x-tool-pdf {background-image: url(../shared/extjs/images/pdf.gif)!important;}
    </code></pre>
     */
    /**
     * @cfg {Boolean} hideCollapseTool
     * <code>true</code> to hide the expand/collapse toggle button when <code>{@link #collapsible} == true</code>,
     * <code>false</code> to display it (defaults to <code>false</code>).
     */
    /**
     * @cfg {Boolean} titleCollapse
     * <code>true</code> to allow expanding and collapsing the panel (when <code>{@link #collapsible} = true</code>)
     * by clicking anywhere in the header bar, <code>false</code>) to allow it only by clicking to tool button
     * (defaults to <code>false</code>)). If this panel is a child item of a border layout also see the
     * {@link Ext.layout.BorderLayout.Region BorderLayout.Region}
     * <code>{@link Ext.layout.BorderLayout.Region#floatable floatable}</code> config option.
     */

    /**
     * @cfg {Mixed} floating
     * <p>This property is used to configure the underlying {@link Ext.Layer}. Acceptable values for this
     * configuration property are:</p><div class="mdetail-params"><ul>
     * <li><b><code>false</code></b> : <b>Default.</b><div class="sub-desc">Display the panel inline where it is
     * rendered.</div></li>
     * <li><b><code>true</code></b> : <div class="sub-desc">Float the panel (absolute position it with automatic
     * shimming and shadow).<ul>
     * <div class="sub-desc">Setting floating to true will create an Ext.Layer for this panel and display the
     * panel at negative offsets so that it is hidden.</div>
     * <div class="sub-desc">Since the panel will be absolute positioned, the position must be set explicitly
     * <i>after</i> render (e.g., <code>myPanel.setPosition(100,100);</code>).</div>
     * <div class="sub-desc"><b>Note</b>: when floating a panel you should always assign a fixed width,
     * otherwise it will be auto width and will expand to fill to the right edge of the viewport.</div>
     * </ul></div></li>
     * <li><b><code>{@link Ext.Layer object}</code></b> : <div class="sub-desc">The specified object will be used
     * as the configuration object for the {@link Ext.Layer} that will be created.</div></li>
     * </ul></div>
     */
    /**
     * @cfg {Boolean/String} shadow
     * <code>true</code> (or a valid Ext.Shadow {@link Ext.Shadow#mode} value) to display a shadow behind the
     * panel, <code>false</code> to display no shadow (defaults to <code>'sides'</code>).  Note that this option
     * only applies when <code>{@link #floating} = true</code>.
     */
    /**
     * @cfg {Number} shadowOffset
     * The number of pixels to offset the shadow if displayed (defaults to <code>4</code>). Note that this
     * option only applies when <code>{@link #floating} = true</code>.
     */
    /**
     * @cfg {Boolean} shim
     * <code>false</code> to disable the iframe shim in browsers which need one (defaults to <code>true</code>).
     * Note that this option only applies when <code>{@link #floating} = true</code>.
     */
    /**
     * @cfg {Object/Array} keys
     * A {@link Ext.KeyMap} config object (in the format expected by {@link Ext.KeyMap#addBinding}
     * used to assign custom key handling to this panel (defaults to <code>null</code>).
     */
    /**
     * @cfg {Boolean/Object} draggable
     * <p><code>true</code> to enable dragging of this Panel (defaults to <code>false</code>).</p>
     * <p>For custom drag/drop implementations, an <b>Ext.Panel.DD</b> config could also be passed
     * in this config instead of <code>true</code>. Ext.Panel.DD is an internal, undocumented class which
     * moves a proxy Element around in place of the Panel's element, but provides no other behaviour
     * during dragging or on drop. It is a subclass of {@link Ext.dd.DragSource}, so behaviour may be
     * added by implementing the interface methods of {@link Ext.dd.DragDrop} e.g.:
     * <pre><code>
new Ext.Panel({
    title: 'Drag me',
    x: 100,
    y: 100,
    renderTo: Ext.getBody(),
    floating: true,
    frame: true,
    width: 400,
    height: 200,
    draggable: {
//      Config option of Ext.Panel.DD class.
//      It&#39;s a floating Panel, so do not show a placeholder proxy in the original position.
        insertProxy: false,

//      Called for each mousemove event while dragging the DD object.
        onDrag : function(e){
//          Record the x,y position of the drag proxy so that we can
//          position the Panel at end of drag.
            var pel = this.proxy.getEl();
            this.x = pel.getLeft(true);
            this.y = pel.getTop(true);

//          Keep the Shadow aligned if there is one.
            var s = this.panel.getEl().shadow;
            if (s) {
                s.realign(this.x, this.y, pel.getWidth(), pel.getHeight());
            }
        },

//      Called on the mouseup event.
        endDrag : function(e){
            this.panel.setPosition(this.x, this.y);
        }
    }
}).show();
</code></pre>
     */
    /**
     * @cfg {Boolean} disabled
     * Render this panel disabled (default is <code>false</code>). An important note when using the disabled
     * config on panels is that IE will often fail to initialize the disabled mask element correectly if
     * the panel's layout has not yet completed by the time the Panel is disabled during the render process.
     * If you experience this issue, you may need to instead use the {@link #afterlayout} event to initialize
     * the disabled state:
     * <pre><code>
new Ext.Panel({
    ...
    listeners: {
        'afterlayout': {
            fn: function(p){
                p.disable();
            },
            single: true // important, as many layouts can occur
        }
    }
});
</code></pre>
     */
    /**
     * @cfg {Boolean} autoHeight
     * <code>true</code> to use height:'auto', <code>false</code> to use fixed height (defaults to <code>false</code>).
     * <b>Note</b>: Setting <code>autoHeight: true</code> means that the browser will manage the panel's height
     * based on its contents, and that Ext will not manage it at all. If the panel is within a layout that
     * manages dimensions (<code>fit</code>, <code>border</code>, etc.) then setting <code>autoHeight: true</code>
     * can cause issues with scrolling and will not generally work as expected since the panel will take
     * on the height of its contents rather than the height required by the Ext layout.
     */


    /**
     * @cfg {String} baseCls
     * The base CSS class to apply to this panel's element (defaults to <code>'x-panel'</code>).
     * <p>Another option available by default is to specify <code>'x-plain'</code> which strips all styling
     * except for required attributes for Ext layouts to function (e.g. overflow:hidden).
     * See <code>{@link #unstyled}</code> also.</p>
     */
    baseCls : 'x-panel',
    /**
     * @cfg {String} collapsedCls
     * A CSS class to add to the panel's element after it has been collapsed (defaults to
     * <code>'x-panel-collapsed'</code>).
     */
    collapsedCls : 'x-panel-collapsed',
    /**
     * @cfg {Boolean} maskDisabled
     * <code>true</code> to mask the panel when it is {@link #disabled}, <code>false</code> to not mask it (defaults
     * to <code>true</code>).  Either way, the panel will always tell its contained elements to disable themselves
     * when it is disabled, but masking the panel can provide an additional visual cue that the panel is
     * disabled.
     */
    maskDisabled : true,
    /**
     * @cfg {Boolean} animCollapse
     * <code>true</code> to animate the transition when the panel is collapsed, <code>false</code> to skip the
     * animation (defaults to <code>true</code> if the {@link Ext.Fx} class is available, otherwise <code>false</code>).
     */
    animCollapse : Ext.enableFx,
    /**
     * @cfg {Boolean} headerAsText
     * <code>true</code> to display the panel <code>{@link #title}</code> in the <code>{@link #header}</code>,
     * <code>false</code> to hide it (defaults to <code>true</code>).
     */
    headerAsText : true,
    /**
     * @cfg {String} buttonAlign
     * The alignment of any {@link #buttons} added to this panel.  Valid values are <code>'right'</code>,
     * <code>'left'</code> and <code>'center'</code> (defaults to <code>'right'</code>).
     */
    buttonAlign : 'right',
    /**
     * @cfg {Boolean} collapsed
     * <code>true</code> to render the panel collapsed, <code>false</code> to render it expanded (defaults to
     * <code>false</code>).
     */
    collapsed : false,
    /**
     * @cfg {Boolean} collapseFirst
     * <code>true</code> to make sure the collapse/expand toggle button always renders first (to the left of)
     * any other tools in the panel's title bar, <code>false</code> to render it last (defaults to <code>true</code>).
     */
    collapseFirst : true,
    /**
     * @cfg {Number} minButtonWidth
     * Minimum width in pixels of all {@link #buttons} in this panel (defaults to <code>75</code>)
     */
    minButtonWidth : 75,
    /**
     * @cfg {Boolean} unstyled
     * Overrides the <code>{@link #baseCls}</code> setting to <code>{@link #baseCls} = 'x-plain'</code> which renders
     * the panel unstyled except for required attributes for Ext layouts to function (e.g. overflow:hidden).
     */
    /**
     * @cfg {String} elements
     * A comma-delimited list of panel elements to initialize when the panel is rendered.  Normally, this list will be
     * generated automatically based on the items added to the panel at config time, but sometimes it might be useful to
     * make sure a structural element is rendered even if not specified at config time (for example, you may want
     * to add a button or toolbar dynamically after the panel has been rendered).  Adding those elements to this
     * list will allocate the required placeholders in the panel when it is rendered.  Valid values are<div class="mdetail-params"><ul>
     * <li><code>header</code></li>
     * <li><code>tbar</code> (top bar)</li>
     * <li><code>body</code></li>
     * <li><code>bbar</code> (bottom bar)</li>
     * <li><code>footer</code></li>
     * </ul></div>
     * Defaults to '<code>body</code>'.
     */
    elements : 'body',
    /**
     * @cfg {Boolean} preventBodyReset
     * Defaults to <code>false</code>.  When set to <code>true</code>, an extra css class <code>'x-panel-normal'</code>
     * will be added to the panel's element, effectively applying css styles suggested by the W3C
     * (see http://www.w3.org/TR/CSS21/sample.html) to the Panel's <b>body</b> element (not the header,
     * footer, etc.).
     */
    preventBodyReset : false,

    /**
     * @cfg {Number/String} padding
     * A shortcut for setting a padding style on the body element. The value can either be
     * a number to be applied to all sides, or a normal css string describing padding.
     * Defaults to <tt>undefined</tt>.
     *
     */
    padding: undefined,

    /** @cfg {String} resizeEvent
     * The event to listen to for resizing in layouts. Defaults to <tt>'bodyresize'</tt>.
     */
    resizeEvent: 'bodyresize',

    // protected - these could be used to customize the behavior of the window,
    // but changing them would not be useful without further mofifications and
    // could lead to unexpected or undesirable results.
    toolTarget : 'header',
    collapseEl : 'bwrap',
    slideAnchor : 't',
    disabledClass : '',

    // private, notify box this class will handle heights
    deferHeight : true,
    // private
    expandDefaults: {
        duration : 0.25
    },
    // private
    collapseDefaults : {
        duration : 0.25
    },

    // private
    initComponent : function(){
        Ext.Panel.superclass.initComponent.call(this);

        this.addEvents(
            /**
             * @event bodyresize
             * Fires after the Panel has been resized.
             * @param {Ext.Panel} p the Panel which has been resized.
             * @param {Number} width The Panel body's new width.
             * @param {Number} height The Panel body's new height.
             */
            'bodyresize',
            /**
             * @event titlechange
             * Fires after the Panel title has been {@link #title set} or {@link #setTitle changed}.
             * @param {Ext.Panel} p the Panel which has had its title changed.
             * @param {String} The new title.
             */
            'titlechange',
            /**
             * @event iconchange
             * Fires after the Panel icon class has been {@link #iconCls set} or {@link #setIconClass changed}.
             * @param {Ext.Panel} p the Panel which has had its {@link #iconCls icon class} changed.
             * @param {String} The new icon class.
             * @param {String} The old icon class.
             */
            'iconchange',
            /**
             * @event collapse
             * Fires after the Panel has been collapsed.
             * @param {Ext.Panel} p the Panel that has been collapsed.
             */
            'collapse',
            /**
             * @event expand
             * Fires after the Panel has been expanded.
             * @param {Ext.Panel} p The Panel that has been expanded.
             */
            'expand',
            /**
             * @event beforecollapse
             * Fires before the Panel is collapsed.  A handler can return false to cancel the collapse.
             * @param {Ext.Panel} p the Panel being collapsed.
             * @param {Boolean} animate True if the collapse is animated, else false.
             */
            'beforecollapse',
            /**
             * @event beforeexpand
             * Fires before the Panel is expanded.  A handler can return false to cancel the expand.
             * @param {Ext.Panel} p The Panel being expanded.
             * @param {Boolean} animate True if the expand is animated, else false.
             */
            'beforeexpand',
            /**
             * @event beforeclose
             * Fires before the Panel is closed.  Note that Panels do not directly support being closed, but some
             * Panel subclasses do (like {@link Ext.Window}) or a Panel within a Ext.TabPanel.  This event only
             * applies to such subclasses.
             * A handler can return false to cancel the close.
             * @param {Ext.Panel} p The Panel being closed.
             */
            'beforeclose',
            /**
             * @event close
             * Fires after the Panel is closed.  Note that Panels do not directly support being closed, but some
             * Panel subclasses do (like {@link Ext.Window}) or a Panel within a Ext.TabPanel.
             * @param {Ext.Panel} p The Panel that has been closed.
             */
            'close',
            /**
             * @event activate
             * Fires after the Panel has been visually activated.
             * Note that Panels do not directly support being activated, but some Panel subclasses
             * do (like {@link Ext.Window}). Panels which are child Components of a TabPanel fire the
             * activate and deactivate events under the control of the TabPanel.
             * @param {Ext.Panel} p The Panel that has been activated.
             */
            'activate',
            /**
             * @event deactivate
             * Fires after the Panel has been visually deactivated.
             * Note that Panels do not directly support being deactivated, but some Panel subclasses
             * do (like {@link Ext.Window}). Panels which are child Components of a TabPanel fire the
             * activate and deactivate events under the control of the TabPanel.
             * @param {Ext.Panel} p The Panel that has been deactivated.
             */
            'deactivate'
        );

        if(this.unstyled){
            this.baseCls = 'x-plain';
        }


        this.toolbars = [];
        // shortcuts
        if(this.tbar){
            this.elements += ',tbar';
            this.topToolbar = this.createToolbar(this.tbar);
            this.tbar = null;

        }
        if(this.bbar){
            this.elements += ',bbar';
            this.bottomToolbar = this.createToolbar(this.bbar);
            this.bbar = null;
        }

        if(this.header === true){
            this.elements += ',header';
            this.header = null;
        }else if(this.headerCfg || (this.title && this.header !== false)){
            this.elements += ',header';
        }

        if(this.footerCfg || this.footer === true){
            this.elements += ',footer';
            this.footer = null;
        }

        if(this.buttons){
            this.fbar = this.buttons;
            this.buttons = null;
        }
        if(this.fbar){
            this.createFbar(this.fbar);
        }
        if(this.autoLoad){
            this.on('render', this.doAutoLoad, this, {delay:10});
        }
    },

    // private
    createFbar : function(fbar){
        var min = this.minButtonWidth;
        this.elements += ',footer';
        this.fbar = this.createToolbar(fbar, {
            buttonAlign: this.buttonAlign,
            toolbarCls: 'x-panel-fbar',
            enableOverflow: false,
            defaults: function(c){
                return {
                    minWidth: c.minWidth || min
                };
            }
        });
        // @compat addButton and buttons could possibly be removed
        // @target 4.0
        /**
         * This Panel's Array of buttons as created from the <code>{@link #buttons}</code>
         * config property. Read only.
         * @type Array
         * @property buttons
         */
        this.fbar.items.each(function(c){
            c.minWidth = c.minWidth || this.minButtonWidth;
        }, this);
        this.buttons = this.fbar.items.items;
    },

    // private
    createToolbar: function(tb, options){
        var result;
        // Convert array to proper toolbar config
        if(Ext.isArray(tb)){
            tb = {
                items: tb
            };
        }
        result = tb.events ? Ext.apply(tb, options) : this.createComponent(Ext.apply({}, tb, options), 'toolbar');
        this.toolbars.push(result);
        return result;
    },

    // private
    createElement : function(name, pnode){
        if(this[name]){
            pnode.appendChild(this[name].dom);
            return;
        }

        if(name === 'bwrap' || this.elements.indexOf(name) != -1){
            if(this[name+'Cfg']){
                this[name] = Ext.fly(pnode).createChild(this[name+'Cfg']);
            }else{
                var el = document.createElement('div');
                el.className = this[name+'Cls'];
                this[name] = Ext.get(pnode.appendChild(el));
            }
            if(this[name+'CssClass']){
                this[name].addClass(this[name+'CssClass']);
            }
            if(this[name+'Style']){
                this[name].applyStyles(this[name+'Style']);
            }
        }
    },

    // private
    onRender : function(ct, position){
        Ext.Panel.superclass.onRender.call(this, ct, position);
        this.createClasses();

        var el = this.el,
            d = el.dom,
            bw,
            ts;


        if(this.collapsible && !this.hideCollapseTool){
            this.tools = this.tools ? this.tools.slice(0) : [];
            this.tools[this.collapseFirst?'unshift':'push']({
                id: 'toggle',
                handler : this.toggleCollapse,
                scope: this
            });
        }

        if(this.tools){
            ts = this.tools;
            this.elements += (this.header !== false) ? ',header' : '';
        }
        this.tools = {};

        el.addClass(this.baseCls);
        if(d.firstChild){ // existing markup
            this.header = el.down('.'+this.headerCls);
            this.bwrap = el.down('.'+this.bwrapCls);
            var cp = this.bwrap ? this.bwrap : el;
            this.tbar = cp.down('.'+this.tbarCls);
            this.body = cp.down('.'+this.bodyCls);
            this.bbar = cp.down('.'+this.bbarCls);
            this.footer = cp.down('.'+this.footerCls);
            this.fromMarkup = true;
        }
        if (this.preventBodyReset === true) {
            el.addClass('x-panel-reset');
        }
        if(this.cls){
            el.addClass(this.cls);
        }

        if(this.buttons){
            this.elements += ',footer';
        }

        // This block allows for maximum flexibility and performance when using existing markup

        // framing requires special markup
        if(this.frame){
            el.insertHtml('afterBegin', String.format(Ext.Element.boxMarkup, this.baseCls));

            this.createElement('header', d.firstChild.firstChild.firstChild);
            this.createElement('bwrap', d);

            // append the mid and bottom frame to the bwrap
            bw = this.bwrap.dom;
            var ml = d.childNodes[1], bl = d.childNodes[2];
            bw.appendChild(ml);
            bw.appendChild(bl);

            var mc = bw.firstChild.firstChild.firstChild;
            this.createElement('tbar', mc);
            this.createElement('body', mc);
            this.createElement('bbar', mc);
            this.createElement('footer', bw.lastChild.firstChild.firstChild);

            if(!this.footer){
                this.bwrap.dom.lastChild.className += ' x-panel-nofooter';
            }
            /*
             * Store a reference to this element so:
             * a) We aren't looking it up all the time
             * b) The last element is reported incorrectly when using a loadmask
             */
            this.ft = Ext.get(this.bwrap.dom.lastChild);
            this.mc = Ext.get(mc);
        }else{
            this.createElement('header', d);
            this.createElement('bwrap', d);

            // append the mid and bottom frame to the bwrap
            bw = this.bwrap.dom;
            this.createElement('tbar', bw);
            this.createElement('body', bw);
            this.createElement('bbar', bw);
            this.createElement('footer', bw);

            if(!this.header){
                this.body.addClass(this.bodyCls + '-noheader');
                if(this.tbar){
                    this.tbar.addClass(this.tbarCls + '-noheader');
                }
            }
        }

        if(Ext.isDefined(this.padding)){
            this.body.setStyle('padding', this.body.addUnits(this.padding));
        }

        if(this.border === false){
            this.el.addClass(this.baseCls + '-noborder');
            this.body.addClass(this.bodyCls + '-noborder');
            if(this.header){
                this.header.addClass(this.headerCls + '-noborder');
            }
            if(this.footer){
                this.footer.addClass(this.footerCls + '-noborder');
            }
            if(this.tbar){
                this.tbar.addClass(this.tbarCls + '-noborder');
            }
            if(this.bbar){
                this.bbar.addClass(this.bbarCls + '-noborder');
            }
        }

        if(this.bodyBorder === false){
           this.body.addClass(this.bodyCls + '-noborder');
        }

        this.bwrap.enableDisplayMode('block');

        if(this.header){
            this.header.unselectable();

            // for tools, we need to wrap any existing header markup
            if(this.headerAsText){
                this.header.dom.innerHTML =
                    '<span class="' + this.headerTextCls + '">'+this.header.dom.innerHTML+'</span>';

                if(this.iconCls){
                    this.setIconClass(this.iconCls);
                }
            }
        }

        if(this.floating){
            this.makeFloating(this.floating);
        }

        if(this.collapsible && this.titleCollapse && this.header){
            this.mon(this.header, 'click', this.toggleCollapse, this);
            this.header.setStyle('cursor', 'pointer');
        }
        if(ts){
            this.addTool.apply(this, ts);
        }

        // Render Toolbars.
        if(this.fbar){
            this.footer.addClass('x-panel-btns');
            this.fbar.ownerCt = this;
            this.fbar.render(this.footer);
            this.footer.createChild({cls:'x-clear'});
        }
        if(this.tbar && this.topToolbar){
            this.topToolbar.ownerCt = this;
            this.topToolbar.render(this.tbar);
        }
        if(this.bbar && this.bottomToolbar){
            this.bottomToolbar.ownerCt = this;
            this.bottomToolbar.render(this.bbar);
        }
    },

    /**
     * Sets the CSS class that provides the icon image for this panel.  This method will replace any existing
     * icon class if one has already been set and fire the {@link #iconchange} event after completion.
     * @param {String} cls The new CSS class name
     */
    setIconClass : function(cls){
        var old = this.iconCls;
        this.iconCls = cls;
        if(this.rendered && this.header){
            if(this.frame){
                this.header.addClass('x-panel-icon');
                this.header.replaceClass(old, this.iconCls);
            }else{
                var hd = this.header,
                    img = hd.child('img.x-panel-inline-icon');
                if(img){
                    Ext.fly(img).replaceClass(old, this.iconCls);
                }else{
                    var hdspan = hd.child('span.' + this.headerTextCls);
                    if (hdspan) {
                        Ext.DomHelper.insertBefore(hdspan.dom, {
                            tag:'img', alt: '', src: Ext.BLANK_IMAGE_URL, cls:'x-panel-inline-icon '+this.iconCls
                        });
                    }
                 }
            }
        }
        this.fireEvent('iconchange', this, cls, old);
    },

    // private
    makeFloating : function(cfg){
        this.floating = true;
        this.el = new Ext.Layer(Ext.apply({}, cfg, {
            shadow: Ext.isDefined(this.shadow) ? this.shadow : 'sides',
            shadowOffset: this.shadowOffset,
            constrain:false,
            shim: this.shim === false ? false : undefined
        }), this.el);
    },

    /**
     * Returns the {@link Ext.Toolbar toolbar} from the top (<code>{@link #tbar}</code>) section of the panel.
     * @return {Ext.Toolbar} The toolbar
     */
    getTopToolbar : function(){
        return this.topToolbar;
    },

    /**
     * Returns the {@link Ext.Toolbar toolbar} from the bottom (<code>{@link #bbar}</code>) section of the panel.
     * @return {Ext.Toolbar} The toolbar
     */
    getBottomToolbar : function(){
        return this.bottomToolbar;
    },

    /**
     * Returns the {@link Ext.Toolbar toolbar} from the footer (<code>{@link #fbar}</code>) section of the panel.
     * @return {Ext.Toolbar} The toolbar
     */
    getFooterToolbar : function() {
        return this.fbar;
    },

    /**
     * Adds a button to this panel.  Note that this method must be called prior to rendering.  The preferred
     * approach is to add buttons via the {@link #buttons} config.
     * @param {String/Object} config A valid {@link Ext.Button} config.  A string will become the text for a default
     * button config, an object will be treated as a button config object.
     * @param {Function} handler The function to be called on button {@link Ext.Button#click}
     * @param {Object} scope The scope (<code>this</code> reference) in which the button handler function is executed. Defaults to the Button.
     * @return {Ext.Button} The button that was added
     */
    addButton : function(config, handler, scope){
        if(!this.fbar){
            this.createFbar([]);
        }
        if(handler){
            if(Ext.isString(config)){
                config = {text: config};
            }
            config = Ext.apply({
                handler: handler,
                scope: scope
            }, config);
        }
        return this.fbar.add(config);
    },

    // private
    addTool : function(){
        if(!this.rendered){
            if(!this.tools){
                this.tools = [];
            }
            Ext.each(arguments, function(arg){
                this.tools.push(arg);
            }, this);
            return;
        }
         // nowhere to render tools!
        if(!this[this.toolTarget]){
            return;
        }
        if(!this.toolTemplate){
            // initialize the global tool template on first use
            var tt = new Ext.Template(
                 '<div class="x-tool x-tool-{id}">&#160;</div>'
            );
            tt.disableFormats = true;
            tt.compile();
            Ext.Panel.prototype.toolTemplate = tt;
        }
        for(var i = 0, a = arguments, len = a.length; i < len; i++) {
            var tc = a[i];
            if(!this.tools[tc.id]){
                var overCls = 'x-tool-'+tc.id+'-over';
                var t = this.toolTemplate.insertFirst(this[this.toolTarget], tc, true);
                this.tools[tc.id] = t;
                t.enableDisplayMode('block');
                this.mon(t, 'click',  this.createToolHandler(t, tc, overCls, this));
                if(tc.on){
                    this.mon(t, tc.on);
                }
                if(tc.hidden){
                    t.hide();
                }
                if(tc.qtip){
                    if(Ext.isObject(tc.qtip)){
                        Ext.QuickTips.register(Ext.apply({
                              target: t.id
                        }, tc.qtip));
                    } else {
                        t.dom.qtip = tc.qtip;
                    }
                }
                t.addClassOnOver(overCls);
            }
        }
    },

    onLayout : function(shallow, force){
        Ext.Panel.superclass.onLayout.apply(this, arguments);
        if(this.hasLayout && this.toolbars.length > 0){
            Ext.each(this.toolbars, function(tb){
                tb.doLayout(undefined, force);
            });
            this.syncHeight();
        }
    },

    syncHeight : function(){
        var h = this.toolbarHeight,
                bd = this.body,
                lsh = this.lastSize.height,
                sz;

        if(this.autoHeight || !Ext.isDefined(lsh) || lsh == 'auto'){
            return;
        }


        if(h != this.getToolbarHeight()){
            h = Math.max(0, lsh - this.getFrameHeight());
            bd.setHeight(h);
            sz = bd.getSize();
            this.toolbarHeight = this.getToolbarHeight();
            this.onBodyResize(sz.width, sz.height);
        }
    },

    // private
    onShow : function(){
        if(this.floating){
            return this.el.show();
        }
        Ext.Panel.superclass.onShow.call(this);
    },

    // private
    onHide : function(){
        if(this.floating){
            return this.el.hide();
        }
        Ext.Panel.superclass.onHide.call(this);
    },

    // private
    createToolHandler : function(t, tc, overCls, panel){
        return function(e){
            t.removeClass(overCls);
            if(tc.stopEvent !== false){
                e.stopEvent();
            }
            if(tc.handler){
                tc.handler.call(tc.scope || t, e, t, panel, tc);
            }
        };
    },

    // private
    afterRender : function(){
        if(this.floating && !this.hidden){
            this.el.show();
        }
        if(this.title){
            this.setTitle(this.title);
        }
        Ext.Panel.superclass.afterRender.call(this); // do sizing calcs last
        if (this.collapsed) {
            this.collapsed = false;
            this.collapse(false);
        }
        this.initEvents();
    },

    // private
    getKeyMap : function(){
        if(!this.keyMap){
            this.keyMap = new Ext.KeyMap(this.el, this.keys);
        }
        return this.keyMap;
    },

    // private
    initEvents : function(){
        if(this.keys){
            this.getKeyMap();
        }
        if(this.draggable){
            this.initDraggable();
        }
        if(this.toolbars.length > 0){
            Ext.each(this.toolbars, function(tb){
                tb.doLayout();
                tb.on({
                    scope: this,
                    afterlayout: this.syncHeight,
                    remove: this.syncHeight
                });
            }, this);
            this.syncHeight();
        }

    },

    // private
    initDraggable : function(){
        /**
         * <p>If this Panel is configured {@link #draggable}, this property will contain
         * an instance of {@link Ext.dd.DragSource} which handles dragging the Panel.</p>
         * The developer must provide implementations of the abstract methods of {@link Ext.dd.DragSource}
         * in order to supply behaviour for each stage of the drag/drop process. See {@link #draggable}.
         * @type Ext.dd.DragSource.
         * @property dd
         */
        this.dd = new Ext.Panel.DD(this, Ext.isBoolean(this.draggable) ? null : this.draggable);
    },

    // private
    beforeEffect : function(anim){
        if(this.floating){
            this.el.beforeAction();
        }
        if(anim !== false){
            this.el.addClass('x-panel-animated');
        }
    },

    // private
    afterEffect : function(anim){
        this.syncShadow();
        this.el.removeClass('x-panel-animated');
    },

    // private - wraps up an animation param with internal callbacks
    createEffect : function(a, cb, scope){
        var o = {
            scope:scope,
            block:true
        };
        if(a === true){
            o.callback = cb;
            return o;
        }else if(!a.callback){
            o.callback = cb;
        }else { // wrap it up
            o.callback = function(){
                cb.call(scope);
                Ext.callback(a.callback, a.scope);
            };
        }
        return Ext.applyIf(o, a);
    },

    /**
     * Collapses the panel body so that it becomes hidden.  Fires the {@link #beforecollapse} event which will
     * cancel the collapse action if it returns false.
     * @param {Boolean} animate True to animate the transition, else false (defaults to the value of the
     * {@link #animCollapse} panel config)
     * @return {Ext.Panel} this
     */
    collapse : function(animate){
        if(this.collapsed || this.el.hasFxBlock() || this.fireEvent('beforecollapse', this, animate) === false){
            return;
        }
        var doAnim = animate === true || (animate !== false && this.animCollapse);
        this.beforeEffect(doAnim);
        this.onCollapse(doAnim, animate);
        return this;
    },

    // private
    onCollapse : function(doAnim, animArg){
        if(doAnim){
            this[this.collapseEl].slideOut(this.slideAnchor,
                    Ext.apply(this.createEffect(animArg||true, this.afterCollapse, this),
                        this.collapseDefaults));
        }else{
            this[this.collapseEl].hide(this.hideMode);
            this.afterCollapse(false);
        }
    },

    // private
    afterCollapse : function(anim){
        this.collapsed = true;
        this.el.addClass(this.collapsedCls);
        if(anim !== false){
            this[this.collapseEl].hide(this.hideMode);
        }
        this.afterEffect(anim);

        // Reset lastSize of all sub-components so they KNOW they are in a collapsed container
        this.cascade(function(c) {
            if (c.lastSize) {
                c.lastSize = { width: undefined, height: undefined };
            }
        });
        this.fireEvent('collapse', this);
    },

    /**
     * Expands the panel body so that it becomes visible.  Fires the {@link #beforeexpand} event which will
     * cancel the expand action if it returns false.
     * @param {Boolean} animate True to animate the transition, else false (defaults to the value of the
     * {@link #animCollapse} panel config)
     * @return {Ext.Panel} this
     */
    expand : function(animate){
        if(!this.collapsed || this.el.hasFxBlock() || this.fireEvent('beforeexpand', this, animate) === false){
            return;
        }
        var doAnim = animate === true || (animate !== false && this.animCollapse);
        this.el.removeClass(this.collapsedCls);
        this.beforeEffect(doAnim);
        this.onExpand(doAnim, animate);
        return this;
    },

    // private
    onExpand : function(doAnim, animArg){
        if(doAnim){
            this[this.collapseEl].slideIn(this.slideAnchor,
                    Ext.apply(this.createEffect(animArg||true, this.afterExpand, this),
                        this.expandDefaults));
        }else{
            this[this.collapseEl].show(this.hideMode);
            this.afterExpand(false);
        }
    },

    // private
    afterExpand : function(anim){
        this.collapsed = false;
        if(anim !== false){
            this[this.collapseEl].show(this.hideMode);
        }
        this.afterEffect(anim);
        if (this.deferLayout) {
            delete this.deferLayout;
            this.doLayout(true);
        }
        this.fireEvent('expand', this);
    },

    /**
     * Shortcut for performing an {@link #expand} or {@link #collapse} based on the current state of the panel.
     * @param {Boolean} animate True to animate the transition, else false (defaults to the value of the
     * {@link #animCollapse} panel config)
     * @return {Ext.Panel} this
     */
    toggleCollapse : function(animate){
        this[this.collapsed ? 'expand' : 'collapse'](animate);
        return this;
    },

    // private
    onDisable : function(){
        if(this.rendered && this.maskDisabled){
            this.el.mask();
        }
        Ext.Panel.superclass.onDisable.call(this);
    },

    // private
    onEnable : function(){
        if(this.rendered && this.maskDisabled){
            this.el.unmask();
        }
        Ext.Panel.superclass.onEnable.call(this);
    },

    // private
    onResize : function(adjWidth, adjHeight, rawWidth, rawHeight){
        var w = adjWidth,
            h = adjHeight;

        if(Ext.isDefined(w) || Ext.isDefined(h)){
            if(!this.collapsed){
                // First, set the the Panel's body width.
                // If we have auto-widthed it, get the resulting full offset width so we can size the Toolbars to match
                // The Toolbars must not buffer this resize operation because we need to know their heights.

                if(Ext.isNumber(w)){
                    this.body.setWidth(w = this.adjustBodyWidth(w - this.getFrameWidth()));
                } else if (w == 'auto') {
                    w = this.body.setWidth('auto').dom.offsetWidth;
                } else {
                    w = this.body.dom.offsetWidth;
                }

                if(this.tbar){
                    this.tbar.setWidth(w);
                    if(this.topToolbar){
                        this.topToolbar.setSize(w);
                    }
                }
                if(this.bbar){
                    this.bbar.setWidth(w);
                    if(this.bottomToolbar){
                        this.bottomToolbar.setSize(w);
                        // The bbar does not move on resize without this.
                        if (Ext.isIE) {
                            this.bbar.setStyle('position', 'static');
                            this.bbar.setStyle('position', '');
                        }
                    }
                }
                if(this.footer){
                    this.footer.setWidth(w);
                    if(this.fbar){
                        this.fbar.setSize(Ext.isIE ? (w - this.footer.getFrameWidth('lr')) : 'auto');
                    }
                }

                // At this point, the Toolbars must be layed out for getFrameHeight to find a result.
                if(Ext.isNumber(h)){
                    h = Math.max(0, h - this.getFrameHeight());
                    //h = Math.max(0, h - (this.getHeight() - this.body.getHeight()));
                    this.body.setHeight(h);
                }else if(h == 'auto'){
                    this.body.setHeight(h);
                }

                if(this.disabled && this.el._mask){
                    this.el._mask.setSize(this.el.dom.clientWidth, this.el.getHeight());
                }
            }else{
                // Adds an event to set the correct height afterExpand.  This accounts for the deferHeight flag in panel
                this.queuedBodySize = {width: w, height: h};
                if(!this.queuedExpand && this.allowQueuedExpand !== false){
                    this.queuedExpand = true;
                    this.on('expand', function(){
                        delete this.queuedExpand;
                        this.onResize(this.queuedBodySize.width, this.queuedBodySize.height);
                    }, this, {single:true});
                }
            }
            this.onBodyResize(w, h);
        }
        this.syncShadow();
        Ext.Panel.superclass.onResize.call(this, adjWidth, adjHeight, rawWidth, rawHeight);

    },

    // private
    onBodyResize: function(w, h){
        this.fireEvent('bodyresize', this, w, h);
    },

    // private
    getToolbarHeight: function(){
        var h = 0;
        if(this.rendered){
            Ext.each(this.toolbars, function(tb){
                h += tb.getHeight();
            }, this);
        }
        return h;
    },

    // deprecate
    adjustBodyHeight : function(h){
        return h;
    },

    // private
    adjustBodyWidth : function(w){
        return w;
    },

    // private
    onPosition : function(){
        this.syncShadow();
    },

    /**
     * Returns the width in pixels of the framing elements of this panel (not including the body width).  To
     * retrieve the body width see {@link #getInnerWidth}.
     * @return {Number} The frame width
     */
    getFrameWidth : function(){
        var w = this.el.getFrameWidth('lr') + this.bwrap.getFrameWidth('lr');

        if(this.frame){
            var l = this.bwrap.dom.firstChild;
            w += (Ext.fly(l).getFrameWidth('l') + Ext.fly(l.firstChild).getFrameWidth('r'));
            w += this.mc.getFrameWidth('lr');
        }
        return w;
    },

    /**
     * Returns the height in pixels of the framing elements of this panel (including any top and bottom bars and
     * header and footer elements, but not including the body height).  To retrieve the body height see {@link #getInnerHeight}.
     * @return {Number} The frame height
     */
    getFrameHeight : function() {
        var h  = this.el.getFrameWidth('tb') + this.bwrap.getFrameWidth('tb');
        h += (this.tbar ? this.tbar.getHeight() : 0) +
             (this.bbar ? this.bbar.getHeight() : 0);

        if(this.frame){
            h += this.el.dom.firstChild.offsetHeight + this.ft.dom.offsetHeight + this.mc.getFrameWidth('tb');
        }else{
            h += (this.header ? this.header.getHeight() : 0) +
                (this.footer ? this.footer.getHeight() : 0);
        }
        return h;
    },

    /**
     * Returns the width in pixels of the body element (not including the width of any framing elements).
     * For the frame width see {@link #getFrameWidth}.
     * @return {Number} The body width
     */
    getInnerWidth : function(){
        return this.getSize().width - this.getFrameWidth();
    },

    /**
     * Returns the height in pixels of the body element (not including the height of any framing elements).
     * For the frame height see {@link #getFrameHeight}.
     * @return {Number} The body height
     */
    getInnerHeight : function(){
        return this.body.getHeight();
        /* Deprecate
            return this.getSize().height - this.getFrameHeight();
        */
    },

    // private
    syncShadow : function(){
        if(this.floating){
            this.el.sync(true);
        }
    },

    // private
    getLayoutTarget : function(){
        return this.body;
    },

    // private
    getContentTarget : function(){
        return this.body;
    },

    /**
     * <p>Sets the title text for the panel and optionally the {@link #iconCls icon class}.</p>
     * <p>In order to be able to set the title, a header element must have been created
     * for the Panel. This is triggered either by configuring the Panel with a non-blank <code>{@link #title}</code>,
     * or configuring it with <code><b>{@link #header}: true</b></code>.</p>
     * @param {String} title The title text to set
     * @param {String} iconCls (optional) {@link #iconCls iconCls} A user-defined CSS class that provides the icon image for this panel
     */
    setTitle : function(title, iconCls){
        this.title = title;
        if(this.header && this.headerAsText){
            this.header.child('span').update(title);
        }
        if(iconCls){
            this.setIconClass(iconCls);
        }
        this.fireEvent('titlechange', this, title);
        return this;
    },

    /**
     * Get the {@link Ext.Updater} for this panel. Enables you to perform Ajax updates of this panel's body.
     * @return {Ext.Updater} The Updater
     */
    getUpdater : function(){
        return this.body.getUpdater();
    },

     /**
     * Loads this content panel immediately with content returned from an XHR call.
     * @param {Object/String/Function} config A config object containing any of the following options:
<pre><code>
panel.load({
    url: 'your-url.php',
    params: {param1: 'foo', param2: 'bar'}, // or a URL encoded string
    callback: yourFunction,
    scope: yourObject, // optional scope for the callback
    discardUrl: false,
    nocache: false,
    text: 'Loading...',
    timeout: 30,
    scripts: false
});
</code></pre>
     * The only required property is url. The optional properties nocache, text and scripts
     * are shorthand for disableCaching, indicatorText and loadScripts and are used to set their
     * associated property on this panel Updater instance.
     * @return {Ext.Panel} this
     */
    load : function(){
        var um = this.body.getUpdater();
        um.update.apply(um, arguments);
        return this;
    },

    // private
    beforeDestroy : function(){
        Ext.Panel.superclass.beforeDestroy.call(this);
        if(this.header){
            this.header.removeAllListeners();
        }
        if(this.tools){
            for(var k in this.tools){
                Ext.destroy(this.tools[k]);
            }
        }
        if(this.toolbars.length > 0){
            Ext.each(this.toolbars, function(tb){
                tb.un('afterlayout', this.syncHeight, this);
                tb.un('remove', this.syncHeight, this);
            }, this);
        }
        if(Ext.isArray(this.buttons)){
            while(this.buttons.length) {
                Ext.destroy(this.buttons[0]);
            }
        }
        if(this.rendered){
            Ext.destroy(
                this.ft,
                this.header,
                this.footer,
                this.tbar,
                this.bbar,
                this.body,
                this.mc,
                this.bwrap,
                this.dd
            );
            if (this.fbar) {
                Ext.destroy(
                    this.fbar,
                    this.fbar.el
                );
            }
        }
        Ext.destroy(this.toolbars);
    },

    // private
    createClasses : function(){
        this.headerCls = this.baseCls + '-header';
        this.headerTextCls = this.baseCls + '-header-text';
        this.bwrapCls = this.baseCls + '-bwrap';
        this.tbarCls = this.baseCls + '-tbar';
        this.bodyCls = this.baseCls + '-body';
        this.bbarCls = this.baseCls + '-bbar';
        this.footerCls = this.baseCls + '-footer';
    },

    // private
    createGhost : function(cls, useShim, appendTo){
        var el = document.createElement('div');
        el.className = 'x-panel-ghost ' + (cls ? cls : '');
        if(this.header){
            el.appendChild(this.el.dom.firstChild.cloneNode(true));
        }
        Ext.fly(el.appendChild(document.createElement('ul'))).setHeight(this.bwrap.getHeight());
        el.style.width = this.el.dom.offsetWidth + 'px';;
        if(!appendTo){
            this.container.dom.appendChild(el);
        }else{
            Ext.getDom(appendTo).appendChild(el);
        }
        if(useShim !== false && this.el.useShim !== false){
            var layer = new Ext.Layer({shadow:false, useDisplay:true, constrain:false}, el);
            layer.show();
            return layer;
        }else{
            return new Ext.Element(el);
        }
    },

    // private
    doAutoLoad : function(){
        var u = this.body.getUpdater();
        if(this.renderer){
            u.setRenderer(this.renderer);
        }
        u.update(Ext.isObject(this.autoLoad) ? this.autoLoad : {url: this.autoLoad});
    },

    /**
     * Retrieve a tool by id.
     * @param {String} id
     * @return {Object} tool
     */
    getTool : function(id) {
        return this.tools[id];
    }

/**
 * @cfg {String} autoEl @hide
 */
});
Ext.reg('panel', Ext.Panel);
/**
 * @class Ext.Editor
 * @extends Ext.Component
 * A base editor field that handles displaying/hiding on demand and has some built-in sizing and event handling logic.
 * @constructor
 * Create a new Editor
 * @param {Object} config The config object
 * @xtype editor
 */
Ext.Editor = function(field, config){
    if(field.field){
        this.field = Ext.create(field.field, 'textfield');
        config = Ext.apply({}, field); // copy so we don't disturb original config
        delete config.field;
    }else{
        this.field = field;
    }
    Ext.Editor.superclass.constructor.call(this, config);
};

Ext.extend(Ext.Editor, Ext.Component, {
    /**
    * @cfg {Ext.form.Field} field
    * The Field object (or descendant) or config object for field
    */
    /**
     * @cfg {Boolean} allowBlur
     * True to {@link #completeEdit complete the editing process} if in edit mode when the
     * field is blurred. Defaults to <tt>true</tt>.
     */
    allowBlur: true,
    /**
     * @cfg {Boolean/String} autoSize
     * True for the editor to automatically adopt the size of the underlying field, "width" to adopt the width only,
     * or "height" to adopt the height only, "none" to always use the field dimensions. (defaults to false)
     */
    /**
     * @cfg {Boolean} revertInvalid
     * True to automatically revert the field value and cancel the edit when the user completes an edit and the field
     * validation fails (defaults to true)
     */
    /**
     * @cfg {Boolean} ignoreNoChange
     * True to skip the edit completion process (no save, no events fired) if the user completes an edit and
     * the value has not changed (defaults to false).  Applies only to string values - edits for other data types
     * will never be ignored.
     */
    /**
     * @cfg {Boolean} hideEl
     * False to keep the bound element visible while the editor is displayed (defaults to true)
     */
    /**
     * @cfg {Mixed} value
     * The data value of the underlying field (defaults to "")
     */
    value : "",
    /**
     * @cfg {String} alignment
     * The position to align to (see {@link Ext.Element#alignTo} for more details, defaults to "c-c?").
     */
    alignment: "c-c?",
    /**
     * @cfg {Array} offsets
     * The offsets to use when aligning (see {@link Ext.Element#alignTo} for more details. Defaults to <tt>[0, 0]</tt>.
     */
    offsets: [0, 0],
    /**
     * @cfg {Boolean/String} shadow "sides" for sides/bottom only, "frame" for 4-way shadow, and "drop"
     * for bottom-right shadow (defaults to "frame")
     */
    shadow : "frame",
    /**
     * @cfg {Boolean} constrain True to constrain the editor to the viewport
     */
    constrain : false,
    /**
     * @cfg {Boolean} swallowKeys Handle the keydown/keypress events so they don't propagate (defaults to true)
     */
    swallowKeys : true,
    /**
     * @cfg {Boolean} completeOnEnter True to complete the edit when the enter key is pressed. Defaults to <tt>true</tt>.
     */
    completeOnEnter : true,
    /**
     * @cfg {Boolean} cancelOnEsc True to cancel the edit when the escape key is pressed. Defaults to <tt>true</tt>.
     */
    cancelOnEsc : true,
    /**
     * @cfg {Boolean} updateEl True to update the innerHTML of the bound element when the update completes (defaults to false)
     */
    updateEl : false,

    initComponent : function(){
        Ext.Editor.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event beforestartedit
             * Fires when editing is initiated, but before the value changes.  Editing can be canceled by returning
             * false from the handler of this event.
             * @param {Editor} this
             * @param {Ext.Element} boundEl The underlying element bound to this editor
             * @param {Mixed} value The field value being set
             */
            "beforestartedit",
            /**
             * @event startedit
             * Fires when this editor is displayed
             * @param {Ext.Element} boundEl The underlying element bound to this editor
             * @param {Mixed} value The starting field value
             */
            "startedit",
            /**
             * @event beforecomplete
             * Fires after a change has been made to the field, but before the change is reflected in the underlying
             * field.  Saving the change to the field can be canceled by returning false from the handler of this event.
             * Note that if the value has not changed and ignoreNoChange = true, the editing will still end but this
             * event will not fire since no edit actually occurred.
             * @param {Editor} this
             * @param {Mixed} value The current field value
             * @param {Mixed} startValue The original field value
             */
            "beforecomplete",
            /**
             * @event complete
             * Fires after editing is complete and any changed value has been written to the underlying field.
             * @param {Editor} this
             * @param {Mixed} value The current field value
             * @param {Mixed} startValue The original field value
             */
            "complete",
            /**
             * @event canceledit
             * Fires after editing has been canceled and the editor's value has been reset.
             * @param {Editor} this
             * @param {Mixed} value The user-entered field value that was discarded
             * @param {Mixed} startValue The original field value that was set back into the editor after cancel
             */
            "canceledit",
            /**
             * @event specialkey
             * Fires when any key related to navigation (arrows, tab, enter, esc, etc.) is pressed.  You can check
             * {@link Ext.EventObject#getKey} to determine which key was pressed.
             * @param {Ext.form.Field} this
             * @param {Ext.EventObject} e The event object
             */
            "specialkey"
        );
    },

    // private
    onRender : function(ct, position){
        this.el = new Ext.Layer({
            shadow: this.shadow,
            cls: "x-editor",
            parentEl : ct,
            shim : this.shim,
            shadowOffset: this.shadowOffset || 4,
            id: this.id,
            constrain: this.constrain
        });
        if(this.zIndex){
            this.el.setZIndex(this.zIndex);
        }
        this.el.setStyle("overflow", Ext.isGecko ? "auto" : "hidden");
        if(this.field.msgTarget != 'title'){
            this.field.msgTarget = 'qtip';
        }
        this.field.inEditor = true;
        this.mon(this.field, {
            scope: this,
            blur: this.onBlur,
            specialkey: this.onSpecialKey
        });
        if(this.field.grow){
            this.mon(this.field, "autosize", this.el.sync,  this.el, {delay:1});
        }
        this.field.render(this.el).show();
        this.field.getEl().dom.name = '';
        if(this.swallowKeys){
            this.field.el.swallowEvent([
                'keypress', // *** Opera
                'keydown'   // *** all other browsers
            ]);
        }
    },

    // private
    onSpecialKey : function(field, e){
        var key = e.getKey(),
            complete = this.completeOnEnter && key == e.ENTER,
            cancel = this.cancelOnEsc && key == e.ESC;
        if(complete || cancel){
            e.stopEvent();
            if(complete){
                this.completeEdit();
            }else{
                this.cancelEdit();
            }
            if(field.triggerBlur){
                field.triggerBlur();
            }
        }
        this.fireEvent('specialkey', field, e);
    },

    /**
     * Starts the editing process and shows the editor.
     * @param {Mixed} el The element to edit
     * @param {String} value (optional) A value to initialize the editor with. If a value is not provided, it defaults
      * to the innerHTML of el.
     */
    startEdit : function(el, value){
        if(this.editing){
            this.completeEdit();
        }
        this.boundEl = Ext.get(el);
        var v = value !== undefined ? value : this.boundEl.dom.innerHTML;
        if(!this.rendered){
            this.render(this.parentEl || document.body);
        }
        if(this.fireEvent("beforestartedit", this, this.boundEl, v) !== false){
            this.startValue = v;
            this.field.reset();
            this.field.setValue(v);
            this.realign(true);
            this.editing = true;
            this.show();
        }
    },

    // private
    doAutoSize : function(){
        if(this.autoSize){
            var sz = this.boundEl.getSize(),
                fs = this.field.getSize();

            switch(this.autoSize){
                case "width":
                    this.setSize(sz.width, fs.height);
                    break;
                case "height":
                    this.setSize(fs.width, sz.height);
                    break;
                case "none":
                    this.setSize(fs.width, fs.height);
                    break;
                default:
                    this.setSize(sz.width, sz.height);
            }
        }
    },

    /**
     * Sets the height and width of this editor.
     * @param {Number} width The new width
     * @param {Number} height The new height
     */
    setSize : function(w, h){
        delete this.field.lastSize;
        this.field.setSize(w, h);
        if(this.el){
            // IE7 in strict mode doesn't size properly.
            if(Ext.isGecko2 || Ext.isOpera || (Ext.isIE7 && Ext.isStrict)){
                // prevent layer scrollbars
                this.el.setSize(w, h);
            }
            this.el.sync();
        }
    },

    /**
     * Realigns the editor to the bound field based on the current alignment config value.
     * @param {Boolean} autoSize (optional) True to size the field to the dimensions of the bound element.
     */
    realign : function(autoSize){
        if(autoSize === true){
            this.doAutoSize();
        }
        this.el.alignTo(this.boundEl, this.alignment, this.offsets);
    },

    /**
     * Ends the editing process, persists the changed value to the underlying field, and hides the editor.
     * @param {Boolean} remainVisible Override the default behavior and keep the editor visible after edit (defaults to false)
     */
    completeEdit : function(remainVisible){
        if(!this.editing){
            return;
        }
        // Assert combo values first
        if (this.field.assertValue) {
            this.field.assertValue();
        }
        var v = this.getValue();
        if(!this.field.isValid()){
            if(this.revertInvalid !== false){
                this.cancelEdit(remainVisible);
            }
            return;
        }
        if(String(v) === String(this.startValue) && this.ignoreNoChange){
            this.hideEdit(remainVisible);
            return;
        }
        if(this.fireEvent("beforecomplete", this, v, this.startValue) !== false){
            v = this.getValue();
            if(this.updateEl && this.boundEl){
                this.boundEl.update(v);
            }
            this.hideEdit(remainVisible);
            this.fireEvent("complete", this, v, this.startValue);
        }
    },

    // private
    onShow : function(){
        this.el.show();
        if(this.hideEl !== false){
            this.boundEl.hide();
        }
        this.field.show().focus(false, true);
        this.fireEvent("startedit", this.boundEl, this.startValue);
    },

    /**
     * Cancels the editing process and hides the editor without persisting any changes.  The field value will be
     * reverted to the original starting value.
     * @param {Boolean} remainVisible Override the default behavior and keep the editor visible after
     * cancel (defaults to false)
     */
    cancelEdit : function(remainVisible){
        if(this.editing){
            var v = this.getValue();
            this.setValue(this.startValue);
            this.hideEdit(remainVisible);
            this.fireEvent("canceledit", this, v, this.startValue);
        }
    },

    // private
    hideEdit: function(remainVisible){
        if(remainVisible !== true){
            this.editing = false;
            this.hide();
        }
    },

    // private
    onBlur : function(){
        // selectSameEditor flag allows the same editor to be started without onBlur firing on itself
        if(this.allowBlur === true && this.editing && this.selectSameEditor !== true){
            this.completeEdit();
        }
    },

    // private
    onHide : function(){
        if(this.editing){
            this.completeEdit();
            return;
        }
        this.field.blur();
        if(this.field.collapse){
            this.field.collapse();
        }
        this.el.hide();
        if(this.hideEl !== false){
            this.boundEl.show();
        }
    },

    /**
     * Sets the data value of the editor
     * @param {Mixed} value Any valid value supported by the underlying field
     */
    setValue : function(v){
        this.field.setValue(v);
    },

    /**
     * Gets the data value of the editor
     * @return {Mixed} The data value
     */
    getValue : function(){
        return this.field.getValue();
    },

    beforeDestroy : function(){
        Ext.destroyMembers(this, 'field');

        delete this.parentEl;
        delete this.boundEl;
    }
});
Ext.reg('editor', Ext.Editor);
/**
 * @class Ext.ColorPalette
 * @extends Ext.Component
 * Simple color palette class for choosing colors.  The palette can be rendered to any container.<br />
 * Here's an example of typical usage:
 * <pre><code>
var cp = new Ext.ColorPalette({value:'993300'});  // initial selected color
cp.render('my-div');

cp.on('select', function(palette, selColor){
    // do something with selColor
});
</code></pre>
 * @constructor
 * Create a new ColorPalette
 * @param {Object} config The config object
 * @xtype colorpalette
 */
Ext.ColorPalette = Ext.extend(Ext.Component, {
	/**
	 * @cfg {String} tpl An existing XTemplate instance to be used in place of the default template for rendering the component.
	 */
    /**
     * @cfg {String} itemCls
     * The CSS class to apply to the containing element (defaults to 'x-color-palette')
     */
    itemCls : 'x-color-palette',
    /**
     * @cfg {String} value
     * The initial color to highlight (should be a valid 6-digit color hex code without the # symbol).  Note that
     * the hex codes are case-sensitive.
     */
    value : null,
    /**
     * @cfg {String} clickEvent
     * The DOM event that will cause a color to be selected. This can be any valid event name (dblclick, contextmenu). 
     * Defaults to <tt>'click'</tt>.
     */
    clickEvent :'click',
    // private
    ctype : 'Ext.ColorPalette',

    /**
     * @cfg {Boolean} allowReselect If set to true then reselecting a color that is already selected fires the {@link #select} event
     */
    allowReselect : false,

    /**
     * <p>An array of 6-digit color hex code strings (without the # symbol).  This array can contain any number
     * of colors, and each hex code should be unique.  The width of the palette is controlled via CSS by adjusting
     * the width property of the 'x-color-palette' class (or assigning a custom class), so you can balance the number
     * of colors with the width setting until the box is symmetrical.</p>
     * <p>You can override individual colors if needed:</p>
     * <pre><code>
var cp = new Ext.ColorPalette();
cp.colors[0] = 'FF0000';  // change the first box to red
</code></pre>

Or you can provide a custom array of your own for complete control:
<pre><code>
var cp = new Ext.ColorPalette();
cp.colors = ['000000', '993300', '333300'];
</code></pre>
     * @type Array
     */
    colors : [
        '000000', '993300', '333300', '003300', '003366', '000080', '333399', '333333',
        '800000', 'FF6600', '808000', '008000', '008080', '0000FF', '666699', '808080',
        'FF0000', 'FF9900', '99CC00', '339966', '33CCCC', '3366FF', '800080', '969696',
        'FF00FF', 'FFCC00', 'FFFF00', '00FF00', '00FFFF', '00CCFF', '993366', 'C0C0C0',
        'FF99CC', 'FFCC99', 'FFFF99', 'CCFFCC', 'CCFFFF', '99CCFF', 'CC99FF', 'FFFFFF'
    ],

    /**
     * @cfg {Function} handler
     * Optional. A function that will handle the select event of this palette.
     * The handler is passed the following parameters:<div class="mdetail-params"><ul>
     * <li><code>palette</code> : ColorPalette<div class="sub-desc">The {@link #palette Ext.ColorPalette}.</div></li>
     * <li><code>color</code> : String<div class="sub-desc">The 6-digit color hex code (without the # symbol).</div></li>
     * </ul></div>
     */
    /**
     * @cfg {Object} scope
     * The scope (<tt><b>this</b></tt> reference) in which the <code>{@link #handler}</code>
     * function will be called.  Defaults to this ColorPalette instance.
     */
    
    // private
    initComponent : function(){
        Ext.ColorPalette.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event select
             * Fires when a color is selected
             * @param {ColorPalette} this
             * @param {String} color The 6-digit color hex code (without the # symbol)
             */
            'select'
        );

        if(this.handler){
            this.on('select', this.handler, this.scope, true);
        }    
    },

    // private
    onRender : function(container, position){
        this.autoEl = {
            tag: 'div',
            cls: this.itemCls
        };
        Ext.ColorPalette.superclass.onRender.call(this, container, position);
        var t = this.tpl || new Ext.XTemplate(
            '<tpl for="."><a href="#" class="color-{.}" hidefocus="on"><em><span style="background:#{.}" unselectable="on">&#160;</span></em></a></tpl>'
        );
        t.overwrite(this.el, this.colors);
        this.mon(this.el, this.clickEvent, this.handleClick, this, {delegate: 'a'});
        if(this.clickEvent != 'click'){
        	this.mon(this.el, 'click', Ext.emptyFn, this, {delegate: 'a', preventDefault: true});
        }
    },

    // private
    afterRender : function(){
        Ext.ColorPalette.superclass.afterRender.call(this);
        if(this.value){
            var s = this.value;
            this.value = null;
            this.select(s, true);
        }
    },

    // private
    handleClick : function(e, t){
        e.preventDefault();
        if(!this.disabled){
            var c = t.className.match(/(?:^|\s)color-(.{6})(?:\s|$)/)[1];
            this.select(c.toUpperCase());
        }
    },

    /**
     * Selects the specified color in the palette (fires the {@link #select} event)
     * @param {String} color A valid 6-digit color hex code (# will be stripped if included)
     * @param {Boolean} suppressEvent (optional) True to stop the select event from firing. Defaults to <tt>false</tt>.
     */
    select : function(color, suppressEvent){
        color = color.replace('#', '');
        if(color != this.value || this.allowReselect){
            var el = this.el;
            if(this.value){
                el.child('a.color-'+this.value).removeClass('x-color-palette-sel');
            }
            el.child('a.color-'+color).addClass('x-color-palette-sel');
            this.value = color;
            if(suppressEvent !== true){
                this.fireEvent('select', this, color);
            }
        }
    }

    /**
     * @cfg {String} autoEl @hide
     */
});
Ext.reg('colorpalette', Ext.ColorPalette);/**
 * @class Ext.DatePicker
 * @extends Ext.Component
 * <p>A popup date picker. This class is used by the {@link Ext.form.DateField DateField} class
 * to allow browsing and selection of valid dates.</p>
 * <p>All the string values documented below may be overridden by including an Ext locale file in
 * your page.</p>
 * @constructor
 * Create a new DatePicker
 * @param {Object} config The config object
 * @xtype datepicker
 */
Ext.DatePicker = Ext.extend(Ext.BoxComponent, {
    /**
     * @cfg {String} todayText
     * The text to display on the button that selects the current date (defaults to <code>'Today'</code>)
     */
    todayText : 'Today',
    /**
     * @cfg {String} okText
     * The text to display on the ok button (defaults to <code>'&#160;OK&#160;'</code> to give the user extra clicking room)
     */
    okText : '&#160;OK&#160;',
    /**
     * @cfg {String} cancelText
     * The text to display on the cancel button (defaults to <code>'Cancel'</code>)
     */
    cancelText : 'Cancel',
    /**
     * @cfg {Function} handler
     * Optional. A function that will handle the select event of this picker.
     * The handler is passed the following parameters:<div class="mdetail-params"><ul>
     * <li><code>picker</code> : DatePicker<div class="sub-desc">This DatePicker.</div></li>
     * <li><code>date</code> : Date<div class="sub-desc">The selected date.</div></li>
     * </ul></div>
     */
    /**
     * @cfg {Object} scope
     * The scope (<code><b>this</b></code> reference) in which the <code>{@link #handler}</code>
     * function will be called.  Defaults to this DatePicker instance.
     */
    /**
     * @cfg {String} todayTip
     * A string used to format the message for displaying in a tooltip over the button that
     * selects the current date. Defaults to <code>'{0} (Spacebar)'</code> where
     * the <code>{0}</code> token is replaced by today's date.
     */
    todayTip : '{0} (Spacebar)',
    /**
     * @cfg {String} minText
     * The error text to display if the minDate validation fails (defaults to <code>'This date is before the minimum date'</code>)
     */
    minText : 'This date is before the minimum date',
    /**
     * @cfg {String} maxText
     * The error text to display if the maxDate validation fails (defaults to <code>'This date is after the maximum date'</code>)
     */
    maxText : 'This date is after the maximum date',
    /**
     * @cfg {String} format
     * The default date format string which can be overriden for localization support.  The format must be
     * valid according to {@link Date#parseDate} (defaults to <code>'m/d/y'</code>).
     */
    format : 'm/d/y',
    /**
     * @cfg {String} disabledDaysText
     * The tooltip to display when the date falls on a disabled day (defaults to <code>'Disabled'</code>)
     */
    disabledDaysText : 'Disabled',
    /**
     * @cfg {String} disabledDatesText
     * The tooltip text to display when the date falls on a disabled date (defaults to <code>'Disabled'</code>)
     */
    disabledDatesText : 'Disabled',
    /**
     * @cfg {Array} monthNames
     * An array of textual month names which can be overriden for localization support (defaults to Date.monthNames)
     */
    monthNames : Date.monthNames,
    /**
     * @cfg {Array} dayNames
     * An array of textual day names which can be overriden for localization support (defaults to Date.dayNames)
     */
    dayNames : Date.dayNames,
    /**
     * @cfg {String} nextText
     * The next month navigation button tooltip (defaults to <code>'Next Month (Control+Right)'</code>)
     */
    nextText : 'Next Month (Control+Right)',
    /**
     * @cfg {String} prevText
     * The previous month navigation button tooltip (defaults to <code>'Previous Month (Control+Left)'</code>)
     */
    prevText : 'Previous Month (Control+Left)',
    /**
     * @cfg {String} monthYearText
     * The header month selector tooltip (defaults to <code>'Choose a month (Control+Up/Down to move years)'</code>)
     */
    monthYearText : 'Choose a month (Control+Up/Down to move years)',
    /**
     * @cfg {Number} startDay
     * Day index at which the week should begin, 0-based (defaults to 0, which is Sunday)
     */
    startDay : 0,
    /**
     * @cfg {Boolean} showToday
     * False to hide the footer area containing the Today button and disable the keyboard handler for spacebar
     * that selects the current date (defaults to <code>true</code>).
     */
    showToday : true,
    /**
     * @cfg {Date} minDate
     * Minimum allowable date (JavaScript date object, defaults to null)
     */
    /**
     * @cfg {Date} maxDate
     * Maximum allowable date (JavaScript date object, defaults to null)
     */
    /**
     * @cfg {Array} disabledDays
     * An array of days to disable, 0-based. For example, [0, 6] disables Sunday and Saturday (defaults to null).
     */
    /**
     * @cfg {RegExp} disabledDatesRE
     * JavaScript regular expression used to disable a pattern of dates (defaults to null).  The {@link #disabledDates}
     * config will generate this regex internally, but if you specify disabledDatesRE it will take precedence over the
     * disabledDates value.
     */
    /**
     * @cfg {Array} disabledDates
     * An array of 'dates' to disable, as strings. These strings will be used to build a dynamic regular
     * expression so they are very powerful. Some examples:
     * <ul>
     * <li>['03/08/2003', '09/16/2003'] would disable those exact dates</li>
     * <li>['03/08', '09/16'] would disable those days for every year</li>
     * <li>['^03/08'] would only match the beginning (useful if you are using short years)</li>
     * <li>['03/../2006'] would disable every day in March 2006</li>
     * <li>['^03'] would disable every day in every March</li>
     * </ul>
     * Note that the format of the dates included in the array should exactly match the {@link #format} config.
     * In order to support regular expressions, if you are using a date format that has '.' in it, you will have to
     * escape the dot when restricting dates. For example: ['03\\.08\\.03'].
     */

    // private
    // Set by other components to stop the picker focus being updated when the value changes.
    focusOnSelect: true,

    // default value used to initialise each date in the DatePicker
    // (note: 12 noon was chosen because it steers well clear of all DST timezone changes)
    initHour: 12, // 24-hour format

    // private
    initComponent : function(){
        Ext.DatePicker.superclass.initComponent.call(this);

        this.value = this.value ?
                 this.value.clearTime(true) : new Date().clearTime();

        this.addEvents(
            /**
             * @event select
             * Fires when a date is selected
             * @param {DatePicker} this DatePicker
             * @param {Date} date The selected date
             */
            'select'
        );

        if(this.handler){
            this.on('select', this.handler,  this.scope || this);
        }

        this.initDisabledDays();
    },

    // private
    initDisabledDays : function(){
        if(!this.disabledDatesRE && this.disabledDates){
            var dd = this.disabledDates,
                len = dd.length - 1,
                re = '(?:';

            Ext.each(dd, function(d, i){
                re += Ext.isDate(d) ? '^' + Ext.escapeRe(d.dateFormat(this.format)) + '$' : dd[i];
                if(i != len){
                    re += '|';
                }
            }, this);
            this.disabledDatesRE = new RegExp(re + ')');
        }
    },

    /**
     * Replaces any existing disabled dates with new values and refreshes the DatePicker.
     * @param {Array/RegExp} disabledDates An array of date strings (see the {@link #disabledDates} config
     * for details on supported values), or a JavaScript regular expression used to disable a pattern of dates.
     */
    setDisabledDates : function(dd){
        if(Ext.isArray(dd)){
            this.disabledDates = dd;
            this.disabledDatesRE = null;
        }else{
            this.disabledDatesRE = dd;
        }
        this.initDisabledDays();
        this.update(this.value, true);
    },

    /**
     * Replaces any existing disabled days (by index, 0-6) with new values and refreshes the DatePicker.
     * @param {Array} disabledDays An array of disabled day indexes. See the {@link #disabledDays} config
     * for details on supported values.
     */
    setDisabledDays : function(dd){
        this.disabledDays = dd;
        this.update(this.value, true);
    },

    /**
     * Replaces any existing {@link #minDate} with the new value and refreshes the DatePicker.
     * @param {Date} value The minimum date that can be selected
     */
    setMinDate : function(dt){
        this.minDate = dt;
        this.update(this.value, true);
    },

    /**
     * Replaces any existing {@link #maxDate} with the new value and refreshes the DatePicker.
     * @param {Date} value The maximum date that can be selected
     */
    setMaxDate : function(dt){
        this.maxDate = dt;
        this.update(this.value, true);
    },

    /**
     * Sets the value of the date field
     * @param {Date} value The date to set
     */
    setValue : function(value){
        this.value = value.clearTime(true);
        this.update(this.value);
    },

    /**
     * Gets the current selected value of the date field
     * @return {Date} The selected date
     */
    getValue : function(){
        return this.value;
    },

    // private
    focus : function(){
        this.update(this.activeDate);
    },

    // private
    onEnable: function(initial){
        Ext.DatePicker.superclass.onEnable.call(this);
        this.doDisabled(false);
        this.update(initial ? this.value : this.activeDate);
        if(Ext.isIE){
            this.el.repaint();
        }

    },

    // private
    onDisable : function(){
        Ext.DatePicker.superclass.onDisable.call(this);
        this.doDisabled(true);
        if(Ext.isIE && !Ext.isIE8){
            /* Really strange problem in IE6/7, when disabled, have to explicitly
             * repaint each of the nodes to get them to display correctly, simply
             * calling repaint on the main element doesn't appear to be enough.
             */
             Ext.each([].concat(this.textNodes, this.el.query('th span')), function(el){
                 Ext.fly(el).repaint();
             });
        }
    },

    // private
    doDisabled : function(disabled){
        this.keyNav.setDisabled(disabled);
        this.prevRepeater.setDisabled(disabled);
        this.nextRepeater.setDisabled(disabled);
        if(this.showToday){
            this.todayKeyListener.setDisabled(disabled);
            this.todayBtn.setDisabled(disabled);
        }
    },

    // private
    onRender : function(container, position){
        var m = [
             '<table cellspacing="0">',
                '<tr><td class="x-date-left"><a href="#" title="', this.prevText ,'">&#160;</a></td><td class="x-date-middle" align="center"></td><td class="x-date-right"><a href="#" title="', this.nextText ,'">&#160;</a></td></tr>',
                '<tr><td colspan="3"><table class="x-date-inner" cellspacing="0"><thead><tr>'],
                dn = this.dayNames,
                i;
        for(i = 0; i < 7; i++){
            var d = this.startDay+i;
            if(d > 6){
                d = d-7;
            }
            m.push('<th><span>', dn[d].substr(0,1), '</span></th>');
        }
        m[m.length] = '</tr></thead><tbody><tr>';
        for(i = 0; i < 42; i++) {
            if(i % 7 === 0 && i !== 0){
                m[m.length] = '</tr><tr>';
            }
            m[m.length] = '<td><a href="#" hidefocus="on" class="x-date-date" tabIndex="1"><em><span></span></em></a></td>';
        }
        m.push('</tr></tbody></table></td></tr>',
                this.showToday ? '<tr><td colspan="3" class="x-date-bottom" align="center"></td></tr>' : '',
                '</table><div class="x-date-mp"></div>');

        var el = document.createElement('div');
        el.className = 'x-date-picker';
        el.innerHTML = m.join('');

        container.dom.insertBefore(el, position);

        this.el = Ext.get(el);
        this.eventEl = Ext.get(el.firstChild);

        this.prevRepeater = new Ext.util.ClickRepeater(this.el.child('td.x-date-left a'), {
            handler: this.showPrevMonth,
            scope: this,
            preventDefault:true,
            stopDefault:true
        });

        this.nextRepeater = new Ext.util.ClickRepeater(this.el.child('td.x-date-right a'), {
            handler: this.showNextMonth,
            scope: this,
            preventDefault:true,
            stopDefault:true
        });

        this.monthPicker = this.el.down('div.x-date-mp');
        this.monthPicker.enableDisplayMode('block');

        this.keyNav = new Ext.KeyNav(this.eventEl, {
            'left' : function(e){
                if(e.ctrlKey){
                    this.showPrevMonth();
                }else{
                    this.update(this.activeDate.add('d', -1));
                }
            },

            'right' : function(e){
                if(e.ctrlKey){
                    this.showNextMonth();
                }else{
                    this.update(this.activeDate.add('d', 1));
                }
            },

            'up' : function(e){
                if(e.ctrlKey){
                    this.showNextYear();
                }else{
                    this.update(this.activeDate.add('d', -7));
                }
            },

            'down' : function(e){
                if(e.ctrlKey){
                    this.showPrevYear();
                }else{
                    this.update(this.activeDate.add('d', 7));
                }
            },

            'pageUp' : function(e){
                this.showNextMonth();
            },

            'pageDown' : function(e){
                this.showPrevMonth();
            },

            'enter' : function(e){
                e.stopPropagation();
                return true;
            },

            scope : this
        });

        this.el.unselectable();

        this.cells = this.el.select('table.x-date-inner tbody td');
        this.textNodes = this.el.query('table.x-date-inner tbody span');

        this.mbtn = new Ext.Button({
            text: '&#160;',
            tooltip: this.monthYearText,
            renderTo: this.el.child('td.x-date-middle', true)
        });
        this.mbtn.el.child('em').addClass('x-btn-arrow');

        if(this.showToday){
            this.todayKeyListener = this.eventEl.addKeyListener(Ext.EventObject.SPACE, this.selectToday,  this);
            var today = (new Date()).dateFormat(this.format);
            this.todayBtn = new Ext.Button({
                renderTo: this.el.child('td.x-date-bottom', true),
                text: String.format(this.todayText, today),
                tooltip: String.format(this.todayTip, today),
                handler: this.selectToday,
                scope: this
            });
        }
        this.mon(this.eventEl, 'mousewheel', this.handleMouseWheel, this);
        this.mon(this.eventEl, 'click', this.handleDateClick,  this, {delegate: 'a.x-date-date'});
        this.mon(this.mbtn, 'click', this.showMonthPicker, this);
        this.onEnable(true);
    },

    // private
    createMonthPicker : function(){
        if(!this.monthPicker.dom.firstChild){
            var buf = ['<table border="0" cellspacing="0">'];
            for(var i = 0; i < 6; i++){
                buf.push(
                    '<tr><td class="x-date-mp-month"><a href="#">', Date.getShortMonthName(i), '</a></td>',
                    '<td class="x-date-mp-month x-date-mp-sep"><a href="#">', Date.getShortMonthName(i + 6), '</a></td>',
                    i === 0 ?
                    '<td class="x-date-mp-ybtn" align="center"><a class="x-date-mp-prev"></a></td><td class="x-date-mp-ybtn" align="center"><a class="x-date-mp-next"></a></td></tr>' :
                    '<td class="x-date-mp-year"><a href="#"></a></td><td class="x-date-mp-year"><a href="#"></a></td></tr>'
                );
            }
            buf.push(
                '<tr class="x-date-mp-btns"><td colspan="4"><button type="button" class="x-date-mp-ok">',
                    this.okText,
                    '</button><button type="button" class="x-date-mp-cancel">',
                    this.cancelText,
                    '</button></td></tr>',
                '</table>'
            );
            this.monthPicker.update(buf.join(''));

            this.mon(this.monthPicker, 'click', this.onMonthClick, this);
            this.mon(this.monthPicker, 'dblclick', this.onMonthDblClick, this);

            this.mpMonths = this.monthPicker.select('td.x-date-mp-month');
            this.mpYears = this.monthPicker.select('td.x-date-mp-year');

            this.mpMonths.each(function(m, a, i){
                i += 1;
                if((i%2) === 0){
                    m.dom.xmonth = 5 + Math.round(i * 0.5);
                }else{
                    m.dom.xmonth = Math.round((i-1) * 0.5);
                }
            });
        }
    },

    // private
    showMonthPicker : function(){
        if(!this.disabled){
            this.createMonthPicker();
            var size = this.el.getSize();
            this.monthPicker.setSize(size);
            this.monthPicker.child('table').setSize(size);

            this.mpSelMonth = (this.activeDate || this.value).getMonth();
            this.updateMPMonth(this.mpSelMonth);
            this.mpSelYear = (this.activeDate || this.value).getFullYear();
            this.updateMPYear(this.mpSelYear);

            this.monthPicker.slideIn('t', {duration:0.2});
        }
    },

    // private
    updateMPYear : function(y){
        this.mpyear = y;
        var ys = this.mpYears.elements;
        for(var i = 1; i <= 10; i++){
            var td = ys[i-1], y2;
            if((i%2) === 0){
                y2 = y + Math.round(i * 0.5);
                td.firstChild.innerHTML = y2;
                td.xyear = y2;
            }else{
                y2 = y - (5-Math.round(i * 0.5));
                td.firstChild.innerHTML = y2;
                td.xyear = y2;
            }
            this.mpYears.item(i-1)[y2 == this.mpSelYear ? 'addClass' : 'removeClass']('x-date-mp-sel');
        }
    },

    // private
    updateMPMonth : function(sm){
        this.mpMonths.each(function(m, a, i){
            m[m.dom.xmonth == sm ? 'addClass' : 'removeClass']('x-date-mp-sel');
        });
    },

    // private
    selectMPMonth : function(m){

    },

    // private
    onMonthClick : function(e, t){
        e.stopEvent();
        var el = new Ext.Element(t), pn;
        if(el.is('button.x-date-mp-cancel')){
            this.hideMonthPicker();
        }
        else if(el.is('button.x-date-mp-ok')){
            var d = new Date(this.mpSelYear, this.mpSelMonth, (this.activeDate || this.value).getDate());
            if(d.getMonth() != this.mpSelMonth){
                // 'fix' the JS rolling date conversion if needed
                d = new Date(this.mpSelYear, this.mpSelMonth, 1).getLastDateOfMonth();
            }
            this.update(d);
            this.hideMonthPicker();
        }
        else if((pn = el.up('td.x-date-mp-month', 2))){
            this.mpMonths.removeClass('x-date-mp-sel');
            pn.addClass('x-date-mp-sel');
            this.mpSelMonth = pn.dom.xmonth;
        }
        else if((pn = el.up('td.x-date-mp-year', 2))){
            this.mpYears.removeClass('x-date-mp-sel');
            pn.addClass('x-date-mp-sel');
            this.mpSelYear = pn.dom.xyear;
        }
        else if(el.is('a.x-date-mp-prev')){
            this.updateMPYear(this.mpyear-10);
        }
        else if(el.is('a.x-date-mp-next')){
            this.updateMPYear(this.mpyear+10);
        }
    },

    // private
    onMonthDblClick : function(e, t){
        e.stopEvent();
        var el = new Ext.Element(t), pn;
        if((pn = el.up('td.x-date-mp-month', 2))){
            this.update(new Date(this.mpSelYear, pn.dom.xmonth, (this.activeDate || this.value).getDate()));
            this.hideMonthPicker();
        }
        else if((pn = el.up('td.x-date-mp-year', 2))){
            this.update(new Date(pn.dom.xyear, this.mpSelMonth, (this.activeDate || this.value).getDate()));
            this.hideMonthPicker();
        }
    },

    // private
    hideMonthPicker : function(disableAnim){
        if(this.monthPicker){
            if(disableAnim === true){
                this.monthPicker.hide();
            }else{
                this.monthPicker.slideOut('t', {duration:0.2});
            }
        }
    },

    // private
    showPrevMonth : function(e){
        this.update(this.activeDate.add('mo', -1));
    },

    // private
    showNextMonth : function(e){
        this.update(this.activeDate.add('mo', 1));
    },

    // private
    showPrevYear : function(){
        this.update(this.activeDate.add('y', -1));
    },

    // private
    showNextYear : function(){
        this.update(this.activeDate.add('y', 1));
    },

    // private
    handleMouseWheel : function(e){
        e.stopEvent();
        if(!this.disabled){
            var delta = e.getWheelDelta();
            if(delta > 0){
                this.showPrevMonth();
            } else if(delta < 0){
                this.showNextMonth();
            }
        }
    },

    // private
    handleDateClick : function(e, t){
        e.stopEvent();
        if(!this.disabled && t.dateValue && !Ext.fly(t.parentNode).hasClass('x-date-disabled')){
            this.cancelFocus = this.focusOnSelect === false;
            this.setValue(new Date(t.dateValue));
            delete this.cancelFocus;
            this.fireEvent('select', this, this.value);
        }
    },

    // private
    selectToday : function(){
        if(this.todayBtn && !this.todayBtn.disabled){
            this.setValue(new Date().clearTime());
            this.fireEvent('select', this, this.value);
        }
    },

    // private
    update : function(date, forceRefresh){
        if(this.rendered){
            var vd = this.activeDate, vis = this.isVisible();
            this.activeDate = date;
            if(!forceRefresh && vd && this.el){
                var t = date.getTime();
                if(vd.getMonth() == date.getMonth() && vd.getFullYear() == date.getFullYear()){
                    this.cells.removeClass('x-date-selected');
                    this.cells.each(function(c){
                       if(c.dom.firstChild.dateValue == t){
                           c.addClass('x-date-selected');
                           if(vis && !this.cancelFocus){
                               Ext.fly(c.dom.firstChild).focus(50);
                           }
                           return false;
                       }
                    }, this);
                    return;
                }
            }
            var days = date.getDaysInMonth(),
                firstOfMonth = date.getFirstDateOfMonth(),
                startingPos = firstOfMonth.getDay()-this.startDay;

            if(startingPos < 0){
                startingPos += 7;
            }
            days += startingPos;

            var pm = date.add('mo', -1),
                prevStart = pm.getDaysInMonth()-startingPos,
                cells = this.cells.elements,
                textEls = this.textNodes,
                // convert everything to numbers so it's fast
                d = (new Date(pm.getFullYear(), pm.getMonth(), prevStart, this.initHour)),
                today = new Date().clearTime().getTime(),
                sel = date.clearTime(true).getTime(),
                min = this.minDate ? this.minDate.clearTime(true) : Number.NEGATIVE_INFINITY,
                max = this.maxDate ? this.maxDate.clearTime(true) : Number.POSITIVE_INFINITY,
                ddMatch = this.disabledDatesRE,
                ddText = this.disabledDatesText,
                ddays = this.disabledDays ? this.disabledDays.join('') : false,
                ddaysText = this.disabledDaysText,
                format = this.format;

            if(this.showToday){
                var td = new Date().clearTime(),
                    disable = (td < min || td > max ||
                    (ddMatch && format && ddMatch.test(td.dateFormat(format))) ||
                    (ddays && ddays.indexOf(td.getDay()) != -1));

                if(!this.disabled){
                    this.todayBtn.setDisabled(disable);
                    this.todayKeyListener[disable ? 'disable' : 'enable']();
                }
            }

            var setCellClass = function(cal, cell){
                cell.title = '';
                var t = d.clearTime(true).getTime();
                cell.firstChild.dateValue = t;
                if(t == today){
                    cell.className += ' x-date-today';
                    cell.title = cal.todayText;
                }
                if(t == sel){
                    cell.className += ' x-date-selected';
                    if(vis){
                        Ext.fly(cell.firstChild).focus(50);
                    }
                }
                // disabling
                if(t < min) {
                    cell.className = ' x-date-disabled';
                    cell.title = cal.minText;
                    return;
                }
                if(t > max) {
                    cell.className = ' x-date-disabled';
                    cell.title = cal.maxText;
                    return;
                }
                if(ddays){
                    if(ddays.indexOf(d.getDay()) != -1){
                        cell.title = ddaysText;
                        cell.className = ' x-date-disabled';
                    }
                }
                if(ddMatch && format){
                    var fvalue = d.dateFormat(format);
                    if(ddMatch.test(fvalue)){
                        cell.title = ddText.replace('%0', fvalue);
                        cell.className = ' x-date-disabled';
                    }
                }
            };

            var i = 0;
            for(; i < startingPos; i++) {
                textEls[i].innerHTML = (++prevStart);
                d.setDate(d.getDate()+1);
                cells[i].className = 'x-date-prevday';
                setCellClass(this, cells[i]);
            }
            for(; i < days; i++){
                var intDay = i - startingPos + 1;
                textEls[i].innerHTML = (intDay);
                d.setDate(d.getDate()+1);
                cells[i].className = 'x-date-active';
                setCellClass(this, cells[i]);
            }
            var extraDays = 0;
            for(; i < 42; i++) {
                 textEls[i].innerHTML = (++extraDays);
                 d.setDate(d.getDate()+1);
                 cells[i].className = 'x-date-nextday';
                 setCellClass(this, cells[i]);
            }

            this.mbtn.setText(this.monthNames[date.getMonth()] + ' ' + date.getFullYear());

            if(!this.internalRender){
                var main = this.el.dom.firstChild,
                    w = main.offsetWidth;
                this.el.setWidth(w + this.el.getBorderWidth('lr'));
                Ext.fly(main).setWidth(w);
                this.internalRender = true;
                // opera does not respect the auto grow header center column
                // then, after it gets a width opera refuses to recalculate
                // without a second pass
                if(Ext.isOpera && !this.secondPass){
                    main.rows[0].cells[1].style.width = (w - (main.rows[0].cells[0].offsetWidth+main.rows[0].cells[2].offsetWidth)) + 'px';
                    this.secondPass = true;
                    this.update.defer(10, this, [date]);
                }
            }
        }
    },

    // private
    beforeDestroy : function() {
        if(this.rendered){
            Ext.destroy(
                this.keyNav,
                this.monthPicker,
                this.eventEl,
                this.mbtn,
                this.nextRepeater,
                this.prevRepeater,
                this.cells.el,
                this.todayBtn
            );
            delete this.textNodes;
            delete this.cells.elements;
        }
    }

    /**
     * @cfg {String} autoEl @hide
     */
});

Ext.reg('datepicker', Ext.DatePicker);
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
};Ext.ns('Ext.slider');

/**
 * @class Ext.slider.Thumb
 * @extends Object
 * Represents a single thumb element on a Slider. This would not usually be created manually and would instead
 * be created internally by an {@link Ext.slider.MultiSlider Ext.Slider}.
 */
Ext.slider.Thumb = Ext.extend(Object, {
    
    /**
     * True while the thumb is in a drag operation
     * @type Boolean
     */
    dragging: false,

    /**
     * @constructor
     * @cfg {Ext.slider.MultiSlider} slider The Slider to render to (required)
     */
    constructor: function(config) {
        /**
         * @property slider
         * @type Ext.slider.MultiSlider
         * The slider this thumb is contained within
         */
        Ext.apply(this, config || {}, {
            cls: 'x-slider-thumb',

            /**
             * @cfg {Boolean} constrain True to constrain the thumb so that it cannot overlap its siblings
             */
            constrain: false
        });

        Ext.slider.Thumb.superclass.constructor.call(this, config);

        if (this.slider.vertical) {
            Ext.apply(this, Ext.slider.Thumb.Vertical);
        }
    },

    /**
     * Renders the thumb into a slider
     */
    render: function() {
        this.el = this.slider.innerEl.insertFirst({cls: this.cls});

        this.initEvents();
    },

    /**
     * Enables the thumb if it is currently disabled
     */
    enable: function() {
        this.disabled = false;
        this.el.removeClass(this.slider.disabledClass);
    },

    /**
     * Disables the thumb if it is currently enabled
     */
    disable: function() {
        this.disabled = true;
        this.el.addClass(this.slider.disabledClass);
    },

    /**
     * Sets up an Ext.dd.DragTracker for this thumb
     */
    initEvents: function() {
        var el = this.el;

        el.addClassOnOver('x-slider-thumb-over');

        this.tracker = new Ext.dd.DragTracker({
            onBeforeStart: this.onBeforeDragStart.createDelegate(this),
            onStart      : this.onDragStart.createDelegate(this),
            onDrag       : this.onDrag.createDelegate(this),
            onEnd        : this.onDragEnd.createDelegate(this),
            tolerance    : 3,
            autoStart    : 300
        });

        this.tracker.initEl(el);
    },

    /**
     * @private
     * This is tied into the internal Ext.dd.DragTracker. If the slider is currently disabled,
     * this returns false to disable the DragTracker too.
     * @return {Boolean} False if the slider is currently disabled
     */
    onBeforeDragStart : function(e) {
        if (this.disabled) {
            return false;
        } else {
            this.slider.promoteThumb(this);
            return true;
        }
    },

    /**
     * @private
     * This is tied into the internal Ext.dd.DragTracker's onStart template method. Adds the drag CSS class
     * to the thumb and fires the 'dragstart' event
     */
    onDragStart: function(e){
        this.el.addClass('x-slider-thumb-drag');
        this.dragging = true;
        this.dragStartValue = this.value;

        this.slider.fireEvent('dragstart', this.slider, e, this);
    },

    /**
     * @private
     * This is tied into the internal Ext.dd.DragTracker's onDrag template method. This is called every time
     * the DragTracker detects a drag movement. It updates the Slider's value using the position of the drag
     */
    onDrag: function(e) {
        var slider   = this.slider,
            index    = this.index,
            newValue = this.getNewValue();

        if (this.constrain) {
            var above = slider.thumbs[index + 1],
                below = slider.thumbs[index - 1];

            if (below != undefined && newValue <= below.value) newValue = below.value;
            if (above != undefined && newValue >= above.value) newValue = above.value;
        }

        slider.setValue(index, newValue, false);
        slider.fireEvent('drag', slider, e, this);
    },

    getNewValue: function() {
        var slider   = this.slider,
            pos      = slider.innerEl.translatePoints(this.tracker.getXY());

        return Ext.util.Format.round(slider.reverseValue(pos.left), slider.decimalPrecision);
    },

    /**
     * @private
     * This is tied to the internal Ext.dd.DragTracker's onEnd template method. Removes the drag CSS class and
     * fires the 'changecomplete' event with the new value
     */
    onDragEnd: function(e) {
        var slider = this.slider,
            value  = this.value;

        this.el.removeClass('x-slider-thumb-drag');

        this.dragging = false;
        slider.fireEvent('dragend', slider, e);

        if (this.dragStartValue != value) {
            slider.fireEvent('changecomplete', slider, value, this);
        }
    },
    
    /**
     * @private
     * Destroys the thumb
     */
    destroy: function(){
        Ext.destroyMembers(this, 'tracker', 'el');
    }
});

/**
 * @class Ext.slider.MultiSlider
 * @extends Ext.BoxComponent
 * Slider which supports vertical or horizontal orientation, keyboard adjustments, configurable snapping, axis clicking and animation. Can be added as an item to any container. Example usage:
<pre>
new Ext.Slider({
    renderTo: Ext.getBody(),
    width: 200,
    value: 50,
    increment: 10,
    minValue: 0,
    maxValue: 100
});
</pre>
 * Sliders can be created with more than one thumb handle by passing an array of values instead of a single one:
<pre>
new Ext.Slider({
    renderTo: Ext.getBody(),
    width: 200,
    values: [25, 50, 75],
    minValue: 0,
    maxValue: 100,

    //this defaults to true, setting to false allows the thumbs to pass each other
    {@link #constrainThumbs}: false
});
</pre>
 */
Ext.slider.MultiSlider = Ext.extend(Ext.BoxComponent, {
    /**
     * @cfg {Number} value The value to initialize the slider with. Defaults to minValue.
     */
    /**
     * @cfg {Boolean} vertical Orient the Slider vertically rather than horizontally, defaults to false.
     */
    vertical: false,
    /**
     * @cfg {Number} minValue The minimum value for the Slider. Defaults to 0.
     */
    minValue: 0,
    /**
     * @cfg {Number} maxValue The maximum value for the Slider. Defaults to 100.
     */
    maxValue: 100,
    /**
     * @cfg {Number/Boolean} decimalPrecision.
     * <p>The number of decimal places to which to round the Slider's value. Defaults to 0.</p>
     * <p>To disable rounding, configure as <tt><b>false</b></tt>.</p>
     */
    decimalPrecision: 0,
    /**
     * @cfg {Number} keyIncrement How many units to change the Slider when adjusting with keyboard navigation. Defaults to 1. If the increment config is larger, it will be used instead.
     */
    keyIncrement: 1,
    /**
     * @cfg {Number} increment How many units to change the slider when adjusting by drag and drop. Use this option to enable 'snapping'.
     */
    increment: 0,

    /**
     * @private
     * @property clickRange
     * @type Array
     * Determines whether or not a click to the slider component is considered to be a user request to change the value. Specified as an array of [top, bottom],
     * the click event's 'top' property is compared to these numbers and the click only considered a change request if it falls within them. e.g. if the 'top'
     * value of the click event is 4 or 16, the click is not considered a change request as it falls outside of the [5, 15] range
     */
    clickRange: [5,15],

    /**
     * @cfg {Boolean} clickToChange Determines whether or not clicking on the Slider axis will change the slider. Defaults to true
     */
    clickToChange : true,
    /**
     * @cfg {Boolean} animate Turn on or off animation. Defaults to true
     */
    animate: true,
    /**
     * @cfg {Boolean} constrainThumbs True to disallow thumbs from overlapping one another. Defaults to true
     */
    constrainThumbs: true,

    /**
     * @private
     * @property topThumbZIndex
     * @type Number
     * The number used internally to set the z index of the top thumb (see promoteThumb for details)
     */
    topThumbZIndex: 10000,

    // private override
    initComponent : function(){
        if(!Ext.isDefined(this.value)){
            this.value = this.minValue;
        }

        /**
         * @property thumbs
         * @type Array
         * Array containing references to each thumb
         */
        this.thumbs = [];

        Ext.slider.MultiSlider.superclass.initComponent.call(this);

        this.keyIncrement = Math.max(this.increment, this.keyIncrement);
        this.addEvents(
            /**
             * @event beforechange
             * Fires before the slider value is changed. By returning false from an event handler,
             * you can cancel the event and prevent the slider from changing.
             * @param {Ext.slider.MultiSlider} slider The slider
             * @param {Number} newValue The new value which the slider is being changed to.
             * @param {Number} oldValue The old value which the slider was previously.
             */
            'beforechange',

            /**
             * @event change
             * Fires when the slider value is changed.
             * @param {Ext.slider.MultiSlider} slider The slider
             * @param {Number} newValue The new value which the slider has been changed to.
             * @param {Ext.slider.Thumb} thumb The thumb that was changed
             */
            'change',

            /**
             * @event changecomplete
             * Fires when the slider value is changed by the user and any drag operations have completed.
             * @param {Ext.slider.MultiSlider} slider The slider
             * @param {Number} newValue The new value which the slider has been changed to.
             * @param {Ext.slider.Thumb} thumb The thumb that was changed
             */
            'changecomplete',

            /**
             * @event dragstart
             * Fires after a drag operation has started.
             * @param {Ext.slider.MultiSlider} slider The slider
             * @param {Ext.EventObject} e The event fired from Ext.dd.DragTracker
             */
            'dragstart',

            /**
             * @event drag
             * Fires continuously during the drag operation while the mouse is moving.
             * @param {Ext.slider.MultiSlider} slider The slider
             * @param {Ext.EventObject} e The event fired from Ext.dd.DragTracker
             */
            'drag',

            /**
             * @event dragend
             * Fires after the drag operation has completed.
             * @param {Ext.slider.MultiSlider} slider The slider
             * @param {Ext.EventObject} e The event fired from Ext.dd.DragTracker
             */
            'dragend'
        );

        /**
         * @property values
         * @type Array
         * Array of values to initalize the thumbs with
         */
        if (this.values == undefined || Ext.isEmpty(this.values)) this.values = [0];

        var values = this.values;

        for (var i=0; i < values.length; i++) {
            this.addThumb(values[i]);
        }

        if(this.vertical){
            Ext.apply(this, Ext.slider.Vertical);
        }
    },

    /**
     * Creates a new thumb and adds it to the slider
     * @param {Number} value The initial value to set on the thumb. Defaults to 0
     */
    addThumb: function(value) {
        var thumb = new Ext.slider.Thumb({
            value    : value,
            slider   : this,
            index    : this.thumbs.length,
            constrain: this.constrainThumbs
        });
        this.thumbs.push(thumb);

        //render the thumb now if needed
        if (this.rendered) thumb.render();
    },

    /**
     * @private
     * Moves the given thumb above all other by increasing its z-index. This is called when as drag
     * any thumb, so that the thumb that was just dragged is always at the highest z-index. This is
     * required when the thumbs are stacked on top of each other at one of the ends of the slider's
     * range, which can result in the user not being able to move any of them.
     * @param {Ext.slider.Thumb} topThumb The thumb to move to the top
     */
    promoteThumb: function(topThumb) {
        var thumbs = this.thumbs,
            zIndex, thumb;

        for (var i = 0, j = thumbs.length; i < j; i++) {
            thumb = thumbs[i];

            if (thumb == topThumb) {
                zIndex = this.topThumbZIndex;
            } else {
                zIndex = '';
            }

            thumb.el.setStyle('zIndex', zIndex);
        }
    },

    // private override
    onRender : function() {
        this.autoEl = {
            cls: 'x-slider ' + (this.vertical ? 'x-slider-vert' : 'x-slider-horz'),
            cn : {
                cls: 'x-slider-end',
                cn : {
                    cls:'x-slider-inner',
                    cn : [{tag:'a', cls:'x-slider-focus', href:"#", tabIndex: '-1', hidefocus:'on'}]
                }
            }
        };

        Ext.slider.MultiSlider.superclass.onRender.apply(this, arguments);

        this.endEl   = this.el.first();
        this.innerEl = this.endEl.first();
        this.focusEl = this.innerEl.child('.x-slider-focus');

        //render each thumb
        for (var i=0; i < this.thumbs.length; i++) {
            this.thumbs[i].render();
        }

        //calculate the size of half a thumb
        var thumb      = this.innerEl.child('.x-slider-thumb');
        this.halfThumb = (this.vertical ? thumb.getHeight() : thumb.getWidth()) / 2;

        this.initEvents();
    },

    /**
     * @private
     * Adds keyboard and mouse listeners on this.el. Ignores click events on the internal focus element.
     * Creates a new DragTracker which is used to control what happens when the user drags the thumb around.
     */
    initEvents : function(){
        this.mon(this.el, {
            scope    : this,
            mousedown: this.onMouseDown,
            keydown  : this.onKeyDown
        });

        this.focusEl.swallowEvent("click", true);
    },

    /**
     * @private
     * Mousedown handler for the slider. If the clickToChange is enabled and the click was not on the draggable 'thumb',
     * this calculates the new value of the slider and tells the implementation (Horizontal or Vertical) to move the thumb
     * @param {Ext.EventObject} e The click event
     */
    onMouseDown : function(e){
        if(this.disabled){
            return;
        }

        //see if the click was on any of the thumbs
        var thumbClicked = false;
        for (var i=0; i < this.thumbs.length; i++) {
            thumbClicked = thumbClicked || e.target == this.thumbs[i].el.dom;
        }

        if (this.clickToChange && !thumbClicked) {
            var local = this.innerEl.translatePoints(e.getXY());
            this.onClickChange(local);
        }
        this.focus();
    },

    /**
     * @private
     * Moves the thumb to the indicated position. Note that a Vertical implementation is provided in Ext.slider.Vertical.
     * Only changes the value if the click was within this.clickRange.
     * @param {Object} local Object containing top and left values for the click event.
     */
    onClickChange : function(local) {
        if (local.top > this.clickRange[0] && local.top < this.clickRange[1]) {
            //find the nearest thumb to the click event
            var thumb = this.getNearest(local, 'left'),
                index = thumb.index;

            this.setValue(index, Ext.util.Format.round(this.reverseValue(local.left), this.decimalPrecision), undefined, true);
        }
    },

    /**
     * @private
     * Returns the nearest thumb to a click event, along with its distance
     * @param {Object} local Object containing top and left values from a click event
     * @param {String} prop The property of local to compare on. Use 'left' for horizontal sliders, 'top' for vertical ones
     * @return {Object} The closest thumb object and its distance from the click event
     */
    getNearest: function(local, prop) {
        var localValue = prop == 'top' ? this.innerEl.getHeight() - local[prop] : local[prop],
            clickValue = this.reverseValue(localValue),
            nearestDistance = (this.maxValue - this.minValue) + 5, //add a small fudge for the end of the slider 
            index = 0,
            nearest = null;

        for (var i=0; i < this.thumbs.length; i++) {
            var thumb = this.thumbs[i],
                value = thumb.value,
                dist  = Math.abs(value - clickValue);

            if (Math.abs(dist <= nearestDistance)) {
                nearest = thumb;
                index = i;
                nearestDistance = dist;
            }
        }
        return nearest;
    },

    /**
     * @private
     * Handler for any keypresses captured by the slider. If the key is UP or RIGHT, the thumb is moved along to the right
     * by this.keyIncrement. If DOWN or LEFT it is moved left. Pressing CTRL moves the slider to the end in either direction
     * @param {Ext.EventObject} e The Event object
     */
    onKeyDown : function(e){
        /*
         * The behaviour for keyboard handling with multiple thumbs is currently undefined.
         * There's no real sane default for it, so leave it like this until we come up
         * with a better way of doing it.
         */
        if(this.disabled || this.thumbs.length !== 1){
            e.preventDefault();
            return;
        }
        var k = e.getKey(),
            val;
        switch(k){
            case e.UP:
            case e.RIGHT:
                e.stopEvent();
                val = e.ctrlKey ? this.maxValue : this.getValue(0) + this.keyIncrement;
                this.setValue(0, val, undefined, true);
            break;
            case e.DOWN:
            case e.LEFT:
                e.stopEvent();
                val = e.ctrlKey ? this.minValue : this.getValue(0) - this.keyIncrement;
                this.setValue(0, val, undefined, true);
            break;
            default:
                e.preventDefault();
        }
    },

    /**
     * @private
     * If using snapping, this takes a desired new value and returns the closest snapped
     * value to it
     * @param {Number} value The unsnapped value
     * @return {Number} The value of the nearest snap target
     */
    doSnap : function(value){
        if (!(this.increment && value)) {
            return value;
        }
        var newValue = value,
            inc = this.increment,
            m = value % inc;
        if (m != 0) {
            newValue -= m;
            if (m * 2 >= inc) {
                newValue += inc;
            } else if (m * 2 < -inc) {
                newValue -= inc;
            }
        }
        return newValue.constrain(this.minValue,  this.maxValue);
    },

    // private
    afterRender : function(){
        Ext.slider.MultiSlider.superclass.afterRender.apply(this, arguments);

        for (var i=0; i < this.thumbs.length; i++) {
            var thumb = this.thumbs[i];

            if (thumb.value !== undefined) {
                var v = this.normalizeValue(thumb.value);

                if (v !== thumb.value) {
                    // delete this.value;
                    this.setValue(i, v, false);
                } else {
                    this.moveThumb(i, this.translateValue(v), false);
                }
            }
        };
    },

    /**
     * @private
     * Returns the ratio of pixels to mapped values. e.g. if the slider is 200px wide and maxValue - minValue is 100,
     * the ratio is 2
     * @return {Number} The ratio of pixels to mapped values
     */
    getRatio : function(){
        var w = this.innerEl.getWidth(),
            v = this.maxValue - this.minValue;
        return v == 0 ? w : (w/v);
    },

    /**
     * @private
     * Returns a snapped, constrained value when given a desired value
     * @param {Number} value Raw number value
     * @return {Number} The raw value rounded to the correct d.p. and constrained within the set max and min values
     */
    normalizeValue : function(v){
        v = this.doSnap(v);
        v = Ext.util.Format.round(v, this.decimalPrecision);
        v = v.constrain(this.minValue, this.maxValue);
        return v;
    },

    /**
     * Sets the minimum value for the slider instance. If the current value is less than the
     * minimum value, the current value will be changed.
     * @param {Number} val The new minimum value
     */
    setMinValue : function(val){
        this.minValue = val;
        var i = 0,
            thumbs = this.thumbs,
            len = thumbs.length,
            t;
            
        for(; i < len; ++i){
            t = thumbs[i];
            t.value = t.value < val ? val : t.value;
        }
        this.syncThumb();
    },

    /**
     * Sets the maximum value for the slider instance. If the current value is more than the
     * maximum value, the current value will be changed.
     * @param {Number} val The new maximum value
     */
    setMaxValue : function(val){
        this.maxValue = val;
        var i = 0,
            thumbs = this.thumbs,
            len = thumbs.length,
            t;
            
        for(; i < len; ++i){
            t = thumbs[i];
            t.value = t.value > val ? val : t.value;
        }
        this.syncThumb();
    },

    /**
     * Programmatically sets the value of the Slider. Ensures that the value is constrained within
     * the minValue and maxValue.
     * @param {Number} index Index of the thumb to move
     * @param {Number} value The value to set the slider to. (This will be constrained within minValue and maxValue)
     * @param {Boolean} animate Turn on or off animation, defaults to true
     */
    setValue : function(index, v, animate, changeComplete) {
        var thumb = this.thumbs[index],
            el    = thumb.el;

        v = this.normalizeValue(v);

        if (v !== thumb.value && this.fireEvent('beforechange', this, v, thumb.value, thumb) !== false) {
            thumb.value = v;
            if(this.rendered){
                this.moveThumb(index, this.translateValue(v), animate !== false);
                this.fireEvent('change', this, v, thumb);
                if(changeComplete){
                    this.fireEvent('changecomplete', this, v, thumb);
                }
            }
        }
    },

    /**
     * @private
     */
    translateValue : function(v) {
        var ratio = this.getRatio();
        return (v * ratio) - (this.minValue * ratio) - this.halfThumb;
    },

    /**
     * @private
     * Given a pixel location along the slider, returns the mapped slider value for that pixel.
     * E.g. if we have a slider 200px wide with minValue = 100 and maxValue = 500, reverseValue(50)
     * returns 200
     * @param {Number} pos The position along the slider to return a mapped value for
     * @return {Number} The mapped value for the given position
     */
    reverseValue : function(pos){
        var ratio = this.getRatio();
        return (pos + (this.minValue * ratio)) / ratio;
    },

    /**
     * @private
     * @param {Number} index Index of the thumb to move
     */
    moveThumb: function(index, v, animate){
        var thumb = this.thumbs[index].el;

        if(!animate || this.animate === false){
            thumb.setLeft(v);
        }else{
            thumb.shift({left: v, stopFx: true, duration:.35});
        }
    },

    // private
    focus : function(){
        this.focusEl.focus(10);
    },

    // private
    onResize : function(w, h){
        var thumbs = this.thumbs,
            len = thumbs.length,
            i = 0;
            
        /*
         * If we happen to be animating during a resize, the position of the thumb will likely be off
         * when the animation stops. As such, just stop any animations before syncing the thumbs.
         */
        for(; i < len; ++i){
            thumbs[i].el.stopFx();    
        }
        // check to see if we're using an auto width
        if(Ext.isNumber(w)){
            this.innerEl.setWidth(w - (this.el.getPadding('l') + this.endEl.getPadding('r')));
        }
        this.syncThumb();
        Ext.slider.MultiSlider.superclass.onResize.apply(this, arguments);
    },

    //private
    onDisable: function(){
        Ext.slider.MultiSlider.superclass.onDisable.call(this);

        for (var i=0; i < this.thumbs.length; i++) {
            var thumb = this.thumbs[i],
                el    = thumb.el;

            thumb.disable();

            if(Ext.isIE){
                //IE breaks when using overflow visible and opacity other than 1.
                //Create a place holder for the thumb and display it.
                var xy = el.getXY();
                el.hide();

                this.innerEl.addClass(this.disabledClass).dom.disabled = true;

                if (!this.thumbHolder) {
                    this.thumbHolder = this.endEl.createChild({cls: 'x-slider-thumb ' + this.disabledClass});
                }

                this.thumbHolder.show().setXY(xy);
            }
        }
    },

    //private
    onEnable: function(){
        Ext.slider.MultiSlider.superclass.onEnable.call(this);

        for (var i=0; i < this.thumbs.length; i++) {
            var thumb = this.thumbs[i],
                el    = thumb.el;

            thumb.enable();

            if (Ext.isIE) {
                this.innerEl.removeClass(this.disabledClass).dom.disabled = false;

                if (this.thumbHolder) this.thumbHolder.hide();

                el.show();
                this.syncThumb();
            }
        }
    },

    /**
     * Synchronizes the thumb position to the proper proportion of the total component width based
     * on the current slider {@link #value}.  This will be called automatically when the Slider
     * is resized by a layout, but if it is rendered auto width, this method can be called from
     * another resize handler to sync the Slider if necessary.
     */
    syncThumb : function() {
        if (this.rendered) {
            for (var i=0; i < this.thumbs.length; i++) {
                this.moveThumb(i, this.translateValue(this.thumbs[i].value));
            }
        }
    },

    /**
     * Returns the current value of the slider
     * @param {Number} index The index of the thumb to return a value for
     * @return {Number} The current value of the slider
     */
    getValue : function(index) {
        return this.thumbs[index].value;
    },

    /**
     * Returns an array of values - one for the location of each thumb
     * @return {Array} The set of thumb values
     */
    getValues: function() {
        var values = [];

        for (var i=0; i < this.thumbs.length; i++) {
            values.push(this.thumbs[i].value);
        }

        return values;
    },

    // private
    beforeDestroy : function(){
        var thumbs = this.thumbs;
        for(var i = 0, len = thumbs.length; i < len; ++i){
            thumbs[i].destroy();
            thumbs[i] = null;
        }
        Ext.destroyMembers(this, 'endEl', 'innerEl', 'focusEl', 'thumbHolder');
        Ext.slider.MultiSlider.superclass.beforeDestroy.call(this);
    }
});

Ext.reg('multislider', Ext.slider.MultiSlider);

/**
 * @class Ext.slider.SingleSlider
 * @extends Ext.slider.MultiSlider
 * Slider which supports vertical or horizontal orientation, keyboard adjustments,
 * configurable snapping, axis clicking and animation. Can be added as an item to
 * any container. Example usage:
<pre><code>
new Ext.slider.SingleSlider({
    renderTo: Ext.getBody(),
    width: 200,
    value: 50,
    increment: 10,
    minValue: 0,
    maxValue: 100
});
</code></pre>
 * The class Ext.slider.SingleSlider is aliased to Ext.Slider for backwards compatibility.
 */
Ext.slider.SingleSlider = Ext.extend(Ext.slider.MultiSlider, {
    constructor: function(config) {
      config = config || {};

      Ext.applyIf(config, {
          values: [config.value || 0]
      });

      Ext.slider.SingleSlider.superclass.constructor.call(this, config);
    },

    /**
     * Returns the current value of the slider
     * @return {Number} The current value of the slider
     */
    getValue: function() {
        //just returns the value of the first thumb, which should be the only one in a single slider
        return Ext.slider.SingleSlider.superclass.getValue.call(this, 0);
    },

    /**
     * Programmatically sets the value of the Slider. Ensures that the value is constrained within
     * the minValue and maxValue.
     * @param {Number} value The value to set the slider to. (This will be constrained within minValue and maxValue)
     * @param {Boolean} animate Turn on or off animation, defaults to true
     */
    setValue: function(value, animate) {
        var args = Ext.toArray(arguments),
            len  = args.length;

        //this is to maintain backwards compatiblity for sliders with only one thunb. Usually you must pass the thumb
        //index to setValue, but if we only have one thumb we inject the index here first if given the multi-slider
        //signature without the required index. The index will always be 0 for a single slider
        if (len == 1 || (len <= 3 && typeof arguments[1] != 'number')) {
            args.unshift(0);
        }

        return Ext.slider.SingleSlider.superclass.setValue.apply(this, args);
    },

    /**
     * Synchronizes the thumb position to the proper proportion of the total component width based
     * on the current slider {@link #value}.  This will be called automatically when the Slider
     * is resized by a layout, but if it is rendered auto width, this method can be called from
     * another resize handler to sync the Slider if necessary.
     */
    syncThumb : function() {
        return Ext.slider.SingleSlider.superclass.syncThumb.apply(this, [0].concat(arguments));
    },
    
    // private
    getNearest : function(){
        // Since there's only 1 thumb, it's always the nearest
        return this.thumbs[0];    
    }
});

//backwards compatibility
Ext.Slider = Ext.slider.SingleSlider;

Ext.reg('slider', Ext.slider.SingleSlider);

// private class to support vertical sliders
Ext.slider.Vertical = {
    onResize : function(w, h){
        this.innerEl.setHeight(h - (this.el.getPadding('t') + this.endEl.getPadding('b')));
        this.syncThumb();
    },

    getRatio : function(){
        var h = this.innerEl.getHeight(),
            v = this.maxValue - this.minValue;
        return h/v;
    },

    moveThumb: function(index, v, animate) {
        var thumb = this.thumbs[index],
            el    = thumb.el;

        if (!animate || this.animate === false) {
            el.setBottom(v);
        } else {
            el.shift({bottom: v, stopFx: true, duration:.35});
        }
    },

    onClickChange : function(local) {
        if (local.left > this.clickRange[0] && local.left < this.clickRange[1]) {
            var thumb = this.getNearest(local, 'top'),
                index = thumb.index,
                value = this.minValue + this.reverseValue(this.innerEl.getHeight() - local.top);

            this.setValue(index, Ext.util.Format.round(value, this.decimalPrecision), undefined, true);
        }
    }
};

//private class to support vertical dragging of thumbs within a slider
Ext.slider.Thumb.Vertical = {
    getNewValue: function() {
        var slider   = this.slider,
            innerEl  = slider.innerEl,
            pos      = innerEl.translatePoints(this.tracker.getXY()),
            bottom   = innerEl.getHeight() - pos.top;

        return slider.minValue + Ext.util.Format.round(bottom / slider.getRatio(), slider.decimalPrecision);
    }
};
/**
 * @class Ext.ProgressBar
 * @extends Ext.BoxComponent
 * <p>An updateable progress bar component.  The progress bar supports two different modes: manual and automatic.</p>
 * <p>In manual mode, you are responsible for showing, updating (via {@link #updateProgress}) and clearing the
 * progress bar as needed from your own code.  This method is most appropriate when you want to show progress
 * throughout an operation that has predictable points of interest at which you can update the control.</p>
 * <p>In automatic mode, you simply call {@link #wait} and let the progress bar run indefinitely, only clearing it
 * once the operation is complete.  You can optionally have the progress bar wait for a specific amount of time
 * and then clear itself.  Automatic mode is most appropriate for timed operations or asynchronous operations in
 * which you have no need for indicating intermediate progress.</p>
 * @cfg {Float} value A floating point value between 0 and 1 (e.g., .5, defaults to 0)
 * @cfg {String} text The progress bar text (defaults to '')
 * @cfg {Mixed} textEl The element to render the progress text to (defaults to the progress
 * bar's internal text element)
 * @cfg {String} id The progress bar element's id (defaults to an auto-generated id)
 * @xtype progress
 */
Ext.ProgressBar = Ext.extend(Ext.BoxComponent, {
   /**
    * @cfg {String} baseCls
    * The base CSS class to apply to the progress bar's wrapper element (defaults to 'x-progress')
    */
    baseCls : 'x-progress',
    
    /**
    * @cfg {Boolean} animate
    * True to animate the progress bar during transitions (defaults to false)
    */
    animate : false,

    // private
    waitTimer : null,

    // private
    initComponent : function(){
        Ext.ProgressBar.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event update
             * Fires after each update interval
             * @param {Ext.ProgressBar} this
             * @param {Number} The current progress value
             * @param {String} The current progress text
             */
            "update"
        );
    },

    // private
    onRender : function(ct, position){
        var tpl = new Ext.Template(
            '<div class="{cls}-wrap">',
                '<div class="{cls}-inner">',
                    '<div class="{cls}-bar">',
                        '<div class="{cls}-text">',
                            '<div>&#160;</div>',
                        '</div>',
                    '</div>',
                    '<div class="{cls}-text {cls}-text-back">',
                        '<div>&#160;</div>',
                    '</div>',
                '</div>',
            '</div>'
        );

        this.el = position ? tpl.insertBefore(position, {cls: this.baseCls}, true)
            : tpl.append(ct, {cls: this.baseCls}, true);
                
        if(this.id){
            this.el.dom.id = this.id;
        }
        var inner = this.el.dom.firstChild;
        this.progressBar = Ext.get(inner.firstChild);

        if(this.textEl){
            //use an external text el
            this.textEl = Ext.get(this.textEl);
            delete this.textTopEl;
        }else{
            //setup our internal layered text els
            this.textTopEl = Ext.get(this.progressBar.dom.firstChild);
            var textBackEl = Ext.get(inner.childNodes[1]);
            this.textTopEl.setStyle("z-index", 99).addClass('x-hidden');
            this.textEl = new Ext.CompositeElement([this.textTopEl.dom.firstChild, textBackEl.dom.firstChild]);
            this.textEl.setWidth(inner.offsetWidth);
        }
        this.progressBar.setHeight(inner.offsetHeight);
    },
    
    // private
    afterRender : function(){
        Ext.ProgressBar.superclass.afterRender.call(this);
        if(this.value){
            this.updateProgress(this.value, this.text);
        }else{
            this.updateText(this.text);
        }
    },

    /**
     * Updates the progress bar value, and optionally its text.  If the text argument is not specified,
     * any existing text value will be unchanged.  To blank out existing text, pass ''.  Note that even
     * if the progress bar value exceeds 1, it will never automatically reset -- you are responsible for
     * determining when the progress is complete and calling {@link #reset} to clear and/or hide the control.
     * @param {Float} value (optional) A floating point value between 0 and 1 (e.g., .5, defaults to 0)
     * @param {String} text (optional) The string to display in the progress text element (defaults to '')
     * @param {Boolean} animate (optional) Whether to animate the transition of the progress bar. If this value is
     * not specified, the default for the class is used (default to false)
     * @return {Ext.ProgressBar} this
     */
    updateProgress : function(value, text, animate){
        this.value = value || 0;
        if(text){
            this.updateText(text);
        }
        if(this.rendered && !this.isDestroyed){
            var w = Math.floor(value*this.el.dom.firstChild.offsetWidth);
            this.progressBar.setWidth(w, animate === true || (animate !== false && this.animate));
            if(this.textTopEl){
                //textTopEl should be the same width as the bar so overflow will clip as the bar moves
                this.textTopEl.removeClass('x-hidden').setWidth(w);
            }
        }
        this.fireEvent('update', this, value, text);
        return this;
    },

    /**
     * Initiates an auto-updating progress bar.  A duration can be specified, in which case the progress
     * bar will automatically reset after a fixed amount of time and optionally call a callback function
     * if specified.  If no duration is passed in, then the progress bar will run indefinitely and must
     * be manually cleared by calling {@link #reset}.  The wait method accepts a config object with
     * the following properties:
     * <pre>
Property   Type          Description
---------- ------------  ----------------------------------------------------------------------
duration   Number        The length of time in milliseconds that the progress bar should
                         run before resetting itself (defaults to undefined, in which case it
                         will run indefinitely until reset is called)
interval   Number        The length of time in milliseconds between each progress update
                         (defaults to 1000 ms)
animate    Boolean       Whether to animate the transition of the progress bar. If this value is
                         not specified, the default for the class is used.                                                   
increment  Number        The number of progress update segments to display within the progress
                         bar (defaults to 10).  If the bar reaches the end and is still
                         updating, it will automatically wrap back to the beginning.
text       String        Optional text to display in the progress bar element (defaults to '').
fn         Function      A callback function to execute after the progress bar finishes auto-
                         updating.  The function will be called with no arguments.  This function
                         will be ignored if duration is not specified since in that case the
                         progress bar can only be stopped programmatically, so any required function
                         should be called by the same code after it resets the progress bar.
scope      Object        The scope that is passed to the callback function (only applies when
                         duration and fn are both passed).
</pre>
         *
         * Example usage:
         * <pre><code>
var p = new Ext.ProgressBar({
   renderTo: 'my-el'
});

//Wait for 5 seconds, then update the status el (progress bar will auto-reset)
p.wait({
   interval: 100, //bar will move fast!
   duration: 5000,
   increment: 15,
   text: 'Updating...',
   scope: this,
   fn: function(){
      Ext.fly('status').update('Done!');
   }
});

//Or update indefinitely until some async action completes, then reset manually
p.wait();
myAction.on('complete', function(){
    p.reset();
    Ext.fly('status').update('Done!');
});
</code></pre>
     * @param {Object} config (optional) Configuration options
     * @return {Ext.ProgressBar} this
     */
    wait : function(o){
        if(!this.waitTimer){
            var scope = this;
            o = o || {};
            this.updateText(o.text);
            this.waitTimer = Ext.TaskMgr.start({
                run: function(i){
                    var inc = o.increment || 10;
                    i -= 1;
                    this.updateProgress(((((i+inc)%inc)+1)*(100/inc))*0.01, null, o.animate);
                },
                interval: o.interval || 1000,
                duration: o.duration,
                onStop: function(){
                    if(o.fn){
                        o.fn.apply(o.scope || this);
                    }
                    this.reset();
                },
                scope: scope
            });
        }
        return this;
    },

    /**
     * Returns true if the progress bar is currently in a {@link #wait} operation
     * @return {Boolean} True if waiting, else false
     */
    isWaiting : function(){
        return this.waitTimer !== null;
    },

    /**
     * Updates the progress bar text.  If specified, textEl will be updated, otherwise the progress
     * bar itself will display the updated text.
     * @param {String} text (optional) The string to display in the progress text element (defaults to '')
     * @return {Ext.ProgressBar} this
     */
    updateText : function(text){
        this.text = text || '&#160;';
        if(this.rendered){
            this.textEl.update(this.text);
        }
        return this;
    },
    
    /**
     * Synchronizes the inner bar width to the proper proportion of the total componet width based
     * on the current progress {@link #value}.  This will be called automatically when the ProgressBar
     * is resized by a layout, but if it is rendered auto width, this method can be called from
     * another resize handler to sync the ProgressBar if necessary.
     */
    syncProgressBar : function(){
        if(this.value){
            this.updateProgress(this.value, this.text);
        }
        return this;
    },

    /**
     * Sets the size of the progress bar.
     * @param {Number} width The new width in pixels
     * @param {Number} height The new height in pixels
     * @return {Ext.ProgressBar} this
     */
    setSize : function(w, h){
        Ext.ProgressBar.superclass.setSize.call(this, w, h);
        if(this.textTopEl){
            var inner = this.el.dom.firstChild;
            this.textEl.setSize(inner.offsetWidth, inner.offsetHeight);
        }
        this.syncProgressBar();
        return this;
    },

    /**
     * Resets the progress bar value to 0 and text to empty string.  If hide = true, the progress
     * bar will also be hidden (using the {@link #hideMode} property internally).
     * @param {Boolean} hide (optional) True to hide the progress bar (defaults to false)
     * @return {Ext.ProgressBar} this
     */
    reset : function(hide){
        this.updateProgress(0);
        if(this.textTopEl){
            this.textTopEl.addClass('x-hidden');
        }
        this.clearTimer();
        if(hide === true){
            this.hide();
        }
        return this;
    },
    
    // private
    clearTimer : function(){
        if(this.waitTimer){
            this.waitTimer.onStop = null; //prevent recursion
            Ext.TaskMgr.stop(this.waitTimer);
            this.waitTimer = null;
        }
    },
    
    onDestroy: function(){
        this.clearTimer();
        if(this.rendered){
            if(this.textEl.isComposite){
                this.textEl.clear();
            }
            Ext.destroyMembers(this, 'textEl', 'progressBar', 'textTopEl');
        }
        Ext.ProgressBar.superclass.onDestroy.call(this);
    }
});
Ext.reg('progress', Ext.ProgressBar);