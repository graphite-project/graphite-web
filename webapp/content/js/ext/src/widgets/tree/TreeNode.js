/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.tree.TreeNode
 * @extends Ext.data.Node
 * @cfg {String} text The text for this node
 * @cfg {Boolean} expanded true to start the node expanded
 * @cfg {Boolean} allowDrag False to make this node undraggable if {@link #draggable} = true (defaults to true)
 * @cfg {Boolean} allowDrop False if this node cannot have child nodes dropped on it (defaults to true)
 * @cfg {Boolean} disabled true to start the node disabled
 * @cfg {String} icon The path to an icon for the node. The preferred way to do this
 * is to use the cls or iconCls attributes and add the icon via a CSS background image.
 * @cfg {String} cls A css class to be added to the node
 * @cfg {String} iconCls A css class to be added to the nodes icon element for applying css background images
 * @cfg {String} href URL of the link used for the node (defaults to #)
 * @cfg {String} hrefTarget target frame for the link
 * @cfg {Boolean} hidden True to render hidden. (Defaults to false).
 * @cfg {String} qtip An Ext QuickTip for the node
 * @cfg {Boolean} expandable If set to true, the node will always show a plus/minus icon, even when empty
 * @cfg {String} qtipCfg An Ext QuickTip config for the node (used instead of qtip)
 * @cfg {Boolean} singleClickExpand True for single click expand on this node
 * @cfg {Function} uiProvider A UI <b>class</b> to use for this node (defaults to Ext.tree.TreeNodeUI)
 * @cfg {Boolean} checked True to render a checked checkbox for this node, false to render an unchecked checkbox
 * (defaults to undefined with no checkbox rendered)
 * @cfg {Boolean} draggable True to make this node draggable (defaults to false)
 * @cfg {Boolean} isTarget False to not allow this node to act as a drop target (defaults to true)
 * @cfg {Boolean} allowChildren False to not allow this node to have child nodes (defaults to true)
 * @cfg {Boolean} editable False to not allow this node to be edited by an {@link Ext.tree.TreeEditor} (defaults to true)
 * @constructor
 * @param {Object/String} attributes The attributes/config for the node or just a string with the text for the node
 */
Ext.tree.TreeNode = Ext.extend(Ext.data.Node, {
    
    constructor : function(attributes){
        attributes = attributes || {};
        if(Ext.isString(attributes)){
            attributes = {text: attributes};
        }
        this.childrenRendered = false;
        this.rendered = false;
        Ext.tree.TreeNode.superclass.constructor.call(this, attributes);
        this.expanded = attributes.expanded === true;
        this.isTarget = attributes.isTarget !== false;
        this.draggable = attributes.draggable !== false && attributes.allowDrag !== false;
        this.allowChildren = attributes.allowChildren !== false && attributes.allowDrop !== false;

        /**
         * Read-only. The text for this node. To change it use <code>{@link #setText}</code>.
         * @type String
         */
        this.text = attributes.text;
        /**
         * True if this node is disabled.
         * @type Boolean
         */
        this.disabled = attributes.disabled === true;
        /**
         * True if this node is hidden.
         * @type Boolean
         */
        this.hidden = attributes.hidden === true;
    
        this.addEvents(
            /**
            * @event textchange
            * Fires when the text for this node is changed
            * @param {Node} this This node
            * @param {String} text The new text
            * @param {String} oldText The old text
            */
            'textchange',
            /**
            * @event beforeexpand
            * Fires before this node is expanded, return false to cancel.
            * @param {Node} this This node
            * @param {Boolean} deep
            * @param {Boolean} anim
            */
            'beforeexpand',
            /**
            * @event beforecollapse
            * Fires before this node is collapsed, return false to cancel.
            * @param {Node} this This node
            * @param {Boolean} deep
            * @param {Boolean} anim
            */
            'beforecollapse',
            /**
            * @event expand
            * Fires when this node is expanded
            * @param {Node} this This node
            */
            'expand',
            /**
            * @event disabledchange
            * Fires when the disabled status of this node changes
            * @param {Node} this This node
            * @param {Boolean} disabled
            */
            'disabledchange',
            /**
            * @event collapse
            * Fires when this node is collapsed
            * @param {Node} this This node
            */
            'collapse',
            /**
            * @event beforeclick
            * Fires before click processing. Return false to cancel the default action.
            * @param {Node} this This node
            * @param {Ext.EventObject} e The event object
            */
            'beforeclick',
            /**
            * @event click
            * Fires when this node is clicked
            * @param {Node} this This node
            * @param {Ext.EventObject} e The event object
            */
            'click',
            /**
            * @event checkchange
            * Fires when a node with a checkbox's checked property changes
            * @param {Node} this This node
            * @param {Boolean} checked
            */
            'checkchange',
            /**
            * @event beforedblclick
            * Fires before double click processing. Return false to cancel the default action.
            * @param {Node} this This node
            * @param {Ext.EventObject} e The event object
            */
            'beforedblclick',
            /**
            * @event dblclick
            * Fires when this node is double clicked
            * @param {Node} this This node
            * @param {Ext.EventObject} e The event object
            */
            'dblclick',
            /**
            * @event contextmenu
            * Fires when this node is right clicked
            * @param {Node} this This node
            * @param {Ext.EventObject} e The event object
            */
            'contextmenu',
            /**
            * @event beforechildrenrendered
            * Fires right before the child nodes for this node are rendered
            * @param {Node} this This node
            */
            'beforechildrenrendered'
        );
    
        var uiClass = this.attributes.uiProvider || this.defaultUI || Ext.tree.TreeNodeUI;
    
        /**
         * Read-only. The UI for this node
         * @type TreeNodeUI
         */
        this.ui = new uiClass(this);    
    },
    
    preventHScroll : true,
    /**
     * Returns true if this node is expanded
     * @return {Boolean}
     */
    isExpanded : function(){
        return this.expanded;
    },

/**
 * Returns the UI object for this node.
 * @return {TreeNodeUI} The object which is providing the user interface for this tree
 * node. Unless otherwise specified in the {@link #uiProvider}, this will be an instance
 * of {@link Ext.tree.TreeNodeUI}
 */
    getUI : function(){
        return this.ui;
    },

    getLoader : function(){
        var owner;
        return this.loader || ((owner = this.getOwnerTree()) && owner.loader ? owner.loader : (this.loader = new Ext.tree.TreeLoader()));
    },

    // private override
    setFirstChild : function(node){
        var of = this.firstChild;
        Ext.tree.TreeNode.superclass.setFirstChild.call(this, node);
        if(this.childrenRendered && of && node != of){
            of.renderIndent(true, true);
        }
        if(this.rendered){
            this.renderIndent(true, true);
        }
    },

    // private override
    setLastChild : function(node){
        var ol = this.lastChild;
        Ext.tree.TreeNode.superclass.setLastChild.call(this, node);
        if(this.childrenRendered && ol && node != ol){
            ol.renderIndent(true, true);
        }
        if(this.rendered){
            this.renderIndent(true, true);
        }
    },

    // these methods are overridden to provide lazy rendering support
    // private override
    appendChild : function(n){
        if(!n.render && !Ext.isArray(n)){
            n = this.getLoader().createNode(n);
        }
        var node = Ext.tree.TreeNode.superclass.appendChild.call(this, n);
        if(node && this.childrenRendered){
            node.render();
        }
        this.ui.updateExpandIcon();
        return node;
    },

    // private override
    removeChild : function(node, destroy){
        this.ownerTree.getSelectionModel().unselect(node);
        Ext.tree.TreeNode.superclass.removeChild.apply(this, arguments);
        // only update the ui if we're not destroying
        if(!destroy){
            var rendered = node.ui.rendered;
            // if it's been rendered remove dom node
            if(rendered){
                node.ui.remove();
            }
            if(rendered && this.childNodes.length < 1){
                this.collapse(false, false);
            }else{
                this.ui.updateExpandIcon();
            }
            if(!this.firstChild && !this.isHiddenRoot()){
                this.childrenRendered = false;
            }
        }
        return node;
    },

    // private override
    insertBefore : function(node, refNode){
        if(!node.render){
            node = this.getLoader().createNode(node);
        }
        var newNode = Ext.tree.TreeNode.superclass.insertBefore.call(this, node, refNode);
        if(newNode && refNode && this.childrenRendered){
            node.render();
        }
        this.ui.updateExpandIcon();
        return newNode;
    },

    /**
     * Sets the text for this node
     * @param {String} text
     */
    setText : function(text){
        var oldText = this.text;
        this.text = this.attributes.text = text;
        if(this.rendered){ // event without subscribing
            this.ui.onTextChange(this, text, oldText);
        }
        this.fireEvent('textchange', this, text, oldText);
    },
    
    /**
     * Sets the icon class for this node.
     * @param {String} cls
     */
    setIconCls : function(cls){
        var old = this.attributes.iconCls;
        this.attributes.iconCls = cls;
        if(this.rendered){
            this.ui.onIconClsChange(this, cls, old);
        }
    },
    
    /**
     * Sets the tooltip for this node.
     * @param {String} tip The text for the tip
     * @param {String} title (Optional) The title for the tip
     */
    setTooltip : function(tip, title){
        this.attributes.qtip = tip;
        this.attributes.qtipTitle = title;
        if(this.rendered){
            this.ui.onTipChange(this, tip, title);
        }
    },
    
    /**
     * Sets the icon for this node.
     * @param {String} icon
     */
    setIcon : function(icon){
        this.attributes.icon = icon;
        if(this.rendered){
            this.ui.onIconChange(this, icon);
        }
    },
    
    /**
     * Sets the href for the node.
     * @param {String} href The href to set
     * @param {String} (Optional) target The target of the href
     */
    setHref : function(href, target){
        this.attributes.href = href;
        this.attributes.hrefTarget = target;
        if(this.rendered){
            this.ui.onHrefChange(this, href, target);
        }
    },
    
    /**
     * Sets the class on this node.
     * @param {String} cls
     */
    setCls : function(cls){
        var old = this.attributes.cls;
        this.attributes.cls = cls;
        if(this.rendered){
            this.ui.onClsChange(this, cls, old);
        }
    },

    /**
     * Triggers selection of this node
     */
    select : function(){
        var t = this.getOwnerTree();
        if(t){
            t.getSelectionModel().select(this);
        }
    },

    /**
     * Triggers deselection of this node
     * @param {Boolean} silent (optional) True to stop selection change events from firing.
     */
    unselect : function(silent){
        var t = this.getOwnerTree();
        if(t){
            t.getSelectionModel().unselect(this, silent);
        }
    },

    /**
     * Returns true if this node is selected
     * @return {Boolean}
     */
    isSelected : function(){
        var t = this.getOwnerTree();
        return t ? t.getSelectionModel().isSelected(this) : false;
    },

    /**
     * Expand this node.
     * @param {Boolean} deep (optional) True to expand all children as well
     * @param {Boolean} anim (optional) false to cancel the default animation
     * @param {Function} callback (optional) A callback to be called when
     * expanding this node completes (does not wait for deep expand to complete).
     * Called with 1 parameter, this node.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the callback is executed. Defaults to this TreeNode.
     */
    expand : function(deep, anim, callback, scope){
        if(!this.expanded){
            if(this.fireEvent('beforeexpand', this, deep, anim) === false){
                return;
            }
            if(!this.childrenRendered){
                this.renderChildren();
            }
            this.expanded = true;
            if(!this.isHiddenRoot() && (this.getOwnerTree().animate && anim !== false) || anim){
                this.ui.animExpand(function(){
                    this.fireEvent('expand', this);
                    this.runCallback(callback, scope || this, [this]);
                    if(deep === true){
                        this.expandChildNodes(true, true);
                    }
                }.createDelegate(this));
                return;
            }else{
                this.ui.expand();
                this.fireEvent('expand', this);
                this.runCallback(callback, scope || this, [this]);
            }
        }else{
           this.runCallback(callback, scope || this, [this]);
        }
        if(deep === true){
            this.expandChildNodes(true);
        }
    },

    runCallback : function(cb, scope, args){
        if(Ext.isFunction(cb)){
            cb.apply(scope, args);
        }
    },

    isHiddenRoot : function(){
        return this.isRoot && !this.getOwnerTree().rootVisible;
    },

    /**
     * Collapse this node.
     * @param {Boolean} deep (optional) True to collapse all children as well
     * @param {Boolean} anim (optional) false to cancel the default animation
     * @param {Function} callback (optional) A callback to be called when
     * expanding this node completes (does not wait for deep expand to complete).
     * Called with 1 parameter, this node.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the callback is executed. Defaults to this TreeNode.
     */
    collapse : function(deep, anim, callback, scope){
        if(this.expanded && !this.isHiddenRoot()){
            if(this.fireEvent('beforecollapse', this, deep, anim) === false){
                return;
            }
            this.expanded = false;
            if((this.getOwnerTree().animate && anim !== false) || anim){
                this.ui.animCollapse(function(){
                    this.fireEvent('collapse', this);
                    this.runCallback(callback, scope || this, [this]);
                    if(deep === true){
                        this.collapseChildNodes(true);
                    }
                }.createDelegate(this));
                return;
            }else{
                this.ui.collapse();
                this.fireEvent('collapse', this);
                this.runCallback(callback, scope || this, [this]);
            }
        }else if(!this.expanded){
            this.runCallback(callback, scope || this, [this]);
        }
        if(deep === true){
            var cs = this.childNodes;
            for(var i = 0, len = cs.length; i < len; i++) {
            	cs[i].collapse(true, false);
            }
        }
    },

    // private
    delayedExpand : function(delay){
        if(!this.expandProcId){
            this.expandProcId = this.expand.defer(delay, this);
        }
    },

    // private
    cancelExpand : function(){
        if(this.expandProcId){
            clearTimeout(this.expandProcId);
        }
        this.expandProcId = false;
    },

    /**
     * Toggles expanded/collapsed state of the node
     */
    toggle : function(){
        if(this.expanded){
            this.collapse();
        }else{
            this.expand();
        }
    },

    /**
     * Ensures all parent nodes are expanded, and if necessary, scrolls
     * the node into view.
     * @param {Function} callback (optional) A function to call when the node has been made visible.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the callback is executed. Defaults to this TreeNode.
     */
    ensureVisible : function(callback, scope){
        var tree = this.getOwnerTree();
        tree.expandPath(this.parentNode ? this.parentNode.getPath() : this.getPath(), false, function(){
            var node = tree.getNodeById(this.id);  // Somehow if we don't do this, we lose changes that happened to node in the meantime
            tree.getTreeEl().scrollChildIntoView(node.ui.anchor);
            this.runCallback(callback, scope || this, [this]);
        }.createDelegate(this));
    },

    /**
     * Expand all child nodes
     * @param {Boolean} deep (optional) true if the child nodes should also expand their child nodes
     */
    expandChildNodes : function(deep, anim) {
        var cs = this.childNodes,
            i,
            len = cs.length;
        for (i = 0; i < len; i++) {
        	cs[i].expand(deep, anim);
        }
    },

    /**
     * Collapse all child nodes
     * @param {Boolean} deep (optional) true if the child nodes should also collapse their child nodes
     */
    collapseChildNodes : function(deep){
        var cs = this.childNodes;
        for(var i = 0, len = cs.length; i < len; i++) {
        	cs[i].collapse(deep);
        }
    },

    /**
     * Disables this node
     */
    disable : function(){
        this.disabled = true;
        this.unselect();
        if(this.rendered && this.ui.onDisableChange){ // event without subscribing
            this.ui.onDisableChange(this, true);
        }
        this.fireEvent('disabledchange', this, true);
    },

    /**
     * Enables this node
     */
    enable : function(){
        this.disabled = false;
        if(this.rendered && this.ui.onDisableChange){ // event without subscribing
            this.ui.onDisableChange(this, false);
        }
        this.fireEvent('disabledchange', this, false);
    },

    // private
    renderChildren : function(suppressEvent){
        if(suppressEvent !== false){
            this.fireEvent('beforechildrenrendered', this);
        }
        var cs = this.childNodes;
        for(var i = 0, len = cs.length; i < len; i++){
            cs[i].render(true);
        }
        this.childrenRendered = true;
    },

    // private
    sort : function(fn, scope){
        Ext.tree.TreeNode.superclass.sort.apply(this, arguments);
        if(this.childrenRendered){
            var cs = this.childNodes;
            for(var i = 0, len = cs.length; i < len; i++){
                cs[i].render(true);
            }
        }
    },

    // private
    render : function(bulkRender){
        this.ui.render(bulkRender);
        if(!this.rendered){
            // make sure it is registered
            this.getOwnerTree().registerNode(this);
            this.rendered = true;
            if(this.expanded){
                this.expanded = false;
                this.expand(false, false);
            }
        }
    },

    // private
    renderIndent : function(deep, refresh){
        if(refresh){
            this.ui.childIndent = null;
        }
        this.ui.renderIndent();
        if(deep === true && this.childrenRendered){
            var cs = this.childNodes;
            for(var i = 0, len = cs.length; i < len; i++){
                cs[i].renderIndent(true, refresh);
            }
        }
    },

    beginUpdate : function(){
        this.childrenRendered = false;
    },

    endUpdate : function(){
        if(this.expanded && this.rendered){
            this.renderChildren();
        }
    },

    //inherit docs
    destroy : function(silent){
        if(silent === true){
            this.unselect(true);
        }
        Ext.tree.TreeNode.superclass.destroy.call(this, silent);
        Ext.destroy(this.ui, this.loader);
        this.ui = this.loader = null;
    },

    // private
    onIdChange : function(id){
        this.ui.onIdChange(id);
    }
});

Ext.tree.TreePanel.nodeTypes.node = Ext.tree.TreeNode;