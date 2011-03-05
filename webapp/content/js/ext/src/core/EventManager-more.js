/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
* @class Ext.EventManager
*/
Ext.apply(Ext.EventManager, function(){
   var resizeEvent,
       resizeTask,
       textEvent,
       textSize,
       D = Ext.lib.Dom,
       propRe = /^(?:scope|delay|buffer|single|stopEvent|preventDefault|stopPropagation|normalized|args|delegate)$/,
       curWidth = 0,
       curHeight = 0,
       // note 1: IE fires ONLY the keydown event on specialkey autorepeat
       // note 2: Safari < 3.1, Gecko (Mac/Linux) & Opera fire only the keypress event on specialkey autorepeat
       // (research done by @Jan Wolter at http://unixpapa.com/js/key.html)
       useKeydown = Ext.isWebKit ?
                   Ext.num(navigator.userAgent.match(/AppleWebKit\/(\d+)/)[1]) >= 525 :
                   !((Ext.isGecko && !Ext.isWindows) || Ext.isOpera);

   return {
       // private
       doResizeEvent: function(){
           var h = D.getViewHeight(),
               w = D.getViewWidth();

            //whacky problem in IE where the resize event will fire even though the w/h are the same.
            if(curHeight != h || curWidth != w){
               resizeEvent.fire(curWidth = w, curHeight = h);
            }
       },

       /**
        * Adds a listener to be notified when the browser window is resized and provides resize event buffering (100 milliseconds),
        * passes new viewport width and height to handlers.
        * @param {Function} fn      The handler function the window resize event invokes.
        * @param {Object}   scope   The scope (<code>this</code> reference) in which the handler function executes. Defaults to the browser window.
        * @param {boolean}  options Options object as passed to {@link Ext.Element#addListener}
        */
       onWindowResize : function(fn, scope, options){
           if(!resizeEvent){
               resizeEvent = new Ext.util.Event();
               resizeTask = new Ext.util.DelayedTask(this.doResizeEvent);
               Ext.EventManager.on(window, "resize", this.fireWindowResize, this);
           }
           resizeEvent.addListener(fn, scope, options);
       },

       // exposed only to allow manual firing
       fireWindowResize : function(){
           if(resizeEvent){
               resizeTask.delay(100);
           }
       },

       /**
        * Adds a listener to be notified when the user changes the active text size. Handler gets called with 2 params, the old size and the new size.
        * @param {Function} fn      The function the event invokes.
        * @param {Object}   scope   The scope (<code>this</code> reference) in which the handler function executes. Defaults to the browser window.
        * @param {boolean}  options Options object as passed to {@link Ext.Element#addListener}
        */
       onTextResize : function(fn, scope, options){
           if(!textEvent){
               textEvent = new Ext.util.Event();
               var textEl = new Ext.Element(document.createElement('div'));
               textEl.dom.className = 'x-text-resize';
               textEl.dom.innerHTML = 'X';
               textEl.appendTo(document.body);
               textSize = textEl.dom.offsetHeight;
               setInterval(function(){
                   if(textEl.dom.offsetHeight != textSize){
                       textEvent.fire(textSize, textSize = textEl.dom.offsetHeight);
                   }
               }, this.textResizeInterval);
           }
           textEvent.addListener(fn, scope, options);
       },

       /**
        * Removes the passed window resize listener.
        * @param {Function} fn        The method the event invokes
        * @param {Object}   scope    The scope of handler
        */
       removeResizeListener : function(fn, scope){
           if(resizeEvent){
               resizeEvent.removeListener(fn, scope);
           }
       },

       // private
       fireResize : function(){
           if(resizeEvent){
               resizeEvent.fire(D.getViewWidth(), D.getViewHeight());
           }
       },

        /**
        * The frequency, in milliseconds, to check for text resize events (defaults to 50)
        */
       textResizeInterval : 50,

       /**
        * Url used for onDocumentReady with using SSL (defaults to Ext.SSL_SECURE_URL)
        */
       ieDeferSrc : false,
       
       // protected, short accessor for useKeydown
       getKeyEvent : function(){
           return useKeydown ? 'keydown' : 'keypress';
       },

       // protected for use inside the framework
       // detects whether we should use keydown or keypress based on the browser.
       useKeydown: useKeydown
   };
}());

Ext.EventManager.on = Ext.EventManager.addListener;


