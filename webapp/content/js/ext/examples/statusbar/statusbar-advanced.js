/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.QuickTips.init();

Ext.onReady(function(){

    var fp = new Ext.FormPanel({
        id: 'status-form',
        renderTo: Ext.getBody(),
        labelWidth: 75,
        width: 350,
        buttonAlign: 'right',
        border: false,
        bodyStyle: 'padding:10px 10px 0;',
        defaults: {
            anchor: '95%',
            allowBlank: false,
            selectOnFocus: true,
            msgTarget: 'side'
        },
        items:[{
            xtype: 'textfield',
            fieldLabel: 'Name',
            blankText: 'Name is required'
        },{
            xtype: 'datefield',
            fieldLabel: 'Birthdate',
            blankText: 'Birthdate is required'
        }],
        buttons: [{
            text: 'Save',
            handler: function(){
                if(fp.getForm().isValid()){
                    var sb = Ext.getCmp('form-statusbar');
                    sb.showBusy('Saving form...');
                    fp.getEl().mask();
                    fp.getForm().submit({
                        url: 'fake.php',
                        success: function(){
                            sb.setStatus({
                                text:'Form saved!',
                                iconCls:'',
                                clear: true
                            });
                            fp.getEl().unmask();
                        }
                    });
                }
            }
        }]
    });

    new Ext.Panel({
        title: 'StatusBar with Integrated Form Validation',
        renderTo: Ext.getBody(),
        width: 350,
        autoHeight: true,
        layout: 'fit',
        items: fp,
        bbar: new Ext.ux.StatusBar({
            id: 'form-statusbar',
            defaultText: 'Ready',
            plugins: new Ext.ux.ValidationStatus({form:'status-form'})
        })
    });

});