/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){

    var handleAction = function(action){
        Ext.example.msg('<b>Action</b>', 'You clicked "'+action+'"');
    };
    
    var p = new Ext.Window({
        title: 'Standard',
        closable: false,
        height:250,
        width: 500,
        bodyStyle: 'padding:10px',
        contentEl: 'content',
        autoScroll: true,
        tbar: new Ext.Toolbar({
            enableOverflow: true,
            items: [{
                xtype:'splitbutton',
                text: 'Menu Button',
                iconCls: 'add16',
                handler: handleAction.createCallback('Menu Button'),
                menu: [{text: 'Menu Item 1', handler: handleAction.createCallback('Menu Item 1')}]
            },'-',{
                xtype:'splitbutton',
                text: 'Cut',
                iconCls: 'add16',
                handler: handleAction.createCallback('Cut'),
                menu: [{text: 'Cut menu', handler: handleAction.createCallback('Cut menu')}]
            },{
                text: 'Copy',
                iconCls: 'add16',
                handler: handleAction.createCallback('Copy')
            },{
                text: 'Paste',
                iconCls: 'add16',
                menu: [{text: 'Paste menu', handler: handleAction.createCallback('Paste menu')}]
            },'-',{
                text: 'Format',
                iconCls: 'add16',
                handler: handleAction.createCallback('Format')
            },'->',{
                text: 'Right',
                iconCls: 'add16',
                handler: handleAction.createCallback('Right')
            }]
        })
    });
    p.show();

});