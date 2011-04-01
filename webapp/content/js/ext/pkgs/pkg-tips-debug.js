/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.Tip
 * @extends Ext.Panel
 * @xtype tip
 * This is the base class for {@link Ext.QuickTip} and {@link Ext.Tooltip} that provides the basic layout and
 * positioning that all tip-based classes require. This class can be used directly for simple, statically-positioned
 * tips that are displayed programmatically, or it can be extended to provide custom tip implementations.
 * @constructor
 * Create a new Tip
 * @param {Object} config The configuration options
 */
Ext.Tip = Ext.extend(Ext.Panel, {
    /**
     * @cfg {Boolean} closable True to render a close tool button into the tooltip header (defaults to false).
     */
    /**
     * @cfg {Number} width
     * Width in pixels of the tip (defaults to auto).  Width will be ignored if it exceeds the bounds of
     * {@link #minWidth} or {@link #maxWidth}.  The maximum supported value is 500.
     */
    /**
     * @cfg {Number} minWidth The minimum width of the tip in pixels (defaults to 40).
     */
    minWidth : 40,
    /**
     * @cfg {Number} maxWidth The maximum width of the tip in pixels (defaults to 300).  The maximum supported value is 500.
     */
    maxWidth : 300,
    /**
     * @cfg {Boolean/String} shadow True or "sides" for the default effect, "frame" for 4-way shadow, and "drop"
     * for bottom-right shadow (defaults to "sides").
     */
    shadow : "sides",
    /**
     * @cfg {String} defaultAlign <b>Experimental</b>. The default {@link Ext.Element#alignTo} anchor position value
     * for this tip relative to its element of origin (defaults to "tl-bl?").
     */
    defaultAlign : "tl-bl?",
    autoRender: true,
    quickShowInterval : 250,

    // private panel overrides
    frame:true,
    hidden:true,
    baseCls: 'x-tip',
    floating:{shadow:true,shim:true,useDisplay:true,constrain:false},
    autoHeight:true,

    closeAction: 'hide',

    // private
    initComponent : function(){
        Ext.Tip.superclass.initComponent.call(this);
        if(this.closable && !this.title){
            this.elements += ',header';
        }
    },

    // private
    afterRender : function(){
        Ext.Tip.superclass.afterRender.call(this);
        if(this.closable){
            this.addTool({
                id: 'close',
                handler: this[this.closeAction],
                scope: this
            });
        }
    },

    /**
     * Shows this tip at the specified XY position.  Example usage:
     * <pre><code>
// Show the tip at x:50 and y:100
tip.showAt([50,100]);
</code></pre>
     * @param {Array} xy An array containing the x and y coordinates
     */
    showAt : function(xy){
        Ext.Tip.superclass.show.call(this);
        if(this.measureWidth !== false && (!this.initialConfig || typeof this.initialConfig.width != 'number')){
            this.doAutoWidth();
        }
        if(this.constrainPosition){
            xy = this.el.adjustForConstraints(xy);
        }
        this.setPagePosition(xy[0], xy[1]);
    },

    // protected
    doAutoWidth : function(adjust){
        adjust = adjust || 0;
        var bw = this.body.getTextWidth();
        if(this.title){
            bw = Math.max(bw, this.header.child('span').getTextWidth(this.title));
        }
        bw += this.getFrameWidth() + (this.closable ? 20 : 0) + this.body.getPadding("lr") + adjust;
        this.setWidth(bw.constrain(this.minWidth, this.maxWidth));
        
        // IE7 repaint bug on initial show
        if(Ext.isIE7 && !this.repainted){
            this.el.repaint();
            this.repainted = true;
        }
    },

    /**
     * <b>Experimental</b>. Shows this tip at a position relative to another element using a standard {@link Ext.Element#alignTo}
     * anchor position value.  Example usage:
     * <pre><code>
// Show the tip at the default position ('tl-br?')
tip.showBy('my-el');

// Show the tip's top-left corner anchored to the element's top-right corner
tip.showBy('my-el', 'tl-tr');
</code></pre>
     * @param {Mixed} el An HTMLElement, Ext.Element or string id of the target element to align to
     * @param {String} position (optional) A valid {@link Ext.Element#alignTo} anchor position (defaults to 'tl-br?' or
     * {@link #defaultAlign} if specified).
     */
    showBy : function(el, pos){
        if(!this.rendered){
            this.render(Ext.getBody());
        }
        this.showAt(this.el.getAlignToXY(el, pos || this.defaultAlign));
    },

    initDraggable : function(){
        this.dd = new Ext.Tip.DD(this, typeof this.draggable == 'boolean' ? null : this.draggable);
        this.header.addClass('x-tip-draggable');
    }
});

