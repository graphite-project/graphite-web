/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/**
 * @class Ext.form.Field
 * @extends Ext.BoxComponent
 * Base class for form fields that provides default event handling, sizing, value handling and other functionality.
 * @constructor
 * Creates a new Field
 * @param {Object} config Configuration options
 * @xtype field
 */
Ext.form.Field = Ext.extend(Ext.BoxComponent,  {
    /**
     * <p>The label Element associated with this Field. <b>Only available after this Field has been rendered by a
     * {@link form Ext.layout.FormLayout} layout manager.</b></p>
     * @type Ext.Element
     * @property label
     */
    /**
     * @cfg {String} inputType The type attribute for input fields -- e.g. radio, text, password, file (defaults
     * to 'text'). The types 'file' and 'password' must be used to render those field types currently -- there are
     * no separate Ext components for those. Note that if you use <tt>inputType:'file'</tt>, {@link #emptyText}
     * is not supported and should be avoided.
     */
    /**
     * @cfg {Number} tabIndex The tabIndex for this field. Note this only applies to fields that are rendered,
     * not those which are built via applyTo (defaults to undefined).
     */
    /**
     * @cfg {Mixed} value A value to initialize this field with (defaults to undefined).
     */
    /**
     * @cfg {String} name The field's HTML name attribute (defaults to '').
     * <b>Note</b>: this property must be set if this field is to be automatically included with
     * {@link Ext.form.BasicForm#submit form submit()}.
     */
    /**
     * @cfg {String} cls A custom CSS class to apply to the field's underlying element (defaults to '').
     */

    /**
     * @cfg {String} invalidClass The CSS class to use when marking a field invalid (defaults to 'x-form-invalid')
     */
    invalidClass : 'x-form-invalid',
    /**
     * @cfg {String} invalidText The error text to use when marking a field invalid and no message is provided
     * (defaults to 'The value in this field is invalid')
     */
    invalidText : 'The value in this field is invalid',
    /**
     * @cfg {String} focusClass The CSS class to use when the field receives focus (defaults to 'x-form-focus')
     */
    focusClass : 'x-form-focus',
    /**
     * @cfg {Boolean} preventMark
     * <tt>true</tt> to disable {@link #markInvalid marking the field invalid}.
     * Defaults to <tt>false</tt>.
     */
    /**
     * @cfg {String/Boolean} validationEvent The event that should initiate field validation. Set to false to disable
      automatic validation (defaults to 'keyup').
     */
    validationEvent : 'keyup',
    /**
     * @cfg {Boolean} validateOnBlur Whether the field should validate when it loses focus (defaults to true).
     */
    validateOnBlur : true,
    /**
     * @cfg {Number} validationDelay The length of time in milliseconds after user input begins until validation
     * is initiated (defaults to 250)
     */
    validationDelay : 250,
    /**
     * @cfg {String/Object} autoCreate <p>A {@link Ext.DomHelper DomHelper} element spec, or true for a default
     * element spec. Used to create the {@link Ext.Component#getEl Element} which will encapsulate this Component.
     * See <tt>{@link Ext.Component#autoEl autoEl}</tt> for details.  Defaults to:</p>
     * <pre><code>{tag: 'input', type: 'text', size: '20', autocomplete: 'off'}</code></pre>
     */
    defaultAutoCreate : {tag: 'input', type: 'text', size: '20', autocomplete: 'off'},
    /**
     * @cfg {String} fieldClass The default CSS class for the field (defaults to 'x-form-field')
     */
    fieldClass : 'x-form-field',
    /**
     * @cfg {String} msgTarget <p>The location where the message text set through {@link #markInvalid} should display.
     * Must be one of the following values:</p>
     * <div class="mdetail-params"><ul>
     * <li><code>qtip</code> Display a quick tip containing the message when the user hovers over the field. This is the default.
     * <div class="subdesc"><b>{@link Ext.QuickTips#init Ext.QuickTips.init} must have been called for this setting to work.</b></div</li>
     * <li><code>title</code> Display the message in a default browser title attribute popup.</li>
     * <li><code>under</code> Add a block div beneath the field containing the error message.</li>
     * <li><code>side</code> Add an error icon to the right of the field, displaying the message in a popup on hover.</li>
     * <li><code>[element id]</code> Add the error message directly to the innerHTML of the specified element.</li>
     * </ul></div>
     */
    msgTarget : 'qtip',
    /**
     * @cfg {String} msgFx <b>Experimental</b> The effect used when displaying a validation message under the field
     * (defaults to 'normal').
     */
    msgFx : 'normal',
    /**
     * @cfg {Boolean} readOnly <tt>true</tt> to mark the field as readOnly in HTML
     * (defaults to <tt>false</tt>).
     * <br><p><b>Note</b>: this only sets the element's readOnly DOM attribute.
     * Setting <code>readOnly=true</code>, for example, will not disable triggering a
     * ComboBox or DateField; it gives you the option of forcing the user to choose
     * via the trigger without typing in the text box. To hide the trigger use
     * <code>{@link Ext.form.TriggerField#hideTrigger hideTrigger}</code>.</p>
     */
    readOnly : false,
    /**
     * @cfg {Boolean} disabled True to disable the field (defaults to false).
     * <p>Be aware that conformant with the <a href="http://www.w3.org/TR/html401/interact/forms.html#h-17.12.1">HTML specification</a>,
     * disabled Fields will not be {@link Ext.form.BasicForm#submit submitted}.</p>
     */
    disabled : false,
    /**
     * @cfg {Boolean} submitValue False to clear the name attribute on the field so that it is not submitted during a form post.
     * Defaults to <tt>true</tt>.
     */
    submitValue: true,

    // private
    isFormField : true,

    // private
    msgDisplay: '',

    // private
    hasFocus : false,

    // private
    initComponent : function(){
        Ext.form.Field.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event focus
             * Fires when this field receives input focus.
             * @param {Ext.form.Field} this
             */
            'focus',
            /**
             * @event blur
             * Fires when this field loses input focus.
             * @param {Ext.form.Field} this
             */
            'blur',
            /**
             * @event specialkey
             * Fires when any key related to navigation (arrows, tab, enter, esc, etc.) is pressed.
             * To handle other keys see {@link Ext.Panel#keys} or {@link Ext.KeyMap}.
             * You can check {@link Ext.EventObject#getKey} to determine which key was pressed.
             * For example: <pre><code>
var form = new Ext.form.FormPanel({
    ...
    items: [{
            fieldLabel: 'Field 1',
            name: 'field1',
            allowBlank: false
        },{
            fieldLabel: 'Field 2',
            name: 'field2',
            listeners: {
                specialkey: function(field, e){
                    // e.HOME, e.END, e.PAGE_UP, e.PAGE_DOWN,
                    // e.TAB, e.ESC, arrow keys: e.LEFT, e.RIGHT, e.UP, e.DOWN
                    if (e.{@link Ext.EventObject#getKey getKey()} == e.ENTER) {
                        var form = field.ownerCt.getForm();
                        form.submit();
                    }
                }
            }
        }
    ],
    ...
});
             * </code></pre>
             * @param {Ext.form.Field} this
             * @param {Ext.EventObject} e The event object
             */
            'specialkey',
            /**
             * @event change
             * Fires just before the field blurs if the field value has changed.
             * @param {Ext.form.Field} this
             * @param {Mixed} newValue The new value
             * @param {Mixed} oldValue The original value
             */
            'change',
            /**
             * @event invalid
             * Fires after the field has been marked as invalid.
             * @param {Ext.form.Field} this
             * @param {String} msg The validation message
             */
            'invalid',
            /**
             * @event valid
             * Fires after the field has been validated with no errors.
             * @param {Ext.form.Field} this
             */
            'valid'
        );
    },

    /**
     * Returns the {@link Ext.form.Field#name name} or {@link Ext.form.ComboBox#hiddenName hiddenName}
     * attribute of the field if available.
     * @return {String} name The field {@link Ext.form.Field#name name} or {@link Ext.form.ComboBox#hiddenName hiddenName}
     */
    getName : function(){
        return this.rendered && this.el.dom.name ? this.el.dom.name : this.name || this.id || '';
    },

    // private
    onRender : function(ct, position){
        if(!this.el){
            var cfg = this.getAutoCreate();

            if(!cfg.name){
                cfg.name = this.name || this.id;
            }
            if(this.inputType){
                cfg.type = this.inputType;
            }
            this.autoEl = cfg;
        }
        Ext.form.Field.superclass.onRender.call(this, ct, position);
        if(this.submitValue === false){
            this.el.dom.removeAttribute('name');
        }
        var type = this.el.dom.type;
        if(type){
            if(type == 'password'){
                type = 'text';
            }
            this.el.addClass('x-form-'+type);
        }
        if(this.readOnly){
            this.setReadOnly(true);
        }
        if(this.tabIndex !== undefined){
            this.el.dom.setAttribute('tabIndex', this.tabIndex);
        }

        this.el.addClass([this.fieldClass, this.cls]);
    },

    // private
    getItemCt : function(){
        return this.itemCt;
    },

    // private
    initValue : function(){
        if(this.value !== undefined){
            this.setValue(this.value);
        }else if(!Ext.isEmpty(this.el.dom.value) && this.el.dom.value != this.emptyText){
            this.setValue(this.el.dom.value);
        }
        /**
         * The original value of the field as configured in the {@link #value} configuration, or
         * as loaded by the last form load operation if the form's {@link Ext.form.BasicForm#trackResetOnLoad trackResetOnLoad}
         * setting is <code>true</code>.
         * @type mixed
         * @property originalValue
         */
        this.originalValue = this.getValue();
    },

    /**
     * <p>Returns true if the value of this Field has been changed from its original value.
     * Will return false if the field is disabled or has not been rendered yet.</p>
     * <p>Note that if the owning {@link Ext.form.BasicForm form} was configured with
     * {@link Ext.form.BasicForm}.{@link Ext.form.BasicForm#trackResetOnLoad trackResetOnLoad}
     * then the <i>original value</i> is updated when the values are loaded by
     * {@link Ext.form.BasicForm}.{@link Ext.form.BasicForm#setValues setValues}.</p>
     * @return {Boolean} True if this field has been changed from its original value (and
     * is not disabled), false otherwise.
     */
    isDirty : function() {
        if(this.disabled || !this.rendered) {
            return false;
        }
        return String(this.getValue()) !== String(this.originalValue);
    },

    /**
     * Sets the read only state of this field.
     * @param {Boolean} readOnly Whether the field should be read only.
     */
    setReadOnly : function(readOnly){
        if(this.rendered){
            this.el.dom.readOnly = readOnly;
        }
        this.readOnly = readOnly;
    },

    // private
    afterRender : function(){
        Ext.form.Field.superclass.afterRender.call(this);
        this.initEvents();
        this.initValue();
    },

    // private
    fireKey : function(e){
        if(e.isSpecialKey()){
            this.fireEvent('specialkey', this, e);
        }
    },

    /**
     * Resets the current field value to the originally loaded value and clears any validation messages.
     * See {@link Ext.form.BasicForm}.{@link Ext.form.BasicForm#trackResetOnLoad trackResetOnLoad}
     */
    reset : function(){
        this.setValue(this.originalValue);
        this.clearInvalid();
    },

    // private
    initEvents : function(){
        this.mon(this.el, Ext.EventManager.getKeyEvent(), this.fireKey,  this);
        this.mon(this.el, 'focus', this.onFocus, this);

        // standardise buffer across all browsers + OS-es for consistent event order.
        // (the 10ms buffer for Editors fixes a weird FF/Win editor issue when changing OS window focus)
        this.mon(this.el, 'blur', this.onBlur, this, this.inEditor ? {buffer:10} : null);
    },

    // private
    preFocus: Ext.emptyFn,

    // private
    onFocus : function(){
        this.preFocus();
        if(this.focusClass){
            this.el.addClass(this.focusClass);
        }
        if(!this.hasFocus){
            this.hasFocus = true;
            /**
             * <p>The value that the Field had at the time it was last focused. This is the value that is passed
             * to the {@link #change} event which is fired if the value has been changed when the Field is blurred.</p>
             * <p><b>This will be undefined until the Field has been visited.</b> Compare {@link #originalValue}.</p>
             * @type mixed
             * @property startValue
             */
            this.startValue = this.getValue();
            this.fireEvent('focus', this);
        }
    },

    // private
    beforeBlur : Ext.emptyFn,

    // private
    onBlur : function(){
        this.beforeBlur();
        if(this.focusClass){
            this.el.removeClass(this.focusClass);
        }
        this.hasFocus = false;
        if(this.validationEvent !== false && (this.validateOnBlur || this.validationEvent == 'blur')){
            this.validate();
        }
        var v = this.getValue();
        if(String(v) !== String(this.startValue)){
            this.fireEvent('change', this, v, this.startValue);
        }
        this.fireEvent('blur', this);
        this.postBlur();
    },

    // private
    postBlur : Ext.emptyFn,

    /**
     * Returns whether or not the field value is currently valid by
     * {@link #validateValue validating} the {@link #processValue processed value}
     * of the field. <b>Note</b>: {@link #disabled} fields are ignored.
     * @param {Boolean} preventMark True to disable marking the field invalid
     * @return {Boolean} True if the value is valid, else false
     */
    isValid : function(preventMark){
        if(this.disabled){
            return true;
        }
        var restore = this.preventMark;
        this.preventMark = preventMark === true;
        var v = this.validateValue(this.processValue(this.getRawValue()));
        this.preventMark = restore;
        return v;
    },

    /**
     * Validates the field value
     * @return {Boolean} True if the value is valid, else false
     */
    validate : function(){
        if(this.disabled || this.validateValue(this.processValue(this.getRawValue()))){
            this.clearInvalid();
            return true;
        }
        return false;
    },

    /**
     * This method should only be overridden if necessary to prepare raw values
     * for validation (see {@link #validate} and {@link #isValid}).  This method
     * is expected to return the processed value for the field which will
     * be used for validation (see validateValue method).
     * @param {Mixed} value
     */
    processValue : function(value){
        return value;
    },

    /**
     * Uses getErrors to build an array of validation errors. If any errors are found, markInvalid is called
     * with the first and false is returned, otherwise true is returned. Previously, subclasses were invited
     * to provide an implementation of this to process validations - from 3.2 onwards getErrors should be
     * overridden instead.
     * @param {Mixed} The current value of the field
     * @return {Boolean} True if all validations passed, false if one or more failed
     */
     validateValue : function(value) {
         //currently, we only show 1 error at a time for a field, so just use the first one
         var error = this.getErrors(value)[0];

         if (error == undefined) {
             return true;
         } else {
             this.markInvalid(error);
             return false;
         }
     },
    
    /**
     * Runs this field's validators and returns an array of error messages for any validation failures.
     * This is called internally during validation and would not usually need to be used manually.
     * Each subclass should override or augment the return value to provide their own errors
     * @return {Array} All error messages for this field
     */
    getErrors: function() {
        return [];
    },

    /**
     * Gets the active error message for this field.
     * @return {String} Returns the active error message on the field, if there is no error, an empty string is returned.
     */
    getActiveError : function(){
        return this.activeError || '';
    },

    /**
     * <p>Display an error message associated with this field, using {@link #msgTarget} to determine how to
     * display the message and applying {@link #invalidClass} to the field's UI element.</p>
     * <p><b>Note</b>: this method does not cause the Field's {@link #validate} method to return <code>false</code>
     * if the value does <i>pass</i> validation. So simply marking a Field as invalid will not prevent
     * submission of forms submitted with the {@link Ext.form.Action.Submit#clientValidation} option set.</p>
     * {@link #isValid invalid}.
     * @param {String} msg (optional) The validation message (defaults to {@link #invalidText})
     */
    markInvalid : function(msg){
        //don't set the error icon if we're not rendered or marking is prevented
        if (this.rendered && !this.preventMark) {
            msg = msg || this.invalidText;

            var mt = this.getMessageHandler();
            if(mt){
                mt.mark(this, msg);
            }else if(this.msgTarget){
                this.el.addClass(this.invalidClass);
                var t = Ext.getDom(this.msgTarget);
                if(t){
                    t.innerHTML = msg;
                    t.style.display = this.msgDisplay;
                }
            }
        }
        
        this.setActiveError(msg);
    },
    
    /**
     * Clear any invalid styles/messages for this field
     */
    clearInvalid : function(){
        //don't remove the error icon if we're not rendered or marking is prevented
        if (this.rendered && !this.preventMark) {
            this.el.removeClass(this.invalidClass);
            var mt = this.getMessageHandler();
            if(mt){
                mt.clear(this);
            }else if(this.msgTarget){
                this.el.removeClass(this.invalidClass);
                var t = Ext.getDom(this.msgTarget);
                if(t){
                    t.innerHTML = '';
                    t.style.display = 'none';
                }
            }
        }
        
        this.unsetActiveError();
    },

    /**
     * Sets the current activeError to the given string. Fires the 'invalid' event.
     * This does not set up the error icon, only sets the message and fires the event. To show the error icon,
     * use markInvalid instead, which calls this method internally
     * @param {String} msg The error message
     * @param {Boolean} suppressEvent True to suppress the 'invalid' event from being fired
     */
    setActiveError: function(msg, suppressEvent) {
        this.activeError = msg;
        if (suppressEvent !== true) this.fireEvent('invalid', this, msg);
    },
    
    /**
     * Clears the activeError and fires the 'valid' event. This is called internally by clearInvalid and would not
     * usually need to be called manually
     * @param {Boolean} suppressEvent True to suppress the 'invalid' event from being fired
     */
    unsetActiveError: function(suppressEvent) {
        delete this.activeError;
        if (suppressEvent !== true) this.fireEvent('valid', this);
    },

    // private
    getMessageHandler : function(){
        return Ext.form.MessageTargets[this.msgTarget];
    },

    // private
    getErrorCt : function(){
        return this.el.findParent('.x-form-element', 5, true) || // use form element wrap if available
            this.el.findParent('.x-form-field-wrap', 5, true);   // else direct field wrap
    },

    // Alignment for 'under' target
    alignErrorEl : function(){
        this.errorEl.setWidth(this.getErrorCt().getWidth(true) - 20);
    },

    // Alignment for 'side' target
    alignErrorIcon : function(){
        this.errorIcon.alignTo(this.el, 'tl-tr', [2, 0]);
    },

    /**
     * Returns the raw data value which may or may not be a valid, defined value.  To return a normalized value see {@link #getValue}.
     * @return {Mixed} value The field value
     */
    getRawValue : function(){
        var v = this.rendered ? this.el.getValue() : Ext.value(this.value, '');
        if(v === this.emptyText){
            v = '';
        }
        return v;
    },

    /**
     * Returns the normalized data value (undefined or emptyText will be returned as '').  To return the raw value see {@link #getRawValue}.
     * @return {Mixed} value The field value
     */
    getValue : function(){
        if(!this.rendered) {
            return this.value;
        }
        var v = this.el.getValue();
        if(v === this.emptyText || v === undefined){
            v = '';
        }
        return v;
    },

    /**
     * Sets the underlying DOM field's value directly, bypassing validation.  To set the value with validation see {@link #setValue}.
     * @param {Mixed} value The value to set
     * @return {Mixed} value The field value that is set
     */
    setRawValue : function(v){
        return this.rendered ? (this.el.dom.value = (Ext.isEmpty(v) ? '' : v)) : '';
    },

    /**
     * Sets a data value into the field and validates it.  To set the value directly without validation see {@link #setRawValue}.
     * @param {Mixed} value The value to set
     * @return {Ext.form.Field} this
     */
    setValue : function(v){
        this.value = v;
        if(this.rendered){
            this.el.dom.value = (Ext.isEmpty(v) ? '' : v);
            this.validate();
        }
        return this;
    },

    // private, does not work for all fields
    append : function(v){
         this.setValue([this.getValue(), v].join(''));
    }

    /**
     * @cfg {Boolean} autoWidth @hide
     */
    /**
     * @cfg {Boolean} autoHeight @hide
     */

    /**
     * @cfg {String} autoEl @hide
     */
});


Ext.form.MessageTargets = {
    'qtip' : {
        mark: function(field, msg){
            field.el.addClass(field.invalidClass);
            field.el.dom.qtip = msg;
            field.el.dom.qclass = 'x-form-invalid-tip';
            if(Ext.QuickTips){ // fix for floating editors interacting with DND
                Ext.QuickTips.enable();
            }
        },
        clear: function(field){
            field.el.removeClass(field.invalidClass);
            field.el.dom.qtip = '';
        }
    },
    'title' : {
        mark: function(field, msg){
            field.el.addClass(field.invalidClass);
            field.el.dom.title = msg;
        },
        clear: function(field){
            field.el.dom.title = '';
        }
    },
    'under' : {
        mark: function(field, msg){
            field.el.addClass(field.invalidClass);
            if(!field.errorEl){
                var elp = field.getErrorCt();
                if(!elp){ // field has no container el
                    field.el.dom.title = msg;
                    return;
                }
                field.errorEl = elp.createChild({cls:'x-form-invalid-msg'});
                field.on('resize', field.alignErrorEl, field);
                field.on('destroy', function(){
                    Ext.destroy(this.errorEl);
                }, field);
            }
            field.alignErrorEl();
            field.errorEl.update(msg);
            Ext.form.Field.msgFx[field.msgFx].show(field.errorEl, field);
        },
        clear: function(field){
            field.el.removeClass(field.invalidClass);
            if(field.errorEl){
                Ext.form.Field.msgFx[field.msgFx].hide(field.errorEl, field);
            }else{
                field.el.dom.title = '';
            }
        }
    },
    'side' : {
        mark: function(field, msg){
            field.el.addClass(field.invalidClass);
            if(!field.errorIcon){
                var elp = field.getErrorCt();
                // field has no container el
                if(!elp){
                    field.el.dom.title = msg;
                    return;
                }
                field.errorIcon = elp.createChild({cls:'x-form-invalid-icon'});
                if (field.ownerCt) {
                    field.ownerCt.on('afterlayout', field.alignErrorIcon, field);
                    field.ownerCt.on('expand', field.alignErrorIcon, field);
                }
                field.on('resize', field.alignErrorIcon, field);
                field.on('destroy', function(){
                    Ext.destroy(this.errorIcon);
                }, field);
            }
            field.alignErrorIcon();
            field.errorIcon.dom.qtip = msg;
            field.errorIcon.dom.qclass = 'x-form-invalid-tip';
            field.errorIcon.show();
        },
        clear: function(field){
            field.el.removeClass(field.invalidClass);
            if(field.errorIcon){
                field.errorIcon.dom.qtip = '';
                field.errorIcon.hide();
            }else{
                field.el.dom.title = '';
            }
        }
    }
};

// anything other than normal should be considered experimental
Ext.form.Field.msgFx = {
    normal : {
        show: function(msgEl, f){
            msgEl.setDisplayed('block');
        },

        hide : function(msgEl, f){
            msgEl.setDisplayed(false).update('');
        }
    },

    slide : {
        show: function(msgEl, f){
            msgEl.slideIn('t', {stopFx:true});
        },

        hide : function(msgEl, f){
            msgEl.slideOut('t', {stopFx:true,useDisplay:true});
        }
    },

    slideRight : {
        show: function(msgEl, f){
            msgEl.fixDisplay();
            msgEl.alignTo(f.el, 'tl-tr');
            msgEl.slideIn('l', {stopFx:true});
        },

        hide : function(msgEl, f){
            msgEl.slideOut('l', {stopFx:true,useDisplay:true});
        }
    }
};
Ext.reg('field', Ext.form.Field);
/**
 * @class Ext.form.TextField
 * @extends Ext.form.Field
 * <p>Basic text field.  Can be used as a direct replacement for traditional text inputs,
 * or as the base class for more sophisticated input controls (like {@link Ext.form.TextArea}
 * and {@link Ext.form.ComboBox}).</p>
 * <p><b><u>Validation</u></b></p>
 * <p>The validation procedure is described in the documentation for {@link #validateValue}.</p>
 * <p><b><u>Alter Validation Behavior</u></b></p>
 * <p>Validation behavior for each field can be configured:</p>
 * <div class="mdetail-params"><ul>
 * <li><code>{@link Ext.form.TextField#invalidText invalidText}</code> : the default validation message to
 * show if any validation step above does not provide a message when invalid</li>
 * <li><code>{@link Ext.form.TextField#maskRe maskRe}</code> : filter out keystrokes before any validation occurs</li>
 * <li><code>{@link Ext.form.TextField#stripCharsRe stripCharsRe}</code> : filter characters after being typed in,
 * but before being validated</li>
 * <li><code>{@link Ext.form.Field#invalidClass invalidClass}</code> : alternate style when invalid</li>
 * <li><code>{@link Ext.form.Field#validateOnBlur validateOnBlur}</code>,
 * <code>{@link Ext.form.Field#validationDelay validationDelay}</code>, and
 * <code>{@link Ext.form.Field#validationEvent validationEvent}</code> : modify how/when validation is triggered</li>
 * </ul></div>
 * 
 * @constructor Creates a new TextField
 * @param {Object} config Configuration options
 * 
 * @xtype textfield
 */
Ext.form.TextField = Ext.extend(Ext.form.Field,  {
    /**
     * @cfg {String} vtypeText A custom error message to display in place of the default message provided
     * for the <b><code>{@link #vtype}</code></b> currently set for this field (defaults to <tt>''</tt>).  <b>Note</b>:
     * only applies if <b><code>{@link #vtype}</code></b> is set, else ignored.
     */
    /**
     * @cfg {RegExp} stripCharsRe A JavaScript RegExp object used to strip unwanted content from the value
     * before validation (defaults to <tt>null</tt>).
     */
    /**
     * @cfg {Boolean} grow <tt>true</tt> if this field should automatically grow and shrink to its content
     * (defaults to <tt>false</tt>)
     */
    grow : false,
    /**
     * @cfg {Number} growMin The minimum width to allow when <code><b>{@link #grow}</b> = true</code> (defaults
     * to <tt>30</tt>)
     */
    growMin : 30,
    /**
     * @cfg {Number} growMax The maximum width to allow when <code><b>{@link #grow}</b> = true</code> (defaults
     * to <tt>800</tt>)
     */
    growMax : 800,
    /**
     * @cfg {String} vtype A validation type name as defined in {@link Ext.form.VTypes} (defaults to <tt>null</tt>)
     */
    vtype : null,
    /**
     * @cfg {RegExp} maskRe An input mask regular expression that will be used to filter keystrokes that do
     * not match (defaults to <tt>null</tt>)
     */
    maskRe : null,
    /**
     * @cfg {Boolean} disableKeyFilter Specify <tt>true</tt> to disable input keystroke filtering (defaults
     * to <tt>false</tt>)
     */
    disableKeyFilter : false,
    /**
     * @cfg {Boolean} allowBlank Specify <tt>false</tt> to validate that the value's length is > 0 (defaults to
     * <tt>true</tt>)
     */
    allowBlank : true,
    /**
     * @cfg {Number} minLength Minimum input field length required (defaults to <tt>0</tt>)
     */
    minLength : 0,
    /**
     * @cfg {Number} maxLength Maximum input field length allowed by validation (defaults to Number.MAX_VALUE).
     * This behavior is intended to provide instant feedback to the user by improving usability to allow pasting
     * and editing or overtyping and back tracking. To restrict the maximum number of characters that can be
     * entered into the field use <tt><b>{@link Ext.form.Field#autoCreate autoCreate}</b></tt> to add
     * any attributes you want to a field, for example:<pre><code>
var myField = new Ext.form.NumberField({
    id: 'mobile',
    anchor:'90%',
    fieldLabel: 'Mobile',
    maxLength: 16, // for validation
    autoCreate: {tag: 'input', type: 'text', size: '20', autocomplete: 'off', maxlength: '10'}
});
</code></pre>
     */
    maxLength : Number.MAX_VALUE,
    /**
     * @cfg {String} minLengthText Error text to display if the <b><tt>{@link #minLength minimum length}</tt></b>
     * validation fails (defaults to <tt>'The minimum length for this field is {minLength}'</tt>)
     */
    minLengthText : 'The minimum length for this field is {0}',
    /**
     * @cfg {String} maxLengthText Error text to display if the <b><tt>{@link #maxLength maximum length}</tt></b>
     * validation fails (defaults to <tt>'The maximum length for this field is {maxLength}'</tt>)
     */
    maxLengthText : 'The maximum length for this field is {0}',
    /**
     * @cfg {Boolean} selectOnFocus <tt>true</tt> to automatically select any existing field text when the field
     * receives input focus (defaults to <tt>false</tt>)
     */
    selectOnFocus : false,
    /**
     * @cfg {String} blankText The error text to display if the <b><tt>{@link #allowBlank}</tt></b> validation
     * fails (defaults to <tt>'This field is required'</tt>)
     */
    blankText : 'This field is required',
    /**
     * @cfg {Function} validator
     * <p>A custom validation function to be called during field validation ({@link #validateValue})
     * (defaults to <tt>null</tt>). If specified, this function will be called first, allowing the
     * developer to override the default validation process.</p>
     * <br><p>This function will be passed the following Parameters:</p>
     * <div class="mdetail-params"><ul>
     * <li><code>value</code>: <i>Mixed</i>
     * <div class="sub-desc">The current field value</div></li>
     * </ul></div>
     * <br><p>This function is to Return:</p>
     * <div class="mdetail-params"><ul>
     * <li><code>true</code>: <i>Boolean</i>
     * <div class="sub-desc"><code>true</code> if the value is valid</div></li>
     * <li><code>msg</code>: <i>String</i>
     * <div class="sub-desc">An error message if the value is invalid</div></li>
     * </ul></div>
     */
    validator : null,
    /**
     * @cfg {RegExp} regex A JavaScript RegExp object to be tested against the field value during validation
     * (defaults to <tt>null</tt>). If the test fails, the field will be marked invalid using
     * <b><tt>{@link #regexText}</tt></b>.
     */
    regex : null,
    /**
     * @cfg {String} regexText The error text to display if <b><tt>{@link #regex}</tt></b> is used and the
     * test fails during validation (defaults to <tt>''</tt>)
     */
    regexText : '',
    /**
     * @cfg {String} emptyText The default text to place into an empty field (defaults to <tt>null</tt>).
     * <b>Note</b>: that this value will be submitted to the server if this field is enabled and configured
     * with a {@link #name}.
     */
    emptyText : null,
    /**
     * @cfg {String} emptyClass The CSS class to apply to an empty field to style the <b><tt>{@link #emptyText}</tt></b>
     * (defaults to <tt>'x-form-empty-field'</tt>).  This class is automatically added and removed as needed
     * depending on the current field value.
     */
    emptyClass : 'x-form-empty-field',

    /**
     * @cfg {Boolean} enableKeyEvents <tt>true</tt> to enable the proxying of key events for the HTML input
     * field (defaults to <tt>false</tt>)
     */

    initComponent : function(){
        Ext.form.TextField.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event autosize
             * Fires when the <tt><b>{@link #autoSize}</b></tt> function is triggered. The field may or
             * may not have actually changed size according to the default logic, but this event provides
             * a hook for the developer to apply additional logic at runtime to resize the field if needed.
             * @param {Ext.form.Field} this This text field
             * @param {Number} width The new field width
             */
            'autosize',

            /**
             * @event keydown
             * Keydown input field event. This event only fires if <tt><b>{@link #enableKeyEvents}</b></tt>
             * is set to true.
             * @param {Ext.form.TextField} this This text field
             * @param {Ext.EventObject} e
             */
            'keydown',
            /**
             * @event keyup
             * Keyup input field event. This event only fires if <tt><b>{@link #enableKeyEvents}</b></tt>
             * is set to true.
             * @param {Ext.form.TextField} this This text field
             * @param {Ext.EventObject} e
             */
            'keyup',
            /**
             * @event keypress
             * Keypress input field event. This event only fires if <tt><b>{@link #enableKeyEvents}</b></tt>
             * is set to true.
             * @param {Ext.form.TextField} this This text field
             * @param {Ext.EventObject} e
             */
            'keypress'
        );
    },

    // private
    initEvents : function(){
        Ext.form.TextField.superclass.initEvents.call(this);
        if(this.validationEvent == 'keyup'){
            this.validationTask = new Ext.util.DelayedTask(this.validate, this);
            this.mon(this.el, 'keyup', this.filterValidation, this);
        }
        else if(this.validationEvent !== false && this.validationEvent != 'blur'){
        	this.mon(this.el, this.validationEvent, this.validate, this, {buffer: this.validationDelay});
        }
        if(this.selectOnFocus || this.emptyText){            
            this.mon(this.el, 'mousedown', this.onMouseDown, this);
            
            if(this.emptyText){
                this.applyEmptyText();
            }
        }
        if(this.maskRe || (this.vtype && this.disableKeyFilter !== true && (this.maskRe = Ext.form.VTypes[this.vtype+'Mask']))){
        	this.mon(this.el, 'keypress', this.filterKeys, this);
        }
        if(this.grow){
        	this.mon(this.el, 'keyup', this.onKeyUpBuffered, this, {buffer: 50});
			this.mon(this.el, 'click', this.autoSize, this);
        }
        if(this.enableKeyEvents){
            this.mon(this.el, {
                scope: this,
                keyup: this.onKeyUp,
                keydown: this.onKeyDown,
                keypress: this.onKeyPress
            });
        }
    },
    
    onMouseDown: function(e){
        if(!this.hasFocus){
            this.mon(this.el, 'mouseup', Ext.emptyFn, this, { single: true, preventDefault: true });
        }
    },

    processValue : function(value){
        if(this.stripCharsRe){
            var newValue = value.replace(this.stripCharsRe, '');
            if(newValue !== value){
                this.setRawValue(newValue);
                return newValue;
            }
        }
        return value;
    },

    filterValidation : function(e){
        if(!e.isNavKeyPress()){
            this.validationTask.delay(this.validationDelay);
        }
    },
    
    //private
    onDisable: function(){
        Ext.form.TextField.superclass.onDisable.call(this);
        if(Ext.isIE){
            this.el.dom.unselectable = 'on';
        }
    },
    
    //private
    onEnable: function(){
        Ext.form.TextField.superclass.onEnable.call(this);
        if(Ext.isIE){
            this.el.dom.unselectable = '';
        }
    },

    // private
    onKeyUpBuffered : function(e){
        if(this.doAutoSize(e)){
            this.autoSize();
        }
    },
    
    // private
    doAutoSize : function(e){
        return !e.isNavKeyPress();
    },

    // private
    onKeyUp : function(e){
        this.fireEvent('keyup', this, e);
    },

    // private
    onKeyDown : function(e){
        this.fireEvent('keydown', this, e);
    },

    // private
    onKeyPress : function(e){
        this.fireEvent('keypress', this, e);
    },

    /**
     * Resets the current field value to the originally-loaded value and clears any validation messages.
     * Also adds <tt><b>{@link #emptyText}</b></tt> and <tt><b>{@link #emptyClass}</b></tt> if the
     * original value was blank.
     */
    reset : function(){
        Ext.form.TextField.superclass.reset.call(this);
        this.applyEmptyText();
    },

    applyEmptyText : function(){
        if(this.rendered && this.emptyText && this.getRawValue().length < 1 && !this.hasFocus){
            this.setRawValue(this.emptyText);
            this.el.addClass(this.emptyClass);
        }
    },

    // private
    preFocus : function(){
        var el = this.el,
            isEmpty;
        if(this.emptyText){
            if(el.dom.value == this.emptyText){
                this.setRawValue('');
                isEmpty = true;
            }
            el.removeClass(this.emptyClass);
        }
        if(this.selectOnFocus || isEmpty){
            el.dom.select();
        }
    },

    // private
    postBlur : function(){
        this.applyEmptyText();
    },

    // private
    filterKeys : function(e){
        if(e.ctrlKey){
            return;
        }
        var k = e.getKey();
        if(Ext.isGecko && (e.isNavKeyPress() || k == e.BACKSPACE || (k == e.DELETE && e.button == -1))){
            return;
        }
        var cc = String.fromCharCode(e.getCharCode());
        if(!Ext.isGecko && e.isSpecialKey() && !cc){
            return;
        }
        if(!this.maskRe.test(cc)){
            e.stopEvent();
        }
    },

    setValue : function(v){
        if(this.emptyText && this.el && !Ext.isEmpty(v)){
            this.el.removeClass(this.emptyClass);
        }
        Ext.form.TextField.superclass.setValue.apply(this, arguments);
        this.applyEmptyText();
        this.autoSize();
        return this;
    },

    /**
     * <p>Validates a value according to the field's validation rules and returns an array of errors
     * for any failing validations. Validation rules are processed in the following order:</p>
     * <div class="mdetail-params"><ul>
     * 
     * <li><b>1. Field specific validator</b>
     * <div class="sub-desc">
     * <p>A validator offers a way to customize and reuse a validation specification.
     * If a field is configured with a <code>{@link #validator}</code>
     * function, it will be passed the current field value.  The <code>{@link #validator}</code>
     * function is expected to return either:
     * <div class="mdetail-params"><ul>
     * <li>Boolean <tt>true</tt> if the value is valid (validation continues).</li>
     * <li>a String to represent the invalid message if invalid (validation halts).</li>
     * </ul></div>
     * </div></li>
     * 
     * <li><b>2. Basic Validation</b>
     * <div class="sub-desc">
     * <p>If the <code>{@link #validator}</code> has not halted validation,
     * basic validation proceeds as follows:</p>
     * 
     * <div class="mdetail-params"><ul>
     * 
     * <li><code>{@link #allowBlank}</code> : (Invalid message =
     * <code>{@link #emptyText}</code>)<div class="sub-desc">
     * Depending on the configuration of <code>{@link #allowBlank}</code>, a
     * blank field will cause validation to halt at this step and return
     * Boolean true or false accordingly.  
     * </div></li>
     * 
     * <li><code>{@link #minLength}</code> : (Invalid message =
     * <code>{@link #minLengthText}</code>)<div class="sub-desc">
     * If the passed value does not satisfy the <code>{@link #minLength}</code>
     * specified, validation halts.
     * </div></li>
     * 
     * <li><code>{@link #maxLength}</code> : (Invalid message =
     * <code>{@link #maxLengthText}</code>)<div class="sub-desc">
     * If the passed value does not satisfy the <code>{@link #maxLength}</code>
     * specified, validation halts.
     * </div></li>
     * 
     * </ul></div>
     * </div></li>
     * 
     * <li><b>3. Preconfigured Validation Types (VTypes)</b>
     * <div class="sub-desc">
     * <p>If none of the prior validation steps halts validation, a field
     * configured with a <code>{@link #vtype}</code> will utilize the
     * corresponding {@link Ext.form.VTypes VTypes} validation function.
     * If invalid, either the field's <code>{@link #vtypeText}</code> or
     * the VTypes vtype Text property will be used for the invalid message.
     * Keystrokes on the field will be filtered according to the VTypes
     * vtype Mask property.</p>
     * </div></li>
     * 
     * <li><b>4. Field specific regex test</b>
     * <div class="sub-desc">
     * <p>If none of the prior validation steps halts validation, a field's
     * configured <code>{@link #regex}</code> test will be processed.
     * The invalid message for this test is configured with
     * <code>{@link #regexText}</code>.</p>
     * </div></li>
     * 
     * @param {Mixed} value The value to validate. The processed raw value will be used if nothing is passed
     * @return {Array} Array of any validation errors
     */
    getErrors: function(value) {
        var errors = Ext.form.TextField.superclass.getErrors.apply(this, arguments);
        
        value = Ext.isDefined(value) ? value : this.processValue(this.getRawValue());        
        
        if (Ext.isFunction(this.validator)) {
            var msg = this.validator(value);
            if (msg !== true) {
                errors.push(msg);
            }
        }
        
        if (value.length < 1 || value === this.emptyText) {
            if (this.allowBlank) {
                //if value is blank and allowBlank is true, there cannot be any additional errors
                return errors;
            } else {
                errors.push(this.blankText);
            }
        }
        
        if (!this.allowBlank && (value.length < 1 || value === this.emptyText)) { // if it's blank
            errors.push(this.blankText);
        }
        
        if (value.length < this.minLength) {
            errors.push(String.format(this.minLengthText, this.minLength));
        }
        
        if (value.length > this.maxLength) {
            errors.push(String.format(this.maxLengthText, this.maxLength));
        }
        
        if (this.vtype) {
            var vt = Ext.form.VTypes;
            if(!vt[this.vtype](value, this)){
                errors.push(this.vtypeText || vt[this.vtype +'Text']);
            }
        }
        
        if (this.regex && !this.regex.test(value)) {
            errors.push(this.regexText);
        }
        
        return errors;
    },

    /**
     * Selects text in this field
     * @param {Number} start (optional) The index where the selection should start (defaults to 0)
     * @param {Number} end (optional) The index where the selection should end (defaults to the text length)
     */
    selectText : function(start, end){
        var v = this.getRawValue();
        var doFocus = false;
        if(v.length > 0){
            start = start === undefined ? 0 : start;
            end = end === undefined ? v.length : end;
            var d = this.el.dom;
            if(d.setSelectionRange){
                d.setSelectionRange(start, end);
            }else if(d.createTextRange){
                var range = d.createTextRange();
                range.moveStart('character', start);
                range.moveEnd('character', end-v.length);
                range.select();
            }
            doFocus = Ext.isGecko || Ext.isOpera;
        }else{
            doFocus = true;
        }
        if(doFocus){
            this.focus();
        }
    },

    /**
     * Automatically grows the field to accomodate the width of the text up to the maximum field width allowed.
     * This only takes effect if <tt><b>{@link #grow}</b> = true</tt>, and fires the {@link #autosize} event.
     */
    autoSize : function(){
        if(!this.grow || !this.rendered){
            return;
        }
        if(!this.metrics){
            this.metrics = Ext.util.TextMetrics.createInstance(this.el);
        }
        var el = this.el;
        var v = el.dom.value;
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(v));
        v = d.innerHTML;
        Ext.removeNode(d);
        d = null;
        v += '&#160;';
        var w = Math.min(this.growMax, Math.max(this.metrics.getWidth(v) + /* add extra padding */ 10, this.growMin));
        this.el.setWidth(w);
        this.fireEvent('autosize', this, w);
    },
	
	onDestroy: function(){
		if(this.validationTask){
			this.validationTask.cancel();
			this.validationTask = null;
		}
		Ext.form.TextField.superclass.onDestroy.call(this);
	}
});
Ext.reg('textfield', Ext.form.TextField);
/**
 * @class Ext.form.TriggerField
 * @extends Ext.form.TextField
 * Provides a convenient wrapper for TextFields that adds a clickable trigger button (looks like a combobox by default).
 * The trigger has no default action, so you must assign a function to implement the trigger click handler by
 * overriding {@link #onTriggerClick}. You can create a TriggerField directly, as it renders exactly like a combobox
 * for which you can provide a custom implementation.  For example:
 * <pre><code>
var trigger = new Ext.form.TriggerField();
trigger.onTriggerClick = myTriggerFn;
trigger.applyToMarkup('my-field');
</code></pre>
 *
 * However, in general you will most likely want to use TriggerField as the base class for a reusable component.
 * {@link Ext.form.DateField} and {@link Ext.form.ComboBox} are perfect examples of this.
 *
 * @constructor
 * Create a new TriggerField.
 * @param {Object} config Configuration options (valid {@Ext.form.TextField} config options will also be applied
 * to the base TextField)
 * @xtype trigger
 */
