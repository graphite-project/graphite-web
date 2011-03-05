/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class pivot.AxisGrid
 * @extends Ext.grid.EditorGridPanel
 * Grid used to control the dimensions in a PivotGrid axis
 */
pivot.AxisGrid = Ext.extend(Ext.grid.EditorGridPanel, {
    border: false,
    style: 'border-top-width: 1px',
    flex: 1,
    clicksToEdit: 1,

    /**
     * @cfg {Array} fields The array of field names to control. Required
     */
    
    /**
     * @cfg {Boolean} hasWidthField True to add a column for 'width' (e.g. for left axes)
     */
    hasWidthField: false,
    
    /**
     * The Record used internally to manage the field name, sort direction and width of each dimension
     * @property record
     * @type Ext.data.Record
     */
    record: Ext.data.Record.create([
        {name: 'field',     type: 'string'},
        {name: 'direction', type: 'string'},
        {name: 'width',     type: 'int'}
    ]),

    initComponent: function() {
        this.store = new Ext.data.Store({
            data  : this.dimensionData || [], 
            reader: new Ext.data.JsonReader({}, this.record)
        });

        var columns = [{
            header   : 'Dimension',
            dataIndex: 'field',
            editor   : this.buildDimensionEditor(),
            width    : this.hasWidthField ? 110 : 160
        }, {
            header   : 'Sort Direction',
            dataIndex: 'direction',
            editor   : this.buildDirectionEditor(),
            width    : 80
        }];

        if (this.hasWidthField) {
            columns.push({
                header   : 'Width',
                dataIndex: 'width',
                editor   : new Ext.form.NumberField(),
                width    : 50
            });
        }

        columns.push({
            xtype: 'actioncolumn',
            width: 30,
            icon   : '../shared/icons/fam/delete.gif',
            scope  : this,
            handler: this.onRemoveDimension,
            tooltip: 'Delete this axis',
            editable: false
        });

        Ext.applyIf(this, {
            bbar: [{
                text   : 'Add Dimension',
                icon   : '../shared/icons/fam/add.gif',
                scope  : this,
                handler: this.onAddDimension
            }],
            columns: columns
        });
        pivot.AxisGrid.superclass.initComponent.apply(this, arguments);
    },

    /**
     * @private
     * Adds a new row to the store and auto-focusses its first editor
     */
    onAddDimension: function() {
        this.store.add(new this.record({
            field    : this.fields[0],
            direction: "ASC",
            width    : 80
        }));

        this.startEditing(this.store.getCount() - 1, 0);
    },

    /**
     * @private
     */
    onRemoveDimension: function(grid, rowIndex, colIndex) {
        var store  = this.store,
            record = this.store.getAt(rowIndex);
        
        store.remove(record);
    },

    /**
     * @private
     * @return {Ext.form.ComboBox} The editor
     */
    buildDimensionEditor: function() {
        return new Ext.form.ComboBox({
            mode : 'local',
            store: this.getFieldStore(),
            editable      : false,
            valueField    : 'name',
            displayField  : 'name',
            triggerAction : 'all',
            forceSelection: true
        });
    },

    /**
     * @private
     * @return {Ext.data.Store} The store
     */
    getFieldStore: function() {
        /**
         * @property fieldStore
         * @type Ext.data.JsonStore
         * The store bound to the combo for selecting the field
         */
        if (this.fieldStore == undefined) {
            var fields = [],
                length = this.fields.length,
                i;

            for (i = 0; i < length; i++) {
                fields[i] = [this.fields[i]];
            }

            this.fieldStore = new Ext.data.ArrayStore({
                fields: ['name'],
                data  : fields
            });
        }
        return this.fieldStore; 
    },

    /**
     * @private
     * Creates a local combo with options for ASC and DESC
     * @return {Ext.form.ComboBox} The editor
     */
    buildDirectionEditor: function() {
        return new Ext.form.ComboBox({
            name          : 'name',
            mode          : 'local',
            editable      : false,
            forceSelection: true,
            triggerAction : 'all',
            displayField  : 'name',
            valueField    : 'name',
            value         : 'ASC',
            store: new Ext.data.JsonStore({
                fields : ['name'],
                data   : [{name : 'ASC'}, {name : 'DESC'}]
            })
        });
    }
});