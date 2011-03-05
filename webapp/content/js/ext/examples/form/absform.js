/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function() {
    var form = new Ext.form.FormPanel({
        baseCls: 'x-plain',
        layout:'absolute',
        url:'save-form.php',
        defaultType: 'textfield',

        items: [{
            x: 0,
            y: 5,
            xtype:'label',
            text: 'Send To:'
        },{
            x: 60,
            y: 0,
            name: 'to',
            anchor:'100%'  // anchor width by percentage
        },{
            x: 0,
            y: 35,
            xtype:'label',
            text: 'Subject:'
        },{
            x: 60,
            y: 30,
            name: 'subject',
            anchor: '100%'  // anchor width by percentage
        },{
            x:0,
            y: 60,
            xtype: 'textarea',
            name: 'msg',
            anchor: '100% 100%'  // anchor width and height
        }]
    });

    var window = new Ext.Window({
        title: 'Resize Me',
        width: 500,
        height:300,
        minWidth: 300,
        minHeight: 200,
        layout: 'fit',
        plain:true,
        bodyStyle:'padding:5px;',
        buttonAlign:'center',
        items: form,

        buttons: [{
            text: 'Send'
        },{
            text: 'Cancel'
        }]
    });

    window.show();
});