Ext.form.TriggerField = Ext.extend(Ext.form.TextField,  {
    /**
     * @cfg {String} triggerClass
     * An additional CSS class used to style the trigger button.  The trigger will always get the
     * class <tt>'x-form-trigger'</tt> by default and <tt>triggerClass</tt> will be <b>appended</b> if specified.
     */
    /**
     * @cfg {Mixed} triggerConfig
     * <p>A {@link Ext.DomHelper DomHelper} config object specifying the structure of the
     * trigger element for this Field. (Optional).</p>
     * <p>Specify this when you need a customized element to act as the trigger button for a TriggerField.</p>
     * <p>Note that when using this option, it is the developer's responsibility to ensure correct sizing, positioning
     * and appearance of the trigger.  Defaults to:</p>
     * <pre><code>{tag: "img", src: Ext.BLANK_IMAGE_URL, cls: "x-form-trigger " + this.triggerClass}</code></pre>
     */
    /**
     * @cfg {String/Object} autoCreate <p>A {@link Ext.DomHelper DomHelper} element spec, or true for a default
     * element spec. Used to create the {@link Ext.Component#getEl Element} which will encapsulate this Component.
     * See <tt>{@link Ext.Component#autoEl autoEl}</tt> for details.  Defaults to:</p>
     * <pre><code>{tag: "input", type: "text", size: "16", autocomplete: "off"}</code></pre>
     */
    defaultAutoCreate : {tag: "input", type: "text", size: "16", autocomplete: "off"},
    /**
     * @cfg {Boolean} hideTrigger <tt>true</tt> to hide the trigger element and display only the base
     * text field (defaults to <tt>false</tt>)
     */
    hideTrigger:false,
    /**
     * @cfg {Boolean} editable <tt>false</tt> to prevent the user from typing text directly into the field,
     * the field will only respond to a click on the trigger to set the value. (defaults to <tt>true</tt>).
     */
    editable: true,
    /**
     * @cfg {Boolean} readOnly <tt>true</tt> to prevent the user from changing the field, and
     * hides the trigger.  Superceeds the editable and hideTrigger options if the value is true.
     * (defaults to <tt>false</tt>)
     */
    readOnly: false,
    /**
     * @cfg {String} wrapFocusClass The class added to the to the wrap of the trigger element. Defaults to
     * <tt>x-trigger-wrap-focus</tt>.
     */
    wrapFocusClass: 'x-trigger-wrap-focus',
    /**
     * @hide
     * @method autoSize
     */
    autoSize: Ext.emptyFn,
    // private
    monitorTab : true,
    // private
    deferHeight : true,
    // private
    mimicing : false,

    actionMode: 'wrap',

    defaultTriggerWidth: 17,

    // private
    onResize : function(w, h){
        Ext.form.TriggerField.superclass.onResize.call(this, w, h);
        var tw = this.getTriggerWidth();
        if(Ext.isNumber(w)){
            this.el.setWidth(w - tw);
        }
        this.wrap.setWidth(this.el.getWidth() + tw);
    },

    getTriggerWidth: function(){
        var tw = this.trigger.getWidth();
        if(!this.hideTrigger && !this.readOnly && tw === 0){
            tw = this.defaultTriggerWidth;
        }
        return tw;
    },

    // private
    alignErrorIcon : function(){
        if(this.wrap){
            this.errorIcon.alignTo(this.wrap, 'tl-tr', [2, 0]);
        }
    },

    // private
    onRender : function(ct, position){
        this.doc = Ext.isIE ? Ext.getBody() : Ext.getDoc();
        Ext.form.TriggerField.superclass.onRender.call(this, ct, position);

        this.wrap = this.el.wrap({cls: 'x-form-field-wrap x-form-field-trigger-wrap'});
        this.trigger = this.wrap.createChild(this.triggerConfig ||
                {tag: "img", src: Ext.BLANK_IMAGE_URL, alt: "", cls: "x-form-trigger " + this.triggerClass});
        this.initTrigger();
        if(!this.width){
            this.wrap.setWidth(this.el.getWidth()+this.trigger.getWidth());
        }
        this.resizeEl = this.positionEl = this.wrap;
    },

    getWidth: function() {
        return(this.el.getWidth() + this.trigger.getWidth());
    },

    updateEditState: function(){
        if(this.rendered){
            if (this.readOnly) {
                this.el.dom.readOnly = true;
                this.el.addClass('x-trigger-noedit');
                this.mun(this.el, 'click', this.onTriggerClick, this);
                this.trigger.setDisplayed(false);
            } else {
                if (!this.editable) {
                    this.el.dom.readOnly = true;
                    this.el.addClass('x-trigger-noedit');
                    this.mon(this.el, 'click', this.onTriggerClick, this);
                } else {
                    this.el.dom.readOnly = false;
                    this.el.removeClass('x-trigger-noedit');
                    this.mun(this.el, 'click', this.onTriggerClick, this);
                }
                this.trigger.setDisplayed(!this.hideTrigger);
            }
            this.onResize(this.width || this.wrap.getWidth());
        }
    },

    /**
     * Changes the hidden status of the trigger.
     * @param {Boolean} hideTrigger True to hide the trigger, false to show it.
     */
    setHideTrigger: function(hideTrigger){
        if(hideTrigger != this.hideTrigger){
            this.hideTrigger = hideTrigger;
            this.updateEditState();
        }
    },

    /**
     * Allow or prevent the user from directly editing the field text.  If false is passed,
     * the user will only be able to modify the field using the trigger.  Will also add
     * a click event to the text field which will call the trigger. This method
     * is the runtime equivalent of setting the {@link #editable} config option at config time.
     * @param {Boolean} value True to allow the user to directly edit the field text.
     */
    setEditable: function(editable){
        if(editable != this.editable){
            this.editable = editable;
            this.updateEditState();
        }
    },

    /**
     * Setting this to true will supersede settings {@link #editable} and {@link #hideTrigger}.
     * Setting this to false will defer back to {@link #editable} and {@link #hideTrigger}. This method
     * is the runtime equivalent of setting the {@link #readOnly} config option at config time.
     * @param {Boolean} value True to prevent the user changing the field and explicitly
     * hide the trigger.
     */
    setReadOnly: function(readOnly){
        if(readOnly != this.readOnly){
            this.readOnly = readOnly;
            this.updateEditState();
        }
    },

    afterRender : function(){
        Ext.form.TriggerField.superclass.afterRender.call(this);
        this.updateEditState();
    },

    // private
    initTrigger : function(){
        this.mon(this.trigger, 'click', this.onTriggerClick, this, {preventDefault:true});
        this.trigger.addClassOnOver('x-form-trigger-over');
        this.trigger.addClassOnClick('x-form-trigger-click');
    },

    // private
    onDestroy : function(){
        Ext.destroy(this.trigger, this.wrap);
        if (this.mimicing){
            this.doc.un('mousedown', this.mimicBlur, this);
        }
        delete this.doc;
        Ext.form.TriggerField.superclass.onDestroy.call(this);
    },

    // private
    onFocus : function(){
        Ext.form.TriggerField.superclass.onFocus.call(this);
        if(!this.mimicing){
            this.wrap.addClass(this.wrapFocusClass);
            this.mimicing = true;
            this.doc.on('mousedown', this.mimicBlur, this, {delay: 10});
            if(this.monitorTab){
                this.on('specialkey', this.checkTab, this);
            }
        }
    },

    // private
    checkTab : function(me, e){
        if(e.getKey() == e.TAB){
            this.triggerBlur();
        }
    },

    // private
    onBlur : Ext.emptyFn,

    // private
    mimicBlur : function(e){
        if(!this.isDestroyed && !this.wrap.contains(e.target) && this.validateBlur(e)){
            this.triggerBlur();
        }
    },

    // private
    triggerBlur : function(){
        this.mimicing = false;
        this.doc.un('mousedown', this.mimicBlur, this);
        if(this.monitorTab && this.el){
            this.un('specialkey', this.checkTab, this);
        }
        Ext.form.TriggerField.superclass.onBlur.call(this);
        if(this.wrap){
            this.wrap.removeClass(this.wrapFocusClass);
        }
    },

    beforeBlur : Ext.emptyFn,

    // private
    // This should be overriden by any subclass that needs to check whether or not the field can be blurred.
    validateBlur : function(e){
        return true;
    },

    /**
     * The function that should handle the trigger's click event.  This method does nothing by default
     * until overridden by an implementing function.  See Ext.form.ComboBox and Ext.form.DateField for
     * sample implementations.
     * @method
     * @param {EventObject} e
     */
    onTriggerClick : Ext.emptyFn

    /**
     * @cfg {Boolean} grow @hide
     */
    /**
     * @cfg {Number} growMin @hide
     */
    /**
     * @cfg {Number} growMax @hide
     */
});

/**
 * @class Ext.form.TwinTriggerField
 * @extends Ext.form.TriggerField
 * TwinTriggerField is not a public class to be used directly.  It is meant as an abstract base class
 * to be extended by an implementing class.  For an example of implementing this class, see the custom
 * SearchField implementation here:
 * <a href="http://extjs.com/deploy/ext/examples/form/custom.html">http://extjs.com/deploy/ext/examples/form/custom.html</a>
 */
Ext.form.TwinTriggerField = Ext.extend(Ext.form.TriggerField, {
    /**
     * @cfg {Mixed} triggerConfig
     * <p>A {@link Ext.DomHelper DomHelper} config object specifying the structure of the trigger elements
     * for this Field. (Optional).</p>
     * <p>Specify this when you need a customized element to contain the two trigger elements for this Field.
     * Each trigger element must be marked by the CSS class <tt>x-form-trigger</tt> (also see
     * <tt>{@link #trigger1Class}</tt> and <tt>{@link #trigger2Class}</tt>).</p>
     * <p>Note that when using this option, it is the developer's responsibility to ensure correct sizing,
     * positioning and appearance of the triggers.</p>
     */
    /**
     * @cfg {String} trigger1Class
     * An additional CSS class used to style the trigger button.  The trigger will always get the
     * class <tt>'x-form-trigger'</tt> by default and <tt>triggerClass</tt> will be <b>appended</b> if specified.
     */
    /**
     * @cfg {String} trigger2Class
     * An additional CSS class used to style the trigger button.  The trigger will always get the
     * class <tt>'x-form-trigger'</tt> by default and <tt>triggerClass</tt> will be <b>appended</b> if specified.
     */

    initComponent : function(){
        Ext.form.TwinTriggerField.superclass.initComponent.call(this);

        this.triggerConfig = {
            tag:'span', cls:'x-form-twin-triggers', cn:[
            {tag: "img", src: Ext.BLANK_IMAGE_URL, alt: "", cls: "x-form-trigger " + this.trigger1Class},
            {tag: "img", src: Ext.BLANK_IMAGE_URL, alt: "", cls: "x-form-trigger " + this.trigger2Class}
        ]};
    },

    getTrigger : function(index){
        return this.triggers[index];
    },
    
    afterRender: function(){
        Ext.form.TwinTriggerField.superclass.afterRender.call(this);
        var triggers = this.triggers,
            i = 0,
            len = triggers.length;
            
        for(; i < len; ++i){
            if(this['hideTrigger' + (i + 1)]){
                    triggers[i].hide();
                }

        }    
    },

    initTrigger : function(){
        var ts = this.trigger.select('.x-form-trigger', true),
            triggerField = this;
            
        ts.each(function(t, all, index){
            var triggerIndex = 'Trigger'+(index+1);
            t.hide = function(){
                var w = triggerField.wrap.getWidth();
                this.dom.style.display = 'none';
                triggerField.el.setWidth(w-triggerField.trigger.getWidth());
                triggerField['hidden' + triggerIndex] = true;
            };
            t.show = function(){
                var w = triggerField.wrap.getWidth();
                this.dom.style.display = '';
                triggerField.el.setWidth(w-triggerField.trigger.getWidth());
                triggerField['hidden' + triggerIndex] = false;
            };
            this.mon(t, 'click', this['on'+triggerIndex+'Click'], this, {preventDefault:true});
            t.addClassOnOver('x-form-trigger-over');
            t.addClassOnClick('x-form-trigger-click');
        }, this);
        this.triggers = ts.elements;
    },

    getTriggerWidth: function(){
        var tw = 0;
        Ext.each(this.triggers, function(t, index){
            var triggerIndex = 'Trigger' + (index + 1),
                w = t.getWidth();
            if(w === 0 && !this['hidden' + triggerIndex]){
                tw += this.defaultTriggerWidth;
            }else{
                tw += w;
            }
        }, this);
        return tw;
    },

    // private
    onDestroy : function() {
        Ext.destroy(this.triggers);
        Ext.form.TwinTriggerField.superclass.onDestroy.call(this);
    },

    /**
     * The function that should handle the trigger's click event.  This method does nothing by default
     * until overridden by an implementing function. See {@link Ext.form.TriggerField#onTriggerClick}
     * for additional information.
     * @method
     * @param {EventObject} e
     */
    onTrigger1Click : Ext.emptyFn,
    /**
     * The function that should handle the trigger's click event.  This method does nothing by default
     * until overridden by an implementing function. See {@link Ext.form.TriggerField#onTriggerClick}
     * for additional information.
     * @method
     * @param {EventObject} e
     */
    onTrigger2Click : Ext.emptyFn
});
Ext.reg('trigger', Ext.form.TriggerField);
/**
 * @class Ext.form.TextArea
 * @extends Ext.form.TextField
 * Multiline text field.  Can be used as a direct replacement for traditional textarea fields, plus adds
 * support for auto-sizing.
 * @constructor
 * Creates a new TextArea
 * @param {Object} config Configuration options
 * @xtype textarea
 */
Ext.form.TextArea = Ext.extend(Ext.form.TextField,  {
    /**
     * @cfg {Number} growMin The minimum height to allow when <tt>{@link Ext.form.TextField#grow grow}=true</tt>
     * (defaults to <tt>60</tt>)
     */
    growMin : 60,
    /**
     * @cfg {Number} growMax The maximum height to allow when <tt>{@link Ext.form.TextField#grow grow}=true</tt>
     * (defaults to <tt>1000</tt>)
     */
    growMax: 1000,
    growAppend : '&#160;\n&#160;',

    enterIsSpecial : false,

    /**
     * @cfg {Boolean} preventScrollbars <tt>true</tt> to prevent scrollbars from appearing regardless of how much text is
     * in the field. This option is only relevant when {@link #grow} is <tt>true</tt>. Equivalent to setting overflow: hidden, defaults to 
     * <tt>false</tt>.
     */
    preventScrollbars: false,
    /**
     * @cfg {String/Object} autoCreate <p>A {@link Ext.DomHelper DomHelper} element spec, or true for a default
     * element spec. Used to create the {@link Ext.Component#getEl Element} which will encapsulate this Component.
     * See <tt>{@link Ext.Component#autoEl autoEl}</tt> for details.  Defaults to:</p>
     * <pre><code>{tag: "textarea", style: "width:100px;height:60px;", autocomplete: "off"}</code></pre>
     */

    // private
    onRender : function(ct, position){
        if(!this.el){
            this.defaultAutoCreate = {
                tag: "textarea",
                style:"width:100px;height:60px;",
                autocomplete: "off"
            };
        }
        Ext.form.TextArea.superclass.onRender.call(this, ct, position);
        if(this.grow){
            this.textSizeEl = Ext.DomHelper.append(document.body, {
                tag: "pre", cls: "x-form-grow-sizer"
            });
            if(this.preventScrollbars){
                this.el.setStyle("overflow", "hidden");
            }
            this.el.setHeight(this.growMin);
        }
    },

    onDestroy : function(){
        Ext.removeNode(this.textSizeEl);
        Ext.form.TextArea.superclass.onDestroy.call(this);
    },

    fireKey : function(e){
        if(e.isSpecialKey() && (this.enterIsSpecial || (e.getKey() != e.ENTER || e.hasModifier()))){
            this.fireEvent("specialkey", this, e);
        }
    },
    
    // private
    doAutoSize : function(e){
        return !e.isNavKeyPress() || e.getKey() == e.ENTER;
    },
    
    // inherit docs
    filterValidation: function(e) {            
        if(!e.isNavKeyPress() || (!this.enterIsSpecial && e.keyCode == e.ENTER)){
            this.validationTask.delay(this.validationDelay);
        }
    },

    /**
     * Automatically grows the field to accomodate the height of the text up to the maximum field height allowed.
     * This only takes effect if grow = true, and fires the {@link #autosize} event if the height changes.
     */
    autoSize: function(){
        if(!this.grow || !this.textSizeEl){
            return;
        }
        var el = this.el,
            v = Ext.util.Format.htmlEncode(el.dom.value),
            ts = this.textSizeEl,
            h;
            
        Ext.fly(ts).setWidth(this.el.getWidth());
        if(v.length < 1){
            v = "&#160;&#160;";
        }else{
            v += this.growAppend;
            if(Ext.isIE){
                v = v.replace(/\n/g, '&#160;<br />');
            }
        }
        ts.innerHTML = v;
        h = Math.min(this.growMax, Math.max(ts.offsetHeight, this.growMin));
        if(h != this.lastHeight){
            this.lastHeight = h;
            this.el.setHeight(h);
            this.fireEvent("autosize", this, h);
        }
    }
});
Ext.reg('textarea', Ext.form.TextArea);/**
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
/**
 * @class Ext.form.DateField
 * @extends Ext.form.TriggerField
 * Provides a date input field with a {@link Ext.DatePicker} dropdown and automatic date validation.
 * @constructor
 * Create a new DateField
 * @param {Object} config
 * @xtype datefield
 */
Ext.form.DateField = Ext.extend(Ext.form.TriggerField,  {
    /**
     * @cfg {String} format
     * The default date format string which can be overriden for localization support.  The format must be
     * valid according to {@link Date#parseDate} (defaults to <tt>'m/d/Y'</tt>).
     */
    format : "m/d/Y",
    /**
     * @cfg {String} altFormats
     * Multiple date formats separated by "<tt>|</tt>" to try when parsing a user input value and it
     * does not match the defined format (defaults to
     * <tt>'m/d/Y|n/j/Y|n/j/y|m/j/y|n/d/y|m/j/Y|n/d/Y|m-d-y|m-d-Y|m/d|m-d|md|mdy|mdY|d|Y-m-d|n-j|n/j'</tt>).
     */
    altFormats : "m/d/Y|n/j/Y|n/j/y|m/j/y|n/d/y|m/j/Y|n/d/Y|m-d-y|m-d-Y|m/d|m-d|md|mdy|mdY|d|Y-m-d|n-j|n/j",
    /**
     * @cfg {String} disabledDaysText
     * The tooltip to display when the date falls on a disabled day (defaults to <tt>'Disabled'</tt>)
     */
    disabledDaysText : "Disabled",
    /**
     * @cfg {String} disabledDatesText
     * The tooltip text to display when the date falls on a disabled date (defaults to <tt>'Disabled'</tt>)
     */
    disabledDatesText : "Disabled",
    /**
     * @cfg {String} minText
     * The error text to display when the date in the cell is before <tt>{@link #minValue}</tt> (defaults to
     * <tt>'The date in this field must be after {minValue}'</tt>).
     */
    minText : "The date in this field must be equal to or after {0}",
    /**
     * @cfg {String} maxText
     * The error text to display when the date in the cell is after <tt>{@link #maxValue}</tt> (defaults to
     * <tt>'The date in this field must be before {maxValue}'</tt>).
     */
    maxText : "The date in this field must be equal to or before {0}",
    /**
     * @cfg {String} invalidText
     * The error text to display when the date in the field is invalid (defaults to
     * <tt>'{value} is not a valid date - it must be in the format {format}'</tt>).
     */
    invalidText : "{0} is not a valid date - it must be in the format {1}",
    /**
     * @cfg {String} triggerClass
     * An additional CSS class used to style the trigger button.  The trigger will always get the
     * class <tt>'x-form-trigger'</tt> and <tt>triggerClass</tt> will be <b>appended</b> if specified
     * (defaults to <tt>'x-form-date-trigger'</tt> which displays a calendar icon).
     */
    triggerClass : 'x-form-date-trigger',
    /**
     * @cfg {Boolean} showToday
     * <tt>false</tt> to hide the footer area of the DatePicker containing the Today button and disable
     * the keyboard handler for spacebar that selects the current date (defaults to <tt>true</tt>).
     */
    showToday : true,
    
    /**
     * @cfg {Number} startDay
     * Day index at which the week should begin, 0-based (defaults to 0, which is Sunday)
     */
    startDay : 0,
    
    /**
     * @cfg {Date/String} minValue
     * The minimum allowed date. Can be either a Javascript date object or a string date in a
     * valid format (defaults to null).
     */
    /**
     * @cfg {Date/String} maxValue
     * The maximum allowed date. Can be either a Javascript date object or a string date in a
     * valid format (defaults to null).
     */
    /**
     * @cfg {Array} disabledDays
     * An array of days to disable, 0 based (defaults to null). Some examples:<pre><code>
// disable Sunday and Saturday:
disabledDays:  [0, 6]
// disable weekdays:
disabledDays: [1,2,3,4,5]
     * </code></pre>
     */
    /**
     * @cfg {Array} disabledDates
     * An array of "dates" to disable, as strings. These strings will be used to build a dynamic regular
     * expression so they are very powerful. Some examples:<pre><code>
// disable these exact dates:
disabledDates: ["03/08/2003", "09/16/2003"]
// disable these days for every year:
disabledDates: ["03/08", "09/16"]
// only match the beginning (useful if you are using short years):
disabledDates: ["^03/08"]
// disable every day in March 2006:
disabledDates: ["03/../2006"]
// disable every day in every March:
disabledDates: ["^03"]
     * </code></pre>
     * Note that the format of the dates included in the array should exactly match the {@link #format} config.
     * In order to support regular expressions, if you are using a {@link #format date format} that has "." in
     * it, you will have to escape the dot when restricting dates. For example: <tt>["03\\.08\\.03"]</tt>.
     */
    /**
     * @cfg {String/Object} autoCreate
     * A {@link Ext.DomHelper DomHelper element specification object}, or <tt>true</tt> for the default element
     * specification object:<pre><code>
     * autoCreate: {tag: "input", type: "text", size: "10", autocomplete: "off"}
     * </code></pre>
     */

    // private
    defaultAutoCreate : {tag: "input", type: "text", size: "10", autocomplete: "off"},

    // in the absence of a time value, a default value of 12 noon will be used
    // (note: 12 noon was chosen because it steers well clear of all DST timezone changes)
    initTime: '12', // 24 hour format

    initTimeFormat: 'H',

    // PUBLIC -- to be documented
    safeParse : function(value, format) {
        if (/[gGhH]/.test(format.replace(/(\\.)/g, ''))) {
            // if parse format contains hour information, no DST adjustment is necessary
            return Date.parseDate(value, format);
        } else {
            // set time to 12 noon, then clear the time
            var parsedDate = Date.parseDate(value + ' ' + this.initTime, format + ' ' + this.initTimeFormat);

            if (parsedDate) {
                return parsedDate.clearTime();
            }
        }
    },

    initComponent : function(){
        Ext.form.DateField.superclass.initComponent.call(this);

        this.addEvents(
            /**
             * @event select
             * Fires when a date is selected via the date picker.
             * @param {Ext.form.DateField} this
             * @param {Date} date The date that was selected
             */
            'select'
        );

        if(Ext.isString(this.minValue)){
            this.minValue = this.parseDate(this.minValue);
        }
        if(Ext.isString(this.maxValue)){
            this.maxValue = this.parseDate(this.maxValue);
        }
        this.disabledDatesRE = null;
        this.initDisabledDays();
    },

    initEvents: function() {
        Ext.form.DateField.superclass.initEvents.call(this);
        this.keyNav = new Ext.KeyNav(this.el, {
            "down": function(e) {
                this.onTriggerClick();
            },
            scope: this,
            forceKeyDown: true
        });
    },


    // private
    initDisabledDays : function(){
        if(this.disabledDates){
            var dd = this.disabledDates,
                len = dd.length - 1,
                re = "(?:";

            Ext.each(dd, function(d, i){
                re += Ext.isDate(d) ? '^' + Ext.escapeRe(d.dateFormat(this.format)) + '$' : dd[i];
                if(i != len){
                    re += '|';
                }
            }, this);
            this.disabledDatesRE = new RegExp(re + ')');
        }
    },

    /**
     * Replaces any existing disabled dates with new values and refreshes the DatePicker.
     * @param {Array} disabledDates An array of date strings (see the <tt>{@link #disabledDates}</tt> config
     * for details on supported values) used to disable a pattern of dates.
     */
    setDisabledDates : function(dd){
        this.disabledDates = dd;
        this.initDisabledDays();
        if(this.menu){
            this.menu.picker.setDisabledDates(this.disabledDatesRE);
        }
    },

    /**
     * Replaces any existing disabled days (by index, 0-6) with new values and refreshes the DatePicker.
     * @param {Array} disabledDays An array of disabled day indexes. See the <tt>{@link #disabledDays}</tt>
     * config for details on supported values.
     */
    setDisabledDays : function(dd){
        this.disabledDays = dd;
        if(this.menu){
            this.menu.picker.setDisabledDays(dd);
        }
    },

    /**
     * Replaces any existing <tt>{@link #minValue}</tt> with the new value and refreshes the DatePicker.
     * @param {Date} value The minimum date that can be selected
     */
    setMinValue : function(dt){
        this.minValue = (Ext.isString(dt) ? this.parseDate(dt) : dt);
        if(this.menu){
            this.menu.picker.setMinDate(this.minValue);
        }
    },

    /**
     * Replaces any existing <tt>{@link #maxValue}</tt> with the new value and refreshes the DatePicker.
     * @param {Date} value The maximum date that can be selected
     */
    setMaxValue : function(dt){
        this.maxValue = (Ext.isString(dt) ? this.parseDate(dt) : dt);
        if(this.menu){
            this.menu.picker.setMaxDate(this.maxValue);
        }
    },

    /**
     * Runs all of NumberFields validations and returns an array of any errors. Note that this first
     * runs TextField's validations, so the returned array is an amalgamation of all field errors.
     * The additional validation checks are testing that the date format is valid, that the chosen
     * date is within the min and max date constraints set, that the date chosen is not in the disabledDates
     * regex and that the day chosed is not one of the disabledDays.
     * @param {Mixed} value The value to get errors for (defaults to the current field value)
     * @return {Array} All validation errors for this field
     */
    getErrors: function(value) {
        var errors = Ext.form.DateField.superclass.getErrors.apply(this, arguments);

        value = this.formatDate(value || this.processValue(this.getRawValue()));

        if (value.length < 1) { // if it's blank and textfield didn't flag it then it's valid
             return errors;
        }

        var svalue = value;
        value = this.parseDate(value);
        if (!value) {
            errors.push(String.format(this.invalidText, svalue, this.format));
            return errors;
        }

        var time = value.getTime();
        if (this.minValue && time < this.minValue.clearTime().getTime()) {
            errors.push(String.format(this.minText, this.formatDate(this.minValue)));
        }

        if (this.maxValue && time > this.maxValue.clearTime().getTime()) {
            errors.push(String.format(this.maxText, this.formatDate(this.maxValue)));
        }

        if (this.disabledDays) {
            var day = value.getDay();

            for(var i = 0; i < this.disabledDays.length; i++) {
                if (day === this.disabledDays[i]) {
                    errors.push(this.disabledDaysText);
                    break;
                }
            }
        }

        var fvalue = this.formatDate(value);
        if (this.disabledDatesRE && this.disabledDatesRE.test(fvalue)) {
            errors.push(String.format(this.disabledDatesText, fvalue));
        }

        return errors;
    },

    // private
    // Provides logic to override the default TriggerField.validateBlur which just returns true
    validateBlur : function(){
        return !this.menu || !this.menu.isVisible();
    },

    /**
     * Returns the current date value of the date field.
     * @return {Date} The date value
     */
    getValue : function(){
        return this.parseDate(Ext.form.DateField.superclass.getValue.call(this)) || "";
    },

    /**
     * Sets the value of the date field.  You can pass a date object or any string that can be
     * parsed into a valid date, using <tt>{@link #format}</tt> as the date format, according
     * to the same rules as {@link Date#parseDate} (the default format used is <tt>"m/d/Y"</tt>).
     * <br />Usage:
     * <pre><code>
//All of these calls set the same date value (May 4, 2006)

//Pass a date object:
var dt = new Date('5/4/2006');
dateField.setValue(dt);

//Pass a date string (default format):
dateField.setValue('05/04/2006');

//Pass a date string (custom format):
dateField.format = 'Y-m-d';
dateField.setValue('2006-05-04');
</code></pre>
     * @param {String/Date} date The date or valid date string
     * @return {Ext.form.Field} this
     */
    setValue : function(date){
        return Ext.form.DateField.superclass.setValue.call(this, this.formatDate(this.parseDate(date)));
    },

    // private
    parseDate : function(value) {
        if(!value || Ext.isDate(value)){
            return value;
        }

        var v = this.safeParse(value, this.format),
            af = this.altFormats,
            afa = this.altFormatsArray;

        if (!v && af) {
            afa = afa || af.split("|");

            for (var i = 0, len = afa.length; i < len && !v; i++) {
                v = this.safeParse(value, afa[i]);
            }
        }
        return v;
    },

    // private
    onDestroy : function(){
        Ext.destroy(this.menu, this.keyNav);
        Ext.form.DateField.superclass.onDestroy.call(this);
    },

    // private
    formatDate : function(date){
        return Ext.isDate(date) ? date.dateFormat(this.format) : date;
    },

    /**
     * @method onTriggerClick
     * @hide
     */
    // private
    // Implements the default empty TriggerField.onTriggerClick function to display the DatePicker
    onTriggerClick : function(){
        if(this.disabled){
            return;
        }
        if(this.menu == null){
            this.menu = new Ext.menu.DateMenu({
                hideOnClick: false,
                focusOnSelect: false
            });
        }
        this.onFocus();
        Ext.apply(this.menu.picker,  {
            minDate : this.minValue,
            maxDate : this.maxValue,
            disabledDatesRE : this.disabledDatesRE,
            disabledDatesText : this.disabledDatesText,
            disabledDays : this.disabledDays,
            disabledDaysText : this.disabledDaysText,
            format : this.format,
            showToday : this.showToday,
            startDay: this.startDay,
            minText : String.format(this.minText, this.formatDate(this.minValue)),
            maxText : String.format(this.maxText, this.formatDate(this.maxValue))
        });
        this.menu.picker.setValue(this.getValue() || new Date());
        this.menu.show(this.el, "tl-bl?");
        this.menuEvents('on');
    },

    //private
    menuEvents: function(method){
        this.menu[method]('select', this.onSelect, this);
        this.menu[method]('hide', this.onMenuHide, this);
        this.menu[method]('show', this.onFocus, this);
    },

    onSelect: function(m, d){
        this.setValue(d);
        this.fireEvent('select', this, d);
        this.menu.hide();
    },

    onMenuHide: function(){
        this.focus(false, 60);
        this.menuEvents('un');
    },

    // private
    beforeBlur : function(){
        var v = this.parseDate(this.getRawValue());
        if(v){
            this.setValue(v);
        }
    }

    /**
     * @cfg {Boolean} grow @hide
     */
    /**
     * @cfg {Number} growMin @hide
     */
    /**
     * @cfg {Number} growMax @hide
     */
    /**
     * @hide
     * @method autoSize
     */
});
Ext.reg('datefield', Ext.form.DateField);
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
/**
 * @class Ext.form.ComboBox
 * @extends Ext.form.TriggerField
 * <p>A combobox control with support for autocomplete, remote-loading, paging and many other features.</p>
 * <p>A ComboBox works in a similar manner to a traditional HTML &lt;select> field. The difference is
 * that to submit the {@link #valueField}, you must specify a {@link #hiddenName} to create a hidden input
 * field to hold the value of the valueField. The <i>{@link #displayField}</i> is shown in the text field
 * which is named according to the {@link #name}.</p>
 * <p><b><u>Events</u></b></p>
 * <p>To do something when something in ComboBox is selected, configure the select event:<pre><code>
var cb = new Ext.form.ComboBox({
    // all of your config options
    listeners:{
         scope: yourScope,
         'select': yourFunction
    }
});

// Alternatively, you can assign events after the object is created:
var cb = new Ext.form.ComboBox(yourOptions);
cb.on('select', yourFunction, yourScope);
 * </code></pre></p>
 *
 * <p><b><u>ComboBox in Grid</u></b></p>
 * <p>If using a ComboBox in an {@link Ext.grid.EditorGridPanel Editor Grid} a {@link Ext.grid.Column#renderer renderer}
 * will be needed to show the displayField when the editor is not active.  Set up the renderer manually, or implement
 * a reusable render, for example:<pre><code>
// create reusable renderer
Ext.util.Format.comboRenderer = function(combo){
    return function(value){
        var record = combo.findRecord(combo.{@link #valueField}, value);
        return record ? record.get(combo.{@link #displayField}) : combo.{@link #valueNotFoundText};
    }
}

// create the combo instance
var combo = new Ext.form.ComboBox({
    {@link #typeAhead}: true,
    {@link #triggerAction}: 'all',
    {@link #lazyRender}:true,
    {@link #mode}: 'local',
    {@link #store}: new Ext.data.ArrayStore({
        id: 0,
        fields: [
            'myId',
            'displayText'
        ],
        data: [[1, 'item1'], [2, 'item2']]
    }),
    {@link #valueField}: 'myId',
    {@link #displayField}: 'displayText'
});

// snippet of column model used within grid
var cm = new Ext.grid.ColumnModel([{
       ...
    },{
       header: "Some Header",
       dataIndex: 'whatever',
       width: 130,
       editor: combo, // specify reference to combo instance
       renderer: Ext.util.Format.comboRenderer(combo) // pass combo instance to reusable renderer
    },
    ...
]);
 * </code></pre></p>
 *
 * <p><b><u>Filtering</u></b></p>
 * <p>A ComboBox {@link #doQuery uses filtering itself}, for information about filtering the ComboBox
 * store manually see <tt>{@link #lastQuery}</tt>.</p>
 * @constructor
 * Create a new ComboBox.
 * @param {Object} config Configuration options
 * @xtype combo
 */
