/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.form.ComboBox
 * @extends Ext.form.TriggerField
 * <p>A combobox control with support for autocomplete, remote-loading, paging and many other features.</p>
 * <p>A ComboBox works in a similar manner to a traditional HTML &lt;select> field. The difference is
 * that to submit the {@link #valueField}, you must specify a {@link #hiddenName} to create a hidden input
 * field to hold the value of the valueField. The <i>{@link #displayField}</i> is shown in the text field
 * which is named according to the {@link #name}.</p>
 * <p><b><u>Events</u></b></p>
 * <p>To do something when something in ComboBox is selected, configure the select event:<pre><code>
var cb = new Ext.form.ComboBox({
    // all of your config options
    listeners:{
         scope: yourScope,
         'select': yourFunction
    }
});

// Alternatively, you can assign events after the object is created:
var cb = new Ext.form.ComboBox(yourOptions);
cb.on('select', yourFunction, yourScope);
 * </code></pre></p>
 *
 * <p><b><u>ComboBox in Grid</u></b></p>
 * <p>If using a ComboBox in an {@link Ext.grid.EditorGridPanel Editor Grid} a {@link Ext.grid.Column#renderer renderer}
 * will be needed to show the displayField when the editor is not active.  Set up the renderer manually, or implement
 * a reusable render, for example:<pre><code>
// create reusable renderer
Ext.util.Format.comboRenderer = function(combo){
    return function(value){
        var record = combo.findRecord(combo.{@link #valueField}, value);
        return record ? record.get(combo.{@link #displayField}) : combo.{@link #valueNotFoundText};
    }
}

// create the combo instance
var combo = new Ext.form.ComboBox({
    {@link #typeAhead}: true,
    {@link #triggerAction}: 'all',
    {@link #lazyRender}:true,
    {@link #mode}: 'local',
    {@link #store}: new Ext.data.ArrayStore({
        id: 0,
        fields: [
            'myId',
            'displayText'
        ],
        data: [[1, 'item1'], [2, 'item2']]
    }),
    {@link #valueField}: 'myId',
    {@link #displayField}: 'displayText'
});

// snippet of column model used within grid
var cm = new Ext.grid.ColumnModel([{
       ...
    },{
       header: "Some Header",
       dataIndex: 'whatever',
       width: 130,
       editor: combo, // specify reference to combo instance
       renderer: Ext.util.Format.comboRenderer(combo) // pass combo instance to reusable renderer
    },
    ...
]);
 * </code></pre></p>
 *
 * <p><b><u>Filtering</u></b></p>
 * <p>A ComboBox {@link #doQuery uses filtering itself}, for information about filtering the ComboBox
 * store manually see <tt>{@link #lastQuery}</tt>.</p>
 * @constructor
 * Create a new ComboBox.
 * @param {Object} config Configuration options
 * @xtype combo
 */
Ext.form.ComboBox = Ext.extend(Ext.form.TriggerField, {
    /**
     * @cfg {Mixed} transform The id, DOM node or element of an existing HTML SELECT to convert to a ComboBox.
     * Note that if you specify this and the combo is going to be in an {@link Ext.form.BasicForm} or
     * {@link Ext.form.FormPanel}, you must also set <tt>{@link #lazyRender} = true</tt>.
     */
    /**
     * @cfg {Boolean} lazyRender <tt>true</tt> to prevent the ComboBox from rendering until requested
     * (should always be used when rendering into an {@link Ext.Editor} (e.g. {@link Ext.grid.EditorGridPanel Grids}),
     * defaults to <tt>false</tt>).
     */
    /**
     * @cfg {String/Object} autoCreate <p>A {@link Ext.DomHelper DomHelper} element spec, or <tt>true</tt> for a default
     * element spec. Used to create the {@link Ext.Component#getEl Element} which will encapsulate this Component.
     * See <tt>{@link Ext.Component#autoEl autoEl}</tt> for details.  Defaults to:</p>
     * <pre><code>{tag: "input", type: "text", size: "24", autocomplete: "off"}</code></pre>
     */
    /**
     * @cfg {Ext.data.Store/Array} store The data source to which this combo is bound (defaults to <tt>undefined</tt>).
     * Acceptable values for this property are:
     * <div class="mdetail-params"><ul>
     * <li><b>any {@link Ext.data.Store Store} subclass</b></li>
     * <li><b>an Array</b> : Arrays will be converted to a {@link Ext.data.ArrayStore} internally,
     * automatically generating {@link Ext.data.Field#name field names} to work with all data components.
     * <div class="mdetail-params"><ul>
     * <li><b>1-dimensional array</b> : (e.g., <tt>['Foo','Bar']</tt>)<div class="sub-desc">
     * A 1-dimensional array will automatically be expanded (each array item will be used for both the combo
     * {@link #valueField} and {@link #displayField})</div></li>
     * <li><b>2-dimensional array</b> : (e.g., <tt>[['f','Foo'],['b','Bar']]</tt>)<div class="sub-desc">
     * For a multi-dimensional array, the value in index 0 of each item will be assumed to be the combo
     * {@link #valueField}, while the value at index 1 is assumed to be the combo {@link #displayField}.
     * </div></li></ul></div></li></ul></div>
     * <p>See also <tt>{@link #mode}</tt>.</p>
     */
    /**
     * @cfg {String} title If supplied, a header element is created containing this text and added into the top of
     * the dropdown list (defaults to undefined, with no header element)
     */

    // private
    defaultAutoCreate : {tag: "input", type: "text", size: "24", autocomplete: "off"},
    /**
     * @cfg {Number} listWidth The width (used as a parameter to {@link Ext.Element#setWidth}) of the dropdown
     * list (defaults to the width of the ComboBox field).  See also <tt>{@link #minListWidth}
     */
    /**
     * @cfg {String} displayField The underlying {@link Ext.data.Field#name data field name} to bind to this
     * ComboBox (defaults to undefined if <tt>{@link #mode} = 'remote'</tt> or <tt>'field1'</tt> if
     * {@link #transform transforming a select} or if the {@link #store field name is autogenerated based on
     * the store configuration}).
     * <p>See also <tt>{@link #valueField}</tt>.</p>
     * <p><b>Note</b>: if using a ComboBox in an {@link Ext.grid.EditorGridPanel Editor Grid} a
     * {@link Ext.grid.Column#renderer renderer} will be needed to show the displayField when the editor is not
     * active.</p>
     */
    /**
     * @cfg {String} valueField The underlying {@link Ext.data.Field#name data value name} to bind to this
     * ComboBox (defaults to undefined if <tt>{@link #mode} = 'remote'</tt> or <tt>'field2'</tt> if
     * {@link #transform transforming a select} or if the {@link #store field name is autogenerated based on
     * the store configuration}).
     * <p><b>Note</b>: use of a <tt>valueField</tt> requires the user to make a selection in order for a value to be
     * mapped.  See also <tt>{@link #hiddenName}</tt>, <tt>{@link #hiddenValue}</tt>, and <tt>{@link #displayField}</tt>.</p>
     */
    /**
     * @cfg {String} hiddenName If specified, a hidden form field with this name is dynamically generated to store the
     * field's data value (defaults to the underlying DOM element's name). Required for the combo's value to automatically
     * post during a form submission.  See also {@link #valueField}.
     */
    /**
     * @cfg {String} hiddenId If <tt>{@link #hiddenName}</tt> is specified, <tt>hiddenId</tt> can also be provided
     * to give the hidden field a unique id.  The <tt>hiddenId</tt> and combo {@link Ext.Component#id id} should be 
     * different, since no two DOM nodes should share the same id.
     */
    /**
     * @cfg {String} hiddenValue Sets the initial value of the hidden field if {@link #hiddenName} is
     * specified to contain the selected {@link #valueField}, from the Store. Defaults to the configured
     * <tt>{@link Ext.form.Field#value value}</tt>.
     */
    /**
     * @cfg {String} listClass The CSS class to add to the predefined <tt>'x-combo-list'</tt> class
     * applied the dropdown list element (defaults to '').
     */
    listClass : '',
    /**
     * @cfg {String} selectedClass CSS class to apply to the selected item in the dropdown list
     * (defaults to <tt>'x-combo-selected'</tt>)
     */
    selectedClass : 'x-combo-selected',
    /**
     * @cfg {String} listEmptyText The empty text to display in the data view if no items are found.
     * (defaults to '')
     */
    listEmptyText: '',
    /**
     * @cfg {String} triggerClass An additional CSS class used to style the trigger button.  The trigger will always
     * get the class <tt>'x-form-trigger'</tt> and <tt>triggerClass</tt> will be <b>appended</b> if specified
     * (defaults to <tt>'x-form-arrow-trigger'</tt> which displays a downward arrow icon).
     */
    triggerClass : 'x-form-arrow-trigger',
    /**
     * @cfg {Boolean/String} shadow <tt>true</tt> or <tt>"sides"</tt> for the default effect, <tt>"frame"</tt> for
     * 4-way shadow, and <tt>"drop"</tt> for bottom-right
     */
    shadow : 'sides',
    /**
     * @cfg {String/Array} listAlign A valid anchor position value. See <tt>{@link Ext.Element#alignTo}</tt> for details
     * on supported anchor positions and offsets. To specify x/y offsets as well, this value
     * may be specified as an Array of <tt>{@link Ext.Element#alignTo}</tt> method arguments.</p>
     * <pre><code>[ 'tl-bl?', [6,0] ]</code></pre>(defaults to <tt>'tl-bl?'</tt>)
     */
    listAlign : 'tl-bl?',
    /**
     * @cfg {Number} maxHeight The maximum height in pixels of the dropdown list before scrollbars are shown
     * (defaults to <tt>300</tt>)
     */
    maxHeight : 300,
    /**
     * @cfg {Number} minHeight The minimum height in pixels of the dropdown list when the list is constrained by its
     * distance to the viewport edges (defaults to <tt>90</tt>)
     */
    minHeight : 90,
    /**
     * @cfg {String} triggerAction The action to execute when the trigger is clicked.
     * <div class="mdetail-params"><ul>
     * <li><b><tt>'query'</tt></b> : <b>Default</b>
     * <p class="sub-desc">{@link #doQuery run the query} using the {@link Ext.form.Field#getRawValue raw value}.</p></li>
     * <li><b><tt>'all'</tt></b> :
     * <p class="sub-desc">{@link #doQuery run the query} specified by the <tt>{@link #allQuery}</tt> config option</p></li>
     * </ul></div>
     * <p>See also <code>{@link #queryParam}</code>.</p>
     */
    triggerAction : 'query',
    /**
     * @cfg {Number} minChars The minimum number of characters the user must type before autocomplete and
     * {@link #typeAhead} activate (defaults to <tt>4</tt> if <tt>{@link #mode} = 'remote'</tt> or <tt>0</tt> if
     * <tt>{@link #mode} = 'local'</tt>, does not apply if
     * <tt>{@link Ext.form.TriggerField#editable editable} = false</tt>).
     */
    minChars : 4,
    /**
     * @cfg {Boolean} autoSelect <tt>true</tt> to select the first result gathered by the data store (defaults
     * to <tt>true</tt>).  A false value would require a manual selection from the dropdown list to set the components value
     * unless the value of ({@link #typeAheadDelay}) were true.
     */
    autoSelect : true,
    /**
     * @cfg {Boolean} typeAhead <tt>true</tt> to populate and autoselect the remainder of the text being
     * typed after a configurable delay ({@link #typeAheadDelay}) if it matches a known value (defaults
     * to <tt>false</tt>)
     */
    typeAhead : false,
    /**
     * @cfg {Number} queryDelay The length of time in milliseconds to delay between the start of typing and
     * sending the query to filter the dropdown list (defaults to <tt>500</tt> if <tt>{@link #mode} = 'remote'</tt>
     * or <tt>10</tt> if <tt>{@link #mode} = 'local'</tt>)
     */
    queryDelay : 500,
    /**
     * @cfg {Number} pageSize If greater than <tt>0</tt>, a {@link Ext.PagingToolbar} is displayed in the
     * footer of the dropdown list and the {@link #doQuery filter queries} will execute with page start and
     * {@link Ext.PagingToolbar#pageSize limit} parameters. Only applies when <tt>{@link #mode} = 'remote'</tt>
     * (defaults to <tt>0</tt>).
     */
    pageSize : 0,
    /**
     * @cfg {Boolean} selectOnFocus <tt>true</tt> to select any existing text in the field immediately on focus.
     * Only applies when <tt>{@link Ext.form.TriggerField#editable editable} = true</tt> (defaults to
     * <tt>false</tt>).
     */
    selectOnFocus : false,
    /**
     * @cfg {String} queryParam Name of the query ({@link Ext.data.Store#baseParam baseParam} name for the store)
     * as it will be passed on the querystring (defaults to <tt>'query'</tt>)
     */
    queryParam : 'query',
    /**
     * @cfg {String} loadingText The text to display in the dropdown list while data is loading.  Only applies
     * when <tt>{@link #mode} = 'remote'</tt> (defaults to <tt>'Loading...'</tt>)
     */
    loadingText : 'Loading...',
    /**
     * @cfg {Boolean} resizable <tt>true</tt> to add a resize handle to the bottom of the dropdown list
     * (creates an {@link Ext.Resizable} with 'se' {@link Ext.Resizable#pinned pinned} handles).
     * Defaults to <tt>false</tt>.
     */
    resizable : false,
    /**
     * @cfg {Number} handleHeight The height in pixels of the dropdown list resize handle if
     * <tt>{@link #resizable} = true</tt> (defaults to <tt>8</tt>)
     */
    handleHeight : 8,
    /**
     * @cfg {String} allQuery The text query to send to the server to return all records for the list
     * with no filtering (defaults to '')
     */
    allQuery: '',
    /**
     * @cfg {String} mode Acceptable values are:
     * <div class="mdetail-params"><ul>
     * <li><b><tt>'remote'</tt></b> : <b>Default</b>
     * <p class="sub-desc">Automatically loads the <tt>{@link #store}</tt> the <b>first</b> time the trigger
     * is clicked. If you do not want the store to be automatically loaded the first time the trigger is
     * clicked, set to <tt>'local'</tt> and manually load the store.  To force a requery of the store
     * <b>every</b> time the trigger is clicked see <tt>{@link #lastQuery}</tt>.</p></li>
     * <li><b><tt>'local'</tt></b> :
     * <p class="sub-desc">ComboBox loads local data</p>
     * <pre><code>
var combo = new Ext.form.ComboBox({
    renderTo: document.body,
    mode: 'local',
    store: new Ext.data.ArrayStore({
        id: 0,
        fields: [
            'myId',  // numeric value is the key
            'displayText'
        ],
        data: [[1, 'item1'], [2, 'item2']]  // data is local
    }),
    valueField: 'myId',
    displayField: 'displayText',
    triggerAction: 'all'
});
     * </code></pre></li>
     * </ul></div>
     */
    mode: 'remote',
    /**
     * @cfg {Number} minListWidth The minimum width of the dropdown list in pixels (defaults to <tt>70</tt>, will
     * be ignored if <tt>{@link #listWidth}</tt> has a higher value)
     */
    minListWidth : 70,
    /**
     * @cfg {Boolean} forceSelection <tt>true</tt> to restrict the selected value to one of the values in the list,
     * <tt>false</tt> to allow the user to set arbitrary text into the field (defaults to <tt>false</tt>)
     */
    forceSelection : false,
    /**
     * @cfg {Number} typeAheadDelay The length of time in milliseconds to wait until the typeahead text is displayed
     * if <tt>{@link #typeAhead} = true</tt> (defaults to <tt>250</tt>)
     */
    typeAheadDelay : 250,
    /**
     * @cfg {String} valueNotFoundText When using a name/value combo, if the value passed to setValue is not found in
     * the store, valueNotFoundText will be displayed as the field text if defined (defaults to undefined). If this
     * default text is used, it means there is no value set and no validation will occur on this field.
     */

    /**
     * @cfg {Boolean} lazyInit <tt>true</tt> to not initialize the list for this combo until the field is focused
     * (defaults to <tt>true</tt>)
     */
    lazyInit : true,

    /**
     * @cfg {Boolean} clearFilterOnReset <tt>true</tt> to clear any filters on the store (when in local mode) when reset is called
     * (defaults to <tt>true</tt>)
     */
    clearFilterOnReset : true,

    /**
     * @cfg {Boolean} submitValue False to clear the name attribute on the field so that it is not submitted during a form post.
     * If a hiddenName is specified, setting this to true will cause both the hidden field and the element to be submitted.
     * Defaults to <tt>undefined</tt>.
     */
    submitValue: undefined,

    /**
     * The value of the match string used to filter the store. Delete this property to force a requery.
     * Example use:
     * <pre><code>
var combo = new Ext.form.ComboBox({
    ...
    mode: 'remote',
    ...
    listeners: {
        // delete the previous query in the beforequery event or set
        // combo.lastQuery = null (this will reload the store the next time it expands)
        beforequery: function(qe){
            delete qe.combo.lastQuery;
        }
    }
});
     * </code></pre>
     * To make sure the filter in the store is not cleared the first time the ComboBox trigger is used
     * configure the combo with <tt>lastQuery=''</tt>. Example use:
     * <pre><code>
var combo = new Ext.form.ComboBox({
    ...
    mode: 'local',
    triggerAction: 'all',
    lastQuery: ''
});
     * </code></pre>
     * @property lastQuery
     * @type String
     */

    // private
    initComponent : function(){
        Ext.form.ComboBox.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event expand
             * Fires when the dropdown list is expanded
             * @param {Ext.form.ComboBox} combo This combo box
             */
            'expand',
            /**
             * @event collapse
             * Fires when the dropdown list is collapsed
             * @param {Ext.form.ComboBox} combo This combo box
             */
            'collapse',

            /**
             * @event beforeselect
             * Fires before a list item is selected. Return false to cancel the selection.
             * @param {Ext.form.ComboBox} combo This combo box
             * @param {Ext.data.Record} record The data record returned from the underlying store
             * @param {Number} index The index of the selected item in the dropdown list
             */
            'beforeselect',
            /**
             * @event select
             * Fires when a list item is selected
             * @param {Ext.form.ComboBox} combo This combo box
             * @param {Ext.data.Record} record The data record returned from the underlying store
             * @param {Number} index The index of the selected item in the dropdown list
             */
            'select',
            /**
             * @event beforequery
             * Fires before all queries are processed. Return false to cancel the query or set the queryEvent's
             * cancel property to true.
             * @param {Object} queryEvent An object that has these properties:<ul>
             * <li><code>combo</code> : Ext.form.ComboBox <div class="sub-desc">This combo box</div></li>
             * <li><code>query</code> : String <div class="sub-desc">The query</div></li>
             * <li><code>forceAll</code> : Boolean <div class="sub-desc">True to force "all" query</div></li>
             * <li><code>cancel</code> : Boolean <div class="sub-desc">Set to true to cancel the query</div></li>
             * </ul>
             */
            'beforequery'
        );
        if(this.transform){
            var s = Ext.getDom(this.transform);
            if(!this.hiddenName){
                this.hiddenName = s.name;
            }
            if(!this.store){
                this.mode = 'local';
                var d = [], opts = s.options;
                for(var i = 0, len = opts.length;i < len; i++){
                    var o = opts[i],
                        value = (o.hasAttribute ? o.hasAttribute('value') : o.getAttributeNode('value').specified) ? o.value : o.text;
                    if(o.selected && Ext.isEmpty(this.value, true)) {
                        this.value = value;
                    }
                    d.push([value, o.text]);
                }
                this.store = new Ext.data.ArrayStore({
                    idIndex: 0,
                    fields: ['value', 'text'],
                    data : d,
                    autoDestroy: true
                });
                this.valueField = 'value';
                this.displayField = 'text';
            }
            s.name = Ext.id(); // wipe out the name in case somewhere else they have a reference
            if(!this.lazyRender){
                this.target = true;
                this.el = Ext.DomHelper.insertBefore(s, this.autoCreate || this.defaultAutoCreate);
                this.render(this.el.parentNode, s);
            }
            Ext.removeNode(s);
        }
        //auto-configure store from local array data
        else if(this.store){
            this.store = Ext.StoreMgr.lookup(this.store);
            if(this.store.autoCreated){
                this.displayField = this.valueField = 'field1';
                if(!this.store.expandData){
                    this.displayField = 'field2';
                }
                this.mode = 'local';
            }
        }

        this.selectedIndex = -1;
        if(this.mode == 'local'){
            if(!Ext.isDefined(this.initialConfig.queryDelay)){
                this.queryDelay = 10;
            }
            if(!Ext.isDefined(this.initialConfig.minChars)){
                this.minChars = 0;
            }
        }
    },

    // private
    onRender : function(ct, position){
        if(this.hiddenName && !Ext.isDefined(this.submitValue)){
            this.submitValue = false;
        }
        Ext.form.ComboBox.superclass.onRender.call(this, ct, position);
        if(this.hiddenName){
            this.hiddenField = this.el.insertSibling({tag:'input', type:'hidden', name: this.hiddenName,
                    id: (this.hiddenId || Ext.id())}, 'before', true);

        }
        if(Ext.isGecko){
            this.el.dom.setAttribute('autocomplete', 'off');
        }

        if(!this.lazyInit){
            this.initList();
        }else{
            this.on('focus', this.initList, this, {single: true});
        }
    },

    // private
    initValue : function(){
        Ext.form.ComboBox.superclass.initValue.call(this);
        if(this.hiddenField){
            this.hiddenField.value =
                Ext.value(Ext.isDefined(this.hiddenValue) ? this.hiddenValue : this.value, '');
        }
    },

    getParentZIndex : function(){
        var zindex;
        if (this.ownerCt){
            this.findParentBy(function(ct){
                zindex = parseInt(ct.getPositionEl().getStyle('z-index'), 10);
                return !!zindex;
            });
        }
        return zindex;
    },
    
    getZIndex : function(listParent){
        listParent = listParent || Ext.getDom(this.getListParent() || Ext.getBody());
        var zindex = parseInt(Ext.fly(listParent).getStyle('z-index'), 10);
        if(!zindex){
            zindex = this.getParentZIndex();
        }
        return (zindex || 12000) + 5;
    },

    // private
    initList : function(){
        if(!this.list){
            var cls = 'x-combo-list',
                listParent = Ext.getDom(this.getListParent() || Ext.getBody());

            this.list = new Ext.Layer({
                parentEl: listParent,
                shadow: this.shadow,
                cls: [cls, this.listClass].join(' '),
                constrain:false,
                zindex: this.getZIndex(listParent)
            });

            var lw = this.listWidth || Math.max(this.wrap.getWidth(), this.minListWidth);
            this.list.setSize(lw, 0);
            this.list.swallowEvent('mousewheel');
            this.assetHeight = 0;
            if(this.syncFont !== false){
                this.list.setStyle('font-size', this.el.getStyle('font-size'));
            }
            if(this.title){
                this.header = this.list.createChild({cls:cls+'-hd', html: this.title});
                this.assetHeight += this.header.getHeight();
            }

            this.innerList = this.list.createChild({cls:cls+'-inner'});
            this.mon(this.innerList, 'mouseover', this.onViewOver, this);
            this.mon(this.innerList, 'mousemove', this.onViewMove, this);
            this.innerList.setWidth(lw - this.list.getFrameWidth('lr'));

            if(this.pageSize){
                this.footer = this.list.createChild({cls:cls+'-ft'});
                this.pageTb = new Ext.PagingToolbar({
                    store: this.store,
                    pageSize: this.pageSize,
                    renderTo:this.footer
                });
                this.assetHeight += this.footer.getHeight();
            }

            if(!this.tpl){
                /**
                * @cfg {String/Ext.XTemplate} tpl <p>The template string, or {@link Ext.XTemplate} instance to
                * use to display each item in the dropdown list. The dropdown list is displayed in a
                * DataView. See {@link #view}.</p>
                * <p>The default template string is:</p><pre><code>
                  '&lt;tpl for=".">&lt;div class="x-combo-list-item">{' + this.displayField + '}&lt;/div>&lt;/tpl>'
                * </code></pre>
                * <p>Override the default value to create custom UI layouts for items in the list.
                * For example:</p><pre><code>
                  '&lt;tpl for=".">&lt;div ext:qtip="{state}. {nick}" class="x-combo-list-item">{state}&lt;/div>&lt;/tpl>'
                * </code></pre>
                * <p>The template <b>must</b> contain one or more substitution parameters using field
                * names from the Combo's</b> {@link #store Store}. In the example above an
                * <pre>ext:qtip</pre> attribute is added to display other fields from the Store.</p>
                * <p>To preserve the default visual look of list items, add the CSS class name
                * <pre>x-combo-list-item</pre> to the template's container element.</p>
                * <p>Also see {@link #itemSelector} for additional details.</p>
                */
                this.tpl = '<tpl for="."><div class="'+cls+'-item">{' + this.displayField + '}</div></tpl>';
                /**
                 * @cfg {String} itemSelector
                 * <p>A simple CSS selector (e.g. div.some-class or span:first-child) that will be
                 * used to determine what nodes the {@link #view Ext.DataView} which handles the dropdown
                 * display will be working with.</p>
                 * <p><b>Note</b>: this setting is <b>required</b> if a custom XTemplate has been
                 * specified in {@link #tpl} which assigns a class other than <pre>'x-combo-list-item'</pre>
                 * to dropdown list items</b>
                 */
            }

            /**
            * The {@link Ext.DataView DataView} used to display the ComboBox's options.
            * @type Ext.DataView
            */
            this.view = new Ext.DataView({
                applyTo: this.innerList,
                tpl: this.tpl,
                singleSelect: true,
                selectedClass: this.selectedClass,
                itemSelector: this.itemSelector || '.' + cls + '-item',
                emptyText: this.listEmptyText,
                deferEmptyText: false
            });

            this.mon(this.view, {
                containerclick : this.onViewClick,
                click : this.onViewClick,
                scope :this
            });

            this.bindStore(this.store, true);

            if(this.resizable){
                this.resizer = new Ext.Resizable(this.list,  {
                   pinned:true, handles:'se'
                });
                this.mon(this.resizer, 'resize', function(r, w, h){
                    this.maxHeight = h-this.handleHeight-this.list.getFrameWidth('tb')-this.assetHeight;
                    this.listWidth = w;
                    this.innerList.setWidth(w - this.list.getFrameWidth('lr'));
                    this.restrictHeight();
                }, this);

                this[this.pageSize?'footer':'innerList'].setStyle('margin-bottom', this.handleHeight+'px');
            }
        }
    },

    /**
     * <p>Returns the element used to house this ComboBox's pop-up list. Defaults to the document body.</p>
     * A custom implementation may be provided as a configuration option if the floating list needs to be rendered
     * to a different Element. An example might be rendering the list inside a Menu so that clicking
     * the list does not hide the Menu:<pre><code>
var store = new Ext.data.ArrayStore({
    autoDestroy: true,
    fields: ['initials', 'fullname'],
    data : [
        ['FF', 'Fred Flintstone'],
        ['BR', 'Barney Rubble']
    ]
});

var combo = new Ext.form.ComboBox({
    store: store,
    displayField: 'fullname',
    emptyText: 'Select a name...',
    forceSelection: true,
    getListParent: function() {
        return this.el.up('.x-menu');
    },
    iconCls: 'no-icon', //use iconCls if placing within menu to shift to right side of menu
    mode: 'local',
    selectOnFocus: true,
    triggerAction: 'all',
    typeAhead: true,
    width: 135
});

var menu = new Ext.menu.Menu({
    id: 'mainMenu',
    items: [
        combo // A Field in a Menu
    ]
});
</code></pre>
     */
    getListParent : function() {
        return document.body;
    },

    /**
     * Returns the store associated with this combo.
     * @return {Ext.data.Store} The store
     */
    getStore : function(){
        return this.store;
    },

    // private
    bindStore : function(store, initial){
        if(this.store && !initial){
            if(this.store !== store && this.store.autoDestroy){
                this.store.destroy();
            }else{
                this.store.un('beforeload', this.onBeforeLoad, this);
                this.store.un('load', this.onLoad, this);
                this.store.un('exception', this.collapse, this);
            }
            if(!store){
                this.store = null;
                if(this.view){
                    this.view.bindStore(null);
                }
                if(this.pageTb){
                    this.pageTb.bindStore(null);
                }
            }
        }
        if(store){
            if(!initial) {
                this.lastQuery = null;
                if(this.pageTb) {
                    this.pageTb.bindStore(store);
                }
            }

            this.store = Ext.StoreMgr.lookup(store);
            this.store.on({
                scope: this,
                beforeload: this.onBeforeLoad,
                load: this.onLoad,
                exception: this.collapse
            });

            if(this.view){
                this.view.bindStore(store);
            }
        }
    },

    reset : function(){
        if(this.clearFilterOnReset && this.mode == 'local'){
            this.store.clearFilter();
        }
        Ext.form.ComboBox.superclass.reset.call(this);
    },

    // private
    initEvents : function(){
        Ext.form.ComboBox.superclass.initEvents.call(this);

        /**
         * @property keyNav
         * @type Ext.KeyNav
         * <p>A {@link Ext.KeyNav KeyNav} object which handles navigation keys for this ComboBox. This performs actions
         * based on keystrokes typed when the input field is focused.</p>
         * <p><b>After the ComboBox has been rendered</b>, you may override existing navigation key functionality,
         * or add your own based upon key names as specified in the {@link Ext.KeyNav KeyNav} class.</p>
         * <p>The function is executed in the scope (<code>this</code> reference of the ComboBox. Example:</p><pre><code>
myCombo.keyNav.esc = function(e) {  // Override ESC handling function
    this.collapse();                // Standard behaviour of Ext's ComboBox.
    this.setValue(this.startValue); // We reset to starting value on ESC
};
myCombo.keyNav.tab = function() {   // Override TAB handling function
    this.onViewClick(false);        // Select the currently highlighted row
};
</code></pre>
         */
        this.keyNav = new Ext.KeyNav(this.el, {
            "up" : function(e){
                this.inKeyMode = true;
                this.selectPrev();
            },

            "down" : function(e){
                if(!this.isExpanded()){
                    this.onTriggerClick();
                }else{
                    this.inKeyMode = true;
                    this.selectNext();
                }
            },

            "enter" : function(e){
                this.onViewClick();
            },

            "esc" : function(e){
                this.collapse();
            },

            "tab" : function(e){
                if (this.forceSelection === true) {
                    this.collapse();
                } else {
                    this.onViewClick(false);
                }
                return true;
            },

            scope : this,

            doRelay : function(e, h, hname){
                if(hname == 'down' || this.scope.isExpanded()){
                    // this MUST be called before ComboBox#fireKey()
                    var relay = Ext.KeyNav.prototype.doRelay.apply(this, arguments);
                    if(!Ext.isIE && Ext.EventManager.useKeydown){
                        // call Combo#fireKey() for browsers which use keydown event (except IE)
                        this.scope.fireKey(e);
                    }
                    return relay;
                }
                return true;
            },

            forceKeyDown : true,
            defaultEventAction: 'stopEvent'
        });
        this.queryDelay = Math.max(this.queryDelay || 10,
                this.mode == 'local' ? 10 : 250);
        this.dqTask = new Ext.util.DelayedTask(this.initQuery, this);
        if(this.typeAhead){
            this.taTask = new Ext.util.DelayedTask(this.onTypeAhead, this);
        }
        if(!this.enableKeyEvents){
            this.mon(this.el, 'keyup', this.onKeyUp, this);
        }
    },


    // private
    onDestroy : function(){
        if (this.dqTask){
            this.dqTask.cancel();
            this.dqTask = null;
        }
        this.bindStore(null);
        Ext.destroy(
            this.resizer,
            this.view,
            this.pageTb,
            this.list
        );
        Ext.destroyMembers(this, 'hiddenField');
        Ext.form.ComboBox.superclass.onDestroy.call(this);
    },

    // private
    fireKey : function(e){
        if (!this.isExpanded()) {
            Ext.form.ComboBox.superclass.fireKey.call(this, e);
        }
    },

    // private
    onResize : function(w, h){
        Ext.form.ComboBox.superclass.onResize.apply(this, arguments);
        if(!isNaN(w) && this.isVisible() && this.list){
            this.doResize(w);
        }else{
            this.bufferSize = w;
        }
    },

    doResize: function(w){
        if(!Ext.isDefined(this.listWidth)){
            var lw = Math.max(w, this.minListWidth);
            this.list.setWidth(lw);
            this.innerList.setWidth(lw - this.list.getFrameWidth('lr'));
        }
    },

    // private
    onEnable : function(){
        Ext.form.ComboBox.superclass.onEnable.apply(this, arguments);
        if(this.hiddenField){
            this.hiddenField.disabled = false;
        }
    },

    // private
    onDisable : function(){
        Ext.form.ComboBox.superclass.onDisable.apply(this, arguments);
        if(this.hiddenField){
            this.hiddenField.disabled = true;
        }
    },

    // private
    onBeforeLoad : function(){
        if(!this.hasFocus){
            return;
        }
        this.innerList.update(this.loadingText ?
               '<div class="loading-indicator">'+this.loadingText+'</div>' : '');
        this.restrictHeight();
        this.selectedIndex = -1;
    },

    // private
    onLoad : function(){
        if(!this.hasFocus){
            return;
        }
        if(this.store.getCount() > 0 || this.listEmptyText){
            this.expand();
            this.restrictHeight();
            if(this.lastQuery == this.allQuery){
                if(this.editable){
                    this.el.dom.select();
                }

                if(this.autoSelect !== false && !this.selectByValue(this.value, true)){
                    this.select(0, true);
                }
            }else{
                if(this.autoSelect !== false){
                    this.selectNext();
                }
                if(this.typeAhead && this.lastKey != Ext.EventObject.BACKSPACE && this.lastKey != Ext.EventObject.DELETE){
                    this.taTask.delay(this.typeAheadDelay);
                }
            }
        }else{
            this.collapse();
        }

    },

    // private
    onTypeAhead : function(){
        if(this.store.getCount() > 0){
            var r = this.store.getAt(0);
            var newValue = r.data[this.displayField];
            var len = newValue.length;
            var selStart = this.getRawValue().length;
            if(selStart != len){
                this.setRawValue(newValue);
                this.selectText(selStart, newValue.length);
            }
        }
    },

    // private
    assertValue : function(){
        var val = this.getRawValue(),
            rec;

        if(this.valueField && Ext.isDefined(this.value)){
            rec = this.findRecord(this.valueField, this.value);
        }
        if(!rec || rec.get(this.displayField) != val){
            rec = this.findRecord(this.displayField, val);
        }
        if(!rec && this.forceSelection){
            if(val.length > 0 && val != this.emptyText){
                this.el.dom.value = Ext.value(this.lastSelectionText, '');
                this.applyEmptyText();
            }else{
                this.clearValue();
            }
        }else{
            if(rec && this.valueField){
                // onSelect may have already set the value and by doing so
                // set the display field properly.  Let's not wipe out the
                // valueField here by just sending the displayField.
                if (this.value == val){
                    return;
                }
                val = rec.get(this.valueField || this.displayField);
            }
            this.setValue(val);
        }
    },

    // private
    onSelect : function(record, index){
        if(this.fireEvent('beforeselect', this, record, index) !== false){
            this.setValue(record.data[this.valueField || this.displayField]);
            this.collapse();
            this.fireEvent('select', this, record, index);
        }
    },

    // inherit docs
    getName: function(){
        var hf = this.hiddenField;
        return hf && hf.name ? hf.name : this.hiddenName || Ext.form.ComboBox.superclass.getName.call(this);
    },

    /**
     * Returns the currently selected field value or empty string if no value is set.
     * @return {String} value The selected value
     */
    getValue : function(){
        if(this.valueField){
            return Ext.isDefined(this.value) ? this.value : '';
        }else{
            return Ext.form.ComboBox.superclass.getValue.call(this);
        }
    },

    /**
     * Clears any text/value currently set in the field
     */
    clearValue : function(){
        if(this.hiddenField){
            this.hiddenField.value = '';
        }
        this.setRawValue('');
        this.lastSelectionText = '';
        this.applyEmptyText();
        this.value = '';
    },

    /**
     * Sets the specified value into the field.  If the value finds a match, the corresponding record text
     * will be displayed in the field.  If the value does not match the data value of an existing item,
     * and the valueNotFoundText config option is defined, it will be displayed as the default field text.
     * Otherwise the field will be blank (although the value will still be set).
     * @param {String} value The value to match
     * @return {Ext.form.Field} this
     */
    setValue : function(v){
        var text = v;
        if(this.valueField){
            var r = this.findRecord(this.valueField, v);
            if(r){
                text = r.data[this.displayField];
            }else if(Ext.isDefined(this.valueNotFoundText)){
                text = this.valueNotFoundText;
            }
        }
        this.lastSelectionText = text;
        if(this.hiddenField){
            this.hiddenField.value = Ext.value(v, '');
        }
        Ext.form.ComboBox.superclass.setValue.call(this, text);
        this.value = v;
        return this;
    },

    // private
    findRecord : function(prop, value){
        var record;
        if(this.store.getCount() > 0){
            this.store.each(function(r){
                if(r.data[prop] == value){
                    record = r;
                    return false;
                }
            });
        }
        return record;
    },

    // private
    onViewMove : function(e, t){
        this.inKeyMode = false;
    },

    // private
    onViewOver : function(e, t){
        if(this.inKeyMode){ // prevent key nav and mouse over conflicts
            return;
        }
        var item = this.view.findItemFromChild(t);
        if(item){
            var index = this.view.indexOf(item);
            this.select(index, false);
        }
    },

    // private
    onViewClick : function(doFocus){
        var index = this.view.getSelectedIndexes()[0],
            s = this.store,
            r = s.getAt(index);
        if(r){
            this.onSelect(r, index);
        }else {
            this.collapse();
        }
        if(doFocus !== false){
            this.el.focus();
        }
    },


    // private
    restrictHeight : function(){
        this.innerList.dom.style.height = '';
        var inner = this.innerList.dom,
            pad = this.list.getFrameWidth('tb') + (this.resizable ? this.handleHeight : 0) + this.assetHeight,
            h = Math.max(inner.clientHeight, inner.offsetHeight, inner.scrollHeight),
            ha = this.getPosition()[1]-Ext.getBody().getScroll().top,
            hb = Ext.lib.Dom.getViewHeight()-ha-this.getSize().height,
            space = Math.max(ha, hb, this.minHeight || 0)-this.list.shadowOffset-pad-5;

        h = Math.min(h, space, this.maxHeight);

        this.innerList.setHeight(h);
        this.list.beginUpdate();
        this.list.setHeight(h+pad);
        this.list.alignTo.apply(this.list, [this.el].concat(this.listAlign));
        this.list.endUpdate();
    },

    /**
     * Returns true if the dropdown list is expanded, else false.
     */
    isExpanded : function(){
        return this.list && this.list.isVisible();
    },

    /**
     * Select an item in the dropdown list by its data value. This function does NOT cause the select event to fire.
     * The store must be loaded and the list expanded for this function to work, otherwise use setValue.
     * @param {String} value The data value of the item to select
     * @param {Boolean} scrollIntoView False to prevent the dropdown list from autoscrolling to display the
     * selected item if it is not currently in view (defaults to true)
     * @return {Boolean} True if the value matched an item in the list, else false
     */
    selectByValue : function(v, scrollIntoView){
        if(!Ext.isEmpty(v, true)){
            var r = this.findRecord(this.valueField || this.displayField, v);
            if(r){
                this.select(this.store.indexOf(r), scrollIntoView);
                return true;
            }
        }
        return false;
    },

    /**
     * Select an item in the dropdown list by its numeric index in the list. This function does NOT cause the select event to fire.
     * The store must be loaded and the list expanded for this function to work, otherwise use setValue.
     * @param {Number} index The zero-based index of the list item to select
     * @param {Boolean} scrollIntoView False to prevent the dropdown list from autoscrolling to display the
     * selected item if it is not currently in view (defaults to true)
     */
    select : function(index, scrollIntoView){
        this.selectedIndex = index;
        this.view.select(index);
        if(scrollIntoView !== false){
            var el = this.view.getNode(index);
            if(el){
                this.innerList.scrollChildIntoView(el, false);
            }
        }

    },

    // private
    selectNext : function(){
        var ct = this.store.getCount();
        if(ct > 0){
            if(this.selectedIndex == -1){
                this.select(0);
            }else if(this.selectedIndex < ct-1){
                this.select(this.selectedIndex+1);
            }
        }
    },

    // private
    selectPrev : function(){
        var ct = this.store.getCount();
        if(ct > 0){
            if(this.selectedIndex == -1){
                this.select(0);
            }else if(this.selectedIndex !== 0){
                this.select(this.selectedIndex-1);
            }
        }
    },

    // private
    onKeyUp : function(e){
        var k = e.getKey();
        if(this.editable !== false && this.readOnly !== true && (k == e.BACKSPACE || !e.isSpecialKey())){

            this.lastKey = k;
            this.dqTask.delay(this.queryDelay);
        }
        Ext.form.ComboBox.superclass.onKeyUp.call(this, e);
    },

    // private
    validateBlur : function(){
        return !this.list || !this.list.isVisible();
    },

    // private
    initQuery : function(){
        this.doQuery(this.getRawValue());
    },

    // private
    beforeBlur : function(){
        this.assertValue();
    },

    // private
    postBlur  : function(){
        Ext.form.ComboBox.superclass.postBlur.call(this);
        this.collapse();
        this.inKeyMode = false;
    },

    /**
     * Execute a query to filter the dropdown list.  Fires the {@link #beforequery} event prior to performing the
     * query allowing the query action to be canceled if needed.
     * @param {String} query The SQL query to execute
     * @param {Boolean} forceAll <tt>true</tt> to force the query to execute even if there are currently fewer
     * characters in the field than the minimum specified by the <tt>{@link #minChars}</tt> config option.  It
     * also clears any filter previously saved in the current store (defaults to <tt>false</tt>)
     */
    doQuery : function(q, forceAll){
        q = Ext.isEmpty(q) ? '' : q;
        var qe = {
            query: q,
            forceAll: forceAll,
            combo: this,
            cancel:false
        };
        if(this.fireEvent('beforequery', qe)===false || qe.cancel){
            return false;
        }
        q = qe.query;
        forceAll = qe.forceAll;
        if(forceAll === true || (q.length >= this.minChars)){
            if(this.lastQuery !== q){
                this.lastQuery = q;
                if(this.mode == 'local'){
                    this.selectedIndex = -1;
                    if(forceAll){
                        this.store.clearFilter();
                    }else{
                        this.store.filter(this.displayField, q);
                    }
                    this.onLoad();
                }else{
                    this.store.baseParams[this.queryParam] = q;
                    this.store.load({
                        params: this.getParams(q)
                    });
                    this.expand();
                }
            }else{
                this.selectedIndex = -1;
                this.onLoad();
            }
        }
    },

    // private
    getParams : function(q){
        var params = {},
            paramNames = this.store.paramNames;
        if(this.pageSize){
            params[paramNames.start] = 0;
            params[paramNames.limit] = this.pageSize;
        }
        return params;
    },

    /**
     * Hides the dropdown list if it is currently expanded. Fires the {@link #collapse} event on completion.
     */
    collapse : function(){
        if(!this.isExpanded()){
            return;
        }
        this.list.hide();
        Ext.getDoc().un('mousewheel', this.collapseIf, this);
        Ext.getDoc().un('mousedown', this.collapseIf, this);
        this.fireEvent('collapse', this);
    },

    // private
    collapseIf : function(e){
        if(!this.isDestroyed && !e.within(this.wrap) && !e.within(this.list)){
            this.collapse();
        }
    },

    /**
     * Expands the dropdown list if it is currently hidden. Fires the {@link #expand} event on completion.
     */
    expand : function(){
        if(this.isExpanded() || !this.hasFocus){
            return;
        }

        if(this.title || this.pageSize){
            this.assetHeight = 0;
            if(this.title){
                this.assetHeight += this.header.getHeight();
            }
            if(this.pageSize){
                this.assetHeight += this.footer.getHeight();
            }
        }

        if(this.bufferSize){
            this.doResize(this.bufferSize);
            delete this.bufferSize;
        }
        this.list.alignTo.apply(this.list, [this.el].concat(this.listAlign));

        // zindex can change, re-check it and set it if necessary
        this.list.setZIndex(this.getZIndex());
        this.list.show();
        if(Ext.isGecko2){
            this.innerList.setOverflow('auto'); // necessary for FF 2.0/Mac
        }
        this.mon(Ext.getDoc(), {
            scope: this,
            mousewheel: this.collapseIf,
            mousedown: this.collapseIf
        });
        this.fireEvent('expand', this);
    },

    /**
     * @method onTriggerClick
     * @hide
     */
    // private
    // Implements the default empty TriggerField.onTriggerClick function
    onTriggerClick : function(){
        if(this.readOnly || this.disabled){
            return;
        }
        if(this.isExpanded()){
            this.collapse();
            this.el.focus();
        }else {
            this.onFocus({});
            if(this.triggerAction == 'all') {
                this.doQuery(this.allQuery, true);
            } else {
                this.doQuery(this.getRawValue());
            }
            this.el.focus();
        }
    }

    /**
     * @hide
     * @method autoSize
     */
    /**
     * @cfg {Boolean} grow @hide
     */
    /**
     * @cfg {Number} growMin @hide
     */
    /**
     * @cfg {Number} growMax @hide
     */

});
Ext.reg('combo', Ext.form.ComboBox);
