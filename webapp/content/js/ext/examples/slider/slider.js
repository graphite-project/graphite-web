/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){

    new Ext.Slider({
        renderTo: 'basic-slider',
        width: 214,
        minValue: 0,
        maxValue: 100
    });

    new Ext.Slider({
        renderTo: 'increment-slider',
        width: 214,
        value:50,
        increment: 10,
        minValue: 0,
        maxValue: 100
    });

    new Ext.Slider({
        renderTo: 'vertical-slider',
        height: 214,
        vertical: true,
        minValue: 0,
        maxValue: 100
    });

    new Ext.Slider({
        renderTo: 'tip-slider',
        width: 214,
        minValue: 0,
        maxValue: 100,
        plugins: new Ext.slider.Tip()
    });

    var tip = new Ext.slider.Tip({
        getText: function(thumb){
            return String.format('<b>{0}% complete</b>', thumb.value);
        }
    });

    new Ext.Slider({
        renderTo: 'custom-tip-slider',
        width: 214,
        increment: 10,
        minValue: 0,
        maxValue: 100,
        plugins: tip
    });

    new Ext.Slider({
        renderTo: 'custom-slider',
        width: 214,
        increment: 10,
        minValue: 0,
        maxValue: 100,
        plugins: new Ext.slider.Tip()
    });
    
    new Ext.slider.MultiSlider({
        renderTo: 'multi-slider-horizontal',
        width   : 214,
        minValue: 0,
        maxValue: 100,
        values  : [10, 50, 90],
        plugins : new Ext.slider.Tip()
    });
    
    new Ext.slider.MultiSlider({
        renderTo : 'multi-slider-vertical',
        vertical : true,
        height   : 214,
        minValue: 0,
        maxValue: 100,
        values  : [10, 50, 90],
        plugins : new Ext.slider.Tip()
    });
});
