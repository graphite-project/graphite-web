/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function() {
	Ext.QuickTips.init();
    
    // create some portlet tools using built in Ext tool ids
    var tools = [{
        id:'gear',
        handler: function(){
            Ext.Msg.alert('Message', 'The Settings tool was clicked.');
        }
    },{
        id:'close',
        handler: function(e, target, panel){
            panel.ownerCt.remove(panel, true);
        }
    }];

    var viewport = new Ext.Viewport({
        layout:'fit',
        items:[{
            xtype: 'grouptabpanel',
    		tabWidth: 130,
    		activeGroup: 0,
    		items: [{
    			mainItem: 1,
    			items: [{
    				title: 'Tickets',
                    layout: 'fit',
                    iconCls: 'x-icon-tickets',
                    tabTip: 'Tickets tabtip',
                    style: 'padding: 10px;',
    				items: [new SampleGrid([0,1,2,3,4])]
    			}, 
                {
                    xtype: 'portal',
                    title: 'Dashboard',
                    tabTip: 'Dashboard tabtip',
                    items:[{
                        columnWidth:.33,
                        style:'padding:10px 0 10px 10px',
                        items:[{
                            title: 'Grid in a Portlet',
                            layout:'fit',
                            tools: tools,
                            items: new SampleGrid([0, 2, 3])
                        },{
                            title: 'Another Panel 1',
                            tools: tools,
                            html: Ext.example.shortBogusMarkup
                        }]
                    },{
                        columnWidth:.33,
                        style:'padding:10px 0 10px 10px',
                        items:[{
                            title: 'Panel 2',
                            tools: tools,
                            html: Ext.example.shortBogusMarkup
                        },{
                            title: 'Another Panel 2',
                            tools: tools,
                            html: Ext.example.shortBogusMarkup
                        }]
                    },{
                        columnWidth:.33,
                        style:'padding:10px',
                        items:[{
                            title: 'Panel 3',
                            tools: tools,
                            html: Ext.example.shortBogusMarkup
                        },{
                            title: 'Another Panel 3',
                            tools: tools,
                            html: Ext.example.shortBogusMarkup
                        }]
                    }]                    
                }, {
    				title: 'Subscriptions',
                    iconCls: 'x-icon-subscriptions',
                    tabTip: 'Subscriptions tabtip',
                    style: 'padding: 10px;',
					layout: 'fit',
    				items: [{
						xtype: 'tabpanel',
						activeTab: 1,
						items: [{
							title: 'Nested Tabs',
							html: Ext.example.shortBogusMarkup
						}]	
					}]	
    			}, {
    				title: 'Users',
                    iconCls: 'x-icon-users',
                    tabTip: 'Users tabtip',
                    style: 'padding: 10px;',
    				html: Ext.example.shortBogusMarkup			
    			}]
            }, {
                expanded: true,
                items: [{
                    title: 'Configuration',
                    iconCls: 'x-icon-configuration',
                    tabTip: 'Configuration tabtip',
                    style: 'padding: 10px;',
                    html: Ext.example.shortBogusMarkup 
                }, {
                    title: 'Email Templates',
                    iconCls: 'x-icon-templates',
                    tabTip: 'Templates tabtip',
                    style: 'padding: 10px;',
                    html: Ext.example.shortBogusMarkup
                }]
            }]
		}]
    });
});
