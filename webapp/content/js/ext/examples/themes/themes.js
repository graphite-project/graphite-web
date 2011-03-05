/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */

Ext.onReady(function(){
    var items = [];
    
    Ext.QuickTips.init();
    
    //=============================================================
    // Layout grid toggle button
    //=============================================================
//    items.push({
//        xtype: 'panel',
//        border: false,
//        width: 120,
//        x: 50, y: 20,
//        items: {
//	        xtype: 'button',
//	        text: 'Toggle Layout Grid',
//	        handler: function(){
//		        Ext.getBody().toggleClass('x-layout-grid');
//	        }
//        }
//    });
    
    //=============================================================
    // Panel / Window
    //=============================================================
    items.push({
        xtype: 'panel',
        width: 150,
        height: 150,
        title: 'Basic Panel',
        bodyStyle: {padding: '5px'},
        html: 'Some content',
        collapsible: true,
        x: 50, y: 100
    });
    
    items.push({
        xtype: 'panel',
        width: 150,
        height: 150,
        title: 'Masked Panel',
        x: 210, y: 100,
        bodyStyle: {padding: '5px'},
        html: 'Some content',
        collapsible: true,
        listeners: {
            'render': function(p){
                p.body.mask('Loading...');
            },
            delay: 50
        }
    });
    
    items.push({
        xtype: 'panel',
        width: 150,
        height: 150,
        title: 'Framed Panel',
        html: 'Some content',
        frame: true,
        collapsible: true,
        x: 370, y: 100
    });
    
    new Ext.Window({
        width: 150,
        height: 150,
        title: 'Window',
        bodyStyle: {padding: '5px'},
        html: 'Click Submit for Confirmation Msg.',
        collapsible: true,
        closable: false,
        draggable: false,
        shadow: false,
        resizable: false,
        x: 530, y: 100,
        tbar: [{
            text: 'Toolbar'
        }],
        buttons: [{
            text: 'Submit',
            id: 'message_box',
            cls: 'x-icon-btn',
            iconCls: 'x-icon-btn-ok',
            handler: function(){
                Ext.MessageBox.confirm('Confirm', 'Are you sure you want to do that?');
            }
        }]
    }).show();
    
    //=============================================================
    // Toolbar / Menu
    //=============================================================
    var menu = new Ext.menu.Menu({
        items: [{
            text: 'Menu item'
        },{
            text: 'Check 1',
            checked: true
        },{
            text: 'Check 2',
            checked: false
        }, '-', {
            text: 'Option 1',
            checked: true,
            group: 'opts'
        },{
            text: 'Option 2',
            checked: false,
            group: 'opts'
        }, '-', {
            text: 'Sub-items',
            menu: new Ext.menu.Menu({
                items: [{text: 'Item 1'},{text: 'Item 2'}]
            })
        }]
    });
    items.push({
        xtype: 'panel',
        width: 450,
        height: 150,
        title: 'Basic Panel With Toolbars',
        x: 690, y: 100,
        tbar: ['Toolbar &amp; Menus', ' ', '-', {
            text: 'Button'
        },{
            text: 'Menu Button',
            id: 'menu-btn',
            menu: menu
        },{
            xtype: 'tbsplit',
            text: 'Split Button',
            menu: new Ext.menu.Menu({
                items: [{text: 'Item 1'},{text: 'Item 2'}]
            })
        },{
            xtype: 'button',
            enableToggle: true,
            pressed: true,
            text: 'Toggle Button'
        }],
        bbar: [{
            text: 'Bottom Bar'
        }]
    });
    
    //=============================================================
    // Form widgets
    //=============================================================
    items.push({
        xtype: 'form',
        id: 'form-widgets',
        title: 'Form Widgets',
        width: 630,
        height: 700,
        frame: true,
        x: 50, y: 260,
        tools: [
            {id:'toggle'},{id:'close'},{id:'minimize'},{id:'maximize'},{id:'restore'},{id:'gear'},{id:'pin'},
            {id:'unpin'},{id:'right'},{id:'left'},{id:'up'},{id:'down'},{id:'refresh'},{id:'minus'},{id:'plus'},
            {id:'help'},{id:'search'},{id:'save'},{id:'print'}
        ],
        bodyStyle: {
            padding: '10px 20px'
        },
        defaults: {
            anchor: '98%',
            msgTarget: 'side',
            allowBlank: false
        },
        items: [{
            xtype: 'label',
            text: 'Plain Label'
        },{
            fieldLabel: 'TextField',
            xtype: 'textfield',
            emptyText: 'Enter a value',
            itemCls: 'x-form-required'
        },{
            fieldLabel: 'ComboBox',
            xtype: 'combo',
            store: ['Foo', 'Bar'],
            itemCls: 'x-form-required',
            resizable: true
        },{
            fieldLabel: 'DateField',
            itemCls: 'x-form-required',
            xtype: 'datefield'
        },{
            fieldLabel: 'TimeField',
            itemCls: 'x-form-required',
            xtype: 'timefield'
        },{
            fieldLabel: 'NumberField',
            emptyText: '(This field is optional)',
            allowBlank: true,
            xtype: 'numberfield'
        },{
            fieldLabel: 'TextArea',
            //msgTarget: 'under',
            itemCls: 'x-form-required',
            xtype: 'textarea',
            cls: 'x-form-valid',
            value: 'This field is hard-coded to have the "valid" style (it will require some code changes to add/remove this style dynamically)'
        },{
            fieldLabel: 'Checkboxes',
            xtype: 'checkboxgroup',
            columns: [100,100],
            items: [{boxLabel: 'Foo', checked: true},{boxLabel: 'Bar'}]
        },{
            fieldLabel: 'Radios',
            xtype: 'radiogroup',
            columns: [100,100],
            items: [{boxLabel: 'Foo', checked: true, name: 'radios'},{boxLabel: 'Bar', name: 'radios'}]
        },{
            hideLabel: true,
            xtype: 'htmleditor',
            value: 'Mouse over toolbar for tooltips.<br /><br />The HTMLEditor IFrame requires a refresh between a stylesheet switch to get accurate colors.',
            height: 110,
            handler: function(){
                Ext.get('styleswitcher').on('click', function(e){
                    Ext.getCmp('form-widgets').getForm().reset();
                });
            }
        },{
            title: 'Plain Fieldset',
            xtype: 'fieldset',
            height: 50
        },{
            title: 'Collapsible Fieldset',
            xtype: 'fieldset',
            collapsible: true,
            height: 50
        },{
            title: 'Checkbox Fieldset',
            xtype: 'fieldset',
            checkboxToggle: true,
            height: 50
        }],
        buttons: [{
            text:'Toggle Enabled',
            cls: 'x-icon-btn',
            iconCls: 'x-icon-btn-toggle',
            handler: function(){
                Ext.getCmp('form-widgets').getForm().items.each(function(ctl){
                    ctl.setDisabled(!ctl.disabled);
                });
            }
        },{
            text: 'Reset Form',
            cls: 'x-icon-btn',
            iconCls: 'x-icon-btn-reset',
            handler: function(){
                Ext.getCmp('form-widgets').getForm().reset();
            }
        },{
            text:'Validate',
            cls: 'x-icon-btn',
            iconCls: 'x-icon-btn-ok',
            handler: function(){
                Ext.getCmp('form-widgets').getForm().isValid();
            }
        }]
    });
    
    //=============================================================
    // BorderLayout
    //=============================================================
    items.push({
        xtype: 'panel',
        width: 450,
        height: 350,
        title: 'BorderLayout Panel',
        x: 690, y: 260,
        layout: 'border',
        defaults: {
            collapsible: true,
            split: true
        },
        items: [{
            title: 'North',
            region: 'north',
            html: 'North',
            ctitle: 'North',
            margins: '5 5 0 5',
            height: 70
        },{
            title: 'South',
            region: 'south',
            html: 'South',
            collapseMode: 'mini',
            margins: '0 5 5 5',
            height: 70
        },{
            title: 'West',
            region: 'west',
            html: 'West',
            collapseMode: 'mini',
            margins: '0 0 0 5',
            width: 100
        },{
            title: 'East',
            region: 'east',
            html: 'East',
            margins: '0 5 0 0',
            width: 100
        },{
            title: 'Center',
            region: 'center',
            collapsible: false,
            html: 'Center'
        }]
    });
    
    //=============================================================
    // Grid
    //=============================================================
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
        ['E.I. du Pont de Nemours and Company',40.48,0.51,1.28,'9/1 12:00am']
    ];
    var store = new Ext.data.SimpleStore({
        fields: [
           {name: 'company'},
           {name: 'price', type: 'float'},
           {name: 'change', type: 'float'},
           {name: 'pctChange', type: 'float'},
           {name: 'lastChange', type: 'date', dateFormat: 'n/j h:ia'}
        ],
        sortInfo: {
            field: 'company', direction: 'ASC'
        }
    });
    var pagingBar = new Ext.PagingToolbar({
        pageSize: 5,
        store: store,
        displayInfo: true,
        displayMsg: 'Displaying topics {0} - {1} of {2}'
    });
    store.loadData(myData);
    
    items.push({
        xtype: 'grid',
        store: store,
        columns: [
            {id:'company',header: "Company", width: 160, sortable: true, dataIndex: 'company'},
            {header: "Price", width: 75, sortable: true, renderer: 'usMoney', dataIndex: 'price'},
            {header: "Change", width: 75, sortable: true, dataIndex: 'change'},
            {header: "% Change", width: 75, sortable: true, dataIndex: 'pctChange'},
            {header: "Last Updated", width: 85, sortable: true, renderer: Ext.util.Format.dateRenderer('m/d/Y'), dataIndex: 'lastChange'}
        ],
        stripeRows: true,
        autoExpandColumn: 'company',
        loadMask: true,
        height: 200,
        width: 450,
        x: 690, y: 620,
        title:'GridPanel',
        bbar: pagingBar,
        tbar: [
            { text: 'Toolbar' },'->',
            new Ext.form.TwinTriggerField({
                xtype: 'twintriggerfield',
                trigger1Class: 'x-form-clear-trigger',
                trigger2Class: 'x-form-search-trigger'
            })
         ]
    });

    //=============================================================
    // ListView
    //=============================================================

    var listView = new Ext.list.ListView({
        store: store,
        multiSelect: true,
        emptyText: 'No images to display',
        reserveScrollOffset: true,

        columns: [
            {id:'company',header: "Company", width: .5, sortable: true, dataIndex: 'company'},
            {header: "Price", width: .25, sortable: true, tpl: '{price:usMoney}', dataIndex: 'price'},
            {header: "Change", width: .25, sortable: true, dataIndex: 'change'}
        ]
    });
    
    items.push({
        xtype:'panel',
        id:'images-view',
        width:250,
        height:182,
        x: 430, y: 1130,
        collapsible:false,
        layout:'fit',
        title:'Simple ListView', // <i>(0 items selected)</i>
        items: listView
        
    });
    
    //=============================================================
    // Accordion / Tree
    //=============================================================
    var tree = new Ext.tree.TreePanel({
        title: 'TreePanel',
        autoScroll: true,
        enableDD: true
    });

    var root = new Ext.tree.TreeNode({
        text: 'Root Node',
        expanded: true
    });
    tree.setRootNode(root);

    root.appendChild(new Ext.tree.TreeNode({text: 'Item 1'}));
    root.appendChild(new Ext.tree.TreeNode({text: 'Item 2'}));
    var node = new Ext.tree.TreeNode({text: 'Folder'});
    node.appendChild(new Ext.tree.TreeNode({text: 'Item 3'}));
    root.appendChild(node);
    
    var accConfig = {
        title: 'Accordion and TreePanel',
        layout: 'accordion',
        x: 690, y: 830,
        width: 450,
        height: 240,
        bodyStyle: {
            'background-color': '#eee'
        },
        defaults: {
            border: false
        },
        items: [tree, {
            title: 'Item 2',
            html: 'Some content'
        },{
            title: 'Item 3',
            html: 'Some content'
        }]
    }

    items.push(accConfig);
    
    //=============================================================
    // Tabs
    //=============================================================
    var tabCfg = {
        xtype: 'tabpanel',
        activeTab: 0,
        width: 310,
        height: 150,
        defaults: {
            bodyStyle: 'padding:10px;'
        },
        items: [{
            title: 'Tab 1',
            html: 'Free-standing tab panel'
        },{
            title: 'Tab 2',
            closable: true
        },{
            title: 'Tab 3',
            closable: true
        }]
    };
    
    items.push(Ext.applyIf({
        x: 50, y: 970,
        enableTabScroll: true,
        items: [{
            title: 'Tab 1',
            html: 'Tab panel for display in a border layout'
        },{
            title: 'Tab 2',
            closable: true
        },{
            title: 'Tab 3',
            closable: true
        },{
            title: 'Tab 4',
            closable: true
        },{
            title: 'Tab 5',
            closable: true
        },{
            title: 'Tab 6',
            closable: true
        },{
            title: 'Tab 7',
            closable: true
        }]  // enable 4 through 7 to see tab scrolling
    }, tabCfg));
    
    items.push(Ext.apply({
        plain: true,
        x: 370, y: 970
    }, tabCfg));
    
    
    //=============================================================
    // DatePicker
    //=============================================================
    items.push({
        xtype: 'panel',
        border: false,
        width: 180,
        x: 50, y: 1130,
        items: {
            xtype: 'datepicker'
        }
    });
    
    //=============================================================
    // Resizable
    //=============================================================
    var rszEl = Ext.DomHelper.append(Ext.getBody(), {
        style: 'background: transparent;', html: '<div style="padding:20px;">Resizable handles</div>'
    }, true);
    rszEl.position('absolute', 1, 240, 1130);
    rszEl.setSize(180, 180);
    new Ext.Resizable(rszEl, {
        handles: 'all',
        pinned: true
    });
    
    //=============================================================
    // ProgressBar / Slider
    //=============================================================
    items.push({
        xtype: 'panel',
        title: 'ProgressBar / Slider',
        x: 690, y: 1080,
        width: 450,
        height: 200,
        bodyStyle: {padding: '15px'},
        items: [{
            xtype: 'progress',
            value: .5,
            text: 'Progress text...'
        },{
            xtype: 'slider',
            value: 50
        },{
            xtype: 'slider',
            vertical: true,
            value: 50,
            height: 100
        }]
    });
    
    
    //=============================================================
    // Render everything!
    //=============================================================
    new Ext.Viewport({
        layout: 'absolute',
        //cls: 'x-layout-grid',
        autoScroll: true,
        items: items
    });
    
    Ext.getCmp('menu-btn').showMenu();
    
    //=============================================================
    // Stylesheet Switcher
    //=============================================================
    Ext.get('styleswitcher_select').on('change',function(e,select){
        var name = select[select.selectedIndex].value;
        setActiveStyleSheet(name);
    });
    
    var cookie = readCookie("style");
    var title = cookie ? cookie : getPreferredStyleSheet();
    Ext.get('styleswitcher_select').dom.value=title;
});