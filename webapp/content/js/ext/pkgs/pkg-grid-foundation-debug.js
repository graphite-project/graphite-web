/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
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
    {@link #store}: new {@link Ext.data.Store}({
        {@link Ext.data.Store#autoDestroy autoDestroy}: true,
        {@link Ext.data.Store#reader reader}: reader,
        {@link Ext.data.Store#data data}: xg.dummyData
    }),
    {@link #colModel}: new {@link Ext.grid.ColumnModel}({
        {@link Ext.grid.ColumnModel#defaults defaults}: {
            width: 120,
            sortable: true
        },
        {@link Ext.grid.ColumnModel#columns columns}: [
            {id: 'company', header: 'Company', width: 200, sortable: true, dataIndex: 'company'},
            {header: 'Price', renderer: Ext.util.Format.usMoney, dataIndex: 'price'},
            {header: 'Change', dataIndex: 'change'},
            {header: '% Change', dataIndex: 'pctChange'},
            // instead of specifying renderer: Ext.util.Format.dateRenderer('m/d/Y') use xtype
            {
                header: 'Last Updated', width: 135, dataIndex: 'lastChange',
                xtype: 'datecolumn', format: 'M d, Y'
            }
        ],
    }),
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
     * @cfg {Boolean} enableColumnHide
     * Defaults to <tt>true</tt> to enable {@link Ext.grid.Column#hidden hiding of columns}
     * with the {@link #enableHdMenu header menu}.
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
     * stateEvents: ['columnmove', 'columnresize', 'sortchange', 'groupchange']
     * </code></pre>
     * <p>These can be any types of events supported by this component, including browser or
     * custom events (e.g., <tt>['click', 'customerchange']</tt>).</p>
     * <p>See {@link Ext.Component#stateful} for an explanation of saving and restoring
     * Component state.</p>
     */
    stateEvents : ['columnmove', 'columnresize', 'sortchange', 'groupchange'],
    
    /**
     * @cfg {Object} view The {@link Ext.grid.GridView} used by the grid. This can be set
     * before a call to {@link Ext.Component#render render()}.
     */
    view : null,

    /**
     * @cfg {Array} bubbleEvents
     * <p>An array of events that, when fired, should be bubbled to any parent container.
     * See {@link Ext.util.Observable#enableBubble}.
     * Defaults to <tt>[]</tt>.
     */
    bubbleEvents: [],

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
    initComponent : function() {
        Ext.grid.GridPanel.superclass.initComponent.call(this);

        if (this.columnLines) {
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
             * @event groupmousedown
             * Fires before a group header is clicked. <b>Only applies for grids with a {@link Ext.grid.GroupingView GroupingView}</b>.
             * @param {Grid} this
             * @param {String} groupField
             * @param {String} groupValue
             * @param {Ext.EventObject} e
             */
            'groupmousedown',

            /**
             * @event rowbodymousedown
             * Fires before the row body is clicked. <b>Only applies for grids with {@link Ext.grid.GridView#enableRowBody enableRowBody} configured.</b>
             * @param {Grid} this
             * @param {Number} rowIndex
             * @param {Ext.EventObject} e
             */
            'rowbodymousedown',

            /**
             * @event containermousedown
             * Fires before the container is clicked. The container consists of any part of the grid body that is not covered by a row.
             * @param {Grid} this
             * @param {Ext.EventObject} e
             */
            'containermousedown',

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
             * @event groupclick
             * Fires when group header is clicked. <b>Only applies for grids with a {@link Ext.grid.GroupingView GroupingView}</b>.
             * @param {Grid} this
             * @param {String} groupField
             * @param {String} groupValue
             * @param {Ext.EventObject} e
             */
            'groupclick',
            /**
             * @event groupdblclick
             * Fires when group header is double clicked. <b>Only applies for grids with a {@link Ext.grid.GroupingView GroupingView}</b>.
             * @param {Grid} this
             * @param {String} groupField
             * @param {String} groupValue
             * @param {Ext.EventObject} e
             */
            'groupdblclick',
            /**
             * @event containerclick
             * Fires when the container is clicked. The container consists of any part of the grid body that is not covered by a row.
             * @param {Grid} this
             * @param {Ext.EventObject} e
             */
            'containerclick',
            /**
             * @event containerdblclick
             * Fires when the container is double clicked. The container consists of any part of the grid body that is not covered by a row.
             * @param {Grid} this
             * @param {Ext.EventObject} e
             */
            'containerdblclick',

            /**
             * @event rowbodyclick
             * Fires when the row body is clicked. <b>Only applies for grids with {@link Ext.grid.GridView#enableRowBody enableRowBody} configured.</b>
             * @param {Grid} this
             * @param {Number} rowIndex
             * @param {Ext.EventObject} e
             */
            'rowbodyclick',
            /**
             * @event rowbodydblclick
             * Fires when the row body is double clicked. <b>Only applies for grids with {@link Ext.grid.GridView#enableRowBody enableRowBody} configured.</b>
             * @param {Grid} this
             * @param {Number} rowIndex
             * @param {Ext.EventObject} e
             */
            'rowbodydblclick',

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
             * @event groupcontextmenu
             * Fires when group header is right clicked. <b>Only applies for grids with a {@link Ext.grid.GroupingView GroupingView}</b>.
             * @param {Grid} this
             * @param {String} groupField
             * @param {String} groupValue
             * @param {Ext.EventObject} e
             */
            'groupcontextmenu',
            /**
             * @event containercontextmenu
             * Fires when the container is right clicked. The container consists of any part of the grid body that is not covered by a row.
             * @param {Grid} this
             * @param {Ext.EventObject} e
             */
            'containercontextmenu',
            /**
             * @event rowbodycontextmenu
             * Fires when the row body is right clicked. <b>Only applies for grids with {@link Ext.grid.GridView#enableRowBody enableRowBody} configured.</b>
             * @param {Grid} this
             * @param {Number} rowIndex
             * @param {Ext.EventObject} e
             */
            'rowbodycontextmenu',
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
             * @event groupchange
             * Fires when the grid's grouping changes (only applies for grids with a {@link Ext.grid.GroupingView GroupingView})
             * @param {Grid} this
             * @param {String} groupField A string with the grouping field, null if the store is not grouped.
             */
            'groupchange',
            /**
             * @event reconfigure
             * Fires when the grid is reconfigured with a new store and/or column model.
             * @param {Grid} this
             * @param {Ext.data.Store} store The new store
             * @param {Ext.grid.ColumnModel} colModel The new column model
             */
            'reconfigure',
            /**
             * @event viewready
             * Fires when the grid view is available (use this for selecting a default row).
             * @param {Grid} this
             */
            'viewready'
        );
    },

    // private
    onRender : function(ct, position){
        Ext.grid.GridPanel.superclass.onRender.apply(this, arguments);

        var c = this.getGridEl();

        this.el.addClass('x-grid-panel');

        this.mon(c, {
            scope: this,
            mousedown: this.onMouseDown,
            click: this.onClick,
            dblclick: this.onDblClick,
            contextmenu: this.onContextMenu
        });

        this.relayEvents(c, ['mousedown','mouseup','mouseover','mouseout','keypress', 'keydown']);

        var view = this.getView();
        view.init(this);
        view.render();
        this.getSelectionModel().init(this);
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
        var cm = this.colModel,
            cs = state.columns,
            store = this.store,
            s,
            c,
            colIndex;

        if(cs){
            for(var i = 0, len = cs.length; i < len; i++){
                s = cs[i];
                c = cm.getColumnById(s.id);
                if(c){
                    colIndex = cm.getIndexById(s.id);
                    cm.setState(colIndex, {
                        hidden: s.hidden,
                        width: s.width,
                        sortable: s.sortable
                    });
                    if(colIndex != i){
                        cm.moveColumn(colIndex, i);
                    }
                }
            }
        }
        if(store){
            s = state.sort;
            if(s){
                store[store.remoteSort ? 'setDefaultSort' : 'sort'](s.field, s.direction);
            }
            s = state.group;
            if(store.groupBy){
                if(s){
                    store.groupBy(s);
                }else{
                    store.clearGrouping();
                }
            }

        }
        var o = Ext.apply({}, state);
        delete o.columns;
        delete o.sort;
        Ext.grid.GridPanel.superclass.applyState.call(this, o);
    },

    getState : function(){
        var o = {columns: []},
            store = this.store,
            ss,
            gs;

        for(var i = 0, c; (c = this.colModel.config[i]); i++){
            o.columns[i] = {
                id: c.id,
                width: c.width
            };
            if(c.hidden){
                o.columns[i].hidden = true;
            }
            if(c.sortable){
                o.columns[i].sortable = true;
            }
        }
        if(store){
            ss = store.getSortState();
            if(ss){
                o.sort = ss;
            }
            if(store.getGroupState){
                gs = store.getGroupState();
                if(gs){
                    o.group = gs;
                }
            }
        }
        return o;
    },

    // private
    afterRender : function(){
        Ext.grid.GridPanel.superclass.afterRender.call(this);
        var v = this.view;
        this.on('bodyresize', v.layout, v);
        v.layout(true);
        if(this.deferRowRender){
            if (!this.deferRowRenderTask){
                this.deferRowRenderTask = new Ext.util.DelayedTask(v.afterRender, this.view);
            }
            this.deferRowRenderTask.delay(10);
        }else{
            v.afterRender();
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
        var rendered = this.rendered;
        if(rendered){
            if(this.loadMask){
                this.loadMask.destroy();
                this.loadMask = new Ext.LoadMask(this.bwrap,
                        Ext.apply({}, {store:store}, this.initialConfig.loadMask));
            }
        }
        if(this.view){
            this.view.initData(store, colModel);
        }
        this.store = store;
        this.colModel = colModel;
        if(rendered){
            this.view.refresh(true);
        }
        this.fireEvent('reconfigure', this, store, colModel);
    },

    // private
    onDestroy : function(){
        if (this.deferRowRenderTask && this.deferRowRenderTask.cancel){
            this.deferRowRenderTask.cancel();
        }
        if(this.rendered){
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
        this.view.processEvent(name, e);
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
        var cm    = this.colModel,
            clen  = cm.getColumnCount(),
            ds    = this.store,
            rlen  = ds.getCount(),
            first = true;

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
    getView : function() {
        if (!this.view) {
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
     * @event afterlayout
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
 * @class Ext.grid.PivotGrid
 * @extends Ext.grid.GridPanel
 * <p>The PivotGrid component enables rapid summarization of large data sets. It provides a way to reduce a large set of
 * data down into a format where trends and insights become more apparent. A classic example is in sales data; a company
 * will often have a record of all sales it makes for a given period - this will often encompass thousands of rows of
 * data. The PivotGrid allows you to see how well each salesperson performed, which cities generate the most revenue, 
 * how products perform between cities and so on.</p>
 * <p>A PivotGrid is composed of two axes (left and top), one {@link #measure} and one {@link #aggregator aggregation}
 * function. Each axis can contain one or more {@link #dimension}, which are ordered into a hierarchy. Dimensions on the 
 * left axis can also specify a width. Each dimension in each axis can specify its sort ordering, defaulting to "ASC", 
 * and must specify one of the fields in the {@link Ext.data.Record Record} used by the PivotGrid's 
 * {@link Ext.data.Store Store}.</p>
<pre><code>
// This is the record representing a single sale
var SaleRecord = Ext.data.Record.create([
    {name: 'person',   type: 'string'},
    {name: 'product',  type: 'string'},
    {name: 'city',     type: 'string'},
    {name: 'state',    type: 'string'},
    {name: 'year',     type: 'int'},
    {name: 'value',    type: 'int'}
]);

// A simple store that loads SaleRecord data from a url
var myStore = new Ext.data.Store({
    url: 'data.json',
    autoLoad: true,
    reader: new Ext.data.JsonReader({
        root: 'rows',
        idProperty: 'id'
    }, SaleRecord)
});

// Create the PivotGrid itself, referencing the store
var pivot = new Ext.grid.PivotGrid({
    store     : myStore,
    aggregator: 'sum',
    measure   : 'value',

    leftAxis: [
        {
            width: 60,
            dataIndex: 'product'
        },
        {
            width: 120,
            dataIndex: 'person',
            direction: 'DESC'
        }
    ],

    topAxis: [
        {
            dataIndex: 'year'
        }
    ]
});
</code></pre>
 * <p>The specified {@link #measure} is the field from SaleRecord that is extracted from each combination
 * of product and person (on the left axis) and year on the top axis. There may be several SaleRecords in the 
 * data set that share this combination, so an array of measure fields is produced. This array is then 
 * aggregated using the {@link #aggregator} function.</p>
 * <p>The default aggregator function is sum, which simply adds up all of the extracted measure values. Other
 * built-in aggregator functions are count, avg, min and max. In addition, you can specify your own function.
 * In this example we show the code used to sum the measures, but you can return any value you like. See
 * {@link #aggregator} for more details.</p>
<pre><code>
new Ext.grid.PivotGrid({
    aggregator: function(records, measure) {
        var length = records.length,
            total  = 0,
            i;

        for (i = 0; i < length; i++) {
            total += records[i].get(measure);
        }

        return total;
    },
    
    renderer: function(value) {
        return Math.round(value);
    },
    
    //your normal config here
});
</code></pre>
 * <p><u>Renderers</u></p>
 * <p>PivotGrid optionally accepts a {@link #renderer} function which can modify the data in each cell before it
 * is rendered. The renderer is passed the value that would usually be placed in the cell and is expected to return
 * the new value. For example let's imagine we had height data expressed as a decimal - here's how we might use a
 * renderer to display the data in feet and inches notation:</p>
<pre><code>
new Ext.grid.PivotGrid({
    //in each case the value is a decimal number of feet
    renderer  : function(value) {
        var feet   = Math.floor(value),
            inches = Math.round((value - feet) * 12);

        return String.format("{0}' {1}\"", feet, inches);
    },
    //normal config here
});
</code></pre>
 * <p><u>Reconfiguring</u></p>
 * <p>All aspects PivotGrid's configuration can be updated at runtime. It is easy to change the {@link #setMeasure measure}, 
 * {@link #setAggregator aggregation function}, {@link #setLeftAxis left} and {@link #setTopAxis top} axes and refresh the grid.</p>
 * <p>In this case we reconfigure the PivotGrid to have city and year as the top axis dimensions, rendering the average sale
 * value into the cells:</p>
<pre><code>
//the left axis can also be changed
pivot.topAxis.setDimensions([
    {dataIndex: 'city', direction: 'DESC'},
    {dataIndex: 'year', direction: 'ASC'}
]);

pivot.setMeasure('value');
pivot.setAggregator('avg');

pivot.view.refresh(true);
</code></pre>
 * <p>See the {@link Ext.grid.PivotAxis PivotAxis} documentation for further detail on reconfiguring axes.</p>
 */
Ext.grid.PivotGrid = Ext.extend(Ext.grid.GridPanel, {
    
    /**
     * @cfg {String|Function} aggregator The aggregation function to use to combine the measures extracted
     * for each dimension combination. Can be any of the built-in aggregators (sum, count, avg, min, max).
     * Can also be a function which accepts two arguments (an array of Records to aggregate, and the measure 
     * to aggregate them on) and should return a String.
     */
    aggregator: 'sum',
    
    /**
     * @cfg {Function} renderer Optional renderer to pass values through before they are rendered to the dom. This
     * gives an opportunity to modify cell contents after the value has been computed.
     */
    renderer: undefined,
    
    /**
     * @cfg {String} measure The field to extract from each Record when pivoting around the two axes. See the class
     * introduction docs for usage
     */
    
    /**
     * @cfg {Array|Ext.grid.PivotAxis} leftAxis Either and array of {@link #dimension} to use on the left axis, or
     * a {@link Ext.grid.PivotAxis} instance. If an array is passed, it is turned into a PivotAxis internally.
     */
    
    /**
     * @cfg {Array|Ext.grid.PivotAxis} topAxis Either and array of {@link #dimension} to use on the top axis, or
     * a {@link Ext.grid.PivotAxis} instance. If an array is passed, it is turned into a PivotAxis internally.
     */
    
    //inherit docs
    initComponent: function() {
        Ext.grid.PivotGrid.superclass.initComponent.apply(this, arguments);
        
        this.initAxes();
        
        //no resizing of columns is allowed yet in PivotGrid
        this.enableColumnResize = false;
        
        this.viewConfig = Ext.apply(this.viewConfig || {}, {
            forceFit: true
        });
        
        //TODO: dummy col model that is never used - GridView is too tightly integrated with ColumnModel
        //in 3.x to remove this altogether.
        this.colModel = new Ext.grid.ColumnModel({});
    },
    
    /**
     * Returns the function currently used to aggregate the records in each Pivot cell
     * @return {Function} The current aggregator function
     */
    getAggregator: function() {
        if (typeof this.aggregator == 'string') {
            return Ext.grid.PivotAggregatorMgr.types[this.aggregator];
        } else {
            return this.aggregator;
        }
    },
    
    /**
     * Sets the function to use when aggregating data for each cell.
     * @param {String|Function} aggregator The new aggregator function or named function string
     */
    setAggregator: function(aggregator) {
        this.aggregator = aggregator;
    },
    
    /**
     * Sets the field name to use as the Measure in this Pivot Grid
     * @param {String} measure The field to make the measure
     */
    setMeasure: function(measure) {
        this.measure = measure;
    },
    
    /**
     * Sets the left axis of this pivot grid. Optionally refreshes the grid afterwards.
     * @param {Ext.grid.PivotAxis} axis The pivot axis
     * @param {Boolean} refresh True to immediately refresh the grid and its axes (defaults to false)
     */
    setLeftAxis: function(axis, refresh) {
        /**
         * The configured {@link Ext.grid.PivotAxis} used as the left Axis for this Pivot Grid
         * @property leftAxis
         * @type Ext.grid.PivotAxis
         */
        this.leftAxis = axis;
        
        if (refresh) {
            this.view.refresh();
        }
    },
    
    /**
     * Sets the top axis of this pivot grid. Optionally refreshes the grid afterwards.
     * @param {Ext.grid.PivotAxis} axis The pivot axis
     * @param {Boolean} refresh True to immediately refresh the grid and its axes (defaults to false)
     */
    setTopAxis: function(axis, refresh) {
        /**
         * The configured {@link Ext.grid.PivotAxis} used as the top Axis for this Pivot Grid
         * @property topAxis
         * @type Ext.grid.PivotAxis
         */
        this.topAxis = axis;
        
        if (refresh) {
            this.view.refresh();
        }
    },
    
    /**
     * @private
     * Creates the top and left axes. Should usually only need to be called once from initComponent
     */
    initAxes: function() {
        var PivotAxis = Ext.grid.PivotAxis;
        
        if (!(this.leftAxis instanceof PivotAxis)) {
            this.setLeftAxis(new PivotAxis({
                orientation: 'vertical',
                dimensions : this.leftAxis || [],
                store      : this.store
            }));
        };
        
        if (!(this.topAxis instanceof PivotAxis)) {
            this.setTopAxis(new PivotAxis({
                orientation: 'horizontal',
                dimensions : this.topAxis || [],
                store      : this.store
            }));
        };
    },
    
    /**
     * @private
     * @return {Array} 2-dimensional array of cell data
     */
    extractData: function() {
        var records  = this.store.data.items,
            recCount = records.length,
            cells    = [],
            record, i, j, k;
        
        if (recCount == 0) {
            return [];
        }
        
        var leftTuples = this.leftAxis.getTuples(),
            leftCount  = leftTuples.length,
            topTuples  = this.topAxis.getTuples(),
            topCount   = topTuples.length,
            aggregator = this.getAggregator();
        
        for (i = 0; i < recCount; i++) {
            record = records[i];
            
            for (j = 0; j < leftCount; j++) {
                cells[j] = cells[j] || [];
                
                if (leftTuples[j].matcher(record) === true) {
                    for (k = 0; k < topCount; k++) {
                        cells[j][k] = cells[j][k] || [];
                        
                        if (topTuples[k].matcher(record)) {
                            cells[j][k].push(record);
                        }
                    }
                }
            }
        }
        
        var rowCount = cells.length,
            colCount, row;
        
        for (i = 0; i < rowCount; i++) {
            row = cells[i];
            colCount = row.length;
            
            for (j = 0; j < colCount; j++) {
                cells[i][j] = aggregator(cells[i][j], this.measure);
            }
        }
        
        return cells;
    },
    
    /**
     * Returns the grid's GridView object.
     * @return {Ext.grid.PivotGridView} The grid view
     */
    getView: function() {
        if (!this.view) {
            this.view = new Ext.grid.PivotGridView(this.viewConfig);
        }
        
        return this.view;
    }
});

Ext.reg('pivotgrid', Ext.grid.PivotGrid);


Ext.grid.PivotAggregatorMgr = new Ext.AbstractManager();

Ext.grid.PivotAggregatorMgr.registerType('sum', function(records, measure) {
    var length = records.length,
        total  = 0,
        i;
    
    for (i = 0; i < length; i++) {
        total += records[i].get(measure);
    }
    
    return total;
});

Ext.grid.PivotAggregatorMgr.registerType('avg', function(records, measure) {
    var length = records.length,
        total  = 0,
        i;
    
    for (i = 0; i < length; i++) {
        total += records[i].get(measure);
    }
    
    return (total / length) || 'n/a';
});

Ext.grid.PivotAggregatorMgr.registerType('min', function(records, measure) {
    var data   = [],
        length = records.length,
        i;
    
    for (i = 0; i < length; i++) {
        data.push(records[i].get(measure));
    }
    
    return Math.min.apply(this, data) || 'n/a';
});

Ext.grid.PivotAggregatorMgr.registerType('max', function(records, measure) {
    var data   = [],
        length = records.length,
        i;
    
    for (i = 0; i < length; i++) {
        data.push(records[i].get(measure));
    }
    
    return Math.max.apply(this, data) || 'n/a';
});

Ext.grid.PivotAggregatorMgr.registerType('count', function(records, measure) {
    return records.length;
});/**
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
Ext.grid.GridView = Ext.extend(Ext.util.Observable, {
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
     * (defaults to <tt>undefined</tt>). If an explicit value isn't specified, this will be automatically
     * calculated.
     */
    scrollOffset : undefined,

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
     * <p>Defaults to <tt>false</tt>.  Specify <tt>true</tt> to have the column widths re-proportioned
     * at <b>all times</b>.</p>
     * <p>The {@link Ext.grid.Column#width initially configured width}</tt> of each
     * column will be adjusted to fit the grid width and prevent horizontal scrolling. If columns are
     * later resized (manually or programmatically), the other columns in the grid <b>will</b> be resized
     * to fit the grid width.</p>
     * <p>Columns which are configured with <code>fixed: true</code> are omitted from being resized.</p>
     * <p>See <tt>{@link #autoFill}</tt>.</p>
     */
    forceFit : false,

    /**
     * @cfg {Array} sortClasses The CSS classes applied to a header when it is sorted. (defaults to <tt>['sort-asc', 'sort-desc']</tt>)
     */
    sortClasses : ['sort-asc', 'sort-desc'],

    /**
     * @cfg {String} sortAscText The text displayed in the 'Sort Ascending' menu item (defaults to <tt>'Sort Ascending'</tt>)
     */
    sortAscText : 'Sort Ascending',

    /**
     * @cfg {String} sortDescText The text displayed in the 'Sort Descending' menu item (defaults to <tt>'Sort Descending'</tt>)
     */
    sortDescText : 'Sort Descending',

    /**
     * @cfg {String} columnsText The text displayed in the 'Columns' menu item (defaults to <tt>'Columns'</tt>)
     */
    columnsText : 'Columns',

    /**
     * @cfg {String} selectedRowClass The CSS class applied to a selected row (defaults to <tt>'x-grid3-row-selected'</tt>). An
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
    selectedRowClass : 'x-grid3-row-selected',

    // private
    borderWidth : 2,
    tdClass : 'x-grid3-cell',
    hdCls : 'x-grid3-hd',
    
    
    /**
     * @cfg {Boolean} markDirty True to show the dirty cell indicator when a cell has been modified. Defaults to <tt>true</tt>.
     */
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
     * @cfg {Number} rowBodySelectorDepth The number of levels to search for row bodies in event delegation (defaults to <tt>10</tt>)
     */
    rowBodySelectorDepth : 10,

    /**
     * @cfg {String} cellSelector The selector used to find cells internally (defaults to <tt>'td.x-grid3-cell'</tt>)
     */
    cellSelector : 'td.x-grid3-cell',
    
    /**
     * @cfg {String} rowSelector The selector used to find rows internally (defaults to <tt>'div.x-grid3-row'</tt>)
     */
    rowSelector : 'div.x-grid3-row',

    /**
     * @cfg {String} rowBodySelector The selector used to find row bodies internally (defaults to <tt>'div.x-grid3-row'</tt>)
     */
    rowBodySelector : 'div.x-grid3-row-body',

    // private
    firstRowCls: 'x-grid3-row-first',
    lastRowCls: 'x-grid3-row-last',
    rowClsRe: /(?:^|\s+)x-grid3-row-(first|last|alt)(?:\s+|$)/g,
    
    /**
     * @cfg {String} headerMenuOpenCls The CSS class to add to the header cell when its menu is visible. Defaults to 'x-grid3-hd-menu-open'
     */
    headerMenuOpenCls: 'x-grid3-hd-menu-open',
    
    /**
     * @cfg {String} rowOverCls The CSS class added to each row when it is hovered over. Defaults to 'x-grid3-row-over'
     */
    rowOverCls: 'x-grid3-row-over',

    constructor : function(config) {
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
            'beforerowremoved',
            
            /**
             * @event beforerowsinserted
             * Internal UI Event. Fired before rows are inserted.
             * @param {Ext.grid.GridView} view
             * @param {Number} firstRow The index of the first row to be inserted.
             * @param {Number} lastRow The index of the last row to be inserted.
             */
            'beforerowsinserted',
            
            /**
             * @event beforerefresh
             * Internal UI Event. Fired before the view is refreshed.
             * @param {Ext.grid.GridView} view
             */
            'beforerefresh',
            
            /**
             * @event rowremoved
             * Internal UI Event. Fired after a row is removed.
             * @param {Ext.grid.GridView} view
             * @param {Number} rowIndex The index of the row that was removed.
             * @param {Ext.data.Record} record The Record that was removed
             */
            'rowremoved',
            
            /**
             * @event rowsinserted
             * Internal UI Event. Fired after rows are inserted.
             * @param {Ext.grid.GridView} view
             * @param {Number} firstRow The index of the first inserted.
             * @param {Number} lastRow The index of the last row inserted.
             */
            'rowsinserted',
            
            /**
             * @event rowupdated
             * Internal UI Event. Fired after a row has been updated.
             * @param {Ext.grid.GridView} view
             * @param {Number} firstRow The index of the row updated.
             * @param {Ext.data.record} record The Record backing the row updated.
             */
            'rowupdated',
            
            /**
             * @event refresh
             * Internal UI Event. Fired after the GridView's body has been refreshed.
             * @param {Ext.grid.GridView} view
             */
            'refresh'
        );
        
        Ext.grid.GridView.superclass.constructor.call(this);
    },

    /* -------------------------------- UI Specific ----------------------------- */
    
    /**
     * The master template to use when rendering the GridView. Has a default template
     * @property Ext.Template
     * @type masterTpl
     */
    masterTpl: new Ext.Template(
        '<div class="x-grid3" hidefocus="true">',
            '<div class="x-grid3-viewport">',
                '<div class="x-grid3-header">',
                    '<div class="x-grid3-header-inner">',
                        '<div class="x-grid3-header-offset" style="{ostyle}">{header}</div>',
                    '</div>',
                    '<div class="x-clear"></div>',
                '</div>',
                '<div class="x-grid3-scroller">',
                    '<div class="x-grid3-body" style="{bstyle}">{body}</div>',
                    '<a href="#" class="x-grid3-focus" tabIndex="-1"></a>',
                '</div>',
            '</div>',
            '<div class="x-grid3-resize-marker">&#160;</div>',
            '<div class="x-grid3-resize-proxy">&#160;</div>',
        '</div>'
    ),
    
    /**
     * The template to use when rendering headers. Has a default template
     * @property headerTpl
     * @type Ext.Template
     */
    headerTpl: new Ext.Template(
        '<table border="0" cellspacing="0" cellpadding="0" style="{tstyle}">',
            '<thead>',
                '<tr class="x-grid3-hd-row">{cells}</tr>',
            '</thead>',
        '</table>'
    ),
    
    /**
     * The template to use when rendering the body. Has a default template
     * @property bodyTpl
     * @type Ext.Template
     */
    bodyTpl: new Ext.Template('{rows}'),
    
    /**
     * The template to use to render each cell. Has a default template
     * @property cellTpl
     * @type Ext.Template
     */
    cellTpl: new Ext.Template(
        '<td class="x-grid3-col x-grid3-cell x-grid3-td-{id} {css}" style="{style}" tabIndex="0" {cellAttr}>',
            '<div class="x-grid3-cell-inner x-grid3-col-{id}" unselectable="on" {attr}>{value}</div>',
        '</td>'
    ),
    
    /**
     * @private
     * Provides default templates if they are not given for this particular instance. Most of the templates are defined on
     * the prototype, the ones defined inside this function are done so because they are based on Grid or GridView configuration
     */
    initTemplates : function() {
        var templates = this.templates || {},
            template, name,
            
            headerCellTpl = new Ext.Template(
                '<td class="x-grid3-hd x-grid3-cell x-grid3-td-{id} {css}" style="{style}">',
                    '<div {tooltip} {attr} class="x-grid3-hd-inner x-grid3-hd-{id}" unselectable="on" style="{istyle}">', 
                        this.grid.enableHdMenu ? '<a class="x-grid3-hd-btn" href="#"></a>' : '',
                        '{value}',
                        '<img alt="" class="x-grid3-sort-icon" src="', Ext.BLANK_IMAGE_URL, '" />',
                    '</div>',
                '</td>'
            ),
        
            rowBodyText = [
                '<tr class="x-grid3-row-body-tr" style="{bodyStyle}">',
                    '<td colspan="{cols}" class="x-grid3-body-cell" tabIndex="0" hidefocus="on">',
                        '<div class="x-grid3-row-body">{body}</div>',
                    '</td>',
                '</tr>'
            ].join(""),
        
            innerText = [
                '<table class="x-grid3-row-table" border="0" cellspacing="0" cellpadding="0" style="{tstyle}">',
                     '<tbody>',
                        '<tr>{cells}</tr>',
                        this.enableRowBody ? rowBodyText : '',
                     '</tbody>',
                '</table>'
            ].join("");
        
        Ext.applyIf(templates, {
            hcell   : headerCellTpl,
            cell    : this.cellTpl,
            body    : this.bodyTpl,
            header  : this.headerTpl,
            master  : this.masterTpl,
            row     : new Ext.Template('<div class="x-grid3-row {alt}" style="{tstyle}">' + innerText + '</div>'),
            rowInner: new Ext.Template(innerText)
        });

        for (name in templates) {
            template = templates[name];
            
            if (template && Ext.isFunction(template.compile) && !template.compiled) {
                template.disableFormats = true;
                template.compile();
            }
        }

        this.templates = templates;
        this.colRe = new RegExp('x-grid3-td-([^\\s]+)', '');
    },

    /**
     * @private
     * Each GridView has its own private flyweight, accessed through this method
     */
    fly : function(el) {
        if (!this._flyweight) {
            this._flyweight = new Ext.Element.Flyweight(document.body);
        }
        this._flyweight.dom = el;
        return this._flyweight;
    },

    // private
    getEditorParent : function() {
        return this.scroller.dom;
    },

    /**
     * @private
     * Finds and stores references to important elements
     */
    initElements : function() {
        var Element  = Ext.Element,
            el       = Ext.get(this.grid.getGridEl().dom.firstChild),
            mainWrap = new Element(el.child('div.x-grid3-viewport')),
            mainHd   = new Element(mainWrap.child('div.x-grid3-header')),
            scroller = new Element(mainWrap.child('div.x-grid3-scroller'));
        
        if (this.grid.hideHeaders) {
            mainHd.setDisplayed(false);
        }
        
        if (this.forceFit) {
            scroller.setStyle('overflow-x', 'hidden');
        }
        
        /**
         * <i>Read-only</i>. The GridView's body Element which encapsulates all rows in the Grid.
         * This {@link Ext.Element Element} is only available after the GridPanel has been rendered.
         * @type Ext.Element
         * @property mainBody
         */
        
        Ext.apply(this, {
            el      : el,
            mainWrap: mainWrap,
            scroller: scroller,
            mainHd  : mainHd,
            innerHd : mainHd.child('div.x-grid3-header-inner').dom,
            mainBody: new Element(Element.fly(scroller).child('div.x-grid3-body')),
            focusEl : new Element(Element.fly(scroller).child('a')),
            
            resizeMarker: new Element(el.child('div.x-grid3-resize-marker')),
            resizeProxy : new Element(el.child('div.x-grid3-resize-proxy'))
        });
        
        this.focusEl.swallowEvent('click', true);
    },

    // private
    getRows : function() {
        return this.hasRows() ? this.mainBody.dom.childNodes : [];
    },

    // finder methods, used with delegation

    // private
    findCell : function(el) {
        if (!el) {
            return false;
        }
        return this.fly(el).findParent(this.cellSelector, this.cellSelectorDepth);
    },

    /**
     * <p>Return the index of the grid column which contains the passed HTMLElement.</p>
     * See also {@link #findRowIndex}
     * @param {HTMLElement} el The target element
     * @return {Number} The column index, or <b>false</b> if the target element is not within a row of this GridView.
     */
    findCellIndex : function(el, requiredCls) {
        var cell = this.findCell(el),
            hasCls;
        
        if (cell) {
            hasCls = this.fly(cell).hasClass(requiredCls);
            if (!requiredCls || hasCls) {
                return this.getCellIndex(cell);
            }
        }
        return false;
    },

    // private
    getCellIndex : function(el) {
        if (el) {
            var match = el.className.match(this.colRe);
            
            if (match && match[1]) {
                return this.cm.getIndexById(match[1]);
            }
        }
        return false;
    },

    // private
    findHeaderCell : function(el) {
        var cell = this.findCell(el);
        return cell && this.fly(cell).hasClass(this.hdCls) ? cell : null;
    },

    // private
    findHeaderIndex : function(el){
        return this.findCellIndex(el, this.hdCls);
    },

    /**
     * Return the HtmlElement representing the grid row which contains the passed element.
     * @param {HTMLElement} el The target HTMLElement
     * @return {HTMLElement} The row element, or null if the target element is not within a row of this GridView.
     */
    findRow : function(el) {
        if (!el) {
            return false;
        }
        return this.fly(el).findParent(this.rowSelector, this.rowSelectorDepth);
    },

    /**
     * Return the index of the grid row which contains the passed HTMLElement.
     * See also {@link #findCellIndex}
     * @param {HTMLElement} el The target HTMLElement
     * @return {Number} The row index, or <b>false</b> if the target element is not within a row of this GridView.
     */
    findRowIndex : function(el) {
        var row = this.findRow(el);
        return row ? row.rowIndex : false;
    },

    /**
     * Return the HtmlElement representing the grid row body which contains the passed element.
     * @param {HTMLElement} el The target HTMLElement
     * @return {HTMLElement} The row body element, or null if the target element is not within a row body of this GridView.
     */
    findRowBody : function(el) {
        if (!el) {
            return false;
        }
        
        return this.fly(el).findParent(this.rowBodySelector, this.rowBodySelectorDepth);
    },

    // getter methods for fetching elements dynamically in the grid

    /**
     * Return the <tt>&lt;div></tt> HtmlElement which represents a Grid row for the specified index.
     * @param {Number} index The row index
     * @return {HtmlElement} The div element.
     */
    getRow : function(row) {
        return this.getRows()[row];
    },

    /**
     * Returns the grid's <tt>&lt;td></tt> HtmlElement at the specified coordinates.
     * @param {Number} row The row index in which to find the cell.
     * @param {Number} col The column index of the cell.
     * @return {HtmlElement} The td at the specified coordinates.
     */
    getCell : function(row, col) {
        return Ext.fly(this.getRow(row)).query(this.cellSelector)[col]; 
    },

    /**
     * Return the <tt>&lt;td></tt> HtmlElement which represents the Grid's header cell for the specified column index.
     * @param {Number} index The column index
     * @return {HtmlElement} The td element.
     */
    getHeaderCell : function(index) {
        return this.mainHd.dom.getElementsByTagName('td')[index];
    },

    // manipulating elements

    // private - use getRowClass to apply custom row classes
    addRowClass : function(rowId, cls) {
        var row = this.getRow(rowId);
        if (row) {
            this.fly(row).addClass(cls);
        }
    },

    // private
    removeRowClass : function(row, cls) {
        var r = this.getRow(row);
        if(r){
            this.fly(r).removeClass(cls);
        }
    },

    // private
    removeRow : function(row) {
        Ext.removeNode(this.getRow(row));
        this.syncFocusEl(row);
    },

    // private
    removeRows : function(firstRow, lastRow) {
        var bd = this.mainBody.dom,
            rowIndex;
            
        for (rowIndex = firstRow; rowIndex <= lastRow; rowIndex++){
            Ext.removeNode(bd.childNodes[firstRow]);
        }
        
        this.syncFocusEl(firstRow);
    },

    /* ----------------------------------- Scrolling functions -------------------------------------------*/
    
    // private
    getScrollState : function() {
        var sb = this.scroller.dom;
        
        return {
            left: sb.scrollLeft, 
            top : sb.scrollTop
        };
    },

    // private
    restoreScroll : function(state) {
        var sb = this.scroller.dom;
        sb.scrollLeft = state.left;
        sb.scrollTop  = state.top;
    },

    /**
     * Scrolls the grid to the top
     */
    scrollToTop : function() {
        var dom = this.scroller.dom;
        
        dom.scrollTop  = 0;
        dom.scrollLeft = 0;
    },

    // private
    syncScroll : function() {
        this.syncHeaderScroll();
        var mb = this.scroller.dom;
        this.grid.fireEvent('bodyscroll', mb.scrollLeft, mb.scrollTop);
    },

    // private
    syncHeaderScroll : function() {
        var innerHd    = this.innerHd,
            scrollLeft = this.scroller.dom.scrollLeft;
        
        innerHd.scrollLeft = scrollLeft;
        innerHd.scrollLeft = scrollLeft; // second time for IE (1/2 time first fails, other browsers ignore)
    },
    
    /**
     * @private
     * Ensures the given column has the given icon class
     */
    updateSortIcon : function(col, dir) {
        var sortClasses = this.sortClasses,
            sortClass   = sortClasses[dir == "DESC" ? 1 : 0],
            headers     = this.mainHd.select('td').removeClass(sortClasses);
        
        headers.item(col).addClass(sortClass);
    },

    /**
     * @private
     * Updates the size of every column and cell in the grid
     */
    updateAllColumnWidths : function() {
        var totalWidth = this.getTotalWidth(),
            colCount   = this.cm.getColumnCount(),
            rows       = this.getRows(),
            rowCount   = rows.length,
            widths     = [],
            row, rowFirstChild, trow, i, j;
        
        for (i = 0; i < colCount; i++) {
            widths[i] = this.getColumnWidth(i);
            this.getHeaderCell(i).style.width = widths[i];
        }
        
        this.updateHeaderWidth();
        
        for (i = 0; i < rowCount; i++) {
            row = rows[i];
            row.style.width = totalWidth;
            rowFirstChild = row.firstChild;
            
            if (rowFirstChild) {
                rowFirstChild.style.width = totalWidth;
                trow = rowFirstChild.rows[0];
                
                for (j = 0; j < colCount; j++) {
                    trow.childNodes[j].style.width = widths[j];
                }
            }
        }
        
        this.onAllColumnWidthsUpdated(widths, totalWidth);
    },

    /**
     * @private
     * Called after a column's width has been updated, this resizes all of the cells for that column in each row
     * @param {Number} column The column index
     */
    updateColumnWidth : function(column, width) {
        var columnWidth = this.getColumnWidth(column),
            totalWidth  = this.getTotalWidth(),
            headerCell  = this.getHeaderCell(column),
            nodes       = this.getRows(),
            nodeCount   = nodes.length,
            row, i, firstChild;
        
        this.updateHeaderWidth();
        headerCell.style.width = columnWidth;
        
        for (i = 0; i < nodeCount; i++) {
            row = nodes[i];
            firstChild = row.firstChild;
            
            row.style.width = totalWidth;
            if (firstChild) {
                firstChild.style.width = totalWidth;
                firstChild.rows[0].childNodes[column].style.width = columnWidth;
            }
        }
        
        this.onColumnWidthUpdated(column, columnWidth, totalWidth);
    },
    
    /**
     * @private
     * Sets the hidden status of a given column.
     * @param {Number} col The column index
     * @param {Boolean} hidden True to make the column hidden
     */
    updateColumnHidden : function(col, hidden) {
        var totalWidth = this.getTotalWidth(),
            display    = hidden ? 'none' : '',
            headerCell = this.getHeaderCell(col),
            nodes      = this.getRows(),
            nodeCount  = nodes.length,
            row, rowFirstChild, i;
        
        this.updateHeaderWidth();
        headerCell.style.display = display;
        
        for (i = 0; i < nodeCount; i++) {
            row = nodes[i];
            row.style.width = totalWidth;
            rowFirstChild = row.firstChild;
            
            if (rowFirstChild) {
                rowFirstChild.style.width = totalWidth;
                rowFirstChild.rows[0].childNodes[col].style.display = display;
            }
        }
        
        this.onColumnHiddenUpdated(col, hidden, totalWidth);
        delete this.lastViewWidth; //recalc
        this.layout();
    },

    /**
     * @private
     * Renders all of the rows to a string buffer and returns the string. This is called internally
     * by renderRows and performs the actual string building for the rows - it does not inject HTML into the DOM.
     * @param {Array} columns The column data acquired from getColumnData.
     * @param {Array} records The array of records to render
     * @param {Ext.data.Store} store The store to render the rows from
     * @param {Number} startRow The index of the first row being rendered. Sometimes we only render a subset of
     * the rows so this is used to maintain logic for striping etc
     * @param {Number} colCount The total number of columns in the column model
     * @param {Boolean} stripe True to stripe the rows
     * @return {String} A string containing the HTML for the rendered rows
     */
    doRender : function(columns, records, store, startRow, colCount, stripe) {
        var templates = this.templates,
            cellTemplate = templates.cell,
            rowTemplate = templates.row,
            last = colCount - 1,
            tstyle = 'width:' + this.getTotalWidth() + ';',
            // buffers
            rowBuffer = [],
            colBuffer = [],
            rowParams = {tstyle: tstyle},
            meta = {},
            len  = records.length,
            alt,
            column,
            record, i, j, rowIndex;

        //build up each row's HTML
        for (j = 0; j < len; j++) {
            record    = records[j];
            colBuffer = [];

            rowIndex = j + startRow;

            //build up each column's HTML
            for (i = 0; i < colCount; i++) {
                column = columns[i];
                
                meta.id    = column.id;
                meta.css   = i === 0 ? 'x-grid3-cell-first ' : (i == last ? 'x-grid3-cell-last ' : '');
                meta.attr  = meta.cellAttr = '';
                meta.style = column.style;
                meta.value = column.renderer.call(column.scope, record.data[column.name], meta, record, rowIndex, i, store);

                if (Ext.isEmpty(meta.value)) {
                    meta.value = '&#160;';
                }

                if (this.markDirty && record.dirty && typeof record.modified[column.name] != 'undefined') {
                    meta.css += ' x-grid3-dirty-cell';
                }

                colBuffer[colBuffer.length] = cellTemplate.apply(meta);
            }

            alt = [];
            //set up row striping and row dirtiness CSS classes
            if (stripe && ((rowIndex + 1) % 2 === 0)) {
                alt[0] = 'x-grid3-row-alt';
            }

            if (record.dirty) {
                alt[1] = ' x-grid3-dirty-row';
            }

            rowParams.cols = colCount;

            if (this.getRowClass) {
                alt[2] = this.getRowClass(record, rowIndex, rowParams, store);
            }

            rowParams.alt   = alt.join(' ');
            rowParams.cells = colBuffer.join('');

            rowBuffer[rowBuffer.length] = rowTemplate.apply(rowParams);
        }

        return rowBuffer.join('');
    },

    /**
     * @private
     * Adds CSS classes and rowIndex to each row
     * @param {Number} startRow The row to start from (defaults to 0)
     */
    processRows : function(startRow, skipStripe) {
        if (!this.ds || this.ds.getCount() < 1) {
            return;
        }

        var rows   = this.getRows(),
            length = rows.length,
            row, i;

        skipStripe = skipStripe || !this.grid.stripeRows;
        startRow   = startRow   || 0;

        for (i = 0; i < length; i++) {
            row = rows[i];
            if (row) {
                row.rowIndex = i;
                if (!skipStripe) {
                    row.className = row.className.replace(this.rowClsRe, ' ');
                    if ((i + 1) % 2 === 0){
                        row.className += ' x-grid3-row-alt';
                    }
                }
            }
        }

        // add first/last-row classes
        if (startRow === 0) {
            Ext.fly(rows[0]).addClass(this.firstRowCls);
        }

        Ext.fly(rows[length - 1]).addClass(this.lastRowCls);
    },
    
    /**
     * @private
     */
    afterRender : function() {
        if (!this.ds || !this.cm) {
            return;
        }
        
        this.mainBody.dom.innerHTML = this.renderBody() || '&#160;';
        this.processRows(0, true);

        if (this.deferEmptyText !== true) {
            this.applyEmptyText();
        }
        
        this.grid.fireEvent('viewready', this.grid);
    },
    
    /**
     * @private
     * This is always intended to be called after renderUI. Sets up listeners on the UI elements
     * and sets up options like column menus, moving and resizing.
     */
    afterRenderUI: function() {
        var grid = this.grid;
        
        this.initElements();

        // get mousedowns early
        Ext.fly(this.innerHd).on('click', this.handleHdDown, this);

        this.mainHd.on({
            scope    : this,
            mouseover: this.handleHdOver,
            mouseout : this.handleHdOut,
            mousemove: this.handleHdMove
        });

        this.scroller.on('scroll', this.syncScroll,  this);
        
        if (grid.enableColumnResize !== false) {
            this.splitZone = new Ext.grid.GridView.SplitDragZone(grid, this.mainHd.dom);
        }

        if (grid.enableColumnMove) {
            this.columnDrag = new Ext.grid.GridView.ColumnDragZone(grid, this.innerHd);
            this.columnDrop = new Ext.grid.HeaderDropZone(grid, this.mainHd.dom);
        }

        if (grid.enableHdMenu !== false) {
            this.hmenu = new Ext.menu.Menu({id: grid.id + '-hctx'});
            this.hmenu.add(
                {itemId:'asc',  text: this.sortAscText,  cls: 'xg-hmenu-sort-asc'},
                {itemId:'desc', text: this.sortDescText, cls: 'xg-hmenu-sort-desc'}
            );

            if (grid.enableColumnHide !== false) {
                this.colMenu = new Ext.menu.Menu({id:grid.id + '-hcols-menu'});
                this.colMenu.on({
                    scope     : this,
                    beforeshow: this.beforeColMenuShow,
                    itemclick : this.handleHdMenuClick
                });
                this.hmenu.add('-', {
                    itemId:'columns',
                    hideOnClick: false,
                    text: this.columnsText,
                    menu: this.colMenu,
                    iconCls: 'x-cols-icon'
                });
            }

            this.hmenu.on('itemclick', this.handleHdMenuClick, this);
        }

        if (grid.trackMouseOver) {
            this.mainBody.on({
                scope    : this,
                mouseover: this.onRowOver,
                mouseout : this.onRowOut
            });
        }

        if (grid.enableDragDrop || grid.enableDrag) {
            this.dragZone = new Ext.grid.GridDragZone(grid, {
                ddGroup : grid.ddGroup || 'GridDD'
            });
        }

        this.updateHeaderSortState();
    },

    /**
     * @private
     * Renders each of the UI elements in turn. This is called internally, once, by this.render. It does not
     * render rows from the store, just the surrounding UI elements.
     */
    renderUI : function() {
        var templates = this.templates;

        return templates.master.apply({
            body  : templates.body.apply({rows:'&#160;'}),
            header: this.renderHeaders(),
            ostyle: 'width:' + this.getOffsetWidth() + ';',
            bstyle: 'width:' + this.getTotalWidth()  + ';'
        });
    },

    // private
    processEvent : function(name, e) {
        var target = e.getTarget(),
            grid   = this.grid,
            header = this.findHeaderIndex(target),
            row, cell, col, body;

        grid.fireEvent(name, e);

        if (header !== false) {
            grid.fireEvent('header' + name, grid, header, e);
        } else {
            row = this.findRowIndex(target);

//          Grid's value-added events must bubble correctly to allow cancelling via returning false: cell->column->row
//          We must allow a return of false at any of these levels to cancel the event processing.
//          Particularly allowing rowmousedown to be cancellable by prior handlers which need to prevent selection.
            if (row !== false) {
                cell = this.findCellIndex(target);
                if (cell !== false) {
                    col = grid.colModel.getColumnAt(cell);
                    if (grid.fireEvent('cell' + name, grid, row, cell, e) !== false) {
                        if (!col || (col.processEvent && (col.processEvent(name, e, grid, row, cell) !== false))) {
                            grid.fireEvent('row' + name, grid, row, e);
                        }
                    }
                } else {
                    if (grid.fireEvent('row' + name, grid, row, e) !== false) {
                        (body = this.findRowBody(target)) && grid.fireEvent('rowbody' + name, grid, row, e);
                    }
                }
            } else {
                grid.fireEvent('container' + name, grid, e);
            }
        }
    },

    /**
     * @private
     * Sizes the grid's header and body elements
     */
    layout : function(initial) {
        if (!this.mainBody) {
            return; // not rendered
        }

        var grid       = this.grid,
            gridEl     = grid.getGridEl(),
            gridSize   = gridEl.getSize(true),
            gridWidth  = gridSize.width,
            gridHeight = gridSize.height,
            scroller   = this.scroller,
            scrollStyle, headerHeight, scrollHeight;
        
        if (gridWidth < 20 || gridHeight < 20) {
            return;
        }
        
        if (grid.autoHeight) {
            scrollStyle = scroller.dom.style;
            scrollStyle.overflow = 'visible';
            
            if (Ext.isWebKit) {
                scrollStyle.position = 'static';
            }
        } else {
            this.el.setSize(gridWidth, gridHeight);
            
            headerHeight = this.mainHd.getHeight();
            scrollHeight = gridHeight - headerHeight;
            
            scroller.setSize(gridWidth, scrollHeight);
            
            if (this.innerHd) {
                this.innerHd.style.width = (gridWidth) + "px";
            }
        }
        
        if (this.forceFit || (initial === true && this.autoFill)) {
            if (this.lastViewWidth != gridWidth) {
                this.fitColumns(false, false);
                this.lastViewWidth = gridWidth;
            }
        } else {
            this.autoExpand();
            this.syncHeaderScroll();
        }
        
        this.onLayout(gridWidth, scrollHeight);
    },

    // template functions for subclasses and plugins
    // these functions include precalculated values
    onLayout : function(vw, vh) {
        // do nothing
    },

    onColumnWidthUpdated : function(col, w, tw) {
        //template method
    },

    onAllColumnWidthsUpdated : function(ws, tw) {
        //template method
    },

    onColumnHiddenUpdated : function(col, hidden, tw) {
        // template method
    },

    updateColumnText : function(col, text) {
        // template method
    },

    afterMove : function(colIndex) {
        // template method
    },

    /* ----------------------------------- Core Specific -------------------------------------------*/
    // private
    init : function(grid) {
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
        return (this.cm.getTotalWidth() + this.getScrollOffset()) + 'px';
    },

    // private
    getScrollOffset: function() {
        return Ext.num(this.scrollOffset, Ext.getScrollBarWidth());
    },

    /**
     * @private
     * Renders the header row using the 'header' template. Does not inject the HTML into the DOM, just
     * returns a string.
     * @return {String} Rendered header row
     */
    renderHeaders : function() {
        var colModel   = this.cm,
            templates  = this.templates,
            headerTpl  = templates.hcell,
            properties = {},
            colCount   = colModel.getColumnCount(),
            last       = colCount - 1,
            cells      = [],
            i, cssCls;
        
        for (i = 0; i < colCount; i++) {
            if (i == 0) {
                cssCls = 'x-grid3-cell-first ';
            } else {
                cssCls = i == last ? 'x-grid3-cell-last ' : '';
            }
            
            properties = {
                id     : colModel.getColumnId(i),
                value  : colModel.getColumnHeader(i) || '',
                style  : this.getColumnStyle(i, true),
                css    : cssCls,
                tooltip: this.getColumnTooltip(i)
            };
            
            if (colModel.config[i].align == 'right') {
                properties.istyle = 'padding-right: 16px;';
            } else {
                delete properties.istyle;
            }
            
            cells[i] = headerTpl.apply(properties);
        }
        
        return templates.header.apply({
            cells : cells.join(""),
            tstyle: String.format("width: {0};", this.getTotalWidth())
        });
    },

    /**
     * @private
     */
    getColumnTooltip : function(i) {
        var tooltip = this.cm.getColumnTooltip(i);
        if (tooltip) {
            if (Ext.QuickTips.isEnabled()) {
                return 'ext:qtip="' + tooltip + '"';
            } else {
                return 'title="' + tooltip + '"';
            }
        }
        
        return '';
    },

    // private
    beforeUpdate : function() {
        this.grid.stopEditing(true);
    },

    /**
     * @private
     * Re-renders the headers and ensures they are sized correctly
     */
    updateHeaders : function() {
        this.innerHd.firstChild.innerHTML = this.renderHeaders();
        
        this.updateHeaderWidth(false);
    },
    
    /**
     * @private
     * Ensures that the header is sized to the total width available to it
     * @param {Boolean} updateMain True to update the mainBody's width also (defaults to true)
     */
    updateHeaderWidth: function(updateMain) {
        var innerHdChild = this.innerHd.firstChild,
            totalWidth   = this.getTotalWidth();
        
        innerHdChild.style.width = this.getOffsetWidth();
        innerHdChild.firstChild.style.width = totalWidth;
        
        if (updateMain !== false) {
            this.mainBody.dom.style.width = totalWidth;
        }
    },

    /**
     * Focuses the specified row.
     * @param {Number} row The row index
     */
    focusRow : function(row) {
        this.focusCell(row, 0, false);
    },

    /**
     * Focuses the specified cell.
     * @param {Number} row The row index
     * @param {Number} col The column index
     */
    focusCell : function(row, col, hscroll) {
        this.syncFocusEl(this.ensureVisible(row, col, hscroll));
        
        var focusEl = this.focusEl;
        
        if (Ext.isGecko) {
            focusEl.focus();
        } else {
            focusEl.focus.defer(1, focusEl);
        }
    },

    /**
     * @private
     * Finds the Elements corresponding to the given row and column indexes
     */
    resolveCell : function(row, col, hscroll) {
        if (!Ext.isNumber(row)) {
            row = row.rowIndex;
        }
        
        if (!this.ds) {
            return null;
        }
        
        if (row < 0 || row >= this.ds.getCount()) {
            return null;
        }
        col = (col !== undefined ? col : 0);

        var rowEl    = this.getRow(row),
            colModel = this.cm,
            colCount = colModel.getColumnCount(),
            cellEl;
            
        if (!(hscroll === false && col === 0)) {
            while (col < colCount && colModel.isHidden(col)) {
                col++;
            }
            
            cellEl = this.getCell(row, col);
        }

        return {row: rowEl, cell: cellEl};
    },

    /**
     * @private
     * Returns the XY co-ordinates of a given row/cell resolution (see {@link #resolveCell})
     * @return {Array} X and Y coords
     */
    getResolvedXY : function(resolved) {
        if (!resolved) {
            return null;
        }
        
        var cell = resolved.cell,
            row  = resolved.row;
        
        if (cell) {
            return Ext.fly(cell).getXY();
        } else {
            return [this.el.getX(), Ext.fly(row).getY()];
        }
    },

    /**
     * @private
     * Moves the focus element to the x and y co-ordinates of the given row and column
     */
    syncFocusEl : function(row, col, hscroll) {
        var xy = row;
        
        if (!Ext.isArray(xy)) {
            row = Math.min(row, Math.max(0, this.getRows().length-1));
            
            if (isNaN(row)) {
                return;
            }
            
            xy = this.getResolvedXY(this.resolveCell(row, col, hscroll));
        }
        
        this.focusEl.setXY(xy || this.scroller.getXY());
    },

    /**
     * @private
     */
    ensureVisible : function(row, col, hscroll) {
        var resolved = this.resolveCell(row, col, hscroll);
        
        if (!resolved || !resolved.row) {
            return null;
        }

        var rowEl  = resolved.row,
            cellEl = resolved.cell,
            c = this.scroller.dom,
            p = rowEl,
            ctop = 0,
            stop = this.el.dom;

        while (p && p != stop) {
            ctop += p.offsetTop;
            p = p.offsetParent;
        }

        ctop -= this.mainHd.dom.offsetHeight;
        stop = parseInt(c.scrollTop, 10);

        var cbot = ctop + rowEl.offsetHeight,
            ch = c.clientHeight,
            sbot = stop + ch;


        if (ctop < stop) {
          c.scrollTop = ctop;
        } else if(cbot > sbot) {
            c.scrollTop = cbot-ch;
        }

        if (hscroll !== false) {
            var cleft  = parseInt(cellEl.offsetLeft, 10),
                cright = cleft + cellEl.offsetWidth,
                sleft  = parseInt(c.scrollLeft, 10),
                sright = sleft + c.clientWidth;
                
            if (cleft < sleft) {
                c.scrollLeft = cleft;
            } else if(cright > sright) {
                c.scrollLeft = cright-c.clientWidth;
            }
        }
        
        return this.getResolvedXY(resolved);
    },

    // private
    insertRows : function(dm, firstRow, lastRow, isUpdate) {
        var last = dm.getCount() - 1;
        if( !isUpdate && firstRow === 0 && lastRow >= last) {
            this.fireEvent('beforerowsinserted', this, firstRow, lastRow);
                this.refresh();
            this.fireEvent('rowsinserted', this, firstRow, lastRow);
        } else {
            if (!isUpdate) {
                this.fireEvent('beforerowsinserted', this, firstRow, lastRow);
            }
            var html = this.renderRows(firstRow, lastRow),
                before = this.getRow(firstRow);
            if (before) {
                if(firstRow === 0){
                    Ext.fly(this.getRow(0)).removeClass(this.firstRowCls);
                }
                Ext.DomHelper.insertHtml('beforeBegin', before, html);
            } else {
                var r = this.getRow(last - 1);
                if(r){
                    Ext.fly(r).removeClass(this.lastRowCls);
                }
                Ext.DomHelper.insertHtml('beforeEnd', this.mainBody.dom, html);
            }
            if (!isUpdate) {
                this.processRows(firstRow);
                this.fireEvent('rowsinserted', this, firstRow, lastRow);
            } else if (firstRow === 0 || firstRow >= last) {
                //ensure first/last row is kept after an update.
                Ext.fly(this.getRow(firstRow)).addClass(firstRow === 0 ? this.firstRowCls : this.lastRowCls);
            }
        }
        this.syncFocusEl(firstRow);
    },

    /**
     * @private
     * DEPRECATED - this doesn't appear to be called anywhere in the library, remove in 4.0. 
     */
    deleteRows : function(dm, firstRow, lastRow) {
        if (dm.getRowCount() < 1) {
            this.refresh();
        } else {
            this.fireEvent('beforerowsdeleted', this, firstRow, lastRow);

            this.removeRows(firstRow, lastRow);

            this.processRows(firstRow);
            this.fireEvent('rowsdeleted', this, firstRow, lastRow);
        }
    },

    /**
     * @private
     * Builds a CSS string for the given column index
     * @param {Number} colIndex The column index
     * @param {Boolean} isHeader True if getting the style for the column's header
     * @return {String} The CSS string
     */
    getColumnStyle : function(colIndex, isHeader) {
        var colModel  = this.cm,
            colConfig = colModel.config,
            style     = isHeader ? '' : colConfig[colIndex].css || '',
            align     = colConfig[colIndex].align;
        
        style += String.format("width: {0};", this.getColumnWidth(colIndex));
        
        if (colModel.isHidden(colIndex)) {
            style += 'display: none; ';
        }
        
        if (align) {
            style += String.format("text-align: {0};", align);
        }
        
        return style;
    },

    /**
     * @private
     * Returns the width of a given column minus its border width
     * @return {Number} The column index
     * @return {String|Number} The width in pixels
     */
    getColumnWidth : function(column) {
        var columnWidth = this.cm.getColumnWidth(column),
            borderWidth = this.borderWidth;
        
        if (Ext.isNumber(columnWidth)) {
            if (Ext.isBorderBox || (Ext.isWebKit && !Ext.isSafari2)) {
                return columnWidth + "px";
            } else {
                return Math.max(columnWidth - borderWidth, 0) + "px";
            }
        } else {
            return columnWidth;
        }
    },

    /**
     * @private
     * Returns the total width of all visible columns
     * @return {String} 
     */
    getTotalWidth : function() {
        return this.cm.getTotalWidth() + 'px';
    },

    /**
     * @private
     * Resizes each column to fit the available grid width.
     * TODO: The second argument isn't even used, remove it in 4.0
     * @param {Boolean} preventRefresh True to prevent resizing of each row to the new column sizes (defaults to false)
     * @param {null} onlyExpand NOT USED, will be removed in 4.0
     * @param {Number} omitColumn The index of a column to leave at its current width. Defaults to undefined
     * @return {Boolean} True if the operation succeeded, false if not or undefined if the grid view is not yet initialized
     */
    fitColumns : function(preventRefresh, onlyExpand, omitColumn) {
        var grid          = this.grid,
            colModel      = this.cm,
            totalColWidth = colModel.getTotalWidth(false),
            gridWidth     = this.getGridInnerWidth(),
            extraWidth    = gridWidth - totalColWidth,
            columns       = [],
            extraCol      = 0,
            width         = 0,
            colWidth, fraction, i;
        
        // not initialized, so don't screw up the default widths
        if (gridWidth < 20 || extraWidth === 0) {
            return false;
        }
        
        var visibleColCount = colModel.getColumnCount(true),
            totalColCount   = colModel.getColumnCount(false),
            adjCount        = visibleColCount - (Ext.isNumber(omitColumn) ? 1 : 0);
        
        if (adjCount === 0) {
            adjCount = 1;
            omitColumn = undefined;
        }
        
        //FIXME: the algorithm used here is odd and potentially confusing. Includes this for loop and the while after it.
        for (i = 0; i < totalColCount; i++) {
            if (!colModel.isFixed(i) && i !== omitColumn) {
                colWidth = colModel.getColumnWidth(i);
                columns.push(i, colWidth);
                
                if (!colModel.isHidden(i)) {
                    extraCol = i;
                    width += colWidth;
                }
            }
        }
        
        fraction = (gridWidth - colModel.getTotalWidth()) / width;
        
        while (columns.length) {
            colWidth = columns.pop();
            i        = columns.pop();
            
            colModel.setColumnWidth(i, Math.max(grid.minColumnWidth, Math.floor(colWidth + colWidth * fraction)), true);
        }
        
        //this has been changed above so remeasure now
        totalColWidth = colModel.getTotalWidth(false);
        
        if (totalColWidth > gridWidth) {
            var adjustCol = (adjCount == visibleColCount) ? extraCol : omitColumn,
                newWidth  = Math.max(1, colModel.getColumnWidth(adjustCol) - (totalColWidth - gridWidth));
            
            colModel.setColumnWidth(adjustCol, newWidth, true);
        }
        
        if (preventRefresh !== true) {
            this.updateAllColumnWidths();
        }
        
        return true;
    },

    /**
     * @private
     * Resizes the configured autoExpandColumn to take the available width after the other columns have 
     * been accounted for
     * @param {Boolean} preventUpdate True to prevent the resizing of all rows (defaults to false)
     */
    autoExpand : function(preventUpdate) {
        var grid             = this.grid,
            colModel         = this.cm,
            gridWidth        = this.getGridInnerWidth(),
            totalColumnWidth = colModel.getTotalWidth(false),
            autoExpandColumn = grid.autoExpandColumn;
        
        if (!this.userResized && autoExpandColumn) {
            if (gridWidth != totalColumnWidth) {
                //if we are not already using all available width, resize the autoExpandColumn
                var colIndex     = colModel.getIndexById(autoExpandColumn),
                    currentWidth = colModel.getColumnWidth(colIndex),
                    desiredWidth = gridWidth - totalColumnWidth + currentWidth,
                    newWidth     = Math.min(Math.max(desiredWidth, grid.autoExpandMin), grid.autoExpandMax);
                
                if (currentWidth != newWidth) {
                    colModel.setColumnWidth(colIndex, newWidth, true);
                    
                    if (preventUpdate !== true) {
                        this.updateColumnWidth(colIndex, newWidth);
                    }
                }
            }
        }
    },
    
    /**
     * Returns the total internal width available to the grid, taking the scrollbar into account
     * @return {Number} The total width
     */
    getGridInnerWidth: function() {
        return this.grid.getGridEl().getWidth(true) - this.getScrollOffset();
    },

    /**
     * @private
     * Returns an array of column configurations - one for each column
     * @return {Array} Array of column config objects. This includes the column name, renderer, id style and renderer
     */
    getColumnData : function() {
        var columns  = [],
            colModel = this.cm,
            colCount = colModel.getColumnCount(),
            fields   = this.ds.fields,
            i, name;
        
        for (i = 0; i < colCount; i++) {
            name = colModel.getDataIndex(i);
            
            columns[i] = {
                name    : Ext.isDefined(name) ? name : (fields.get(i) ? fields.get(i).name : undefined),
                renderer: colModel.getRenderer(i),
                scope   : colModel.getRendererScope(i),
                id      : colModel.getColumnId(i),
                style   : this.getColumnStyle(i)
            };
        }
        
        return columns;
    },

    /**
     * @private
     * Renders rows between start and end indexes
     * @param {Number} startRow Index of the first row to render
     * @param {Number} endRow Index of the last row to render
     */
    renderRows : function(startRow, endRow) {
        var grid     = this.grid,
            store    = grid.store,
            stripe   = grid.stripeRows,
            colModel = grid.colModel,
            colCount = colModel.getColumnCount(),
            rowCount = store.getCount(),
            records;
        
        if (rowCount < 1) {
            return '';
        }
        
        startRow = startRow || 0;
        endRow   = Ext.isDefined(endRow) ? endRow : rowCount - 1;
        records  = store.getRange(startRow, endRow);
        
        return this.doRender(this.getColumnData(), records, store, startRow, colCount, stripe);
    },

    // private
    renderBody : function(){
        var markup = this.renderRows() || '&#160;';
        return this.templates.body.apply({rows: markup});
    },

    /**
     * @private
     * Refreshes a row by re-rendering it. Fires the rowupdated event when done
     */
    refreshRow: function(record) {
        var store     = this.ds,
            colCount  = this.cm.getColumnCount(),
            columns   = this.getColumnData(),
            last      = colCount - 1,
            cls       = ['x-grid3-row'],
            rowParams = {
                tstyle: String.format("width: {0};", this.getTotalWidth())
            },
            colBuffer = [],
            cellTpl   = this.templates.cell,
            rowIndex, row, column, meta, css, i;
        
        if (Ext.isNumber(record)) {
            rowIndex = record;
            record   = store.getAt(rowIndex);
        } else {
            rowIndex = store.indexOf(record);
        }
        
        //the record could not be found
        if (!record || rowIndex < 0) {
            return;
        }
        
        //builds each column in this row
        for (i = 0; i < colCount; i++) {
            column = columns[i];
            
            if (i == 0) {
                css = 'x-grid3-cell-first';
            } else {
                css = (i == last) ? 'x-grid3-cell-last ' : '';
            }
            
            meta = {
                id      : column.id,
                style   : column.style,
                css     : css,
                attr    : "",
                cellAttr: ""
            };
            // Need to set this after, because we pass meta to the renderer
            meta.value = column.renderer.call(column.scope, record.data[column.name], meta, record, rowIndex, i, store);
            
            if (Ext.isEmpty(meta.value)) {
                meta.value = '&#160;';
            }
            
            if (this.markDirty && record.dirty && typeof record.modified[column.name] != 'undefined') {
                meta.css += ' x-grid3-dirty-cell';
            }
            
            colBuffer[i] = cellTpl.apply(meta);
        }
        
        row = this.getRow(rowIndex);
        row.className = '';
        
        if (this.grid.stripeRows && ((rowIndex + 1) % 2 === 0)) {
            cls.push('x-grid3-row-alt');
        }
        
        if (this.getRowClass) {
            rowParams.cols = colCount;
            cls.push(this.getRowClass(record, rowIndex, rowParams, store));
        }
        
        this.fly(row).addClass(cls).setStyle(rowParams.tstyle);
        rowParams.cells = colBuffer.join("");
        row.innerHTML = this.templates.rowInner.apply(rowParams);
        
        this.fireEvent('rowupdated', this, rowIndex, record);
    },

    /**
     * Refreshs the grid UI
     * @param {Boolean} headersToo (optional) True to also refresh the headers
     */
    refresh : function(headersToo) {
        this.fireEvent('beforerefresh', this);
        this.grid.stopEditing(true);

        var result = this.renderBody();
        this.mainBody.update(result).setWidth(this.getTotalWidth());
        if (headersToo === true) {
            this.updateHeaders();
            this.updateHeaderSortState();
        }
        this.processRows(0, true);
        this.layout();
        this.applyEmptyText();
        this.fireEvent('refresh', this);
    },

    /**
     * @private
     * Displays the configured emptyText if there are currently no rows to display
     */
    applyEmptyText : function() {
        if (this.emptyText && !this.hasRows()) {
            this.mainBody.update('<div class="x-grid-empty">' + this.emptyText + '</div>');
        }
    },

    /**
     * @private
     * Adds sorting classes to the column headers based on the bound store's sortInfo. Fires the 'sortchange' event
     * if the sorting has changed since this function was last run.
     */
    updateHeaderSortState : function() {
        var state = this.ds.getSortState();
        if (!state) {
            return;
        }

        if (!this.sortState || (this.sortState.field != state.field || this.sortState.direction != state.direction)) {
            this.grid.fireEvent('sortchange', this.grid, state);
        }

        this.sortState = state;

        var sortColumn = this.cm.findColumnIndex(state.field);
        if (sortColumn != -1) {
            var sortDir = state.direction;
            this.updateSortIcon(sortColumn, sortDir);
        }
    },

    /**
     * @private
     * Removes any sorting indicator classes from the column headers
     */
    clearHeaderSortState : function() {
        if (!this.sortState) {
            return;
        }
        this.grid.fireEvent('sortchange', this.grid, null);
        this.mainHd.select('td').removeClass(this.sortClasses);
        delete this.sortState;
    },

    /**
     * @private
     * Destroys all objects associated with the GridView
     */
    destroy : function() {
        var me              = this,
            grid            = me.grid,
            gridEl          = grid.getGridEl(),
            dragZone        = me.dragZone,
            splitZone       = me.splitZone,
            columnDrag      = me.columnDrag,
            columnDrop      = me.columnDrop,
            scrollToTopTask = me.scrollToTopTask,
            columnDragData,
            columnDragProxy;
        
        if (scrollToTopTask && scrollToTopTask.cancel) {
            scrollToTopTask.cancel();
        }
        
        Ext.destroyMembers(me, 'colMenu', 'hmenu');

        me.initData(null, null);
        me.purgeListeners();
        
        Ext.fly(me.innerHd).un("click", me.handleHdDown, me);

        if (grid.enableColumnMove) {
            columnDragData = columnDrag.dragData;
            columnDragProxy = columnDrag.proxy;
            Ext.destroy(
                columnDrag.el,
                columnDragProxy.ghost,
                columnDragProxy.el,
                columnDrop.el,
                columnDrop.proxyTop,
                columnDrop.proxyBottom,
                columnDragData.ddel,
                columnDragData.header
            );
            
            if (columnDragProxy.anim) {
                Ext.destroy(columnDragProxy.anim);
            }
            
            delete columnDragProxy.ghost;
            delete columnDragData.ddel;
            delete columnDragData.header;
            columnDrag.destroy();
            
            delete Ext.dd.DDM.locationCache[columnDrag.id];
            delete columnDrag._domRef;

            delete columnDrop.proxyTop;
            delete columnDrop.proxyBottom;
            columnDrop.destroy();
            delete Ext.dd.DDM.locationCache["gridHeader" + gridEl.id];
            delete columnDrop._domRef;
            delete Ext.dd.DDM.ids[columnDrop.ddGroup];
        }

        if (splitZone) { // enableColumnResize
            splitZone.destroy();
            delete splitZone._domRef;
            delete Ext.dd.DDM.ids["gridSplitters" + gridEl.id];
        }

        Ext.fly(me.innerHd).removeAllListeners();
        Ext.removeNode(me.innerHd);
        delete me.innerHd;

        Ext.destroy(
            me.el,
            me.mainWrap,
            me.mainHd,
            me.scroller,
            me.mainBody,
            me.focusEl,
            me.resizeMarker,
            me.resizeProxy,
            me.activeHdBtn,
            me._flyweight,
            dragZone,
            splitZone
        );

        delete grid.container;

        if (dragZone) {
            dragZone.destroy();
        }

        Ext.dd.DDM.currentTarget = null;
        delete Ext.dd.DDM.locationCache[gridEl.id];

        Ext.EventManager.removeResizeListener(me.onWindowResize, me);
    },

    // private
    onDenyColumnHide : function() {

    },

    // private
    render : function() {
        if (this.autoFill) {
            var ct = this.grid.ownerCt;
            
            if (ct && ct.getLayout()) {
                ct.on('afterlayout', function() {
                    this.fitColumns(true, true);
                    this.updateHeaders();
                    this.updateHeaderSortState();
                }, this, {single: true});
            }
        } else if (this.forceFit) {
            this.fitColumns(true, false);
        } else if (this.grid.autoExpandColumn) {
            this.autoExpand(true);
        }
        
        this.grid.getGridEl().dom.innerHTML = this.renderUI();
        
        this.afterRenderUI();
    },

    /* --------------------------------- Model Events and Handlers --------------------------------*/
    
    /**
     * @private
     * Binds a new Store and ColumnModel to this GridView. Removes any listeners from the old objects (if present)
     * and adds listeners to the new ones
     * @param {Ext.data.Store} newStore The new Store instance
     * @param {Ext.grid.ColumnModel} newColModel The new ColumnModel instance
     */
    initData : function(newStore, newColModel) {
        var me = this;
        
        if (me.ds) {
            var oldStore = me.ds;
            
            oldStore.un('add', me.onAdd, me);
            oldStore.un('load', me.onLoad, me);
            oldStore.un('clear', me.onClear, me);
            oldStore.un('remove', me.onRemove, me);
            oldStore.un('update', me.onUpdate, me);
            oldStore.un('datachanged', me.onDataChange, me);
            
            if (oldStore !== newStore && oldStore.autoDestroy) {
                oldStore.destroy();
            }
        }
        
        if (newStore) {
            newStore.on({
                scope      : me,
                load       : me.onLoad,
                add        : me.onAdd,
                remove     : me.onRemove,
                update     : me.onUpdate,
                clear      : me.onClear,
                datachanged: me.onDataChange
            });
        }
        
        if (me.cm) {
            var oldColModel = me.cm;
            
            oldColModel.un('configchange', me.onColConfigChange, me);
            oldColModel.un('widthchange',  me.onColWidthChange, me);
            oldColModel.un('headerchange', me.onHeaderChange, me);
            oldColModel.un('hiddenchange', me.onHiddenChange, me);
            oldColModel.un('columnmoved',  me.onColumnMove, me);
        }
        
        if (newColModel) {
            delete me.lastViewWidth;
            
            newColModel.on({
                scope       : me,
                configchange: me.onColConfigChange,
                widthchange : me.onColWidthChange,
                headerchange: me.onHeaderChange,
                hiddenchange: me.onHiddenChange,
                columnmoved : me.onColumnMove
            });
        }
        
        me.ds = newStore;
        me.cm = newColModel;
    },

    // private
    onDataChange : function(){
        this.refresh(true);
        this.updateHeaderSortState();
        this.syncFocusEl(0);
    },

    // private
    onClear : function() {
        this.refresh();
        this.syncFocusEl(0);
    },

    // private
    onUpdate : function(store, record) {
        this.refreshRow(record);
    },

    // private
    onAdd : function(store, records, index) {
        this.insertRows(store, index, index + (records.length-1));
    },

    // private
    onRemove : function(store, record, index, isUpdate) {
        if (isUpdate !== true) {
            this.fireEvent('beforerowremoved', this, index, record);
        }
        
        this.removeRow(index);
        
        if (isUpdate !== true) {
            this.processRows(index);
            this.applyEmptyText();
            this.fireEvent('rowremoved', this, index, record);
        }
    },

    /**
     * @private
     * Called when a store is loaded, scrolls to the top row
     */
    onLoad : function() {
        if (Ext.isGecko) {
            if (!this.scrollToTopTask) {
                this.scrollToTopTask = new Ext.util.DelayedTask(this.scrollToTop, this);
            }
            this.scrollToTopTask.delay(1);
        } else {
            this.scrollToTop();
        }
    },

    // private
    onColWidthChange : function(cm, col, width) {
        this.updateColumnWidth(col, width);
    },

    // private
    onHeaderChange : function(cm, col, text) {
        this.updateHeaders();
    },

    // private
    onHiddenChange : function(cm, col, hidden) {
        this.updateColumnHidden(col, hidden);
    },

    // private
    onColumnMove : function(cm, oldIndex, newIndex) {
        this.indexMap = null;
        this.refresh(true);
        this.restoreScroll(this.getScrollState());
        
        this.afterMove(newIndex);
        this.grid.fireEvent('columnmove', oldIndex, newIndex);
    },

    // private
    onColConfigChange : function() {
        delete this.lastViewWidth;
        this.indexMap = null;
        this.refresh(true);
    },

    /* -------------------- UI Events and Handlers ------------------------------ */
    // private
    initUI : function(grid) {
        grid.on('headerclick', this.onHeaderClick, this);
    },

    // private
    initEvents : Ext.emptyFn,

    // private
    onHeaderClick : function(g, index) {
        if (this.headersDisabled || !this.cm.isSortable(index)) {
            return;
        }
        g.stopEditing(true);
        g.store.sort(this.cm.getDataIndex(index));
    },

    /**
     * @private
     * Adds the hover class to a row when hovered over
     */
    onRowOver : function(e, target) {
        var row = this.findRowIndex(target);
        
        if (row !== false) {
            this.addRowClass(row, this.rowOverCls);
        }
    },

    /**
     * @private
     * Removes the hover class from a row on mouseout
     */
    onRowOut : function(e, target) {
        var row = this.findRowIndex(target);
        
        if (row !== false && !e.within(this.getRow(row), true)) {
            this.removeRowClass(row, this.rowOverCls);
        }
    },

    // private
    onRowSelect : function(row) {
        this.addRowClass(row, this.selectedRowClass);
    },

    // private
    onRowDeselect : function(row) {
        this.removeRowClass(row, this.selectedRowClass);
    },

    // private
    onCellSelect : function(row, col) {
        var cell = this.getCell(row, col);
        if (cell) {
            this.fly(cell).addClass('x-grid3-cell-selected');
        }
    },

    // private
    onCellDeselect : function(row, col) {
        var cell = this.getCell(row, col);
        if (cell) {
            this.fly(cell).removeClass('x-grid3-cell-selected');
        }
    },

    // private
    handleWheel : function(e) {
        e.stopPropagation();
    },

    /**
     * @private
     * Called by the SplitDragZone when a drag has been completed. Resizes the columns
     */
    onColumnSplitterMoved : function(cellIndex, width) {
        this.userResized = true;
        this.grid.colModel.setColumnWidth(cellIndex, width, true);

        if (this.forceFit) {
            this.fitColumns(true, false, cellIndex);
            this.updateAllColumnWidths();
        } else {
            this.updateColumnWidth(cellIndex, width);
            this.syncHeaderScroll();
        }

        this.grid.fireEvent('columnresize', cellIndex, width);
    },

    /**
     * @private
     * Click handler for the shared column dropdown menu, called on beforeshow. Builds the menu
     * which displays the list of columns for the user to show or hide.
     */
    beforeColMenuShow : function() {
        var colModel = this.cm,
            colCount = colModel.getColumnCount(),
            colMenu  = this.colMenu,
            i;

        colMenu.removeAll();

        for (i = 0; i < colCount; i++) {
            if (colModel.config[i].hideable !== false) {
                colMenu.add(new Ext.menu.CheckItem({
                    text       : colModel.getColumnHeader(i),
                    itemId     : 'col-' + colModel.getColumnId(i),
                    checked    : !colModel.isHidden(i),
                    disabled   : colModel.config[i].hideable === false,
                    hideOnClick: false
                }));
            }
        }
    },
    
    /**
     * @private
     * Attached as the 'itemclick' handler to the header menu and the column show/hide submenu (if available).
     * Performs sorting if the sorter buttons were clicked, otherwise hides/shows the column that was clicked.
     */
    handleHdMenuClick : function(item) {
        var store     = this.ds,
            dataIndex = this.cm.getDataIndex(this.hdCtxIndex);

        switch (item.getItemId()) {
            case 'asc':
                store.sort(dataIndex, 'ASC');
                break;
            case 'desc':
                store.sort(dataIndex, 'DESC');
                break;
            default:
                this.handleHdMenuClickDefault(item);
        }
        return true;
    },
    
    /**
     * Called by handleHdMenuClick if any button except a sort ASC/DESC button was clicked. The default implementation provides
     * the column hide/show functionality based on the check state of the menu item. A different implementation can be provided
     * if needed.
     * @param {Ext.menu.BaseItem} item The menu item that was clicked
     */
    handleHdMenuClickDefault: function(item) {
        var colModel = this.cm,
            itemId   = item.getItemId(),
            index    = colModel.getIndexById(itemId.substr(4));

        if (index != -1) {
            if (item.checked && colModel.getColumnsBy(this.isHideableColumn, this).length <= 1) {
                this.onDenyColumnHide();
                return;
            }
            colModel.setHidden(index, item.checked);
        }
    },

    /**
     * @private
     * Called when a header cell is clicked - shows the menu if the click happened over a trigger button
     */
    handleHdDown : function(e, target) {
        if (Ext.fly(target).hasClass('x-grid3-hd-btn')) {
            e.stopEvent();
            
            var colModel  = this.cm,
                header    = this.findHeaderCell(target),
                index     = this.getCellIndex(header),
                sortable  = colModel.isSortable(index),
                menu      = this.hmenu,
                menuItems = menu.items,
                menuCls   = this.headerMenuOpenCls;
            
            this.hdCtxIndex = index;
            
            Ext.fly(header).addClass(menuCls);
            menuItems.get('asc').setDisabled(!sortable);
            menuItems.get('desc').setDisabled(!sortable);
            
            menu.on('hide', function() {
                Ext.fly(header).removeClass(menuCls);
            }, this, {single:true});
            
            menu.show(target, 'tl-bl?');
        }
    },

    /**
     * @private
     * Attached to the headers' mousemove event. This figures out the CSS cursor to use based on where the mouse is currently
     * pointed. If the mouse is currently hovered over the extreme left or extreme right of any header cell and the cell next 
     * to it is resizable it is given the resize cursor, otherwise the cursor is set to an empty string.
     */
    handleHdMove : function(e) {
        var header = this.findHeaderCell(this.activeHdRef);
        
        if (header && !this.headersDisabled) {
            var handleWidth  = this.splitHandleWidth || 5,
                activeRegion = this.activeHdRegion,
                headerStyle  = header.style,
                colModel     = this.cm,
                cursor       = '',
                pageX        = e.getPageX();
                
            if (this.grid.enableColumnResize !== false) {
                var activeHeaderIndex = this.activeHdIndex,
                    previousVisible   = this.getPreviousVisible(activeHeaderIndex),
                    currentResizable  = colModel.isResizable(activeHeaderIndex),
                    previousResizable = previousVisible && colModel.isResizable(previousVisible),
                    inLeftResizer     = pageX - activeRegion.left <= handleWidth,
                    inRightResizer    = activeRegion.right - pageX <= (!this.activeHdBtn ? handleWidth : 2);
                
                if (inLeftResizer && previousResizable) {
                    cursor = Ext.isAir ? 'move' : Ext.isWebKit ? 'e-resize' : 'col-resize'; // col-resize not always supported
                } else if (inRightResizer && currentResizable) {
                    cursor = Ext.isAir ? 'move' : Ext.isWebKit ? 'w-resize' : 'col-resize';
                }
            }
            
            headerStyle.cursor = cursor;
        }
    },
    
    /**
     * @private
     * Returns the index of the nearest currently visible header to the left of the given index.
     * @param {Number} index The header index
     * @return {Number/undefined} The index of the nearest visible header
     */
    getPreviousVisible: function(index) {
        while (index > 0) {
            if (!this.cm.isHidden(index - 1)) {
                return index;
            }
            index--;
        }
        return undefined;
    },

    /**
     * @private
     * Tied to the header element's mouseover event - adds the over class to the header cell if the menu is not disabled
     * for that cell
     */
    handleHdOver : function(e, target) {
        var header = this.findHeaderCell(target);
        
        if (header && !this.headersDisabled) {
            var fly = this.fly(header);
            
            this.activeHdRef = target;
            this.activeHdIndex = this.getCellIndex(header);
            this.activeHdRegion = fly.getRegion();
            
            if (!this.isMenuDisabled(this.activeHdIndex, fly)) {
                fly.addClass('x-grid3-hd-over');
                this.activeHdBtn = fly.child('.x-grid3-hd-btn');
                
                if (this.activeHdBtn) {
                    this.activeHdBtn.dom.style.height = (header.firstChild.offsetHeight - 1) + 'px';
                }
            }
        }
    },

    /**
     * @private
     * Tied to the header element's mouseout event. Removes the hover class from the header cell
     */
    handleHdOut : function(e, target) {
        var header = this.findHeaderCell(target);
        
        if (header && (!Ext.isIE || !e.within(header, true))) {
            this.activeHdRef = null;
            this.fly(header).removeClass('x-grid3-hd-over');
            header.style.cursor = '';
        }
    },
    
    /**
     * @private
     * Used by {@link #handleHdOver} to determine whether or not to show the header menu class on cell hover
     * @param {Number} cellIndex The header cell index
     * @param {Ext.Element} el The cell element currently being hovered over
     */
    isMenuDisabled: function(cellIndex, el) {
        return this.cm.isMenuDisabled(cellIndex);
    },

    /**
     * @private
     * Returns true if there are any rows rendered into the GridView
     * @return {Boolean} True if any rows have been rendered
     */
    hasRows : function() {
        var fc = this.mainBody.dom.firstChild;
        return fc && fc.nodeType == 1 && fc.className != 'x-grid-empty';
    },
    
    /**
     * @private
     */
    isHideableColumn : function(c) {
        return !c.hidden;
    },

    /**
     * @private
     * DEPRECATED - will be removed in Ext JS 5.0
     */
    bind : function(d, c) {
        this.initData(d, c);
    }
});


// private
// This is a support class used internally by the Grid components
Ext.grid.GridView.SplitDragZone = Ext.extend(Ext.dd.DDProxy, {

    constructor: function(grid, hd){
        this.grid = grid;
        this.view = grid.getView();
        this.marker = this.view.resizeMarker;
        this.proxy = this.view.resizeProxy;
        Ext.grid.GridView.SplitDragZone.superclass.constructor.call(this, hd,
            'gridSplitters' + this.grid.getGridEl().id, {
            dragElId : Ext.id(this.proxy.dom), resizeFrame:false
        });
        this.scroll = false;
        this.hw = this.view.splitHandleWidth || 5;
    },

    b4StartDrag : function(x, y){
        this.dragHeadersDisabled = this.view.headersDisabled;
        this.view.headersDisabled = true;
        var h = this.view.mainWrap.getHeight();
        this.marker.setHeight(h);
        this.marker.show();
        this.marker.alignTo(this.view.getHeaderCell(this.cellIndex), 'tl-tl', [-2, 0]);
        this.proxy.setHeight(h);
        var w = this.cm.getColumnWidth(this.cellIndex),
            minw = Math.max(w-this.grid.minColumnWidth, 0);
        this.resetConstraints();
        this.setXConstraint(minw, 1000);
        this.setYConstraint(0, 0);
        this.minX = x - minw;
        this.maxX = x + 1000;
        this.startPos = x;
        Ext.dd.DDProxy.prototype.b4StartDrag.call(this, x, y);
    },

    allowHeaderDrag : function(e){
        return true;
    },

    handleMouseDown : function(e){
        var t = this.view.findHeaderCell(e.getTarget());
        if(t && this.allowHeaderDrag(e)){
            var xy = this.view.fly(t).getXY(), 
                x = xy[0],
                exy = e.getXY(), 
                ex = exy[0],
                w = t.offsetWidth, 
                adjust = false;
                
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
        var v = this.view,
            endX = Math.max(this.minX, e.getPageX()),
            diff = endX - this.startPos,
            disabled = this.dragHeadersDisabled;
            
        v.onColumnSplitterMoved(this.cellIndex, this.cm.getColumnWidth(this.cellIndex)+diff);
        setTimeout(function(){
            v.headersDisabled = disabled;
        }, 50);
    },

    autoOffset : function(){
        this.setDelta(0,0);
    }
});
/**
 * @class Ext.grid.PivotGridView
 * @extends Ext.grid.GridView
 * Specialised GridView for rendering Pivot Grid components. Config can be passed to the PivotGridView via the PivotGrid constructor's
 * viewConfig option:
<pre><code>
new Ext.grid.PivotGrid({
    viewConfig: {
        title: 'My Pivot Grid',
        getCellCls: function(value) {
            return value > 10 'red' : 'green';
        }
    }
});
</code></pre>
 * <p>Currently {@link #title} and {@link #getCellCls} are the only configuration options accepted by PivotGridView. All other 
 * interaction is performed via the {@link Ext.grid.PivotGrid PivotGrid} class.</p>
 */
Ext.grid.PivotGridView = Ext.extend(Ext.grid.GridView, {
    
    /**
     * The CSS class added to all group header cells. Defaults to 'grid-hd-group-cell'
     * @property colHeaderCellCls
     * @type String
     */
    colHeaderCellCls: 'grid-hd-group-cell',
    
    /**
     * @cfg {String} title Optional title to be placed in the top left corner of the PivotGrid. Defaults to an empty string.
     */
    title: '',
    
    /**
     * @cfg {Function} getCellCls Optional function which should return a CSS class name for each cell value. This is useful when
     * color coding cells based on their value. Defaults to undefined.
     */
    
    /**
     * Returns the headers to be rendered at the top of the grid. Should be a 2-dimensional array, where each item specifies the number
     * of columns it groups (column in this case refers to normal grid columns). In the example below we have 5 city groups, which are
     * each part of a continent supergroup. The colspan for each city group refers to the number of normal grid columns that group spans,
     * so in this case the grid would be expected to have a total of 12 columns:
<pre><code>
[
    {
        items: [
            {header: 'England',   colspan: 5},
            {header: 'USA',       colspan: 3}
        ]
    },
    {
        items: [
            {header: 'London',    colspan: 2},
            {header: 'Cambridge', colspan: 3},
            {header: 'Palo Alto', colspan: 3}
        ]
    }
]
</code></pre>
     * In the example above we have cities nested under countries. The nesting could be deeper if desired - e.g. Continent -> Country ->
     * State -> City, or any other structure. The only constaint is that the same depth must be used throughout the structure.
     * @return {Array} A tree structure containing the headers to be rendered. Must include the colspan property at each level, which should
     * be the sum of all child nodes beneath this node.
     */
    getColumnHeaders: function() {
        return this.grid.topAxis.buildHeaders();;
    },
    
    /**
     * Returns the headers to be rendered on the left of the grid. Should be a 2-dimensional array, where each item specifies the number
     * of rows it groups. In the example below we have 5 city groups, which are each part of a continent supergroup. The rowspan for each 
     * city group refers to the number of normal grid columns that group spans, so in this case the grid would be expected to have a 
     * total of 12 rows:
<pre><code>
[
    {
        width: 90,
        items: [
            {header: 'England',   rowspan: 5},
            {header: 'USA',       rowspan: 3}
        ]
    },
    {
        width: 50,
        items: [
            {header: 'London',    rowspan: 2},
            {header: 'Cambridge', rowspan: 3},
            {header: 'Palo Alto', rowspan: 3}
        ]
    }
]
</code></pre>
     * In the example above we have cities nested under countries. The nesting could be deeper if desired - e.g. Continent -> Country ->
     * State -> City, or any other structure. The only constaint is that the same depth must be used throughout the structure.
     * @return {Array} A tree structure containing the headers to be rendered. Must include the colspan property at each level, which should
     * be the sum of all child nodes beneath this node.
     * Each group may specify the width it should be rendered with.
     * @return {Array} The row groups
     */
    getRowHeaders: function() {
        return this.grid.leftAxis.buildHeaders();
    },
    
    /**
     * @private
     * Renders rows between start and end indexes
     * @param {Number} startRow Index of the first row to render
     * @param {Number} endRow Index of the last row to render
     */
    renderRows : function(startRow, endRow) {
        var grid          = this.grid,
            rows          = grid.extractData(),
            rowCount      = rows.length,
            templates     = this.templates,
            renderer      = grid.renderer,
            hasRenderer   = typeof renderer == 'function',
            getCellCls    = this.getCellCls,
            hasGetCellCls = typeof getCellCls == 'function',
            cellTemplate  = templates.cell,
            rowTemplate   = templates.row,
            rowBuffer     = [],
            meta          = {},
            tstyle        = 'width:' + this.getGridInnerWidth() + 'px;',
            colBuffer, column, i;
        
        startRow = startRow || 0;
        endRow   = Ext.isDefined(endRow) ? endRow : rowCount - 1;
        
        for (i = 0; i < rowCount; i++) {
            row = rows[i];
            colCount  = row.length;
            colBuffer = [];
            
            rowIndex = startRow + i;

            //build up each column's HTML
            for (j = 0; j < colCount; j++) {
                cell = row[j];

                meta.css   = j === 0 ? 'x-grid3-cell-first ' : (j == (colCount - 1) ? 'x-grid3-cell-last ' : '');
                meta.attr  = meta.cellAttr = '';
                meta.value = cell;

                if (Ext.isEmpty(meta.value)) {
                    meta.value = '&#160;';
                }
                
                if (hasRenderer) {
                    meta.value = renderer(meta.value);
                }
                
                if (hasGetCellCls) {
                    meta.css += getCellCls(meta.value) + ' ';
                }

                colBuffer[colBuffer.length] = cellTemplate.apply(meta);
            }
            
            rowBuffer[rowBuffer.length] = rowTemplate.apply({
                tstyle: tstyle,
                cols  : colCount,
                cells : colBuffer.join(""),
                alt   : ''
            });
        }
        
        return rowBuffer.join("");
    },
    
    /**
     * The master template to use when rendering the GridView. Has a default template
     * @property Ext.Template
     * @type masterTpl
     */
    masterTpl: new Ext.Template(
        '<div class="x-grid3 x-pivotgrid" hidefocus="true">',
            '<div class="x-grid3-viewport">',
                '<div class="x-grid3-header">',
                    '<div class="x-grid3-header-title"><span>{title}</span></div>',
                    '<div class="x-grid3-header-inner">',
                        '<div class="x-grid3-header-offset" style="{ostyle}"></div>',
                    '</div>',
                    '<div class="x-clear"></div>',
                '</div>',
                '<div class="x-grid3-scroller">',
                    '<div class="x-grid3-row-headers"></div>',
                    '<div class="x-grid3-body" style="{bstyle}">{body}</div>',
                    '<a href="#" class="x-grid3-focus" tabIndex="-1"></a>',
                '</div>',
            '</div>',
            '<div class="x-grid3-resize-marker">&#160;</div>',
            '<div class="x-grid3-resize-proxy">&#160;</div>',
        '</div>'
    ),
    
    /**
     * @private
     * Adds a gcell template to the internal templates object. This is used to render the headers in a multi-level column header.
     */
    initTemplates: function() {
        Ext.grid.PivotGridView.superclass.initTemplates.apply(this, arguments);
        
        var templates = this.templates || {};
        if (!templates.gcell) {
            templates.gcell = new Ext.XTemplate(
                '<td class="x-grid3-hd x-grid3-gcell x-grid3-td-{id} ux-grid-hd-group-row-{row} ' + this.colHeaderCellCls + '" style="{style}">',
                    '<div {tooltip} class="x-grid3-hd-inner x-grid3-hd-{id}" unselectable="on" style="{istyle}">', 
                        this.grid.enableHdMenu ? '<a class="x-grid3-hd-btn" href="#"></a>' : '', '{value}',
                    '</div>',
                '</td>'
            );
        }
        
        this.templates = templates;
        this.hrowRe = new RegExp("ux-grid-hd-group-row-(\\d+)", "");
    },
    
    /**
     * @private
     * Sets up the reference to the row headers element
     */
    initElements: function() {
        Ext.grid.PivotGridView.superclass.initElements.apply(this, arguments);
        
        /**
         * @property rowHeadersEl
         * @type Ext.Element
         * The element containing all row headers
         */
        this.rowHeadersEl = new Ext.Element(this.scroller.child('div.x-grid3-row-headers'));
        
        /**
         * @property headerTitleEl
         * @type Ext.Element
         * The element that contains the optional title (top left section of the pivot grid)
         */
        this.headerTitleEl = new Ext.Element(this.mainHd.child('div.x-grid3-header-title'));
    },
    
    /**
     * @private
     * Takes row headers into account when calculating total available width
     */
    getGridInnerWidth: function() {
        var previousWidth = Ext.grid.PivotGridView.superclass.getGridInnerWidth.apply(this, arguments);
        
        return previousWidth - this.getTotalRowHeaderWidth();
    },
    
    /**
     * Returns the total width of all row headers as specified by {@link #getRowHeaders}
     * @return {Number} The total width
     */
    getTotalRowHeaderWidth: function() {
        var headers = this.getRowHeaders(),
            length  = headers.length,
            total   = 0,
            i;
        
        for (i = 0; i< length; i++) {
            total += headers[i].width;
        }
        
        return total;
    },
    
    /**
     * @private
     * Returns the total height of all column headers
     * @return {Number} The total height
     */
    getTotalColumnHeaderHeight: function() {
        return this.getColumnHeaders().length * 21;
    },
    
    /**
     * @private
     * Slight specialisation of the GridView renderUI - just adds the row headers
     */
    renderUI : function() {
        var templates  = this.templates,
            innerWidth = this.getGridInnerWidth();
            
        return templates.master.apply({
            body  : templates.body.apply({rows:'&#160;'}),
            ostyle: 'width:' + innerWidth + 'px',
            bstyle: 'width:' + innerWidth + 'px'
        });
    },
    
    /**
     * @private
     * Make sure that the headers and rows are all sized correctly during layout
     */
    onLayout: function(width, height) {
        Ext.grid.PivotGridView.superclass.onLayout.apply(this, arguments);
        
        var width = this.getGridInnerWidth();
        
        this.resizeColumnHeaders(width);
        this.resizeAllRows(width);
    },
    
    /**
     * Refreshs the grid UI
     * @param {Boolean} headersToo (optional) True to also refresh the headers
     */
    refresh : function(headersToo) {
        this.fireEvent('beforerefresh', this);
        this.grid.stopEditing(true);
        
        var result = this.renderBody();
        this.mainBody.update(result).setWidth(this.getGridInnerWidth());
        if (headersToo === true) {
            this.updateHeaders();
            this.updateHeaderSortState();
        }
        this.processRows(0, true);
        this.layout();
        this.applyEmptyText();
        this.fireEvent('refresh', this);
    },
    
    /**
     * @private
     * Bypasses GridView's renderHeaders as they are taken care of separately by the PivotAxis instances
     */
    renderHeaders: Ext.emptyFn,
    
    /**
     * @private
     * Taken care of by PivotAxis
     */
    fitColumns: Ext.emptyFn,
    
    /**
     * @private
     * Called on layout, ensures that the width of each column header is correct. Omitting this can lead to faulty
     * layouts when nested in a container.
     * @param {Number} width The new width
     */
    resizeColumnHeaders: function(width) {
        var topAxis = this.grid.topAxis;
        
        if (topAxis.rendered) {
            topAxis.el.setWidth(width);
        }
    },
    
    /**
     * @private
     * Sets the row header div to the correct width. Should be called after rendering and reconfiguration of headers
     */
    resizeRowHeaders: function() {
        var rowHeaderWidth = this.getTotalRowHeaderWidth(),
            marginStyle    = String.format("margin-left: {0}px;", rowHeaderWidth);
        
        this.rowHeadersEl.setWidth(rowHeaderWidth);
        this.mainBody.applyStyles(marginStyle);
        Ext.fly(this.innerHd).applyStyles(marginStyle);
        
        this.headerTitleEl.setWidth(rowHeaderWidth);
        this.headerTitleEl.setHeight(this.getTotalColumnHeaderHeight());
    },
    
    /**
     * @private
     * Resizes all rendered rows to the given width. Usually called by onLayout
     * @param {Number} width The new width
     */
    resizeAllRows: function(width) {
        var rows   = this.getRows(),
            length = rows.length,
            i;
        
        for (i = 0; i < length; i++) {
            Ext.fly(rows[i]).setWidth(width);
            Ext.fly(rows[i]).child('table').setWidth(width);
        }
    },
    
    /**
     * @private
     * Updates the Row Headers, deferring the updating of Column Headers to GridView
     */
    updateHeaders: function() {
        this.renderGroupRowHeaders();
        this.renderGroupColumnHeaders();
    },
    
    /**
     * @private
     * Renders all row header groups at all levels based on the structure fetched from {@link #getGroupRowHeaders}
     */
    renderGroupRowHeaders: function() {
        var leftAxis = this.grid.leftAxis;
        
        this.resizeRowHeaders();
        leftAxis.rendered = false;
        leftAxis.render(this.rowHeadersEl);
        
        this.setTitle(this.title);
    },
    
    /**
     * Sets the title text in the top left segment of the PivotGridView
     * @param {String} title The title
     */
    setTitle: function(title) {
        this.headerTitleEl.child('span').dom.innerHTML = title;
    },
    
    /**
     * @private
     * Renders all column header groups at all levels based on the structure fetched from {@link #getColumnHeaders}
     */
    renderGroupColumnHeaders: function() {
        var topAxis = this.grid.topAxis;
        
        topAxis.rendered = false;
        topAxis.render(this.innerHd.firstChild);
    },
    
    /**
     * @private
     * Overridden to test whether the user is hovering over a group cell, in which case we don't show the menu
     */
    isMenuDisabled: function(cellIndex, el) {
        return true;
    }
});/**
 * @class Ext.grid.PivotAxis
 * @extends Ext.Component
 * <p>PivotAxis is a class that supports a {@link Ext.grid.PivotGrid}. Each PivotGrid contains two PivotAxis instances - the left
 * axis and the top axis. Each PivotAxis defines an ordered set of dimensions, each of which should correspond to a field in a
 * Store's Record (see {@link Ext.grid.PivotGrid} documentation for further explanation).</p>
 * <p>Developers should have little interaction with the PivotAxis instances directly as most of their management is performed by
 * the PivotGrid. An exception is the dynamic reconfiguration of axes at run time - to achieve this we use PivotAxis's 
 * {@link #setDimensions} function and refresh the grid:</p>
<pre><code>
var pivotGrid = new Ext.grid.PivotGrid({
    //some PivotGrid config here
});

//change the left axis dimensions
pivotGrid.leftAxis.setDimensions([
    {
        dataIndex: 'person',
        direction: 'DESC',
        width    : 100
    },
    {
        dataIndex: 'product',
        direction: 'ASC',
        width    : 80
    }
]);

pivotGrid.view.refresh(true);
</code></pre>
 * This clears the previous dimensions on the axis and redraws the grid with the new dimensions.
 */
Ext.grid.PivotAxis = Ext.extend(Ext.Component, {
    /**
     * @cfg {String} orientation One of 'vertical' or 'horizontal'. Defaults to horizontal
     */
    orientation: 'horizontal',
    
    /**
     * @cfg {Number} defaultHeaderWidth The width to render each row header that does not have a width specified via 
     {@link #getRowGroupHeaders}. Defaults to 80.
     */
    defaultHeaderWidth: 80,
    
    /**
     * @private
     * @cfg {Number} paddingWidth The amount of padding used by each cell.
     * TODO: From 4.x onwards this can be removed as it won't be needed. For now it is used to account for the differences between
     * the content box and border box measurement models
     */
    paddingWidth: 7,
    
    /**
     * Updates the dimensions used by this axis
     * @param {Array} dimensions The new dimensions
     */
    setDimensions: function(dimensions) {
        this.dimensions = dimensions;
    },
    
    /**
     * @private
     * Builds the html table that contains the dimensions for this axis. This branches internally between vertical
     * and horizontal orientations because the table structure is slightly different in each case
     */
    onRender: function(ct, position) {
        var rows = this.orientation == 'horizontal'
                 ? this.renderHorizontalRows()
                 : this.renderVerticalRows();
        
        this.el = Ext.DomHelper.overwrite(ct.dom, {tag: 'table', cn: rows}, true);
    },
    
    /**
     * @private
     * Specialised renderer for horizontal oriented axes
     * @return {Object} The HTML Domspec for a horizontal oriented axis
     */
    renderHorizontalRows: function() {
        var headers  = this.buildHeaders(),
            rowCount = headers.length,
            rows     = [],
            cells, cols, colCount, i, j;
        
        for (i = 0; i < rowCount; i++) {
            cells = [];
            cols  = headers[i].items;
            colCount = cols.length;

            for (j = 0; j < colCount; j++) {
                cells.push({
                    tag: 'td',
                    html: cols[j].header,
                    colspan: cols[j].span
                });
            }

            rows[i] = {
                tag: 'tr',
                cn: cells
            };
        }
        
        return rows;
    },
    
    /**
     * @private
     * Specialised renderer for vertical oriented axes
     * @return {Object} The HTML Domspec for a vertical oriented axis
     */
    renderVerticalRows: function() {
        var headers  = this.buildHeaders(),
            colCount = headers.length,
            rowCells = [],
            rows     = [],
            rowCount, col, row, colWidth, i, j;
        
        for (i = 0; i < colCount; i++) {
            col = headers[i];
            colWidth = col.width || 80;
            rowCount = col.items.length;
            
            for (j = 0; j < rowCount; j++) {
                row = col.items[j];
                
                rowCells[row.start] = rowCells[row.start] || [];
                rowCells[row.start].push({
                    tag    : 'td',
                    html   : row.header,
                    rowspan: row.span,
                    width  : Ext.isBorderBox ? colWidth : colWidth - this.paddingWidth
                });
            }
        }
        
        rowCount = rowCells.length;
        for (i = 0; i < rowCount; i++) {
            rows[i] = {
                tag: 'tr',
                cn : rowCells[i]
            };
        }
        
        return rows;
    },
    
    /**
     * @private
     * Returns the set of all unique tuples based on the bound store and dimension definitions.
     * Internally we construct a new, temporary store to make use of the multi-sort capabilities of Store. In
     * 4.x this functionality should have been moved to MixedCollection so this step should not be needed.
     * @return {Array} All unique tuples
     */
    getTuples: function() {
        var newStore = new Ext.data.Store({});
        
        newStore.data = this.store.data.clone();
        newStore.fields = this.store.fields;
        
        var sorters    = [],
            dimensions = this.dimensions,
            length     = dimensions.length,
            i;
        
        for (i = 0; i < length; i++) {
            sorters.push({
                field    : dimensions[i].dataIndex,
                direction: dimensions[i].direction || 'ASC'
            });
        }
        
        newStore.sort(sorters);
        
        var records = newStore.data.items,
            hashes  = [],
            tuples  = [],
            recData, hash, info, data, key;
        
        length = records.length;
        
        for (i = 0; i < length; i++) {
            info = this.getRecordInfo(records[i]);
            data = info.data;
            hash = "";
            
            for (key in data) {
                hash += data[key] + '---';
            }
            
            if (hashes.indexOf(hash) == -1) {
                hashes.push(hash);
                tuples.push(info);
            }
        }
        
        newStore.destroy();
        
        return tuples;
    },
    
    /**
     * @private
     */
    getRecordInfo: function(record) {
        var dimensions = this.dimensions,
            length  = dimensions.length,
            data    = {},
            dimension, dataIndex, i;
        
        //get an object containing just the data we are interested in based on the configured dimensions
        for (i = 0; i < length; i++) {
            dimension = dimensions[i];
            dataIndex = dimension.dataIndex;
            
            data[dataIndex] = record.get(dataIndex);
        }
        
        //creates a specialised matcher function for a given tuple. The returned function will return
        //true if the record passed to it matches the dataIndex values of each dimension in this axis
        var createMatcherFunction = function(data) {
            return function(record) {
                for (var dataIndex in data) {
                    if (record.get(dataIndex) != data[dataIndex]) {
                        return false;
                    }
                }
                
                return true;
            };
        };
        
        return {
            data: data,
            matcher: createMatcherFunction(data)
        };
    },
    
    /**
     * @private
     * Uses the calculated set of tuples to build an array of headers that can be rendered into a table using rowspan or
     * colspan. Basically this takes the set of tuples and spans any cells that run into one another, so if we had dimensions
     * of Person and Product and several tuples containing different Products for the same Person, those Products would be
     * spanned.
     * @return {Array} The headers
     */
    buildHeaders: function() {
        var tuples     = this.getTuples(),
            rowCount   = tuples.length,
            dimensions = this.dimensions,
            colCount   = dimensions.length,
            headers    = [],
            tuple, rows, currentHeader, previousHeader, span, start, isLast, changed, i, j;
        
        for (i = 0; i < colCount; i++) {
            dimension = dimensions[i];
            rows  = [];
            span  = 0;
            start = 0;
            
            for (j = 0; j < rowCount; j++) {
                tuple  = tuples[j];
                isLast = j == (rowCount - 1);
                currentHeader = tuple.data[dimension.dataIndex];
                
                /*
                 * 'changed' indicates that we need to create a new cell. This should be true whenever the cell
                 * above (previousHeader) is different from this cell, or when the cell on the previous dimension
                 * changed (e.g. if the current dimension is Product and the previous was Person, we need to start
                 * a new cell if Product is the same but Person changed, so we check the previous dimension and tuple)
                 */
                changed = previousHeader != undefined && previousHeader != currentHeader;
                if (i > 0 && j > 0) {
                    changed = changed || tuple.data[dimensions[i-1].dataIndex] != tuples[j-1].data[dimensions[i-1].dataIndex];
                }
                
                if (changed) {                    
                    rows.push({
                        header: previousHeader,
                        span  : span,
                        start : start
                    });
                    
                    start += span;
                    span = 0;
                }
                
                if (isLast) {
                    rows.push({
                        header: currentHeader,
                        span  : span + 1,
                        start : start
                    });
                    
                    start += span;
                    span = 0;
                }
                
                previousHeader = currentHeader;
                span++;
            }
            
            headers.push({
                items: rows,
                width: dimension.width || this.defaultHeaderWidth
            });
            
            previousHeader = undefined;
        }
        
        return headers;
    }
});
// private
// This is a support class used internally by the Grid components
Ext.grid.HeaderDragZone = Ext.extend(Ext.dd.DragZone, {
    maxDragWidth: 120,
    
    constructor : function(grid, hd, hd2){
        this.grid = grid;
        this.view = grid.getView();
        this.ddGroup = "gridHeader" + this.grid.getGridEl().id;
        Ext.grid.HeaderDragZone.superclass.constructor.call(this, hd);
        if(hd2){
            this.setHandleElId(Ext.id(hd));
            this.setOuterHandleElId(Ext.id(hd2));
        }
        this.scroll = false;
    },
    
    getDragData : function(e){
        var t = Ext.lib.Event.getTarget(e),
            h = this.view.findHeaderCell(t);
        if(h){
            return {ddel: h.firstChild, header:h};
        }
        return false;
    },

    onInitDrag : function(e){
        // keep the value here so we can restore it;
        this.dragHeadersDisabled = this.view.headersDisabled;
        this.view.headersDisabled = true;
        var clone = this.dragData.ddel.cloneNode(true);
        clone.id = Ext.id();
        clone.style.width = Math.min(this.dragData.header.offsetWidth,this.maxDragWidth) + "px";
        this.proxy.update(clone);
        return true;
    },

    afterValidDrop : function(){
        this.completeDrop();
    },

    afterInvalidDrop : function(){
        this.completeDrop();
    },
    
    completeDrop: function(){
        var v = this.view,
            disabled = this.dragHeadersDisabled;
        setTimeout(function(){
            v.headersDisabled = disabled;
        }, 50);
    }
});

// private
// This is a support class used internally by the Grid components
Ext.grid.HeaderDropZone = Ext.extend(Ext.dd.DropZone, {
    proxyOffsets : [-4, -9],
    fly: Ext.Element.fly,
    
    constructor : function(grid, hd, hd2){
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
    },

    getTargetFromEvent : function(e){
        var t = Ext.lib.Event.getTarget(e),
            cindex = this.view.findCellIndex(t);
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
        var x = Ext.lib.Event.getPageX(e),
            r = Ext.lib.Dom.getRegion(n.firstChild),
            px, 
            pt, 
            py = r.top + this.proxyOffsets[1];
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
            var cm = this.grid.colModel,
                x = Ext.lib.Event.getPageX(e),
                r = Ext.lib.Dom.getRegion(n.firstChild),
                pt = (r.right - x) <= ((r.right-r.left)/2) ? "after" : "before",
                oldIndex = this.view.getCellIndex(h),
                newIndex = this.view.getCellIndex(n);
            if(pt == "after"){
                newIndex++;
            }
            if(oldIndex < newIndex){
                newIndex--;
            }
            cm.moveColumn(oldIndex, newIndex);
            return true;
        }
        return false;
    }
});

Ext.grid.GridView.ColumnDragZone = Ext.extend(Ext.grid.HeaderDragZone, {
    
    constructor : function(grid, hd){
        Ext.grid.GridView.ColumnDragZone.superclass.constructor.call(this, grid, hd, null);
        this.proxy.el.addClass('x-grid3-col-dd');
    },
    
    handleMouseDown : function(e){
    },

    callHandleMouseDown : function(e){
        Ext.grid.GridView.ColumnDragZone.superclass.handleMouseDown.call(this, e);
    }
});// private
// This is a support class used internally by the Grid components
Ext.grid.SplitDragZone = Ext.extend(Ext.dd.DDProxy, {
    fly: Ext.Element.fly,
    
    constructor : function(grid, hd, hd2){
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
    },

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
};/**
 * @class Ext.grid.AbstractSelectionModel
 * @extends Ext.util.Observable
 * Abstract base class for grid SelectionModels.  It provides the interface that should be
 * implemented by descendant classes.  This class should not be directly instantiated.
 * @constructor
 */
Ext.grid.AbstractSelectionModel = Ext.extend(Ext.util.Observable,  {
    /**
     * The GridPanel for which this SelectionModel is handling selection. Read-only.
     * @type Object
     * @property grid
     */

    constructor : function(){
        this.locked = false;
        Ext.grid.AbstractSelectionModel.superclass.constructor.call(this);
    },

    /** @ignore Called by the grid automatically. Do not call directly. */
    init : function(grid){
        this.grid = grid;
        if(this.lockOnInit){
            delete this.lockOnInit;
            this.locked = false;
            this.lock();
        }
        this.initEvents();
    },

    /**
     * Locks the selections.
     */
    lock : function(){
        if(!this.locked){
            this.locked = true;
            // If the grid has been set, then the view is already initialized.
            var g = this.grid;
            if(g){
                g.getView().on({
                    scope: this,
                    beforerefresh: this.sortUnLock,
                    refresh: this.sortLock
                });
            }else{
                this.lockOnInit = true;
            }
        }
    },

    // set the lock states before and after a view refresh
    sortLock : function() {
        this.locked = true;
    },

    // set the lock states before and after a view refresh
    sortUnLock : function() {
        this.locked = false;
    },

    /**
     * Unlocks the selections.
     */
    unlock : function(){
        if(this.locked){
            this.locked = false;
            var g = this.grid,
                gv;
                
            // If the grid has been set, then the view is already initialized.
            if(g){
                gv = g.getView();
                gv.un('beforerefresh', this.sortUnLock, this);
                gv.un('refresh', this.sortLock, this);    
            }else{
                delete this.lockOnInit;
            }
        }
    },

    /**
     * Returns true if the selections are locked.
     * @return {Boolean}
     */
    isLocked : function(){
        return this.locked;
    },

    destroy: function(){
        this.unlock();
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
/**
 * @class Ext.grid.Column
 * <p>This class encapsulates column configuration data to be used in the initialization of a
 * {@link Ext.grid.ColumnModel ColumnModel}.</p>
 * <p>While subclasses are provided to render data in different ways, this class renders a passed
 * data field unchanged and is usually used for textual columns.</p>
 */
Ext.grid.Column = Ext.extend(Ext.util.Observable, {
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
     * have a clickable header with no text displayed use <tt>'&amp;#160;'</tt>.
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
     * Defaults to the value of the <code>{@link Ext.grid.ColumnModel#defaultSortable}</code> property.
     * Whether local/remote sorting is used is specified in <code>{@link Ext.data.Store#remoteSort}</code>.
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
     * @cfg {Boolean} hidden
     * Optional. <tt>true</tt> to initially hide this column. Defaults to <tt>false</tt>.
     * A hidden column {@link Ext.grid.GridPanel#enableColumnHide may be shown via the header row menu}.
     * If a column is never to be shown, simply do not include this column in the Column Model at all.
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

    /**
     * @private
     * @cfg {Boolean} isColumn
     * Used by ColumnModel setConfig method to avoid reprocessing a Column
     * if <code>isColumn</code> is not set ColumnModel will recreate a new Ext.grid.Column
     * Defaults to true.
     */
    isColumn : true,

    constructor : function(config){
        Ext.apply(this, config);

        if(Ext.isString(this.renderer)){
            this.renderer = Ext.util.Format[this.renderer];
        }else if(Ext.isObject(this.renderer)){
            this.scope = this.renderer.scope;
            this.renderer = this.renderer.fn;
        }
        if(!this.scope){
            this.scope = this;
        }

        var ed = this.editor;
        delete this.editor;
        this.setEditor(ed);
        this.addEvents(
            /**
             * @event click
             * Fires when this Column is clicked.
             * @param {Column} this
             * @param {Grid} The owning GridPanel
             * @param {Number} rowIndex
             * @param {Ext.EventObject} e
             */
            'click',
            /**
             * @event contextmenu
             * Fires when this Column is right clicked.
             * @param {Column} this
             * @param {Grid} The owning GridPanel
             * @param {Number} rowIndex
             * @param {Ext.EventObject} e
             */
            'contextmenu',
            /**
             * @event dblclick
             * Fires when this Column is double clicked.
             * @param {Column} this
             * @param {Grid} The owning GridPanel
             * @param {Number} rowIndex
             * @param {Ext.EventObject} e
             */
            'dblclick',
            /**
             * @event mousedown
             * Fires when this Column receives a mousedown event.
             * @param {Column} this
             * @param {Grid} The owning GridPanel
             * @param {Number} rowIndex
             * @param {Ext.EventObject} e
             */
            'mousedown'
        );
        Ext.grid.Column.superclass.constructor.call(this);
    },

    /**
     * @private
     * Process and refire events routed from the GridView's processEvent method.
     * Returns the event handler's status to allow cancelling of GridView's bubbling process.
     */
    processEvent : function(name, e, grid, rowIndex, colIndex){
        return this.fireEvent(name, this, grid, rowIndex, e);
    },

    /**
     * @private
     * Clean up. Remove any Editor. Remove any listeners.
     */
    destroy: function() {
        if(this.setEditor){
            this.setEditor(null);
        }
        this.purgeListeners();
    },

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
        return value;
    },

    // private
    getEditor: function(rowIndex){
        return this.editable !== false ? this.editor : null;
    },

    /**
     * Sets a new editor for this column.
     * @param {Ext.Editor/Ext.form.Field} editor The editor to set
     */
    setEditor : function(editor){
        var ed = this.editor;
        if(ed){
            if(ed.gridEditor){
                ed.gridEditor.destroy();
                delete ed.gridEditor;
            }else{
                ed.destroy();
            }
        }
        this.editor = null;
        if(editor){
            //not an instance, create it
            if(!editor.isXType){
                editor = Ext.create(editor, 'textfield');
            }
            this.editor = editor;
        }
    },

    /**
     * Returns the {@link Ext.Editor editor} defined for this column that was created to wrap the {@link Ext.form.Field Field}
     * used to edit the cell.
     * @param {Number} rowIndex The row index
     * @return {Ext.Editor}
     */
    getCellEditor: function(rowIndex){
        var ed = this.getEditor(rowIndex);
        if(ed){
            if(!ed.startEdit){
                if(!ed.gridEditor){
                    ed.gridEditor = new Ext.grid.GridEditor(ed);
                }
                ed = ed.gridEditor;
            }
        }
        return ed;
    }
});

/**
 * @class Ext.grid.BooleanColumn
 * @extends Ext.grid.Column
 * <p>A Column definition class which renders boolean data fields.  See the {@link Ext.grid.Column#xtype xtype}
 * config option of {@link Ext.grid.Column} for more details.</p>
 */
Ext.grid.BooleanColumn = Ext.extend(Ext.grid.Column, {
    /**
     * @cfg {String} trueText
     * The string returned by the renderer when the column value is not falsy (defaults to <tt>'true'</tt>).
     */
    trueText: 'true',
    /**
     * @cfg {String} falseText
     * The string returned by the renderer when the column value is falsy (but not undefined) (defaults to
     * <tt>'false'</tt>).
     */
    falseText: 'false',
    /**
     * @cfg {String} undefinedText
     * The string returned by the renderer when the column value is undefined (defaults to <tt>'&amp;#160;'</tt>).
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
 * {@link Ext.grid.Column#xtype xtype} config option of {@link Ext.grid.Column} for more details.</p>
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
 * {@link #format}. See the {@link Ext.grid.Column#xtype xtype} config option of {@link Ext.grid.Column}
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
 * See the {@link Ext.grid.Column#xtype xtype} config option of {@link Ext.grid.Column} for more
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
        var tpl = (!Ext.isPrimitive(this.tpl) && this.tpl.compile) ? this.tpl : new Ext.XTemplate(this.tpl);
        this.renderer = function(value, p, r){
            return tpl.apply(r.data);
        };
        this.tpl = tpl;
    }
});

/**
 * @class Ext.grid.ActionColumn
 * @extends Ext.grid.Column
 * <p>A Grid column type which renders an icon, or a series of icons in a grid cell, and offers a scoped click
 * handler for each icon. Example usage:</p>
<pre><code>
new Ext.grid.GridPanel({
    store: myStore,
    columns: [
        {
            xtype: 'actioncolumn',
            width: 50,
            items: [
                {
                    icon   : 'sell.gif',                // Use a URL in the icon config
                    tooltip: 'Sell stock',
                    handler: function(grid, rowIndex, colIndex) {
                        var rec = store.getAt(rowIndex);
                        alert("Sell " + rec.get('company'));
                    }
                },
                {
                    getClass: function(v, meta, rec) {  // Or return a class from a function
                        if (rec.get('change') < 0) {
                            this.items[1].tooltip = 'Do not buy!';
                            return 'alert-col';
                        } else {
                            this.items[1].tooltip = 'Buy stock';
                            return 'buy-col';
                        }
                    },
                    handler: function(grid, rowIndex, colIndex) {
                        var rec = store.getAt(rowIndex);
                        alert("Buy " + rec.get('company'));
                    }
                }
            ]
        }
        //any other columns here
    ]
});
</pre></code>
 * <p>The action column can be at any index in the columns array, and a grid can have any number of
 * action columns. </p>
 */
Ext.grid.ActionColumn = Ext.extend(Ext.grid.Column, {
    /**
     * @cfg {String} icon
     * The URL of an image to display as the clickable element in the column. 
     * Optional - defaults to <code>{@link Ext#BLANK_IMAGE_URL Ext.BLANK_IMAGE_URL}</code>.
     */
    /**
     * @cfg {String} iconCls
     * A CSS class to apply to the icon image. To determine the class dynamically, configure the Column with a <code>{@link #getClass}</code> function.
     */
    /**
     * @cfg {Function} handler A function called when the icon is clicked.
     * The handler is passed the following parameters:<div class="mdetail-params"><ul>
     * <li><code>grid</code> : GridPanel<div class="sub-desc">The owning GridPanel.</div></li>
     * <li><code>rowIndex</code> : Number<div class="sub-desc">The row index clicked on.</div></li>
     * <li><code>colIndex</code> : Number<div class="sub-desc">The column index clicked on.</div></li>
     * <li><code>item</code> : Object<div class="sub-desc">The clicked item (or this Column if multiple 
     * {@link #items} were not configured).</div></li>
     * <li><code>e</code> : Event<div class="sub-desc">The click event.</div></li>
     * </ul></div>
     */
    /**
     * @cfg {Object} scope The scope (<tt><b>this</b></tt> reference) in which the <code>{@link #handler}</code>
     * and <code>{@link #getClass}</code> fuctions are executed. Defaults to this Column.
     */
    /**
     * @cfg {String} tooltip A tooltip message to be displayed on hover. {@link Ext.QuickTips#init Ext.QuickTips} must have 
     * been initialized.
     */
    /**
     * @cfg {Boolean} stopSelection Defaults to <code>true</code>. Prevent grid <i>row</i> selection upon mousedown.
     */
    /**
     * @cfg {Function} getClass A function which returns the CSS class to apply to the icon image.
     * The function is passed the following parameters:<div class="mdetail-params"><ul>
     *     <li><b>v</b> : Object<p class="sub-desc">The value of the column's configured field (if any).</p></li>
     *     <li><b>metadata</b> : Object<p class="sub-desc">An object in which you may set the following attributes:<ul>
     *         <li><b>css</b> : String<p class="sub-desc">A CSS class name to add to the cell's TD element.</p></li>
     *         <li><b>attr</b> : String<p class="sub-desc">An HTML attribute definition string to apply to the data container element <i>within</i> the table cell
     *         (e.g. 'style="color:red;"').</p></li>
     *     </ul></p></li>
     *     <li><b>r</b> : Ext.data.Record<p class="sub-desc">The Record providing the data.</p></li>
     *     <li><b>rowIndex</b> : Number<p class="sub-desc">The row index..</p></li>
     *     <li><b>colIndex</b> : Number<p class="sub-desc">The column index.</p></li>
     *     <li><b>store</b> : Ext.data.Store<p class="sub-desc">The Store which is providing the data Model.</p></li>
     * </ul></div>
     */
    /**
     * @cfg {Array} items An Array which may contain multiple icon definitions, each element of which may contain:
     * <div class="mdetail-params"><ul>
     * <li><code>icon</code> : String<div class="sub-desc">The url of an image to display as the clickable element 
     * in the column.</div></li>
     * <li><code>iconCls</code> : String<div class="sub-desc">A CSS class to apply to the icon image.
     * To determine the class dynamically, configure the item with a <code>getClass</code> function.</div></li>
     * <li><code>getClass</code> : Function<div class="sub-desc">A function which returns the CSS class to apply to the icon image.
     * The function is passed the following parameters:<ul>
     *     <li><b>v</b> : Object<p class="sub-desc">The value of the column's configured field (if any).</p></li>
     *     <li><b>metadata</b> : Object<p class="sub-desc">An object in which you may set the following attributes:<ul>
     *         <li><b>css</b> : String<p class="sub-desc">A CSS class name to add to the cell's TD element.</p></li>
     *         <li><b>attr</b> : String<p class="sub-desc">An HTML attribute definition string to apply to the data container element <i>within</i> the table cell
     *         (e.g. 'style="color:red;"').</p></li>
     *     </ul></p></li>
     *     <li><b>r</b> : Ext.data.Record<p class="sub-desc">The Record providing the data.</p></li>
     *     <li><b>rowIndex</b> : Number<p class="sub-desc">The row index..</p></li>
     *     <li><b>colIndex</b> : Number<p class="sub-desc">The column index.</p></li>
     *     <li><b>store</b> : Ext.data.Store<p class="sub-desc">The Store which is providing the data Model.</p></li>
     * </ul></div></li>
     * <li><code>handler</code> : Function<div class="sub-desc">A function called when the icon is clicked.</div></li>
     * <li><code>scope</code> : Scope<div class="sub-desc">The scope (<code><b>this</b></code> reference) in which the 
     * <code>handler</code> and <code>getClass</code> functions are executed. Fallback defaults are this Column's
     * configured scope, then this Column.</div></li>
     * <li><code>tooltip</code> : String<div class="sub-desc">A tooltip message to be displayed on hover. 
     * {@link Ext.QuickTips#init Ext.QuickTips} must have been initialized.</div></li>
     * </ul></div>
     */
    header: '&#160;',

    actionIdRe: /x-action-col-(\d+)/,
    
    /**
     * @cfg {String} altText The alt text to use for the image element. Defaults to <tt>''</tt>.
     */
    altText: '',

    constructor: function(cfg) {
        var me = this,
            items = cfg.items || (me.items = [me]),
            l = items.length,
            i,
            item;

        Ext.grid.ActionColumn.superclass.constructor.call(me, cfg);

//      Renderer closure iterates through items creating an <img> element for each and tagging with an identifying 
//      class name x-action-col-{n}
        me.renderer = function(v, meta) {
//          Allow a configured renderer to create initial value (And set the other values in the "metadata" argument!)
            v = Ext.isFunction(cfg.renderer) ? cfg.renderer.apply(this, arguments)||'' : '';

            meta.css += ' x-action-col-cell';
            for (i = 0; i < l; i++) {
                item = items[i];
                v += '<img alt="' + me.altText + '" src="' + (item.icon || Ext.BLANK_IMAGE_URL) +
                    '" class="x-action-col-icon x-action-col-' + String(i) + ' ' + (item.iconCls || '') +
                    ' ' + (Ext.isFunction(item.getClass) ? item.getClass.apply(item.scope||this.scope||this, arguments) : '') + '"' +
                    ((item.tooltip) ? ' ext:qtip="' + item.tooltip + '"' : '') + ' />';
            }
            return v;
        };
    },

    destroy: function() {
        delete this.items;
        delete this.renderer;
        return Ext.grid.ActionColumn.superclass.destroy.apply(this, arguments);
    },

    /**
     * @private
     * Process and refire events routed from the GridView's processEvent method.
     * Also fires any configured click handlers. By default, cancels the mousedown event to prevent selection.
     * Returns the event handler's status to allow cancelling of GridView's bubbling process.
     */
    processEvent : function(name, e, grid, rowIndex, colIndex){
        var m = e.getTarget().className.match(this.actionIdRe),
            item, fn;
        if (m && (item = this.items[parseInt(m[1], 10)])) {
            if (name == 'click') {
                (fn = item.handler || this.handler) && fn.call(item.scope||this.scope||this, grid, rowIndex, colIndex, item, e);
            } else if ((name == 'mousedown') && (item.stopSelection !== false)) {
                return false;
            }
        }
        return Ext.grid.ActionColumn.superclass.processEvent.apply(this, arguments);
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
    templatecolumn: Ext.grid.TemplateColumn,
    actioncolumn: Ext.grid.ActionColumn
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
Ext.grid.RowNumberer = Ext.extend(Object, {
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
    
    constructor : function(config){
        Ext.apply(this, config);
        if(this.rowspan){
            this.renderer = this.renderer.createDelegate(this);
        }
    },

    // private
    fixed:true,
    hideable: false,
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
});/**
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
    header : '<div class="x-grid3-hd-checker">&#160;</div>',
    /**
     * @cfg {Number} width The default width in pixels of the checkbox column (defaults to <tt>20</tt>).
     */
    width : 20,
    /**
     * @cfg {Boolean} sortable <tt>true</tt> if the checkbox column is sortable (defaults to
     * <tt>false</tt>).
     */
    sortable : false,

    // private
    menuDisabled : true,
    fixed : true,
    hideable: false,
    dataIndex : '',
    id : 'checker',
    isColumn: true, // So that ColumnModel doesn't feed this through the Column constructor

    constructor : function(){
        Ext.grid.CheckboxSelectionModel.superclass.constructor.apply(this, arguments);
        if(this.checkOnly){
            this.handleMouseDown = Ext.emptyFn;
        }
    },

    // private
    initEvents : function(){
        Ext.grid.CheckboxSelectionModel.superclass.initEvents.call(this);
        this.grid.on('render', function(){
            Ext.fly(this.grid.getView().innerHd).on('mousedown', this.onHdMouseDown, this);
        }, this);
    },

    /**
     * @private
     * Process and refire events routed from the GridView's processEvent method.
     */
    processEvent : function(name, e, grid, rowIndex, colIndex){
        if (name == 'mousedown') {
            this.onMouseDown(e, e.getTarget());
            return false;
        } else {
            return Ext.grid.Column.prototype.processEvent.apply(this, arguments);
        }
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
                    this.grid.getView().focusRow(index);
                }
            }
        }
    },

    // private
    onHdMouseDown : function(e, t) {
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
    },
    
    onEditorSelect: function(row, lastRow){
        if(lastRow != row && !this.checkOnly){
            this.selectRow(row); // *** highlight newly-selected cell and update selection
        }
    }
});