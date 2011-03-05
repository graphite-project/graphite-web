/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.tree.DefaultSelectionModel
 * @extends Ext.util.Observable
 * The default single selection for a TreePanel.
 */
Ext.tree.DefaultSelectionModel = Ext.extend(Ext.util.Observable, {
    
    constructor : function(config){
        this.selNode = null;
   
        this.addEvents(
            /**
             * @event selectionchange
             * Fires when the selected node changes
             * @param {DefaultSelectionModel} this
             * @param {TreeNode} node the new selection
             */
            'selectionchange',

            /**
             * @event beforeselect
             * Fires before the selected node changes, return false to cancel the change
             * @param {DefaultSelectionModel} this
             * @param {TreeNode} node the new selection
             * @param {TreeNode} node the old selection
             */
            'beforeselect'
        );

        Ext.apply(this, config);
        Ext.tree.DefaultSelectionModel.superclass.constructor.call(this);    
    },
    
    init : function(tree){
        this.tree = tree;
        tree.mon(tree.getTreeEl(), 'keydown', this.onKeyDown, this);
        tree.on('click', this.onNodeClick, this);
    },
    
    onNodeClick : function(node, e){
        this.select(node);
    },
    
    /**
     * Select a node.
     * @param {TreeNode} node The node to select
     * @return {TreeNode} The selected node
     */
    select : function(node, /* private*/ selectNextNode){
        // If node is hidden, select the next node in whatever direction was being moved in.
        if (!Ext.fly(node.ui.wrap).isVisible() && selectNextNode) {
            return selectNextNode.call(this, node);
        }
        var last = this.selNode;
        if(node == last){
            node.ui.onSelectedChange(true);
        }else if(this.fireEvent('beforeselect', this, node, last) !== false){
            if(last && last.ui){
                last.ui.onSelectedChange(false);
            }
            this.selNode = node;
            node.ui.onSelectedChange(true);
            this.fireEvent('selectionchange', this, node, last);
        }
        return node;
    },
    
    /**
     * Deselect a node.
     * @param {TreeNode} node The node to unselect
     * @param {Boolean} silent True to stop the selectionchange event from firing.
     */
    unselect : function(node, silent){
        if(this.selNode == node){
            this.clearSelections(silent);
        }    
    },
    
    /**
     * Clear all selections
     * @param {Boolean} silent True to stop the selectionchange event from firing.
     */
    clearSelections : function(silent){
        var n = this.selNode;
        if(n){
            n.ui.onSelectedChange(false);
            this.selNode = null;
            if(silent !== true){
                this.fireEvent('selectionchange', this, null);
            }
        }
        return n;
    },
    
    /**
     * Get the selected node
     * @return {TreeNode} The selected node
     */
    getSelectedNode : function(){
        return this.selNode;    
    },
    
    /**
     * Returns true if the node is selected
     * @param {TreeNode} node The node to check
     * @return {Boolean}
     */
    isSelected : function(node){
        return this.selNode == node;  
    },

    /**
     * Selects the node above the selected node in the tree, intelligently walking the nodes
     * @return TreeNode The new selection
     */
    selectPrevious : function(/* private */ s){
        if(!(s = s || this.selNode || this.lastSelNode)){
            return null;
        }
        // Here we pass in the current function to select to indicate the direction we're moving
        var ps = s.previousSibling;
        if(ps){
            if(!ps.isExpanded() || ps.childNodes.length < 1){
                return this.select(ps, this.selectPrevious);
            } else{
                var lc = ps.lastChild;
                while(lc && lc.isExpanded() && Ext.fly(lc.ui.wrap).isVisible() && lc.childNodes.length > 0){
                    lc = lc.lastChild;
                }
                return this.select(lc, this.selectPrevious);
            }
        } else if(s.parentNode && (this.tree.rootVisible || !s.parentNode.isRoot)){
            return this.select(s.parentNode, this.selectPrevious);
        }
        return null;
    },

    /**
     * Selects the node above the selected node in the tree, intelligently walking the nodes
     * @return TreeNode The new selection
     */
    selectNext : function(/* private */ s){
        if(!(s = s || this.selNode || this.lastSelNode)){
            return null;
        }
        // Here we pass in the current function to select to indicate the direction we're moving
        if(s.firstChild && s.isExpanded() && Ext.fly(s.ui.wrap).isVisible()){
             return this.select(s.firstChild, this.selectNext);
         }else if(s.nextSibling){
             return this.select(s.nextSibling, this.selectNext);
         }else if(s.parentNode){
            var newS = null;
            s.parentNode.bubble(function(){
                if(this.nextSibling){
                    newS = this.getOwnerTree().selModel.select(this.nextSibling, this.selectNext);
                    return false;
                }
            });
            return newS;
         }
        return null;
    },

    onKeyDown : function(e){
        var s = this.selNode || this.lastSelNode;
        // undesirable, but required
        var sm = this;
        if(!s){
            return;
        }
        var k = e.getKey();
        switch(k){
             case e.DOWN:
                 e.stopEvent();
                 this.selectNext();
             break;
             case e.UP:
                 e.stopEvent();
                 this.selectPrevious();
             break;
             case e.RIGHT:
                 e.preventDefault();
                 if(s.hasChildNodes()){
                     if(!s.isExpanded()){
                         s.expand();
                     }else if(s.firstChild){
                         this.select(s.firstChild, e);
                     }
                 }
             break;
             case e.LEFT:
                 e.preventDefault();
                 if(s.hasChildNodes() && s.isExpanded()){
                     s.collapse();
                 }else if(s.parentNode && (this.tree.rootVisible || s.parentNode != this.tree.getRootNode())){
                     this.select(s.parentNode, e);
                 }
             break;
        };
    }
});

