/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.Shadow
 * Simple class that can provide a shadow effect for any element.  Note that the element MUST be absolutely positioned,
 * and the shadow does not provide any shimming.  This should be used only in simple cases -- for more advanced
 * functionality that can also provide the same shadow effect, see the {@link Ext.Layer} class.
 * @constructor
 * Create a new Shadow
 * @param {Object} config The config object
 */
Ext.Shadow = function(config) {
    Ext.apply(this, config);
    if (typeof this.mode != "string") {
        this.mode = this.defaultMode;
    }
    var o = this.offset,
        a = {
            h: 0
        },
        rad = Math.floor(this.offset / 2);
    switch (this.mode.toLowerCase()) {
        // all this hideous nonsense calculates the various offsets for shadows
        case "drop":
            a.w = 0;
            a.l = a.t = o;
            a.t -= 1;
            if (Ext.isIE) {
                a.l -= this.offset + rad;
                a.t -= this.offset + rad;
                a.w -= rad;
                a.h -= rad;
                a.t += 1;
            }
        break;
        case "sides":
            a.w = (o * 2);
            a.l = -o;
            a.t = o - 1;
            if (Ext.isIE) {
                a.l -= (this.offset - rad);
                a.t -= this.offset + rad;
                a.l += 1;
                a.w -= (this.offset - rad) * 2;
                a.w -= rad + 1;
                a.h -= 1;
            }
        break;
        case "frame":
            a.w = a.h = (o * 2);
            a.l = a.t = -o;
            a.t += 1;
            a.h -= 2;
            if (Ext.isIE) {
                a.l -= (this.offset - rad);
                a.t -= (this.offset - rad);
                a.l += 1;
                a.w -= (this.offset + rad + 1);
                a.h -= (this.offset + rad);
                a.h += 1;
            }
        break;
    };

    this.adjusts = a;
};

Ext.Shadow.prototype = {
    /**
     * @cfg {String} mode
     * The shadow display mode.  Supports the following options:<div class="mdetail-params"><ul>
     * <li><b><tt>sides</tt></b> : Shadow displays on both sides and bottom only</li>
     * <li><b><tt>frame</tt></b> : Shadow displays equally on all four sides</li>
     * <li><b><tt>drop</tt></b> : Traditional bottom-right drop shadow</li>
     * </ul></div>
     */
    /**
     * @cfg {String} offset
     * The number of pixels to offset the shadow from the element (defaults to <tt>4</tt>)
     */
    offset: 4,

    // private
    defaultMode: "drop",

    /**
     * Displays the shadow under the target element
     * @param {Mixed} targetEl The id or element under which the shadow should display
     */
    show: function(target) {
        target = Ext.get(target);
        if (!this.el) {
            this.el = Ext.Shadow.Pool.pull();
            if (this.el.dom.nextSibling != target.dom) {
                this.el.insertBefore(target);
            }
        }
        this.el.setStyle("z-index", this.zIndex || parseInt(target.getStyle("z-index"), 10) - 1);
        if (Ext.isIE) {
            this.el.dom.style.filter = "progid:DXImageTransform.Microsoft.alpha(opacity=50) progid:DXImageTransform.Microsoft.Blur(pixelradius=" + (this.offset) + ")";
        }
        this.realign(
        target.getLeft(true),
        target.getTop(true),
        target.getWidth(),
        target.getHeight()
        );
        this.el.dom.style.display = "block";
    },

    /**
     * Returns true if the shadow is visible, else false
     */
    isVisible: function() {
        return this.el ? true: false;
    },

    /**
     * Direct alignment when values are already available. Show must be called at least once before
     * calling this method to ensure it is initialized.
     * @param {Number} left The target element left position
     * @param {Number} top The target element top position
     * @param {Number} width The target element width
     * @param {Number} height The target element height
     */
    realign: function(l, t, w, h) {
        if (!this.el) {
            return;
        }
        var a = this.adjusts,
            d = this.el.dom,
            s = d.style,
            iea = 0,
            sw = (w + a.w),
            sh = (h + a.h),
            sws = sw + "px",
            shs = sh + "px",
            cn,
            sww;
        s.left = (l + a.l) + "px";
        s.top = (t + a.t) + "px";
        if (s.width != sws || s.height != shs) {
            s.width = sws;
            s.height = shs;
            if (!Ext.isIE) {
                cn = d.childNodes;
                sww = Math.max(0, (sw - 12)) + "px";
                cn[0].childNodes[1].style.width = sww;
                cn[1].childNodes[1].style.width = sww;
                cn[2].childNodes[1].style.width = sww;
                cn[1].style.height = Math.max(0, (sh - 12)) + "px";
            }
        }
    },

    /**
     * Hides this shadow
     */
    hide: function() {
        if (this.el) {
            this.el.dom.style.display = "none";
            Ext.Shadow.Pool.push(this.el);
            delete this.el;
        }
    },

    /**
     * Adjust the z-index of this shadow
     * @param {Number} zindex The new z-index
     */
    setZIndex: function(z) {
        this.zIndex = z;
        if (this.el) {
            this.el.setStyle("z-index", z);
        }
    }
};

// Private utility class that manages the internal Shadow cache
Ext.Shadow.Pool = function() {
    var p = [],
        markup = Ext.isIE ?
            '<div class="x-ie-shadow"></div>':
            '<div class="x-shadow"><div class="xst"><div class="xstl"></div><div class="xstc"></div><div class="xstr"></div></div><div class="xsc"><div class="xsml"></div><div class="xsmc"></div><div class="xsmr"></div></div><div class="xsb"><div class="xsbl"></div><div class="xsbc"></div><div class="xsbr"></div></div></div>';
    return {
        pull: function() {
            var sh = p.shift();
            if (!sh) {
                sh = Ext.get(Ext.DomHelper.insertHtml("beforeBegin", document.body.firstChild, markup));
                sh.autoBoxAdjust = false;
            }
            return sh;
        },

        push: function(sh) {
            p.push(sh);
        }
    };
}();