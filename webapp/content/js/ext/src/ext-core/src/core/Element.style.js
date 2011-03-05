/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.Element
 */
Ext.Element.addMethods(function(){
    // local style camelizing for speed
    var supports = Ext.supports,
        propCache = {},
        camelRe = /(-[a-z])/gi,
        view = document.defaultView,
        opacityRe = /alpha\(opacity=(.*)\)/i,
        trimRe = /^\s+|\s+$/g,
        EL = Ext.Element,
        spacesRe = /\s+/,
        wordsRe = /\w/g,
        PADDING = "padding",
        MARGIN = "margin",
        BORDER = "border",
        LEFT = "-left",
        RIGHT = "-right",
        TOP = "-top",
        BOTTOM = "-bottom",
        WIDTH = "-width",
        MATH = Math,
        HIDDEN = 'hidden',
        ISCLIPPED = 'isClipped',
        OVERFLOW = 'overflow',
        OVERFLOWX = 'overflow-x',
        OVERFLOWY = 'overflow-y',
        ORIGINALCLIP = 'originalClip',
        // special markup used throughout Ext when box wrapping elements
        borders = {l: BORDER + LEFT + WIDTH, r: BORDER + RIGHT + WIDTH, t: BORDER + TOP + WIDTH, b: BORDER + BOTTOM + WIDTH},
        paddings = {l: PADDING + LEFT, r: PADDING + RIGHT, t: PADDING + TOP, b: PADDING + BOTTOM},
        margins = {l: MARGIN + LEFT, r: MARGIN + RIGHT, t: MARGIN + TOP, b: MARGIN + BOTTOM},
        data = Ext.Element.data;


    // private
    function camelFn(m, a) {
        return a.charAt(1).toUpperCase();
    }

    function chkCache(prop) {
        return propCache[prop] || (propCache[prop] = prop == 'float' ? (supports.cssFloat ? 'cssFloat' : 'styleFloat') : prop.replace(camelRe, camelFn));
    }

    return {
        // private  ==> used by Fx
        adjustWidth : function(width) {
            var me = this;
            var isNum = (typeof width == "number");
            if(isNum && me.autoBoxAdjust && !me.isBorderBox()){
               width -= (me.getBorderWidth("lr") + me.getPadding("lr"));
            }
            return (isNum && width < 0) ? 0 : width;
        },

        // private   ==> used by Fx
        adjustHeight : function(height) {
            var me = this;
            var isNum = (typeof height == "number");
            if(isNum && me.autoBoxAdjust && !me.isBorderBox()){
               height -= (me.getBorderWidth("tb") + me.getPadding("tb"));
            }
            return (isNum && height < 0) ? 0 : height;
        },


        /**
         * Adds one or more CSS classes to the element. Duplicate classes are automatically filtered out.
         * @param {String/Array} className The CSS class to add, or an array of classes
         * @return {Ext.Element} this
         */
        addClass : function(className){
            var me = this,
                i,
                len,
                v,
                cls = [];
            // Separate case is for speed
            if (!Ext.isArray(className)) {
                if (typeof className == 'string' && !this.hasClass(className)) {
                    me.dom.className += " " + className;
                }
            }
            else {
                for (i = 0, len = className.length; i < len; i++) {
                    v = className[i];
                    if (typeof v == 'string' && (' ' + me.dom.className + ' ').indexOf(' ' + v + ' ') == -1) {
                        cls.push(v);
                    }
                }
                if (cls.length) {
                    me.dom.className += " " + cls.join(" ");
                }
            }
            return me;
        },

        /**
         * Removes one or more CSS classes from the element.
         * @param {String/Array} className The CSS class to remove, or an array of classes
         * @return {Ext.Element} this
         */
        removeClass : function(className){
            var me = this,
                i,
                idx,
                len,
                cls,
                elClasses;
            if (!Ext.isArray(className)){
                className = [className];
            }
            if (me.dom && me.dom.className) {
                elClasses = me.dom.className.replace(trimRe, '').split(spacesRe);
                for (i = 0, len = className.length; i < len; i++) {
                    cls = className[i];
                    if (typeof cls == 'string') {
                        cls = cls.replace(trimRe, '');
                        idx = elClasses.indexOf(cls);
                        if (idx != -1) {
                            elClasses.splice(idx, 1);
                        }
                    }
                }
                me.dom.className = elClasses.join(" ");
            }
            return me;
        },

        /**
         * Adds one or more CSS classes to this element and removes the same class(es) from all siblings.
         * @param {String/Array} className The CSS class to add, or an array of classes
         * @return {Ext.Element} this
         */
        radioClass : function(className){
            var cn = this.dom.parentNode.childNodes,
                v,
                i,
                len;
            className = Ext.isArray(className) ? className : [className];
            for (i = 0, len = cn.length; i < len; i++) {
                v = cn[i];
                if (v && v.nodeType == 1) {
                    Ext.fly(v, '_internal').removeClass(className);
                }
            };
            return this.addClass(className);
        },

        /**
         * Toggles the specified CSS class on this element (removes it if it already exists, otherwise adds it).
         * @param {String} className The CSS class to toggle
         * @return {Ext.Element} this
         */
        toggleClass : function(className){
            return this.hasClass(className) ? this.removeClass(className) : this.addClass(className);
        },

        /**
         * Checks if the specified CSS class exists on this element's DOM node.
         * @param {String} className The CSS class to check for
         * @return {Boolean} True if the class exists, else false
         */
        hasClass : function(className){
            return className && (' '+this.dom.className+' ').indexOf(' '+className+' ') != -1;
        },

        /**
         * Replaces a CSS class on the element with another.  If the old name does not exist, the new name will simply be added.
         * @param {String} oldClassName The CSS class to replace
         * @param {String} newClassName The replacement CSS class
         * @return {Ext.Element} this
         */
        replaceClass : function(oldClassName, newClassName){
            return this.removeClass(oldClassName).addClass(newClassName);
        },

        isStyle : function(style, val) {
            return this.getStyle(style) == val;
        },

        /**
         * Normalizes currentStyle and computedStyle.
         * @param {String} property The style property whose value is returned.
         * @return {String} The current value of the style property for this element.
         */
        getStyle : function(){
            return view && view.getComputedStyle ?
                function(prop){
                    var el = this.dom,
                        v,
                        cs,
                        out,
                        display;

                    if(el == document){
                        return null;
                    }
                    prop = chkCache(prop);
                    out = (v = el.style[prop]) ? v :
                           (cs = view.getComputedStyle(el, "")) ? cs[prop] : null;
                           
                    // Ignore cases when the margin is correctly reported as 0, the bug only shows
                    // numbers larger.
                    if(prop == 'marginRight' && out != '0px' && !supports.correctRightMargin){
                        display = el.style.display;
                        el.style.display = 'inline-block';
                        out = view.getComputedStyle(el, '').marginRight;
                        el.style.display = display;
                    }
                    
                    if(prop == 'backgroundColor' && out == 'rgba(0, 0, 0, 0)' && !supports.correctTransparentColor){
                        out = 'transparent';
                    }
                    return out;
                } :
                function(prop){
                    var el = this.dom,
                        m,
                        cs;

                    if(el == document) return null;
                    if (prop == 'opacity') {
                        if (el.style.filter.match) {
                            if(m = el.style.filter.match(opacityRe)){
                                var fv = parseFloat(m[1]);
                                if(!isNaN(fv)){
                                    return fv ? fv / 100 : 0;
                                }
                            }
                        }
                        return 1;
                    }
                    prop = chkCache(prop);
                    return el.style[prop] || ((cs = el.currentStyle) ? cs[prop] : null);
                };
        }(),

        /**
         * Return the CSS color for the specified CSS attribute. rgb, 3 digit (like #fff) and valid values
         * are convert to standard 6 digit hex color.
         * @param {String} attr The css attribute
         * @param {String} defaultValue The default value to use when a valid color isn't found
         * @param {String} prefix (optional) defaults to #. Use an empty string when working with
         * color anims.
         */
        getColor : function(attr, defaultValue, prefix){
            var v = this.getStyle(attr),
                color = (typeof prefix != 'undefined') ? prefix : '#',
                h;

            if(!v || (/transparent|inherit/.test(v))) {
                return defaultValue;
            }
            if(/^r/.test(v)){
                Ext.each(v.slice(4, v.length -1).split(','), function(s){
                    h = parseInt(s, 10);
                    color += (h < 16 ? '0' : '') + h.toString(16);
                });
            }else{
                v = v.replace('#', '');
                color += v.length == 3 ? v.replace(/^(\w)(\w)(\w)$/, '$1$1$2$2$3$3') : v;
            }
            return(color.length > 5 ? color.toLowerCase() : defaultValue);
        },

        /**
         * Wrapper for setting style properties, also takes single object parameter of multiple styles.
         * @param {String/Object} property The style property to be set, or an object of multiple styles.
         * @param {String} value (optional) The value to apply to the given property, or null if an object was passed.
         * @return {Ext.Element} this
         */
        setStyle : function(prop, value){
            var tmp, style;
            
            if (typeof prop != 'object') {
                tmp = {};
                tmp[prop] = value;
                prop = tmp;
            }
            for (style in prop) {
                value = prop[style];
                style == 'opacity' ?
                    this.setOpacity(value) :
                    this.dom.style[chkCache(style)] = value;
            }
            return this;
        },

        /**
         * Set the opacity of the element
         * @param {Float} opacity The new opacity. 0 = transparent, .5 = 50% visibile, 1 = fully visible, etc
         * @param {Boolean/Object} animate (optional) a standard Element animation config object or <tt>true</tt> for
         * the default animation (<tt>{duration: .35, easing: 'easeIn'}</tt>)
         * @return {Ext.Element} this
         */
         setOpacity : function(opacity, animate){
            var me = this,
                s = me.dom.style;

            if(!animate || !me.anim){
                if(Ext.isIE){
                    var opac = opacity < 1 ? 'alpha(opacity=' + opacity * 100 + ')' : '',
                    val = s.filter.replace(opacityRe, '').replace(trimRe, '');

                    s.zoom = 1;
                    s.filter = val + (val.length > 0 ? ' ' : '') + opac;
                }else{
                    s.opacity = opacity;
                }
            }else{
                me.anim({opacity: {to: opacity}}, me.preanim(arguments, 1), null, .35, 'easeIn');
            }
            return me;
        },

        /**
         * Clears any opacity settings from this element. Required in some cases for IE.
         * @return {Ext.Element} this
         */
        clearOpacity : function(){
            var style = this.dom.style;
            if(Ext.isIE){
                if(!Ext.isEmpty(style.filter)){
                    style.filter = style.filter.replace(opacityRe, '').replace(trimRe, '');
                }
            }else{
                style.opacity = style['-moz-opacity'] = style['-khtml-opacity'] = '';
            }
            return this;
        },

        /**
         * Returns the offset height of the element
         * @param {Boolean} contentHeight (optional) true to get the height minus borders and padding
         * @return {Number} The element's height
         */
        getHeight : function(contentHeight){
            var me = this,
                dom = me.dom,
                hidden = Ext.isIE && me.isStyle('display', 'none'),
                h = MATH.max(dom.offsetHeight, hidden ? 0 : dom.clientHeight) || 0;

            h = !contentHeight ? h : h - me.getBorderWidth("tb") - me.getPadding("tb");
            return h < 0 ? 0 : h;
        },

        /**
         * Returns the offset width of the element
         * @param {Boolean} contentWidth (optional) true to get the width minus borders and padding
         * @return {Number} The element's width
         */
        getWidth : function(contentWidth){
            var me = this,
                dom = me.dom,
                hidden = Ext.isIE && me.isStyle('display', 'none'),
                w = MATH.max(dom.offsetWidth, hidden ? 0 : dom.clientWidth) || 0;
            w = !contentWidth ? w : w - me.getBorderWidth("lr") - me.getPadding("lr");
            return w < 0 ? 0 : w;
        },

        /**
         * Set the width of this Element.
         * @param {Mixed} width The new width. This may be one of:<div class="mdetail-params"><ul>
         * <li>A Number specifying the new width in this Element's {@link #defaultUnit}s (by default, pixels).</li>
         * <li>A String used to set the CSS width style. Animation may <b>not</b> be used.
         * </ul></div>
         * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
         * @return {Ext.Element} this
         */
        setWidth : function(width, animate){
            var me = this;
            width = me.adjustWidth(width);
            !animate || !me.anim ?
                me.dom.style.width = me.addUnits(width) :
                me.anim({width : {to : width}}, me.preanim(arguments, 1));
            return me;
        },

        /**
         * Set the height of this Element.
         * <pre><code>
// change the height to 200px and animate with default configuration
Ext.fly('elementId').setHeight(200, true);

// change the height to 150px and animate with a custom configuration
Ext.fly('elId').setHeight(150, {
    duration : .5, // animation will have a duration of .5 seconds
    // will change the content to "finished"
    callback: function(){ this.{@link #update}("finished"); }
});
         * </code></pre>
         * @param {Mixed} height The new height. This may be one of:<div class="mdetail-params"><ul>
         * <li>A Number specifying the new height in this Element's {@link #defaultUnit}s (by default, pixels.)</li>
         * <li>A String used to set the CSS height style. Animation may <b>not</b> be used.</li>
         * </ul></div>
         * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
         * @return {Ext.Element} this
         */
         setHeight : function(height, animate){
            var me = this;
            height = me.adjustHeight(height);
            !animate || !me.anim ?
                me.dom.style.height = me.addUnits(height) :
                me.anim({height : {to : height}}, me.preanim(arguments, 1));
            return me;
        },

        /**
         * Gets the width of the border(s) for the specified side(s)
         * @param {String} side Can be t, l, r, b or any combination of those to add multiple values. For example,
         * passing <tt>'lr'</tt> would get the border <b><u>l</u></b>eft width + the border <b><u>r</u></b>ight width.
         * @return {Number} The width of the sides passed added together
         */
        getBorderWidth : function(side){
            return this.addStyles(side, borders);
        },

        /**
         * Gets the width of the padding(s) for the specified side(s)
         * @param {String} side Can be t, l, r, b or any combination of those to add multiple values. For example,
         * passing <tt>'lr'</tt> would get the padding <b><u>l</u></b>eft + the padding <b><u>r</u></b>ight.
         * @return {Number} The padding of the sides passed added together
         */
        getPadding : function(side){
            return this.addStyles(side, paddings);
        },

        /**
         *  Store the current overflow setting and clip overflow on the element - use <tt>{@link #unclip}</tt> to remove
         * @return {Ext.Element} this
         */
        clip : function(){
            var me = this,
                dom = me.dom;

            if(!data(dom, ISCLIPPED)){
                data(dom, ISCLIPPED, true);
                data(dom, ORIGINALCLIP, {
                    o: me.getStyle(OVERFLOW),
                    x: me.getStyle(OVERFLOWX),
                    y: me.getStyle(OVERFLOWY)
                });
                me.setStyle(OVERFLOW, HIDDEN);
                me.setStyle(OVERFLOWX, HIDDEN);
                me.setStyle(OVERFLOWY, HIDDEN);
            }
            return me;
        },

        /**
         *  Return clipping (overflow) to original clipping before <tt>{@link #clip}</tt> was called
         * @return {Ext.Element} this
         */
        unclip : function(){
            var me = this,
                dom = me.dom;

            if(data(dom, ISCLIPPED)){
                data(dom, ISCLIPPED, false);
                var o = data(dom, ORIGINALCLIP);
                if(o.o){
                    me.setStyle(OVERFLOW, o.o);
                }
                if(o.x){
                    me.setStyle(OVERFLOWX, o.x);
                }
                if(o.y){
                    me.setStyle(OVERFLOWY, o.y);
                }
            }
            return me;
        },

        // private
        addStyles : function(sides, styles){
            var ttlSize = 0,
                sidesArr = sides.match(wordsRe),
                side,
                size,
                i,
                len = sidesArr.length;
            for (i = 0; i < len; i++) {
                side = sidesArr[i];
                size = side && parseInt(this.getStyle(styles[side]), 10);
                if (size) {
                    ttlSize += MATH.abs(size);
                }
            }
            return ttlSize;
        },

        margins : margins
    };
}()
);
