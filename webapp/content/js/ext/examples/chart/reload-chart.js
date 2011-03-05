/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
function generateData(){
    var data = [];
    for(var i = 0; i < 12; ++i){
        data.push([Date.monthNames[i], (Math.floor(Math.random() *  11) + 1) * 100]);
    }
    return data;
}

Ext.onReady(function(){
    var store = new Ext.data.ArrayStore({
        fields: ['month', 'hits'],
        data: generateData()
    });
    
    new Ext.Panel({
        width: 700,
        height: 400,
        renderTo: document.body,
        title: 'Column Chart with Reload - Hits per Month',
        tbar: [{
            text: 'Load new data set',
            handler: function(){
                store.loadData(generateData());
            }
        }],
        items: {
            xtype: 'columnchart',
            store: store,
            yField: 'hits',
	    url: '../../resources/charts.swf',
            xField: 'month',
            xAxis: new Ext.chart.CategoryAxis({
                title: 'Month'
            }),
            yAxis: new Ext.chart.NumericAxis({
                title: 'Hits'
            }),
            extraStyle: {
               xAxis: {
                    labelRotation: -90
                }
            }
        }
    });
});
