/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.ToolTip
 * @extends Ext.Tip
 * A standard tooltip implementation for providing additional information when hovering over a target element.
 * @xtype tooltip
 * @constructor
 * Create a new Tooltip
 * @param {Object} config The configuration options
 */
Ext.ToolTip = Ext.extend(Ext.Tip, {
    /**
     * When a Tooltip is configured with the <code>{@link #delegate}</code>
     * option to cause selected child elements of the <code>{@link #target}</code>
     * Element to each trigger a seperate show event, this property is set to
     * the DOM element which triggered the show.
     * @type DOMElement
     * @property triggerElement
     */
    /**
     * @cfg {Mixed} target The target HTMLElement, Ext.Element or id to monitor
     * for mouseover events to trigger showing this ToolTip.
     */
    /**
     * @cfg {Boolean} autoHide True to automatically hide the tooltip after the
     * mouse exits the target element or after the <code>{@link #dismissDelay}</code>
     * has expired if set (defaults to true).  If <code>{@link closable} = true</code>
     * a close tool button will be rendered into the tooltip header.
     */
    /**
     * @cfg {Number} showDelay Delay in milliseconds before the tooltip displays
     * after the mouse enters the target element (defaults to 500)
     */
    showDelay : 500,
    /**
     * @cfg {Number} hideDelay Delay in milliseconds after the mouse exits the
     * target element but before the tooltip actually hides (defaults to 200).
     * Set to 0 for the tooltip to hide immediately.
     */
    hideDelay : 200,
    /**
     * @cfg {Number} dismissDelay Delay in milliseconds before the tooltip
     * automatically hides (defaults to 5000). To disable automatic hiding, set
     * dismissDelay = 0.
     */
    dismissDelay : 5000,
    /**
     * @cfg {Array} mouseOffset An XY offset from the mouse position where the
     * tooltip should be shown (defaults to [15,18]).
     */
    /**
     * @cfg {Boolean} trackMouse True to have the tooltip follow the mouse as it
     * moves over the target element (defaults to false).
     */
    trackMouse : false,
    /**
     * @cfg {Boolean} anchorToTarget True to anchor the tooltip to the target
     * element, false to anchor it relative to the mouse coordinates (defaults
     * to true).  When <code>anchorToTarget</code> is true, use
     * <code>{@link #defaultAlign}</code> to control tooltip alignment to the
     * target element.  When <code>anchorToTarget</code> is false, use
     * <code>{@link #anchorPosition}</code> instead to control alignment.
     */
    anchorToTarget : true,
    /**
     * @cfg {Number} anchorOffset A numeric pixel value used to offset the
     * default position of the anchor arrow (defaults to 0).  When the anchor
     * position is on the top or bottom of the tooltip, <code>anchorOffset</code>
     * will be used as a horizontal offset.  Likewise, when the anchor position
     * is on the left or right side, <code>anchorOffset</code> will be used as
     * a vertical offset.
     */
    anchorOffset : 0,
    /**
     * @cfg {String} delegate <p>Optional. A {@link Ext.DomQuery DomQuery}
     * selector which allows selection of individual elements within the
     * <code>{@link #target}</code> element to trigger showing and hiding the
     * ToolTip as the mouse moves within the target.</p>
     * <p>When specified, the child element of the target which caused a show
     * event is placed into the <code>{@link #triggerElement}</code> property
     * before the ToolTip is shown.</p>
     * <p>This may be useful when a Component has regular, repeating elements
     * in it, each of which need a Tooltip which contains information specific
     * to that element. For example:</p><pre><code>
var myGrid = new Ext.grid.gridPanel(gridConfig);
myGrid.on('render', function(grid) {
    var store = grid.getStore();  // Capture the Store.
    var view = grid.getView();    // Capture the GridView.
    myGrid.tip = new Ext.ToolTip({
        target: view.mainBody,    // The overall target element.
        delegate: '.x-grid3-row', // Each grid row causes its own seperate show and hide.
        trackMouse: true,         // Moving within the row should not hide the tip.
        renderTo: document.body,  // Render immediately so that tip.body can be
                                  //  referenced prior to the first show.
        listeners: {              // Change content dynamically depending on which element
                                  //  triggered the show.
            beforeshow: function updateTipBody(tip) {
                var rowIndex = view.findRowIndex(tip.triggerElement);
                tip.body.dom.innerHTML = 'Over Record ID ' + store.getAt(rowIndex).id;
            }
        }
    });
});
     *</code></pre>
     */

    // private
    targetCounter : 0,

    constrainPosition : false,

    // private
    initComponent : function(){
        Ext.ToolTip.superclass.initComponent.call(this);
        this.lastActive = new Date();
        this.initTarget(this.target);
        this.origAnchor = this.anchor;
    },

    // private
    onRender : function(ct, position){
        Ext.ToolTip.superclass.onRender.call(this, ct, position);
        this.anchorCls = 'x-tip-anchor-' + this.getAnchorPosition();
        this.anchorEl = this.el.createChild({
            cls: 'x-tip-anchor ' + this.anchorCls
        });
    },

    // private
    afterRender : function(){
        Ext.ToolTip.superclass.afterRender.call(this);
        this.anchorEl.setStyle('z-index', this.el.getZIndex() + 1).setVisibilityMode(Ext.Element.DISPLAY);
    },

    /**
     * Binds this ToolTip to the specified element. The tooltip will be displayed when the mouse moves over the element.
     * @param {Mixed} t The Element, HtmlElement, or ID of an element to bind to
     */
    initTarget : function(target){
        var t;
        if((t = Ext.get(target))){
            if(this.target){
                var tg = Ext.get(this.target);
                this.mun(tg, 'mouseover', this.onTargetOver, this);
                this.mun(tg, 'mouseout', this.onTargetOut, this);
                this.mun(tg, 'mousemove', this.onMouseMove, this);
            }
            this.mon(t, {
                mouseover: this.onTargetOver,
                mouseout: this.onTargetOut,
                mousemove: this.onMouseMove,
                scope: this
            });
            this.target = t;
        }
        if(this.anchor){
            this.anchorTarget = this.target;
        }
    },

    // private
    onMouseMove : function(e){
        var t = this.delegate ? e.getTarget(this.delegate) : this.triggerElement = true;
        if (t) {
            this.targetXY = e.getXY();
            if (t === this.triggerElement) {
                if(!this.hidden && this.trackMouse){
                    this.setPagePosition(this.getTargetXY());
                }
            } else {
                this.hide();
                this.lastActive = new Date(0);
                this.onTargetOver(e);
            }
        } else if (!this.closable && this.isVisible()) {
            this.hide();
        }
    },

    // private
    getTargetXY : function(){
        if(this.delegate){
            this.anchorTarget = this.triggerElement;
        }
        if(this.anchor){
            this.targetCounter++;
            var offsets = this.getOffsets(),
                xy = (this.anchorToTarget && !this.trackMouse) ? this.el.getAlignToXY(this.anchorTarget, this.getAnchorAlign()) : this.targetXY,
                dw = Ext.lib.Dom.getViewWidth() - 5,
                dh = Ext.lib.Dom.getViewHeight() - 5,
                de = document.documentElement,
                bd = document.body,
                scrollX = (de.scrollLeft || bd.scrollLeft || 0) + 5,
                scrollY = (de.scrollTop || bd.scrollTop || 0) + 5,
                axy = [xy[0] + offsets[0], xy[1] + offsets[1]],
                sz = this.getSize();
                
            this.anchorEl.removeClass(this.anchorCls);

            if(this.targetCounter < 2){
                if(axy[0] < scrollX){
                    if(this.anchorToTarget){
                        this.defaultAlign = 'l-r';
                        if(this.mouseOffset){this.mouseOffset[0] *= -1;}
                    }
                    this.anchor = 'left';
                    return this.getTargetXY();
                }
                if(axy[0]+sz.width > dw){
                    if(this.anchorToTarget){
                        this.defaultAlign = 'r-l';
                        if(this.mouseOffset){this.mouseOffset[0] *= -1;}
                    }
                    this.anchor = 'right';
                    return this.getTargetXY();
                }
                if(axy[1] < scrollY){
                    if(this.anchorToTarget){
                        this.defaultAlign = 't-b';
                        if(this.mouseOffset){this.mouseOffset[1] *= -1;}
                    }
                    this.anchor = 'top';
                    return this.getTargetXY();
                }
                if(axy[1]+sz.height > dh){
                    if(this.anchorToTarget){
                        this.defaultAlign = 'b-t';
                        if(this.mouseOffset){this.mouseOffset[1] *= -1;}
                    }
                    this.anchor = 'bottom';
                    return this.getTargetXY();
                }
            }

            this.anchorCls = 'x-tip-anchor-'+this.getAnchorPosition();
            this.anchorEl.addClass(this.anchorCls);
            this.targetCounter = 0;
            return axy;
        }else{
            var mouseOffset = this.getMouseOffset();
            return [this.targetXY[0]+mouseOffset[0], this.targetXY[1]+mouseOffset[1]];
        }
    },

    getMouseOffset : function(){
        var offset = this.anchor ? [0,0] : [15,18];
        if(this.mouseOffset){
            offset[0] += this.mouseOffset[0];
            offset[1] += this.mouseOffset[1];
        }
        return offset;
    },

    // private
    getAnchorPosition : function(){
        if(this.anchor){
            this.tipAnchor = this.anchor.charAt(0);
        }else{
            var m = this.defaultAlign.match(/^([a-z]+)-([a-z]+)(\?)?$/);
            if(!m){
               throw 'AnchorTip.defaultAlign is invalid';
            }
            this.tipAnchor = m[1].charAt(0);
        }

        switch(this.tipAnchor){
            case 't': return 'top';
            case 'b': return 'bottom';
            case 'r': return 'right';
        }
        return 'left';
    },

    // private
    getAnchorAlign : function(){
        switch(this.anchor){
            case 'top'  : return 'tl-bl';
            case 'left' : return 'tl-tr';
            case 'right': return 'tr-tl';
            default     : return 'bl-tl';
        }
    },

    // private
    getOffsets : function(){
        var offsets, 
            ap = this.getAnchorPosition().charAt(0);
        if(this.anchorToTarget && !this.trackMouse){
            switch(ap){
                case 't':
                    offsets = [0, 9];
                    break;
                case 'b':
                    offsets = [0, -13];
                    break;
                case 'r':
                    offsets = [-13, 0];
                    break;
                default:
                    offsets = [9, 0];
                    break;
            }
        }else{
            switch(ap){
                case 't':
                    offsets = [-15-this.anchorOffset, 30];
                    break;
                case 'b':
                    offsets = [-19-this.anchorOffset, -13-this.el.dom.offsetHeight];
                    break;
                case 'r':
                    offsets = [-15-this.el.dom.offsetWidth, -13-this.anchorOffset];
                    break;
                default:
                    offsets = [25, -13-this.anchorOffset];
                    break;
            }
        }
        var mouseOffset = this.getMouseOffset();
        offsets[0] += mouseOffset[0];
        offsets[1] += mouseOffset[1];

        return offsets;
    },

    // private
    onTargetOver : function(e){
        if(this.disabled || e.within(this.target.dom, true)){
            return;
        }
        var t = e.getTarget(this.delegate);
        if (t) {
            this.triggerElement = t;
            this.clearTimer('hide');
            this.targetXY = e.getXY();
            this.delayShow();
        }
    },

    // private
    delayShow : function(){
        if(this.hidden && !this.showTimer){
            if(this.lastActive.getElapsed() < this.quickShowInterval){
                this.show();
            }else{
                this.showTimer = this.show.defer(this.showDelay, this);
            }
        }else if(!this.hidden && this.autoHide !== false){
            this.show();
        }
    },

    // private
    onTargetOut : function(e){
        if(this.disabled || e.within(this.target.dom, true)){
            return;
        }
        this.clearTimer('show');
        if(this.autoHide !== false){
            this.delayHide();
        }
    },

    // private
    delayHide : function(){
        if(!this.hidden && !this.hideTimer){
            this.hideTimer = this.hide.defer(this.hideDelay, this);
        }
    },

    /**
     * Hides this tooltip if visible.
     */
    hide: function(){
        this.clearTimer('dismiss');
        this.lastActive = new Date();
        if(this.anchorEl){
            this.anchorEl.hide();
        }
        Ext.ToolTip.superclass.hide.call(this);
        delete this.triggerElement;
    },

    /**
     * Shows this tooltip at the current event target XY position.
     */
    show : function(){
        if(this.anchor){
            // pre-show it off screen so that the el will have dimensions
            // for positioning calcs when getting xy next
            this.showAt([-1000,-1000]);
            this.origConstrainPosition = this.constrainPosition;
            this.constrainPosition = false;
            this.anchor = this.origAnchor;
        }
        this.showAt(this.getTargetXY());

        if(this.anchor){
            this.anchorEl.show();
            this.syncAnchor();
            this.constrainPosition = this.origConstrainPosition;
        }else{
            this.anchorEl.hide();
        }
    },

    // inherit docs
    showAt : function(xy){
        this.lastActive = new Date();
        this.clearTimers();
        Ext.ToolTip.superclass.showAt.call(this, xy);
        if(this.dismissDelay && this.autoHide !== false){
            this.dismissTimer = this.hide.defer(this.dismissDelay, this);
        }
        if(this.anchor && !this.anchorEl.isVisible()){
            this.syncAnchor();
            this.anchorEl.show();
        }else{
            this.anchorEl.hide();
        }
    },

    // private
    syncAnchor : function(){
        var anchorPos, targetPos, offset;
        switch(this.tipAnchor.charAt(0)){
            case 't':
                anchorPos = 'b';
                targetPos = 'tl';
                offset = [20+this.anchorOffset, 2];
                break;
            case 'r':
                anchorPos = 'l';
                targetPos = 'tr';
                offset = [-2, 11+this.anchorOffset];
                break;
            case 'b':
                anchorPos = 't';
                targetPos = 'bl';
                offset = [20+this.anchorOffset, -2];
                break;
            default:
                anchorPos = 'r';
                targetPos = 'tl';
                offset = [2, 11+this.anchorOffset];
                break;
        }
        this.anchorEl.alignTo(this.el, anchorPos+'-'+targetPos, offset);
    },

    // private
    setPagePosition : function(x, y){
        Ext.ToolTip.superclass.setPagePosition.call(this, x, y);
        if(this.anchor){
            this.syncAnchor();
        }
    },

    // private
    clearTimer : function(name){
        name = name + 'Timer';
        clearTimeout(this[name]);
        delete this[name];
    },

    // private
    clearTimers : function(){
        this.clearTimer('show');
        this.clearTimer('dismiss');
        this.clearTimer('hide');
    },

    // private
    onShow : function(){
        Ext.ToolTip.superclass.onShow.call(this);
        Ext.getDoc().on('mousedown', this.onDocMouseDown, this);
    },

    // private
    onHide : function(){
        Ext.ToolTip.superclass.onHide.call(this);
        Ext.getDoc().un('mousedown', this.onDocMouseDown, this);
    },

    // private
    onDocMouseDown : function(e){
        if(this.autoHide !== true && !this.closable && !e.within(this.el.dom)){
            this.disable();
            this.doEnable.defer(100, this);
        }
    },
    
    // private
    doEnable : function(){
        if(!this.isDestroyed){
            this.enable();
        }
    },

    // private
    onDisable : function(){
        this.clearTimers();
        this.hide();
    },

    // private
    adjustPosition : function(x, y){
        if(this.contstrainPosition){
            var ay = this.targetXY[1], h = this.getSize().height;
            if(y <= ay && (y+h) >= ay){
                y = ay-h-5;
            }
        }
        return {x : x, y: y};
    },
    
    beforeDestroy : function(){
        this.clearTimers();
        Ext.destroy(this.anchorEl);
        delete this.anchorEl;
        delete this.target;
        delete this.anchorTarget;
        delete this.triggerElement;
        Ext.ToolTip.superclass.beforeDestroy.call(this);    
    },

    // private
    onDestroy : function(){
        Ext.getDoc().un('mousedown', this.onDocMouseDown, this);
        Ext.ToolTip.superclass.onDestroy.call(this);
    }
});

Ext.reg('tooltip', Ext.ToolTip);