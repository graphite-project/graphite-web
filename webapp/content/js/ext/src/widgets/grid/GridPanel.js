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
Ext.reg('grid', Ext.grid.GridPanel);