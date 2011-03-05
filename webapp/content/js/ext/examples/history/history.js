/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */

Ext.onReady(function() {
    
    // The only requirement for this to work is that you must have a hidden field and
    // an iframe available in the page with ids corresponding to Ext.History.fieldId
    // and Ext.History.iframeId.  See history.html for an example.
    Ext.History.init();
    
    // Needed if you want to handle history for multiple components in the same page.
    // Should be something that won't be in component ids.
    var tokenDelimiter = ':';
    
    var tp = new Ext.TabPanel({
        renderTo: Ext.getBody(),
        id: 'main-tabs',
        height: 300,
        width: 600,
        activeTab: 0,
        
        items: [{
            xtype: 'tabpanel',
            title: 'Tab 1',
            id: 'tab1',
            activeTab: 0,
            tabPosition: 'bottom',
            
            items: [{
                title: 'Sub-tab 1',
                id: 'subtab1'
            },{
                title: 'Sub-tab 2',
                id: 'subtab2'
            },{
                title: 'Sub-tab 3',
                id: 'subtab3'
            }],
            
            listeners: {
                'tabchange': function(tabPanel, tab){
                    Ext.History.add(tabPanel.id + tokenDelimiter + tab.id);
                }
            }
        },{
            title: 'Tab 2',
            id: 'tab2'
        },{
            title: 'Tab 3',
            id: 'tab3'
        },{
            title: 'Tab 4',
            id: 'tab4'
        },{
            title: 'Tab 5',
            id: 'tab5'
        }],
        
        listeners: {
            'tabchange': function(tabPanel, tab){
                // Ignore tab1 since it is a separate tab panel and we're managing history for it also.
                // We'll use its handler instead in that case so we don't get duplicate nav events for sub tabs.
                if(tab.id != 'tab1'){
                    Ext.History.add(tabPanel.id + tokenDelimiter + tab.id);
                }
            }
        }
    });
    
    // Handle this change event in order to restore the UI to the appropriate history state
    Ext.History.on('change', function(token){
        if(token){
            var parts = token.split(tokenDelimiter);
            var tabPanel = Ext.getCmp(parts[0]);
            var tabId = parts[1];
            
            tabPanel.show();
            tabPanel.setActiveTab(tabId);
        }else{
            // This is the initial default state.  Necessary if you navigate starting from the
            // page without any existing history token params and go back to the start state.
            tp.setActiveTab(0);
            tp.getItem(0).setActiveTab(0);
        }
    });
    
});