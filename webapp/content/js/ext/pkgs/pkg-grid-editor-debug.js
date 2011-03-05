/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.grid.CellSelectionModel
 * @extends Ext.grid.AbstractSelectionModel
 * This class provides the basic implementation for <i>single</i> <b>cell</b> selection in a grid.
 * The object stored as the selection contains the following properties:
 * <div class="mdetail-params"><ul>
 * <li><b>cell</b> : see {@link #getSelectedCell} 
 * <li><b>record</b> : Ext.data.record The {@link Ext.data.Record Record}
 * which provides the data for the row containing the selection</li>
 * </ul></div>
 * @constructor
 * @param {Object} config The object containing the configuration of this model.
 */
Ext.grid.CellSelectionModel = Ext.extend(Ext.grid.AbstractSelectionModel,  {
    
    constructor : function(config){
        Ext.apply(this, config);

	    this.selection = null;
	
	    this.addEvents(
	        /**
	         * @event beforecellselect
	         * Fires before a cell is selected, return false to cancel the selection.
	         * @param {SelectionModel} this
	         * @param {Number} rowIndex The selected row index
	         * @param {Number} colIndex The selected cell index
	         */
	        "beforecellselect",
	        /**
	         * @event cellselect
	         * Fires when a cell is selected.
	         * @param {SelectionModel} this
	         * @param {Number} rowIndex The selected row index
	         * @param {Number} colIndex The selected cell index
	         */
	        "cellselect",
	        /**
	         * @event selectionchange
	         * Fires when the active selection changes.
	         * @param {SelectionModel} this
	         * @param {Object} selection null for no selection or an object with two properties
	         * <div class="mdetail-params"><ul>
	         * <li><b>cell</b> : see {@link #getSelectedCell} 
	         * <li><b>record</b> : Ext.data.record<p class="sub-desc">The {@link Ext.data.Record Record}
	         * which provides the data for the row containing the selection</p></li>
	         * </ul></div>
	         */
	        "selectionchange"
	    );
	
	    Ext.grid.CellSelectionModel.superclass.constructor.call(this);
    },

    /** @ignore */
    initEvents : function(){
        this.grid.on('cellmousedown', this.handleMouseDown, this);
        this.grid.on(Ext.EventManager.getKeyEvent(), this.handleKeyDown, this);
        this.grid.getView().on({
            scope: this,
            refresh: this.onViewChange,
            rowupdated: this.onRowUpdated,
            beforerowremoved: this.clearSelections,
            beforerowsinserted: this.clearSelections
        });
        if(this.grid.isEditor){
            this.grid.on('beforeedit', this.beforeEdit,  this);
        }
    },

	//private
    beforeEdit : function(e){
        this.select(e.row, e.column, false, true, e.record);
    },

	//private
    onRowUpdated : function(v, index, r){
        if(this.selection && this.selection.record == r){
            v.onCellSelect(index, this.selection.cell[1]);
        }
    },

	//private
    onViewChange : function(){
        this.clearSelections(true);
    },

	/**
     * Returns an array containing the row and column indexes of the currently selected cell
     * (e.g., [0, 0]), or null if none selected. The array has elements:
     * <div class="mdetail-params"><ul>
     * <li><b>rowIndex</b> : Number<p class="sub-desc">The index of the selected row</p></li>
     * <li><b>cellIndex</b> : Number<p class="sub-desc">The index of the selected cell. 
     * Due to possible column reordering, the cellIndex should <b>not</b> be used as an
     * index into the Record's data. Instead, use the cellIndex to determine the <i>name</i>
     * of the selected cell and use the field name to retrieve the data value from the record:<pre><code>
// get name
var fieldName = grid.getColumnModel().getDataIndex(cellIndex);
// get data value based on name
var data = record.get(fieldName);
     * </code></pre></p></li>
     * </ul></div>
     * @return {Array} An array containing the row and column indexes of the selected cell, or null if none selected.
	 */
    getSelectedCell : function(){
        return this.selection ? this.selection.cell : null;
    },

    /**
     * If anything is selected, clears all selections and fires the selectionchange event.
     * @param {Boolean} preventNotify <tt>true</tt> to prevent the gridview from
     * being notified about the change.
     */
    clearSelections : function(preventNotify){
        var s = this.selection;
        if(s){
            if(preventNotify !== true){
                this.grid.view.onCellDeselect(s.cell[0], s.cell[1]);
            }
            this.selection = null;
            this.fireEvent("selectionchange", this, null);
        }
    },

    /**
     * Returns <tt>true</tt> if there is a selection.
     * @return {Boolean}
     */
    hasSelection : function(){
        return this.selection ? true : false;
    },

    /** @ignore */
    handleMouseDown : function(g, row, cell, e){
        if(e.button !== 0 || this.isLocked()){
            return;
        }
        this.select(row, cell);
    },

    /**
     * Selects a cell.  Before selecting a cell, fires the
     * {@link #beforecellselect} event.  If this check is satisfied the cell
     * will be selected and followed up by  firing the {@link #cellselect} and
     * {@link #selectionchange} events.
     * @param {Number} rowIndex The index of the row to select
     * @param {Number} colIndex The index of the column to select
     * @param {Boolean} preventViewNotify (optional) Specify <tt>true</tt> to
     * prevent notifying the view (disables updating the selected appearance)
     * @param {Boolean} preventFocus (optional) Whether to prevent the cell at
     * the specified rowIndex / colIndex from being focused.
     * @param {Ext.data.Record} r (optional) The record to select
     */
    select : function(rowIndex, colIndex, preventViewNotify, preventFocus, /*internal*/ r){
        if(this.fireEvent("beforecellselect", this, rowIndex, colIndex) !== false){
            this.clearSelections();
            r = r || this.grid.store.getAt(rowIndex);
            this.selection = {
                record : r,
                cell : [rowIndex, colIndex]
            };
            if(!preventViewNotify){
                var v = this.grid.getView();
                v.onCellSelect(rowIndex, colIndex);
                if(preventFocus !== true){
                    v.focusCell(rowIndex, colIndex);
                }
            }
            this.fireEvent("cellselect", this, rowIndex, colIndex);
            this.fireEvent("selectionchange", this, this.selection);
        }
    },

	//private
    isSelectable : function(rowIndex, colIndex, cm){
        return !cm.isHidden(colIndex);
    },
    
    // private
    onEditorKey: function(field, e){
        if(e.getKey() == e.TAB){
            this.handleKeyDown(e);
        }
    },

    /** @ignore */
    handleKeyDown : function(e){
        if(!e.isNavKeyPress()){
            return;
        }
        
        var k = e.getKey(),
            g = this.grid,
            s = this.selection,
            sm = this,
            walk = function(row, col, step){
                return g.walkCells(
                    row,
                    col,
                    step,
                    g.isEditor && g.editing ? sm.acceptsNav : sm.isSelectable, // *** handle tabbing while editorgrid is in edit mode
                    sm
                );
            },
            cell, newCell, r, c, ae;

        switch(k){
            case e.ESC:
            case e.PAGE_UP:
            case e.PAGE_DOWN:
                // do nothing
                break;
            default:
                // *** call e.stopEvent() only for non ESC, PAGE UP/DOWN KEYS
                e.stopEvent();
                break;
        }

        if(!s){
            cell = walk(0, 0, 1); // *** use private walk() function defined above
            if(cell){
                this.select(cell[0], cell[1]);
            }
            return;
        }

        cell = s.cell;  // currently selected cell
        r = cell[0];    // current row
        c = cell[1];    // current column
        
        switch(k){
            case e.TAB:
                if(e.shiftKey){
                    newCell = walk(r, c - 1, -1);
                }else{
                    newCell = walk(r, c + 1, 1);
                }
                break;
            case e.DOWN:
                newCell = walk(r + 1, c, 1);
                break;
            case e.UP:
                newCell = walk(r - 1, c, -1);
                break;
            case e.RIGHT:
                newCell = walk(r, c + 1, 1);
                break;
            case e.LEFT:
                newCell = walk(r, c - 1, -1);
                break;
            case e.ENTER:
                if (g.isEditor && !g.editing) {
                    g.startEditing(r, c);
                    return;
                }
                break;
        }

        if(newCell){
            // *** reassign r & c variables to newly-selected cell's row and column
            r = newCell[0];
            c = newCell[1];

            this.select(r, c); // *** highlight newly-selected cell and update selection

            if(g.isEditor && g.editing){ // *** handle tabbing while editorgrid is in edit mode
                ae = g.activeEditor;
                if(ae && ae.field.triggerBlur){
                    // *** if activeEditor is a TriggerField, explicitly call its triggerBlur() method
                    ae.field.triggerBlur();
                }
                g.startEditing(r, c);
            }
        }
    },

    acceptsNav : function(row, col, cm){
        return !cm.isHidden(col) && cm.isCellEditable(col, row);
    }
});/**
 * @class Ext.grid.EditorGridPanel
 * @extends Ext.grid.GridPanel
 * <p>This class extends the {@link Ext.grid.GridPanel GridPanel Class} to provide cell editing
 * on selected {@link Ext.grid.Column columns}. The editable columns are specified by providing
 * an {@link Ext.grid.ColumnModel#editor editor} in the {@link Ext.grid.Column column configuration}.</p>
 * <p>Editability of columns may be controlled programatically by inserting an implementation
 * of {@link Ext.grid.ColumnModel#isCellEditable isCellEditable} into the
 * {@link Ext.grid.ColumnModel ColumnModel}.</p>
 * <p>Editing is performed on the value of the <i>field</i> specified by the column's
 * <tt>{@link Ext.grid.ColumnModel#dataIndex dataIndex}</tt> in the backing {@link Ext.data.Store Store}
 * (so if you are using a {@link Ext.grid.ColumnModel#setRenderer renderer} in order to display
 * transformed data, this must be accounted for).</p>
 * <p>If a value-to-description mapping is used to render a column, then a {@link Ext.form.Field#ComboBox ComboBox}
 * which uses the same {@link Ext.form.Field#valueField value}-to-{@link Ext.form.Field#displayFieldField description}
 * mapping would be an appropriate editor.</p>
 * If there is a more complex mismatch between the visible data in the grid, and the editable data in
 * the {@link Edt.data.Store Store}, then code to transform the data both before and after editing can be
 * injected using the {@link #beforeedit} and {@link #afteredit} events.
 * @constructor
 * @param {Object} config The config object
 * @xtype editorgrid
 */
Ext.grid.EditorGridPanel = Ext.extend(Ext.grid.GridPanel, {
    /**
     * @cfg {Number} clicksToEdit
     * <p>The number of clicks on a cell required to display the cell's editor (defaults to 2).</p>
     * <p>Setting this option to 'auto' means that mousedown <i>on the selected cell</i> starts
     * editing that cell.</p>
     */
    clicksToEdit: 2,

    /**
    * @cfg {Boolean} forceValidation
    * True to force validation even if the value is unmodified (defaults to false)
    */
    forceValidation: false,

    // private
    isEditor : true,
    // private
    detectEdit: false,

    /**
     * @cfg {Boolean} autoEncode
     * True to automatically HTML encode and decode values pre and post edit (defaults to false)
     */
    autoEncode : false,

    /**
     * @cfg {Boolean} trackMouseOver @hide
     */
    // private
    trackMouseOver: false, // causes very odd FF errors

    // private
    initComponent : function(){
        Ext.grid.EditorGridPanel.superclass.initComponent.call(this);

        if(!this.selModel){
            /**
             * @cfg {Object} selModel Any subclass of AbstractSelectionModel that will provide the selection model for
             * the grid (defaults to {@link Ext.grid.CellSelectionModel} if not specified).
             */
            this.selModel = new Ext.grid.CellSelectionModel();
        }

        this.activeEditor = null;

        this.addEvents(
            /**
             * @event beforeedit
             * Fires before cell editing is triggered. The edit event object has the following properties <br />
             * <ul style="padding:5px;padding-left:16px;">
             * <li>grid - This grid</li>
             * <li>record - The record being edited</li>
             * <li>field - The field name being edited</li>
             * <li>value - The value for the field being edited.</li>
             * <li>row - The grid row index</li>
             * <li>column - The grid column index</li>
             * <li>cancel - Set this to true to cancel the edit or return false from your handler.</li>
             * </ul>
             * @param {Object} e An edit event (see above for description)
             */
            "beforeedit",
            /**
             * @event afteredit
             * Fires after a cell is edited. The edit event object has the following properties <br />
             * <ul style="padding:5px;padding-left:16px;">
             * <li>grid - This grid</li>
             * <li>record - The record being edited</li>
             * <li>field - The field name being edited</li>
             * <li>value - The value being set</li>
             * <li>originalValue - The original value for the field, before the edit.</li>
             * <li>row - The grid row index</li>
             * <li>column - The grid column index</li>
             * </ul>
             *
             * <pre><code>
grid.on('afteredit', afterEdit, this );

function afterEdit(e) {
    // execute an XHR to send/commit data to the server, in callback do (if successful):
    e.record.commit();
};
             * </code></pre>
             * @param {Object} e An edit event (see above for description)
             */
            "afteredit",
            /**
             * @event validateedit
             * Fires after a cell is edited, but before the value is set in the record. Return false
             * to cancel the change. The edit event object has the following properties <br />
             * <ul style="padding:5px;padding-left:16px;">
             * <li>grid - This grid</li>
             * <li>record - The record being edited</li>
             * <li>field - The field name being edited</li>
             * <li>value - The value being set</li>
             * <li>originalValue - The original value for the field, before the edit.</li>
             * <li>row - The grid row index</li>
             * <li>column - The grid column index</li>
             * <li>cancel - Set this to true to cancel the edit or return false from your handler.</li>
             * </ul>
             * Usage example showing how to remove the red triangle (dirty record indicator) from some
             * records (not all).  By observing the grid's validateedit event, it can be cancelled if
             * the edit occurs on a targeted row (for example) and then setting the field's new value
             * in the Record directly:
             * <pre><code>
grid.on('validateedit', function(e) {
  var myTargetRow = 6;

  if (e.row == myTargetRow) {
    e.cancel = true;
    e.record.data[e.field] = e.value;
  }
});
             * </code></pre>
             * @param {Object} e An edit event (see above for description)
             */
            "validateedit"
        );
    },

    // private
    initEvents : function(){
        Ext.grid.EditorGridPanel.superclass.initEvents.call(this);

        this.getGridEl().on('mousewheel', this.stopEditing.createDelegate(this, [true]), this);
        this.on('columnresize', this.stopEditing, this, [true]);

        if(this.clicksToEdit == 1){
            this.on("cellclick", this.onCellDblClick, this);
        }else {
            var view = this.getView();
            if(this.clicksToEdit == 'auto' && view.mainBody){
                view.mainBody.on('mousedown', this.onAutoEditClick, this);
            }
            this.on('celldblclick', this.onCellDblClick, this);
        }
    },

    onResize : function(){
        Ext.grid.EditorGridPanel.superclass.onResize.apply(this, arguments);
        var ae = this.activeEditor;
        if(this.editing && ae){
            ae.realign(true);
        }
    },

    // private
    onCellDblClick : function(g, row, col){
        this.startEditing(row, col);
    },

    // private
    onAutoEditClick : function(e, t){
        if(e.button !== 0){
            return;
        }
        var row = this.view.findRowIndex(t),
            col = this.view.findCellIndex(t);
        if(row !== false && col !== false){
            this.stopEditing();
            if(this.selModel.getSelectedCell){ // cell sm
                var sc = this.selModel.getSelectedCell();
                if(sc && sc[0] === row && sc[1] === col){
                    this.startEditing(row, col);
                }
            }else{
                if(this.selModel.isSelected(row)){
                    this.startEditing(row, col);
                }
            }
        }
    },

    // private
    onEditComplete : function(ed, value, startValue){
        this.editing = false;
        this.lastActiveEditor = this.activeEditor;
        this.activeEditor = null;

        var r = ed.record,
            field = this.colModel.getDataIndex(ed.col);
        value = this.postEditValue(value, startValue, r, field);
        if(this.forceValidation === true || String(value) !== String(startValue)){
            var e = {
                grid: this,
                record: r,
                field: field,
                originalValue: startValue,
                value: value,
                row: ed.row,
                column: ed.col,
                cancel:false
            };
            if(this.fireEvent("validateedit", e) !== false && !e.cancel && String(value) !== String(startValue)){
                r.set(field, e.value);
                delete e.cancel;
                this.fireEvent("afteredit", e);
            }
        }
        this.view.focusCell(ed.row, ed.col);
    },

    /**
     * Starts editing the specified for the specified row/column
     * @param {Number} rowIndex
     * @param {Number} colIndex
     */
    startEditing : function(row, col){
        this.stopEditing();
        if(this.colModel.isCellEditable(col, row)){
            this.view.ensureVisible(row, col, true);
            var r = this.store.getAt(row),
                field = this.colModel.getDataIndex(col),
                e = {
                    grid: this,
                    record: r,
                    field: field,
                    value: r.data[field],
                    row: row,
                    column: col,
                    cancel:false
                };
            if(this.fireEvent("beforeedit", e) !== false && !e.cancel){
                this.editing = true;
                var ed = this.colModel.getCellEditor(col, row);
                if(!ed){
                    return;
                }
                if(!ed.rendered){
                    ed.parentEl = this.view.getEditorParent(ed);
                    ed.on({
                        scope: this,
                        render: {
                            fn: function(c){
                                c.field.focus(false, true);
                            },
                            single: true,
                            scope: this
                        },
                        specialkey: function(field, e){
                            this.getSelectionModel().onEditorKey(field, e);
                        },
                        complete: this.onEditComplete,
                        canceledit: this.stopEditing.createDelegate(this, [true])
                    });
                }
                Ext.apply(ed, {
                    row     : row,
                    col     : col,
                    record  : r
                });
                this.lastEdit = {
                    row: row,
                    col: col
                };
                this.activeEditor = ed;
                // Set the selectSameEditor flag if we are reusing the same editor again and
                // need to prevent the editor from firing onBlur on itself.
                ed.selectSameEditor = (this.activeEditor == this.lastActiveEditor);
                var v = this.preEditValue(r, field);
                ed.startEdit(this.view.getCell(row, col).firstChild, Ext.isDefined(v) ? v : '');

                // Clear the selectSameEditor flag
                (function(){
                    delete ed.selectSameEditor;
                }).defer(50);
            }
        }
    },

    // private
    preEditValue : function(r, field){
        var value = r.data[field];
        return this.autoEncode && Ext.isString(value) ? Ext.util.Format.htmlDecode(value) : value;
    },

    // private
    postEditValue : function(value, originalValue, r, field){
        return this.autoEncode && Ext.isString(value) ? Ext.util.Format.htmlEncode(value) : value;
    },

    /**
     * Stops any active editing
     * @param {Boolean} cancel (optional) True to cancel any changes
     */
    stopEditing : function(cancel){
        if(this.editing){
            // Store the lastActiveEditor to check if it is changing
            var ae = this.lastActiveEditor = this.activeEditor;
            if(ae){
                ae[cancel === true ? 'cancelEdit' : 'completeEdit']();
                this.view.focusCell(ae.row, ae.col);
            }
            this.activeEditor = null;
        }
        this.editing = false;
    }
});
Ext.reg('editorgrid', Ext.grid.EditorGridPanel);// private
// This is a support class used internally by the Grid components
Ext.grid.GridEditor = function(field, config){
    Ext.grid.GridEditor.superclass.constructor.call(this, field, config);
    field.monitorTab = false;
};

Ext.extend(Ext.grid.GridEditor, Ext.Editor, {
    alignment: "tl-tl",
    autoSize: "width",
    hideEl : false,
    cls: "x-small-editor x-grid-editor",
    shim:false,
    shadow:false
});