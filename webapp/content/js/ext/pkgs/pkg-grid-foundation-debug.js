/*!
 * Ext JS Library 3.0.0
 * Copyright(c) 2006-2009 Ext JS, LLC
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
/**
 * @class Ext.grid.GridPanel
 * @extends Ext.Panel
 * <p>This class represents the primary interface of a component based grid control to represent data
 * in a tabular format of rows and columns. The GridPanel is composed of the following:</p>
 * <div class="mdetail-params"><ul>
 * <li><b>{@link Ext.data.Store Store}</b> : The Model holding the data records (rows)
 * <div class="sub-desc"></div></li>
 * <li><b>{@link Ext.grid.ColumnModel Column model}</b> : Column makeup
 * <div class="sub-desc"></div></li>
 * <li><b>{@link Ext.grid.GridView View}</b> : Encapsulates the user interface 
 * <div class="sub-desc"></div></li>
 * <li><b>{@link Ext.grid.AbstractSelectionModel selection model}</b> : Selection behavior 
 * <div class="sub-desc"></div></li>
 * </ul></div>
 * <p>Example usage:</p>
 * <pre><code>
var grid = new Ext.grid.GridPanel({
    {@link #store}: new (@link Ext.data.Store}({
        {@link Ext.data.Store#autoDestroy autoDestroy}: true,
        {@link Ext.data.Store#reader reader}: reader,
        {@link Ext.data.Store#data data}: xg.dummyData
    }),
    {@link #columns}: [
        {id: 'company', header: 'Company', width: 200, sortable: true, dataIndex: 'company'},
        {header: 'Price', width: 120, sortable: true, renderer: Ext.util.Format.usMoney, dataIndex: 'price'},
        {header: 'Change', width: 120, sortable: true, dataIndex: 'change'},
        {header: '% Change', width: 120, sortable: true, dataIndex: 'pctChange'},
        // instead of specifying renderer: Ext.util.Format.dateRenderer('m/d/Y') use xtype
        {header: 'Last Updated', width: 135, sortable: true, dataIndex: 'lastChange', xtype: 'datecolumn', format: 'M d, Y'}
    ],
    {@link #viewConfig}: {
        {@link Ext.grid.GridView#forceFit forceFit}: true,

//      Return CSS class to apply to rows depending upon data values
        {@link Ext.grid.GridView#getRowClass getRowClass}: function(record, index) {
            var c = record.{@link Ext.data.Record#get get}('change');
            if (c < 0) {
                return 'price-fall';
            } else if (c > 0) {
                return 'price-rise';
            }
        }
    },
    {@link #sm}: new Ext.grid.RowSelectionModel({singleSelect:true}),
    width: 600,
    height: 300,
    frame: true,
    title: 'Framed with Row Selection and Horizontal Scrolling',
    iconCls: 'icon-grid'
});
 * </code></pre>
 * <p><b><u>Notes:</u></b></p>
 * <div class="mdetail-params"><ul>
 * <li>Although this class inherits many configuration options from base classes, some of them
 * (such as autoScroll, autoWidth, layout, items, etc) are not used by this class, and will
 * have no effect.</li>
 * <li>A grid <b>requires</b> a width in which to scroll its columns, and a height in which to
 * scroll its rows. These dimensions can either be set explicitly through the
 * <tt>{@link Ext.BoxComponent#height height}</tt> and <tt>{@link Ext.BoxComponent#width width}</tt>
 * configuration options or implicitly set by using the grid as a child item of a
 * {@link Ext.Container Container} which will have a {@link Ext.Container#layout layout manager}
 * provide the sizing of its child items (for example the Container of the Grid may specify
 * <tt>{@link Ext.Container#layout layout}:'fit'</tt>).</li>
 * <li>To access the data in a Grid, it is necessary to use the data model encapsulated
 * by the {@link #store Store}. See the {@link #cellclick} event for more details.</li>
 * </ul></div>
 * @constructor
 * @param {Object} config The config object
 * @xtype grid
 */
Ext.grid.GridPanel = Ext.extend(Ext.Panel, {
    /**
     * @cfg {String} autoExpandColumn
     * <p>The <tt>{@link Ext.grid.Column#id id}</tt> of a {@link Ext.grid.Column column} in
     * this grid that should expand to fill unused space. This value specified here can not
     * be <tt>0</tt>.</p>
     * <br><p><b>Note</b>: If the Grid's {@link Ext.grid.GridView view} is configured with
     * <tt>{@link Ext.grid.GridView#forceFit forceFit}=true</tt> the <tt>autoExpandColumn</tt>
     * is ignored. See {@link Ext.grid.Column}.<tt>{@link Ext.grid.Column#width width}</tt>
     * for additional details.</p>
     * <p>See <tt>{@link #autoExpandMax}</tt> and <tt>{@link #autoExpandMin}</tt> also.</p>
     */
    autoExpandColumn : false,
    /**
     * @cfg {Number} autoExpandMax The maximum width the <tt>{@link #autoExpandColumn}</tt>
     * can have (if enabled). Defaults to <tt>1000</tt>.
     */
    autoExpandMax : 1000,
    /**
     * @cfg {Number} autoExpandMin The minimum width the <tt>{@link #autoExpandColumn}</tt>
     * can have (if enabled). Defaults to <tt>50</tt>.
     */
    autoExpandMin : 50,
    /**
     * @cfg {Boolean} columnLines <tt>true</tt> to add css for column separation lines.
     * Default is <tt>false</tt>.
     */
    columnLines : false,
    /**
     * @cfg {Object} cm Shorthand for <tt>{@link #colModel}</tt>.
     */
    /**
     * @cfg {Object} colModel The {@link Ext.grid.ColumnModel} to use when rendering the grid (required).
     */
    /**
     * @cfg {Array} columns An array of {@link Ext.grid.Column columns} to auto create a
     * {@link Ext.grid.ColumnModel}.  The ColumnModel may be explicitly created via the
     * <tt>{@link #colModel}</tt> configuration property.
     */
    /**
     * @cfg {String} ddGroup The DD group this GridPanel belongs to. Defaults to <tt>'GridDD'</tt> if not specified.
     */
    /**
     * @cfg {String} ddText
     * Configures the text in the drag proxy.  Defaults to:
     * <pre><code>
     * ddText : '{0} selected row{1}'
     * </code></pre>
     * <tt>{0}</tt> is replaced with the number of selected rows.
     */
    ddText : '{0} selected row{1}',
    /**
     * @cfg {Boolean} deferRowRender <P>Defaults to <tt>true</tt> to enable deferred row rendering.</p>
     * <p>This allows the GridPanel to be initially rendered empty, with the expensive update of the row
     * structure deferred so that layouts with GridPanels appear more quickly.</p>
     */
    deferRowRender : true,
    /**
     * @cfg {Boolean} disableSelection <p><tt>true</tt> to disable selections in the grid. Defaults to <tt>false</tt>.</p>
     * <p>Ignored if a {@link #selModel SelectionModel} is specified.</p>
     */
    /**
     * @cfg {Boolean} enableColumnResize <tt>false</tt> to turn off column resizing for the whole grid. Defaults to <tt>true</tt>.
     */
    /**
     * @cfg {Boolean} enableColumnHide Defaults to <tt>true</tt> to enable hiding of columns with the header context menu.
     */
    enableColumnHide : true,
    /**
     * @cfg {Boolean} enableColumnMove Defaults to <tt>true</tt> to enable drag and drop reorder of columns. <tt>false</tt>
     * to turn off column reordering via drag drop.
     */
    enableColumnMove : true,
    /**
     * @cfg {Boolean} enableDragDrop <p>Enables dragging of the selected rows of the GridPanel. Defaults to <tt>false</tt>.</p>
     * <p>Setting this to <b><tt>true</tt></b> causes this GridPanel's {@link #getView GridView} to
     * create an instance of {@link Ext.grid.GridDragZone}. <b>Note</b>: this is available only <b>after</b>
     * the Grid has been rendered as the GridView's <tt>{@link Ext.grid.GridView#dragZone dragZone}</tt>
     * property.</p>
     * <p>A cooperating {@link Ext.dd.DropZone DropZone} must be created who's implementations of
     * {@link Ext.dd.DropZone#onNodeEnter onNodeEnter}, {@link Ext.dd.DropZone#onNodeOver onNodeOver},
     * {@link Ext.dd.DropZone#onNodeOut onNodeOut} and {@link Ext.dd.DropZone#onNodeDrop onNodeDrop} are able
     * to process the {@link Ext.grid.GridDragZone#getDragData data} which is provided.</p>
     */
    enableDragDrop : false,
    /**
     * @cfg {Boolean} enableHdMenu Defaults to <tt>true</tt> to enable the drop down button for menu in the headers.
     */
    enableHdMenu : true,
    /**
     * @cfg {Boolean} hideHeaders True to hide the grid's header. Defaults to <code>false</code>.
     */
    /**
     * @cfg {Object} loadMask An {@link Ext.LoadMask} config or true to mask the grid while
     * loading. Defaults to <code>false</code>.
     */
    loadMask : false,
    /**
     * @cfg {Number} maxHeight Sets the maximum height of the grid - ignored if <tt>autoHeight</tt> is not on.
     */
    /**
     * @cfg {Number} minColumnWidth The minimum width a column can be resized to. Defaults to <tt>25</tt>.
     */
    minColumnWidth : 25,
    /**
     * @cfg {Object} sm Shorthand for <tt>{@link #selModel}</tt>.
     */
    /**
     * @cfg {Object} selModel Any subclass of {@link Ext.grid.AbstractSelectionModel} that will provide
     * the selection model for the grid (defaults to {@link Ext.grid.RowSelectionModel} if not specified).
     */
    /**
     * @cfg {Ext.data.Store} store The {@link Ext.data.Store} the grid should use as its data source (required).
     */
    /**
     * @cfg {Boolean} stripeRows <tt>true</tt> to stripe the rows. Default is <tt>false</tt>.
     * <p>This causes the CSS class <tt><b>x-grid3-row-alt</b></tt> to be added to alternate rows of
     * the grid. A default CSS rule is provided which sets a background colour, but you can override this
     * with a rule which either overrides the <b>background-color</b> style using the '!important'
     * modifier, or which uses a CSS selector of higher specificity.</p>
     */
    stripeRows : false,
    /**
     * @cfg {Boolean} trackMouseOver True to highlight rows when the mouse is over. Default is <tt>true</tt>
     * for GridPanel, but <tt>false</tt> for EditorGridPanel.
     */
    trackMouseOver : true,
    /**
     * @cfg {Array} stateEvents
     * An array of events that, when fired, should trigger this component to save its state.
     * Defaults to:<pre><code>
     * stateEvents: ['columnmove', 'columnresize', 'sortchange']
     * </code></pre>
     * <p>These can be any types of events supported by this component, including browser or
     * custom events (e.g., <tt>['click', 'customerchange']</tt>).</p>
     * <p>See {@link Ext.Component#stateful} for an explanation of saving and restoring
     * Component state.</p>
     */
    stateEvents : ['columnmove', 'columnresize', 'sortchange'],
    /**
     * @cfg {Object} view The {@link Ext.grid.GridView} used by the grid. This can be set
     * before a call to {@link Ext.Component#render render()}.
     */
    view : null,
    /**
     * @cfg {Object} viewConfig A config object that will be applied to the grid's UI view.  Any of
     * the config options available for {@link Ext.grid.GridView} can be specified here. This option
     * is ignored if <tt>{@link #view}</tt> is specified.
     */

    // private
    rendered : false,
    // private
    viewReady : false,

    // private
    initComponent : function(){
        Ext.grid.GridPanel.superclass.initComponent.call(this);

        if(this.columnLines){
            this.cls = (this.cls || '') + ' x-grid-with-col-lines';
        }
        // override any provided value since it isn't valid
        // and is causing too many bug reports ;)
        this.autoScroll = false;
        this.autoWidth = false;

        if(Ext.isArray(this.columns)){
            this.colModel = new Ext.grid.ColumnModel(this.columns);
            delete this.columns;
        }

        // check and correct shorthanded configs
        if(this.ds){
            this.store = this.ds;
            delete this.ds;
        }
        if(this.cm){
            this.colModel = this.cm;
            delete this.cm;
        }
        if(this.sm){
            this.selModel = this.sm;
            delete this.sm;
        }
        this.store = Ext.StoreMgr.lookup(this.store);

        this.addEvents(
            // raw events
            /**
             * @event click
             * The raw click event for the entire grid.
             * @param {Ext.EventObject} e
             */
            'click',
            /**
             * @event dblclick
             * The raw dblclick event for the entire grid.
             * @param {Ext.EventObject} e
             */
            'dblclick',
            /**
             * @event contextmenu
             * The raw contextmenu event for the entire grid.
             * @param {Ext.EventObject} e
             */
            'contextmenu',
            /**
             * @event mousedown
             * The raw mousedown event for the entire grid.
             * @param {Ext.EventObject} e
             */
            'mousedown',
            /**
             * @event mouseup
             * The raw mouseup event for the entire grid.
             * @param {Ext.EventObject} e
             */
            'mouseup',
            /**
             * @event mouseover
             * The raw mouseover event for the entire grid.
             * @param {Ext.EventObject} e
             */
            'mouseover',
            /**
             * @event mouseout
             * The raw mouseout event for the entire grid.
             * @param {Ext.EventObject} e
             */
            'mouseout',
            /**
             * @event keypress
             * The raw keypress event for the entire grid.
             * @param {Ext.EventObject} e
             */
            'keypress',
            /**
             * @event keydown
             * The raw keydown event for the entire grid.
             * @param {Ext.EventObject} e
             */
            'keydown',

            // custom events
            /**
             * @event cellmousedown
             * Fires before a cell is clicked
             * @param {Grid} this
             * @param {Number} rowIndex
             * @param {Number} columnIndex
             * @param {Ext.EventObject} e
             */
            'cellmousedown',
            /**
             * @event rowmousedown
             * Fires before a row is clicked
             * @param {Grid} this
             * @param {Number} rowIndex
             * @param {Ext.EventObject} e
             */
            'rowmousedown',
            /**
             * @event headermousedown
             * Fires before a header is clicked
             * @param {Grid} this
             * @param {Number} columnIndex
             * @param {Ext.EventObject} e
             */
            'headermousedown',

            /**
             * @event cellclick
             * Fires when a cell is clicked.
             * The data for the cell is drawn from the {@link Ext.data.Record Record}
             * for this row. To access the data in the listener function use the
             * following technique:
             * <pre><code>
function(grid, rowIndex, columnIndex, e) {
    var record = grid.getStore().getAt(rowIndex);  // Get the Record
    var fieldName = grid.getColumnModel().getDataIndex(columnIndex); // Get field name
    var data = record.get(fieldName);
}
</code></pre>
             * @param {Grid} this
             * @param {Number} rowIndex
             * @param {Number} columnIndex
             * @param {Ext.EventObject} e
             */
            'cellclick',
            /**
             * @event celldblclick
             * Fires when a cell is double clicked
             * @param {Grid} this
             * @param {Number} rowIndex
             * @param {Number} columnIndex
             * @param {Ext.EventObject} e
             */
            'celldblclick',
            /**
             * @event rowclick
             * Fires when a row is clicked
             * @param {Grid} this
             * @param {Number} rowIndex
             * @param {Ext.EventObject} e
             */
            'rowclick',
            /**
             * @event rowdblclick
             * Fires when a row is double clicked
             * @param {Grid} this
             * @param {Number} rowIndex
             * @param {Ext.EventObject} e
             */
            'rowdblclick',
            /**
             * @event headerclick
             * Fires when a header is clicked
             * @param {Grid} this
             * @param {Number} columnIndex
             * @param {Ext.EventObject} e
             */
            'headerclick',
            /**
             * @event headerdblclick
             * Fires when a header cell is double clicked
             * @param {Grid} this
             * @param {Number} columnIndex
             * @param {Ext.EventObject} e
             */
            'headerdblclick',
            /**
             * @event rowcontextmenu
             * Fires when a row is right clicked
             * @param {Grid} this
             * @param {Number} rowIndex
             * @param {Ext.EventObject} e
             */
            'rowcontextmenu',
            /**
             * @event cellcontextmenu
             * Fires when a cell is right clicked
             * @param {Grid} this
             * @param {Number} rowIndex
             * @param {Number} cellIndex
             * @param {Ext.EventObject} e
             */
            'cellcontextmenu',
            /**
             * @event headercontextmenu
             * Fires when a header is right clicked
             * @param {Grid} this
             * @param {Number} columnIndex
             * @param {Ext.EventObject} e
             */
            'headercontextmenu',
            /**
             * @event bodyscroll
             * Fires when the body element is scrolled
             * @param {Number} scrollLeft
             * @param {Number} scrollTop
             */
            'bodyscroll',
            /**
             * @event columnresize
             * Fires when the user resizes a column
             * @param {Number} columnIndex
             * @param {Number} newSize
             */
            'columnresize',
            /**
             * @event columnmove
             * Fires when the user moves a column
             * @param {Number} oldIndex
             * @param {Number} newIndex
             */
            'columnmove',
            /**
             * @event sortchange
             * Fires when the grid's store sort changes
             * @param {Grid} this
             * @param {Object} sortInfo An object with the keys field and direction
             */
            'sortchange',
            /**
             * @event reconfigure
             * Fires when the grid is reconfigured with a new store and/or column model.
             * @param {Grid} this
             * @param {Ext.data.Store} store The new store
             * @param {Ext.grid.ColumnModel} colModel The new column model
             */
            'reconfigure'
        );
    },

    // private
    onRender : function(ct, position){
        Ext.grid.GridPanel.superclass.onRender.apply(this, arguments);

        var c = this.body;

        this.el.addClass('x-grid-panel');

        var view = this.getView();
        view.init(this);

        this.mon(c, {
            mousedown: this.onMouseDown,
            click: this.onClick,
            dblclick: this.onDblClick,
            contextmenu: this.onContextMenu,
            keydown: this.onKeyDown,
            scope: this
        });

        this.relayEvents(c, ['mousedown','mouseup','mouseover','mouseout','keypress']);

        this.getSelectionModel().init(this);
        this.view.render();
    },

    // private
    initEvents : function(){
        Ext.grid.GridPanel.superclass.initEvents.call(this);

        if(this.loadMask){
            this.loadMask = new Ext.LoadMask(this.bwrap,
                    Ext.apply({store:this.store}, this.loadMask));
        }
    },

    initStateEvents : function(){
        Ext.grid.GridPanel.superclass.initStateEvents.call(this);
        this.mon(this.colModel, 'hiddenchange', this.saveState, this, {delay: 100});
    },

    applyState : function(state){
        var cm = this.colModel;
        var cs = state.columns;
        if(cs){
            for(var i = 0, len = cs.length; i < len; i++){
                var s = cs[i];
                var c = cm.getColumnById(s.id);
                if(c){
                    c.hidden = s.hidden;
                    c.width = s.width;
                    var oldIndex = cm.getIndexById(s.id);
                    if(oldIndex != i){
                        cm.moveColumn(oldIndex, i);
                    }
                }
            }
        }
        if(state.sort && this.store){
            this.store[this.store.remoteSort ? 'setDefaultSort' : 'sort'](state.sort.field, state.sort.direction);
        }
        delete state.columns;
        delete state.sort;
        Ext.grid.GridPanel.superclass.applyState.call(this, state);
    },

    getState : function(){
        var o = {columns: []};
        for(var i = 0, c; (c = this.colModel.config[i]); i++){
            o.columns[i] = {
                id: c.id,
                width: c.width
            };
            if(c.hidden){
                o.columns[i].hidden = true;
            }
        }
        if(this.store){
            var ss = this.store.getSortState();
            if(ss){
                o.sort = ss;
            }
        }
        return o;
    },

    // private
    afterRender : function(){
        Ext.grid.GridPanel.superclass.afterRender.call(this);
        this.view.layout();
        if(this.deferRowRender){
            this.view.afterRender.defer(10, this.view);
        }else{
            this.view.afterRender();
        }
        this.viewReady = true;
    },

    /**
     * <p>Reconfigures the grid to use a different Store and Column Model
     * and fires the 'reconfigure' event. The View will be bound to the new
     * objects and refreshed.</p>
     * <p>Be aware that upon reconfiguring a GridPanel, certain existing settings <i>may</i> become
     * invalidated. For example the configured {@link #autoExpandColumn} may no longer exist in the
     * new ColumnModel. Also, an existing {@link Ext.PagingToolbar PagingToolbar} will still be bound
     * to the old Store, and will need rebinding. Any {@link #plugins} might also need reconfiguring
     * with the new data.</p>
     * @param {Ext.data.Store} store The new {@link Ext.data.Store} object
     * @param {Ext.grid.ColumnModel} colModel The new {@link Ext.grid.ColumnModel} object
     */
    reconfigure : function(store, colModel){
        if(this.loadMask){
            this.loadMask.destroy();
            this.loadMask = new Ext.LoadMask(this.bwrap,
                    Ext.apply({}, {store:store}, this.initialConfig.loadMask));
        }
        this.view.initData(store, colModel);
        this.store = store;
        this.colModel = colModel;
        if(this.rendered){
            this.view.refresh(true);
        }
        this.fireEvent('reconfigure', this, store, colModel);
    },

    // private
    onKeyDown : function(e){
        this.fireEvent('keydown', e);
    },

    // private
    onDestroy : function(){
        if(this.rendered){
            var c = this.body;
            c.removeAllListeners();
            c.update('');
            Ext.destroy(this.view, this.loadMask);
        }else if(this.store && this.store.autoDestroy){
            this.store.destroy();
        }
        Ext.destroy(this.colModel, this.selModel);
        this.store = this.selModel = this.colModel = this.view = this.loadMask = null;
        Ext.grid.GridPanel.superclass.onDestroy.call(this);
    },

    // private
    processEvent : function(name, e){
        this.fireEvent(name, e);
        var t = e.getTarget();
        var v = this.view;
        var header = v.findHeaderIndex(t);
        if(header !== false){
            this.fireEvent('header' + name, this, header, e);
        }else{
            var row = v.findRowIndex(t);
            var cell = v.findCellIndex(t);
            if(row !== false){
                this.fireEvent('row' + name, this, row, e);
                if(cell !== false){
                    this.fireEvent('cell' + name, this, row, cell, e);
                }
            }
        }
    },

    // private
    onClick : function(e){
        this.processEvent('click', e);
    },

    // private
    onMouseDown : function(e){
        this.processEvent('mousedown', e);
    },

    // private
    onContextMenu : function(e, t){
        this.processEvent('contextmenu', e);
    },

    // private
    onDblClick : function(e){
        this.processEvent('dblclick', e);
    },

    // private
    walkCells : function(row, col, step, fn, scope){
        var cm = this.colModel, clen = cm.getColumnCount();
        var ds = this.store, rlen = ds.getCount(), first = true;
        if(step < 0){
            if(col < 0){
                row--;
                first = false;
            }
            while(row >= 0){
                if(!first){
                    col = clen-1;
                }
                first = false;
                while(col >= 0){
                    if(fn.call(scope || this, row, col, cm) === true){
                        return [row, col];
                    }
                    col--;
                }
                row--;
            }
        } else {
            if(col >= clen){
                row++;
                first = false;
            }
            while(row < rlen){
                if(!first){
                    col = 0;
                }
                first = false;
                while(col < clen){
                    if(fn.call(scope || this, row, col, cm) === true){
                        return [row, col];
                    }
                    col++;
                }
                row++;
            }
        }
        return null;
    },

    // private
    onResize : function(){
        Ext.grid.GridPanel.superclass.onResize.apply(this, arguments);
        if(this.viewReady){
            this.view.layout();
        }
    },

    /**
     * Returns the grid's underlying element.
     * @return {Element} The element
     */
    getGridEl : function(){
        return this.body;
    },

    // private for compatibility, overridden by editor grid
    stopEditing : Ext.emptyFn,

    /**
     * Returns the grid's selection model configured by the <code>{@link #selModel}</code>
     * configuration option. If no selection model was configured, this will create
     * and return a {@link Ext.grid.RowSelectionModel RowSelectionModel}.
     * @return {SelectionModel}
     */
    getSelectionModel : function(){
        if(!this.selModel){
            this.selModel = new Ext.grid.RowSelectionModel(
                    this.disableSelection ? {selectRow: Ext.emptyFn} : null);
        }
        return this.selModel;
    },

    /**
     * Returns the grid's data store.
     * @return {Ext.data.Store} The store
     */
    getStore : function(){
        return this.store;
    },

    /**
     * Returns the grid's ColumnModel.
     * @return {Ext.grid.ColumnModel} The column model
     */
    getColumnModel : function(){
        return this.colModel;
    },

    /**
     * Returns the grid's GridView object.
     * @return {Ext.grid.GridView} The grid view
     */
    getView : function(){
        if(!this.view){
            this.view = new Ext.grid.GridView(this.viewConfig);
        }
        return this.view;
    },
    /**
     * Called to get grid's drag proxy text, by default returns this.ddText.
     * @return {String} The text
     */
    getDragDropText : function(){
        var count = this.selModel.getCount();
        return String.format(this.ddText, count, count == 1 ? '' : 's');
    }

    /** 
     * @cfg {String/Number} activeItem 
     * @hide 
     */
    /** 
     * @cfg {Boolean} autoDestroy 
     * @hide 
     */
    /** 
     * @cfg {Object/String/Function} autoLoad 
     * @hide 
     */
    /** 
     * @cfg {Boolean} autoWidth 
     * @hide 
     */
    /** 
     * @cfg {Boolean/Number} bufferResize 
     * @hide 
     */
    /** 
     * @cfg {String} defaultType 
     * @hide 
     */
    /** 
     * @cfg {Object} defaults 
     * @hide 
     */
    /** 
     * @cfg {Boolean} hideBorders 
     * @hide 
     */
    /** 
     * @cfg {Mixed} items 
     * @hide 
     */
    /** 
     * @cfg {String} layout 
     * @hide 
     */
    /** 
     * @cfg {Object} layoutConfig 
     * @hide 
     */
    /** 
     * @cfg {Boolean} monitorResize 
     * @hide 
     */
    /** 
     * @property items 
     * @hide 
     */
    /** 
     * @method add 
     * @hide 
     */
    /** 
     * @method cascade 
     * @hide 
     */
    /** 
     * @method doLayout 
     * @hide 
     */
    /** 
     * @method find 
     * @hide 
     */
    /** 
     * @method findBy 
     * @hide 
     */
    /** 
     * @method findById 
     * @hide 
     */
    /** 
     * @method findByType 
     * @hide 
     */
    /** 
     * @method getComponent 
     * @hide 
     */
    /** 
     * @method getLayout 
     * @hide 
     */
    /** 
     * @method getUpdater 
     * @hide 
     */
    /** 
     * @method insert 
     * @hide 
     */
    /** 
     * @method load 
     * @hide 
     */
    /** 
     * @method remove 
     * @hide 
     */
    /** 
     * @event add 
     * @hide 
     */
    /** 
     * @event afterLayout 
     * @hide 
     */
    /** 
     * @event beforeadd 
     * @hide 
     */
    /** 
     * @event beforeremove 
     * @hide 
     */
    /** 
     * @event remove 
     * @hide 
     */



    /**
     * @cfg {String} allowDomMove  @hide
     */
    /**
     * @cfg {String} autoEl @hide
     */
    /**
     * @cfg {String} applyTo  @hide
     */
    /**
     * @cfg {String} autoScroll  @hide
     */
    /**
     * @cfg {String} bodyBorder  @hide
     */
    /**
     * @cfg {String} bodyStyle  @hide
     */
    /**
     * @cfg {String} contentEl  @hide
     */
    /**
     * @cfg {String} disabledClass  @hide
     */
    /**
     * @cfg {String} elements  @hide
     */
    /**
     * @cfg {String} html  @hide
     */
    /**
     * @cfg {Boolean} preventBodyReset
     * @hide
     */
    /**
     * @property disabled
     * @hide
     */
    /**
     * @method applyToMarkup
     * @hide
     */
    /**
     * @method enable
     * @hide
     */
    /**
     * @method disable
     * @hide
     */
    /**
     * @method setDisabled
     * @hide
     */
});
Ext.reg('grid', Ext.grid.GridPanel);/**
 * @class Ext.grid.GridView
 * @extends Ext.util.Observable
 * <p>This class encapsulates the user interface of an {@link Ext.grid.GridPanel}.
 * Methods of this class may be used to access user interface elements to enable
 * special display effects. Do not change the DOM structure of the user interface.</p>
 * <p>This class does not provide ways to manipulate the underlying data. The data
 * model of a Grid is held in an {@link Ext.data.Store}.</p>
 * @constructor
 * @param {Object} config
 */
