/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
// setup an App namespace
// This is done to prevent collisions in the global namespace
Ext.ns('App');

/**
 * App.BookStore
 * @extends Ext.data.Store
 * @cfg {String} url This will be a url of a location to load the BookStore
 * This is a specialized Store which maintains books.
 * It already knows about Amazon's XML definition and will expose the following
 * Record defintion:
 *  - Author
 *  - Manufacturer
 *  - ProductGroup
 *  - DetailPageURL
 */
App.BookStore = function(config) {
	var config = config || {};
	Ext.applyIf(config, {
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
	// call the superclass's constructor
	App.BookStore.superclass.constructor.call(this, config);
};
Ext.extend(App.BookStore, Ext.data.Store);



/**
 * App.BookGrid
 * @extends Ext.grid.GridPanel
 * This is a custom grid which will display book information. It is tied to
 * a specific record definition by the dataIndex properties.
 *
 * It follows a very custom pattern used only when extending Ext.Components
 * in which you can omit the constructor.
 *
 * It also registers the class with the Component Manager with an xtype of
 * bookgrid. This allows the application to take care of the lazy-instatiation
 * facilities provided in Ext's Component Model.
 */
App.BookGrid = Ext.extend(Ext.grid.GridPanel, {
	// override
	initComponent : function() {
		Ext.apply(this, {
			// Pass in a column model definition
			// Note that the DetailPageURL was defined in the record definition but is not used
			// here. That is okay.
	        columns: [
	            {header: "Author", width: 120, dataIndex: 'Author', sortable: true},
	            {header: "Title", dataIndex: 'Title', sortable: true},
	            {header: "Manufacturer", width: 115, dataIndex: 'Manufacturer', sortable: true},
	            {header: "Product Group", dataIndex: 'ProductGroup', sortable: true}
	        ],
			sm: new Ext.grid.RowSelectionModel({singleSelect: true}),
			// Note the use of a storeId, this will register thisStore
			// with the StoreMgr and allow us to retrieve it very easily.
			store: new App.BookStore({
				storeId: 'gridBookStore',
				url: 'sheldon.xml'
			}),
			// force the grid to fit the space which is available
			viewConfig: {
				forceFit: true
			}
		});
		// finally call the superclasses implementation
		App.BookGrid.superclass.initComponent.call(this);
	}
});
// This will associate an string representation of a class
// (called an xtype) with the Component Manager
// It allows you to support lazy instantiation of your components
Ext.reg('bookgrid', App.BookGrid);


/**
 * App.BookDetail
 * @extends Ext.Panel
 * This is a specialized Panel which is used to show information about
 * a book.
 *
 * This demonstrates adding 2 custom properties (tplMarkup and
 * startingMarkup) to the class. It also overrides the initComponent
 * method and adds a new method called updateDetail.
 *
 * The class will be registered with an xtype of 'bookdetail'
 */
App.BookDetail = Ext.extend(Ext.Panel, {
	// add tplMarkup as a new property
	tplMarkup: [
		'Title: <a href="{DetailPageURL}" target="_blank">{Title}</a><br/>',
		'Author: {Author}<br/>',
		'Manufacturer: {Manufacturer}<br/>',
		'Product Group: {ProductGroup}<br/>'
	],
	// startingMarup as a new property
	startingMarkup: 'Please select a book to see additional details',
	// override initComponent to create and compile the template
	// apply styles to the body of the panel and initialize
	// html to startingMarkup
	initComponent: function() {
		this.tpl = new Ext.Template(this.tplMarkup);
		Ext.apply(this, {
			bodyStyle: {
				background: '#ffffff',
				padding: '7px'
			},
			html: this.startingMarkup
		});
		// call the superclass's initComponent implementation
		App.BookDetail.superclass.initComponent.call(this);
	},
	// add a method which updates the details
	updateDetail: function(data) {
		this.tpl.overwrite(this.body, data);
	}
});
// register the App.BookDetail class with an xtype of bookdetail
Ext.reg('bookdetail', App.BookDetail);


/**
 * App.BookMasterDetail
 * @extends Ext.Panel
 *
 * This is a specialized panel which is composed of both a bookgrid
 * and a bookdetail panel. It provides the glue between the two
 * components to allow them to communicate. You could consider this
 * the actual application.
 *
 */
App.BookMasterDetail = Ext.extend(Ext.Panel, {
	// override initComponent
	initComponent: function() {
		// used applyIf rather than apply so user could
		// override the defaults
		Ext.applyIf(this, {
			frame: true,
			title: 'Book List',
			width: 540,
			height: 400,
			layout: 'border',
			items: [{
				xtype: 'bookgrid',
				itemId: 'gridPanel',
				region: 'north',
				height: 210,
				split: true
			},{
				xtype: 'bookdetail',
				itemId: 'detailPanel',
				region: 'center'
			}]
		})
		// call the superclass's initComponent implementation
		App.BookMasterDetail.superclass.initComponent.call(this);
	},
	// override initEvents
	initEvents: function() {
		// call the superclass's initEvents implementation
		App.BookMasterDetail.superclass.initEvents.call(this);

		// now add application specific events
		// notice we use the selectionmodel's rowselect event rather
		// than a click event from the grid to provide key navigation
		// as well as mouse navigation
		var bookGridSm = this.getComponent('gridPanel').getSelectionModel();
		bookGridSm.on('rowselect', this.onRowSelect, this);
	},
	// add a method called onRowSelect
	// This matches the method signature as defined by the 'rowselect'
	// event defined in Ext.grid.RowSelectionModel
	onRowSelect: function(sm, rowIdx, r) {
		// getComponent will retrieve itemId's or id's. Note that itemId's
		// are scoped locally to this instance of a component to avoid
		// conflicts with the ComponentMgr
		var detailPanel = this.getComponent('detailPanel');
		detailPanel.updateDetail(r.data);
	}
});
// register an xtype with this class
Ext.reg('bookmasterdetail', App.BookMasterDetail);


// Finally now that we've defined all of our classes we can instantiate
// an instance of the app and renderTo an existing div called 'binding-example'
// Note now that classes have encapsulated this behavior we can easily create
// an instance of this app to be used in many different contexts, you could
// easily place this application in an Ext.Window for example
Ext.onReady(function() {
	// create an instance of the app
	var bookApp = new App.BookMasterDetail({
		renderTo: 'binding-example'
	});
	// We can retrieve a reference to the data store
	// via the StoreMgr by its storeId
	Ext.StoreMgr.get('gridBookStore').load();
});