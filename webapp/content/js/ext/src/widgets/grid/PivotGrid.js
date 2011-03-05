/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
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
});