Ext.grid.GridView = function(config){
    Ext.apply(this, config);
    // These events are only used internally by the grid components
    this.addEvents(
        /**
         * @event beforerowremoved
         * Internal UI Event. Fired before a row is removed.
         * @param {Ext.grid.GridView} view
         * @param {Number} rowIndex The index of the row to be removed.
         * @param {Ext.data.Record} record The Record to be removed
         */
        "beforerowremoved",
        /**
         * @event beforerowsinserted
         * Internal UI Event. Fired before rows are inserted.
         * @param {Ext.grid.GridView} view
         * @param {Number} firstRow The index of the first row to be inserted.
         * @param {Number} lastRow The index of the last row to be inserted.
         */
        "beforerowsinserted",
        /**
         * @event beforerefresh
         * Internal UI Event. Fired before the view is refreshed.
         * @param {Ext.grid.GridView} view
         */
        "beforerefresh",
        /**
         * @event rowremoved
         * Internal UI Event. Fired after a row is removed.
         * @param {Ext.grid.GridView} view
         * @param {Number} rowIndex The index of the row that was removed.
         * @param {Ext.data.Record} record The Record that was removed
         */
        "rowremoved",
        /**
         * @event rowsinserted
         * Internal UI Event. Fired after rows are inserted.
         * @param {Ext.grid.GridView} view
         * @param {Number} firstRow The index of the first inserted.
         * @param {Number} lastRow The index of the last row inserted.
         */
        "rowsinserted",
        /**
         * @event rowupdated
         * Internal UI Event. Fired after a row has been updated.
         * @param {Ext.grid.GridView} view
         * @param {Number} firstRow The index of the row updated.
         * @param {Ext.data.record} record The Record backing the row updated.
         */
        "rowupdated",
        /**
         * @event refresh
         * Internal UI Event. Fired after the GridView's body has been refreshed.
         * @param {Ext.grid.GridView} view
         */
        "refresh"
    );
    Ext.grid.GridView.superclass.constructor.call(this);
};

