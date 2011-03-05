/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){

    Ext.QuickTips.init();
    
    // turn on validation errors beside the field globally
    Ext.form.Field.prototype.msgTarget = 'side';


    /*====================================================================
     * Individual checkbox/radio examples
     *====================================================================*/
    
    // Using checkbox/radio groups will generally be easier and more flexible than
    // using individual checkbox and radio controls, but this shows that you can
    // certainly do so if you only need a single control, or if you want to control  
    // exactly where each check/radio goes within your layout.
    var individual = [{
        bodyStyle: 'padding-right:5px;',
        items: {
            xtype: 'fieldset',
            title: 'Individual Checkboxes',
            autoHeight: true,
            defaultType: 'checkbox', // each item will be a checkbox
            items: [{
                xtype: 'textfield',
                name: 'txt-test1',
                fieldLabel: 'Alignment Test'
            }, {
                fieldLabel: 'Favorite Animals',
                boxLabel: 'Dog',
                name: 'fav-animal-dog'
            }, {
                fieldLabel: '',
                labelSeparator: '',
                boxLabel: 'Cat',
                name: 'fav-animal-cat'
            }, {
                checked: true,
                fieldLabel: '',
                labelSeparator: '',
                boxLabel: 'Monkey',
                name: 'fav-animal-monkey'
            }]
        }
    }, {
        bodyStyle: 'padding-left:5px;',
        items: {
            xtype: 'fieldset',
            title: 'Individual Radios',
            autoHeight: true,
            defaultType: 'radio', // each item will be a radio button
            items: [{
                xtype: 'textfield',
                name: 'txt-test2',
                fieldLabel: 'Alignment Test'
            }, {
                checked: true,
                fieldLabel: 'Favorite Color',
                boxLabel: 'Red',
                name: 'fav-color',
                inputValue: 'red'
            }, {
                fieldLabel: '',
                labelSeparator: '',
                boxLabel: 'Blue',
                name: 'fav-color',
                inputValue: 'blue'
            }, {
                fieldLabel: '',
                labelSeparator: '',
                boxLabel: 'Green',
                name: 'fav-color',
                inputValue: 'green'
            }]
        }
    }];
    
    /*====================================================================
     * CheckGroup example
     *====================================================================*/
    var checkGroup = {
        xtype: 'fieldset',
        title: 'Checkbox Groups (initially collapsed)',
        autoHeight: true,
        layout: 'form',
        collapsed: true,   // initially collapse the group
        collapsible: true,
        items: [{
            xtype: 'textfield',
            name: 'txt-test3',
            fieldLabel: 'Alignment Test',
            anchor: '95%'
        },{
            // Use the default, automatic layout to distribute the controls evenly
            // across a single row
            xtype: 'checkboxgroup',
            fieldLabel: 'Auto Layout',
            items: [
                {boxLabel: 'Item 1', name: 'cb-auto-1'},
                {boxLabel: 'Item 2', name: 'cb-auto-2', checked: true},
                {boxLabel: 'Item 3', name: 'cb-auto-3'},
                {boxLabel: 'Item 4', name: 'cb-auto-4'},
                {boxLabel: 'Item 5', name: 'cb-auto-5'}
            ]
        },{
            xtype: 'checkboxgroup',
            fieldLabel: 'Single Column',
            itemCls: 'x-check-group-alt',
            // Put all controls in a single column with width 100%
            columns: 1,
            items: [
                {boxLabel: 'Item 1', name: 'cb-col-1'},
                {boxLabel: 'Item 2', name: 'cb-col-2', checked: true},
                {boxLabel: 'Item 3', name: 'cb-col-3'}
            ]
        },{
            xtype: 'checkboxgroup',
            fieldLabel: 'Multi-Column (horizontal)',
            // Distribute controls across 3 even columns, filling each row
            // from left to right before starting the next row
            columns: 3,
            items: [
                {boxLabel: 'Item 1', name: 'cb-horiz-1'},
                {boxLabel: 'Item 2', name: 'cb-horiz-2', checked: true},
                {boxLabel: 'Item 3', name: 'cb-horiz-3'},
                {boxLabel: 'Item 4', name: 'cb-horiz-4'},
                {boxLabel: 'Item 5', name: 'cb-horiz-5'}
            ]
        },{
            xtype: 'checkboxgroup',
            fieldLabel: 'Multi-Column (vertical)',
            itemCls: 'x-check-group-alt',
            // Distribute controls across 3 even columns, filling each column
            // from top to bottom before starting the next column
            columns: 3,
            vertical: true,
            items: [
                {boxLabel: 'Item 1', name: 'cb-vert-1'},
                {boxLabel: 'Item 2', name: 'cb-vert-2', checked: true},
                {boxLabel: 'Item 3', name: 'cb-vert-3'},
                {boxLabel: 'Item 4', name: 'cb-vert-4'},
                {boxLabel: 'Item 5', name: 'cb-vert-5'}
            ]
        },{
            xtype: 'checkboxgroup',
            fieldLabel: 'Multi-Column<br />(custom widths)',
            // Specify exact column widths (could also include float values for %)
            columns: [100, 100],
            vertical: true,
            items: [
                {boxLabel: 'Item 1', name: 'cb-custwidth', inputValue: 1},
                {boxLabel: 'Item 2', name: 'cb-custwidth', inputValue: 2, checked: true},
                {boxLabel: 'Item 3', name: 'cb-custwidth', inputValue: 3},
                {boxLabel: 'Item 4', name: 'cb-custwidth', inputValue: 4},
                {boxLabel: 'Item 5', name: 'cb-custwidth', inputValue: 5}
            ]
        },{
            xtype: 'checkboxgroup',
            itemCls: 'x-check-group-alt',
            fieldLabel: 'Custom Layout<br />(w/ validation)',
            allowBlank: false,
            anchor: '95%',
            items: [{
                // You can pass sub-item arrays along with width/columnWidth configs 
                // ColumnLayout-style for complete layout control.  In this example we
                // only want one item in the middle column, which would not be possible
                // using the columns config.  We also want to make sure that our headings
                // end up at the top of each column as expected.
                columnWidth: '.25',
                items: [
                    {xtype: 'label', text: 'Heading 1', cls:'x-form-check-group-label', anchor:'-15'},
                    {boxLabel: 'Item 1', name: 'cb-cust-1'},
                    {boxLabel: 'Item 2', name: 'cb-cust-2'}
                ]
            },{
                columnWidth: '.5',
                items: [
                    {xtype: 'label', text: 'Heading 2', cls:'x-form-check-group-label', anchor:'-15'},
                    {boxLabel: 'A long item just for fun', name: 'cb-cust-3'}
                ]
            },{
                columnWidth: '.25',
                items: [
                    {xtype: 'label', text: 'Heading 3', cls:'x-form-check-group-label', anchor:'-15'},
                    {boxLabel: 'Item 4', name: 'cb-cust-4'},
                    {boxLabel: 'Item 5', name: 'cb-cust-5'}
                ]
            }]
        }]
    };
    
    /*====================================================================
     * RadioGroup examples
     *====================================================================*/
    // NOTE: These radio examples use the exact same options as the checkbox ones
    // above, so the comments will not be repeated.  Please see comments above for
    // additional explanation on some config options.
    
    var radioGroup = {
        
        xtype: 'fieldset',
        title: 'Radio Groups',
        autoHeight: true,
        items: [{
            xtype: 'textfield',
            name: 'txt-test4',
            fieldLabel: 'Alignment Test',
            anchor: '95%'
        },{
            xtype: 'radiogroup',
            fieldLabel: 'Auto Layout',
            items: [
                {boxLabel: 'Item 1', name: 'rb-auto', inputValue: 1},
                {boxLabel: 'Item 2', name: 'rb-auto', inputValue: 2, checked: true},
                {boxLabel: 'Item 3', name: 'rb-auto', inputValue: 3},
                {boxLabel: 'Item 4', name: 'rb-auto', inputValue: 4},
                {boxLabel: 'Item 5', name: 'rb-auto', inputValue: 5}
            ]
        },{
            xtype: 'radiogroup',
            fieldLabel: 'Single Column',
            itemCls: 'x-check-group-alt',
            columns: 1,
            items: [
                {boxLabel: 'Item 1', name: 'rb-col', inputValue: 1},
                {boxLabel: 'Item 2', name: 'rb-col', inputValue: 2, checked: true},
                {boxLabel: 'Item 3', name: 'rb-col', inputValue: 3}
            ]
        },{
            xtype: 'radiogroup',
            fieldLabel: 'Multi-Column<br />(horiz. auto-width)',
            columns: 3,
            items: [
                {boxLabel: 'Item 1', name: 'rb-horiz', inputValue: 1},
                {boxLabel: 'Item 2', name: 'rb-horiz', inputValue: 2, checked: true},
                {boxLabel: 'Item 3', name: 'rb-horiz', inputValue: 3},
                {boxLabel: 'Item 4', name: 'rb-horiz', inputValue: 4},
                {boxLabel: 'Item 5', name: 'rb-horiz', inputValue: 5}
            ]
        },{
            xtype: 'radiogroup',
            fieldLabel: 'Multi-Column<br />(vert. auto-width)',
            itemCls: 'x-check-group-alt',
            columns: 3,
            vertical: true,
            items: [
                {boxLabel: 'Item 1', name: 'rb-vert', inputValue: 1},
                {boxLabel: 'Item 2', name: 'rb-vert', inputValue: 2, checked: true},
                {boxLabel: 'Item 3', name: 'rb-vert', inputValue: 3},
                {boxLabel: 'Item 4', name: 'rb-vert', inputValue: 4},
                {boxLabel: 'Item 5', name: 'rb-vert', inputValue: 5}
            ]
        },{
            xtype: 'radiogroup',
            fieldLabel: 'Multi-Column<br />(custom widths)',
            columns: [100, 100],
            vertical: true,
            items: [
                {boxLabel: 'Item 1', name: 'rb-custwidth', inputValue: 1},
                {boxLabel: 'Item 2', name: 'rb-custwidth', inputValue: 2, checked: true},
                {boxLabel: 'Item 3', name: 'rb-custwidth', inputValue: 3},
                {boxLabel: 'Item 4', name: 'rb-custwidth', inputValue: 4},
                {boxLabel: 'Item 5', name: 'rb-custwidth', inputValue: 5}
            ]
        },{
            xtype: 'radiogroup',
            itemCls: 'x-check-group-alt',
            fieldLabel: 'Custom Layout<br />(w/ validation)',
            allowBlank: false,
            anchor: '95%',
            items: [{
                columnWidth: '.25',
                items: [
                    {xtype: 'label', text: 'Heading 1', cls:'x-form-check-group-label', anchor:'-15'},
                    {boxLabel: 'Item 1', name: 'rb-cust', inputValue: 1},
                    {boxLabel: 'Item 2', name: 'rb-cust', inputValue: 2}
                ]
            },{
                columnWidth: '.5',
                items: [
                    {xtype: 'label', text: 'Heading 2', cls:'x-form-check-group-label', anchor:'-15'},
                    {boxLabel: 'A long item just for fun', name: 'rb-cust', inputValue: 3}
                ]
            },{
                columnWidth: '.25',
                items: [
                    {xtype: 'label', text: 'Heading 3', cls:'x-form-check-group-label', anchor:'-15'},
                    {boxLabel: 'Item 4', name: 'rb-cust', inputValue: 4},
                    {boxLabel: 'Item 5', name: 'rb-cust', inputValue: 5}
                ]
            }]
        }]
    };
    
    // combine all that into one huge form
    var fp = new Ext.FormPanel({
        title: 'Check/Radio Groups Example',
        frame: true,
        labelWidth: 110,
        width: 600,
        renderTo:'form-ct',
        bodyStyle: 'padding:0 10px 0;',
        items: [
            {
                layout: 'column',
                border: false,
                // defaults are applied to all child items unless otherwise specified by child item
                defaults: {
                    columnWidth: '.5',
                    border: false
                },            
                items: individual
            },
            checkGroup,
            radioGroup
        ],
        buttons: [{
            text: 'Save',
            handler: function(){
               if(fp.getForm().isValid()){
                    Ext.Msg.alert('Submitted Values', 'The following will be sent to the server: <br />'+ 
                        fp.getForm().getValues(true).replace(/&/g,', '));
                }
            }
        },{
            text: 'Reset',
            handler: function(){
                fp.getForm().reset();
            }
        }]
    });
});