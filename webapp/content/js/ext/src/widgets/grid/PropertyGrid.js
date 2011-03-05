/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.grid.PropertyRecord
 * A specific {@link Ext.data.Record} type that represents a name/value pair and is made to work with the
 * {@link Ext.grid.PropertyGrid}.  Typically, PropertyRecords do not need to be created directly as they can be
 * created implicitly by simply using the appropriate data configs either via the {@link Ext.grid.PropertyGrid#source}
 * config property or by calling {@link Ext.grid.PropertyGrid#setSource}.  However, if the need arises, these records
 * can also be created explicitly as shwon below.  Example usage:
 * <pre><code>
var rec = new Ext.grid.PropertyRecord({
    name: 'Birthday',
    value: new Date(Date.parse('05/26/1972'))
});
// Add record to an already populated grid
grid.store.addSorted(rec);
</code></pre>
 * @constructor
 * @param {Object} config A data object in the format: {name: [name], value: [value]}.  The specified value's type
 * will be read automatically by the grid to determine the type of editor to use when displaying it.
 */
Ext.grid.PropertyRecord = Ext.data.Record.create([
    {name:'name',type:'string'}, 'value'
]);

/**
 * @class Ext.grid.PropertyStore
 * @extends Ext.util.Observable
 * A custom wrapper for the {@link Ext.grid.PropertyGrid}'s {@link Ext.data.Store}. This class handles the mapping
 * between the custom data source objects supported by the grid and the {@link Ext.grid.PropertyRecord} format
 * required for compatibility with the underlying store. Generally this class should not need to be used directly --
 * the grid's data should be accessed from the underlying store via the {@link #store} property.
 * @constructor
 * @param {Ext.grid.Grid} grid The grid this store will be bound to
 * @param {Object} source The source data config object
 */
Ext.grid.PropertyStore = Ext.extend(Ext.util.Observable, {
    
    constructor : function(grid, source){
        this.grid = grid;
        this.store = new Ext.data.Store({
            recordType : Ext.grid.PropertyRecord
        });
        this.store.on('update', this.onUpdate,  this);
        if(source){
            this.setSource(source);
        }
        Ext.grid.PropertyStore.superclass.constructor.call(this);    
    },
    
    // protected - should only be called by the grid.  Use grid.setSource instead.
    setSource : function(o){
        this.source = o;
        this.store.removeAll();
        var data = [];
        for(var k in o){
            if(this.isEditableValue(o[k])){
                data.push(new Ext.grid.PropertyRecord({name: k, value: o[k]}, k));
            }
        }
        this.store.loadRecords({records: data}, {}, true);
    },

    // private
    onUpdate : function(ds, record, type){
        if(type == Ext.data.Record.EDIT){
            var v = record.data.value;
            var oldValue = record.modified.value;
            if(this.grid.fireEvent('beforepropertychange', this.source, record.id, v, oldValue) !== false){
                this.source[record.id] = v;
                record.commit();
                this.grid.fireEvent('propertychange', this.source, record.id, v, oldValue);
            }else{
                record.reject();
            }
        }
    },

    // private
    getProperty : function(row){
       return this.store.getAt(row);
    },

    // private
    isEditableValue: function(val){
        return Ext.isPrimitive(val) || Ext.isDate(val);
    },

    // private
    setValue : function(prop, value, create){
        var r = this.getRec(prop);
        if(r){
            r.set('value', value);
            this.source[prop] = value;
        }else if(create){
            // only create if specified.
            this.source[prop] = value;
            r = new Ext.grid.PropertyRecord({name: prop, value: value}, prop);
            this.store.add(r);

        }
    },
    
    // private
    remove : function(prop){
        var r = this.getRec(prop);
        if(r){
            this.store.remove(r);
            delete this.source[prop];
        }
    },
    
    // private
    getRec : function(prop){
        return this.store.getById(prop);
    },

    // protected - should only be called by the grid.  Use grid.getSource instead.
    getSource : function(){
        return this.source;
    }
});

/**
 * @class Ext.grid.PropertyColumnModel
 * @extends Ext.grid.ColumnModel
 * A custom column model for the {@link Ext.grid.PropertyGrid}.  Generally it should not need to be used directly.
 * @constructor
 * @param {Ext.grid.Grid} grid The grid this store will be bound to
 * @param {Object} source The source data config object
 */
Ext.grid.PropertyColumnModel = Ext.extend(Ext.grid.ColumnModel, {
    // private - strings used for locale support
    nameText : 'Name',
    valueText : 'Value',
    dateFormat : 'm/j/Y',
    trueText: 'true',
    falseText: 'false',
    
    constructor : function(grid, store){
        var g = Ext.grid,
	        f = Ext.form;
	        
	    this.grid = grid;
	    g.PropertyColumnModel.superclass.constructor.call(this, [
	        {header: this.nameText, width:50, sortable: true, dataIndex:'name', id: 'name', menuDisabled:true},
	        {header: this.valueText, width:50, resizable:false, dataIndex: 'value', id: 'value', menuDisabled:true}
	    ]);
	    this.store = store;
	
	    var bfield = new f.Field({
	        autoCreate: {tag: 'select', children: [
	            {tag: 'option', value: 'true', html: this.trueText},
	            {tag: 'option', value: 'false', html: this.falseText}
	        ]},
	        getValue : function(){
	            return this.el.dom.value == 'true';
	        }
	    });
	    this.editors = {
	        'date' : new g.GridEditor(new f.DateField({selectOnFocus:true})),
	        'string' : new g.GridEditor(new f.TextField({selectOnFocus:true})),
	        'number' : new g.GridEditor(new f.NumberField({selectOnFocus:true, style:'text-align:left;'})),
	        'boolean' : new g.GridEditor(bfield, {
	            autoSize: 'both'
	        })
	    };
	    this.renderCellDelegate = this.renderCell.createDelegate(this);
	    this.renderPropDelegate = this.renderProp.createDelegate(this);
    },

    // private
    renderDate : function(dateVal){
        return dateVal.dateFormat(this.dateFormat);
    },

    // private
    renderBool : function(bVal){
        return this[bVal ? 'trueText' : 'falseText'];
    },

    // private
    isCellEditable : function(colIndex, rowIndex){
        return colIndex == 1;
    },

    // private
    getRenderer : function(col){
        return col == 1 ?
            this.renderCellDelegate : this.renderPropDelegate;
    },

    // private
    renderProp : function(v){
        return this.getPropertyName(v);
    },

    // private
    renderCell : function(val, meta, rec){
        var renderer = this.grid.customRenderers[rec.get('name')];
        if(renderer){
            return renderer.apply(this, arguments);
        }
        var rv = val;
        if(Ext.isDate(val)){
            rv = this.renderDate(val);
        }else if(typeof val == 'boolean'){
            rv = this.renderBool(val);
        }
        return Ext.util.Format.htmlEncode(rv);
    },

    // private
    getPropertyName : function(name){
        var pn = this.grid.propertyNames;
        return pn && pn[name] ? pn[name] : name;
    },

    // private
    getCellEditor : function(colIndex, rowIndex){
        var p = this.store.getProperty(rowIndex),
            n = p.data.name, 
            val = p.data.value;
        if(this.grid.customEditors[n]){
            return this.grid.customEditors[n];
        }
        if(Ext.isDate(val)){
            return this.editors.date;
        }else if(typeof val == 'number'){
            return this.editors.number;
        }else if(typeof val == 'boolean'){
            return this.editors['boolean'];
        }else{
            return this.editors.string;
        }
    },

    // inherit docs
    destroy : function(){
        Ext.grid.PropertyColumnModel.superclass.destroy.call(this);
        this.destroyEditors(this.editors);
        this.destroyEditors(this.grid.customEditors);
    },
    
    destroyEditors: function(editors){
        for(var ed in editors){
            Ext.destroy(editors[ed]);
        }
    }
});

/**
 * @class Ext.grid.PropertyGrid
 * @extends Ext.grid.EditorGridPanel
 * A specialized grid implementation intended to mimic the traditional property grid as typically seen in
 * development IDEs.  Each row in the grid represents a property of some object, and the data is stored
 * as a set of name/value pairs in {@link Ext.grid.PropertyRecord}s.  Example usage:
 * <pre><code>
var grid = new Ext.grid.PropertyGrid({
    title: 'Properties Grid',
    autoHeight: true,
    width: 300,
    renderTo: 'grid-ct',
    source: {
        "(name)": "My Object",
        "Created": new Date(Date.parse('10/15/2006')),
        "Available": false,
        "Version": .01,
        "Description": "A test object"
    }
});
</code></pre>
 * @constructor
 * @param {Object} config The grid config object
 */
Ext.grid.PropertyGrid = Ext.extend(Ext.grid.EditorGridPanel, {
    /**
    * @cfg {Object} propertyNames An object containing property name/display name pairs.
    * If specified, the display name will be shown in the name column instead of the property name.
    */
    /**
    * @cfg {Object} source A data object to use as the data source of the grid (see {@link #setSource} for details).
    */
    /**
    * @cfg {Object} customEditors An object containing name/value pairs of custom editor type definitions that allow
    * the grid to support additional types of editable fields.  By default, the grid supports strongly-typed editing
    * of strings, dates, numbers and booleans using built-in form editors, but any custom type can be supported and
    * associated with a custom input control by specifying a custom editor.  The name of the editor
    * type should correspond with the name of the property that will use the editor.  Example usage:
    * <pre><code>
var grid = new Ext.grid.PropertyGrid({
    ...
    customEditors: {
        'Start Time': new Ext.grid.GridEditor(new Ext.form.TimeField({selectOnFocus:true}))
    },
    source: {
        'Start Time': '10:00 AM'
    }
});
</code></pre>
    */
    /**
    * @cfg {Object} source A data object to use as the data source of the grid (see {@link #setSource} for details).
    */
    /**
    * @cfg {Object} customRenderers An object containing name/value pairs of custom renderer type definitions that allow
    * the grid to support custom rendering of fields.  By default, the grid supports strongly-typed rendering
    * of strings, dates, numbers and booleans using built-in form editors, but any custom type can be supported and
    * associated with the type of the value.  The name of the renderer type should correspond with the name of the property
    * that it will render.  Example usage:
    * <pre><code>
var grid = new Ext.grid.PropertyGrid({
    ...
    customRenderers: {
        Available: function(v){
            if(v){
                return '<span style="color: green;">Yes</span>';
            }else{
                return '<span style="color: red;">No</span>';
            }
        }
    },
    source: {
        Available: true
    }
});
</code></pre>
    */

    // private config overrides
    enableColumnMove:false,
    stripeRows:false,
    trackMouseOver: false,
    clicksToEdit:1,
    enableHdMenu : false,
    viewConfig : {
        forceFit:true
    },

    // private
    initComponent : function(){
        this.customRenderers = this.customRenderers || {};
        this.customEditors = this.customEditors || {};
        this.lastEditRow = null;
        var store = new Ext.grid.PropertyStore(this);
        this.propStore = store;
        var cm = new Ext.grid.PropertyColumnModel(this, store);
        store.store.sort('name', 'ASC');
        this.addEvents(
            /**
             * @event beforepropertychange
             * Fires before a property value changes.  Handlers can return false to cancel the property change
             * (this will internally call {@link Ext.data.Record#reject} on the property's record).
             * @param {Object} source The source data object for the grid (corresponds to the same object passed in
             * as the {@link #source} config property).
             * @param {String} recordId The record's id in the data store
             * @param {Mixed} value The current edited property value
             * @param {Mixed} oldValue The original property value prior to editing
             */
            'beforepropertychange',
            /**
             * @event propertychange
             * Fires after a property value has changed.
             * @param {Object} source The source data object for the grid (corresponds to the same object passed in
             * as the {@link #source} config property).
             * @param {String} recordId The record's id in the data store
             * @param {Mixed} value The current edited property value
             * @param {Mixed} oldValue The original property value prior to editing
             */
            'propertychange'
        );
        this.cm = cm;
        this.ds = store.store;
        Ext.grid.PropertyGrid.superclass.initComponent.call(this);

		this.mon(this.selModel, 'beforecellselect', function(sm, rowIndex, colIndex){
            if(colIndex === 0){
                this.startEditing.defer(200, this, [rowIndex, 1]);
                return false;
            }
        }, this);
    },

    // private
    onRender : function(){
        Ext.grid.PropertyGrid.superclass.onRender.apply(this, arguments);

        this.getGridEl().addClass('x-props-grid');
    },

    // private
    afterRender: function(){
        Ext.grid.PropertyGrid.superclass.afterRender.apply(this, arguments);
        if(this.source){
            this.setSource(this.source);
        }
    },

    /**
     * Sets the source data object containing the property data.  The data object can contain one or more name/value
     * pairs representing all of the properties of an object to display in the grid, and this data will automatically
     * be loaded into the grid's {@link #store}.  The values should be supplied in the proper data type if needed,
     * otherwise string type will be assumed.  If the grid already contains data, this method will replace any
     * existing data.  See also the {@link #source} config value.  Example usage:
     * <pre><code>
grid.setSource({
    "(name)": "My Object",
    "Created": new Date(Date.parse('10/15/2006')),  // date type
    "Available": false,  // boolean type
    "Version": .01,      // decimal type
    "Description": "A test object"
});
</code></pre>
     * @param {Object} source The data object
     */
    setSource : function(source){
        this.propStore.setSource(source);
    },

    /**
     * Gets the source data object containing the property data.  See {@link #setSource} for details regarding the
     * format of the data object.
     * @return {Object} The data object
     */
    getSource : function(){
        return this.propStore.getSource();
    },
    
    /**
     * Sets the value of a property.
     * @param {String} prop The name of the property to set
     * @param {Mixed} value The value to test
     * @param {Boolean} create (Optional) True to create the property if it doesn't already exist. Defaults to <tt>false</tt>.
     */
    setProperty : function(prop, value, create){
        this.propStore.setValue(prop, value, create);    
    },
    
    /**
     * Removes a property from the grid.
     * @param {String} prop The name of the property to remove
     */
    removeProperty : function(prop){
        this.propStore.remove(prop);
    }

    /**
     * @cfg store
     * @hide
     */
    /**
     * @cfg colModel
     * @hide
     */
    /**
     * @cfg cm
     * @hide
     */
    /**
     * @cfg columns
     * @hide
     */
});
Ext.reg("propertygrid", Ext.grid.PropertyGrid);