Ext.extend(Ext.grid.GridView, Ext.util.Observable, {
    /**
     * Override this function to apply custom CSS classes to rows during rendering.  You can also supply custom
     * parameters to the row template for the current row to customize how it is rendered using the <b>rowParams</b>
     * parameter.  This function should return the CSS class name (or empty string '' for none) that will be added
     * to the row's wrapping div.  To apply multiple class names, simply return them space-delimited within the string
     * (e.g., 'my-class another-class'). Example usage:
    <pre><code>
viewConfig: {
    forceFit: true,
    showPreview: true, // custom property
    enableRowBody: true, // required to create a second, full-width row to show expanded Record data
    getRowClass: function(record, rowIndex, rp, ds){ // rp = rowParams
        if(this.showPreview){
            rp.body = '&lt;p>'+record.data.excerpt+'&lt;/p>';
            return 'x-grid3-row-expanded';
        }
        return 'x-grid3-row-collapsed';
    }
},     
    </code></pre>
     * @param {Record} record The {@link Ext.data.Record} corresponding to the current row.
     * @param {Number} index The row index.
     * @param {Object} rowParams A config object that is passed to the row template during rendering that allows
     * customization of various aspects of a grid row.
     * <p>If {@link #enableRowBody} is configured <b><tt></tt>true</b>, then the following properties may be set
     * by this function, and will be used to render a full-width expansion row below each grid row:</p>
     * <ul>
     * <li><code>body</code> : String <div class="sub-desc">An HTML fragment to be used as the expansion row's body content (defaults to '').</div></li>
     * <li><code>bodyStyle</code> : String <div class="sub-desc">A CSS style specification that will be applied to the expansion row's &lt;tr> element. (defaults to '').</div></li>
     * </ul>
     * The following property will be passed in, and may be appended to:
     * <ul>
     * <li><code>tstyle</code> : String <div class="sub-desc">A CSS style specification that willl be applied to the &lt;table> element which encapsulates
     * both the standard grid row, and any expansion row.</div></li>
     * </ul>
     * @param {Store} store The {@link Ext.data.Store} this grid is bound to
     * @method getRowClass
     * @return {String} a CSS class name to add to the row.
     */
    /**
     * @cfg {Boolean} enableRowBody True to add a second TR element per row that can be used to provide a row body
     * that spans beneath the data row.  Use the {@link #getRowClass} method's rowParams config to customize the row body.
     */
    /**
     * @cfg {String} emptyText Default text (html tags are accepted) to display in the grid body when no rows
     * are available (defaults to ''). This value will be used to update the <tt>{@link #mainBody}</tt>:
    <pre><code>
    this.mainBody.update('&lt;div class="x-grid-empty">' + this.emptyText + '&lt;/div>');
    </code></pre>
     */
    /**
     * @cfg {Boolean} headersDisabled True to disable the grid column headers (defaults to <tt>false</tt>). 
     * Use the {@link Ext.grid.ColumnModel ColumnModel} <tt>{@link Ext.grid.ColumnModel#menuDisabled menuDisabled}</tt>
     * config to disable the <i>menu</i> for individual columns.  While this config is true the
     * following will be disabled:<div class="mdetail-params"><ul>
     * <li>clicking on header to sort</li>
     * <li>the trigger to reveal the menu.</li>
     * </ul></div>
     */
    /**
     * <p>A customized implementation of a {@link Ext.dd.DragZone DragZone} which provides default implementations
     * of the template methods of DragZone to enable dragging of the selected rows of a GridPanel.
     * See {@link Ext.grid.GridDragZone} for details.</p>
     * <p>This will <b>only</b> be present:<div class="mdetail-params"><ul>
     * <li><i>if</i> the owning GridPanel was configured with {@link Ext.grid.GridPanel#enableDragDrop enableDragDrop}: <tt>true</tt>.</li>
     * <li><i>after</i> the owning GridPanel has been rendered.</li>
     * </ul></div>
     * @property dragZone
     * @type {Ext.grid.GridDragZone}
     */
    /**
     * @cfg {Boolean} deferEmptyText True to defer <tt>{@link #emptyText}</tt> being applied until the store's
     * first load (defaults to <tt>true</tt>).
     */
    deferEmptyText : true,
    /**
     * @cfg {Number} scrollOffset The amount of space to reserve for the vertical scrollbar
     * (defaults to <tt>19</tt> pixels).
     */
    scrollOffset : 19,
    /**
     * @cfg {Boolean} autoFill
     * Defaults to <tt>false</tt>.  Specify <tt>true</tt> to have the column widths re-proportioned
     * when the grid is <b>initially rendered</b>.  The 
     * {@link Ext.grid.Column#width initially configured width}</tt> of each column will be adjusted
     * to fit the grid width and prevent horizontal scrolling. If columns are later resized (manually
     * or programmatically), the other columns in the grid will <b>not</b> be resized to fit the grid width.
     * See <tt>{@link #forceFit}</tt> also.
     */
    autoFill : false,
    /**
     * @cfg {Boolean} forceFit
     * Defaults to <tt>false</tt>.  Specify <tt>true</tt> to have the column widths re-proportioned
     * at <b>all times</b>.  The {@link Ext.grid.Column#width initially configured width}</tt> of each
     * column will be adjusted to fit the grid width and prevent horizontal scrolling. If columns are
     * later resized (manually or programmatically), the other columns in the grid <b>will</b> be resized
     * to fit the grid width. See <tt>{@link #autoFill}</tt> also.
     */
    forceFit : false,
    /**
     * @cfg {Array} sortClasses The CSS classes applied to a header when it is sorted. (defaults to <tt>["sort-asc", "sort-desc"]</tt>)
     */
    sortClasses : ["sort-asc", "sort-desc"],
    /**
     * @cfg {String} sortAscText The text displayed in the "Sort Ascending" menu item (defaults to <tt>"Sort Ascending"</tt>)
     */
    sortAscText : "Sort Ascending",
    /**
     * @cfg {String} sortDescText The text displayed in the "Sort Descending" menu item (defaults to <tt>"Sort Descending"</tt>)
     */
    sortDescText : "Sort Descending",
    /**
     * @cfg {String} columnsText The text displayed in the "Columns" menu item (defaults to <tt>"Columns"</tt>)
     */
    columnsText : "Columns",

    /**
     * @cfg {String} selectedRowClass The CSS class applied to a selected row (defaults to <tt>"x-grid3-row-selected"</tt>). An
     * example overriding the default styling:
    <pre><code>
    .x-grid3-row-selected {background-color: yellow;}
    </code></pre>
     * Note that this only controls the row, and will not do anything for the text inside it.  To style inner
     * facets (like text) use something like:
    <pre><code>
    .x-grid3-row-selected .x-grid3-cell-inner {
        color: #FFCC00;
    }
    </code></pre>
     * @type String
     */
    selectedRowClass : "x-grid3-row-selected",

    // private
    borderWidth : 2,
    tdClass : 'x-grid3-cell',
    hdCls : 'x-grid3-hd',
    markDirty : true,

    /**
     * @cfg {Number} cellSelectorDepth The number of levels to search for cells in event delegation (defaults to <tt>4</tt>)
     */
    cellSelectorDepth : 4,
    /**
     * @cfg {Number} rowSelectorDepth The number of levels to search for rows in event delegation (defaults to <tt>10</tt>)
     */
    rowSelectorDepth : 10,

    /**
     * @cfg {String} cellSelector The selector used to find cells internally (defaults to <tt>'td.x-grid3-cell'</tt>)
     */
    cellSelector : 'td.x-grid3-cell',
    /**
     * @cfg {String} rowSelector The selector used to find rows internally (defaults to <tt>'div.x-grid3-row'</tt>)
     */
    rowSelector : 'div.x-grid3-row',
    
    // private
    firstRowCls: 'x-grid3-row-first',
    lastRowCls: 'x-grid3-row-last',
    rowClsRe: /(?:^|\s+)x-grid3-row-(first|last|alt)(?:\s+|$)/g,

    /* -------------------------------- UI Specific ----------------------------- */

    // private
    initTemplates : function(){
        var ts = this.templates || {};
        if(!ts.master){
            ts.master = new Ext.Template(
                    '<div class="x-grid3" hidefocus="true">',
                        '<div class="x-grid3-viewport">',
                            '<div class="x-grid3-header"><div class="x-grid3-header-inner"><div class="x-grid3-header-offset" style="{ostyle}">{header}</div></div><div class="x-clear"></div></div>',
                            '<div class="x-grid3-scroller"><div class="x-grid3-body" style="{bstyle}">{body}</div><a href="#" class="x-grid3-focus" tabIndex="-1"></a></div>',
                        '</div>',
                        '<div class="x-grid3-resize-marker">&#160;</div>',
                        '<div class="x-grid3-resize-proxy">&#160;</div>',
                    '</div>'
                    );
        }

        if(!ts.header){
            ts.header = new Ext.Template(
                    '<table border="0" cellspacing="0" cellpadding="0" style="{tstyle}">',
                    '<thead><tr class="x-grid3-hd-row">{cells}</tr></thead>',
                    '</table>'
                    );
        }

        if(!ts.hcell){
            ts.hcell = new Ext.Template(
                    '<td class="x-grid3-hd x-grid3-cell x-grid3-td-{id} {css}" style="{style}"><div {tooltip} {attr} class="x-grid3-hd-inner x-grid3-hd-{id}" unselectable="on" style="{istyle}">', this.grid.enableHdMenu ? '<a class="x-grid3-hd-btn" href="#"></a>' : '',
                    '{value}<img class="x-grid3-sort-icon" src="', Ext.BLANK_IMAGE_URL, '" />',
                    '</div></td>'
                    );
        }

        if(!ts.body){
            ts.body = new Ext.Template('{rows}');
        }

        if(!ts.row){
            ts.row = new Ext.Template(
                    '<div class="x-grid3-row {alt}" style="{tstyle}"><table class="x-grid3-row-table" border="0" cellspacing="0" cellpadding="0" style="{tstyle}">',
                    '<tbody><tr>{cells}</tr>',
                    (this.enableRowBody ? '<tr class="x-grid3-row-body-tr" style="{bodyStyle}"><td colspan="{cols}" class="x-grid3-body-cell" tabIndex="0" hidefocus="on"><div class="x-grid3-row-body">{body}</div></td></tr>' : ''),
                    '</tbody></table></div>'
                    );
        }

        if(!ts.cell){
            ts.cell = new Ext.Template(
                    '<td class="x-grid3-col x-grid3-cell x-grid3-td-{id} {css}" style="{style}" tabIndex="0" {cellAttr}>',
                    '<div class="x-grid3-cell-inner x-grid3-col-{id}" unselectable="on" {attr}>{value}</div>',
                    '</td>'
                    );
        }

        for(var k in ts){
            var t = ts[k];
            if(t && typeof t.compile == 'function' && !t.compiled){
                t.disableFormats = true;
                t.compile();
            }
        }

        this.templates = ts;
        this.colRe = new RegExp("x-grid3-td-([^\\s]+)", "");
    },

    // private
    fly : function(el){
        if(!this._flyweight){
            this._flyweight = new Ext.Element.Flyweight(document.body);
        }
        this._flyweight.dom = el;
        return this._flyweight;
    },

    // private
    getEditorParent : function(){
        return this.scroller.dom;
    },

    // private
    initElements : function(){
        var E = Ext.Element;

        var el = this.grid.getGridEl().dom.firstChild;
        var cs = el.childNodes;

        this.el = new E(el);

        this.mainWrap = new E(cs[0]);
        this.mainHd = new E(this.mainWrap.dom.firstChild);

        if(this.grid.hideHeaders){
            this.mainHd.setDisplayed(false);
        }

        this.innerHd = this.mainHd.dom.firstChild;
        this.scroller = new E(this.mainWrap.dom.childNodes[1]);
        if(this.forceFit){
            this.scroller.setStyle('overflow-x', 'hidden');
        }
        /**
         * <i>Read-only</i>. The GridView's body Element which encapsulates all rows in the Grid.
         * This {@link Ext.Element Element} is only available after the GridPanel has been rendered.
         * @type Ext.Element
         * @property mainBody
         */
        this.mainBody = new E(this.scroller.dom.firstChild);

        this.focusEl = new E(this.scroller.dom.childNodes[1]);
        this.focusEl.swallowEvent("click", true);

        this.resizeMarker = new E(cs[1]);
        this.resizeProxy = new E(cs[2]);
    },

    // private
    getRows : function(){
        return this.hasRows() ? this.mainBody.dom.childNodes : [];
    },

    // finder methods, used with delegation

    // private
    findCell : function(el){
        if(!el){
            return false;
        }
        return this.fly(el).findParent(this.cellSelector, this.cellSelectorDepth);
    },

/**
 * <p>Return the index of the grid column which contains the passed element.</p>
 * See also {@link #findRowIndex}
 * @param {Element} el The target element
 * @return The column index, or <b>false</b> if the target element is not within a row of this GridView.
 */
    findCellIndex : function(el, requiredCls){
        var cell = this.findCell(el);
        if(cell && (!requiredCls || this.fly(cell).hasClass(requiredCls))){
            return this.getCellIndex(cell);
        }
        return false;
    },

    // private
    getCellIndex : function(el){
        if(el){
            var m = el.className.match(this.colRe);
            if(m && m[1]){
                return this.cm.getIndexById(m[1]);
            }
        }
        return false;
    },

    // private
    findHeaderCell : function(el){
        var cell = this.findCell(el);
        return cell && this.fly(cell).hasClass(this.hdCls) ? cell : null;
    },

    // private
    findHeaderIndex : function(el){
        return this.findCellIndex(el, this.hdCls);
    },

/**
 * Return the HtmlElement representing the grid row which contains the passed element.
 * @param {Element} el The target element
 * @return The row element, or null if the target element is not within a row of this GridView.
 */
    findRow : function(el){
        if(!el){
            return false;
        }
        return this.fly(el).findParent(this.rowSelector, this.rowSelectorDepth);
    },

/**
 * <p>Return the index of the grid row which contains the passed element.</p>
 * See also {@link #findCellIndex}
 * @param {Element} el The target element
 * @return The row index, or <b>false</b> if the target element is not within a row of this GridView.
 */
    findRowIndex : function(el){
        var r = this.findRow(el);
        return r ? r.rowIndex : false;
    },

    // getter methods for fetching elements dynamically in the grid

/**
 * Return the <tt>&lt;div></tt> HtmlElement which represents a Grid row for the specified index.
 * @param {Number} index The row index
 * @return {HtmlElement} The div element.
 */
    getRow : function(row){
        return this.getRows()[row];
    },

/**
 * Returns the grid's <tt>&lt;td></tt> HtmlElement at the specified coordinates.
 * @param {Number} row The row index in which to find the cell.
 * @param {Number} col The column index of the cell.
 * @return {HtmlElement} The td at the specified coordinates.
 */
    getCell : function(row, col){
        return this.getRow(row).getElementsByTagName('td')[col];
    },

/**
 * Return the <tt>&lt;td></tt> HtmlElement which represents the Grid's header cell for the specified column index.
 * @param {Number} index The column index
 * @return {HtmlElement} The td element.
 */
    getHeaderCell : function(index){
      return this.mainHd.dom.getElementsByTagName('td')[index];
    },

    // manipulating elements

    // private - use getRowClass to apply custom row classes
    addRowClass : function(row, cls){
        var r = this.getRow(row);
        if(r){
            this.fly(r).addClass(cls);
        }
    },

    // private
    removeRowClass : function(row, cls){
        var r = this.getRow(row);
        if(r){
            this.fly(r).removeClass(cls);
        }
    },

    // private
    removeRow : function(row){
        Ext.removeNode(this.getRow(row));
        this.syncFocusEl(row);
    },
    
    // private
    removeRows : function(firstRow, lastRow){
        var bd = this.mainBody.dom;
        for(var rowIndex = firstRow; rowIndex <= lastRow; rowIndex++){
            Ext.removeNode(bd.childNodes[firstRow]);
        }
        this.syncFocusEl(firstRow);
    },

    // scrolling stuff

    // private
    getScrollState : function(){
        var sb = this.scroller.dom;
        return {left: sb.scrollLeft, top: sb.scrollTop};
    },

    // private
    restoreScroll : function(state){
        var sb = this.scroller.dom;
        sb.scrollLeft = state.left;
        sb.scrollTop = state.top;
    },

    /**
     * Scrolls the grid to the top
     */
    scrollToTop : function(){
        this.scroller.dom.scrollTop = 0;
        this.scroller.dom.scrollLeft = 0;
    },

    // private
    syncScroll : function(){
      this.syncHeaderScroll();
      var mb = this.scroller.dom;
        this.grid.fireEvent("bodyscroll", mb.scrollLeft, mb.scrollTop);
    },

    // private
    syncHeaderScroll : function(){
        var mb = this.scroller.dom;
        this.innerHd.scrollLeft = mb.scrollLeft;
        this.innerHd.scrollLeft = mb.scrollLeft; // second time for IE (1/2 time first fails, other browsers ignore)
    },

    // private
    updateSortIcon : function(col, dir){
        var sc = this.sortClasses;
        var hds = this.mainHd.select('td').removeClass(sc);
        hds.item(col).addClass(sc[dir == "DESC" ? 1 : 0]);
    },

    // private
    updateAllColumnWidths : function(){
        var tw = this.getTotalWidth(),
            clen = this.cm.getColumnCount(),
            ws = [],
            len,
            i;
        for(i = 0; i < clen; i++){
            ws[i] = this.getColumnWidth(i);
        }
        this.innerHd.firstChild.style.width = this.getOffsetWidth();
        this.innerHd.firstChild.firstChild.style.width = tw;
        this.mainBody.dom.style.width = tw;
        for(i = 0; i < clen; i++){
            var hd = this.getHeaderCell(i);
            hd.style.width = ws[i];
        }

        var ns = this.getRows(), row, trow;
        for(i = 0, len = ns.length; i < len; i++){
            row = ns[i];
            row.style.width = tw;
            if(row.firstChild){
                row.firstChild.style.width = tw;
                trow = row.firstChild.rows[0];
                for (var j = 0; j < clen; j++) {
                   trow.childNodes[j].style.width = ws[j];
                }
            }
        }

        this.onAllColumnWidthsUpdated(ws, tw);
    },

    // private
    updateColumnWidth : function(col, width){
        var w = this.getColumnWidth(col);
        var tw = this.getTotalWidth();
        this.innerHd.firstChild.style.width = this.getOffsetWidth();
        this.innerHd.firstChild.firstChild.style.width = tw;
        this.mainBody.dom.style.width = tw;
        var hd = this.getHeaderCell(col);
        hd.style.width = w;

        var ns = this.getRows(), row;
        for(var i = 0, len = ns.length; i < len; i++){
            row = ns[i];
            row.style.width = tw;
            if(row.firstChild){
                row.firstChild.style.width = tw;
                row.firstChild.rows[0].childNodes[col].style.width = w;
            }
        }

        this.onColumnWidthUpdated(col, w, tw);
    },

    // private
    updateColumnHidden : function(col, hidden){
        var tw = this.getTotalWidth();
        this.innerHd.firstChild.style.width = this.getOffsetWidth();
        this.innerHd.firstChild.firstChild.style.width = tw;
        this.mainBody.dom.style.width = tw;
        var display = hidden ? 'none' : '';

        var hd = this.getHeaderCell(col);
        hd.style.display = display;

        var ns = this.getRows(), row;
        for(var i = 0, len = ns.length; i < len; i++){
            row = ns[i];
            row.style.width = tw;
            if(row.firstChild){
                row.firstChild.style.width = tw;
                row.firstChild.rows[0].childNodes[col].style.display = display;
            }
        }

        this.onColumnHiddenUpdated(col, hidden, tw);
        delete this.lastViewWidth; // force recalc
        this.layout();
    },

    // private
    doRender : function(cs, rs, ds, startRow, colCount, stripe){
        var ts = this.templates, ct = ts.cell, rt = ts.row, last = colCount-1;
        var tstyle = 'width:'+this.getTotalWidth()+';';
        // buffers
        var buf = [], cb, c, p = {}, rp = {tstyle: tstyle}, r;
        for(var j = 0, len = rs.length; j < len; j++){
            r = rs[j]; cb = [];
            var rowIndex = (j+startRow);
            for(var i = 0; i < colCount; i++){
                c = cs[i];
                p.id = c.id;
                p.css = i === 0 ? 'x-grid3-cell-first ' : (i == last ? 'x-grid3-cell-last ' : '');
                p.attr = p.cellAttr = "";
                p.value = c.renderer(r.data[c.name], p, r, rowIndex, i, ds);
                p.style = c.style;
                if(Ext.isEmpty(p.value)){
                    p.value = "&#160;";
                }
                if(this.markDirty && r.dirty && typeof r.modified[c.name] !== 'undefined'){
                    p.css += ' x-grid3-dirty-cell';
                }
                cb[cb.length] = ct.apply(p);
            }
            var alt = [];
            if(stripe && ((rowIndex+1) % 2 === 0)){
                alt[0] = "x-grid3-row-alt";
            }
            if(r.dirty){
                alt[1] = " x-grid3-dirty-row";
            }
            rp.cols = colCount;
            if(this.getRowClass){
                alt[2] = this.getRowClass(r, rowIndex, rp, ds);
            }
            rp.alt = alt.join(" ");
            rp.cells = cb.join("");
            buf[buf.length] =  rt.apply(rp);
        }
        return buf.join("");
    },

    // private
    processRows : function(startRow, skipStripe){
        if(!this.ds || this.ds.getCount() < 1){
            return;
        }
        var rows = this.getRows();
        skipStripe = skipStripe || !this.grid.stripeRows;
        startRow = startRow || 0;
        Ext.each(rows, function(row, idx){
            row.rowIndex = idx;
            row.className = row.className.replace(this.rowClsRe, ' ');
            if (!skipStripe && (idx + 1) % 2 === 0) {
                row.className += ' x-grid3-row-alt';
            }
        });
        // add first/last-row classes
        if(startRow === 0){
            Ext.fly(rows[0]).addClass(this.firstRowCls);
        }
        Ext.fly(rows[rows.length - 1]).addClass(this.lastRowCls);
    },

    afterRender : function(){
        if(!this.ds || !this.cm){
            return;
        }
        this.mainBody.dom.innerHTML = this.renderRows() || '&#160;';
        this.processRows(0, true);

        if(this.deferEmptyText !== true){
            this.applyEmptyText();
        }
    },

    // private
    renderUI : function(){

        var header = this.renderHeaders();
        var body = this.templates.body.apply({rows:'&#160;'});


        var html = this.templates.master.apply({
            body: body,
            header: header,
            ostyle: 'width:'+this.getOffsetWidth()+';',
            bstyle: 'width:'+this.getTotalWidth()+';'
        });

        var g = this.grid;

        g.getGridEl().dom.innerHTML = html;

        this.initElements();

        // get mousedowns early
        Ext.fly(this.innerHd).on("click", this.handleHdDown, this);
        this.mainHd.on({
            scope: this,
            mouseover: this.handleHdOver,
            mouseout: this.handleHdOut,
            mousemove: this.handleHdMove
        });

        this.scroller.on('scroll', this.syncScroll,  this);
        if(g.enableColumnResize !== false){
            this.splitZone = new Ext.grid.GridView.SplitDragZone(g, this.mainHd.dom);
        }

        if(g.enableColumnMove){
            this.columnDrag = new Ext.grid.GridView.ColumnDragZone(g, this.innerHd);
            this.columnDrop = new Ext.grid.HeaderDropZone(g, this.mainHd.dom);
        }

        if(g.enableHdMenu !== false){
            this.hmenu = new Ext.menu.Menu({id: g.id + "-hctx"});
            this.hmenu.add(
                {itemId:"asc", text: this.sortAscText, cls: "xg-hmenu-sort-asc"},
                {itemId:"desc", text: this.sortDescText, cls: "xg-hmenu-sort-desc"}
            );
            if(g.enableColumnHide !== false){
                this.colMenu = new Ext.menu.Menu({id:g.id + "-hcols-menu"});
                this.colMenu.on({
                    scope: this,
                    beforeshow: this.beforeColMenuShow,
                    itemclick: this.handleHdMenuClick
                });
                this.hmenu.add('-', {
                    itemId:"columns",
                    hideOnClick: false,
                    text: this.columnsText,
                    menu: this.colMenu,
                    iconCls: 'x-cols-icon'
                });
            }
            this.hmenu.on("itemclick", this.handleHdMenuClick, this);
        }

        if(g.trackMouseOver){
            this.mainBody.on({
                scope: this,
                mouseover: this.onRowOver,
                mouseout: this.onRowOut
            });
        }

        if(g.enableDragDrop || g.enableDrag){
            this.dragZone = new Ext.grid.GridDragZone(g, {
                ddGroup : g.ddGroup || 'GridDD'
            });
        }

        this.updateHeaderSortState();

    },

    // private
    layout : function(){
        if(!this.mainBody){
            return; // not rendered
        }
        var g = this.grid;
        var c = g.getGridEl();
        var csize = c.getSize(true);
        var vw = csize.width;

        if(!g.hideHeaders && (vw < 20 || csize.height < 20)){ // display: none?
            return;
        }
        
        if(g.autoHeight){
            this.scroller.dom.style.overflow = 'visible';
            if(Ext.isWebKit){
                this.scroller.dom.style.position = 'static';
            }
        }else{
            this.el.setSize(csize.width, csize.height);

            var hdHeight = this.mainHd.getHeight();
            var vh = csize.height - (hdHeight);

            this.scroller.setSize(vw, vh);
            if(this.innerHd){
                this.innerHd.style.width = (vw)+'px';
            }
        }
        if(this.forceFit){
            if(this.lastViewWidth != vw){
                this.fitColumns(false, false);
                this.lastViewWidth = vw;
            }
        }else {
            this.autoExpand();
            this.syncHeaderScroll();
        }
        this.onLayout(vw, vh);
    },

    // template functions for subclasses and plugins
    // these functions include precalculated values
    onLayout : function(vw, vh){
        // do nothing
    },

    onColumnWidthUpdated : function(col, w, tw){
        //template method
    },

    onAllColumnWidthsUpdated : function(ws, tw){
        //template method
    },

    onColumnHiddenUpdated : function(col, hidden, tw){
        // template method
    },

    updateColumnText : function(col, text){
        // template method
    },

    afterMove : function(colIndex){
        // template method
    },

    /* ----------------------------------- Core Specific -------------------------------------------*/
    // private
    init : function(grid){
        this.grid = grid;

        this.initTemplates();
        this.initData(grid.store, grid.colModel);
        this.initUI(grid);
    },

    // private
    getColumnId : function(index){
      return this.cm.getColumnId(index);
    },
    
    // private 
    getOffsetWidth : function() {
        return (this.cm.getTotalWidth() + this.scrollOffset) + 'px';
    },

    // private
    renderHeaders : function(){
        var cm = this.cm, 
            ts = this.templates,
            ct = ts.hcell,
            cb = [], 
            p = {},
            len = cm.getColumnCount(),
            last = len - 1;
            
        for(var i = 0; i < len; i++){
            p.id = cm.getColumnId(i);
            p.value = cm.getColumnHeader(i) || "";
            p.style = this.getColumnStyle(i, true);
            p.tooltip = this.getColumnTooltip(i);
            p.css = i === 0 ? 'x-grid3-cell-first ' : (i == last ? 'x-grid3-cell-last ' : '');
            if(cm.config[i].align == 'right'){
                p.istyle = 'padding-right:16px';
            } else {
                delete p.istyle;
            }
            cb[cb.length] = ct.apply(p);
        }
        return ts.header.apply({cells: cb.join(""), tstyle:'width:'+this.getTotalWidth()+';'});
    },

    // private
    getColumnTooltip : function(i){
        var tt = this.cm.getColumnTooltip(i);
        if(tt){
            if(Ext.QuickTips.isEnabled()){
                return 'ext:qtip="'+tt+'"';
            }else{
                return 'title="'+tt+'"';
            }
        }
        return "";
    },

    // private
    beforeUpdate : function(){
        this.grid.stopEditing(true);
    },

    // private
    updateHeaders : function(){
        this.innerHd.firstChild.innerHTML = this.renderHeaders();
        this.innerHd.firstChild.style.width = this.getOffsetWidth();
        this.innerHd.firstChild.firstChild.style.width = this.getTotalWidth();
    },

    /**
     * Focuses the specified row.
     * @param {Number} row The row index
     */
    focusRow : function(row){
        this.focusCell(row, 0, false);
    },

    /**
     * Focuses the specified cell.
     * @param {Number} row The row index
     * @param {Number} col The column index
     */
    focusCell : function(row, col, hscroll){
        this.syncFocusEl(this.ensureVisible(row, col, hscroll));
        if(Ext.isGecko){
            this.focusEl.focus();
        }else{
            this.focusEl.focus.defer(1, this.focusEl);
        }
    },

    resolveCell : function(row, col, hscroll){
        if(typeof row != "number"){
            row = row.rowIndex;
        }
        if(!this.ds){
            return null;
        }
        if(row < 0 || row >= this.ds.getCount()){
            return null;
        }
        col = (col !== undefined ? col : 0);

        var rowEl = this.getRow(row),
            cm = this.cm,
            colCount = cm.getColumnCount(),
            cellEl;
        if(!(hscroll === false && col === 0)){
            while(col < colCount && cm.isHidden(col)){
                col++;
            }
            cellEl = this.getCell(row, col);
        }

        return {row: rowEl, cell: cellEl};
    },

    getResolvedXY : function(resolved){
        if(!resolved){
            return null;
        }
        var s = this.scroller.dom, c = resolved.cell, r = resolved.row;
        return c ? Ext.fly(c).getXY() : [this.el.getX(), Ext.fly(r).getY()];
    },

    syncFocusEl : function(row, col, hscroll){
        var xy = row;
        if(!Ext.isArray(xy)){
            row = Math.min(row, Math.max(0, this.getRows().length-1));
            xy = this.getResolvedXY(this.resolveCell(row, col, hscroll));
        }
        this.focusEl.setXY(xy||this.scroller.getXY());
    },

    ensureVisible : function(row, col, hscroll){
        var resolved = this.resolveCell(row, col, hscroll);
        if(!resolved || !resolved.row){
            return;
        }

        var rowEl = resolved.row, 
            cellEl = resolved.cell,
            c = this.scroller.dom,
            ctop = 0,
            p = rowEl, 
            stop = this.el.dom;
            
        while(p && p != stop){
            ctop += p.offsetTop;
            p = p.offsetParent;
        }
        ctop -= this.mainHd.dom.offsetHeight;

        var cbot = ctop + rowEl.offsetHeight,
            ch = c.clientHeight,
            sbot = stop + ch;
            
        stop = parseInt(c.scrollTop, 10);
        

        if(ctop < stop){
          c.scrollTop = ctop;
        }else if(cbot > sbot){
            c.scrollTop = cbot-ch;
        }

        if(hscroll !== false){
            var cleft = parseInt(cellEl.offsetLeft, 10);
            var cright = cleft + cellEl.offsetWidth;

            var sleft = parseInt(c.scrollLeft, 10);
            var sright = sleft + c.clientWidth;
            if(cleft < sleft){
                c.scrollLeft = cleft;
            }else if(cright > sright){
                c.scrollLeft = cright-c.clientWidth;
            }
        }
        return this.getResolvedXY(resolved);
    },

    // private
    insertRows : function(dm, firstRow, lastRow, isUpdate){
        var last = dm.getCount() - 1;
        if(!isUpdate && firstRow === 0 && lastRow >= last){
            this.refresh();
        }else{
            if(!isUpdate){
                this.fireEvent("beforerowsinserted", this, firstRow, lastRow);
            }
            var html = this.renderRows(firstRow, lastRow),
                before = this.getRow(firstRow);
            if(before){
                if(firstRow === 0){
                    Ext.fly(this.getRow(0)).removeClass(this.firstRowCls);
                }
                Ext.DomHelper.insertHtml('beforeBegin', before, html);
            }else{
                var r = this.getRow(last - 1);
                if(r){
                    Ext.fly(r).removeClass(this.lastRowCls);
                }
                Ext.DomHelper.insertHtml('beforeEnd', this.mainBody.dom, html);
            }
            if(!isUpdate){
                this.fireEvent("rowsinserted", this, firstRow, lastRow);
                this.processRows(firstRow);
            }else if(firstRow === 0 || firstRow >= last){
                //ensure first/last row is kept after an update.
                Ext.fly(this.getRow(firstRow)).addClass(firstRow === 0 ? this.firstRowCls : this.lastRowCls);
            }
        }
        this.syncFocusEl(firstRow);
    },

    // private
    deleteRows : function(dm, firstRow, lastRow){
        if(dm.getRowCount()<1){
            this.refresh();
        }else{
            this.fireEvent("beforerowsdeleted", this, firstRow, lastRow);

            this.removeRows(firstRow, lastRow);

            this.processRows(firstRow);
            this.fireEvent("rowsdeleted", this, firstRow, lastRow);
        }
    },

    // private
    getColumnStyle : function(col, isHeader){
        var style = !isHeader ? (this.cm.config[col].css || '') : '';
        style += 'width:'+this.getColumnWidth(col)+';';
        if(this.cm.isHidden(col)){
            style += 'display:none;';
        }
        var align = this.cm.config[col].align;
        if(align){
            style += 'text-align:'+align+';';
        }
        return style;
    },

    // private
    getColumnWidth : function(col){
        var w = this.cm.getColumnWidth(col);
        if(typeof w == 'number'){
            return (Ext.isBorderBox ? w : (w-this.borderWidth > 0 ? w-this.borderWidth:0)) + 'px';
        }
        return w;
    },

    // private
    getTotalWidth : function(){
        return this.cm.getTotalWidth()+'px';
    },

    // private
    fitColumns : function(preventRefresh, onlyExpand, omitColumn){
        var cm = this.cm, i;
        var tw = cm.getTotalWidth(false);
        var aw = this.grid.getGridEl().getWidth(true)-this.scrollOffset;

        if(aw < 20){ // not initialized, so don't screw up the default widths
            return;
        }
        var extra = aw - tw;

        if(extra === 0){
            return false;
        }

        var vc = cm.getColumnCount(true);
        var ac = vc-(typeof omitColumn == 'number' ? 1 : 0);
        if(ac === 0){
            ac = 1;
            omitColumn = undefined;
        }
        var colCount = cm.getColumnCount();
        var cols = [];
        var extraCol = 0;
        var width = 0;
        var w;
        for (i = 0; i < colCount; i++){
            if(!cm.isHidden(i) && !cm.isFixed(i) && i !== omitColumn){
                w = cm.getColumnWidth(i);
                cols.push(i);
                extraCol = i;
                cols.push(w);
                width += w;
            }
        }
        var frac = (aw - cm.getTotalWidth())/width;
        while (cols.length){
            w = cols.pop();
            i = cols.pop();
            cm.setColumnWidth(i, Math.max(this.grid.minColumnWidth, Math.floor(w + w*frac)), true);
        }

        if((tw = cm.getTotalWidth(false)) > aw){
            var adjustCol = ac != vc ? omitColumn : extraCol;
             cm.setColumnWidth(adjustCol, Math.max(1,
                     cm.getColumnWidth(adjustCol)- (tw-aw)), true);
        }

        if(preventRefresh !== true){
            this.updateAllColumnWidths();
        }


        return true;
    },

    // private
    autoExpand : function(preventUpdate){
        var g = this.grid, cm = this.cm;
        if(!this.userResized && g.autoExpandColumn){
            var tw = cm.getTotalWidth(false);
            var aw = this.grid.getGridEl().getWidth(true)-this.scrollOffset;
            if(tw != aw){
                var ci = cm.getIndexById(g.autoExpandColumn);
                var currentWidth = cm.getColumnWidth(ci);
                var cw = Math.min(Math.max(((aw-tw)+currentWidth), g.autoExpandMin), g.autoExpandMax);
                if(cw != currentWidth){
                    cm.setColumnWidth(ci, cw, true);
                    if(preventUpdate !== true){
                        this.updateColumnWidth(ci, cw);
                    }
                }
            }
        }
    },

    // private
    getColumnData : function(){
        // build a map for all the columns
        var cs = [], cm = this.cm, colCount = cm.getColumnCount();
        for(var i = 0; i < colCount; i++){
            var name = cm.getDataIndex(i);
            cs[i] = {
                name : (typeof name == 'undefined' ? this.ds.fields.get(i).name : name),
                renderer : cm.getRenderer(i),
                id : cm.getColumnId(i),
                style : this.getColumnStyle(i)
            };
        }
        return cs;
    },

    // private
    renderRows : function(startRow, endRow){
        // pull in all the crap needed to render rows
        var g = this.grid, cm = g.colModel, ds = g.store, stripe = g.stripeRows;
        var colCount = cm.getColumnCount();

        if(ds.getCount() < 1){
            return "";
        }

        var cs = this.getColumnData();

        startRow = startRow || 0;
        endRow = typeof endRow == "undefined"? ds.getCount()-1 : endRow;

        // records to render
        var rs = ds.getRange(startRow, endRow);

        return this.doRender(cs, rs, ds, startRow, colCount, stripe);
    },

    // private
    renderBody : function(){
        var markup = this.renderRows() || '&#160;';
        return this.templates.body.apply({rows: markup});
    },

    // private
    refreshRow : function(record){
        var ds = this.ds, index;
        if(typeof record == 'number'){
            index = record;
            record = ds.getAt(index);
            if(!record){
                return;
            }
        }else{
            index = ds.indexOf(record);
            if(index < 0){
                return;
            }
        }
        this.insertRows(ds, index, index, true);
        this.getRow(index).rowIndex = index;
        this.onRemove(ds, record, index+1, true);
        this.fireEvent("rowupdated", this, index, record);
    },

    /**
     * Refreshs the grid UI
     * @param {Boolean} headersToo (optional) True to also refresh the headers
     */
    refresh : function(headersToo){
        this.fireEvent("beforerefresh", this);
        this.grid.stopEditing(true);

        var result = this.renderBody();
        this.mainBody.update(result).setWidth(this.getTotalWidth());
        if(headersToo === true){
            this.updateHeaders();
            this.updateHeaderSortState();
        }
        this.processRows(0, true);
        this.layout();
        this.applyEmptyText();
        this.fireEvent("refresh", this);
    },

    // private
    applyEmptyText : function(){
        if(this.emptyText && !this.hasRows()){
            this.mainBody.update('<div class="x-grid-empty">' + this.emptyText + '</div>');
        }
    },

    // private
    updateHeaderSortState : function(){
        var state = this.ds.getSortState();
        if(!state){
            return;
        }
        if(!this.sortState || (this.sortState.field != state.field || this.sortState.direction != state.direction)){
            this.grid.fireEvent('sortchange', this.grid, state);
        }
        this.sortState = state;
        var sortColumn = this.cm.findColumnIndex(state.field);
        if(sortColumn != -1){
            var sortDir = state.direction;
            this.updateSortIcon(sortColumn, sortDir);
        }
    },

    // private
    destroy : function(){
        if(this.colMenu){
            Ext.menu.MenuMgr.unregister(this.colMenu);
            this.colMenu.destroy();
            delete this.colMenu;
        }
        if(this.hmenu){
            Ext.menu.MenuMgr.unregister(this.hmenu);
            this.hmenu.destroy();
            delete this.hmenu;
        }
        if(this.grid.enableColumnMove){
            var dds = Ext.dd.DDM.ids['gridHeader' + this.grid.getGridEl().id];
            if(dds){
                for(var dd in dds){
                    if(!dds[dd].config.isTarget && dds[dd].dragElId){
                        var elid = dds[dd].dragElId;
                        dds[dd].unreg();
                        Ext.get(elid).remove();
                    } else if(dds[dd].config.isTarget){
                        dds[dd].proxyTop.remove();
                        dds[dd].proxyBottom.remove();
                        dds[dd].unreg();
                    }
                    if(Ext.dd.DDM.locationCache[dd]){
                        delete Ext.dd.DDM.locationCache[dd];
                    }
                }
                delete Ext.dd.DDM.ids['gridHeader' + this.grid.getGridEl().id];
            }
        }

        if(this.dragZone){
            this.dragZone.unreg();
        }
        
        Ext.fly(this.innerHd).removeAllListeners();
        Ext.removeNode(this.innerHd);
        
        Ext.destroy(this.resizeMarker, this.resizeProxy, this.focusEl, this.mainBody, 
                    this.scroller, this.mainHd, this.mainWrap, this.dragZone, 
                    this.splitZone, this.columnDrag, this.columnDrop);

        this.initData(null, null);
        Ext.EventManager.removeResizeListener(this.onWindowResize, this);
        this.purgeListeners();
    },

    // private
    onDenyColumnHide : function(){

    },

    // private
    render : function(){
        if(this.autoFill){
            var ct = this.grid.ownerCt;
            if (ct && ct.getLayout()){
                ct.on('afterlayout', function(){ 
                    this.fitColumns(true, true);
                    this.updateHeaders(); 
                }, this, {single: true}); 
            }else{ 
                this.fitColumns(true, true); 
            }
        }else if(this.forceFit){
            this.fitColumns(true, false);
        }else if(this.grid.autoExpandColumn){
            this.autoExpand(true);
        }

        this.renderUI();
    },

    /* --------------------------------- Model Events and Handlers --------------------------------*/
    // private
    initData : function(ds, cm){
        if(this.ds){
            this.ds.un("load", this.onLoad, this);
            this.ds.un("datachanged", this.onDataChange, this);
            this.ds.un("add", this.onAdd, this);
            this.ds.un("remove", this.onRemove, this);
            this.ds.un("update", this.onUpdate, this);
            this.ds.un("clear", this.onClear, this);
            if(this.ds !== ds && this.ds.autoDestroy){
                this.ds.destroy();
            }
        }
        if(ds){
            ds.on({
                scope: this,
                load: this.onLoad,
                datachanged: this.onDataChange,
                add: this.onAdd,
                remove: this.onRemove,
                update: this.onUpdate,
                clear: this.onClear
            });
        }
        this.ds = ds;

        if(this.cm){
            this.cm.un("configchange", this.onColConfigChange, this);
            this.cm.un("widthchange", this.onColWidthChange, this);
            this.cm.un("headerchange", this.onHeaderChange, this);
            this.cm.un("hiddenchange", this.onHiddenChange, this);
            this.cm.un("columnmoved", this.onColumnMove, this);
        }
        if(cm){
            delete this.lastViewWidth;
            cm.on({
                scope: this,
                configchange: this.onColConfigChange,
                widthchange: this.onColWidthChange,
                headerchange: this.onHeaderChange,
                hiddenchange: this.onHiddenChange,
                columnmoved: this.onColumnMove
            });
        }
        this.cm = cm;
    },

    // private
    onDataChange : function(){
        this.refresh();
        this.updateHeaderSortState();
        this.syncFocusEl(0);
    },

    // private
    onClear : function(){
        this.refresh();
        this.syncFocusEl(0);
    },

    // private
    onUpdate : function(ds, record){
        this.refreshRow(record);
    },

    // private
    onAdd : function(ds, records, index){
        this.insertRows(ds, index, index + (records.length-1));
    },

    // private
    onRemove : function(ds, record, index, isUpdate){
        if(isUpdate !== true){
            this.fireEvent("beforerowremoved", this, index, record);
        }
        this.removeRow(index);
        if(isUpdate !== true){
            this.processRows(index);
            this.applyEmptyText();
            this.fireEvent("rowremoved", this, index, record);
        }
    },

    // private
    onLoad : function(){
        this.scrollToTop();
    },

    // private
    onColWidthChange : function(cm, col, width){
        this.updateColumnWidth(col, width);
    },

    // private
    onHeaderChange : function(cm, col, text){
        this.updateHeaders();
    },

    // private
    onHiddenChange : function(cm, col, hidden){
        this.updateColumnHidden(col, hidden);
    },

    // private
    onColumnMove : function(cm, oldIndex, newIndex){
        this.indexMap = null;
        var s = this.getScrollState();
        this.refresh(true);
        this.restoreScroll(s);
        this.afterMove(newIndex);
        this.grid.fireEvent('columnmove', oldIndex, newIndex);
    },

    // private
    onColConfigChange : function(){
        delete this.lastViewWidth;
        this.indexMap = null;
        this.refresh(true);
    },

    /* -------------------- UI Events and Handlers ------------------------------ */
    // private
    initUI : function(grid){
        grid.on("headerclick", this.onHeaderClick, this);
    },

    // private
    initEvents : function(){
    },

    // private
    onHeaderClick : function(g, index){
        if(this.headersDisabled || !this.cm.isSortable(index)){
            return;
        }
        g.stopEditing(true);
        g.store.sort(this.cm.getDataIndex(index));
    },

    // private
    onRowOver : function(e, t){
        var row;
        if((row = this.findRowIndex(t)) !== false){
            this.addRowClass(row, "x-grid3-row-over");
        }
    },

    // private
    onRowOut : function(e, t){
        var row;
        if((row = this.findRowIndex(t)) !== false && !e.within(this.getRow(row), true)){
            this.removeRowClass(row, "x-grid3-row-over");
        }
    },

    // private
    handleWheel : function(e){
        e.stopPropagation();
    },

    // private
    onRowSelect : function(row){
        this.addRowClass(row, this.selectedRowClass);
    },

    // private
    onRowDeselect : function(row){
        this.removeRowClass(row, this.selectedRowClass);
    },

    // private
    onCellSelect : function(row, col){
        var cell = this.getCell(row, col);
        if(cell){
            this.fly(cell).addClass("x-grid3-cell-selected");
        }
    },

    // private
    onCellDeselect : function(row, col){
        var cell = this.getCell(row, col);
        if(cell){
            this.fly(cell).removeClass("x-grid3-cell-selected");
        }
    },

    // private
    onColumnSplitterMoved : function(i, w){
        this.userResized = true;
        var cm = this.grid.colModel;
        cm.setColumnWidth(i, w, true);

        if(this.forceFit){
            this.fitColumns(true, false, i);
            this.updateAllColumnWidths();
        }else{
            this.updateColumnWidth(i, w);
            this.syncHeaderScroll();
        }

        this.grid.fireEvent("columnresize", i, w);
    },

    // private
    handleHdMenuClick : function(item){
        var index = this.hdCtxIndex;
        var cm = this.cm, ds = this.ds;
        switch(item.itemId){
            case "asc":
                ds.sort(cm.getDataIndex(index), "ASC");
                break;
            case "desc":
                ds.sort(cm.getDataIndex(index), "DESC");
                break;
            default:
                index = cm.getIndexById(item.itemId.substr(4));
                if(index != -1){
                    if(item.checked && cm.getColumnsBy(this.isHideableColumn, this).length <= 1){
                        this.onDenyColumnHide();
                        return false;
                    }
                    cm.setHidden(index, item.checked);
                }
        }
        return true;
    },

    // private
    isHideableColumn : function(c){
        return !c.hidden && !c.fixed;
    },

    // private
    beforeColMenuShow : function(){
        var cm = this.cm,  colCount = cm.getColumnCount();
        this.colMenu.removeAll();
        for(var i = 0; i < colCount; i++){
            if(cm.config[i].fixed !== true && cm.config[i].hideable !== false){
                this.colMenu.add(new Ext.menu.CheckItem({
                    itemId: "col-"+cm.getColumnId(i),
                    text: cm.getColumnHeader(i),
                    checked: !cm.isHidden(i),
                    hideOnClick:false,
                    disabled: cm.config[i].hideable === false
                }));
            }
        }
    },

    // private
    handleHdDown : function(e, t){
        if(Ext.fly(t).hasClass('x-grid3-hd-btn')){
            e.stopEvent();
            var hd = this.findHeaderCell(t);
            Ext.fly(hd).addClass('x-grid3-hd-menu-open');
            var index = this.getCellIndex(hd);
            this.hdCtxIndex = index;
            var ms = this.hmenu.items, cm = this.cm;
            ms.get("asc").setDisabled(!cm.isSortable(index));
            ms.get("desc").setDisabled(!cm.isSortable(index));
            this.hmenu.on("hide", function(){
                Ext.fly(hd).removeClass('x-grid3-hd-menu-open');
            }, this, {single:true});
            this.hmenu.show(t, "tl-bl?");
        }
    },

    // private
    handleHdOver : function(e, t){
        var hd = this.findHeaderCell(t);
        if(hd && !this.headersDisabled){
            this.activeHd = hd;
            this.activeHdIndex = this.getCellIndex(hd);
            var fly = this.fly(hd);
            this.activeHdRegion = fly.getRegion();
            if(!this.cm.isMenuDisabled(this.activeHdIndex)){
                fly.addClass("x-grid3-hd-over");
                this.activeHdBtn = fly.child('.x-grid3-hd-btn');
                if(this.activeHdBtn){
                    this.activeHdBtn.dom.style.height = (hd.firstChild.offsetHeight-1)+'px';
                }
            }
        }
    },

    // private
    handleHdMove : function(e, t){
        if(this.activeHd && !this.headersDisabled){
            var hw = this.splitHandleWidth || 5;
            var r = this.activeHdRegion;
            var x = e.getPageX();
            var ss = this.activeHd.style;
            if(x - r.left <= hw && this.cm.isResizable(this.activeHdIndex-1)){
                ss.cursor = Ext.isAir ? 'move' : Ext.isWebKit ? 'e-resize' : 'col-resize'; // col-resize not always supported
            }else if(r.right - x <= (!this.activeHdBtn ? hw : 2) && this.cm.isResizable(this.activeHdIndex)){
                ss.cursor = Ext.isAir ? 'move' : Ext.isWebKit ? 'w-resize' : 'col-resize';
            }else{
                ss.cursor = '';
            }
        }
    },

    // private
    handleHdOut : function(e, t){
        var hd = this.findHeaderCell(t);
        if(hd && (!Ext.isIE || !e.within(hd, true))){
            this.activeHd = null;
            this.fly(hd).removeClass("x-grid3-hd-over");
            hd.style.cursor = '';
        }
    },

    // private
    hasRows : function(){
        var fc = this.mainBody.dom.firstChild;
        return fc && fc.nodeType == 1 && fc.className != 'x-grid-empty';
    },

    // back compat
    bind : function(d, c){
        this.initData(d, c);
    }
});


