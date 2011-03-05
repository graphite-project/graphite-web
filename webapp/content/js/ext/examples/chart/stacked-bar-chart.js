/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.chart.Chart.CHART_URL = '../../resources/charts.swf';

Ext.onReady(function(){
    var store = new Ext.data.JsonStore({
        fields: ['year', 'comedy', 'action', 'drama', 'thriller'],
        data: [
                {year: 2005, comedy: 34000000, action: 23890000, drama: 18450000, thriller: 20060000},
                {year: 2006, comedy: 56703000, action: 38900000, drama: 12650000, thriller: 21000000},
                {year: 2007, comedy: 42100000, action: 50410000, drama: 25780000, thriller: 23040000},
                {year: 2008, comedy: 38910000, action: 56070000, drama: 24810000, thriller: 26940000}
              ]
    });
    
    new Ext.Panel({
        width: 600,
        height: 400,
        renderTo: 'container',
        title: 'Stacked Bar Chart - Movie Takings by Genre',
        items: {
            xtype: 'stackedbarchart',
            store: store,
            yField: 'year',
            xAxis: new Ext.chart.NumericAxis({
                stackingEnabled: true,
                labelRenderer: Ext.util.Format.usMoney
            }),
            series: [{
                xField: 'comedy',
                displayName: 'Comedy'
            },{
                xField: 'action',
                displayName: 'Action'
            },{
                xField: 'drama',
                displayName: 'Drama'
            },{
                xField: 'thriller',
                displayName: 'Thriller'
            }]
        }
    });
});