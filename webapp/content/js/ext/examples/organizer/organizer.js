/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){

    Ext.QuickTips.init();
    // Album toolbar
    var newIndex = 3;
    var tb = new Ext.Toolbar({
        items:[{
            text: 'New Album',
            iconCls: 'album-btn',
            handler: function(){
                var node = root.appendChild(new Ext.tree.TreeNode({
                    text:'Album ' + (++newIndex),
                    cls:'album-node',
                    allowDrag:false
                }));
                tree.getSelectionModel().select(node);
                setTimeout(function(){
                    ge.editNode = node;
                    ge.startEdit(node.ui.textNode);
                }, 10);
            }
        }]
    });

    // set up the Album tree
    var tree = new Ext.tree.TreePanel({
         // tree
         animate:true,
         enableDD:true,
         containerScroll: true,
         ddGroup: 'organizerDD',
         rootVisible:false,
         // layout
         region:'west',
         width:200,
         split:true,
         // panel
         title:'My Albums',
         autoScroll:true,
         tbar: tb,
         margins: '5 0 5 5'
    });

    var root = new Ext.tree.TreeNode({
        text: 'Albums',
        allowDrag:false,
        allowDrop:false
    });
    tree.setRootNode(root);

    root.appendChild(
        new Ext.tree.TreeNode({text:'Album 1', cls:'album-node', allowDrag:false}),
        new Ext.tree.TreeNode({text:'Album 2', cls:'album-node', allowDrag:false}),
        new Ext.tree.TreeNode({text:'Album 3', cls:'album-node', allowDrag:false})
    );

    // add an inline editor for the nodes
    var ge = new Ext.tree.TreeEditor(tree, {/* fieldconfig here */ }, {
        allowBlank:false,
        blankText:'A name is required',
        selectOnFocus:true
    });

    // Set up images view

    var view = new Ext.DataView({
        itemSelector: 'div.thumb-wrap',
        style:'overflow:auto',
        multiSelect: true,
        plugins: new Ext.DataView.DragSelector({dragSafe:true}),
        store: new Ext.data.JsonStore({
            url: '../view/get-images.php',
            autoLoad: true,
            root: 'images',
            id:'name',
            fields:[
                'name', 'url',
                {name: 'shortName', mapping: 'name', convert: shortName}
            ]
        }),
        tpl: new Ext.XTemplate(
            '<tpl for=".">',
            '<div class="thumb-wrap" id="{name}">',
            '<div class="thumb"><img src="../view/{url}" class="thumb-img"></div>',
            '<span>{shortName}</span></div>',
            '</tpl>'
        )
    });

    var images = new Ext.Panel({
        id:'images',
        title:'My Images',
        region:'center',
        margins: '5 5 5 0',
        layout:'fit',
        
        items: view
    });

    var layout = new Ext.Panel({
        layout: 'border',
        width:650,
        height:400,
        items: [tree, images]
    });

    layout.render('layout');

    var dragZone = new ImageDragZone(view, {containerScroll:true,
        ddGroup: 'organizerDD'});
});



/**
 * Create a DragZone instance for our JsonView
 */
ImageDragZone = function(view, config){
    this.view = view;
    ImageDragZone.superclass.constructor.call(this, view.getEl(), config);
};
Ext.extend(ImageDragZone, Ext.dd.DragZone, {
    // We don't want to register our image elements, so let's 
    // override the default registry lookup to fetch the image 
    // from the event instead
    getDragData : function(e){
        var target = e.getTarget('.thumb-wrap');
        if(target){
            var view = this.view;
            if(!view.isSelected(target)){
                view.onClick(e);
            }
            var selNodes = view.getSelectedNodes();
            var dragData = {
                nodes: selNodes
            };
            if(selNodes.length == 1){
                dragData.ddel = target;
                dragData.single = true;
            }else{
                var div = document.createElement('div'); // create the multi element drag "ghost"
                div.className = 'multi-proxy';
                for(var i = 0, len = selNodes.length; i < len; i++){
                    div.appendChild(selNodes[i].firstChild.firstChild.cloneNode(true)); // image nodes only
                    if((i+1) % 3 == 0){
                        div.appendChild(document.createElement('br'));
                    }
                }
                var count = document.createElement('div'); // selected image count
                count.innerHTML = i + ' images selected';
                div.appendChild(count);
                
                dragData.ddel = div;
                dragData.multi = true;
            }
            return dragData;
        }
        return false;
    },

    // this method is called by the TreeDropZone after a node drop
    // to get the new tree node (there are also other way, but this is easiest)
    getTreeNode : function(){
        var treeNodes = [];
        var nodeData = this.view.getRecords(this.dragData.nodes);
        for(var i = 0, len = nodeData.length; i < len; i++){
            var data = nodeData[i].data;
            treeNodes.push(new Ext.tree.TreeNode({
                text: data.name,
                icon: '../view/'+data.url,
                data: data,
                leaf:true,
                cls: 'image-node'
            }));
        }
        return treeNodes;
    },
    
    // the default action is to "highlight" after a bad drop
    // but since an image can't be highlighted, let's frame it 
    afterRepair:function(){
        for(var i = 0, len = this.dragData.nodes.length; i < len; i++){
            Ext.fly(this.dragData.nodes[i]).frame('#8db2e3', 1);
        }
        this.dragging = false;    
    },
    
    // override the default repairXY with one offset for the margins and padding
    getRepairXY : function(e){
        if(!this.dragData.multi){
            var xy = Ext.Element.fly(this.dragData.ddel).getXY();
            xy[0]+=3;xy[1]+=3;
            return xy;
        }
        return false;
    }
});

// Utility functions

function shortName(name){
    if(name.length > 15){
        return name.substr(0, 12) + '...';
    }
    return name;
};
