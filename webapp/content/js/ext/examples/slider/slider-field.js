/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){
    var form = new Ext.form.FormPanel({
        width : 400,
        height: 160,
        title : 'Sound Settings',
        
        bodyStyle  : 'padding: 10px;',
        renderTo   : 'container',
        defaultType: 'sliderfield',
        buttonAlign: 'left',
        
        defaults: {
            anchor: '95%',
            tipText: function(thumb){
                return String(thumb.value) + '%';
            } 
        },
        items: [{
            fieldLabel: 'Sound Effects',
            value: 50,
            name: 'fx'
        },{
            fieldLabel: 'Ambient Sounds',
            value: 80,
            name: 'ambient'
        },{
            fieldLabel: 'Interface Sounds',
            value: 25,
            name: 'iface'
        }],
        fbar: {
            xtype: 'toolbar',
            items: [{
                text: 'Max All',
                handler: function(){
                    form.items.each(function(c){
                        c.setValue(100);
                    });
                }
            }, '->', {
                text: 'Save',
                handler: function(){
                    var values = form.getForm().getValues(),
                        s = ['Sounds Effects: <b>{0}%</b>',
                            'Ambient Sounds: <b>{1}%</b>',
                            'Interface Sounds: <b>{2}%</b>'];
                            
                    Ext.example.msg('Settings Saved', s.join('<br />'), values.fx, values.ambient, values.iface);
                }
            },{
                text: 'Reset',
                handler: function(){
                    form.getForm().reset();
                }
            }]
        }
    });
});
