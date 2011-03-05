/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){

    // This is a shared function that simulates a load action on a StatusBar.
    // It is reused by most of the example panels.
    var loadFn = function(btn, statusBar){
        btn = Ext.getCmp(btn);
        statusBar = Ext.getCmp(statusBar);

        btn.disable();
        statusBar.showBusy();

        (function(){
            statusBar.clearStatus({useDefaults:true});
            btn.enable();
        }).defer(2000);
    };

/*
 * ================  Basic StatusBar example  =======================
 */
    new Ext.Panel({
        title: 'Basic StatusBar',
        renderTo: 'basic',
        width: 550,
        height: 100,
        bodyStyle: 'padding:10px;',
        items:[{
            xtype: 'button',
            id: 'basic-button',
            text: 'Do Loading',
            handler: loadFn.createCallback('basic-button', 'basic-statusbar')
        }],
        bbar: new Ext.ux.StatusBar({
            id: 'basic-statusbar',

            // defaults to use when the status is cleared:
            defaultText: 'Default status text',
            //defaultIconCls: 'default-icon',
        
            // values to set initially:
            text: 'Ready',
            iconCls: 'x-status-valid',

            // any standard Toolbar items:
            items: [
                {
                    text: 'Show Warning & Clear',
                    handler: function (){
                        var sb = Ext.getCmp('basic-statusbar');
                        sb.setStatus({
                            text: 'Oops!',
                            iconCls: 'x-status-error',
                            clear: true // auto-clear after a set interval
                        });
                    }
                },
                {
                    text: 'Show Busy',
                    handler: function (){
                        var sb = Ext.getCmp('basic-statusbar');
                        // Set the status bar to show that something is processing:
                        sb.showBusy();
                    }
                },
                {
                    text: 'Clear status',
                    handler: function (){
                        var sb = Ext.getCmp('basic-statusbar');
                        // once completed
                        sb.clearStatus(); 
                    }
                },
                '-',
                'Plain Text'
            ]
        })
    });

/*
 * ================  Right-aligned StatusBar example  =======================
 */
    new Ext.Panel({
        title: 'Right-aligned StatusBar',
        renderTo: 'right-aligned',
        width: 550,
        height: 100,
        bodyStyle: 'padding:10px;',
        items:[{
            xtype: 'button',
            id: 'right-button',
            text: 'Do Loading',
            handler: loadFn.createCallback('right-button', 'right-statusbar')
        }],
        bbar: new Ext.ux.StatusBar({
            defaultText: 'Default status',
            id: 'right-statusbar',
            statusAlign: 'right', // the magic config
            items: [{
                text: 'A Button'
            }, '-', 'Plain Text', ' ', ' ']
        })
    });

/*
 * ================  StatusBar Window example  =======================
 */
    var win = new Ext.Window({
        title: 'StatusBar Window',
        width: 400,
        minWidth: 350,
        height: 150,
        modal: true,
        closeAction: 'hide',
        bodyStyle: 'padding:10px;',
        items:[{
            xtype: 'button',
            id: 'win-button',
            text: 'Do Loading',
            handler: loadFn.createCallback('win-button', 'win-statusbar')
        }],
        bbar: new Ext.ux.StatusBar({
            id: 'win-statusbar',
            defaultText: 'Ready',
            items: [{
                text: 'A Button'
            }, '-',
            new Date().format('n/d/Y'), ' ', ' ', '-', {
                xtype:'tbsplit',
                text:'Status Menu',
                menuAlign: 'br-tr?',
                menu: new Ext.menu.Menu({
                    items: [{text: 'Item 1'}, {text: 'Item 2'}]
                })
            }]
        })
    });

    new Ext.Button({
        text: 'Show Window',
        renderTo: 'window',
        handler: function(){
            win.show();
        }
    });

/*
 * ================  Ext Word Processor example  =======================
 *
 * The StatusBar used in this example is completely standard.  What is
 * customized are the styles and event handling to make the example a
 * lot more dynamic and application-oriented.
 *
 */
    // Create these explicitly so we can manipulate them later
    var wordCount = new Ext.Toolbar.TextItem('Words: 0');
    var charCount = new Ext.Toolbar.TextItem('Chars: 0');
    var clock = new Ext.Toolbar.TextItem('');

    new Ext.Panel({
        title: 'Ext Word Processor',
        renderTo: 'word-proc',
        width: 500,
        autoHeight: true,
        bodyStyle: 'padding:5px;',
        layout: 'fit',
        bbar: new Ext.ux.StatusBar({
            id: 'word-status',
            // These are just the standard toolbar TextItems we created above.  They get
            // custom classes below in the render handler which is what gives them their
            // customized inset appearance.
            items: [wordCount, ' ', charCount, ' ', clock, ' ']
        }),
        items: {
            xtype: 'textarea',
            id: 'word-textarea',
            enableKeyEvents: true,
            grow: true,
            growMin: 100,
            growMax: 200,
            listeners: {
                // After each keypress update the word and character count text items
                'keypress': {
                    fn: function(t){
                        var v = t.getValue(),
                            wc = 0, cc = v.length ? v.length : 0;

                        if(cc > 0){
                            wc = v.match(/\b/g);
                            wc = wc ? wc.length / 2 : 0;
                        }
	                    Ext.fly(wordCount.getEl()).update('Words: '+wc);
                        Ext.fly(charCount.getEl()).update('Chars: '+cc);
	                },
                    buffer: 1 // buffer to allow the value to update first
                }
            }
        },
        listeners: {
            render: {
                fn: function(){
                    // Add a class to the parent TD of each text item so we can give them some custom inset box
                    // styling. Also, since we are using a greedy spacer, we have to add a block level element
                    // into each text TD in order to give them a fixed width (TextItems are spans).  Insert a
                    // spacer div into each TD using createChild() so that we can give it a width in CSS.
                    Ext.fly(wordCount.getEl().parent()).addClass('x-status-text-panel').createChild({cls:'spacer'});
                    Ext.fly(charCount.getEl().parent()).addClass('x-status-text-panel').createChild({cls:'spacer'});
                    Ext.fly(clock.getEl().parent()).addClass('x-status-text-panel').createChild({cls:'spacer'});

                    // Kick off the clock timer that updates the clock el every second:
				    Ext.TaskMgr.start({
				        run: function(){
				            Ext.fly(clock.getEl()).update(new Date().format('g:i:s A'));
				        },
				        interval: 1000
				    });
                },
                delay: 100
            }
        }
    });

    // This sets up a fake auto-save function.  It monitors keyboard activity and after no typing
    // has occurred for 1.5 seconds, it updates the status message to indicate that it's saving.
    // After a fake delay so that you can see the save activity it will update again to indicate
    // that the action succeeded.
    Ext.fly('word-textarea').on('keypress', function(){
        var sb = Ext.getCmp('word-status');
        sb.showBusy('Saving draft...');
        (function(){
            sb.setStatus({
                iconCls: 'x-status-saved',
                text: 'Draft auto-saved at ' + new Date().format('g:i:s A')
            });
        }).defer(4000);
    }, this, {buffer:1500});

});