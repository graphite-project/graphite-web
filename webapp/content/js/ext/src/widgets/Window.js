/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.Window
 * @extends Ext.Panel
 * <p>A specialized panel intended for use as an application window.  Windows are floated, {@link #resizable}, and
 * {@link #draggable} by default.  Windows can be {@link #maximizable maximized} to fill the viewport,
 * restored to their prior size, and can be {@link #minimize}d.</p>
 * <p>Windows can also be linked to a {@link Ext.WindowGroup} or managed by the {@link Ext.WindowMgr} to provide
 * grouping, activation, to front, to back and other application-specific behavior.</p>
 * <p>By default, Windows will be rendered to document.body. To {@link #constrain} a Window to another element
 * specify {@link Ext.Component#renderTo renderTo}.</p>
 * <p><b>Note:</b> By default, the <code>{@link #closable close}</code> header tool <i>destroys</i> the Window resulting in
 * destruction of any child Components. This makes the Window object, and all its descendants <b>unusable</b>. To enable
 * re-use of a Window, use <b><code>{@link #closeAction closeAction: 'hide'}</code></b>.</p>
 * @constructor
 * @param {Object} config The config object
 * @xtype window
 */
Ext.Window = Ext.extend(Ext.Panel, {
    /**
     * @cfg {Number} x
     * The X position of the left edge of the window on initial showing. Defaults to centering the Window within
     * the width of the Window's container {@link Ext.Element Element) (The Element that the Window is rendered to).
     */
    /**
     * @cfg {Number} y
     * The Y position of the top edge of the window on initial showing. Defaults to centering the Window within
     * the height of the Window's container {@link Ext.Element Element) (The Element that the Window is rendered to).
     */
    /**
     * @cfg {Boolean} modal
     * True to make the window modal and mask everything behind it when displayed, false to display it without
     * restricting access to other UI elements (defaults to false).
     */
    /**
     * @cfg {String/Element} animateTarget
     * Id or element from which the window should animate while opening (defaults to null with no animation).
     */
    /**
     * @cfg {String} resizeHandles
     * A valid {@link Ext.Resizable} handles config string (defaults to 'all').  Only applies when resizable = true.
     */
    /**
     * @cfg {Ext.WindowGroup} manager
     * A reference to the WindowGroup that should manage this window (defaults to {@link Ext.WindowMgr}).
     */
    /**
    * @cfg {String/Number/Component} defaultButton
    * <p>Specifies a Component to receive focus when this Window is focussed.</p>
    * <p>This may be one of:</p><div class="mdetail-params"><ul>
    * <li>The index of a footer Button.</li>
    * <li>The id of a Component.</li>
    * <li>A Component.</li>
    * </ul></div>
    */
    /**
    * @cfg {Function} onEsc
    * Allows override of the built-in processing for the escape key. Default action
    * is to close the Window (performing whatever action is specified in {@link #closeAction}.
    * To prevent the Window closing when the escape key is pressed, specify this as
    * Ext.emptyFn (See {@link Ext#emptyFn}).
    */
    /**
     * @cfg {Boolean} collapsed
     * True to render the window collapsed, false to render it expanded (defaults to false). Note that if
     * {@link #expandOnShow} is true (the default) it will override the <tt>collapsed</tt> config and the window
     * will always be expanded when shown.
     */
    /**
     * @cfg {Boolean} maximized
     * True to initially display the window in a maximized state. (Defaults to false).
     */

    /**
    * @cfg {String} baseCls
    * The base CSS class to apply to this panel's element (defaults to 'x-window').
    */
    baseCls : 'x-window',
    /**
     * @cfg {Boolean} resizable
     * True to allow user resizing at each edge and corner of the window, false to disable resizing (defaults to true).
     */
    resizable : true,
    /**
     * @cfg {Boolean} draggable
     * True to allow the window to be dragged by the header bar, false to disable dragging (defaults to true).  Note
     * that by default the window will be centered in the viewport, so if dragging is disabled the window may need
     * to be positioned programmatically after render (e.g., myWindow.setPosition(100, 100);).
     */
    draggable : true,
    /**
     * @cfg {Boolean} closable
     * <p>True to display the 'close' tool button and allow the user to close the window, false to
     * hide the button and disallow closing the window (defaults to true).</p>
     * <p>By default, when close is requested by either clicking the close button in the header
     * or pressing ESC when the Window has focus, the {@link #close} method will be called. This
     * will <i>{@link Ext.Component#destroy destroy}</i> the Window and its content meaning that
     * it may not be reused.</p>
     * <p>To make closing a Window <i>hide</i> the Window so that it may be reused, set
     * {@link #closeAction} to 'hide'.
     */
    closable : true,
    /**
     * @cfg {String} closeAction
     * <p>The action to take when the close header tool is clicked:
     * <div class="mdetail-params"><ul>
     * <li><b><code>'{@link #close}'</code></b> : <b>Default</b><div class="sub-desc">
     * {@link #close remove} the window from the DOM and {@link Ext.Component#destroy destroy}
     * it and all descendant Components. The window will <b>not</b> be available to be
     * redisplayed via the {@link #show} method.
     * </div></li>
     * <li><b><code>'{@link #hide}'</code></b> : <div class="sub-desc">
     * {@link #hide} the window by setting visibility to hidden and applying negative offsets.
     * The window will be available to be redisplayed via the {@link #show} method.
     * </div></li>
     * </ul></div>
     * <p><b>Note:</b> This setting does not affect the {@link #close} method
     * which will always {@link Ext.Component#destroy destroy} the window. To
     * programatically <i>hide</i> a window, call {@link #hide}.</p>
     */
    closeAction : 'close',
    /**
     * @cfg {Boolean} constrain
     * True to constrain the window within its containing element, false to allow it to fall outside of its
     * containing element. By default the window will be rendered to document.body.  To render and constrain the
     * window within another element specify {@link #renderTo}.
     * (defaults to false).  Optionally the header only can be constrained using {@link #constrainHeader}.
     */
    constrain : false,
    /**
     * @cfg {Boolean} constrainHeader
     * True to constrain the window header within its containing element (allowing the window body to fall outside
     * of its containing element) or false to allow the header to fall outside its containing element (defaults to
     * false). Optionally the entire window can be constrained using {@link #constrain}.
     */
    constrainHeader : false,
    /**
     * @cfg {Boolean} plain
     * True to render the window body with a transparent background so that it will blend into the framing
     * elements, false to add a lighter background color to visually highlight the body element and separate it
     * more distinctly from the surrounding frame (defaults to false).
     */
    plain : false,
    /**
     * @cfg {Boolean} minimizable
     * True to display the 'minimize' tool button and allow the user to minimize the window, false to hide the button
     * and disallow minimizing the window (defaults to false).  Note that this button provides no implementation --
     * the behavior of minimizing a window is implementation-specific, so the minimize event must be handled and a
     * custom minimize behavior implemented for this option to be useful.
     */
    minimizable : false,
    /**
     * @cfg {Boolean} maximizable
     * True to display the 'maximize' tool button and allow the user to maximize the window, false to hide the button
     * and disallow maximizing the window (defaults to false).  Note that when a window is maximized, the tool button
     * will automatically change to a 'restore' button with the appropriate behavior already built-in that will
     * restore the window to its previous size.
     */
    maximizable : false,
    /**
     * @cfg {Number} minHeight
     * The minimum height in pixels allowed for this window (defaults to 100).  Only applies when resizable = true.
     */
    minHeight : 100,
    /**
     * @cfg {Number} minWidth
     * The minimum width in pixels allowed for this window (defaults to 200).  Only applies when resizable = true.
     */
    minWidth : 200,
    /**
     * @cfg {Boolean} expandOnShow
     * True to always expand the window when it is displayed, false to keep it in its current state (which may be
     * {@link #collapsed}) when displayed (defaults to true).
     */
    expandOnShow : true,
    
    /**
     * @cfg {Number} showAnimDuration The number of seconds that the window show animation takes if enabled.
     * Defaults to 0.25
     */
    showAnimDuration: 0.25,
    
    /**
     * @cfg {Number} hideAnimDuration The number of seconds that the window hide animation takes if enabled.
     * Defaults to 0.25
     */
    hideAnimDuration: 0.25,

    // inherited docs, same default
    collapsible : false,

    /**
     * @cfg {Boolean} initHidden
     * True to hide the window until show() is explicitly called (defaults to true).
     * @deprecated
     */
    initHidden : undefined,

    /**
     * @cfg {Boolean} hidden
     * Render this component hidden (default is <tt>true</tt>). If <tt>true</tt>, the
     * {@link #hide} method will be called internally.
     */
    hidden : true,

    // The following configs are set to provide the basic functionality of a window.
    // Changing them would require additional code to handle correctly and should
    // usually only be done in subclasses that can provide custom behavior.  Changing them
    // may have unexpected or undesirable results.
    /** @cfg {String} elements @hide */
    elements : 'header,body',
    /** @cfg {Boolean} frame @hide */
    frame : true,
    /** @cfg {Boolean} floating @hide */
    floating : true,

    // private
    initComponent : function(){
        this.initTools();
        Ext.Window.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event activate
             * Fires after the window has been visually activated via {@link #setActive}.
             * @param {Ext.Window} this
             */
            /**
             * @event deactivate
             * Fires after the window has been visually deactivated via {@link #setActive}.
             * @param {Ext.Window} this
             */
            /**
             * @event resize
             * Fires after the window has been resized.
             * @param {Ext.Window} this
             * @param {Number} width The window's new width
             * @param {Number} height The window's new height
             */
            'resize',
            /**
             * @event maximize
             * Fires after the window has been maximized.
             * @param {Ext.Window} this
             */
            'maximize',
            /**
             * @event minimize
             * Fires after the window has been minimized.
             * @param {Ext.Window} this
             */
            'minimize',
            /**
             * @event restore
             * Fires after the window has been restored to its original size after being maximized.
             * @param {Ext.Window} this
             */
            'restore'
        );
        // for backwards compat, this should be removed at some point
        if(Ext.isDefined(this.initHidden)){
            this.hidden = this.initHidden;
        }
        if(this.hidden === false){
            this.hidden = true;
            this.show();
        }
    },

    // private
    getState : function(){
        return Ext.apply(Ext.Window.superclass.getState.call(this) || {}, this.getBox(true));
    },

    // private
    onRender : function(ct, position){
        Ext.Window.superclass.onRender.call(this, ct, position);

        if(this.plain){
            this.el.addClass('x-window-plain');
        }

        // this element allows the Window to be focused for keyboard events
        this.focusEl = this.el.createChild({
                    tag: 'a', href:'#', cls:'x-dlg-focus',
                    tabIndex:'-1', html: '&#160;'});
        this.focusEl.swallowEvent('click', true);

        this.proxy = this.el.createProxy('x-window-proxy');
        this.proxy.enableDisplayMode('block');

        if(this.modal){
            this.mask = this.container.createChild({cls:'ext-el-mask'}, this.el.dom);
            this.mask.enableDisplayMode('block');
            this.mask.hide();
            this.mon(this.mask, 'click', this.focus, this);
        }
        if(this.maximizable){
            this.mon(this.header, 'dblclick', this.toggleMaximize, this);
        }
    },

    // private
    initEvents : function(){
        Ext.Window.superclass.initEvents.call(this);
        if(this.animateTarget){
            this.setAnimateTarget(this.animateTarget);
        }

        if(this.resizable){
            this.resizer = new Ext.Resizable(this.el, {
                minWidth: this.minWidth,
                minHeight:this.minHeight,
                handles: this.resizeHandles || 'all',
                pinned: true,
                resizeElement : this.resizerAction,
                handleCls: 'x-window-handle'
            });
            this.resizer.window = this;
            this.mon(this.resizer, 'beforeresize', this.beforeResize, this);
        }

        if(this.draggable){
            this.header.addClass('x-window-draggable');
        }
        this.mon(this.el, 'mousedown', this.toFront, this);
        this.manager = this.manager || Ext.WindowMgr;
        this.manager.register(this);
        if(this.maximized){
            this.maximized = false;
            this.maximize();
        }
        if(this.closable){
            var km = this.getKeyMap();
            km.on(27, this.onEsc, this);
            km.disable();
        }
    },

    initDraggable : function(){
        /**
         * <p>If this Window is configured {@link #draggable}, this property will contain
         * an instance of {@link Ext.dd.DD} which handles dragging the Window's DOM Element.</p>
         * <p>This has implementations of <code>startDrag</code>, <code>onDrag</code> and <code>endDrag</code>
         * which perform the dragging action. If extra logic is needed at these points, use
         * {@link Function#createInterceptor createInterceptor} or {@link Function#createSequence createSequence} to
         * augment the existing implementations.</p>
         * @type Ext.dd.DD
         * @property dd
         */
        this.dd = new Ext.Window.DD(this);
    },

   // private
    onEsc : function(k, e){
        e.stopEvent();
        this[this.closeAction]();
    },

    // private
    beforeDestroy : function(){
        if(this.rendered){
            this.hide();
            this.clearAnchor();
            Ext.destroy(
                this.focusEl,
                this.resizer,
                this.dd,
                this.proxy,
                this.mask
            );
        }
        Ext.Window.superclass.beforeDestroy.call(this);
    },

    // private
    onDestroy : function(){
        if(this.manager){
            this.manager.unregister(this);
        }
        Ext.Window.superclass.onDestroy.call(this);
    },

    // private
    initTools : function(){
        if(this.minimizable){
            this.addTool({
                id: 'minimize',
                handler: this.minimize.createDelegate(this, [])
            });
        }
        if(this.maximizable){
            this.addTool({
                id: 'maximize',
                handler: this.maximize.createDelegate(this, [])
            });
            this.addTool({
                id: 'restore',
                handler: this.restore.createDelegate(this, []),
                hidden:true
            });
        }
        if(this.closable){
            this.addTool({
                id: 'close',
                handler: this[this.closeAction].createDelegate(this, [])
            });
        }
    },

    // private
    resizerAction : function(){
        var box = this.proxy.getBox();
        this.proxy.hide();
        this.window.handleResize(box);
        return box;
    },

    // private
    beforeResize : function(){
        this.resizer.minHeight = Math.max(this.minHeight, this.getFrameHeight() + 40); // 40 is a magic minimum content size?
        this.resizer.minWidth = Math.max(this.minWidth, this.getFrameWidth() + 40);
        this.resizeBox = this.el.getBox();
    },

    // private
    updateHandles : function(){
        if(Ext.isIE && this.resizer){
            this.resizer.syncHandleHeight();
            this.el.repaint();
        }
    },

    // private
    handleResize : function(box){
        var rz = this.resizeBox;
        if(rz.x != box.x || rz.y != box.y){
            this.updateBox(box);
        }else{
            this.setSize(box);
            if (Ext.isIE6 && Ext.isStrict) {
                this.doLayout();
            }
        }
        this.focus();
        this.updateHandles();
        this.saveState();
    },

    /**
     * Focuses the window.  If a defaultButton is set, it will receive focus, otherwise the
     * window itself will receive focus.
     */
    focus : function(){
        var f = this.focusEl,
            db = this.defaultButton,
            t = typeof db,
            el,
            ct;
        if(Ext.isDefined(db)){
            if(Ext.isNumber(db) && this.fbar){
                f = this.fbar.items.get(db);
            }else if(Ext.isString(db)){
                f = Ext.getCmp(db);
            }else{
                f = db;
            }
            el = f.getEl();
            ct = Ext.getDom(this.container);
            if (el && ct) {
                if (ct != document.body && !Ext.lib.Region.getRegion(ct).contains(Ext.lib.Region.getRegion(el.dom))){
                    return;
                }
            }
        }
        f = f || this.focusEl;
        f.focus.defer(10, f);
    },

    /**
     * Sets the target element from which the window should animate while opening.
     * @param {String/Element} el The target element or id
     */
    setAnimateTarget : function(el){
        el = Ext.get(el);
        this.animateTarget = el;
    },

    // private
    beforeShow : function(){
        delete this.el.lastXY;
        delete this.el.lastLT;
        if(this.x === undefined || this.y === undefined){
            var xy = this.el.getAlignToXY(this.container, 'c-c');
            var pos = this.el.translatePoints(xy[0], xy[1]);
            this.x = this.x === undefined? pos.left : this.x;
            this.y = this.y === undefined? pos.top : this.y;
        }
        this.el.setLeftTop(this.x, this.y);

        if(this.expandOnShow){
            this.expand(false);
        }

        if(this.modal){
            Ext.getBody().addClass('x-body-masked');
            this.mask.setSize(Ext.lib.Dom.getViewWidth(true), Ext.lib.Dom.getViewHeight(true));
            this.mask.show();
        }
    },

    /**
     * Shows the window, rendering it first if necessary, or activates it and brings it to front if hidden.
     * @param {String/Element} animateTarget (optional) The target element or id from which the window should
     * animate while opening (defaults to null with no animation)
     * @param {Function} callback (optional) A callback function to call after the window is displayed
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the callback is executed. Defaults to this Window.
     * @return {Ext.Window} this
     */
    show : function(animateTarget, cb, scope){
        if(!this.rendered){
            this.render(Ext.getBody());
        }
        if(this.hidden === false){
            this.toFront();
            return this;
        }
        if(this.fireEvent('beforeshow', this) === false){
            return this;
        }
        if(cb){
            this.on('show', cb, scope, {single:true});
        }
        this.hidden = false;
        if(Ext.isDefined(animateTarget)){
            this.setAnimateTarget(animateTarget);
        }
        this.beforeShow();
        if(this.animateTarget){
            this.animShow();
        }else{
            this.afterShow();
        }
        return this;
    },

    // private
    afterShow : function(isAnim){
        if (this.isDestroyed){
            return false;
        }
        this.proxy.hide();
        this.el.setStyle('display', 'block');
        this.el.show();
        if(this.maximized){
            this.fitContainer();
        }
        if(Ext.isMac && Ext.isGecko2){ // work around stupid FF 2.0/Mac scroll bar bug
            this.cascade(this.setAutoScroll);
        }

        if(this.monitorResize || this.modal || this.constrain || this.constrainHeader){
            Ext.EventManager.onWindowResize(this.onWindowResize, this);
        }
        this.doConstrain();
        this.doLayout();
        if(this.keyMap){
            this.keyMap.enable();
        }
        this.toFront();
        this.updateHandles();
        if(isAnim && (Ext.isIE || Ext.isWebKit)){
            var sz = this.getSize();
            this.onResize(sz.width, sz.height);
        }
        this.onShow();
        this.fireEvent('show', this);
    },

    // private
    animShow : function(){
        this.proxy.show();
        this.proxy.setBox(this.animateTarget.getBox());
        this.proxy.setOpacity(0);
        var b = this.getBox();
        this.el.setStyle('display', 'none');
        this.proxy.shift(Ext.apply(b, {
            callback: this.afterShow.createDelegate(this, [true], false),
            scope: this,
            easing: 'easeNone',
            duration: this.showAnimDuration,
            opacity: 0.5
        }));
    },

    /**
     * Hides the window, setting it to invisible and applying negative offsets.
     * @param {String/Element} animateTarget (optional) The target element or id to which the window should
     * animate while hiding (defaults to null with no animation)
     * @param {Function} callback (optional) A callback function to call after the window is hidden
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the callback is executed. Defaults to this Window.
     * @return {Ext.Window} this
     */
    hide : function(animateTarget, cb, scope){
        if(this.hidden || this.fireEvent('beforehide', this) === false){
            return this;
        }
        if(cb){
            this.on('hide', cb, scope, {single:true});
        }
        this.hidden = true;
        if(animateTarget !== undefined){
            this.setAnimateTarget(animateTarget);
        }
        if(this.modal){
            this.mask.hide();
            Ext.getBody().removeClass('x-body-masked');
        }
        if(this.animateTarget){
            this.animHide();
        }else{
            this.el.hide();
            this.afterHide();
        }
        return this;
    },

    // private
    afterHide : function(){
        this.proxy.hide();
        if(this.monitorResize || this.modal || this.constrain || this.constrainHeader){
            Ext.EventManager.removeResizeListener(this.onWindowResize, this);
        }
        if(this.keyMap){
            this.keyMap.disable();
        }
        this.onHide();
        this.fireEvent('hide', this);
    },

    // private
    animHide : function(){
        this.proxy.setOpacity(0.5);
        this.proxy.show();
        var tb = this.getBox(false);
        this.proxy.setBox(tb);
        this.el.hide();
        this.proxy.shift(Ext.apply(this.animateTarget.getBox(), {
            callback: this.afterHide,
            scope: this,
            duration: this.hideAnimDuration,
            easing: 'easeNone',
            opacity: 0
        }));
    },

    /**
     * Method that is called immediately before the <code>show</code> event is fired.
     * Defaults to <code>Ext.emptyFn</code>.
     */
    onShow : Ext.emptyFn,

    /**
     * Method that is called immediately before the <code>hide</code> event is fired.
     * Defaults to <code>Ext.emptyFn</code>.
     */
    onHide : Ext.emptyFn,

    // private
    onWindowResize : function(){
        if(this.maximized){
            this.fitContainer();
        }
        if(this.modal){
            this.mask.setSize('100%', '100%');
            var force = this.mask.dom.offsetHeight;
            this.mask.setSize(Ext.lib.Dom.getViewWidth(true), Ext.lib.Dom.getViewHeight(true));
        }
        this.doConstrain();
    },

    // private
    doConstrain : function(){
        if(this.constrain || this.constrainHeader){
            var offsets;
            if(this.constrain){
                offsets = {
                    right:this.el.shadowOffset,
                    left:this.el.shadowOffset,
                    bottom:this.el.shadowOffset
                };
            }else {
                var s = this.getSize();
                offsets = {
                    right:-(s.width - 100),
                    bottom:-(s.height - 25)
                };
            }

            var xy = this.el.getConstrainToXY(this.container, true, offsets);
            if(xy){
                this.setPosition(xy[0], xy[1]);
            }
        }
    },

    // private - used for dragging
    ghost : function(cls){
        var ghost = this.createGhost(cls);
        var box = this.getBox(true);
        ghost.setLeftTop(box.x, box.y);
        ghost.setWidth(box.width);
        this.el.hide();
        this.activeGhost = ghost;
        return ghost;
    },

    // private
    unghost : function(show, matchPosition){
        if(!this.activeGhost) {
            return;
        }
        if(show !== false){
            this.el.show();
            this.focus.defer(10, this);
            if(Ext.isMac && Ext.isGecko2){ // work around stupid FF 2.0/Mac scroll bar bug
                this.cascade(this.setAutoScroll);
            }
        }
        if(matchPosition !== false){
            this.setPosition(this.activeGhost.getLeft(true), this.activeGhost.getTop(true));
        }
        this.activeGhost.hide();
        this.activeGhost.remove();
        delete this.activeGhost;
    },

    /**
     * Placeholder method for minimizing the window.  By default, this method simply fires the {@link #minimize} event
     * since the behavior of minimizing a window is application-specific.  To implement custom minimize behavior,
     * either the minimize event can be handled or this method can be overridden.
     * @return {Ext.Window} this
     */
    minimize : function(){
        this.fireEvent('minimize', this);
        return this;
    },

    /**
     * <p>Closes the Window, removes it from the DOM, {@link Ext.Component#destroy destroy}s
     * the Window object and all its descendant Components. The {@link Ext.Panel#beforeclose beforeclose}
     * event is fired before the close happens and will cancel the close action if it returns false.<p>
     * <p><b>Note:</b> This method is not affected by the {@link #closeAction} setting which
     * only affects the action triggered when clicking the {@link #closable 'close' tool in the header}.
     * To hide the Window without destroying it, call {@link #hide}.</p>
     */
    close : function(){
        if(this.fireEvent('beforeclose', this) !== false){
            if(this.hidden){
                this.doClose();
            }else{
                this.hide(null, this.doClose, this);
            }
        }
    },

    // private
    doClose : function(){
        this.fireEvent('close', this);
        this.destroy();
    },

    /**
     * Fits the window within its current container and automatically replaces
     * the {@link #maximizable 'maximize' tool button} with the 'restore' tool button.
     * Also see {@link #toggleMaximize}.
     * @return {Ext.Window} this
     */
    maximize : function(){
        if(!this.maximized){
            this.expand(false);
            this.restoreSize = this.getSize();
            this.restorePos = this.getPosition(true);
            if (this.maximizable){
                this.tools.maximize.hide();
                this.tools.restore.show();
            }
            this.maximized = true;
            this.el.disableShadow();

            if(this.dd){
                this.dd.lock();
            }
            if(this.collapsible){
                this.tools.toggle.hide();
            }
            this.el.addClass('x-window-maximized');
            this.container.addClass('x-window-maximized-ct');

            this.setPosition(0, 0);
            this.fitContainer();
            this.fireEvent('maximize', this);
        }
        return this;
    },

    /**
     * Restores a {@link #maximizable maximized}  window back to its original
     * size and position prior to being maximized and also replaces
     * the 'restore' tool button with the 'maximize' tool button.
     * Also see {@link #toggleMaximize}.
     * @return {Ext.Window} this
     */
    restore : function(){
        if(this.maximized){
            var t = this.tools;
            this.el.removeClass('x-window-maximized');
            if(t.restore){
                t.restore.hide();
            }
            if(t.maximize){
                t.maximize.show();
            }
            this.setPosition(this.restorePos[0], this.restorePos[1]);
            this.setSize(this.restoreSize.width, this.restoreSize.height);
            delete this.restorePos;
            delete this.restoreSize;
            this.maximized = false;
            this.el.enableShadow(true);

            if(this.dd){
                this.dd.unlock();
            }
            if(this.collapsible && t.toggle){
                t.toggle.show();
            }
            this.container.removeClass('x-window-maximized-ct');

            this.doConstrain();
            this.fireEvent('restore', this);
        }
        return this;
    },

    /**
     * A shortcut method for toggling between {@link #maximize} and {@link #restore} based on the current maximized
     * state of the window.
     * @return {Ext.Window} this
     */
    toggleMaximize : function(){
        return this[this.maximized ? 'restore' : 'maximize']();
    },

    // private
    fitContainer : function(){
        var vs = this.container.getViewSize(false);
        this.setSize(vs.width, vs.height);
    },

    // private
    // z-index is managed by the WindowManager and may be overwritten at any time
    setZIndex : function(index){
        if(this.modal){
            this.mask.setStyle('z-index', index);
        }
        this.el.setZIndex(++index);
        index += 5;

        if(this.resizer){
            this.resizer.proxy.setStyle('z-index', ++index);
        }

        this.lastZIndex = index;
    },

    /**
     * Aligns the window to the specified element
     * @param {Mixed} element The element to align to.
     * @param {String} position (optional, defaults to "tl-bl?") The position to align to (see {@link Ext.Element#alignTo} for more details).
     * @param {Array} offsets (optional) Offset the positioning by [x, y]
     * @return {Ext.Window} this
     */
    alignTo : function(element, position, offsets){
        var xy = this.el.getAlignToXY(element, position, offsets);
        this.setPagePosition(xy[0], xy[1]);
        return this;
    },

    /**
     * Anchors this window to another element and realigns it when the window is resized or scrolled.
     * @param {Mixed} element The element to align to.
     * @param {String} position The position to align to (see {@link Ext.Element#alignTo} for more details)
     * @param {Array} offsets (optional) Offset the positioning by [x, y]
     * @param {Boolean/Number} monitorScroll (optional) true to monitor body scroll and reposition. If this parameter
     * is a number, it is used as the buffer delay (defaults to 50ms).
     * @return {Ext.Window} this
     */
    anchorTo : function(el, alignment, offsets, monitorScroll){
        this.clearAnchor();
        this.anchorTarget = {
            el: el,
            alignment: alignment,
            offsets: offsets
        };

        Ext.EventManager.onWindowResize(this.doAnchor, this);
        var tm = typeof monitorScroll;
        if(tm != 'undefined'){
            Ext.EventManager.on(window, 'scroll', this.doAnchor, this,
                {buffer: tm == 'number' ? monitorScroll : 50});
        }
        return this.doAnchor();
    },

    /**
     * Performs the anchor, using the saved anchorTarget property.
     * @return {Ext.Window} this
     * @private
     */
    doAnchor : function(){
        var o = this.anchorTarget;
        this.alignTo(o.el, o.alignment, o.offsets);
        return this;
    },

    /**
     * Removes any existing anchor from this window. See {@link #anchorTo}.
     * @return {Ext.Window} this
     */
    clearAnchor : function(){
        if(this.anchorTarget){
            Ext.EventManager.removeResizeListener(this.doAnchor, this);
            Ext.EventManager.un(window, 'scroll', this.doAnchor, this);
            delete this.anchorTarget;
        }
        return this;
    },

    /**
     * Brings this window to the front of any other visible windows
     * @param {Boolean} e (optional) Specify <tt>false</tt> to prevent the window from being focused.
     * @return {Ext.Window} this
     */
    toFront : function(e){
        if(this.manager.bringToFront(this)){
            if(!e || !e.getTarget().focus){
                this.focus();
            }
        }
        return this;
    },

    /**
     * Makes this the active window by showing its shadow, or deactivates it by hiding its shadow.  This method also
     * fires the {@link #activate} or {@link #deactivate} event depending on which action occurred. This method is
     * called internally by {@link Ext.WindowMgr}.
     * @param {Boolean} active True to activate the window, false to deactivate it (defaults to false)
     */
    setActive : function(active){
        if(active){
            if(!this.maximized){
                this.el.enableShadow(true);
            }
            this.fireEvent('activate', this);
        }else{
            this.el.disableShadow();
            this.fireEvent('deactivate', this);
        }
    },

    /**
     * Sends this window to the back of (lower z-index than) any other visible windows
     * @return {Ext.Window} this
     */
    toBack : function(){
        this.manager.sendToBack(this);
        return this;
    },

    /**
     * Centers this window in the viewport
     * @return {Ext.Window} this
     */
    center : function(){
        var xy = this.el.getAlignToXY(this.container, 'c-c');
        this.setPagePosition(xy[0], xy[1]);
        return this;
    }

    /**
     * @cfg {Boolean} autoWidth @hide
     **/
});
Ext.reg('window', Ext.Window);

// private - custom Window DD implementation
Ext.Window.DD = Ext.extend(Ext.dd.DD, {
    
    constructor : function(win){
        this.win = win;
        Ext.Window.DD.superclass.constructor.call(this, win.el.id, 'WindowDD-'+win.id);
        this.setHandleElId(win.header.id);
        this.scroll = false;        
    },
    
    moveOnly:true,
    headerOffsets:[100, 25],
    startDrag : function(){
        var w = this.win;
        this.proxy = w.ghost(w.initialConfig.cls);
        if(w.constrain !== false){
            var so = w.el.shadowOffset;
            this.constrainTo(w.container, {right: so, left: so, bottom: so});
        }else if(w.constrainHeader !== false){
            var s = this.proxy.getSize();
            this.constrainTo(w.container, {right: -(s.width-this.headerOffsets[0]), bottom: -(s.height-this.headerOffsets[1])});
        }
    },
    b4Drag : Ext.emptyFn,

    onDrag : function(e){
        this.alignElWithMouse(this.proxy, e.getPageX(), e.getPageY());
    },

    endDrag : function(e){
        this.win.unghost();
        this.win.saveState();
    }
});