Ext.apply(Ext.EventObjectImpl.prototype, {
   /** Key constant @type Number */
   BACKSPACE: 8,
   /** Key constant @type Number */
   TAB: 9,
   /** Key constant @type Number */
   NUM_CENTER: 12,
   /** Key constant @type Number */
   ENTER: 13,
   /** Key constant @type Number */
   RETURN: 13,
   /** Key constant @type Number */
   SHIFT: 16,
   /** Key constant @type Number */
   CTRL: 17,
   CONTROL : 17, // legacy
   /** Key constant @type Number */
   ALT: 18,
   /** Key constant @type Number */
   PAUSE: 19,
   /** Key constant @type Number */
   CAPS_LOCK: 20,
   /** Key constant @type Number */
   ESC: 27,
   /** Key constant @type Number */
   SPACE: 32,
   /** Key constant @type Number */
   PAGE_UP: 33,
   PAGEUP : 33, // legacy
   /** Key constant @type Number */
   PAGE_DOWN: 34,
   PAGEDOWN : 34, // legacy
   /** Key constant @type Number */
   END: 35,
   /** Key constant @type Number */
   HOME: 36,
   /** Key constant @type Number */
   LEFT: 37,
   /** Key constant @type Number */
   UP: 38,
   /** Key constant @type Number */
   RIGHT: 39,
   /** Key constant @type Number */
   DOWN: 40,
   /** Key constant @type Number */
   PRINT_SCREEN: 44,
   /** Key constant @type Number */
   INSERT: 45,
   /** Key constant @type Number */
   DELETE: 46,
   /** Key constant @type Number */
   ZERO: 48,
   /** Key constant @type Number */
   ONE: 49,
   /** Key constant @type Number */
   TWO: 50,
   /** Key constant @type Number */
   THREE: 51,
   /** Key constant @type Number */
   FOUR: 52,
   /** Key constant @type Number */
   FIVE: 53,
   /** Key constant @type Number */
   SIX: 54,
   /** Key constant @type Number */
   SEVEN: 55,
   /** Key constant @type Number */
   EIGHT: 56,
   /** Key constant @type Number */
   NINE: 57,
   /** Key constant @type Number */
   A: 65,
   /** Key constant @type Number */
   B: 66,
   /** Key constant @type Number */
   C: 67,
   /** Key constant @type Number */
   D: 68,
   /** Key constant @type Number */
   E: 69,
   /** Key constant @type Number */
   F: 70,
   /** Key constant @type Number */
   G: 71,
   /** Key constant @type Number */
   H: 72,
   /** Key constant @type Number */
   I: 73,
   /** Key constant @type Number */
   J: 74,
   /** Key constant @type Number */
   K: 75,
   /** Key constant @type Number */
   L: 76,
   /** Key constant @type Number */
   M: 77,
   /** Key constant @type Number */
   N: 78,
   /** Key constant @type Number */
   O: 79,
   /** Key constant @type Number */
   P: 80,
   /** Key constant @type Number */
   Q: 81,
   /** Key constant @type Number */
   R: 82,
   /** Key constant @type Number */
   S: 83,
   /** Key constant @type Number */
   T: 84,
   /** Key constant @type Number */
   U: 85,
   /** Key constant @type Number */
   V: 86,
   /** Key constant @type Number */
   W: 87,
   /** Key constant @type Number */
   X: 88,
   /** Key constant @type Number */
   Y: 89,
   /** Key constant @type Number */
   Z: 90,
   /** Key constant @type Number */
   CONTEXT_MENU: 93,
   /** Key constant @type Number */
   NUM_ZERO: 96,
   /** Key constant @type Number */
   NUM_ONE: 97,
   /** Key constant @type Number */
   NUM_TWO: 98,
   /** Key constant @type Number */
   NUM_THREE: 99,
   /** Key constant @type Number */
   NUM_FOUR: 100,
   /** Key constant @type Number */
   NUM_FIVE: 101,
   /** Key constant @type Number */
   NUM_SIX: 102,
   /** Key constant @type Number */
   NUM_SEVEN: 103,
   /** Key constant @type Number */
   NUM_EIGHT: 104,
   /** Key constant @type Number */
   NUM_NINE: 105,
   /** Key constant @type Number */
   NUM_MULTIPLY: 106,
   /** Key constant @type Number */
   NUM_PLUS: 107,
   /** Key constant @type Number */
   NUM_MINUS: 109,
   /** Key constant @type Number */
   NUM_PERIOD: 110,
   /** Key constant @type Number */
   NUM_DIVISION: 111,
   /** Key constant @type Number */
   F1: 112,
   /** Key constant @type Number */
   F2: 113,
   /** Key constant @type Number */
   F3: 114,
   /** Key constant @type Number */
   F4: 115,
   /** Key constant @type Number */
   F5: 116,
   /** Key constant @type Number */
   F6: 117,
   /** Key constant @type Number */
   F7: 118,
   /** Key constant @type Number */
   F8: 119,
   /** Key constant @type Number */
   F9: 120,
   /** Key constant @type Number */
   F10: 121,
   /** Key constant @type Number */
   F11: 122,
   /** Key constant @type Number */
   F12: 123,

   /** @private */
   isNavKeyPress : function(){
       var me = this,
           k = this.normalizeKey(me.keyCode);
       return (k >= 33 && k <= 40) ||  // Page Up/Down, End, Home, Left, Up, Right, Down
       k == me.RETURN ||
       k == me.TAB ||
       k == me.ESC;
   },

   isSpecialKey : function(){
       var k = this.normalizeKey(this.keyCode);
       return (this.type == 'keypress' && this.ctrlKey) ||
       this.isNavKeyPress() ||
       (k == this.BACKSPACE) || // Backspace
       (k >= 16 && k <= 20) || // Shift, Ctrl, Alt, Pause, Caps Lock
       (k >= 44 && k <= 46);   // Print Screen, Insert, Delete
   },

   getPoint : function(){
       return new Ext.lib.Point(this.xy[0], this.xy[1]);
   },

   /**
    * Returns true if the control, meta, shift or alt key was pressed during this event.
    * @return {Boolean}
    */
   hasModifier : function(){
       return ((this.ctrlKey || this.altKey) || this.shiftKey);
   }
});