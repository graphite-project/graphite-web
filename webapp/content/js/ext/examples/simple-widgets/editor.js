/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){
    var ct = new Ext.form.FormPanel({
        renderTo: 'container',
        width: 700,
        height: 400,
        title: 'User Details',
        defaultType: 'textfield',
        padding: 10,
        labelWidth: 90,
        items: [{
            fieldLabel: 'First Name'
        }, {
            fieldLabel: 'Middle Name'
        }, {
            fieldLabel: 'Last Name'
        }, {
            xtype: 'datefield',
            fieldLabel: 'D.O.B'
        }],
        listeners: {
            afterrender: function(form){
                var cfg = {
                    shadow: false,
                    completeOnEnter: true,
                    cancelOnEsc: true,
                    updateEl: true,
                    ignoreNoChange: true
                };

                var labelEditor = new Ext.Editor(Ext.apply({
                    alignment: 'l-l',
                    listeners: {
                        beforecomplete: function(ed, value){
                            if(value.charAt(value.length - 1) != ':'){
                                ed.setValue(ed.getValue() + ':');
                            }
                            return true;
                        },
                        complete: function(ed, value, oldValue){
                            Ext.example.msg('Label Changed', '"{0}" changed to "{1}"', oldValue, value);
                        }
                    },
                    field: {
                        allowBlank: false,
                        xtype: 'textfield',
                        width: 90,
                        selectOnFocus: true
                    }
                }, cfg));
                form.body.on('dblclick', function(e, t){
                    labelEditor.startEdit(t);
                }, null, {
                    delegate: 'label.x-form-item-label'
                });

                var titleEditor = new Ext.Editor(Ext.apply({
                    cls: 'x-small-editor',
                    alignment: 'bl-bl?',
                    offsets: [0, 3],
                    listeners: {
                        complete: function(ed, value, oldValue){
                            Ext.example.msg('Title Changed', '"{0}" changed to "{1}"', oldValue, value);
                        }
                    },
                    field: {
                        width: 110,
                        triggerAction: 'all',
                        xtype: 'combo',
                        editable: false,
                        forceSelection: true,
                        store: ['User Details', 'Developer Details', 'Manager Details']
                    }
                }, cfg));

                form.header.child('.x-panel-header-text').on('dblclick', function(e, t){
                    titleEditor.startEdit(t);
                });
            }
        }
    });
});