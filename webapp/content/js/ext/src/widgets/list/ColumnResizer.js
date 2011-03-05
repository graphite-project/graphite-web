/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.list.ColumnResizer
 * @extends Ext.util.Observable
 * <p>Supporting Class for Ext.list.ListView</p>
 * @constructor
 * @param {Object} config
 */
Ext.list.ColumnResizer = Ext.extend(Ext.util.Observable, {
    /**
     * @cfg {Number} minPct The minimum percentage to allot for any column (defaults to <tt>.05</tt>)
     */
    minPct: .05,

    constructor: function(config){
        Ext.apply(this, config);
        Ext.list.ColumnResizer.superclass.constructor.call(this);
    },
    init : function(listView){
        this.view = listView;
        listView.on('render', this.initEvents, this);
    },

    initEvents : function(view){
        view.mon(view.innerHd, 'mousemove', this.handleHdMove, this);
        this.tracker = new Ext.dd.DragTracker({
            onBeforeStart: this.onBeforeStart.createDelegate(this),
            onStart: this.onStart.createDelegate(this),
            onDrag: this.onDrag.createDelegate(this),
            onEnd: this.onEnd.createDelegate(this),
            tolerance: 3,
            autoStart: 300
        });
        this.tracker.initEl(view.innerHd);
        view.on('beforedestroy', this.tracker.destroy, this.tracker);
    },

    handleHdMove : function(e, t){
        var handleWidth = 5,
            x = e.getPageX(),
            header = e.getTarget('em', 3, true);
        if(header){
            var region = header.getRegion(),
                style = header.dom.style,
                parentNode = header.dom.parentNode;

            if(x - region.left <= handleWidth && parentNode != parentNode.parentNode.firstChild){
                this.activeHd = Ext.get(parentNode.previousSibling.firstChild);
                style.cursor = Ext.isWebKit ? 'e-resize' : 'col-resize';
            } else if(region.right - x <= handleWidth && parentNode != parentNode.parentNode.lastChild.previousSibling){
                this.activeHd = header;
                style.cursor = Ext.isWebKit ? 'w-resize' : 'col-resize';
            } else{
                delete this.activeHd;
                style.cursor = '';
            }
        }
    },

    onBeforeStart : function(e){
        this.dragHd = this.activeHd;
        return !!this.dragHd;
    },

    onStart: function(e){
        
        var me = this,
            view = me.view,
            dragHeader = me.dragHd,
            x = me.tracker.getXY()[0];            
        
        me.proxy = view.el.createChild({cls:'x-list-resizer'});
        me.dragX = dragHeader.getX();
        me.headerIndex = view.findHeaderIndex(dragHeader);
        
        me.headersDisabled = view.disableHeaders;
        view.disableHeaders = true;
        
        me.proxy.setHeight(view.el.getHeight());
        me.proxy.setX(me.dragX);
        me.proxy.setWidth(x - me.dragX);
        
        this.setBoundaries();
        
    },
    
    // Sets up the boundaries for the drag/drop operation
    setBoundaries: function(relativeX){
        var view = this.view,
            headerIndex = this.headerIndex,
            width = view.innerHd.getWidth(),
            relativeX = view.innerHd.getX(),
            minWidth = Math.ceil(width * this.minPct),
            maxWidth = width - minWidth,
            numColumns = view.columns.length,
            headers = view.innerHd.select('em', true),
            minX = minWidth + relativeX,
            maxX = maxWidth + relativeX,
            header;
          
        if (numColumns == 2) {
            this.minX = minX;
            this.maxX = maxX;
        }else{
            header = headers.item(headerIndex + 2);
            this.minX = headers.item(headerIndex).getX() + minWidth;
            this.maxX = header ? header.getX() - minWidth : maxX;
            if (headerIndex == 0) {
                // First
                this.minX = minX;
            } else if (headerIndex == numColumns - 2) {
                // Last
                this.maxX = maxX;
            }
        }
    },

    onDrag: function(e){
        var me = this,
            cursorX = me.tracker.getXY()[0].constrain(me.minX, me.maxX);
            
        me.proxy.setWidth(cursorX - this.dragX);
    },

    onEnd: function(e){
        /* calculate desired width by measuring proxy and then remove it */
        var newWidth = this.proxy.getWidth(),
            index = this.headerIndex,
            view = this.view,
            columns = view.columns,
            width = view.innerHd.getWidth(),
            newPercent = Math.ceil(newWidth * view.maxColumnWidth / width) / 100,
            disabled = this.headersDisabled,
            headerCol = columns[index],
            otherCol = columns[index + 1],
            totalPercent = headerCol.width + otherCol.width;

        this.proxy.remove();

        headerCol.width = newPercent;
        otherCol.width = totalPercent - newPercent;
      
        delete this.dragHd;
        view.setHdWidths();
        view.refresh();
        
        setTimeout(function(){
            view.disableHeaders = disabled;
        }, 100);
    }
});

// Backwards compatibility alias
Ext.ListView.ColumnResizer = Ext.list.ColumnResizer;