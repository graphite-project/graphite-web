/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.onReady(function(){
    var btn = Ext.get("create-grid");
    btn.on("click", function(){
        btn.dom.disabled = true;
        
        // create the grid
        var grid = new Ext.ux.grid.TableGrid("the-table", {
            stripeRows: true // stripe alternate rows
        });
        grid.render();
    }, false, {
        single: true
    }); // run once
});
