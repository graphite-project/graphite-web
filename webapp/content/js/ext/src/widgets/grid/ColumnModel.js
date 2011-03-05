/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.grid.ColumnModel
 * @extends Ext.util.Observable
 * <p>After the data has been read into the client side cache (<b>{@link Ext.data.Store Store}</b>),
 * the ColumnModel is used to configure how and what parts of that data will be displayed in the
 * vertical slices (columns) of the grid. The Ext.grid.ColumnModel Class is the default implementation
 * of a ColumnModel used by implentations of {@link Ext.grid.GridPanel GridPanel}.</p>
 * <p>Data is mapped into the store's records and then indexed into the ColumnModel using the
 * <tt>{@link Ext.grid.Column#dataIndex dataIndex}</tt>:</p>
 * <pre><code>
{data source} == mapping ==> {data store} == <b><tt>{@link Ext.grid.Column#dataIndex dataIndex}</tt></b> ==> {ColumnModel}
 * </code></pre>
 * <p>Each {@link Ext.grid.Column Column} in the grid's ColumnModel is configured with a
 * <tt>{@link Ext.grid.Column#dataIndex dataIndex}</tt> to specify how the data within
 * each record in the store is indexed into the ColumnModel.</p>
 * <p>There are two ways to initialize the ColumnModel class:</p>
 * <p><u>Initialization Method 1: an Array</u></p>
<pre><code>
 var colModel = new Ext.grid.ColumnModel([
    { header: "Ticker", width: 60, sortable: true},
    { header: "Company Name", width: 150, sortable: true, id: 'company'},
    { header: "Market Cap.", width: 100, sortable: true},
    { header: "$ Sales", width: 100, sortable: true, renderer: money},
    { header: "Employees", width: 100, sortable: true, resizable: false}
 ]);
 </code></pre>
 * <p>The ColumnModel may be initialized with an Array of {@link Ext.grid.Column} column configuration
 * objects to define the initial layout / display of the columns in the Grid. The order of each
 * {@link Ext.grid.Column} column configuration object within the specified Array defines the initial
 * order of the column display.  A Column's display may be initially hidden using the
 * <tt>{@link Ext.grid.Column#hidden hidden}</tt></b> config property (and then shown using the column
 * header menu).  Fields that are not included in the ColumnModel will not be displayable at all.</p>
 * <p>How each column in the grid correlates (maps) to the {@link Ext.data.Record} field in the
 * {@link Ext.data.Store Store} the column draws its data from is configured through the
 * <b><tt>{@link Ext.grid.Column#dataIndex dataIndex}</tt></b>.  If the
 * <b><tt>{@link Ext.grid.Column#dataIndex dataIndex}</tt></b> is not explicitly defined (as shown in the
 * example above) it will use the column configuration's index in the Array as the index.</p>
 * <p>See <b><tt>{@link Ext.grid.Column}</tt></b> for additional configuration options for each column.</p>
 * <p><u>Initialization Method 2: an Object</u></p>
 * <p>In order to use configuration options from <tt>Ext.grid.ColumnModel</tt>, an Object may be used to
 * initialize the ColumnModel.  The column configuration Array will be specified in the <tt><b>{@link #columns}</b></tt>
 * config property. The <tt><b>{@link #defaults}</b></tt> config property can be used to apply defaults
 * for all columns, e.g.:</p><pre><code>
 var colModel = new Ext.grid.ColumnModel({
    columns: [
        { header: "Ticker", width: 60, menuDisabled: false},
        { header: "Company Name", width: 150, id: 'company'},
        { header: "Market Cap."},
        { header: "$ Sales", renderer: money},
        { header: "Employees", resizable: false}
    ],
    defaults: {
        sortable: true,
        menuDisabled: true,
        width: 100
    },
    listeners: {
        {@link #hiddenchange}: function(cm, colIndex, hidden) {
            saveConfig(colIndex, hidden);
        }
    }
});
 </code></pre>
 * <p>In both examples above, the ability to apply a CSS class to all cells in a column (including the
 * header) is demonstrated through the use of the <b><tt>{@link Ext.grid.Column#id id}</tt></b> config
 * option. This column could be styled by including the following css:</p><pre><code>
 //add this css *after* the core css is loaded
.x-grid3-td-company {
    color: red; // entire column will have red font
}
// modify the header row only, adding an icon to the column header
.x-grid3-hd-company {
    background: transparent
        url(../../resources/images/icons/silk/building.png)
        no-repeat 3px 3px ! important;
        padding-left:20px;
}
 </code></pre>
 * Note that the "Company Name" column could be specified as the
 * <b><tt>{@link Ext.grid.GridPanel}.{@link Ext.grid.GridPanel#autoExpandColumn autoExpandColumn}</tt></b>.
 * @constructor
 * @param {Mixed} config Specify either an Array of {@link Ext.grid.Column} configuration objects or specify
 * a configuration Object (see introductory section discussion utilizing Initialization Method 2 above).
 */
Ext.grid.ColumnModel = Ext.extend(Ext.util.Observable, {
    /**
     * @cfg {Number} defaultWidth (optional) The width of columns which have no <tt>{@link #width}</tt>
     * specified (defaults to <tt>100</tt>).  This property shall preferably be configured through the
     * <tt><b>{@link #defaults}</b></tt> config property.
     */
    defaultWidth: 100,

    /**
     * @cfg {Boolean} defaultSortable (optional) Default sortable of columns which have no
     * sortable specified (defaults to <tt>false</tt>).  This property shall preferably be configured
     * through the <tt><b>{@link #defaults}</b></tt> config property.
     */
    defaultSortable: false,

    /**
     * @cfg {Array} columns An Array of object literals.  The config options defined by
     * <b>{@link Ext.grid.Column}</b> are the options which may appear in the object literal for each
     * individual column definition.
     */

    /**
     * @cfg {Object} defaults Object literal which will be used to apply {@link Ext.grid.Column}
     * configuration options to all <tt><b>{@link #columns}</b></tt>.  Configuration options specified with
     * individual {@link Ext.grid.Column column} configs will supersede these <tt><b>{@link #defaults}</b></tt>.
     */

    constructor : function(config) {
        /**
	     * An Array of {@link Ext.grid.Column Column definition} objects representing the configuration
	     * of this ColumnModel.  See {@link Ext.grid.Column} for the configuration properties that may
	     * be specified.
	     * @property config
	     * @type Array
	     */
	    if (config.columns) {
	        Ext.apply(this, config);
	        this.setConfig(config.columns, true);
	    } else {
	        this.setConfig(config, true);
	    }
	    
	    this.addEvents(
	        /**
	         * @event widthchange
	         * Fires when the width of a column is programmaticially changed using
	         * <code>{@link #setColumnWidth}</code>.
	         * Note internal resizing suppresses the event from firing. See also
	         * {@link Ext.grid.GridPanel}.<code>{@link #columnresize}</code>.
	         * @param {ColumnModel} this
	         * @param {Number} columnIndex The column index
	         * @param {Number} newWidth The new width
	         */
	        "widthchange",
	        
	        /**
	         * @event headerchange
	         * Fires when the text of a header changes.
	         * @param {ColumnModel} this
	         * @param {Number} columnIndex The column index
	         * @param {String} newText The new header text
	         */
	        "headerchange",
	        
	        /**
	         * @event hiddenchange
	         * Fires when a column is hidden or "unhidden".
	         * @param {ColumnModel} this
	         * @param {Number} columnIndex The column index
	         * @param {Boolean} hidden true if hidden, false otherwise
	         */
	        "hiddenchange",
	        
	        /**
	         * @event columnmoved
	         * Fires when a column is moved.
	         * @param {ColumnModel} this
	         * @param {Number} oldIndex
	         * @param {Number} newIndex
	         */
	        "columnmoved",
	        
	        /**
	         * @event configchange
	         * Fires when the configuration is changed
	         * @param {ColumnModel} this
	         */
	        "configchange"
	    );
	    
	    Ext.grid.ColumnModel.superclass.constructor.call(this);
    },

    /**
     * Returns the id of the column at the specified index.
     * @param {Number} index The column index
     * @return {String} the id
     */
    getColumnId : function(index) {
        return this.config[index].id;
    },

    getColumnAt : function(index) {
        return this.config[index];
    },

    /**
     * <p>Reconfigures this column model according to the passed Array of column definition objects.
     * For a description of the individual properties of a column definition object, see the
     * <a href="#Ext.grid.ColumnModel-configs">Config Options</a>.</p>
     * <p>Causes the {@link #configchange} event to be fired. A {@link Ext.grid.GridPanel GridPanel}
     * using this ColumnModel will listen for this event and refresh its UI automatically.</p>
     * @param {Array} config Array of Column definition objects.
     * @param {Boolean} initial Specify <tt>true</tt> to bypass cleanup which deletes the <tt>totalWidth</tt>
     * and destroys existing editors.
     */
    setConfig : function(config, initial) {
        var i, c, len;
        
        if (!initial) { // cleanup
            delete this.totalWidth;
            
            for (i = 0, len = this.config.length; i < len; i++) {
                c = this.config[i];
                
                if (c.setEditor) {
                    //check here, in case we have a special column like a CheckboxSelectionModel
                    c.setEditor(null);
                }
            }
        }

        // backward compatibility
        this.defaults = Ext.apply({
            width: this.defaultWidth,
            sortable: this.defaultSortable
        }, this.defaults);

        this.config = config;
        this.lookup = {};

        for (i = 0, len = config.length; i < len; i++) {
            c = Ext.applyIf(config[i], this.defaults);
            
            // if no id, create one using column's ordinal position
            if (Ext.isEmpty(c.id)) {
                c.id = i;
            }
            
            if (!c.isColumn) {
                var Cls = Ext.grid.Column.types[c.xtype || 'gridcolumn'];
                c = new Cls(c);
                config[i] = c;
            }
            
            this.lookup[c.id] = c;
        }
        
        if (!initial) {
            this.fireEvent('configchange', this);
        }
    },

    /**
     * Returns the column for a specified id.
     * @param {String} id The column id
     * @return {Object} the column
     */
    getColumnById : function(id) {
        return this.lookup[id];
    },

    /**
     * Returns the index for a specified column id.
     * @param {String} id The column id
     * @return {Number} the index, or -1 if not found
     */
    getIndexById : function(id) {
        for (var i = 0, len = this.config.length; i < len; i++) {
            if (this.config[i].id == id) {
                return i;
            }
        }
        return -1;
    },

    /**
     * Moves a column from one position to another.
     * @param {Number} oldIndex The index of the column to move.
     * @param {Number} newIndex The position at which to reinsert the coolumn.
     */
    moveColumn : function(oldIndex, newIndex) {
        var config = this.config,
            c      = config[oldIndex];
            
        config.splice(oldIndex, 1);
        config.splice(newIndex, 0, c);
        this.dataMap = null;
        this.fireEvent("columnmoved", this, oldIndex, newIndex);
    },

    /**
     * Returns the number of columns.
     * @param {Boolean} visibleOnly Optional. Pass as true to only include visible columns.
     * @return {Number}
     */
    getColumnCount : function(visibleOnly) {
        var length = this.config.length,
            c = 0,
            i;
        
        if (visibleOnly === true) {
            for (i = 0; i < length; i++) {
                if (!this.isHidden(i)) {
                    c++;
                }
            }
            
            return c;
        }
        
        return length;
    },

    /**
     * Returns the column configs that return true by the passed function that is called
     * with (columnConfig, index)
<pre><code>
// returns an array of column config objects for all hidden columns
var columns = grid.getColumnModel().getColumnsBy(function(c){
  return c.hidden;
});
</code></pre>
     * @param {Function} fn A function which, when passed a {@link Ext.grid.Column Column} object, must
     * return <code>true</code> if the column is to be included in the returned Array.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function
     * is executed. Defaults to this ColumnModel.
     * @return {Array} result
     */
    getColumnsBy : function(fn, scope) {
        var config = this.config,
            length = config.length,
            result = [],
            i, c;
            
        for (i = 0; i < length; i++){
            c = config[i];
            
            if (fn.call(scope || this, c, i) === true) {
                result[result.length] = c;
            }
        }
        
        return result;
    },

    /**
     * Returns true if the specified column is sortable.
     * @param {Number} col The column index
     * @return {Boolean}
     */
    isSortable : function(col) {
        return !!this.config[col].sortable;
    },

    /**
     * Returns true if the specified column menu is disabled.
     * @param {Number} col The column index
     * @return {Boolean}
     */
    isMenuDisabled : function(col) {
        return !!this.config[col].menuDisabled;
    },

    /**
     * Returns the rendering (formatting) function defined for the column.
     * @param {Number} col The column index.
     * @return {Function} The function used to render the cell. See {@link #setRenderer}.
     */
    getRenderer : function(col) {
        return this.config[col].renderer || Ext.grid.ColumnModel.defaultRenderer;
    },

    getRendererScope : function(col) {
        return this.config[col].scope;
    },

    /**
     * Sets the rendering (formatting) function for a column.  See {@link Ext.util.Format} for some
     * default formatting functions.
     * @param {Number} col The column index
     * @param {Function} fn The function to use to process the cell's raw data
     * to return HTML markup for the grid view. The render function is called with
     * the following parameters:<ul>
     * <li><b>value</b> : Object<p class="sub-desc">The data value for the cell.</p></li>
     * <li><b>metadata</b> : Object<p class="sub-desc">An object in which you may set the following attributes:<ul>
     * <li><b>css</b> : String<p class="sub-desc">A CSS class name to add to the cell's TD element.</p></li>
     * <li><b>attr</b> : String<p class="sub-desc">An HTML attribute definition string to apply to the data container element <i>within</i> the table cell
     * (e.g. 'style="color:red;"').</p></li></ul></p></li>
     * <li><b>record</b> : Ext.data.record<p class="sub-desc">The {@link Ext.data.Record} from which the data was extracted.</p></li>
     * <li><b>rowIndex</b> : Number<p class="sub-desc">Row index</p></li>
     * <li><b>colIndex</b> : Number<p class="sub-desc">Column index</p></li>
     * <li><b>store</b> : Ext.data.Store<p class="sub-desc">The {@link Ext.data.Store} object from which the Record was extracted.</p></li></ul>
     */
    setRenderer : function(col, fn) {
        this.config[col].renderer = fn;
    },

    /**
     * Returns the width for the specified column.
     * @param {Number} col The column index
     * @return {Number}
     */
    getColumnWidth : function(col) {
        var width = this.config[col].width;
        if(typeof width != 'number'){
            width = this.defaultWidth;
        }
        return width;
    },

    /**
     * Sets the width for a column.
     * @param {Number} col The column index
     * @param {Number} width The new width
     * @param {Boolean} suppressEvent True to suppress firing the <code>{@link #widthchange}</code>
     * event. Defaults to false.
     */
    setColumnWidth : function(col, width, suppressEvent) {
        this.config[col].width = width;
        this.totalWidth = null;
        
        if (!suppressEvent) {
             this.fireEvent("widthchange", this, col, width);
        }
    },

    /**
     * Returns the total width of all columns.
     * @param {Boolean} includeHidden True to include hidden column widths
     * @return {Number}
     */
    getTotalWidth : function(includeHidden) {
        if (!this.totalWidth) {
            this.totalWidth = 0;
            for (var i = 0, len = this.config.length; i < len; i++) {
                if (includeHidden || !this.isHidden(i)) {
                    this.totalWidth += this.getColumnWidth(i);
                }
            }
        }
        return this.totalWidth;
    },

    /**
     * Returns the header for the specified column.
     * @param {Number} col The column index
     * @return {String}
     */
    getColumnHeader : function(col) {
        return this.config[col].header;
    },

    /**
     * Sets the header for a column.
     * @param {Number} col The column index
     * @param {String} header The new header
     */
    setColumnHeader : function(col, header) {
        this.config[col].header = header;
        this.fireEvent("headerchange", this, col, header);
    },

    /**
     * Returns the tooltip for the specified column.
     * @param {Number} col The column index
     * @return {String}
     */
    getColumnTooltip : function(col) {
            return this.config[col].tooltip;
    },
    /**
     * Sets the tooltip for a column.
     * @param {Number} col The column index
     * @param {String} tooltip The new tooltip
     */
    setColumnTooltip : function(col, tooltip) {
            this.config[col].tooltip = tooltip;
    },

    /**
     * Returns the dataIndex for the specified column.
<pre><code>
// Get field name for the column
var fieldName = grid.getColumnModel().getDataIndex(columnIndex);
</code></pre>
     * @param {Number} col The column index
     * @return {String} The column's dataIndex
     */
    getDataIndex : function(col) {
        return this.config[col].dataIndex;
    },

    /**
     * Sets the dataIndex for a column.
     * @param {Number} col The column index
     * @param {String} dataIndex The new dataIndex
     */
    setDataIndex : function(col, dataIndex) {
        this.config[col].dataIndex = dataIndex;
    },

    /**
     * Finds the index of the first matching column for the given dataIndex.
     * @param {String} col The dataIndex to find
     * @return {Number} The column index, or -1 if no match was found
     */
    findColumnIndex : function(dataIndex) {
        var c = this.config;
        for(var i = 0, len = c.length; i < len; i++){
            if(c[i].dataIndex == dataIndex){
                return i;
            }
        }
        return -1;
    },

    /**
     * Returns true if the cell is editable.
<pre><code>
var store = new Ext.data.Store({...});
var colModel = new Ext.grid.ColumnModel({
  columns: [...],
  isCellEditable: function(col, row) {
    var record = store.getAt(row);
    if (record.get('readonly')) { // replace with your condition
      return false;
    }
    return Ext.grid.ColumnModel.prototype.isCellEditable.call(this, col, row);
  }
});
var grid = new Ext.grid.GridPanel({
  store: store,
  colModel: colModel,
  ...
});
</code></pre>
     * @param {Number} colIndex The column index
     * @param {Number} rowIndex The row index
     * @return {Boolean}
     */
    isCellEditable : function(colIndex, rowIndex) {
        var c = this.config[colIndex],
            ed = c.editable;

        //force boolean
        return !!(ed || (!Ext.isDefined(ed) && c.editor));
    },

    /**
     * Returns the editor defined for the cell/column.
     * @param {Number} colIndex The column index
     * @param {Number} rowIndex The row index
     * @return {Ext.Editor} The {@link Ext.Editor Editor} that was created to wrap
     * the {@link Ext.form.Field Field} used to edit the cell.
     */
    getCellEditor : function(colIndex, rowIndex) {
        return this.config[colIndex].getCellEditor(rowIndex);
    },

    /**
     * Sets if a column is editable.
     * @param {Number} col The column index
     * @param {Boolean} editable True if the column is editable
     */
    setEditable : function(col, editable) {
        this.config[col].editable = editable;
    },

    /**
     * Returns <tt>true</tt> if the column is <code>{@link Ext.grid.Column#hidden hidden}</code>,
     * <tt>false</tt> otherwise.
     * @param {Number} colIndex The column index
     * @return {Boolean}
     */
    isHidden : function(colIndex) {
        return !!this.config[colIndex].hidden; // ensure returns boolean
    },

    /**
     * Returns <tt>true</tt> if the column is <code>{@link Ext.grid.Column#fixed fixed}</code>,
     * <tt>false</tt> otherwise.
     * @param {Number} colIndex The column index
     * @return {Boolean}
     */
    isFixed : function(colIndex) {
        return !!this.config[colIndex].fixed;
    },

    /**
     * Returns true if the column can be resized
     * @return {Boolean}
     */
    isResizable : function(colIndex) {
        return colIndex >= 0 && this.config[colIndex].resizable !== false && this.config[colIndex].fixed !== true;
    },
    
    /**
     * Sets if a column is hidden.
<pre><code>
myGrid.getColumnModel().setHidden(0, true); // hide column 0 (0 = the first column).
</code></pre>
     * @param {Number} colIndex The column index
     * @param {Boolean} hidden True if the column is hidden
     */
    setHidden : function(colIndex, hidden) {
        var c = this.config[colIndex];
        if(c.hidden !== hidden){
            c.hidden = hidden;
            this.totalWidth = null;
            this.fireEvent("hiddenchange", this, colIndex, hidden);
        }
    },

    /**
     * Sets the editor for a column and destroys the prior editor.
     * @param {Number} col The column index
     * @param {Object} editor The editor object
     */
    setEditor : function(col, editor) {
        this.config[col].setEditor(editor);
    },

    /**
     * Destroys this column model by purging any event listeners. Destroys and dereferences all Columns.
     */
    destroy : function() {
        var length = this.config.length,
            i = 0;

        for (; i < length; i++){
            this.config[i].destroy(); // Column's destroy encapsulates all cleanup.
        }
        delete this.config;
        delete this.lookup;
        this.purgeListeners();
    },

    /**
     * @private
     * Setup any saved state for the column, ensures that defaults are applied.
     */
    setState : function(col, state) {
        state = Ext.applyIf(state, this.defaults);
        Ext.apply(this.config[col], state);
    }
});

// private
Ext.grid.ColumnModel.defaultRenderer = function(value) {
    if (typeof value == "string" && value.length < 1) {
        return "&#160;";
    }
    return value;
};