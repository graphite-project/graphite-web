/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
// private
// This is a support class used internally by the Grid components
Ext.grid.HeaderDragZone = Ext.extend(Ext.dd.DragZone, {
    maxDragWidth: 120,
    
    constructor : function(grid, hd, hd2){
        this.grid = grid;
        this.view = grid.getView();
        this.ddGroup = "gridHeader" + this.grid.getGridEl().id;
        Ext.grid.HeaderDragZone.superclass.constructor.call(this, hd);
        if(hd2){
            this.setHandleElId(Ext.id(hd));
            this.setOuterHandleElId(Ext.id(hd2));
        }
        this.scroll = false;
    },
    
    getDragData : function(e){
        var t = Ext.lib.Event.getTarget(e),
            h = this.view.findHeaderCell(t);
        if(h){
            return {ddel: h.firstChild, header:h};
        }
        return false;
    },

    onInitDrag : function(e){
        // keep the value here so we can restore it;
        this.dragHeadersDisabled = this.view.headersDisabled;
        this.view.headersDisabled = true;
        var clone = this.dragData.ddel.cloneNode(true);
        clone.id = Ext.id();
        clone.style.width = Math.min(this.dragData.header.offsetWidth,this.maxDragWidth) + "px";
        this.proxy.update(clone);
        return true;
    },

    afterValidDrop : function(){
        this.completeDrop();
    },

    afterInvalidDrop : function(){
        this.completeDrop();
    },
    
    completeDrop: function(){
        var v = this.view,
            disabled = this.dragHeadersDisabled;
        setTimeout(function(){
            v.headersDisabled = disabled;
        }, 50);
    }
});

// private
// This is a support class used internally by the Grid components
Ext.grid.HeaderDropZone = Ext.extend(Ext.dd.DropZone, {
    proxyOffsets : [-4, -9],
    fly: Ext.Element.fly,
    
    constructor : function(grid, hd, hd2){
        this.grid = grid;
        this.view = grid.getView();
        // split the proxies so they don't interfere with mouse events
        this.proxyTop = Ext.DomHelper.append(document.body, {
            cls:"col-move-top", html:"&#160;"
        }, true);
        this.proxyBottom = Ext.DomHelper.append(document.body, {
            cls:"col-move-bottom", html:"&#160;"
        }, true);
        this.proxyTop.hide = this.proxyBottom.hide = function(){
            this.setLeftTop(-100,-100);
            this.setStyle("visibility", "hidden");
        };
        this.ddGroup = "gridHeader" + this.grid.getGridEl().id;
        // temporarily disabled
        //Ext.dd.ScrollManager.register(this.view.scroller.dom);
        Ext.grid.HeaderDropZone.superclass.constructor.call(this, grid.getGridEl().dom);
    },

    getTargetFromEvent : function(e){
        var t = Ext.lib.Event.getTarget(e),
            cindex = this.view.findCellIndex(t);
        if(cindex !== false){
            return this.view.getHeaderCell(cindex);
        }
    },

    nextVisible : function(h){
        var v = this.view, cm = this.grid.colModel;
        h = h.nextSibling;
        while(h){
            if(!cm.isHidden(v.getCellIndex(h))){
                return h;
            }
            h = h.nextSibling;
        }
        return null;
    },

    prevVisible : function(h){
        var v = this.view, cm = this.grid.colModel;
        h = h.prevSibling;
        while(h){
            if(!cm.isHidden(v.getCellIndex(h))){
                return h;
            }
            h = h.prevSibling;
        }
        return null;
    },

    positionIndicator : function(h, n, e){
        var x = Ext.lib.Event.getPageX(e),
            r = Ext.lib.Dom.getRegion(n.firstChild),
            px, 
            pt, 
            py = r.top + this.proxyOffsets[1];
        if((r.right - x) <= (r.right-r.left)/2){
            px = r.right+this.view.borderWidth;
            pt = "after";
        }else{
            px = r.left;
            pt = "before";
        }

        if(this.grid.colModel.isFixed(this.view.getCellIndex(n))){
            return false;
        }

        px +=  this.proxyOffsets[0];
        this.proxyTop.setLeftTop(px, py);
        this.proxyTop.show();
        if(!this.bottomOffset){
            this.bottomOffset = this.view.mainHd.getHeight();
        }
        this.proxyBottom.setLeftTop(px, py+this.proxyTop.dom.offsetHeight+this.bottomOffset);
        this.proxyBottom.show();
        return pt;
    },

    onNodeEnter : function(n, dd, e, data){
        if(data.header != n){
            this.positionIndicator(data.header, n, e);
        }
    },

    onNodeOver : function(n, dd, e, data){
        var result = false;
        if(data.header != n){
            result = this.positionIndicator(data.header, n, e);
        }
        if(!result){
            this.proxyTop.hide();
            this.proxyBottom.hide();
        }
        return result ? this.dropAllowed : this.dropNotAllowed;
    },

    onNodeOut : function(n, dd, e, data){
        this.proxyTop.hide();
        this.proxyBottom.hide();
    },

    onNodeDrop : function(n, dd, e, data){
        var h = data.header;
        if(h != n){
            var cm = this.grid.colModel,
                x = Ext.lib.Event.getPageX(e),
                r = Ext.lib.Dom.getRegion(n.firstChild),
                pt = (r.right - x) <= ((r.right-r.left)/2) ? "after" : "before",
                oldIndex = this.view.getCellIndex(h),
                newIndex = this.view.getCellIndex(n);
            if(pt == "after"){
                newIndex++;
            }
            if(oldIndex < newIndex){
                newIndex--;
            }
            cm.moveColumn(oldIndex, newIndex);
            return true;
        }
        return false;
    }
});

Ext.grid.GridView.ColumnDragZone = Ext.extend(Ext.grid.HeaderDragZone, {
    
    constructor : function(grid, hd){
        Ext.grid.GridView.ColumnDragZone.superclass.constructor.call(this, grid, hd, null);
        this.proxy.el.addClass('x-grid3-col-dd');
    },
    
    handleMouseDown : function(e){
    },

    callHandleMouseDown : function(e){
        Ext.grid.GridView.ColumnDragZone.superclass.handleMouseDown.call(this, e);
    }
});