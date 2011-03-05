/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){
	
    // create the Data Store
    var store = new Ext.data.Store({
        // load using HTTP
        url: 'sheldon.xml',

        // the return will be XML, so lets set up a reader
        reader: new Ext.data.XmlReader({
               // records will have an "Item" tag
               record: 'Item',
               id: 'ASIN',
               totalRecords: '@total'
           }, [
               // set up the fields mapping into the xml doc
               // The first needs mapping, the others are very basic
               {name: 'Author', mapping: 'ItemAttributes > Author'},
               'Title',
			   'Manufacturer',
			   'ProductGroup',
			   // Detail URL is not part of the column model of the grid
			   'DetailPageURL'
           ])
    });

    // create the grid
    var grid = new Ext.grid.GridPanel({
        store: store,
        columns: [
            {header: "Author", width: 120, dataIndex: 'Author', sortable: true},
            {header: "Title", width: 180, dataIndex: 'Title', sortable: true},
            {header: "Manufacturer", width: 115, dataIndex: 'Manufacturer', sortable: true},
            {header: "Product Group", width: 100, dataIndex: 'ProductGroup', sortable: true}
        ],
		sm: new Ext.grid.RowSelectionModel({singleSelect: true}),
		viewConfig: {
			forceFit: true
		},
        height:210,
		split: true,
		region: 'north'
    });
	
	// define a template to use for the detail view
	var bookTplMarkup = [
		'Title: <a href="{DetailPageURL}" target="_blank">{Title}</a><br/>',
		'Author: {Author}<br/>',
		'Manufacturer: {Manufacturer}<br/>',
		'Product Group: {ProductGroup}<br/>'
	];
	var bookTpl = new Ext.Template(bookTplMarkup);

	var ct = new Ext.Panel({
		renderTo: 'binding-example',
		frame: true,
		title: 'Book List',
		width: 540,
		height: 400,
		layout: 'border',
		items: [
			grid,
			{
				id: 'detailPanel',
				region: 'center',
				bodyStyle: {
					background: '#ffffff',
					padding: '7px'
				},
				html: 'Please select a book to see additional details.'
			}
		]
	})
	grid.getSelectionModel().on('rowselect', function(sm, rowIdx, r) {
		var detailPanel = Ext.getCmp('detailPanel');
		bookTpl.overwrite(detailPanel.body, r.data);
	});
    store.load();
});