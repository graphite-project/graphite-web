/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
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
}