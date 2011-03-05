/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){
    var chooser, btn;

    function insertImage(data){
    	Ext.DomHelper.append('images', {
    		tag: 'img', src: data.url, style:'margin:10px;visibility:hidden;'
    	}, true).show(true).frame();
    	btn.focus();
    };

    function choose(btn){
    	if(!chooser){
    		chooser = new ImageChooser({
    			url:'get-images.php',
    			width:515,
    			height:350
    		});
    	}
    	chooser.show(btn.getEl(), insertImage);
    };

    btn = new Ext.Button({
	    text: "Insert Image",
		handler: choose,
        renderTo: 'buttons'
    });
});
