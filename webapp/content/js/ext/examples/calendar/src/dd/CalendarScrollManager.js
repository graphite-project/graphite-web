/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.dd.ScrollManager
 * <p>Provides automatic scrolling of overflow regions in the page during drag operations.</p>
 * <p>The ScrollManager configs will be used as the defaults for any scroll container registered with it,
 * but you can also override most of the configs per scroll container by adding a 
 * <tt>ddScrollConfig</tt> object to the target element that contains these properties: {@link #hthresh},
 * {@link #vthresh}, {@link #increment} and {@link #frequency}.  Example usage:
 * <pre><code>
var el = Ext.get('scroll-ct');
el.ddScrollConfig = {
    vthresh: 50,
    hthresh: -1,
    frequency: 100,
    increment: 200
};
Ext.dd.ScrollManager.register(el);
</code></pre>
 * <b>Note: This class uses "Point Mode" and is untested in "Intersect Mode".</b>
 * @singleton
 */
Ext.dd.ScrollManager = function() {
    var ddm = Ext.dd.DragDropMgr,
        els = {},
        dragEl = null,
        proc = {},
        onStop = function(e) {
            dragEl = null;
            clearProc();
        },
        triggerRefresh = function() {
            if (ddm.dragCurrent) {
                ddm.refreshCache(ddm.dragCurrent.groups);
            }
        },
        doScroll = function() {
            if (ddm.dragCurrent) {
                var dds = Ext.dd.ScrollManager,
                    inc = proc.el.ddScrollConfig ? proc.el.ddScrollConfig.increment: dds.increment;
                if (!dds.animate) {
                    if (proc.el.scroll(proc.dir, inc)) {
                        triggerRefresh();
                    }
                } else {
                    proc.el.scroll(proc.dir, inc, true, dds.animDuration, triggerRefresh);
                }
            }
        },
        clearProc = function() {
            if (proc.id) {
                clearInterval(proc.id);
            }
            proc.id = 0;
            proc.el = null;
            proc.dir = "";
        },
        startProc = function(el, dir) {
            clearProc();
            proc.el = el;
            proc.dir = dir;
            var freq = (el.ddScrollConfig && el.ddScrollConfig.frequency) ?
                            el.ddScrollConfig.frequency: Ext.dd.ScrollManager.frequency,
                group = el.ddScrollConfig ? el.ddScrollConfig.ddGroup: undefined;

            if (group === undefined || ddm.dragCurrent.ddGroup == group) {
                proc.id = setInterval(doScroll, freq);
            }
        },
        onFire = function(e, isDrop) {
            if (isDrop || !ddm.dragCurrent) {
                return;
            }
            var dds = Ext.dd.ScrollManager;
            if (!dragEl || dragEl != ddm.dragCurrent) {
                dragEl = ddm.dragCurrent;
                // refresh regions on drag start
                dds.refreshCache();
            }

            var xy = Ext.lib.Event.getXY(e),
                pt = new Ext.lib.Point(xy[0], xy[1]),
                id,
                el,
                r,
                c;
            for (id in els) {
                if (els.hasOwnProperty(id)) {
                    el = els[id];
                    r = el._region;
                    c = el.ddScrollConfig ? el.ddScrollConfig: dds;
                    if (r && r.contains(pt) && el.isScrollable()) {
                        if (r.bottom - pt.y <= c.vthresh) {
                            if (proc.el != el) {
                                startProc(el, "down");
                            }
                            return;
                        } else if (r.right - pt.x <= c.hthresh) {
                            if (proc.el != el) {
                                startProc(el, "left");
                            }
                            return;
                        } else if (pt.y - r.top <= c.vthresh) {
                            if (proc.el != el) {
                                startProc(el, "up");
                            }
                            return;
                        } else if (pt.x - r.left <= c.hthresh) {
                            if (proc.el != el) {
                                startProc(el, "right");
                            }
                            return;
                        }
                    }
                }
            }
            clearProc();
        };

    ddm.fireEvents = ddm.fireEvents.createSequence(onFire, ddm);
    ddm.stopDrag = ddm.stopDrag.createSequence(onStop, ddm);

    return {
        /**
         * Registers new overflow element(s) to auto scroll
         * @param {Mixed/Array} el The id of or the element to be scrolled or an array of either
         */
        register: function(el) {
            if (Ext.isArray(el)) {
                var i = 0,
                    len = el.length;
                for (; i < len; i++) {
                    this.register(el[i]);
                }
            } else {
                el = Ext.get(el);
                els[el.id] = el;
            }
        },

        /**
         * Unregisters overflow element(s) so they are no longer scrolled
         * @param {Mixed/Array} el The id of or the element to be removed or an array of either
         */
        unregister: function(el) {
            if (Ext.isArray(el)) {
                var i = 0,
                    len = el.length;
                for (; i < len; i++) {
                    this.unregister(el[i]);
                }
            } else {
                el = Ext.get(el);
                delete els[el.id];
            }
        },

        /**
         * The number of pixels from the top or bottom edge of a container the pointer needs to be to
         * trigger scrolling (defaults to 25)
         * @type Number
         */
        vthresh: 25,
        /**
         * The number of pixels from the right or left edge of a container the pointer needs to be to
         * trigger scrolling (defaults to 25)
         * @type Number
         */
        hthresh: 25,

        /**
         * The number of pixels to scroll in each scroll increment (defaults to 50)
         * @type Number
         */
        increment: 100,

        /**
         * The frequency of scrolls in milliseconds (defaults to 500)
         * @type Number
         */
        frequency: 500,

        /**
         * True to animate the scroll (defaults to true)
         * @type Boolean
         */
        animate: true,

        /**
         * The animation duration in seconds - 
         * MUST BE less than Ext.dd.ScrollManager.frequency! (defaults to .4)
         * @type Number
         */
        animDuration: 0.4,

        /**
         * Manually trigger a cache refresh.
         */
        refreshCache: function() {
            var id;
            for (id in els) {
                if (els.hasOwnProperty(id)) {
                    if (typeof els[id] == 'object') {
                        // for people extending the object prototype
                        els[id]._region = els[id].getRegion();
                    }
                }
            }
        }
    };
}();