Ext.reg('tip', Ext.Tip);

// private - custom Tip DD implementation
Ext.Tip.DD = function(tip, config){
    Ext.apply(this, config);
    this.tip = tip;
    Ext.Tip.DD.superclass.constructor.call(this, tip.el.id, 'WindowDD-'+tip.id);
    this.setHandleElId(tip.header.id);
    this.scroll = false;
};

Ext.extend(Ext.Tip.DD, Ext.dd.DD, {
    moveOnly:true,
    scroll:false,
    headerOffsets:[100, 25],
    startDrag : function(){
        this.tip.el.disableShadow();
    },
    endDrag : function(e){
        this.tip.el.enableShadow(true);
    }
});/**
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

Ext.reg('tooltip', Ext.ToolTip);/**
 * @class Ext.QuickTip
 * @extends Ext.ToolTip
 * @xtype quicktip
 * A specialized tooltip class for tooltips that can be specified in markup and automatically managed by the global
 * {@link Ext.QuickTips} instance.  See the QuickTips class header for additional usage details and examples.
 * @constructor
 * Create a new Tip
 * @param {Object} config The configuration options
 */
Ext.QuickTip = Ext.extend(Ext.ToolTip, {
    /**
     * @cfg {Mixed} target The target HTMLElement, Ext.Element or id to associate with this quicktip (defaults to the document).
     */
    /**
     * @cfg {Boolean} interceptTitles True to automatically use the element's DOM title value if available (defaults to false).
     */
    interceptTitles : false,

    // private
    tagConfig : {
        namespace : "ext",
        attribute : "qtip",
        width : "qwidth",
        target : "target",
        title : "qtitle",
        hide : "hide",
        cls : "qclass",
        align : "qalign",
        anchor : "anchor"
    },

    // private
    initComponent : function(){
        this.target = this.target || Ext.getDoc();
        this.targets = this.targets || {};
        Ext.QuickTip.superclass.initComponent.call(this);
    },

    /**
     * Configures a new quick tip instance and assigns it to a target element.  The following config values are
     * supported (for example usage, see the {@link Ext.QuickTips} class header):
     * <div class="mdetail-params"><ul>
     * <li>autoHide</li>
     * <li>cls</li>
     * <li>dismissDelay (overrides the singleton value)</li>
     * <li>target (required)</li>
     * <li>text (required)</li>
     * <li>title</li>
     * <li>width</li></ul></div>
     * @param {Object} config The config object
     */
    register : function(config){
        var cs = Ext.isArray(config) ? config : arguments;
        for(var i = 0, len = cs.length; i < len; i++){
            var c = cs[i];
            var target = c.target;
            if(target){
                if(Ext.isArray(target)){
                    for(var j = 0, jlen = target.length; j < jlen; j++){
                        this.targets[Ext.id(target[j])] = c;
                    }
                } else{
                    this.targets[Ext.id(target)] = c;
                }
            }
        }
    },

    /**
     * Removes this quick tip from its element and destroys it.
     * @param {String/HTMLElement/Element} el The element from which the quick tip is to be removed.
     */
    unregister : function(el){
        delete this.targets[Ext.id(el)];
    },
    
    /**
     * Hides a visible tip or cancels an impending show for a particular element.
     * @param {String/HTMLElement/Element} el The element that is the target of the tip.
     */
    cancelShow: function(el){
        var at = this.activeTarget;
        el = Ext.get(el).dom;
        if(this.isVisible()){
            if(at && at.el == el){
                this.hide();
            }
        }else if(at && at.el == el){
            this.clearTimer('show');
        }
    },
    
    getTipCfg: function(e) {
        var t = e.getTarget(), 
            ttp, 
            cfg;
        if(this.interceptTitles && t.title && Ext.isString(t.title)){
            ttp = t.title;
            t.qtip = ttp;
            t.removeAttribute("title");
            e.preventDefault();
        }else{
            cfg = this.tagConfig;
            ttp = t.qtip || Ext.fly(t).getAttribute(cfg.attribute, cfg.namespace);
        }
        return ttp;
    },

    // private
    onTargetOver : function(e){
        if(this.disabled){
            return;
        }
        this.targetXY = e.getXY();
        var t = e.getTarget();
        if(!t || t.nodeType !== 1 || t == document || t == document.body){
            return;
        }
        if(this.activeTarget && ((t == this.activeTarget.el) || Ext.fly(this.activeTarget.el).contains(t))){
            this.clearTimer('hide');
            this.show();
            return;
        }
        if(t && this.targets[t.id]){
            this.activeTarget = this.targets[t.id];
            this.activeTarget.el = t;
            this.anchor = this.activeTarget.anchor;
            if(this.anchor){
                this.anchorTarget = t;
            }
            this.delayShow();
            return;
        }
        var ttp, et = Ext.fly(t), cfg = this.tagConfig, ns = cfg.namespace;
        if(ttp = this.getTipCfg(e)){
            var autoHide = et.getAttribute(cfg.hide, ns);
            this.activeTarget = {
                el: t,
                text: ttp,
                width: et.getAttribute(cfg.width, ns),
                autoHide: autoHide != "user" && autoHide !== 'false',
                title: et.getAttribute(cfg.title, ns),
                cls: et.getAttribute(cfg.cls, ns),
                align: et.getAttribute(cfg.align, ns)
                
            };
            this.anchor = et.getAttribute(cfg.anchor, ns);
            if(this.anchor){
                this.anchorTarget = t;
            }
            this.delayShow();
        }
    },

    // private
    onTargetOut : function(e){

        // If moving within the current target, and it does not have a new tip, ignore the mouseout
        if (this.activeTarget && e.within(this.activeTarget.el) && !this.getTipCfg(e)) {
            return;
        }

        this.clearTimer('show');
        if(this.autoHide !== false){
            this.delayHide();
        }
    },

    // inherit docs
    showAt : function(xy){
        var t = this.activeTarget;
        if(t){
            if(!this.rendered){
                this.render(Ext.getBody());
                this.activeTarget = t;
            }
            if(t.width){
                this.setWidth(t.width);
                this.body.setWidth(this.adjustBodyWidth(t.width - this.getFrameWidth()));
                this.measureWidth = false;
            } else{
                this.measureWidth = true;
            }
            this.setTitle(t.title || '');
            this.body.update(t.text);
            this.autoHide = t.autoHide;
            this.dismissDelay = t.dismissDelay || this.dismissDelay;
            if(this.lastCls){
                this.el.removeClass(this.lastCls);
                delete this.lastCls;
            }
            if(t.cls){
                this.el.addClass(t.cls);
                this.lastCls = t.cls;
            }
            if(this.anchor){
                this.constrainPosition = false;
            }else if(t.align){ // TODO: this doesn't seem to work consistently
                xy = this.el.getAlignToXY(t.el, t.align);
                this.constrainPosition = false;
            }else{
                this.constrainPosition = true;
            }
        }
        Ext.QuickTip.superclass.showAt.call(this, xy);
    },

    // inherit docs
    hide: function(){
        delete this.activeTarget;
        Ext.QuickTip.superclass.hide.call(this);
    }
});
Ext.reg('quicktip', Ext.QuickTip);/**
 * @class Ext.QuickTips
 * <p>Provides attractive and customizable tooltips for any element. The QuickTips
 * singleton is used to configure and manage tooltips globally for multiple elements
 * in a generic manner.  To create individual tooltips with maximum customizability,
 * you should consider either {@link Ext.Tip} or {@link Ext.ToolTip}.</p>
 * <p>Quicktips can be configured via tag attributes directly in markup, or by
 * registering quick tips programmatically via the {@link #register} method.</p>
 * <p>The singleton's instance of {@link Ext.QuickTip} is available via
 * {@link #getQuickTip}, and supports all the methods, and all the all the
 * configuration properties of Ext.QuickTip. These settings will apply to all
 * tooltips shown by the singleton.</p>
 * <p>Below is the summary of the configuration properties which can be used.
 * For detailed descriptions see the config options for the {@link Ext.QuickTip QuickTip} class</p>
 * <p><b>QuickTips singleton configs (all are optional)</b></p>
 * <div class="mdetail-params"><ul><li>dismissDelay</li>
 * <li>hideDelay</li>
 * <li>maxWidth</li>
 * <li>minWidth</li>
 * <li>showDelay</li>
 * <li>trackMouse</li></ul></div>
 * <p><b>Target element configs (optional unless otherwise noted)</b></p>
 * <div class="mdetail-params"><ul><li>autoHide</li>
 * <li>cls</li>
 * <li>dismissDelay (overrides singleton value)</li>
 * <li>target (required)</li>
 * <li>text (required)</li>
 * <li>title</li>
 * <li>width</li></ul></div>
 * <p>Here is an example showing how some of these config options could be used:</p>
 * <pre><code>
// Init the singleton.  Any tag-based quick tips will start working.
Ext.QuickTips.init();

// Apply a set of config properties to the singleton
Ext.apply(Ext.QuickTips.getQuickTip(), {
    maxWidth: 200,
    minWidth: 100,
    showDelay: 50,      // Show 50ms after entering target
    trackMouse: true
});

// Manually register a quick tip for a specific element
Ext.QuickTips.register({
    target: 'my-div',
    title: 'My Tooltip',
    text: 'This tooltip was added in code',
    width: 100,
    dismissDelay: 10000 // Hide after 10 seconds hover
});
</code></pre>
 * <p>To register a quick tip in markup, you simply add one or more of the valid QuickTip attributes prefixed with
 * the <b>ext:</b> namespace.  The HTML element itself is automatically set as the quick tip target. Here is the summary
 * of supported attributes (optional unless otherwise noted):</p>
 * <ul><li><b>hide</b>: Specifying "user" is equivalent to setting autoHide = false.  Any other value will be the
 * same as autoHide = true.</li>
 * <li><b>qclass</b>: A CSS class to be applied to the quick tip (equivalent to the 'cls' target element config).</li>
 * <li><b>qtip (required)</b>: The quick tip text (equivalent to the 'text' target element config).</li>
 * <li><b>qtitle</b>: The quick tip title (equivalent to the 'title' target element config).</li>
 * <li><b>qwidth</b>: The quick tip width (equivalent to the 'width' target element config).</li></ul>
 * <p>Here is an example of configuring an HTML element to display a tooltip from markup:</p>
 * <pre><code>
// Add a quick tip to an HTML button
&lt;input type="button" value="OK" ext:qtitle="OK Button" ext:qwidth="100"
     ext:qtip="This is a quick tip from markup!">&lt;/input>
</code></pre>
 * @singleton
 */
