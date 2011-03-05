/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.dd.DragTracker
 * @extends Ext.util.Observable
 * A DragTracker listens for drag events on an Element and fires events at the start and end of the drag,
 * as well as during the drag. This is useful for components such as {@link Ext.slider.MultiSlider}, where there is
 * an element that can be dragged around to change the Slider's value.
 * DragTracker provides a series of template methods that should be overridden to provide functionality
 * in response to detected drag operations. These are onBeforeStart, onStart, onDrag and onEnd.
 * See {@link Ext.slider.MultiSlider}'s initEvents function for an example implementation.
 */
Ext.dd.DragTracker = Ext.extend(Ext.util.Observable,  {    
    /**
     * @cfg {Boolean} active
	 * Defaults to <tt>false</tt>.
	 */	
    active: false,
    /**
     * @cfg {Number} tolerance
	 * Number of pixels the drag target must be moved before dragging is considered to have started. Defaults to <tt>5</tt>.
	 */	
    tolerance: 5,
    /**
     * @cfg {Boolean/Number} autoStart
	 * Defaults to <tt>false</tt>. Specify <tt>true</tt> to defer trigger start by 1000 ms.
	 * Specify a Number for the number of milliseconds to defer trigger start.
	 */	
    autoStart: false,
    
    constructor : function(config){
        Ext.apply(this, config);
	    this.addEvents(
	        /**
	         * @event mousedown
	         * @param {Object} this
	         * @param {Object} e event object
	         */
	        'mousedown',
	        /**
	         * @event mouseup
	         * @param {Object} this
	         * @param {Object} e event object
	         */
	        'mouseup',
	        /**
	         * @event mousemove
	         * @param {Object} this
	         * @param {Object} e event object
	         */
	        'mousemove',
	        /**
	         * @event dragstart
	         * @param {Object} this
	         * @param {Object} e event object
	         */
	        'dragstart',
	        /**
	         * @event dragend
	         * @param {Object} this
	         * @param {Object} e event object
	         */
	        'dragend',
	        /**
	         * @event drag
	         * @param {Object} this
	         * @param {Object} e event object
	         */
	        'drag'
	    );
	
	    this.dragRegion = new Ext.lib.Region(0,0,0,0);
	
	    if(this.el){
	        this.initEl(this.el);
	    }
        Ext.dd.DragTracker.superclass.constructor.call(this, config);
    },

    initEl: function(el){
        this.el = Ext.get(el);
        el.on('mousedown', this.onMouseDown, this,
                this.delegate ? {delegate: this.delegate} : undefined);
    },

    destroy : function(){
        this.el.un('mousedown', this.onMouseDown, this);
        delete this.el;
    },

    onMouseDown: function(e, target){
        if(this.fireEvent('mousedown', this, e) !== false && this.onBeforeStart(e) !== false){
            this.startXY = this.lastXY = e.getXY();
            this.dragTarget = this.delegate ? target : this.el.dom;
            if(this.preventDefault !== false){
                e.preventDefault();
            }
            Ext.getDoc().on({
                scope: this,
                mouseup: this.onMouseUp,
                mousemove: this.onMouseMove,
                selectstart: this.stopSelect
            });
            if(this.autoStart){
                this.timer = this.triggerStart.defer(this.autoStart === true ? 1000 : this.autoStart, this, [e]);
            }
        }
    },

    onMouseMove: function(e, target){
        // HACK: IE hack to see if button was released outside of window. */
        if(this.active && Ext.isIE && !e.browserEvent.button){
            e.preventDefault();
            this.onMouseUp(e);
            return;
        }

        e.preventDefault();
        var xy = e.getXY(), s = this.startXY;
        this.lastXY = xy;
        if(!this.active){
            if(Math.abs(s[0]-xy[0]) > this.tolerance || Math.abs(s[1]-xy[1]) > this.tolerance){
                this.triggerStart(e);
            }else{
                return;
            }
        }
        this.fireEvent('mousemove', this, e);
        this.onDrag(e);
        this.fireEvent('drag', this, e);
    },

    onMouseUp: function(e) {
        var doc = Ext.getDoc(),
            wasActive = this.active;
            
        doc.un('mousemove', this.onMouseMove, this);
        doc.un('mouseup', this.onMouseUp, this);
        doc.un('selectstart', this.stopSelect, this);
        e.preventDefault();
        this.clearStart();
        this.active = false;
        delete this.elRegion;
        this.fireEvent('mouseup', this, e);
        if(wasActive){
            this.onEnd(e);
            this.fireEvent('dragend', this, e);
        }
    },

    triggerStart: function(e) {
        this.clearStart();
        this.active = true;
        this.onStart(e);
        this.fireEvent('dragstart', this, e);
    },

    clearStart : function() {
        if(this.timer){
            clearTimeout(this.timer);
            delete this.timer;
        }
    },

    stopSelect : function(e) {
        e.stopEvent();
        return false;
    },
    
    /**
     * Template method which should be overridden by each DragTracker instance. Called when the user first clicks and
     * holds the mouse button down. Return false to disallow the drag
     * @param {Ext.EventObject} e The event object
     */
    onBeforeStart : function(e) {

    },

    /**
     * Template method which should be overridden by each DragTracker instance. Called when a drag operation starts
     * (e.g. the user has moved the tracked element beyond the specified tolerance)
     * @param {Ext.EventObject} e The event object
     */
    onStart : function(xy) {

    },

    /**
     * Template method which should be overridden by each DragTracker instance. Called whenever a drag has been detected.
     * @param {Ext.EventObject} e The event object
     */
    onDrag : function(e) {

    },

    /**
     * Template method which should be overridden by each DragTracker instance. Called when a drag operation has been completed
     * (e.g. the user clicked and held the mouse down, dragged the element and then released the mouse button)
     * @param {Ext.EventObject} e The event object
     */
    onEnd : function(e) {

    },

    /**
     * Returns the drag target
     * @return {Ext.Element} The element currently being tracked
     */
    getDragTarget : function(){
        return this.dragTarget;
    },

    getDragCt : function(){
        return this.el;
    },

    getXY : function(constrain){
        return constrain ?
               this.constrainModes[constrain].call(this, this.lastXY) : this.lastXY;
    },

    getOffset : function(constrain){
        var xy = this.getXY(constrain),
            s = this.startXY;
        return [s[0]-xy[0], s[1]-xy[1]];
    },

    constrainModes: {
        'point' : function(xy){

            if(!this.elRegion){
                this.elRegion = this.getDragCt().getRegion();
            }

            var dr = this.dragRegion;

            dr.left = xy[0];
            dr.top = xy[1];
            dr.right = xy[0];
            dr.bottom = xy[1];

            dr.constrainTo(this.elRegion);

            return [dr.left, dr.top];
        }
    }
});