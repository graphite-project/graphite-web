/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function() {
    var myStore = new Ext.data.ArrayStore({
        autoLoad: true,
        fields: [
            'economy', 'region', 'year',
            {name: 'procedures', type: 'int'},
            {name: 'time',       type: 'int'}
        ],
        url   : 'countries.json'
    });
    
    var pivotGrid = new Ext.grid.PivotGrid({
        title     : 'Ease of doing business',
        width     : 800,
        height    : 400,
        renderTo  : 'docbody',
        store     : myStore,
        aggregator: 'sum',
        measure   : 'time',
        
        viewConfig: {
            getCellCls: function(value) {
                if (value < 20) {
                    return 'expense-low';
                } else if (value < 75) {
                    return 'expense-medium';
                } else {
                    return 'expense-high';
                }
            }
        },
        
        leftAxis: [
            {
                width: 165,
                dataIndex: 'economy'
            }
        ],
        
        topAxis: [
            {
                dataIndex: 'year'
            }
        ],
        
        //toggles the Region dimension on and off
        tbar: [
            {
                text: 'Toggle Region',
                enableToggle: true,
                toggleHandler: function() {
                    var leftAxis      = pivotGrid.leftAxis,
                        oldDimensions = leftAxis.dimensions,
                        newDimensions = [];
                    
                    if (oldDimensions.length == 1) {
                        newDimensions.push({
                            width: 100,
                            dataIndex: 'region'
                        }); 
                    }
                    
                    newDimensions.push({
                        width: 165,
                        dataIndex: 'economy'
                    });
                    
                    leftAxis.setDimensions(newDimensions);
                    pivotGrid.view.refresh(true);
                }
            }
        ]
    });
});