Ext.QuickTips = function(){
    var tip,
        disabled = false;
        
    return {
        /**
         * Initialize the global QuickTips instance and prepare any quick tips.
         * @param {Boolean} autoRender True to render the QuickTips container immediately to preload images. (Defaults to true) 
         */
        init : function(autoRender){
            if(!tip){
                if(!Ext.isReady){
                    Ext.onReady(function(){
                        Ext.QuickTips.init(autoRender);
                    });
                    return;
                }
                tip = new Ext.QuickTip({
                    elements:'header,body', 
                    disabled: disabled
                });
                if(autoRender !== false){
                    tip.render(Ext.getBody());
                }
            }
        },
        
        // Protected method called by the dd classes
        ddDisable : function(){
            // don't disable it if we don't need to
            if(tip && !disabled){
                tip.disable();
            }    
        },
        
        // Protected method called by the dd classes
        ddEnable : function(){
            // only enable it if it hasn't been disabled
            if(tip && !disabled){
                tip.enable();
            }
        },

        /**
         * Enable quick tips globally.
         */
        enable : function(){
            if(tip){
                tip.enable();
            }
            disabled = false;
        },

        /**
         * Disable quick tips globally.
         */
        disable : function(){
            if(tip){
                tip.disable();
            }
            disabled = true;
        },

        /**
         * Returns true if quick tips are enabled, else false.
         * @return {Boolean}
         */
        isEnabled : function(){
            return tip !== undefined && !tip.disabled;
        },

        /**
         * Gets the single {@link Ext.QuickTip QuickTip} instance used to show tips from all registered elements.
         * @return {Ext.QuickTip}
         */
        getQuickTip : function(){
            return tip;
        },

        /**
         * Configures a new quick tip instance and assigns it to a target element.  See
         * {@link Ext.QuickTip#register} for details.
         * @param {Object} config The config object
         */
        register : function(){
            tip.register.apply(tip, arguments);
        },

        /**
         * Removes any registered quick tip from the target element and destroys it.
         * @param {String/HTMLElement/Element} el The element from which the quick tip is to be removed.
         */
        unregister : function(){
            tip.unregister.apply(tip, arguments);
        },

        /**
         * Alias of {@link #register}.
         * @param {Object} config The config object
         */
        tips : function(){
            tip.register.apply(tip, arguments);
        }
    };
}();/**
 * @class Ext.slider.Tip
 * @extends Ext.Tip
 * Simple plugin for using an Ext.Tip with a slider to show the slider value. Example usage:
<pre>
new Ext.Slider({
    width: 214,
    minValue: 0,
    maxValue: 100,
    plugins: new Ext.slider.Tip()
});
</pre>
 * Optionally provide your own tip text by overriding getText:
 <pre>
 new Ext.Slider({
     width: 214,
     minValue: 0,
     maxValue: 100,
     plugins: new Ext.slider.Tip({
         getText: function(thumb){
             return String.format('<b>{0}% complete</b>', thumb.value);
         }
     })
 });
 </pre>
 */