Ext.form.ComboBox = Ext.extend(Ext.form.TriggerField, {
    /**
     * @cfg {Mixed} transform The id, DOM node or element of an existing HTML SELECT to convert to a ComboBox.
     * Note that if you specify this and the combo is going to be in an {@link Ext.form.BasicForm} or
     * {@link Ext.form.FormPanel}, you must also set <tt>{@link #lazyRender} = true</tt>.
     */
    /**
     * @cfg {Boolean} lazyRender <tt>true</tt> to prevent the ComboBox from rendering until requested
     * (should always be used when rendering into an {@link Ext.Editor} (e.g. {@link Ext.grid.EditorGridPanel Grids}),
     * defaults to <tt>false</tt>).
     */
    /**
     * @cfg {String/Object} autoCreate <p>A {@link Ext.DomHelper DomHelper} element spec, or <tt>true</tt> for a default
     * element spec. Used to create the {@link Ext.Component#getEl Element} which will encapsulate this Component.
     * See <tt>{@link Ext.Component#autoEl autoEl}</tt> for details.  Defaults to:</p>
     * <pre><code>{tag: "input", type: "text", size: "24", autocomplete: "off"}</code></pre>
     */
    /**
     * @cfg {Ext.data.Store/Array} store The data source to which this combo is bound (defaults to <tt>undefined</tt>).
     * Acceptable values for this property are:
     * <div class="mdetail-params"><ul>
     * <li><b>any {@link Ext.data.Store Store} subclass</b></li>
     * <li><b>an Array</b> : Arrays will be converted to a {@link Ext.data.ArrayStore} internally,
     * automatically generating {@link Ext.data.Field#name field names} to work with all data components.
     * <div class="mdetail-params"><ul>
     * <li><b>1-dimensional array</b> : (e.g., <tt>['Foo','Bar']</tt>)<div class="sub-desc">
     * A 1-dimensional array will automatically be expanded (each array item will be used for both the combo
     * {@link #valueField} and {@link #displayField})</div></li>
     * <li><b>2-dimensional array</b> : (e.g., <tt>[['f','Foo'],['b','Bar']]</tt>)<div class="sub-desc">
     * For a multi-dimensional array, the value in index 0 of each item will be assumed to be the combo
     * {@link #valueField}, while the value at index 1 is assumed to be the combo {@link #displayField}.
     * </div></li></ul></div></li></ul></div>
     * <p>See also <tt>{@link #mode}</tt>.</p>
     */
    /**
     * @cfg {String} title If supplied, a header element is created containing this text and added into the top of
     * the dropdown list (defaults to undefined, with no header element)
     */

    // private
    defaultAutoCreate : {tag: "input", type: "text", size: "24", autocomplete: "off"},
    /**
     * @cfg {Number} listWidth The width (used as a parameter to {@link Ext.Element#setWidth}) of the dropdown
     * list (defaults to the width of the ComboBox field).  See also <tt>{@link #minListWidth}
     */
    /**
     * @cfg {String} displayField The underlying {@link Ext.data.Field#name data field name} to bind to this
     * ComboBox (defaults to undefined if <tt>{@link #mode} = 'remote'</tt> or <tt>'field1'</tt> if
     * {@link #transform transforming a select} or if the {@link #store field name is autogenerated based on
     * the store configuration}).
     * <p>See also <tt>{@link #valueField}</tt>.</p>
     * <p><b>Note</b>: if using a ComboBox in an {@link Ext.grid.EditorGridPanel Editor Grid} a
     * {@link Ext.grid.Column#renderer renderer} will be needed to show the displayField when the editor is not
     * active.</p>
     */
    /**
     * @cfg {String} valueField The underlying {@link Ext.data.Field#name data value name} to bind to this
     * ComboBox (defaults to undefined if <tt>{@link #mode} = 'remote'</tt> or <tt>'field2'</tt> if
     * {@link #transform transforming a select} or if the {@link #store field name is autogenerated based on
     * the store configuration}).
     * <p><b>Note</b>: use of a <tt>valueField</tt> requires the user to make a selection in order for a value to be
     * mapped.  See also <tt>{@link #hiddenName}</tt>, <tt>{@link #hiddenValue}</tt>, and <tt>{@link #displayField}</tt>.</p>
     */
    /**
     * @cfg {String} hiddenName If specified, a hidden form field with this name is dynamically generated to store the
     * field's data value (defaults to the underlying DOM element's name). Required for the combo's value to automatically
     * post during a form submission.  See also {@link #valueField}.
     */
    /**
     * @cfg {String} hiddenId If <tt>{@link #hiddenName}</tt> is specified, <tt>hiddenId</tt> can also be provided
     * to give the hidden field a unique id.  The <tt>hiddenId</tt> and combo {@link Ext.Component#id id} should be 
     * different, since no two DOM nodes should share the same id.
     */
    /**
     * @cfg {String} hiddenValue Sets the initial value of the hidden field if {@link #hiddenName} is
     * specified to contain the selected {@link #valueField}, from the Store. Defaults to the configured
     * <tt>{@link Ext.form.Field#value value}</tt>.
     */
    /**
     * @cfg {String} listClass The CSS class to add to the predefined <tt>'x-combo-list'</tt> class
     * applied the dropdown list element (defaults to '').
     */
    listClass : '',
    /**
     * @cfg {String} selectedClass CSS class to apply to the selected item in the dropdown list
     * (defaults to <tt>'x-combo-selected'</tt>)
     */
    selectedClass : 'x-combo-selected',
    /**
     * @cfg {String} listEmptyText The empty text to display in the data view if no items are found.
     * (defaults to '')
     */
    listEmptyText: '',
    /**
     * @cfg {String} triggerClass An additional CSS class used to style the trigger button.  The trigger will always
     * get the class <tt>'x-form-trigger'</tt> and <tt>triggerClass</tt> will be <b>appended</b> if specified
     * (defaults to <tt>'x-form-arrow-trigger'</tt> which displays a downward arrow icon).
     */
    triggerClass : 'x-form-arrow-trigger',
    /**
     * @cfg {Boolean/String} shadow <tt>true</tt> or <tt>"sides"</tt> for the default effect, <tt>"frame"</tt> for
     * 4-way shadow, and <tt>"drop"</tt> for bottom-right
     */
    shadow : 'sides',
    /**
     * @cfg {String/Array} listAlign A valid anchor position value. See <tt>{@link Ext.Element#alignTo}</tt> for details
     * on supported anchor positions and offsets. To specify x/y offsets as well, this value
     * may be specified as an Array of <tt>{@link Ext.Element#alignTo}</tt> method arguments.</p>
     * <pre><code>[ 'tl-bl?', [6,0] ]</code></pre>(defaults to <tt>'tl-bl?'</tt>)
     */
    listAlign : 'tl-bl?',
    /**
     * @cfg {Number} maxHeight The maximum height in pixels of the dropdown list before scrollbars are shown
     * (defaults to <tt>300</tt>)
     */
    maxHeight : 300,
    /**
     * @cfg {Number} minHeight The minimum height in pixels of the dropdown list when the list is constrained by its
     * distance to the viewport edges (defaults to <tt>90</tt>)
     */
    minHeight : 90,
    /**
     * @cfg {String} triggerAction The action to execute when the trigger is clicked.
     * <div class="mdetail-params"><ul>
     * <li><b><tt>'query'</tt></b> : <b>Default</b>
     * <p class="sub-desc">{@link #doQuery run the query} using the {@link Ext.form.Field#getRawValue raw value}.</p></li>
     * <li><b><tt>'all'</tt></b> :
     * <p class="sub-desc">{@link #doQuery run the query} specified by the <tt>{@link #allQuery}</tt> config option</p></li>
     * </ul></div>
     * <p>See also <code>{@link #queryParam}</code>.</p>
     */
    triggerAction : 'query',
    /**
     * @cfg {Number} minChars The minimum number of characters the user must type before autocomplete and
     * {@link #typeAhead} activate (defaults to <tt>4</tt> if <tt>{@link #mode} = 'remote'</tt> or <tt>0</tt> if
     * <tt>{@link #mode} = 'local'</tt>, does not apply if
     * <tt>{@link Ext.form.TriggerField#editable editable} = false</tt>).
     */
    minChars : 4,
    /**
     * @cfg {Boolean} autoSelect <tt>true</tt> to select the first result gathered by the data store (defaults
     * to <tt>true</tt>).  A false value would require a manual selection from the dropdown list to set the components value
     * unless the value of ({@link #typeAheadDelay}) were true.
     */
    autoSelect : true,
    /**
     * @cfg {Boolean} typeAhead <tt>true</tt> to populate and autoselect the remainder of the text being
     * typed after a configurable delay ({@link #typeAheadDelay}) if it matches a known value (defaults
     * to <tt>false</tt>)
     */
    typeAhead : false,
    /**
     * @cfg {Number} queryDelay The length of time in milliseconds to delay between the start of typing and
     * sending the query to filter the dropdown list (defaults to <tt>500</tt> if <tt>{@link #mode} = 'remote'</tt>
     * or <tt>10</tt> if <tt>{@link #mode} = 'local'</tt>)
     */
    queryDelay : 500,
    /**
     * @cfg {Number} pageSize If greater than <tt>0</tt>, a {@link Ext.PagingToolbar} is displayed in the
     * footer of the dropdown list and the {@link #doQuery filter queries} will execute with page start and
     * {@link Ext.PagingToolbar#pageSize limit} parameters. Only applies when <tt>{@link #mode} = 'remote'</tt>
     * (defaults to <tt>0</tt>).
     */
    pageSize : 0,
    /**
     * @cfg {Boolean} selectOnFocus <tt>true</tt> to select any existing text in the field immediately on focus.
     * Only applies when <tt>{@link Ext.form.TriggerField#editable editable} = true</tt> (defaults to
     * <tt>false</tt>).
     */
    selectOnFocus : false,
    /**
     * @cfg {String} queryParam Name of the query ({@link Ext.data.Store#baseParam baseParam} name for the store)
     * as it will be passed on the querystring (defaults to <tt>'query'</tt>)
     */
    queryParam : 'query',
    /**
     * @cfg {String} loadingText The text to display in the dropdown list while data is loading.  Only applies
     * when <tt>{@link #mode} = 'remote'</tt> (defaults to <tt>'Loading...'</tt>)
     */
    loadingText : 'Loading...',
    /**
     * @cfg {Boolean} resizable <tt>true</tt> to add a resize handle to the bottom of the dropdown list
     * (creates an {@link Ext.Resizable} with 'se' {@link Ext.Resizable#pinned pinned} handles).
     * Defaults to <tt>false</tt>.
     */
    resizable : false,
    /**
     * @cfg {Number} handleHeight The height in pixels of the dropdown list resize handle if
     * <tt>{@link #resizable} = true</tt> (defaults to <tt>8</tt>)
     */
    handleHeight : 8,
    /**
     * @cfg {String} allQuery The text query to send to the server to return all records for the list
     * with no filtering (defaults to '')
     */
    allQuery: '',
    /**
     * @cfg {String} mode Acceptable values are:
     * <div class="mdetail-params"><ul>
     * <li><b><tt>'remote'</tt></b> : <b>Default</b>
     * <p class="sub-desc">Automatically loads the <tt>{@link #store}</tt> the <b>first</b> time the trigger
     * is clicked. If you do not want the store to be automatically loaded the first time the trigger is
     * clicked, set to <tt>'local'</tt> and manually load the store.  To force a requery of the store
     * <b>every</b> time the trigger is clicked see <tt>{@link #lastQuery}</tt>.</p></li>
     * <li><b><tt>'local'</tt></b> :
     * <p class="sub-desc">ComboBox loads local data</p>
     * <pre><code>
var combo = new Ext.form.ComboBox({
    renderTo: document.body,
    mode: 'local',
    store: new Ext.data.ArrayStore({
        id: 0,
        fields: [
            'myId',  // numeric value is the key
            'displayText'
        ],
        data: [[1, 'item1'], [2, 'item2']]  // data is local
    }),
    valueField: 'myId',
    displayField: 'displayText',
    triggerAction: 'all'
});
     * </code></pre></li>
     * </ul></div>
     */
    mode: 'remote',
    /**
     * @cfg {Number} minListWidth The minimum width of the dropdown list in pixels (defaults to <tt>70</tt>, will
     * be ignored if <tt>{@link #listWidth}</tt> has a higher value)
     */
    minListWidth : 70,
    /**
     * @cfg {Boolean} forceSelection <tt>true</tt> to restrict the selected value to one of the values in the list,
     * <tt>false</tt> to allow the user to set arbitrary text into the field (defaults to <tt>false</tt>)
     */
    forceSelection : false,
    /**
     * @cfg {Number} typeAheadDelay The length of time in milliseconds to wait until the typeahead text is displayed
     * if <tt>{@link #typeAhead} = true</tt> (defaults to <tt>250</tt>)
     */
    typeAheadDelay : 250,
    /**
     * @cfg {String} valueNotFoundText When using a name/value combo, if the value passed to setValue is not found in
     * the store, valueNotFoundText will be displayed as the field text if defined (defaults to undefined). If this
     * default text is used, it means there is no value set and no validation will occur on this field.
     */

    /**
     * @cfg {Boolean} lazyInit <tt>true</tt> to not initialize the list for this combo until the field is focused
     * (defaults to <tt>true</tt>)
     */
    lazyInit : true,

    /**
     * @cfg {Boolean} clearFilterOnReset <tt>true</tt> to clear any filters on the store (when in local mode) when reset is called
     * (defaults to <tt>true</tt>)
     */
    clearFilterOnReset : true,

    /**
     * @cfg {Boolean} submitValue False to clear the name attribute on the field so that it is not submitted during a form post.
     * If a hiddenName is specified, setting this to true will cause both the hidden field and the element to be submitted.
     * Defaults to <tt>undefined</tt>.
     */
    submitValue: undefined,

    /**
     * The value of the match string used to filter the store. Delete this property to force a requery.
     * Example use:
     * <pre><code>
var combo = new Ext.form.ComboBox({
    ...
    mode: 'remote',
    ...
    listeners: {
        // delete the previous query in the beforequery event or set
        // combo.lastQuery = null (this will reload the store the next time it expands)
        beforequery: function(qe){
            delete qe.combo.lastQuery;
        }
    }
});
     * </code></pre>
     * To make sure the filter in the store is not cleared the first time the ComboBox trigger is used
     * configure the combo with <tt>lastQuery=''</tt>. Example use:
     * <pre><code>
var combo = new Ext.form.ComboBox({
    ...
    mode: 'local',
    triggerAction: 'all',
    lastQuery: ''
});
     * </code></pre>
     * @property lastQuery
     * @type String
     */

    // private
    initComponent : function(){
        Ext.form.ComboBox.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event expand
             * Fires when the dropdown list is expanded
             * @param {Ext.form.ComboBox} combo This combo box
             */
            'expand',
            /**
             * @event collapse
             * Fires when the dropdown list is collapsed
             * @param {Ext.form.ComboBox} combo This combo box
             */
            'collapse',

            /**
             * @event beforeselect
             * Fires before a list item is selected. Return false to cancel the selection.
             * @param {Ext.form.ComboBox} combo This combo box
             * @param {Ext.data.Record} record The data record returned from the underlying store
             * @param {Number} index The index of the selected item in the dropdown list
             */
            'beforeselect',
            /**
             * @event select
             * Fires when a list item is selected
             * @param {Ext.form.ComboBox} combo This combo box
             * @param {Ext.data.Record} record The data record returned from the underlying store
             * @param {Number} index The index of the selected item in the dropdown list
             */
            'select',
            /**
             * @event beforequery
             * Fires before all queries are processed. Return false to cancel the query or set the queryEvent's
             * cancel property to true.
             * @param {Object} queryEvent An object that has these properties:<ul>
             * <li><code>combo</code> : Ext.form.ComboBox <div class="sub-desc">This combo box</div></li>
             * <li><code>query</code> : String <div class="sub-desc">The query</div></li>
             * <li><code>forceAll</code> : Boolean <div class="sub-desc">True to force "all" query</div></li>
             * <li><code>cancel</code> : Boolean <div class="sub-desc">Set to true to cancel the query</div></li>
             * </ul>
             */
            'beforequery'
        );
        if(this.transform){
            var s = Ext.getDom(this.transform);
            if(!this.hiddenName){
                this.hiddenName = s.name;
            }
            if(!this.store){
                this.mode = 'local';
                var d = [], opts = s.options;
                for(var i = 0, len = opts.length;i < len; i++){
                    var o = opts[i],
                        value = (o.hasAttribute ? o.hasAttribute('value') : o.getAttributeNode('value').specified) ? o.value : o.text;
                    if(o.selected && Ext.isEmpty(this.value, true)) {
                        this.value = value;
                    }
                    d.push([value, o.text]);
                }
                this.store = new Ext.data.ArrayStore({
                    idIndex: 0,
                    fields: ['value', 'text'],
                    data : d,
                    autoDestroy: true
                });
                this.valueField = 'value';
                this.displayField = 'text';
            }
            s.name = Ext.id(); // wipe out the name in case somewhere else they have a reference
            if(!this.lazyRender){
                this.target = true;
                this.el = Ext.DomHelper.insertBefore(s, this.autoCreate || this.defaultAutoCreate);
                this.render(this.el.parentNode, s);
            }
            Ext.removeNode(s);
        }
        //auto-configure store from local array data
        else if(this.store){
            this.store = Ext.StoreMgr.lookup(this.store);
            if(this.store.autoCreated){
                this.displayField = this.valueField = 'field1';
                if(!this.store.expandData){
                    this.displayField = 'field2';
                }
                this.mode = 'local';
            }
        }

        this.selectedIndex = -1;
        if(this.mode == 'local'){
            if(!Ext.isDefined(this.initialConfig.queryDelay)){
                this.queryDelay = 10;
            }
            if(!Ext.isDefined(this.initialConfig.minChars)){
                this.minChars = 0;
            }
        }
    },

    // private
    onRender : function(ct, position){
        if(this.hiddenName && !Ext.isDefined(this.submitValue)){
            this.submitValue = false;
        }
        Ext.form.ComboBox.superclass.onRender.call(this, ct, position);
        if(this.hiddenName){
            this.hiddenField = this.el.insertSibling({tag:'input', type:'hidden', name: this.hiddenName,
                    id: (this.hiddenId || Ext.id())}, 'before', true);

        }
        if(Ext.isGecko){
            this.el.dom.setAttribute('autocomplete', 'off');
        }

        if(!this.lazyInit){
            this.initList();
        }else{
            this.on('focus', this.initList, this, {single: true});
        }
    },

    // private
    initValue : function(){
        Ext.form.ComboBox.superclass.initValue.call(this);
        if(this.hiddenField){
            this.hiddenField.value =
                Ext.value(Ext.isDefined(this.hiddenValue) ? this.hiddenValue : this.value, '');
        }
    },

    getParentZIndex : function(){
        var zindex;
        if (this.ownerCt){
            this.findParentBy(function(ct){
                zindex = parseInt(ct.getPositionEl().getStyle('z-index'), 10);
                return !!zindex;
            });
        }
        return zindex;
    },
    
    getZIndex : function(listParent){
        listParent = listParent || Ext.getDom(this.getListParent() || Ext.getBody());
        var zindex = parseInt(Ext.fly(listParent).getStyle('z-index'), 10);
        if(!zindex){
            zindex = this.getParentZIndex();
        }
        return (zindex || 12000) + 5;
    },

    // private
    initList : function(){
        if(!this.list){
            var cls = 'x-combo-list',
                listParent = Ext.getDom(this.getListParent() || Ext.getBody());

            this.list = new Ext.Layer({
                parentEl: listParent,
                shadow: this.shadow,
                cls: [cls, this.listClass].join(' '),
                constrain:false,
                zindex: this.getZIndex(listParent)
            });

            var lw = this.listWidth || Math.max(this.wrap.getWidth(), this.minListWidth);
            this.list.setSize(lw, 0);
            this.list.swallowEvent('mousewheel');
            this.assetHeight = 0;
            if(this.syncFont !== false){
                this.list.setStyle('font-size', this.el.getStyle('font-size'));
            }
            if(this.title){
                this.header = this.list.createChild({cls:cls+'-hd', html: this.title});
                this.assetHeight += this.header.getHeight();
            }

            this.innerList = this.list.createChild({cls:cls+'-inner'});
            this.mon(this.innerList, 'mouseover', this.onViewOver, this);
            this.mon(this.innerList, 'mousemove', this.onViewMove, this);
            this.innerList.setWidth(lw - this.list.getFrameWidth('lr'));

            if(this.pageSize){
                this.footer = this.list.createChild({cls:cls+'-ft'});
                this.pageTb = new Ext.PagingToolbar({
                    store: this.store,
                    pageSize: this.pageSize,
                    renderTo:this.footer
                });
                this.assetHeight += this.footer.getHeight();
            }

            if(!this.tpl){
                /**
                * @cfg {String/Ext.XTemplate} tpl <p>The template string, or {@link Ext.XTemplate} instance to
                * use to display each item in the dropdown list. The dropdown list is displayed in a
                * DataView. See {@link #view}.</p>
                * <p>The default template string is:</p><pre><code>
                  '&lt;tpl for=".">&lt;div class="x-combo-list-item">{' + this.displayField + '}&lt;/div>&lt;/tpl>'
                * </code></pre>
                * <p>Override the default value to create custom UI layouts for items in the list.
                * For example:</p><pre><code>
                  '&lt;tpl for=".">&lt;div ext:qtip="{state}. {nick}" class="x-combo-list-item">{state}&lt;/div>&lt;/tpl>'
                * </code></pre>
                * <p>The template <b>must</b> contain one or more substitution parameters using field
                * names from the Combo's</b> {@link #store Store}. In the example above an
                * <pre>ext:qtip</pre> attribute is added to display other fields from the Store.</p>
                * <p>To preserve the default visual look of list items, add the CSS class name
                * <pre>x-combo-list-item</pre> to the template's container element.</p>
                * <p>Also see {@link #itemSelector} for additional details.</p>
                */
                this.tpl = '<tpl for="."><div class="'+cls+'-item">{' + this.displayField + '}</div></tpl>';
                /**
                 * @cfg {String} itemSelector
                 * <p>A simple CSS selector (e.g. div.some-class or span:first-child) that will be
                 * used to determine what nodes the {@link #view Ext.DataView} which handles the dropdown
                 * display will be working with.</p>
                 * <p><b>Note</b>: this setting is <b>required</b> if a custom XTemplate has been
                 * specified in {@link #tpl} which assigns a class other than <pre>'x-combo-list-item'</pre>
                 * to dropdown list items</b>
                 */
            }

            /**
            * The {@link Ext.DataView DataView} used to display the ComboBox's options.
            * @type Ext.DataView
            */
            this.view = new Ext.DataView({
                applyTo: this.innerList,
                tpl: this.tpl,
                singleSelect: true,
                selectedClass: this.selectedClass,
                itemSelector: this.itemSelector || '.' + cls + '-item',
                emptyText: this.listEmptyText,
                deferEmptyText: false
            });

            this.mon(this.view, {
                containerclick : this.onViewClick,
                click : this.onViewClick,
                scope :this
            });

            this.bindStore(this.store, true);

            if(this.resizable){
                this.resizer = new Ext.Resizable(this.list,  {
                   pinned:true, handles:'se'
                });
                this.mon(this.resizer, 'resize', function(r, w, h){
                    this.maxHeight = h-this.handleHeight-this.list.getFrameWidth('tb')-this.assetHeight;
                    this.listWidth = w;
                    this.innerList.setWidth(w - this.list.getFrameWidth('lr'));
                    this.restrictHeight();
                }, this);

                this[this.pageSize?'footer':'innerList'].setStyle('margin-bottom', this.handleHeight+'px');
            }
        }
    },

    /**
     * <p>Returns the element used to house this ComboBox's pop-up list. Defaults to the document body.</p>
     * A custom implementation may be provided as a configuration option if the floating list needs to be rendered
     * to a different Element. An example might be rendering the list inside a Menu so that clicking
     * the list does not hide the Menu:<pre><code>
var store = new Ext.data.ArrayStore({
    autoDestroy: true,
    fields: ['initials', 'fullname'],
    data : [
        ['FF', 'Fred Flintstone'],
        ['BR', 'Barney Rubble']
    ]
});

var combo = new Ext.form.ComboBox({
    store: store,
    displayField: 'fullname',
    emptyText: 'Select a name...',
    forceSelection: true,
    getListParent: function() {
        return this.el.up('.x-menu');
    },
    iconCls: 'no-icon', //use iconCls if placing within menu to shift to right side of menu
    mode: 'local',
    selectOnFocus: true,
    triggerAction: 'all',
    typeAhead: true,
    width: 135
});

var menu = new Ext.menu.Menu({
    id: 'mainMenu',
    items: [
        combo // A Field in a Menu
    ]
});
</code></pre>
     */
    getListParent : function() {
        return document.body;
    },

    /**
     * Returns the store associated with this combo.
     * @return {Ext.data.Store} The store
     */
    getStore : function(){
        return this.store;
    },

    // private
    bindStore : function(store, initial){
        if(this.store && !initial){
            if(this.store !== store && this.store.autoDestroy){
                this.store.destroy();
            }else{
                this.store.un('beforeload', this.onBeforeLoad, this);
                this.store.un('load', this.onLoad, this);
                this.store.un('exception', this.collapse, this);
            }
            if(!store){
                this.store = null;
                if(this.view){
                    this.view.bindStore(null);
                }
                if(this.pageTb){
                    this.pageTb.bindStore(null);
                }
            }
        }
        if(store){
            if(!initial) {
                this.lastQuery = null;
                if(this.pageTb) {
                    this.pageTb.bindStore(store);
                }
            }

            this.store = Ext.StoreMgr.lookup(store);
            this.store.on({
                scope: this,
                beforeload: this.onBeforeLoad,
                load: this.onLoad,
                exception: this.collapse
            });

            if(this.view){
                this.view.bindStore(store);
            }
        }
    },

    reset : function(){
        if(this.clearFilterOnReset && this.mode == 'local'){
            this.store.clearFilter();
        }
        Ext.form.ComboBox.superclass.reset.call(this);
    },

    // private
    initEvents : function(){
        Ext.form.ComboBox.superclass.initEvents.call(this);

        /**
         * @property keyNav
         * @type Ext.KeyNav
         * <p>A {@link Ext.KeyNav KeyNav} object which handles navigation keys for this ComboBox. This performs actions
         * based on keystrokes typed when the input field is focused.</p>
         * <p><b>After the ComboBox has been rendered</b>, you may override existing navigation key functionality,
         * or add your own based upon key names as specified in the {@link Ext.KeyNav KeyNav} class.</p>
         * <p>The function is executed in the scope (<code>this</code> reference of the ComboBox. Example:</p><pre><code>
myCombo.keyNav.esc = function(e) {  // Override ESC handling function
    this.collapse();                // Standard behaviour of Ext's ComboBox.
    this.setValue(this.startValue); // We reset to starting value on ESC
};
myCombo.keyNav.tab = function() {   // Override TAB handling function
    this.onViewClick(false);        // Select the currently highlighted row
};
</code></pre>
         */
        this.keyNav = new Ext.KeyNav(this.el, {
            "up" : function(e){
                this.inKeyMode = true;
                this.selectPrev();
            },

            "down" : function(e){
                if(!this.isExpanded()){
                    this.onTriggerClick();
                }else{
                    this.inKeyMode = true;
                    this.selectNext();
                }
            },

            "enter" : function(e){
                this.onViewClick();
            },

            "esc" : function(e){
                this.collapse();
            },

            "tab" : function(e){
                if (this.forceSelection === true) {
                    this.collapse();
                } else {
                    this.onViewClick(false);
                }
                return true;
            },

            scope : this,

            doRelay : function(e, h, hname){
                if(hname == 'down' || this.scope.isExpanded()){
                    // this MUST be called before ComboBox#fireKey()
                    var relay = Ext.KeyNav.prototype.doRelay.apply(this, arguments);
                    if(!Ext.isIE && Ext.EventManager.useKeydown){
                        // call Combo#fireKey() for browsers which use keydown event (except IE)
                        this.scope.fireKey(e);
                    }
                    return relay;
                }
                return true;
            },

            forceKeyDown : true,
            defaultEventAction: 'stopEvent'
        });
        this.queryDelay = Math.max(this.queryDelay || 10,
                this.mode == 'local' ? 10 : 250);
        this.dqTask = new Ext.util.DelayedTask(this.initQuery, this);
        if(this.typeAhead){
            this.taTask = new Ext.util.DelayedTask(this.onTypeAhead, this);
        }
        if(!this.enableKeyEvents){
            this.mon(this.el, 'keyup', this.onKeyUp, this);
        }
    },


    // private
    onDestroy : function(){
        if (this.dqTask){
            this.dqTask.cancel();
            this.dqTask = null;
        }
        this.bindStore(null);
        Ext.destroy(
            this.resizer,
            this.view,
            this.pageTb,
            this.list
        );
        Ext.destroyMembers(this, 'hiddenField');
        Ext.form.ComboBox.superclass.onDestroy.call(this);
    },

    // private
    fireKey : function(e){
        if (!this.isExpanded()) {
            Ext.form.ComboBox.superclass.fireKey.call(this, e);
        }
    },

    // private
    onResize : function(w, h){
        Ext.form.ComboBox.superclass.onResize.apply(this, arguments);
        if(!isNaN(w) && this.isVisible() && this.list){
            this.doResize(w);
        }else{
            this.bufferSize = w;
        }
    },

    doResize: function(w){
        if(!Ext.isDefined(this.listWidth)){
            var lw = Math.max(w, this.minListWidth);
            this.list.setWidth(lw);
            this.innerList.setWidth(lw - this.list.getFrameWidth('lr'));
        }
    },

    // private
    onEnable : function(){
        Ext.form.ComboBox.superclass.onEnable.apply(this, arguments);
        if(this.hiddenField){
            this.hiddenField.disabled = false;
        }
    },

    // private
    onDisable : function(){
        Ext.form.ComboBox.superclass.onDisable.apply(this, arguments);
        if(this.hiddenField){
            this.hiddenField.disabled = true;
        }
    },

    // private
    onBeforeLoad : function(){
        if(!this.hasFocus){
            return;
        }
        this.innerList.update(this.loadingText ?
               '<div class="loading-indicator">'+this.loadingText+'</div>' : '');
        this.restrictHeight();
        this.selectedIndex = -1;
    },

    // private
    onLoad : function(){
        if(!this.hasFocus){
            return;
        }
        if(this.store.getCount() > 0 || this.listEmptyText){
            this.expand();
            this.restrictHeight();
            if(this.lastQuery == this.allQuery){
                if(this.editable){
                    this.el.dom.select();
                }

                if(this.autoSelect !== false && !this.selectByValue(this.value, true)){
                    this.select(0, true);
                }
            }else{
                if(this.autoSelect !== false){
                    this.selectNext();
                }
                if(this.typeAhead && this.lastKey != Ext.EventObject.BACKSPACE && this.lastKey != Ext.EventObject.DELETE){
                    this.taTask.delay(this.typeAheadDelay);
                }
            }
        }else{
            this.collapse();
        }

    },

    // private
    onTypeAhead : function(){
        if(this.store.getCount() > 0){
            var r = this.store.getAt(0);
            var newValue = r.data[this.displayField];
            var len = newValue.length;
            var selStart = this.getRawValue().length;
            if(selStart != len){
                this.setRawValue(newValue);
                this.selectText(selStart, newValue.length);
            }
        }
    },

    // private
    assertValue : function(){
        var val = this.getRawValue(),
            rec;

        if(this.valueField && Ext.isDefined(this.value)){
            rec = this.findRecord(this.valueField, this.value);
        }
        if(!rec || rec.get(this.displayField) != val){
            rec = this.findRecord(this.displayField, val);
        }
        if(!rec && this.forceSelection){
            if(val.length > 0 && val != this.emptyText){
                this.el.dom.value = Ext.value(this.lastSelectionText, '');
                this.applyEmptyText();
            }else{
                this.clearValue();
            }
        }else{
            if(rec && this.valueField){
                // onSelect may have already set the value and by doing so
                // set the display field properly.  Let's not wipe out the
                // valueField here by just sending the displayField.
                if (this.value == val){
                    return;
                }
                val = rec.get(this.valueField || this.displayField);
            }
            this.setValue(val);
        }
    },

    // private
    onSelect : function(record, index){
        if(this.fireEvent('beforeselect', this, record, index) !== false){
            this.setValue(record.data[this.valueField || this.displayField]);
            this.collapse();
            this.fireEvent('select', this, record, index);
        }
    },

    // inherit docs
    getName: function(){
        var hf = this.hiddenField;
        return hf && hf.name ? hf.name : this.hiddenName || Ext.form.ComboBox.superclass.getName.call(this);
    },

    /**
     * Returns the currently selected field value or empty string if no value is set.
     * @return {String} value The selected value
     */
    getValue : function(){
        if(this.valueField){
            return Ext.isDefined(this.value) ? this.value : '';
        }else{
            return Ext.form.ComboBox.superclass.getValue.call(this);
        }
    },

    /**
     * Clears any text/value currently set in the field
     */
    clearValue : function(){
        if(this.hiddenField){
            this.hiddenField.value = '';
        }
        this.setRawValue('');
        this.lastSelectionText = '';
        this.applyEmptyText();
        this.value = '';
    },

    /**
     * Sets the specified value into the field.  If the value finds a match, the corresponding record text
     * will be displayed in the field.  If the value does not match the data value of an existing item,
     * and the valueNotFoundText config option is defined, it will be displayed as the default field text.
     * Otherwise the field will be blank (although the value will still be set).
     * @param {String} value The value to match
     * @return {Ext.form.Field} this
     */
    setValue : function(v){
        var text = v;
        if(this.valueField){
            var r = this.findRecord(this.valueField, v);
            if(r){
                text = r.data[this.displayField];
            }else if(Ext.isDefined(this.valueNotFoundText)){
                text = this.valueNotFoundText;
            }
        }
        this.lastSelectionText = text;
        if(this.hiddenField){
            this.hiddenField.value = Ext.value(v, '');
        }
        Ext.form.ComboBox.superclass.setValue.call(this, text);
        this.value = v;
        return this;
    },

    // private
    findRecord : function(prop, value){
        var record;
        if(this.store.getCount() > 0){
            this.store.each(function(r){
                if(r.data[prop] == value){
                    record = r;
                    return false;
                }
            });
        }
        return record;
    },

    // private
    onViewMove : function(e, t){
        this.inKeyMode = false;
    },

    // private
    onViewOver : function(e, t){
        if(this.inKeyMode){ // prevent key nav and mouse over conflicts
            return;
        }
        var item = this.view.findItemFromChild(t);
        if(item){
            var index = this.view.indexOf(item);
            this.select(index, false);
        }
    },

    // private
    onViewClick : function(doFocus){
        var index = this.view.getSelectedIndexes()[0],
            s = this.store,
            r = s.getAt(index);
        if(r){
            this.onSelect(r, index);
        }else {
            this.collapse();
        }
        if(doFocus !== false){
            this.el.focus();
        }
    },


    // private
    restrictHeight : function(){
        this.innerList.dom.style.height = '';
        var inner = this.innerList.dom,
            pad = this.list.getFrameWidth('tb') + (this.resizable ? this.handleHeight : 0) + this.assetHeight,
            h = Math.max(inner.clientHeight, inner.offsetHeight, inner.scrollHeight),
            ha = this.getPosition()[1]-Ext.getBody().getScroll().top,
            hb = Ext.lib.Dom.getViewHeight()-ha-this.getSize().height,
            space = Math.max(ha, hb, this.minHeight || 0)-this.list.shadowOffset-pad-5;

        h = Math.min(h, space, this.maxHeight);

        this.innerList.setHeight(h);
        this.list.beginUpdate();
        this.list.setHeight(h+pad);
        this.list.alignTo.apply(this.list, [this.el].concat(this.listAlign));
        this.list.endUpdate();
    },

    /**
     * Returns true if the dropdown list is expanded, else false.
     */
    isExpanded : function(){
        return this.list && this.list.isVisible();
    },

    /**
     * Select an item in the dropdown list by its data value. This function does NOT cause the select event to fire.
     * The store must be loaded and the list expanded for this function to work, otherwise use setValue.
     * @param {String} value The data value of the item to select
     * @param {Boolean} scrollIntoView False to prevent the dropdown list from autoscrolling to display the
     * selected item if it is not currently in view (defaults to true)
     * @return {Boolean} True if the value matched an item in the list, else false
     */
    selectByValue : function(v, scrollIntoView){
        if(!Ext.isEmpty(v, true)){
            var r = this.findRecord(this.valueField || this.displayField, v);
            if(r){
                this.select(this.store.indexOf(r), scrollIntoView);
                return true;
            }
        }
        return false;
    },

    /**
     * Select an item in the dropdown list by its numeric index in the list. This function does NOT cause the select event to fire.
     * The store must be loaded and the list expanded for this function to work, otherwise use setValue.
     * @param {Number} index The zero-based index of the list item to select
     * @param {Boolean} scrollIntoView False to prevent the dropdown list from autoscrolling to display the
     * selected item if it is not currently in view (defaults to true)
     */
    select : function(index, scrollIntoView){
        this.selectedIndex = index;
        this.view.select(index);
        if(scrollIntoView !== false){
            var el = this.view.getNode(index);
            if(el){
                this.innerList.scrollChildIntoView(el, false);
            }
        }

    },

    // private
    selectNext : function(){
        var ct = this.store.getCount();
        if(ct > 0){
            if(this.selectedIndex == -1){
                this.select(0);
            }else if(this.selectedIndex < ct-1){
                this.select(this.selectedIndex+1);
            }
        }
    },

    // private
    selectPrev : function(){
        var ct = this.store.getCount();
        if(ct > 0){
            if(this.selectedIndex == -1){
                this.select(0);
            }else if(this.selectedIndex !== 0){
                this.select(this.selectedIndex-1);
            }
        }
    },

    // private
    onKeyUp : function(e){
        var k = e.getKey();
        if(this.editable !== false && this.readOnly !== true && (k == e.BACKSPACE || !e.isSpecialKey())){

            this.lastKey = k;
            this.dqTask.delay(this.queryDelay);
        }
        Ext.form.ComboBox.superclass.onKeyUp.call(this, e);
    },

    // private
    validateBlur : function(){
        return !this.list || !this.list.isVisible();
    },

    // private
    initQuery : function(){
        this.doQuery(this.getRawValue());
    },

    // private
    beforeBlur : function(){
        this.assertValue();
    },

    // private
    postBlur  : function(){
        Ext.form.ComboBox.superclass.postBlur.call(this);
        this.collapse();
        this.inKeyMode = false;
    },

    /**
     * Execute a query to filter the dropdown list.  Fires the {@link #beforequery} event prior to performing the
     * query allowing the query action to be canceled if needed.
     * @param {String} query The SQL query to execute
     * @param {Boolean} forceAll <tt>true</tt> to force the query to execute even if there are currently fewer
     * characters in the field than the minimum specified by the <tt>{@link #minChars}</tt> config option.  It
     * also clears any filter previously saved in the current store (defaults to <tt>false</tt>)
     */
    doQuery : function(q, forceAll){
        q = Ext.isEmpty(q) ? '' : q;
        var qe = {
            query: q,
            forceAll: forceAll,
            combo: this,
            cancel:false
        };
        if(this.fireEvent('beforequery', qe)===false || qe.cancel){
            return false;
        }
        q = qe.query;
        forceAll = qe.forceAll;
        if(forceAll === true || (q.length >= this.minChars)){
            if(this.lastQuery !== q){
                this.lastQuery = q;
                if(this.mode == 'local'){
                    this.selectedIndex = -1;
                    if(forceAll){
                        this.store.clearFilter();
                    }else{
                        this.store.filter(this.displayField, q);
                    }
                    this.onLoad();
                }else{
                    this.store.baseParams[this.queryParam] = q;
                    this.store.load({
                        params: this.getParams(q)
                    });
                    this.expand();
                }
            }else{
                this.selectedIndex = -1;
                this.onLoad();
            }
        }
    },

    // private
    getParams : function(q){
        var params = {},
            paramNames = this.store.paramNames;
        if(this.pageSize){
            params[paramNames.start] = 0;
            params[paramNames.limit] = this.pageSize;
        }
        return params;
    },

    /**
     * Hides the dropdown list if it is currently expanded. Fires the {@link #collapse} event on completion.
     */
    collapse : function(){
        if(!this.isExpanded()){
            return;
        }
        this.list.hide();
        Ext.getDoc().un('mousewheel', this.collapseIf, this);
        Ext.getDoc().un('mousedown', this.collapseIf, this);
        this.fireEvent('collapse', this);
    },

    // private
    collapseIf : function(e){
        if(!this.isDestroyed && !e.within(this.wrap) && !e.within(this.list)){
            this.collapse();
        }
    },

    /**
     * Expands the dropdown list if it is currently hidden. Fires the {@link #expand} event on completion.
     */
    expand : function(){
        if(this.isExpanded() || !this.hasFocus){
            return;
        }

        if(this.title || this.pageSize){
            this.assetHeight = 0;
            if(this.title){
                this.assetHeight += this.header.getHeight();
            }
            if(this.pageSize){
                this.assetHeight += this.footer.getHeight();
            }
        }

        if(this.bufferSize){
            this.doResize(this.bufferSize);
            delete this.bufferSize;
        }
        this.list.alignTo.apply(this.list, [this.el].concat(this.listAlign));

        // zindex can change, re-check it and set it if necessary
        this.list.setZIndex(this.getZIndex());
        this.list.show();
        if(Ext.isGecko2){
            this.innerList.setOverflow('auto'); // necessary for FF 2.0/Mac
        }
        this.mon(Ext.getDoc(), {
            scope: this,
            mousewheel: this.collapseIf,
            mousedown: this.collapseIf
        });
        this.fireEvent('expand', this);
    },

    /**
     * @method onTriggerClick
     * @hide
     */
    // private
    // Implements the default empty TriggerField.onTriggerClick function
    onTriggerClick : function(){
        if(this.readOnly || this.disabled){
            return;
        }
        if(this.isExpanded()){
            this.collapse();
            this.el.focus();
        }else {
            this.onFocus({});
            if(this.triggerAction == 'all') {
                this.doQuery(this.allQuery, true);
            } else {
                this.doQuery(this.getRawValue());
            }
            this.el.focus();
        }
    }

    /**
     * @hide
     * @method autoSize
     */
    /**
     * @cfg {Boolean} grow @hide
     */
    /**
     * @cfg {Number} growMin @hide
     */
    /**
     * @cfg {Number} growMax @hide
     */

});
Ext.reg('combo', Ext.form.ComboBox);
/**
 * @class Ext.form.Checkbox
 * @extends Ext.form.Field
 * Single checkbox field.  Can be used as a direct replacement for traditional checkbox fields.
 * @constructor
 * Creates a new Checkbox
 * @param {Object} config Configuration options
 * @xtype checkbox
 */
