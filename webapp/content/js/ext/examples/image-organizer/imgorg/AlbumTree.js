/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Imgorg.AlbumTree = Ext.extend(Ext.tree.TreePanel,{
    initComponent: function() {
        Ext.apply(this,{
            loader: new Ext.ux.tree.DirectTreeLoader({
                api: Imgorg.ss.Albums
            }),
            root: new Ext.tree.TreeNode({
                text:'dummynode',
                expanded: true,
                leaf: false,
                cls:'album-node'
            }),
            rootVisible: false,
            clearOnLoad: false,
            autoScroll: true,
            containerScroll: true,
            enableDrop: true,
            dropConfig: {
                ddGroup: 'organizerDD',
                notifyDrop: this.onNotifyDrop.createDelegate(this)
            }
        });
        Imgorg.AlbumTree.superclass.initComponent.call(this);
        this.loader.load(this.root);
        
        this.editor = new Ext.tree.TreeEditor(this, {
            allowBlank: false,
            blankText: 'A name is required',
            selectOnFocus: true
        });
        this.editor.on('complete', this.onEditComplete, this);
        this.on('contextmenu', this.onContextMenu, this);
    },
    
    onContextMenu: function(node, e) {
        e.stopEvent();
        if(!this.contMenu) {
            this.contMenu = new Ext.menu.Menu({
                items: [{
                    text: 'Remove',
                    handler: function() {
                        var node = this.currentNode;
                        node.unselect();
                        Ext.fly(node.ui.elNode).ghost('l', {
                            callback: function() {
                                Imgorg.ss.Albums.remove({
                                    album: node.id
                                });
                                node.remove();
                            }, scope: node, duration: 0.4
                        });
                    },
                    scope: this
                }]
            });
        }
        this.currentNode = node;
        this.contMenu.showAt(e.getXY());
    },
    
    onNotifyDrop: function(src, e, data) {
        var nodes = data.nodes;
        var nodeIds = [];
        for (var i = 0;i < nodes.length;i++) {
            nodeIds.push(nodes[i].id);
        }
        this.addToAlbum(nodeIds, this.dropZone.dragOverData.target.attributes.id);
        return true; // cancell repair anim
    },
    
    addToAlbum: function(nodes, album) {
        Imgorg.ss.Images.addToAlbum({
            images: nodes, 
            album: album
        });
    },
    
    addAlbum: function() {
        var root = this.root;
        var node = root.appendChild(new Ext.tree.TreeNode({
            text:'Album',
            cls:'album-node',
            allowDrag:false
        }));
        this.getSelectionModel().select(node);
        var ge = this.editor;
        setTimeout(function(){
            ge.editNode = node;
            ge.startEdit(node.ui.textNode);
        }, 10);
    },
    
    onEditComplete: function(editor, newVal, oldVal) {
        var n = editor.editNode;
        Imgorg.ss.Albums.addOrUpdate({node: n.id, text: newVal, id: n.attributes.id});
    }
});
Ext.reg('img-albumtree', Imgorg.AlbumTree);

Ext.ns('Ext.ux.tree');
Ext.ux.tree.DirectTreeLoader = Ext.extend(Ext.tree.TreeLoader,{
    baseAttrs: {
        cls:'album-node'
    },
    
    load : function(node, callback){
        this.requestData(node, callback);
    },
    
    requestData : function(node, callback){
        if(this.fireEvent("beforeload", this, node, callback) !== false){
            this.api.loadtree({
                node: node.id
            }, this.processResponse.createDelegate(this, [node, callback], true));
        }else{
            // if the load is cancelled, make sure we notify
            // the node that we are done
            if(typeof callback == "function"){
                callback();
            }
        }
    },
    
    processResponse : function(res, trans, node, callback){
        try {
            node.beginUpdate();
            for(var i = 0, len = res.length; i < len; i++){
                var n = this.createNode(res[i]);
                if(n){
                    node.appendChild(n);
                }
            }
            node.endUpdate();
            if(typeof callback == "function"){
                callback(this, node);
            }
        }catch(e){
            this.handleFailure(res);
        }
    }
});