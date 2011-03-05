/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.layout.TableLayout
 * @extends Ext.layout.ContainerLayout
 * <p>This layout allows you to easily render content into an HTML table.  The total number of columns can be
 * specified, and rowspan and colspan can be used to create complex layouts within the table.
 * This class is intended to be extended or created via the layout:'table' {@link Ext.Container#layout} config,
 * and should generally not need to be created directly via the new keyword.</p>
 * <p>Note that when creating a layout via config, the layout-specific config properties must be passed in via
 * the {@link Ext.Container#layoutConfig} object which will then be applied internally to the layout.  In the
 * case of TableLayout, the only valid layout config property is {@link #columns}.  However, the items added to a
 * TableLayout can supply the following table-specific config properties:</p>
 * <ul>
 * <li><b>rowspan</b> Applied to the table cell containing the item.</li>
 * <li><b>colspan</b> Applied to the table cell containing the item.</li>
 * <li><b>cellId</b> An id applied to the table cell containing the item.</li>
 * <li><b>cellCls</b> A CSS class name added to the table cell containing the item.</li>
 * </ul>
 * <p>The basic concept of building up a TableLayout is conceptually very similar to building up a standard
 * HTML table.  You simply add each panel (or "cell") that you want to include along with any span attributes
 * specified as the special config properties of rowspan and colspan which work exactly like their HTML counterparts.
 * Rather than explicitly creating and nesting rows and columns as you would in HTML, you simply specify the
 * total column count in the layoutConfig and start adding panels in their natural order from left to right,
 * top to bottom.  The layout will automatically figure out, based on the column count, rowspans and colspans,
 * how to position each panel within the table.  Just like with HTML tables, your rowspans and colspans must add
 * up correctly in your overall layout or you'll end up with missing and/or extra cells!  Example usage:</p>
 * <pre><code>
// This code will generate a layout table that is 3 columns by 2 rows
// with some spanning included.  The basic layout will be:
// +--------+-----------------+
// |   A    |   B             |
// |        |--------+--------|
// |        |   C    |   D    |
// +--------+--------+--------+
var table = new Ext.Panel({
    title: 'Table Layout',
    layout:'table',
    defaults: {
        // applied to each contained panel
        bodyStyle:'padding:20px'
    },
    layoutConfig: {
        // The total column count must be specified here
        columns: 3
    },
    items: [{
        html: '&lt;p&gt;Cell A content&lt;/p&gt;',
        rowspan: 2
    },{
        html: '&lt;p&gt;Cell B content&lt;/p&gt;',
        colspan: 2
    },{
        html: '&lt;p&gt;Cell C content&lt;/p&gt;',
        cellCls: 'highlight'
    },{
        html: '&lt;p&gt;Cell D content&lt;/p&gt;'
    }]
});
</code></pre>
 */
Ext.layout.TableLayout = Ext.extend(Ext.layout.ContainerLayout, {
    /**
     * @cfg {Number} columns
     * The total number of columns to create in the table for this layout.  If not specified, all Components added to
     * this layout will be rendered into a single row using one column per Component.
     */

    // private
    monitorResize:false,

    type: 'table',

    targetCls: 'x-table-layout-ct',

    /**
     * @cfg {Object} tableAttrs
     * <p>An object containing properties which are added to the {@link Ext.DomHelper DomHelper} specification
     * used to create the layout's <tt>&lt;table&gt;</tt> element. Example:</p><pre><code>
{
    xtype: 'panel',
    layout: 'table',
    layoutConfig: {
        tableAttrs: {
            style: {
                width: '100%'
            }
        },
        columns: 3
    }
}</code></pre>
     */
    tableAttrs:null,

    // private
    setContainer : function(ct){
        Ext.layout.TableLayout.superclass.setContainer.call(this, ct);

        this.currentRow = 0;
        this.currentColumn = 0;
        this.cells = [];
    },
    
    // private
    onLayout : function(ct, target){
        var cs = ct.items.items, len = cs.length, c, i;

        if(!this.table){
            target.addClass('x-table-layout-ct');

            this.table = target.createChild(
                Ext.apply({tag:'table', cls:'x-table-layout', cellspacing: 0, cn: {tag: 'tbody'}}, this.tableAttrs), null, true);
        }
        this.renderAll(ct, target);
    },

    // private
    getRow : function(index){
        var row = this.table.tBodies[0].childNodes[index];
        if(!row){
            row = document.createElement('tr');
            this.table.tBodies[0].appendChild(row);
        }
        return row;
    },

    // private
    getNextCell : function(c){
        var cell = this.getNextNonSpan(this.currentColumn, this.currentRow);
        var curCol = this.currentColumn = cell[0], curRow = this.currentRow = cell[1];
        for(var rowIndex = curRow; rowIndex < curRow + (c.rowspan || 1); rowIndex++){
            if(!this.cells[rowIndex]){
                this.cells[rowIndex] = [];
            }
            for(var colIndex = curCol; colIndex < curCol + (c.colspan || 1); colIndex++){
                this.cells[rowIndex][colIndex] = true;
            }
        }
        var td = document.createElement('td');
        if(c.cellId){
            td.id = c.cellId;
        }
        var cls = 'x-table-layout-cell';
        if(c.cellCls){
            cls += ' ' + c.cellCls;
        }
        td.className = cls;
        if(c.colspan){
            td.colSpan = c.colspan;
        }
        if(c.rowspan){
            td.rowSpan = c.rowspan;
        }
        this.getRow(curRow).appendChild(td);
        return td;
    },

    // private
    getNextNonSpan: function(colIndex, rowIndex){
        var cols = this.columns;
        while((cols && colIndex >= cols) || (this.cells[rowIndex] && this.cells[rowIndex][colIndex])) {
            if(cols && colIndex >= cols){
                rowIndex++;
                colIndex = 0;
            }else{
                colIndex++;
            }
        }
        return [colIndex, rowIndex];
    },

    // private
    renderItem : function(c, position, target){
        // Ensure we have our inner table to get cells to render into.
        if(!this.table){
            this.table = target.createChild(
                Ext.apply({tag:'table', cls:'x-table-layout', cellspacing: 0, cn: {tag: 'tbody'}}, this.tableAttrs), null, true);
        }
        if(c && !c.rendered){
            c.render(this.getNextCell(c));
            this.configureItem(c);
        }else if(c && !this.isValidParent(c, target)){
            var container = this.getNextCell(c);
            container.insertBefore(c.getPositionEl().dom, null);
            c.container = Ext.get(container);
            this.configureItem(c);
        }
    },

    // private
    isValidParent : function(c, target){
        return c.getPositionEl().up('table', 5).dom.parentNode === (target.dom || target);
    },
    
    destroy: function(){
        delete this.table;
        Ext.layout.TableLayout.superclass.destroy.call(this);
    }

    /**
     * @property activeItem
     * @hide
     */
});

Ext.Container.LAYOUTS['table'] = Ext.layout.TableLayout;