Ext.form.Checkbox = Ext.extend(Ext.form.Field,  {
    /**
     * @cfg {String} focusClass The CSS class to use when the checkbox receives focus (defaults to undefined)
     */
    focusClass : undefined,
    /**
     * @cfg {String} fieldClass The default CSS class for the checkbox (defaults to 'x-form-field')
     */
    fieldClass : 'x-form-field',
    /**
     * @cfg {Boolean} checked <tt>true</tt> if the checkbox should render initially checked (defaults to <tt>false</tt>)
     */
    checked : false,
    /**
     * @cfg {String} boxLabel The text that appears beside the checkbox
     */
    boxLabel: '&#160;',
    /**
     * @cfg {String/Object} autoCreate A DomHelper element spec, or true for a default element spec (defaults to
     * {tag: 'input', type: 'checkbox', autocomplete: 'off'})
     */
    defaultAutoCreate : { tag: 'input', type: 'checkbox', autocomplete: 'off'},
    /**
     * @cfg {String} inputValue The value that should go into the generated input element's value attribute
     */
    /**
     * @cfg {Function} handler A function called when the {@link #checked} value changes (can be used instead of
     * handling the check event). The handler is passed the following parameters:
     * <div class="mdetail-params"><ul>
     * <li><b>checkbox</b> : Ext.form.Checkbox<div class="sub-desc">The Checkbox being toggled.</div></li>
     * <li><b>checked</b> : Boolean<div class="sub-desc">The new checked state of the checkbox.</div></li>
     * </ul></div>
     */
    /**
     * @cfg {Object} scope An object to use as the scope ('this' reference) of the {@link #handler} function
     * (defaults to this Checkbox).
     */

    // private
    actionMode : 'wrap',

	// private
    initComponent : function(){
        Ext.form.Checkbox.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event check
             * Fires when the checkbox is checked or unchecked.
             * @param {Ext.form.Checkbox} this This checkbox
             * @param {Boolean} checked The new checked value
             */
            'check'
        );
    },

    // private
    onResize : function(){
        Ext.form.Checkbox.superclass.onResize.apply(this, arguments);
        if(!this.boxLabel && !this.fieldLabel){
            this.el.alignTo(this.wrap, 'c-c');
        }
    },

    // private
    initEvents : function(){
        Ext.form.Checkbox.superclass.initEvents.call(this);
        this.mon(this.el, {
            scope: this,
            click: this.onClick,
            change: this.onClick
        });
    },

    /**
     * @hide
     * Overridden and disabled. The editor element does not support standard valid/invalid marking.
     * @method
     */
    markInvalid : Ext.emptyFn,
    /**
     * @hide
     * Overridden and disabled. The editor element does not support standard valid/invalid marking.
     * @method
     */
    clearInvalid : Ext.emptyFn,

    // private
    onRender : function(ct, position){
        Ext.form.Checkbox.superclass.onRender.call(this, ct, position);
        if(this.inputValue !== undefined){
            this.el.dom.value = this.inputValue;
        }
        this.wrap = this.el.wrap({cls: 'x-form-check-wrap'});
        if(this.boxLabel){
            this.wrap.createChild({tag: 'label', htmlFor: this.el.id, cls: 'x-form-cb-label', html: this.boxLabel});
        }
        if(this.checked){
            this.setValue(true);
        }else{
            this.checked = this.el.dom.checked;
        }
        // Need to repaint for IE, otherwise positioning is broken
        if (Ext.isIE && !Ext.isStrict) {
            this.wrap.repaint();
        }
        this.resizeEl = this.positionEl = this.wrap;
    },

    // private
    onDestroy : function(){
        Ext.destroy(this.wrap);
        Ext.form.Checkbox.superclass.onDestroy.call(this);
    },

    // private
    initValue : function() {
        this.originalValue = this.getValue();
    },

    /**
     * Returns the checked state of the checkbox.
     * @return {Boolean} True if checked, else false
     */
    getValue : function(){
        if(this.rendered){
            return this.el.dom.checked;
        }
        return this.checked;
    },

	// private
    onClick : function(){
        if(this.el.dom.checked != this.checked){
            this.setValue(this.el.dom.checked);
        }
    },

    /**
     * Sets the checked state of the checkbox, fires the 'check' event, and calls a
     * <code>{@link #handler}</code> (if configured).
     * @param {Boolean/String} checked The following values will check the checkbox:
     * <code>true, 'true', '1', or 'on'</code>. Any other value will uncheck the checkbox.
     * @return {Ext.form.Field} this
     */
    setValue : function(v){
        var checked = this.checked,
            inputVal = this.inputValue;
            
        this.checked = (v === true || v === 'true' || v == '1' || (inputVal ? v == inputVal : String(v).toLowerCase() == 'on'));
        if(this.rendered){
            this.el.dom.checked = this.checked;
            this.el.dom.defaultChecked = this.checked;
        }
        if(checked != this.checked){
            this.fireEvent('check', this, this.checked);
            if(this.handler){
                this.handler.call(this.scope || this, this, this.checked);
            }
        }
        return this;
    }
});
Ext.reg('checkbox', Ext.form.Checkbox);
/**
 * @class Ext.form.CheckboxGroup
 * @extends Ext.form.Field
 * <p>A grouping container for {@link Ext.form.Checkbox} controls.</p>
 * <p>Sample usage:</p>
 * <pre><code>
var myCheckboxGroup = new Ext.form.CheckboxGroup({
    id:'myGroup',
    xtype: 'checkboxgroup',
    fieldLabel: 'Single Column',
    itemCls: 'x-check-group-alt',
    // Put all controls in a single column with width 100%
    columns: 1,
    items: [
        {boxLabel: 'Item 1', name: 'cb-col-1'},
        {boxLabel: 'Item 2', name: 'cb-col-2', checked: true},
        {boxLabel: 'Item 3', name: 'cb-col-3'}
    ]
});
 * </code></pre>
 * @constructor
 * Creates a new CheckboxGroup
 * @param {Object} config Configuration options
 * @xtype checkboxgroup
 */
Ext.form.CheckboxGroup = Ext.extend(Ext.form.Field, {
    /**
     * @cfg {Array} items An Array of {@link Ext.form.Checkbox Checkbox}es or Checkbox config objects
     * to arrange in the group.
     */
    /**
     * @cfg {String/Number/Array} columns Specifies the number of columns to use when displaying grouped
     * checkbox/radio controls using automatic layout.  This config can take several types of values:
     * <ul><li><b>'auto'</b> : <p class="sub-desc">The controls will be rendered one per column on one row and the width
     * of each column will be evenly distributed based on the width of the overall field container. This is the default.</p></li>
     * <li><b>Number</b> : <p class="sub-desc">If you specific a number (e.g., 3) that number of columns will be
     * created and the contained controls will be automatically distributed based on the value of {@link #vertical}.</p></li>
     * <li><b>Array</b> : Object<p class="sub-desc">You can also specify an array of column widths, mixing integer
     * (fixed width) and float (percentage width) values as needed (e.g., [100, .25, .75]). Any integer values will
     * be rendered first, then any float values will be calculated as a percentage of the remaining space. Float
     * values do not have to add up to 1 (100%) although if you want the controls to take up the entire field
     * container you should do so.</p></li></ul>
     */
    columns : 'auto',
    /**
     * @cfg {Boolean} vertical True to distribute contained controls across columns, completely filling each column
     * top to bottom before starting on the next column.  The number of controls in each column will be automatically
     * calculated to keep columns as even as possible.  The default value is false, so that controls will be added
     * to columns one at a time, completely filling each row left to right before starting on the next row.
     */
    vertical : false,
    /**
     * @cfg {Boolean} allowBlank False to validate that at least one item in the group is checked (defaults to true).
     * If no items are selected at validation time, {@link @blankText} will be used as the error text.
     */
    allowBlank : true,
    /**
     * @cfg {String} blankText Error text to display if the {@link #allowBlank} validation fails (defaults to "You must
     * select at least one item in this group")
     */
    blankText : "You must select at least one item in this group",

    // private
    defaultType : 'checkbox',

    // private
    groupCls : 'x-form-check-group',

    // private
    initComponent: function(){
        this.addEvents(
            /**
             * @event change
             * Fires when the state of a child checkbox changes.
             * @param {Ext.form.CheckboxGroup} this
             * @param {Array} checked An array containing the checked boxes.
             */
            'change'
        );
        this.on('change', this.validate, this);
        Ext.form.CheckboxGroup.superclass.initComponent.call(this);
    },

    // private
    onRender : function(ct, position){
        if(!this.el){
            var panelCfg = {
                autoEl: {
                    id: this.id
                },
                cls: this.groupCls,
                layout: 'column',
                renderTo: ct,
                bufferResize: false // Default this to false, since it doesn't really have a proper ownerCt.
            };
            var colCfg = {
                xtype: 'container',
                defaultType: this.defaultType,
                layout: 'form',
                defaults: {
                    hideLabel: true,
                    anchor: '100%'
                }
            };

            if(this.items[0].items){

                // The container has standard ColumnLayout configs, so pass them in directly

                Ext.apply(panelCfg, {
                    layoutConfig: {columns: this.items.length},
                    defaults: this.defaults,
                    items: this.items
                });
                for(var i=0, len=this.items.length; i<len; i++){
                    Ext.applyIf(this.items[i], colCfg);
                }

            }else{

                // The container has field item configs, so we have to generate the column
                // panels first then move the items into the columns as needed.

                var numCols, cols = [];

                if(typeof this.columns == 'string'){ // 'auto' so create a col per item
                    this.columns = this.items.length;
                }
                if(!Ext.isArray(this.columns)){
                    var cs = [];
                    for(var i=0; i<this.columns; i++){
                        cs.push((100/this.columns)*.01); // distribute by even %
                    }
                    this.columns = cs;
                }

                numCols = this.columns.length;

                // Generate the column configs with the correct width setting
                for(var i=0; i<numCols; i++){
                    var cc = Ext.apply({items:[]}, colCfg);
                    cc[this.columns[i] <= 1 ? 'columnWidth' : 'width'] = this.columns[i];
                    if(this.defaults){
                        cc.defaults = Ext.apply(cc.defaults || {}, this.defaults);
                    }
                    cols.push(cc);
                };

                // Distribute the original items into the columns
                if(this.vertical){
                    var rows = Math.ceil(this.items.length / numCols), ri = 0;
                    for(var i=0, len=this.items.length; i<len; i++){
                        if(i>0 && i%rows==0){
                            ri++;
                        }
                        if(this.items[i].fieldLabel){
                            this.items[i].hideLabel = false;
                        }
                        cols[ri].items.push(this.items[i]);
                    };
                }else{
                    for(var i=0, len=this.items.length; i<len; i++){
                        var ci = i % numCols;
                        if(this.items[i].fieldLabel){
                            this.items[i].hideLabel = false;
                        }
                        cols[ci].items.push(this.items[i]);
                    };
                }

                Ext.apply(panelCfg, {
                    layoutConfig: {columns: numCols},
                    items: cols
                });
            }

            this.panel = new Ext.Container(panelCfg);
            this.panel.ownerCt = this;
            this.el = this.panel.getEl();

            if(this.forId && this.itemCls){
                var l = this.el.up(this.itemCls).child('label', true);
                if(l){
                    l.setAttribute('htmlFor', this.forId);
                }
            }

            var fields = this.panel.findBy(function(c){
                return c.isFormField;
            }, this);

            this.items = new Ext.util.MixedCollection();
            this.items.addAll(fields);
        }
        Ext.form.CheckboxGroup.superclass.onRender.call(this, ct, position);
    },

    initValue : function(){
        if(this.value){
            this.setValue.apply(this, this.buffered ? this.value : [this.value]);
            delete this.buffered;
            delete this.value;
        }
    },

    afterRender : function(){
        Ext.form.CheckboxGroup.superclass.afterRender.call(this);
        this.eachItem(function(item){
            item.on('check', this.fireChecked, this);
            item.inGroup = true;
        });
    },

    // private
    doLayout: function(){
        //ugly method required to layout hidden items
        if(this.rendered){
            this.panel.forceLayout = this.ownerCt.forceLayout;
            this.panel.doLayout();
        }
    },

    // private
    fireChecked: function(){
        var arr = [];
        this.eachItem(function(item){
            if(item.checked){
                arr.push(item);
            }
        });
        this.fireEvent('change', this, arr);
    },
    
    /**
     * Runs CheckboxGroup's validations and returns an array of any errors. The only error by default
     * is if allowBlank is set to true and no items are checked.
     * @return {Array} Array of all validation errors
     */
    getErrors: function() {
        var errors = Ext.form.CheckboxGroup.superclass.getErrors.apply(this, arguments);
        
        if (!this.allowBlank) {
            var blank = true;
            
            this.eachItem(function(f){
                if (f.checked) {
                    return (blank = false);
                }
            });
            
            if (blank) errors.push(this.blankText);
        }
        
        return errors;
    },

    // private
    isDirty: function(){
        //override the behaviour to check sub items.
        if (this.disabled || !this.rendered) {
            return false;
        }

        var dirty = false;
        
        this.eachItem(function(item){
            if(item.isDirty()){
                dirty = true;
                return false;
            }
        });
        
        return dirty;
    },

    // private
    setReadOnly : function(readOnly){
        if(this.rendered){
            this.eachItem(function(item){
                item.setReadOnly(readOnly);
            });
        }
        this.readOnly = readOnly;
    },

    // private
    onDisable : function(){
        this.eachItem(function(item){
            item.disable();
        });
    },

    // private
    onEnable : function(){
        this.eachItem(function(item){
            item.enable();
        });
    },

    // private
    onResize : function(w, h){
        this.panel.setSize(w, h);
        this.panel.doLayout();
    },

    // inherit docs from Field
    reset : function(){
        if (this.originalValue) {
            // Clear all items
            this.eachItem(function(c){
                if(c.setValue){
                    c.setValue(false);
                    c.originalValue = c.getValue();
                }
            });
            // Set items stored in originalValue, ugly - set a flag to reset the originalValue
            // during the horrible onSetValue.  This will allow trackResetOnLoad to function.
            this.resetOriginal = true;
            this.setValue(this.originalValue);
            delete this.resetOriginal;
        } else {
            this.eachItem(function(c){
                if(c.reset){
                    c.reset();
                }
            });
        }
        // Defer the clearInvalid so if BaseForm's collection is being iterated it will be called AFTER it is complete.
        // Important because reset is being called on both the group and the individual items.
        (function() {
            this.clearInvalid();
        }).defer(50, this);
    },

    /**
     * {@link Ext.form.Checkbox#setValue Set the value(s)} of an item or items
     * in the group. Examples illustrating how this method may be called:
     * <pre><code>
// call with name and value
myCheckboxGroup.setValue('cb-col-1', true);
// call with an array of boolean values
myCheckboxGroup.setValue([true, false, false]);
// call with an object literal specifying item:value pairs
myCheckboxGroup.setValue({
    'cb-col-2': false,
    'cb-col-3': true
});
// use comma separated string to set items with name to true (checked)
myCheckboxGroup.setValue('cb-col-1,cb-col-3');
     * </code></pre>
     * See {@link Ext.form.Checkbox#setValue} for additional information.
     * @param {Mixed} id The checkbox to check, or as described by example shown.
     * @param {Boolean} value (optional) The value to set the item.
     * @return {Ext.form.CheckboxGroup} this
     */
    setValue: function(){
        if(this.rendered){
            this.onSetValue.apply(this, arguments);
        }else{
            this.buffered = true;
            this.value = arguments;
        }
        return this;
    },

    /**
     * @private
     * Sets the values of one or more of the items within the CheckboxGroup
     * @param {String|Array|Object} id Can take multiple forms. Can be optionally:
     * <ul>
     *   <li>An ID string to be used with a second argument</li>
     *   <li>An array of the form ['some', 'list', 'of', 'ids', 'to', 'mark', 'checked']</li>
     *   <li>An array in the form [true, true, false, true, false] etc, where each item relates to the check status of
     *       the checkbox at the same index</li>
     *   <li>An object containing ids of the checkboxes as keys and check values as properties</li>
     * </ul>
     * @param {String} value The value to set the field to if the first argument was a string
     */
    onSetValue: function(id, value){
        if(arguments.length == 1){
            if(Ext.isArray(id)){
                Ext.each(id, function(val, idx){
                    if (Ext.isObject(val) && val.setValue){ // array of checkbox components to be checked
                        val.setValue(true);
                        if (this.resetOriginal === true) {
                            val.originalValue = val.getValue();
                        }
                    } else { // an array of boolean values
                        var item = this.items.itemAt(idx);
                        if(item){
                            item.setValue(val);
                        }
                    }
                }, this);
            }else if(Ext.isObject(id)){
                // set of name/value pairs
                for(var i in id){
                    var f = this.getBox(i);
                    if(f){
                        f.setValue(id[i]);
                    }
                }
            }else{
                this.setValueForItem(id);
            }
        }else{
            var f = this.getBox(id);
            if(f){
                f.setValue(value);
            }
        }
    },

    // private
    beforeDestroy: function(){
        Ext.destroy(this.panel);
        if (!this.rendered) {
            Ext.destroy(this.items);
        }
        Ext.form.CheckboxGroup.superclass.beforeDestroy.call(this);

    },

    setValueForItem : function(val){
        val = String(val).split(',');
        this.eachItem(function(item){
            if(val.indexOf(item.inputValue)> -1){
                item.setValue(true);
            }
        });
    },

    // private
    getBox : function(id){
        var box = null;
        this.eachItem(function(f){
            if(id == f || f.dataIndex == id || f.id == id || f.getName() == id){
                box = f;
                return false;
            }
        });
        return box;
    },

    /**
     * Gets an array of the selected {@link Ext.form.Checkbox} in the group.
     * @return {Array} An array of the selected checkboxes.
     */
    getValue : function(){
        var out = [];
        this.eachItem(function(item){
            if(item.checked){
                out.push(item);
            }
        });
        return out;
    },

    /**
     * @private
     * Convenience function which passes the given function to every item in the composite
     * @param {Function} fn The function to call
     * @param {Object} scope Optional scope object
     */
    eachItem: function(fn, scope) {
        if(this.items && this.items.each){
            this.items.each(fn, scope || this);
        }
    },

    /**
     * @cfg {String} name
     * @hide
     */

    /**
     * @method getRawValue
     * @hide
     */
    getRawValue : Ext.emptyFn,

    /**
     * @method setRawValue
     * @hide
     */
    setRawValue : Ext.emptyFn

});

