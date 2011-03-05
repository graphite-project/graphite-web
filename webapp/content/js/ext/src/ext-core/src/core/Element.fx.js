/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.Element
 */
/**
 * Visibility mode constant for use with {@link #setVisibilityMode}. Use visibility to hide element
 * @static
 * @type Number
 */
Ext.Element.VISIBILITY = 1;
/**
 * Visibility mode constant for use with {@link #setVisibilityMode}. Use display to hide element
 * @static
 * @type Number
 */
Ext.Element.DISPLAY = 2;

/**
 * Visibility mode constant for use with {@link #setVisibilityMode}. Use offsets (x and y positioning offscreen)
 * to hide element.
 * @static
 * @type Number
 */
Ext.Element.OFFSETS = 3;


Ext.Element.ASCLASS = 4;

/**
 * Defaults to 'x-hide-nosize'
 * @static
 * @type String
 */
Ext.Element.visibilityCls = 'x-hide-nosize';

Ext.Element.addMethods(function(){
    var El = Ext.Element,
        OPACITY = "opacity",
        VISIBILITY = "visibility",
        DISPLAY = "display",
        HIDDEN = "hidden",
        OFFSETS = "offsets",
        ASCLASS = "asclass",
        NONE = "none",
        NOSIZE = 'nosize',
        ORIGINALDISPLAY = 'originalDisplay',
        VISMODE = 'visibilityMode',
        ISVISIBLE = 'isVisible',
        data = El.data,
        getDisplay = function(dom){
            var d = data(dom, ORIGINALDISPLAY);
            if(d === undefined){
                data(dom, ORIGINALDISPLAY, d = '');
            }
            return d;
        },
        getVisMode = function(dom){
            var m = data(dom, VISMODE);
            if(m === undefined){
                data(dom, VISMODE, m = 1);
            }
            return m;
        };

    return {
        /**
         * The element's default display mode  (defaults to "")
         * @type String
         */
        originalDisplay : "",
        visibilityMode : 1,

        /**
         * Sets the element's visibility mode. When setVisible() is called it
         * will use this to determine whether to set the visibility or the display property.
         * @param {Number} visMode Ext.Element.VISIBILITY or Ext.Element.DISPLAY
         * @return {Ext.Element} this
         */
        setVisibilityMode : function(visMode){
            data(this.dom, VISMODE, visMode);
            return this;
        },

        /**
         * Perform custom animation on this element.
         * <div><ul class="mdetail-params">
         * <li><u>Animation Properties</u></li>
         *
         * <p>The Animation Control Object enables gradual transitions for any member of an
         * element's style object that takes a numeric value including but not limited to
         * these properties:</p><div><ul class="mdetail-params">
         * <li><tt>bottom, top, left, right</tt></li>
         * <li><tt>height, width</tt></li>
         * <li><tt>margin, padding</tt></li>
         * <li><tt>borderWidth</tt></li>
         * <li><tt>opacity</tt></li>
         * <li><tt>fontSize</tt></li>
         * <li><tt>lineHeight</tt></li>
         * </ul></div>
         *
         *
         * <li><u>Animation Property Attributes</u></li>
         *
         * <p>Each Animation Property is a config object with optional properties:</p>
         * <div><ul class="mdetail-params">
         * <li><tt>by</tt>*  : relative change - start at current value, change by this value</li>
         * <li><tt>from</tt> : ignore current value, start from this value</li>
         * <li><tt>to</tt>*  : start at current value, go to this value</li>
         * <li><tt>unit</tt> : any allowable unit specification</li>
         * <p>* do not specify both <tt>to</tt> and <tt>by</tt> for an animation property</p>
         * </ul></div>
         *
         * <li><u>Animation Types</u></li>
         *
         * <p>The supported animation types:</p><div><ul class="mdetail-params">
         * <li><tt>'run'</tt> : Default
         * <pre><code>
var el = Ext.get('complexEl');
el.animate(
    // animation control object
    {
        borderWidth: {to: 3, from: 0},
        opacity: {to: .3, from: 1},
        height: {to: 50, from: el.getHeight()},
        width: {to: 300, from: el.getWidth()},
        top  : {by: - 100, unit: 'px'},
    },
    0.35,      // animation duration
    null,      // callback
    'easeOut', // easing method
    'run'      // animation type ('run','color','motion','scroll')
);
         * </code></pre>
         * </li>
         * <li><tt>'color'</tt>
         * <p>Animates transition of background, text, or border colors.</p>
         * <pre><code>
el.animate(
    // animation control object
    {
        color: { to: '#06e' },
        backgroundColor: { to: '#e06' }
    },
    0.35,      // animation duration
    null,      // callback
    'easeOut', // easing method
    'color'    // animation type ('run','color','motion','scroll')
);
         * </code></pre>
         * </li>
         *
         * <li><tt>'motion'</tt>
         * <p>Animates the motion of an element to/from specific points using optional bezier
         * way points during transit.</p>
         * <pre><code>
el.animate(
    // animation control object
    {
        borderWidth: {to: 3, from: 0},
        opacity: {to: .3, from: 1},
        height: {to: 50, from: el.getHeight()},
        width: {to: 300, from: el.getWidth()},
        top  : {by: - 100, unit: 'px'},
        points: {
            to: [50, 100],  // go to this point
            control: [      // optional bezier way points
                [ 600, 800],
                [-100, 200]
            ]
        }
    },
    3000,      // animation duration (milliseconds!)
    null,      // callback
    'easeOut', // easing method
    'motion'   // animation type ('run','color','motion','scroll')
);
         * </code></pre>
         * </li>
         * <li><tt>'scroll'</tt>
         * <p>Animate horizontal or vertical scrolling of an overflowing page element.</p>
         * <pre><code>
el.animate(
    // animation control object
    {
        scroll: {to: [400, 300]}
    },
    0.35,      // animation duration
    null,      // callback
    'easeOut', // easing method
    'scroll'   // animation type ('run','color','motion','scroll')
);
         * </code></pre>
         * </li>
         * </ul></div>
         *
         * </ul></div>
         *
         * @param {Object} args The animation control args
         * @param {Float} duration (optional) How long the animation lasts in seconds (defaults to <tt>.35</tt>)
         * @param {Function} onComplete (optional) Function to call when animation completes
         * @param {String} easing (optional) {@link Ext.Fx#easing} method to use (defaults to <tt>'easeOut'</tt>)
         * @param {String} animType (optional) <tt>'run'</tt> is the default. Can also be <tt>'color'</tt>,
         * <tt>'motion'</tt>, or <tt>'scroll'</tt>
         * @return {Ext.Element} this
         */
        animate : function(args, duration, onComplete, easing, animType){
            this.anim(args, {duration: duration, callback: onComplete, easing: easing}, animType);
            return this;
        },

        /*
         * @private Internal animation call
         */
        anim : function(args, opt, animType, defaultDur, defaultEase, cb){
            animType = animType || 'run';
            opt = opt || {};
            var me = this,
                anim = Ext.lib.Anim[animType](
                    me.dom,
                    args,
                    (opt.duration || defaultDur) || .35,
                    (opt.easing || defaultEase) || 'easeOut',
                    function(){
                        if(cb) cb.call(me);
                        if(opt.callback) opt.callback.call(opt.scope || me, me, opt);
                    },
                    me
                );
            opt.anim = anim;
            return anim;
        },

        // private legacy anim prep
        preanim : function(a, i){
            return !a[i] ? false : (typeof a[i] == 'object' ? a[i]: {duration: a[i+1], callback: a[i+2], easing: a[i+3]});
        },

        /**
         * Checks whether the element is currently visible using both visibility and display properties.
         * @return {Boolean} True if the element is currently visible, else false
         */
        isVisible : function() {
            var me = this,
                dom = me.dom,
                visible = data(dom, ISVISIBLE);

            if(typeof visible == 'boolean'){ //return the cached value if registered
                return visible;
            }
            //Determine the current state based on display states
            visible = !me.isStyle(VISIBILITY, HIDDEN) &&
                      !me.isStyle(DISPLAY, NONE) &&
                      !((getVisMode(dom) == El.ASCLASS) && me.hasClass(me.visibilityCls || El.visibilityCls));

            data(dom, ISVISIBLE, visible);
            return visible;
        },

        /**
         * Sets the visibility of the element (see details). If the visibilityMode is set to Element.DISPLAY, it will use
         * the display property to hide the element, otherwise it uses visibility. The default is to hide and show using the visibility property.
         * @param {Boolean} visible Whether the element is visible
         * @param {Boolean/Object} animate (optional) True for the default animation, or a standard Element animation config object
         * @return {Ext.Element} this
         */
        setVisible : function(visible, animate){
            var me = this, isDisplay, isVisibility, isOffsets, isNosize,
                dom = me.dom,
                visMode = getVisMode(dom);


            // hideMode string override
            if (typeof animate == 'string'){
                switch (animate) {
                    case DISPLAY:
                        visMode = El.DISPLAY;
                        break;
                    case VISIBILITY:
                        visMode = El.VISIBILITY;
                        break;
                    case OFFSETS:
                        visMode = El.OFFSETS;
                        break;
                    case NOSIZE:
                    case ASCLASS:
                        visMode = El.ASCLASS;
                        break;
                }
                me.setVisibilityMode(visMode);
                animate = false;
            }

            if (!animate || !me.anim) {
                if(visMode == El.ASCLASS ){

                    me[visible?'removeClass':'addClass'](me.visibilityCls || El.visibilityCls);

                } else if (visMode == El.DISPLAY){

                    return me.setDisplayed(visible);

                } else if (visMode == El.OFFSETS){

                    if (!visible){
                        me.hideModeStyles = {
                            position: me.getStyle('position'),
                            top: me.getStyle('top'),
                            left: me.getStyle('left')
                        };
                        me.applyStyles({position: 'absolute', top: '-10000px', left: '-10000px'});
                    } else {
                        me.applyStyles(me.hideModeStyles || {position: '', top: '', left: ''});
                        delete me.hideModeStyles;
                    }

                }else{
                    me.fixDisplay();
                    dom.style.visibility = visible ? "visible" : HIDDEN;
                }
            }else{
                // closure for composites
                if(visible){
                    me.setOpacity(.01);
                    me.setVisible(true);
                }
                me.anim({opacity: { to: (visible?1:0) }},
                        me.preanim(arguments, 1),
                        null,
                        .35,
                        'easeIn',
                        function(){
                            visible || me.setVisible(false).setOpacity(1);
                        });
            }
            data(dom, ISVISIBLE, visible);  //set logical visibility state
            return me;
        },


        /**
         * @private
         * Determine if the Element has a relevant height and width available based
         * upon current logical visibility state
         */
        hasMetrics  : function(){
            var dom = this.dom;
            return this.isVisible() || (getVisMode(dom) == El.VISIBILITY);
        },

        /**
         * Toggles the element's visibility or display, depending on visibility mode.
         * @param {Boolean/Object} animate (optional) True for the default animation, or a standard Element animation config object
         * @return {Ext.Element} this
         */
        toggle : function(animate){
            var me = this;
            me.setVisible(!me.isVisible(), me.preanim(arguments, 0));
            return me;
        },

        /**
         * Sets the CSS display property. Uses originalDisplay if the specified value is a boolean true.
         * @param {Mixed} value Boolean value to display the element using its default display, or a string to set the display directly.
         * @return {Ext.Element} this
         */
        setDisplayed : function(value) {
            if(typeof value == "boolean"){
               value = value ? getDisplay(this.dom) : NONE;
            }
            this.setStyle(DISPLAY, value);
            return this;
        },

        // private
        fixDisplay : function(){
            var me = this;
            if(me.isStyle(DISPLAY, NONE)){
                me.setStyle(VISIBILITY, HIDDEN);
                me.setStyle(DISPLAY, getDisplay(this.dom)); // first try reverting to default
                if(me.isStyle(DISPLAY, NONE)){ // if that fails, default to block
                    me.setStyle(DISPLAY, "block");
                }
            }
        },

        /**
         * Hide this element - Uses display mode to determine whether to use "display" or "visibility". See {@link #setVisible}.
         * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
         * @return {Ext.Element} this
         */
        hide : function(animate){
            // hideMode override
            if (typeof animate == 'string'){
                this.setVisible(false, animate);
                return this;
            }
            this.setVisible(false, this.preanim(arguments, 0));
            return this;
        },

        /**
        * Show this element - Uses display mode to determine whether to use "display" or "visibility". See {@link #setVisible}.
        * @param {Boolean/Object} animate (optional) true for the default animation or a standard Element animation config object
         * @return {Ext.Element} this
         */
        show : function(animate){
            // hideMode override
            if (typeof animate == 'string'){
                this.setVisible(true, animate);
                return this;
            }
            this.setVisible(true, this.preanim(arguments, 0));
            return this;
        }
    };
}());