Ext.slider.Tip = Ext.extend(Ext.Tip, {
    minWidth: 10,
    offsets : [0, -10],
    
    init: function(slider) {
        slider.on({
            scope    : this,
            dragstart: this.onSlide,
            drag     : this.onSlide,
            dragend  : this.hide,
            destroy  : this.destroy
        });
    },
    
    /**
     * @private
     * Called whenever a dragstart or drag event is received on the associated Thumb. 
     * Aligns the Tip with the Thumb's new position.
     * @param {Ext.slider.MultiSlider} slider The slider
     * @param {Ext.EventObject} e The Event object
     * @param {Ext.slider.Thumb} thumb The thumb that the Tip is attached to
     */
    onSlide : function(slider, e, thumb) {
        this.show();
        this.body.update(this.getText(thumb));
        this.doAutoWidth();
        this.el.alignTo(thumb.el, 'b-t?', this.offsets);
    },

    /**
     * Used to create the text that appears in the Tip's body. By default this just returns
     * the value of the Slider Thumb that the Tip is attached to. Override to customize.
     * @param {Ext.slider.Thumb} thumb The Thumb that the Tip is attached to
     * @return {String} The text to display in the tip
     */
    getText : function(thumb) {
        return String(thumb.value);
    }
});

//backwards compatibility - SliderTip used to be a ux before 3.2
Ext.ux.SliderTip = Ext.slider.Tip;