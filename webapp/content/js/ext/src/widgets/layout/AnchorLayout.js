/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.layout.AnchorLayout
 * @extends Ext.layout.ContainerLayout
 * <p>This is a layout that enables anchoring of contained elements relative to the container's dimensions.
 * If the container is resized, all anchored items are automatically rerendered according to their
 * <b><tt>{@link #anchor}</tt></b> rules.</p>
 * <p>This class is intended to be extended or created via the layout:'anchor' {@link Ext.Container#layout}
 * config, and should generally not need to be created directly via the new keyword.</p>
 * <p>AnchorLayout does not have any direct config options (other than inherited ones). By default,
 * AnchorLayout will calculate anchor measurements based on the size of the container itself. However, the
 * container using the AnchorLayout can supply an anchoring-specific config property of <b>anchorSize</b>.
 * If anchorSize is specifed, the layout will use it as a virtual container for the purposes of calculating
 * anchor measurements based on it instead, allowing the container to be sized independently of the anchoring
 * logic if necessary.  For example:</p>
 * <pre><code>
var viewport = new Ext.Viewport({
    layout:'anchor',
    anchorSize: {width:800, height:600},
    items:[{
        title:'Item 1',
        html:'Content 1',
        width:800,
        anchor:'right 20%'
    },{
        title:'Item 2',
        html:'Content 2',
        width:300,
        anchor:'50% 30%'
    },{
        title:'Item 3',
        html:'Content 3',
        width:600,
        anchor:'-100 50%'
    }]
});
 * </code></pre>
 */
Ext.layout.AnchorLayout = Ext.extend(Ext.layout.ContainerLayout, {
    /**
     * @cfg {String} anchor
     * <p>This configuation option is to be applied to <b>child <tt>items</tt></b> of a container managed by
     * this layout (ie. configured with <tt>layout:'anchor'</tt>).</p><br/>
     *
     * <p>This value is what tells the layout how an item should be anchored to the container. <tt>items</tt>
     * added to an AnchorLayout accept an anchoring-specific config property of <b>anchor</b> which is a string
     * containing two values: the horizontal anchor value and the vertical anchor value (for example, '100% 50%').
     * The following types of anchor values are supported:<div class="mdetail-params"><ul>
     *
     * <li><b>Percentage</b> : Any value between 1 and 100, expressed as a percentage.<div class="sub-desc">
     * The first anchor is the percentage width that the item should take up within the container, and the
     * second is the percentage height.  For example:<pre><code>
// two values specified
anchor: '100% 50%' // render item complete width of the container and
                   // 1/2 height of the container
// one value specified
anchor: '100%'     // the width value; the height will default to auto
     * </code></pre></div></li>
     *
     * <li><b>Offsets</b> : Any positive or negative integer value.<div class="sub-desc">
     * This is a raw adjustment where the first anchor is the offset from the right edge of the container,
     * and the second is the offset from the bottom edge. For example:<pre><code>
// two values specified
anchor: '-50 -100' // render item the complete width of the container
                   // minus 50 pixels and
                   // the complete height minus 100 pixels.
// one value specified
anchor: '-50'      // anchor value is assumed to be the right offset value
                   // bottom offset will default to 0
     * </code></pre></div></li>
     *
     * <li><b>Sides</b> : Valid values are <tt>'right'</tt> (or <tt>'r'</tt>) and <tt>'bottom'</tt>
     * (or <tt>'b'</tt>).<div class="sub-desc">
     * Either the container must have a fixed size or an anchorSize config value defined at render time in
     * order for these to have any effect.</div></li>
     *
     * <li><b>Mixed</b> : <div class="sub-desc">
     * Anchor values can also be mixed as needed.  For example, to render the width offset from the container
     * right edge by 50 pixels and 75% of the container's height use:
     * <pre><code>
anchor: '-50 75%'
     * </code></pre></div></li>
     *
     *
     * </ul></div>
     */

    // private
    monitorResize : true,

    type : 'anchor',

    /**
     * @cfg {String} defaultAnchor
     *
     * default anchor for all child container items applied if no anchor or specific width is set on the child item.  Defaults to '100%'.
     *
     */
    defaultAnchor : '100%',

    parseAnchorRE : /^(r|right|b|bottom)$/i,


    getLayoutTargetSize : function() {
        var target = this.container.getLayoutTarget(), ret = {};
        if (target) {
            ret = target.getViewSize();

            // IE in strict mode will return a width of 0 on the 1st pass of getViewSize.
            // Use getStyleSize to verify the 0 width, the adjustment pass will then work properly
            // with getViewSize
            if (Ext.isIE && Ext.isStrict && ret.width == 0){
                ret =  target.getStyleSize();
            }
            ret.width -= target.getPadding('lr');
            ret.height -= target.getPadding('tb');
        }
        return ret;
    },

    // private
    onLayout : function(container, target) {
        Ext.layout.AnchorLayout.superclass.onLayout.call(this, container, target);

        var size = this.getLayoutTargetSize(),
            containerWidth = size.width,
            containerHeight = size.height,
            overflow = target.getStyle('overflow'),
            components = this.getRenderedItems(container),
            len = components.length,
            boxes = [],
            box,
            anchorWidth,
            anchorHeight,
            component,
            anchorSpec,
            calcWidth,
            calcHeight,
            anchorsArray,
            totalHeight = 0,
            i,
            el;

        if(containerWidth < 20 && containerHeight < 20){
            return;
        }

        // find the container anchoring size
        if(container.anchorSize) {
            if(typeof container.anchorSize == 'number') {
                anchorWidth = container.anchorSize;
            } else {
                anchorWidth = container.anchorSize.width;
                anchorHeight = container.anchorSize.height;
            }
        } else {
            anchorWidth = container.initialConfig.width;
            anchorHeight = container.initialConfig.height;
        }

        for(i = 0; i < len; i++) {
            component = components[i];
            el = component.getPositionEl();

            // If a child container item has no anchor and no specific width, set the child to the default anchor size
            if (!component.anchor && component.items && !Ext.isNumber(component.width) && !(Ext.isIE6 && Ext.isStrict)){
                component.anchor = this.defaultAnchor;
            }

            if(component.anchor) {
                anchorSpec = component.anchorSpec;
                // cache all anchor values
                if(!anchorSpec){
                    anchorsArray = component.anchor.split(' ');
                    component.anchorSpec = anchorSpec = {
                        right: this.parseAnchor(anchorsArray[0], component.initialConfig.width, anchorWidth),
                        bottom: this.parseAnchor(anchorsArray[1], component.initialConfig.height, anchorHeight)
                    };
                }
                calcWidth = anchorSpec.right ? this.adjustWidthAnchor(anchorSpec.right(containerWidth) - el.getMargins('lr'), component) : undefined;
                calcHeight = anchorSpec.bottom ? this.adjustHeightAnchor(anchorSpec.bottom(containerHeight) - el.getMargins('tb'), component) : undefined;

                if(calcWidth || calcHeight) {
                    boxes.push({
                        component: component,
                        width: calcWidth || undefined,
                        height: calcHeight || undefined
                    });
                }
            }
        }
        for (i = 0, len = boxes.length; i < len; i++) {
            box = boxes[i];
            box.component.setSize(box.width, box.height);
        }

        if (overflow && overflow != 'hidden' && !this.adjustmentPass) {
            var newTargetSize = this.getLayoutTargetSize();
            if (newTargetSize.width != size.width || newTargetSize.height != size.height){
                this.adjustmentPass = true;
                this.onLayout(container, target);
            }
        }

        delete this.adjustmentPass;
    },

    // private
    parseAnchor : function(a, start, cstart) {
        if (a && a != 'none') {
            var last;
            // standard anchor
            if (this.parseAnchorRE.test(a)) {
                var diff = cstart - start;
                return function(v){
                    if(v !== last){
                        last = v;
                        return v - diff;
                    }
                };
            // percentage
            } else if(a.indexOf('%') != -1) {
                var ratio = parseFloat(a.replace('%', ''))*.01;
                return function(v){
                    if(v !== last){
                        last = v;
                        return Math.floor(v*ratio);
                    }
                };
            // simple offset adjustment
            } else {
                a = parseInt(a, 10);
                if (!isNaN(a)) {
                    return function(v) {
                        if (v !== last) {
                            last = v;
                            return v + a;
                        }
                    };
                }
            }
        }
        return false;
    },

    // private
    adjustWidthAnchor : function(value, comp){
        return value;
    },

    // private
    adjustHeightAnchor : function(value, comp){
        return value;
    }

    /**
     * @property activeItem
     * @hide
     */
});
Ext.Container.LAYOUTS['anchor'] = Ext.layout.AnchorLayout;
