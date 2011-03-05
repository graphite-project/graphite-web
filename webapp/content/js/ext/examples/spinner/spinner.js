/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){
    var simple = new Ext.FormPanel({
        labelWidth: 40, // label settings here cascade unless overridden
        frame: true,
        title: 'Simple Form',
        bodyStyle: 'padding:5px 5px 0',
        width: 210,
        defaults: {width: 135},
        defaultType: 'textfield',

        items: [
            new Ext.ux.form.SpinnerField({
                fieldLabel: 'Age',
                name: 'age'
            }),
            {
            	xtype: 'spinnerfield',
            	fieldLabel: 'Test',
            	name: 'test',
            	minValue: 0,
            	maxValue: 100,
            	allowDecimals: true,
            	decimalPrecision: 1,
            	incrementValue: 0.4,
            	alternateIncrementValue: 2.1,
            	accelerate: true
            }
        ]
    });

    simple.render('form-ct');
});
