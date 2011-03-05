/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
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
});