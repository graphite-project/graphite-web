/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */

Ext.onReady(function(){

    var store = new Ext.data.JsonStore({
        url: 'get-images.php',
        root: 'images',
        fields: ['name', 'url', {name:'size', type: 'float'}, {name:'lastmod', type:'date', dateFormat:'timestamp'}]
    });
    store.load();

    var listView = new Ext.list.ListView({
        store: store,
        multiSelect: true,
        emptyText: 'No images to display',
        reserveScrollOffset: true,

        columns: [{
            header: 'File',
            width: .5,
            dataIndex: 'name'
        },{
            header: 'Last Modified',
            xtype: 'datecolumn',
            format: 'm-d h:i a',
            width: .35, 
            dataIndex: 'lastmod'
        },{
            header: 'Size',
            dataIndex: 'size',
            tpl: '{size:fileSize}',
            align: 'right',
            cls: 'listview-filesize'
        }]
    });
    
    // put it in a Panel so it looks pretty
    var panel = new Ext.Panel({
        id:'images-view',
        width:425,
        height:250,
        collapsible:true,
        layout:'fit',
        title:'Simple ListView <i>(0 items selected)</i>',
        items: listView
    });
    panel.render(document.body);

    // little bit of feedback
    listView.on('selectionchange', function(view, nodes){
        var l = nodes.length;
        var s = l != 1 ? 's' : '';
        panel.setTitle('Simple ListView <i>('+l+' item'+s+' selected)</i>');
    });
});