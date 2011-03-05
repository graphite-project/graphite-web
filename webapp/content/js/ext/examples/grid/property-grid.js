/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){
    
    var propsGrid = new Ext.grid.PropertyGrid({
        renderTo: 'prop-grid',
        width: 300,
        autoHeight: true,
        propertyNames: {
            tested: 'QA',
            borderWidth: 'Border Width'
        },
        source: {
            '(name)': 'Properties Grid',
            grouping: false,
            autoFitColumns: true,
            productionQuality: false,
            created: new Date(Date.parse('10/15/2006')),
            tested: false,
            version: 0.01,
            borderWidth: 1
        },
        viewConfig : {
            forceFit: true,
            scrollOffset: 2 // the grid will never have scrollbars
        }
    });

    // simulate updating the grid data via a button click
    new Ext.Button({
        renderTo: 'button-container',
        text: 'Update source',
        handler: function(){
            propsGrid.setSource({
                '(name)': 'Property Grid',
                grouping: false,
                autoFitColumns: true,
                productionQuality: true,
                created: new Date(),
                tested: false,
                version: 0.8,
                borderWidth: 2
            });
        }
    });
});