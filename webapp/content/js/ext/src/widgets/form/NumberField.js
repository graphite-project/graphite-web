/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.form.NumberField
 * @extends Ext.form.TextField
 * Numeric text field that provides automatic keystroke filtering and numeric validation.
 * @constructor
 * Creates a new NumberField
 * @param {Object} config Configuration options
 * @xtype numberfield
 */
Ext.form.NumberField = Ext.extend(Ext.form.TextField,  {
    /**
     * @cfg {RegExp} stripCharsRe @hide
     */
    /**
     * @cfg {RegExp} maskRe @hide
     */
    /**
     * @cfg {String} fieldClass The default CSS class for the field (defaults to "x-form-field x-form-num-field")
     */
    fieldClass: "x-form-field x-form-num-field",
    
    /**
     * @cfg {Boolean} allowDecimals False to disallow decimal values (defaults to true)
     */
    allowDecimals : true,
    
    /**
     * @cfg {String} decimalSeparator Character(s) to allow as the decimal separator (defaults to '.')
     */
    decimalSeparator : ".",
    
    /**
     * @cfg {Number} decimalPrecision The maximum precision to display after the decimal separator (defaults to 2)
     */
    decimalPrecision : 2,
    
    /**
     * @cfg {Boolean} allowNegative False to prevent entering a negative sign (defaults to true)
     */
    allowNegative : true,
    
    /**
     * @cfg {Number} minValue The minimum allowed value (defaults to Number.NEGATIVE_INFINITY)
     */
    minValue : Number.NEGATIVE_INFINITY,
    
    /**
     * @cfg {Number} maxValue The maximum allowed value (defaults to Number.MAX_VALUE)
     */
    maxValue : Number.MAX_VALUE,
    
    /**
     * @cfg {String} minText Error text to display if the minimum value validation fails (defaults to "The minimum value for this field is {minValue}")
     */
    minText : "The minimum value for this field is {0}",
    
    /**
     * @cfg {String} maxText Error text to display if the maximum value validation fails (defaults to "The maximum value for this field is {maxValue}")
     */
    maxText : "The maximum value for this field is {0}",
    
    /**
     * @cfg {String} nanText Error text to display if the value is not a valid number.  For example, this can happen
     * if a valid character like '.' or '-' is left in the field with no number (defaults to "{value} is not a valid number")
     */
    nanText : "{0} is not a valid number",
    
    /**
     * @cfg {String} baseChars The base set of characters to evaluate as valid numbers (defaults to '0123456789').
     */
    baseChars : "0123456789",
    
    /**
     * @cfg {Boolean} autoStripChars True to automatically strip not allowed characters from the field. Defaults to <tt>false</tt>
     */
    autoStripChars: false,

    // private
    initEvents : function() {
        var allowed = this.baseChars + '';
        if (this.allowDecimals) {
            allowed += this.decimalSeparator;
        }
        if (this.allowNegative) {
            allowed += '-';
        }
        allowed = Ext.escapeRe(allowed);
        this.maskRe = new RegExp('[' + allowed + ']');
        if (this.autoStripChars) {
            this.stripCharsRe = new RegExp('[^' + allowed + ']', 'gi');
        }
        
        Ext.form.NumberField.superclass.initEvents.call(this);
    },
    
    /**
     * Runs all of NumberFields validations and returns an array of any errors. Note that this first
     * runs TextField's validations, so the returned array is an amalgamation of all field errors.
     * The additional validations run test that the value is a number, and that it is within the
     * configured min and max values.
     * @param {Mixed} value The value to get errors for (defaults to the current field value)
     * @return {Array} All validation errors for this field
     */
    getErrors: function(value) {
        var errors = Ext.form.NumberField.superclass.getErrors.apply(this, arguments);
        
        value = Ext.isDefined(value) ? value : this.processValue(this.getRawValue());
        
        if (value.length < 1) { // if it's blank and textfield didn't flag it then it's valid
             return errors;
        }
        
        value = String(value).replace(this.decimalSeparator, ".");
        
        if(isNaN(value)){
            errors.push(String.format(this.nanText, value));
        }
        
        var num = this.parseValue(value);
        
        if (num < this.minValue) {
            errors.push(String.format(this.minText, this.minValue));
        }
        
        if (num > this.maxValue) {
            errors.push(String.format(this.maxText, this.maxValue));
        }
        
        return errors;
    },

    getValue : function() {
        return this.fixPrecision(this.parseValue(Ext.form.NumberField.superclass.getValue.call(this)));
    },

    setValue : function(v) {
        v = this.fixPrecision(v);
    	v = Ext.isNumber(v) ? v : parseFloat(String(v).replace(this.decimalSeparator, "."));
        v = isNaN(v) ? '' : String(v).replace(".", this.decimalSeparator);
        return Ext.form.NumberField.superclass.setValue.call(this, v);
    },
    
    /**
     * Replaces any existing {@link #minValue} with the new value.
     * @param {Number} value The minimum value
     */
    setMinValue : function(value) {
        this.minValue = Ext.num(value, Number.NEGATIVE_INFINITY);
    },
    
    /**
     * Replaces any existing {@link #maxValue} with the new value.
     * @param {Number} value The maximum value
     */
    setMaxValue : function(value) {
        this.maxValue = Ext.num(value, Number.MAX_VALUE);    
    },

    // private
    parseValue : function(value) {
        value = parseFloat(String(value).replace(this.decimalSeparator, "."));
        return isNaN(value) ? '' : value;
    },

    /**
     * @private
     * 
     */
    fixPrecision : function(value) {
        var nan = isNaN(value);
        
        if (!this.allowDecimals || this.decimalPrecision == -1 || nan || !value) {
            return nan ? '' : value;
        }
        
        return parseFloat(parseFloat(value).toFixed(this.decimalPrecision));
    },

    beforeBlur : function() {
        var v = this.parseValue(this.getRawValue());
        
        if (!Ext.isEmpty(v)) {
            this.setValue(v);
        }
    }
});

Ext.reg('numberfield', Ext.form.NumberField);
