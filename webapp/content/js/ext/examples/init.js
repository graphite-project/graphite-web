/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.ns('Ext.samples');

(function() {

SamplePanel = Ext.extend(Ext.DataView, {
    autoHeight   : true,
    frame        : true,
    cls          : 'demos',
    itemSelector : 'dd',
    overClass    : 'over',
    tpl          : new Ext.XTemplate(
        '<div id="sample-ct">',
            '<tpl for=".">',
            '<div><a name="{id}"></a><h2><div>{title}</div></h2>',
            '<dl>',
                '<tpl for="samples">',
                    '<dd ext:url="{url}"><img src="shared/screens/{icon}"/>',
                        '<div><h4>{text}',
                            '<tpl if="this.isNew(values.status)">',
                                '<span class="new-sample"> (New)</span>',
                            '</tpl>',
                            '<tpl if="this.isUpdated(values.status)">',
                                '<span class="updated-sample"> (Updated)</span>',
                            '</tpl>',
                            '<tpl if="this.isExperimental(values.status)">',
                                '<span class="new-sample"> (Experimental)</span>',
                            '</tpl>',
                        '</h4><p>{desc}</p></div>',
                    '</dd>',
                '</tpl>',
            '<div style="clear:left"></div></dl></div>',
            '</tpl>',
        '</div>', {
         isExperimental: function(status){
             return status == 'experimental';
         },
         isNew: function(status){
             return status == 'new';
         },
         isUpdated: function(status){
             return status == 'updated';
         }
    }),


    onClick : function(e){
        var group = e.getTarget('h2', 3, true);
        if(group){
            group.up('div').toggleClass('collapsed');
        }else {
            var t = e.getTarget('dd', 5, true);
            if(t && !e.getTarget('a', 2)){
                var url = t.getAttributeNS('ext', 'url');
                window.open(url);
            }
        }
        return SamplePanel.superclass.onClick.apply(this, arguments);
    }
});
Ext.samples.SamplePanel = SamplePanel;
Ext.reg('samplespanel', Ext.samples.SamplePanel);
})();

Ext.onReady(function() {
    (function() {
        // Instantiate Ext.App instance
        App = new Ext.App({});

        var catalog = Ext.samples.samplesCatalog;

        for (var i = 0, c; c = catalog[i]; i++) {
            c.id = 'sample-' + i;
        }

        var store = new Ext.data.JsonStore({
            idProperty : 'id',
            fields     : ['id', 'title', 'samples'],
            data       : catalog
        });

        var panel = new Ext.Panel({
            frame      : true,
            renderTo   : Ext.get('all-demos'),
            height     : 300,
            autoScroll : true,
            items      : new SamplePanel({
                store : store
            })
        });

        var tpl = new Ext.XTemplate(
            '<tpl for="."><li><a href="#{id}">{title:stripTags}</a></li></tpl>'
        );
        tpl.overwrite('sample-menu', catalog);

        Ext.select('#sample-spacer').remove();

        var headerEl  = Ext.get('hd'),
            footerEl  = Ext.get('ft'),
            bodyEl    = Ext.get('bd'),
            sideBoxEl = bodyEl.child('div[class=side-box]'),
            titleEl   = bodyEl.child('h1#pagetitle');

        var doResize = function() {
            var windowHeight = Ext.getDoc().getViewSize(false).height;

            var footerHeight  = footerEl.getHeight() + footerEl.getMargins().top,
                titleElHeight = titleEl.getHeight() + titleEl.getMargins().top,
                headerHeight  = headerEl.getHeight() + titleElHeight;

            var warnEl = Ext.get('fb');
            var warnHeight = warnEl ? warnEl.getHeight() : 0;

            var availHeight = windowHeight - ( footerHeight + headerHeight + 14) - warnHeight;
            var sideBoxHeight = sideBoxEl.getHeight();

            panel.setHeight((availHeight > sideBoxHeight) ? availHeight : sideBoxHeight);
        };

        // Resize on demand
        Ext.EventManager.onWindowResize(doResize);

        var firebugWarning = function () {
            var cp = new Ext.state.CookieProvider();

            if(window.console && window.console.firebug && ! cp.get('hideFBWarning')){
                var tpl = new Ext.Template(
                    '<div id="fb" style="border: 1px solid #FF0000; background-color:#FFAAAA; display:none; padding:15px; color:#000000;"><b>Warning: </b> Firebug is known to cause performance issues with Ext JS. <a href="#" id="hideWarning">[ Hide ]</a></div>'
                );
                var newEl = tpl.insertFirst('all-demos');

                Ext.fly('hideWarning').on('click', function() {
                    Ext.fly(newEl).slideOut('t',{remove:true});
                    cp.set('hideFBWarning', true);
                    doResize();
                });
                Ext.fly(newEl).slideIn();
                doResize();
            }
        };

        var hideMask = function () {
            Ext.get('loading').remove();
            Ext.fly('loading-mask').fadeOut({
                remove:true,
                callback : firebugWarning
            });
        };

        hideMask.defer(250);
        doResize();
    }).defer(500);
});