Ext.reg('checkboxgroup', Ext.form.CheckboxGroup);
/**
 * @class Ext.form.CompositeField
 * @extends Ext.form.Field
 * Composite field allowing a number of form Fields to be rendered on the same row. The fields are rendered
 * using an hbox layout internally, so all of the normal HBox layout config items are available. Example usage:
 * <pre>
{
    xtype: 'compositefield',
    labelWidth: 120
    items: [
        {
            xtype     : 'textfield',
            fieldLabel: 'Title',
            width     : 20
        },
        {
            xtype     : 'textfield',
            fieldLabel: 'First',
            flex      : 1
        },
        {
            xtype     : 'textfield',
            fieldLabel: 'Last',
            flex      : 1
        }
    ]
}
 * </pre>
 * In the example above the composite's fieldLabel will be set to 'Title, First, Last' as it groups the fieldLabels
 * of each of its children. This can be overridden by setting a fieldLabel on the compositefield itself:
 * <pre>
{
    xtype: 'compositefield',
    fieldLabel: 'Custom label',
    items: [...]
}
 * </pre>
 * Any Ext.form.* component can be placed inside a composite field.
 */
Ext.form.CompositeField = Ext.extend(Ext.form.Field, {

    /**
     * @property defaultMargins
     * @type String
     * The margins to apply by default to each field in the composite
     */
    defaultMargins: '0 5 0 0',

    /**
     * @property skipLastItemMargin
     * @type Boolean
     * If true, the defaultMargins are not applied to the last item in the composite field set (defaults to true)
     */
    skipLastItemMargin: true,

    /**
     * @property isComposite
     * @type Boolean
     * Signifies that this is a Composite field
     */
    isComposite: true,

    /**
     * @property combineErrors
     * @type Boolean
     * True to combine errors from the individual fields into a single error message at the CompositeField level (defaults to true)
     */
    combineErrors: true,
    
    /**
     * @cfg {String} labelConnector The string to use when joining segments of the built label together (defaults to ', ')
     */
    labelConnector: ', ',
    
    /**
     * @cfg {Object} defaults Any default properties to assign to the child fields.
     */

    //inherit docs
    //Builds the composite field label
    initComponent: function() {
        var labels = [],
            items  = this.items,
            item;

        for (var i=0, j = items.length; i < j; i++) {
            item = items[i];
            
            if (!Ext.isEmpty(item.ref)){
                item.ref = '../' + item.ref;
            }

            labels.push(item.fieldLabel);

            //apply any defaults
            Ext.applyIf(item, this.defaults);

            //apply default margins to each item except the last
            if (!(i == j - 1 && this.skipLastItemMargin)) {
                Ext.applyIf(item, {margins: this.defaultMargins});
            }
        }

        this.fieldLabel = this.fieldLabel || this.buildLabel(labels);

        /**
         * @property fieldErrors
         * @type Ext.util.MixedCollection
         * MixedCollection of current errors on the Composite's subfields. This is used internally to track when
         * to show and hide error messages at the Composite level. Listeners are attached to the MixedCollection's
         * add, remove and replace events to update the error icon in the UI as errors are added or removed.
         */
        this.fieldErrors = new Ext.util.MixedCollection(true, function(item) {
            return item.field;
        });

        this.fieldErrors.on({
            scope  : this,
            add    : this.updateInvalidMark,
            remove : this.updateInvalidMark,
            replace: this.updateInvalidMark
        });

        Ext.form.CompositeField.superclass.initComponent.apply(this, arguments);
        
        this.innerCt = new Ext.Container({
            layout  : 'hbox',
            items   : this.items,
            cls     : 'x-form-composite',
            defaultMargins: '0 3 0 0',
            ownerCt: this
        });
        this.innerCt.ownerCt = undefined;
        
        var fields = this.innerCt.findBy(function(c) {
            return c.isFormField;
        }, this);

        /**
         * @property items
         * @type Ext.util.MixedCollection
         * Internal collection of all of the subfields in this Composite
         */
        this.items = new Ext.util.MixedCollection();
        this.items.addAll(fields);
        
    },

    /**
     * @private
     * Creates an internal container using hbox and renders the fields to it
     */
    onRender: function(ct, position) {
        if (!this.el) {
            /**
             * @property innerCt
             * @type Ext.Container
             * A container configured with hbox layout which is responsible for laying out the subfields
             */
            var innerCt = this.innerCt;
            innerCt.render(ct);

            this.el = innerCt.getEl();

            //if we're combining subfield errors into a single message, override the markInvalid and clearInvalid
            //methods of each subfield and show them at the Composite level instead
            if (this.combineErrors) {
                this.eachItem(function(field) {
                    Ext.apply(field, {
                        markInvalid : this.onFieldMarkInvalid.createDelegate(this, [field], 0),
                        clearInvalid: this.onFieldClearInvalid.createDelegate(this, [field], 0)
                    });
                });
            }

            //set the label 'for' to the first item
            var l = this.el.parent().parent().child('label', true);
            if (l) {
                l.setAttribute('for', this.items.items[0].id);
            }
        }

        Ext.form.CompositeField.superclass.onRender.apply(this, arguments);
    },

    /**
     * Called if combineErrors is true and a subfield's markInvalid method is called.
     * By default this just adds the subfield's error to the internal fieldErrors MixedCollection
     * @param {Ext.form.Field} field The field that was marked invalid
     * @param {String} message The error message
     */
    onFieldMarkInvalid: function(field, message) {
        var name  = field.getName(),
            error = {
                field: name, 
                errorName: field.fieldLabel || name,
                error: message
            };

        this.fieldErrors.replace(name, error);

        field.el.addClass(field.invalidClass);
    },

    /**
     * Called if combineErrors is true and a subfield's clearInvalid method is called.
     * By default this just updates the internal fieldErrors MixedCollection.
     * @param {Ext.form.Field} field The field that was marked invalid
     */
    onFieldClearInvalid: function(field) {
        this.fieldErrors.removeKey(field.getName());

        field.el.removeClass(field.invalidClass);
    },

    /**
     * @private
     * Called after a subfield is marked valid or invalid, this checks to see if any of the subfields are
     * currently invalid. If any subfields are invalid it builds a combined error message marks the composite
     * invalid, otherwise clearInvalid is called
     */
    updateInvalidMark: function() {
        var ieStrict = Ext.isIE6 && Ext.isStrict;

        if (this.fieldErrors.length == 0) {
            this.clearInvalid();

            //IE6 in strict mode has a layout bug when using 'under' as the error message target. This fixes it
            if (ieStrict) {
                this.clearInvalid.defer(50, this);
            }
        } else {
            var message = this.buildCombinedErrorMessage(this.fieldErrors.items);

            this.sortErrors();
            this.markInvalid(message);

            //IE6 in strict mode has a layout bug when using 'under' as the error message target. This fixes it
            if (ieStrict) {
                this.markInvalid(message);
            }
        }
    },

    /**
     * Performs validation checks on each subfield and returns false if any of them fail validation.
     * @return {Boolean} False if any subfield failed validation
     */
    validateValue: function() {
        var valid = true;

        this.eachItem(function(field) {
            if (!field.isValid()) valid = false;
        });

        return valid;
    },

    /**
     * Takes an object containing error messages for contained fields, returning a combined error
     * string (defaults to just placing each item on a new line). This can be overridden to provide
     * custom combined error message handling.
     * @param {Array} errors Array of errors in format: [{field: 'title', error: 'some error'}]
     * @return {String} The combined error message
     */
    buildCombinedErrorMessage: function(errors) {
        var combined = [],
            error;

        for (var i = 0, j = errors.length; i < j; i++) {
            error = errors[i];

            combined.push(String.format("{0}: {1}", error.errorName, error.error));
        }

        return combined.join("<br />");
    },

    /**
     * Sorts the internal fieldErrors MixedCollection by the order in which the fields are defined.
     * This is called before displaying errors to ensure that the errors are presented in the expected order.
     * This function can be overridden to provide a custom sorting order if needed.
     */
    sortErrors: function() {
        var fields = this.items;

        this.fieldErrors.sort("ASC", function(a, b) {
            var findByName = function(key) {
                return function(field) {
                    return field.getName() == key;
                };
            };

            var aIndex = fields.findIndexBy(findByName(a.field)),
                bIndex = fields.findIndexBy(findByName(b.field));

            return aIndex < bIndex ? -1 : 1;
        });
    },

    /**
     * Resets each field in the composite to their previous value
     */
    reset: function() {
        this.eachItem(function(item) {
            item.reset();
        });

        // Defer the clearInvalid so if BaseForm's collection is being iterated it will be called AFTER it is complete.
        // Important because reset is being called on both the group and the individual items.
        (function() {
            this.clearInvalid();
        }).defer(50, this);
    },
    
    /**
     * Calls clearInvalid on all child fields. This is a convenience function and should not often need to be called
     * as fields usually take care of clearing themselves
     */
    clearInvalidChildren: function() {
        this.eachItem(function(item) {
            item.clearInvalid();
        });
    },

    /**
     * Builds a label string from an array of subfield labels.
     * By default this just joins the labels together with a comma
     * @param {Array} segments Array of each of the labels in the composite field's subfields
     * @return {String} The built label
     */
    buildLabel: function(segments) {
        return Ext.clean(segments).join(this.labelConnector);
    },

    /**
     * Checks each field in the composite and returns true if any is dirty
     * @return {Boolean} True if any field is dirty
     */
    isDirty: function(){
        //override the behaviour to check sub items.
        if (this.disabled || !this.rendered) {
            return false;
        }

        var dirty = false;
        this.eachItem(function(item){
            if(item.isDirty()){
                dirty = true;
                return false;
            }
        });
        return dirty;
    },

    /**
     * @private
     * Convenience function which passes the given function to every item in the composite
     * @param {Function} fn The function to call
     * @param {Object} scope Optional scope object
     */
    eachItem: function(fn, scope) {
        if(this.items && this.items.each){
            this.items.each(fn, scope || this);
        }
    },

    /**
     * @private
     * Passes the resize call through to the inner panel
     */
    onResize: function(adjWidth, adjHeight, rawWidth, rawHeight) {
        var innerCt = this.innerCt;

        if (this.rendered && innerCt.rendered) {
            innerCt.setSize(adjWidth, adjHeight);
        }

        Ext.form.CompositeField.superclass.onResize.apply(this, arguments);
    },

    /**
     * @private
     * Forces the internal container to be laid out again
     */
    doLayout: function(shallow, force) {
        if (this.rendered) {
            var innerCt = this.innerCt;

            innerCt.forceLayout = this.ownerCt.forceLayout;
            innerCt.doLayout(shallow, force);
        }
    },

    /**
     * @private
     */
    beforeDestroy: function(){
        Ext.destroy(this.innerCt);

        Ext.form.CompositeField.superclass.beforeDestroy.call(this);
    },

    //override the behaviour to check sub items.
    setReadOnly : function(readOnly) {
        if (readOnly == undefined) {
            readOnly = true;
        }
        readOnly = !!readOnly;

        if(this.rendered){
            this.eachItem(function(item){
                item.setReadOnly(readOnly);
            });
        }
        this.readOnly = readOnly;
    },

    onShow : function() {
        Ext.form.CompositeField.superclass.onShow.call(this);
        this.doLayout();
    },

    //override the behaviour to check sub items.
    onDisable : function(){
        this.eachItem(function(item){
            item.disable();
        });
    },

    //override the behaviour to check sub items.
    onEnable : function(){
        this.eachItem(function(item){
            item.enable();
        });
    }
});

Ext.reg('compositefield', Ext.form.CompositeField);/**
 * @class Ext.form.Radio
 * @extends Ext.form.Checkbox
 * Single radio field.  Same as Checkbox, but provided as a convenience for automatically setting the input type.
 * Radio grouping is handled automatically by the browser if you give each radio in a group the same name.
 * @constructor
 * Creates a new Radio
 * @param {Object} config Configuration options
 * @xtype radio
 */
Ext.form.Radio = Ext.extend(Ext.form.Checkbox, {
    inputType: 'radio',

    /**
     * Overridden and disabled. The editor element does not support standard valid/invalid marking. @hide
     * @method
     */
    markInvalid : Ext.emptyFn,
    /**
     * Overridden and disabled. The editor element does not support standard valid/invalid marking. @hide
     * @method
     */
    clearInvalid : Ext.emptyFn,

    /**
     * If this radio is part of a group, it will return the selected value
     * @return {String}
     */
    getGroupValue : function(){
    	var p = this.el.up('form') || Ext.getBody();
        var c = p.child('input[name='+this.el.dom.name+']:checked', true);
        return c ? c.value : null;
    },

    /**
     * Sets either the checked/unchecked status of this Radio, or, if a string value
     * is passed, checks a sibling Radio of the same name whose value is the value specified.
     * @param value {String/Boolean} Checked value, or the value of the sibling radio button to check.
     * @return {Ext.form.Field} this
     */
    setValue : function(v){
    	var checkEl,
            els,
            radio;
    	if (typeof v == 'boolean') {
            Ext.form.Radio.superclass.setValue.call(this, v);
        } else if (this.rendered) {
            checkEl = this.getCheckEl();
            radio = checkEl.child('input[name=' + this.el.dom.name + '][value=' + v + ']', true);
            if(radio){
                Ext.getCmp(radio.id).setValue(true);
            }
        }
        if(this.rendered && this.checked){
            checkEl = checkEl || this.getCheckEl();
            els = this.getCheckEl().select('input[name=' + this.el.dom.name + ']');
			els.each(function(el){
				if(el.dom.id != this.id){
					Ext.getCmp(el.dom.id).setValue(false);
				}
			}, this);
        }
        return this;
    },

    // private
    getCheckEl: function(){
        if(this.inGroup){
            return this.el.up('.x-form-radio-group');
        }
        return this.el.up('form') || Ext.getBody();
    }
});
Ext.reg('radio', Ext.form.Radio);
/**
 * @class Ext.form.RadioGroup
 * @extends Ext.form.CheckboxGroup
 * A grouping container for {@link Ext.form.Radio} controls.
 * @constructor
 * Creates a new RadioGroup
 * @param {Object} config Configuration options
 * @xtype radiogroup
 */
Ext.form.RadioGroup = Ext.extend(Ext.form.CheckboxGroup, {
    /**
     * @cfg {Array} items An Array of {@link Ext.form.Radio Radio}s or Radio config objects
     * to arrange in the group.
     */
    /**
     * @cfg {Boolean} allowBlank True to allow every item in the group to be blank (defaults to true).
     * If allowBlank = false and no items are selected at validation time, {@link @blankText} will
     * be used as the error text.
     */
    allowBlank : true,
    /**
     * @cfg {String} blankText Error text to display if the {@link #allowBlank} validation fails
     * (defaults to 'You must select one item in this group')
     */
    blankText : 'You must select one item in this group',
    
    // private
    defaultType : 'radio',
    
    // private
    groupCls : 'x-form-radio-group',
    
    /**
     * @event change
     * Fires when the state of a child radio changes.
     * @param {Ext.form.RadioGroup} this
     * @param {Ext.form.Radio} checked The checked radio
     */
    
    /**
     * Gets the selected {@link Ext.form.Radio} in the group, if it exists.
     * @return {Ext.form.Radio} The selected radio.
     */
    getValue : function(){
        var out = null;
        this.eachItem(function(item){
            if(item.checked){
                out = item;
                return false;
            }
        });
        return out;
    },
    
    /**
     * Sets the checked radio in the group.
     * @param {String/Ext.form.Radio} id The radio to check.
     * @param {Boolean} value The value to set the radio.
     * @return {Ext.form.RadioGroup} this
     */
    onSetValue : function(id, value){
        if(arguments.length > 1){
            var f = this.getBox(id);
            if(f){
                f.setValue(value);
                if(f.checked){
                    this.eachItem(function(item){
                        if (item !== f){
                            item.setValue(false);
                        }
                    });
                }
            }
        }else{
            this.setValueForItem(id);
        }
    },
    
    setValueForItem : function(val){
        val = String(val).split(',')[0];
        this.eachItem(function(item){
            item.setValue(val == item.inputValue);
        });
    },
    
    // private
    fireChecked : function(){
        if(!this.checkTask){
            this.checkTask = new Ext.util.DelayedTask(this.bufferChecked, this);
        }
        this.checkTask.delay(10);
    },
    
    // private
    bufferChecked : function(){
        var out = null;
        this.eachItem(function(item){
            if(item.checked){
                out = item;
                return false;
            }
        });
        this.fireEvent('change', this, out);
    },
    
    onDestroy : function(){
        if(this.checkTask){
            this.checkTask.cancel();
            this.checkTask = null;
        }
        Ext.form.RadioGroup.superclass.onDestroy.call(this);
    }

});

Ext.reg('radiogroup', Ext.form.RadioGroup);
/**
 * @class Ext.form.Hidden
 * @extends Ext.form.Field
 * A basic hidden field for storing hidden values in forms that need to be passed in the form submit.
 * @constructor
 * Create a new Hidden field.
 * @param {Object} config Configuration options
 * @xtype hidden
 */
Ext.form.Hidden = Ext.extend(Ext.form.Field, {
    // private
    inputType : 'hidden',
    
    shouldLayout: false,

    // private
    onRender : function(){
        Ext.form.Hidden.superclass.onRender.apply(this, arguments);
    },

    // private
    initEvents : function(){
        this.originalValue = this.getValue();
    },

    // These are all private overrides
    setSize : Ext.emptyFn,
    setWidth : Ext.emptyFn,
    setHeight : Ext.emptyFn,
    setPosition : Ext.emptyFn,
    setPagePosition : Ext.emptyFn,
    markInvalid : Ext.emptyFn,
    clearInvalid : Ext.emptyFn
});
Ext.reg('hidden', Ext.form.Hidden);/**
 * @class Ext.form.BasicForm
 * @extends Ext.util.Observable
 * <p>Encapsulates the DOM &lt;form> element at the heart of the {@link Ext.form.FormPanel FormPanel} class, and provides
 * input field management, validation, submission, and form loading services.</p>
 * <p>By default, Ext Forms are submitted through Ajax, using an instance of {@link Ext.form.Action.Submit}.
 * To enable normal browser submission of an Ext Form, use the {@link #standardSubmit} config option.</p>
 * <p><b><u>File Uploads</u></b></p>
 * <p>{@link #fileUpload File uploads} are not performed using Ajax submission, that
 * is they are <b>not</b> performed using XMLHttpRequests. Instead the form is submitted in the standard
 * manner with the DOM <tt>&lt;form></tt> element temporarily modified to have its
 * <a href="http://www.w3.org/TR/REC-html40/present/frames.html#adef-target">target</a> set to refer
 * to a dynamically generated, hidden <tt>&lt;iframe></tt> which is inserted into the document
 * but removed after the return data has been gathered.</p>
 * <p>The server response is parsed by the browser to create the document for the IFRAME. If the
 * server is using JSON to send the return object, then the
 * <a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.17">Content-Type</a> header
 * must be set to "text/html" in order to tell the browser to insert the text unchanged into the document body.</p>
 * <p>Characters which are significant to an HTML parser must be sent as HTML entities, so encode
 * "&lt;" as "&amp;lt;", "&amp;" as "&amp;amp;" etc.</p>
 * <p>The response text is retrieved from the document, and a fake XMLHttpRequest object
 * is created containing a <tt>responseText</tt> property in order to conform to the
 * requirements of event handlers and callbacks.</p>
 * <p>Be aware that file upload packets are sent with the content type <a href="http://www.faqs.org/rfcs/rfc2388.html">multipart/form</a>
 * and some server technologies (notably JEE) may require some custom processing in order to
 * retrieve parameter names and parameter values from the packet content.</p>
 * @constructor
 * @param {Mixed} el The form element or its id
 * @param {Object} config Configuration options
 */
Ext.form.BasicForm = Ext.extend(Ext.util.Observable, {

    constructor: function(el, config){
        Ext.apply(this, config);
        if(Ext.isString(this.paramOrder)){
            this.paramOrder = this.paramOrder.split(/[\s,|]/);
        }
        /**
         * A {@link Ext.util.MixedCollection MixedCollection} containing all the Ext.form.Fields in this form.
         * @type MixedCollection
         * @property items
         */
        this.items = new Ext.util.MixedCollection(false, function(o){
            return o.getItemId();
        });
        this.addEvents(
            /**
             * @event beforeaction
             * Fires before any action is performed. Return false to cancel the action.
             * @param {Form} this
             * @param {Action} action The {@link Ext.form.Action} to be performed
             */
            'beforeaction',
            /**
             * @event actionfailed
             * Fires when an action fails.
             * @param {Form} this
             * @param {Action} action The {@link Ext.form.Action} that failed
             */
            'actionfailed',
            /**
             * @event actioncomplete
             * Fires when an action is completed.
             * @param {Form} this
             * @param {Action} action The {@link Ext.form.Action} that completed
             */
            'actioncomplete'
        );

        if(el){
            this.initEl(el);
        }
        Ext.form.BasicForm.superclass.constructor.call(this);
    },

    /**
     * @cfg {String} method
     * The request method to use (GET or POST) for form actions if one isn't supplied in the action options.
     */
    /**
     * @cfg {DataReader} reader
     * An Ext.data.DataReader (e.g. {@link Ext.data.XmlReader}) to be used to read
     * data when executing 'load' actions. This is optional as there is built-in
     * support for processing JSON.  For additional information on using an XMLReader
     * see the example provided in examples/form/xml-form.html.
     */
    /**
     * @cfg {DataReader} errorReader
     * <p>An Ext.data.DataReader (e.g. {@link Ext.data.XmlReader}) to be used to
     * read field error messages returned from 'submit' actions. This is optional
     * as there is built-in support for processing JSON.</p>
     * <p>The Records which provide messages for the invalid Fields must use the
     * Field name (or id) as the Record ID, and must contain a field called 'msg'
     * which contains the error message.</p>
     * <p>The errorReader does not have to be a full-blown implementation of a
     * DataReader. It simply needs to implement a <tt>read(xhr)</tt> function
     * which returns an Array of Records in an object with the following
     * structure:</p><pre><code>
{
    records: recordArray
}
</code></pre>
     */
    /**
     * @cfg {String} url
     * The URL to use for form actions if one isn't supplied in the
     * <code>{@link #doAction doAction} options</code>.
     */
    /**
     * @cfg {Boolean} fileUpload
     * Set to true if this form is a file upload.
     * <p>File uploads are not performed using normal 'Ajax' techniques, that is they are <b>not</b>
     * performed using XMLHttpRequests. Instead the form is submitted in the standard manner with the
     * DOM <tt>&lt;form></tt> element temporarily modified to have its
     * <a href="http://www.w3.org/TR/REC-html40/present/frames.html#adef-target">target</a> set to refer
     * to a dynamically generated, hidden <tt>&lt;iframe></tt> which is inserted into the document
     * but removed after the return data has been gathered.</p>
     * <p>The server response is parsed by the browser to create the document for the IFRAME. If the
     * server is using JSON to send the return object, then the
     * <a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.17">Content-Type</a> header
     * must be set to "text/html" in order to tell the browser to insert the text unchanged into the document body.</p>
     * <p>Characters which are significant to an HTML parser must be sent as HTML entities, so encode
     * "&lt;" as "&amp;lt;", "&amp;" as "&amp;amp;" etc.</p>
     * <p>The response text is retrieved from the document, and a fake XMLHttpRequest object
     * is created containing a <tt>responseText</tt> property in order to conform to the
     * requirements of event handlers and callbacks.</p>
     * <p>Be aware that file upload packets are sent with the content type <a href="http://www.faqs.org/rfcs/rfc2388.html">multipart/form</a>
     * and some server technologies (notably JEE) may require some custom processing in order to
     * retrieve parameter names and parameter values from the packet content.</p>
     */
    /**
     * @cfg {Object} baseParams
     * <p>Parameters to pass with all requests. e.g. baseParams: {id: '123', foo: 'bar'}.</p>
     * <p>Parameters are encoded as standard HTTP parameters using {@link Ext#urlEncode}.</p>
     */
    /**
     * @cfg {Number} timeout Timeout for form actions in seconds (default is 30 seconds).
     */
    timeout: 30,

    /**
     * @cfg {Object} api (Optional) If specified load and submit actions will be handled
     * with {@link Ext.form.Action.DirectLoad} and {@link Ext.form.Action.DirectSubmit}.
     * Methods which have been imported by Ext.Direct can be specified here to load and submit
     * forms.
     * Such as the following:<pre><code>
api: {
    load: App.ss.MyProfile.load,
    submit: App.ss.MyProfile.submit
}
</code></pre>
     * <p>Load actions can use <code>{@link #paramOrder}</code> or <code>{@link #paramsAsHash}</code>
     * to customize how the load method is invoked.
     * Submit actions will always use a standard form submit. The formHandler configuration must
     * be set on the associated server-side method which has been imported by Ext.Direct</p>
     */

    /**
     * @cfg {Array/String} paramOrder <p>A list of params to be executed server side.
     * Defaults to <tt>undefined</tt>. Only used for the <code>{@link #api}</code>
     * <code>load</code> configuration.</p>
     * <br><p>Specify the params in the order in which they must be executed on the
     * server-side as either (1) an Array of String values, or (2) a String of params
     * delimited by either whitespace, comma, or pipe. For example,
     * any of the following would be acceptable:</p><pre><code>
paramOrder: ['param1','param2','param3']
paramOrder: 'param1 param2 param3'
paramOrder: 'param1,param2,param3'
paramOrder: 'param1|param2|param'
     </code></pre>
     */
    paramOrder: undefined,

    /**
     * @cfg {Boolean} paramsAsHash Only used for the <code>{@link #api}</code>
     * <code>load</code> configuration. Send parameters as a collection of named
     * arguments (defaults to <tt>false</tt>). Providing a
     * <tt>{@link #paramOrder}</tt> nullifies this configuration.
     */
    paramsAsHash: false,

    /**
     * @cfg {String} waitTitle
     * The default title to show for the waiting message box (defaults to <tt>'Please Wait...'</tt>)
     */
    waitTitle: 'Please Wait...',

    // private
    activeAction : null,

    /**
     * @cfg {Boolean} trackResetOnLoad If set to <tt>true</tt>, {@link #reset}() resets to the last loaded
     * or {@link #setValues}() data instead of when the form was first created.  Defaults to <tt>false</tt>.
     */
    trackResetOnLoad : false,

    /**
     * @cfg {Boolean} standardSubmit
     * <p>If set to <tt>true</tt>, standard HTML form submits are used instead
     * of XHR (Ajax) style form submissions. Defaults to <tt>false</tt>.</p>
     * <br><p><b>Note:</b> When using <code>standardSubmit</code>, the
     * <code>options</code> to <code>{@link #submit}</code> are ignored because
     * Ext's Ajax infrastracture is bypassed. To pass extra parameters (e.g.
     * <code>baseParams</code> and <code>params</code>), utilize hidden fields
     * to submit extra data, for example:</p>
     * <pre><code>
new Ext.FormPanel({
    standardSubmit: true,
    baseParams: {
        foo: 'bar'
    },
    {@link url}: 'myProcess.php',
    items: [{
        xtype: 'textfield',
        name: 'userName'
    }],
    buttons: [{
        text: 'Save',
        handler: function(){
            var fp = this.ownerCt.ownerCt,
                form = fp.getForm();
            if (form.isValid()) {
                // check if there are baseParams and if
                // hiddent items have been added already
                if (fp.baseParams && !fp.paramsAdded) {
                    // add hidden items for all baseParams
                    for (i in fp.baseParams) {
                        fp.add({
                            xtype: 'hidden',
                            name: i,
                            value: fp.baseParams[i]
                        });
                    }
                    fp.doLayout();
                    // set a custom flag to prevent re-adding
                    fp.paramsAdded = true;
                }
                form.{@link #submit}();
            }
        }
    }]
});
     * </code></pre>
     */
    /**
     * By default wait messages are displayed with Ext.MessageBox.wait. You can target a specific
     * element by passing it or its id or mask the form itself by passing in true.
     * @type Mixed
     * @property waitMsgTarget
     */

    // private
    initEl : function(el){
        this.el = Ext.get(el);
        this.id = this.el.id || Ext.id();
        if(!this.standardSubmit){
            this.el.on('submit', this.onSubmit, this);
        }
        this.el.addClass('x-form');
    },

    /**
     * Get the HTML form Element
     * @return Ext.Element
     */
    getEl: function(){
        return this.el;
    },

    // private
    onSubmit : function(e){
        e.stopEvent();
    },

    /**
     * Destroys this object.
     * @private
     * @param {Boolean} bound true if the object is bound to a form panel. If this is the case
     * the FormPanel will take care of destroying certain things, so we're just doubling up.
     */
    destroy: function(bound){
        if(bound !== true){
            this.items.each(function(f){
                Ext.destroy(f);
            });
            Ext.destroy(this.el);
        }
        this.items.clear();
        this.purgeListeners();
    },

    /**
     * Returns true if client-side validation on the form is successful.
     * @return Boolean
     */
    isValid : function(){
        var valid = true;
        this.items.each(function(f){
           if(!f.validate()){
               valid = false;
           }
        });
        return valid;
    },

    /**
     * <p>Returns true if any fields in this form have changed from their original values.</p>
     * <p>Note that if this BasicForm was configured with {@link #trackResetOnLoad} then the
     * Fields' <i>original values</i> are updated when the values are loaded by {@link #setValues}
     * or {@link #loadRecord}.</p>
     * @return Boolean
     */
    isDirty : function(){
        var dirty = false;
        this.items.each(function(f){
           if(f.isDirty()){
               dirty = true;
               return false;
           }
        });
        return dirty;
    },

    /**
     * Performs a predefined action ({@link Ext.form.Action.Submit} or
     * {@link Ext.form.Action.Load}) or a custom extension of {@link Ext.form.Action}
     * to perform application-specific processing.
     * @param {String/Object} actionName The name of the predefined action type,
     * or instance of {@link Ext.form.Action} to perform.
     * @param {Object} options (optional) The options to pass to the {@link Ext.form.Action}.
     * All of the config options listed below are supported by both the
     * {@link Ext.form.Action.Submit submit} and {@link Ext.form.Action.Load load}
     * actions unless otherwise noted (custom actions could also accept
     * other config options):<ul>
     *
     * <li><b>url</b> : String<div class="sub-desc">The url for the action (defaults
     * to the form's {@link #url}.)</div></li>
     *
     * <li><b>method</b> : String<div class="sub-desc">The form method to use (defaults
     * to the form's method, or POST if not defined)</div></li>
     *
     * <li><b>params</b> : String/Object<div class="sub-desc"><p>The params to pass
     * (defaults to the form's baseParams, or none if not defined)</p>
     * <p>Parameters are encoded as standard HTTP parameters using {@link Ext#urlEncode}.</p></div></li>
     *
     * <li><b>headers</b> : Object<div class="sub-desc">Request headers to set for the action
     * (defaults to the form's default headers)</div></li>
     *
     * <li><b>success</b> : Function<div class="sub-desc">The callback that will
     * be invoked after a successful response (see top of
     * {@link Ext.form.Action.Submit submit} and {@link Ext.form.Action.Load load}
     * for a description of what constitutes a successful response).
     * The function is passed the following parameters:<ul>
     * <li><tt>form</tt> : Ext.form.BasicForm<div class="sub-desc">The form that requested the action</div></li>
     * <li><tt>action</tt> : The {@link Ext.form.Action Action} object which performed the operation.
     * <div class="sub-desc">The action object contains these properties of interest:<ul>
     * <li><tt>{@link Ext.form.Action#response response}</tt></li>
     * <li><tt>{@link Ext.form.Action#result result}</tt> : interrogate for custom postprocessing</li>
     * <li><tt>{@link Ext.form.Action#type type}</tt></li>
     * </ul></div></li></ul></div></li>
     *
     * <li><b>failure</b> : Function<div class="sub-desc">The callback that will be invoked after a
     * failed transaction attempt. The function is passed the following parameters:<ul>
     * <li><tt>form</tt> : The {@link Ext.form.BasicForm} that requested the action.</li>
     * <li><tt>action</tt> : The {@link Ext.form.Action Action} object which performed the operation.
     * <div class="sub-desc">The action object contains these properties of interest:<ul>
     * <li><tt>{@link Ext.form.Action#failureType failureType}</tt></li>
     * <li><tt>{@link Ext.form.Action#response response}</tt></li>
     * <li><tt>{@link Ext.form.Action#result result}</tt> : interrogate for custom postprocessing</li>
     * <li><tt>{@link Ext.form.Action#type type}</tt></li>
     * </ul></div></li></ul></div></li>
     *
     * <li><b>scope</b> : Object<div class="sub-desc">The scope in which to call the
     * callback functions (The <tt>this</tt> reference for the callback functions).</div></li>
     *
     * <li><b>clientValidation</b> : Boolean<div class="sub-desc">Submit Action only.
     * Determines whether a Form's fields are validated in a final call to
     * {@link Ext.form.BasicForm#isValid isValid} prior to submission. Set to <tt>false</tt>
     * to prevent this. If undefined, pre-submission field validation is performed.</div></li></ul>
     *
     * @return {BasicForm} this
     */
    doAction : function(action, options){
        if(Ext.isString(action)){
            action = new Ext.form.Action.ACTION_TYPES[action](this, options);
        }
        if(this.fireEvent('beforeaction', this, action) !== false){
            this.beforeAction(action);
            action.run.defer(100, action);
        }
        return this;
    },

    /**
     * Shortcut to {@link #doAction do} a {@link Ext.form.Action.Submit submit action}.
     * @param {Object} options The options to pass to the action (see {@link #doAction} for details).<br>
     * <p><b>Note:</b> this is ignored when using the {@link #standardSubmit} option.</p>
     * <p>The following code:</p><pre><code>
myFormPanel.getForm().submit({
    clientValidation: true,
    url: 'updateConsignment.php',
    params: {
        newStatus: 'delivered'
    },
    success: function(form, action) {
       Ext.Msg.alert('Success', action.result.msg);
    },
    failure: function(form, action) {
        switch (action.failureType) {
            case Ext.form.Action.CLIENT_INVALID:
                Ext.Msg.alert('Failure', 'Form fields may not be submitted with invalid values');
                break;
            case Ext.form.Action.CONNECT_FAILURE:
                Ext.Msg.alert('Failure', 'Ajax communication failed');
                break;
            case Ext.form.Action.SERVER_INVALID:
               Ext.Msg.alert('Failure', action.result.msg);
       }
    }
});
</code></pre>
     * would process the following server response for a successful submission:<pre><code>
{
    "success":true, // note this is Boolean, not string
    "msg":"Consignment updated"
}
</code></pre>
     * and the following server response for a failed submission:<pre><code>
{
    "success":false, // note this is Boolean, not string
    "msg":"You do not have permission to perform this operation"
}
</code></pre>
     * @return {BasicForm} this
     */
    submit : function(options){
        options = options || {};
        if(this.standardSubmit){
            var v = options.clientValidation === false || this.isValid();
            if(v){
                var el = this.el.dom;
                if(this.url && Ext.isEmpty(el.action)){
                    el.action = this.url;
                }
                el.submit();
            }
            return v;
        }
        var submitAction = String.format('{0}submit', this.api ? 'direct' : '');
        this.doAction(submitAction, options);
        return this;
    },

    /**
     * Shortcut to {@link #doAction do} a {@link Ext.form.Action.Load load action}.
     * @param {Object} options The options to pass to the action (see {@link #doAction} for details)
     * @return {BasicForm} this
     */
    load : function(options){
        var loadAction = String.format('{0}load', this.api ? 'direct' : '');
        this.doAction(loadAction, options);
        return this;
    },

    /**
     * Persists the values in this form into the passed {@link Ext.data.Record} object in a beginEdit/endEdit block.
     * @param {Record} record The record to edit
     * @return {BasicForm} this
     */
    updateRecord : function(record){
        record.beginEdit();
        var fs = record.fields,
            field,
            value;
        fs.each(function(f){
            field = this.findField(f.name);
            if(field){
                value = field.getValue();
                if (typeof value != undefined && value.getGroupValue) {
                    value = value.getGroupValue();
                } else if ( field.eachItem ) {
                    value = [];
                    field.eachItem(function(item){
                        value.push(item.getValue());
                    });
                }
                record.set(f.name, value);
            }
        }, this);
        record.endEdit();
        return this;
    },

    /**
     * Loads an {@link Ext.data.Record} into this form by calling {@link #setValues} with the
     * {@link Ext.data.Record#data record data}.
     * See also {@link #trackResetOnLoad}.
     * @param {Record} record The record to load
     * @return {BasicForm} this
     */
    loadRecord : function(record){
        this.setValues(record.data);
        return this;
    },

    // private
    beforeAction : function(action){
        // Call HtmlEditor's syncValue before actions
        this.items.each(function(f){
            if(f.isFormField && f.syncValue){
                f.syncValue();
            }
        });
        var o = action.options;
        if(o.waitMsg){
            if(this.waitMsgTarget === true){
                this.el.mask(o.waitMsg, 'x-mask-loading');
            }else if(this.waitMsgTarget){
                this.waitMsgTarget = Ext.get(this.waitMsgTarget);
                this.waitMsgTarget.mask(o.waitMsg, 'x-mask-loading');
            }else{
                Ext.MessageBox.wait(o.waitMsg, o.waitTitle || this.waitTitle);
            }
        }
    },

    // private
    afterAction : function(action, success){
        this.activeAction = null;
        var o = action.options;
        if(o.waitMsg){
            if(this.waitMsgTarget === true){
                this.el.unmask();
            }else if(this.waitMsgTarget){
                this.waitMsgTarget.unmask();
            }else{
                Ext.MessageBox.updateProgress(1);
                Ext.MessageBox.hide();
            }
        }
        if(success){
            if(o.reset){
                this.reset();
            }
            Ext.callback(o.success, o.scope, [this, action]);
            this.fireEvent('actioncomplete', this, action);
        }else{
            Ext.callback(o.failure, o.scope, [this, action]);
            this.fireEvent('actionfailed', this, action);
        }
    },

    /**
     * Find a {@link Ext.form.Field} in this form.
     * @param {String} id The value to search for (specify either a {@link Ext.Component#id id},
     * {@link Ext.grid.Column#dataIndex dataIndex}, {@link Ext.form.Field#getName name or hiddenName}).
     * @return Field
     */
    findField : function(id) {
        var field = this.items.get(id);

        if (!Ext.isObject(field)) {
            //searches for the field corresponding to the given id. Used recursively for composite fields
            var findMatchingField = function(f) {
                if (f.isFormField) {
                    if (f.dataIndex == id || f.id == id || f.getName() == id) {
                        field = f;
                        return false;
                    } else if (f.isComposite) {
                        return f.items.each(findMatchingField);
                    } else if (f instanceof Ext.form.CheckboxGroup && f.rendered) {
                        return f.eachItem(findMatchingField);
                    }
                }
            };

            this.items.each(findMatchingField);
        }
        return field || null;
    },


    /**
     * Mark fields in this form invalid in bulk.
     * @param {Array/Object} errors Either an array in the form [{id:'fieldId', msg:'The message'},...] or an object hash of {id: msg, id2: msg2}
     * @return {BasicForm} this
     */
    markInvalid : function(errors){
        if (Ext.isArray(errors)) {
            for(var i = 0, len = errors.length; i < len; i++){
                var fieldError = errors[i];
                var f = this.findField(fieldError.id);
                if(f){
                    f.markInvalid(fieldError.msg);
                }
            }
        } else {
            var field, id;
            for(id in errors){
                if(!Ext.isFunction(errors[id]) && (field = this.findField(id))){
                    field.markInvalid(errors[id]);
                }
            }
        }

        return this;
    },

    /**
     * Set values for fields in this form in bulk.
     * @param {Array/Object} values Either an array in the form:<pre><code>
[{id:'clientName', value:'Fred. Olsen Lines'},
 {id:'portOfLoading', value:'FXT'},
 {id:'portOfDischarge', value:'OSL'} ]</code></pre>
     * or an object hash of the form:<pre><code>
{
    clientName: 'Fred. Olsen Lines',
    portOfLoading: 'FXT',
    portOfDischarge: 'OSL'
}</code></pre>
     * @return {BasicForm} this
     */
    setValues : function(values){
        if(Ext.isArray(values)){ // array of objects
            for(var i = 0, len = values.length; i < len; i++){
                var v = values[i];
                var f = this.findField(v.id);
                if(f){
                    f.setValue(v.value);
                    if(this.trackResetOnLoad){
                        f.originalValue = f.getValue();
                    }
                }
            }
        }else{ // object hash
            var field, id;
            for(id in values){
                if(!Ext.isFunction(values[id]) && (field = this.findField(id))){
                    field.setValue(values[id]);
                    if(this.trackResetOnLoad){
                        field.originalValue = field.getValue();
                    }
                }
            }
        }
        return this;
    },

    /**
     * <p>Returns the fields in this form as an object with key/value pairs as they would be submitted using a standard form submit.
     * If multiple fields exist with the same name they are returned as an array.</p>
     * <p><b>Note:</b> The values are collected from all enabled HTML input elements within the form, <u>not</u> from
     * the Ext Field objects. This means that all returned values are Strings (or Arrays of Strings) and that the
     * value can potentially be the emptyText of a field.</p>
     * @param {Boolean} asString (optional) Pass true to return the values as a string. (defaults to false, returning an Object)
     * @return {String/Object}
     */
    getValues : function(asString){
        var fs = Ext.lib.Ajax.serializeForm(this.el.dom);
        if(asString === true){
            return fs;
        }
        return Ext.urlDecode(fs);
    },

    /**
     * Retrieves the fields in the form as a set of key/value pairs, using the {@link Ext.form.Field#getValue getValue()} method.
     * If multiple fields exist with the same name they are returned as an array.
     * @param {Boolean} dirtyOnly (optional) True to return only fields that are dirty.
     * @return {Object} The values in the form
     */
    getFieldValues : function(dirtyOnly){
        var o = {},
            n,
            key,
            val;
        this.items.each(function(f) {
            if (!f.disabled && (dirtyOnly !== true || f.isDirty())) {
                n = f.getName();
                key = o[n];
                val = f.getValue();

                if(Ext.isDefined(key)){
                    if(Ext.isArray(key)){
                        o[n].push(val);
                    }else{
                        o[n] = [key, val];
                    }
                }else{
                    o[n] = val;
                }
            }
        });
        return o;
    },

    /**
     * Clears all invalid messages in this form.
     * @return {BasicForm} this
     */
    clearInvalid : function(){
        this.items.each(function(f){
           f.clearInvalid();
        });
        return this;
    },

    /**
     * Resets this form.
     * @return {BasicForm} this
     */
    reset : function(){
        this.items.each(function(f){
            f.reset();
        });
        return this;
    },

    /**
     * Add Ext.form Components to this form's Collection. This does not result in rendering of
     * the passed Component, it just enables the form to validate Fields, and distribute values to
     * Fields.
     * <p><b>You will not usually call this function. In order to be rendered, a Field must be added
     * to a {@link Ext.Container Container}, usually an {@link Ext.form.FormPanel FormPanel}.
     * The FormPanel to which the field is added takes care of adding the Field to the BasicForm's
     * collection.</b></p>
     * @param {Field} field1
     * @param {Field} field2 (optional)
     * @param {Field} etc (optional)
     * @return {BasicForm} this
     */
    add : function(){
        this.items.addAll(Array.prototype.slice.call(arguments, 0));
        return this;
    },

    /**
     * Removes a field from the items collection (does NOT remove its markup).
     * @param {Field} field
     * @return {BasicForm} this
     */
    remove : function(field){
        this.items.remove(field);
        return this;
    },

    /**
     * Removes all fields from the collection that have been destroyed.
     */
    cleanDestroyed : function() {
        this.items.filterBy(function(o) { return !!o.isDestroyed; }).each(this.remove, this);
    },

    /**
     * Iterates through the {@link Ext.form.Field Field}s which have been {@link #add add}ed to this BasicForm,
     * checks them for an id attribute, and calls {@link Ext.form.Field#applyToMarkup} on the existing dom element with that id.
     * @return {BasicForm} this
     */
    render : function(){
        this.items.each(function(f){
            if(f.isFormField && !f.rendered && document.getElementById(f.id)){ // if the element exists
                f.applyToMarkup(f.id);
            }
        });
        return this;
    },

    /**
     * Calls {@link Ext#apply} for all fields in this form with the passed object.
     * @param {Object} values
     * @return {BasicForm} this
     */
    applyToFields : function(o){
        this.items.each(function(f){
           Ext.apply(f, o);
        });
        return this;
    },

    /**
     * Calls {@link Ext#applyIf} for all field in this form with the passed object.
     * @param {Object} values
     * @return {BasicForm} this
     */
    applyIfToFields : function(o){
        this.items.each(function(f){
           Ext.applyIf(f, o);
        });
        return this;
    },

    callFieldMethod : function(fnName, args){
        args = args || [];
        this.items.each(function(f){
            if(Ext.isFunction(f[fnName])){
                f[fnName].apply(f, args);
            }
        });
        return this;
    }
});

