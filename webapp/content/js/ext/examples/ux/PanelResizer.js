/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.ux.PanelResizer = Ext.extend(Ext.util.Observable, {
    minHeight: 0,
    maxHeight:10000000,

    constructor: function(config){
        Ext.apply(this, config);
        this.events = {};
        Ext.ux.PanelResizer.superclass.constructor.call(this, config);
    },

    init : function(p){
        this.panel = p;

        if(this.panel.elements.indexOf('footer')==-1){
            p.elements += ',footer';
        }
        p.on('render', this.onRender, this);
    },

    onRender : function(p){
        this.handle = p.footer.createChild({cls:'x-panel-resize'});

        this.tracker = new Ext.dd.DragTracker({
            onStart: this.onDragStart.createDelegate(this),
            onDrag: this.onDrag.createDelegate(this),
            onEnd: this.onDragEnd.createDelegate(this),
            tolerance: 3,
            autoStart: 300
        });
        this.tracker.initEl(this.handle);
        p.on('beforedestroy', this.tracker.destroy, this.tracker);
    },

	// private
    onDragStart: function(e){
        this.dragging = true;
        this.startHeight = this.panel.el.getHeight();
        this.fireEvent('dragstart', this, e);
    },

	// private
    onDrag: function(e){
        this.panel.setHeight((this.startHeight-this.tracker.getOffset()[1]).constrain(this.minHeight, this.maxHeight));
        this.fireEvent('drag', this, e);
    },

	// private
    onDragEnd: function(e){
        this.dragging = false;
        this.fireEvent('dragend', this, e);
    }
});
Ext.preg('panelresizer', Ext.ux.PanelResizer);