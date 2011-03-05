/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.util.TextMetrics
 * Provides precise pixel measurements for blocks of text so that you can determine exactly how high and
 * wide, in pixels, a given block of text will be. Note that when measuring text, it should be plain text and
 * should not contain any HTML, otherwise it may not be measured correctly.
 * @singleton
 */
Ext.util.TextMetrics = function(){
    var shared;
    return {
        /**
         * Measures the size of the specified text
         * @param {String/HTMLElement} el The element, dom node or id from which to copy existing CSS styles
         * that can affect the size of the rendered text
         * @param {String} text The text to measure
         * @param {Number} fixedWidth (optional) If the text will be multiline, you have to set a fixed width
         * in order to accurately measure the text height
         * @return {Object} An object containing the text's size {width: (width), height: (height)}
         */
        measure : function(el, text, fixedWidth){
            if(!shared){
                shared = Ext.util.TextMetrics.Instance(el, fixedWidth);
            }
            shared.bind(el);
            shared.setFixedWidth(fixedWidth || 'auto');
            return shared.getSize(text);
        },

        /**
         * Return a unique TextMetrics instance that can be bound directly to an element and reused.  This reduces
         * the overhead of multiple calls to initialize the style properties on each measurement.
         * @param {String/HTMLElement} el The element, dom node or id that the instance will be bound to
         * @param {Number} fixedWidth (optional) If the text will be multiline, you have to set a fixed width
         * in order to accurately measure the text height
         * @return {Ext.util.TextMetrics.Instance} instance The new instance
         */
        createInstance : function(el, fixedWidth){
            return Ext.util.TextMetrics.Instance(el, fixedWidth);
        }
    };
}();

Ext.util.TextMetrics.Instance = function(bindTo, fixedWidth){
    var ml = new Ext.Element(document.createElement('div'));
    document.body.appendChild(ml.dom);
    ml.position('absolute');
    ml.setLeftTop(-1000, -1000);
    ml.hide();

    if(fixedWidth){
        ml.setWidth(fixedWidth);
    }

    var instance = {
        /**
         * <p><b>Only available on the instance returned from {@link #createInstance}, <u>not</u> on the singleton.</b></p>
         * Returns the size of the specified text based on the internal element's style and width properties
         * @param {String} text The text to measure
         * @return {Object} An object containing the text's size {width: (width), height: (height)}
         */
        getSize : function(text){
            ml.update(text);
            var s = ml.getSize();
            ml.update('');
            return s;
        },

        /**
         * <p><b>Only available on the instance returned from {@link #createInstance}, <u>not</u> on the singleton.</b></p>
         * Binds this TextMetrics instance to an element from which to copy existing CSS styles
         * that can affect the size of the rendered text
         * @param {String/HTMLElement} el The element, dom node or id
         */
        bind : function(el){
            ml.setStyle(
                Ext.fly(el).getStyles('font-size','font-style', 'font-weight', 'font-family','line-height', 'text-transform', 'letter-spacing')
            );
        },

        /**
         * <p><b>Only available on the instance returned from {@link #createInstance}, <u>not</u> on the singleton.</b></p>
         * Sets a fixed width on the internal measurement element.  If the text will be multiline, you have
         * to set a fixed width in order to accurately measure the text height.
         * @param {Number} width The width to set on the element
         */
        setFixedWidth : function(width){
            ml.setWidth(width);
        },

        /**
         * <p><b>Only available on the instance returned from {@link #createInstance}, <u>not</u> on the singleton.</b></p>
         * Returns the measured width of the specified text
         * @param {String} text The text to measure
         * @return {Number} width The width in pixels
         */
        getWidth : function(text){
            ml.dom.style.width = 'auto';
            return this.getSize(text).width;
        },

        /**
         * <p><b>Only available on the instance returned from {@link #createInstance}, <u>not</u> on the singleton.</b></p>
         * Returns the measured height of the specified text.  For multiline text, be sure to call
         * {@link #setFixedWidth} if necessary.
         * @param {String} text The text to measure
         * @return {Number} height The height in pixels
         */
        getHeight : function(text){
            return this.getSize(text).height;
        }
    };

    instance.bind(bindTo);

    return instance;
};

Ext.Element.addMethods({
    /**
     * Returns the width in pixels of the passed text, or the width of the text in this Element.
     * @param {String} text The text to measure. Defaults to the innerHTML of the element.
     * @param {Number} min (Optional) The minumum value to return.
     * @param {Number} max (Optional) The maximum value to return.
     * @return {Number} The text width in pixels.
     * @member Ext.Element getTextWidth
     */
    getTextWidth : function(text, min, max){
        return (Ext.util.TextMetrics.measure(this.dom, Ext.value(text, this.dom.innerHTML, true)).width).constrain(min || 0, max || 1000000);
    }
});