// back compat
Ext.BasicForm = Ext.form.BasicForm;
/**
 * @class Ext.form.FormPanel
 * @extends Ext.Panel
 * <p>Standard form container.</p>
 *
 * <p><b><u>Layout</u></b></p>
 * <p>By default, FormPanel is configured with <tt>layout:'form'</tt> to use an {@link Ext.layout.FormLayout}
 * layout manager, which styles and renders fields and labels correctly. When nesting additional Containers
 * within a FormPanel, you should ensure that any descendant Containers which host input Fields use the
 * {@link Ext.layout.FormLayout} layout manager.</p>
 *
 * <p><b><u>BasicForm</u></b></p>
 * <p>Although <b>not listed</b> as configuration options of FormPanel, the FormPanel class accepts all
 * of the config options required to configure its internal {@link Ext.form.BasicForm} for:
 * <div class="mdetail-params"><ul>
 * <li>{@link Ext.form.BasicForm#fileUpload file uploads}</li>
 * <li>functionality for {@link Ext.form.BasicForm#doAction loading, validating and submitting} the form</li>
 * </ul></div>
 *
 * <p><b>Note</b>: If subclassing FormPanel, any configuration options for the BasicForm must be applied to
 * the <tt><b>initialConfig</b></tt> property of the FormPanel. Applying {@link Ext.form.BasicForm BasicForm}
 * configuration settings to <b><tt>this</tt></b> will <b>not</b> affect the BasicForm's configuration.</p>
 *
 * <p><b><u>Form Validation</u></b></p>
 * <p>For information on form validation see the following:</p>
 * <div class="mdetail-params"><ul>
 * <li>{@link Ext.form.TextField}</li>
 * <li>{@link Ext.form.VTypes}</li>
 * <li>{@link Ext.form.BasicForm#doAction BasicForm.doAction <b>clientValidation</b> notes}</li>
 * <li><tt>{@link Ext.form.FormPanel#monitorValid monitorValid}</tt></li>
 * </ul></div>
 *
 * <p><b><u>Form Submission</u></b></p>
 * <p>By default, Ext Forms are submitted through Ajax, using {@link Ext.form.Action}. To enable normal browser
 * submission of the {@link Ext.form.BasicForm BasicForm} contained in this FormPanel, see the
 * <tt><b>{@link Ext.form.BasicForm#standardSubmit standardSubmit}</b></tt> option.</p>
 *
 * @constructor
 * @param {Object} config Configuration options
 * @xtype form
 */
Ext.FormPanel = Ext.extend(Ext.Panel, {
    /**
     * @cfg {String} formId (optional) The id of the FORM tag (defaults to an auto-generated id).
     */
    /**
     * @cfg {Boolean} hideLabels
     * <p><tt>true</tt> to hide field labels by default (sets <tt>display:none</tt>). Defaults to
     * <tt>false</tt>.</p>
     * <p>Also see {@link Ext.Component}.<tt>{@link Ext.Component#hideLabel hideLabel}</tt>.
     */
    /**
     * @cfg {Number} labelPad
     * The default padding in pixels for field labels (defaults to <tt>5</tt>). <tt>labelPad</tt> only
     * applies if <tt>{@link #labelWidth}</tt> is also specified, otherwise it will be ignored.
     */
    /**
     * @cfg {String} labelSeparator
     * See {@link Ext.Component}.<tt>{@link Ext.Component#labelSeparator labelSeparator}</tt>
     */
    /**
     * @cfg {Number} labelWidth The width of labels in pixels. This property cascades to child containers
     * and can be overridden on any child container (e.g., a fieldset can specify a different <tt>labelWidth</tt>
     * for its fields) (defaults to <tt>100</tt>).
     */
    /**
     * @cfg {String} itemCls A css class to apply to the x-form-item of fields. This property cascades to child containers.
     */
    /**
     * @cfg {Array} buttons
     * An array of {@link Ext.Button}s or {@link Ext.Button} configs used to add buttons to the footer of this FormPanel.<br>
     * <p>Buttons in the footer of a FormPanel may be configured with the option <tt>formBind: true</tt>. This causes
     * the form's {@link #monitorValid valid state monitor task} to enable/disable those Buttons depending on
     * the form's valid/invalid state.</p>
     */


    /**
     * @cfg {Number} minButtonWidth Minimum width of all buttons in pixels (defaults to <tt>75</tt>).
     */
    minButtonWidth : 75,

    /**
     * @cfg {String} labelAlign The label alignment value used for the <tt>text-align</tt> specification
     * for the <b>container</b>. Valid values are <tt>"left</tt>", <tt>"top"</tt> or <tt>"right"</tt>
     * (defaults to <tt>"left"</tt>). This property cascades to child <b>containers</b> and can be
     * overridden on any child <b>container</b> (e.g., a fieldset can specify a different <tt>labelAlign</tt>
     * for its fields).
     */
    labelAlign : 'left',

    /**
     * @cfg {Boolean} monitorValid If <tt>true</tt>, the form monitors its valid state <b>client-side</b> and
     * regularly fires the {@link #clientvalidation} event passing that state.<br>
     * <p>When monitoring valid state, the FormPanel enables/disables any of its configured
     * {@link #buttons} which have been configured with <code>formBind: true</code> depending
     * on whether the {@link Ext.form.BasicForm#isValid form is valid} or not. Defaults to <tt>false</tt></p>
     */
    monitorValid : false,

    /**
     * @cfg {Number} monitorPoll The milliseconds to poll valid state, ignored if monitorValid is not true (defaults to 200)
     */
    monitorPoll : 200,

    /**
     * @cfg {String} layout Defaults to <tt>'form'</tt>.  Normally this configuration property should not be altered.
     * For additional details see {@link Ext.layout.FormLayout} and {@link Ext.Container#layout Ext.Container.layout}.
     */
    layout : 'form',

    // private
    initComponent : function(){
        this.form = this.createForm();
        Ext.FormPanel.superclass.initComponent.call(this);

        this.bodyCfg = {
            tag: 'form',
            cls: this.baseCls + '-body',
            method : this.method || 'POST',
            id : this.formId || Ext.id()
        };
        if(this.fileUpload) {
            this.bodyCfg.enctype = 'multipart/form-data';
        }
        this.initItems();

        this.addEvents(
            /**
             * @event clientvalidation
             * If the monitorValid config option is true, this event fires repetitively to notify of valid state
             * @param {Ext.form.FormPanel} this
             * @param {Boolean} valid true if the form has passed client-side validation
             */
            'clientvalidation'
        );

        this.relayEvents(this.form, ['beforeaction', 'actionfailed', 'actioncomplete']);
    },

    // private
    createForm : function(){
        var config = Ext.applyIf({listeners: {}}, this.initialConfig);
        return new Ext.form.BasicForm(null, config);
    },

    // private
    initFields : function(){
        var f = this.form;
        var formPanel = this;
        var fn = function(c){
            if(formPanel.isField(c)){
                f.add(c);
            }else if(c.findBy && c != formPanel){
                formPanel.applySettings(c);
                //each check required for check/radio groups.
                if(c.items && c.items.each){
                    c.items.each(fn, this);
                }
            }
        };
        this.items.each(fn, this);
    },

    // private
    applySettings: function(c){
        var ct = c.ownerCt;
        Ext.applyIf(c, {
            labelAlign: ct.labelAlign,
            labelWidth: ct.labelWidth,
            itemCls: ct.itemCls
        });
    },

    // private
    getLayoutTarget : function(){
        return this.form.el;
    },

    /**
     * Provides access to the {@link Ext.form.BasicForm Form} which this Panel contains.
     * @return {Ext.form.BasicForm} The {@link Ext.form.BasicForm Form} which this Panel contains.
     */
    getForm : function(){
        return this.form;
    },

    // private
    onRender : function(ct, position){
        this.initFields();
        Ext.FormPanel.superclass.onRender.call(this, ct, position);
        this.form.initEl(this.body);
    },

    // private
    beforeDestroy : function(){
        this.stopMonitoring();
        this.form.destroy(true);
        Ext.FormPanel.superclass.beforeDestroy.call(this);
    },

    // Determine if a Component is usable as a form Field.
    isField : function(c) {
        return !!c.setValue && !!c.getValue && !!c.markInvalid && !!c.clearInvalid;
    },

    // private
    initEvents : function(){
        Ext.FormPanel.superclass.initEvents.call(this);
        // Listeners are required here to catch bubbling events from children.
        this.on({
            scope: this,
            add: this.onAddEvent,
            remove: this.onRemoveEvent
        });
        if(this.monitorValid){ // initialize after render
            this.startMonitoring();
        }
    },

    // private
    onAdd: function(c){
        Ext.FormPanel.superclass.onAdd.call(this, c);
        this.processAdd(c);
    },

    // private
    onAddEvent: function(ct, c){
        if(ct !== this){
            this.processAdd(c);
        }
    },

    // private
    processAdd : function(c){
        // If a single form Field, add it
        if(this.isField(c)){
            this.form.add(c);
        // If a Container, add any Fields it might contain
        }else if(c.findBy){
            this.applySettings(c);
            this.form.add.apply(this.form, c.findBy(this.isField));
        }
    },

    // private
    onRemove: function(c){
        Ext.FormPanel.superclass.onRemove.call(this, c);
        this.processRemove(c);
    },

    onRemoveEvent: function(ct, c){
        if(ct !== this){
            this.processRemove(c);
        }
    },

    // private
    processRemove: function(c){
        if(!this.destroying){
            // If a single form Field, remove it
            if(this.isField(c)){
                this.form.remove(c);
            // If a Container, its already destroyed by the time it gets here.  Remove any references to destroyed fields.
            }else if (c.findBy){
                Ext.each(c.findBy(this.isField), this.form.remove, this.form);
                /*
                 * This isn't the most efficient way of getting rid of the items, however it's the most
                 * correct, which in this case is most important.
                 */
                this.form.cleanDestroyed();
            }
        }
    },

    /**
     * Starts monitoring of the valid state of this form. Usually this is done by passing the config
     * option "monitorValid"
     */
    startMonitoring : function(){
        if(!this.validTask){
            this.validTask = new Ext.util.TaskRunner();
            this.validTask.start({
                run : this.bindHandler,
                interval : this.monitorPoll || 200,
                scope: this
            });
        }
    },

    /**
     * Stops monitoring of the valid state of this form
     */
    stopMonitoring : function(){
        if(this.validTask){
            this.validTask.stopAll();
            this.validTask = null;
        }
    },

    /**
     * This is a proxy for the underlying BasicForm's {@link Ext.form.BasicForm#load} call.
     * @param {Object} options The options to pass to the action (see {@link Ext.form.BasicForm#doAction} for details)
     */
    load : function(){
        this.form.load.apply(this.form, arguments);
    },

    // private
    onDisable : function(){
        Ext.FormPanel.superclass.onDisable.call(this);
        if(this.form){
            this.form.items.each(function(){
                 this.disable();
            });
        }
    },

    // private
    onEnable : function(){
        Ext.FormPanel.superclass.onEnable.call(this);
        if(this.form){
            this.form.items.each(function(){
                 this.enable();
            });
        }
    },

    // private
    bindHandler : function(){
        var valid = true;
        this.form.items.each(function(f){
            if(!f.isValid(true)){
                valid = false;
                return false;
            }
        });
        if(this.fbar){
            var fitems = this.fbar.items.items;
            for(var i = 0, len = fitems.length; i < len; i++){
                var btn = fitems[i];
                if(btn.formBind === true && btn.disabled === valid){
                    btn.setDisabled(!valid);
                }
            }
        }
        this.fireEvent('clientvalidation', this, valid);
    }
});
Ext.reg('form', Ext.FormPanel);

Ext.form.FormPanel = Ext.FormPanel;
/**
 * @class Ext.form.FieldSet
 * @extends Ext.Panel
 * Standard container used for grouping items within a {@link Ext.form.FormPanel form}.
 * <pre><code>
var form = new Ext.FormPanel({
    title: 'Simple Form with FieldSets',
    labelWidth: 75, // label settings here cascade unless overridden
    url: 'save-form.php',
    frame:true,
    bodyStyle:'padding:5px 5px 0',
    width: 700,
    renderTo: document.body,
    layout:'column', // arrange items in columns
    defaults: {      // defaults applied to items
        layout: 'form',
        border: false,
        bodyStyle: 'padding:4px'
    },
    items: [{
        // Fieldset in Column 1
        xtype:'fieldset',
        columnWidth: 0.5,
        title: 'Fieldset 1',
        collapsible: true,
        autoHeight:true,
        defaults: {
            anchor: '-20' // leave room for error icon
        },
        defaultType: 'textfield',
        items :[{
                fieldLabel: 'Field 1'
            }, {
                fieldLabel: 'Field 2'
            }, {
                fieldLabel: 'Field 3'
            }
        ]
    },{
        // Fieldset in Column 2 - Panel inside
        xtype:'fieldset',
        title: 'Show Panel', // title, header, or checkboxToggle creates fieldset header
        autoHeight:true,
        columnWidth: 0.5,
        checkboxToggle: true,
        collapsed: true, // fieldset initially collapsed
        layout:'anchor',
        items :[{
            xtype: 'panel',
            anchor: '100%',
            title: 'Panel inside a fieldset',
            frame: true,
            height: 100
        }]
    }]
});
 * </code></pre>
 * @constructor
 * @param {Object} config Configuration options
 * @xtype fieldset
 */
Ext.form.FieldSet = Ext.extend(Ext.Panel, {
    /**
     * @cfg {Mixed} checkboxToggle <tt>true</tt> to render a checkbox into the fieldset frame just
     * in front of the legend to expand/collapse the fieldset when the checkbox is toggled. (defaults
     * to <tt>false</tt>).
     * <p>A {@link Ext.DomHelper DomHelper} element spec may also be specified to create the checkbox.
     * If <tt>true</tt> is specified, the default DomHelper config object used to create the element
     * is:</p><pre><code>
     * {tag: 'input', type: 'checkbox', name: this.checkboxName || this.id+'-checkbox'}
     * </code></pre>
     */
    /**
     * @cfg {String} checkboxName The name to assign to the fieldset's checkbox if <tt>{@link #checkboxToggle} = true</tt>
     * (defaults to <tt>'[checkbox id]-checkbox'</tt>).
     */
    /**
     * @cfg {Boolean} collapsible
     * <tt>true</tt> to make the fieldset collapsible and have the expand/collapse toggle button automatically
     * rendered into the legend element, <tt>false</tt> to keep the fieldset statically sized with no collapse
     * button (defaults to <tt>false</tt>). Another option is to configure <tt>{@link #checkboxToggle}</tt>.
     */
    /**
     * @cfg {Number} labelWidth The width of labels. This property cascades to child containers.
     */
    /**
     * @cfg {String} itemCls A css class to apply to the <tt>x-form-item</tt> of fields (see
     * {@link Ext.layout.FormLayout}.{@link Ext.layout.FormLayout#fieldTpl fieldTpl} for details).
     * This property cascades to child containers.
     */
    /**
     * @cfg {String} baseCls The base CSS class applied to the fieldset (defaults to <tt>'x-fieldset'</tt>).
     */
    baseCls : 'x-fieldset',
    /**
     * @cfg {String} layout The {@link Ext.Container#layout} to use inside the fieldset (defaults to <tt>'form'</tt>).
     */
    layout : 'form',
    /**
     * @cfg {Boolean} animCollapse
     * <tt>true</tt> to animate the transition when the panel is collapsed, <tt>false</tt> to skip the
     * animation (defaults to <tt>false</tt>).
     */
    animCollapse : false,

    // private
    onRender : function(ct, position){
        if(!this.el){
            this.el = document.createElement('fieldset');
            this.el.id = this.id;
            if (this.title || this.header || this.checkboxToggle) {
                this.el.appendChild(document.createElement('legend')).className = this.baseCls + '-header';
            }
        }

        Ext.form.FieldSet.superclass.onRender.call(this, ct, position);

        if(this.checkboxToggle){
            var o = typeof this.checkboxToggle == 'object' ?
                    this.checkboxToggle :
                    {tag: 'input', type: 'checkbox', name: this.checkboxName || this.id+'-checkbox'};
            this.checkbox = this.header.insertFirst(o);
            this.checkbox.dom.checked = !this.collapsed;
            this.mon(this.checkbox, 'click', this.onCheckClick, this);
        }
    },

    // private
    onCollapse : function(doAnim, animArg){
        if(this.checkbox){
            this.checkbox.dom.checked = false;
        }
        Ext.form.FieldSet.superclass.onCollapse.call(this, doAnim, animArg);

    },

    // private
    onExpand : function(doAnim, animArg){
        if(this.checkbox){
            this.checkbox.dom.checked = true;
        }
        Ext.form.FieldSet.superclass.onExpand.call(this, doAnim, animArg);
    },

    /**
     * This function is called by the fieldset's checkbox when it is toggled (only applies when
     * checkboxToggle = true).  This method should never be called externally, but can be
     * overridden to provide custom behavior when the checkbox is toggled if needed.
     */
    onCheckClick : function(){
        this[this.checkbox.dom.checked ? 'expand' : 'collapse']();
    }

    /**
     * @cfg {String/Number} activeItem
     * @hide
     */
    /**
     * @cfg {Mixed} applyTo
     * @hide
     */
    /**
     * @cfg {Boolean} bodyBorder
     * @hide
     */
    /**
     * @cfg {Boolean} border
     * @hide
     */
    /**
     * @cfg {Boolean/Number} bufferResize
     * @hide
     */
    /**
     * @cfg {Boolean} collapseFirst
     * @hide
     */
    /**
     * @cfg {String} defaultType
     * @hide
     */
    /**
     * @cfg {String} disabledClass
     * @hide
     */
    /**
     * @cfg {String} elements
     * @hide
     */
    /**
     * @cfg {Boolean} floating
     * @hide
     */
    /**
     * @cfg {Boolean} footer
     * @hide
     */
    /**
     * @cfg {Boolean} frame
     * @hide
     */
    /**
     * @cfg {Boolean} header
     * @hide
     */
    /**
     * @cfg {Boolean} headerAsText
     * @hide
     */
    /**
     * @cfg {Boolean} hideCollapseTool
     * @hide
     */
    /**
     * @cfg {String} iconCls
     * @hide
     */
    /**
     * @cfg {Boolean/String} shadow
     * @hide
     */
    /**
     * @cfg {Number} shadowOffset
     * @hide
     */
    /**
     * @cfg {Boolean} shim
     * @hide
     */
    /**
     * @cfg {Object/Array} tbar
     * @hide
     */
    /**
     * @cfg {Array} tools
     * @hide
     */
    /**
     * @cfg {Ext.Template/Ext.XTemplate} toolTemplate
     * @hide
     */
    /**
     * @cfg {String} xtype
     * @hide
     */
    /**
     * @property header
     * @hide
     */
    /**
     * @property footer
     * @hide
     */
    /**
     * @method focus
     * @hide
     */
    /**
     * @method getBottomToolbar
     * @hide
     */
    /**
     * @method getTopToolbar
     * @hide
     */
    /**
     * @method setIconClass
     * @hide
     */
    /**
     * @event activate
     * @hide
     */
    /**
     * @event beforeclose
     * @hide
     */
    /**
     * @event bodyresize
     * @hide
     */
    /**
     * @event close
     * @hide
     */
    /**
     * @event deactivate
     * @hide
     */
});
Ext.reg('fieldset', Ext.form.FieldSet);/**
 * @class Ext.form.HtmlEditor
 * @extends Ext.form.Field
 * Provides a lightweight HTML Editor component. Some toolbar features are not supported by Safari and will be
 * automatically hidden when needed.  These are noted in the config options where appropriate.
 * <br><br>The editor's toolbar buttons have tooltips defined in the {@link #buttonTips} property, but they are not
 * enabled by default unless the global {@link Ext.QuickTips} singleton is {@link Ext.QuickTips#init initialized}.
 * <br><br><b>Note: The focus/blur and validation marking functionality inherited from Ext.form.Field is NOT
 * supported by this editor.</b>
 * <br><br>An Editor is a sensitive component that can't be used in all spots standard fields can be used. Putting an Editor within
 * any element that has display set to 'none' can cause problems in Safari and Firefox due to their default iframe reloading bugs.
 * <br><br>Example usage:
 * <pre><code>
// Simple example rendered with default options:
Ext.QuickTips.init();  // enable tooltips
new Ext.form.HtmlEditor({
    renderTo: Ext.getBody(),
    width: 800,
    height: 300
});

// Passed via xtype into a container and with custom options:
Ext.QuickTips.init();  // enable tooltips
new Ext.Panel({
    title: 'HTML Editor',
    renderTo: Ext.getBody(),
    width: 600,
    height: 300,
    frame: true,
    layout: 'fit',
    items: {
        xtype: 'htmleditor',
        enableColors: false,
        enableAlignments: false
    }
});
</code></pre>
 * @constructor
 * Create a new HtmlEditor
 * @param {Object} config
 * @xtype htmleditor
 */

