/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.form.Label
 * @extends Ext.BoxComponent
 * Basic Label field.
 * @constructor
 * Creates a new Label
 * @param {Ext.Element/String/Object} config The configuration options.  If an element is passed, it is set as the internal
 * element and its id used as the component id.  If a string is passed, it is assumed to be the id of an existing element
 * and is used as the component id.  Otherwise, it is assumed to be a standard config object and is applied to the component.
 * @xtype label
 */
Ext.form.Label = Ext.extend(Ext.BoxComponent, {
    /**
     * @cfg {String} text The plain text to display within the label (defaults to ''). If you need to include HTML
     * tags within the label's innerHTML, use the {@link #html} config instead.
     */
    /**
     * @cfg {String} forId The id of the input element to which this label will be bound via the standard HTML 'for'
     * attribute. If not specified, the attribute will not be added to the label.
     */
    /**
     * @cfg {String} html An HTML fragment that will be used as the label's innerHTML (defaults to '').
     * Note that if {@link #text} is specified it will take precedence and this value will be ignored.
     */

    // private
    onRender : function(ct, position){
        if(!this.el){
            this.el = document.createElement('label');
            this.el.id = this.getId();
            this.el.innerHTML = this.text ? Ext.util.Format.htmlEncode(this.text) : (this.html || '');
            if(this.forId){
                this.el.setAttribute('for', this.forId);
            }
        }
        Ext.form.Label.superclass.onRender.call(this, ct, position);
    },

    /**
     * Updates the label's innerHTML with the specified string.
     * @param {String} text The new label text
     * @param {Boolean} encode (optional) False to skip HTML-encoding the text when rendering it
     * to the label (defaults to true which encodes the value). This might be useful if you want to include
     * tags in the label's innerHTML rather than rendering them as string literals per the default logic.
     * @return {Label} this
     */
    setText : function(t, encode){
        var e = encode === false;
        this[!e ? 'text' : 'html'] = t;
        delete this[e ? 'text' : 'html'];
        if(this.rendered){
            this.el.dom.innerHTML = encode !== false ? Ext.util.Format.htmlEncode(t) : t;
        }
        return this;
    }
});

Ext.reg('label', Ext.form.Label);