/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){

    var spot = new Ext.ux.Spotlight({
        easing: 'easeOut',
        duration: .3
    });

    var DemoPanel = Ext.extend(Ext.Panel, {
        title: 'Demo Panel',
        frame: true,
        width: 200,
        height: 150,
        html: 'Some panel content goes here!',
        bodyStyle: 'padding:10px 15px;',

        toggle: function(on){
            this.buttons[0].setDisabled(!on);
        }
    });

    var p1, p2, p3;
    var updateSpot = function(id){
        if(typeof id == 'string'){
            spot.show(id);
        }else if (!id && spot.active){
            spot.hide();
        }
        p1.toggle(id==p1.id);
        p2.toggle(id==p2.id);
        p3.toggle(id==p3.id);
    };

    new Ext.Panel({
        renderTo: Ext.getBody(),
        layout: 'table',
        id: 'demo-ct',
        border: false,
        layoutConfig: {
            columns: 3
        },
        items: [p1 = new DemoPanel({
            id: 'panel1',
            buttons: [{
                text: 'Next Panel',
                handler: updateSpot.createDelegate(this, ['panel2'])
            }]
        }),
        p2 = new DemoPanel({
            id: 'panel2',
            buttons: [{
                text: 'Next Panel',
                handler: updateSpot.createDelegate(this, ['panel3'])
            }]
        }),
        p3 = new DemoPanel({
            id: 'panel3',
            buttons: [{
                text: 'Done',
                handler: updateSpot.createDelegate(this, [false])
            }]
        })]
    });

    new Ext.Button({
        text: 'Start',
        renderTo: 'start-ct',
        handler: updateSpot.createDelegate(this, ['panel1'])
    });

    updateSpot(false);
});