Ext.form.HtmlEditor = Ext.extend(Ext.form.Field, {
    /**
     * @cfg {Boolean} enableFormat Enable the bold, italic and underline buttons (defaults to true)
     */
    enableFormat : true,
    /**
     * @cfg {Boolean} enableFontSize Enable the increase/decrease font size buttons (defaults to true)
     */
    enableFontSize : true,
    /**
     * @cfg {Boolean} enableColors Enable the fore/highlight color buttons (defaults to true)
     */
    enableColors : true,
    /**
     * @cfg {Boolean} enableAlignments Enable the left, center, right alignment buttons (defaults to true)
     */
    enableAlignments : true,
    /**
     * @cfg {Boolean} enableLists Enable the bullet and numbered list buttons. Not available in Safari. (defaults to true)
     */
    enableLists : true,
    /**
     * @cfg {Boolean} enableSourceEdit Enable the switch to source edit button. Not available in Safari. (defaults to true)
     */
    enableSourceEdit : true,
    /**
     * @cfg {Boolean} enableLinks Enable the create link button. Not available in Safari. (defaults to true)
     */
    enableLinks : true,
    /**
     * @cfg {Boolean} enableFont Enable font selection. Not available in Safari. (defaults to true)
     */
    enableFont : true,
    /**
     * @cfg {String} createLinkText The default text for the create link prompt
     */
    createLinkText : 'Please enter the URL for the link:',
    /**
     * @cfg {String} defaultLinkValue The default value for the create link prompt (defaults to http:/ /)
     */
    defaultLinkValue : 'http:/'+'/',
    /**
     * @cfg {Array} fontFamilies An array of available font families
     */
    fontFamilies : [
        'Arial',
        'Courier New',
        'Tahoma',
        'Times New Roman',
        'Verdana'
    ],
    defaultFont: 'tahoma',
    /**
     * @cfg {String} defaultValue A default value to be put into the editor to resolve focus issues (defaults to &#160; (Non-breaking space) in Opera and IE6, &#8203; (Zero-width space) in all other browsers).
     */
    defaultValue: (Ext.isOpera || Ext.isIE6) ? '&#160;' : '&#8203;',

    // private properties
    actionMode: 'wrap',
    validationEvent : false,
    deferHeight: true,
    initialized : false,
    activated : false,
    sourceEditMode : false,
    onFocus : Ext.emptyFn,
    iframePad:3,
    hideMode:'offsets',
    defaultAutoCreate : {
        tag: "textarea",
        style:"width:500px;height:300px;",
        autocomplete: "off"
    },

    // private
    initComponent : function(){
        this.addEvents(
            /**
             * @event initialize
             * Fires when the editor is fully initialized (including the iframe)
             * @param {HtmlEditor} this
             */
            'initialize',
            /**
             * @event activate
             * Fires when the editor is first receives the focus. Any insertion must wait
             * until after this event.
             * @param {HtmlEditor} this
             */
            'activate',
             /**
             * @event beforesync
             * Fires before the textarea is updated with content from the editor iframe. Return false
             * to cancel the sync.
             * @param {HtmlEditor} this
             * @param {String} html
             */
            'beforesync',
             /**
             * @event beforepush
             * Fires before the iframe editor is updated with content from the textarea. Return false
             * to cancel the push.
             * @param {HtmlEditor} this
             * @param {String} html
             */
            'beforepush',
             /**
             * @event sync
             * Fires when the textarea is updated with content from the editor iframe.
             * @param {HtmlEditor} this
             * @param {String} html
             */
            'sync',
             /**
             * @event push
             * Fires when the iframe editor is updated with content from the textarea.
             * @param {HtmlEditor} this
             * @param {String} html
             */
            'push',
             /**
             * @event editmodechange
             * Fires when the editor switches edit modes
             * @param {HtmlEditor} this
             * @param {Boolean} sourceEdit True if source edit, false if standard editing.
             */
            'editmodechange'
        );
        Ext.form.HtmlEditor.superclass.initComponent.call(this);
    },

    // private
    createFontOptions : function(){
        var buf = [], fs = this.fontFamilies, ff, lc;
        for(var i = 0, len = fs.length; i< len; i++){
            ff = fs[i];
            lc = ff.toLowerCase();
            buf.push(
                '<option value="',lc,'" style="font-family:',ff,';"',
                    (this.defaultFont == lc ? ' selected="true">' : '>'),
                    ff,
                '</option>'
            );
        }
        return buf.join('');
    },

    /*
     * Protected method that will not generally be called directly. It
     * is called when the editor creates its toolbar. Override this method if you need to
     * add custom toolbar buttons.
     * @param {HtmlEditor} editor
     */
    createToolbar : function(editor){
        var items = [];
        var tipsEnabled = Ext.QuickTips && Ext.QuickTips.isEnabled();


        function btn(id, toggle, handler){
            return {
                itemId : id,
                cls : 'x-btn-icon',
                iconCls: 'x-edit-'+id,
                enableToggle:toggle !== false,
                scope: editor,
                handler:handler||editor.relayBtnCmd,
                clickEvent:'mousedown',
                tooltip: tipsEnabled ? editor.buttonTips[id] || undefined : undefined,
                overflowText: editor.buttonTips[id].title || undefined,
                tabIndex:-1
            };
        }


        if(this.enableFont && !Ext.isSafari2){
            var fontSelectItem = new Ext.Toolbar.Item({
               autoEl: {
                    tag:'select',
                    cls:'x-font-select',
                    html: this.createFontOptions()
               }
            });

            items.push(
                fontSelectItem,
                '-'
            );
        }

        if(this.enableFormat){
            items.push(
                btn('bold'),
                btn('italic'),
                btn('underline')
            );
        }

        if(this.enableFontSize){
            items.push(
                '-',
                btn('increasefontsize', false, this.adjustFont),
                btn('decreasefontsize', false, this.adjustFont)
            );
        }

        if(this.enableColors){
            items.push(
                '-', {
                    itemId:'forecolor',
                    cls:'x-btn-icon',
                    iconCls: 'x-edit-forecolor',
                    clickEvent:'mousedown',
                    tooltip: tipsEnabled ? editor.buttonTips.forecolor || undefined : undefined,
                    tabIndex:-1,
                    menu : new Ext.menu.ColorMenu({
                        allowReselect: true,
                        focus: Ext.emptyFn,
                        value:'000000',
                        plain:true,
                        listeners: {
                            scope: this,
                            select: function(cp, color){
                                this.execCmd('forecolor', Ext.isWebKit || Ext.isIE ? '#'+color : color);
                                this.deferFocus();
                            }
                        },
                        clickEvent:'mousedown'
                    })
                }, {
                    itemId:'backcolor',
                    cls:'x-btn-icon',
                    iconCls: 'x-edit-backcolor',
                    clickEvent:'mousedown',
                    tooltip: tipsEnabled ? editor.buttonTips.backcolor || undefined : undefined,
                    tabIndex:-1,
                    menu : new Ext.menu.ColorMenu({
                        focus: Ext.emptyFn,
                        value:'FFFFFF',
                        plain:true,
                        allowReselect: true,
                        listeners: {
                            scope: this,
                            select: function(cp, color){
                                if(Ext.isGecko){
                                    this.execCmd('useCSS', false);
                                    this.execCmd('hilitecolor', color);
                                    this.execCmd('useCSS', true);
                                    this.deferFocus();
                                }else{
                                    this.execCmd(Ext.isOpera ? 'hilitecolor' : 'backcolor', Ext.isWebKit || Ext.isIE ? '#'+color : color);
                                    this.deferFocus();
                                }
                            }
                        },
                        clickEvent:'mousedown'
                    })
                }
            );
        }

        if(this.enableAlignments){
            items.push(
                '-',
                btn('justifyleft'),
                btn('justifycenter'),
                btn('justifyright')
            );
        }

        if(!Ext.isSafari2){
            if(this.enableLinks){
                items.push(
                    '-',
                    btn('createlink', false, this.createLink)
                );
            }

            if(this.enableLists){
                items.push(
                    '-',
                    btn('insertorderedlist'),
                    btn('insertunorderedlist')
                );
            }
            if(this.enableSourceEdit){
                items.push(
                    '-',
                    btn('sourceedit', true, function(btn){
                        this.toggleSourceEdit(!this.sourceEditMode);
                    })
                );
            }
        }

        // build the toolbar
        var tb = new Ext.Toolbar({
            renderTo: this.wrap.dom.firstChild,
            items: items
        });

        if (fontSelectItem) {
            this.fontSelect = fontSelectItem.el;

            this.mon(this.fontSelect, 'change', function(){
                var font = this.fontSelect.dom.value;
                this.relayCmd('fontname', font);
                this.deferFocus();
            }, this);
        }

        // stop form submits
        this.mon(tb.el, 'click', function(e){
            e.preventDefault();
        });

        this.tb = tb;
        this.tb.doLayout();
    },

    onDisable: function(){
        this.wrap.mask();
        Ext.form.HtmlEditor.superclass.onDisable.call(this);
    },

    onEnable: function(){
        this.wrap.unmask();
        Ext.form.HtmlEditor.superclass.onEnable.call(this);
    },

    setReadOnly: function(readOnly){

        Ext.form.HtmlEditor.superclass.setReadOnly.call(this, readOnly);
        if(this.initialized){
            if(Ext.isIE){
                this.getEditorBody().contentEditable = !readOnly;
            }else{
                this.setDesignMode(!readOnly);
            }
            var bd = this.getEditorBody();
            if(bd){
                bd.style.cursor = this.readOnly ? 'default' : 'text';
            }
            this.disableItems(readOnly);
        }
    },

    /**
     * Protected method that will not generally be called directly. It
     * is called when the editor initializes the iframe with HTML contents. Override this method if you
     * want to change the initialization markup of the iframe (e.g. to add stylesheets).
     *
     * Note: IE8-Standards has unwanted scroller behavior, so the default meta tag forces IE7 compatibility
     */
    getDocMarkup : function(){
        var h = Ext.fly(this.iframe).getHeight() - this.iframePad * 2;
        return String.format('<html><head><style type="text/css">body{border: 0; margin: 0; padding: {0}px; height: {1}px; cursor: text}</style></head><body></body></html>', this.iframePad, h);
    },

    // private
    getEditorBody : function(){
        var doc = this.getDoc();
        return doc.body || doc.documentElement;
    },

    // private
    getDoc : function(){
        return Ext.isIE ? this.getWin().document : (this.iframe.contentDocument || this.getWin().document);
    },

    // private
    getWin : function(){
        return Ext.isIE ? this.iframe.contentWindow : window.frames[this.iframe.name];
    },

    // private
    onRender : function(ct, position){
        Ext.form.HtmlEditor.superclass.onRender.call(this, ct, position);
        this.el.dom.style.border = '0 none';
        this.el.dom.setAttribute('tabIndex', -1);
        this.el.addClass('x-hidden');
        if(Ext.isIE){ // fix IE 1px bogus margin
            this.el.applyStyles('margin-top:-1px;margin-bottom:-1px;');
        }
        this.wrap = this.el.wrap({
            cls:'x-html-editor-wrap', cn:{cls:'x-html-editor-tb'}
        });

        this.createToolbar(this);

        this.disableItems(true);

        this.tb.doLayout();

        this.createIFrame();

        if(!this.width){
            var sz = this.el.getSize();
            this.setSize(sz.width, this.height || sz.height);
        }
        this.resizeEl = this.positionEl = this.wrap;
    },

    createIFrame: function(){
        var iframe = document.createElement('iframe');
        iframe.name = Ext.id();
        iframe.frameBorder = '0';
        iframe.style.overflow = 'auto';
        iframe.src = Ext.SSL_SECURE_URL;

        this.wrap.dom.appendChild(iframe);
        this.iframe = iframe;

        this.monitorTask = Ext.TaskMgr.start({
            run: this.checkDesignMode,
            scope: this,
            interval:100
        });
    },

    initFrame : function(){
        Ext.TaskMgr.stop(this.monitorTask);
        var doc = this.getDoc();
        this.win = this.getWin();

        doc.open();
        doc.write(this.getDocMarkup());
        doc.close();

        var task = { // must defer to wait for browser to be ready
            run : function(){
                var doc = this.getDoc();
                if(doc.body || doc.readyState == 'complete'){
                    Ext.TaskMgr.stop(task);
                    this.setDesignMode(true);
                    this.initEditor.defer(10, this);
                }
            },
            interval : 10,
            duration:10000,
            scope: this
        };
        Ext.TaskMgr.start(task);
    },


    checkDesignMode : function(){
        if(this.wrap && this.wrap.dom.offsetWidth){
            var doc = this.getDoc();
            if(!doc){
                return;
            }
            if(!doc.editorInitialized || this.getDesignMode() != 'on'){
                this.initFrame();
            }
        }
    },

    /* private
     * set current design mode. To enable, mode can be true or 'on', off otherwise
     */
    setDesignMode : function(mode){
        var doc = this.getDoc();
        if (doc) {
            if(this.readOnly){
                mode = false;
            }
            doc.designMode = (/on|true/i).test(String(mode).toLowerCase()) ?'on':'off';
        }

    },

    // private
    getDesignMode : function(){
        var doc = this.getDoc();
        if(!doc){ return ''; }
        return String(doc.designMode).toLowerCase();

    },

    disableItems: function(disabled){
        if(this.fontSelect){
            this.fontSelect.dom.disabled = disabled;
        }
        this.tb.items.each(function(item){
            if(item.getItemId() != 'sourceedit'){
                item.setDisabled(disabled);
            }
        });
    },

    // private
    onResize : function(w, h){
        Ext.form.HtmlEditor.superclass.onResize.apply(this, arguments);
        if(this.el && this.iframe){
            if(Ext.isNumber(w)){
                var aw = w - this.wrap.getFrameWidth('lr');
                this.el.setWidth(aw);
                this.tb.setWidth(aw);
                this.iframe.style.width = Math.max(aw, 0) + 'px';
            }
            if(Ext.isNumber(h)){
                var ah = h - this.wrap.getFrameWidth('tb') - this.tb.el.getHeight();
                this.el.setHeight(ah);
                this.iframe.style.height = Math.max(ah, 0) + 'px';
                var bd = this.getEditorBody();
                if(bd){
                    bd.style.height = Math.max((ah - (this.iframePad*2)), 0) + 'px';
                }
            }
        }
    },

    /**
     * Toggles the editor between standard and source edit mode.
     * @param {Boolean} sourceEdit (optional) True for source edit, false for standard
     */
    toggleSourceEdit : function(sourceEditMode){
        var iframeHeight,
            elHeight;

        if (sourceEditMode === undefined) {
            sourceEditMode = !this.sourceEditMode;
        }
        this.sourceEditMode = sourceEditMode === true;
        var btn = this.tb.getComponent('sourceedit');

        if (btn.pressed !== this.sourceEditMode) {
            btn.toggle(this.sourceEditMode);
            if (!btn.xtbHidden) {
                return;
            }
        }
        if (this.sourceEditMode) {
            // grab the height of the containing panel before we hide the iframe
            this.previousSize = this.getSize();

            iframeHeight = Ext.get(this.iframe).getHeight();

            this.disableItems(true);
            this.syncValue();
            this.iframe.className = 'x-hidden';
            this.el.removeClass('x-hidden');
            this.el.dom.removeAttribute('tabIndex');
            this.el.focus();
            this.el.dom.style.height = iframeHeight + 'px';
        }
        else {
            elHeight = parseInt(this.el.dom.style.height, 10);
            if (this.initialized) {
                this.disableItems(this.readOnly);
            }
            this.pushValue();
            this.iframe.className = '';
            this.el.addClass('x-hidden');
            this.el.dom.setAttribute('tabIndex', -1);
            this.deferFocus();

            this.setSize(this.previousSize);
            delete this.previousSize;
            this.iframe.style.height = elHeight + 'px';
        }
        this.fireEvent('editmodechange', this, this.sourceEditMode);
    },

    // private used internally
    createLink : function() {
        var url = prompt(this.createLinkText, this.defaultLinkValue);
        if(url && url != 'http:/'+'/'){
            this.relayCmd('createlink', url);
        }
    },

    // private
    initEvents : function(){
        this.originalValue = this.getValue();
    },

    /**
     * Overridden and disabled. The editor element does not support standard valid/invalid marking. @hide
     * @method
     */
    markInvalid : Ext.emptyFn,

    /**
     * Overridden and disabled. The editor element does not support standard valid/invalid marking. @hide
     * @method
     */
    clearInvalid : Ext.emptyFn,

    // docs inherit from Field
    setValue : function(v){
        Ext.form.HtmlEditor.superclass.setValue.call(this, v);
        this.pushValue();
        return this;
    },

    /**
     * Protected method that will not generally be called directly. If you need/want
     * custom HTML cleanup, this is the method you should override.
     * @param {String} html The HTML to be cleaned
     * @return {String} The cleaned HTML
     */
    cleanHtml: function(html) {
        html = String(html);
        if(Ext.isWebKit){ // strip safari nonsense
            html = html.replace(/\sclass="(?:Apple-style-span|khtml-block-placeholder)"/gi, '');
        }

        /*
         * Neat little hack. Strips out all the non-digit characters from the default
         * value and compares it to the character code of the first character in the string
         * because it can cause encoding issues when posted to the server.
         */
        if(html.charCodeAt(0) == this.defaultValue.replace(/\D/g, '')){
            html = html.substring(1);
        }
        return html;
    },

    /**
     * Protected method that will not generally be called directly. Syncs the contents
     * of the editor iframe with the textarea.
     */
    syncValue : function(){
        if(this.initialized){
            var bd = this.getEditorBody();
            var html = bd.innerHTML;
            if(Ext.isWebKit){
                var bs = bd.getAttribute('style'); // Safari puts text-align styles on the body element!
                var m = bs.match(/text-align:(.*?);/i);
                if(m && m[1]){
                    html = '<div style="'+m[0]+'">' + html + '</div>';
                }
            }
            html = this.cleanHtml(html);
            if(this.fireEvent('beforesync', this, html) !== false){
                this.el.dom.value = html;
                this.fireEvent('sync', this, html);
            }
        }
    },

    //docs inherit from Field
    getValue : function() {
        this[this.sourceEditMode ? 'pushValue' : 'syncValue']();
        return Ext.form.HtmlEditor.superclass.getValue.call(this);
    },

    /**
     * Protected method that will not generally be called directly. Pushes the value of the textarea
     * into the iframe editor.
     */
    pushValue : function(){
        if(this.initialized){
            var v = this.el.dom.value;
            if(!this.activated && v.length < 1){
                v = this.defaultValue;
            }
            if(this.fireEvent('beforepush', this, v) !== false){
                this.getEditorBody().innerHTML = v;
                if(Ext.isGecko){
                    // Gecko hack, see: https://bugzilla.mozilla.org/show_bug.cgi?id=232791#c8
                    this.setDesignMode(false);  //toggle off first
                    this.setDesignMode(true);
                }
                this.fireEvent('push', this, v);
            }

        }
    },

    // private
    deferFocus : function(){
        this.focus.defer(10, this);
    },

    // docs inherit from Field
    focus : function(){
        if(this.win && !this.sourceEditMode){
            this.win.focus();
        }else{
            this.el.focus();
        }
    },

    // private
    initEditor : function(){
        //Destroying the component during/before initEditor can cause issues.
        try{
            var dbody = this.getEditorBody(),
                ss = this.el.getStyles('font-size', 'font-family', 'background-image', 'background-repeat', 'background-color', 'color'),
                doc,
                fn;

            ss['background-attachment'] = 'fixed'; // w3c
            dbody.bgProperties = 'fixed'; // ie

            Ext.DomHelper.applyStyles(dbody, ss);

            doc = this.getDoc();

            if(doc){
                try{
                    Ext.EventManager.removeAll(doc);
                }catch(e){}
            }

            /*
             * We need to use createDelegate here, because when using buffer, the delayed task is added
             * as a property to the function. When the listener is removed, the task is deleted from the function.
             * Since onEditorEvent is shared on the prototype, if we have multiple html editors, the first time one of the editors
             * is destroyed, it causes the fn to be deleted from the prototype, which causes errors. Essentially, we're just anonymizing the function.
             */
            fn = this.onEditorEvent.createDelegate(this);
            Ext.EventManager.on(doc, {
                mousedown: fn,
                dblclick: fn,
                click: fn,
                keyup: fn,
                buffer:100
            });

            if(Ext.isGecko){
                Ext.EventManager.on(doc, 'keypress', this.applyCommand, this);
            }
            if(Ext.isIE || Ext.isWebKit || Ext.isOpera){
                Ext.EventManager.on(doc, 'keydown', this.fixKeys, this);
            }
            doc.editorInitialized = true;
            this.initialized = true;
            this.pushValue();
            this.setReadOnly(this.readOnly);
            this.fireEvent('initialize', this);
        }catch(e){}
    },

    // private
    beforeDestroy : function(){
        if(this.monitorTask){
            Ext.TaskMgr.stop(this.monitorTask);
        }
        if(this.rendered){
            Ext.destroy(this.tb);
            var doc = this.getDoc();
            if(doc){
                try{
                    Ext.EventManager.removeAll(doc);
                    for (var prop in doc){
                        delete doc[prop];
                    }
                }catch(e){}
            }
            if(this.wrap){
                this.wrap.dom.innerHTML = '';
                this.wrap.remove();
            }
        }
        Ext.form.HtmlEditor.superclass.beforeDestroy.call(this);
    },

    // private
    onFirstFocus : function(){
        this.activated = true;
        this.disableItems(this.readOnly);
        if(Ext.isGecko){ // prevent silly gecko errors
            this.win.focus();
            var s = this.win.getSelection();
            if(!s.focusNode || s.focusNode.nodeType != 3){
                var r = s.getRangeAt(0);
                r.selectNodeContents(this.getEditorBody());
                r.collapse(true);
                this.deferFocus();
            }
            try{
                this.execCmd('useCSS', true);
                this.execCmd('styleWithCSS', false);
            }catch(e){}
        }
        this.fireEvent('activate', this);
    },

    // private
    adjustFont: function(btn){
        var adjust = btn.getItemId() == 'increasefontsize' ? 1 : -1,
            doc = this.getDoc(),
            v = parseInt(doc.queryCommandValue('FontSize') || 2, 10);
        if((Ext.isSafari && !Ext.isSafari2) || Ext.isChrome || Ext.isAir){
            // Safari 3 values
            // 1 = 10px, 2 = 13px, 3 = 16px, 4 = 18px, 5 = 24px, 6 = 32px
            if(v <= 10){
                v = 1 + adjust;
            }else if(v <= 13){
                v = 2 + adjust;
            }else if(v <= 16){
                v = 3 + adjust;
            }else if(v <= 18){
                v = 4 + adjust;
            }else if(v <= 24){
                v = 5 + adjust;
            }else {
                v = 6 + adjust;
            }
            v = v.constrain(1, 6);
        }else{
            if(Ext.isSafari){ // safari
                adjust *= 2;
            }
            v = Math.max(1, v+adjust) + (Ext.isSafari ? 'px' : 0);
        }
        this.execCmd('FontSize', v);
    },

    // private
    onEditorEvent : function(e){
        this.updateToolbar();
    },


    /**
     * Protected method that will not generally be called directly. It triggers
     * a toolbar update by reading the markup state of the current selection in the editor.
     */
    updateToolbar: function(){

        if(this.readOnly){
            return;
        }

        if(!this.activated){
            this.onFirstFocus();
            return;
        }

        var btns = this.tb.items.map,
            doc = this.getDoc();

        if(this.enableFont && !Ext.isSafari2){
            var name = (doc.queryCommandValue('FontName')||this.defaultFont).toLowerCase();
            if(name != this.fontSelect.dom.value){
                this.fontSelect.dom.value = name;
            }
        }
        if(this.enableFormat){
            btns.bold.toggle(doc.queryCommandState('bold'));
            btns.italic.toggle(doc.queryCommandState('italic'));
            btns.underline.toggle(doc.queryCommandState('underline'));
        }
        if(this.enableAlignments){
            btns.justifyleft.toggle(doc.queryCommandState('justifyleft'));
            btns.justifycenter.toggle(doc.queryCommandState('justifycenter'));
            btns.justifyright.toggle(doc.queryCommandState('justifyright'));
        }
        if(!Ext.isSafari2 && this.enableLists){
            btns.insertorderedlist.toggle(doc.queryCommandState('insertorderedlist'));
            btns.insertunorderedlist.toggle(doc.queryCommandState('insertunorderedlist'));
        }

        Ext.menu.MenuMgr.hideAll();

        this.syncValue();
    },

    // private
    relayBtnCmd : function(btn){
        this.relayCmd(btn.getItemId());
    },

    /**
     * Executes a Midas editor command on the editor document and performs necessary focus and
     * toolbar updates. <b>This should only be called after the editor is initialized.</b>
     * @param {String} cmd The Midas command
     * @param {String/Boolean} value (optional) The value to pass to the command (defaults to null)
     */
    relayCmd : function(cmd, value){
        (function(){
            this.focus();
            this.execCmd(cmd, value);
            this.updateToolbar();
        }).defer(10, this);
    },

    /**
     * Executes a Midas editor command directly on the editor document.
     * For visual commands, you should use {@link #relayCmd} instead.
     * <b>This should only be called after the editor is initialized.</b>
     * @param {String} cmd The Midas command
     * @param {String/Boolean} value (optional) The value to pass to the command (defaults to null)
     */
    execCmd : function(cmd, value){
        var doc = this.getDoc();
        doc.execCommand(cmd, false, value === undefined ? null : value);
        this.syncValue();
    },

    // private
    applyCommand : function(e){
        if(e.ctrlKey){
            var c = e.getCharCode(), cmd;
            if(c > 0){
                c = String.fromCharCode(c);
                switch(c){
                    case 'b':
                        cmd = 'bold';
                    break;
                    case 'i':
                        cmd = 'italic';
                    break;
                    case 'u':
                        cmd = 'underline';
                    break;
                }
                if(cmd){
                    this.win.focus();
                    this.execCmd(cmd);
                    this.deferFocus();
                    e.preventDefault();
                }
            }
        }
    },

    /**
     * Inserts the passed text at the current cursor position. Note: the editor must be initialized and activated
     * to insert text.
     * @param {String} text
     */
    insertAtCursor : function(text){
        if(!this.activated){
            return;
        }
        if(Ext.isIE){
            this.win.focus();
            var doc = this.getDoc(),
                r = doc.selection.createRange();
            if(r){
                r.pasteHTML(text);
                this.syncValue();
                this.deferFocus();
            }
        }else{
            this.win.focus();
            this.execCmd('InsertHTML', text);
            this.deferFocus();
        }
    },

    // private
    fixKeys : function(){ // load time branching for fastest keydown performance
        if(Ext.isIE){
            return function(e){
                var k = e.getKey(),
                    doc = this.getDoc(),
                        r;
                if(k == e.TAB){
                    e.stopEvent();
                    r = doc.selection.createRange();
                    if(r){
                        r.collapse(true);
                        r.pasteHTML('&nbsp;&nbsp;&nbsp;&nbsp;');
                        this.deferFocus();
                    }
                }else if(k == e.ENTER){
                    r = doc.selection.createRange();
                    if(r){
                        var target = r.parentElement();
                        if(!target || target.tagName.toLowerCase() != 'li'){
                            e.stopEvent();
                            r.pasteHTML('<br />');
                            r.collapse(false);
                            r.select();
                        }
                    }
                }
            };
        }else if(Ext.isOpera){
            return function(e){
                var k = e.getKey();
                if(k == e.TAB){
                    e.stopEvent();
                    this.win.focus();
                    this.execCmd('InsertHTML','&nbsp;&nbsp;&nbsp;&nbsp;');
                    this.deferFocus();
                }
            };
        }else if(Ext.isWebKit){
            return function(e){
                var k = e.getKey();
                if(k == e.TAB){
                    e.stopEvent();
                    this.execCmd('InsertText','\t');
                    this.deferFocus();
                }else if(k == e.ENTER){
                    e.stopEvent();
                    this.execCmd('InsertHtml','<br /><br />');
                    this.deferFocus();
                }
             };
        }
    }(),

    /**
     * Returns the editor's toolbar. <b>This is only available after the editor has been rendered.</b>
     * @return {Ext.Toolbar}
     */
    getToolbar : function(){
        return this.tb;
    },

    /**
     * Object collection of toolbar tooltips for the buttons in the editor. The key
     * is the command id associated with that button and the value is a valid QuickTips object.
     * For example:
<pre><code>
{
    bold : {
        title: 'Bold (Ctrl+B)',
        text: 'Make the selected text bold.',
        cls: 'x-html-editor-tip'
    },
    italic : {
        title: 'Italic (Ctrl+I)',
        text: 'Make the selected text italic.',
        cls: 'x-html-editor-tip'
    },
    ...
</code></pre>
    * @type Object
     */
    buttonTips : {
        bold : {
            title: 'Bold (Ctrl+B)',
            text: 'Make the selected text bold.',
            cls: 'x-html-editor-tip'
        },
        italic : {
            title: 'Italic (Ctrl+I)',
            text: 'Make the selected text italic.',
            cls: 'x-html-editor-tip'
        },
        underline : {
            title: 'Underline (Ctrl+U)',
            text: 'Underline the selected text.',
            cls: 'x-html-editor-tip'
        },
        increasefontsize : {
            title: 'Grow Text',
            text: 'Increase the font size.',
            cls: 'x-html-editor-tip'
        },
        decreasefontsize : {
            title: 'Shrink Text',
            text: 'Decrease the font size.',
            cls: 'x-html-editor-tip'
        },
        backcolor : {
            title: 'Text Highlight Color',
            text: 'Change the background color of the selected text.',
            cls: 'x-html-editor-tip'
        },
        forecolor : {
            title: 'Font Color',
            text: 'Change the color of the selected text.',
            cls: 'x-html-editor-tip'
        },
        justifyleft : {
            title: 'Align Text Left',
            text: 'Align text to the left.',
            cls: 'x-html-editor-tip'
        },
        justifycenter : {
            title: 'Center Text',
            text: 'Center text in the editor.',
            cls: 'x-html-editor-tip'
        },
        justifyright : {
            title: 'Align Text Right',
            text: 'Align text to the right.',
            cls: 'x-html-editor-tip'
        },
        insertunorderedlist : {
            title: 'Bullet List',
            text: 'Start a bulleted list.',
            cls: 'x-html-editor-tip'
        },
        insertorderedlist : {
            title: 'Numbered List',
            text: 'Start a numbered list.',
            cls: 'x-html-editor-tip'
        },
        createlink : {
            title: 'Hyperlink',
            text: 'Make the selected text a hyperlink.',
            cls: 'x-html-editor-tip'
        },
        sourceedit : {
            title: 'Source Edit',
            text: 'Switch to source editing mode.',
            cls: 'x-html-editor-tip'
        }
    }

    // hide stuff that is not compatible
    /**
     * @event blur
     * @hide
     */
    /**
     * @event change
     * @hide
     */
    /**
     * @event focus
     * @hide
     */
    /**
     * @event specialkey
     * @hide
     */
    /**
     * @cfg {String} fieldClass @hide
     */
    /**
     * @cfg {String} focusClass @hide
     */
    /**
     * @cfg {String} autoCreate @hide
     */
    /**
     * @cfg {String} inputType @hide
     */
    /**
     * @cfg {String} invalidClass @hide
     */
    /**
     * @cfg {String} invalidText @hide
     */
    /**
     * @cfg {String} msgFx @hide
     */
    /**
     * @cfg {String} validateOnBlur @hide
     */
    /**
     * @cfg {Boolean} allowDomMove  @hide
     */
    /**
     * @cfg {String} applyTo @hide
     */
    /**
     * @cfg {String} autoHeight  @hide
     */
    /**
     * @cfg {String} autoWidth  @hide
     */
    /**
     * @cfg {String} cls  @hide
     */
    /**
     * @cfg {String} disabled  @hide
     */
    /**
     * @cfg {String} disabledClass  @hide
     */
    /**
     * @cfg {String} msgTarget  @hide
     */
    /**
     * @cfg {String} readOnly  @hide
     */
    /**
     * @cfg {String} style  @hide
     */
    /**
     * @cfg {String} validationDelay  @hide
     */
    /**
     * @cfg {String} validationEvent  @hide
     */
    /**
     * @cfg {String} tabIndex  @hide
     */
    /**
     * @property disabled
     * @hide
     */
    /**
     * @method applyToMarkup
     * @hide
     */
    /**
     * @method disable
     * @hide
     */
    /**
     * @method enable
     * @hide
     */
    /**
     * @method validate
     * @hide
     */
    /**
     * @event valid
     * @hide
     */
    /**
     * @method setDisabled
     * @hide
     */
    /**
     * @cfg keys
     * @hide
     */
});
Ext.reg('htmleditor', Ext.form.HtmlEditor);
/**
 * @class Ext.form.TimeField
 * @extends Ext.form.ComboBox
 * Provides a time input field with a time dropdown and automatic time validation.  Example usage:
 * <pre><code>
new Ext.form.TimeField({
    minValue: '9:00 AM',
    maxValue: '6:00 PM',
    increment: 30
});
</code></pre>
 * @constructor
 * Create a new TimeField
 * @param {Object} config
 * @xtype timefield
 */
Ext.form.TimeField = Ext.extend(Ext.form.ComboBox, {
    /**
     * @cfg {Date/String} minValue
     * The minimum allowed time. Can be either a Javascript date object with a valid time value or a string
     * time in a valid format -- see {@link #format} and {@link #altFormats} (defaults to undefined).
     */
    minValue : undefined,
    /**
     * @cfg {Date/String} maxValue
     * The maximum allowed time. Can be either a Javascript date object with a valid time value or a string
     * time in a valid format -- see {@link #format} and {@link #altFormats} (defaults to undefined).
     */
    maxValue : undefined,
    /**
     * @cfg {String} minText
     * The error text to display when the date in the cell is before minValue (defaults to
     * 'The time in this field must be equal to or after {0}').
     */
    minText : "The time in this field must be equal to or after {0}",
    /**
     * @cfg {String} maxText
     * The error text to display when the time is after maxValue (defaults to
     * 'The time in this field must be equal to or before {0}').
     */
    maxText : "The time in this field must be equal to or before {0}",
    /**
     * @cfg {String} invalidText
     * The error text to display when the time in the field is invalid (defaults to
     * '{value} is not a valid time').
     */
    invalidText : "{0} is not a valid time",
    /**
     * @cfg {String} format
     * The default time format string which can be overriden for localization support.  The format must be
     * valid according to {@link Date#parseDate} (defaults to 'g:i A', e.g., '3:15 PM').  For 24-hour time
     * format try 'H:i' instead.
     */
    format : "g:i A",
    /**
     * @cfg {String} altFormats
     * Multiple date formats separated by "|" to try when parsing a user input value and it doesn't match the defined
     * format (defaults to 'g:ia|g:iA|g:i a|g:i A|h:i|g:i|H:i|ga|ha|gA|h a|g a|g A|gi|hi|gia|hia|g|H|gi a|hi a|giA|hiA|gi A|hi A').
     */
    altFormats : "g:ia|g:iA|g:i a|g:i A|h:i|g:i|H:i|ga|ha|gA|h a|g a|g A|gi|hi|gia|hia|g|H|gi a|hi a|giA|hiA|gi A|hi A",
    /**
     * @cfg {Number} increment
     * The number of minutes between each time value in the list (defaults to 15).
     */
    increment: 15,

    // private override
    mode: 'local',
    // private override
    triggerAction: 'all',
    // private override
    typeAhead: false,

    // private - This is the date to use when generating time values in the absence of either minValue
    // or maxValue.  Using the current date causes DST issues on DST boundary dates, so this is an
    // arbitrary "safe" date that can be any date aside from DST boundary dates.
    initDate: '1/1/2008',

    initDateFormat: 'j/n/Y',

    // private
    initComponent : function(){
        if(Ext.isDefined(this.minValue)){
            this.setMinValue(this.minValue, true);
        }
        if(Ext.isDefined(this.maxValue)){
            this.setMaxValue(this.maxValue, true);
        }
        if(!this.store){
            this.generateStore(true);
        }
        Ext.form.TimeField.superclass.initComponent.call(this);
    },

    /**
     * Replaces any existing {@link #minValue} with the new time and refreshes the store.
     * @param {Date/String} value The minimum time that can be selected
     */
    setMinValue: function(value, /* private */ initial){
        this.setLimit(value, true, initial);
        return this;
    },

    /**
     * Replaces any existing {@link #maxValue} with the new time and refreshes the store.
     * @param {Date/String} value The maximum time that can be selected
     */
    setMaxValue: function(value, /* private */ initial){
        this.setLimit(value, false, initial);
        return this;
    },

    // private
    generateStore: function(initial){
        var min = this.minValue || new Date(this.initDate).clearTime(),
            max = this.maxValue || new Date(this.initDate).clearTime().add('mi', (24 * 60) - 1),
            times = [];

        while(min <= max){
            times.push(min.dateFormat(this.format));
            min = min.add('mi', this.increment);
        }
        this.bindStore(times, initial);
    },

    // private
    setLimit: function(value, isMin, initial){
        var d;
        if(Ext.isString(value)){
            d = this.parseDate(value);
        }else if(Ext.isDate(value)){
            d = value;
        }
        if(d){
            var val = new Date(this.initDate).clearTime();
            val.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
            this[isMin ? 'minValue' : 'maxValue'] = val;
            if(!initial){
                this.generateStore();
            }
        }
    },

    // inherited docs
    getValue : function(){
        var v = Ext.form.TimeField.superclass.getValue.call(this);
        return this.formatDate(this.parseDate(v)) || '';
    },

    // inherited docs
    setValue : function(value){
        return Ext.form.TimeField.superclass.setValue.call(this, this.formatDate(this.parseDate(value)));
    },

    // private overrides
    validateValue : Ext.form.DateField.prototype.validateValue,

    formatDate : Ext.form.DateField.prototype.formatDate,

    parseDate: function(value) {
        if (!value || Ext.isDate(value)) {
            return value;
        }

        var id = this.initDate + ' ',
            idf = this.initDateFormat + ' ',
            v = Date.parseDate(id + value, idf + this.format), // *** handle DST. note: this.format is a TIME-only format
            af = this.altFormats;

        if (!v && af) {
            if (!this.altFormatsArray) {
                this.altFormatsArray = af.split("|");
            }
            for (var i = 0, afa = this.altFormatsArray, len = afa.length; i < len && !v; i++) {
                v = Date.parseDate(id + value, idf + afa[i]);
            }
        }

        return v;
    }
});
Ext.reg('timefield', Ext.form.TimeField);/**
 * @class Ext.form.SliderField
 * @extends Ext.form.Field
 * Wraps a {@link Ext.slider.MultiSlider Slider} so it can be used as a form field.
 * @constructor
 * Creates a new SliderField
 * @param {Object} config Configuration options. Note that you can pass in any slider configuration options, as well as
 * as any field configuration options.
 * @xtype sliderfield
 */