// private
// This is a support class used internally by the Grid components
Ext.grid.GridView.SplitDragZone = function(grid, hd){
    this.grid = grid;
    this.view = grid.getView();
    this.marker = this.view.resizeMarker;
    this.proxy = this.view.resizeProxy;
    Ext.grid.GridView.SplitDragZone.superclass.constructor.call(this, hd,
        "gridSplitters" + this.grid.getGridEl().id, {
        dragElId : Ext.id(this.proxy.dom), resizeFrame:false
    });
    this.scroll = false;
    this.hw = this.view.splitHandleWidth || 5;
};
Ext.extend(Ext.grid.GridView.SplitDragZone, Ext.dd.DDProxy, {

    b4StartDrag : function(x, y){
        this.view.headersDisabled = true;
        var h = this.view.mainWrap.getHeight();
        this.marker.setHeight(h);
        this.marker.show();
        this.marker.alignTo(this.view.getHeaderCell(this.cellIndex), 'tl-tl', [-2, 0]);
        this.proxy.setHeight(h);
        var w = this.cm.getColumnWidth(this.cellIndex);
        var minw = Math.max(w-this.grid.minColumnWidth, 0);
        this.resetConstraints();
        this.setXConstraint(minw, 1000);
        this.setYConstraint(0, 0);
        this.minX = x - minw;
        this.maxX = x + 1000;
        this.startPos = x;
        Ext.dd.DDProxy.prototype.b4StartDrag.call(this, x, y);
    },


    handleMouseDown : function(e){
        var t = this.view.findHeaderCell(e.getTarget());
        if(t){
            var xy = this.view.fly(t).getXY(), x = xy[0], y = xy[1];
            var exy = e.getXY(), ex = exy[0];
            var w = t.offsetWidth, adjust = false;
            if((ex - x) <= this.hw){
                adjust = -1;
            }else if((x+w) - ex <= this.hw){
                adjust = 0;
            }
            if(adjust !== false){
                this.cm = this.grid.colModel;
                var ci = this.view.getCellIndex(t);
                if(adjust == -1){
                  if (ci + adjust < 0) {
                    return;
                  }
                    while(this.cm.isHidden(ci+adjust)){
                        --adjust;
                        if(ci+adjust < 0){
                            return;
                        }
                    }
                }
                this.cellIndex = ci+adjust;
                this.split = t.dom;
                if(this.cm.isResizable(this.cellIndex) && !this.cm.isFixed(this.cellIndex)){
                    Ext.grid.GridView.SplitDragZone.superclass.handleMouseDown.apply(this, arguments);
                }
            }else if(this.view.columnDrag){
                this.view.columnDrag.callHandleMouseDown(e);
            }
        }
    },

    endDrag : function(e){
        this.marker.hide();
        var v = this.view;
        var endX = Math.max(this.minX, e.getPageX());
        var diff = endX - this.startPos;
        v.onColumnSplitterMoved(this.cellIndex, this.cm.getColumnWidth(this.cellIndex)+diff);
        setTimeout(function(){
            v.headersDisabled = false;
        }, 50);
    },

    autoOffset : function(){
        this.setDelta(0,0);
    }
});
// private
// This is a support class used internally by the Grid components
Ext.grid.HeaderDragZone = function(grid, hd, hd2){
    this.grid = grid;
    this.view = grid.getView();
    this.ddGroup = "gridHeader" + this.grid.getGridEl().id;
    Ext.grid.HeaderDragZone.superclass.constructor.call(this, hd);
    if(hd2){
        this.setHandleElId(Ext.id(hd));
        this.setOuterHandleElId(Ext.id(hd2));
    }
    this.scroll = false;
};
Ext.extend(Ext.grid.HeaderDragZone, Ext.dd.DragZone, {
    maxDragWidth: 120,
    getDragData : function(e){
        var t = Ext.lib.Event.getTarget(e);
        var h = this.view.findHeaderCell(t);
        if(h){
            return {ddel: h.firstChild, header:h};
        }
        return false;
    },

    onInitDrag : function(e){
        this.view.headersDisabled = true;
        var clone = this.dragData.ddel.cloneNode(true);
        clone.id = Ext.id();
        clone.style.width = Math.min(this.dragData.header.offsetWidth,this.maxDragWidth) + "px";
        this.proxy.update(clone);
        return true;
    },

    afterValidDrop : function(){
        var v = this.view;
        setTimeout(function(){
            v.headersDisabled = false;
        }, 50);
    },

    afterInvalidDrop : function(){
        var v = this.view;
        setTimeout(function(){
            v.headersDisabled = false;
        }, 50);
    }
});

