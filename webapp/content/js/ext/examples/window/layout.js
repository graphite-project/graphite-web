/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){
    
    Ext.state.Manager.setProvider(
            new Ext.state.SessionProvider({state: Ext.appState}));

    var button = Ext.get('show-btn');

    button.on('click', function(){

        // tabs for the center
        var tabs = new Ext.TabPanel({
            region: 'center',
            margins:'3 3 3 0', 
            activeTab: 0,
            defaults:{autoScroll:true},

            items:[{
                title: 'Bogus Tab',
                html: Ext.example.bogusMarkup
            },{
                title: 'Another Tab',
                html: Ext.example.bogusMarkup
            },{
                title: 'Closable Tab',
                html: Ext.example.bogusMarkup,
                closable:true
            }]
        });

        // Panel for the west
        var nav = new Ext.Panel({
            title: 'Navigation',
            region: 'west',
            split: true,
            width: 200,
            collapsible: true,
            margins:'3 0 3 3',
            cmargins:'3 3 3 3'
        });

        var win = new Ext.Window({
            title: 'Layout Window',
            closable:true,
            width:600,
            height:350,
            //border:false,
            plain:true,
            layout: 'border',

            items: [nav, tabs]
        });

        win.show(this);
    });
});