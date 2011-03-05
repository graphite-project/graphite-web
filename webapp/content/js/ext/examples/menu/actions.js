/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){
    // The action
    var action = new Ext.Action({
        text: 'Action 1',
        handler: function(){
            Ext.example.msg('Click','You clicked on "Action 1".');
        },
        iconCls: 'blist'
    });


    var panel = new Ext.Panel({
        title: 'Actions',
        width:600,
        height:300,
        bodyStyle: 'padding:10px;',     // lazy inline style

        tbar: [
            action, {                   // <-- Add the action directly to a toolbar
                text: 'Action Menu',
                menu: [action]          // <-- Add the action directly to a menu
            }
        ],

        items: [
           new Ext.Button(action)       // <-- Add the action as a button
        ],

        renderTo: Ext.getBody()
    });

    var tb = panel.getTopToolbar();
    // Buttons added to the toolbar of the Panel above
    // to test/demo doing group operations with an action
    tb.add('->', {
        text: 'Disable',
        handler: function(){
            action.setDisabled(!action.isDisabled());
            this.setText(action.isDisabled() ? 'Enable' : 'Disable');
        }
    }, {
        text: 'Change Text',
        handler: function(){
            Ext.Msg.prompt('Enter Text', 'Enter new text for Action 1:', function(btn, text){
                if(btn == 'ok' && text){
                    action.setText(text);
                    action.setHandler(function(){
                        Ext.example.msg('Click','You clicked on "'+text+'".');
                    });
                }
            });
        }
    }, {
        text: 'Change Icon',
        handler: function(){
            action.setIconClass(action.getIconClass() == 'blist' ? 'bmenu' : 'blist');
        }
    });
    tb.doLayout();
});