/**
 * @class Ext.tree.MultiSelectionModel
 * @extends Ext.util.Observable
 * Multi selection for a TreePanel.
 */
Ext.tree.MultiSelectionModel = Ext.extend(Ext.util.Observable, {
    
    constructor : function(config){
        this.selNodes = [];
        this.selMap = {};
        this.addEvents(
            /**
             * @event selectionchange
             * Fires when the selected nodes change
             * @param {MultiSelectionModel} this
             * @param {Array} nodes Array of the selected nodes
             */
            'selectionchange'
        );
        Ext.apply(this, config);
        Ext.tree.MultiSelectionModel.superclass.constructor.call(this);    
    },
    
    init : function(tree){
        this.tree = tree;
        tree.mon(tree.getTreeEl(), 'keydown', this.onKeyDown, this);
        tree.on('click', this.onNodeClick, this);
    },
    
    onNodeClick : function(node, e){
        if(e.ctrlKey && this.isSelected(node)){
            this.unselect(node);
        }else{
            this.select(node, e, e.ctrlKey);
        }
    },
    
    /**
     * Select a node.
     * @param {TreeNode} node The node to select
     * @param {EventObject} e (optional) An event associated with the selection
     * @param {Boolean} keepExisting True to retain existing selections
     * @return {TreeNode} The selected node
     */
    select : function(node, e, keepExisting){
        if(keepExisting !== true){
            this.clearSelections(true);
        }
        if(this.isSelected(node)){
            this.lastSelNode = node;
            return node;
        }
        this.selNodes.push(node);
        this.selMap[node.id] = node;
        this.lastSelNode = node;
        node.ui.onSelectedChange(true);
        this.fireEvent('selectionchange', this, this.selNodes);
        return node;
    },
    
    /**
     * Deselect a node.
     * @param {TreeNode} node The node to unselect
     */
    unselect : function(node){
        if(this.selMap[node.id]){
            node.ui.onSelectedChange(false);
            var sn = this.selNodes;
            var index = sn.indexOf(node);
            if(index != -1){
                this.selNodes.splice(index, 1);
            }
            delete this.selMap[node.id];
            this.fireEvent('selectionchange', this, this.selNodes);
        }
    },
    
    /**
     * Clear all selections
     */
    clearSelections : function(suppressEvent){
        var sn = this.selNodes;
        if(sn.length > 0){
            for(var i = 0, len = sn.length; i < len; i++){
                sn[i].ui.onSelectedChange(false);
            }
            this.selNodes = [];
            this.selMap = {};
            if(suppressEvent !== true){
                this.fireEvent('selectionchange', this, this.selNodes);
            }
        }
    },
    
    /**
     * Returns true if the node is selected
     * @param {TreeNode} node The node to check
     * @return {Boolean}
     */
    isSelected : function(node){
        return this.selMap[node.id] ? true : false;  
    },
    
    /**
     * Returns an array of the selected nodes
     * @return {Array}
     */
    getSelectedNodes : function(){
        return this.selNodes.concat([]);
    },

    onKeyDown : Ext.tree.DefaultSelectionModel.prototype.onKeyDown,

    selectNext : Ext.tree.DefaultSelectionModel.prototype.selectNext,

    selectPrevious : Ext.tree.DefaultSelectionModel.prototype.selectPrevious
});