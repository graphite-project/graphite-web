/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.tree.AsyncTreeNode
 * @extends Ext.tree.TreeNode
 * @cfg {TreeLoader} loader A TreeLoader to be used by this node (defaults to the loader defined on the tree)
 * @constructor
 * @param {Object/String} attributes The attributes/config for the node or just a string with the text for the node 
 */
 Ext.tree.AsyncTreeNode = function(config){
    this.loaded = config && config.loaded === true;
    this.loading = false;
    Ext.tree.AsyncTreeNode.superclass.constructor.apply(this, arguments);
    /**
    * @event beforeload
    * Fires before this node is loaded, return false to cancel
    * @param {Node} this This node
    */
    this.addEvents('beforeload', 'load');
    /**
    * @event load
    * Fires when this node is loaded
    * @param {Node} this This node
    */
    /**
     * The loader used by this node (defaults to using the tree's defined loader)
     * @type TreeLoader
     * @property loader
     */
};
Ext.extend(Ext.tree.AsyncTreeNode, Ext.tree.TreeNode, {
    expand : function(deep, anim, callback, scope){
        if(this.loading){ // if an async load is already running, waiting til it's done
            var timer;
            var f = function(){
                if(!this.loading){ // done loading
                    clearInterval(timer);
                    this.expand(deep, anim, callback, scope);
                }
            }.createDelegate(this);
            timer = setInterval(f, 200);
            return;
        }
        if(!this.loaded){
            if(this.fireEvent("beforeload", this) === false){
                return;
            }
            this.loading = true;
            this.ui.beforeLoad(this);
            var loader = this.loader || this.attributes.loader || this.getOwnerTree().getLoader();
            if(loader){
                loader.load(this, this.loadComplete.createDelegate(this, [deep, anim, callback, scope]), this);
                return;
            }
        }
        Ext.tree.AsyncTreeNode.superclass.expand.call(this, deep, anim, callback, scope);
    },
    
    /**
     * Returns true if this node is currently loading
     * @return {Boolean}
     */
    isLoading : function(){
        return this.loading;  
    },
    
    loadComplete : function(deep, anim, callback, scope){
        this.loading = false;
        this.loaded = true;
        this.ui.afterLoad(this);
        this.fireEvent("load", this);
        this.expand(deep, anim, callback, scope);
    },
    
    /**
     * Returns true if this node has been loaded
     * @return {Boolean}
     */
    isLoaded : function(){
        return this.loaded;
    },
    
    hasChildNodes : function(){
        if(!this.isLeaf() && !this.loaded){
            return true;
        }else{
            return Ext.tree.AsyncTreeNode.superclass.hasChildNodes.call(this);
        }
    },

    /**
     * Trigger a reload for this node
     * @param {Function} callback
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the callback is executed. Defaults to this Node.
     */
    reload : function(callback, scope){
        this.collapse(false, false);
        while(this.firstChild){
            this.removeChild(this.firstChild).destroy();
        }
        this.childrenRendered = false;
        this.loaded = false;
        if(this.isHiddenRoot()){
            this.expanded = false;
        }
        this.expand(false, false, callback, scope);
    }
});

Ext.tree.TreePanel.nodeTypes.async = Ext.tree.AsyncTreeNode;