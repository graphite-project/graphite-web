/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.ns('Ext.app');

Ext.app.ContactForm = Ext.extend(Ext.FormPanel, {
    formTitle: 'Contact Information (English)',
    firstName: 'First Name',
    lastName: 'Surname',
    surnamePrefix: 'Surname Prefix',
    company: 'Company',
    state: 'State',
    stateEmptyText: 'Choose a state...',
    email: 'E-mail',
    birth: 'Date of Birth',
    save: 'Save',
    cancel: 'Cancel',
    
    initComponent : function(config) {
        Ext.apply(this, {
            labelWidth: 100, // label settings here cascade unless overridden
            url:'save-form.php',
            frame:true,
            title: this.formTitle,
            bodyStyle:'padding:5px 5px 0',
            width: 370,
            defaults: {width: 220},
            defaultType: 'textfield',
    
            items: [{
                    fieldLabel: this.firstName,
                    name: 'firstname',
                    allowBlank:false
                },{
                    fieldLabel: this.lastName,
                    name: 'lastName'
                },{
                    fieldLabel: this.surnamePrefix,
                    width: 50,
                    name: 'surnamePrefix'
                },{
                    fieldLabel: this.company,
                    name: 'company'
                },  new Ext.form.ComboBox({
                    fieldLabel: this.province,
                    hiddenName: 'state',
                    store: new Ext.data.ArrayStore({
                        fields: ['provincie'],
                        data : Ext.exampledata.dutch_provinces // from dutch-provinces.js
                    }),
                    displayField: 'provincie',
                    typeAhead: true,
                    mode: 'local',
                    triggerAction: 'all',
                    emptyText: this.stateEmtyText,
                    selectOnFocus:true,
                    width:190
                }), {
                    fieldLabel: this.email,
                    name: 'email',
                    vtype:'email'
                }, new Ext.form.DateField({
                    fieldLabel: this.birth,
                    name: 'birth'
                })
            ],
    
            buttons: [{
                text: this.save
            },{
                text: this.cancel
            }]
        });
        
        Ext.app.ContactForm.superclass.initComponent.apply(this, arguments);
    }
});

Ext.onReady(function(){
    Ext.QuickTips.init();

    // turn on validation errors beside the field globally
    Ext.form.Field.prototype.msgTarget = 'side';
    
    var bd = Ext.getBody();
    
    bd.createChild({tag: 'h2', html: 'Localized Contact Form'});
        
    // simple form
    var simple = new Ext.app.ContactForm();
    simple.render(document.body);
});