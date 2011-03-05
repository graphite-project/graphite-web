/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
FeedViewer = {};

Ext.onReady(function(){
    Ext.QuickTips.init();

    Ext.state.Manager.setProvider(new Ext.state.SessionProvider({state: Ext.appState}));

    var tpl = Ext.Template.from('preview-tpl', {
        compiled:true,
        getBody : function(v, all){
            return Ext.util.Format.stripScripts(v || all.description);
        }
    });
    FeedViewer.getTemplate = function(){
        return tpl;
    }

    var feeds = new FeedPanel();
    var mainPanel = new MainPanel();

    feeds.on('feedselect', function(feed){
        mainPanel.loadFeed(feed);
    });
    
    var viewport = new Ext.Viewport({
        layout:'border',
        items:[
            new Ext.BoxComponent({ // raw element
                region:'north',
                el: 'header',
                height:32
            }),
            feeds,
            mainPanel
         ]
    });

    // add some default feeds
    feeds.addFeed({
        url:'http://feeds.feedburner.com/extblog',
        text: 'ExtJS.com Blog'
    }, false, true);

    feeds.addFeed({
        url:'http://extjs.com/forum/external.php?type=RSS2',
        text: 'ExtJS.com Forums'
    }, true);

    feeds.addFeed({
        url:'http://feeds.feedburner.com/ajaxian',
        text: 'Ajaxian'
    }, true);
    
    Ext.get('header').on('click', function() {
        viewport.focus();
    });
    
    feeds.focus();
});

// This is a custom event handler passed to preview panels so link open in a new windw
FeedViewer.LinkInterceptor = {
    render: function(p){
        p.body.on({
            'mousedown': function(e, t){ // try to intercept the easy way
                t.target = '_blank';
            },
            'click': function(e, t){ // if they tab + enter a link, need to do it old fashioned way
                if(String(t.target).toLowerCase() != '_blank'){
                    e.stopEvent();
                    window.open(t.href);
                }
            },
            delegate:'a'
        });
    }
};