Ext.form.SliderField = Ext.extend(Ext.form.Field, {
    
    /**
     * @cfg {Boolean} useTips
     * True to use an Ext.slider.Tip to display tips for the value. Defaults to <tt>true</tt>.
     */
    useTips : true,
    
    /**
     * @cfg {Function} tipText
     * A function used to display custom text for the slider tip. Defaults to <tt>null</tt>, which will
     * use the default on the plugin.
     */
    tipText : null,
    
    // private override
    actionMode: 'wrap',
    
    /**
     * Initialize the component.
     * @private
     */
    initComponent : function() {
        var cfg = Ext.copyTo({
            id: this.id + '-slider'
        }, this.initialConfig, ['vertical', 'minValue', 'maxValue', 'decimalPrecision', 'keyIncrement', 'increment', 'clickToChange', 'animate']);
        
        // only can use it if it exists.
        if (this.useTips) {
            var plug = this.tipText ? {getText: this.tipText} : {};
            cfg.plugins = [new Ext.slider.Tip(plug)];
        }
        this.slider = new Ext.Slider(cfg);
        Ext.form.SliderField.superclass.initComponent.call(this);
    },    
    
    /**
     * Set up the hidden field
     * @param {Object} ct The container to render to.
     * @param {Object} position The position in the container to render to.
     * @private
     */
    onRender : function(ct, position){
        this.autoCreate = {
            id: this.id,
            name: this.name,
            type: 'hidden',
            tag: 'input'    
        };
        Ext.form.SliderField.superclass.onRender.call(this, ct, position);
        this.wrap = this.el.wrap({cls: 'x-form-field-wrap'});
        this.resizeEl = this.positionEl = this.wrap;
        this.slider.render(this.wrap);
    },
    
    /**
     * Ensure that the slider size is set automatically when the field resizes.
     * @param {Object} w The width
     * @param {Object} h The height
     * @param {Object} aw The adjusted width
     * @param {Object} ah The adjusted height
     * @private
     */
    onResize : function(w, h, aw, ah){
        Ext.form.SliderField.superclass.onResize.call(this, w, h, aw, ah);
        this.slider.setSize(w, h);    
    },
    
    /**
     * Initialize any events for this class.
     * @private
     */
    initEvents : function(){
        Ext.form.SliderField.superclass.initEvents.call(this);
        this.slider.on('change', this.onChange, this);   
    },
    
    /**
     * Utility method to set the value of the field when the slider changes.
     * @param {Object} slider The slider object.
     * @param {Object} v The new value.
     * @private
     */
    onChange : function(slider, v){
        this.setValue(v, undefined, true);
    },
    
    /**
     * Enable the slider when the field is enabled.
     * @private
     */
    onEnable : function(){
        Ext.form.SliderField.superclass.onEnable.call(this);
        this.slider.enable();
    },
    
    /**
     * Disable the slider when the field is disabled.
     * @private
     */
    onDisable : function(){
        Ext.form.SliderField.superclass.onDisable.call(this);
        this.slider.disable();    
    },
    
    /**
     * Ensure the slider is destroyed when the field is destroyed.
     * @private
     */
    beforeDestroy : function(){
        Ext.destroy(this.slider);
        Ext.form.SliderField.superclass.beforeDestroy.call(this);
    },
    
    /**
     * If a side icon is shown, do alignment to the slider
     * @private
     */
    alignErrorIcon : function(){
        this.errorIcon.alignTo(this.slider.el, 'tl-tr', [2, 0]);
    },
    
    /**
     * Sets the minimum field value.
     * @param {Number} v The new minimum value.
     * @return {Ext.form.SliderField} this
     */
    setMinValue : function(v){
        this.slider.setMinValue(v);
        return this;    
    },
    
    /**
     * Sets the maximum field value.
     * @param {Number} v The new maximum value.
     * @return {Ext.form.SliderField} this
     */
    setMaxValue : function(v){
        this.slider.setMaxValue(v);
        return this;    
    },
    
    /**
     * Sets the value for this field.
     * @param {Number} v The new value.
     * @param {Boolean} animate (optional) Whether to animate the transition. If not specified, it will default to the animate config.
     * @return {Ext.form.SliderField} this
     */
    setValue : function(v, animate, /* private */ silent){
        // silent is used if the setValue method is invoked by the slider
        // which means we don't need to set the value on the slider.
        if(!silent){
            this.slider.setValue(v, animate);
        }
        return Ext.form.SliderField.superclass.setValue.call(this, this.slider.getValue());
    },
    
    /**
     * Gets the current value for this field.
     * @return {Number} The current value.
     */
    getValue : function(){
        return this.slider.getValue();    
    }
});

Ext.reg('sliderfield', Ext.form.SliderField);/**
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

Ext.reg('label', Ext.form.Label);/**
 * @class Ext.form.Action
 * <p>The subclasses of this class provide actions to perform upon {@link Ext.form.BasicForm Form}s.</p>
 * <p>Instances of this class are only created by a {@link Ext.form.BasicForm Form} when
 * the Form needs to perform an action such as submit or load. The Configuration options
 * listed for this class are set through the Form's action methods: {@link Ext.form.BasicForm#submit submit},
 * {@link Ext.form.BasicForm#load load} and {@link Ext.form.BasicForm#doAction doAction}</p>
 * <p>The instance of Action which performed the action is passed to the success
 * and failure callbacks of the Form's action methods ({@link Ext.form.BasicForm#submit submit},
 * {@link Ext.form.BasicForm#load load} and {@link Ext.form.BasicForm#doAction doAction}),
 * and to the {@link Ext.form.BasicForm#actioncomplete actioncomplete} and
 * {@link Ext.form.BasicForm#actionfailed actionfailed} event handlers.</p>
 */
Ext.form.Action = function(form, options){
    this.form = form;
    this.options = options || {};
};

/**
 * Failure type returned when client side validation of the Form fails
 * thus aborting a submit action. Client side validation is performed unless
 * {@link #clientValidation} is explicitly set to <tt>false</tt>.
 * @type {String}
 * @static
 */
Ext.form.Action.CLIENT_INVALID = 'client';
/**
 * <p>Failure type returned when server side processing fails and the {@link #result}'s
 * <tt style="font-weight:bold">success</tt> property is set to <tt>false</tt>.</p>
 * <p>In the case of a form submission, field-specific error messages may be returned in the
 * {@link #result}'s <tt style="font-weight:bold">errors</tt> property.</p>
 * @type {String}
 * @static
 */
Ext.form.Action.SERVER_INVALID = 'server';
/**
 * Failure type returned when a communication error happens when attempting
 * to send a request to the remote server. The {@link #response} may be examined to
 * provide further information.
 * @type {String}
 * @static
 */
Ext.form.Action.CONNECT_FAILURE = 'connect';
/**
 * Failure type returned when the response's <tt style="font-weight:bold">success</tt>
 * property is set to <tt>false</tt>, or no field values are returned in the response's
 * <tt style="font-weight:bold">data</tt> property.
 * @type {String}
 * @static
 */
Ext.form.Action.LOAD_FAILURE = 'load';

Ext.form.Action.prototype = {
/**
 * @cfg {String} url The URL that the Action is to invoke.
 */
/**
 * @cfg {Boolean} reset When set to <tt><b>true</b></tt>, causes the Form to be
 * {@link Ext.form.BasicForm.reset reset} on Action success. If specified, this happens
 * <b>before</b> the {@link #success} callback is called and before the Form's
 * {@link Ext.form.BasicForm.actioncomplete actioncomplete} event fires.
 */
/**
 * @cfg {String} method The HTTP method to use to access the requested URL. Defaults to the
 * {@link Ext.form.BasicForm}'s method, or if that is not specified, the underlying DOM form's method.
 */
/**
 * @cfg {Mixed} params <p>Extra parameter values to pass. These are added to the Form's
 * {@link Ext.form.BasicForm#baseParams} and passed to the specified URL along with the Form's
 * input fields.</p>
 * <p>Parameters are encoded as standard HTTP parameters using {@link Ext#urlEncode}.</p>
 */
/**
 * @cfg {Number} timeout The number of seconds to wait for a server response before
 * failing with the {@link #failureType} as {@link #Action.CONNECT_FAILURE}. If not specified,
 * defaults to the configured <tt>{@link Ext.form.BasicForm#timeout timeout}</tt> of the
 * {@link Ext.form.BasicForm form}.
 */
/**
 * @cfg {Function} success The function to call when a valid success return packet is recieved.
 * The function is passed the following parameters:<ul class="mdetail-params">
 * <li><b>form</b> : Ext.form.BasicForm<div class="sub-desc">The form that requested the action</div></li>
 * <li><b>action</b> : Ext.form.Action<div class="sub-desc">The Action class. The {@link #result}
 * property of this object may be examined to perform custom postprocessing.</div></li>
 * </ul>
 */
/**
 * @cfg {Function} failure The function to call when a failure packet was recieved, or when an
 * error ocurred in the Ajax communication.
 * The function is passed the following parameters:<ul class="mdetail-params">
 * <li><b>form</b> : Ext.form.BasicForm<div class="sub-desc">The form that requested the action</div></li>
 * <li><b>action</b> : Ext.form.Action<div class="sub-desc">The Action class. If an Ajax
 * error ocurred, the failure type will be in {@link #failureType}. The {@link #result}
 * property of this object may be examined to perform custom postprocessing.</div></li>
 * </ul>
 */
/**
 * @cfg {Object} scope The scope in which to call the callback functions (The <tt>this</tt> reference
 * for the callback functions).
 */
/**
 * @cfg {String} waitMsg The message to be displayed by a call to {@link Ext.MessageBox#wait}
 * during the time the action is being processed.
 */
/**
 * @cfg {String} waitTitle The title to be displayed by a call to {@link Ext.MessageBox#wait}
 * during the time the action is being processed.
 */

/**
 * @cfg {Boolean} submitEmptyText If set to <tt>true</tt>, the emptyText value will be sent with the form
 * when it is submitted.  Defaults to <tt>true</tt>.
 */

/**
 * The type of action this Action instance performs.
 * Currently only "submit" and "load" are supported.
 * @type {String}
 */
    type : 'default',
/**
 * The type of failure detected will be one of these: {@link #CLIENT_INVALID},
 * {@link #SERVER_INVALID}, {@link #CONNECT_FAILURE}, or {@link #LOAD_FAILURE}.  Usage:
 * <pre><code>
var fp = new Ext.form.FormPanel({
...
buttons: [{
    text: 'Save',
    formBind: true,
    handler: function(){
        if(fp.getForm().isValid()){
            fp.getForm().submit({
                url: 'form-submit.php',
                waitMsg: 'Submitting your data...',
                success: function(form, action){
                    // server responded with success = true
                    var result = action.{@link #result};
                },
                failure: function(form, action){
                    if (action.{@link #failureType} === Ext.form.Action.{@link #CONNECT_FAILURE}) {
                        Ext.Msg.alert('Error',
                            'Status:'+action.{@link #response}.status+': '+
                            action.{@link #response}.statusText);
                    }
                    if (action.failureType === Ext.form.Action.{@link #SERVER_INVALID}){
                        // server responded with success = false
                        Ext.Msg.alert('Invalid', action.{@link #result}.errormsg);
                    }
                }
            });
        }
    }
},{
    text: 'Reset',
    handler: function(){
        fp.getForm().reset();
    }
}]
 * </code></pre>
 * @property failureType
 * @type {String}
 */
 /**
 * The XMLHttpRequest object used to perform the action.
 * @property response
 * @type {Object}
 */
 /**
 * The decoded response object containing a boolean <tt style="font-weight:bold">success</tt> property and
 * other, action-specific properties.
 * @property result
 * @type {Object}
 */

    // interface method
    run : function(options){

    },

    // interface method
    success : function(response){

    },

    // interface method
    handleResponse : function(response){

    },

    // default connection failure
    failure : function(response){
        this.response = response;
        this.failureType = Ext.form.Action.CONNECT_FAILURE;
        this.form.afterAction(this, false);
    },

    // private
    // shared code among all Actions to validate that there was a response
    // with either responseText or responseXml
    processResponse : function(response){
        this.response = response;
        if(!response.responseText && !response.responseXML){
            return true;
        }
        this.result = this.handleResponse(response);
        return this.result;
    },

    // utility functions used internally
    getUrl : function(appendParams){
        var url = this.options.url || this.form.url || this.form.el.dom.action;
        if(appendParams){
            var p = this.getParams();
            if(p){
                url = Ext.urlAppend(url, p);
            }
        }
        return url;
    },

    // private
    getMethod : function(){
        return (this.options.method || this.form.method || this.form.el.dom.method || 'POST').toUpperCase();
    },

    // private
    getParams : function(){
        var bp = this.form.baseParams;
        var p = this.options.params;
        if(p){
            if(typeof p == "object"){
                p = Ext.urlEncode(Ext.applyIf(p, bp));
            }else if(typeof p == 'string' && bp){
                p += '&' + Ext.urlEncode(bp);
            }
        }else if(bp){
            p = Ext.urlEncode(bp);
        }
        return p;
    },

    // private
    createCallback : function(opts){
        var opts = opts || {};
        return {
            success: this.success,
            failure: this.failure,
            scope: this,
            timeout: (opts.timeout*1000) || (this.form.timeout*1000),
            upload: this.form.fileUpload ? this.success : undefined
        };
    }
};

/**
 * @class Ext.form.Action.Submit
 * @extends Ext.form.Action
 * <p>A class which handles submission of data from {@link Ext.form.BasicForm Form}s
 * and processes the returned response.</p>
 * <p>Instances of this class are only created by a {@link Ext.form.BasicForm Form} when
 * {@link Ext.form.BasicForm#submit submit}ting.</p>
 * <p><u><b>Response Packet Criteria</b></u></p>
 * <p>A response packet may contain:
 * <div class="mdetail-params"><ul>
 * <li><b><code>success</code></b> property : Boolean
 * <div class="sub-desc">The <code>success</code> property is required.</div></li>
 * <li><b><code>errors</code></b> property : Object
 * <div class="sub-desc"><div class="sub-desc">The <code>errors</code> property,
 * which is optional, contains error messages for invalid fields.</div></li>
 * </ul></div>
 * <p><u><b>JSON Packets</b></u></p>
 * <p>By default, response packets are assumed to be JSON, so a typical response
 * packet may look like this:</p><pre><code>
{
    success: false,
    errors: {
        clientCode: "Client not found",
        portOfLoading: "This field must not be null"
    }
}</code></pre>
 * <p>Other data may be placed into the response for processing by the {@link Ext.form.BasicForm}'s callback
 * or event handler methods. The object decoded from this JSON is available in the
 * {@link Ext.form.Action#result result} property.</p>
 * <p>Alternatively, if an {@link #errorReader} is specified as an {@link Ext.data.XmlReader XmlReader}:</p><pre><code>
    errorReader: new Ext.data.XmlReader({
            record : 'field',
            success: '@success'
        }, [
            'id', 'msg'
        ]
    )
</code></pre>
 * <p>then the results may be sent back in XML format:</p><pre><code>
&lt;?xml version="1.0" encoding="UTF-8"?&gt;
&lt;message success="false"&gt;
&lt;errors&gt;
    &lt;field&gt;
        &lt;id&gt;clientCode&lt;/id&gt;
        &lt;msg&gt;&lt;![CDATA[Code not found. &lt;br /&gt;&lt;i&gt;This is a test validation message from the server &lt;/i&gt;]]&gt;&lt;/msg&gt;
    &lt;/field&gt;
    &lt;field&gt;
        &lt;id&gt;portOfLoading&lt;/id&gt;
        &lt;msg&gt;&lt;![CDATA[Port not found. &lt;br /&gt;&lt;i&gt;This is a test validation message from the server &lt;/i&gt;]]&gt;&lt;/msg&gt;
    &lt;/field&gt;
&lt;/errors&gt;
&lt;/message&gt;
</code></pre>
 * <p>Other elements may be placed into the response XML for processing by the {@link Ext.form.BasicForm}'s callback
 * or event handler methods. The XML document is available in the {@link #errorReader}'s {@link Ext.data.XmlReader#xmlData xmlData} property.</p>
 */
Ext.form.Action.Submit = function(form, options){
    Ext.form.Action.Submit.superclass.constructor.call(this, form, options);
};

Ext.extend(Ext.form.Action.Submit, Ext.form.Action, {
    /**
     * @cfg {Ext.data.DataReader} errorReader <p><b>Optional. JSON is interpreted with
     * no need for an errorReader.</b></p>
     * <p>A Reader which reads a single record from the returned data. The DataReader's
     * <b>success</b> property specifies how submission success is determined. The Record's
     * data provides the error messages to apply to any invalid form Fields.</p>
     */
    /**
     * @cfg {boolean} clientValidation Determines whether a Form's fields are validated
     * in a final call to {@link Ext.form.BasicForm#isValid isValid} prior to submission.
     * Pass <tt>false</tt> in the Form's submit options to prevent this. If not defined, pre-submission field validation
     * is performed.
     */
    type : 'submit',

    // private
    run : function(){
        var o = this.options,
            method = this.getMethod(),
            isGet = method == 'GET';
        if(o.clientValidation === false || this.form.isValid()){
            if (o.submitEmptyText === false) {
                var fields = this.form.items,
                    emptyFields = [],
                    setupEmptyFields = function(f){
                        if (f.el.getValue() == f.emptyText) {
                            emptyFields.push(f);
                            f.el.dom.value = "";
                        }
                        if(f.isComposite && f.rendered){
                            f.items.each(setupEmptyFields);
                        }
                    };
                    
                fields.each(setupEmptyFields);
            }
            Ext.Ajax.request(Ext.apply(this.createCallback(o), {
                form:this.form.el.dom,
                url:this.getUrl(isGet),
                method: method,
                headers: o.headers,
                params:!isGet ? this.getParams() : null,
                isUpload: this.form.fileUpload
            }));
            if (o.submitEmptyText === false) {
                Ext.each(emptyFields, function(f) {
                    if (f.applyEmptyText) {
                        f.applyEmptyText();
                    }
                });
            }
        }else if (o.clientValidation !== false){ // client validation failed
            this.failureType = Ext.form.Action.CLIENT_INVALID;
            this.form.afterAction(this, false);
        }
    },

    // private
    success : function(response){
        var result = this.processResponse(response);
        if(result === true || result.success){
            this.form.afterAction(this, true);
            return;
        }
        if(result.errors){
            this.form.markInvalid(result.errors);
        }
        this.failureType = Ext.form.Action.SERVER_INVALID;
        this.form.afterAction(this, false);
    },

    // private
    handleResponse : function(response){
        if(this.form.errorReader){
            var rs = this.form.errorReader.read(response);
            var errors = [];
            if(rs.records){
                for(var i = 0, len = rs.records.length; i < len; i++) {
                    var r = rs.records[i];
                    errors[i] = r.data;
                }
            }
            if(errors.length < 1){
                errors = null;
            }
            return {
                success : rs.success,
                errors : errors
            };
        }
        return Ext.decode(response.responseText);
    }
});


/**
 * @class Ext.form.Action.Load
 * @extends Ext.form.Action
 * <p>A class which handles loading of data from a server into the Fields of an {@link Ext.form.BasicForm}.</p>
 * <p>Instances of this class are only created by a {@link Ext.form.BasicForm Form} when
 * {@link Ext.form.BasicForm#load load}ing.</p>
 * <p><u><b>Response Packet Criteria</b></u></p>
 * <p>A response packet <b>must</b> contain:
 * <div class="mdetail-params"><ul>
 * <li><b><code>success</code></b> property : Boolean</li>
 * <li><b><code>data</code></b> property : Object</li>
 * <div class="sub-desc">The <code>data</code> property contains the values of Fields to load.
 * The individual value object for each Field is passed to the Field's
 * {@link Ext.form.Field#setValue setValue} method.</div></li>
 * </ul></div>
 * <p><u><b>JSON Packets</b></u></p>
 * <p>By default, response packets are assumed to be JSON, so for the following form load call:<pre><code>
var myFormPanel = new Ext.form.FormPanel({
    title: 'Client and routing info',
    items: [{
        fieldLabel: 'Client',
        name: 'clientName'
    }, {
        fieldLabel: 'Port of loading',
        name: 'portOfLoading'
    }, {
        fieldLabel: 'Port of discharge',
        name: 'portOfDischarge'
    }]
});
myFormPanel.{@link Ext.form.FormPanel#getForm getForm}().{@link Ext.form.BasicForm#load load}({
    url: '/getRoutingInfo.php',
    params: {
        consignmentRef: myConsignmentRef
    },
    failure: function(form, action) {
        Ext.Msg.alert("Load failed", action.result.errorMessage);
    }
});
</code></pre>
 * a <b>success response</b> packet may look like this:</p><pre><code>
{
    success: true,
    data: {
        clientName: "Fred. Olsen Lines",
        portOfLoading: "FXT",
        portOfDischarge: "OSL"
    }
}</code></pre>
 * while a <b>failure response</b> packet may look like this:</p><pre><code>
{
    success: false,
    errorMessage: "Consignment reference not found"
}</code></pre>
 * <p>Other data may be placed into the response for processing the {@link Ext.form.BasicForm Form}'s
 * callback or event handler methods. The object decoded from this JSON is available in the
 * {@link Ext.form.Action#result result} property.</p>
 */
Ext.form.Action.Load = function(form, options){
    Ext.form.Action.Load.superclass.constructor.call(this, form, options);
    this.reader = this.form.reader;
};

Ext.extend(Ext.form.Action.Load, Ext.form.Action, {
    // private
    type : 'load',

    // private
    run : function(){
        Ext.Ajax.request(Ext.apply(
                this.createCallback(this.options), {
                    method:this.getMethod(),
                    url:this.getUrl(false),
                    headers: this.options.headers,
                    params:this.getParams()
        }));
    },

    // private
    success : function(response){
        var result = this.processResponse(response);
        if(result === true || !result.success || !result.data){
            this.failureType = Ext.form.Action.LOAD_FAILURE;
            this.form.afterAction(this, false);
            return;
        }
        this.form.clearInvalid();
        this.form.setValues(result.data);
        this.form.afterAction(this, true);
    },

    // private
    handleResponse : function(response){
        if(this.form.reader){
            var rs = this.form.reader.read(response);
            var data = rs.records && rs.records[0] ? rs.records[0].data : null;
            return {
                success : rs.success,
                data : data
            };
        }
        return Ext.decode(response.responseText);
    }
});



/**
 * @class Ext.form.Action.DirectLoad
 * @extends Ext.form.Action.Load
 * <p>Provides Ext.direct support for loading form data.</p>
 * <p>This example illustrates usage of Ext.Direct to <b>load</b> a form through Ext.Direct.</p>
 * <pre><code>
var myFormPanel = new Ext.form.FormPanel({
    // configs for FormPanel
    title: 'Basic Information',
    renderTo: document.body,
    width: 300, height: 160,
    padding: 10,

    // configs apply to child items
    defaults: {anchor: '100%'},
    defaultType: 'textfield',
    items: [{
        fieldLabel: 'Name',
        name: 'name'
    },{
        fieldLabel: 'Email',
        name: 'email'
    },{
        fieldLabel: 'Company',
        name: 'company'
    }],

    // configs for BasicForm
    api: {
        // The server-side method to call for load() requests
        load: Profile.getBasicInfo,
        // The server-side must mark the submit handler as a 'formHandler'
        submit: Profile.updateBasicInfo
    },
    // specify the order for the passed params
    paramOrder: ['uid', 'foo']
});

// load the form
myFormPanel.getForm().load({
    // pass 2 arguments to server side getBasicInfo method (len=2)
    params: {
        foo: 'bar',
        uid: 34
    }
});
 * </code></pre>
 * The data packet sent to the server will resemble something like:
 * <pre><code>
[
    {
        "action":"Profile","method":"getBasicInfo","type":"rpc","tid":2,
        "data":[34,"bar"] // note the order of the params
    }
]
 * </code></pre>
 * The form will process a data packet returned by the server that is similar
 * to the following format:
 * <pre><code>
[
    {
        "action":"Profile","method":"getBasicInfo","type":"rpc","tid":2,
        "result":{
            "success":true,
            "data":{
                "name":"Fred Flintstone",
                "company":"Slate Rock and Gravel",
                "email":"fred.flintstone@slaterg.com"
            }
        }
    }
]
 * </code></pre>
 */
Ext.form.Action.DirectLoad = Ext.extend(Ext.form.Action.Load, {
    constructor: function(form, opts) {
        Ext.form.Action.DirectLoad.superclass.constructor.call(this, form, opts);
    },
    type : 'directload',

    run : function(){
        var args = this.getParams();
        args.push(this.success, this);
        this.form.api.load.apply(window, args);
    },

    getParams : function() {
        var buf = [], o = {};
        var bp = this.form.baseParams;
        var p = this.options.params;
        Ext.apply(o, p, bp);
        var paramOrder = this.form.paramOrder;
        if(paramOrder){
            for(var i = 0, len = paramOrder.length; i < len; i++){
                buf.push(o[paramOrder[i]]);
            }
        }else if(this.form.paramsAsHash){
            buf.push(o);
        }
        return buf;
    },
    // Direct actions have already been processed and therefore
    // we can directly set the result; Direct Actions do not have
    // a this.response property.
    processResponse : function(result) {
        this.result = result;
        return result;
    },

    success : function(response, trans){
        if(trans.type == Ext.Direct.exceptions.SERVER){
            response = {};
        }
        Ext.form.Action.DirectLoad.superclass.success.call(this, response);
    }
});

/**
 * @class Ext.form.Action.DirectSubmit
 * @extends Ext.form.Action.Submit
 * <p>Provides Ext.direct support for submitting form data.</p>
 * <p>This example illustrates usage of Ext.Direct to <b>submit</b> a form through Ext.Direct.</p>
 * <pre><code>
var myFormPanel = new Ext.form.FormPanel({
    // configs for FormPanel
    title: 'Basic Information',
    renderTo: document.body,
    width: 300, height: 160,
    padding: 10,
    buttons:[{
        text: 'Submit',
        handler: function(){
            myFormPanel.getForm().submit({
                params: {
                    foo: 'bar',
                    uid: 34
                }
            });
        }
    }],

    // configs apply to child items
    defaults: {anchor: '100%'},
    defaultType: 'textfield',
    items: [{
        fieldLabel: 'Name',
        name: 'name'
    },{
        fieldLabel: 'Email',
        name: 'email'
    },{
        fieldLabel: 'Company',
        name: 'company'
    }],

    // configs for BasicForm
    api: {
        // The server-side method to call for load() requests
        load: Profile.getBasicInfo,
        // The server-side must mark the submit handler as a 'formHandler'
        submit: Profile.updateBasicInfo
    },
    // specify the order for the passed params
    paramOrder: ['uid', 'foo']
});
 * </code></pre>
 * The data packet sent to the server will resemble something like:
 * <pre><code>
{
    "action":"Profile","method":"updateBasicInfo","type":"rpc","tid":"6",
    "result":{
        "success":true,
        "id":{
            "extAction":"Profile","extMethod":"updateBasicInfo",
            "extType":"rpc","extTID":"6","extUpload":"false",
            "name":"Aaron Conran","email":"aaron@extjs.com","company":"Ext JS, LLC"
        }
    }
}
 * </code></pre>
 * The form will process a data packet returned by the server that is similar
 * to the following:
 * <pre><code>
// sample success packet (batched requests)
[
    {
        "action":"Profile","method":"updateBasicInfo","type":"rpc","tid":3,
        "result":{
            "success":true
        }
    }
]

// sample failure packet (one request)
{
        "action":"Profile","method":"updateBasicInfo","type":"rpc","tid":"6",
        "result":{
            "errors":{
                "email":"already taken"
            },
            "success":false,
            "foo":"bar"
        }
}
 * </code></pre>
 * Also see the discussion in {@link Ext.form.Action.DirectLoad}.
 */
Ext.form.Action.DirectSubmit = Ext.extend(Ext.form.Action.Submit, {
    constructor : function(form, opts) {
        Ext.form.Action.DirectSubmit.superclass.constructor.call(this, form, opts);
    },
    type : 'directsubmit',
    // override of Submit
    run : function(){
        var o = this.options;
        if(o.clientValidation === false || this.form.isValid()){
            // tag on any additional params to be posted in the
            // form scope
            this.success.params = this.getParams();
            this.form.api.submit(this.form.el.dom, this.success, this);
        }else if (o.clientValidation !== false){ // client validation failed
            this.failureType = Ext.form.Action.CLIENT_INVALID;
            this.form.afterAction(this, false);
        }
    },

    getParams : function() {
        var o = {};
        var bp = this.form.baseParams;
        var p = this.options.params;
        Ext.apply(o, p, bp);
        return o;
    },
    // Direct actions have already been processed and therefore
    // we can directly set the result; Direct Actions do not have
    // a this.response property.
    processResponse : function(result) {
        this.result = result;
        return result;
    },

    success : function(response, trans){
        if(trans.type == Ext.Direct.exceptions.SERVER){
            response = {};
        }
        Ext.form.Action.DirectSubmit.superclass.success.call(this, response);
    }
});

Ext.form.Action.ACTION_TYPES = {
    'load' : Ext.form.Action.Load,
    'submit' : Ext.form.Action.Submit,
    'directload' : Ext.form.Action.DirectLoad,
    'directsubmit' : Ext.form.Action.DirectSubmit
};
/**
 * @class Ext.form.VTypes
 * <p>This is a singleton object which contains a set of commonly used field validation functions.
 * The validations provided are basic and intended to be easily customizable and extended.</p>
 * <p>To add custom VTypes specify the <code>{@link Ext.form.TextField#vtype vtype}</code> validation
 * test function, and optionally specify any corresponding error text to display and any keystroke
 * filtering mask to apply. For example:</p>
 * <pre><code>
// custom Vtype for vtype:'time'
var timeTest = /^([1-9]|1[0-9]):([0-5][0-9])(\s[a|p]m)$/i;
Ext.apply(Ext.form.VTypes, {
    //  vtype validation function
    time: function(val, field) {
        return timeTest.test(val);
    },
    // vtype Text property: The error text to display when the validation function returns false
    timeText: 'Not a valid time.  Must be in the format "12:34 PM".',
    // vtype Mask property: The keystroke filter mask
    timeMask: /[\d\s:amp]/i
});
 * </code></pre>
 * Another example:
 * <pre><code>
// custom Vtype for vtype:'IPAddress'
Ext.apply(Ext.form.VTypes, {
    IPAddress:  function(v) {
        return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v);
    },
    IPAddressText: 'Must be a numeric IP address',
    IPAddressMask: /[\d\.]/i
});
 * </code></pre>
 * @singleton
 */
Ext.form.VTypes = function(){
    // closure these in so they are only created once.
    var alpha = /^[a-zA-Z_]+$/,
        alphanum = /^[a-zA-Z0-9_]+$/,
        email = /^(\w+)([\-+.][\w]+)*@(\w[\-\w]*\.){1,5}([A-Za-z]){2,6}$/,
        url = /(((^https?)|(^ftp)):\/\/([\-\w]+\.)+\w{2,3}(\/[%\-\w]+(\.\w{2,})?)*(([\w\-\.\?\\\/+@&#;`~=%!]*)(\.\w{2,})?)*\/?)/i;

    // All these messages and functions are configurable
    return {
        /**
         * The function used to validate email addresses.  Note that this is a very basic validation -- complete
         * validation per the email RFC specifications is very complex and beyond the scope of this class, although
         * this function can be overridden if a more comprehensive validation scheme is desired.  See the validation
         * section of the <a href="http://en.wikipedia.org/wiki/E-mail_address">Wikipedia article on email addresses</a>
         * for additional information.  This implementation is intended to validate the following emails:<tt>
         * 'barney@example.de', 'barney.rubble@example.com', 'barney-rubble@example.coop', 'barney+rubble@example.com'
         * </tt>.
         * @param {String} value The email address
         * @return {Boolean} true if the RegExp test passed, and false if not.
         */
        'email' : function(v){
            return email.test(v);
        },
        /**
         * The error text to display when the email validation function returns false.  Defaults to:
         * <tt>'This field should be an e-mail address in the format "user@example.com"'</tt>
         * @type String
         */
        'emailText' : 'This field should be an e-mail address in the format "user@example.com"',
        /**
         * The keystroke filter mask to be applied on email input.  See the {@link #email} method for
         * information about more complex email validation. Defaults to:
         * <tt>/[a-z0-9_\.\-@]/i</tt>
         * @type RegExp
         */
        'emailMask' : /[a-z0-9_\.\-@\+]/i,

        /**
         * The function used to validate URLs
         * @param {String} value The URL
         * @return {Boolean} true if the RegExp test passed, and false if not.
         */
        'url' : function(v){
            return url.test(v);
        },
        /**
         * The error text to display when the url validation function returns false.  Defaults to:
         * <tt>'This field should be a URL in the format "http:/'+'/www.example.com"'</tt>
         * @type String
         */
        'urlText' : 'This field should be a URL in the format "http:/'+'/www.example.com"',

        /**
         * The function used to validate alpha values
         * @param {String} value The value
         * @return {Boolean} true if the RegExp test passed, and false if not.
         */
        'alpha' : function(v){
            return alpha.test(v);
        },
        /**
         * The error text to display when the alpha validation function returns false.  Defaults to:
         * <tt>'This field should only contain letters and _'</tt>
         * @type String
         */
        'alphaText' : 'This field should only contain letters and _',
        /**
         * The keystroke filter mask to be applied on alpha input.  Defaults to:
         * <tt>/[a-z_]/i</tt>
         * @type RegExp
         */
        'alphaMask' : /[a-z_]/i,

        /**
         * The function used to validate alphanumeric values
         * @param {String} value The value
         * @return {Boolean} true if the RegExp test passed, and false if not.
         */
        'alphanum' : function(v){
            return alphanum.test(v);
        },
        /**
         * The error text to display when the alphanumeric validation function returns false.  Defaults to:
         * <tt>'This field should only contain letters, numbers and _'</tt>
         * @type String
         */
        'alphanumText' : 'This field should only contain letters, numbers and _',
        /**
         * The keystroke filter mask to be applied on alphanumeric input.  Defaults to:
         * <tt>/[a-z0-9_]/i</tt>
         * @type RegExp
         */
        'alphanumMask' : /[a-z0-9_]/i
    };
}();