// private
// This is a support class used internally by the Grid components
Ext.grid.HeaderDropZone = function(grid, hd, hd2){
    this.grid = grid;
    this.view = grid.getView();
    // split the proxies so they don't interfere with mouse events
    this.proxyTop = Ext.DomHelper.append(document.body, {
        cls:"col-move-top", html:"&#160;"
    }, true);
    this.proxyBottom = Ext.DomHelper.append(document.body, {
        cls:"col-move-bottom", html:"&#160;"
    }, true);
    this.proxyTop.hide = this.proxyBottom.hide = function(){
        this.setLeftTop(-100,-100);
        this.setStyle("visibility", "hidden");
    };
    this.ddGroup = "gridHeader" + this.grid.getGridEl().id;
    // temporarily disabled
    //Ext.dd.ScrollManager.register(this.view.scroller.dom);
    Ext.grid.HeaderDropZone.superclass.constructor.call(this, grid.getGridEl().dom);
};
Ext.extend(Ext.grid.HeaderDropZone, Ext.dd.DropZone, {
    proxyOffsets : [-4, -9],
    fly: Ext.Element.fly,

    getTargetFromEvent : function(e){
        var t = Ext.lib.Event.getTarget(e);
        var cindex = this.view.findCellIndex(t);
        if(cindex !== false){
            return this.view.getHeaderCell(cindex);
        }
    },

    nextVisible : function(h){
        var v = this.view, cm = this.grid.colModel;
        h = h.nextSibling;
        while(h){
            if(!cm.isHidden(v.getCellIndex(h))){
                return h;
            }
            h = h.nextSibling;
        }
        return null;
    },

    prevVisible : function(h){
        var v = this.view, cm = this.grid.colModel;
        h = h.prevSibling;
        while(h){
            if(!cm.isHidden(v.getCellIndex(h))){
                return h;
            }
            h = h.prevSibling;
        }
        return null;
    },

    positionIndicator : function(h, n, e){
        var x = Ext.lib.Event.getPageX(e);
        var r = Ext.lib.Dom.getRegion(n.firstChild);
        var px, pt, py = r.top + this.proxyOffsets[1];
        if((r.right - x) <= (r.right-r.left)/2){
            px = r.right+this.view.borderWidth;
            pt = "after";
        }else{
            px = r.left;
            pt = "before";
        }

        if(this.grid.colModel.isFixed(this.view.getCellIndex(n))){
            return false;
        }

        px +=  this.proxyOffsets[0];
        this.proxyTop.setLeftTop(px, py);
        this.proxyTop.show();
        if(!this.bottomOffset){
            this.bottomOffset = this.view.mainHd.getHeight();
        }
        this.proxyBottom.setLeftTop(px, py+this.proxyTop.dom.offsetHeight+this.bottomOffset);
        this.proxyBottom.show();
        return pt;
    },

    onNodeEnter : function(n, dd, e, data){
        if(data.header != n){
            this.positionIndicator(data.header, n, e);
        }
    },

    onNodeOver : function(n, dd, e, data){
        var result = false;
        if(data.header != n){
            result = this.positionIndicator(data.header, n, e);
        }
        if(!result){
            this.proxyTop.hide();
            this.proxyBottom.hide();
        }
        return result ? this.dropAllowed : this.dropNotAllowed;
    },

    onNodeOut : function(n, dd, e, data){
        this.proxyTop.hide();
        this.proxyBottom.hide();
    },

    onNodeDrop : function(n, dd, e, data){
        var h = data.header;
        if(h != n){
            var cm = this.grid.colModel;
            var x = Ext.lib.Event.getPageX(e);
            var r = Ext.lib.Dom.getRegion(n.firstChild);
            var pt = (r.right - x) <= ((r.right-r.left)/2) ? "after" : "before";
            var oldIndex = this.view.getCellIndex(h);
            var newIndex = this.view.getCellIndex(n);
            if(pt == "after"){
                newIndex++;
            }
            if(oldIndex < newIndex){
                newIndex--;
            }
            cm.moveColumn(oldIndex, newIndex);
            this.grid.fireEvent("columnmove", oldIndex, newIndex);
            return true;
        }
        return false;
    }
});


