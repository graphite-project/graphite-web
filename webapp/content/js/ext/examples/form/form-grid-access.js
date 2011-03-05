/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){

    Ext.QuickTips.init();

    // turn on validation errors beside the field globally
    Ext.form.Field.prototype.msgTarget = 'side';

    var bd = Ext.getBody();

//   Define the Grid data and create the Grid
    var myData = [
        ['3m Co',71.72,0.02,0.03,'9/1 12:00am'],
        ['Alcoa Inc',29.01,0.42,1.47,'9/1 12:00am'],
        ['Altria Group Inc',83.81,0.28,0.34,'9/1 12:00am'],
        ['American Express Company',52.55,0.01,0.02,'9/1 12:00am'],
        ['American International Group, Inc.',64.13,0.31,0.49,'9/1 12:00am'],
        ['AT&T Inc.',31.61,-0.48,-1.54,'9/1 12:00am'],
        ['Boeing Co.',75.43,0.53,0.71,'9/1 12:00am'],
        ['Caterpillar Inc.',67.27,0.92,1.39,'9/1 12:00am'],
        ['Citigroup, Inc.',49.37,0.02,0.04,'9/1 12:00am'],
        ['E.I. du Pont de Nemours and Company',40.48,0.51,1.28,'9/1 12:00am'],
        ['Exxon Mobil Corp',68.1,-0.43,-0.64,'9/1 12:00am'],
        ['General Electric Company',34.14,-0.08,-0.23,'9/1 12:00am'],
        ['General Motors Corporation',30.27,1.09,3.74,'9/1 12:00am'],
        ['Hewlett-Packard Co.',36.53,-0.03,-0.08,'9/1 12:00am'],
        ['Honeywell Intl Inc',38.77,0.05,0.13,'9/1 12:00am'],
        ['Intel Corporation',19.88,0.31,1.58,'9/1 12:00am'],
        ['International Business Machines',81.41,0.44,0.54,'9/1 12:00am'],
        ['Johnson & Johnson',64.72,0.06,0.09,'9/1 12:00am'],
        ['JP Morgan & Chase & Co',45.73,0.07,0.15,'9/1 12:00am'],
        ['McDonald\'s Corporation',36.76,0.86,2.40,'9/1 12:00am'],
        ['Merck & Co., Inc.',40.96,0.41,1.01,'9/1 12:00am'],
        ['Microsoft Corporation',25.84,0.14,0.54,'9/1 12:00am'],
        ['Pfizer Inc',27.96,0.4,1.45,'9/1 12:00am'],
        ['The Coca-Cola Company',45.07,0.26,0.58,'9/1 12:00am'],
        ['The Home Depot, Inc.',34.64,0.35,1.02,'9/1 12:00am'],
        ['The Procter & Gamble Company',61.91,0.01,0.02,'9/1 12:00am'],
        ['United Technologies Corporation',63.26,0.55,0.88,'9/1 12:00am'],
        ['Verizon Communications',35.57,0.39,1.11,'9/1 12:00am'],
        ['Wal-Mart Stores, Inc.',45.45,0.73,1.63,'9/1 12:00am']
    ];

    var ds = new Ext.data.Store({
        reader: new Ext.data.ArrayReader({}, [
            {name: 'company'},
            {name: 'price', type: 'float'},
            {name: 'change', type: 'float'},
            {name: 'pctChange', type: 'float'},
            {name: 'lastChange', type: 'date', dateFormat: 'n/j h:ia'},

//          Rating dependent upon performance 0 = best, 2 = worst
            {name: 'rating', type: 'int', convert: function(v, rec) {
                   if (rec[3] < 0) return 2;
                   if (rec[3] < 1) return 1;
                   return 0;
               }
            }
        ])
    });
    ds.loadData(myData);

    // example of custom renderer function
    function italic(value){
        return '<i>' + value + '</i>';
    }

    // example of custom renderer function
    function change(val){
        if(val > 0){
            return '<span style="color:green;">' + val + '</span>';
        }else if(val < 0){
            return '<span style="color:red;">' + val + '</span>';
        }
        return val;
    }
    // example of custom renderer function
    function pctChange(val){
        if(val > 0){
            return '<span style="color:green;">' + val + '%</span>';
        }else if(val < 0){
            return '<span style="color:red;">' + val + '%</span>';
        }
        return val;
    }
    
    // render rating as "A", "B" or "C" depending upon numeric value.
    function rating(v) {
        if (v == 0) return "A"
        if (v == 1) return "B"
        if (v == 2) return "C"
    }

    // the DefaultColumnModel expects this blob to define columns. It can be extended to provide
    // custom or reusable ColumnModels
    var colModel = new Ext.grid.ColumnModel([
        {id:'company',header: "Company", width: 160, sortable: true, locked:false, dataIndex: 'company'},
        {header: "Price", width: 55, sortable: true, renderer: Ext.util.Format.usMoney, dataIndex: 'price'},
        {header: "Change", width: 55, sortable: true, renderer: change, dataIndex: 'change'},
        {header: "% Change", width: 65, sortable: true, renderer: pctChange, dataIndex: 'pctChange'},
        {header: "Last Updated", width: 80, sortable: true, renderer: Ext.util.Format.dateRenderer('m/d/Y'), dataIndex: 'lastChange'},
        {header: "Rating", width: 40, sortable: true, renderer: rating, dataIndex: 'rating'}
    ]);

    bd.createChild({tag: 'h2', html: 'Using a Grid with a Form'});

/*
 *    Here is where we create the Form
 */
    var gridForm = new Ext.FormPanel({
        id: 'company-form',
        frame: true,
        labelAlign: 'left',
        title: 'Company data',
        bodyStyle:'padding:5px',
        width: 930,
        layout: 'column',    // Specifies that the items will now be arranged in columns
        items: [{
            columnWidth: 0.60,
            layout: 'fit',
            items: {
                xtype: 'grid',
                ds: ds,
                cm: colModel,
                sm: new Ext.grid.RowSelectionModel({
                    singleSelect: true,
                    listeners: {
                        rowselect: function(sm, row, rec) {
                            Ext.getCmp("company-form").getForm().loadRecord(rec);
                        }
                    }
                }),
                autoExpandColumn: 'company',
                height: 350,
                title:'Company Data',
                border: true,
                listeners: {
                    viewready: function(g) {
                        g.getSelectionModel().selectRow(0);
                    } // Allow rows to be rendered.
                }
            }
        },{
            columnWidth: 0.4,
            xtype: 'fieldset',
            labelWidth: 120,
            title:'Company details',
            defaults: {width: 140, border:false},    // Default config options for child items
            defaultType: 'textfield',
            autoHeight: true,
            bodyStyle: Ext.isIE ? 'padding:0 0 5px 15px;' : 'padding:10px 15px;',
            border: false,
            style: {
                "margin-left": "10px", // when you add custom margin in IE 6...
                "margin-right": Ext.isIE6 ? (Ext.isStrict ? "-10px" : "-13px") : "0"  // you have to adjust for it somewhere else
            },
            items: [{
                fieldLabel: 'Name',
                name: 'company'
            },{
                fieldLabel: 'Price',
                name: 'price'
            },{
                fieldLabel: '% Change',
                name: 'pctChange'
            },{
                xtype: 'datefield',
                fieldLabel: 'Last Updated',
                name: 'lastChange'
            }, {
                xtype: 'radiogroup',
                columns: 'auto',
                fieldLabel: 'Rating',
                name: 'rating',
// A radio group: A setValue on any of the following 'radio' inputs using the numeric
// 'rating' field checks the radio instance which has the matching inputValue.
                items: [{
                    inputValue: '0',
                    boxLabel: 'A'
                }, {
                    inputValue: '1',
                    boxLabel: 'B'
                }, {
                    inputValue: '2',
                    boxLabel: 'C'
                }]
            }]
        }],
        renderTo: bd
    });
});