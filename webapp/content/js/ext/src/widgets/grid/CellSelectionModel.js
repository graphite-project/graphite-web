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
});