Ext.grid.GridView.ColumnDragZone = function(grid, hd){
    Ext.grid.GridView.ColumnDragZone.superclass.constructor.call(this, grid, hd, null);
    this.proxy.el.addClass('x-grid3-col-dd');
};

Ext.extend(Ext.grid.GridView.ColumnDragZone, Ext.grid.HeaderDragZone, {
    handleMouseDown : function(e){

    },

    callHandleMouseDown : function(e){
        Ext.grid.GridView.ColumnDragZone.superclass.handleMouseDown.call(this, e);
    }
});// private
// This is a support class used internally by the Grid components
Ext.grid.SplitDragZone = function(grid, hd, hd2){
    this.grid = grid;
    this.view = grid.getView();
    this.proxy = this.view.resizeProxy;
    Ext.grid.SplitDragZone.superclass.constructor.call(this, hd,
        "gridSplitters" + this.grid.getGridEl().id, {
        dragElId : Ext.id(this.proxy.dom), resizeFrame:false
    });
    this.setHandleElId(Ext.id(hd));
    this.setOuterHandleElId(Ext.id(hd2));
    this.scroll = false;
};
Ext.extend(Ext.grid.SplitDragZone, Ext.dd.DDProxy, {
    fly: Ext.Element.fly,

    b4StartDrag : function(x, y){
        this.view.headersDisabled = true;
        this.proxy.setHeight(this.view.mainWrap.getHeight());
        var w = this.cm.getColumnWidth(this.cellIndex);
        var minw = Math.max(w-this.grid.minColumnWidth, 0);
        this.resetConstraints();
        this.setXConstraint(minw, 1000);
        this.setYConstraint(0, 0);
        this.minX = x - minw;
        this.maxX = x + 1000;
        this.startPos = x;
        Ext.dd.DDProxy.prototype.b4StartDrag.call(this, x, y);
    },


    handleMouseDown : function(e){
        var ev = Ext.EventObject.setEvent(e);
        var t = this.fly(ev.getTarget());
        if(t.hasClass("x-grid-split")){
            this.cellIndex = this.view.getCellIndex(t.dom);
            this.split = t.dom;
            this.cm = this.grid.colModel;
            if(this.cm.isResizable(this.cellIndex) && !this.cm.isFixed(this.cellIndex)){
                Ext.grid.SplitDragZone.superclass.handleMouseDown.apply(this, arguments);
            }
        }
    },

    endDrag : function(e){
        this.view.headersDisabled = false;
        var endX = Math.max(this.minX, Ext.lib.Event.getPageX(e));
        var diff = endX - this.startPos;
        this.view.onColumnSplitterMoved(this.cellIndex, this.cm.getColumnWidth(this.cellIndex)+diff);
    },

    autoOffset : function(){
        this.setDelta(0,0);
    }
});/**
 * @class Ext.grid.GridDragZone
 * @extends Ext.dd.DragZone
 * <p>A customized implementation of a {@link Ext.dd.DragZone DragZone} which provides default implementations of two of the
 * template methods of DragZone to enable dragging of the selected rows of a GridPanel.</p>
 * <p>A cooperating {@link Ext.dd.DropZone DropZone} must be created who's template method implementations of
 * {@link Ext.dd.DropZone#onNodeEnter onNodeEnter}, {@link Ext.dd.DropZone#onNodeOver onNodeOver},
 * {@link Ext.dd.DropZone#onNodeOut onNodeOut} and {@link Ext.dd.DropZone#onNodeDrop onNodeDrop}</p> are able
 * to process the {@link #getDragData data} which is provided.
 */
Ext.grid.GridDragZone = function(grid, config){
    this.view = grid.getView();
    Ext.grid.GridDragZone.superclass.constructor.call(this, this.view.mainBody.dom, config);
    this.scroll = false;
    this.grid = grid;
    this.ddel = document.createElement('div');
    this.ddel.className = 'x-grid-dd-wrap';
};

