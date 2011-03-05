/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.form.DisplayField
 * @extends Ext.form.Field
 * A display-only text field which is not validated and not submitted.
 * @constructor
 * Creates a new DisplayField.
 * @param {Object} config Configuration options
 * @xtype displayfield
 */
Ext.form.DisplayField = Ext.extend(Ext.form.Field,  {
    validationEvent : false,
    validateOnBlur : false,
    defaultAutoCreate : {tag: "div"},
    /**
     * @cfg {String} fieldClass The default CSS class for the field (defaults to <tt>"x-form-display-field"</tt>)
     */
    fieldClass : "x-form-display-field",
    /**
     * @cfg {Boolean} htmlEncode <tt>false</tt> to skip HTML-encoding the text when rendering it (defaults to
     * <tt>false</tt>). This might be useful if you want to include tags in the field's innerHTML rather than
     * rendering them as string literals per the default logic.
     */
    htmlEncode: false,

    // private
    initEvents : Ext.emptyFn,

    isValid : function(){
        return true;
    },

    validate : function(){
        return true;
    },

    getRawValue : function(){
        var v = this.rendered ? this.el.dom.innerHTML : Ext.value(this.value, '');
        if(v === this.emptyText){
            v = '';
        }
        if(this.htmlEncode){
            v = Ext.util.Format.htmlDecode(v);
        }
        return v;
    },

    getValue : function(){
        return this.getRawValue();
    },
    
    getName: function() {
        return this.name;
    },

    setRawValue : function(v){
        if(this.htmlEncode){
            v = Ext.util.Format.htmlEncode(v);
        }
        return this.rendered ? (this.el.dom.innerHTML = (Ext.isEmpty(v) ? '' : v)) : (this.value = v);
    },

    setValue : function(v){
        this.setRawValue(v);
        return this;
    }
    /** 
     * @cfg {String} inputType 
     * @hide
     */
    /** 
     * @cfg {Boolean} disabled 
     * @hide
     */
    /** 
     * @cfg {Boolean} readOnly 
     * @hide
     */
    /** 
     * @cfg {Boolean} validateOnBlur 
     * @hide
     */
    /** 
     * @cfg {Number} validationDelay 
     * @hide
     */
    /** 
     * @cfg {String/Boolean} validationEvent 
     * @hide
     */
});

Ext.reg('displayfield', Ext.form.DisplayField);
