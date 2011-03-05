/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.layout.BoxLayout
 * @extends Ext.layout.ContainerLayout
 * <p>Base Class for HBoxLayout and VBoxLayout Classes. Generally it should not need to be used directly.</p>
 */
Ext.layout.BoxLayout = Ext.extend(Ext.layout.ContainerLayout, {
    /**
     * @cfg {Object} defaultMargins
     * <p>If the individual contained items do not have a <tt>margins</tt>
     * property specified, the default margins from this property will be
     * applied to each item.</p>
     * <br><p>This property may be specified as an object containing margins
     * to apply in the format:</p><pre><code>
{
    top: (top margin),
    right: (right margin),
    bottom: (bottom margin),
    left: (left margin)
}</code></pre>
     * <p>This property may also be specified as a string containing
     * space-separated, numeric margin values. The order of the sides associated
     * with each value matches the way CSS processes margin values:</p>
     * <div class="mdetail-params"><ul>
     * <li>If there is only one value, it applies to all sides.</li>
     * <li>If there are two values, the top and bottom borders are set to the
     * first value and the right and left are set to the second.</li>
     * <li>If there are three values, the top is set to the first value, the left
     * and right are set to the second, and the bottom is set to the third.</li>
     * <li>If there are four values, they apply to the top, right, bottom, and
     * left, respectively.</li>
     * </ul></div>
     * <p>Defaults to:</p><pre><code>
     * {top:0, right:0, bottom:0, left:0}
     * </code></pre>
     */
    defaultMargins : {left:0,top:0,right:0,bottom:0},
    /**
     * @cfg {String} padding
     * <p>Sets the padding to be applied to all child items managed by this layout.</p>
     * <p>This property must be specified as a string containing
     * space-separated, numeric padding values. The order of the sides associated
     * with each value matches the way CSS processes padding values:</p>
     * <div class="mdetail-params"><ul>
     * <li>If there is only one value, it applies to all sides.</li>
     * <li>If there are two values, the top and bottom borders are set to the
     * first value and the right and left are set to the second.</li>
     * <li>If there are three values, the top is set to the first value, the left
     * and right are set to the second, and the bottom is set to the third.</li>
     * <li>If there are four values, they apply to the top, right, bottom, and
     * left, respectively.</li>
     * </ul></div>
     * <p>Defaults to: <code>"0"</code></p>
     */
    padding : '0',
    // documented in subclasses
    pack : 'start',

    // private
    monitorResize : true,
    type: 'box',
    scrollOffset : 0,
    extraCls : 'x-box-item',
    targetCls : 'x-box-layout-ct',
    innerCls : 'x-box-inner',

    constructor : function(config){
        Ext.layout.BoxLayout.superclass.constructor.call(this, config);

        if (Ext.isString(this.defaultMargins)) {
            this.defaultMargins = this.parseMargins(this.defaultMargins);
        }
        
        var handler = this.overflowHandler;
        
        if (typeof handler == 'string') {
            handler = {
                type: handler
            };
        }
        
        var handlerType = 'none';
        if (handler && handler.type != undefined) {
            handlerType = handler.type;
        }
        
        var constructor = Ext.layout.boxOverflow[handlerType];
        if (constructor[this.type]) {
            constructor = constructor[this.type];
        }
        
        this.overflowHandler = new constructor(this, handler);
    },

    /**
     * @private
     * Runs the child box calculations and caches them in childBoxCache. Subclasses can used these cached values
     * when laying out
     */
    onLayout: function(container, target) {
        Ext.layout.BoxLayout.superclass.onLayout.call(this, container, target);

        var tSize = this.getLayoutTargetSize(),
            items = this.getVisibleItems(container),
            calcs = this.calculateChildBoxes(items, tSize),
            boxes = calcs.boxes,
            meta  = calcs.meta;
        
        //invoke the overflow handler, if one is configured
        if (tSize.width > 0) {
            var handler = this.overflowHandler,
                method  = meta.tooNarrow ? 'handleOverflow' : 'clearOverflow';
            
            var results = handler[method](calcs, tSize);
            
            if (results) {
                if (results.targetSize) {
                    tSize = results.targetSize;
                }
                
                if (results.recalculate) {
                    items = this.getVisibleItems(container);
                    calcs = this.calculateChildBoxes(items, tSize);
                    boxes = calcs.boxes;
                }
            }
        }
        
        /**
         * @private
         * @property layoutTargetLastSize
         * @type Object
         * Private cache of the last measured size of the layout target. This should never be used except by
         * BoxLayout subclasses during their onLayout run.
         */
        this.layoutTargetLastSize = tSize;
        
        /**
         * @private
         * @property childBoxCache
         * @type Array
         * Array of the last calculated height, width, top and left positions of each visible rendered component
         * within the Box layout.
         */
        this.childBoxCache = calcs;
        
        this.updateInnerCtSize(tSize, calcs);
        this.updateChildBoxes(boxes);

        // Putting a box layout into an overflowed container is NOT correct and will make a second layout pass necessary.
        this.handleTargetOverflow(tSize, container, target);
    },

    /**
     * Resizes and repositions each child component
     * @param {Array} boxes The box measurements
     */
    updateChildBoxes: function(boxes) {
        for (var i = 0, length = boxes.length; i < length; i++) {
            var box  = boxes[i],
                comp = box.component;
            
            if (box.dirtySize) {
                comp.setSize(box.width, box.height);
            }
            // Don't set positions to NaN
            if (isNaN(box.left) || isNaN(box.top)) {
                continue;
            }
            
            comp.setPosition(box.left, box.top);
        }
    },

    /**
     * @private
     * Called by onRender just before the child components are sized and positioned. This resizes the innerCt
     * to make sure all child items fit within it. We call this before sizing the children because if our child
     * items are larger than the previous innerCt size the browser will insert scrollbars and then remove them
     * again immediately afterwards, giving a performance hit.
     * Subclasses should provide an implementation.
     * @param {Object} currentSize The current height and width of the innerCt
     * @param {Array} calculations The new box calculations of all items to be laid out
     */
    updateInnerCtSize: function(tSize, calcs) {
        var align   = this.align,
            padding = this.padding,
            width   = tSize.width,
            height  = tSize.height;
        
        if (this.type == 'hbox') {
            var innerCtWidth  = width,
                innerCtHeight = calcs.meta.maxHeight + padding.top + padding.bottom;

            if (align == 'stretch') {
                innerCtHeight = height;
            } else if (align == 'middle') {
                innerCtHeight = Math.max(height, innerCtHeight);
            }
        } else {
            var innerCtHeight = height,
                innerCtWidth  = calcs.meta.maxWidth + padding.left + padding.right;

            if (align == 'stretch') {
                innerCtWidth = width;
            } else if (align == 'center') {
                innerCtWidth = Math.max(width, innerCtWidth);
            }
        }

        this.innerCt.setSize(innerCtWidth || undefined, innerCtHeight || undefined);
    },

    /**
     * @private
     * This should be called after onLayout of any BoxLayout subclass. If the target's overflow is not set to 'hidden',
     * we need to lay out a second time because the scrollbars may have modified the height and width of the layout
     * target. Having a Box layout inside such a target is therefore not recommended.
     * @param {Object} previousTargetSize The size and height of the layout target before we just laid out
     * @param {Ext.Container} container The container
     * @param {Ext.Element} target The target element
     */
    handleTargetOverflow: function(previousTargetSize, container, target) {
        var overflow = target.getStyle('overflow');

        if (overflow && overflow != 'hidden' &&!this.adjustmentPass) {
            var newTargetSize = this.getLayoutTargetSize();
            if (newTargetSize.width != previousTargetSize.width || newTargetSize.height != previousTargetSize.height){
                this.adjustmentPass = true;
                this.onLayout(container, target);
            }
        }

        delete this.adjustmentPass;
    },

    // private
    isValidParent : function(c, target) {
        return this.innerCt && c.getPositionEl().dom.parentNode == this.innerCt.dom;
    },

    /**
     * @private
     * Returns all items that are both rendered and visible
     * @return {Array} All matching items
     */
    getVisibleItems: function(ct) {
        var ct  = ct || this.container,
            t   = ct.getLayoutTarget(),
            cti = ct.items.items,
            len = cti.length,

            i, c, items = [];

        for (i = 0; i < len; i++) {
            if((c = cti[i]).rendered && this.isValidParent(c, t) && c.hidden !== true  && c.collapsed !== true && c.shouldLayout !== false){
                items.push(c);
            }
        }

        return items;
    },

    // private
    renderAll : function(ct, target) {
        if (!this.innerCt) {
            // the innerCt prevents wrapping and shuffling while the container is resizing
            this.innerCt = target.createChild({cls:this.innerCls});
            this.padding = this.parseMargins(this.padding);
        }
        Ext.layout.BoxLayout.superclass.renderAll.call(this, ct, this.innerCt);
    },

    getLayoutTargetSize : function() {
        var target = this.container.getLayoutTarget(), ret;
        
        if (target) {
            ret = target.getViewSize();

            // IE in strict mode will return a width of 0 on the 1st pass of getViewSize.
            // Use getStyleSize to verify the 0 width, the adjustment pass will then work properly
            // with getViewSize
            if (Ext.isIE && Ext.isStrict && ret.width == 0){
                ret =  target.getStyleSize();
            }

            ret.width  -= target.getPadding('lr');
            ret.height -= target.getPadding('tb');
        }
        
        return ret;
    },

    // private
    renderItem : function(c) {
        if(Ext.isString(c.margins)){
            c.margins = this.parseMargins(c.margins);
        }else if(!c.margins){
            c.margins = this.defaultMargins;
        }
        Ext.layout.BoxLayout.superclass.renderItem.apply(this, arguments);
    },
    
    /**
     * @private
     */
    destroy: function() {
        Ext.destroy(this.overflowHandler);
        
        Ext.layout.BoxLayout.superclass.destroy.apply(this, arguments);
    }
});



Ext.ns('Ext.layout.boxOverflow');

/**
 * @class Ext.layout.boxOverflow.None
 * @extends Object
 * Base class for Box Layout overflow handlers. These specialized classes are invoked when a Box Layout
 * (either an HBox or a VBox) has child items that are either too wide (for HBox) or too tall (for VBox)
 * for its container.
 */

Ext.layout.boxOverflow.None = Ext.extend(Object, {
    constructor: function(layout, config) {
        this.layout = layout;
        
        Ext.apply(this, config || {});
    },
    
    handleOverflow: Ext.emptyFn,
    
    clearOverflow: Ext.emptyFn
});


Ext.layout.boxOverflow.none = Ext.layout.boxOverflow.None;
