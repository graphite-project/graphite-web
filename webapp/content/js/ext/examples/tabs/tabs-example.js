/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){
    // basic tabs 1, built from existing content
    var tabs = new Ext.TabPanel({
        renderTo: 'tabs1',
        width:450,
        activeTab: 0,
        frame:true,
        defaults:{autoHeight: true},
        items:[
            {contentEl:'script', title: 'Short Text'},
            {contentEl:'markup', title: 'Long Text'}
        ]
    });

    // second tabs built from JS
    var tabs2 = new Ext.TabPanel({
        renderTo: document.body,
        activeTab: 0,
        width:600,
        height:250,
        plain:true,
        defaults:{autoScroll: true},
        items:[{
                title: 'Normal Tab',
                html: "My content was added during construction."
            },{
                title: 'Ajax Tab 1',
                autoLoad:'ajax1.htm'
            },{
                title: 'Ajax Tab 2',
                autoLoad: {url: 'ajax2.htm', params: 'foo=bar&wtf=1'}
            },{
                title: 'Event Tab',
                listeners: {activate: handleActivate},
                html: "I am tab 4's content. I also have an event listener attached."
            },{
                title: 'Disabled Tab',
                disabled:true,
                html: "Can't see me cause I'm disabled"
            }
        ]
    });

    function handleActivate(tab){
        alert(tab.title + ' was activated.');
    }
});