/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){   
    var title = new Ext.ux.BubblePanel({
	bodyStyle: 'padding-left: 8px;color: #0d2a59',
	renderTo: 'bubbleCt',
	html: '<h3>Ext.ux.BubblePanel</h3',
	width: 200,
	autoHeight: true
    });
    var cp = new Ext.ux.BubblePanel({
	renderTo: 'bubbleCt',
	padding: 5,
	width: 400,
	autoHeight: true,
	contentEl: 'bubble-markup'
    });

    var plainOldPanel = new Ext.Panel({
        renderTo: 'panelCt',
	padding: 5,
	frame: true,
	width: 400,
	autoHeight: true,
	title: 'Plain Old Panel',
	html: Ext.example.bogusMarkup
    });

});


