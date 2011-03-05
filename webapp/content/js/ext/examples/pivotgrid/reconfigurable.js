/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.ns('pivot');

Ext.onReady(function() {
    var SaleRecord = Ext.data.Record.create([
        {name: 'person',   type: 'string'},
        {name: 'product',  type: 'string'},
        {name: 'city',     type: 'string'},
        {name: 'state',    type: 'string'},
        {name: 'month',    type: 'int'},
        {name: 'quarter',  type: 'int'},
        {name: 'year',     type: 'int'},
        {name: 'quantity', type: 'int'},
        {name: 'value',    type: 'int'}
    ]);

    var myStore = new Ext.data.Store({
        url: 'data.json',
        autoLoad: true,
        reader: new Ext.data.JsonReader({
            root: 'rows',
            idProperty: 'id'
        }, SaleRecord)
    });

    var pivotGrid = new Ext.grid.PivotGrid({
        store     : myStore,
        aggregator: 'sum',
        measure   : 'value',
        leftAxis: [{
            width: 60,
            dataIndex: 'product'
        }, {
            width: 80,
            dataIndex: 'city'
        }, {
            width: 120,
            dataIndex: 'person'
        }],
        topAxis: [{
            dataIndex: 'year'
        }, {
            dataIndex: 'quarter'
        }],
        region: 'center',
        margins: '5 5 5 0',
    });

    var configPanel = new pivot.ConfigPanel({
        width : 300,
        margins: '5 5 5 5',
        region: 'west',
        record: SaleRecord,
        measures: ['value', 'quantity'],
        aggregator: 'sum',

        leftAxisDimensions: [
            {field: 'product', width: 60,  direction: 'ASC'},
            {field: 'city',    width: 80,  direction: 'ASC'},
            {field: 'person',  width: 120, direction: 'ASC'}
        ],

        topAxisDimensions: [
            {field: 'year',    direction: 'ASC'},
            {field: 'quarter', direction: 'ASC'}
        ],

        listeners: {
            update: function(config) {
                pivotGrid.leftAxis.setDimensions(config.leftDimensions);
                pivotGrid.topAxis.setDimensions(config.topDimensions);

                pivotGrid.setMeasure(config.measure);
                pivotGrid.setAggregator(config.aggregator);

                pivotGrid.view.refresh(true);
            }
        }
    });

    var viewport = new Ext.Viewport({
        layout: 'fit',
        items: {
            border: false,
            title : 'Ext JS Pivot Grid',
            layout: 'border',
            items : [
                configPanel,
                pivotGrid
            ]
        }
    }); 
});
