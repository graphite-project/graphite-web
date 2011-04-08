/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.tree.TreePanel
 * @extends Ext.Panel
 * <p>The TreePanel provides tree-structured UI representation of tree-structured data.</p>
 * <p>{@link Ext.tree.TreeNode TreeNode}s added to the TreePanel may each contain metadata
 * used by your application in their {@link Ext.tree.TreeNode#attributes attributes} property.</p>
 * <p><b>A TreePanel must have a {@link #root} node before it is rendered.</b> This may either be
 * specified using the {@link #root} config option, or using the {@link #setRootNode} method.
 * <p>An example of tree rendered to an existing div:</p><pre><code>
var tree = new Ext.tree.TreePanel({
    renderTo: 'tree-div',
    useArrows: true,
    autoScroll: true,
    animate: true,
    enableDD: true,
    containerScroll: true,
    border: false,
    // auto create TreeLoader
    dataUrl: 'get-nodes.php',

    root: {
        nodeType: 'async',
        text: 'Ext JS',
        draggable: false,
        id: 'source'
    }
});

tree.getRootNode().expand();
 * </code></pre>
 * <p>The example above would work with a data packet similar to this:</p><pre><code>
[{
    "text": "adapter",
    "id": "source\/adapter",
    "cls": "folder"
}, {
    "text": "dd",
    "id": "source\/dd",
    "cls": "folder"
}, {
    "text": "debug.js",
    "id": "source\/debug.js",
    "leaf": true,
    "cls": "file"
}]
 * </code></pre>
 * <p>An example of tree within a Viewport:</p><pre><code>
new Ext.Viewport({
    layout: 'border',
    items: [{
        region: 'west',
        collapsible: true,
        title: 'Navigation',
        xtype: 'treepanel',
        width: 200,
        autoScroll: true,
        split: true,
        loader: new Ext.tree.TreeLoader(),
        root: new Ext.tree.AsyncTreeNode({
            expanded: true,
            children: [{
                text: 'Menu Option 1',
                leaf: true
            }, {
                text: 'Menu Option 2',
                leaf: true
            }, {
                text: 'Menu Option 3',
                leaf: true
            }]
        }),
        rootVisible: false,
        listeners: {
            click: function(n) {
                Ext.Msg.alert('Navigation Tree Click', 'You clicked: "' + n.attributes.text + '"');
            }
        }
    }, {
        region: 'center',
        xtype: 'tabpanel',
        // remaining code not shown ...
    }]
});
</code></pre>
 *
 * @cfg {Ext.tree.TreeNode} root The root node for the tree.
 * @cfg {Boolean} rootVisible <tt>false</tt> to hide the root node (defaults to <tt>true</tt>)
 * @cfg {Boolean} lines <tt>false</tt> to disable tree lines (defaults to <tt>true</tt>)
 * @cfg {Boolean} enableDD <tt>true</tt> to enable drag and drop
 * @cfg {Boolean} enableDrag <tt>true</tt> to enable just drag
 * @cfg {Boolean} enableDrop <tt>true</tt> to enable just drop
 * @cfg {Object} dragConfig Custom config to pass to the {@link Ext.tree.TreeDragZone} instance
 * @cfg {Object} dropConfig Custom config to pass to the {@link Ext.tree.TreeDropZone} instance
 * @cfg {String} ddGroup The DD group this TreePanel belongs to
 * @cfg {Boolean} ddAppendOnly <tt>true</tt> if the tree should only allow append drops (use for trees which are sorted)
 * @cfg {Boolean} ddScroll <tt>true</tt> to enable body scrolling
 * @cfg {Boolean} containerScroll <tt>true</tt> to register this container with ScrollManager
 * @cfg {Boolean} hlDrop <tt>false</tt> to disable node highlight on drop (defaults to the value of {@link Ext#enableFx})
 * @cfg {String} hlColor The color of the node highlight (defaults to <tt>'C3DAF9'</tt>)
 * @cfg {Boolean} animate <tt>true</tt> to enable animated expand/collapse (defaults to the value of {@link Ext#enableFx})
 * @cfg {Boolean} singleExpand <tt>true</tt> if only 1 node per branch may be expanded
 * @cfg {Object} selModel A tree selection model to use with this TreePanel (defaults to an {@link Ext.tree.DefaultSelectionModel})
 * @cfg {Boolean} trackMouseOver <tt>false</tt> to disable mouse over highlighting
 * @cfg {Ext.tree.TreeLoader} loader A {@link Ext.tree.TreeLoader} for use with this TreePanel
 * @cfg {String} pathSeparator The token used to separate sub-paths in path strings (defaults to <tt>'/'</tt>)
 * @cfg {Boolean} useArrows <tt>true</tt> to use Vista-style arrows in the tree (defaults to <tt>false</tt>)
 * @cfg {String} requestMethod The HTTP request method for loading data (defaults to the value of {@link Ext.Ajax#method}).
 *
 * @constructor
 * @param {Object} config
 * @xtype treepanel
 */
Ext.tree.TreePanel = Ext.extend(Ext.Panel, {
    rootVisible : true,
    animate : Ext.enableFx,
    lines : true,
    enableDD : false,
    hlDrop : Ext.enableFx,
    pathSeparator : '/',

    /**
     * @cfg {Array} bubbleEvents
     * <p>An array of events that, when fired, should be bubbled to any parent container.
     * See {@link Ext.util.Observable#enableBubble}.
     * Defaults to <tt>[]</tt>.
     */
    bubbleEvents : [],

    initComponent : function(){
        Ext.tree.TreePanel.superclass.initComponent.call(this);

        if(!this.eventModel){
            this.eventModel = new Ext.tree.TreeEventModel(this);
        }

        // initialize the loader
        var l = this.loader;
        if(!l){
            l = new Ext.tree.TreeLoader({
                dataUrl: this.dataUrl,
                requestMethod: this.requestMethod
            });
        }else if(Ext.isObject(l) && !l.load){
            l = new Ext.tree.TreeLoader(l);
        }
        this.loader = l;

        this.nodeHash = {};

        /**
        * The root node of this tree.
        * @type Ext.tree.TreeNode
        * @property root
        */
        if(this.root){
            var r = this.root;
            delete this.root;
            this.setRootNode(r);
        }


        this.addEvents(

            /**
            * @event append
            * Fires when a new child node is appended to a node in this tree.
            * @param {Tree} tree The owner tree
            * @param {Node} parent The parent node
            * @param {Node} node The newly appended node
            * @param {Number} index The index of the newly appended node
            */
           'append',
           /**
            * @event remove
            * Fires when a child node is removed from a node in this tree.
            * @param {Tree} tree The owner tree
            * @param {Node} parent The parent node
            * @param {Node} node The child node removed
            */
           'remove',
           /**
            * @event movenode
            * Fires when a node is moved to a new location in the tree
            * @param {Tree} tree The owner tree
            * @param {Node} node The node moved
            * @param {Node} oldParent The old parent of this node
            * @param {Node} newParent The new parent of this node
            * @param {Number} index The index it was moved to
            */
           'movenode',
           /**
            * @event insert
            * Fires when a new child node is inserted in a node in this tree.
            * @param {Tree} tree The owner tree
            * @param {Node} parent The parent node
            * @param {Node} node The child node inserted
            * @param {Node} refNode The child node the node was inserted before
            */
           'insert',
           /**
            * @event beforeappend
            * Fires before a new child is appended to a node in this tree, return false to cancel the append.
            * @param {Tree} tree The owner tree
            * @param {Node} parent The parent node
            * @param {Node} node The child node to be appended
            */
           'beforeappend',
           /**
            * @event beforeremove
            * Fires before a child is removed from a node in this tree, return false to cancel the remove.
            * @param {Tree} tree The owner tree
            * @param {Node} parent The parent node
            * @param {Node} node The child node to be removed
            */
           'beforeremove',
           /**
            * @event beforemovenode
            * Fires before a node is moved to a new location in the tree. Return false to cancel the move.
            * @param {Tree} tree The owner tree
            * @param {Node} node The node being moved
            * @param {Node} oldParent The parent of the node
            * @param {Node} newParent The new parent the node is moving to
            * @param {Number} index The index it is being moved to
            */
           'beforemovenode',
           /**
            * @event beforeinsert
            * Fires before a new child is inserted in a node in this tree, return false to cancel the insert.
            * @param {Tree} tree The owner tree
            * @param {Node} parent The parent node
            * @param {Node} node The child node to be inserted
            * @param {Node} refNode The child node the node is being inserted before
            */
            'beforeinsert',

            /**
            * @event beforeload
            * Fires before a node is loaded, return false to cancel
            * @param {Node} node The node being loaded
            */
            'beforeload',
            /**
            * @event load
            * Fires when a node is loaded
            * @param {Node} node The node that was loaded
            */
            'load',
            /**
            * @event textchange
            * Fires when the text for a node is changed
            * @param {Node} node The node
            * @param {String} text The new text
            * @param {String} oldText The old text
            */
            'textchange',
            /**
            * @event beforeexpandnode
            * Fires before a node is expanded, return false to cancel.
            * @param {Node} node The node
            * @param {Boolean} deep
            * @param {Boolean} anim
            */
            'beforeexpandnode',
            /**
            * @event beforecollapsenode
            * Fires before a node is collapsed, return false to cancel.
            * @param {Node} node The node
            * @param {Boolean} deep
            * @param {Boolean} anim
            */
            'beforecollapsenode',
            /**
            * @event expandnode
            * Fires when a node is expanded
            * @param {Node} node The node
            */
            'expandnode',
            /**
            * @event disabledchange
            * Fires when the disabled status of a node changes
            * @param {Node} node The node
            * @param {Boolean} disabled
            */
            'disabledchange',
            /**
            * @event collapsenode
            * Fires when a node is collapsed
            * @param {Node} node The node
            */
            'collapsenode',
            /**
            * @event beforeclick
            * Fires before click processing on a node. Return false to cancel the default action.
            * @param {Node} node The node
            * @param {Ext.EventObject} e The event object
            */
            'beforeclick',
            /**
            * @event click
            * Fires when a node is clicked
            * @param {Node} node The node
            * @param {Ext.EventObject} e The event object
            */
            'click',
            /**
            * @event containerclick
            * Fires when the tree container is clicked
            * @param {Tree} this
            * @param {Ext.EventObject} e The event object
            */
            'containerclick',
            /**
            * @event checkchange
            * Fires when a node with a checkbox's checked property changes
            * @param {Node} this This node
            * @param {Boolean} checked
            */
            'checkchange',
            /**
            * @event beforedblclick
            * Fires before double click processing on a node. Return false to cancel the default action.
            * @param {Node} node The node
            * @param {Ext.EventObject} e The event object
            */
            'beforedblclick',
            /**
            * @event dblclick
            * Fires when a node is double clicked
            * @param {Node} node The node
            * @param {Ext.EventObject} e The event object
            */
            'dblclick',
            /**
            * @event containerdblclick
            * Fires when the tree container is double clicked
            * @param {Tree} this
            * @param {Ext.EventObject} e The event object
            */
            'containerdblclick',
            /**
            * @event contextmenu
            * Fires when a node is right clicked. To display a context menu in response to this
            * event, first create a Menu object (see {@link Ext.menu.Menu} for details), then add
            * a handler for this event:<pre><code>
new Ext.tree.TreePanel({
    title: 'My TreePanel',
    root: new Ext.tree.AsyncTreeNode({
        text: 'The Root',
        children: [
            { text: 'Child node 1', leaf: true },
            { text: 'Child node 2', leaf: true }
        ]
    }),
    contextMenu: new Ext.menu.Menu({
        items: [{
            id: 'delete-node',
            text: 'Delete Node'
        }],
        listeners: {
            itemclick: function(item) {
                switch (item.id) {
                    case 'delete-node':
                        var n = item.parentMenu.contextNode;
                        if (n.parentNode) {
                            n.remove();
                        }
                        break;
                }
            }
        }
    }),
    listeners: {
        contextmenu: function(node, e) {
//          Register the context node with the menu so that a Menu Item's handler function can access
//          it via its {@link Ext.menu.BaseItem#parentMenu parentMenu} property.
            node.select();
            var c = node.getOwnerTree().contextMenu;
            c.contextNode = node;
            c.showAt(e.getXY());
        }
    }
});
</code></pre>
            * @param {Node} node The node
            * @param {Ext.EventObject} e The event object
            */
            'contextmenu',
            /**
            * @event containercontextmenu
            * Fires when the tree container is right clicked
            * @param {Tree} this
            * @param {Ext.EventObject} e The event object
            */
            'containercontextmenu',
            /**
            * @event beforechildrenrendered
            * Fires right before the child nodes for a node are rendered
            * @param {Node} node The node
            */
            'beforechildrenrendered',
           /**
             * @event startdrag
             * Fires when a node starts being dragged
             * @param {Ext.tree.TreePanel} this
             * @param {Ext.tree.TreeNode} node
             * @param {event} e The raw browser event
             */
            'startdrag',
            /**
             * @event enddrag
             * Fires when a drag operation is complete
             * @param {Ext.tree.TreePanel} this
             * @param {Ext.tree.TreeNode} node
             * @param {event} e The raw browser event
             */
            'enddrag',
            /**
             * @event dragdrop
             * Fires when a dragged node is dropped on a valid DD target
             * @param {Ext.tree.TreePanel} this
             * @param {Ext.tree.TreeNode} node
             * @param {DD} dd The dd it was dropped on
             * @param {event} e The raw browser event
             */
            'dragdrop',
            /**
             * @event beforenodedrop
             * Fires when a DD object is dropped on a node in this tree for preprocessing. Return false to cancel the drop. The dropEvent
             * passed to handlers has the following properties:<br />
             * <ul style="padding:5px;padding-left:16px;">
             * <li>tree - The TreePanel</li>
             * <li>target - The node being targeted for the drop</li>
             * <li>data - The drag data from the drag source</li>
             * <li>point - The point of the drop - append, above or below</li>
             * <li>source - The drag source</li>
             * <li>rawEvent - Raw mouse event</li>
             * <li>dropNode - Drop node(s) provided by the source <b>OR</b> you can supply node(s)
             * to be inserted by setting them on this object.</li>
             * <li>cancel - Set this to true to cancel the drop.</li>
             * <li>dropStatus - If the default drop action is cancelled but the drop is valid, setting this to true
             * will prevent the animated 'repair' from appearing.</li>
             * </ul>
             * @param {Object} dropEvent
             */
            'beforenodedrop',
            /**
             * @event nodedrop
             * Fires after a DD object is dropped on a node in this tree. The dropEvent
             * passed to handlers has the following properties:<br />
             * <ul style="padding:5px;padding-left:16px;">
             * <li>tree - The TreePanel</li>
             * <li>target - The node being targeted for the drop</li>
             * <li>data - The drag data from the drag source</li>
             * <li>point - The point of the drop - append, above or below</li>
             * <li>source - The drag source</li>
             * <li>rawEvent - Raw mouse event</li>
             * <li>dropNode - Dropped node(s).</li>
             * </ul>
             * @param {Object} dropEvent
             */
            'nodedrop',
             /**
             * @event nodedragover
             * Fires when a tree node is being targeted for a drag drop, return false to signal drop not allowed. The dragOverEvent
             * passed to handlers has the following properties:<br />
             * <ul style="padding:5px;padding-left:16px;">
             * <li>tree - The TreePanel</li>
             * <li>target - The node being targeted for the drop</li>
             * <li>data - The drag data from the drag source</li>
             * <li>point - The point of the drop - append, above or below</li>
             * <li>source - The drag source</li>
             * <li>rawEvent - Raw mouse event</li>
             * <li>dropNode - Drop node(s) provided by the source.</li>
             * <li>cancel - Set this to true to signal drop not allowed.</li>
             * </ul>
             * @param {Object} dragOverEvent
             */
            'nodedragover'
        );
        if(this.singleExpand){
            this.on('beforeexpandnode', this.restrictExpand, this);
        }
    },

    // private
    proxyNodeEvent : function(ename, a1, a2, a3, a4, a5, a6){
        if(ename == 'collapse' || ename == 'expand' || ename == 'beforecollapse' || ename == 'beforeexpand' || ename == 'move' || ename == 'beforemove'){
            ename = ename+'node';
        }
        // args inline for performance while bubbling events
        return this.fireEvent(ename, a1, a2, a3, a4, a5, a6);
    },


    /**
     * Returns this root node for this tree
     * @return {Node}
     */
    getRootNode : function(){
        return this.root;
    },

    /**
     * Sets the root node for this tree. If the TreePanel has already rendered a root node, the
     * previous root node (and all of its descendants) are destroyed before the new root node is rendered.
     * @param {Node} node
     * @return {Node}
     */
    setRootNode : function(node){
        this.destroyRoot();
        if(!node.render){ // attributes passed
            node = this.loader.createNode(node);
        }
        this.root = node;
        node.ownerTree = this;
        node.isRoot = true;
        this.registerNode(node);
        if(!this.rootVisible){
            var uiP = node.attributes.uiProvider;
            node.ui = uiP ? new uiP(node) : new Ext.tree.RootTreeNodeUI(node);
        }
        if(this.innerCt){
            this.clearInnerCt();
            this.renderRoot();
        }
        return node;
    },
    
    clearInnerCt : function(){
        this.innerCt.update('');    
    },
    
    // private
    renderRoot : function(){
        this.root.render();
        if(!this.rootVisible){
            this.root.renderChildren();
        }
    },

    /**
     * Gets a node in this tree by its id
     * @param {String} id
     * @return {Node}
     */
    getNodeById : function(id){
        return this.nodeHash[id];
    },

    // private
    registerNode : function(node){
        this.nodeHash[node.id] = node;
    },

    // private
    unregisterNode : function(node){
        delete this.nodeHash[node.id];
    },

    // private
    toString : function(){
        return '[Tree'+(this.id?' '+this.id:'')+']';
    },

    // private
    restrictExpand : function(node){
        var p = node.parentNode;
        if(p){
            if(p.expandedChild && p.expandedChild.parentNode == p){
                p.expandedChild.collapse();
            }
            p.expandedChild = node;
        }
    },

    /**
     * Retrieve an array of checked nodes, or an array of a specific attribute of checked nodes (e.g. 'id')
     * @param {String} attribute (optional) Defaults to null (return the actual nodes)
     * @param {TreeNode} startNode (optional) The node to start from, defaults to the root
     * @return {Array}
     */
    getChecked : function(a, startNode){
        startNode = startNode || this.root;
        var r = [];
        var f = function(){
            if(this.attributes.checked){
                r.push(!a ? this : (a == 'id' ? this.id : this.attributes[a]));
            }
        };
        startNode.cascade(f);
        return r;
    },

    /**
     * Returns the default {@link Ext.tree.TreeLoader} for this TreePanel.
     * @return {Ext.tree.TreeLoader} The TreeLoader for this TreePanel.
     */
    getLoader : function(){
        return this.loader;
    },

    /**
     * Expand all nodes
     */
    expandAll : function(){
        this.root.expand(true);
    },

    /**
     * Collapse all nodes
     */
    collapseAll : function(){
        this.root.collapse(true);
    },

    /**
     * Returns the selection model used by this TreePanel.
     * @return {TreeSelectionModel} The selection model used by this TreePanel
     */
    getSelectionModel : function(){
        if(!this.selModel){
            this.selModel = new Ext.tree.DefaultSelectionModel();
        }
        return this.selModel;
    },

    /**
     * Expands a specified path in this TreePanel. A path can be retrieved from a node with {@link Ext.data.Node#getPath}
     * @param {String} path
     * @param {String} attr (optional) The attribute used in the path (see {@link Ext.data.Node#getPath} for more info)
     * @param {Function} callback (optional) The callback to call when the expand is complete. The callback will be called with
     * (bSuccess, oLastNode) where bSuccess is if the expand was successful and oLastNode is the last node that was expanded.
     */
    expandPath : function(path, attr, callback){
        if(Ext.isEmpty(path)){
            if(callback){
                callback(false, undefined);
            }
            return;
        }
        attr = attr || 'id';
        var keys = path.split(this.pathSeparator);
        var curNode = this.root;
        if(curNode.attributes[attr] != keys[1]){ // invalid root
            if(callback){
                callback(false, null);
            }
            return;
        }
        var index = 1;
        var f = function(){
            if(++index == keys.length){
                if(callback){
                    callback(true, curNode);
                }
                return;
            }
            var c = curNode.findChild(attr, keys[index]);
            if(!c){
                if(callback){
                    callback(false, curNode);
                }
                return;
            }
            curNode = c;
            c.expand(false, false, f);
        };
        curNode.expand(false, false, f);
    },

    /**
     * Selects the node in this tree at the specified path. A path can be retrieved from a node with {@link Ext.data.Node#getPath}
     * @param {String} path
     * @param {String} attr (optional) The attribute used in the path (see {@link Ext.data.Node#getPath} for more info)
     * @param {Function} callback (optional) The callback to call when the selection is complete. The callback will be called with
     * (bSuccess, oSelNode) where bSuccess is if the selection was successful and oSelNode is the selected node.
     */
    selectPath : function(path, attr, callback){
        if(Ext.isEmpty(path)){
            if(callback){
                callback(false, undefined);
            }
            return;
        }
        attr = attr || 'id';
        var keys = path.split(this.pathSeparator),
            v = keys.pop();
        if(keys.length > 1){
            var f = function(success, node){
                if(success && node){
                    var n = node.findChild(attr, v);
                    if(n){
                        n.select();
                        if(callback){
                            callback(true, n);
                        }
                    }else if(callback){
                        callback(false, n);
                    }
                }else{
                    if(callback){
                        callback(false, n);
                    }
                }
            };
            this.expandPath(keys.join(this.pathSeparator), attr, f);
        }else{
            this.root.select();
            if(callback){
                callback(true, this.root);
            }
        }
    },

    /**
     * Returns the underlying Element for this tree
     * @return {Ext.Element} The Element
     */
    getTreeEl : function(){
        return this.body;
    },

    // private
    onRender : function(ct, position){
        Ext.tree.TreePanel.superclass.onRender.call(this, ct, position);
        this.el.addClass('x-tree');
        this.innerCt = this.body.createChild({tag:'ul',
               cls:'x-tree-root-ct ' +
               (this.useArrows ? 'x-tree-arrows' : this.lines ? 'x-tree-lines' : 'x-tree-no-lines')});
    },

    // private
    initEvents : function(){
        Ext.tree.TreePanel.superclass.initEvents.call(this);

        if(this.containerScroll){
            Ext.dd.ScrollManager.register(this.body);
        }
        if((this.enableDD || this.enableDrop) && !this.dropZone){
           /**
            * The dropZone used by this tree if drop is enabled (see {@link #enableDD} or {@link #enableDrop})
            * @property dropZone
            * @type Ext.tree.TreeDropZone
            */
             this.dropZone = new Ext.tree.TreeDropZone(this, this.dropConfig || {
               ddGroup: this.ddGroup || 'TreeDD', appendOnly: this.ddAppendOnly === true
           });
        }
        if((this.enableDD || this.enableDrag) && !this.dragZone){
           /**
            * The dragZone used by this tree if drag is enabled (see {@link #enableDD} or {@link #enableDrag})
            * @property dragZone
            * @type Ext.tree.TreeDragZone
            */
            this.dragZone = new Ext.tree.TreeDragZone(this, this.dragConfig || {
               ddGroup: this.ddGroup || 'TreeDD',
               scroll: this.ddScroll
           });
        }
        this.getSelectionModel().init(this);
    },

    // private
    afterRender : function(){
        Ext.tree.TreePanel.superclass.afterRender.call(this);
        this.renderRoot();
    },

    beforeDestroy : function(){
        if(this.rendered){
            Ext.dd.ScrollManager.unregister(this.body);
            Ext.destroy(this.dropZone, this.dragZone);
        }
        this.destroyRoot();
        Ext.destroy(this.loader);
        this.nodeHash = this.root = this.loader = null;
        Ext.tree.TreePanel.superclass.beforeDestroy.call(this);
    },
    
    /**
     * Destroy the root node. Not included by itself because we need to pass the silent parameter.
     * @private
     */
    destroyRoot : function(){
        if(this.root && this.root.destroy){
            this.root.destroy(true);
        }
    }

    /**
     * @cfg {String/Number} activeItem
     * @hide
     */
    /**
     * @cfg {Boolean} autoDestroy
     * @hide
     */
    /**
     * @cfg {Object/String/Function} autoLoad
     * @hide
     */
    /**
     * @cfg {Boolean} autoWidth
     * @hide
     */
    /**
     * @cfg {Boolean/Number} bufferResize
     * @hide
     */
    /**
     * @cfg {String} defaultType
     * @hide
     */
    /**
     * @cfg {Object} defaults
     * @hide
     */
    /**
     * @cfg {Boolean} hideBorders
     * @hide
     */
    /**
     * @cfg {Mixed} items
     * @hide
     */
    /**
     * @cfg {String} layout
     * @hide
     */
    /**
     * @cfg {Object} layoutConfig
     * @hide
     */
    /**
     * @cfg {Boolean} monitorResize
     * @hide
     */
    /**
     * @property items
     * @hide
     */
    /**
     * @method cascade
     * @hide
     */
    /**
     * @method doLayout
     * @hide
     */
    /**
     * @method find
     * @hide
     */
    /**
     * @method findBy
     * @hide
     */
    /**
     * @method findById
     * @hide
     */
    /**
     * @method findByType
     * @hide
     */
    /**
     * @method getComponent
     * @hide
     */
    /**
     * @method getLayout
     * @hide
     */
    /**
     * @method getUpdater
     * @hide
     */
    /**
     * @method insert
     * @hide
     */
    /**
     * @method load
     * @hide
     */
    /**
     * @method remove
     * @hide
     */
    /**
     * @event add
     * @hide
     */
    /**
     * @method removeAll
     * @hide
     */
    /**
     * @event afterLayout
     * @hide
     */
    /**
     * @event beforeadd
     * @hide
     */
    /**
     * @event beforeremove
     * @hide
     */
    /**
     * @event remove
     * @hide
     */



    /**
     * @cfg {String} allowDomMove  @hide
     */
    /**
     * @cfg {String} autoEl @hide
     */
    /**
     * @cfg {String} applyTo  @hide
     */
    /**
     * @cfg {String} contentEl  @hide
     */
    /**
     * @cfg {Mixed} data  @hide
     */
    /**
     * @cfg {Mixed} tpl  @hide
     */
    /**
     * @cfg {String} tplWriteMode  @hide
     */
    /**
     * @cfg {String} disabledClass  @hide
     */
    /**
     * @cfg {String} elements  @hide
     */
    /**
     * @cfg {String} html  @hide
     */
    /**
     * @cfg {Boolean} preventBodyReset
     * @hide
     */
    /**
     * @property disabled
     * @hide
     */
    /**
     * @method applyToMarkup
     * @hide
     */
    /**
     * @method enable
     * @hide
     */
    /**
     * @method disable
     * @hide
     */
    /**
     * @method setDisabled
     * @hide
     */
});

Ext.tree.TreePanel.nodeTypes = {};

Ext.reg('treepanel', Ext.tree.TreePanel);Ext.tree.TreeEventModel = function(tree){
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
};/**
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
});/**
 * @class Ext.data.Tree
 * @extends Ext.util.Observable
 * Represents a tree data structure and bubbles all the events for its nodes. The nodes
 * in the tree have most standard DOM functionality.
 * @constructor
 * @param {Node} root (optional) The root node
 */
Ext.data.Tree = Ext.extend(Ext.util.Observable, {
    
    constructor: function(root){
        this.nodeHash = {};
        /**
         * The root node for this tree
         * @type Node
         */
        this.root = null;
        if(root){
            this.setRootNode(root);
        }
        this.addEvents(
            /**
             * @event append
             * Fires when a new child node is appended to a node in this tree.
             * @param {Tree} tree The owner tree
             * @param {Node} parent The parent node
             * @param {Node} node The newly appended node
             * @param {Number} index The index of the newly appended node
             */
            "append",
            /**
             * @event remove
             * Fires when a child node is removed from a node in this tree.
             * @param {Tree} tree The owner tree
             * @param {Node} parent The parent node
             * @param {Node} node The child node removed
             */
            "remove",
            /**
             * @event move
             * Fires when a node is moved to a new location in the tree
             * @param {Tree} tree The owner tree
             * @param {Node} node The node moved
             * @param {Node} oldParent The old parent of this node
             * @param {Node} newParent The new parent of this node
             * @param {Number} index The index it was moved to
             */
            "move",
            /**
             * @event insert
             * Fires when a new child node is inserted in a node in this tree.
             * @param {Tree} tree The owner tree
             * @param {Node} parent The parent node
             * @param {Node} node The child node inserted
             * @param {Node} refNode The child node the node was inserted before
             */
            "insert",
            /**
             * @event beforeappend
             * Fires before a new child is appended to a node in this tree, return false to cancel the append.
             * @param {Tree} tree The owner tree
             * @param {Node} parent The parent node
             * @param {Node} node The child node to be appended
             */
            "beforeappend",
            /**
             * @event beforeremove
             * Fires before a child is removed from a node in this tree, return false to cancel the remove.
             * @param {Tree} tree The owner tree
             * @param {Node} parent The parent node
             * @param {Node} node The child node to be removed
             */
            "beforeremove",
            /**
             * @event beforemove
             * Fires before a node is moved to a new location in the tree. Return false to cancel the move.
             * @param {Tree} tree The owner tree
             * @param {Node} node The node being moved
             * @param {Node} oldParent The parent of the node
             * @param {Node} newParent The new parent the node is moving to
             * @param {Number} index The index it is being moved to
             */
            "beforemove",
            /**
             * @event beforeinsert
             * Fires before a new child is inserted in a node in this tree, return false to cancel the insert.
             * @param {Tree} tree The owner tree
             * @param {Node} parent The parent node
             * @param {Node} node The child node to be inserted
             * @param {Node} refNode The child node the node is being inserted before
             */
            "beforeinsert"
        );
        Ext.data.Tree.superclass.constructor.call(this);        
    },
    
    /**
     * @cfg {String} pathSeparator
     * The token used to separate paths in node ids (defaults to '/').
     */
    pathSeparator: "/",

    // private
    proxyNodeEvent : function(){
        return this.fireEvent.apply(this, arguments);
    },

    /**
     * Returns the root node for this tree.
     * @return {Node}
     */
    getRootNode : function(){
        return this.root;
    },

    /**
     * Sets the root node for this tree.
     * @param {Node} node
     * @return {Node}
     */
    setRootNode : function(node){
        this.root = node;
        node.ownerTree = this;
        node.isRoot = true;
        this.registerNode(node);
        return node;
    },

    /**
     * Gets a node in this tree by its id.
     * @param {String} id
     * @return {Node}
     */
    getNodeById : function(id){
        return this.nodeHash[id];
    },

    // private
    registerNode : function(node){
        this.nodeHash[node.id] = node;
    },

    // private
    unregisterNode : function(node){
        delete this.nodeHash[node.id];
    },

    toString : function(){
        return "[Tree"+(this.id?" "+this.id:"")+"]";
    }
});

/**
 * @class Ext.data.Node
 * @extends Ext.util.Observable
 * @cfg {Boolean} leaf true if this node is a leaf and does not have children
 * @cfg {String} id The id for this node. If one is not specified, one is generated.
 * @constructor
 * @param {Object} attributes The attributes/config for the node
 */
Ext.data.Node = Ext.extend(Ext.util.Observable, {
    
    constructor: function(attributes){
        /**
         * The attributes supplied for the node. You can use this property to access any custom attributes you supplied.
         * @type {Object}
         */
        this.attributes = attributes || {};
        this.leaf = this.attributes.leaf;
        /**
         * The node id. @type String
         */
        this.id = this.attributes.id;
        if(!this.id){
            this.id = Ext.id(null, "xnode-");
            this.attributes.id = this.id;
        }
        /**
         * All child nodes of this node. @type Array
         */
        this.childNodes = [];
        /**
         * The parent node for this node. @type Node
         */
        this.parentNode = null;
        /**
         * The first direct child node of this node, or null if this node has no child nodes. @type Node
         */
        this.firstChild = null;
        /**
         * The last direct child node of this node, or null if this node has no child nodes. @type Node
         */
        this.lastChild = null;
        /**
         * The node immediately preceding this node in the tree, or null if there is no sibling node. @type Node
         */
        this.previousSibling = null;
        /**
         * The node immediately following this node in the tree, or null if there is no sibling node. @type Node
         */
        this.nextSibling = null;

        this.addEvents({
            /**
             * @event append
             * Fires when a new child node is appended
             * @param {Tree} tree The owner tree
             * @param {Node} this This node
             * @param {Node} node The newly appended node
             * @param {Number} index The index of the newly appended node
             */
            "append" : true,
            /**
             * @event remove
             * Fires when a child node is removed
             * @param {Tree} tree The owner tree
             * @param {Node} this This node
             * @param {Node} node The removed node
             */
            "remove" : true,
            /**
             * @event move
             * Fires when this node is moved to a new location in the tree
             * @param {Tree} tree The owner tree
             * @param {Node} this This node
             * @param {Node} oldParent The old parent of this node
             * @param {Node} newParent The new parent of this node
             * @param {Number} index The index it was moved to
             */
            "move" : true,
            /**
             * @event insert
             * Fires when a new child node is inserted.
             * @param {Tree} tree The owner tree
             * @param {Node} this This node
             * @param {Node} node The child node inserted
             * @param {Node} refNode The child node the node was inserted before
             */
            "insert" : true,
            /**
             * @event beforeappend
             * Fires before a new child is appended, return false to cancel the append.
             * @param {Tree} tree The owner tree
             * @param {Node} this This node
             * @param {Node} node The child node to be appended
             */
            "beforeappend" : true,
            /**
             * @event beforeremove
             * Fires before a child is removed, return false to cancel the remove.
             * @param {Tree} tree The owner tree
             * @param {Node} this This node
             * @param {Node} node The child node to be removed
             */
            "beforeremove" : true,
            /**
             * @event beforemove
             * Fires before this node is moved to a new location in the tree. Return false to cancel the move.
             * @param {Tree} tree The owner tree
             * @param {Node} this This node
             * @param {Node} oldParent The parent of this node
             * @param {Node} newParent The new parent this node is moving to
             * @param {Number} index The index it is being moved to
             */
            "beforemove" : true,
             /**
              * @event beforeinsert
              * Fires before a new child is inserted, return false to cancel the insert.
              * @param {Tree} tree The owner tree
              * @param {Node} this This node
              * @param {Node} node The child node to be inserted
              * @param {Node} refNode The child node the node is being inserted before
              */
            "beforeinsert" : true
        });
        this.listeners = this.attributes.listeners;
        Ext.data.Node.superclass.constructor.call(this);    
    },
    
    // private
    fireEvent : function(evtName){
        // first do standard event for this node
        if(Ext.data.Node.superclass.fireEvent.apply(this, arguments) === false){
            return false;
        }
        // then bubble it up to the tree if the event wasn't cancelled
        var ot = this.getOwnerTree();
        if(ot){
            if(ot.proxyNodeEvent.apply(ot, arguments) === false){
                return false;
            }
        }
        return true;
    },

    /**
     * Returns true if this node is a leaf
     * @return {Boolean}
     */
    isLeaf : function(){
        return this.leaf === true;
    },

    // private
    setFirstChild : function(node){
        this.firstChild = node;
    },

    //private
    setLastChild : function(node){
        this.lastChild = node;
    },


    /**
     * Returns true if this node is the last child of its parent
     * @return {Boolean}
     */
    isLast : function(){
       return (!this.parentNode ? true : this.parentNode.lastChild == this);
    },

    /**
     * Returns true if this node is the first child of its parent
     * @return {Boolean}
     */
    isFirst : function(){
       return (!this.parentNode ? true : this.parentNode.firstChild == this);
    },

    /**
     * Returns true if this node has one or more child nodes, else false.
     * @return {Boolean}
     */
    hasChildNodes : function(){
        return !this.isLeaf() && this.childNodes.length > 0;
    },

    /**
     * Returns true if this node has one or more child nodes, or if the <tt>expandable</tt>
     * node attribute is explicitly specified as true (see {@link #attributes}), otherwise returns false.
     * @return {Boolean}
     */
    isExpandable : function(){
        return this.attributes.expandable || this.hasChildNodes();
    },

    /**
     * Insert node(s) as the last child node of this node.
     * @param {Node/Array} node The node or Array of nodes to append
     * @return {Node} The appended node if single append, or null if an array was passed
     */
    appendChild : function(node){
        var multi = false;
        if(Ext.isArray(node)){
            multi = node;
        }else if(arguments.length > 1){
            multi = arguments;
        }
        // if passed an array or multiple args do them one by one
        if(multi){
            for(var i = 0, len = multi.length; i < len; i++) {
                this.appendChild(multi[i]);
            }
        }else{
            if(this.fireEvent("beforeappend", this.ownerTree, this, node) === false){
                return false;
            }
            var index = this.childNodes.length;
            var oldParent = node.parentNode;
            // it's a move, make sure we move it cleanly
            if(oldParent){
                if(node.fireEvent("beforemove", node.getOwnerTree(), node, oldParent, this, index) === false){
                    return false;
                }
                oldParent.removeChild(node);
            }
            index = this.childNodes.length;
            if(index === 0){
                this.setFirstChild(node);
            }
            this.childNodes.push(node);
            node.parentNode = this;
            var ps = this.childNodes[index-1];
            if(ps){
                node.previousSibling = ps;
                ps.nextSibling = node;
            }else{
                node.previousSibling = null;
            }
            node.nextSibling = null;
            this.setLastChild(node);
            node.setOwnerTree(this.getOwnerTree());
            this.fireEvent("append", this.ownerTree, this, node, index);
            if(oldParent){
                node.fireEvent("move", this.ownerTree, node, oldParent, this, index);
            }
            return node;
        }
    },

    /**
     * Removes a child node from this node.
     * @param {Node} node The node to remove
     * @param {Boolean} destroy <tt>true</tt> to destroy the node upon removal. Defaults to <tt>false</tt>.
     * @return {Node} The removed node
     */
    removeChild : function(node, destroy){
        var index = this.childNodes.indexOf(node);
        if(index == -1){
            return false;
        }
        if(this.fireEvent("beforeremove", this.ownerTree, this, node) === false){
            return false;
        }

        // remove it from childNodes collection
        this.childNodes.splice(index, 1);

        // update siblings
        if(node.previousSibling){
            node.previousSibling.nextSibling = node.nextSibling;
        }
        if(node.nextSibling){
            node.nextSibling.previousSibling = node.previousSibling;
        }

        // update child refs
        if(this.firstChild == node){
            this.setFirstChild(node.nextSibling);
        }
        if(this.lastChild == node){
            this.setLastChild(node.previousSibling);
        }

        this.fireEvent("remove", this.ownerTree, this, node);
        if(destroy){
            node.destroy(true);
        }else{
            node.clear();
        }
        return node;
    },

    // private
    clear : function(destroy){
        // clear any references from the node
        this.setOwnerTree(null, destroy);
        this.parentNode = this.previousSibling = this.nextSibling = null;
        if(destroy){
            this.firstChild = this.lastChild = null;
        }
    },

    /**
     * Destroys the node.
     */
    destroy : function(/* private */ silent){
        /*
         * Silent is to be used in a number of cases
         * 1) When setRootNode is called.
         * 2) When destroy on the tree is called
         * 3) For destroying child nodes on a node
         */
        if(silent === true){
            this.purgeListeners();
            this.clear(true);
            Ext.each(this.childNodes, function(n){
                n.destroy(true);
            });
            this.childNodes = null;
        }else{
            this.remove(true);
        }
    },

    /**
     * Inserts the first node before the second node in this nodes childNodes collection.
     * @param {Node} node The node to insert
     * @param {Node} refNode The node to insert before (if null the node is appended)
     * @return {Node} The inserted node
     */
    insertBefore : function(node, refNode){
        if(!refNode){ // like standard Dom, refNode can be null for append
            return this.appendChild(node);
        }
        // nothing to do
        if(node == refNode){
            return false;
        }

        if(this.fireEvent("beforeinsert", this.ownerTree, this, node, refNode) === false){
            return false;
        }
        var index = this.childNodes.indexOf(refNode);
        var oldParent = node.parentNode;
        var refIndex = index;

        // when moving internally, indexes will change after remove
        if(oldParent == this && this.childNodes.indexOf(node) < index){
            refIndex--;
        }

        // it's a move, make sure we move it cleanly
        if(oldParent){
            if(node.fireEvent("beforemove", node.getOwnerTree(), node, oldParent, this, index, refNode) === false){
                return false;
            }
            oldParent.removeChild(node);
        }
        if(refIndex === 0){
            this.setFirstChild(node);
        }
        this.childNodes.splice(refIndex, 0, node);
        node.parentNode = this;
        var ps = this.childNodes[refIndex-1];
        if(ps){
            node.previousSibling = ps;
            ps.nextSibling = node;
        }else{
            node.previousSibling = null;
        }
        node.nextSibling = refNode;
        refNode.previousSibling = node;
        node.setOwnerTree(this.getOwnerTree());
        this.fireEvent("insert", this.ownerTree, this, node, refNode);
        if(oldParent){
            node.fireEvent("move", this.ownerTree, node, oldParent, this, refIndex, refNode);
        }
        return node;
    },

    /**
     * Removes this node from its parent
     * @param {Boolean} destroy <tt>true</tt> to destroy the node upon removal. Defaults to <tt>false</tt>.
     * @return {Node} this
     */
    remove : function(destroy){
        if (this.parentNode) {
            this.parentNode.removeChild(this, destroy);
        }
        return this;
    },

    /**
     * Removes all child nodes from this node.
     * @param {Boolean} destroy <tt>true</tt> to destroy the node upon removal. Defaults to <tt>false</tt>.
     * @return {Node} this
     */
    removeAll : function(destroy){
        var cn = this.childNodes,
            n;
        while((n = cn[0])){
            this.removeChild(n, destroy);
        }
        return this;
    },

    /**
     * Returns the child node at the specified index.
     * @param {Number} index
     * @return {Node}
     */
    item : function(index){
        return this.childNodes[index];
    },

    /**
     * Replaces one child node in this node with another.
     * @param {Node} newChild The replacement node
     * @param {Node} oldChild The node to replace
     * @return {Node} The replaced node
     */
    replaceChild : function(newChild, oldChild){
        var s = oldChild ? oldChild.nextSibling : null;
        this.removeChild(oldChild);
        this.insertBefore(newChild, s);
        return oldChild;
    },

    /**
     * Returns the index of a child node
     * @param {Node} node
     * @return {Number} The index of the node or -1 if it was not found
     */
    indexOf : function(child){
        return this.childNodes.indexOf(child);
    },

    /**
     * Returns the tree this node is in.
     * @return {Tree}
     */
    getOwnerTree : function(){
        // if it doesn't have one, look for one
        if(!this.ownerTree){
            var p = this;
            while(p){
                if(p.ownerTree){
                    this.ownerTree = p.ownerTree;
                    break;
                }
                p = p.parentNode;
            }
        }
        return this.ownerTree;
    },

    /**
     * Returns depth of this node (the root node has a depth of 0)
     * @return {Number}
     */
    getDepth : function(){
        var depth = 0;
        var p = this;
        while(p.parentNode){
            ++depth;
            p = p.parentNode;
        }
        return depth;
    },

    // private
    setOwnerTree : function(tree, destroy){
        // if it is a move, we need to update everyone
        if(tree != this.ownerTree){
            if(this.ownerTree){
                this.ownerTree.unregisterNode(this);
            }
            this.ownerTree = tree;
            // If we're destroying, we don't need to recurse since it will be called on each child node
            if(destroy !== true){
                Ext.each(this.childNodes, function(n){
                    n.setOwnerTree(tree);
                });
            }
            if(tree){
                tree.registerNode(this);
            }
        }
    },

    /**
     * Changes the id of this node.
     * @param {String} id The new id for the node.
     */
    setId: function(id){
        if(id !== this.id){
            var t = this.ownerTree;
            if(t){
                t.unregisterNode(this);
            }
            this.id = this.attributes.id = id;
            if(t){
                t.registerNode(this);
            }
            this.onIdChange(id);
        }
    },

    // private
    onIdChange: Ext.emptyFn,

    /**
     * Returns the path for this node. The path can be used to expand or select this node programmatically.
     * @param {String} attr (optional) The attr to use for the path (defaults to the node's id)
     * @return {String} The path
     */
    getPath : function(attr){
        attr = attr || "id";
        var p = this.parentNode;
        var b = [this.attributes[attr]];
        while(p){
            b.unshift(p.attributes[attr]);
            p = p.parentNode;
        }
        var sep = this.getOwnerTree().pathSeparator;
        return sep + b.join(sep);
    },

    /**
     * Bubbles up the tree from this node, calling the specified function with each node. The arguments to the function
     * will be the args provided or the current node. If the function returns false at any point,
     * the bubble is stopped.
     * @param {Function} fn The function to call
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to the current Node.
     * @param {Array} args (optional) The args to call the function with (default to passing the current Node)
     */
    bubble : function(fn, scope, args){
        var p = this;
        while(p){
            if(fn.apply(scope || p, args || [p]) === false){
                break;
            }
            p = p.parentNode;
        }
    },

    /**
     * Cascades down the tree from this node, calling the specified function with each node. The arguments to the function
     * will be the args provided or the current node. If the function returns false at any point,
     * the cascade is stopped on that branch.
     * @param {Function} fn The function to call
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to the current Node.
     * @param {Array} args (optional) The args to call the function with (default to passing the current Node)
     */
    cascade : function(fn, scope, args){
        if(fn.apply(scope || this, args || [this]) !== false){
            var cs = this.childNodes;
            for(var i = 0, len = cs.length; i < len; i++) {
                cs[i].cascade(fn, scope, args);
            }
        }
    },

    /**
     * Interates the child nodes of this node, calling the specified function with each node. The arguments to the function
     * will be the args provided or the current node. If the function returns false at any point,
     * the iteration stops.
     * @param {Function} fn The function to call
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to the current Node in the iteration.
     * @param {Array} args (optional) The args to call the function with (default to passing the current Node)
     */
    eachChild : function(fn, scope, args){
        var cs = this.childNodes;
        for(var i = 0, len = cs.length; i < len; i++) {
            if(fn.apply(scope || cs[i], args || [cs[i]]) === false){
                break;
            }
        }
    },

    /**
     * Finds the first child that has the attribute with the specified value.
     * @param {String} attribute The attribute name
     * @param {Mixed} value The value to search for
     * @param {Boolean} deep (Optional) True to search through nodes deeper than the immediate children
     * @return {Node} The found child or null if none was found
     */
    findChild : function(attribute, value, deep){
        return this.findChildBy(function(){
            return this.attributes[attribute] == value;
        }, null, deep);
    },

    /**
     * Finds the first child by a custom function. The child matches if the function passed returns <code>true</code>.
     * @param {Function} fn A function which must return <code>true</code> if the passed Node is the required Node.
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to the Node being tested.
     * @param {Boolean} deep (Optional) True to search through nodes deeper than the immediate children
     * @return {Node} The found child or null if none was found
     */
    findChildBy : function(fn, scope, deep){
        var cs = this.childNodes,
            len = cs.length,
            i = 0,
            n,
            res;
        for(; i < len; i++){
            n = cs[i];
            if(fn.call(scope || n, n) === true){
                return n;
            }else if (deep){
                res = n.findChildBy(fn, scope, deep);
                if(res != null){
                    return res;
                }
            }
            
        }
        return null;
    },

    /**
     * Sorts this nodes children using the supplied sort function.
     * @param {Function} fn A function which, when passed two Nodes, returns -1, 0 or 1 depending upon required sort order.
     * @param {Object} scope (optional)The scope (<code>this</code> reference) in which the function is executed. Defaults to the browser window.
     */
    sort : function(fn, scope){
        var cs = this.childNodes;
        var len = cs.length;
        if(len > 0){
            var sortFn = scope ? function(){fn.apply(scope, arguments);} : fn;
            cs.sort(sortFn);
            for(var i = 0; i < len; i++){
                var n = cs[i];
                n.previousSibling = cs[i-1];
                n.nextSibling = cs[i+1];
                if(i === 0){
                    this.setFirstChild(n);
                }
                if(i == len-1){
                    this.setLastChild(n);
                }
            }
        }
    },

    /**
     * Returns true if this node is an ancestor (at any point) of the passed node.
     * @param {Node} node
     * @return {Boolean}
     */
    contains : function(node){
        return node.isAncestor(this);
    },

    /**
     * Returns true if the passed node is an ancestor (at any point) of this node.
     * @param {Node} node
     * @return {Boolean}
     */
    isAncestor : function(node){
        var p = this.parentNode;
        while(p){
            if(p == node){
                return true;
            }
            p = p.parentNode;
        }
        return false;
    },

    toString : function(){
        return "[Node"+(this.id?" "+this.id:"")+"]";
    }
});/**
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

Ext.tree.TreePanel.nodeTypes.node = Ext.tree.TreeNode;/**
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

Ext.tree.TreePanel.nodeTypes.async = Ext.tree.AsyncTreeNode;/**
 * @class Ext.tree.TreeNodeUI
 * This class provides the default UI implementation for Ext TreeNodes.
 * The TreeNode UI implementation is separate from the
 * tree implementation, and allows customizing of the appearance of
 * tree nodes.<br>
 * <p>
 * If you are customizing the Tree's user interface, you
 * may need to extend this class, but you should never need to instantiate this class.<br>
 * <p>
 * This class provides access to the user interface components of an Ext TreeNode, through
 * {@link Ext.tree.TreeNode#getUI}
 */
Ext.tree.TreeNodeUI = Ext.extend(Object, {
    
    constructor : function(node){
        Ext.apply(this, {
            node: node,
            rendered: false,
            animating: false,
            wasLeaf: true,
            ecc: 'x-tree-ec-icon x-tree-elbow',
            emptyIcon: Ext.BLANK_IMAGE_URL    
        });
    },
    
    // private
    removeChild : function(node){
        if(this.rendered){
            this.ctNode.removeChild(node.ui.getEl());
        }
    },

    // private
    beforeLoad : function(){
         this.addClass("x-tree-node-loading");
    },

    // private
    afterLoad : function(){
         this.removeClass("x-tree-node-loading");
    },

    // private
    onTextChange : function(node, text, oldText){
        if(this.rendered){
            this.textNode.innerHTML = text;
        }
    },
    
    // private
    onIconClsChange : function(node, cls, oldCls){
        if(this.rendered){
            Ext.fly(this.iconNode).replaceClass(oldCls, cls);
        }
    },
    
    // private
    onIconChange : function(node, icon){
        if(this.rendered){
            //'<img src="', a.icon || this.emptyIcon, '" class="x-tree-node-icon',(a.icon ? " x-tree-node-inline-icon" : ""),(a.iconCls ? " "+a.iconCls : ""),'" unselectable="on" />',
            var empty = Ext.isEmpty(icon);
            this.iconNode.src = empty ? this.emptyIcon : icon;
            Ext.fly(this.iconNode)[empty ? 'removeClass' : 'addClass']('x-tree-node-inline-icon');
        }
    },
    
    // private
    onTipChange : function(node, tip, title){
        if(this.rendered){
            var hasTitle = Ext.isDefined(title);
            if(this.textNode.setAttributeNS){
                this.textNode.setAttributeNS("ext", "qtip", tip);
                if(hasTitle){
                    this.textNode.setAttributeNS("ext", "qtitle", title);
                }
            }else{
                this.textNode.setAttribute("ext:qtip", tip);
                if(hasTitle){
                    this.textNode.setAttribute("ext:qtitle", title);
                }
            }
        }
    },
    
    // private
    onHrefChange : function(node, href, target){
        if(this.rendered){
            this.anchor.href = this.getHref(href);
            if(Ext.isDefined(target)){
                this.anchor.target = target;
            }
        }
    },
    
    // private
    onClsChange : function(node, cls, oldCls){
        if(this.rendered){
            Ext.fly(this.elNode).replaceClass(oldCls, cls);
        }    
    },

    // private
    onDisableChange : function(node, state){
        this.disabled = state;
        if (this.checkbox) {
            this.checkbox.disabled = state;
        }
        this[state ? 'addClass' : 'removeClass']('x-tree-node-disabled');
    },

    // private
    onSelectedChange : function(state){
        if(state){
            this.focus();
            this.addClass("x-tree-selected");
        }else{
            //this.blur();
            this.removeClass("x-tree-selected");
        }
    },

    // private
    onMove : function(tree, node, oldParent, newParent, index, refNode){
        this.childIndent = null;
        if(this.rendered){
            var targetNode = newParent.ui.getContainer();
            if(!targetNode){//target not rendered
                this.holder = document.createElement("div");
                this.holder.appendChild(this.wrap);
                return;
            }
            var insertBefore = refNode ? refNode.ui.getEl() : null;
            if(insertBefore){
                targetNode.insertBefore(this.wrap, insertBefore);
            }else{
                targetNode.appendChild(this.wrap);
            }
            this.node.renderIndent(true, oldParent != newParent);
        }
    },

/**
 * Adds one or more CSS classes to the node's UI element.
 * Duplicate classes are automatically filtered out.
 * @param {String/Array} className The CSS class to add, or an array of classes
 */
    addClass : function(cls){
        if(this.elNode){
            Ext.fly(this.elNode).addClass(cls);
        }
    },

/**
 * Removes one or more CSS classes from the node's UI element.
 * @param {String/Array} className The CSS class to remove, or an array of classes
 */
    removeClass : function(cls){
        if(this.elNode){
            Ext.fly(this.elNode).removeClass(cls);
        }
    },

    // private
    remove : function(){
        if(this.rendered){
            this.holder = document.createElement("div");
            this.holder.appendChild(this.wrap);
        }
    },

    // private
    fireEvent : function(){
        return this.node.fireEvent.apply(this.node, arguments);
    },

    // private
    initEvents : function(){
        this.node.on("move", this.onMove, this);

        if(this.node.disabled){
            this.onDisableChange(this.node, true);
        }
        if(this.node.hidden){
            this.hide();
        }
        var ot = this.node.getOwnerTree();
        var dd = ot.enableDD || ot.enableDrag || ot.enableDrop;
        if(dd && (!this.node.isRoot || ot.rootVisible)){
            Ext.dd.Registry.register(this.elNode, {
                node: this.node,
                handles: this.getDDHandles(),
                isHandle: false
            });
        }
    },

    // private
    getDDHandles : function(){
        return [this.iconNode, this.textNode, this.elNode];
    },

/**
 * Hides this node.
 */
    hide : function(){
        this.node.hidden = true;
        if(this.wrap){
            this.wrap.style.display = "none";
        }
    },

/**
 * Shows this node.
 */
    show : function(){
        this.node.hidden = false;
        if(this.wrap){
            this.wrap.style.display = "";
        }
    },

    // private
    onContextMenu : function(e){
        if (this.node.hasListener("contextmenu") || this.node.getOwnerTree().hasListener("contextmenu")) {
            e.preventDefault();
            this.focus();
            this.fireEvent("contextmenu", this.node, e);
        }
    },

    // private
    onClick : function(e){
        if(this.dropping){
            e.stopEvent();
            return;
        }
        if(this.fireEvent("beforeclick", this.node, e) !== false){
            var a = e.getTarget('a');
            if(!this.disabled && this.node.attributes.href && a){
                this.fireEvent("click", this.node, e);
                return;
            }else if(a && e.ctrlKey){
                e.stopEvent();
            }
            e.preventDefault();
            if(this.disabled){
                return;
            }

            if(this.node.attributes.singleClickExpand && !this.animating && this.node.isExpandable()){
                this.node.toggle();
            }

            this.fireEvent("click", this.node, e);
        }else{
            e.stopEvent();
        }
    },

    // private
    onDblClick : function(e){
        e.preventDefault();
        if(this.disabled){
            return;
        }
        if(this.fireEvent("beforedblclick", this.node, e) !== false){
            if(this.checkbox){
                this.toggleCheck();
            }
            if(!this.animating && this.node.isExpandable()){
                this.node.toggle();
            }
            this.fireEvent("dblclick", this.node, e);
        }
    },

    onOver : function(e){
        this.addClass('x-tree-node-over');
    },

    onOut : function(e){
        this.removeClass('x-tree-node-over');
    },

    // private
    onCheckChange : function(){
        var checked = this.checkbox.checked;
        // fix for IE6
        this.checkbox.defaultChecked = checked;
        this.node.attributes.checked = checked;
        this.fireEvent('checkchange', this.node, checked);
    },

    // private
    ecClick : function(e){
        if(!this.animating && this.node.isExpandable()){
            this.node.toggle();
        }
    },

    // private
    startDrop : function(){
        this.dropping = true;
    },

    // delayed drop so the click event doesn't get fired on a drop
    endDrop : function(){
       setTimeout(function(){
           this.dropping = false;
       }.createDelegate(this), 50);
    },

    // private
    expand : function(){
        this.updateExpandIcon();
        this.ctNode.style.display = "";
    },

    // private
    focus : function(){
        if(!this.node.preventHScroll){
            try{this.anchor.focus();
            }catch(e){}
        }else{
            try{
                var noscroll = this.node.getOwnerTree().getTreeEl().dom;
                var l = noscroll.scrollLeft;
                this.anchor.focus();
                noscroll.scrollLeft = l;
            }catch(e){}
        }
    },

/**
 * Sets the checked status of the tree node to the passed value, or, if no value was passed,
 * toggles the checked status. If the node was rendered with no checkbox, this has no effect.
 * @param {Boolean} value (optional) The new checked status.
 */
    toggleCheck : function(value){
        var cb = this.checkbox;
        if(cb){
            cb.checked = (value === undefined ? !cb.checked : value);
            this.onCheckChange();
        }
    },

    // private
    blur : function(){
        try{
            this.anchor.blur();
        }catch(e){}
    },

    // private
    animExpand : function(callback){
        var ct = Ext.get(this.ctNode);
        ct.stopFx();
        if(!this.node.isExpandable()){
            this.updateExpandIcon();
            this.ctNode.style.display = "";
            Ext.callback(callback);
            return;
        }
        this.animating = true;
        this.updateExpandIcon();

        ct.slideIn('t', {
           callback : function(){
               this.animating = false;
               Ext.callback(callback);
            },
            scope: this,
            duration: this.node.ownerTree.duration || .25
        });
    },

    // private
    highlight : function(){
        var tree = this.node.getOwnerTree();
        Ext.fly(this.wrap).highlight(
            tree.hlColor || "C3DAF9",
            {endColor: tree.hlBaseColor}
        );
    },

    // private
    collapse : function(){
        this.updateExpandIcon();
        this.ctNode.style.display = "none";
    },

    // private
    animCollapse : function(callback){
        var ct = Ext.get(this.ctNode);
        ct.enableDisplayMode('block');
        ct.stopFx();

        this.animating = true;
        this.updateExpandIcon();

        ct.slideOut('t', {
            callback : function(){
               this.animating = false;
               Ext.callback(callback);
            },
            scope: this,
            duration: this.node.ownerTree.duration || .25
        });
    },

    // private
    getContainer : function(){
        return this.ctNode;
    },

/**
 * Returns the element which encapsulates this node.
 * @return {HtmlElement} The DOM element. The default implementation uses a <code>&lt;li></code>.
 */
    getEl : function(){
        return this.wrap;
    },

    // private
    appendDDGhost : function(ghostNode){
        ghostNode.appendChild(this.elNode.cloneNode(true));
    },

    // private
    getDDRepairXY : function(){
        return Ext.lib.Dom.getXY(this.iconNode);
    },

    // private
    onRender : function(){
        this.render();
    },

    // private
    render : function(bulkRender){
        var n = this.node, a = n.attributes;
        var targetNode = n.parentNode ?
              n.parentNode.ui.getContainer() : n.ownerTree.innerCt.dom;

        if(!this.rendered){
            this.rendered = true;

            this.renderElements(n, a, targetNode, bulkRender);

            if(a.qtip){
                this.onTipChange(n, a.qtip, a.qtipTitle);
            }else if(a.qtipCfg){
                a.qtipCfg.target = Ext.id(this.textNode);
                Ext.QuickTips.register(a.qtipCfg);
            }
            this.initEvents();
            if(!this.node.expanded){
                this.updateExpandIcon(true);
            }
        }else{
            if(bulkRender === true) {
                targetNode.appendChild(this.wrap);
            }
        }
    },

    // private
    renderElements : function(n, a, targetNode, bulkRender){
        // add some indent caching, this helps performance when rendering a large tree
        this.indentMarkup = n.parentNode ? n.parentNode.ui.getChildIndent() : '';

        var cb = Ext.isBoolean(a.checked),
            nel,
            href = this.getHref(a.href),
            buf = ['<li class="x-tree-node"><div ext:tree-node-id="',n.id,'" class="x-tree-node-el x-tree-node-leaf x-unselectable ', a.cls,'" unselectable="on">',
            '<span class="x-tree-node-indent">',this.indentMarkup,"</span>",
            '<img alt="" src="', this.emptyIcon, '" class="x-tree-ec-icon x-tree-elbow" />',
            '<img alt="" src="', a.icon || this.emptyIcon, '" class="x-tree-node-icon',(a.icon ? " x-tree-node-inline-icon" : ""),(a.iconCls ? " "+a.iconCls : ""),'" unselectable="on" />',
            cb ? ('<input class="x-tree-node-cb" type="checkbox" ' + (a.checked ? 'checked="checked" />' : '/>')) : '',
            '<a hidefocus="on" class="x-tree-node-anchor" href="',href,'" tabIndex="1" ',
             a.hrefTarget ? ' target="'+a.hrefTarget+'"' : "", '><span unselectable="on">',n.text,"</span></a></div>",
            '<ul class="x-tree-node-ct" style="display:none;"></ul>',
            "</li>"].join('');

        if(bulkRender !== true && n.nextSibling && (nel = n.nextSibling.ui.getEl())){
            this.wrap = Ext.DomHelper.insertHtml("beforeBegin", nel, buf);
        }else{
            this.wrap = Ext.DomHelper.insertHtml("beforeEnd", targetNode, buf);
        }

        this.elNode = this.wrap.childNodes[0];
        this.ctNode = this.wrap.childNodes[1];
        var cs = this.elNode.childNodes;
        this.indentNode = cs[0];
        this.ecNode = cs[1];
        this.iconNode = cs[2];
        var index = 3;
        if(cb){
            this.checkbox = cs[3];
            // fix for IE6
            this.checkbox.defaultChecked = this.checkbox.checked;
            index++;
        }
        this.anchor = cs[index];
        this.textNode = cs[index].firstChild;
    },
    
    /**
     * @private Gets a normalized href for the node.
     * @param {String} href
     */
    getHref : function(href){
        return Ext.isEmpty(href) ? (Ext.isGecko ? '' : '#') : href;
    },

/**
 * Returns the &lt;a> element that provides focus for the node's UI.
 * @return {HtmlElement} The DOM anchor element.
 */
    getAnchor : function(){
        return this.anchor;
    },

/**
 * Returns the text node.
 * @return {HtmlNode} The DOM text node.
 */
    getTextEl : function(){
        return this.textNode;
    },

/**
 * Returns the icon &lt;img> element.
 * @return {HtmlElement} The DOM image element.
 */
    getIconEl : function(){
        return this.iconNode;
    },

/**
 * Returns the checked status of the node. If the node was rendered with no
 * checkbox, it returns false.
 * @return {Boolean} The checked flag.
 */
    isChecked : function(){
        return this.checkbox ? this.checkbox.checked : false;
    },

    // private
    updateExpandIcon : function(){
        if(this.rendered){
            var n = this.node,
                c1,
                c2,
                cls = n.isLast() ? "x-tree-elbow-end" : "x-tree-elbow",
                hasChild = n.hasChildNodes();
            if(hasChild || n.attributes.expandable){
                if(n.expanded){
                    cls += "-minus";
                    c1 = "x-tree-node-collapsed";
                    c2 = "x-tree-node-expanded";
                }else{
                    cls += "-plus";
                    c1 = "x-tree-node-expanded";
                    c2 = "x-tree-node-collapsed";
                }
                if(this.wasLeaf){
                    this.removeClass("x-tree-node-leaf");
                    this.wasLeaf = false;
                }
                if(this.c1 != c1 || this.c2 != c2){
                    Ext.fly(this.elNode).replaceClass(c1, c2);
                    this.c1 = c1; this.c2 = c2;
                }
            }else{
                if(!this.wasLeaf){
                    Ext.fly(this.elNode).replaceClass("x-tree-node-expanded", "x-tree-node-collapsed");
                    delete this.c1;
                    delete this.c2;
                    this.wasLeaf = true;
                }
            }
            var ecc = "x-tree-ec-icon "+cls;
            if(this.ecc != ecc){
                this.ecNode.className = ecc;
                this.ecc = ecc;
            }
        }
    },

    // private
    onIdChange: function(id){
        if(this.rendered){
            this.elNode.setAttribute('ext:tree-node-id', id);
        }
    },

    // private
    getChildIndent : function(){
        if(!this.childIndent){
            var buf = [],
                p = this.node;
            while(p){
                if(!p.isRoot || (p.isRoot && p.ownerTree.rootVisible)){
                    if(!p.isLast()) {
                        buf.unshift('<img alt="" src="'+this.emptyIcon+'" class="x-tree-elbow-line" />');
                    } else {
                        buf.unshift('<img alt="" src="'+this.emptyIcon+'" class="x-tree-icon" />');
                    }
                }
                p = p.parentNode;
            }
            this.childIndent = buf.join("");
        }
        return this.childIndent;
    },

    // private
    renderIndent : function(){
        if(this.rendered){
            var indent = "",
                p = this.node.parentNode;
            if(p){
                indent = p.ui.getChildIndent();
            }
            if(this.indentMarkup != indent){ // don't rerender if not required
                this.indentNode.innerHTML = indent;
                this.indentMarkup = indent;
            }
            this.updateExpandIcon();
        }
    },

    destroy : function(){
        if(this.elNode){
            Ext.dd.Registry.unregister(this.elNode.id);
        }

        Ext.each(['textnode', 'anchor', 'checkbox', 'indentNode', 'ecNode', 'iconNode', 'elNode', 'ctNode', 'wrap', 'holder'], function(el){
            if(this[el]){
                Ext.fly(this[el]).remove();
                delete this[el];
            }
        }, this);
        delete this.node;
    }
});

/**
 * @class Ext.tree.RootTreeNodeUI
 * This class provides the default UI implementation for <b>root</b> Ext TreeNodes.
 * The RootTreeNode UI implementation allows customizing the appearance of the root tree node.<br>
 * <p>
 * If you are customizing the Tree's user interface, you
 * may need to extend this class, but you should never need to instantiate this class.<br>
 */
Ext.tree.RootTreeNodeUI = Ext.extend(Ext.tree.TreeNodeUI, {
    // private
    render : function(){
        if(!this.rendered){
            var targetNode = this.node.ownerTree.innerCt.dom;
            this.node.expanded = true;
            targetNode.innerHTML = '<div class="x-tree-root-node"></div>';
            this.wrap = this.ctNode = targetNode.firstChild;
        }
    },
    collapse : Ext.emptyFn,
    expand : Ext.emptyFn
});/**
 * @class Ext.tree.TreeLoader
 * @extends Ext.util.Observable
 * A TreeLoader provides for lazy loading of an {@link Ext.tree.TreeNode}'s child
 * nodes from a specified URL. The response must be a JavaScript Array definition
 * whose elements are node definition objects. e.g.:
 * <pre><code>
    [{
        id: 1,
        text: 'A leaf Node',
        leaf: true
    },{
        id: 2,
        text: 'A folder Node',
        children: [{
            id: 3,
            text: 'A child Node',
            leaf: true
        }]
   }]
</code></pre>
 * <br><br>
 * A server request is sent, and child nodes are loaded only when a node is expanded.
 * The loading node's id is passed to the server under the parameter name "node" to
 * enable the server to produce the correct child nodes.
 * <br><br>
 * To pass extra parameters, an event handler may be attached to the "beforeload"
 * event, and the parameters specified in the TreeLoader's baseParams property:
 * <pre><code>
    myTreeLoader.on("beforeload", function(treeLoader, node) {
        this.baseParams.category = node.attributes.category;
    }, this);
</code></pre>
 * This would pass an HTTP parameter called "category" to the server containing
 * the value of the Node's "category" attribute.
 * @constructor
 * Creates a new Treeloader.
 * @param {Object} config A config object containing config properties.
 */
Ext.tree.TreeLoader = function(config){
    this.baseParams = {};
    Ext.apply(this, config);

    this.addEvents(
        /**
         * @event beforeload
         * Fires before a network request is made to retrieve the Json text which specifies a node's children.
         * @param {Object} This TreeLoader object.
         * @param {Object} node The {@link Ext.tree.TreeNode} object being loaded.
         * @param {Object} callback The callback function specified in the {@link #load} call.
         */
        "beforeload",
        /**
         * @event load
         * Fires when the node has been successfuly loaded.
         * @param {Object} This TreeLoader object.
         * @param {Object} node The {@link Ext.tree.TreeNode} object being loaded.
         * @param {Object} response The response object containing the data from the server.
         */
        "load",
        /**
         * @event loadexception
         * Fires if the network request failed.
         * @param {Object} This TreeLoader object.
         * @param {Object} node The {@link Ext.tree.TreeNode} object being loaded.
         * @param {Object} response The response object containing the data from the server.
         */
        "loadexception"
    );
    Ext.tree.TreeLoader.superclass.constructor.call(this);
    if(Ext.isString(this.paramOrder)){
        this.paramOrder = this.paramOrder.split(/[\s,|]/);
    }
};

Ext.extend(Ext.tree.TreeLoader, Ext.util.Observable, {
    /**
    * @cfg {String} dataUrl The URL from which to request a Json string which
    * specifies an array of node definition objects representing the child nodes
    * to be loaded.
    */
    /**
     * @cfg {String} requestMethod The HTTP request method for loading data (defaults to the value of {@link Ext.Ajax#method}).
     */
    /**
     * @cfg {String} url Equivalent to {@link #dataUrl}.
     */
    /**
     * @cfg {Boolean} preloadChildren If set to true, the loader recursively loads "children" attributes when doing the first load on nodes.
     */
    /**
    * @cfg {Object} baseParams (optional) An object containing properties which
    * specify HTTP parameters to be passed to each request for child nodes.
    */
    /**
    * @cfg {Object} baseAttrs (optional) An object containing attributes to be added to all nodes
    * created by this loader. If the attributes sent by the server have an attribute in this object,
    * they take priority.
    */
    /**
    * @cfg {Object} uiProviders (optional) An object containing properties which
    * specify custom {@link Ext.tree.TreeNodeUI} implementations. If the optional
    * <i>uiProvider</i> attribute of a returned child node is a string rather
    * than a reference to a TreeNodeUI implementation, then that string value
    * is used as a property name in the uiProviders object.
    */
    uiProviders : {},

    /**
    * @cfg {Boolean} clearOnLoad (optional) Default to true. Remove previously existing
    * child nodes before loading.
    */
    clearOnLoad : true,

    /**
     * @cfg {Array/String} paramOrder Defaults to <tt>undefined</tt>. Only used when using directFn.
     * Specifies the params in the order in which they must be passed to the server-side Direct method
     * as either (1) an Array of String values, or (2) a String of params delimited by either whitespace,
     * comma, or pipe. For example,
     * any of the following would be acceptable:<pre><code>
nodeParameter: 'node',
paramOrder: ['param1','param2','param3']
paramOrder: 'node param1 param2 param3'
paramOrder: 'param1,node,param2,param3'
paramOrder: 'param1|param2|param|node'
     </code></pre>
     */
    paramOrder: undefined,

    /**
     * @cfg {Boolean} paramsAsHash Only used when using directFn.
     * Send parameters as a collection of named arguments (defaults to <tt>false</tt>). Providing a
     * <tt>{@link #paramOrder}</tt> nullifies this configuration.
     */
    paramsAsHash: false,

    /**
     * @cfg {String} nodeParameter The name of the parameter sent to the server which contains
     * the identifier of the node. Defaults to <tt>'node'</tt>.
     */
    nodeParameter: 'node',

    /**
     * @cfg {Function} directFn
     * Function to call when executing a request.
     */
    directFn : undefined,

    /**
     * Load an {@link Ext.tree.TreeNode} from the URL specified in the constructor.
     * This is called automatically when a node is expanded, but may be used to reload
     * a node (or append new children if the {@link #clearOnLoad} option is false.)
     * @param {Ext.tree.TreeNode} node
     * @param {Function} callback Function to call after the node has been loaded. The
     * function is passed the TreeNode which was requested to be loaded.
     * @param {Object} scope The scope (<code>this</code> reference) in which the callback is executed.
     * defaults to the loaded TreeNode.
     */
    load : function(node, callback, scope){
        if(this.clearOnLoad){
            while(node.firstChild){
                node.removeChild(node.firstChild);
            }
        }
        if(this.doPreload(node)){ // preloaded json children
            this.runCallback(callback, scope || node, [node]);
        }else if(this.directFn || this.dataUrl || this.url){
            this.requestData(node, callback, scope || node);
        }
    },

    doPreload : function(node){
        if(node.attributes.children){
            if(node.childNodes.length < 1){ // preloaded?
                var cs = node.attributes.children;
                node.beginUpdate();
                for(var i = 0, len = cs.length; i < len; i++){
                    var cn = node.appendChild(this.createNode(cs[i]));
                    if(this.preloadChildren){
                        this.doPreload(cn);
                    }
                }
                node.endUpdate();
            }
            return true;
        }
        return false;
    },

    getParams: function(node){
        var bp = Ext.apply({}, this.baseParams),
            np = this.nodeParameter,
            po = this.paramOrder;

        np && (bp[ np ] = node.id);

        if(this.directFn){
            var buf = [node.id];
            if(po){
                // reset 'buf' if the nodeParameter was included in paramOrder
                if(np && po.indexOf(np) > -1){
                    buf = [];
                }

                for(var i = 0, len = po.length; i < len; i++){
                    buf.push(bp[ po[i] ]);
                }
            }else if(this.paramsAsHash){
                buf = [bp];
            }
            return buf;
        }else{
            return bp;
        }
    },

    requestData : function(node, callback, scope){
        if(this.fireEvent("beforeload", this, node, callback) !== false){
            if(this.directFn){
                var args = this.getParams(node);
                args.push(this.processDirectResponse.createDelegate(this, [{callback: callback, node: node, scope: scope}], true));
                this.directFn.apply(window, args);
            }else{
                this.transId = Ext.Ajax.request({
                    method:this.requestMethod,
                    url: this.dataUrl||this.url,
                    success: this.handleResponse,
                    failure: this.handleFailure,
                    scope: this,
                    argument: {callback: callback, node: node, scope: scope},
                    params: this.getParams(node)
                });
            }
        }else{
            // if the load is cancelled, make sure we notify
            // the node that we are done
            this.runCallback(callback, scope || node, []);
        }
    },

    processDirectResponse: function(result, response, args){
        if(response.status){
            this.handleResponse({
                responseData: Ext.isArray(result) ? result : null,
                responseText: result,
                argument: args
            });
        }else{
            this.handleFailure({
                argument: args
            });
        }
    },

    // private
    runCallback: function(cb, scope, args){
        if(Ext.isFunction(cb)){
            cb.apply(scope, args);
        }
    },

    isLoading : function(){
        return !!this.transId;
    },

    abort : function(){
        if(this.isLoading()){
            Ext.Ajax.abort(this.transId);
        }
    },

    /**
    * <p>Override this function for custom TreeNode node implementation, or to
    * modify the attributes at creation time.</p>
    * Example:<pre><code>
new Ext.tree.TreePanel({
    ...
    loader: new Ext.tree.TreeLoader({
        url: 'dataUrl',
        createNode: function(attr) {
//          Allow consolidation consignments to have
//          consignments dropped into them.
            if (attr.isConsolidation) {
                attr.iconCls = 'x-consol',
                attr.allowDrop = true;
            }
            return Ext.tree.TreeLoader.prototype.createNode.call(this, attr);
        }
    }),
    ...
});
</code></pre>
    * @param attr {Object} The attributes from which to create the new node.
    */
    createNode : function(attr){
        // apply baseAttrs, nice idea Corey!
        if(this.baseAttrs){
            Ext.applyIf(attr, this.baseAttrs);
        }
        if(this.applyLoader !== false && !attr.loader){
            attr.loader = this;
        }
        if(Ext.isString(attr.uiProvider)){
           attr.uiProvider = this.uiProviders[attr.uiProvider] || eval(attr.uiProvider);
        }
        if(attr.nodeType){
            return new Ext.tree.TreePanel.nodeTypes[attr.nodeType](attr);
        }else{
            return attr.leaf ?
                        new Ext.tree.TreeNode(attr) :
                        new Ext.tree.AsyncTreeNode(attr);
        }
    },

    processResponse : function(response, node, callback, scope){
        var json = response.responseText;
        try {
            var o = response.responseData || Ext.decode(json);
            node.beginUpdate();
            for(var i = 0, len = o.length; i < len; i++){
                var n = this.createNode(o[i]);
                if(n){
                    node.appendChild(n);
                }
            }
            node.endUpdate();
            this.runCallback(callback, scope || node, [node]);
        }catch(e){
            this.handleFailure(response);
        }
    },

    handleResponse : function(response){
        this.transId = false;
        var a = response.argument;
        this.processResponse(response, a.node, a.callback, a.scope);
        this.fireEvent("load", this, a.node, response);
    },

    handleFailure : function(response){
        this.transId = false;
        var a = response.argument;
        this.fireEvent("loadexception", this, a.node, response);
        this.runCallback(a.callback, a.scope || a.node, [a.node]);
    },

    destroy : function(){
        this.abort();
        this.purgeListeners();
    }
});/**
 * @class Ext.tree.TreeFilter
 * Note this class is experimental and doesn't update the indent (lines) or expand collapse icons of the nodes
 * @param {TreePanel} tree
 * @param {Object} config (optional)
 */
Ext.tree.TreeFilter = function(tree, config){
    this.tree = tree;
    this.filtered = {};
    Ext.apply(this, config);
};

Ext.tree.TreeFilter.prototype = {
    clearBlank:false,
    reverse:false,
    autoClear:false,
    remove:false,

     /**
     * Filter the data by a specific attribute.
     * @param {String/RegExp} value Either string that the attribute value
     * should start with or a RegExp to test against the attribute
     * @param {String} attr (optional) The attribute passed in your node's attributes collection. Defaults to "text".
     * @param {TreeNode} startNode (optional) The node to start the filter at.
     */
    filter : function(value, attr, startNode){
        attr = attr || "text";
        var f;
        if(typeof value == "string"){
            var vlen = value.length;
            // auto clear empty filter
            if(vlen == 0 && this.clearBlank){
                this.clear();
                return;
            }
            value = value.toLowerCase();
            f = function(n){
                return n.attributes[attr].substr(0, vlen).toLowerCase() == value;
            };
        }else if(value.exec){ // regex?
            f = function(n){
                return value.test(n.attributes[attr]);
            };
        }else{
            throw 'Illegal filter type, must be string or regex';
        }
        this.filterBy(f, null, startNode);
	},

    /**
     * Filter by a function. The passed function will be called with each
     * node in the tree (or from the startNode). If the function returns true, the node is kept
     * otherwise it is filtered. If a node is filtered, its children are also filtered.
     * @param {Function} fn The filter function
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the function is executed. Defaults to the current Node.
     */
    filterBy : function(fn, scope, startNode){
        startNode = startNode || this.tree.root;
        if(this.autoClear){
            this.clear();
        }
        var af = this.filtered, rv = this.reverse;
        var f = function(n){
            if(n == startNode){
                return true;
            }
            if(af[n.id]){
                return false;
            }
            var m = fn.call(scope || n, n);
            if(!m || rv){
                af[n.id] = n;
                n.ui.hide();
                return false;
            }
            return true;
        };
        startNode.cascade(f);
        if(this.remove){
           for(var id in af){
               if(typeof id != "function"){
                   var n = af[id];
                   if(n && n.parentNode){
                       n.parentNode.removeChild(n);
                   }
               }
           }
        }
    },

    /**
     * Clears the current filter. Note: with the "remove" option
     * set a filter cannot be cleared.
     */
    clear : function(){
        var t = this.tree;
        var af = this.filtered;
        for(var id in af){
            if(typeof id != "function"){
                var n = af[id];
                if(n){
                    n.ui.show();
                }
            }
        }
        this.filtered = {};
    }
};
/**
 * @class Ext.tree.TreeSorter
 * Provides sorting of nodes in a {@link Ext.tree.TreePanel}.  The TreeSorter automatically monitors events on the
 * associated TreePanel that might affect the tree's sort order (beforechildrenrendered, append, insert and textchange).
 * Example usage:<br />
 * <pre><code>
new Ext.tree.TreeSorter(myTree, {
    folderSort: true,
    dir: "desc",
    sortType: function(node) {
        // sort by a custom, typed attribute:
        return parseInt(node.id, 10);
    }
});
</code></pre>
 * @constructor
 * @param {TreePanel} tree
 * @param {Object} config
 */
Ext.tree.TreeSorter = Ext.extend(Object, {
    
    constructor: function(tree, config){
        /**
     * @cfg {Boolean} folderSort True to sort leaf nodes under non-leaf nodes (defaults to false)
     */
    /**
     * @cfg {String} property The named attribute on the node to sort by (defaults to "text").  Note that this
     * property is only used if no {@link #sortType} function is specified, otherwise it is ignored.
     */
    /**
     * @cfg {String} dir The direction to sort ("asc" or "desc," case-insensitive, defaults to "asc")
     */
    /**
     * @cfg {String} leafAttr The attribute used to determine leaf nodes when {@link #folderSort} = true (defaults to "leaf")
     */
    /**
     * @cfg {Boolean} caseSensitive true for case-sensitive sort (defaults to false)
     */
    /**
     * @cfg {Function} sortType A custom "casting" function used to convert node values before sorting.  The function
     * will be called with a single parameter (the {@link Ext.tree.TreeNode} being evaluated) and is expected to return
     * the node's sort value cast to the specific data type required for sorting.  This could be used, for example, when
     * a node's text (or other attribute) should be sorted as a date or numeric value.  See the class description for
     * example usage.  Note that if a sortType is specified, any {@link #property} config will be ignored.
     */

    Ext.apply(this, config);
    tree.on({
        scope: this,
        beforechildrenrendered: this.doSort,
        append: this.updateSort,
        insert: this.updateSort,
        textchange: this.updateSortParent
    });

    var desc = this.dir && this.dir.toLowerCase() == 'desc',
        prop = this.property || 'text';
        sortType = this.sortType;
        folderSort = this.folderSort;
        caseSensitive = this.caseSensitive === true;
        leafAttr = this.leafAttr || 'leaf';

    if(Ext.isString(sortType)){
        sortType = Ext.data.SortTypes[sortType];
    }
    this.sortFn = function(n1, n2){
        var attr1 = n1.attributes,
            attr2 = n2.attributes;
            
        if(folderSort){
            if(attr1[leafAttr] && !attr2[leafAttr]){
                return 1;
            }
            if(!attr1[leafAttr] && attr2[leafAttr]){
                return -1;
            }
        }
        var prop1 = attr1[prop],
            prop2 = attr2[prop],
            v1 = sortType ? sortType(prop1) : (caseSensitive ? prop1 : prop1.toUpperCase());
            v2 = sortType ? sortType(prop2) : (caseSensitive ? prop2 : prop2.toUpperCase());
            
        if(v1 < v2){
            return desc ? 1 : -1;
        }else if(v1 > v2){
            return desc ? -1 : 1;
        }
        return 0;
    };
    },
    
    doSort : function(node){
        node.sort(this.sortFn);
    },

    updateSort : function(tree, node){
        if(node.childrenRendered){
            this.doSort.defer(1, this, [node]);
        }
    },

    updateSortParent : function(node){
        var p = node.parentNode;
        if(p && p.childrenRendered){
            this.doSort.defer(1, this, [p]);
        }
    }    
});/**
 * @class Ext.tree.TreeDropZone
 * @extends Ext.dd.DropZone
 * @constructor
 * @param {String/HTMLElement/Element} tree The {@link Ext.tree.TreePanel} for which to enable dropping
 * @param {Object} config
 */
if(Ext.dd.DropZone){
    
Ext.tree.TreeDropZone = function(tree, config){
    /**
     * @cfg {Boolean} allowParentInsert
     * Allow inserting a dragged node between an expanded parent node and its first child that will become a
     * sibling of the parent when dropped (defaults to false)
     */
    this.allowParentInsert = config.allowParentInsert || false;
    /**
     * @cfg {String} allowContainerDrop
     * True if drops on the tree container (outside of a specific tree node) are allowed (defaults to false)
     */
    this.allowContainerDrop = config.allowContainerDrop || false;
    /**
     * @cfg {String} appendOnly
     * True if the tree should only allow append drops (use for trees which are sorted, defaults to false)
     */
    this.appendOnly = config.appendOnly || false;

    Ext.tree.TreeDropZone.superclass.constructor.call(this, tree.getTreeEl(), config);
    /**
    * The TreePanel for this drop zone
    * @type Ext.tree.TreePanel
    * @property
    */
    this.tree = tree;
    /**
    * Arbitrary data that can be associated with this tree and will be included in the event object that gets
    * passed to any nodedragover event handler (defaults to {})
    * @type Ext.tree.TreePanel
    * @property
    */
    this.dragOverData = {};
    // private
    this.lastInsertClass = "x-tree-no-status";
};

Ext.extend(Ext.tree.TreeDropZone, Ext.dd.DropZone, {
    /**
     * @cfg {String} ddGroup
     * A named drag drop group to which this object belongs.  If a group is specified, then this object will only
     * interact with other drag drop objects in the same group (defaults to 'TreeDD').
     */
    ddGroup : "TreeDD",

    /**
     * @cfg {String} expandDelay
     * The delay in milliseconds to wait before expanding a target tree node while dragging a droppable node
     * over the target (defaults to 1000)
     */
    expandDelay : 1000,

    // private
    expandNode : function(node){
        if(node.hasChildNodes() && !node.isExpanded()){
            node.expand(false, null, this.triggerCacheRefresh.createDelegate(this));
        }
    },

    // private
    queueExpand : function(node){
        this.expandProcId = this.expandNode.defer(this.expandDelay, this, [node]);
    },

    // private
    cancelExpand : function(){
        if(this.expandProcId){
            clearTimeout(this.expandProcId);
            this.expandProcId = false;
        }
    },

    // private
    isValidDropPoint : function(n, pt, dd, e, data){
        if(!n || !data){ return false; }
        var targetNode = n.node;
        var dropNode = data.node;
        // default drop rules
        if(!(targetNode && targetNode.isTarget && pt)){
            return false;
        }
        if(pt == "append" && targetNode.allowChildren === false){
            return false;
        }
        if((pt == "above" || pt == "below") && (targetNode.parentNode && targetNode.parentNode.allowChildren === false)){
            return false;
        }
        if(dropNode && (targetNode == dropNode || dropNode.contains(targetNode))){
            return false;
        }
        // reuse the object
        var overEvent = this.dragOverData;
        overEvent.tree = this.tree;
        overEvent.target = targetNode;
        overEvent.data = data;
        overEvent.point = pt;
        overEvent.source = dd;
        overEvent.rawEvent = e;
        overEvent.dropNode = dropNode;
        overEvent.cancel = false;  
        var result = this.tree.fireEvent("nodedragover", overEvent);
        return overEvent.cancel === false && result !== false;
    },

    // private
    getDropPoint : function(e, n, dd){
        var tn = n.node;
        if(tn.isRoot){
            return tn.allowChildren !== false ? "append" : false; // always append for root
        }
        var dragEl = n.ddel;
        var t = Ext.lib.Dom.getY(dragEl), b = t + dragEl.offsetHeight;
        var y = Ext.lib.Event.getPageY(e);
        var noAppend = tn.allowChildren === false || tn.isLeaf();
        if(this.appendOnly || tn.parentNode.allowChildren === false){
            return noAppend ? false : "append";
        }
        var noBelow = false;
        if(!this.allowParentInsert){
            noBelow = tn.hasChildNodes() && tn.isExpanded();
        }
        var q = (b - t) / (noAppend ? 2 : 3);
        if(y >= t && y < (t + q)){
            return "above";
        }else if(!noBelow && (noAppend || y >= b-q && y <= b)){
            return "below";
        }else{
            return "append";
        }
    },

    // private
    onNodeEnter : function(n, dd, e, data){
        this.cancelExpand();
    },
    
    onContainerOver : function(dd, e, data) {
        if (this.allowContainerDrop && this.isValidDropPoint({ ddel: this.tree.getRootNode().ui.elNode, node: this.tree.getRootNode() }, "append", dd, e, data)) {
            return this.dropAllowed;
        }
        return this.dropNotAllowed;
    },

    // private
    onNodeOver : function(n, dd, e, data){
        var pt = this.getDropPoint(e, n, dd);
        var node = n.node;
        
        // auto node expand check
        if(!this.expandProcId && pt == "append" && node.hasChildNodes() && !n.node.isExpanded()){
            this.queueExpand(node);
        }else if(pt != "append"){
            this.cancelExpand();
        }
        
        // set the insert point style on the target node
        var returnCls = this.dropNotAllowed;
        if(this.isValidDropPoint(n, pt, dd, e, data)){
           if(pt){
               var el = n.ddel;
               var cls;
               if(pt == "above"){
                   returnCls = n.node.isFirst() ? "x-tree-drop-ok-above" : "x-tree-drop-ok-between";
                   cls = "x-tree-drag-insert-above";
               }else if(pt == "below"){
                   returnCls = n.node.isLast() ? "x-tree-drop-ok-below" : "x-tree-drop-ok-between";
                   cls = "x-tree-drag-insert-below";
               }else{
                   returnCls = "x-tree-drop-ok-append";
                   cls = "x-tree-drag-append";
               }
               if(this.lastInsertClass != cls){
                   Ext.fly(el).replaceClass(this.lastInsertClass, cls);
                   this.lastInsertClass = cls;
               }
           }
       }
       return returnCls;
    },

    // private
    onNodeOut : function(n, dd, e, data){
        this.cancelExpand();
        this.removeDropIndicators(n);
    },

    // private
    onNodeDrop : function(n, dd, e, data){
        var point = this.getDropPoint(e, n, dd);
        var targetNode = n.node;
        targetNode.ui.startDrop();
        if(!this.isValidDropPoint(n, point, dd, e, data)){
            targetNode.ui.endDrop();
            return false;
        }
        // first try to find the drop node
        var dropNode = data.node || (dd.getTreeNode ? dd.getTreeNode(data, targetNode, point, e) : null);
        return this.processDrop(targetNode, data, point, dd, e, dropNode);
    },
    
    onContainerDrop : function(dd, e, data){
        if (this.allowContainerDrop && this.isValidDropPoint({ ddel: this.tree.getRootNode().ui.elNode, node: this.tree.getRootNode() }, "append", dd, e, data)) {
            var targetNode = this.tree.getRootNode();       
            targetNode.ui.startDrop();
            var dropNode = data.node || (dd.getTreeNode ? dd.getTreeNode(data, targetNode, 'append', e) : null);
            return this.processDrop(targetNode, data, 'append', dd, e, dropNode);
        }
        return false;
    },
    
    // private
    processDrop: function(target, data, point, dd, e, dropNode){
        var dropEvent = {
            tree : this.tree,
            target: target,
            data: data,
            point: point,
            source: dd,
            rawEvent: e,
            dropNode: dropNode,
            cancel: !dropNode,
            dropStatus: false
        };
        var retval = this.tree.fireEvent("beforenodedrop", dropEvent);
        if(retval === false || dropEvent.cancel === true || !dropEvent.dropNode){
            target.ui.endDrop();
            return dropEvent.dropStatus;
        }
    
        target = dropEvent.target;
        if(point == 'append' && !target.isExpanded()){
            target.expand(false, null, function(){
                this.completeDrop(dropEvent);
            }.createDelegate(this));
        }else{
            this.completeDrop(dropEvent);
        }
        return true;
    },

    // private
    completeDrop : function(de){
        var ns = de.dropNode, p = de.point, t = de.target;
        if(!Ext.isArray(ns)){
            ns = [ns];
        }
        var n;
        for(var i = 0, len = ns.length; i < len; i++){
            n = ns[i];
            if(p == "above"){
                t.parentNode.insertBefore(n, t);
            }else if(p == "below"){
                t.parentNode.insertBefore(n, t.nextSibling);
            }else{
                t.appendChild(n);
            }
        }
        n.ui.focus();
        if(Ext.enableFx && this.tree.hlDrop){
            n.ui.highlight();
        }
        t.ui.endDrop();
        this.tree.fireEvent("nodedrop", de);
    },

    // private
    afterNodeMoved : function(dd, data, e, targetNode, dropNode){
        if(Ext.enableFx && this.tree.hlDrop){
            dropNode.ui.focus();
            dropNode.ui.highlight();
        }
        this.tree.fireEvent("nodedrop", this.tree, targetNode, data, dd, e);
    },

    // private
    getTree : function(){
        return this.tree;
    },

    // private
    removeDropIndicators : function(n){
        if(n && n.ddel){
            var el = n.ddel;
            Ext.fly(el).removeClass([
                    "x-tree-drag-insert-above",
                    "x-tree-drag-insert-below",
                    "x-tree-drag-append"]);
            this.lastInsertClass = "_noclass";
        }
    },

    // private
    beforeDragDrop : function(target, e, id){
        this.cancelExpand();
        return true;
    },

    // private
    afterRepair : function(data){
        if(data && Ext.enableFx){
            data.node.ui.highlight();
        }
        this.hideProxy();
    }    
});

}/**
 * @class Ext.tree.TreeDragZone
 * @extends Ext.dd.DragZone
 * @constructor
 * @param {String/HTMLElement/Element} tree The {@link Ext.tree.TreePanel} for which to enable dragging
 * @param {Object} config
 */
if(Ext.dd.DragZone){
Ext.tree.TreeDragZone = function(tree, config){
    Ext.tree.TreeDragZone.superclass.constructor.call(this, tree.innerCt, config);
    /**
    * The TreePanel for this drag zone
    * @type Ext.tree.TreePanel
    * @property
    */
    this.tree = tree;
};

Ext.extend(Ext.tree.TreeDragZone, Ext.dd.DragZone, {
    /**
     * @cfg {String} ddGroup
     * A named drag drop group to which this object belongs.  If a group is specified, then this object will only
     * interact with other drag drop objects in the same group (defaults to 'TreeDD').
     */
    ddGroup : "TreeDD",

    // private
    onBeforeDrag : function(data, e){
        var n = data.node;
        return n && n.draggable && !n.disabled;
    },

    // private
    onInitDrag : function(e){
        var data = this.dragData;
        this.tree.getSelectionModel().select(data.node);
        this.tree.eventModel.disable();
        this.proxy.update("");
        data.node.ui.appendDDGhost(this.proxy.ghost.dom);
        this.tree.fireEvent("startdrag", this.tree, data.node, e);
    },

    // private
    getRepairXY : function(e, data){
        return data.node.ui.getDDRepairXY();
    },

    // private
    onEndDrag : function(data, e){
        this.tree.eventModel.enable.defer(100, this.tree.eventModel);
        this.tree.fireEvent("enddrag", this.tree, data.node, e);
    },

    // private
    onValidDrop : function(dd, e, id){
        this.tree.fireEvent("dragdrop", this.tree, this.dragData.node, dd, e);
        this.hideProxy();
    },

    // private
    beforeInvalidDrop : function(e, id){
        // this scrolls the original position back into view
        var sm = this.tree.getSelectionModel();
        sm.clearSelections();
        sm.select(this.dragData.node);
    },
    
    // private
    afterRepair : function(){
        if (Ext.enableFx && this.tree.hlDrop) {
            Ext.Element.fly(this.dragData.ddel).highlight(this.hlColor || "c3daf9");
        }
        this.dragging = false;
    }
});
}/**
 * @class Ext.tree.TreeEditor
 * @extends Ext.Editor
 * Provides editor functionality for inline tree node editing.  Any valid {@link Ext.form.Field} subclass can be used
 * as the editor field.
 * @constructor
 * @param {TreePanel} tree
 * @param {Object} fieldConfig (optional) Either a prebuilt {@link Ext.form.Field} instance or a Field config object
 * that will be applied to the default field instance (defaults to a {@link Ext.form.TextField}).
 * @param {Object} config (optional) A TreeEditor config object
 */
Ext.tree.TreeEditor = function(tree, fc, config){
    fc = fc || {};
    var field = fc.events ? fc : new Ext.form.TextField(fc);
    
    Ext.tree.TreeEditor.superclass.constructor.call(this, field, config);

    this.tree = tree;

    if(!tree.rendered){
        tree.on('render', this.initEditor, this);
    }else{
        this.initEditor(tree);
    }
};

Ext.extend(Ext.tree.TreeEditor, Ext.Editor, {
    /**
     * @cfg {String} alignment
     * The position to align to (see {@link Ext.Element#alignTo} for more details, defaults to "l-l").
     */
    alignment: "l-l",
    // inherit
    autoSize: false,
    /**
     * @cfg {Boolean} hideEl
     * True to hide the bound element while the editor is displayed (defaults to false)
     */
    hideEl : false,
    /**
     * @cfg {String} cls
     * CSS class to apply to the editor (defaults to "x-small-editor x-tree-editor")
     */
    cls: "x-small-editor x-tree-editor",
    /**
     * @cfg {Boolean} shim
     * True to shim the editor if selects/iframes could be displayed beneath it (defaults to false)
     */
    shim:false,
    // inherit
    shadow:"frame",
    /**
     * @cfg {Number} maxWidth
     * The maximum width in pixels of the editor field (defaults to 250).  Note that if the maxWidth would exceed
     * the containing tree element's size, it will be automatically limited for you to the container width, taking
     * scroll and client offsets into account prior to each edit.
     */
    maxWidth: 250,
    /**
     * @cfg {Number} editDelay The number of milliseconds between clicks to register a double-click that will trigger
     * editing on the current node (defaults to 350).  If two clicks occur on the same node within this time span,
     * the editor for the node will display, otherwise it will be processed as a regular click.
     */
    editDelay : 350,

    initEditor : function(tree){
        tree.on({
            scope      : this,
            beforeclick: this.beforeNodeClick,
            dblclick   : this.onNodeDblClick
        });
        
        this.on({
            scope          : this,
            complete       : this.updateNode,
            beforestartedit: this.fitToTree,
            specialkey     : this.onSpecialKey
        });
        
        this.on('startedit', this.bindScroll, this, {delay:10});
    },

    // private
    fitToTree : function(ed, el){
        var td = this.tree.getTreeEl().dom, nd = el.dom;
        if(td.scrollLeft >  nd.offsetLeft){ // ensure the node left point is visible
            td.scrollLeft = nd.offsetLeft;
        }
        var w = Math.min(
                this.maxWidth,
                (td.clientWidth > 20 ? td.clientWidth : td.offsetWidth) - Math.max(0, nd.offsetLeft-td.scrollLeft) - /*cushion*/5);
        this.setSize(w, '');
    },

    /**
     * Edit the text of the passed {@link Ext.tree.TreeNode TreeNode}.
     * @param node {Ext.tree.TreeNode} The TreeNode to edit. The TreeNode must be {@link Ext.tree.TreeNode#editable editable}.
     */
    triggerEdit : function(node, defer){
        this.completeEdit();
		if(node.attributes.editable !== false){
           /**
            * The {@link Ext.tree.TreeNode TreeNode} this editor is bound to. Read-only.
            * @type Ext.tree.TreeNode
            * @property editNode
            */
			this.editNode = node;
            if(this.tree.autoScroll){
                Ext.fly(node.ui.getEl()).scrollIntoView(this.tree.body);
            }
            var value = node.text || '';
            if (!Ext.isGecko && Ext.isEmpty(node.text)){
                node.setText('&#160;');
            }
            this.autoEditTimer = this.startEdit.defer(this.editDelay, this, [node.ui.textNode, value]);
            return false;
        }
    },

    // private
    bindScroll : function(){
        this.tree.getTreeEl().on('scroll', this.cancelEdit, this);
    },

    // private
    beforeNodeClick : function(node, e){
        clearTimeout(this.autoEditTimer);
        if(this.tree.getSelectionModel().isSelected(node)){
            e.stopEvent();
            return this.triggerEdit(node);
        }
    },

    onNodeDblClick : function(node, e){
        clearTimeout(this.autoEditTimer);
    },

    // private
    updateNode : function(ed, value){
        this.tree.getTreeEl().un('scroll', this.cancelEdit, this);
        this.editNode.setText(value);
    },

    // private
    onHide : function(){
        Ext.tree.TreeEditor.superclass.onHide.call(this);
        if(this.editNode){
            this.editNode.ui.focus.defer(50, this.editNode.ui);
        }
    },

    // private
    onSpecialKey : function(field, e){
        var k = e.getKey();
        if(k == e.ESC){
            e.stopEvent();
            this.cancelEdit();
        }else if(k == e.ENTER && !e.hasModifier()){
            e.stopEvent();
            this.completeEdit();
        }
    },
    
    onDestroy : function(){
        clearTimeout(this.autoEditTimer);
        Ext.tree.TreeEditor.superclass.onDestroy.call(this);
        var tree = this.tree;
        tree.un('beforeclick', this.beforeNodeClick, this);
        tree.un('dblclick', this.onNodeDblClick, this);
    }
});