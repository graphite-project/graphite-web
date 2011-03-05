/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
var TreeTest = function(){
    // shorthand
    var Tree = Ext.tree;

    return {
        init : function(){
            // yui-ext tree
            var tree = new Tree.TreePanel({
                animate:true,
                autoScroll:true,
                loader: new Tree.TreeLoader({dataUrl:'get-nodes.php'}),
                containerScroll: true,
                border: false,
                height: 300,
                width: 300
            });

            // add a tree sorter in folder mode
            new Tree.TreeSorter(tree, {folderSort:true});

            // set the root node
            var root = new Tree.AsyncTreeNode({
                text: 'Ext JS',
                draggable:false, // disable root node dragging
                id:'src'
            });
            tree.setRootNode(root);

            // render the tree
            tree.render('tree');
            root.expand(false, /*no anim*/ false);
            tree.bodyFocus.fi.setFrameEl(tree.el);
            tree.getSelectionModel().select(tree.getRootNode());
            tree.enter.defer(100, tree);
        }
    };
}();

Ext.EventManager.onDocumentReady(TreeTest.init, TreeTest, true);