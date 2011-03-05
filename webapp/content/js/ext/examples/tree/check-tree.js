/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */

Ext.onReady(function(){
    var tree = new Ext.tree.TreePanel({
        renderTo:'tree-div',
        title: 'My Task List',
        height: 300,
        width: 400,
        useArrows:true,
        autoScroll:true,
        animate:true,
        enableDD:true,
        containerScroll: true,
        rootVisible: false,
        frame: true,
        root: {
            nodeType: 'async'
        },
        
        // auto create TreeLoader
        dataUrl: 'check-nodes.json',
        
        listeners: {
            'checkchange': function(node, checked){
                if(checked){
                    node.getUI().addClass('complete');
                }else{
                    node.getUI().removeClass('complete');
                }
            }
        },
        
        buttons: [{
            text: 'Get Completed Tasks',
            handler: function(){
                var msg = '', selNodes = tree.getChecked();
                Ext.each(selNodes, function(node){
                    if(msg.length > 0){
                        msg += ', ';
                    }
                    msg += node.text;
                });
                Ext.Msg.show({
                    title: 'Completed Tasks', 
                    msg: msg.length > 0 ? msg : 'None',
                    icon: Ext.Msg.INFO,
                    minWidth: 200,
                    buttons: Ext.Msg.OK
                });
            }
        }]
    });

    tree.getRootNode().expand(true);
});