/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){

    var myData = {
		records : [
			{ name : "Record 0", column1 : "0", column2 : "0" },
			{ name : "Record 1", column1 : "1", column2 : "1" },
			{ name : "Record 2", column1 : "2", column2 : "2" },
			{ name : "Record 3", column1 : "3", column2 : "3" },
			{ name : "Record 4", column1 : "4", column2 : "4" },
			{ name : "Record 5", column1 : "5", column2 : "5" },
			{ name : "Record 6", column1 : "6", column2 : "6" },
			{ name : "Record 7", column1 : "7", column2 : "7" },
			{ name : "Record 8", column1 : "8", column2 : "8" },
			{ name : "Record 9", column1 : "9", column2 : "9" }
		]
	};


	// Generic fields array to use in both store defs.
	var fields = [
	   {name: 'name', mapping : 'name'},
	   {name: 'column1', mapping : 'column1'},
	   {name: 'column2', mapping : 'column2'}
	];

    // create the data store
    var gridStore = new Ext.data.JsonStore({
        fields : fields,
		data   : myData,
		root   : 'records'
    });


	// Column Model shortcut array
	var cols = [
		{ id : 'name', header: "Record Name", width: 160, sortable: true, dataIndex: 'name'},
		{header: "column1", width: 50, sortable: true, dataIndex: 'column1'},
		{header: "column2", width: 50, sortable: true, dataIndex: 'column2'}
	];

	// declare the source Grid
    var grid = new Ext.grid.GridPanel({
		ddGroup          : 'gridDDGroup',
        store            : gridStore,
        columns          : cols,
		enableDragDrop   : true,
        stripeRows       : true,
        autoExpandColumn : 'name',
        width            : 325,
		region           : 'west',
        title            : 'Data Grid',
		selModel         : new Ext.grid.RowSelectionModel({singleSelect : true})
    });



	// Declare the text fields.  This could have been done inline, is easier to read
	// for folks learning :)
	var textField1 = new Ext.form.TextField({
		fieldLabel : 'Record Name',
		name       : 'name'
	});


	var textField2 = new Ext.form.TextField({
		fieldLabel : 'Column 1',
		name       : 'column1'
	});


	var textField3 = new Ext.form.TextField({
		fieldLabel : 'Column 2',
		name       : 'column2'
	});


	// Setup the form panel
	var formPanel = new Ext.form.FormPanel({
		region     : 'center',
		title      : 'Generic Form Panel',
		bodyStyle  : 'padding: 10px; background-color: #DFE8F6',
		labelWidth : 100,
		width      : 325,
		items      : [
			textField1,
			textField2,
			textField3
		]
	});



	//Simple 'border layout' panel to house both grids
	var displayPanel = new Ext.Panel({
		width    : 650,
		height   : 300,
		layout   : 'border',
		renderTo : 'panel',
		items    : [
			grid,
			formPanel
		],
		bbar    : [
			'->', // Fill
			{
				text    : 'Reset Example',
				handler : function() {
					//refresh source grid
					gridStore.loadData(myData);
					formPanel.getForm().reset();
				}
			}
		]
	});


	// used to add records to the destination stores
	var blankRecord =  Ext.data.Record.create(fields);

	/****
	* Setup Drop Targets
	***/

	// This will make sure we only drop to the view container
	var formPanelDropTargetEl =  formPanel.body.dom;

	var formPanelDropTarget = new Ext.dd.DropTarget(formPanelDropTargetEl, {
		ddGroup     : 'gridDDGroup',
		notifyEnter : function(ddSource, e, data) {

			//Add some flare to invite drop.
			formPanel.body.stopFx();
			formPanel.body.highlight();
		},
		notifyDrop  : function(ddSource, e, data){

			// Reference the record (single selection) for readability
			var selectedRecord = ddSource.dragData.selections[0];


			// Load the record into the form
			formPanel.getForm().loadRecord(selectedRecord);


			// Delete record from the grid.  not really required.
			ddSource.grid.store.remove(selectedRecord);

			return(true);
		}
	});


});