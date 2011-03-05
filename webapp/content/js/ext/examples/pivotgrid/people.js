/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * Multiple PivotGrid examples. Each PivotGrid shares a common Record and Store and simply presents
 * the data in a different way. For full details on using PivotGrid see the API documentation.
 */
Ext.onReady(function() {
    var PersonRecord = Ext.data.Record.create([
        {name: 'eyeColor',    type: 'string'},
        {name: 'birthDecade', type: 'string'},
        {name: 'handedness',  type: 'string'},
        {name: 'gender',      type: 'string'},
        {name: 'height',      type: 'int'},
        {name: 'iq',          type: 'int'}
    ]);
    
    var myStore = new Ext.data.Store({
        url: 'people.json',
        autoLoad: true,
        reader: new Ext.data.JsonReader({
            root: 'rows',
            idProperty: 'id'
        }, PersonRecord)
    });
    
    var averageHeight = new Ext.grid.PivotGrid({
        title     : 'Average height',
        width     : 600,
        height    : 154,
        renderTo  : 'avgHeight',
        store     : myStore,
        aggregator: 'avg',
        measure   : 'height',
        
        //turns a decimal number of feet into feet and inches
        renderer  : function(value) {
            var feet   = Math.floor(value),
                inches = Math.round((value - feet) * 12);
                
            return String.format("{0}' {1}\"", feet, inches);
        },
        
        leftAxis: [
            {
                width: 80,
                dataIndex: 'birthDecade'
            }
        ],
        
        topAxis: [
            {
                dataIndex: 'gender'
            },
            {
                dataIndex: 'handedness'
            }
        ]
    });
    
    var perDecade = new Ext.grid.PivotGrid({
        title     : 'Number of people born per decade',
        width     : 600,
        height    : 91,
        renderTo  : 'perDecade',
        store     : myStore,
        aggregator: 'count',
        
        topAxis: [
            {
                width: 80,
                dataIndex: 'birthDecade'
            }
        ],
        
        leftAxis: [
            {
                dataIndex: 'gender'
            }
        ]
    });
    
    var maxIQ = new Ext.grid.PivotGrid({
        title     : 'Max IQ per decade',
        width     : 600,
        height    : 91,
        renderTo  : 'maxIQ',
        store     : myStore,
        measure   : 'iq',
        aggregator: 'max',
        
        topAxis: [
            {
                width: 80,
                dataIndex: 'birthDecade'
            },
            {
                dataIndex: 'handedness'
            }
        ]
    });
});