Ext.extend(Ext.grid.GridDragZone, Ext.dd.DragZone, {
    ddGroup : "GridDD",

    /**
     * <p>The provided implementation of the getDragData method which collects the data to be dragged from the GridPanel on mousedown.</p>
     * <p>This data is available for processing in the {@link Ext.dd.DropZone#onNodeEnter onNodeEnter}, {@link Ext.dd.DropZone#onNodeOver onNodeOver},
     * {@link Ext.dd.DropZone#onNodeOut onNodeOut} and {@link Ext.dd.DropZone#onNodeDrop onNodeDrop} methods of a cooperating {@link Ext.dd.DropZone DropZone}.</p>
     * <p>The data object contains the following properties:<ul>
     * <li><b>grid</b> : Ext.Grid.GridPanel<div class="sub-desc">The GridPanel from which the data is being dragged.</div></li>
     * <li><b>ddel</b> : htmlElement<div class="sub-desc">An htmlElement which provides the "picture" of the data being dragged.</div></li>
     * <li><b>rowIndex</b> : Number<div class="sub-desc">The index of the row which receieved the mousedown gesture which triggered the drag.</div></li>
     * <li><b>selections</b> : Array<div class="sub-desc">An Array of the selected Records which are being dragged from the GridPanel.</div></li>
     * </ul></p>
     */
    getDragData : function(e){
        var t = Ext.lib.Event.getTarget(e);
        var rowIndex = this.view.findRowIndex(t);
        if(rowIndex !== false){
            var sm = this.grid.selModel;
            if(!sm.isSelected(rowIndex) || e.hasModifier()){
                sm.handleMouseDown(this.grid, rowIndex, e);
            }
            return {grid: this.grid, ddel: this.ddel, rowIndex: rowIndex, selections:sm.getSelections()};
        }
        return false;
    },

    /**
     * <p>The provided implementation of the onInitDrag method. Sets the <tt>innerHTML</tt> of the drag proxy which provides the "picture"
     * of the data being dragged.</p>
     * <p>The <tt>innerHTML</tt> data is found by calling the owning GridPanel's {@link Ext.grid.GridPanel#getDragDropText getDragDropText}.</p>
     */
    onInitDrag : function(e){
        var data = this.dragData;
        this.ddel.innerHTML = this.grid.getDragDropText();
        this.proxy.update(this.ddel);
        // fire start drag?
    },

    /**
     * An empty immplementation. Implement this to provide behaviour after a repair of an invalid drop. An implementation might highlight
     * the selected rows to show that they have not been dragged.
     */
    afterRepair : function(){
        this.dragging = false;
    },

    /**
     * <p>An empty implementation. Implement this to provide coordinates for the drag proxy to slide back to after an invalid drop.</p>
     * <p>Called before a repair of an invalid drop to get the XY to animate to.</p>
     * @param {EventObject} e The mouse up event
     * @return {Array} The xy location (e.g. [100, 200])
     */
    getRepairXY : function(e, data){
        return false;
    },

    onEndDrag : function(data, e){
        // fire end drag?
    },

    onValidDrop : function(dd, e, id){
        // fire drag drop?
        this.hideProxy();
    },

    beforeInvalidDrop : function(e, id){

    }
});
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
 * header menu).  Field's that are not included in the ColumnModel will not be displayable at all.</p>
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
Ext.grid.ColumnModel = function(config){
    /**
     * An Array of {@link Ext.grid.Column Column definition} objects representing the configuration
     * of this ColumnModel.  See {@link Ext.grid.Column} for the configuration properties that may
     * be specified.
     * @property config
     * @type Array
     */
    if(config.columns){
        Ext.apply(this, config);
        this.setConfig(config.columns, true);
    }else{
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
};
Ext.extend(Ext.grid.ColumnModel, Ext.util.Observable, {
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

    /**
     * Returns the id of the column at the specified index.
     * @param {Number} index The column index
     * @return {String} the id
     */
    getColumnId : function(index){
        return this.config[index].id;
    },

    getColumnAt : function(index){
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
    setConfig : function(config, initial){
        var i, c, len;
        if(!initial){ // cleanup
            delete this.totalWidth;
            for(i = 0, len = this.config.length; i < len; i++){
                c = this.config[i];
                if(c.editor){
                    c.editor.destroy();
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
        // if no id, create one
        for(i = 0, len = config.length; i < len; i++){
            c = Ext.applyIf(config[i], this.defaults);
            if(!c.isColumn){
                var cls = Ext.grid.Column.types[c.xtype || 'gridcolumn'];
                c = new cls(c);
                config[i] = c;
            }
            this.lookup[c.id] = c;
        }
        if(!initial){
            this.fireEvent('configchange', this);
        }
    },

    /**
     * Returns the column for a specified id.
     * @param {String} id The column id
     * @return {Object} the column
     */
    getColumnById : function(id){
        return this.lookup[id];
    },

    /**
     * Returns the index for a specified column id.
     * @param {String} id The column id
     * @return {Number} the index, or -1 if not found
     */
    getIndexById : function(id){
        for(var i = 0, len = this.config.length; i < len; i++){
            if(this.config[i].id == id){
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
    moveColumn : function(oldIndex, newIndex){
        var c = this.config[oldIndex];
        this.config.splice(oldIndex, 1);
        this.config.splice(newIndex, 0, c);
        this.dataMap = null;
        this.fireEvent("columnmoved", this, oldIndex, newIndex);
    },

    /**
     * Returns the number of columns.
     * @param {Boolean} visibleOnly Optional. Pass as true to only include visible columns.
     * @return {Number}
     */
    getColumnCount : function(visibleOnly){
        if(visibleOnly === true){
            var c = 0;
            for(var i = 0, len = this.config.length; i < len; i++){
                if(!this.isHidden(i)){
                    c++;
                }
            }
            return c;
        }
        return this.config.length;
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
     * @param {Function} fn
     * @param {Object} scope (optional)
     * @return {Array} result
     */
    getColumnsBy : function(fn, scope){
        var r = [];
        for(var i = 0, len = this.config.length; i < len; i++){
            var c = this.config[i];
            if(fn.call(scope||this, c, i) === true){
                r[r.length] = c;
            }
        }
        return r;
    },

    /**
     * Returns true if the specified column is sortable.
     * @param {Number} col The column index
     * @return {Boolean}
     */
    isSortable : function(col){
        return this.config[col].sortable;
    },

    /**
     * Returns true if the specified column menu is disabled.
     * @param {Number} col The column index
     * @return {Boolean}
     */
    isMenuDisabled : function(col){
        return !!this.config[col].menuDisabled;
    },

    /**
     * Returns the rendering (formatting) function defined for the column.
     * @param {Number} col The column index.
     * @return {Function} The function used to render the cell. See {@link #setRenderer}.
     */
    getRenderer : function(col){
        if(!this.config[col].renderer){
            return Ext.grid.ColumnModel.defaultRenderer;
        }
        return this.config[col].renderer;
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
    setRenderer : function(col, fn){
        this.config[col].renderer = fn;
    },

    /**
     * Returns the width for the specified column.
     * @param {Number} col The column index
     * @return {Number}
     */
    getColumnWidth : function(col){
        return this.config[col].width;
    },

    /**
     * Sets the width for a column.
     * @param {Number} col The column index
     * @param {Number} width The new width
     * @param {Boolean} suppressEvent True to suppress firing the <code>{@link #widthchange}</code>
     * event. Defaults to false.
     */
    setColumnWidth : function(col, width, suppressEvent){
        this.config[col].width = width;
        this.totalWidth = null;
        if(!suppressEvent){
             this.fireEvent("widthchange", this, col, width);
        }
    },

    /**
     * Returns the total width of all columns.
     * @param {Boolean} includeHidden True to include hidden column widths
     * @return {Number}
     */
    getTotalWidth : function(includeHidden){
        if(!this.totalWidth){
            this.totalWidth = 0;
            for(var i = 0, len = this.config.length; i < len; i++){
                if(includeHidden || !this.isHidden(i)){
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
    getColumnHeader : function(col){
        return this.config[col].header;
    },

    /**
     * Sets the header for a column.
     * @param {Number} col The column index
     * @param {String} header The new header
     */
    setColumnHeader : function(col, header){
        this.config[col].header = header;
        this.fireEvent("headerchange", this, col, header);
    },

    /**
     * Returns the tooltip for the specified column.
     * @param {Number} col The column index
     * @return {String}
     */
    getColumnTooltip : function(col){
            return this.config[col].tooltip;
    },
    /**
     * Sets the tooltip for a column.
     * @param {Number} col The column index
     * @param {String} tooltip The new tooltip
     */
    setColumnTooltip : function(col, tooltip){
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
    getDataIndex : function(col){
        return this.config[col].dataIndex;
    },

    /**
     * Sets the dataIndex for a column.
     * @param {Number} col The column index
     * @param {String} dataIndex The new dataIndex
     */
    setDataIndex : function(col, dataIndex){
        this.config[col].dataIndex = dataIndex;
    },

    /**
     * Finds the index of the first matching column for the given dataIndex.
     * @param {String} col The dataIndex to find
     * @return {Number} The column index, or -1 if no match was found
     */
    findColumnIndex : function(dataIndex){
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
    isCellEditable : function(colIndex, rowIndex){
        return (this.config[colIndex].editable || (typeof this.config[colIndex].editable == "undefined" && this.config[colIndex].editor)) ? true : false;
    },

    /**
     * Returns the editor defined for the cell/column.
     * @param {Number} colIndex The column index
     * @param {Number} rowIndex The row index
     * @return {Ext.Editor} The {@link Ext.Editor Editor} that was created to wrap
     * the {@link Ext.form.Field Field} used to edit the cell.
     */
    getCellEditor : function(colIndex, rowIndex){
        return this.config[colIndex].getCellEditor(rowIndex);
    },

    /**
     * Sets if a column is editable.
     * @param {Number} col The column index
     * @param {Boolean} editable True if the column is editable
     */
    setEditable : function(col, editable){
        this.config[col].editable = editable;
    },


    /**
     * Returns true if the column is hidden.
     * @param {Number} colIndex The column index
     * @return {Boolean}
     */
    isHidden : function(colIndex){
        return this.config[colIndex].hidden;
    },


    /**
     * Returns true if the column width cannot be changed
     */
    isFixed : function(colIndex){
        return this.config[colIndex].fixed;
    },

    /**
     * Returns true if the column can be resized
     * @return {Boolean}
     */
    isResizable : function(colIndex){
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
    setHidden : function(colIndex, hidden){
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
    setEditor : function(col, editor){
        Ext.destroy(this.config[col].editor);
        this.config[col].editor = editor;
    },

    /**
     * Destroys this column model by purging any event listeners, and removing any editors.
     */
    destroy : function(){
        for(var i = 0, c = this.config, len = c.length; i < len; i++){
            Ext.destroy(c[i].editor);
        }
        this.purgeListeners();
    }
});

// private
Ext.grid.ColumnModel.defaultRenderer = function(value){
    if(typeof value == "string" && value.length < 1){
        return "&#160;";
    }
    return value;
};/**
 * @class Ext.grid.AbstractSelectionModel
 * @extends Ext.util.Observable
 * Abstract base class for grid SelectionModels.  It provides the interface that should be
 * implemented by descendant classes.  This class should not be directly instantiated.
 * @constructor
 */
Ext.grid.AbstractSelectionModel = function(){
    this.locked = false;
    Ext.grid.AbstractSelectionModel.superclass.constructor.call(this);
};

Ext.extend(Ext.grid.AbstractSelectionModel, Ext.util.Observable,  {
    /**
     * The GridPanel for which this SelectionModel is handling selection. Read-only.
     * @type Object
     * @property grid
     */

    /** @ignore Called by the grid automatically. Do not call directly. */
    init : function(grid){
        this.grid = grid;
        this.initEvents();
    },

    /**
     * Locks the selections.
     */
    lock : function(){
        this.locked = true;
    },

    /**
     * Unlocks the selections.
     */
    unlock : function(){
        this.locked = false;
    },

    /**
     * Returns true if the selections are locked.
     * @return {Boolean}
     */
    isLocked : function(){
        return this.locked;
    },
    
    destroy: function(){
        this.purgeListeners();
    }
});/**
 * @class Ext.grid.RowSelectionModel
 * @extends Ext.grid.AbstractSelectionModel
 * The default SelectionModel used by {@link Ext.grid.GridPanel}.
 * It supports multiple selections and keyboard selection/navigation. The objects stored
 * as selections and returned by {@link #getSelected}, and {@link #getSelections} are
 * the {@link Ext.data.Record Record}s which provide the data for the selected rows.
 * @constructor
 * @param {Object} config
 */
Ext.grid.RowSelectionModel = function(config){
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
        "selectionchange",
        /**
         * @event beforerowselect
         * Fires before a row is selected, return false to cancel the selection.
         * @param {SelectionModel} this
         * @param {Number} rowIndex The index to be selected
         * @param {Boolean} keepExisting False if other selections will be cleared
         * @param {Record} record The record to be selected
         */
        "beforerowselect",
        /**
         * @event rowselect
         * Fires when a row is selected.
         * @param {SelectionModel} this
         * @param {Number} rowIndex The selected index
         * @param {Ext.data.Record} r The selected record
         */
        "rowselect",
        /**
         * @event rowdeselect
         * Fires when a row is deselected.  To prevent deselection
         * {@link Ext.grid.AbstractSelectionModel#lock lock the selections}. 
         * @param {SelectionModel} this
         * @param {Number} rowIndex
         * @param {Record} record
         */
        "rowdeselect"
    );

    Ext.grid.RowSelectionModel.superclass.constructor.call(this);
};

Ext.extend(Ext.grid.RowSelectionModel, Ext.grid.AbstractSelectionModel,  {
    /**
     * @cfg {Boolean} singleSelect
     * <tt>true</tt> to allow selection of only one row at a time (defaults to <tt>false</tt>
     * allowing multiple selections)
     */
    singleSelect : false,

    /**
     * @cfg {Boolean} moveEditorOnEnter
     * <tt>false</tt> to turn off moving the editor to the next row down when the enter key is pressed
     * or the next row up when shift + enter keys are pressed.
     */
    // private
    initEvents : function(){

        if(!this.grid.enableDragDrop && !this.grid.enableDrag){
            this.grid.on("rowmousedown", this.handleMouseDown, this);
        }else{ // allow click to work like normal
            this.grid.on("rowclick", function(grid, rowIndex, e) {
                if(e.button === 0 && !e.shiftKey && !e.ctrlKey) {
                    this.selectRow(rowIndex, false);
                    grid.view.focusRow(rowIndex);
                }
            }, this);
        }

        this.rowNav = new Ext.KeyNav(this.grid.getGridEl(), {
            "up" : function(e){
                if(!e.shiftKey || this.singleSelect){
                    this.selectPrevious(false);
                }else if(this.last !== false && this.lastActive !== false){
                    var last = this.last;
                    this.selectRange(this.last,  this.lastActive-1);
                    this.grid.getView().focusRow(this.lastActive);
                    if(last !== false){
                        this.last = last;
                    }
                }else{
                    this.selectFirstRow();
                }
            },
            "down" : function(e){
                if(!e.shiftKey || this.singleSelect){
                    this.selectNext(false);
                }else if(this.last !== false && this.lastActive !== false){
                    var last = this.last;
                    this.selectRange(this.last,  this.lastActive+1);
                    this.grid.getView().focusRow(this.lastActive);
                    if(last !== false){
                        this.last = last;
                    }
                }else{
                    this.selectFirstRow();
                }
            },
            scope: this
        });

        var view = this.grid.view;
        view.on("refresh", this.onRefresh, this);
        view.on("rowupdated", this.onRowUpdated, this);
        view.on("rowremoved", this.onRemove, this);
    },

    // private
    onRefresh : function(){
        var ds = this.grid.store, index;
        var s = this.getSelections();
        this.clearSelections(true);
        for(var i = 0, len = s.length; i < len; i++){
            var r = s[i];
            if((index = ds.indexOfId(r.id)) != -1){
                this.selectRow(index, true);
            }
        }
        if(s.length != this.selections.getCount()){
            this.fireEvent("selectionchange", this);
        }
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
        var ds = this.grid.store;
        for(var i = 0, len = records.length; i < len; i++){
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
     * @param {Function} fn
     * @param {Object} scope (optional)
     * @return {Boolean} true if all selections were iterated
     */
    each : function(fn, scope){
        var s = this.getSelections();
        for(var i = 0, len = s.length; i < len; i++){
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
            var ds = this.grid.store;
            var s = this.selections;
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
        var r = typeof index == "number" ? this.grid.store.getAt(index) : index;
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
        if(r && this.fireEvent("beforerowselect", this, index, keepExisting, r) !== false){
            if(!keepExisting || this.singleSelect){
                this.clearSelections();
            }
            this.selections.add(r);
            this.last = this.lastActive = index;
            if(!preventViewNotify){
                this.grid.getView().onRowSelect(index);
            }
            this.fireEvent("rowselect", this, index, r);
            this.fireEvent("selectionchange", this);
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
            this.fireEvent("rowdeselect", this, index, r);
            this.fireEvent("selectionchange", this);
        }
    },

    // private
    restoreLast : function(){
        if(this._last){
            this.last = this._last;
        }
    },

    // private
    acceptsNav : function(row, col, cm){
        return !cm.isHidden(col) && cm.isCellEditable(col, row);
    },

    // private
    onEditorKey : function(field, e){
        var k = e.getKey(), newCell, g = this.grid, ed = g.activeEditor;
        var shift = e.shiftKey;
        if(k == e.TAB){
            e.stopEvent();
            ed.completeEdit();
            if(shift){
                newCell = g.walkCells(ed.row, ed.col-1, -1, this.acceptsNav, this);
            }else{
                newCell = g.walkCells(ed.row, ed.col+1, 1, this.acceptsNav, this);
            }
        }else if(k == e.ENTER){
            e.stopEvent();
            ed.completeEdit();
            if(this.moveEditorOnEnter !== false){
                if(shift){
                    newCell = g.walkCells(ed.row - 1, ed.col, -1, this.acceptsNav, this);
                }else{
                    newCell = g.walkCells(ed.row + 1, ed.col, 1, this.acceptsNav, this);
                }
            }
        }else if(k == e.ESC){
            ed.cancelEdit();
        }
        if(newCell){
            g.startEditing(newCell[0], newCell[1]);
        }
    },
    
    destroy: function(){
        if(this.rowNav){
            this.rowNav.disable();
            this.rowNav = null;
        }
        Ext.grid.RowSelectionModel.superclass.destroy.call(this);
    }
});/**
 * @class Ext.grid.Column
 * <p>This class encapsulates column configuration data to be used in the initialization of a
 * {@link Ext.grid.ColumnModel ColumnModel}.</p>
 * <p>While subclasses are provided to render data in different ways, this class renders a passed
 * data field unchanged and is usually used for textual columns.</p>
 */
Ext.grid.Column = function(config){
    Ext.apply(this, config);

    if(typeof this.renderer == 'string'){
        this.renderer = Ext.util.Format[this.renderer];
    } else if(Ext.isObject(this.renderer)){
        this.scope = this.renderer.scope;
        this.renderer = this.renderer.fn;
    }
    this.renderer = this.renderer.createDelegate(this.scope || config);

    if(this.id === undefined){
        this.id = ++Ext.grid.Column.AUTO_ID;
    }
    if(this.editor){
        this.editor = Ext.create(this.editor, 'textfield');
    }
};

Ext.grid.Column.AUTO_ID = 0;

Ext.grid.Column.prototype = {
    /**
     * @cfg {Boolean} editable Optional. Defaults to <tt>true</tt>, enabling the configured
     * <tt>{@link #editor}</tt>.  Set to <tt>false</tt> to initially disable editing on this column.
     * The initial configuration may be dynamically altered using
     * {@link Ext.grid.ColumnModel}.{@link Ext.grid.ColumnModel#setEditable setEditable()}.
     */
    /**
     * @cfg {String} id Optional. A name which identifies this column (defaults to the column's initial
     * ordinal position.) The <tt>id</tt> is used to create a CSS <b>class</b> name which is applied to all
     * table cells (including headers) in that column (in this context the <tt>id</tt> does not need to be
     * unique). The class name takes the form of <pre>x-grid3-td-<b>id</b></pre>
     * Header cells will also receive this class name, but will also have the class <pre>x-grid3-hd</pre>
     * So, to target header cells, use CSS selectors such as:<pre>.x-grid3-hd-row .x-grid3-td-<b>id</b></pre>
     * The {@link Ext.grid.GridPanel#autoExpandColumn} grid config option references the column via this
     * unique identifier.
     */
    /**
     * @cfg {String} header Optional. The header text to be used as innerHTML
     * (html tags are accepted) to display in the Grid view.  <b>Note</b>: to
     * have a clickable header with no text displayed use <tt>'&#160;'</tt>.
     */
    /**
     * @cfg {Boolean} groupable Optional. If the grid is being rendered by an {@link Ext.grid.GroupingView}, this option
     * may be used to disable the header menu item to group by the column selected. Defaults to <tt>true</tt>,
     * which enables the header menu group option.  Set to <tt>false</tt> to disable (but still show) the
     * group option in the header menu for the column. See also <code>{@link #groupName}</code>.
     */
    /**
     * @cfg {String} groupName Optional. If the grid is being rendered by an {@link Ext.grid.GroupingView}, this option
     * may be used to specify the text with which to prefix the group field value in the group header line.
     * See also {@link #groupRenderer} and
     * {@link Ext.grid.GroupingView}.{@link Ext.grid.GroupingView#showGroupName showGroupName}.
     */
    /**
     * @cfg {Function} groupRenderer <p>Optional. If the grid is being rendered by an {@link Ext.grid.GroupingView}, this option
     * may be used to specify the function used to format the grouping field value for display in the group
     * {@link #groupName header}.  If a <tt><b>groupRenderer</b></tt> is not specified, the configured
     * <tt><b>{@link #renderer}</b></tt> will be called; if a <tt><b>{@link #renderer}</b></tt> is also not specified
     * the new value of the group field will be used.</p>
     * <p>The called function (either the <tt><b>groupRenderer</b></tt> or <tt><b>{@link #renderer}</b></tt>) will be
     * passed the following parameters:
     * <div class="mdetail-params"><ul>
     * <li><b>v</b> : Object<p class="sub-desc">The new value of the group field.</p></li>
     * <li><b>unused</b> : undefined<p class="sub-desc">Unused parameter.</p></li>
     * <li><b>r</b> : Ext.data.Record<p class="sub-desc">The Record providing the data
     * for the row which caused group change.</p></li>
     * <li><b>rowIndex</b> : Number<p class="sub-desc">The row index of the Record which caused group change.</p></li>
     * <li><b>colIndex</b> : Number<p class="sub-desc">The column index of the group field.</p></li>
     * <li><b>ds</b> : Ext.data.Store<p class="sub-desc">The Store which is providing the data Model.</p></li>
     * </ul></div></p>
     * <p>The function should return a string value.</p>
     */
    /**
     * @cfg {String} emptyGroupText Optional. If the grid is being rendered by an {@link Ext.grid.GroupingView}, this option
     * may be used to specify the text to display when there is an empty group value. Defaults to the
     * {@link Ext.grid.GroupingView}.{@link Ext.grid.GroupingView#emptyGroupText emptyGroupText}.
     */
    /**
     * @cfg {String} dataIndex <p><b>Required</b>. The name of the field in the
     * grid's {@link Ext.data.Store}'s {@link Ext.data.Record} definition from
     * which to draw the column's value.</p>
     */
    /**
     * @cfg {Number} width
     * Optional. The initial width in pixels of the column.
     * The width of each column can also be affected if any of the following are configured:
     * <div class="mdetail-params"><ul>
     * <li>{@link Ext.grid.GridPanel}.<tt>{@link Ext.grid.GridPanel#autoExpandColumn autoExpandColumn}</tt></li>
     * <li>{@link Ext.grid.GridView}.<tt>{@link Ext.grid.GridView#forceFit forceFit}</tt>
     * <div class="sub-desc">
     * <p>By specifying <tt>forceFit:true</tt>, {@link #fixed non-fixed width} columns will be
     * re-proportioned (based on the relative initial widths) to fill the width of the grid so
     * that no horizontal scrollbar is shown.</p>
     * </div></li>
     * <li>{@link Ext.grid.GridView}.<tt>{@link Ext.grid.GridView#autoFill autoFill}</tt></li>
     * <li>{@link Ext.grid.GridPanel}.<tt>{@link Ext.grid.GridPanel#minColumnWidth minColumnWidth}</tt></li>
     * <br><p><b>Note</b>: when the width of each column is determined, a space on the right side
     * is reserved for the vertical scrollbar.  The
     * {@link Ext.grid.GridView}.<tt>{@link Ext.grid.GridView#scrollOffset scrollOffset}</tt>
     * can be modified to reduce or eliminate the reserved offset.</p>
     */
    /**
     * @cfg {Boolean} sortable Optional. <tt>true</tt> if sorting is to be allowed on this column.
     * Defaults to the value of the {@link #defaultSortable} property.
     * Whether local/remote sorting is used is specified in {@link Ext.data.Store#remoteSort}.
     */
    /**
     * @cfg {Boolean} fixed Optional. <tt>true</tt> if the column width cannot be changed.  Defaults to <tt>false</tt>.
     */
    /**
     * @cfg {Boolean} resizable Optional. <tt>false</tt> to disable column resizing. Defaults to <tt>true</tt>.
     */
    /**
     * @cfg {Boolean} menuDisabled Optional. <tt>true</tt> to disable the column menu. Defaults to <tt>false</tt>.
     */
    /**
     * @cfg {Boolean} hidden Optional. <tt>true</tt> to hide the column. Defaults to <tt>false</tt>.
     */
    /**
     * @cfg {String} tooltip Optional. A text string to use as the column header's tooltip.  If Quicktips
     * are enabled, this value will be used as the text of the quick tip, otherwise it will be set as the
     * header's HTML title attribute. Defaults to ''.
     */
    /**
     * @cfg {Mixed} renderer
     * <p>For an alternative to specifying a renderer see <code>{@link #xtype}</code></p>
     * <p>Optional. A renderer is an 'interceptor' method which can be used transform data (value,
     * appearance, etc.) before it is rendered). This may be specified in either of three ways:
     * <div class="mdetail-params"><ul>
     * <li>A renderer function used to return HTML markup for a cell given the cell's data value.</li>
     * <li>A string which references a property name of the {@link Ext.util.Format} class which
     * provides a renderer function.</li>
     * <li>An object specifying both the renderer function, and its execution scope (<tt><b>this</b></tt>
     * reference) e.g.:<pre style="margin-left:1.2em"><code>
{
    fn: this.gridRenderer,
    scope: this
}
</code></pre></li></ul></div>
     * If not specified, the default renderer uses the raw data value.</p>
     * <p>For information about the renderer function (passed parameters, etc.), see
     * {@link Ext.grid.ColumnModel#setRenderer}. An example of specifying renderer function inline:</p><pre><code>
var companyColumn = {
   header: 'Company Name',
   dataIndex: 'company',
   renderer: function(value, metaData, record, rowIndex, colIndex, store) {
      // provide the logic depending on business rules
      // name of your own choosing to manipulate the cell depending upon
      // the data in the underlying Record object.
      if (value == 'whatever') {
          //metaData.css : String : A CSS class name to add to the TD element of the cell.
          //metaData.attr : String : An html attribute definition string to apply to
          //                         the data container element within the table
          //                         cell (e.g. 'style="color:red;"').
          metaData.css = 'name-of-css-class-you-will-define';
      }
      return value;
   }
}
     * </code></pre>
     * See also {@link #scope}.
     */
    /**
     * @cfg {String} xtype Optional. A String which references a predefined {@link Ext.grid.Column} subclass
     * type which is preconfigured with an appropriate <code>{@link #renderer}</code> to be easily
     * configured into a ColumnModel. The predefined {@link Ext.grid.Column} subclass types are:
     * <div class="mdetail-params"><ul>
     * <li><b><tt>gridcolumn</tt></b> : {@link Ext.grid.Column} (<b>Default</b>)<p class="sub-desc"></p></li>
     * <li><b><tt>booleancolumn</tt></b> : {@link Ext.grid.BooleanColumn}<p class="sub-desc"></p></li>
     * <li><b><tt>numbercolumn</tt></b> : {@link Ext.grid.NumberColumn}<p class="sub-desc"></p></li>
     * <li><b><tt>datecolumn</tt></b> : {@link Ext.grid.DateColumn}<p class="sub-desc"></p></li>
     * <li><b><tt>templatecolumn</tt></b> : {@link Ext.grid.TemplateColumn}<p class="sub-desc"></p></li>
     * </ul></div>
     * <p>Configuration properties for the specified <code>xtype</code> may be specified with
     * the Column configuration properties, for example:</p>
     * <pre><code>
var grid = new Ext.grid.GridPanel({
    ...
    columns: [{
        header: 'Last Updated',
        dataIndex: 'lastChange',
        width: 85,
        sortable: true,
        //renderer: Ext.util.Format.dateRenderer('m/d/Y'),
        xtype: 'datecolumn', // use xtype instead of renderer
        format: 'M/d/Y' // configuration property for {@link Ext.grid.DateColumn}
    }, {
        ...
    }]
});
     * </code></pre>
     */
    /**
     * @cfg {Object} scope Optional. The scope (<tt><b>this</b></tt> reference) in which to execute the
     * renderer.  Defaults to the Column configuration object.
     */
    /**
     * @cfg {String} align Optional. Set the CSS text-align property of the column.  Defaults to undefined.
     */
    /**
     * @cfg {String} css Optional. An inline style definition string which is applied to all table cells in the column
     * (excluding headers). Defaults to undefined.
     */
    /**
     * @cfg {Boolean} hideable Optional. Specify as <tt>false</tt> to prevent the user from hiding this column
     * (defaults to true).  To disallow column hiding globally for all columns in the grid, use
     * {@link Ext.grid.GridPanel#enableColumnHide} instead.
     */
    /**
     * @cfg {Ext.form.Field} editor Optional. The {@link Ext.form.Field} to use when editing values in this column
     * if editing is supported by the grid. See <tt>{@link #editable}</tt> also.
     */

    // private. Used by ColumnModel to avoid reprocessing
    isColumn : true,
    /**
     * Optional. A function which returns displayable data when passed the following parameters:
     * <div class="mdetail-params"><ul>
     * <li><b>value</b> : Object<p class="sub-desc">The data value for the cell.</p></li>
     * <li><b>metadata</b> : Object<p class="sub-desc">An object in which you may set the following attributes:<ul>
     * <li><b>css</b> : String<p class="sub-desc">A CSS class name to add to the cell's TD element.</p></li>
     * <li><b>attr</b> : String<p class="sub-desc">An HTML attribute definition string to apply to the data container
     * element <i>within</i> the table cell (e.g. 'style="color:red;"').</p></li></ul></p></li>
     * <li><b>record</b> : Ext.data.record<p class="sub-desc">The {@link Ext.data.Record} from which the data was
     * extracted.</p></li>
     * <li><b>rowIndex</b> : Number<p class="sub-desc">Row index</p></li>
     * <li><b>colIndex</b> : Number<p class="sub-desc">Column index</p></li>
     * <li><b>store</b> : Ext.data.Store<p class="sub-desc">The {@link Ext.data.Store} object from which the Record
     * was extracted.</p></li>
     * </ul></div>
     * @property renderer
     * @type Function
     */
    renderer : function(value){
        if(typeof value == 'string' && value.length < 1){
            return '&#160;';
        }
        return value;
    },

    // private
    getEditor: function(rowIndex){
        return this.editable !== false ? this.editor : null;
    },

    /**
     * Returns the {@link Ext.Editor editor} defined for this column that was created to wrap the {@link Ext.form.Field Field}
     * used to edit the cell.
     * @param {Number} rowIndex The row index
     * @return {Ext.Editor}
     */
    getCellEditor: function(rowIndex){
        var editor = this.getEditor(rowIndex);
        if(editor){
            if(!editor.startEdit){
                if(!editor.gridEditor){
                    editor.gridEditor = new Ext.grid.GridEditor(editor);
                }
                return editor.gridEditor;
            }else if(editor.startEdit){
                return editor;
            }
        }
        return null;
    }
};

/**
 * @class Ext.grid.BooleanColumn
 * @extends Ext.grid.Column
 * <p>A Column definition class which renders boolean data fields.  See the {@link Ext.grid.ColumnModel#xtype xtype}
 * config option of {@link Ext.grid.ColumnModel} for more details.</p>
 */
Ext.grid.BooleanColumn = Ext.extend(Ext.grid.Column, {
    /**
     * @cfg {String} trueText
     * The string returned by the renderer when the column value is not falsey (defaults to <tt>'true'</tt>).
     */
    trueText: 'true',
    /**
     * @cfg {String} falseText
     * The string returned by the renderer when the column value is falsey (but not undefined) (defaults to
     * <tt>'false'</tt>).
     */
    falseText: 'false',
    /**
     * @cfg {String} undefinedText
     * The string returned by the renderer when the column value is undefined (defaults to <tt>'&#160;'</tt>).
     */
    undefinedText: '&#160;',

    constructor: function(cfg){
        Ext.grid.BooleanColumn.superclass.constructor.call(this, cfg);
        var t = this.trueText, f = this.falseText, u = this.undefinedText;
        this.renderer = function(v){
            if(v === undefined){
                return u;
            }
            if(!v || v === 'false'){
                return f;
            }
            return t;
        };
    }
});

/**
 * @class Ext.grid.NumberColumn
 * @extends Ext.grid.Column
 * <p>A Column definition class which renders a numeric data field according to a {@link #format} string.  See the
 * {@link Ext.grid.ColumnModel#xtype xtype} config option of {@link Ext.grid.ColumnModel} for more details.</p>
 */
Ext.grid.NumberColumn = Ext.extend(Ext.grid.Column, {
    /**
     * @cfg {String} format
     * A formatting string as used by {@link Ext.util.Format#number} to format a numeric value for this Column
     * (defaults to <tt>'0,000.00'</tt>).
     */
    format : '0,000.00',
    constructor: function(cfg){
        Ext.grid.NumberColumn.superclass.constructor.call(this, cfg);
        this.renderer = Ext.util.Format.numberRenderer(this.format);
    }
});

/**
 * @class Ext.grid.DateColumn
 * @extends Ext.grid.Column
 * <p>A Column definition class which renders a passed date according to the default locale, or a configured
 * {@link #format}. See the {@link Ext.grid.ColumnModel#xtype xtype} config option of {@link Ext.grid.ColumnModel}
 * for more details.</p>
 */
Ext.grid.DateColumn = Ext.extend(Ext.grid.Column, {
    /**
     * @cfg {String} format
     * A formatting string as used by {@link Date#format} to format a Date for this Column
     * (defaults to <tt>'m/d/Y'</tt>).
     */
    format : 'm/d/Y',
    constructor: function(cfg){
        Ext.grid.DateColumn.superclass.constructor.call(this, cfg);
        this.renderer = Ext.util.Format.dateRenderer(this.format);
    }
});

/**
 * @class Ext.grid.TemplateColumn
 * @extends Ext.grid.Column
 * <p>A Column definition class which renders a value by processing a {@link Ext.data.Record Record}'s
 * {@link Ext.data.Record#data data} using a {@link #tpl configured} {@link Ext.XTemplate XTemplate}.
 * See the {@link Ext.grid.ColumnModel#xtype xtype} config option of {@link Ext.grid.ColumnModel} for more
 * details.</p>
 */
Ext.grid.TemplateColumn = Ext.extend(Ext.grid.Column, {
    /**
     * @cfg {String/XTemplate} tpl
     * An {@link Ext.XTemplate XTemplate}, or an XTemplate <i>definition string</i> to use to process a
     * {@link Ext.data.Record Record}'s {@link Ext.data.Record#data data} to produce a column's rendered value.
     */
    constructor: function(cfg){
        Ext.grid.TemplateColumn.superclass.constructor.call(this, cfg);
        var tpl = typeof Ext.isObject(this.tpl) ? this.tpl : new Ext.XTemplate(this.tpl);
        this.renderer = function(value, p, r){
            return tpl.apply(r.data);
        };
        this.tpl = tpl;
    }
});

/*
 * @property types
 * @type Object
 * @member Ext.grid.Column
 * @static
 * <p>An object containing predefined Column classes keyed by a mnemonic code which may be referenced
 * by the {@link Ext.grid.ColumnModel#xtype xtype} config option of ColumnModel.</p>
 * <p>This contains the following properties</p><div class="mdesc-details"><ul>
 * <li>gridcolumn : <b>{@link Ext.grid.Column Column constructor}</b></li>
 * <li>booleancolumn : <b>{@link Ext.grid.BooleanColumn BooleanColumn constructor}</b></li>
 * <li>numbercolumn : <b>{@link Ext.grid.NumberColumn NumberColumn constructor}</b></li>
 * <li>datecolumn : <b>{@link Ext.grid.DateColumn DateColumn constructor}</b></li>
 * <li>templatecolumn : <b>{@link Ext.grid.TemplateColumn TemplateColumn constructor}</b></li>
 * </ul></div>
 */
Ext.grid.Column.types = {
    gridcolumn : Ext.grid.Column,
    booleancolumn: Ext.grid.BooleanColumn,
    numbercolumn: Ext.grid.NumberColumn,
    datecolumn: Ext.grid.DateColumn,
    templatecolumn: Ext.grid.TemplateColumn
};/**
 * @class Ext.grid.RowNumberer
 * This is a utility class that can be passed into a {@link Ext.grid.ColumnModel} as a column config that provides
 * an automatic row numbering column.
 * <br>Usage:<br>
 <pre><code>
 // This is a typical column config with the first column providing row numbers
 var colModel = new Ext.grid.ColumnModel([
    new Ext.grid.RowNumberer(),
    {header: "Name", width: 80, sortable: true},
    {header: "Code", width: 50, sortable: true},
    {header: "Description", width: 200, sortable: true}
 ]);
 </code></pre>
 * @constructor
 * @param {Object} config The configuration options
 */
Ext.grid.RowNumberer = function(config){
    Ext.apply(this, config);
    if(this.rowspan){
        this.renderer = this.renderer.createDelegate(this);
    }
};

Ext.grid.RowNumberer.prototype = {
    /**
     * @cfg {String} header Any valid text or HTML fragment to display in the header cell for the row
     * number column (defaults to '').
     */
    header: "",
    /**
     * @cfg {Number} width The default width in pixels of the row number column (defaults to 23).
     */
    width: 23,
    /**
     * @cfg {Boolean} sortable True if the row number column is sortable (defaults to false).
     * @hide
     */
    sortable: false,

    // private
    fixed:true,
    menuDisabled:true,
    dataIndex: '',
    id: 'numberer',
    rowspan: undefined,

    // private
    renderer : function(v, p, record, rowIndex){
        if(this.rowspan){
            p.cellAttr = 'rowspan="'+this.rowspan+'"';
        }
        return rowIndex+1;
    }
};/**
 * @class Ext.grid.CheckboxSelectionModel
 * @extends Ext.grid.RowSelectionModel
 * A custom selection model that renders a column of checkboxes that can be toggled to select or deselect rows.
 * @constructor
 * @param {Object} config The configuration options
 */
Ext.grid.CheckboxSelectionModel = Ext.extend(Ext.grid.RowSelectionModel, {

    /**
     * @cfg {Boolean} checkOnly <tt>true</tt> if rows can only be selected by clicking on the
     * checkbox column (defaults to <tt>false</tt>).
     */
    /**
     * @cfg {String} header Any valid text or HTML fragment to display in the header cell for the
     * checkbox column.  Defaults to:<pre><code>
     * '&lt;div class="x-grid3-hd-checker">&#38;#160;&lt;/div>'</tt>
     * </code></pre>
     * The default CSS class of <tt>'x-grid3-hd-checker'</tt> displays a checkbox in the header
     * and provides support for automatic check all/none behavior on header click. This string
     * can be replaced by any valid HTML fragment, including a simple text string (e.g.,
     * <tt>'Select Rows'</tt>), but the automatic check all/none behavior will only work if the
     * <tt>'x-grid3-hd-checker'</tt> class is supplied.
     */
    header: '<div class="x-grid3-hd-checker">&#160;</div>',
    /**
     * @cfg {Number} width The default width in pixels of the checkbox column (defaults to <tt>20</tt>).
     */
    width: 20,
    /**
     * @cfg {Boolean} sortable <tt>true</tt> if the checkbox column is sortable (defaults to
     * <tt>false</tt>).
     */
    sortable: false,

    // private
    menuDisabled:true,
    fixed:true,
    dataIndex: '',
    id: 'checker',

    constructor: function(){
        Ext.grid.CheckboxSelectionModel.superclass.constructor.apply(this, arguments);

        if(this.checkOnly){
            this.handleMouseDown = Ext.emptyFn;
        }
    },

    // private
    initEvents : function(){
        Ext.grid.CheckboxSelectionModel.superclass.initEvents.call(this);
        this.grid.on('render', function(){
            var view = this.grid.getView();
            view.mainBody.on('mousedown', this.onMouseDown, this);
            Ext.fly(view.innerHd).on('mousedown', this.onHdMouseDown, this);

        }, this);
    },

    // private
    onMouseDown : function(e, t){
        if(e.button === 0 && t.className == 'x-grid3-row-checker'){ // Only fire if left-click
            e.stopEvent();
            var row = e.getTarget('.x-grid3-row');
            if(row){
                var index = row.rowIndex;
                if(this.isSelected(index)){
                    this.deselectRow(index);
                }else{
                    this.selectRow(index, true);
                }
            }
        }
    },

    // private
    onHdMouseDown : function(e, t){
        if(t.className == 'x-grid3-hd-checker'){
            e.stopEvent();
            var hd = Ext.fly(t.parentNode);
            var isChecked = hd.hasClass('x-grid3-hd-checker-on');
            if(isChecked){
                hd.removeClass('x-grid3-hd-checker-on');
                this.clearSelections();
            }else{
                hd.addClass('x-grid3-hd-checker-on');
                this.selectAll();
            }
        }
    },

    // private
    renderer : function(v, p, record){
        return '<div class="x-grid3-row-checker">&#160;</div>';
    }
});