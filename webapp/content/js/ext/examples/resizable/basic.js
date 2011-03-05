/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
var ResizableExample = {
    init : function(){
        
        var basic = new Ext.Resizable('basic', {
                width: 200,
                height: 100,
                minWidth:100,
                minHeight:50
        });
        
        var animated = new Ext.Resizable('animated', {
                width: 200,
                pinned: true,
                height: 100,
                minWidth:100,
                minHeight:50,
                animate:true,
                easing: 'backIn',
                duration:.6
        });
        
        var wrapped = new Ext.Resizable('wrapped', {
            wrap:true,
            pinned:true,
            minWidth:50,
            minHeight: 50,
            preserveRatio: true
        });
        
        var transparent = new Ext.Resizable('transparent', {
            wrap:true,
            minWidth:50,
            minHeight: 50,
            preserveRatio: true,
            transparent:true
        });
        
        var custom = new Ext.Resizable('custom', {
            wrap:true,
            pinned:true,
            minWidth:50,
            minHeight: 50,
            preserveRatio: true,
            handles: 'all',
            draggable:true,
            dynamic:true
        });
        var customEl = custom.getEl();
        // move to the body to prevent overlap on my blog
        document.body.insertBefore(customEl.dom, document.body.firstChild);
        
        customEl.on('dblclick', function(){
            customEl.hide(true);
        });
        customEl.hide();
        
        Ext.get('showMe').on('click', function(){
            customEl.center();
            customEl.show(true);
        });
        
        var dwrapped = new Ext.Resizable('dwrapped', {
            wrap:true,
            pinned:true,
            width:450,
            height:150,
            minWidth:200,
            minHeight: 50,
            dynamic: true
        });
        
        var snap = new Ext.Resizable('snap', {
            pinned:true,
            width:250,
            height:100,
            handles: 'e',
            widthIncrement:50,
            minWidth: 50,
            dynamic: true
        });
    }
};

Ext.EventManager.onDocumentReady(ResizableExample.init, ResizableExample, true);