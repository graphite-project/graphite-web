/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/*
 * ================  TabPanel with nested layouts  =======================
 */
// fake grid data used below in the tabsNestedLayouts config
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

var tabsNestedLayouts = {
	xtype: 'tabpanel',
	id: 'tabs-nested-layouts-panel',
	title: 'TabPanel with Nested Layouts',
	activeTab: 0,
	items:[{
		title: 'Foo',
		layout: 'border',
		items: [{
			region: 'north',
			title: 'North',
			height: 75,
			maxSize: 150,
			margins: '5 5 0 5',
			bodyStyle: 'padding:10px;',
			split: true,
			html: 'Some content'
		},{
			xtype: 'tabpanel',
			plain: true,
			region: 'center',
			margins: '0 5 5 5',
			activeTab: 0,
			items: [{
				title: 'Inner Tab 1',
				bodyStyle: 'padding:10px;',
				html: 'See Inner Tab 2 for another nested BorderLayout.'
			},{
				title: 'Inner Tab 2',
				cls: 'inner-tab-custom', // custom styles in layout-browser.css
				layout: 'border',
                // Make sure IE can still calculate dimensions after a resize when the tab is not active.
                // With display mode, if the tab is rendered but hidden, IE will mess up the layout on show:
                hideMode: Ext.isIE ? 'offsets' : 'display',
				items: [{
					title: 'West',
					region: 'west',
					collapsible: true,
					width: 150,
					minSize: 100,
					maxSize: 350,
					margins: '5 0 5 5',
					cmargins: '5 5 5 5',
					html: 'Hello',
					bodyStyle:'padding:10px;',
					split: true
				},{
					xtype: 'tabpanel',
					region: 'center',
					margins: '5 5 5 0',
					tabPosition: 'bottom',
					activeTab: 0,
					items: [{
						// Panels that are used as tabs do not have title bars since the tab
						// itself is the title container.  If you want to have a full title
						// bar within a tab, you can easily nest another panel within the tab
						// with layout:'fit' to acheive that:
						title: 'Bottom Tab',
						layout: 'fit',
						items: {
							title: 'Interior Content',
							bodyStyle:'padding:10px;',
							border: false,
							html: 'See the next tab for a nested grid. The grid is not rendered until its tab is first accessed.'
						}
					},{
						// A common mistake when adding grids to a layout is creating a panel first,
						// then adding the grid to it.  GridPanel (xtype:'grid') is a Panel subclass,
						// so you can add it directly as an item into a container.  Typically you will
						// want to specify layout:'fit' on GridPanels so that they'll size along with
						// their container and take up the available space.
						title: 'Nested Grid',
						xtype: 'grid',
						layout: 'fit',
				        store: new Ext.data.ArrayStore({
					        fields: [
					           {name: 'company'},
					           {name: 'price', type: 'float'},
					           {name: 'change', type: 'float'},
					           {name: 'pctChange', type: 'float'},
					           {name: 'lastChange', type: 'date', dateFormat: 'n/j h:ia'}
					        ]
					    }),
				        columns: [
				            {id:'company',header: 'Company', width: 160, sortable: true, dataIndex: 'company'},
				            {header: 'Price', width: 75, sortable: true, renderer: 'usMoney', dataIndex: 'price'},
				            {header: 'Change', width: 75, sortable: true, dataIndex: 'change'},
				            {header: '% Change', width: 75, sortable: true, dataIndex: 'pctChange'},
				            {header: 'Last Updated', width: 85, sortable: true, renderer: Ext.util.Format.dateRenderer('m/d/Y'), dataIndex: 'lastChange'}
				        ],
				        stripeRows: true,
				        autoExpandColumn: 'company',

				        // Add a listener to load the data only after the grid is rendered:
				        listeners: {
				        	render: function(){
				        		this.store.loadData(myData);
				        	}
				        }
					}]
				}]
			}]
		}]
	},{
		title: 'Bar',
		bodyStyle: 'padding:10px;',
		html: 'Nothing to see here.'
	}]
};

/*
 * ================  Absolute Layout Form  =======================
 */
var absform = new Ext.form.FormPanel({
    baseCls: 'x-plain',
    layout:'absolute',
    url:'save-form.php',
    border: true,
    defaultType: 'textfield',

    items: [{
        x: 0,
        y: 5,
        xtype: 'label',
        text: 'From:'
    },{
        x: 55,
        y: 0,
        name: 'from',
        anchor:'100%'  // anchor width by %
    },{
        x: 0,
        y: 32,
        xtype: 'label',
        text: 'To:'
    },{
    	// The button is not a Field subclass, so it must be
    	// wrapped in a panel for proper positioning to work
    	xtype: 'panel',
    	x: 55,
    	y: 27,
    	items: {
	    	xtype: 'button',
	    	text: 'Contacts...'
    	}
    },{
        x: 135,
        y: 27,
        name: 'to',
        anchor: '100%'  // anchor width by %
    },{
        x: 0,
        y: 59,
        xtype: 'label',
        text: 'Subject:'
    },{
        x: 55,
        y: 54,
        name: 'subject',
        anchor: '100%'  // anchor width by %
    },{
        x:0,
        y: 81,
        xtype: 'textarea',
        name: 'msg',
        anchor: '100% 100%'  // anchor width and height
    }]
});

var absoluteForm = {
    title: 'Absolute Layout Form',
    id: 'abs-form-panel',
    layout: 'fit',
    bodyStyle: 'padding:15px;',
    items: {
    	title: 'New Email',
    	cls: 'email-form',
	    layout: 'fit',
	    frame: true,
	    bodyStyle: 'padding:10px 5px 5px;',
	    items: absform,

	    tbar: [{
	    	text: 'Send',
	    	iconCls: 'icon-send'
	    },'-',{
	    	text: 'Save',
	    	iconCls: 'icon-save'
	    },{
	    	text: 'Check Spelling',
	    	iconCls: 'icon-spell'
	    },'-',{
	    	text: 'Print',
	    	iconCls: 'icon-print'
	    },'->',{
	    	text: 'Attach a File',
	    	iconCls: 'icon-attach'
	    }]
    }
};
