/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.tree.TreeEventModel = function(tree){
    this.tree = tree;
    this.tree.on('render', this.initEvents, this);
};

Ext.tree.TreeEventModel.prototype = {
    initEvents : function(){
        var t = this.tree;

        if(t.trackMouseOver !== false){
            t.mon(t.innerCt, {
                scope: this,
                mouseover: this.delegateOver,
                mouseout: this.delegateOut
            });
        }
        t.mon(t.getTreeEl(), {
            scope: this,
            click: this.delegateClick,
            dblclick: this.delegateDblClick,
            contextmenu: this.delegateContextMenu
        });
    },

    getNode : function(e){
        var t;
        if(t = e.getTarget('.x-tree-node-el', 10)){
            var id = Ext.fly(t, '_treeEvents').getAttribute('tree-node-id', 'ext');
            if(id){
                return this.tree.getNodeById(id);
            }
        }
        return null;
    },

    getNodeTarget : function(e){
        var t = e.getTarget('.x-tree-node-icon', 1);
        if(!t){
            t = e.getTarget('.x-tree-node-el', 6);
        }
        return t;
    },

    delegateOut : function(e, t){
        if(!this.beforeEvent(e)){
            return;
        }
        if(e.getTarget('.x-tree-ec-icon', 1)){
            var n = this.getNode(e);
            this.onIconOut(e, n);
            if(n == this.lastEcOver){
                delete this.lastEcOver;
            }
        }
        if((t = this.getNodeTarget(e)) && !e.within(t, true)){
            this.onNodeOut(e, this.getNode(e));
        }
    },

    delegateOver : function(e, t){
        if(!this.beforeEvent(e)){
            return;
        }
        if(Ext.isGecko && !this.trackingDoc){ // prevent hanging in FF
            Ext.getBody().on('mouseover', this.trackExit, this);
            this.trackingDoc = true;
        }
        if(this.lastEcOver){ // prevent hung highlight
            this.onIconOut(e, this.lastEcOver);
            delete this.lastEcOver;
        }
        if(e.getTarget('.x-tree-ec-icon', 1)){
            this.lastEcOver = this.getNode(e);
            this.onIconOver(e, this.lastEcOver);
        }
        if(t = this.getNodeTarget(e)){
            this.onNodeOver(e, this.getNode(e));
        }
    },

    trackExit : function(e){
        if(this.lastOverNode){
            if(this.lastOverNode.ui && !e.within(this.lastOverNode.ui.getEl())){
                this.onNodeOut(e, this.lastOverNode);
            }
            delete this.lastOverNode;
            Ext.getBody().un('mouseover', this.trackExit, this);
            this.trackingDoc = false;
        }

    },

    delegateClick : function(e, t){
        if(this.beforeEvent(e)){
            if(e.getTarget('input[type=checkbox]', 1)){
                this.onCheckboxClick(e, this.getNode(e));
            }else if(e.getTarget('.x-tree-ec-icon', 1)){
                this.onIconClick(e, this.getNode(e));
            }else if(this.getNodeTarget(e)){
                this.onNodeClick(e, this.getNode(e));
            }
        }else{
            this.checkContainerEvent(e, 'click');
        }
    },

    delegateDblClick : function(e, t){
        if(this.beforeEvent(e)){
            if(this.getNodeTarget(e)){
                this.onNodeDblClick(e, this.getNode(e));
            }
        }else{
            this.checkContainerEvent(e, 'dblclick');
        }
    },

    delegateContextMenu : function(e, t){
        if(this.beforeEvent(e)){
            if(this.getNodeTarget(e)){
                this.onNodeContextMenu(e, this.getNode(e));
            }
        }else{
            this.checkContainerEvent(e, 'contextmenu');
        }
    },
    
    checkContainerEvent: function(e, type){
        if(this.disabled){
            e.stopEvent();
            return false;
        }
        this.onContainerEvent(e, type);    
    },

    onContainerEvent: function(e, type){
        this.tree.fireEvent('container' + type, this.tree, e);
    },

    onNodeClick : function(e, node){
        node.ui.onClick(e);
    },

    onNodeOver : function(e, node){
        this.lastOverNode = node;
        node.ui.onOver(e);
    },

    onNodeOut : function(e, node){
        node.ui.onOut(e);
    },

    onIconOver : function(e, node){
        node.ui.addClass('x-tree-ec-over');
    },

    onIconOut : function(e, node){
        node.ui.removeClass('x-tree-ec-over');
    },

    onIconClick : function(e, node){
        node.ui.ecClick(e);
    },

    onCheckboxClick : function(e, node){
        node.ui.onCheckChange(e);
    },

    onNodeDblClick : function(e, node){
        node.ui.onDblClick(e);
    },

    onNodeContextMenu : function(e, node){
        node.ui.onContextMenu(e);
    },

    beforeEvent : function(e){
        var node = this.getNode(e);
        if(this.disabled || !node || !node.ui){
            e.stopEvent();
            return false;
        }
        return true;
    },

    disable: function(){
        this.disabled = true;
    },

    enable: function(){
        this.disabled = false;
    }
};