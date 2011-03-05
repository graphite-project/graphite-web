/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
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
});