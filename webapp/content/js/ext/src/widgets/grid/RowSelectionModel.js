/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.grid.RowSelectionModel
 * @extends Ext.grid.AbstractSelectionModel
 * The default SelectionModel used by {@link Ext.grid.GridPanel}.
 * It supports multiple selections and keyboard selection/navigation. The objects stored
 * as selections and returned by {@link #getSelected}, and {@link #getSelections} are
 * the {@link Ext.data.Record Record}s which provide the data for the selected rows.
 * @constructor
 * @param {Object} config
 */
Ext.grid.RowSelectionModel = Ext.extend(Ext.grid.AbstractSelectionModel,  {
    /**
     * @cfg {Boolean} singleSelect
     * <tt>true</tt> to allow selection of only one row at a time (defaults to <tt>false</tt>
     * allowing multiple selections)
     */
    singleSelect : false,
    
    constructor : function(config){
        Ext.apply(this, config);
        this.selections = new Ext.util.MixedCollection(false, function(o){
            return o.id;
        });

        this.last = false;
        this.lastActive = false;

        this.addEvents(
	        /**
	         * @event selectionchange
	         * Fires when the selection changes
	         * @param {SelectionModel} this
	         */
	        'selectionchange',
	        /**
	         * @event beforerowselect
	         * Fires before a row is selected, return false to cancel the selection.
	         * @param {SelectionModel} this
	         * @param {Number} rowIndex The index to be selected
	         * @param {Boolean} keepExisting False if other selections will be cleared
	         * @param {Record} record The record to be selected
	         */
	        'beforerowselect',
	        /**
	         * @event rowselect
	         * Fires when a row is selected.
	         * @param {SelectionModel} this
	         * @param {Number} rowIndex The selected index
	         * @param {Ext.data.Record} r The selected record
	         */
	        'rowselect',
	        /**
	         * @event rowdeselect
	         * Fires when a row is deselected.  To prevent deselection
	         * {@link Ext.grid.AbstractSelectionModel#lock lock the selections}. 
	         * @param {SelectionModel} this
	         * @param {Number} rowIndex
	         * @param {Record} record
	         */
	        'rowdeselect'
        );
        Ext.grid.RowSelectionModel.superclass.constructor.call(this);
    },

    /**
     * @cfg {Boolean} moveEditorOnEnter
     * <tt>false</tt> to turn off moving the editor to the next row down when the enter key is pressed
     * or the next row up when shift + enter keys are pressed.
     */
    // private
    initEvents : function(){

        if(!this.grid.enableDragDrop && !this.grid.enableDrag){
            this.grid.on('rowmousedown', this.handleMouseDown, this);
        }

        this.rowNav = new Ext.KeyNav(this.grid.getGridEl(), {
            up: this.onKeyPress, 
            down: this.onKeyPress,
            scope: this
        });

        this.grid.getView().on({
            scope: this,
            refresh: this.onRefresh,
            rowupdated: this.onRowUpdated,
            rowremoved: this.onRemove
        });
    },
    
    onKeyPress : function(e, name){
        var up = name == 'up',
            method = up ? 'selectPrevious' : 'selectNext',
            add = up ? -1 : 1,
            last;
        if(!e.shiftKey || this.singleSelect){
            this[method](false);
        }else if(this.last !== false && this.lastActive !== false){
            last = this.last;
            this.selectRange(this.last,  this.lastActive + add);
            this.grid.getView().focusRow(this.lastActive);
            if(last !== false){
                this.last = last;
            }
        }else{
           this.selectFirstRow();
        }
    },

    // private
    onRefresh : function(){
        var ds = this.grid.store,
            s = this.getSelections(),
            i = 0,
            len = s.length, 
            index, r;
            
        this.silent = true;
        this.clearSelections(true);
        for(; i < len; i++){
            r = s[i];
            if((index = ds.indexOfId(r.id)) != -1){
                this.selectRow(index, true);
            }
        }
        if(s.length != this.selections.getCount()){
            this.fireEvent('selectionchange', this);
        }
        this.silent = false;
    },

    // private
    onRemove : function(v, index, r){
        if(this.selections.remove(r) !== false){
            this.fireEvent('selectionchange', this);
        }
    },

    // private
    onRowUpdated : function(v, index, r){
        if(this.isSelected(r)){
            v.onRowSelect(index);
        }
    },

    /**
     * Select records.
     * @param {Array} records The records to select
     * @param {Boolean} keepExisting (optional) <tt>true</tt> to keep existing selections
     */
    selectRecords : function(records, keepExisting){
        if(!keepExisting){
            this.clearSelections();
        }
        var ds = this.grid.store,
            i = 0,
            len = records.length;
        for(; i < len; i++){
            this.selectRow(ds.indexOf(records[i]), true);
        }
    },

    /**
     * Gets the number of selected rows.
     * @return {Number}
     */
    getCount : function(){
        return this.selections.length;
    },

    /**
     * Selects the first row in the grid.
     */
    selectFirstRow : function(){
        this.selectRow(0);
    },

    /**
     * Select the last row.
     * @param {Boolean} keepExisting (optional) <tt>true</tt> to keep existing selections
     */
    selectLastRow : function(keepExisting){
        this.selectRow(this.grid.store.getCount() - 1, keepExisting);
    },

    /**
     * Selects the row immediately following the last selected row.
     * @param {Boolean} keepExisting (optional) <tt>true</tt> to keep existing selections
     * @return {Boolean} <tt>true</tt> if there is a next row, else <tt>false</tt>
     */
    selectNext : function(keepExisting){
        if(this.hasNext()){
            this.selectRow(this.last+1, keepExisting);
            this.grid.getView().focusRow(this.last);
            return true;
        }
        return false;
    },

    /**
     * Selects the row that precedes the last selected row.
     * @param {Boolean} keepExisting (optional) <tt>true</tt> to keep existing selections
     * @return {Boolean} <tt>true</tt> if there is a previous row, else <tt>false</tt>
     */
    selectPrevious : function(keepExisting){
        if(this.hasPrevious()){
            this.selectRow(this.last-1, keepExisting);
            this.grid.getView().focusRow(this.last);
            return true;
        }
        return false;
    },

    /**
     * Returns true if there is a next record to select
     * @return {Boolean}
     */
    hasNext : function(){
        return this.last !== false && (this.last+1) < this.grid.store.getCount();
    },

    /**
     * Returns true if there is a previous record to select
     * @return {Boolean}
     */
    hasPrevious : function(){
        return !!this.last;
    },


    /**
     * Returns the selected records
     * @return {Array} Array of selected records
     */
    getSelections : function(){
        return [].concat(this.selections.items);
    },

    /**
     * Returns the first selected record.
     * @return {Record}
     */
    getSelected : function(){
        return this.selections.itemAt(0);
    },

    /**
     * Calls the passed function with each selection. If the function returns
     * <tt>false</tt>, iteration is stopped and this function returns
     * <tt>false</tt>. Otherwise it returns <tt>true</tt>.
     * @param {Function} fn The function to call upon each iteration. It is passed the selected {@link Ext.data.Record Record}.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to this RowSelectionModel.
     * @return {Boolean} true if all selections were iterated
     */
    each : function(fn, scope){
        var s = this.getSelections(),
            i = 0,
            len = s.length;
            
        for(; i < len; i++){
            if(fn.call(scope || this, s[i], i) === false){
                return false;
            }
        }
        return true;
    },

    /**
     * Clears all selections if the selection model
     * {@link Ext.grid.AbstractSelectionModel#isLocked is not locked}.
     * @param {Boolean} fast (optional) <tt>true</tt> to bypass the
     * conditional checks and events described in {@link #deselectRow}.
     */
    clearSelections : function(fast){
        if(this.isLocked()){
            return;
        }
        if(fast !== true){
            var ds = this.grid.store,
                s = this.selections;
            s.each(function(r){
                this.deselectRow(ds.indexOfId(r.id));
            }, this);
            s.clear();
        }else{
            this.selections.clear();
        }
        this.last = false;
    },


    /**
     * Selects all rows if the selection model
     * {@link Ext.grid.AbstractSelectionModel#isLocked is not locked}. 
     */
    selectAll : function(){
        if(this.isLocked()){
            return;
        }
        this.selections.clear();
        for(var i = 0, len = this.grid.store.getCount(); i < len; i++){
            this.selectRow(i, true);
        }
    },

    /**
     * Returns <tt>true</tt> if there is a selection.
     * @return {Boolean}
     */
    hasSelection : function(){
        return this.selections.length > 0;
    },

    /**
     * Returns <tt>true</tt> if the specified row is selected.
     * @param {Number/Record} index The record or index of the record to check
     * @return {Boolean}
     */
    isSelected : function(index){
        var r = Ext.isNumber(index) ? this.grid.store.getAt(index) : index;
        return (r && this.selections.key(r.id) ? true : false);
    },

    /**
     * Returns <tt>true</tt> if the specified record id is selected.
     * @param {String} id The id of record to check
     * @return {Boolean}
     */
    isIdSelected : function(id){
        return (this.selections.key(id) ? true : false);
    },

    // private
    handleMouseDown : function(g, rowIndex, e){
        if(e.button !== 0 || this.isLocked()){
            return;
        }
        var view = this.grid.getView();
        if(e.shiftKey && !this.singleSelect && this.last !== false){
            var last = this.last;
            this.selectRange(last, rowIndex, e.ctrlKey);
            this.last = last; // reset the last
            view.focusRow(rowIndex);
        }else{
            var isSelected = this.isSelected(rowIndex);
            if(e.ctrlKey && isSelected){
                this.deselectRow(rowIndex);
            }else if(!isSelected || this.getCount() > 1){
                this.selectRow(rowIndex, e.ctrlKey || e.shiftKey);
                view.focusRow(rowIndex);
            }
        }
    },

    /**
     * Selects multiple rows.
     * @param {Array} rows Array of the indexes of the row to select
     * @param {Boolean} keepExisting (optional) <tt>true</tt> to keep
     * existing selections (defaults to <tt>false</tt>)
     */
    selectRows : function(rows, keepExisting){
        if(!keepExisting){
            this.clearSelections();
        }
        for(var i = 0, len = rows.length; i < len; i++){
            this.selectRow(rows[i], true);
        }
    },

    /**
     * Selects a range of rows if the selection model
     * {@link Ext.grid.AbstractSelectionModel#isLocked is not locked}.
     * All rows in between startRow and endRow are also selected.
     * @param {Number} startRow The index of the first row in the range
     * @param {Number} endRow The index of the last row in the range
     * @param {Boolean} keepExisting (optional) True to retain existing selections
     */
    selectRange : function(startRow, endRow, keepExisting){
        var i;
        if(this.isLocked()){
            return;
        }
        if(!keepExisting){
            this.clearSelections();
        }
        if(startRow <= endRow){
            for(i = startRow; i <= endRow; i++){
                this.selectRow(i, true);
            }
        }else{
            for(i = startRow; i >= endRow; i--){
                this.selectRow(i, true);
            }
        }
    },

    /**
     * Deselects a range of rows if the selection model
     * {@link Ext.grid.AbstractSelectionModel#isLocked is not locked}.  
     * All rows in between startRow and endRow are also deselected.
     * @param {Number} startRow The index of the first row in the range
     * @param {Number} endRow The index of the last row in the range
     */
    deselectRange : function(startRow, endRow, preventViewNotify){
        if(this.isLocked()){
            return;
        }
        for(var i = startRow; i <= endRow; i++){
            this.deselectRow(i, preventViewNotify);
        }
    },

    /**
     * Selects a row.  Before selecting a row, checks if the selection model
     * {@link Ext.grid.AbstractSelectionModel#isLocked is locked} and fires the
     * {@link #beforerowselect} event.  If these checks are satisfied the row
     * will be selected and followed up by  firing the {@link #rowselect} and
     * {@link #selectionchange} events.
     * @param {Number} row The index of the row to select
     * @param {Boolean} keepExisting (optional) <tt>true</tt> to keep existing selections
     * @param {Boolean} preventViewNotify (optional) Specify <tt>true</tt> to
     * prevent notifying the view (disables updating the selected appearance)
     */
    selectRow : function(index, keepExisting, preventViewNotify){
        if(this.isLocked() || (index < 0 || index >= this.grid.store.getCount()) || (keepExisting && this.isSelected(index))){
            return;
        }
        var r = this.grid.store.getAt(index);
        if(r && this.fireEvent('beforerowselect', this, index, keepExisting, r) !== false){
            if(!keepExisting || this.singleSelect){
                this.clearSelections();
            }
            this.selections.add(r);
            this.last = this.lastActive = index;
            if(!preventViewNotify){
                this.grid.getView().onRowSelect(index);
            }
            if(!this.silent){
                this.fireEvent('rowselect', this, index, r);
                this.fireEvent('selectionchange', this);
            }
        }
    },

    /**
     * Deselects a row.  Before deselecting a row, checks if the selection model
     * {@link Ext.grid.AbstractSelectionModel#isLocked is locked}.
     * If this check is satisfied the row will be deselected and followed up by
     * firing the {@link #rowdeselect} and {@link #selectionchange} events.
     * @param {Number} row The index of the row to deselect
     * @param {Boolean} preventViewNotify (optional) Specify <tt>true</tt> to
     * prevent notifying the view (disables updating the selected appearance)
     */
    deselectRow : function(index, preventViewNotify){
        if(this.isLocked()){
            return;
        }
        if(this.last == index){
            this.last = false;
        }
        if(this.lastActive == index){
            this.lastActive = false;
        }
        var r = this.grid.store.getAt(index);
        if(r){
            this.selections.remove(r);
            if(!preventViewNotify){
                this.grid.getView().onRowDeselect(index);
            }
            this.fireEvent('rowdeselect', this, index, r);
            this.fireEvent('selectionchange', this);
        }
    },

    // private
    acceptsNav : function(row, col, cm){
        return !cm.isHidden(col) && cm.isCellEditable(col, row);
    },

    // private
    onEditorKey : function(field, e){
        var k = e.getKey(), 
            newCell, 
            g = this.grid, 
            last = g.lastEdit,
            ed = g.activeEditor,
            shift = e.shiftKey,
            ae, last, r, c;
            
        if(k == e.TAB){
            e.stopEvent();
            ed.completeEdit();
            if(shift){
                newCell = g.walkCells(ed.row, ed.col-1, -1, this.acceptsNav, this);
            }else{
                newCell = g.walkCells(ed.row, ed.col+1, 1, this.acceptsNav, this);
            }
        }else if(k == e.ENTER){
            if(this.moveEditorOnEnter !== false){
                if(shift){
                    newCell = g.walkCells(last.row - 1, last.col, -1, this.acceptsNav, this);
                }else{
                    newCell = g.walkCells(last.row + 1, last.col, 1, this.acceptsNav, this);
                }
            }
        }
        if(newCell){
            r = newCell[0];
            c = newCell[1];

            this.onEditorSelect(r, last.row);

            if(g.isEditor && g.editing){ // *** handle tabbing while editorgrid is in edit mode
                ae = g.activeEditor;
                if(ae && ae.field.triggerBlur){
                    // *** if activeEditor is a TriggerField, explicitly call its triggerBlur() method
                    ae.field.triggerBlur();
                }
            }
            g.startEditing(r, c);
        }
    },
    
    onEditorSelect: function(row, lastRow){
        if(lastRow != row){
            this.selectRow(row); // *** highlight newly-selected cell and update selection
        }
    },
    
    destroy : function(){
        Ext.destroy(this.rowNav);
        this.rowNav = null;
        Ext.grid.RowSelectionModel.superclass.destroy.call(this);
    }
});
