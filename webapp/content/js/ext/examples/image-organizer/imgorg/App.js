/*!
 * Ext JS Library 3.3.1
 * Copyright(c) 2006-2010 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
/*
 * Sample Image Organizer utilizing Ext.Direct
 * Tagging/Organizing into galleries
 * Image uploading
 */

Ext.ns('Imgorg','Imgorg.App');
Imgorg.App = function() {
    var swfu;
    SWFUpload.onload = function() {
        var settings = {
            flash_url: "SWFUpload/Flash/swfupload.swf",
            upload_url: "php/router.php",
            file_size_limit: "100 MB",
            file_types: "*.*",
            file_types_description: "Image Files",
            file_upload_limit: 100,
            file_queue_limit: 100, 
            debug: false,
            button_placeholder_id: "btnUploadHolder",
            button_cursor: SWFUpload.CURSOR.HAND,
            button_window_mode: SWFUpload.WINDOW_MODE.TRANSPARENT,
            file_queued_handler: function(file) {
                Ext.ux.SwfuMgr.fireEvent('filequeued', this, file);
            },
            upload_start_handler: function(file) {
                Ext.ux.SwfuMgr.fireEvent('uploadstart', this, file);
            },
            upload_progress_handler: function(file, complete, total) {
                Ext.ux.SwfuMgr.fireEvent('uploadprogress', this, file, complete, total);
            },
            upload_error_handler: function(file, error, message) {
                Ext.ux.SwfuMgr.fireEvent('uploaderror', this, file, error, message);
            },
            upload_success_handler: function(file, data, response) {
                Ext.ux.SwfuMgr.fireEvent('uploadsuccess', this, file, data);
            },
            minimum_flash_version: "9.0.28",
            post_params: {
                extAction: 'Images', // The class to use
                extUpload: true,      
                extMethod: 'upload'  // The method to execute
                //needs extTID – Transaction ID to associate with this request.
            }
        };
        swfu = new SWFUpload(settings);
    };
    var view, thumbPanel, uploadPanel, tabPanel;
    return {
        debugSWF: false,
        
        init: function() {
            Ext.state.Manager.setProvider(new Ext.state.CookieProvider());
            Ext.QuickTips.init();
            Ext.BLANK_IMAGE_URL = '../../resources/images/default/s.gif';
            Ext.Direct.addProvider(Imgorg.REMOTING_API);
            
            Ext.ux.SwfuMgr.on('filequeued', this.onFileQueued, this);
            
            new Ext.Viewport({
                layout: 'border',
                items: [{
                    xtype: 'img-albumtree',
                    id: 'album-tree',
                    region: 'west',
                    width: 180,
                    minWidth: 180,
                    maxWidth: 180,
                    collapsible: true,
                    split: true,
                    collapseMode: 'mini',
                    margins: '5 0 5 5',
                    cmargins: '0 0 0 0',
                    tbar: [{
                        text: 'Add Album',
                        iconCls: 'add',
                        scale: 'large',
                        handler: function() {
                            Ext.getCmp('album-tree').addAlbum();
                        }
                    },{
                        text: 'Upload',
                        iconCls: 'upload',
                        scale: 'large',
                        handler: function() {
                            swfu.selectFiles();
                        }
                    }],
                    listeners: {
                        click: this.onAlbumClick,
                        scope: this
                    }
                },{
                    xtype: 'tabpanel',
                    region: 'center',
                    id: 'img-tabpanel',
                    margins: '5 5 5 0',
                    activeItem: 0,
                    enableTabScroll: true,
                    items: this.getTabs()
                }]
            });
            
            tabPanel = Ext.getCmp('img-tabpanel');
            thumbPanel = tabPanel.getComponent('images-view');
            Imgorg.TagWin = new Imgorg.TagWindow();
        },
        
        getTabs: function() {
            var tabs = [{
                xtype: 'img-albumspanel',
                title: 'Albums',
                listeners: {
                    openalbum: this.onOpenAlbum,
                    scope: this
                }
            },Ext.apply({
                xtype: 'img-thumbpanel',
                itemId:'images-view'
            },this.getImageThumbConfig())];
            
            if (this.debugSWF) {
                tabs.push({
                    title: 'debug',
                    contentEl: 'SWFUpload_Console',
                    listeners: {
                        render: function() {
                            Ext.fly('SWFUpload_Console').applyStyles({height: '100%', width: '100%'});
                        }
                    }
                });
            }
            return tabs;
        },
        
        getImageThumbConfig: function() {
            return {
                dvConfig: {
                    listeners: {
                        dblclick: function(view, idx, node, e) {
                            var p = this.openImage(view.getStore().getAt(idx));
                            p.show();
                        },
                        viewitem: function(view, node) {
                            var recs = view.getSelectedRecords();
                            for (var i = 0; i < recs.length; i++) {
                                this.openImage(recs[i]);
                            }
                        },
                        scope: this
                    }
                }
            };
        },
        
        openImage: function(rec) {
            return tabPanel.add({
                xtype: 'img-panel',
                title: Ext.util.Format.ellipsis(rec.data.filename,15),
                url: rec.data.url,
                imageData: rec.data
            });
        },
        
        onOpenAlbum: function(ap, album, name) {
            var tab = tabPanel.add(Ext.apply({
                xtype: 'img-thumbpanel',
                closable: true,
                title: 'Album: '+name
            },this.getImageThumbConfig()));
            tab.albumFilter({
                id: album,
                text: name
            });
            tab.show();
        },
        
        onAlbumClick: function(node, e) {
            this.onOpenAlbum(null, node.attributes.id, node.attributes.text);
        },
        
        onFileQueued: function(swfu, file) {
            if (!uploadPanel) {
                uploadPanel = Ext.getCmp('img-tabpanel').add({
                    title: 'Upload Queue',
                    xtype: 'img-uploadqueue',
                    swfu: swfu
                });
                uploadPanel.show();
                uploadPanel.addFile(swfu, file);
            } else {
                uploadPanel.show();
            }
        },
        
        getSwf: function() {
            return swfu;
        }
    }
}();

Ext.onReady(Imgorg.App.init,Imgorg.App);

Ext.override(Ext.CompositeElementLite,{
    removeElement : function(keys, removeDom){
        var me = this, els = this.elements, el;	    	
	    Ext.each(keys, function(val){
		    if (el = (els[val] || els[val = me.indexOf(val)])) {
		    	if(removeDom) 
		    		el.dom ? el.remove() : Ext.removeNode(el);
		    	els.splice(val, 1);		    	
			}
	    });
        return this;
    }
});
